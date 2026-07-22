/**
 * Cliente HTTP centralizado para la API de BarberFlow.
 * Toda la app pasa por aquí — un solo lugar para adjuntar el token,
 * manejar errores del backend (NestJS ValidationPipe) y tipar respuestas.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("bf_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // 204 No Content u otras respuestas sin cuerpo
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // NestJS devuelve { message: string | string[], statusCode, error }
    const message = Array.isArray(data?.message)
      ? data.message.join(". ")
      : data?.message || "Ocurrió un error inesperado.";
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
};

// === Tipos que reflejan las entidades reales del backend (Prisma) ===

export type UserRole = "OWNER" | "ADMIN" | "BARBER" | "RECEPTIONIST";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type InvoiceStatus = "UNPAID" | "PAID" | "REFUNDED";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

export interface Professional {
  id: string;
  name: string;
  bio?: string | null;
  phone?: string | null;
  isActive?: boolean;
  organizationId: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  duration: number; // minutos
  price: string | number;
  organizationId: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  organizationId: string;
}

export interface Booking {
  id: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  clientId: string;
  professionalId: string;
  serviceId: string;
  client?: Client;
  professional?: Professional;
  service?: Service;
}

export interface Invoice {
  id: string;
  amount: string | number;
  status: InvoiceStatus;
  bookingId: string;
  createdAt: string;
  booking?: Booking;
}
