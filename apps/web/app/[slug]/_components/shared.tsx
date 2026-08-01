import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export function formatMoney(value: string | number) {
  return `RD$${Number(value).toLocaleString("es-DO", { minimumFractionDigits: 0 })}`;
}

export function waLink(phone: string | null | undefined, message: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
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
    <div className="mt-6 flex justify-between gap-3">
      {onBack ? (
        <Button variant="ghost" onClick={onBack}>
          Atrás
        </Button>
      ) : (
        <span />
      )}
      <Button onClick={onNext} disabled={nextDisabled}>
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
      className={`border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-[var(--color-brass)] bg-[var(--color-brass)]/10"
          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      <p className="text-sm text-[var(--color-paper)]">{title}</p>
      {subtitle && <p className="text-xs text-[var(--color-muted)]">{subtitle}</p>}
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
