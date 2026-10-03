'use client';

import { useState } from 'react';
import { publicMediaUrl } from '@/lib/api';
import type { PublicMediaImage } from '@/lib/media-ui';

const COLORS = ['#80513b', '#3f657d', '#705280', '#356b61', '#79582e'];
export function bookingPhotoFallback(name: string) {
  const normalized = name.trim().replace(/\s+/g, ' ').normalize('NFC') || 'Servicio';
  const words = normalized.split(' ');
  const initials = (words.length > 1 ? words[0][0] + words.at(-1)![0] : normalized.slice(0, 2)).toLocaleUpperCase('es');
  let hash = 0;
  for (const character of normalized.toLocaleLowerCase('es')) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) >>> 0;
  return { initials, background: COLORS[hash % COLORS.length] };
}
export function BookingPhoto({ image, name = 'Servicio', kind = 'service', compact = false }: { image?: PublicMediaImage; name?: string; kind?: 'service' | 'professional'; compact?: boolean }) {
  const src = image ? publicMediaUrl(image.url) : '';
  return <Photo key={src} src={src} image={image} name={name} kind={kind} compact={compact} />;
}
function Photo({ src, image, name, kind, compact }: { src: string; image?: PublicMediaImage; name: string; kind: 'service' | 'professional'; compact: boolean }) {
  const [failed, setFailed] = useState(false);
  const fallback = bookingPhotoFallback(name);
  const shape = compact ? 'h-16 w-16 shrink-0' : 'booking-thumbnail shrink-0';
  return <div className={`${shape} flex items-center justify-center overflow-hidden rounded-lg bg-[var(--color-surface-raised)]`}>
    {src && !failed
      // Localizadores revocables: nunca usar optimizador ni avatar legacy.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={src} alt={image?.decorative ? '' : image?.altText || ''} width={400} height={kind === 'service' ? 300 : 400} className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      : <span aria-hidden="true" className="flex h-full w-full items-center justify-center text-xl font-semibold tracking-wide" style={{ backgroundColor: fallback.background, color: '#fff' }}>{fallback.initials}</span>}
  </div>;
}
