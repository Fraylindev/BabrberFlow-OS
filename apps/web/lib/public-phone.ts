export interface PhoneCountry { code: string; name: string; dial: string }
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'do', name: 'República Dominicana', dial: '1' }, { code: 'us', name: 'Estados Unidos', dial: '1' },
  { code: 'pr', name: 'Puerto Rico', dial: '1' }, { code: 'ca', name: 'Canadá', dial: '1' },
  { code: 'mx', name: 'México', dial: '52' }, { code: 'co', name: 'Colombia', dial: '57' },
  { code: 'es', name: 'España', dial: '34' }, { code: 'ar', name: 'Argentina', dial: '54' },
  { code: 'cl', name: 'Chile', dial: '56' }, { code: 'pe', name: 'Perú', dial: '51' },
  { code: 'pa', name: 'Panamá', dial: '507' }, { code: 'cr', name: 'Costa Rica', dial: '506' },
  { code: 'gt', name: 'Guatemala', dial: '502' }, { code: 'ec', name: 'Ecuador', dial: '593' },
  { code: 've', name: 'Venezuela', dial: '58' }, { code: 'sv', name: 'El Salvador', dial: '503' },
  { code: 'hn', name: 'Honduras', dial: '504' }, { code: 'ni', name: 'Nicaragua', dial: '505' },
  { code: 'bo', name: 'Bolivia', dial: '591' }, { code: 'uy', name: 'Uruguay', dial: '598' },
  { code: 'py', name: 'Paraguay', dial: '595' }, { code: 'br', name: 'Brasil', dial: '55' },
  { code: 'gb', name: 'Reino Unido', dial: '44' }, { code: 'de', name: 'Alemania', dial: '49' },
  { code: 'fr', name: 'Francia', dial: '33' }, { code: 'it', name: 'Italia', dial: '39' },
  { code: 'pt', name: 'Portugal', dial: '351' },
];
export interface PhoneDraft { country: string; dial: string; national: string }
export const EMPTY_PHONE: PhoneDraft = { country: 'do', dial: '1', national: '' };
const removeFormatting = (value: string) => value.replace(/[ ().-]/g, '');
export function changePhoneNumber(draft: PhoneDraft, input: string): PhoneDraft {
  const compact = removeFormatting(input);
  if (!/^(\+|00)/.test(compact)) {
    const national = draft.dial === '1' && /^1\d{10}$/.test(compact) ? compact.slice(1) : compact;
    return { ...draft, national };
  }
  const international = compact.replace(/^00/, '+');
  const digits = international.slice(1);
  const current = PHONE_COUNTRIES.find(item => item.code === draft.country);
  const country = current && digits.startsWith(current.dial) ? current
    : [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find(item => digits.startsWith(item.dial));
  if (country) return { country: country.code, dial: country.dial, national: digits.slice(country.dial.length) };
  // Preserve unknown calling codes rather than guessing the prefix boundary.
  if (draft.country === 'other' && draft.dial && digits.startsWith(draft.dial)) return { ...draft, national: digits.slice(draft.dial.length) };
  return { country: 'other', dial: '', national: international };
}
export function phoneValue(draft: PhoneDraft): string {
  if (!draft.national) return '';
  if (draft.country === 'other' && draft.national.startsWith('+') && (!draft.dial || draft.national.slice(1).startsWith(draft.dial))) return draft.national;
  return `+${draft.dial}${draft.national}`;
}
export function phoneDisplay(draft: PhoneDraft): string {
  if (draft.country === 'other' && draft.dial && draft.national.startsWith(`+${draft.dial}`)) return draft.national.slice(draft.dial.length + 1);
  if (draft.dial !== '1' || draft.country === 'other' || !/^\d{0,10}$/.test(draft.national)) return draft.national;
  return [draft.national.slice(0, 3), draft.national.slice(3, 6), draft.national.slice(6)].filter(Boolean).join('-');
}
export function phonePrefixError(draft: PhoneDraft): string | undefined {
  if (draft.country === 'other' && !draft.dial && /^\+[1-9]/.test(draft.national)) return undefined;
  if (!/^[1-9]\d{0,2}$/.test(draft.dial)) return 'Revisa el prefijo internacional.';
  if (draft.national.startsWith('+') && !draft.national.startsWith(`+${draft.dial}`)) return 'Revisa el prefijo internacional.';
}
export const countrySearch = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
