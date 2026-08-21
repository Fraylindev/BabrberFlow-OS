import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClerkOnboardingService } from './clerk-onboarding.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ClerkSessionVerifierService } from './clerk/clerk-session-verifier.service';
import { ClerkOnboardingDto } from './dto/clerk-onboarding.dto';

describe('ClerkOnboardingService', () => {
  let service: ClerkOnboardingService;
  let prismaMock: {
    db: {
      user: {
        findUnique: jest.Mock;
        create: jest.Mock;
      };
      organization: {
        findUnique: jest.Mock;
        create: jest.Mock;
      };
      membership: {
        create: jest.Mock;
      };
      $transaction: jest.Mock;
    };
  };
  let auditMock: {
    log: jest.Mock;
    logTransactional: jest.Mock;
  };
  let verifierMock: {
    getClient: jest.Mock;
  };
  let clerkUsersMock: {
    getUser: jest.Mock;
  };

  const validDto: ClerkOnboardingDto = {
    organizationName: 'Barbería Central',
    organizationSlug: 'barberia-central',
    organizationEmail: 'contacto@barberiacentral.com',
  };

  const clerkUserId = 'user_clerk_123';

  function mockClerkUser(overrides: Record<string, unknown> = {}) {
    return {
      id: clerkUserId,
      firstName: 'Juan',
      lastName: 'Pérez',
      username: 'juanperez',
      primaryEmailAddressId: 'email_primary_1',
      emailAddresses: [
        {
          id: 'email_primary_1',
          emailAddress: 'juan@example.com',
          verification: { status: 'verified' },
        },
      ],
      ...overrides,
    };
  }

  beforeEach(() => {
    clerkUsersMock = {
      getUser: jest.fn().mockResolvedValue(mockClerkUser()),
    };

    verifierMock = {
      getClient: jest.fn().mockReturnValue({
        users: clerkUsersMock,
      }),
    };

    auditMock = {
      log: jest.fn().mockResolvedValue(undefined),
      logTransactional: jest.fn().mockResolvedValue(undefined),
    };

    prismaMock = {
      db: {
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
        },
        organization: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
        },
        membership: {
          create: jest.fn(),
        },
        $transaction: jest.fn(),
      },
    };

    service = new ClerkOnboardingService(
      prismaMock as unknown as PrismaService,
      auditMock as unknown as AuditService,
      verifierMock as unknown as ClerkSessionVerifierService,
    );
  });

  describe('fetchClerkProfile (resolución y validación)', () => {
    it('lanza 503 cuando el SDK de Clerk lanza un error al consultar el perfil', async () => {
      clerkUsersMock.getUser.mockRejectedValue(new Error('Clerk API Timeout'));

      await expect(service.onboardOwner(clerkUserId, validDto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('lanza 401 cuando el perfil retornado tiene un id diferente al clerkUserId de la sesión', async () => {
      clerkUsersMock.getUser.mockResolvedValue(
        mockClerkUser({
          id: 'user_clerk_different_456',
        }),
      );

      await expect(service.onboardOwner(clerkUserId, validDto)).rejects.toThrow(
        new UnauthorizedException('Sesión no válida'),
      );
    });

    it('lanza 401 cuando el SDK de Clerk devuelve un perfil nulo', async () => {
      clerkUsersMock.getUser.mockResolvedValue(null);

      await expect(service.onboardOwner(clerkUserId, validDto)).rejects.toThrow(
        new UnauthorizedException('Sesión no válida'),
      );
    });

    it('lanza 400 cuando el perfil de Clerk no tiene nombre ni username', async () => {
      clerkUsersMock.getUser.mockResolvedValue(
        mockClerkUser({
          firstName: null,
          lastName: null,
          username: null,
        }),
      );

      await expect(service.onboardOwner(clerkUserId, validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('usa username como fallback cuando firstName y lastName son nulos', async () => {
      clerkUsersMock.getUser.mockResolvedValue(
        mockClerkUser({
          firstName: null,
          lastName: '',
          username: 'barber_pro',
        }),
      );

      prismaMock.db.$transaction.mockImplementation(
        (cb: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            organization: {
              create: jest.fn().mockResolvedValue({
                id: 'org_1',
                name: validDto.organizationName,
                slug: validDto.organizationSlug,
                email: validDto.organizationEmail,
              }),
            },
            user: {
              create: jest.fn().mockResolvedValue({
                id: 'user_1',
                name: 'barber_pro',
                email: 'juan@example.com',
                clerkUserId,
                lastOrganizationId: 'org_1',
              }),
            },
            membership: {
              create: jest.fn().mockResolvedValue({ id: 'mem_1' }),
            },
          };
          return cb(tx);
        },
      );

      const res = await service.onboardOwner(clerkUserId, validDto);
      expect(res.user.name).toBe('barber_pro');
    });

    it('lanza 403 cuando el correo primario de Clerk no está verificado', async () => {
      clerkUsersMock.getUser.mockResolvedValue(
        mockClerkUser({
          emailAddresses: [
            {
              id: 'email_primary_1',
              emailAddress: 'juan@example.com',
              verification: { status: 'unverified' },
            },
          ],
        }),
      );

      await expect(service.onboardOwner(clerkUserId, validDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Anti-Enlace y Estado Parcial', () => {
    it('retorna 200 idempotente si el clerkUserId ya existe con 1 membresía OWNER', async () => {
      prismaMock.db.user.findUnique.mockResolvedValueOnce({
        id: 'user_existing',
        name: 'Juan Pérez',
        email: 'juan@example.com',
        clerkUserId,
        lastOrganizationId: 'org_existing',
        memberships: [
          {
            role: 'OWNER',
            organization: {
              id: 'org_existing',
              name: 'Barbería Existente',
              slug: 'barberia-existente',
              email: 'contacto@existente.com',
            },
          },
        ],
      });

      const res = await service.onboardOwner(clerkUserId, validDto);

      expect(res.isNew).toBe(false);
      expect(res.organization.id).toBe('org_existing');
      expect(prismaMock.db.$transaction).not.toHaveBeenCalled();
    });

    it('lanza 409 cuando clerkUserId existe pero no tiene membresía OWNER (estado parcial)', async () => {
      prismaMock.db.user.findUnique.mockResolvedValueOnce({
        id: 'user_broken',
        name: 'Juan Pérez',
        email: 'juan@example.com',
        clerkUserId,
        lastOrganizationId: null,
        memberships: [],
      });

      await expect(service.onboardOwner(clerkUserId, validDto)).rejects.toThrow(
        new ConflictException('Estado de cuenta no válido para onboarding.'),
      );
      expect(prismaMock.db.$transaction).not.toHaveBeenCalled();
    });

    it('lanza 409 completamente neutro ante colisión de correo con usuario local (anti-enlace)', async () => {
      // 1. check por clerkUserId -> null
      prismaMock.db.user.findUnique.mockResolvedValueOnce(null);
      // 2. check por email -> existe un usuario local no enlazado
      prismaMock.db.user.findUnique.mockResolvedValueOnce({
        id: 'user_local_123',
        email: 'juan@example.com',
        clerkUserId: null,
      });

      await expect(service.onboardOwner(clerkUserId, validDto)).rejects.toThrow(
        new ConflictException(
          'No es posible completar el registro con los datos proporcionados.',
        ),
      );
      expect(auditMock.log).toHaveBeenCalledWith({
        organizationId: null,
        userId: null,
        action: 'CLERK_ONBOARDING_EMAIL_CONFLICT',
        entity: 'SecurityEvent',
      });
      expect(prismaMock.db.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('Validación de colisión de Organización previa a la transacción', () => {
    it('lanza 409 cuando el slug de la organización ya existe', async () => {
      prismaMock.db.user.findUnique.mockResolvedValue(null);
      prismaMock.db.organization.findUnique.mockResolvedValueOnce({
        id: 'org_other',
        slug: 'barberia-central',
      });

      await expect(service.onboardOwner(clerkUserId, validDto)).rejects.toThrow(
        new ConflictException(
          'El slug de la organización ya está en uso. Elige otro.',
        ),
      );
      expect(prismaMock.db.$transaction).not.toHaveBeenCalled();
    });

    it('lanza 409 cuando el email de la organización ya existe', async () => {
      prismaMock.db.user.findUnique.mockResolvedValue(null);
      prismaMock.db.organization.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce({
          id: 'org_other',
          email: 'contacto@barberiacentral.com',
        }); // email check

      await expect(service.onboardOwner(clerkUserId, validDto)).rejects.toThrow(
        new ConflictException(
          'Ya existe una organización registrada con este correo.',
        ),
      );
      expect(prismaMock.db.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('Transacción y Concurrencia', () => {
    it('crea User, Organization, Membership(OWNER) y AuditLog en transacción SERIALIZABLE', async () => {
      const createdOrg = {
        id: 'org_new_1',
        name: validDto.organizationName,
        slug: validDto.organizationSlug,
        email: validDto.organizationEmail,
      };
      const createdUser = {
        id: 'user_new_1',
        name: 'Juan Pérez',
        email: 'juan@example.com',
        clerkUserId,
        lastOrganizationId: createdOrg.id,
      };

      let txUserCreateMock: jest.Mock;
      let txOrgCreateMock: jest.Mock;
      let txMembershipCreateMock: jest.Mock;

      prismaMock.db.$transaction.mockImplementation(
        (cb: (tx: unknown) => Promise<unknown>, options: unknown) => {
          expect(options).toEqual({
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          });

          txOrgCreateMock = jest.fn().mockResolvedValue(createdOrg);
          txUserCreateMock = jest.fn().mockResolvedValue(createdUser);
          txMembershipCreateMock = jest.fn().mockResolvedValue({ id: 'mem_1' });

          const tx = {
            organization: { create: txOrgCreateMock },
            user: { create: txUserCreateMock },
            membership: { create: txMembershipCreateMock },
          };

          return cb(tx);
        },
      );

      const res = await service.onboardOwner(clerkUserId, validDto);

      expect(txUserCreateMock!).toHaveBeenCalledWith({
        data: {
          name: 'Juan Pérez',
          email: 'juan@example.com',
          password: null,
          clerkUserId,
          lastOrganizationId: createdOrg.id,
        },
      });

      expect(txMembershipCreateMock!).toHaveBeenCalledWith({
        data: {
          userId: createdUser.id,
          organizationId: createdOrg.id,
          role: 'OWNER',
        },
      });

      expect(auditMock.logTransactional).toHaveBeenCalledWith(
        {
          organizationId: createdOrg.id,
          userId: createdUser.id,
          action: 'CREATE',
          entity: 'Organization',
          entityId: createdOrg.id,
        },
        expect.anything(),
      );

      expect(res.isNew).toBe(true);
      expect(res.user.id).toBe('user_new_1');
      expect(res.organization.id).toBe('org_new_1');
      expect(res.role).toBe('OWNER');
    });

    it('reintenta hasta 3 veces ante fallos de serialización P2034 y tiene éxito en el reintento', async () => {
      const p2034Error = new Prisma.PrismaClientKnownRequestError(
        'Serialization failure',
        {
          code: 'P2034',
          clientVersion: '5.0.0',
        },
      );

      let calls = 0;
      prismaMock.db.$transaction.mockImplementation(
        (cb: (tx: unknown) => Promise<unknown>) => {
          calls++;
          if (calls < 3) {
            throw p2034Error;
          }
          const tx = {
            organization: {
              create: jest.fn().mockResolvedValue({
                id: 'org_retry',
                name: validDto.organizationName,
                slug: validDto.organizationSlug,
                email: validDto.organizationEmail,
              }),
            },
            user: {
              create: jest.fn().mockResolvedValue({
                id: 'user_retry',
                name: 'Juan Pérez',
                email: 'juan@example.com',
                clerkUserId,
                lastOrganizationId: 'org_retry',
              }),
            },
            membership: {
              create: jest.fn().mockResolvedValue({ id: 'mem_1' }),
            },
          };
          return cb(tx);
        },
      );

      const res = await service.onboardOwner(clerkUserId, validDto);

      expect(calls).toBe(3);
      expect(res.isNew).toBe(true);
      expect(res.user.id).toBe('user_retry');
    });

    it('lanza 409 si los fallos P2034 persisten tras 3 intentos', async () => {
      const p2034Error = new Prisma.PrismaClientKnownRequestError(
        'Serialization failure',
        {
          code: 'P2034',
          clientVersion: '5.0.0',
        },
      );

      prismaMock.db.$transaction.mockRejectedValue(p2034Error);

      await expect(service.onboardOwner(clerkUserId, validDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.db.$transaction).toHaveBeenCalledTimes(3);
    });

    it('resuelve respuesta idempotente 200 cuando ocurre P2002 sobre clerkUserId', async () => {
      const p2002ClerkError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['clerkUserId'] },
        },
      );

      prismaMock.db.$transaction.mockRejectedValueOnce(p2002ClerkError);

      // Re-lectura fuera de la tx fallida
      prismaMock.db.user.findUnique
        .mockResolvedValueOnce(null) // pre-check 1
        .mockResolvedValueOnce(null) // pre-check 2 (email)
        .mockResolvedValueOnce({
          id: 'user_concurrent',
          name: 'Juan Pérez',
          email: 'juan@example.com',
          clerkUserId,
          lastOrganizationId: 'org_concurrent',
          memberships: [
            {
              role: 'OWNER',
              organization: {
                id: 'org_concurrent',
                name: validDto.organizationName,
                slug: validDto.organizationSlug,
                email: validDto.organizationEmail,
              },
            },
          ],
        });

      const res = await service.onboardOwner(clerkUserId, validDto);

      expect(res.isNew).toBe(false);
      expect(res.user.id).toBe('user_concurrent');
      expect(res.organization.id).toBe('org_concurrent');
    });

    it('lanza 409 cuando ocurre P2002 sobre slug durante la transacción', async () => {
      const p2002SlugError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['slug'] },
        },
      );

      prismaMock.db.$transaction.mockRejectedValueOnce(p2002SlugError);

      await expect(service.onboardOwner(clerkUserId, validDto)).rejects.toThrow(
        new ConflictException(
          'El slug de la organización ya está en uso. Elige otro.',
        ),
      );
    });

    it('lanza 409 neutro cuando ocurre P2002 sobre email durante la transacción', async () => {
      const p2002EmailError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        },
      );

      prismaMock.db.$transaction.mockRejectedValueOnce(p2002EmailError);

      await expect(service.onboardOwner(clerkUserId, validDto)).rejects.toThrow(
        new ConflictException(
          'No es posible completar el registro con los datos proporcionados.',
        ),
      );
    });

    it('registra el evento pre-tenant si P2002 confirma una carrera con un usuario local', async () => {
      const p2002EmailError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        },
      );

      prismaMock.db.$transaction.mockRejectedValueOnce(p2002EmailError);
      prismaMock.db.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'local-race-user',
          clerkUserId: null,
        });

      await expect(service.onboardOwner(clerkUserId, validDto)).rejects.toThrow(
        new ConflictException(
          'No es posible completar el registro con los datos proporcionados.',
        ),
      );
      expect(auditMock.log).toHaveBeenCalledWith({
        organizationId: null,
        userId: null,
        action: 'CLERK_ONBOARDING_EMAIL_CONFLICT',
        entity: 'SecurityEvent',
      });
    });
  });
});
