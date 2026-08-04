"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Brand } from "@/components/Brand";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { Tooltip } from "@/components/ui/Tooltip";
import { visibleNavGroups } from "./nav-items";
import { ChevronLeftIcon, CloseIcon } from "./NavIcons";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Dueño",
  ADMIN: "Administrador",
  BARBER: "Barbero",
  RECEPTIONIST: "Recepción",
};

export function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const { user, organization, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const groups = visibleNavGroups(user?.role);

  useEffect(() => {
    onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const content = (
    <>
      <div className={`flex items-center gap-3 px-1 ${collapsed ? "justify-center" : "justify-between"}`}>
        <Link href="/dashboard" className="min-w-0">
          <Brand compact={collapsed} />
        </Link>
        <button
          onClick={onMobileClose}
          aria-label="Cerrar menú"
          className="text-[var(--dash-sidebar-text-muted)] transition-colors hover:text-[var(--dash-sidebar-text-active)] md:hidden"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      {!collapsed && organization && (
        <p className="mt-4 truncate px-1 text-xs text-[var(--dash-sidebar-text-muted)]">
          {organization.name}
        </p>
      )}

      <nav className="mt-8 flex flex-1 flex-col gap-5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-wider text-[var(--dash-sidebar-text-muted)]/70">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                const link = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors duration-150 ${
                      collapsed ? "justify-center" : ""
                    } ${
                      active
                        ? "bg-[var(--dash-accent-soft)] text-[var(--dash-sidebar-text-active)]"
                        : "text-[var(--dash-sidebar-text)] hover:bg-[var(--dash-sidebar-surface)] hover:text-[var(--dash-sidebar-text-active)]"
                    }`}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--dash-accent)]"
                      />
                    )}
                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 transition-colors duration-150 ${
                        active
                          ? "text-[var(--dash-accent)]"
                          : "text-[var(--dash-sidebar-text-muted)] group-hover:text-[var(--dash-sidebar-text-active)]"
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
                return collapsed ? (
                  <Tooltip key={item.href} content={item.label} side="right">
                    {link}
                  </Tooltip>
                ) : (
                  link
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {user && (
        <div className="mt-auto border-t border-[var(--dash-sidebar-border)] pt-3">
          <Dropdown
            placement="top"
            fullWidth
            panelClassName={`absolute left-0 bottom-full z-20 mb-1 min-w-full overflow-hidden rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] shadow-lg`}
            itemClassName="block w-full cursor-pointer px-4 py-2 text-left text-sm whitespace-nowrap text-[var(--dash-text)] hover:bg-[var(--dash-surface-raised)]"
            trigger={
              <div
                className={`flex items-center gap-2.5 rounded-sm px-2 py-2 transition-colors duration-150 hover:bg-[var(--dash-sidebar-surface)] ${
                  collapsed ? "justify-center" : ""
                }`}
              >
                <Avatar name={user.name} size="sm" />
                {!collapsed && (
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm text-[var(--dash-sidebar-text-active)]">{user.name}</p>
                    <p className="truncate text-xs text-[var(--dash-accent)]">
                      {ROLE_LABELS[user.role] || user.role}
                    </p>
                  </div>
                )}
              </div>
            }
            items={[{ label: "Cerrar sesión", onSelect: logout, danger: true }]}
          />
        </div>
      )}

      <button
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        className="mt-3 hidden items-center justify-center gap-2 rounded-sm border border-[var(--dash-sidebar-border)] py-1.5 text-xs text-[var(--dash-sidebar-text-muted)] transition-colors hover:text-[var(--dash-sidebar-text-active)] md:flex"
      >
        <ChevronLeftIcon className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
        {!collapsed && "Colapsar"}
      </button>
    </>
  );

  return (
    <>
      <div
        aria-hidden
        onClick={onMobileClose}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-[var(--dash-sidebar-border)] bg-[var(--dash-sidebar-bg)] px-4 py-6 transition-transform duration-200 ease-out md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:w-20" : "md:w-64"}`}
      >
        {content}
      </aside>
    </>
  );
}
