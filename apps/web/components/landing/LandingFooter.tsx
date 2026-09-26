import Link from "next/link";
import { Brand } from "@/components/Brand";
import { BRAND } from "@/lib/brand";
import { Container } from "@/components/ui/Container";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/ui/SocialIcons";

const COLUMNS = [
  {
    title: "Producto",
    links: [
      { label: "Beneficios", href: "#beneficios" },
      { label: "Módulos", href: "#modulos" },
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

const SOCIALS = [
  { label: "Facebook", href: BRAND.social.facebook, Icon: FacebookIcon },
  { label: "Instagram", href: BRAND.social.instagram, Icon: InstagramIcon },
  { label: "TikTok", href: BRAND.social.tiktok, Icon: TikTokIcon },
  { label: "WhatsApp", href: BRAND.contact.whatsapp, Icon: WhatsAppIcon },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/40 py-16">
      <Container size="wide" className="grid grid-cols-1 gap-10 sm:grid-cols-3">
        <div>
          <Brand compact={false} />
          <p className="mt-3 max-w-xs text-sm text-[var(--color-muted)]">{BRAND.tagline}</p>

          <div className="mt-6 flex items-center gap-3">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-strong)] text-[var(--color-muted)] transition-colors duration-[var(--duration-base)] hover:border-[var(--color-brass)] hover:text-[var(--color-brass)]"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
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
                    className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-paper)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <Container
        size="wide"
        className="mt-12 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-faint)] sm:flex-row sm:items-center sm:justify-between"
      >
        <span>{BRAND.footer.copyright()}</span>
      </Container>
    </footer>
  );
}
