"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
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

/**
 * Barra superior clara, visible en todos los tamaños. En escritorio es
 * solo la migaja de pan (siempre queda claro en qué sección se está,
 * incluso con el sidebar colapsado a solo íconos). En móvil suma el
 * botón de menú y el acceso al usuario, ya que ahí el sidebar está
 * oculto por defecto.
 */
export function Topbar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const section = currentSectionLabel(pathname);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--dash-border)] bg-[var(--dash-surface)]/90 px-4 py-3 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Abrir menú"
          className="text-[var(--dash-text-muted)] transition-colors hover:text-[var(--dash-text)] md:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <nav aria-label="Ubicación actual" className="flex items-center gap-1.5 text-sm">
          <span className="text-[var(--dash-text-faint)]">Panel</span>
          <span className="text-[var(--dash-text-faint)]">/</span>
          <span className="font-medium text-[var(--dash-text)]">{section}</span>
        </nav>
      </div>

      {user && (
        <Dropdown
          placement="bottom"
          panelClassName="absolute right-0 z-20 mt-1 min-w-40 overflow-hidden rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] shadow-lg"
          itemClassName="block w-full cursor-pointer px-4 py-2 text-left text-sm whitespace-nowrap text-[var(--dash-text)] hover:bg-[var(--dash-surface-raised)]"
          trigger={<Avatar name={user.name} size="sm" />}
          items={[{ label: "Cerrar sesión", onSelect: logout, danger: true }]}
        />
      )}
    </header>
  );
}
