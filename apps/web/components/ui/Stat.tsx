export function Stat({
  value,
  label,
  className = "",
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="font-[family-name:var(--font-mono)] text-3xl font-medium text-[var(--color-paper)] sm:text-4xl">
        {value}
      </p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{label}</p>
    </div>
  );
}
