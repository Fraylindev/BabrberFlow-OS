import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MediaAssetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MediaCloudinary } from './media-cloudinary';

const TICK_MS = 10000;

@Injectable()
export class MediaPurgeWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaPurgeWorker.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: MediaCloudinary,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.expirePromotions();
      await this.expireStaging();
      for (let index = 0; index < 10; index += 1) {
        if (!(await this.purgeOne())) break;
      }
    } catch (error) {
      this.logger.warn(
        `Trabajo de medios pendiente: ${error instanceof Error ? error.constructor.name : 'UnknownError'}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async expirePromotions() {
    const candidates = await this.prisma.db.mediaPromotion.findMany({
      where: { isPublished: true, endsAtUtc: { lte: new Date() } },
      select: { id: true, organizationId: true },
      take: 20,
    });
    for (const candidate of candidates) {
      await this.prisma.db.$transaction(async (tx) => {
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = ${candidate.organizationId} FOR UPDATE`,
        );
        const current = await tx.mediaPromotion.findFirst({
          where: {
            id: candidate.id,
            organizationId: candidate.organizationId,
            isPublished: true,
            endsAtUtc: { lte: new Date() },
          },
        });
        if (!current) return;
        const now = new Date();
        await tx.mediaPromotion.update({
          where: { id: current.id },
          data: { isPublished: false, version: { increment: 1 } },
        });
        if (current.publishedImageAssetId) {
          await tx.mediaAsset.updateMany({
            where: {
              id: current.publishedImageAssetId,
              organizationId: current.organizationId,
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
              organizationId: current.organizationId,
              nextAttemptAt: now,
            },
            update: { nextAttemptAt: now, completedAt: null },
          });
        }
      });
    }
  }

  private async expireStaging() {
    const candidates = await this.prisma.db.mediaAsset.findMany({
      where: {
        status: { in: [MediaAssetStatus.STAGED, MediaAssetStatus.APPROVED] },
        stagingExpiresAt: { lte: new Date() },
      },
      select: { id: true, organizationId: true },
      take: 20,
    });
    for (const candidate of candidates) {
      await this.prisma.db.$transaction(async (tx) => {
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = ${candidate.organizationId} FOR UPDATE`,
        );
        const now = new Date();
        const updated = await tx.mediaAsset.updateMany({
          where: {
            id: candidate.id,
            organizationId: candidate.organizationId,
            status: {
              in: [MediaAssetStatus.STAGED, MediaAssetStatus.APPROVED],
            },
            stagingExpiresAt: { lte: now },
          },
          data: {
            status: MediaAssetStatus.RETIRED,
            retiredAt: now,
            purgeAfter: now,
          },
        });
        if (!updated.count) return;
        await tx.mediaPurgeJob.upsert({
          where: { assetId: candidate.id },
          create: {
            assetId: candidate.id,
            organizationId: candidate.organizationId,
            nextAttemptAt: now,
          },
          update: { nextAttemptAt: now, completedAt: null },
        });
      });
    }
  }

  private async purgeOne(): Promise<boolean> {
    const claimed = await this.prisma.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ assetId: string }>>(
        Prisma.sql`SELECT "assetId" FROM "MediaPurgeJob" WHERE "completedAt" IS NULL AND "nextAttemptAt" <= NOW() ORDER BY "nextAttemptAt", "assetId" LIMIT 1 FOR UPDATE SKIP LOCKED`,
      );
      if (rows.length === 0) return false;
      const assetId = rows[0].assetId;
      const asset = await tx.mediaAsset.findUnique({
        where: { id: assetId },
      });
      if (!asset) {
        await tx.mediaPurgeJob.update({
          where: { assetId },
          data: { completedAt: new Date(), lastErrorCode: 'MISSING' },
        });
        return null;
      }
      if (
        asset.status !== MediaAssetStatus.RETIRED &&
        asset.status !== MediaAssetStatus.QUARANTINED
      ) {
        await tx.mediaPurgeJob.update({
          where: { assetId },
          data: {
            attempts: { increment: 1 },
            nextAttemptAt: new Date(Date.now() + 5 * 60 * 1000),
            lastErrorCode: 'STATE',
          },
        });
        return null;
      }
      if (!asset.cloudPublicId && asset.stagingExpiresAt > new Date()) {
        // An upload may still complete after deactivation. Keep the durable
        // reservation so its deterministic provider ID is checked again once
        // the upload window has closed; the HTTP catch also destroys eagerly.
        await tx.mediaPurgeJob.update({
          where: { assetId },
          data: {
            attempts: { increment: 1 },
            nextAttemptAt: asset.stagingExpiresAt,
            lastErrorCode: 'UPLOAD_WINDOW',
          },
        });
        return null;
      }
      await tx.mediaPurgeJob.update({
        where: { assetId },
        data: {
          attempts: { increment: 1 },
          nextAttemptAt: new Date(Date.now() + 60_000),
          lastErrorCode: 'IN_FLIGHT',
        },
      });
      return {
        assetId,
        publicId: asset.cloudPublicId ?? `kortek-media/${asset.id}`,
      };
    });
    if (claimed === false) return false;
    if (claimed === null) return true;

    try {
      await this.cloudinary.destroy(claimed.publicId);
    } catch {
      const job = await this.prisma.db.mediaPurgeJob.findUnique({
        where: { assetId: claimed.assetId },
        select: { attempts: true },
      });
      const delay = Math.min(
        5 * 60 * 1000,
        10_000 * 2 ** Math.min(job?.attempts ?? 0, 5),
      );
      await this.prisma.db.mediaPurgeJob.update({
        where: { assetId: claimed.assetId },
        data: {
          nextAttemptAt: new Date(Date.now() + delay),
          lastErrorCode: 'PROVIDER',
        },
      });
      return true;
    }
    await this.prisma.db.$transaction(async (tx) => {
      const now = new Date();
      await tx.mediaAsset.update({
        where: { id: claimed.assetId },
        data: {
          status: MediaAssetStatus.PURGED,
          purgedAt: now,
          cloudAssetId: null,
          cloudPublicId: null,
          cloudVersion: null,
          altText: '',
          caption: null,
          publishedAltText: null,
          publishedCaption: null,
          sha256: '',
        },
      });
      await tx.mediaPurgeJob.update({
        where: { assetId: claimed.assetId },
        data: { completedAt: now, lastErrorCode: null },
      });
    });
    return true;
  }
}
