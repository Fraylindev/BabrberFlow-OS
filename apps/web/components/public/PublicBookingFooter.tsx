export function PublicBookingFooter({ slug }: { slug: string }) {
  return (
    <footer className="border-t border-[var(--color-border)] px-5 py-6 text-center text-xs text-[var(--color-faint)]">
      <p className="mx-auto flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1 leading-5">
        <span className="font-medium text-[var(--color-muted)]">{slug}</span>
        <span aria-hidden="true">·</span>
        <span>Reservas gestionadas con Kortek.</span>
      </p>
    </footer>
  );
}
