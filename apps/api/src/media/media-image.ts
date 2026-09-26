import sharp from 'sharp';
import {
  MEDIA_MAX_BYTES,
  MEDIA_MAX_SIDE,
  MEDIA_MIN_SIDE,
} from './media-policy';

const allowedInputMime = new Map([
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
]);

export type ImageValidationErrorCode =
  'SIZE' | 'TYPE' | 'DIMENSIONS' | 'ANIMATION' | 'CORRUPT';

export class ImageValidationError extends Error {
  constructor(public readonly code: ImageValidationErrorCode) {
    super(`Invalid image: ${code}`);
  }
}

export interface PreparedMediaImage {
  bytes: Buffer;
  contentType: 'image/webp';
  width: number;
  height: number;
  sourceFormat: 'jpeg' | 'png' | 'webp';
}

/** Decode before accepting the browser's MIME claim; re-encode without source metadata. */
export async function prepareMediaImage(
  bytes: Buffer,
  declaredMime: string,
): Promise<PreparedMediaImage> {
  if (bytes.length === 0 || bytes.length > MEDIA_MAX_BYTES) {
    throw new ImageValidationError('SIZE');
  }
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(bytes, {
      failOn: 'error',
      limitInputPixels: MEDIA_MAX_SIDE * MEDIA_MAX_SIDE,
      animated: false,
    }).metadata();
  } catch {
    throw new ImageValidationError('CORRUPT');
  }
  const requiredMime = allowedInputMime.get(metadata.format ?? '');
  if (!requiredMime || declaredMime !== requiredMime) {
    throw new ImageValidationError('TYPE');
  }
  if ((metadata.pages ?? 1) > 1) {
    throw new ImageValidationError('ANIMATION');
  }
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width < MEDIA_MIN_SIDE ||
    metadata.height < MEDIA_MIN_SIDE ||
    metadata.width > MEDIA_MAX_SIDE ||
    metadata.height > MEDIA_MAX_SIDE
  ) {
    throw new ImageValidationError('DIMENSIONS');
  }

  let sanitized: Buffer;
  try {
    sanitized = await sharp(bytes, {
      failOn: 'error',
      limitInputPixels: MEDIA_MAX_SIDE * MEDIA_MAX_SIDE,
      animated: false,
    })
      .rotate()
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
  } catch {
    throw new ImageValidationError('CORRUPT');
  }
  if (sanitized.length > MEDIA_MAX_BYTES) {
    throw new ImageValidationError('SIZE');
  }
  const output = await sharp(sanitized).metadata();
  if (
    output.format !== 'webp' ||
    !output.width ||
    !output.height ||
    output.width < MEDIA_MIN_SIDE ||
    output.height < MEDIA_MIN_SIDE ||
    output.width > MEDIA_MAX_SIDE ||
    output.height > MEDIA_MAX_SIDE ||
    output.exif ||
    output.xmp ||
    output.iptc
  ) {
    throw new ImageValidationError('CORRUPT');
  }
  return {
    bytes: sanitized,
    contentType: 'image/webp',
    width: output.width,
    height: output.height,
    sourceFormat: metadata.format as 'jpeg' | 'png' | 'webp',
  };
}
