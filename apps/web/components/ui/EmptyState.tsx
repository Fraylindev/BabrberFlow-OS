export type EmptyStateIllustration = "calendar" | "team" | "services" | "invoices" | "generic";

function IllustrationIcon({ type }: { type: EmptyStateIllustration }) {
  switch (type) {
    case "calendar":
      return (
        <svg className="h-6 w-6 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <circle cx="8" cy="14" r="1" fill="currentColor" />
          <circle cx="12" cy="14" r="1" fill="currentColor" />
          <circle cx="16" cy="14" r="1" fill="currentColor" />
        </svg>
      );
    case "team":
      return (
        <svg className="h-6 w-6 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "services":
      return (
        <svg className="h-6 w-6 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      );
    case "invoices":
      return (
        <svg className="h-6 w-6 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case "generic":
    default:
      return (
        <svg className="h-6 w-6 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
  }
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  illustration,
  tone = "dark",
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  illustration?: EmptyStateIllustration;
  /** "dark" (por defecto) o "light" — ver nota en Card.tsx. */
  tone?: "dark" | "light";
  className?: string;
}) {
  const isLight = tone === "light";
  const renderedIcon = icon || (illustration ? <IllustrationIcon type={illustration} /> : null);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3.5 rounded-xl border border-dashed px-6 py-14 text-center transition-all ${
        isLight
          ? "border-[var(--dash-border-strong)] bg-[var(--dash-surface)]/50 shadow-[var(--dash-shadow-card)]"
          : "border-[var(--color-border-strong)] bg-[var(--color-surface)]/30"
      } ${className}`}
    >
      {renderedIcon && (
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
            isLight
              ? "border-[var(--dash-border)] bg-[var(--dash-surface-raised)] text-[var(--dash-text-muted)]"
              : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-muted)]"
          }`}
        >
          {renderedIcon}
        </div>
      )}
      <div className="space-y-1">
        <p
          className={`font-[family-name:var(--font-display)] text-base font-semibold sm:text-lg ${
            isLight ? "text-[var(--dash-text)]" : "text-[var(--color-paper)]"
          }`}
        >
          {title}
        </p>
        {description && (
          <p
            className={`max-w-sm text-sm leading-relaxed ${
              isLight ? "text-[var(--dash-text-muted)]" : "text-[var(--color-muted)]"
            }`}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
