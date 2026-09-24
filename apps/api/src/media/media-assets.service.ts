import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  MediaAsset,
  MediaAssetPurpose,
  MediaAssetStatus,
  MediaModerationStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MediaCloudinary } from './media-cloudinary';
import { UploadMediaDto, UpdateMediaDto } from './media.dto';
import {
  ImageValidationError,
  prepareMediaImage,
  type PreparedMediaImage,
} from './media-image';
import {
  MEDIA_MAX_STAGED_BYTES_PER_TENANT,
  MEDIA_MAX_STAGED_PER_TENANT,
  MEDIA_MAX_PUBLISHED_PER_TENANT,
} from './media-policy';

type MediaActor = { id: string; organizationId: string };
type MediaTx = Prisma.TransactionClient;

function projectAsset(asset: MediaAsset) {
  return {
    id: asset.id,
    purpose: asset.purpose,
    targetId: asset.targetId,
    status: asset.status,
    moderationStatus: asset.moderationStatus,
    revision: asset.revision,
    publishedRevision: asset.publishedRevision,
    altText: asset.altText,
    caption: asset.caption,
    decorative: asset.decorative,
    createdAt: asset.createdAt,
    publishedAt: asset.publishedAt,
  };
}

function projectMutation(asset: MediaAsset) {
  return {
    id: asset.id,
    status: asset.status,
    revision: asset.revision,
    publishedRevision: asset.publishedRevision,
  };
}

function containsForbiddenControl(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return (
      code === 127 || (code < 32 && code !== 9 && code !== 10 && code !== 13)
    );
  });
}

