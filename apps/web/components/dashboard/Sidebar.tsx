"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { ALL_NAV_ITEMS } from "./nav-items";

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user, organization, logout } = useAuth();
  const { toast } = useToast();

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

  // Agrupación limpia por rutas sin depender de una propiedad 'group' inexistente
  const groups: { title: string; items: typeof ALL_NAV_ITEMS }[] = [
    {
      title: "General",
      items: ALL_NAV_ITEMS.filter((i) => i.href === "/dashboard"),
    },
    {
      title: "Operación diaria",
      items: ALL_NAV_ITEMS.filter((i) =>
        ["/dashboard/bookings", "/dashboard/clients"].includes(i.href)
      ),
    },
    {
      title: "Negocio",
      items: ALL_NAV_ITEMS.filter((i) =>
        [
          "/dashboard/professionals",
          "/dashboard/services",
          "/dashboard/invoices",
        ].includes(i.href)
      ),
    },
    {
      title: "Organización",
      items: ALL_NAV_ITEMS.filter((i) =>
        ["/dashboard/team"].includes(i.href)
      ),
    },
  ];

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-[#1f1f1f] bg-[#121212] text-gray-300 transition-transform duration-200 md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Cabecera del negocio */}
          <div className="flex h-16 items-center gap-3 border-b border-[#1f1f1f] px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-red-600 font-display font-bold text-white">
              {organization?.name?.slice(0, 2).toUpperCase() || "KB"}
            </div>
            <span className="truncate font-display text-base font-semibold text-white">
              {organization?.name || "Kortek Booking"}
            </span>
          </div>

          {/* Navegación por grupos */}
          <nav className="flex flex-col gap-6 p-4">
            {groups.map((g) => {
              if (g.items.length === 0) return null;
              return (
                <div key={g.title}>
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    {g.title}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {g.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/dashboard" &&
                          pathname.startsWith(item.href));
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                              active
                                ? "bg-[#1f1f1f] text-white"
                                : "text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200"
                            }`}
                          >
                            {active && (
                              <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-red-600" />
                            )}
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Pie: Menú de usuario inferior izquierdo con LAS 3 OPCIONES */}
        {user && (
          <div className="border-t border-[#1f1f1f] p-4">
            <Dropdown
              placement="top"
              panelClassName="absolute left-0 bottom-full z-20 mb-2 w-56 overflow-hidden rounded-sm border border-[#2a2a2a] bg-[#1a1a1a] py-1 shadow-xl"
              itemClassName="block w-full cursor-pointer px-4 py-2.5 text-left text-sm whitespace-nowrap text-gray-200 transition-colors duration-150 hover:bg-[#252525]"
              trigger={
                <div className="flex w-full cursor-pointer items-center justify-between rounded-md p-2 hover:bg-[#1a1a1a] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={user.name} size="sm" />
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium text-white">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-red-500 font-medium capitalize">
                        {user.role?.toLowerCase() || "Usuario"}
                      </p>
                    </div>
                  </div>
                </div>
              }
              items={[
                ...(organization
                  ? [
                      {
                        label: "Ver página pública ↗",
                        onSelect: openPublicPage,
                      },
                      { label: "Copiar enlace", onSelect: copyPublicLink },
                    ]
                  : []),
                { label: "Cerrar sesión", onSelect: logout, danger: true },
              ]}
            />
          </div>
        )}
      </aside>
    </>
  );
}
