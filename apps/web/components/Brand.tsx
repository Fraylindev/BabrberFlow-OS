import { BRAND } from "@/lib/brand";

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="9" fill="#13161c" />
      <rect
        x="0.5"
        y="0.5"
        width="35"
        height="35"
        rx="8.5"
        stroke="var(--color-border-strong)"
      />
      {/* Precision accent dot in crimson */}
      <circle cx="28" cy="8" r="2" fill="var(--color-brass)" />
      {/* Precision Monogram K with razor blade geometry */}
      <path
        d="M12 9V27"
        stroke="#fafafa"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <path
        d="M12 18.5L23 9"
        stroke="var(--color-brass)"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <path
        d="M16 15L24 27"
        stroke="#fafafa"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Brand({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BrandMark className="h-9 w-9 shrink-0" />
      <div className="flex flex-col">
        <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--color-paper)] leading-tight">
          {BRAND.shortName}
        </span>
        {!compact && (
          <span className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-widest text-[var(--color-brass)] font-semibold leading-none mt-0.5">
            Booking OS
          </span>
        )}
      </div>
    </div>
  );
}
