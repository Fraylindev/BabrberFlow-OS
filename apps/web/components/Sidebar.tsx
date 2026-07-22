"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Brand } from "@/components/Brand";

const NAV_ITEMS = [
  { href: "/", label: "Resumen", roles: null },
  { href: "/bookings", label: "Reservas", roles: null },
  { href: "/clients", label: "Clientes", roles: null },
  { href: "/professionals", label: "Profesionales", roles: null },
  { href: "/services", label: "Servicios", roles: null },
  { href: "/invoices", label: "Facturación", roles: ["OWNER", "ADMIN", "RECEPTIONIST"] },
  { href: "/team", label: "Equipo", roles: ["OWNER", "ADMIN"] },
] as const;

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Dueño",
  ADMIN: "Administrador",
  BARBER: "Barbero",
  RECEPTIONIST: "Recepción",
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, organization, logout } = useAuth();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6">
      <Brand compact={false} />

      {organization && (
        <p className="mt-4 truncate text-xs text-[var(--color-muted)]">
          {organization.name}
        </p>
      )}

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.filter(
          (item) => !item.roles || (user && (item.roles as readonly string[]).includes(user.role)),
        ).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-sm px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-l-2 border-[var(--color-brass)] bg-[var(--color-surface-raised)] text-[var(--color-paper)]"
                  : "border-l-2 border-transparent text-[var(--color-muted)] hover:text-[var(--color-paper)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="mt-auto border-t border-[var(--color-border)] pt-4">
          <p className="truncate text-sm text-[var(--color-paper)]">{user.name}</p>
          <p className="text-xs text-[var(--color-brass)]">
            {ROLE_LABELS[user.role] || user.role}
          </p>
          <button
            onClick={logout}
            className="mt-3 text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)] cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  );
}
