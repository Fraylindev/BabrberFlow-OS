import { ApiError } from './api.ts';

export type MediaPurpose = 'GALLERY' | 'SERVICE' | 'PROFESSIONAL_AVATAR' | 'PROMOTION';
export type MediaStatus = 'STAGED' | 'APPROVED' | 'PUBLISHED' | 'QUARANTINED' | 'RETIRED' | 'PURGED';

export interface MediaAsset {
  id: string;
  purpose: MediaPurpose;
  targetId: string | null;
  status: MediaStatus;
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  revision: number;
  publishedRevision: number | null;
  altText: string;
  caption: string | null;
  decorative: boolean;
  createdAt: string;
  publishedAt: string | null;
}

export interface GalleryOrder {
  version: number;
  draftRevision: number;
  draftAssetIds: string[];
  draftHeroAssetId: string | null;
  publishedRevision: number | null;
  publishedAssetIds: string[];
  publishedHeroAssetId: string | null;
}

export interface PromotionDraft {
  title: string;
  body: string;
  startDate: string;
  endDate: string;
  imageAssetId: string | null;
}

export interface Promotion {
  id: string;
  version: number;
  draftRevision: number;
  draft: PromotionDraft;
  publishedRevision: number | null;
  published: { title: string; body: string; startsAtUtc: string; endsAtUtc: string; imageAssetId: string | null } | null;
  retiredAt: string | null;
}

export interface PublicMediaImage {
  id: string;
  url: string;
  altText: string | null;
  caption: string | null;
  decorative: boolean;
}

export interface PublicMedia {
  hero: PublicMediaImage | null;
  gallery: PublicMediaImage[];
  services: { serviceId: string; image: PublicMediaImage }[];
  professionals: { professionalId: string; avatar: PublicMediaImage }[];
  promotions: { id: string; title: string; body: string; image: PublicMediaImage | null }[];
}

export function isPublicMedia(value: unknown): value is PublicMedia {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.gallery) && Array.isArray(record.services) &&
    Array.isArray(record.professionals) && Array.isArray(record.promotions) &&
    (record.hero === null || typeof record.hero === 'object');
}

export function mediaError(error: unknown, action: 'upload' | 'publish' | 'save' | 'retire' | 'load'): string {
  const message = mediaErrorText(error, action);
  return error instanceof ApiError ? error.withRequestCode(message) : message;
}

function mediaErrorText(error: unknown, action: 'upload' | 'publish' | 'save' | 'retire' | 'load'): string {
  if (error instanceof ApiError) {
    if (error.status === 503 && (action === 'upload' || action === 'publish'))
      return 'La revisión automática de imágenes no está disponible o agotó su cuota. La imagen no se publicó. Espera a que se restablezca el servicio y vuelve a intentarlo; no se hará ningún cargo automático.';
    if (error.status === 503) return 'El servicio de medios no está disponible. Vuelve a intentarlo más tarde.';
    if (error.status === 429) return 'Has hecho varias solicitudes seguidas. Espera un momento y vuelve a intentarlo.';
    if (error.status === 413) return 'La imagen supera el límite de 5 MiB. Elige otra imagen.';
    if (error.status === 400) return 'Revisa el archivo, los textos y las fechas. Solo se admiten imágenes estáticas JPEG, PNG o WebP de 640 a 6000 píxeles.';
    if (error.status === 404) return 'Este contenido ya no está disponible. Actualiza la página.';
    if (error.status === 409) return 'El contenido cambió, llegó al límite o todavía espera revisión. Actualiza los datos antes de continuar.';
    if (error.status === 401 || error.status === 403) return 'Tu acceso cambió. Actualiza la sesión antes de continuar.';
  }
  return 'No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.';
}

export function validateMediaFile(file: File | null): string | null {
  if (!file) return 'Selecciona una imagen.';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    return 'Selecciona un archivo JPEG, PNG o WebP estático.';
  if (file.size > 5 * 1024 * 1024) return 'La imagen no puede superar 5 MiB.';
  return null;
}
