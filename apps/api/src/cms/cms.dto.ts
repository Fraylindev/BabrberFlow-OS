import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateBy,
  ValidateIf,
} from 'class-validator';

export function normalizeText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
export function normalizeOptionalText(value: unknown): unknown {
  const text = normalizeText(value);
  return text === '' ? null : text;
}
export function normalizePublicPhone(value: unknown): unknown {
  const text = normalizeOptionalText(value);
  if (typeof text !== 'string' || !/^\+?[\d\s().-]+$/.test(text)) return text;
  return text.replace(/[\s().-]/g, '');
}
export function isGoogleMapsUrl(value: unknown): boolean {
  if (typeof value !== 'string' || /[\s\\]/.test(value)) return false;
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
        (url.hostname === 'maps.app.goo.gl' &&
          /^\/[A-Za-z0-9_-]+$/.test(url.pathname)))
    );
  } catch {
    return false;
  }
}
const present = (_: object, value: unknown) =>
  value !== undefined && value !== null;
// Texto plano: ningún tag ni control invisible. El consumidor debe renderizar texto, nunca HTML/Markdown.
const PlainText = () =>
  ValidateBy({
    name: 'plainText',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'string' &&
        !/[<>]/.test(value) &&
        [...value].every((char) => {
          const code = char.charCodeAt(0);
          return (code >= 32 && code !== 127) || [9, 10, 13].includes(code);
        }),
      defaultMessage: () =>
        'Usa texto plano sin etiquetas ni caracteres de control.',
    },
  });

export class CmsMutationDto {
  @IsInt()
  @Min(0)
  @Max(2147483646)
  expectedVersion!: number;

  @IsUUID('4')
  idempotencyKey!: string;
}

export class SaveCmsDraftDto extends CmsMutationDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => normalizeText(value))
  @IsString()
  @Length(2, 100)
  @PlainText()
  publicName?: string;

  @ValidateIf(present)
  @Transform(({ value }: { value: unknown }) => normalizeOptionalText(value))
  @IsString()
  @MaxLength(2000)
  @PlainText()
  description?: string | null;

  @ValidateIf(present)
  @Transform(({ value }: { value: unknown }) => normalizePublicPhone(value))
  @IsString()
  @Matches(/^\+?\d{7,15}$/)
  phone?: string | null;

  @ValidateIf(present)
  @Transform(({ value }: { value: unknown }) => normalizeOptionalText(value))
  @IsString()
  @MaxLength(300)
  @PlainText()
  address?: string | null;

  @ValidateIf(present)
  @Transform(({ value }: { value: unknown }) => normalizeOptionalText(value))
  @IsString()
  @MaxLength(2048)
  @ValidateBy({
    name: 'googleMapsUrl',
    validator: {
      validate: isGoogleMapsUrl,
      defaultMessage: () => 'Usa un enlace HTTPS de Google Maps válido.',
    },
  })
  googleMapsUrl?: string | null;
}
