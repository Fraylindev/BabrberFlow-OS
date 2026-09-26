import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MediaAssetPurpose,
  MediaAssetStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GalleryOrderDto, GalleryOrderPublishDto } from './media.dto';

type Actor = { id: string; organizationId: string };

function ids(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : [];
}

@Injectable()
export class MediaGalleryService {
  constructor(private readonly prisma: PrismaService) {}

  private async lockAndAuthorize(
    tx: Prisma.TransactionClient,
    actor: Actor,
    publish: boolean,
  ) {
    const organization = await tx.$queryRaw<
      Array<{ id: string; isActive: boolean; deletedAt: Date | null }>
    >(
      Prisma.sql`SELECT "id", "isActive", "deletedAt" FROM "Organization" WHERE "id" = ${actor.organizationId} FOR UPDATE`,
    );
    if (
      organization.length !== 1 ||
      !organization[0].isActive ||
      organization[0].deletedAt
    ) {
      throw new NotFoundException('Galería no disponible.');
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
  }

  private project(order: {
    version: number;
    draftRevision: number;
    draftAssetIds: Prisma.JsonValue;
    draftHeroAssetId: string | null;
    publishedRevision: number | null;
    publishedAssetIds: Prisma.JsonValue | null;
    publishedHeroAssetId: string | null;
  }) {
    return {
      version: order.version,
      draftRevision: order.draftRevision,
      draftAssetIds: ids(order.draftAssetIds),
      draftHeroAssetId: order.draftHeroAssetId,
      publishedRevision: order.publishedRevision,
      publishedAssetIds: ids(order.publishedAssetIds),
      publishedHeroAssetId: order.publishedHeroAssetId,
    };
  }

  async read(actor: Actor) {
    return this.prisma.db.$transaction(async (tx) => {
      await this.lockAndAuthorize(tx, actor, false);
      const order = await tx.mediaGalleryOrder.findUnique({
        where: { organizationId: actor.organizationId },
      });
      return order
        ? this.project(order)
        : {
            version: 0,
            draftRevision: 0,
            draftAssetIds: [],
            draftHeroAssetId: null,
            publishedRevision: null,
            publishedAssetIds: [],
            publishedHeroAssetId: null,
          };
    });
  }

  private async validateIds(
    tx: Prisma.TransactionClient,
    organizationId: string,
    assetIds: string[],
    heroAssetId: string | null,
  ) {
    const unique = new Set(assetIds);
    if (unique.size !== assetIds.length || assetIds.length > 20) {
      throw new ConflictException(
        'El orden contiene imágenes repetidas o excede el límite.',
      );
    }
    if (heroAssetId && !unique.has(heroAssetId)) {
      throw new ConflictException('El hero debe pertenecer a la galería.');
    }
    const found = await tx.mediaAsset.count({
      where: {
        id: { in: assetIds },
        organizationId,
        purpose: MediaAssetPurpose.GALLERY,
        status: MediaAssetStatus.PUBLISHED,
      },
    });
    if (found !== assetIds.length)
      throw new NotFoundException('Imagen de galería no disponible.');
  }

  async saveDraft(actor: Actor, dto: GalleryOrderDto) {
    return this.prisma.db.$transaction(async (tx) => {
      await this.lockAndAuthorize(tx, actor, false);
      const hash = createHash('sha256')
        .update(
          JSON.stringify({
            op: 'SAVE_ORDER',
            version: dto.expectedVersion,
            assetIds: dto.assetIds,
            hero: dto.heroAssetId ?? null,
          }),
        )
        .digest('hex');
      const receipt = await tx.mediaOperation.findUnique({
        where: {
          organizationId_actorUserId_key: {
            organizationId: actor.organizationId,
            actorUserId: actor.id,
            key: dto.idempotencyKey,
          },
        },
      });
      if (receipt) {
        if (receipt.operation !== 'SAVE_ORDER' || receipt.requestHash !== hash)
          throw new ConflictException('La clave de operación ya se utilizó.');
        return receipt.result;
      }
      const current = await tx.mediaGalleryOrder.findUnique({
        where: { organizationId: actor.organizationId },
      });
      if ((current?.version ?? 0) !== dto.expectedVersion) {
        throw new ConflictException(
          'El orden cambió. Actualiza antes de guardar.',
        );
      }
      await this.validateIds(
        tx,
        actor.organizationId,
        dto.assetIds,
        dto.heroAssetId ?? null,
      );
      const order = current
        ? await tx.mediaGalleryOrder.update({
            where: { organizationId: actor.organizationId },
            data: {
              version: { increment: 1 },
              draftRevision: { increment: 1 },
              draftAssetIds: dto.assetIds,
              draftHeroAssetId: dto.heroAssetId ?? null,
            },
          })
        : await tx.mediaGalleryOrder.create({
            data: {
              organizationId: actor.organizationId,
              version: 1,
              draftRevision: 1,
              draftAssetIds: dto.assetIds,
              draftHeroAssetId: dto.heroAssetId ?? null,
            },
          });
      const result = this.project(order);
      await tx.mediaOperation.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.id,
          key: dto.idempotencyKey,
          operation: 'SAVE_ORDER',
          requestHash: hash,
          resourceId: actor.organizationId,
          resultRevision: order.draftRevision,
          result,
        },
      });
      return result;
    });
  }

  async publish(actor: Actor, dto: GalleryOrderPublishDto) {
    return this.prisma.db.$transaction(async (tx) => {
      await this.lockAndAuthorize(tx, actor, true);
      const current = await tx.mediaGalleryOrder.findUnique({
        where: { organizationId: actor.organizationId },
      });
      const hash = createHash('sha256')
        .update(
          JSON.stringify({ op: 'PUBLISH_ORDER', version: dto.expectedVersion }),
        )
        .digest('hex');
      const receipt = await tx.mediaOperation.findUnique({
        where: {
          organizationId_actorUserId_key: {
            organizationId: actor.organizationId,
            actorUserId: actor.id,
            key: dto.idempotencyKey,
          },
        },
      });
      if (receipt) {
        if (
          receipt.operation !== 'PUBLISH_ORDER' ||
          receipt.requestHash !== hash
        )
          throw new ConflictException('La clave de operación ya se utilizó.');
        return receipt.result;
      }
      if (
        !current ||
        current.version !== dto.expectedVersion ||
        current.draftRevision === current.publishedRevision
      ) {
        throw new ConflictException(
          'El orden cambió. Actualiza antes de publicar.',
        );
      }
      await this.validateIds(
        tx,
        actor.organizationId,
        ids(current.draftAssetIds),
        current.draftHeroAssetId,
      );
      const order = await tx.mediaGalleryOrder.update({
        where: { organizationId: actor.organizationId },
        data: {
          version: { increment: 1 },
          publishedRevision: current.draftRevision,
          publishedAssetIds: ids(current.draftAssetIds),
          publishedHeroAssetId: current.draftHeroAssetId,
        },
      });
      const result = this.project(order);
      await tx.mediaOperation.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.id,
          key: dto.idempotencyKey,
          operation: 'PUBLISH_ORDER',
          requestHash: hash,
          resourceId: actor.organizationId,
          resultRevision: order.publishedRevision!,
          result,
        },
      });
      return result;
    });
  }
}
