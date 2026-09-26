import { BadRequestException } from '@nestjs/common';
import { normalizeOrganizationSlug } from './organization-slug';

describe('normalizeOrganizationSlug', () => {
  it('persiste mayúsculas como minúsculas', () => {
    expect(normalizeOrganizationSlug('NUEVA-BARBERIA')).toBe('nueva-barberia');
  });

  it('rechaza espacios, rutas y guiones inicial o final', () => {
    expect(() => normalizeOrganizationSlug('mi barberia')).toThrow(
      BadRequestException,
    );
    expect(() => normalizeOrganizationSlug('foo/bar')).toThrow(
      BadRequestException,
    );
    expect(() => normalizeOrganizationSlug('-abc')).toThrow(
      BadRequestException,
    );
    expect(() => normalizeOrganizationSlug('abc-')).toThrow(
      BadRequestException,
    );
  });

  it('exige longitud 3–50', () => {
    expect(() => normalizeOrganizationSlug('ab')).toThrow(BadRequestException);
    expect(() => normalizeOrganizationSlug('a'.repeat(51))).toThrow(
      BadRequestException,
    );
    expect(normalizeOrganizationSlug('abc')).toBe('abc');
  });
});
