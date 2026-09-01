import type { ApiError, AuthUser } from "./api.ts";

export type ServiceStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

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
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    duration: Number(draft.duration),
    price: Number(draft.price),
  };
}

export function validateServiceDraft(draft: ServiceFormDraft) {
  const errors: Partial<Record<keyof ServiceFormDraft, string>> = {};
  const name = draft.name.trim();
  const description = draft.description.trim();
  const duration = Number(draft.duration);
  const price = Number(draft.price);

  if (!name) errors.name = "Ingresa el nombre del servicio.";
  else if (name.length > 120) errors.name = "Usa 120 caracteres o menos.";
  if (description.length > 1000) errors.description = "Usa 1,000 caracteres o menos.";
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
    errors.duration = "Usa una duración entre 1 y 1,440 minutos.";
  }
  if (!Number.isFinite(price) || price <= 0) {
    errors.price = "Ingresa un precio mayor que cero.";
  } else if (!/^\d+(?:\.\d{1,2})?$/.test(draft.price.trim())) {
    errors.price = "Usa un máximo de dos decimales.";
  }
  return errors;
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
