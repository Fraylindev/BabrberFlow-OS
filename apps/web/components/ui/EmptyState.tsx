export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
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
