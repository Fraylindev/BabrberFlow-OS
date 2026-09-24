// Ensayo destructivo limitado al activo sintético que crea esta ejecución.
// Nunca imprime credenciales, public_id completo ni URLs firmadas.
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
// Ejecutar después de `pnpm --filter api build`: prueba exactamente las
// transformaciones que el adaptador backend va a permitir.
const { MEDIA_VARIANTS } = require('../dist/media/media-cloudinary.js');
const MAX_WAIT_MS = 5 * 60 * 1000;
const POLL_MS = 5000;
const variants = [
  { name: 'original', transformation: undefined },
  ...Object.entries(MEDIA_VARIANTS).map(([name, transformation]) => ({
    name,
    transformation,
  })),
];

if (
  !process.argv.includes('--qa') ||
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  process.stderr.write(
    'PENDIENTE: se requieren --qa y las tres variables CLOUDINARY_* de una cuenta de QA aislada.\n',
  );
  process.exitCode = 2;
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const publicId = `kortek-c1-qa/${crypto.randomUUID()}`;
  let uploaded = false;
  let destroyed = false;

  async function inspect(url) {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(15000),
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      status: response.status,
      image: response.headers.get('content-type')?.startsWith('image/') ?? false,
      length: bytes.byteLength,
      hash: crypto.createHash('sha256').update(bytes).digest('hex'),
      providerError: response.headers
        .get('x-cld-error')
        ?.replaceAll(publicId, '[asset]')
        .slice(0, 140),
    };
  }

  try {
    const usage = await cloudinary.api.usage();
    const plan = String(usage.plan ?? 'desconocido');
    process.stdout.write(`PLAN: ${plan}.\n`);
    if (!/free/iu.test(plan)) {
      throw new Error('La cuenta no acredita plan Free; ensayo detenido.');
    }
    const image = await sharp({
      create: {
        width: 640,
        height: 640,
        channels: 3,
        background: { r: 39, g: 82, b: 117 },
      },
    })
      .png()
      .toBuffer();
    const upload = await cloudinary.uploader.upload(
      `data:image/png;base64,${image.toString('base64')}`,
      {
        public_id: publicId,
        resource_type: 'image',
        type: 'authenticated',
        overwrite: false,
        eager: variants
          .filter((variant) => variant.transformation)
          .map((variant) => variant.transformation),
        eager_async: false,
      },
    );
    uploaded = true;
    if (upload.type !== 'authenticated' || upload.public_id !== publicId) {
      throw new Error('Cloudinary no confirmó la identidad/tipo del activo de QA.');
    }
    if (upload.eager?.length !== variants.length - 1) {
      throw new Error('Cloudinary no creó todas las variantes eager esperadas.');
    }
    upload.eager.forEach((entry, index) => {
      process.stdout.write(
        `EAGER ${variants[index + 1].name}: transformación=${entry.transformation}, URL firmada=${entry.secure_url?.includes('/s--') ?? false}\n`,
      );
    });

    const urls = variants.map((variant) => ({
      name: variant.name,
      url: cloudinary.url(publicId, {
        secure: true,
        type: 'authenticated',
        resource_type: 'image',
        format: 'png',
        sign_url: true,
        version: upload.version,
        ...(variant.transformation
          ? { raw_transformation: variant.transformation }
          : {}),
      }),
    }));

    const before = await Promise.all(urls.map(({ url }) => inspect(url)));
    before.forEach((result, index) => {
      process.stdout.write(
        `ANTES ${urls[index].name}: HTTP ${result.status}, imagen=${result.image}, bytes=${result.length}, sha256=${result.hash.slice(0, 12)}, error=${result.providerError ?? '-'}\n`,
      );
      if (result.status !== 200 || !result.image || result.length === 0) {
        throw new Error(`No se pudo precalentar ${urls[index].name}.`);
      }
    });

    const removedAt = Date.now();
    const removal = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      type: 'authenticated',
      invalidate: true,
    });
    destroyed = removal.result === 'ok';
    if (!destroyed) {
      throw new Error(`Cloudinary no confirmó destroy: ${removal.result}.`);
    }
    process.stdout.write('RETIRO: destroy(invalidate=true) confirmado.\n');

    let consecutiveDenied = 0;
    while (Date.now() - removedAt <= MAX_WAIT_MS) {
      const after = await Promise.all(urls.map(({ url }) => inspect(url)));
      const stillServed = after
        .map((result, index) => ({ result, name: urls[index].name }))
        .filter(({ result }) => result.status === 200 && result.image);
      process.stdout.write(
        `DESPUÉS +${Math.ceil((Date.now() - removedAt) / 1000)}s: ${after.map((result, index) => `${urls[index].name}=${result.status}/${result.image ? 'image' : 'no-image'}`).join(', ')}\n`,
      );
      if (stillServed.length === 0) {
        consecutiveDenied += 1;
        if (consecutiveDenied === 3) {
          break;
        }
      } else {
        consecutiveDenied = 0;
      }
      await delay(POLL_MS);
    }
    if (consecutiveDenied < 3) {
      throw new Error('Falló la revocación dentro de 5 minutos de las URLs conocidas.');
    }
    let resourceStillExists = false;
    try {
      await cloudinary.api.resource(publicId, {
        resource_type: 'image',
        type: 'authenticated',
      });
      resourceStillExists = true;
    } catch (error) {
      const status = error?.error?.http_code ?? error?.http_code;
      if (status !== 404) {
        throw new Error('Admin API no confirmó la ausencia del activo.');
      }
    }
    if (resourceStillExists) {
      throw new Error('Admin API todavía encuentra el activo eliminado.');
    }
    const listing = await cloudinary.api.resources({
      resource_type: 'image',
      type: 'authenticated',
      prefix: 'kortek-c1-qa/',
      max_results: 100,
    });
    const remaining = Array.isArray(listing.resources)
      ? listing.resources.length
      : -1;
    process.stdout.write(`ADMIN: activo ausente; activos QA remanentes=${remaining}.\n`);
    if (remaining !== 0) {
      throw new Error('Quedan activos de ensayo bajo el prefijo QA.');
    }
    process.stdout.write(
      'APROBADO EN ESTA CUENTA: original y variantes conocidas no entregaron imagen en tres sondeos consecutivos y Admin API no conserva el activo.\n',
    );
  } finally {
    if (uploaded && !destroyed) {
      try {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: 'image',
          type: 'authenticated',
          invalidate: true,
        });
      } catch {
        process.stderr.write(
          'No se pudo confirmar la limpieza final del activo sintético; revisar la cuenta de QA.\n',
        );
      }
    }
  }
}
