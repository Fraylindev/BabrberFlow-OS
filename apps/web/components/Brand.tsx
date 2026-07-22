export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-brass)] font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--color-brass)]">
        BF
      </div>
      {!compact && (
        <div className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--color-paper)]">
          BarberFlow
        </div>
      )}
    </div>
  );
}
