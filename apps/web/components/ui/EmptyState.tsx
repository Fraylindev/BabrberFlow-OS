export function EmptyState({
  title,
  description,
  action,
  tone = "dark",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** "dark" (por defecto) o "light" — ver nota en Card.tsx. */
  tone?: "dark" | "light";
}) {
  if (tone === "light") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-[var(--dash-border-strong)] px-6 py-16 text-center">
        <p className="font-[family-name:var(--font-display)] text-lg text-[var(--dash-text)]">
          {title}
        </p>
        {description && (
          <p className="max-w-sm text-sm text-[var(--dash-text-muted)]">{description}</p>
        )}
        {action}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
      <p className="font-[family-name:var(--font-display)] text-lg text-[var(--color-paper)]">
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-sm text-[var(--color-muted)]">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
