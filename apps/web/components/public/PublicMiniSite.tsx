"use client";

import Link from 'next/link';
import { ApiError, publicMediaUrl } from '@/lib/api';
import { usePublicBookingData } from '@/lib/queries/public-booking';
import { usePublicMedia } from '@/lib/queries/media';
import { isPublicMedia, type PublicMediaImage } from '@/lib/media-ui';
import { Brand } from '@/components/Brand';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from './WhatsAppIcon';
import { businessWhatsAppLink } from '@/lib/whatsapp-link';
import { PublicBookingFooter } from './PublicBookingFooter';

export function PublicMiniSite({ slug }: { slug: string }) {
  const { data, error, isLoading, isError, isFetching, refetch } = usePublicBookingData(slug);
  const mediaQuery = usePublicMedia(slug, Boolean(data));
  const isRetired = (isError && error instanceof ApiError && error.status === 404) || (mediaQuery.isError && mediaQuery.error instanceof ApiError && mediaQuery.error.status === 404);

  if (isLoading) return <PublicLoading />;
  if (isRetired || !data) {
    if (isError && !(error instanceof ApiError && error.status === 404)) {
      return <PublicLoadError onRetry={() => void refetch()} pending={isFetching} />;
    }
    return <PublicUnavailable />;
  }
  if (isError) return <PublicLoadError onRetry={() => void refetch()} pending={isFetching} />;

  const canBook = data.services.length > 0 && data.professionals.length > 0;
  const contactLink = businessWhatsAppLink(data.organization.phone);
  const media = !mediaQuery.isError && isPublicMedia(mediaQuery.data) ? mediaQuery.data : null;
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--color-ink)]">
      <section className="film-grain border-b border-[var(--color-border)]">
        <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between">
            <Brand compact />
            <span className="font-[family-name:var(--font-mono)] text-[0.68rem] uppercase tracking-[0.2em] text-[var(--color-faint)]">
              Reservas en línea
            </span>
          </div>

          <div className="my-auto max-w-3xl py-16 sm:py-24">
            <p className="mb-5 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.24em] text-[var(--color-brass)]">
              Bienvenido
            </p>
            <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[0.98] text-[var(--color-paper)] sm:text-7xl lg:text-8xl">
              {data.organization.name}
            </h1>
            {data.organization.description && (
              <p className="mt-7 max-w-2xl whitespace-pre-line text-base leading-7 text-[var(--color-muted)] sm:text-lg">
                {data.organization.description}
              </p>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-3">
              {canBook && (
                <Link href={`/${encodeURIComponent(slug)}/reservar`} className="inline-flex min-h-12 items-center rounded-sm bg-[var(--color-brass)] px-6 text-sm font-medium text-[var(--color-paper)]">
                  Reservar cita
                </Link>
              )}
              {contactLink && (
                <a
                  className="inline-flex min-h-12 items-center gap-2 rounded-sm border border-[var(--color-muted)] bg-[var(--color-surface-raised)] px-5 text-sm font-medium text-[var(--color-paper)] transition-colors hover:border-[var(--color-paper)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-paper)]"
                  href={contactLink} target="_blank" rel="noopener noreferrer"
                  aria-label="Contactar por WhatsApp (se abre en una pestaña nueva)"
                >
                  <WhatsAppIcon size={20} />
                  Contactar por WhatsApp
                </a>
              )}
            </div>


            {!canBook && (
              <p className="mt-5 text-sm text-[var(--color-muted)]" role="status">
                Las reservas en línea no están disponibles por ahora.
              </p>
            )}

          </div>
          {media?.hero && <PublicImage image={media.hero} className="mb-8 max-h-[28rem] w-full rounded-sm object-cover" />}
        </div>
      </section>

      {mediaQuery.isError && <section className="mx-auto max-w-6xl px-5 py-5 sm:px-8" aria-live="polite"><p className="text-sm text-[var(--color-muted)]">Las fotos y promociones no están disponibles ahora.</p><Button variant="secondary" className="mt-3" disabled={mediaQuery.isFetching} onClick={() => void mediaQuery.refetch()}>{mediaQuery.isFetching ? 'Reintentando…' : 'Reintentar fotos'}</Button></section>}

      {media && (media.gallery.length > 0 || media.promotions.length > 0) && <section className="border-b border-[var(--color-border)]" aria-label="Fotos y novedades"><div className="mx-auto max-w-6xl space-y-12 px-5 py-12 sm:px-8 lg:px-12">
        {media.gallery.length > 0 && <div><h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-paper)]">Galería</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{media.gallery.map((image) => <figure key={image.id} className="min-w-0"><PublicImage image={image} className="aspect-[4/3] w-full rounded-sm object-cover" />{image.caption && <figcaption className="mt-2 text-sm text-[var(--color-muted)]">{image.caption}</figcaption>}</figure>)}</div></div>}
        {media.promotions.length > 0 && <div><h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-paper)]">Novedades</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">{media.promotions.map((promotion) => <article key={promotion.id} className="min-w-0 overflow-hidden rounded-sm border border-[var(--color-border)] p-4">{promotion.image && <PublicImage image={promotion.image} className="mb-4 aspect-[4/3] w-full rounded-sm object-cover" />}<h3 className="text-xl font-semibold text-[var(--color-paper)]">{promotion.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--color-muted)]">{promotion.body}</p></article>)}</div></div>}
      </div></section>}

      {media && media.services.length > 0 && <section className="border-b border-[var(--color-border)]" aria-labelledby="service-photos-title"><div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-12"><h2 id="service-photos-title" className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-paper)]">Servicios</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{media.services.map(({ serviceId, image }) => { const service = data.services.find((item) => item.id === serviceId); return service ? <figure key={serviceId}><PublicImage image={image} className="aspect-[4/3] w-full rounded-sm object-cover" /><figcaption className="mt-2 text-sm text-[var(--color-paper)]">{service.name}</figcaption></figure> : null; })}</div></div></section>}
      {media && media.professionals.length > 0 && <section className="border-b border-[var(--color-border)]" aria-labelledby="team-photos-title"><div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-12"><h2 id="team-photos-title" className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-paper)]">Nuestro equipo</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{media.professionals.map(({ professionalId, avatar }) => { const professional = data.professionals.find((item) => item.id === professionalId); return professional ? <figure key={professionalId}><PublicImage image={avatar} className="aspect-square w-full rounded-sm object-cover" /><figcaption className="mt-2 text-sm text-[var(--color-paper)]">{professional.name}</figcaption></figure> : null; })}</div></div></section>}

      {(data.organization.address || data.organization.googleMapsUrl) && (
        <section className="border-b border-[var(--color-border)]" aria-labelledby="location-title">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-center lg:px-12">
            <div>
              <p className="font-[family-name:var(--font-mono)] text-[0.68rem] uppercase tracking-[0.2em] text-[var(--color-faint)]">
                Visítanos
              </p>
              <h2
                id="location-title"
                className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]"
              >
                Nuestra ubicación
              </h2>
              {data.organization.address && (
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--color-muted)]">
                  {data.organization.address}
                </p>
              )}
            </div>
            {data.organization.googleMapsUrl && (
              <a
                href={data.organization.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center border border-[var(--color-border-strong)] px-5 text-sm text-[var(--color-paper)] transition-colors hover:border-[var(--color-brass)]"
              >
                Abrir en Google Maps
              </a>
            )}
          </div>
        </section>
      )}

      <PublicBookingFooter slug={slug} />
    </main>
  );
}

