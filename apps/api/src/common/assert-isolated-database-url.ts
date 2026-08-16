const SAFE_IDENTIFIER = /^[A-Za-z0-9_]+$/;

export class IsolatedDatabaseUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IsolatedDatabaseUrlError';
  }
}

function isSafeTestName(value: string): boolean {
  return SAFE_IDENTIFIER.test(value) && value.endsWith('_test');
}

/**
 * Acepta únicamente una base cuyo nombre (pathname) termina en `_test`,
 * o un query `schema` exactamente `test` o que termina en `_test`.
 * No inspecciona usuario, contraseña, host ni parámetros ajenos.
 */
export function assertIsolatedDatabaseUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new IsolatedDatabaseUrlError(
      'E2E DATABASE_URL must be a valid URL pointing at an isolated test database.',
    );
  }

  const databaseName = decodeURIComponent(
    parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '',
  );
  const schema = parsed.searchParams.get('schema');

  const databaseIsTest = isSafeTestName(databaseName);
  const schemaIsTest =
    schema === 'test' || (schema !== null && isSafeTestName(schema));

  if (!databaseIsTest && !schemaIsTest) {
    throw new IsolatedDatabaseUrlError(
      'E2E tests require a database name ending in "_test", or an explicit schema named "test" or ending in "_test".',
    );
  }

  return parsed;
}

export function isolatedSchemaName(parsed: URL): string | null {
  const schema = parsed.searchParams.get('schema');
  if (schema === 'test' || (schema !== null && isSafeTestName(schema))) {
    return schema;
  }
  return null;
}
