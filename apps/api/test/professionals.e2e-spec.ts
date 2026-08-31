import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, requestApp } from './create-e2e-app';

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected an object response');
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Expected an array response');
  return value;
}

describe('Profesionales: perfil propio BARBER (e2e PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantAId: string;
  let tenantASlug: string;
  let tenantBId: string;
  let barberId: string;
  let professionalId: string;
  let otherProfessionalId: string;
  let tenantAToken: string;
  let tenantBToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);
    const jwt = app.get(JwtService);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const [tenantA, tenantB, barber] = await Promise.all([
      prisma.db.organization.create({
        data: {
          name: 'Profesionales tenant A',
          slug: `professionals-a-${suffix}`,
          email: `professionals-a-${suffix}@organization.test`,
        },
      }),
      prisma.db.organization.create({
        data: {
          name: 'Profesionales tenant B',
          slug: `professionals-b-${suffix}`,
          email: `professionals-b-${suffix}@organization.test`,
        },
      }),
      prisma.db.user.create({
        data: {
          name: 'Barber perfil propio',
          email: `professionals-${suffix}@identity.test`,
          password: null,
        },
      }),
    ]);
    tenantAId = tenantA.id;
    tenantASlug = tenantA.slug;
    tenantBId = tenantB.id;
    barberId = barber.id;

    await prisma.db.membership.createMany({
      data: [
        { userId: barberId, organizationId: tenantAId, role: UserRole.BARBER },
        { userId: barberId, organizationId: tenantBId, role: UserRole.BARBER },
      ],
    });
    const professional = await prisma.db.professional.create({
      data: {
        organizationId: tenantAId,
        userId: barberId,
        name: 'Barber vinculado',
        phone: null,
        status: 'ACTIVE',
        isPublic: true,
      },
    });
    professionalId = professional.id;
    otherProfessionalId = (
      await prisma.db.professional.create({
        data: {
          organizationId: tenantAId,
          name: 'Profesional ajeno',
          phone: '+18095550099',
          status: 'ACTIVE',
          isPublic: true,
        },
      })
    ).id;
    [tenantAToken, tenantBToken] = await Promise.all([
      jwt.signAsync({ sub: barberId, organizationId: tenantAId }),
      jwt.signAsync({ sub: barberId, organizationId: tenantBId }),
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('devuelve el teléfono solo en la proyección propia', async () => {
    const response = await requestApp(app)
      .get('/professionals/me')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .expect(200);

    const body = asRecord(response.body as unknown);
    expect(body).toEqual(
      expect.objectContaining({
        id: professionalId,
        name: 'Barber vinculado',
        phone: null,
      }),
    );
    expect(body).not.toHaveProperty('organizationId');
    expect(body).not.toHaveProperty('linkedUser');
  });

  it('permite agregar y quitar el teléfono propio con auditoría sin PII', async () => {
    await requestApp(app)
      .patch('/professionals/me')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send({ phone: '  +1 809 555 0101  ' })
      .expect(200)
      .expect((response) => {
        expect(asRecord(response.body as unknown).phone).toBe(
          '+1 809 555 0101',
        );
      });

    expect(
      await prisma.db.professional.findUniqueOrThrow({
        where: { id: professionalId },
        select: { phone: true },
      }),
    ).toEqual({ phone: '+1 809 555 0101' });
    expect(
      await prisma.db.auditLog.findFirst({
        where: {
          organizationId: tenantAId,
          userId: barberId,
          action: 'UPDATE',
          entity: 'Professional',
          entityId: professionalId,
        },
      }),
    ).toEqual(
      expect.objectContaining({
        organizationId: tenantAId,
        userId: barberId,
        action: 'UPDATE',
        entity: 'Professional',
        entityId: professionalId,
      }),
    );

    await requestApp(app)
      .patch('/professionals/me')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send({ phone: null })
      .expect(200)
      .expect((response) => {
        expect(asRecord(response.body as unknown).phone).toBeNull();
      });
  });

  it('no expone teléfonos en directorio, perfil ajeno o ruta pública', async () => {
    const directoryResponse = await requestApp(app)
      .get('/professionals')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .expect(200);
    for (const item of asArray(directoryResponse.body as unknown)) {
      expect(asRecord(item)).not.toHaveProperty('phone');
    }

    await requestApp(app)
      .get(`/professionals/${otherProfessionalId}`)
      .set('Authorization', `Bearer ${tenantAToken}`)
      .expect(403);

    const publicResponse = await requestApp(app)
      .get(`/public/${tenantASlug}/booking-data`)
      .expect(200);
    const publicProfessionals = asArray(
      asRecord(publicResponse.body as unknown).professionals,
    );
    for (const item of publicProfessionals) {
      expect(asRecord(item)).not.toHaveProperty('phone');
    }
  });

  it('edita toda la información pública propia de A1 sin modificar al colega', async () => {
    const colleagueBefore = await prisma.db.professional.findUniqueOrThrow({
      where: { id: otherProfessionalId },
    });
    const input = {
      name: '  Perfil actualizado  ',
      bio: '  Biografía pública de prueba  ',
      specialty: '  Corte clásico  ',
      avatar: '  https://example.com/profile.jpg  ',
      experienceYears: 7,
    };
    const response = await requestApp(app)
      .patch('/professionals/me')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send(input)
      .expect(200);
    expect(asRecord(response.body as unknown)).toEqual(
      expect.objectContaining({
        id: professionalId,
        name: 'Perfil actualizado',
        bio: 'Biografía pública de prueba',
        specialty: 'Corte clásico',
        avatar: 'https://example.com/profile.jpg',
        experienceYears: 7,
        phone: null,
        status: 'ACTIVE',
        isPublic: true,
      }),
    );
    const saved = await prisma.db.professional.findUniqueOrThrow({
      where: { id: professionalId },
    });
    expect(saved).toEqual(
      expect.objectContaining({
        name: 'Perfil actualizado',
        userId: barberId,
        organizationId: tenantAId,
      }),
    );
    expect(
      await prisma.db.professional.findUniqueOrThrow({
        where: { id: otherProfessionalId },
      }),
    ).toEqual(colleagueBefore);
    const audit = await prisma.db.auditLog.findFirstOrThrow({
      where: { entityId: professionalId, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(JSON.stringify(audit)).not.toContain('Perfil actualizado');
    expect(JSON.stringify(audit)).not.toContain('Biografía pública de prueba');

    await requestApp(app)
      .patch('/professionals/me')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send({ bio: null, avatar: null, specialty: null, experienceYears: null })
      .expect(200)
      .expect((result) => {
        expect(asRecord(result.body as unknown)).toEqual(
          expect.objectContaining({
            name: 'Perfil actualizado',
            bio: null,
            avatar: null,
            specialty: null,
            experienceYears: null,
          }),
        );
      });
  });

  it('no cruza el perfil cuando la misma identidad cambia de tenant', async () => {
    await requestApp(app)
      .get('/professionals/me')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .expect(404);
    await requestApp(app)
      .patch('/professionals/me')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .send({ phone: '+18095550999' })
      .expect(404);

    expect(
      await prisma.db.professional.findUniqueOrThrow({
        where: { id: professionalId },
        select: { phone: true },
      }),
    ).toEqual({ phone: null });
  });

  it.each([
    ['status', 'INACTIVE'],
    ['isPublic', false],
    ['userId', '00000000-0000-4000-8000-000000000001'],
    ['organizationId', '00000000-0000-4000-8000-000000000002'],
    ['id', '00000000-0000-4000-8000-000000000003'],
    ['role', 'OWNER'],
    ['linkedUser', { id: 'other-user' }],
  ])(
    'rechaza el campo no autorizado %s en el perfil propio',
    async (field, value) => {
      const before = await prisma.db.professional.findUniqueOrThrow({
        where: { id: professionalId },
      });
      await requestApp(app)
        .patch('/professionals/me')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .send({ phone: '+18095550101', [field]: value })
        .expect(400);

      expect(
        await prisma.db.professional.findUniqueOrThrow({
          where: { id: professionalId },
        }),
      ).toEqual(before);
    },
  );

  it.each([
    {},
    { name: null },
    { name: '   ' },
    { name: 'x'.repeat(121) },
    { avatar: 'data:image/png;base64,AAAA' },
    { experienceYears: -1 },
    { experienceYears: 1.5 },
    { phone: 'x'.repeat(31) },
  ])(
    'rechaza información propia inválida sin escrituras %#',
    async (payload) => {
      const before = await prisma.db.professional.findUniqueOrThrow({
        where: { id: professionalId },
      });
      await requestApp(app)
        .patch('/professionals/me')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .send(payload)
        .expect(400);
      expect(
        await prisma.db.professional.findUniqueOrThrow({
          where: { id: professionalId },
        }),
      ).toEqual(before);
    },
  );

  it('no permite editar por ID un perfil ajeno ni gestionar estado o publicación', async () => {
    for (const [path, payload] of [
      [`/professionals/${otherProfessionalId}`, { name: 'No autorizado' }],
      [`/professionals/${professionalId}/status`, { status: 'INACTIVE' }],
      [`/professionals/${professionalId}/visibility`, { isPublic: false }],
    ] as const) {
      await requestApp(app)
        .patch(path)
        .set('Authorization', `Bearer ${tenantAToken}`)
        .send(payload)
        .expect(403);
    }
  });

  it('edita el perfil vinculado al tenant activo sin alterar el perfil del otro tenant', async () => {
    const before = await prisma.db.professional.findUniqueOrThrow({
      where: { id: professionalId },
    });
    const ownB = await prisma.db.professional.create({
      data: {
        name: 'Perfil en B',
        organizationId: tenantBId,
        userId: barberId,
      },
    });
    await requestApp(app)
      .patch('/professionals/me')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .send({
        name: 'Perfil B actualizado',
        phone: '+18095550999',
        specialty: 'Barba',
      })
      .expect(200)
      .expect((response) => {
        expect(asRecord(response.body as unknown)).toEqual(
          expect.objectContaining({
            id: ownB.id,
            name: 'Perfil B actualizado',
            phone: '+18095550999',
            specialty: 'Barba',
          }),
        );
      });
    expect(
      await prisma.db.professional.findUniqueOrThrow({
        where: { id: professionalId },
      }),
    ).toEqual(before);
  });
});
