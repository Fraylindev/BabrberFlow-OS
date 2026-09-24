import sharp from 'sharp';
import { ImageValidationError, prepareMediaImage } from './media-image';

function sample(width = 640, height = 640) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 70, b: 90 },
    },
  });
}

describe('media image validation and sanitization', () => {
  it('accepts a decoded JPEG and re-encodes it as metadata-free WebP', async () => {
    const input = await sample()
      .jpeg()
      .withExif({ IFD0: { Artist: 'Private Photographer' } })
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const result = await prepareMediaImage(input, 'image/jpeg');
    expect(result.contentType).toBe('image/webp');
    expect(result.sourceFormat).toBe('jpeg');
    expect(result.width).toBe(640);
    expect(result.height).toBe(640);
    const metadata = await sharp(result.bytes).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(metadata.iptc).toBeUndefined();
  });

  it('rejects a false MIME claim and corrupt bytes', async () => {
    const png = await sample().png().toBuffer();
    await expect(prepareMediaImage(png, 'image/jpeg')).rejects.toMatchObject({
      code: 'TYPE',
    });
    await expect(
      prepareMediaImage(Buffer.from('not an image'), 'image/png'),
    ).rejects.toBeInstanceOf(ImageValidationError);
  });

  it('enforces both dimension and byte limits', async () => {
    const small = await sample(639).png().toBuffer();
    await expect(prepareMediaImage(small, 'image/png')).rejects.toMatchObject({
      code: 'DIMENSIONS',
    });
    await expect(
      prepareMediaImage(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png'),
    ).rejects.toMatchObject({ code: 'SIZE' });
  });

  it('rejects multi-page animated input', async () => {
    const firstFrame = await sharp({
      create: {
        width: 640,
        height: 640,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();
    const secondFrame = await sharp({
      create: {
        width: 640,
        height: 640,
        channels: 3,
        background: { r: 200, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();
    const animation = await sharp([firstFrame, secondFrame], {
      join: { animated: true },
    })
      .webp({ loop: 0, delay: 100 })
      .toBuffer();
    expect((await sharp(animation).metadata()).pages).toBe(2);
    await expect(
      prepareMediaImage(animation, 'image/webp'),
    ).rejects.toMatchObject({ code: 'ANIMATION' });
  });
});
