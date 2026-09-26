import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { MediaAssetPurpose, MediaAssetStatus, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { ClerkSessionVerifierService } from '../src/auth/clerk/clerk-session-verifier.service';
import { MediaCloudinary } from '../src/media/media-cloudinary';
import { MediaPurgeWorker } from '../src/media/media-purge.worker';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, requestApp } from './create-e2e-app';

const uuid = () => randomUUID();
const command = (expectedRevision: number) => ({
  expectedRevision,
  idempotencyKey: uuid(),
});
type PublicImage = { id: string; url: string };
type PublicProjection = {
  gallery: PublicImage[];
  hero: PublicImage | null;
  services: { serviceId: string; image: PublicImage }[];
  professionals: { professionalId: string; avatar: PublicImage }[];
  promotions: { id: string }[];
};
function bodyOf<T>(response: { body: unknown }): T {
  return response.body as T;
}

describe('Medios/Promociones C1 — HTTP y PostgreSQL aislado', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let image: Buffer;
  let previousSigningSecret: string | undefined;
  const sessions = new Map<string, string>();
  const cloud = {
    upload: jest.fn((_: unknown, id: string) =>
      Promise.resolve({
        assetId: uuid(),
        publicId: `kortek-media/${id}`,
        version: 1,
        format: 'webp',
        bytes: 1000,
        width: 640,
        height: 640,
        moderation: 'approved',
      }),
    ),
    moderationStatus: jest.fn(() => Promise.resolve('approved')),
    destroy: jest.fn(() => Promise.resolve()),
    fetchVariant: jest.fn(() =>
      Promise.resolve(Buffer.from('RIFF-test-image')),
    ),
  };
  const verifier = {
    verify: jest.fn((request: globalThis.Request) => {
      const token = request.headers
        .get('authorization')
        ?.replace(/^Bearer\s+/i, '');
      const identity = token ? sessions.get(token) : undefined;
      if (!identity) throw new UnauthorizedException('Sesión no válida');
      return Promise.resolve({
        clerkUserId: identity,
        sessionId: `session-${identity}`,
      });
    }),
  };
  let tenant: { id: string; slug: string };
  let other: { id: string; slug: string };
  let actors: Record<string, { id: string; token: string }>;
  let professionalId: string;

  beforeAll(async () => {
    previousSigningSecret = process.env.CLOUDINARY_API_SECRET;
    process.env.CLOUDINARY_API_SECRET = randomUUID();
    image = await sharp({
      create: { width: 640, height: 640, channels: 3, background: '#336699' },
    })
      .png()
      .toBuffer();
    app = await createE2eApp((builder) =>
      builder
        .overrideProvider(ClerkSessionVerifierService)
        .useValue(verifier)
        .overrideProvider(MediaCloudinary)
        .useValue(cloud)
        .overrideProvider(MediaPurgeWorker)
        .useValue({ onModuleInit() {}, onModuleDestroy() {} })
        .overrideGuard(ThrottlerGuard)
        .useValue({ canActivate: () => true }),
    );
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    if (previousSigningSecret === undefined) {
      delete process.env.CLOUDINARY_API_SECRET;
    } else {
      process.env.CLOUDINARY_API_SECRET = previousSigningSecret;
    }
  });

  beforeEach(async () => {
    sessions.clear();
    for (const mock of Object.values(cloud)) mock.mockClear();
    async function organization() {
      const suffix = uuid();
      const result = await prisma.db.organization.create({
        data: {
          name: 'Negocio QA',
          slug: suffix,
          email: `${suffix}@media.example.test`,
          timeZone: 'America/Santo_Domingo',
        },
      });
      await prisma.db.cmsPage.update({
        where: { organizationId: result.id },
        data: {
          version: 1,
          draftRevision: 1,
          draft: {},
          publishedSnapshot: {},
          publishedRevision: 1,
          isPublished: true,
        },
      });
      return result;
    }
    [tenant, other] = await Promise.all([organization(), organization()]);
    actors = {};
    for (const role of [
      UserRole.OWNER,
      UserRole.ADMIN,
      UserRole.BARBER,
      UserRole.RECEPTIONIST,
    ]) {
      const token = uuid();
      const user = await prisma.db.user.create({
        data: {
          name: role,
          email: `${token}@media-user.example.test`,
          clerkUserId: token,
          memberships: { create: { organizationId: tenant.id, role } },
        },
      });
      sessions.set(token, token);
      actors[role] = { id: user.id, token };
    }
    const professional = await prisma.db.professional.create({
      data: {
        organizationId: tenant.id,
        name: 'Barbero QA',
        userId: actors.BARBER.id,
        status: 'ACTIVE',
        isPublic: true,
      },
    });
    professionalId = professional.id;
  });

  function auth(role: keyof typeof actors = 'OWNER') {
    return {
      Authorization: `Bearer ${actors[role].token}`,
      'x-organization-id': tenant.id,
    };
  }

  function upload(
    role: keyof typeof actors,
    purpose: MediaAssetPurpose,
    targetId?: string,
  ) {
    const request = requestApp(app)
      .post('/media/uploads')
      .set(auth(role))
      .field('purpose', purpose)
      .field('altText', 'Imagen descriptiva del negocio')
      .field('decorative', 'false');
    if (targetId) request.field('targetId', targetId);
    return request.attach('file', image, {
      filename: 'fixture.png',
      contentType: 'image/png',
    });
  }

  it('aísla tenants, publica imagen individual y orden hero por revisión separada', async () => {
    const first = await upload('ADMIN', MediaAssetPurpose.GALLERY).expect(201);
    const id = bodyOf<{ id: string }>(first).id;
    expect(bodyOf<Record<string, unknown>>(first)).not.toHaveProperty(
      'cloudPublicId',
    );
    expect(
      await prisma.db.mediaAsset.findUniqueOrThrow({ where: { id } }),
    ).toMatchObject({ organizationId: tenant.id, status: 'APPROVED' });
    await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth('ADMIN'))
      .send(command(1))
      .expect(403);
    await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth('RECEPTIONIST'))
      .send(command(1))
      .expect(403);
    await requestApp(app)
      .get(`/public/${tenant.slug}/media`)
      .expect(200)
      .expect((response) => {
        expect(bodyOf<PublicProjection>(response).gallery).toEqual([]);
      });
    await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth())
      .send(command(1))
      .expect(201);
    const beforeOrder = await requestApp(app)
      .get(`/public/${tenant.slug}/media`)
      .expect(200);
    expect(bodyOf<PublicProjection>(beforeOrder).gallery).toHaveLength(1);
    expect(bodyOf<PublicProjection>(beforeOrder).hero).toBeNull();
    const locator = bodyOf<PublicProjection>(beforeOrder).gallery[0].url;
    await requestApp(app)
      .get(locator)
      .expect(200)
      .expect('Content-Type', /image\/webp/);
    await requestApp(app)
      .patch('/media/gallery-order')
      .set(auth('ADMIN'))
      .send({
        expectedVersion: 0,
        assetIds: [id],
        heroAssetId: id,
        idempotencyKey: uuid(),
      })
      .expect(200);
    expect(
      bodyOf<PublicProjection>(
        await requestApp(app).get(`/public/${tenant.slug}/media`).expect(200),
      ).hero,
    ).toBeNull();
    await requestApp(app)
      .post('/media/gallery-order/publish')
      .set(auth())
      .send({ expectedVersion: 1, idempotencyKey: uuid() })
      .expect(201);
    expect(
      bodyOf<PublicProjection>(
        await requestApp(app).get(`/public/${tenant.slug}/media`).expect(200),
      ).hero?.id,
    ).toBe(id);
    await requestApp(app)
      .get(`/public/${other.slug}/media`)
      .expect(200)
      .expect((response) =>
        expect(bodyOf<PublicProjection>(response).gallery).toEqual([]),
      );
    await requestApp(app)
      .post(`/media/${id}/retire`)
      .set(auth())
      .send(command(1))
      .expect(201);
    await requestApp(app).get(locator).expect(404);
    expect(
      bodyOf<PublicProjection>(
        await requestApp(app).get(`/public/${tenant.slug}/media`).expect(200),
      ).gallery,
    ).toEqual([]);
  });

  it('BARBER solo controla su avatar; OWNER puede cuarentenarlo después', async () => {
    await upload('BARBER', MediaAssetPurpose.GALLERY).expect(403);
    const alien = await prisma.db.professional.create({
      data: { organizationId: other.id, name: 'Otro' },
    });
    await upload(
      'BARBER',
      MediaAssetPurpose.PROFESSIONAL_AVATAR,
      alien.id,
    ).expect(404);
    const asset = await upload(
      'BARBER',
      MediaAssetPurpose.PROFESSIONAL_AVATAR,
      professionalId,
    ).expect(201);
    const id = bodyOf<{ id: string }>(asset).id;
    await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth('BARBER'))
      .send(command(1))
      .expect(201);
    const publicMedia = await requestApp(app)
      .get(`/public/${tenant.slug}/media`)
      .expect(200);
    expect(bodyOf<PublicProjection>(publicMedia).professionals).toEqual([
      expect.objectContaining({ professionalId }),
    ]);
    const locator =
      bodyOf<PublicProjection>(publicMedia).professionals[0].avatar.url;
    await requestApp(app)
      .post(`/media/${id}/quarantine`)
      .set(auth())
      .send(command(1))
      .expect(201);
    await requestApp(app).get(locator).expect(404);
    expect(
      (
        await prisma.db.mediaPurgeJob.findUniqueOrThrow({
          where: { assetId: id },
        })
      ).completedAt,
    ).toBeNull();
  });

  it('archivar profesional desvincula su avatar y cierra un localizador conocido', async () => {
    const uploaded = await upload(
      'BARBER',
      MediaAssetPurpose.PROFESSIONAL_AVATAR,
      professionalId,
    ).expect(201);
    const id = bodyOf<{ id: string }>(uploaded).id;
    await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth('BARBER'))
      .send(command(1))
      .expect(201);
    const publicMedia = await requestApp(app)
      .get(`/public/${tenant.slug}/media`)
      .expect(200);
    const locator =
      bodyOf<PublicProjection>(publicMedia).professionals[0].avatar.url;
    await requestApp(app)
      .delete(`/professionals/${professionalId}`)
      .set(auth())
      .expect(200);
    expect(
      await prisma.db.mediaAsset.findUniqueOrThrow({ where: { id } }),
    ).toMatchObject({ status: MediaAssetStatus.QUARANTINED, targetId: null });
    expect(
      await prisma.db.mediaPurgeJob.findUnique({ where: { assetId: id } }),
    ).not.toBeNull();
    await requestApp(app).get(locator).expect(404);
  });

  it('desactivar servicio desvincula imagen y encola purga en la misma transacción', async () => {
    const service = await prisma.db.service.create({
      data: {
        organizationId: tenant.id,
        name: 'Corte QA',
        duration: 30,
        price: '500.00',
      },
    });
    const asset = await upload(
      'ADMIN',
      MediaAssetPurpose.SERVICE,
      service.id,
    ).expect(201);
    const id = bodyOf<{ id: string }>(asset).id;
    await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth())
      .send(command(1))
      .expect(201);
    const publicMedia = await requestApp(app)
      .get(`/public/${tenant.slug}/media`)
      .expect(200);
    const locator = bodyOf<PublicProjection>(publicMedia).services[0].image.url;
    await requestApp(app)
      .delete(`/services/${service.id}`)
      .set(auth())
      .expect(200);
    const detached = await prisma.db.mediaAsset.findUniqueOrThrow({
      where: { id },
    });
    expect(detached).toMatchObject({
      status: MediaAssetStatus.QUARANTINED,
      targetId: null,
    });
    expect(
      await prisma.db.mediaPurgeJob.findUnique({ where: { assetId: id } }),
    ).not.toBeNull();
    await requestApp(app).get(locator).expect(404);
    await requestApp(app)
      .patch(`/services/${service.id}/reactivate`)
      .set(auth())
      .expect(200);
    expect(
      bodyOf<PublicProjection>(
        await requestApp(app).get(`/public/${tenant.slug}/media`).expect(200),
      ).services,
    ).toEqual([]);
  });

  it('rechaza promesa económica y publica texto e imagen propios solo durante vigencia UTC', async () => {
    await requestApp(app)
      .post('/media/promotions')
      .set(auth('ADMIN'))
      .send({
        idempotencyKey: uuid(),
        title: 'Temporada',
        body: 'Corte por RD$ 500 durante septiembre',
        startDate: '2026-01-01',
        endDate: '2099-01-01',
      })
      .expect(400);
    await requestApp(app)
      .post('/media/promotions')
      .set(auth('ADMIN'))
      .send({
        idempotencyKey: uuid(),
        title: 'Temporada',
        body: 'Reserva con promoción 2x1 durante septiembre',
        startDate: '2026-01-01',
        endDate: '2099-01-01',
      })
      .expect(400);
    const created = await requestApp(app)
      .post('/media/promotions')
      .set(auth('ADMIN'))
      .send({
        idempotencyKey: uuid(),
        title: 'Estilos de temporada',
        body: 'Conoce nuestros estilos actuales y reserva tu visita.',
        startDate: '2026-01-01',
        endDate: '2099-01-01',
      })
      .expect(201);
    const id = bodyOf<{ id: string }>(created).id;
    const asset = await upload('ADMIN', MediaAssetPurpose.PROMOTION, id).expect(
      201,
    );
    await requestApp(app)
      .patch(`/media/promotions/${id}`)
      .set(auth('ADMIN'))
      .send({
        expectedVersion: 0,
        idempotencyKey: uuid(),
        title: 'Estilos de temporada',
        body: 'Conoce nuestros estilos actuales y reserva tu visita.',
        startDate: '2026-01-01',
        endDate: '2099-01-01',
        imageAssetId: bodyOf<{ id: string }>(asset).id,
      })
      .expect(200);
    await requestApp(app)
      .post(`/media/promotions/${id}/publish`)
      .set(auth('ADMIN'))
      .send({ expectedVersion: 1, idempotencyKey: uuid() })
      .expect(403);
    const publishCommand = { expectedVersion: 1, idempotencyKey: uuid() };
    await requestApp(app)
      .post(`/media/promotions/${id}/publish`)
      .set(auth())
      .send(publishCommand)
      .expect(201);
    const promotionReceipt = await prisma.db.mediaOperation.findFirstOrThrow({
      where: { resourceId: id, operation: 'PUBLISH_PROMOTION' },
    });
    expect(JSON.stringify(promotionReceipt.result)).not.toContain(
      'Conoce nuestros estilos',
    );
    const promotion = await prisma.db.mediaPromotion.findUniqueOrThrow({
      where: { id },
    });
    expect(promotion.startsAtUtc?.toISOString()).toBe(
      '2026-01-01T04:00:00.000Z',
    );
    expect(
      bodyOf<PublicProjection>(
        await requestApp(app).get(`/public/${tenant.slug}/media`).expect(200),
      ).promotions,
    ).toHaveLength(1);
    await prisma.db.mediaPromotion.update({
      where: { id },
      data: {
        endsAtUtc: new Date('2020-01-01T00:00:00Z'),
        isPublished: false,
        version: { increment: 1 },
      },
    });
    await requestApp(app)
      .post(`/media/promotions/${id}/publish`)
      .set(auth())
      .send(publishCommand)
      .expect(409);
    expect(
      bodyOf<PublicProjection>(
        await requestApp(app).get(`/public/${tenant.slug}/media`).expect(200),
      ).promotions,
    ).toEqual([]);
  });

  it('cierra entrega y encola purga de todos los medios al inactivar el negocio', async () => {
    const uploaded = await upload('ADMIN', MediaAssetPurpose.GALLERY).expect(
      201,
    );
    const id = bodyOf<{ id: string }>(uploaded).id;
    await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth())
      .send(command(1))
      .expect(201);
    const locator = bodyOf<PublicProjection>(
      await requestApp(app).get(`/public/${tenant.slug}/media`).expect(200),
    ).gallery[0].url;
    await prisma.db.organization.update({
      where: { id: tenant.id },
      data: { isActive: false },
    });
    expect(
      (await prisma.db.mediaAsset.findUniqueOrThrow({ where: { id } })).status,
    ).toBe(MediaAssetStatus.RETIRED);
    expect(
      await prisma.db.mediaPurgeJob.findUnique({ where: { assetId: id } }),
    ).not.toBeNull();
    await requestApp(app).get(locator).expect(404);
    await requestApp(app).get(`/public/${tenant.slug}/media`).expect(404);
  });

  it('trata recursos e identificadores de otro tenant como inexistentes', async () => {
    const foreignUser = await prisma.db.user.create({
      data: {
        name: 'Owner ajeno',
        email: `${uuid()}@media-user.example.test`,
        clerkUserId: uuid(),
        memberships: {
          create: { organizationId: other.id, role: UserRole.OWNER },
        },
      },
    });
    const foreignToken = uuid();
    await prisma.db.user.update({
      where: { id: foreignUser.id },
      data: { clerkUserId: foreignToken },
    });
    sessions.set(foreignToken, foreignToken);
    const foreignAuth = {
      Authorization: `Bearer ${foreignToken}`,
      'x-organization-id': other.id,
    };
    const asset = await upload('ADMIN', MediaAssetPurpose.GALLERY).expect(201);
    const id = bodyOf<{ id: string }>(asset).id;
    await requestApp(app)
      .patch(`/media/${id}`)
      .set(foreignAuth)
      .send({ expectedRevision: 1, altText: 'Descripción ajena válida' })
      .expect(404);
    await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(foreignAuth)
      .send(command(1))
      .expect(404);
    const service = await prisma.db.service.create({
      data: {
        organizationId: other.id,
        name: 'Servicio ajeno',
        duration: 30,
        price: '500.00',
      },
    });
    await upload('ADMIN', MediaAssetPurpose.SERVICE, service.id).expect(404);
  });

  it('bloquea publicación sin moderación aprobada y reserva máximo cinco borradores bajo concurrencia', async () => {
    cloud.moderationStatus.mockResolvedValueOnce('pending');
    const approved = await upload('ADMIN', MediaAssetPurpose.GALLERY).expect(
      201,
    );
    const id = bodyOf<{ id: string }>(approved).id;
    await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth())
      .send(command(1))
      .expect(409);
    expect(
      (await prisma.db.mediaAsset.findUniqueOrThrow({ where: { id } })).status,
    ).toBe(MediaAssetStatus.APPROVED);
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () =>
        upload('ADMIN', MediaAssetPurpose.GALLERY),
      ),
    );
    expect(attempts.filter((attempt) => attempt.status === 201)).toHaveLength(
      4,
    );
    expect(attempts.filter((attempt) => attempt.status === 409)).toHaveLength(
      1,
    );
    expect(cloud.upload).toHaveBeenCalledTimes(5);
  });

  it('reintenta purga fallida sin reabrir entrega y borra metadatos tras éxito', async () => {
    const uploaded = await upload('ADMIN', MediaAssetPurpose.GALLERY).expect(
      201,
    );
    const id = bodyOf<{ id: string }>(uploaded).id;
    await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth())
      .send(command(1))
      .expect(201);
    const locator = bodyOf<PublicProjection>(
      await requestApp(app).get(`/public/${tenant.slug}/media`).expect(200),
    ).gallery[0].url;
    await requestApp(app)
      .post(`/media/${id}/retire`)
      .set(auth())
      .send(command(1))
      .expect(201);
    await prisma.db.mediaPurgeJob.update({
      where: { assetId: id },
      data: { nextAttemptAt: new Date('2000-01-01T00:00:00.000Z') },
    });
    cloud.destroy.mockRejectedValueOnce(new Error('Proveedor no disponible'));
    const worker = new MediaPurgeWorker(
      prisma,
      cloud as unknown as MediaCloudinary,
    );
    await worker.tick();
    expect(
      await prisma.db.mediaAsset.findUniqueOrThrow({ where: { id } }),
    ).toMatchObject({ status: MediaAssetStatus.RETIRED });
    await requestApp(app).get(locator).expect(404);
    await prisma.db.mediaPurgeJob.update({
      where: { assetId: id },
      data: { nextAttemptAt: new Date('2000-01-01T00:00:00.000Z') },
    });
    await worker.tick();
    expect(
      await prisma.db.mediaAsset.findUniqueOrThrow({ where: { id } }),
    ).toMatchObject({
      status: MediaAssetStatus.PURGED,
      cloudPublicId: null,
      altText: '',
      sha256: '',
    });
    expect(
      (
        await prisma.db.mediaPurgeJob.findUniqueOrThrow({
          where: { assetId: id },
        })
      ).completedAt,
    ).not.toBeNull();
  });

  it('conserva la purga si el negocio se desactiva durante una carga', async () => {
    let finishUpload!: (value: {
      assetId: ReturnType<typeof uuid>;
      publicId: string;
      version: number;
      format: 'webp';
      bytes: number;
      width: number;
      height: number;
      moderation: 'approved';
    }) => void;
    let uploadStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      uploadStarted = resolve;
    });
    cloud.upload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishUpload = resolve;
          uploadStarted();
        }),
    );
    const pending = upload('ADMIN', MediaAssetPurpose.GALLERY)
      .expect(503)
      .then((response) => response);
    await started;
    const reserved = await prisma.db.mediaAsset.findFirstOrThrow({
      where: { organizationId: tenant.id, status: MediaAssetStatus.STAGED },
    });
    await prisma.db.organization.update({
      where: { id: tenant.id },
      data: { isActive: false },
    });
    const worker = new MediaPurgeWorker(
      prisma,
      cloud as unknown as MediaCloudinary,
    );
    await worker.tick();
    expect(
      await prisma.db.mediaAsset.findUniqueOrThrow({
        where: { id: reserved.id },
      }),
    ).toMatchObject({ status: MediaAssetStatus.RETIRED });
    expect(cloud.destroy).not.toHaveBeenCalled();
    finishUpload({
      assetId: uuid(),
      publicId: `kortek-media/${reserved.id}`,
      version: 1,
      format: 'webp',
      bytes: 1000,
      width: 640,
      height: 640,
      moderation: 'approved',
    });
    await pending;
    expect(cloud.destroy).toHaveBeenCalledWith(`kortek-media/${reserved.id}`);
    await prisma.db.mediaAsset.update({
      where: { id: reserved.id },
      data: { stagingExpiresAt: new Date('2000-01-01T00:00:00.000Z') },
    });
    await prisma.db.mediaPurgeJob.update({
      where: { assetId: reserved.id },
      data: { nextAttemptAt: new Date('2000-01-01T00:00:00.000Z') },
    });
    await worker.tick();
    expect(
      await prisma.db.mediaAsset.findUniqueOrThrow({
        where: { id: reserved.id },
      }),
    ).toMatchObject({ status: MediaAssetStatus.PURGED });
    expect(
      (
        await prisma.db.mediaPurgeJob.findUniqueOrThrow({
          where: { assetId: reserved.id },
        })
      ).completedAt,
    ).not.toBeNull();
  });

  it('reproduce una publicación solo mientras sigue vigente y rechaza replay tras retiro', async () => {
    const uploaded = await upload('ADMIN', MediaAssetPurpose.GALLERY).expect(
      201,
    );
    const id = bodyOf<{ id: string }>(uploaded).id;
    const mutation = command(1);
    const first = await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth())
      .send(mutation)
      .expect(201);
    const replay = await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth())
      .send(mutation)
      .expect(201);
    expect(replay.body).toEqual(first.body);
    await requestApp(app)
      .post(`/media/${id}/retire`)
      .set(auth())
      .send(command(1))
      .expect(201);
    await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth())
      .send(mutation)
      .expect(409);
    expect(
      (await prisma.db.mediaAsset.findUniqueOrThrow({ where: { id } })).status,
    ).toBe(MediaAssetStatus.RETIRED);
  });

  it('mantiene caption publicado hasta nueva revisión y permite limpiarlo con null', async () => {
    const uploaded = await upload('ADMIN', MediaAssetPurpose.GALLERY).expect(
      201,
    );
    const id = bodyOf<{ id: string }>(uploaded).id;
    await requestApp(app)
      .patch(`/media/${id}`)
      .set(auth('ADMIN'))
      .send({ expectedRevision: 1, caption: 'Texto editorial' })
      .expect(200);
    await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth())
      .send(command(2))
      .expect(201);
    const receipt = await prisma.db.mediaOperation.findFirstOrThrow({
      where: { resourceId: id, operation: 'PUBLISH' },
    });
    expect(JSON.stringify(receipt.result)).not.toContain('Texto editorial');
    await requestApp(app)
      .patch(`/media/${id}`)
      .set(auth('ADMIN'))
      .send({ expectedRevision: 2, caption: null })
      .expect(200);
    const before = bodyOf<{
      gallery: { caption: string | null }[];
    }>(await requestApp(app).get(`/public/${tenant.slug}/media`).expect(200));
    expect(before.gallery[0].caption).toBe('Texto editorial');
    await requestApp(app)
      .post(`/media/${id}/publish`)
      .set(auth())
      .send(command(3))
      .expect(201);
    const after = bodyOf<{
      gallery: { caption: string | null }[];
    }>(await requestApp(app).get(`/public/${tenant.slug}/media`).expect(200));
    expect(after.gallery[0].caption).toBeNull();
  });

  it('mantiene el tope de 20 publicados bajo dos publicaciones concurrentes', async () => {
    for (let index = 0; index < 19; index += 1) {
      const uploaded = await upload('ADMIN', MediaAssetPurpose.GALLERY).expect(
        201,
      );
      await requestApp(app)
        .post(`/media/${bodyOf<{ id: string }>(uploaded).id}/publish`)
        .set(auth())
        .send(command(1))
        .expect(201);
    }
    const candidates = await Promise.all(
      Array.from({ length: 2 }, () =>
        upload('ADMIN', MediaAssetPurpose.GALLERY),
      ),
    );
    const results = await Promise.all(
      candidates.map((candidate) =>
        requestApp(app)
          .post(`/media/${bodyOf<{ id: string }>(candidate).id}/publish`)
          .set(auth())
          .send(command(1)),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(
      await prisma.db.mediaAsset.count({
        where: {
          organizationId: tenant.id,
          status: MediaAssetStatus.PUBLISHED,
        },
      }),
    ).toBe(20);
  }, 30_000);
});
