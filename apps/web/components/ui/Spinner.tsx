import React from "react";

type SpinnerSize = "sm" | "md" | "lg";
type SpinnerTone = "accent" | "light" | "dark";

interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  label?: string;
}

const SIZES: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

const TONES: Record<SpinnerTone, { circle: string; path: string }> = {
  accent: {
    circle: "stroke-[var(--dash-accent,#e11d2e)]/20",
    path: "stroke-[var(--dash-accent,#e11d2e)]",
  },
  light: {
    circle: "stroke-gray-200",
    path: "stroke-gray-700",
  },
  dark: {
    circle: "stroke-white/20",
    path: "stroke-white",
  },
};

export function Spinner({
  size = "md",
  tone = "accent",
  label = "Cargando…",
  className = "",
  ...props
}: SpinnerProps) {
  const sizeCls = SIZES[size];
  const toneCls = TONES[tone];

  return (
    <svg
      role="status"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${sizeCls} ${className}`}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        strokeWidth="3"
        className={toneCls.circle}
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        strokeWidth="3"
        strokeLinecap="round"
        className={toneCls.path}
      />
    </svg>
  );
}