@Injectable()
export class MediaAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: MediaCloudinary,
  ) {}

  private async lockOrganization(tx: MediaTx, organizationId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`,
    );
    if (rows.length !== 1) throw new NotFoundException('Imagen no disponible.');
    const organization = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { isActive: true, deletedAt: true },
    });
    if (!organization?.isActive || organization.deletedAt) {
      throw new NotFoundException('Imagen no disponible.');
    }
  }

  private async role(tx: MediaTx, actor: MediaActor): Promise<UserRole> {
    const membership = await tx.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: actor.id,
          organizationId: actor.organizationId,
        },
      },
      select: { role: true },
    });
    if (!membership)
      throw new ForbiddenException('No tienes permiso para esta acción.');
    return membership.role;
  }

  private async assertTarget(
    tx: MediaTx,
    actor: MediaActor,
    role: UserRole,
    purpose: MediaAssetPurpose,
    targetId: string | null,
  ): Promise<void> {
    const manager = role === UserRole.OWNER || role === UserRole.ADMIN;
    if (purpose === MediaAssetPurpose.GALLERY) {
      if (!manager)
        throw new ForbiddenException('No tienes permiso para esta acción.');
      if (targetId)
        throw new BadRequestException('La galería no requiere destino.');
      return;
    }
    if (!targetId)
      throw new BadRequestException('Indica el destino de la imagen.');
    if (purpose === MediaAssetPurpose.SERVICE) {
      if (!manager)
        throw new ForbiddenException('No tienes permiso para esta acción.');
      const service = await tx.service.findFirst({
        where: {
          id: targetId,
          organizationId: actor.organizationId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!service) throw new NotFoundException('Destino no disponible.');
      return;
    }
    if (purpose === MediaAssetPurpose.PROMOTION) {
      if (!manager)
        throw new ForbiddenException('No tienes permiso para esta acción.');
      const promotion = await tx.mediaPromotion.findFirst({
        where: {
          id: targetId,
          organizationId: actor.organizationId,
          retiredAt: null,
        },
        select: { id: true },
      });
      if (!promotion) throw new NotFoundException('Destino no disponible.');
      return;
    }
    const professional = await tx.professional.findFirst({
      where: { id: targetId, organizationId: actor.organizationId },
      select: { userId: true, status: true },
    });
    if (!professional || professional.status === 'ARCHIVED') {
      throw new NotFoundException('Destino no disponible.');
    }
    if (
      !manager &&
      !(role === UserRole.BARBER && professional.userId === actor.id)
    ) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
  }

  private validateMetadata(
    altText: string,
    caption: string | null,
    decorative: boolean,
  ) {
    const alt = altText.trim().normalize('NFKC');
    const normalizedCaption = caption?.trim().normalize('NFKC') || null;
    if (
      alt.length > 160 ||
      (!decorative && alt.length < 10) ||
      (decorative && alt.length > 0)
    ) {
      throw new BadRequestException(
        'Revisa el texto alternativo de la imagen.',
      );
    }
    if (normalizedCaption && normalizedCaption.length > 200) {
      throw new BadRequestException('El pie de imagen es demasiado largo.');
    }
    if (
      /[<>]/u.test(`${alt}${normalizedCaption ?? ''}`) ||
      containsForbiddenControl(`${alt}${normalizedCaption ?? ''}`)
    ) {
      throw new BadRequestException('El texto de la imagen no es válido.');
    }
    return { altText: alt, caption: normalizedCaption, decorative };
  }

  async upload(
    actor: MediaActor,
    dto: UploadMediaDto,
    file: { buffer: Buffer; mimetype: string } | undefined,
  ) {
    if (!file?.buffer)
      throw new BadRequestException('Selecciona una imagen válida.');
    const metadata = this.validateMetadata(
      dto.altText,
      dto.caption ?? null,
      dto.decorative === 'true',
    );
    let image: PreparedMediaImage;
    try {
      image = await prepareMediaImage(file.buffer, file.mimetype);
    } catch (error) {
      if (error instanceof ImageValidationError) {
        throw new BadRequestException(
          'La imagen debe ser JPEG, PNG o WebP estático, de hasta 5 MiB y 640–6000 px.',
        );
      }
      throw error;
    }
    const id = randomUUID();
    const targetId = dto.targetId ?? null;
    const sha256 = createHash('sha256').update(image.bytes).digest('hex');
    const reserved = await this.prisma.db.$transaction(async (tx) => {
      await this.lockOrganization(tx, actor.organizationId);
      const role = await this.role(tx, actor);
      await this.assertTarget(tx, actor, role, dto.purpose, targetId);
      const activeStaging = await tx.mediaAsset.findMany({
        where: {
          organizationId: actor.organizationId,
          status: { in: [MediaAssetStatus.STAGED, MediaAssetStatus.APPROVED] },
          stagingExpiresAt: { gt: new Date() },
        },
        select: { bytes: true },
      });
      if (
        activeStaging.length >= MEDIA_MAX_STAGED_PER_TENANT ||
        activeStaging.reduce((sum, asset) => sum + asset.bytes, 0) +
          image.bytes.length >
          MEDIA_MAX_STAGED_BYTES_PER_TENANT
      ) {
        throw new ConflictException(
          'El espacio temporal de imágenes está lleno. Retira un borrador o inténtalo más tarde.',
        );
      }
      return tx.mediaAsset.create({
        data: {
          id,
          organizationId: actor.organizationId,
          purpose: dto.purpose,
          targetId,
          sha256,
          bytes: image.bytes.length,
          width: image.width,
          height: image.height,
          ...metadata,
          uploadedByUserId: actor.id,
          stagingExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    });
    let stored: Awaited<ReturnType<MediaCloudinary['upload']>> | null = null;
    try {
      stored = await this.cloudinary.upload(image, id);
      const moderationStatus =
        stored.moderation.toUpperCase() as MediaModerationStatus;
      const updated = await this.prisma.db.mediaAsset.update({
        where: {
          id,
          organizationId: actor.organizationId,
          status: MediaAssetStatus.STAGED,
        },
        data: {
          cloudAssetId: stored.assetId,
          cloudPublicId: stored.publicId,
          cloudVersion: stored.version,
          moderationStatus,
          status:
            moderationStatus === MediaModerationStatus.APPROVED
              ? MediaAssetStatus.APPROVED
              : moderationStatus === MediaModerationStatus.REJECTED
                ? MediaAssetStatus.RETIRED
                : MediaAssetStatus.STAGED,
          ...(moderationStatus === MediaModerationStatus.REJECTED
            ? { retiredAt: new Date(), purgeAfter: new Date() }
            : {}),
        },
      });
      if (updated.status === MediaAssetStatus.RETIRED) {
        await this.queuePurge(updated, new Date());
      }
      return projectAsset(updated);
    } catch (error) {
      // A tenant can be retired while the provider is finishing this upload.
      // The purge worker retains an unlinked reservation until its expiry;
      // remove a completed remote upload now, even if the DB update failed.
      if (stored) {
        await this.cloudinary.destroy(stored.publicId).catch(() => undefined);
      }
      await this.prisma.db.mediaAsset
        .updateMany({
          where: {
            id,
            organizationId: actor.organizationId,
            status: MediaAssetStatus.STAGED,
          },
          data: {
            status: MediaAssetStatus.RETIRED,
            retiredAt: new Date(),
            purgeAfter: new Date(),
          },
        })
        .catch(() => undefined);
      await this.queuePurge(reserved, new Date()).catch(() => undefined);
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'No fue posible terminar la carga. Intenta de nuevo.',
      );
    }
  }

  private async queuePurge(asset: MediaAsset, when: Date): Promise<void> {
    await this.prisma.db.mediaPurgeJob.upsert({
      where: { assetId: asset.id },
      create: {
        assetId: asset.id,
        organizationId: asset.organizationId,
        nextAttemptAt: when,
      },
      update: { nextAttemptAt: when, completedAt: null },
    });
  }

  private operationHash(
    operation: string,
    resourceId: string,
    expectedRevision: number,
  ): string {
    return createHash('sha256')
      .update(JSON.stringify({ operation, resourceId, expectedRevision }))
      .digest('hex');
  }

  private async priorOperation(
    tx: MediaTx,
    actor: MediaActor,
    key: string,
    operation: string,
    hash: string,
  ): Promise<Prisma.JsonValue | null> {
    const receipt = await tx.mediaOperation.findUnique({
      where: {
        organizationId_actorUserId_key: {
          organizationId: actor.organizationId,
          actorUserId: actor.id,
          key,
        },
      },
    });
    if (!receipt) return null;
    if (receipt.operation !== operation || receipt.requestHash !== hash) {
      throw new ConflictException(
        'La clave de operación ya se utilizó para otra acción.',
      );
    }
    return receipt.result;
  }

  private async recordOperation(
    tx: MediaTx,
    actor: MediaActor,
    key: string,
    operation: string,
    hash: string,
    resourceId: string,
    resultRevision: number,
    result: ReturnType<typeof projectMutation>,
  ): Promise<void> {
    await tx.mediaOperation.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.id,
        key,
        operation,
        requestHash: hash,
        resourceId,
        resultRevision,
        result: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
      },
    });
  }

  async list(actor: MediaActor) {
    const membership = await this.prisma.db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: actor.id,
          organizationId: actor.organizationId,
        },
      },
      select: { role: true },
    });
    if (!membership)
      throw new ForbiddenException('No tienes permiso para esta acción.');
    const manager =
      membership.role === UserRole.OWNER || membership.role === UserRole.ADMIN;
    if (!manager && membership.role !== UserRole.BARBER) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    const ownProfile = manager
      ? null
      : await this.prisma.db.professional.findFirst({
          where: { organizationId: actor.organizationId, userId: actor.id },
          select: { id: true },
        });
    const assets = await this.prisma.db.mediaAsset.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(manager
          ? {}
          : {
              purpose: MediaAssetPurpose.PROFESSIONAL_AVATAR,
              targetId: ownProfile?.id ?? '__none__',
            }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return assets.map(projectAsset);
  }

  async publish(
    actor: MediaActor,
    id: string,
    expectedRevision: number,
    key: string,
  ) {
    const assetForModeration = await this.prisma.db.mediaAsset.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!assetForModeration)
      throw new NotFoundException('Imagen no disponible.');
    if (assetForModeration.purpose === MediaAssetPurpose.PROMOTION)
      throw new ConflictException('La imagen se publica con su promoción.');
    const membership = await this.prisma.db.membership.findUnique({
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
        !(
          membership.role === UserRole.BARBER &&
          assetForModeration.purpose === MediaAssetPurpose.PROFESSIONAL_AVATAR
        ))
    ) {
      throw new ForbiddenException(
        'No tienes permiso para publicar esta imagen.',
      );
    }
    if (membership.role === UserRole.BARBER) {
      const ownProfile = await this.prisma.db.professional.findFirst({
        where: {
          id: assetForModeration.targetId ?? '',
          organizationId: actor.organizationId,
          userId: actor.id,
        },
        select: { id: true },
      });
      if (!ownProfile) throw new NotFoundException('Imagen no disponible.');
    }
    if (
      assetForModeration.status === MediaAssetStatus.RETIRED ||
      assetForModeration.status === MediaAssetStatus.QUARANTINED ||
      assetForModeration.status === MediaAssetStatus.PURGED
    ) {
      throw new ConflictException(
        'La imagen no está disponible para publicar.',
      );
    }
    if (!assetForModeration.cloudAssetId || !assetForModeration.cloudPublicId)
      throw new ConflictException('La imagen aún se está preparando.');
    const moderation = await this.cloudinary.moderationStatus({
      assetId: assetForModeration.cloudAssetId,
      publicId: assetForModeration.cloudPublicId,
    });
    if (moderation !== 'approved') {
      throw new ConflictException(
        'La imagen aún no tiene moderación aprobada.',
      );
    }
    return this.prisma.db.$transaction(async (tx) => {
      await this.lockOrganization(tx, actor.organizationId);
      const role = await this.role(tx, actor);
      const asset = await tx.mediaAsset.findFirst({
        where: { id, organizationId: actor.organizationId },
      });
      if (!asset) throw new NotFoundException('Imagen no disponible.');
      await this.assertTarget(tx, actor, role, asset.purpose, asset.targetId);
      if (asset.purpose === MediaAssetPurpose.PROMOTION) {
        throw new ConflictException('La imagen se publica con su promoción.');
      }
      if (
        role !== UserRole.OWNER &&
        !(
          role === UserRole.BARBER &&
          asset.purpose === MediaAssetPurpose.PROFESSIONAL_AVATAR
        )
      ) {
        throw new ForbiddenException(
          'No tienes permiso para publicar esta imagen.',
        );
      }
      const operation = 'PUBLISH';
      const hash = this.operationHash(operation, id, expectedRevision);
      const replay = await this.priorOperation(tx, actor, key, operation, hash);
      if (replay) return replay;
      if (
        asset.revision !== expectedRevision ||
        (asset.status === MediaAssetStatus.PUBLISHED &&
          asset.publishedRevision === asset.revision)
      ) {
        throw new ConflictException(
          'La imagen cambió. Actualiza antes de publicar.',
        );
      }
      if (
        asset.status !== MediaAssetStatus.APPROVED &&
        asset.status !== MediaAssetStatus.STAGED &&
        asset.status !== MediaAssetStatus.PUBLISHED
      ) {
        throw new ConflictException(
          'La imagen no está disponible para publicar.',
        );
      }
      if (!asset.cloudAssetId || !asset.cloudPublicId) {
        throw new ConflictException('La imagen aún se está preparando.');
      }
      if (
        asset.cloudAssetId !== assetForModeration.cloudAssetId ||
        asset.cloudPublicId !== assetForModeration.cloudPublicId
      ) {
        throw new ConflictException(
          'La imagen cambió. Actualiza antes de publicar.',
        );
      }
      const replacing =
        asset.purpose === MediaAssetPurpose.GALLERY
          ? []
          : await tx.mediaAsset.findMany({
              where: {
                organizationId: actor.organizationId,
                purpose: asset.purpose,
                targetId: asset.targetId,
                status: MediaAssetStatus.PUBLISHED,
                id: { not: asset.id },
              },
            });
      const publishedCount = await tx.mediaAsset.count({
        where: {
          organizationId: actor.organizationId,
          status: MediaAssetStatus.PUBLISHED,
        },
      });
      if (
        publishedCount -
          replacing.length -
          (asset.status === MediaAssetStatus.PUBLISHED ? 1 : 0) >=
        MEDIA_MAX_PUBLISHED_PER_TENANT
      ) {
        throw new ConflictException(
          'El negocio alcanzó el límite de 20 imágenes publicadas.',
        );
      }
      const now = new Date();
      for (const old of replacing) {
        await tx.mediaAsset.update({
          where: { id: old.id },
          data: {
            status: MediaAssetStatus.RETIRED,
            retiredAt: now,
            purgeAfter: now,
          },
        });
        await tx.mediaPurgeJob.upsert({
          where: { assetId: old.id },
          create: {
            assetId: old.id,
            organizationId: actor.organizationId,
            nextAttemptAt: now,
          },
          update: { nextAttemptAt: now, completedAt: null },
        });
      }
      const updated = await tx.mediaAsset.update({
        where: { id: asset.id },
        data: {
          status: MediaAssetStatus.PUBLISHED,
          moderationStatus: MediaModerationStatus.APPROVED,
          publishedRevision: asset.revision,
          publishedAltText: asset.altText,
          publishedCaption: asset.caption,
          publishedDecorative: asset.decorative,
          publishedAt: now,
        },
      });
      if (asset.purpose === MediaAssetPurpose.PROFESSIONAL_AVATAR) {
        await tx.professional.update({
          where: { id: asset.targetId!, organizationId: actor.organizationId },
          data: { avatar: null },
        });
      }
      const result = projectMutation(updated);
      await this.recordOperation(
        tx,
        actor,
        key,
        operation,
        hash,
        id,
        updated.revision,
        result,
      );
      return result;
    });
  }

  async retire(
    actor: MediaActor,
    id: string,
    expectedRevision: number,
    key: string,
    quarantine = false,
  ) {
    return this.prisma.db.$transaction(async (tx) => {
      await this.lockOrganization(tx, actor.organizationId);
      if ((await this.role(tx, actor)) !== UserRole.OWNER) {
        throw new ForbiddenException(
          'Solo el propietario puede retirar imágenes.',
        );
      }
      const asset = await tx.mediaAsset.findFirst({
        where: { id, organizationId: actor.organizationId },
      });
      if (!asset) throw new NotFoundException('Imagen no disponible.');
      const operation = quarantine ? 'QUARANTINE' : 'RETIRE';
      const hash = this.operationHash(operation, id, expectedRevision);
      const replay = await this.priorOperation(tx, actor, key, operation, hash);
      if (replay) return replay;
      if (
        asset.revision !== expectedRevision ||
        asset.status === MediaAssetStatus.RETIRED ||
        asset.status === MediaAssetStatus.PURGED
      ) {
        throw new ConflictException(
          'La imagen cambió. Actualiza antes de retirarla.',
        );
      }
      const now = new Date();
      const purgeAfter = now;
      const updated = await tx.mediaAsset.update({
        where: { id: asset.id },
        data: {
          status: quarantine
            ? MediaAssetStatus.QUARANTINED
            : MediaAssetStatus.RETIRED,
          quarantinedAt: quarantine ? now : asset.quarantinedAt,
          retiredAt: quarantine ? asset.retiredAt : now,
          purgeAfter,
          revision: { increment: 1 },
        },
      });
      await tx.mediaPurgeJob.upsert({
        where: { assetId: asset.id },
        create: {
          assetId: asset.id,
          organizationId: actor.organizationId,
          nextAttemptAt: purgeAfter,
        },
        update: { nextAttemptAt: purgeAfter, completedAt: null },
      });
      const result = projectMutation(updated);
      await this.recordOperation(
        tx,
        actor,
        key,
        operation,
        hash,
        id,
        updated.revision,
        result,
      );
      return result;
    });
  }

  async updateMetadata(actor: MediaActor, id: string, dto: UpdateMediaDto) {
    return this.prisma.db.$transaction(async (tx) => {
      await this.lockOrganization(tx, actor.organizationId);
      const role = await this.role(tx, actor);
      const asset = await tx.mediaAsset.findFirst({
        where: { id, organizationId: actor.organizationId },
      });
      if (!asset) throw new NotFoundException('Imagen no disponible.');
      await this.assertTarget(tx, actor, role, asset.purpose, asset.targetId);
      if (
        asset.revision !== dto.expectedRevision ||
        asset.status === MediaAssetStatus.RETIRED ||
        asset.status === MediaAssetStatus.QUARANTINED ||
        asset.status === MediaAssetStatus.PURGED
      ) {
        throw new ConflictException(
          'La imagen cambió. Actualiza antes de editar.',
        );
      }
      const metadata = this.validateMetadata(
        dto.altText ?? asset.altText,
        dto.caption === undefined ? asset.caption : dto.caption,
        dto.decorative ?? asset.decorative,
      );
      const updated = await tx.mediaAsset.update({
        where: { id: asset.id },
        data: { ...metadata, revision: { increment: 1 } },
      });
      return projectAsset(updated);
    });
  }
}
