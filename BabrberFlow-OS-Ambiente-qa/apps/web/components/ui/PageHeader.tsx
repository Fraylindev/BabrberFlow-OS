export function PageHeader({
  title,
  description,
  action,
  tone = "dark",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** "dark" (por defecto) o "light" — ver nota en Card.tsx sobre por
   * qué las clases van completas y literales por tono. */
  tone?: "dark" | "light";
}) {
  if (tone === "light") {
    return (
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--dash-text)]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-[var(--dash-text-muted)]">{description}</p>
          )}
        </div>
        {action}
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-paper)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
