import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// Cache en memoria real (no un mock de cada llamada) — así el
// AttemptLimiter corre su lógica de verdad y la prueba de bloqueo por
// fuerza bruta prueba el mecanismo real, no una simulación de él.
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

const EMAIL = 'ana@elitebarber.com';
const PASSWORD = 'password123';

describe('AuthService — autenticación', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let cache: ReturnType<typeof createInMemoryCache>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    cache = createInMemoryCache();

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
        {
          provide: AuditService,
          useValue: { log: jest.fn(), logTransactional: jest.fn() },
        },
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
      // login() ahora resuelve la organización activa vía
      // organization.findUnique (ver auth.service.ts) para devolverla en
      // la respuesta — sin este mock, la llamada real resuelve
      // `undefined` y login() rechaza con 'La organización no existe'.
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

      // No debe distinguirse de "contraseña incorrecta" — evita que un
      // atacante use la respuesta para enumerar qué correos existen.
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

      // Agota el límite fallando a propósito.
      for (let i = 0; i < 8; i++) {
        await expect(
          service.login({ email: EMAIL, password: 'mala' }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }

      // El siguiente intento, aunque la contraseña ahora sea correcta,
      // debe quedar bloqueado por el límite de intentos — no por 401.
      await expect(
        service.login({ email: EMAIL, password: PASSWORD }),
      ).rejects.toBeInstanceOf(HttpException);
    });

    it('un login exitoso resetea el contador de intentos fallidos', async () => {
      await mockValidUser();

      await expect(
        service.login({ email: EMAIL, password: 'mala' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      // Login correcto entre medio — debe limpiar el contador.
      await service.login({ email: EMAIL, password: PASSWORD });

      // Y ahora debería poder volver a fallar sin quedar ya bloqueado
      // por los intentos de antes del reset.
      await expect(
        service.login({ email: EMAIL, password: 'mala' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('rechaza con 409 si el correo ya existe globalmente', async () => {
      prisma.db.user.findUnique.mockResolvedValue({ id: 'user-existente' });

      await expect(
        service.register({
          name: 'Otro',
          email: EMAIL,
          password: PASSWORD,
          organizationName: 'Mi Barberia',
          organizationSlug: 'mi-barberia',
          organizationEmail: 'org@barberia.com',
        }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('crea usuario, organizacion y membresia atomica si no hay conflictos', async () => {
      const auditSpy = jest.spyOn(service['audit'], 'logTransactional');

      const mockTx = {
        organization: {
          create: jest.fn().mockResolvedValue({ id: 'org-new' }),
        },
        user: {
          create: jest.fn().mockResolvedValue({
            id: 'user-new',
            name: 'Nuevo',
            email: EMAIL,
            password: 'hashed-password',
          }),
        },
        membership: { create: jest.fn().mockResolvedValue({}) },
      };

      prisma.db.$transaction.mockImplementation(async (cb) => {
        return cb(mockTx);
      });

      const result = await service.register({
        name: 'Nuevo',
        email: EMAIL,
        password: PASSWORD,
        organizationName: 'Nueva Barberia',
        organizationSlug: 'nueva-barberia',
        organizationEmail: 'org@barberia.com',
      });

      expect(prisma.db.$transaction).toHaveBeenCalled();
      expect(mockTx.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'Nueva Barberia',
          slug: 'nueva-barberia',
          email: 'org@barberia.com',
        },
      });
      expect(mockTx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: EMAIL,
            lastOrganizationId: 'org-new',
          }),
        }),
      );
      expect(mockTx.membership.create).toHaveBeenCalledWith({
        data: { userId: 'user-new', organizationId: 'org-new', role: 'OWNER' },
      });
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entity: 'Organization',
          entityId: 'org-new',
        }),
        mockTx,
      );

      expect(result.id).toBe('user-new');
      expect((result as any).password).toBeUndefined();
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
