import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MediaAssetPurpose,
  MediaAssetStatus,
  MediaModerationStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MediaCloudinary } from './media-cloudinary';
import {
  PromotionDraftDto,
  PromotionMutationDto,
  UpdatePromotionDraftDto,
} from './media.dto';
import {
  MEDIA_MAX_PUBLISHED_PER_TENANT,
  promotionIntervalForBusinessDays,
  validatePromotionText,
} from './media-policy';

type Actor = { id: string; organizationId: string };
type Tx = Prisma.TransactionClient;

type PromotionRecord = NonNullable<
  Awaited<ReturnType<Tx['mediaPromotion']['findFirst']>>
>;

function project(promotion: PromotionRecord) {
  return {
    id: promotion.id,
    version: promotion.version,
    draftRevision: promotion.draftRevision,
    draft: {
      title: promotion.draftTitle,
      body: promotion.draftBody,
      startDate: promotion.draftStartDate,
      endDate: promotion.draftEndDate,
      imageAssetId: promotion.imageAssetId,
    },
    publishedRevision: promotion.publishedRevision,
    published: promotion.isPublished
      ? {
          title: promotion.publishedTitle,
          body: promotion.publishedBody,
          startsAtUtc: promotion.startsAtUtc,
          endsAtUtc: promotion.endsAtUtc,
          imageAssetId: promotion.publishedImageAssetId,
        }
      : null,
    retiredAt: promotion.retiredAt,
  };
}

function projectMutation(promotion: PromotionRecord) {
  return {
    id: promotion.id,
    version: promotion.version,
    draftRevision: promotion.draftRevision,
    publishedRevision: promotion.publishedRevision,
    isPublished: promotion.isPublished,
    retiredAt: promotion.retiredAt,
  };
}

