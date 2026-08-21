import type { PrismaClient } from '@prisma/client';
import {
  IsolatedDatabaseUrlError,
  assertIsolatedDatabaseConnection,
  assertIsolatedDatabaseUrl,
} from './assert-isolated-database-url';

const expectations = {
  primaryDatabaseName: 'barberflow',
  primaryDatabaseUser: 'barberflow',
};

describe('strict E2E database isolation', () => {
  it('acepta otra base _test y otras credenciales', () => {
    const parsed = assertIsolatedDatabaseUrl(
      'postgresql://kortek_e2e_runner:pass@localhost:55432/kortek_e2e_test?schema=public',
      expectations,
    );
    expect(parsed.pathname).toBe('/kortek_e2e_test');
  });

  it.each([
    'postgresql://barberflow:pass@localhost:5432/barberflow?schema=test',
    'postgresql://kortek_e2e_runner:pass@localhost:5432/barberflow?schema=e2e_test',
    'postgresql://barberflow:pass@localhost:5432/kortek_e2e_test',
    'postgresql://kortek_e2e_runner:pass@localhost:5432/kortek_e2e',
  ])(
    'rechaza base principal, schema aislado o credenciales principales: %s',
    (url) => {
      expect(() => assertIsolatedDatabaseUrl(url, expectations)).toThrow(
        IsolatedDatabaseUrlError,
      );
    },
  );

  it('rechaza protocolos y URLs inválidas sin devolver el valor crudo', () => {
    expect(() => assertIsolatedDatabaseUrl('not a url', expectations)).toThrow(
      IsolatedDatabaseUrlError,
    );
    expect(() =>
      assertIsolatedDatabaseUrl(
        'mysql://kortek_e2e_runner:pass@localhost/kortek_e2e_test',
        expectations,
      ),
    ).toThrow(IsolatedDatabaseUrlError);
  });

  it('rechaza credenciales E2E sin contraseña', () => {
    expect(() =>
      assertIsolatedDatabaseUrl(
        'postgresql://kortek_e2e_runner@localhost:55432/kortek_e2e_test',
        expectations,
      ),
    ).toThrow('E2E database credentials must include a password.');
  });

  it('acepta una conexión real representada por un owner no privilegiado', async () => {
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce([
        {
          database_name: 'kortek_e2e_test',
          user_name: 'kortek_e2e_runner',
          owns_database: true,
          is_superuser: false,
          can_create_role: false,
          can_create_database: false,
          can_replicate: false,
          can_bypass_rls: false,
          inherits_privileged_role: false,
        },
      ])
      .mockResolvedValueOnce([{ can_connect_primary: false }]);
    const prisma = { $queryRaw: queryRaw } as unknown as PrismaClient;
    const parsed = assertIsolatedDatabaseUrl(
      'postgresql://kortek_e2e_runner:pass@localhost:55432/kortek_e2e_test',
      expectations,
    );

    await expect(
      assertIsolatedDatabaseConnection(prisma, parsed, expectations),
    ).resolves.toBeUndefined();
    expect(queryRaw).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['superuser', { is_superuser: true }],
    ['CREATEDB', { can_create_database: true }],
    ['rol privilegiado heredado', { inherits_privileged_role: true }],
  ])('rechaza una conexión con %s', async (_case, override) => {
    const queryRaw = jest.fn().mockResolvedValueOnce([
      {
        database_name: 'kortek_e2e_test',
        user_name: 'kortek_e2e_runner',
        owns_database: true,
        is_superuser: false,
        can_create_role: false,
        can_create_database: false,
        can_replicate: false,
        can_bypass_rls: false,
        inherits_privileged_role: false,
        ...override,
      },
    ]);
    const prisma = { $queryRaw: queryRaw } as unknown as PrismaClient;
    const parsed = assertIsolatedDatabaseUrl(
      'postgresql://kortek_e2e_runner:pass@localhost:55432/kortek_e2e_test',
      expectations,
    );

    await expect(
      assertIsolatedDatabaseConnection(prisma, parsed, expectations),
    ).rejects.toBeInstanceOf(IsolatedDatabaseUrlError);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('rechaza credenciales con CONNECT a la base principal', async () => {
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce([
        {
          database_name: 'kortek_e2e_test',
          user_name: 'kortek_e2e_runner',
          owns_database: true,
          is_superuser: false,
          can_create_role: false,
          can_create_database: false,
          can_replicate: false,
          can_bypass_rls: false,
          inherits_privileged_role: false,
        },
      ])
      .mockResolvedValueOnce([{ can_connect_primary: true }]);
    const prisma = { $queryRaw: queryRaw } as unknown as PrismaClient;
    const parsed = assertIsolatedDatabaseUrl(
      'postgresql://kortek_e2e_runner:pass@localhost:55432/kortek_e2e_test',
      expectations,
    );

    await expect(
      assertIsolatedDatabaseConnection(prisma, parsed, expectations),
    ).rejects.toBeInstanceOf(IsolatedDatabaseUrlError);
  });
});
