import { Prisma } from '@prisma/client';
import {
  isSerializationFailureError,
  isUniqueConstraintError,
} from './prisma-error.util';

function knownError(
  code: string,
  meta?: Prisma.PrismaClientKnownRequestError['meta'],
) {
  return new Prisma.PrismaClientKnownRequestError('prisma', {
    code,
    clientVersion: 'test',
    meta,
  });
}

describe('prisma-error.util', () => {
  it('reconoce P2034 solo como PrismaClientKnownRequestError', () => {
    expect(isSerializationFailureError(knownError('P2034'))).toBe(true);
    expect(
      isSerializationFailureError(
        Object.assign(new Error('x'), { code: 'P2034' }),
      ),
    ).toBe(false);
  });

  it('reconoce PostgreSQL 40001 envuelto por $queryRaw como P2010', () => {
    expect(
      isSerializationFailureError(knownError('P2010', { code: '40001' })),
    ).toBe(true);
    expect(
      isSerializationFailureError(knownError('P2010', { code: '23505' })),
    ).toBe(false);
  });

  it('reconoce P2002 por campo sin tratarlo como serialización', () => {
    const error = knownError('P2002', { target: ['email'] });
    expect(isUniqueConstraintError(error, 'email')).toBe(true);
    expect(isSerializationFailureError(error)).toBe(false);
  });
});
