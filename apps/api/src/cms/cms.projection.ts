import { ServiceUnavailableException } from '@nestjs/common';
import { CmsPage, Prisma } from '@prisma/client';

export const CONTENT_FIELDS = [
  'publicName',
  'description',
  'phone',
  'address',
  'googleMapsUrl',
] as const;
export type CmsContent = {
  publicName: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  googleMapsUrl: string | null;
};

// Compatibilidad admite valores legacy sin normalizarlos ni publicar otras columnas.
// La validación editorial completa se exige antes de cada publicación nueva.
export function projectContent(value: Prisma.JsonValue): CmsContent {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    typeof value.publicName !== 'string' ||
    CONTENT_FIELDS.slice(1).some(
      (key) => value[key] !== null && typeof value[key] !== 'string',
    )
  ) {
    throw new ServiceUnavailableException(
      'La información pública no está disponible. Intenta de nuevo.',
    );
  }
  return {
    publicName: value.publicName,
    description: value.description as string | null,
    phone: value.phone as string | null,
    address: value.address as string | null,
    googleMapsUrl: value.googleMapsUrl as string | null,
  };
}

export function projectReceipt(
  page: Pick<CmsPage, 'version' | 'isPublished' | 'publishedRevision'>,
) {
  return {
    version: page.version,
    isPublished: page.isPublished,
    publishedRevision: page.publishedRevision,
  };
}
