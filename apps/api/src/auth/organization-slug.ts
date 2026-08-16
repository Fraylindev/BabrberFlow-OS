import { BadRequestException } from '@nestjs/common';

export const ORGANIZATION_SLUG_MIN_LENGTH = 3;
export const ORGANIZATION_SLUG_MAX_LENGTH = 50;

/** Acepta mayúsculas en el input; la persistencia siempre usa minúsculas. */
export const ORGANIZATION_SLUG_INPUT_PATTERN =
  /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

const ORGANIZATION_SLUG_NORMALIZED_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeOrganizationSlug(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (
    normalized.length < ORGANIZATION_SLUG_MIN_LENGTH ||
    normalized.length > ORGANIZATION_SLUG_MAX_LENGTH ||
    !ORGANIZATION_SLUG_NORMALIZED_PATTERN.test(normalized)
  ) {
    throw new BadRequestException(
      'El identificador de la barbería debe tener entre 3 y 50 caracteres, solo letras, números y guiones intermedios, sin espacios ni rutas.',
    );
  }

  return normalized;
}

export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}
