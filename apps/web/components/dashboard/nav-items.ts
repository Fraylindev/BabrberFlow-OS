import {
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  ScissorsIcon,
  TagIcon,
  ReceiptIcon,
  TeamIcon,
} from "./NavIcons";
import type { UserRole } from "@/lib/api";

export interface NavItem {
  href: string;
  label: string;
  labelByRole?: Partial<Record<UserRole, string>>;
  icon: (props: { className?: string }) => React.ReactElement;
  roles: readonly UserRole[] | null;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Agrupado por función, no una lista plana — espacio para crecer sin
// que la navegación se sienta desordenada.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [{ href: "/dashboard", label: "Resumen", icon: HomeIcon, roles: null }],
  },
  {
    label: "Operación diaria",
    items: [
      { href: "/dashboard/bookings", label: "Reservas", icon: CalendarIcon, roles: null },
      { href: "/dashboard/clients", label: "Clientes", icon: UsersIcon, roles: null },
    ],
  },
  {
    label: "Negocio",
    items: [
      { href: "/dashboard/professionals", label: "Profesionales", icon: ScissorsIcon, roles: null },
      { href: "/dashboard/services", label: "Servicios", icon: TagIcon, roles: null },
      {
        href: "/dashboard/invoices",
        label: "Facturación",
        labelByRole: { BARBER: "Facturación de mis servicios" },
        icon: ReceiptIcon,
        roles: ["OWNER", "ADMIN", "RECEPTIONIST", "BARBER"],
      },
    ],
  },
  {
    label: "Organización",
    items: [
      { href: "/dashboard/team", label: "Equipo", icon: TeamIcon, roles: ["OWNER", "ADMIN"] },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function visibleNavGroups(role: UserRole | undefined): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items
      .filter((item) => !item.roles || (role && item.roles.includes(role)))
      .map((item) => ({
        ...item,
        label: (role && item.labelByRole?.[role]) || item.label,
      })),
  })).filter((g) => g.items.length > 0);
}
