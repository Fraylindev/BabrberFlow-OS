import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { MediaAssetStatus, UserRole } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import sharp from 'sharp';
import { ClerkSessionVerifierService } from '../src/auth/clerk/clerk-session-verifier.service';
import { MEDIA_VARIANTS, MediaCloudinary } from '../src/media/media-cloudinary';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, requestApp } from './create-e2e-app';

const realQa = process.env.MEDIA_CLOUDINARY_QA === '1';
const CASE_TIMEOUT_MS = 7 * 60 * 1000;
const POLL_MS = 5000;

type ImageResponse = { status: number; image: boolean; bytes: number };

async function inspectKnownUrl(url: string): Promise<ImageResponse> {
  const response = await fetch(url, {
    redirect: 'manual',
    headers: { 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(15000),
  });
  const bytes = await response.arrayBuffer();
  return {
    status: response.status,
    image: response.headers.get('content-type')?.startsWith('image/') ?? false,
    bytes: bytes.byteLength,
  };
}

(realQa ? describe : describe.skip)(
  'Medios C1 — ciclo Cloudinary real en QA exclusiva',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let mediaCloud: MediaCloudinary;
    let assetId: string | null = null;
    let organizationId: string;
    let slug: string;
    let ownerId: string;
    let token: string;

    const verifier = {
      verify: jest.fn((request: globalThis.Request) => {
        const received = request.headers
          .get('authorization')
          ?.replace(/^Bearer\s+/iu, '');
        if (received !== token)
          throw new UnauthorizedException('Sesión no válida');
        return Promise.resolve({
          clerkUserId: token,
          sessionId: `media-qa-${token}`,
        });
      }),
    };

    beforeAll(async () => {
      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        throw new Error('Faltan credenciales Cloudinary QA.');
      }
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
      const usage: unknown = await cloudinary.api.usage();
      if (
        !usage ||
        typeof usage !== 'object' ||
        !('plan' in usage) ||
        usage.plan !== 'Free'
      ) {
        throw new Error('La prueba real requiere plan Cloudinary Free.');
      }
      token = randomUUID();
      slug = randomUUID();
      app = await createE2eApp((builder) =>
        builder
          .overrideProvider(ClerkSessionVerifierService)
          .useValue(verifier)
          .overrideGuard(ThrottlerGuard)
          .useValue({ canActivate: () => true }),
      );
      prisma = app.get(PrismaService);
      mediaCloud = app.get(MediaCloudinary);
      const organization = await prisma.db.organization.create({
        data: {
          name: 'Medios QA sintéticos',
          slug,
          email: `${token}@media-qa.example.test`,
          timeZone: 'America/Santo_Domingo',
        },
      });
      organizationId = organization.id;
      await prisma.db.cmsPage.update({
        where: { organizationId },
        data: {
          version: 1,
          draftRevision: 1,
          draft: {},
          publishedSnapshot: {},
          publishedRevision: 1,
          isPublished: true,
        },
      });
      const owner = await prisma.db.user.create({
        data: {
          name: 'Owner Medios QA',
          email: `${randomUUID()}@media-user.example.test`,
          clerkUserId: token,
          memberships: {
            create: { organizationId, role: UserRole.OWNER },
          },
        },
      });
      ownerId = owner.id;
    });

    afterAll(async () => {
      if (assetId) {
        const publicId = `kortek-media/${assetId}`;
        const result: unknown = await cloudinary.uploader.destroy(publicId, {
          resource_type: 'image',
          type: 'authenticated',
          invalidate: true,
        });
        if (
          !result ||
          typeof result !== 'object' ||
          !('result' in result) ||
          (result.result !== 'ok' && result.result !== 'not found')
        ) {
          throw new Error('No se confirmó la limpieza Cloudinary QA.');
        }
      }
      if (app) await app.close();
    });

    it(
      'sube, modera, publica y retira original y tres derivados previamente conocidos',
      async () => {
        const auth = {
          Authorization: `Bearer ${token}`,
          'x-organization-id': organizationId,
        };
        const image = await sharp({
          create: {
            width: 640,
            height: 640,
            channels: 3,
            background: '#336699',
          },
        })
          .png()
          .toBuffer();
        const uploaded = await requestApp(app)
          .post('/media/uploads')
          .set(auth)
          .field('purpose', 'GALLERY')
          .field('altText', 'Imagen sintética de prueba de custodia')
          .field('decorative', 'false')
          .attach('file', image, {
            filename: 'media-c1-qa.png',
            contentType: 'image/png',
          });
        expect(uploaded.status).toBe(201);
        assetId = (uploaded.body as { id: string }).id;
        const asset = await prisma.db.mediaAsset.findUniqueOrThrow({
          where: { id: assetId },
        });
        expect(asset.organizationId).toBe(organizationId);
        expect(asset.uploadedByUserId).toBe(ownerId);
        expect(asset.cloudPublicId).toBe(`kortek-media/${assetId}`);
        expect(asset.cloudAssetId).toBeTruthy();
        expect(asset.cloudVersion).toBeTruthy();

        const moderationDeadline = Date.now() + 2 * 60 * 1000;
        let moderation: string = 'pending';
        while (Date.now() < moderationDeadline) {
          moderation = await mediaCloud.moderationStatus({
            assetId: asset.cloudAssetId!,
            publicId: asset.cloudPublicId!,
          });
          if (moderation !== 'pending') break;
          await delay(POLL_MS);
        }
        expect(moderation).toBe('approved');
        await requestApp(app)
          .post(`/media/${assetId}/publish`)
          .set(auth)
          .send({ expectedRevision: 1, idempotencyKey: randomUUID() })
          .expect(201);

        const projection = await requestApp(app)
          .get(`/public/${slug}/media`)
          .expect(200);
        const locator = (projection.body as { gallery: { url: string }[] })
          .gallery[0].url;
        await requestApp(app)
          .get(locator)
          .expect(200)
          .expect('Content-Type', /image\/webp/u);

        const variants = [
          ['original', undefined],
          ...Object.entries(MEDIA_VARIANTS),
        ] as const;
        const knownUrls = variants.map(([, transformation]) =>
          cloudinary.url(asset.cloudPublicId!, {
            secure: true,
            type: 'authenticated',
            resource_type: 'image',
            format: 'webp',
            sign_url: true,
            version: asset.cloudVersion!,
            ...(transformation ? { raw_transformation: transformation } : {}),
          }),
        );
        const before = await Promise.all(knownUrls.map(inspectKnownUrl));
        expect(before).toHaveLength(4);
        expect(
          before.every(
            (item) => item.status === 200 && item.image && item.bytes > 0,
          ),
        ).toBe(true);

        await requestApp(app)
          .post(`/media/${assetId}/retire`)
          .set(auth)
          .send({ expectedRevision: 1, idempotencyKey: randomUUID() })
          .expect(201);
        const retiredAt = Date.now();
        await requestApp(app).get(locator).expect(404);

        let deniedChecks = 0;
        while (Date.now() - retiredAt < 5 * 60 * 1000) {
          const current = await prisma.db.mediaAsset.findUniqueOrThrow({
            where: { id: assetId },
          });
          if (current.status === MediaAssetStatus.PURGED) {
            const after = await Promise.all(knownUrls.map(inspectKnownUrl));
            const denied = after.every(
              (item) => item.status === 404 && !item.image,
            );
            deniedChecks = denied ? deniedChecks + 1 : 0;
            if (deniedChecks === 3) break;
          }
          await delay(POLL_MS);
        }
        expect(deniedChecks).toBe(3);
        let adminStatus: number | undefined;
        try {
          await cloudinary.api.resource(asset.cloudPublicId!, {
            resource_type: 'image',
            type: 'authenticated',
          });
        } catch (error) {
          if (error && typeof error === 'object') {
            const record = error as {
              http_code?: number;
              error?: { http_code?: number };
            };
            adminStatus = record.error?.http_code ?? record.http_code;
          }
        }
        expect(adminStatus).toBe(404);
        const job = await prisma.db.mediaPurgeJob.findUniqueOrThrow({
          where: { assetId },
        });
        expect(job.completedAt).not.toBeNull();
      },
      CASE_TIMEOUT_MS,
    );
  },
);