function PublicImage({ image, className }: { image: PublicMediaImage; className: string }) {
  const src = publicMediaUrl(image.url);
  if (!src) return null;
  // The API issues short-lived, no-store URLs; Next's image optimizer must not cache them.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={image.decorative ? '' : image.altText || ''} className={className} loading="lazy" />;
}

function PublicLoading() {
  return (
    <main
      className="mx-auto flex min-h-screen max-w-6xl animate-pulse flex-col px-5 py-8 sm:px-8 lg:px-12"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Cargando página del negocio…</span>
      <div className="h-6 w-32 bg-[var(--color-surface-raised)]" />
      <div className="my-auto space-y-5 py-16">
        <div className="h-4 w-24 bg-[var(--color-surface-raised)]" />
        <div className="h-16 w-full max-w-2xl bg-[var(--color-surface-raised)]" />
        <div className="h-5 w-full max-w-xl bg-[var(--color-surface-raised)]" />
        <div className="h-12 w-40 bg-[var(--color-surface-raised)]" />
      </div>
    </main>
  );
}

function PublicUnavailable() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <Brand />
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
        Esta página no está disponible
      </h1>
      <p className="max-w-sm text-sm leading-6 text-[var(--color-muted)]">
        Revisa el enlace o comunícate directamente con el negocio.
      </p>
    </main>
  );
}

function PublicLoadError({ onRetry, pending }: { onRetry: () => void; pending: boolean }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <Brand />
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
        No pudimos cargar esta página
      </h1>
      <p className="max-w-sm text-sm leading-6 text-[var(--color-muted)]">
        Revisa tu conexión e inténtalo de nuevo.
      </p>
      <Button onClick={onRetry} disabled={pending}>
        {pending ? "Reintentando…" : "Reintentar"}
      </Button>
    </main>
  );
}
