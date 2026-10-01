import { formatBusinessInstant } from './business-time.ts';
import {
  ApiError,
  type AuthUser,
  type InvoicePagination,
  type PaymentMethod,
} from "./api.ts";

export type InvoiceOperation = "list" | "issue" | "payment";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

export function invoiceScopeKey(
  user: Pick<AuthUser, "id" | "organizationId" | "role"> | null,
): string | null {
  return user ? `${user.id}:${user.organizationId}:${user.role}` : null;
}

export function isCurrentInvoiceScope(
  currentScope: string | null,
  operationScope: string,
): boolean {
  return currentScope === operationScope;
}

export function createInvoicePayload(bookingId: string) {
  return { bookingId };
}

export function createPaymentPayload(method: PaymentMethod) {
  return { method };
}

export function invoiceDateRangeError(from: string, to: string): string | null {
  return from && to && from > to
    ? "Desde no puede ser posterior a Hasta."
    : null;
}

function requiredHeaderInteger(headers: Headers, name: string): number {
  const raw = headers.get(name);
  if (!raw || !/^\d+$/.test(raw)) {
    throw new Error("La paginación recibida no es válida");
  }
  return Number(raw);
}

export function parseInvoicePagination(headers: Headers): InvoicePagination {
  const pagination = {
    total: requiredHeaderInteger(headers, "X-Total-Count"),
    page: requiredHeaderInteger(headers, "X-Page"),
    limit: requiredHeaderInteger(headers, "X-Limit"),
    totalPages: requiredHeaderInteger(headers, "X-Total-Pages"),
  };
  if (pagination.page < 1 || pagination.limit < 1) {
    throw new Error("La paginación recibida no es válida");
  }
  return pagination;
}

export function formatDopAmount(value: string): string {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return "RD$—";
  const integer = match[1].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return `RD$${integer}.${fraction}`;
}

export function formatBusinessDateTime(
  value: string,
  timeZone: string,
): string {
  return formatBusinessInstant(value, timeZone);
}

export function invoiceErrorMessage(error: unknown, operation: InvoiceOperation): string {
  const message = invoiceErrorMessageText(error, operation);
  return error instanceof ApiError ? error.withRequestCode(message) : message;
}

function invoiceErrorMessageText(
  error: unknown,
  operation: InvoiceOperation,
): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return operation === "issue"
        ? "Esta reserva ya no está disponible para facturar."
        : "Esta factura ya no está disponible.";
    }
    if (error.status === 409) {
      if (operation === "issue") {
        return "No pudimos emitir la factura. Comprueba que la reserva esté completada y que el precio del servicio sea válido.";
      }
      if (operation === "payment") {
        return "No pudimos registrar el cobro. Actualiza la factura y verifica su estado.";
      }
    }
    if (error.status === 401 || error.status === 403) {
      return "No tienes acceso a esta operación con tu sesión actual.";
    }
  }
  return operation === "list"
    ? "No pudimos cargar la facturación."
    : operation === "issue"
      ? "No pudimos emitir la factura."
      : "No pudimos registrar el cobro.";
}
