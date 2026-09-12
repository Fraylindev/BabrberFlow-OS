import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { SaveCmsDraftDto } from './cms.dto';
import { globalValidationPipeOptions } from '../common/validation.config';

const base = { expectedVersion: 0, idempotencyKey: randomUUID() };
describe('CMS DTO y normalización editorial', () => {
  it.each([
    { publicName: null },
    { publicName: '' },
    { publicName: ' a ' },
    { publicName: 'a'.repeat(101) },
    { description: 'a'.repeat(2001) },
    { address: 'a'.repeat(301) },
    { publicName: '<script>alert(1)</script>' },
    { description: '<img onerror=alert(1)>' },
    { description: 'texto\u0000oculto' },
    { phone: '123456' },
    { phone: '1'.repeat(16) },
    { phone: '1234567 ext 8' },
    { phone: '123+4567' },
    { phone: 1234567 },
    { googleMapsUrl: 'http://maps.google.com/' },
    { googleMapsUrl: 'javascript:alert(1)' },
    { googleMapsUrl: 'https://maps.google.com.evil.test/' },
    { googleMapsUrl: 'https://evil.test/maps' },
    { googleMapsUrl: 'https://user:password@maps.google.com/' },
    { googleMapsUrl: 'https://google.com/search' },
    { googleMapsUrl: 'https://maps.google.com:8443/' },
    { googleMapsUrl: 'https://maps.google.com/\\evil' },
    { googleMapsUrl: 'https://maps.google.com/' + 'a'.repeat(2048) },
    { expectedVersion: -1 },
    { expectedVersion: 0.5 },
    { expectedVersion: '0' },
    { expectedVersion: null },
    { idempotencyKey: 'bad-key' },
  ])('rechaza %j', async (patch) => {
    expect(
      await validate(plainToInstance(SaveCmsDraftDto, { ...base, ...patch })),
    ).not.toHaveLength(0);
  });
  it.each([
    'slug',
    'businessHours',
    'timeZone',
    'organizationId',
    'email',
    'isPublished',
    'role',
    'heroImageUrl',
    'socialLinks',
  ])('rechaza campo extra %s', async (key) => {
    const pipe = new ValidationPipe(globalValidationPipeOptions);
    await expect(
      pipe.transform(
        { ...base, publicName: 'Negocio', [key]: 'extra' },
        { type: 'body', metatype: SaveCmsDraftDto },
      ),
    ).rejects.toThrow();
  });
  it('normaliza en el ValidationPipe productivo y mantiene null/opcionales', async () => {
    const pipe = new ValidationPipe(globalValidationPipeOptions);
    const result: unknown = await pipe.transform(
      {
        ...base,
        publicName: '  Nombre editorial  ',
        description: '  ',
        phone: ' +1 (809) 555-1234 ',
        address: null,
        googleMapsUrl: ' https://www.google.com/maps/place/Test ',
      },
      { type: 'body', metatype: SaveCmsDraftDto },
    );
    expect(result).toEqual({
      ...base,
      publicName: 'Nombre editorial',
      description: null,
      phone: '+18095551234',
      address: null,
      googleMapsUrl: 'https://www.google.com/maps/place/Test',
    });
  });
  it.each([
    { publicName: 'ab' },
    { publicName: 'a'.repeat(100) },
    { description: 'a'.repeat(2000) },
    { address: 'a'.repeat(300) },
    { phone: '1234567' },
    { phone: '+123456789012345' },
    { description: null, phone: null, address: null, googleMapsUrl: null },
    { googleMapsUrl: 'https://maps.google.com/?q=place' },
    { googleMapsUrl: 'https://maps.app.goo.gl/ABC123' },
  ])('admite límites/formatos aprobados %j', async (patch) => {
    expect(
      await validate(plainToInstance(SaveCmsDraftDto, { ...base, ...patch })),
    ).toHaveLength(0);
  });
});
