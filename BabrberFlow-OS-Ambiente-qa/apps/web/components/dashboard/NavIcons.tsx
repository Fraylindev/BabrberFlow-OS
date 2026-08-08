import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M3 8.5 10 3l7 5.5" />
      <path d="M5 7.5V16a1 1 0 0 0 1 1h3v-4.5h2V17h3a1 1 0 0 0 1-1V7.5" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <rect x="3" y="4.5" width="14" height="12.5" rx="1.5" />
      <path d="M3 8.5h14M7 2.5v3M13 2.5v3" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <circle cx="7.5" cy="7" r="2.5" />
      <path d="M2.5 17c0-2.76 2.24-5 5-5s5 2.24 5 5" />
      <path d="M13 4.2c1.4.3 2.5 1.55 2.5 3.05 0 1.3-.8 2.4-1.95 2.85" />
      <path d="M13.5 12.2c1.9.55 3 2.2 3 4.3" />
    </svg>
  );
}

export function ScissorsIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <circle cx="5.5" cy="5" r="1.8" />
      <circle cx="5.5" cy="15" r="1.8" />
      <path d="M16.5 4.5 7 10M16.5 15.5 7 10" />
    </svg>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M10.5 3H4a1 1 0 0 0-1 1v6.5a1 1 0 0 0 .3.7l7.5 7.5a1 1 0 0 0 1.4 0l6-6a1 1 0 0 0 0-1.4L10.7 3.3a1 1 0 0 0-.7-.3Z" />
      <circle cx="6.7" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M4.5 2.5h11v15l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-1 .65Z" />
      <path d="M7 7h6M7 10.3h6" />
    </svg>
  );
}

export function TeamIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <circle cx="6.5" cy="6" r="2.3" />
      <circle cx="14" cy="7.5" r="1.8" />
      <path d="M2.3 16.5c0-2.6 1.9-4.7 4.2-4.7s4.2 2.1 4.2 4.7" />
      <path d="M11.8 12.3c1.9.2 3.4 1.9 3.4 4" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M12.5 4 6.5 10l6 6" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} aria-hidden {...props}>
      <path d="M5 5l10 10M15 5 5 15" />
    </svg>
  );
}
