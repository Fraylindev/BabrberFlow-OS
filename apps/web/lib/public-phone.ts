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
// Presentation only: ITU national numbering plans, checked 2026-10-02.
// https://www.itu.int/oth/T0202.aspx?lang=en&parent=T0202
// This does not validate contacts or change the 27-country selector/payload.
const DISPLAY_CALLING_CODES = new Set(('1 7 20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98 '
  + '211 212 213 216 218 220 221 222 223 224 225 226 227 228 229 230 231 232 233 234 235 236 237 238 239 240 241 242 243 244 245 246 247 248 249 250 251 252 253 254 255 256 257 258 260 261 262 263 264 265 266 267 268 269 290 291 297 298 299 '
  + '350 351 352 353 354 355 356 357 358 359 370 371 372 373 374 375 376 377 378 380 381 382 383 385 386 387 389 420 421 423 '
  + '500 501 502 503 504 505 506 507 508 509 590 591 592 593 594 595 596 597 598 599 '
  + '670 672 673 674 675 676 677 678 679 680 681 682 683 685 686 687 688 689 690 691 692 '
  + '850 852 853 855 856 870 880 881 882 886 960 961 962 963 964 965 966 967 968 970 971 972 973 974 975 976 977 992 993 994 995 996 998').split(' '));
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
  if (draft.country === 'other' && draft.dial && draft.national.startsWith(`+${draft.dial}`)) return phoneDisplay({ ...draft, national: draft.national.slice(draft.dial.length + 1) });
  if (!draft.dial && draft.national.startsWith('+')) return formatPublicPhone(draft.national);
  if (!/^\d+$/.test(draft.national)) return draft.national;
  const groups = draft.dial === '1' ? [3, 3, 4]
    : ['es', 'pt'].includes(draft.country) ? [3, 3, 3]
    : draft.country === 'fr' ? [1, 2, 2, 2, 2]
    : draft.dial === '81' && draft.national.length === 10 ? [2, 4, 4]
    : draft.country === 'br' ? [2, draft.national.length === 11 ? 5 : 4, 4]
    : draft.country === 'gb' ? [4, 3, 3]
    : draft.country === 'mx' ? [2, 4, 4]
    : draft.national.length === 8 ? [4, 4] : [3, 3, 4];
  let offset = 0;
  const parts = groups.map(size => { const part = draft.national.slice(offset, offset + size); offset += size; return part; });
  if (offset < draft.national.length) parts.push(draft.national.slice(offset));
  return parts.filter(Boolean).join('-');
}
export function formatPublicPhone(value: string): string {
  let draft = changePhoneNumber(EMPTY_PHONE, value);
  if (!draft.dial && /^\+\d+$/.test(draft.national)) {
    const digits = draft.national.slice(1);
    const dial = [1, 2, 3].map(length => digits.slice(0, length)).find(code => DISPLAY_CALLING_CODES.has(code));
    if (dial) draft = { ...draft, dial, national: digits.slice(dial.length) };
  }
  // Unassigned codes stay intact; never guess a prefix or discard digits.
  return draft.dial ? `+${draft.dial} ${phoneDisplay(draft)}` : value;
}
export function phonePrefixError(draft: PhoneDraft): string | undefined {
  if (draft.country === 'other' && !draft.dial && /^\+[1-9]/.test(draft.national)) return undefined;
  if (!/^[1-9]\d{0,2}$/.test(draft.dial)) return 'Revisa el prefijo internacional.';
  if (draft.national.startsWith('+') && !draft.national.startsWith(`+${draft.dial}`)) return 'Revisa el prefijo internacional.';
}
export const countrySearch = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
