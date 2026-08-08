"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { ALL_NAV_ITEMS } from "./nav-items";
import { MenuIcon } from "./NavIcons";

function currentSectionLabel(pathname: string): string {
  if (pathname === "/dashboard") return "Resumen";
  const match = ALL_NAV_ITEMS.find(
    (item) => item.href !== "/dashboard" && pathname.startsWith(item.href),
  );
  return match?.label ?? "Panel";
}

export function Topbar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const pathname = usePathname();
  const { user, organization, logout } = useAuth();
  const { toast } = useToast();
  const section = currentSectionLabel(pathname);

  const publicUrl =
    typeof window !== "undefined" && organization
      ? `${window.location.origin}/${organization.slug}`
      : "";

  async function copyPublicLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast("Enlace copiado correctamente", "success");
    } catch {
      toast("No pudimos copiar el enlace", "error");
    }
  }

  function openPublicPage() {
    if (publicUrl) window.open(publicUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--dash-border)] bg-[var(--dash-surface)]/90 px-4 py-3 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Abrir menú"
          className="shrink-0 text-[var(--dash-text-muted)] transition-colors hover:text-[var(--dash-text)] md:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <nav aria-label="Ubicación actual" className="flex min-w-0 items-baseline gap-2">
          <span className="hidden shrink-0 text-sm text-[var(--dash-text-faint)] sm:inline">Panel /</span>
          <span className="truncate font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--dash-text)]">
            {section}
          </span>
        </nav>
      </div>

      {user && (
        <div className="shrink-0">
          <Dropdown
            placement="bottom"
            panelClassName="absolute right-0 z-20 mt-2 min-w-56 overflow-hidden rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] py-1 shadow-lg"
            itemClassName="block w-full cursor-pointer px-4 py-2.5 text-left text-sm whitespace-nowrap text-[var(--dash-text)] transition-colors duration-150 hover:bg-[var(--dash-surface-raised)]"
            trigger={
              <div className="flex items-center gap-2 rounded-full p-0.5 transition-shadow duration-150 hover:ring-2 hover:ring-[var(--dash-border-strong)]">
                <Avatar name={user.name} size="sm" />
              </div>
            }
            items={[
              ...(organization
                ? [
                    { label: "Ver página pública ↗", onSelect: openPublicPage },
                    { label: "Copiar enlace", onSelect: copyPublicLink },
                  ]
                : []),
              { label: "Cerrar sesión", onSelect: logout, danger: true },
            ]}
          />
        </div>
      )}
    </header>
  );
}
