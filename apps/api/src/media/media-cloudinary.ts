import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import { PreparedMediaImage } from './media-image';

export const MEDIA_VARIANTS = {
  thumbnail: 'c_fill,h_320,w_320',
  card: 'c_limit,w_640',
  hero: 'c_limit,w_1600',
} as const;

export type MediaVariant = 'original' | keyof typeof MEDIA_VARIANTS;

export interface CloudinaryMediaAsset {
  assetId: string;
  publicId: string;
  version: number;
  format: 'webp';
  bytes: number;
  width: number;
  height: number;
  moderation: 'pending' | 'approved' | 'rejected';
}

export function readAwsModeration(
  value: unknown,
): CloudinaryMediaAsset['moderation'] | null {
  if (!Array.isArray(value)) return null;
  const entries: unknown[] = value;
  const matches = entries.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Record<string, unknown>;
    return candidate.kind === 'aws_rek' && typeof candidate.status === 'string';
  }) as Record<string, unknown>[];
  if (matches.length !== 1) return null;
  const entry = matches[0];
  return entry.status === 'pending' ||
    entry.status === 'approved' ||
    entry.status === 'rejected'
    ? entry.status
    : null;
}

/** Only the API knows the provider secret or receives Cloudinary delivery URLs. */
@Injectable()
export class MediaCloudinary {
  private configured = false;

  private ensureConfigured(): void {
    if (this.configured) return;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (
      !cloudName ||
      !apiKey ||
      !apiSecret ||
      !/^[A-Za-z0-9_-]+$/u.test(cloudName)
    ) {
      throw new ServiceUnavailableException(
        'Las imágenes no están disponibles. Intenta de nuevo.',
      );
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    this.configured = true;
  }

  async upload(
    image: PreparedMediaImage,
    localAssetId: string,
  ): Promise<CloudinaryMediaAsset> {
    this.ensureConfigured();
    if (!/^[0-9a-f-]{36}$/iu.test(localAssetId)) {
      throw new Error('Media asset ID inválido para custodia.');
    }
    const publicId = `kortek-media/${localAssetId}`;
    let response: UploadApiResponse;
    try {
      response = await cloudinary.uploader.upload(
        `data:image/webp;base64,${image.bytes.toString('base64')}`,
        {
          public_id: publicId,
          resource_type: 'image',
          type: 'authenticated',
          overwrite: false,
          eager: Object.values(MEDIA_VARIANTS),
          eager_async: false,
          moderation: 'aws_rek',
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible guardar la imagen. Intenta de nuevo.',
      );
    }
    const eager: unknown = response.eager;
    const assetId: unknown = response.asset_id;
    const version: unknown = response.version;
    const bytes: unknown = response.bytes;
    const width: unknown = response.width;
    const height: unknown = response.height;
    const moderation = readAwsModeration(response.moderation);
    if (
      response.type !== 'authenticated' ||
      response.resource_type !== 'image' ||
      response.public_id !== publicId ||
      response.format !== 'webp' ||
      !Array.isArray(eager) ||
      eager.length !== Object.keys(MEDIA_VARIANTS).length ||
      typeof assetId !== 'string' ||
      typeof version !== 'number' ||
      typeof bytes !== 'number' ||
      typeof width !== 'number' ||
      typeof height !== 'number' ||
      !moderation
    ) {
      await this.destroy(publicId).catch(() => undefined);
      throw new ServiceUnavailableException(
        'No fue posible preparar la imagen. Intenta de nuevo.',
      );
    }
    return {
      assetId,
      publicId,
      version,
      format: 'webp',
      bytes,
      width,
      height,
      moderation,
    };
  }

  async moderationStatus(
    asset: Pick<CloudinaryMediaAsset, 'assetId' | 'publicId'>,
  ): Promise<CloudinaryMediaAsset['moderation']> {
    this.ensureConfigured();
    this.assertPublicId(asset.publicId);
    try {
      const resource: unknown = await cloudinary.api.resource(asset.publicId, {
        resource_type: 'image',
        type: 'authenticated',
      });
      if (!resource || typeof resource !== 'object')
        throw new Error('Sin activo.');
      const record = resource as Record<string, unknown>;
      if (
        record.asset_id !== asset.assetId ||
        record.type !== 'authenticated'
      ) {
        throw new Error('Activo ajeno.');
      }
      const status = readAwsModeration(record.moderation);
      if (!status) throw new Error('Sin resultado de moderación.');
      return status;
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible verificar la moderación de la imagen. Intenta de nuevo.',
      );
    }
  }

  private assertPublicId(publicId: string): void {
    if (!/^kortek-media\/[0-9a-f-]{36}$/iu.test(publicId)) {
      throw new Error('Referencia de imagen inválida.');
    }
  }

  async destroy(publicId: string): Promise<void> {
    this.ensureConfigured();
    this.assertPublicId(publicId);
    let result: unknown;
    try {
      result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        type: 'authenticated',
        invalidate: true,
      });
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible retirar la imagen del proveedor.',
      );
    }
    if (
      !result ||
      typeof result !== 'object' ||
      !('result' in result) ||
      (result.result !== 'ok' && result.result !== 'not found')
    ) {
      throw new ServiceUnavailableException(
        'No fue posible retirar la imagen del proveedor.',
      );
    }
  }

  async fetchVariant(
    asset: Pick<CloudinaryMediaAsset, 'publicId' | 'version'>,
    variant: MediaVariant,
  ): Promise<Buffer> {
    this.ensureConfigured();
    this.assertPublicId(asset.publicId);
    const signedUrl = cloudinary.url(asset.publicId, {
      secure: true,
      type: 'authenticated',
      resource_type: 'image',
      format: 'webp',
      sign_url: true,
      version: asset.version,
      ...(variant === 'original'
        ? {}
        : { raw_transformation: MEDIA_VARIANTS[variant] }),
    });
    try {
      const response = await fetch(signedUrl, {
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
      if (
        response.status !== 200 ||
        !response.headers.get('content-type')?.startsWith('image/')
      ) {
        throw new Error('Cloudinary no entregó imagen.');
      }
      const size = Number(response.headers.get('content-length'));
      if (Number.isFinite(size) && size > 6 * 1024 * 1024) {
        throw new Error('La variante excede el límite de entrega.');
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length === 0 || bytes.length > 6 * 1024 * 1024) {
        throw new Error('La variante excede el límite de entrega.');
      }
      return bytes;
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible cargar la imagen. Intenta de nuevo.',
      );
    }
  }
}
