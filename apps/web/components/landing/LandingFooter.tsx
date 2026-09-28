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
      { label: "Características", href: "/#features" },
      { label: "Demostración", href: "/#demo" },
      { label: "Beneficios", href: "/#beneficios" },
      { label: "Planes & Precios", href: "/#pricing" },
      { label: "Testimonios", href: "/#testimonios" },
      { label: "Preguntas Frecuentes", href: "/#faq" },
    ],
  },
  {
    title: "Acceso",
    links: [
      { label: "Iniciar sesión", href: "/login" },
      { label: "Registra tu barbería", href: "/register" },
      { label: "Soporte WhatsApp", href: BRAND.contact.whatsapp },
    ],
  },
  {
    title: "Legal & Privacidad",
    links: [
      { label: "Términos del Servicio", href: "/terminos" },
      { label: "Política de Privacidad", href: "/politica-de-privacidad" },
      { label: "Política de Cookies", href: "/cookies" },
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
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/70 py-16 sm:py-20 text-xs text-[var(--color-muted)]">
      <Container size="wide" className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-5">
        {/* Columna Marca & Estado */}
        <div className="lg:col-span-2 space-y-4">
          <Brand compact={false} />
          <p className="max-w-sm text-xs leading-relaxed text-[var(--color-muted)]">
            {BRAND.tagline} La plataforma diseñada para la excelencia operativa y el crecimiento de tu salón.
          </p>

          <div className="pt-2 flex items-center gap-2 text-[11px] text-[var(--color-faint)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Infraestructura 99.98% operativa</span>
          </div>

          <div className="pt-2 flex items-center gap-3">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-brass)] hover:text-[var(--color-brass)] shadow-sm"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Columnas de Navegación */}
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-paper)]">
              {col.title}
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-paper)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      {/* Barra Inferior de Copyright */}
      <Container
        size="wide"
        className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--color-border)] pt-8 text-[11px] text-[var(--color-faint)]"
      >
        <span>{BRAND.footer.copyright()}</span>
        <div className="flex items-center gap-4">
          <Link href="/terminos" className="hover:text-[var(--color-paper)] transition-colors">
            Términos del Servicio
          </Link>
          <span>·</span>
          <Link href="/politica-de-privacidad" className="hover:text-[var(--color-paper)] transition-colors">
            Política de Privacidad
          </Link>
          <span>·</span>
          <Link href="/cookies" className="hover:text-[var(--color-paper)] transition-colors">
            Cookies
          </Link>
        </div>
      </Container>
    </footer>
  );
}
