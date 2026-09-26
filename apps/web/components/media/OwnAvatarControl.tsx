'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mediaError, validateMediaFile } from '@/lib/media-ui';
import { useMediaAssets } from '@/lib/queries/media';
import { Button } from '@/components/ui/Button';

export function OwnAvatarControl({ professionalId, scope }: { professionalId: string; scope: string }) {
  const [visit] = useState(() => crypto.randomUUID());
  const assets = useMediaAssets(scope, visit);
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const own = assets.data?.filter((item) => item.purpose === 'PROFESSIONAL_AVATAR' && item.targetId === professionalId && !['RETIRED', 'QUARANTINED', 'PURGED'].includes(item.status)) ?? [];

  async function operate(action: 'upload' | 'publish', operation: (signal: AbortSignal) => Promise<unknown>, success: string) {
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(''); setMessage('');
    try {
      await operation(controller.signal);
      if (controller.signal.aborted) return;
      await assets.refetch();
      await queryClient.invalidateQueries({ queryKey: ['professionals'] });
      if (!controller.signal.aborted) setMessage(success);
    } catch (caught) {
      if (!controller.signal.aborted) setError(mediaError(caught, action));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      if (pending.current === controller) pending.current = null;
    }
  }

  function upload(event: FormEvent) {
    event.preventDefault();
    const issue = validateMediaFile(file);
    if (issue) { setError(issue); return; }
    if (alt.trim().length < 10) { setError('Describe tu foto en al menos 10 caracteres.'); return; }
    const body = new FormData(); body.set('file', file!); body.set('purpose', 'PROFESSIONAL_AVATAR');
    body.set('targetId', professionalId); body.set('altText', alt.trim()); body.set('decorative', 'false');
    void operate('upload', (signal) => api.upload('/media/uploads', body, { signal }), 'Foto cargada. Publícala cuando la revisión automática esté aprobada.');
  }

  return <section className="space-y-3 border-t border-[var(--dash-border)] pt-4" aria-label="Mi foto de perfil">
    <h3 className="font-semibold">Mi foto de perfil</h3>
    <p className="text-sm text-[var(--dash-text-muted)]">Tu foto se revisa automáticamente antes de mostrarse. Si la cuota de revisión se agota o el servicio falla, la foto anterior permanece visible.</p>
    {assets.isPending ? <p role="status">Cargando fotos…</p> : assets.isError ? <div><p role="alert">{mediaError(assets.error, 'load')}</p><Button tone="light" variant="secondary" onClick={() => void assets.refetch()}>Reintentar</Button></div> : <>
      <form onSubmit={upload} className="space-y-2">
        <label className="block text-sm">Foto JPEG, PNG o WebP (hasta 5 MiB)<input className="mt-1 block min-h-11 w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <label className="block text-sm">Descripción de la foto<input className="mt-1 min-h-11 w-full rounded-sm border border-[var(--dash-border-strong)] px-3" maxLength={160} value={alt} onChange={(event) => setAlt(event.target.value)} /></label>
        <Button tone="light" type="submit" disabled={busy}>Subir foto</Button>
      </form>
      {own.length === 0 ? <p role="status" className="text-sm">Aún no tienes una foto gestionada.</p> : <ul className="space-y-2">{own.map((item) => <li key={item.id} className="rounded-sm border border-[var(--dash-border)] p-3 text-sm"><p>{item.status === 'PUBLISHED' ? 'Publicada' : item.moderationStatus === 'APPROVED' ? 'Lista para publicar' : 'En revisión'} · {item.altText}</p>{item.moderationStatus === 'APPROVED' && item.publishedRevision !== item.revision && <Button tone="light" variant="secondary" className="mt-2" disabled={busy} onClick={() => void operate('publish', (signal) => api.post(`/media/${item.id}/publish`, { expectedRevision: item.revision, idempotencyKey: crypto.randomUUID() }, { signal }), 'Tu foto de perfil fue publicada.')}>Publicar esta foto</Button>}</li>)}</ul>}
    </>}
    {error && <p role="alert" className="text-sm text-[var(--dash-danger)]">{error}</p>}
    {message && <p role="status" className="text-sm text-[var(--dash-success)]">{message}</p>}
  </section>;
}
