import {
  addDaysToIsoDate,
  isValidIsoDate,
  isValidTimeZone,
  utcRangeForLocalDate,
} from '../professionals/professional-availability.util';

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_MIN_SIDE = 640;
export const MEDIA_MAX_SIDE = 6000;
export const MEDIA_MAX_PUBLISHED_PER_TENANT = 20;
export const MEDIA_MAX_STAGED_PER_TENANT = 5;
export const MEDIA_MAX_STAGED_BYTES_PER_TENANT =
  MEDIA_MAX_STAGED_PER_TENANT * MEDIA_MAX_BYTES;

export type PromotionTextError =
  'LENGTH' | 'MARKUP_OR_LINK' | 'ECONOMIC_PROMISE' | 'CONTROL_CHARACTER';

const monetaryPattern =
  /(?:\b(?:rd\s*\$|dop|usd|eur|peso(?:s)?|d[oó]lar(?:es)?|precio(?:s)?|tarifa(?:s)?|costo(?:s)?)\b|[$€£¥]|\b\d+(?:[.,]\d+)?\s*(?:%|por\s*ciento)\b)/iu;
const promotionalPattern =
  /\b(?:descuento(?:s)?|rebaja(?:s)?|oferta\s+de\s+precio|cup[oó]n(?:es)?|c[oó]digo(?:s)?\s+(?:promocional(?:es)?|de\s+descuento)|gratis|gratuit[oa]s?|sin\s+costo|sin\s+cargo|cupos?|plazas?|quedan\s+\d+|[uú]ltim[oa]s?\s+\d+\s+(?:turnos?|cupos?|plazas?)|\d+\s*(?:x|por)\s*\d+|dos\s+por\s+uno)\b/iu;
const markupOrLinkPattern = /<[^>]*>|https?:\/\/|www\.|\[[^\]]+\]\([^)]*\)/iu;
function hasForbiddenControl(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return (
      code === 127 || (code < 32 && code !== 9 && code !== 10 && code !== 13)
    );
  });
}

export function validatePromotionText(
  title: string,
  body: string,
): PromotionTextError | null {
  const normalizedTitle = title.trim().normalize('NFKC');
  const normalizedBody = body.trim().normalize('NFKC');
  if (
    normalizedTitle.length < 5 ||
    normalizedTitle.length > 100 ||
    normalizedBody.length < 10 ||
    normalizedBody.length > 500
  ) {
    return 'LENGTH';
  }
  const combined = `${normalizedTitle}\n${normalizedBody}`;
  if (hasForbiddenControl(combined)) return 'CONTROL_CHARACTER';
  if (markupOrLinkPattern.test(combined)) return 'MARKUP_OR_LINK';
  if (monetaryPattern.test(combined) || promotionalPattern.test(combined)) {
    return 'ECONOMIC_PROMISE';
  }
  return null;
}

export interface PromotionInterval {
  startsAtUtc: Date;
  endsAtUtc: Date;
  timeZone: string;
}

export function promotionIntervalForBusinessDays(
  startDate: string,
  endDate: string,
  timeZone: string,
): PromotionInterval | null {
  if (
    !isValidIsoDate(startDate) ||
    !isValidIsoDate(endDate) ||
    endDate < startDate ||
    !isValidTimeZone(timeZone)
  ) {
    return null;
  }
  const dayAfterEnd = addDaysToIsoDate(endDate, 1);
  if (!dayAfterEnd) return null;
  const startsAtUtc = utcRangeForLocalDate(startDate, timeZone)?.start;
  const endsAtUtc = utcRangeForLocalDate(endDate, timeZone)?.end;
  if (!startsAtUtc || !endsAtUtc || endsAtUtc <= startsAtUtc) return null;
  return { startsAtUtc, endsAtUtc, timeZone };
}

export function isPromotionVisibleAt(
  interval: PromotionInterval,
  now: Date,
): boolean {
  return interval.startsAtUtc <= now && now < interval.endsAtUtc;
}
