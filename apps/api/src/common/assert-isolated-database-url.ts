import { PrismaClient } from '@prisma/client';

const SAFE_IDENTIFIER = /^[A-Za-z0-9_]+$/;

export class IsolatedDatabaseUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IsolatedDatabaseUrlError';
  }
}

export interface IsolationExpectations {
  primaryDatabaseName: string;
  primaryDatabaseUser: string;
}

function requireSafeIdentifier(value: string, label: string): void {
  if (!SAFE_IDENTIFIER.test(value)) {
    throw new IsolatedDatabaseUrlError(
      `${label} must contain only letters, numbers, or underscores.`,
    );
  }
}

/**
 * E2E nunca acepta un schema dentro de la base principal como aislamiento.
 * Exige otra base y otras credenciales antes de abrir una conexión.
 */
export function assertIsolatedDatabaseUrl(
  raw: string,
  expectations: IsolationExpectations,
): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new IsolatedDatabaseUrlError(
      'E2E DATABASE_URL must be a valid PostgreSQL URL.',
    );
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new IsolatedDatabaseUrlError('E2E DATABASE_URL must use PostgreSQL.');
  }

  const databaseName = decodeURIComponent(
    parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '',
  );
  const databaseUser = decodeURIComponent(parsed.username);

  if (!parsed.password) {
    throw new IsolatedDatabaseUrlError(
      'E2E database credentials must include a password.',
    );
  }

  requireSafeIdentifier(databaseName, 'E2E database name');
  requireSafeIdentifier(databaseUser, 'E2E database user');
  requireSafeIdentifier(
    expectations.primaryDatabaseName,
    'Primary database name',
  );
  requireSafeIdentifier(expectations.primaryDatabaseUser, 'Primary user');

  if (!databaseName.endsWith('_test')) {
    throw new IsolatedDatabaseUrlError(
      'E2E requires a separate database whose name ends in "_test".',
    );
  }

  if (databaseName === expectations.primaryDatabaseName) {
    throw new IsolatedDatabaseUrlError(
      'E2E database must differ from the primary database.',
    );
  }

  if (databaseUser === expectations.primaryDatabaseUser) {
    throw new IsolatedDatabaseUrlError(
      'E2E credentials must differ from the primary database credentials.',
    );
  }

  return parsed;
}

interface RoleIsolationRow {
  database_name: string;
  user_name: string;
  owns_database: boolean;
  is_superuser: boolean;
  can_create_role: boolean;
  can_create_database: boolean;
  can_replicate: boolean;
  can_bypass_rls: boolean;
  inherits_privileged_role: boolean;
}

interface PrimaryAccessRow {
  can_connect_primary: boolean;
}

/** Verifica en PostgreSQL real lo que una URL por sí sola no puede probar. */
export async function assertIsolatedDatabaseConnection(
  prisma: PrismaClient,
  parsed: URL,
  expectations: IsolationExpectations,
): Promise<void> {
  const expectedDatabase = decodeURIComponent(
    parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '',
  );
  const expectedUser = decodeURIComponent(parsed.username);

  const [role] = await prisma.$queryRaw<RoleIsolationRow[]>`
    SELECT
      current_database() AS database_name,
      current_user AS user_name,
      pg_get_userbyid(d.datdba) = current_user AS owns_database,
      r.rolsuper AS is_superuser,
      r.rolcreaterole AS can_create_role,
      r.rolcreatedb AS can_create_database,
      r.rolreplication AS can_replicate,
      r.rolbypassrls AS can_bypass_rls,
      EXISTS (
        SELECT 1
        FROM pg_roles inherited
        WHERE inherited.oid <> r.oid
          AND (
            inherited.rolsuper
            OR inherited.rolcreaterole
            OR inherited.rolcreatedb
            OR inherited.rolreplication
            OR inherited.rolbypassrls
          )
          AND pg_has_role(current_user, inherited.oid, 'MEMBER')
      ) AS inherits_privileged_role
    FROM pg_roles r
    JOIN pg_database d ON d.datname = current_database()
    WHERE r.rolname = current_user
  `;

  if (
    !role ||
    role.database_name !== expectedDatabase ||
    role.user_name !== expectedUser ||
    !role.owns_database ||
    role.is_superuser ||
    role.can_create_role ||
    role.can_create_database ||
    role.can_replicate ||
    role.can_bypass_rls ||
    role.inherits_privileged_role
  ) {
    throw new IsolatedDatabaseUrlError(
      'E2E database role is not an isolated, non-privileged owner.',
    );
  }

  const [primaryAccess] = await prisma.$queryRaw<PrimaryAccessRow[]>`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_database WHERE datname = ${expectations.primaryDatabaseName}
      )
      THEN has_database_privilege(
        current_user,
        ${expectations.primaryDatabaseName},
        'CONNECT'
      )
      ELSE false
    END AS can_connect_primary
  `;

  if (!primaryAccess || primaryAccess.can_connect_primary) {
    throw new IsolatedDatabaseUrlError(
      'E2E database credentials can connect to the primary database.',
    );
  }
}