@Injectable()
export class MediaPromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: MediaCloudinary,
  ) {}

  private async authorize(tx: Tx, actor: Actor, publish = false) {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        isActive: boolean;
        deletedAt: Date | null;
        timeZone: string;
      }>
    >(
      Prisma.sql`SELECT "id", "isActive", "deletedAt", "timeZone" FROM "Organization" WHERE "id" = ${actor.organizationId} FOR UPDATE`,
    );
    if (rows.length !== 1 || !rows[0].isActive || rows[0].deletedAt) {
      throw new NotFoundException('Promoción no disponible.');
    }
    const membership = await tx.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: actor.id,
          organizationId: actor.organizationId,
        },
      },
      select: { role: true },
    });
    if (
      !membership ||
      (membership.role !== UserRole.OWNER &&
        (publish || membership.role !== UserRole.ADMIN))
    ) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    return rows[0].timeZone;
  }

  private content(dto: PromotionDraftDto, timeZone: string) {
    const title = dto.title.trim().normalize('NFKC');
    const body = dto.body.trim().normalize('NFKC');
    const error = validatePromotionText(title, body);
    if (error)
      throw new BadRequestException(
        'La promoción debe ser editorial y no puede prometer precios, descuentos, cupos ni gratuidad.',
      );
    const interval = promotionIntervalForBusinessDays(
      dto.startDate,
      dto.endDate,
      timeZone,
    );
    if (!interval)
      throw new BadRequestException('Indica fechas válidas del negocio.');
    return { title, body, interval };
  }

  private hash(operation: string, payload: unknown) {
    return createHash('sha256')
      .update(JSON.stringify({ operation, payload }))
      .digest('hex');
  }

  private async receipt(
    tx: Tx,
    actor: Actor,
    key: string,
    operation: string,
    hash: string,
  ) {
    const found = await tx.mediaOperation.findUnique({
      where: {
        organizationId_actorUserId_key: {
          organizationId: actor.organizationId,
          actorUserId: actor.id,
          key,
        },
      },
    });
    if (!found) return null;
    if (found.operation !== operation || found.requestHash !== hash) {
      throw new ConflictException(
        'La clave de operación ya se utilizó para otra acción.',
      );
    }
    return found.result;
  }

  private async saveReceipt(
    tx: Tx,
    actor: Actor,
    key: string,
    operation: string,
    hash: string,
    id: string,
    revision: number,
    result: ReturnType<typeof projectMutation>,
  ) {
    await tx.mediaOperation.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.id,
        key,
        operation,
        requestHash: hash,
        resourceId: id,
        resultRevision: revision,
        result: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
      },
    });
  }

  private async assertImage(
    tx: Tx,
    organizationId: string,
    promotionId: string,
    imageAssetId: string | null,
  ) {
    if (!imageAssetId) return null;
    const asset = await tx.mediaAsset.findFirst({
      where: {
        id: imageAssetId,
        organizationId,
        purpose: MediaAssetPurpose.PROMOTION,
        targetId: promotionId,
      },
    });
    if (
      !asset ||
      (asset.status !== MediaAssetStatus.APPROVED &&
        asset.status !== MediaAssetStatus.STAGED &&
        asset.status !== MediaAssetStatus.PUBLISHED)
    ) {
      throw new NotFoundException('Imagen de promoción no disponible.');
    }
    return asset;
  }

  async list(actor: Actor) {
    return this.prisma.db.$transaction(async (tx) => {
      await this.authorize(tx, actor);
      const promotions = await tx.mediaPromotion.findMany({
        where: { organizationId: actor.organizationId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 100,
      });
      return promotions.map(project);
    });
  }

  async create(actor: Actor, dto: PromotionDraftDto) {
    return this.prisma.db.$transaction(async (tx) => {
      const timeZone = await this.authorize(tx, actor);
      const { title, body } = this.content(dto, timeZone);
      if (dto.imageAssetId)
        throw new BadRequestException(
          'Crea primero la promoción y luego sube su imagen propia.',
        );
      const operation = 'CREATE_PROMOTION';
      const hash = this.hash(operation, {
        title,
        body,
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
      const replay = await this.receipt(
        tx,
        actor,
        dto.idempotencyKey,
        operation,
        hash,
      );
      if (replay) return replay;
      const promotion = await tx.mediaPromotion.create({
        data: {
          id: randomUUID(),
          organizationId: actor.organizationId,
          draftTitle: title,
          draftBody: body,
          draftStartDate: dto.startDate,
          draftEndDate: dto.endDate,
        },
      });
      const result = projectMutation(promotion);
      await this.saveReceipt(
        tx,
        actor,
        dto.idempotencyKey,
        operation,
        hash,
        promotion.id,
        promotion.version,
        result,
      );
      return result;
    });
  }

  async saveDraft(actor: Actor, id: string, dto: UpdatePromotionDraftDto) {
    return this.prisma.db.$transaction(async (tx) => {
      const timeZone = await this.authorize(tx, actor);
      const { title, body } = this.content(dto, timeZone);
      const operation = 'SAVE_PROMOTION';
      const hash = this.hash(operation, {
        id,
        expectedVersion: dto.expectedVersion,
        title,
        body,
        startDate: dto.startDate,
        endDate: dto.endDate,
        imageAssetId: dto.imageAssetId ?? null,
      });
      const replay = await this.receipt(
        tx,
        actor,
        dto.idempotencyKey,
        operation,
        hash,
      );
      if (replay) return replay;
      const current = await tx.mediaPromotion.findFirst({
        where: { id, organizationId: actor.organizationId },
      });
      if (!current) throw new NotFoundException('Promoción no disponible.');
      if (current.retiredAt || current.version !== dto.expectedVersion) {
        throw new ConflictException(
          'La promoción cambió. Actualiza antes de guardar.',
        );
      }
      await this.assertImage(
        tx,
        actor.organizationId,
        id,
        dto.imageAssetId ?? null,
      );
      const saved = await tx.mediaPromotion.update({
        where: { id },
        data: {
          draftTitle: title,
          draftBody: body,
          draftStartDate: dto.startDate,
          draftEndDate: dto.endDate,
          imageAssetId: dto.imageAssetId ?? null,
          draftRevision: { increment: 1 },
          version: { increment: 1 },
        },
      });
      const result = projectMutation(saved);
      await this.saveReceipt(
        tx,
        actor,
        dto.idempotencyKey,
        operation,
        hash,
        id,
        saved.version,
        result,
      );
      return result;
    });
  }

  async publish(actor: Actor, id: string, dto: PromotionMutationDto) {
    const prePromotion = await this.prisma.db.mediaPromotion.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!prePromotion) throw new NotFoundException('Promoción no disponible.');
    const membership = await this.prisma.db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: actor.id,
          organizationId: actor.organizationId,
        },
      },
      select: { role: true },
    });
    if (membership?.role !== UserRole.OWNER)
      throw new ForbiddenException('No tienes permiso para esta acción.');
    if (prePromotion.retiredAt)
      throw new ConflictException('La promoción ya se retiró.');
    const imageForModeration = prePromotion.imageAssetId
      ? await this.prisma.db.mediaAsset.findFirst({
          where: {
            id: prePromotion.imageAssetId,
            organizationId: actor.organizationId,
            purpose: MediaAssetPurpose.PROMOTION,
            targetId: id,
          },
        })
      : null;
    if (prePromotion.imageAssetId && !imageForModeration)
      throw new NotFoundException('Imagen de promoción no disponible.');
    if (imageForModeration) {
      if (
        !imageForModeration.cloudAssetId ||
        !imageForModeration.cloudPublicId
      ) {
        throw new ConflictException('La imagen aún se está preparando.');
      }
      const moderation = await this.cloudinary.moderationStatus({
        assetId: imageForModeration.cloudAssetId,
        publicId: imageForModeration.cloudPublicId,
      });
      if (moderation !== 'approved')
        throw new ConflictException(
          'La imagen aún no tiene moderación aprobada.',
        );
    }
    return this.prisma.db.$transaction(async (tx) => {
      const timeZone = await this.authorize(tx, actor, true);
      const operation = 'PUBLISH_PROMOTION';
      const hash = this.hash(operation, {
        id,
        expectedVersion: dto.expectedVersion,
      });
      const replay = await this.receipt(
        tx,
        actor,
        dto.idempotencyKey,
        operation,
        hash,
      );
      if (replay) {
        const latest = await tx.mediaPromotion.findFirst({
          where: { id, organizationId: actor.organizationId },
          select: { isPublished: true, version: true },
        });
        if (
          !latest?.isPublished ||
          latest.version !== dto.expectedVersion + 1
        ) {
          throw new ConflictException(
            'La promoción cambió. Actualiza antes de publicar.',
          );
        }
        return replay;
      }
      const current = await tx.mediaPromotion.findFirst({
        where: { id, organizationId: actor.organizationId },
      });
      if (!current) throw new NotFoundException('Promoción no disponible.');
      if (
        current.retiredAt ||
        current.version !== dto.expectedVersion ||
        current.draftRevision === current.publishedRevision
      ) {
        throw new ConflictException(
          'La promoción cambió. Actualiza antes de publicar.',
        );
      }
      const { title, body, interval } = this.content(
        {
          idempotencyKey: dto.idempotencyKey,
          title: current.draftTitle,
          body: current.draftBody,
          startDate: current.draftStartDate,
          endDate: current.draftEndDate,
        },
        timeZone,
      );
      const image = await this.assertImage(
        tx,
        actor.organizationId,
        id,
        current.imageAssetId,
      );
      if (image) {
        if (!image.cloudAssetId || !image.cloudPublicId)
          throw new ConflictException('La imagen aún se está preparando.');
        if (
          image.cloudAssetId !== imageForModeration?.cloudAssetId ||
          image.cloudPublicId !== imageForModeration?.cloudPublicId
        )
          throw new ConflictException(
            'La imagen cambió. Actualiza antes de publicar.',
          );
        if (image.status !== MediaAssetStatus.PUBLISHED) {
          const publishedCount = await tx.mediaAsset.count({
            where: {
              organizationId: actor.organizationId,
              status: MediaAssetStatus.PUBLISHED,
            },
          });
          const replacesOld =
            current.publishedImageAssetId &&
            current.publishedImageAssetId !== image.id
              ? 1
              : 0;
          if (publishedCount - replacesOld >= MEDIA_MAX_PUBLISHED_PER_TENANT) {
            throw new ConflictException(
              'El negocio alcanzó el límite de 20 imágenes publicadas.',
            );
          }
        }
      }
      const now = new Date();
      if (
        current.publishedImageAssetId &&
        current.publishedImageAssetId !== image?.id
      ) {
        await tx.mediaAsset.updateMany({
          where: {
            id: current.publishedImageAssetId,
            organizationId: actor.organizationId,
            status: MediaAssetStatus.PUBLISHED,
          },
          data: {
            status: MediaAssetStatus.RETIRED,
            retiredAt: now,
            purgeAfter: now,
          },
        });
        await tx.mediaPurgeJob.upsert({
          where: { assetId: current.publishedImageAssetId },
          create: {
            assetId: current.publishedImageAssetId,
            organizationId: actor.organizationId,
            nextAttemptAt: now,
          },
          update: { nextAttemptAt: now, completedAt: null },
        });
      }
      if (image) {
        await tx.mediaAsset.update({
          where: { id: image.id },
          data: {
            status: MediaAssetStatus.PUBLISHED,
            moderationStatus: MediaModerationStatus.APPROVED,
            publishedRevision: image.revision,
            publishedAltText: image.altText,
            publishedCaption: image.caption,
            publishedDecorative: image.decorative,
            publishedAt: image.publishedAt ?? now,
          },
        });
      }
      const saved = await tx.mediaPromotion.update({
        where: { id },
        data: {
          version: { increment: 1 },
          publishedRevision: current.draftRevision,
          publishedTitle: title,
          publishedBody: body,
          publishedImageAssetId: image?.id ?? null,
          timeZone: interval.timeZone,
          startsAtUtc: interval.startsAtUtc,
          endsAtUtc: interval.endsAtUtc,
          isPublished: true,
        },
      });
      const result = projectMutation(saved);
      await this.saveReceipt(
        tx,
        actor,
        dto.idempotencyKey,
        operation,
        hash,
        id,
        saved.version,
        result,
      );
      return result;
    });
  }

  async retire(actor: Actor, id: string, dto: PromotionMutationDto) {
    return this.prisma.db.$transaction(async (tx) => {
      await this.authorize(tx, actor, true);
      const operation = 'RETIRE_PROMOTION';
      const hash = this.hash(operation, {
        id,
        expectedVersion: dto.expectedVersion,
      });
      const replay = await this.receipt(
        tx,
        actor,
        dto.idempotencyKey,
        operation,
        hash,
      );
      if (replay) return replay;
      const current = await tx.mediaPromotion.findFirst({
        where: { id, organizationId: actor.organizationId },
      });
      if (!current) throw new NotFoundException('Promoción no disponible.');
      if (current.retiredAt || current.version !== dto.expectedVersion) {
        throw new ConflictException(
          'La promoción cambió. Actualiza antes de retirarla.',
        );
      }
      const now = new Date();
      const saved = await tx.mediaPromotion.update({
        where: { id },
        data: { isPublished: false, retiredAt: now, version: { increment: 1 } },
      });
      if (current.publishedImageAssetId) {
        await tx.mediaAsset.updateMany({
          where: {
            id: current.publishedImageAssetId,
            organizationId: actor.organizationId,
            status: MediaAssetStatus.PUBLISHED,
          },
          data: {
            status: MediaAssetStatus.RETIRED,
            retiredAt: now,
            purgeAfter: now,
          },
        });
        await tx.mediaPurgeJob.upsert({
          where: { assetId: current.publishedImageAssetId },
          create: {
            assetId: current.publishedImageAssetId,
            organizationId: actor.organizationId,
            nextAttemptAt: now,
          },
          update: { nextAttemptAt: now, completedAt: null },
        });
      }
      const result = projectMutation(saved);
      await this.saveReceipt(
        tx,
        actor,
        dto.idempotencyKey,
        operation,
        hash,
        id,
        saved.version,
        result,
      );
      return result;
    });
  }
}
