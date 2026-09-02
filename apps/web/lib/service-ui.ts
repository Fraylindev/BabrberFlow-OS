import type { ApiError, AuthUser } from "./api.ts";

export type ServiceStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
export type ServiceSort =
  | "NAME_ASC"
  | "BOOKINGS_DESC"
  | "BOOKINGS_ASC"
  | "CREATED_DESC"
  | "CREATED_ASC"
  | "PRICE_ASC"
  | "PRICE_DESC";

export const SERVICE_DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

export interface ServiceFormDraft {
  name: string;
  description: string;
  duration: string;
  price: string;
}

export function servicesScopeKey(user: Pick<AuthUser, "id" | "organizationId" | "role"> | null) {
  return user ? `${user.id}:${user.organizationId}:${user.role}` : null;
}

export function isCurrentServicesScope(
  currentScope: { key: string | null } | null,
  operationScope: { key: string | null },
) {
  return currentScope !== null && operationScope.key !== null && currentScope === operationScope;
}

export function serviceWriteInput(draft: ServiceFormDraft) {
  const normalizedPrice = normalizeServicePriceInput(draft.price.trim());
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    duration: Number(draft.duration),
    price: Number(normalizedPrice ?? draft.price),
  };
}

export function validateServiceDraft(draft: ServiceFormDraft) {
  const errors: Partial<Record<keyof ServiceFormDraft, string>> = {};
  const name = draft.name.trim();
  const description = draft.description.trim();
  const duration = Number(draft.duration);
  const normalizedPrice = normalizeServicePriceInput(draft.price.trim());
  const price = Number(normalizedPrice);

  if (!name) errors.name = "Ingresa el nombre del servicio.";
  else if (name.length > 120) errors.name = "Usa 120 caracteres o menos.";
  if (description.length > 1000) errors.description = "Usa 1,000 caracteres o menos.";
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
    errors.duration = "Usa una duración entre 1 y 1,440 minutos.";
  }
  if (normalizedPrice === null) {
    errors.price = "Ingresa solo números con un máximo de dos decimales.";
  } else if (!Number.isFinite(price) || price <= 0) {
    errors.price = "Ingresa un precio mayor que cero.";
  } else if (!/^\d{1,63}(?:\.\d{1,2})?$/.test(normalizedPrice)) {
    errors.price = "Usa un máximo de dos decimales.";
  }
  return errors;
}

export function normalizeServiceDurationInput(value: string): string | null {
  return /^\d{0,4}$/.test(value) ? value : null;
}

export function normalizeServicePriceInput(value: string): string | null {
  let normalized = value.replace(/,/g, ".");
  if (normalized.startsWith(".")) normalized = `0${normalized}`;
  return /^\d*(?:\.\d{0,2})?$/.test(normalized) ? normalized : null;
}

export function formatServiceDuration(value: string | number) {
  const totalMinutes = Number(value);
  if (!Number.isInteger(totalMinutes) || totalMinutes < 1) return "Duración no disponible";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

export function serviceFilterValue(filter: ServiceStatusFilter): boolean | undefined {
  if (filter === "ACTIVE") return true;
  if (filter === "INACTIVE") return false;
  return undefined;
}

export function formatServicePrice(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString("es-DO", { style: "currency", currency: "DOP" })
    : "Precio no disponible";
}

export function serviceErrorMessage(
  error: unknown,
  action: "list" | "create" | "update" | "deactivate" | "reactivate",
) {
  const status = (error as ApiError | undefined)?.status;
  if (status === 403) return "No tienes permiso para realizar esta acción.";
  if (status === 404) return "Este servicio ya no está disponible en esta organización.";
  if (status === 400) return "Revisa el nombre, la duración y el precio e inténtalo de nuevo.";
  if (action === "list") return "No pudimos cargar los servicios. Intenta nuevamente.";
  const labels = {
    create: "crear",
    update: "guardar",
    deactivate: "desactivar",
    reactivate: "reactivar",
  } as const;
  return `No pudimos ${labels[action]} el servicio. Intenta nuevamente.`;
}
