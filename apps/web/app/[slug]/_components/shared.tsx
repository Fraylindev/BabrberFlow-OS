import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export function formatMoney(value: string | number) {
  return `RD$${Number(value).toLocaleString("es-DO", { minimumFractionDigits: 0 })}`;
}

export function StepWrapper({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-5 font-[family-name:var(--font-display)] text-lg text-[var(--color-paper)]">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function NavButtons({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continuar",
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3 pt-2">
      {onBack ? (
        <Button variant="ghost" onClick={onBack} className="gap-1.5">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Atrás
        </Button>
      ) : (
        <span />
      )}
      <Button onClick={onNext} disabled={nextDisabled} className="gap-1.5 px-6">
        {nextLabel}
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Button>
    </div>
  );
}

export function OptionButton({
  selected,
  onClick,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] cursor-pointer active:scale-[0.98] ${
        selected
          ? "border-[var(--color-brass)] bg-[var(--color-brass)]/10 shadow-[0_0_20px_-4px_rgba(225,29,46,0.25)] ring-1 ring-[var(--color-brass)]/40"
          : "border-[var(--color-border)] bg-[var(--color-surface)]/60 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-raised)]/60"
      }`}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-[var(--color-paper)] transition-colors group-hover:text-white">
          {title}
        </p>
        {subtitle && <p className="text-xs text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
          selected
            ? "border-[var(--color-brass)] bg-[var(--color-brass)] text-white scale-100"
            : "border-[var(--color-border)] bg-transparent opacity-40 group-hover:opacity-70 scale-90"
        }`}
      >
        <svg
          className={`h-3 w-3 stroke-current transition-opacity ${
            selected ? "opacity-100" : "opacity-0"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </button>
  );
}

export function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="text-[var(--color-paper)]">{value}</span>
    </div>
  );
}
