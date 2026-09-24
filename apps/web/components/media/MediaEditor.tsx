'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type Professional, type Service } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { mediaError, validateMediaFile, type MediaAsset, type MediaPurpose, type Promotion, type PromotionDraft } from '@/lib/media-ui';
import { useGalleryOrder, useMediaAssets, usePromotions } from '@/lib/queries/media';
import { useServicesQuery } from '@/lib/queries/services';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useQuery } from '@tanstack/react-query';

const inputClass = 'min-h-11 w-full rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-3 py-2 text-sm text-[var(--dash-text)] focus-visible:outline-2 focus-visible:outline-[var(--dash-accent)]';
const statusName: Record<MediaAsset['status'], string> = {
  STAGED: 'En preparación', APPROVED: 'Lista para publicar', PUBLISHED: 'Publicada',
  QUARANTINED: 'En cuarentena', RETIRED: 'Retirada', PURGED: 'Eliminada',
};

export function MediaEditor() {
  const { user, organization, isReady } = useAuth();
  const allowed = isReady && user && organization && (user.role === 'OWNER' || user.role === 'ADMIN');
  return <section className="min-w-0 space-y-6 text-[var(--dash-text)]">
    <PageHeader tone="light" title="Medios y promociones" description="Prepara imágenes y anuncios editoriales para la página pública." />
    {!isReady ? <p role="status">Cargando acceso…</p> : !allowed ?
      <Card tone="light" className="p-5"><p role="status">No tienes acceso a los medios del negocio.</p></Card> :
      <Workspace key={`${user.id}:${organization.id}:${user.role}`} scope={`${user.id}:${organization.id}:${user.role}`} owner={user.role === 'OWNER'} />}
  </section>;
}

function Workspace({ scope, owner }: { scope: string; owner: boolean }) {
  const [ready, setReady] = useState(false);
  // AuthProvider clears business queries when the tenant changes. Attach new
  // observers after that commit so they cannot be removed during their fetch.
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  return ready ? <ActiveWorkspace scope={scope} owner={owner} /> : <p role="status">Cargando medios y promociones…</p>;
}

function ActiveWorkspace({ scope, owner }: { scope: string; owner: boolean }) {
  const [visit] = useState(() => crypto.randomUUID());
  const queryClient = useQueryClient();
  const assets = useMediaAssets(scope, visit);
  const order = useGalleryOrder(scope, visit);
  const promotions = usePromotions(scope, visit);
  const services = useServicesQuery(scope, { isActive: true });
  const professionals = useQuery({ queryKey: ['media', scope, visit, 'professionals'],
    queryFn: ({ signal }) => api.get<Professional[]>('/professionals', undefined, { signal, cache: 'no-store' }),
    retry: false, gcTime: 0 });
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function refresh() {
    const results = await Promise.all([assets.refetch(), order.refetch(), promotions.refetch()]);
    return results.every((result) => !result.error);
  }

  async function run(action: 'upload' | 'publish' | 'save' | 'retire', operation: (signal: AbortSignal) => Promise<unknown>, success: string): Promise<boolean> {
    setBusy(true); setFailure(''); setConflict(false); setMessage('');
    const controller = new AbortController(); pending.current = controller;
    try {
      await operation(controller.signal);
      if (controller.signal.aborted) return false;
      const refreshed = await refresh();
      if (!refreshed) {
        setFailure('La acción se completó, pero no pudimos actualizar los datos. Reintenta la carga para comprobar el estado.');
        return true;
      }
      await queryClient.invalidateQueries({ queryKey: ['public-media'] });
      if (!controller.signal.aborted) setMessage(success);
      return true;
    } catch (error) {
      if (!controller.signal.aborted) { setFailure(mediaError(error, action)); setConflict(error instanceof ApiError && error.status === 409); }
      return false;
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      if (pending.current === controller) pending.current = null;
    }
  }

  const loadError = assets.error || order.error || promotions.error;
  if (assets.isPending || order.isPending || promotions.isPending) return <p role="status">Cargando medios y promociones…</p>;
  if (!assets.data || !order.data || !promotions.data) return <Card tone="light" className="space-y-3 p-5">
    <p role="alert">{mediaError(loadError, 'load')}</p>
    <Button tone="light" onClick={() => void refresh()}>Reintentar carga</Button>
  </Card>;

  return <div className="space-y-6">
    <Card tone="light" className="p-5 text-sm leading-6 text-[var(--dash-text-muted)]">
      Puedes subir JPEG, PNG o WebP estáticos de hasta 5 MiB y entre 640 y 6000 píxeles por lado. La revisión automática debe aprobar cada imagen antes de publicarla. Hay un máximo de 20 imágenes publicadas por negocio. Solo el propietario publica y retira contenido editorial.
    </Card>
    {failure && <div role="alert" className="space-y-2 rounded-sm bg-[var(--dash-danger-bg)] p-3 text-sm text-[var(--dash-danger)]"><p>{failure}</p>{conflict && <Button tone="light" variant="secondary" onClick={() => void refresh().then((refreshed) => { if (refreshed) { setConflict(false); setFailure(''); setMessage('Datos actualizados. Revisa los cambios y vuelve a intentarlo.'); } else setFailure('No pudimos actualizar los datos. Revisa tu conexión e intenta de nuevo.'); })}>Actualizar datos</Button>}</div>}
    {message && <p role="status" className="rounded-sm bg-[var(--dash-success-bg)] p-3 text-sm text-[var(--dash-success)]">{message}</p>}
    <UploadForm disabled={busy} services={services.data ?? []} professionals={professionals.data ?? []} onUpload={(form) =>
      run('upload', (signal) => api.upload('/media/uploads', form, { signal }), 'Imagen cargada. Revisa su estado antes de publicar.')} />
    {services.isError && <p role="alert">No pudimos cargar los servicios. Reintenta la página antes de asociar una foto.</p>}
    {professionals.isError && <p role="alert">No pudimos cargar los profesionales. Reintenta la página antes de asociar un avatar.</p>}
    <AssetList assets={assets.data} owner={owner} busy={busy} services={services.data ?? []} professionals={professionals.data ?? []} run={run} />
    <GalleryEditor key={order.data.version} assets={assets.data} order={order.data} owner={owner} busy={busy} run={run} />
    <PromotionsEditor promotions={promotions.data} assets={assets.data} owner={owner} busy={busy} run={run} />
  </div>;
}

