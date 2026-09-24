import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MediaAsset,
  MediaAssetPurpose,
  MediaAssetStatus,
  Prisma,
  ProfessionalStatus,
} from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MediaCloudinary, MediaVariant } from './media-cloudinary';

const TOKEN_SECONDS = 60;
const VARIANTS: readonly MediaVariant[] = [
  'original',
  'thumbnail',
  'card',
  'hero',
];

type PublicOrganization = { id: string; slug: string };

function stringIds(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : [];
}

@Injectable()
export class MediaPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: MediaCloudinary,
  ) {}

  private signingKey(): Buffer {
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!secret) throw new NotFoundException('Imagen no disponible.');
    return createHmac('sha256', secret)
      .update('kortek-media-delivery-v1')
      .digest();
  }

  private sign(slug: string, assetId: string, variant: MediaVariant): string {
    const payload = Buffer.from(
      JSON.stringify({
        s: slug,
        a: assetId,
        v: variant,
        e: Math.floor(Date.now() / 1000) + TOKEN_SECONDS,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', this.signingKey())
      .update(payload)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  private verify(
    slug: string,
    token: string,
  ): { assetId: string; variant: MediaVariant } {
    const [payload, signature, extra] = token.split('.');
    if (
      !payload ||
      !signature ||
      extra ||
      payload.length > 512 ||
      signature.length > 80
    ) {
      throw new NotFoundException('Imagen no disponible.');
    }
    const expected = createHmac('sha256', this.signingKey())
      .update(payload)
      .digest();
    let received: Buffer;
    try {
      received = Buffer.from(signature, 'base64url');
    } catch {
      throw new NotFoundException('Imagen no disponible.');
    }
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new NotFoundException('Imagen no disponible.');
    }
    let data: unknown;
    try {
      data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      throw new NotFoundException('Imagen no disponible.');
    }
    if (!data || typeof data !== 'object')
      throw new NotFoundException('Imagen no disponible.');
    const record = data as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    if (
      record.s !== slug ||
      typeof record.a !== 'string' ||
      !/^[0-9a-f-]{36}$/iu.test(record.a) ||
      typeof record.v !== 'string' ||
      !VARIANTS.includes(record.v as MediaVariant) ||
      typeof record.e !== 'number' ||
      !Number.isInteger(record.e) ||
      record.e < now ||
      record.e > now + TOKEN_SECONDS
    ) {
      throw new NotFoundException('Imagen no disponible.');
    }
    return { assetId: record.a, variant: record.v as MediaVariant };
  }

  private async organization(slug: string): Promise<PublicOrganization> {
    const organization = await this.prisma.db.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        isActive: true,
        deletedAt: true,
        cmsPage: { select: { isPublished: true } },
      },
    });
    if (
      !organization?.isActive ||
      organization.deletedAt ||
      !organization.cmsPage?.isPublished
    ) {
      throw new NotFoundException('Medios no disponibles.');
    }
    return { id: organization.id, slug: organization.slug };
  }

  private locator(slug: string, asset: MediaAsset, variant: MediaVariant) {
    return `/public/${encodeURIComponent(slug)}/media/${this.sign(slug, asset.id, variant)}`;
  }

  private projectAsset(slug: string, asset: MediaAsset, variant: MediaVariant) {
    return {
      id: asset.id,
      url: this.locator(slug, asset, variant),
      altText: asset.publishedAltText,
      caption: asset.publishedCaption,
      decorative: asset.publishedDecorative,
    };
  }

  async projection(slug: string) {
    const organization = await this.organization(slug);
    const now = new Date();
    const [assets, order, services, professionals, promotions] =
      await Promise.all([
        this.prisma.db.mediaAsset.findMany({
          where: {
            organizationId: organization.id,
            status: MediaAssetStatus.PUBLISHED,
          },
          orderBy: [{ publishedAt: 'asc' }, { id: 'asc' }],
        }),
        this.prisma.db.mediaGalleryOrder.findUnique({
          where: { organizationId: organization.id },
        }),
        this.prisma.db.service.findMany({
          where: { organizationId: organization.id, isActive: true },
          select: { id: true },
        }),
        this.prisma.db.professional.findMany({
          where: {
            organizationId: organization.id,
            status: ProfessionalStatus.ACTIVE,
            isPublic: true,
          },
          select: { id: true },
        }),
        this.prisma.db.mediaPromotion.findMany({
          where: {
            organizationId: organization.id,
            isPublished: true,
            retiredAt: null,
            startsAtUtc: { lte: now },
            endsAtUtc: { gt: now },
          },
          select: {
            id: true,
            publishedTitle: true,
            publishedBody: true,
            publishedImageAssetId: true,
          },
          orderBy: [{ startsAtUtc: 'desc' }, { id: 'asc' }],
        }),
      ]);
    const gallery = assets.filter(
      (asset) => asset.purpose === MediaAssetPurpose.GALLERY,
    );
    const preferred = stringIds(order?.publishedAssetIds ?? null);
    const ranks = new Map(preferred.map((id, index) => [id, index]));
    gallery.sort(
      (left, right) =>
        (ranks.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (ranks.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    );
    const hero =
      gallery.find((asset) => asset.id === order?.publishedHeroAssetId) ?? null;
    const serviceIds = new Set(services.map((service) => service.id));
    const professionalIds = new Set(
      professionals.map((professional) => professional.id),
    );
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    return {
      hero: hero ? this.projectAsset(slug, hero, 'hero') : null,
      gallery: gallery.map((asset) => this.projectAsset(slug, asset, 'card')),
      services: assets
        .filter(
          (asset) =>
            asset.purpose === MediaAssetPurpose.SERVICE &&
            asset.targetId &&
            serviceIds.has(asset.targetId),
        )
        .map((asset) => ({
          serviceId: asset.targetId,
          image: this.projectAsset(slug, asset, 'card'),
        })),
      professionals: assets
        .filter(
          (asset) =>
            asset.purpose === MediaAssetPurpose.PROFESSIONAL_AVATAR &&
            asset.targetId &&
            professionalIds.has(asset.targetId),
        )
        .map((asset) => ({
          professionalId: asset.targetId,
          avatar: this.projectAsset(slug, asset, 'thumbnail'),
        })),
      promotions: promotions.map((promotion) => {
        const image = promotion.publishedImageAssetId
          ? byId.get(promotion.publishedImageAssetId)
          : null;
        return {
          id: promotion.id,
          title: promotion.publishedTitle,
          body: promotion.publishedBody,
          image:
            image &&
            image.purpose === MediaAssetPurpose.PROMOTION &&
            image.targetId === promotion.id
              ? this.projectAsset(slug, image, 'card')
              : null,
        };
      }),
    };
  }

  private async eligibleAsset(
    organizationId: string,
    asset: MediaAsset,
  ): Promise<boolean> {
    if (
      asset.status !== MediaAssetStatus.PUBLISHED ||
      asset.organizationId !== organizationId
    )
      return false;
    if (asset.purpose === MediaAssetPurpose.GALLERY) return true;
    if (!asset.targetId) return false;
    if (asset.purpose === MediaAssetPurpose.SERVICE) {
      return !!(await this.prisma.db.service.findFirst({
        where: { id: asset.targetId, organizationId, isActive: true },
        select: { id: true },
      }));
    }
    if (asset.purpose === MediaAssetPurpose.PROFESSIONAL_AVATAR) {
      return !!(await this.prisma.db.professional.findFirst({
        where: {
          id: asset.targetId,
          organizationId,
          status: ProfessionalStatus.ACTIVE,
          isPublic: true,
        },
        select: { id: true },
      }));
    }
    const now = new Date();
    return !!(await this.prisma.db.mediaPromotion.findFirst({
      where: {
        id: asset.targetId,
        organizationId,
        publishedImageAssetId: asset.id,
        isPublished: true,
        retiredAt: null,
        startsAtUtc: { lte: now },
        endsAtUtc: { gt: now },
      },
      select: { id: true },
    }));
  }

  async image(slug: string, token: string): Promise<Buffer> {
    const { assetId, variant } = this.verify(slug, token);
    const organization = await this.organization(slug);
    const asset = await this.prisma.db.mediaAsset.findFirst({
      where: { id: assetId, organizationId: organization.id },
    });
    if (
      !asset ||
      !(await this.eligibleAsset(organization.id, asset)) ||
      !asset.cloudPublicId ||
      !asset.cloudVersion
    ) {
      throw new NotFoundException('Imagen no disponible.');
    }
    return this.cloudinary.fetchVariant(
      { publicId: asset.cloudPublicId, version: asset.cloudVersion },
      variant,
    );
  }
}
