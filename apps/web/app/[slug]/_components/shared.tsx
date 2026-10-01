import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export function formatMoney(value: string | number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(Number(value));
}

export function StepWrapper({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 id="booking-step-title" tabIndex={-1} className="mb-5 scroll-mt-5 font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
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
    <div className="booking-nav mt-6 flex flex-wrap justify-between gap-3">
      {onBack ? (
        <Button type="button" variant="ghost" className="min-h-11" onClick={onBack}>
          Atrás
        </Button>
      ) : (
        <span />
      )}
      <Button type="button" className="booking-primary min-h-11" onClick={onNext} disabled={nextDisabled}>
        {nextLabel}
      </Button>
    </div>
  );
}

export function OptionButton({
  selected,
  onClick,
  title,
  subtitle,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-[var(--color-brass)] bg-[var(--color-brass)]/10"
          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      {children}
      <p className="text-base font-medium text-[var(--color-paper)]">{title}{selected && <span className="ml-2 text-xs">✓ Seleccionado</span>}</p>
      {subtitle && <p className="text-xs text-[var(--color-muted)]">{subtitle}</p>}
    </button>
  );
}

export function SummaryRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="text-[var(--color-paper)]">{value}</span>
    </div>
  );
}