type Run = (action: 'upload' | 'publish' | 'save' | 'retire', operation: (signal: AbortSignal) => Promise<unknown>, success: string) => Promise<boolean>;

function UploadForm({ disabled, services, professionals, onUpload }: { disabled: boolean; services: Service[]; professionals: Professional[]; onUpload: (form: FormData) => Promise<boolean> }) {
  const [purpose, setPurpose] = useState<MediaPurpose>('GALLERY');
  const [targetId, setTargetId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [decorative, setDecorative] = useState(false);
  const [error, setError] = useState('');
  const [fileKey, setFileKey] = useState(0);
  const targets = purpose === 'SERVICE' ? services.map((item) => ({ id: item.id, name: item.name })) :
    purpose === 'PROFESSIONAL_AVATAR' ? professionals.filter((item) => item.status !== 'ARCHIVED').map((item) => ({ id: item.id, name: item.name })) : [];
  async function submit(event: FormEvent) {
    event.preventDefault();
    const issue = validateMediaFile(file) || (!decorative && (alt.trim().length < 10 || alt.trim().length > 160) ? 'Describe la imagen en 10 a 160 caracteres, o márcala como decorativa.' : null) ||
      (purpose !== 'GALLERY' && !targetId ? 'Elige un destino.' : null);
    if (issue) { setError(issue); return; }
    const form = new FormData();
    form.set('file', file!); form.set('purpose', purpose); form.set('altText', decorative ? '' : alt.trim());
    form.set('decorative', String(decorative)); form.set('caption', caption.trim());
    if (targetId) form.set('targetId', targetId);
    setError(''); if (await onUpload(form)) { setFile(null); setFileKey((value) => value + 1); }
  }
  return <Card tone="light" className="space-y-4 p-5">
    <h2 className="text-lg font-semibold">Subir imagen</h2>
    <form onSubmit={(event) => void submit(event)} className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1 text-sm">Ubicación
        <select className={inputClass} value={purpose} onChange={(event) => { setPurpose(event.target.value as MediaPurpose); setTargetId(''); }}>
          <option value="GALLERY">Galería</option><option value="SERVICE">Foto de servicio</option><option value="PROFESSIONAL_AVATAR">Avatar profesional</option>
        </select>
      </label>
      {purpose !== 'GALLERY' && <label className="space-y-1 text-sm">{purpose === 'SERVICE' ? 'Servicio activo' : 'Profesional'}
        <select className={inputClass} value={targetId} required onChange={(event) => setTargetId(event.target.value)}>
          <option value="">Selecciona uno</option>{targets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>}
      <label className="space-y-1 text-sm">Archivo
        <input key={fileKey} className={inputClass} type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </label>
      <label className="space-y-1 text-sm">Descripción de imagen
        <input className={inputClass} value={alt} maxLength={160} disabled={decorative} onChange={(event) => setAlt(event.target.value)} />
      </label>
      <label className="space-y-1 text-sm sm:col-span-2">Pie de foto (opcional)
        <input className={inputClass} value={caption} maxLength={200} onChange={(event) => setCaption(event.target.value)} />
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={decorative} onChange={(event) => setDecorative(event.target.checked)} /> Imagen decorativa, sin información esencial</label>
      {error && <p role="alert" className="text-sm text-[var(--dash-danger)] sm:col-span-2">{error}</p>}
      <Button tone="light" type="submit" disabled={disabled}>{disabled ? 'Guardando…' : 'Subir imagen'}</Button>
    </form>
  </Card>;
}

function AssetList({ assets, owner, busy, services, professionals, run }: { assets: MediaAsset[]; owner: boolean; busy: boolean; services: Service[]; professionals: Professional[]; run: Run }) {
  const visible = assets;
  return <Card tone="light" className="space-y-4 p-5">
    <h2 className="text-lg font-semibold">Imágenes del negocio</h2>
    {visible.length === 0 ? <p role="status" className="text-sm text-[var(--dash-text-muted)]">Todavía no hay imágenes. Sube una para preparar la página pública.</p> :
      <ul className="space-y-3">{visible.map((asset) => <AssetRow key={`${asset.id}:${asset.revision}`} asset={asset} owner={owner} busy={busy} label={asset.purpose === 'GALLERY' ? 'Galería' : asset.purpose === 'SERVICE' ? `Servicio: ${services.find((item) => item.id === asset.targetId)?.name ?? 'No disponible'}` : asset.purpose === 'PROMOTION' ? 'Imagen de promoción' : `Avatar: ${professionals.find((item) => item.id === asset.targetId)?.name ?? 'No disponible'}`} run={run} />)}</ul>}
  </Card>;
}

function AssetRow({ asset, owner, busy, label, run }: { asset: MediaAsset; owner: boolean; busy: boolean; label: string; run: Run }) {
  const [alt, setAlt] = useState(asset.altText);
  const [caption, setCaption] = useState(asset.caption ?? '');
  const [decorative, setDecorative] = useState(asset.decorative);
  const [confirm, setConfirm] = useState<'retire' | 'quarantine' | null>(null);
  const canEdit = !['RETIRED', 'QUARANTINED', 'PURGED'].includes(asset.status);
  return <li className="min-w-0 space-y-3 rounded-sm border border-[var(--dash-border)] p-4 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{label}</p><p>{statusName[asset.status]} · Revisión {asset.revision} · Moderación: {asset.moderationStatus === 'APPROVED' ? 'aprobada' : asset.moderationStatus === 'REJECTED' ? 'rechazada' : 'pendiente'}</p></div></div>
    {canEdit && <div className="grid gap-2 sm:grid-cols-2">
      <label>Descripción<input className={inputClass} maxLength={160} value={alt} disabled={decorative || busy} onChange={(event) => setAlt(event.target.value)} /></label>
      <label>Pie de foto<input className={inputClass} maxLength={200} value={caption} disabled={busy} onChange={(event) => setCaption(event.target.value)} /></label>
      <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={decorative} disabled={busy} onChange={(event) => setDecorative(event.target.checked)} /> Decorativa</label>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button tone="light" variant="secondary" disabled={busy || (alt === asset.altText && caption === (asset.caption ?? '') && decorative === asset.decorative)} onClick={() => void run('save', (signal) => api.patch(`/media/${asset.id}`, { expectedRevision: asset.revision, altText: decorative ? '' : alt.trim(), caption: caption.trim(), decorative }, { signal }), 'Detalles guardados. Falta publicar esta revisión para que sea visible.')}>Guardar detalles</Button>
        {owner && asset.purpose !== 'PROMOTION' && asset.moderationStatus === 'APPROVED' && asset.publishedRevision !== asset.revision && <Button tone="light" disabled={busy} onClick={() => void run('publish', (signal) => api.post(`/media/${asset.id}/publish`, { expectedRevision: asset.revision, idempotencyKey: crypto.randomUUID() }, { signal }), 'Imagen publicada.')}>Publicar revisión</Button>}
        {owner && <Button tone="light" variant="danger" disabled={busy} onClick={() => setConfirm('retire')}>Retirar</Button>}
        {owner && asset.purpose === 'PROFESSIONAL_AVATAR' && <Button tone="light" variant="danger" disabled={busy} onClick={() => setConfirm('quarantine')}>Poner en cuarentena</Button>}
      </div>
    </div>}
    {confirm && <div role="group" aria-label="Confirmar retiro" className="space-y-2 rounded-sm bg-[var(--dash-danger-bg)] p-3">
      <p>La imagen dejará de mostrarse y se iniciará su eliminación. Esta acción no se puede deshacer.</p>
      <div className="flex gap-2"><Button tone="light" variant="danger" disabled={busy} onClick={() => { const action = confirm; setConfirm(null); void run('retire', (signal) => api.post(`/media/${asset.id}/${action}`, { expectedRevision: asset.revision, idempotencyKey: crypto.randomUUID() }, { signal }), action === 'quarantine' ? 'Imagen puesta en cuarentena.' : 'Imagen retirada.'); }}>{confirm === 'quarantine' ? 'Confirmar cuarentena' : 'Confirmar retiro'}</Button><Button tone="light" variant="secondary" onClick={() => setConfirm(null)}>Cancelar</Button></div>
    </div>}
  </li>;
}

function GalleryEditor({ assets, order, owner, busy, run }: { assets: MediaAsset[]; order: NonNullable<ReturnType<typeof useGalleryOrder>['data']>; owner: boolean; busy: boolean; run: Run }) {
  const published = assets.filter((item) => item.purpose === 'GALLERY' && item.status === 'PUBLISHED');
  const [ids, setIds] = useState(order.draftAssetIds);
  const [hero, setHero] = useState(order.draftHeroAssetId ?? '');
  const chosen = ids.filter((id) => published.some((item) => item.id === id));
  function move(index: number, direction: number) { const next = [...chosen]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; setIds(next); }
  return <Card tone="light" className="space-y-4 p-5"><h2 className="text-lg font-semibold">Orden y portada de galería</h2>
    <p className="text-sm text-[var(--dash-text-muted)]">Primero publica cada imagen. El orden y la portada se guardan y publican por separado.</p>
    {published.length === 0 ? <p role="status">No hay imágenes de galería publicadas.</p> : <>
      <ul className="space-y-2">{chosen.map((id, index) => <li key={id} className="flex flex-wrap items-center gap-2 rounded-sm border border-[var(--dash-border)] p-2 text-sm">
        <span className="w-full min-w-0 break-words sm:w-auto sm:flex-1">{assets.find((item) => item.id === id)?.altText || 'Imagen decorativa'}</span>
        <div className="flex flex-wrap gap-2 sm:ml-auto"><Button tone="light" variant="secondary" disabled={busy || index === 0} aria-label={`Subir imagen ${index + 1}`} onClick={() => move(index, -1)}>↑</Button>
        <Button tone="light" variant="secondary" disabled={busy || index === chosen.length - 1} aria-label={`Bajar imagen ${index + 1}`} onClick={() => move(index, 1)}>↓</Button>
        <Button tone="light" variant="secondary" disabled={busy} onClick={() => { setIds(chosen.filter((item) => item !== id)); if (hero === id) setHero(''); }}>Quitar del orden</Button></div>
      </li>)}</ul>
      <label className="block text-sm">Añadir imagen publicada<select className={inputClass} value="" disabled={busy} onChange={(event) => setIds([...chosen, event.target.value])}><option value="">Selecciona una</option>{published.filter((item) => !chosen.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.altText || 'Imagen decorativa'}</option>)}</select></label>
      <label className="block text-sm">Imagen de portada<select className={inputClass} value={chosen.includes(hero) ? hero : ''} disabled={busy} onChange={(event) => setHero(event.target.value)}><option value="">Sin portada</option>{chosen.map((id) => <option key={id} value={id}>{assets.find((item) => item.id === id)?.altText || 'Imagen decorativa'}</option>)}</select></label>
      <div className="flex flex-wrap gap-2"><Button tone="light" variant="secondary" disabled={busy} onClick={() => void run('save', (signal) => api.patch('/media/gallery-order', { expectedVersion: order.version, assetIds: chosen, heroAssetId: hero || null, idempotencyKey: crypto.randomUUID() }, { signal }), 'Orden guardado como borrador.')}>Guardar orden</Button>
        {owner && <Button tone="light" disabled={busy || order.draftRevision === order.publishedRevision} onClick={() => void run('publish', (signal) => api.post('/media/gallery-order/publish', { expectedVersion: order.version, idempotencyKey: crypto.randomUUID() }, { signal }), 'Orden y portada publicados.')}>Publicar orden</Button>}</div>
    </>}
  </Card>;
}

function PromotionsEditor({ promotions, assets, owner, busy, run }: { promotions: Promotion[]; assets: MediaAsset[]; owner: boolean; busy: boolean; run: Run }) {
  const [draft, setDraft] = useState<PromotionDraft>({ title: '', body: '', startDate: '', endDate: '', imageAssetId: null });
  const [error, setError] = useState('');
  const pendingCreate = useRef<{ content: string; key: string } | null>(null);
  function valid(value: PromotionDraft) {
    if (value.title.trim().length < 5 || value.body.trim().length < 10 || !value.startDate || !value.endDate) return 'Completa título, texto y fechas del negocio.';
    if (/\b(gratis|gratuito|descuento|cup[oó]n|cupos|plazas|sin costo|2\s*x\s*1)\b|[%$]/iu.test(`${value.title} ${value.body}`)) return 'Esta promoción es editorial: elimina precios, descuentos, porcentajes, cupones, cupos y promesas de gratuidad.';
    return null;
  }
  function create(event: FormEvent) { event.preventDefault(); const issue = valid(draft); if (issue) { setError(issue); return; } setError(''); const content = JSON.stringify({ title: draft.title.trim(), body: draft.body.trim(), startDate: draft.startDate, endDate: draft.endDate }); const key = pendingCreate.current?.content === content ? pendingCreate.current.key : crypto.randomUUID(); pendingCreate.current = { content, key }; void run('save', (signal) => api.post('/media/promotions', { ...draft, imageAssetId: undefined, idempotencyKey: key }, { signal }), 'Promoción creada como borrador.').then((done) => { if (done) { pendingCreate.current = null; setDraft({ title: '', body: '', startDate: '', endDate: '', imageAssetId: null }); } }); }
  return <Card tone="light" className="space-y-5 p-5"><div><h2 className="text-lg font-semibold">Promociones editoriales</h2><p className="mt-1 text-sm text-[var(--dash-text-muted)]">Cuenta una novedad del negocio. No prometas precios, descuentos, cupones, cupos ni gratuidad. Las fechas incluyen días completos del negocio.</p></div>
    <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Título<input className={inputClass} required minLength={5} maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label className="text-sm">Desde<input className={inputClass} type="date" required value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label>
      <label className="text-sm">Hasta<input className={inputClass} type="date" required value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label>
      <label className="text-sm sm:col-span-2">Texto<textarea className={inputClass} required minLength={10} maxLength={500} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label>
      {error && <p role="alert" className="text-[var(--dash-danger)] sm:col-span-2">{error}</p>}
      <Button tone="light" type="submit" disabled={busy}>Crear borrador</Button>
    </form>
    {promotions.length === 0 ? <p role="status" className="text-sm">Todavía no hay promociones.</p> : <ul className="space-y-4">{promotions.map((promotion) => <PromotionRow key={`${promotion.id}:${promotion.version}`} promotion={promotion} assets={assets} owner={owner} busy={busy} run={run} />)}</ul>}
  </Card>;
}

function PromotionRow({ promotion, assets, owner, busy, run }: { promotion: Promotion; assets: MediaAsset[]; owner: boolean; busy: boolean; run: Run }) {
  const [form, setForm] = useState(promotion.draft);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [confirm, setConfirm] = useState<'publish' | 'retire' | null>(null);
  const [imageError, setImageError] = useState('');
  const image = assets.find((item) => item.id === form.imageAssetId);
  const ownImages = assets.filter((item) => item.purpose === 'PROMOTION' && item.targetId === promotion.id && !['RETIRED', 'QUARANTINED', 'PURGED'].includes(item.status));
  const retired = Boolean(promotion.retiredAt);
  return <li className="min-w-0 space-y-3 rounded-sm border border-[var(--dash-border)] p-4 text-sm">
    <div><h3 className="font-semibold">{promotion.draft.title}</h3><p>{retired ? 'Retirada' : promotion.published ? 'Publicada' : 'Borrador'} · Revisión {promotion.draftRevision}</p></div>
    {!retired && <div className="grid gap-3 sm:grid-cols-2">
      <label>Título<input className={inputClass} maxLength={100} value={form.title} disabled={busy} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
      <label>Desde<input className={inputClass} type="date" value={form.startDate} disabled={busy} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
      <label>Hasta<input className={inputClass} type="date" value={form.endDate} disabled={busy} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
      <label className="sm:col-span-2">Texto<textarea className={inputClass} maxLength={500} value={form.body} disabled={busy} onChange={(event) => setForm({ ...form, body: event.target.value })} /></label>
      <div className="space-y-2 sm:col-span-2"><p>Imagen propia (opcional): {image ? `${statusName[image.status]} · ${image.moderationStatus === 'APPROVED' ? 'revisada' : 'pendiente de revisión'}` : 'Sin imagen'}</p>
        <label className="block">Imagen del borrador<select className={inputClass} value={form.imageAssetId ?? ''} disabled={busy} onChange={(event) => setForm({ ...form, imageAssetId: event.target.value || null })}><option value="">Sin imagen</option>{ownImages.map((item) => <option key={item.id} value={item.id}>{item.altText || 'Imagen decorativa'} · {statusName[item.status]}</option>)}</select></label>
        <label className="block">Archivo para esta promoción<input className={inputClass} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <label className="block">Descripción de la imagen<input className={inputClass} maxLength={160} disabled={busy} value={alt} onChange={(event) => setAlt(event.target.value)} /></label>
        <Button tone="light" variant="secondary" disabled={busy || !file} onClick={() => { const issue = validateMediaFile(file) || (alt.trim().length < 10 ? 'Describe la imagen en al menos 10 caracteres.' : null); if (issue) { setImageError(issue); return; } setImageError(''); const body = new FormData(); body.set('file', file!); body.set('purpose', 'PROMOTION'); body.set('targetId', promotion.id); body.set('altText', alt.trim()); body.set('decorative', 'false'); void run('upload', async (signal) => { const uploaded = await api.upload<MediaAsset>('/media/uploads', body, { signal }); await api.patch(`/media/promotions/${promotion.id}`, { ...form, imageAssetId: uploaded.id, expectedVersion: promotion.version, idempotencyKey: crypto.randomUUID() }, { signal }); }, 'Imagen añadida al borrador. Publica la promoción para mostrarla.'); }}>Subir y asociar imagen</Button>
        {imageError && <p role="alert" className="text-[var(--dash-danger)]">{imageError}</p>}
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><Button tone="light" variant="secondary" disabled={busy} onClick={() => void run('save', (signal) => api.patch(`/media/promotions/${promotion.id}`, { ...form, expectedVersion: promotion.version, idempotencyKey: crypto.randomUUID() }, { signal }), 'Borrador de promoción guardado.')}>Guardar borrador</Button>
      {owner && <><Button tone="light" disabled={busy} onClick={() => setConfirm('publish')}>Publicar promoción</Button><Button tone="light" variant="danger" disabled={busy} onClick={() => setConfirm('retire')}>Retirar</Button></>}</div>
    </div>}
    {confirm && <div role="group" aria-label="Confirmar promoción" className="space-y-2 rounded-sm bg-[var(--dash-surface-raised)] p-3">
      <p>{confirm === 'publish' ? 'Confirma que el texto y la imagen no prometen precios, descuentos, cupones, cupos ni gratuidad. Se mostrará durante los días indicados.' : 'La promoción dejará de mostrarse. Esta acción no se puede deshacer.'}</p>
      <div className="flex gap-2"><Button tone="light" variant={confirm === 'retire' ? 'danger' : 'primary'} disabled={busy} onClick={() => { const action = confirm; setConfirm(null); void run(action === 'publish' ? 'publish' : 'retire', (signal) => api.post(`/media/promotions/${promotion.id}/${action}`, { expectedVersion: promotion.version, idempotencyKey: crypto.randomUUID() }, { signal }), action === 'publish' ? 'Promoción publicada.' : 'Promoción retirada.'); }}>Confirmar</Button><Button tone="light" variant="secondary" onClick={() => setConfirm(null)}>Cancelar</Button></div>
    </div>}
  </li>;
}
