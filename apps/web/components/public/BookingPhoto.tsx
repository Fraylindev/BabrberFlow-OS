'use client';

import { useState } from 'react';
import { publicMediaUrl } from '@/lib/api';
import type { PublicMediaImage } from '@/lib/media-ui';

export function BookingPhoto({ image, kind = 'service', compact = false }: { image?: PublicMediaImage; kind?: 'service' | 'professional'; compact?: boolean }) {
  const src = image ? publicMediaUrl(image.url) : '';
  return <Photo key={src} src={src} image={image} kind={kind} compact={compact} />;
}
function Photo({ src, image, kind, compact }: { src: string; image?: PublicMediaImage; kind: 'service' | 'professional'; compact: boolean }) {
  const [failed, setFailed] = useState(false);
  const shape = compact ? 'h-16 w-16 shrink-0' : 'booking-thumbnail shrink-0';
  return <div className={`${shape} flex items-center justify-center overflow-hidden ${kind === 'professional' ? 'rounded-full' : 'rounded-lg'} bg-[var(--color-surface-raised)]`}>
    {src && !failed
      // Localizadores revocables: nunca usar optimizador ni avatar legacy.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={src} alt={image?.decorative ? '' : image?.altText || ''} width={400} height={kind === 'service' ? 300 : 400} className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      : <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" className="text-[var(--color-muted)]">
        {kind === 'professional' ? <><circle cx="16" cy="10" r="5" /><path d="M5 29c0-9 22-9 22 0" /></> : <><rect x="4" y="4" width="24" height="24" rx="2" /><path d="m4 24 8-8 5 5 4-4 7 7" /><circle cx="22" cy="10" r="2" /></>}
      </svg>}
  </div>;
}
