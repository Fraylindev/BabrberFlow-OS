export interface CmsContent {
  publicName: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  googleMapsUrl: string | null;
}

export interface CmsReceipt {
  version: number;
  isPublished: boolean;
  publishedRevision: number | null;
}

export interface CmsEditor extends CmsReceipt {
  draftRevision: number;
  draft: CmsContent;
  publishedSnapshot: CmsContent | null;
  readOnly: { slug: string; businessHours: unknown; timeZone: string };
}

export interface CmsPreview {
  version: number;
  draftRevision: number;
  content: CmsContent;
  slug: string;
}

export type CmsForm = { [K in keyof CmsContent]: string };
export type CmsErrors = Partial<Record<keyof CmsContent, string>>;
export const cmsFields = [
  'publicName',
  'description',
  'phone',
  'address',
  'googleMapsUrl',
] as const;

export function cmsForm(content: CmsContent): CmsForm {
  return {
    publicName: content.publicName,
    description: content.description ?? '',
    phone: content.phone ?? '',
    address: content.address ?? '',
    googleMapsUrl: content.googleMapsUrl ?? '',
  };
}

export function cmsInput(form: CmsForm): CmsContent {
  const phone = form.phone.trim();
  return {
    publicName: form.publicName.trim(),
    description: form.description.trim() || null,
    phone: phone && /^\+?[\d\s().-]+$/.test(phone) ? phone.replace(/[\s().-]/g, '') : phone || null,
    address: form.address.trim() || null,
    googleMapsUrl: form.googleMapsUrl.trim() || null,
  };
}

export function isCmsMapsUrl(value: string): boolean {
  if (/[\s\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      ((['www.google.com', 'google.com'].includes(url.hostname) &&
        /^\/maps(?:\/|$)/.test(url.pathname)) ||
        url.hostname === 'maps.google.com' ||
        (url.hostname === 'maps.app.goo.gl' && /^\/[A-Za-z0-9_-]+$/.test(url.pathname)))
    );
  } catch {
    return false;
  }
}

export function validateCmsForm(form: CmsForm): CmsErrors {
  const content = cmsInput(form);
  const errors: CmsErrors = {};
  for (const field of ['publicName', 'description', 'address'] as const) {
    const value = content[field];
    if (
      value &&
      (/[<>]/.test(value) ||
        [...value].some((char) => {
          const code = char.charCodeAt(0);
          return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
        }))
    )
      errors[field] = 'Usa texto plano, sin etiquetas ni caracteres de control.';
  }
  if (content.publicName.length < 2 || content.publicName.length > 100)
    errors.publicName = 'Escribe entre 2 y 100 caracteres.';
  if ((content.description?.length ?? 0) > 2000) errors.description = 'Usa hasta 2000 caracteres.';
  if ((content.address?.length ?? 0) > 300) errors.address = 'Usa hasta 300 caracteres.';
  if (content.phone && !/^\+?\d{7,15}$/.test(content.phone))
    errors.phone = 'Escribe entre 7 y 15 dígitos, con + inicial si corresponde.';
  if (
    content.googleMapsUrl &&
    (content.googleMapsUrl.length > 2048 || !isCmsMapsUrl(content.googleMapsUrl))
  )
    errors.googleMapsUrl = 'Usa un enlace HTTPS de Google Maps de hasta 2048 caracteres.';
  return errors;
}

export function cmsStatus(editor: CmsReceipt & { draftRevision: number }): string {
  if (!editor.isPublished) return 'Sin publicar';
  return editor.publishedRevision === editor.draftRevision ? 'Publicado' : 'Cambios sin publicar';
}

export function cmsHours(raw: unknown): string {
  const missing = 'No hay un horario global confirmado para mostrar.';
  if (!raw || typeof raw !== 'object' || !('open' in raw) || !('close' in raw)) return missing;
  const { open, close } = raw;
  const valid = (value: unknown): value is string =>
    typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!valid(open) || !valid(close) || open >= close) return missing;
  const format = (value: string) => {
    const hour = Number(value.slice(0, 2));
    return `${hour % 12 || 12}:${value.slice(3)} ${hour < 12 ? 'a. m.' : 'p. m.'}`;
  };
  return `De ${format(open)} a ${format(close)}, hora del negocio.`;
}
