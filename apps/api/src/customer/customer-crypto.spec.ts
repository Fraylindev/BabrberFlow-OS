import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  customerDigest,
  decodeCustomerCursor,
  encodeCustomerCursor,
  type CustomerCursor,
} from './customer-crypto';

describe('M2 cursor privado y digests de recibos', () => {
  const original = process.env.JWT_SECRET;
  const cursor: CustomerCursor = {
    v: 1,
    actor: 'actor',
    organization: 'tenant',
    client: 'client',
    view: 'upcoming',
    revision: '42',
    asOf: new Date().toISOString(),
    startTime: '2099-01-01T00:00:00Z',
    id: 'booking',
  };
  beforeEach(() => {
    process.env.JWT_SECRET = 'synthetic-m2-only-crypto-secret-123456';
  });
  afterAll(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });

  it('cifra contexto y autentica cada byte sin exponer ids internos', () => {
    const encoded = encodeCustomerCursor(cursor);
    expect(decodeCustomerCursor(encoded)).toEqual(cursor);
    expect(encoded).not.toBe(encodeCustomerCursor(cursor));
    expect(Buffer.from(encoded, 'base64url').toString()).not.toMatch(
      /tenant|client|actor|booking/,
    );
    const raw = Buffer.from(encoded, 'base64url');
    raw[30] ^= 1;
    expect(() => decodeCustomerCursor(raw.toString('base64url'))).toThrow(
      BadRequestException,
    );
  });

  it.each(['x', 'a'.repeat(2049), '{}', 'abc=', 'a/b'])(
    'rechaza cursor malformado/acotado %s',
    (value) => {
      expect(() => decodeCustomerCursor(value)).toThrow(BadRequestException);
    },
  );

  it('vence en quince minutos y rechaza asOf futuro incluso si está firmado', () => {
    expect(() =>
      decodeCustomerCursor(
        encodeCustomerCursor({
          ...cursor,
          asOf: new Date(Date.now() - 901000).toISOString(),
        }),
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      decodeCustomerCursor(
        encodeCustomerCursor({
          ...cursor,
          asOf: new Date(Date.now() + 60000).toISOString(),
        }),
      ),
    ).toThrow(BadRequestException);
  });

  it('digests separados por propósito, deterministas y no reversibles por hash simple', () => {
    expect(customerDigest('command', 'same')).toBe(
      customerDigest('command', 'same'),
    );
    expect(customerDigest('command', 'same')).not.toBe(
      customerDigest('idempotency-key', 'same'),
    );
    expect(customerDigest('command', 'same')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('secreto ausente falla cerrado con 503', () => {
    delete process.env.JWT_SECRET;
    expect(() => encodeCustomerCursor(cursor)).toThrow(
      ServiceUnavailableException,
    );
    expect(() => decodeCustomerCursor('x')).toThrow(
      ServiceUnavailableException,
    );
  });
});
