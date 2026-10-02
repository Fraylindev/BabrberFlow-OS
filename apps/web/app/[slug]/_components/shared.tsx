import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export function formatMoney(value: string | number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(Number(value));
}

export function StepWrapper({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 id="booking-step-title" tabIndex={-1} className="mb-4 scroll-mt-5 font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
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
      className={`booking-option ${selected ? 'booking-option-selected' : ''}`}
    >
      {children}
      <span className="min-w-0 flex-1"><span className="block text-base font-medium text-[var(--color-paper)]">{title}</span>
        {subtitle && <span className="mt-1 block text-sm text-[var(--color-muted)]">{subtitle}</span>}</span>
      <span className="booking-selection-mark" aria-hidden="true">{selected ? '✓' : ''}</span>
      {selected && <span className="sr-only">Seleccionado</span>}
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
