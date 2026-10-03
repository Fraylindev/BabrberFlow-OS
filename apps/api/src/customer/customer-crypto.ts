import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

export interface CustomerCursor {
  v: 1;
  actor: string;
  organization: string;
  client: string;
  view: 'upcoming' | 'history';
  revision: string;
  asOf: string;
  startTime: string;
  id: string;
}

function key(domain: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new ServiceUnavailableException(
      'Servicio temporalmente no disponible.',
    );
  return createHmac('sha256', secret).update(`kortek:m2:${domain}:v1`).digest();
}

export function customerDigest(domain: string, value: string) {
  return createHmac('sha256', key(domain)).update(value).digest('hex');
}

export function encodeCustomerCursor(value: CustomerCursor): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key('cursor'), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}

export function decodeCustomerCursor(raw: string): CustomerCursor {
  const secret = key('cursor');
  try {
    if (raw.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(raw)) throw new Error();
    const data = Buffer.from(raw, 'base64url');
    if (data.length < 29 || data.toString('base64url') !== raw)
      throw new Error();
    const cipher = createDecipheriv(
      'aes-256-gcm',
      secret,
      data.subarray(0, 12),
    );
    cipher.setAuthTag(data.subarray(12, 28));
    const value = JSON.parse(
      Buffer.concat([
        cipher.update(data.subarray(28)),
        cipher.final(),
      ]).toString('utf8'),
    ) as CustomerCursor;
    if (
      value.v !== 1 ||
      !['upcoming', 'history'].includes(value.view) ||
      ![
        value.actor,
        value.organization,
        value.client,
        value.revision,
        value.asOf,
        value.startTime,
        value.id,
      ].every((x) => typeof x === 'string') ||
      !Number.isFinite(Date.parse(value.asOf)) ||
      !Number.isFinite(Date.parse(value.startTime)) ||
      Date.now() - Date.parse(value.asOf) > 900_000 ||
      Date.parse(value.asOf) > Date.now()
    )
      throw new Error();
    return value;
  } catch {
    throw new BadRequestException(
      'La página solicitada no es válida. Actualiza tus reservas.',
    );
  }
}
