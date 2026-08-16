import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

function createInMemoryCache() {
  const store = new Map<string, unknown>();
  return {
    get: jest.fn((key: string) => Promise.resolve(store.get(key))),
    set: jest.fn((key: string, value: unknown) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
}

type RegisterTx = {
  organization: { create: jest.Mock };
  user: { create: jest.Mock };
  membership: { create: jest.Mock };
};

function createMockPrisma() {
  return {
    db: {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      membership: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      organization: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    },
  };
}

function knownPrismaError(
  code: string,
  meta?: Prisma.PrismaClientKnownRequestError['meta'],
) {
  return new Prisma.PrismaClientKnownRequestError('prisma', {
    code,
    clientVersion: 'test',
    meta,
  });
}

function isInteractiveTransaction(
  value: unknown,
): value is (tx: RegisterTx) => Promise<unknown> {
  return typeof value === 'function';
}

const EMAIL = 'ana@elitebarber.com';
const PASSWORD = 'password123';

const registerInput = {
  name: 'Nuevo',
  email: EMAIL,
  password: PASSWORD,
  organizationName: 'Barber',
  organizationSlug: 'barber',
  organizationEmail: 'org@barber.com',
};

describe('AuthService — autenticación', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let cache: ReturnType<typeof createInMemoryCache>;
  let audit: { log: jest.Mock; logTransactional: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    cache = createInMemoryCache();
    audit = {
      log: jest.fn().mockResolvedValue(undefined),
      logTransactional: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('fake.jwt.token'),
          },
        },
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    async function mockValidUser() {
      const hashedPassword = await bcrypt.hash(PASSWORD, 10);
      prisma.db.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: EMAIL,
        name: 'Ana',
        password: hashedPassword,
        lastOrganizationId: 'org-1',
      });
      prisma.db.membership.findUnique.mockResolvedValue({
        userId: 'user-1',
        organizationId: 'org-1',
        role: 'BARBER',
      });
      prisma.db.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Elite Barber Shop',
        slug: 'elite-barber-shop',
      });
    }

    it('devuelve un accessToken con credenciales correctas', async () => {
      await mockValidUser();

      const result = await service.login({ email: EMAIL, password: PASSWORD });

      expect(result.accessToken).toBe('fake.jwt.token');
      expect(result.user.email).toBe(EMAIL);
      expect(result.user.role).toBe('BARBER');
    });

    it('un login exitoso devuelve user, accessToken y organization completos', async () => {
      await mockValidUser();

      const result = await service.login({ email: EMAIL, password: PASSWORD });

      expect(result).toEqual({
        user: {
          id: 'user-1',
          name: 'Ana',
          email: EMAIL,
          organizationId: 'org-1',
          role: 'BARBER',
        },
        accessToken: 'fake.jwt.token',
        organization: {
          id: 'org-1',
          name: 'Elite Barber Shop',
          slug: 'elite-barber-shop',
        },
      });
    });

    it('rechaza con 401 cuando la contraseña es incorrecta', async () => {
      await mockValidUser();

      await expect(
        service.login({ email: EMAIL, password: 'contraseña-incorrecta' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza con 401 cuando el correo no existe — mismo mensaje que contraseña incorrecta', async () => {
      prisma.db.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'no-existe@x.com', password: PASSWORD }),
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('rechaza con 401 cuando la cuenta existe pero no tiene contraseña local (es de Clerk)', async () => {
      prisma.db.user.findUnique.mockResolvedValue({
        id: 'user-clerk',
        email: 'clerk@x.com',
        name: 'Clerk User',
        password: null,
      });

      await expect(
        service.login({ email: 'clerk@x.com', password: PASSWORD }),
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('bloquea la cuenta tras demasiados intentos fallidos, incluso con la contraseña correcta', async () => {
      await mockValidUser();

      for (let i = 0; i < 8; i++) {
        await expect(
          service.login({ email: EMAIL, password: 'mala' }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }

      await expect(
        service.login({ email: EMAIL, password: PASSWORD }),
      ).rejects.toBeInstanceOf(HttpException);
    });

    it('un login exitoso resetea el contador de intentos fallidos', async () => {
      await mockValidUser();

      await expect(
        service.login({ email: EMAIL, password: 'mala' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      await service.login({ email: EMAIL, password: PASSWORD });

      await expect(
        service.login({ email: EMAIL, password: 'mala' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('register', () => {
    function mockSuccessfulTransaction(mockTx: RegisterTx) {
      prisma.db.$transaction.mockImplementation(
        async (
          arg: unknown,
          options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
        ) => {
          expect(options?.isolationLevel).toBe(
            Prisma.TransactionIsolationLevel.Serializable,
          );
          if (!isInteractiveTransaction(arg)) {
            throw new Error('Se esperaba una transacción interactiva');
          }
          return arg(mockTx);
        },
      );
    }

    it('rechaza con 409 si el correo ya existe globalmente', async () => {
      prisma.db.user.findUnique.mockResolvedValue({ id: 'user-existente' });

      await expect(service.register(registerInput)).rejects.toMatchObject({
        status: 409,
      });
      expect(prisma.db.$transaction).not.toHaveBeenCalled();
    });

    it('usa aislamiento Serializable y persiste slug y correos normalizados', async () => {
      prisma.db.user.findUnique.mockResolvedValue(null);

      const createdAt = new Date('2026-08-15T00:00:00.000Z');
      const mockTx: RegisterTx = {
        organization: {
          create: jest.fn().mockResolvedValue({ id: 'org-new' }),
        },
        user: {
          create: jest.fn().mockResolvedValue({
            id: 'user-new',
            name: 'Nuevo',
            email: 'test@email.com',
            lastOrganizationId: 'org-new',
            createdAt,
            updatedAt: createdAt,
            clerkUserId: null,
          }),
        },
        membership: { create: jest.fn().mockResolvedValue({}) },
      };

      mockSuccessfulTransaction(mockTx);

      const result = await service.register({
        name: 'Nuevo',
        email: 'TEST@email.COM',
        password: PASSWORD,
        organizationName: 'Nueva Barberia',
        organizationSlug: 'NUEVA-BARBERIA',
        organizationEmail: 'ORG@BARBERIA.COM',
      });

      expect(prisma.db.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      expect(mockTx.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'Nueva Barberia',
          slug: 'nueva-barberia',
          email: 'org@barberia.com',
        },
      });
      expect(mockTx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@email.com',
          lastOrganizationId: 'org-new',
        }) as { email: string },
      });
      expect(mockTx.membership.create).toHaveBeenCalledWith({
        data: { userId: 'user-new', organizationId: 'org-new', role: 'OWNER' },
      });
      expect(audit.logTransactional).toHaveBeenCalledWith(
        {
          organizationId: 'org-new',
          userId: 'user-new',
          action: 'CREATE',
          entity: 'Organization',
          entityId: 'org-new',
        },
        mockTx,
      );

      expect(result).toEqual({
        id: 'user-new',
        name: 'Nuevo',
        email: 'test@email.com',
        lastOrganizationId: 'org-new',
        createdAt,
        updatedAt: createdAt,
        clerkUserId: null,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('no sustituye organizationEmail por el correo del owner', async () => {
      prisma.db.user.findUnique.mockResolvedValue(null);
      const mockTx: RegisterTx = {
        organization: {
          create: jest.fn().mockResolvedValue({ id: 'org-new' }),
        },
        user: {
          create: jest.fn().mockResolvedValue({
            id: 'user-new',
            name: 'Nuevo',
            email: EMAIL,
            lastOrganizationId: 'org-new',
            createdAt: new Date(),
            updatedAt: new Date(),
            clerkUserId: null,
          }),
        },
        membership: { create: jest.fn().mockResolvedValue({}) },
      };
      mockSuccessfulTransaction(mockTx);

      await service.register({
        ...registerInput,
        email: 'owner@barber.com',
        organizationEmail: 'contacto@barber.com',
      });

      expect(mockTx.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'Barber',
          slug: 'barber',
          email: 'contacto@barber.com',
        },
      });
      expect(mockTx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'owner@barber.com',
        }) as { email: string },
      });
    });

    it('falla el registro si logTransactional lanza error', async () => {
      prisma.db.user.findUnique.mockResolvedValue(null);
      audit.logTransactional.mockRejectedValue(new Error('Fallo auditoría'));
      const mockTx: RegisterTx = {
        organization: {
          create: jest.fn().mockResolvedValue({ id: 'org-new' }),
        },
        user: { create: jest.fn().mockResolvedValue({ id: 'user-new' }) },
        membership: { create: jest.fn().mockResolvedValue({}) },
      };
      mockSuccessfulTransaction(mockTx);

      await expect(service.register(registerInput)).rejects.toThrow(
        'Fallo auditoría',
      );
    });

    it('reintenta exactamente 3 veces en P2034 y luego responde 409', async () => {
      prisma.db.user.findUnique.mockResolvedValue(null);
      prisma.db.$transaction.mockRejectedValue(knownPrismaError('P2034'));

      await expect(service.register(registerInput)).rejects.toMatchObject({
        status: 409,
      });
      expect(prisma.db.$transaction).toHaveBeenCalledTimes(3);
    });

    it('no reintenta un Error genérico que solo imita code P2034', async () => {
      prisma.db.user.findUnique.mockResolvedValue(null);
      const fake = Object.assign(new Error('serialization'), { code: 'P2034' });
      prisma.db.$transaction.mockRejectedValue(fake);

      await expect(service.register(registerInput)).rejects.toBe(fake);
      expect(prisma.db.$transaction).toHaveBeenCalledTimes(1);
    });

    it('traduce P2002 de slug a 409 y no reintenta', async () => {
      prisma.db.user.findUnique.mockResolvedValue(null);
      prisma.db.$transaction.mockRejectedValue(
        knownPrismaError('P2002', { target: ['slug'] }),
      );

      await expect(service.register(registerInput)).rejects.toMatchObject({
        status: 409,
        message: 'El slug de la organización ya está en uso. Elige otro.',
      });
      expect(prisma.db.$transaction).toHaveBeenCalledTimes(1);
    });

    it('traduce P2002 de email a 409 y no reintenta', async () => {
      prisma.db.user.findUnique.mockResolvedValue(null);
      prisma.db.$transaction.mockRejectedValue(
        knownPrismaError('P2002', { target: ['email'] }),
      );

      await expect(service.register(registerInput)).rejects.toMatchObject({
        status: 409,
      });
      expect(prisma.db.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('updatePassword', () => {
    it('rechaza con BadRequestException si el usuario no tiene contraseña local (es de Clerk)', async () => {
      prisma.db.user.findUnique.mockResolvedValue({
        id: 'user-clerk',
        email: 'clerk@x.com',
        password: null,
      });

      await expect(
        service.updatePassword('user-clerk', 'org-1', {
          currentPassword: 'any',
          newPassword: 'new',
        }),
      ).rejects.toThrow('La cuenta no tiene contraseña local configurada.');
    });
  });
});
