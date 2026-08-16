import type { Request } from 'express';
import { toWebRequest } from './to-web-request';

describe('toWebRequest', () => {
  it('convierte headers, url y method correctamente a globalThis.Request', () => {
    const expressReq = {
      method: 'POST',
      protocol: 'https',
      get: (header: string) =>
        header === 'host' ? 'api.kortek.app' : undefined,
      originalUrl: '/auth/clerk/onboarding',
      headers: {
        authorization: 'Bearer token-123',
        'x-custom-array': ['val1', 'val2'],
      },
    } as unknown as Request;

    const webReq = toWebRequest(expressReq);

    expect(webReq.method).toBe('POST');
    expect(webReq.url).toBe('https://api.kortek.app/auth/clerk/onboarding');
    expect(webReq.headers.get('authorization')).toBe('Bearer token-123');
    expect(webReq.headers.get('x-custom-array')).toBe('val1, val2');
  });

  it('usa valores por defecto cuando protocol, host o url faltan', () => {
    const expressReq = {
      method: 'GET',
      headers: {},
      get: () => undefined,
    } as unknown as Request;

    const webReq = toWebRequest(expressReq);

    expect(webReq.method).toBe('GET');
    expect(webReq.url).toBe('http://localhost/');
  });
});
