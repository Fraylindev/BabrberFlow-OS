import {
  IsolatedDatabaseUrlError,
  assertIsolatedDatabaseUrl,
  isolatedSchemaName,
} from './assert-isolated-database-url';

describe('assertIsolatedDatabaseUrl', () => {
  it('acepta schema=public cuando el nombre de la base ya termina en _test', () => {
    const parsed = assertIsolatedDatabaseUrl(
      'postgresql://barberflow:pass@localhost:5432/kortek_test?schema=public',
    );
    expect(parsed.pathname).toBe('/kortek_test');
    expect(isolatedSchemaName(parsed)).toBeNull();
  });

  it('acepta schema=test aunque el nombre de la base no termine en _test', () => {
    const parsed = assertIsolatedDatabaseUrl(
      'postgresql://barberflow:barberflow_password@localhost:5432/barberflow?schema=test',
    );
    expect(isolatedSchemaName(parsed)).toBe('test');
  });

  it('acepta schema que termina en _test', () => {
    const parsed = assertIsolatedDatabaseUrl(
      'postgresql://barberflow:pass@localhost:5432/barberflow?schema=e2e_test',
    );
    expect(isolatedSchemaName(parsed)).toBe('e2e_test');
  });

  it('rechaza coincidencias de _test en usuario, contraseña u host', () => {
    expect(() =>
      assertIsolatedDatabaseUrl(
        'postgresql://user_test:pass_test@host_test:5432/barberflow',
      ),
    ).toThrow(IsolatedDatabaseUrlError);
  });

  it('rechaza _test en parámetros de consulta ajenos a schema', () => {
    expect(() =>
      assertIsolatedDatabaseUrl(
        'postgresql://barberflow:pass@localhost:5432/barberflow?connection_limit=5&options=_test',
      ),
    ).toThrow(IsolatedDatabaseUrlError);
  });

  it('rechaza schema=testing por coincidencia parcial', () => {
    expect(() =>
      assertIsolatedDatabaseUrl(
        'postgresql://barberflow:pass@localhost:5432/barberflow?schema=testing',
      ),
    ).toThrow(IsolatedDatabaseUrlError);
  });

  it('rechaza una URL inválida sin devolver el valor crudo', () => {
    expect(() => assertIsolatedDatabaseUrl('not a url')).toThrow(
      IsolatedDatabaseUrlError,
    );
  });
});
