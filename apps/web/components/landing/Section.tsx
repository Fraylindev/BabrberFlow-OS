export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-brass)]">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-paper)] sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base text-[var(--color-muted)]">{description}</p>
      )}
    </div>
  );
}
