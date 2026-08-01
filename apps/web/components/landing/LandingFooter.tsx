import Link from "next/link";
import { Brand } from "@/components/Brand";
import { BRAND } from "@/lib/brand";

const COLUMNS = [
  {
    title: "Producto",
    links: [
      { label: "Beneficios", href: "#beneficios" },
      { label: "Módulos", href: "#modulos" },
      { label: "Planes", href: "#planes" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { label: "Iniciar sesión", href: "/login" },
      { label: "Registra tu barbería", href: "/register" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] px-4 py-14 sm:px-6">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 sm:grid-cols-3">
        <div>
          <Brand compact={false} />
          <p className="mt-3 max-w-xs text-sm text-[var(--color-muted)]">
            {BRAND.tagline}
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
              {col.title}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-[var(--color-muted)] hover:text-[var(--color-paper)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-5xl border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-faint)]">
        {BRAND.footer.copyright()}
      </div>
    </footer>
  );
}
