/**
 * Cliente HTTP centralizado para la API de Kortek Booking.
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

export interface ApiResponse<T> {
  data: T;
  headers: Headers;
}

async function requestWithHeaders<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
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

  return { data: data as T, headers: res.headers };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await requestWithHeaders<T>(path, options);
  return response.data;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) => {
    const url = params
      ? `${path}?${new URLSearchParams(params).toString()}`
      : path;
    return request<T>(url, { method: "GET" });
  },
  getWithHeaders: <T>(path: string, params?: Record<string, string>) => {
    const url = params
      ? `${path}?${new URLSearchParams(params).toString()}`
      : path;
    return requestWithHeaders<T>(url, { method: "GET" });
  },
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
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
export type ProfessionalStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

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
  avatar: string | null;
  specialty: string | null;
  status: ProfessionalStatus;
  isActive: boolean;
}

export interface ProfessionalManagement extends Professional {
  bio: string | null;
  phone: string | null;
  experienceYears: number | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  linkedUser: { id: string; name: string; email: string } | null;
}

export interface ProfessionalOwnProfile extends Professional {
  bio: string | null;
  experienceYears: number | null;
  isPublic: boolean;
}

export interface TeamMember {
  membershipId: string;
  role: UserRole;
  memberSince: string;
  user: {
    id: string;
    name: string;
    email: string;
    professional: ProfessionalOwnProfile | null;
  };
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  duration: number; // minutos
  price: string | number;
  isActive?: boolean;
  organizationId: string;
}

export interface ClientContact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface Client extends ClientContact {
  notes?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Booking {
  id: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  clientId: string;
  professionalId: string;
  serviceId: string;
  notes?: string | null;
  client?: ClientContact;
  professional?: Professional;
  service?: Service;
}

/**
 * Parámetros opcionales de GET /bookings — refleja QueryBookingsDto del backend.
 * Todos opcionales: sin ellos, el backend devuelve todo el historial.
 */
export interface BookingFilters {
  from?: string;   // ISO date — inicio del rango
  to?: string;     // ISO date — fin del rango
  status?: BookingStatus;
}

/**
 * Body de PATCH /bookings/:id — reprogramar.
 * Refleja RescheduleBookingDto: todos los campos opcionales.
 */
export interface RescheduleBookingInput {
  professionalId?: string;
  serviceId?: string;
  startTime?: string; // ISO datetime
}

export interface Invoice {
  id: string;
  amount: string | number;
  status: InvoiceStatus;
  bookingId: string;
  createdAt: string;
  booking?: Booking;
}

// === Flujo público B2C (sin autenticación) ===

export interface PublicBookingData {
  organization: {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
  };
  services: Pick<Service, "id" | "name" | "description" | "duration" | "price">[];
  professionals: Pick<Professional, "id" | "name" | "bio" | "avatar">[];
}

export interface PublicBookingResult {
  booking: {
    id: string;
    serviceId: string;
    professionalId: string;
    startTime: string;
    endTime: string;
    status: BookingStatus;
  };
  accountCreated: boolean;
  accountCreationError: "EMAIL_ALREADY_EXISTS" | "ACCOUNT_CREATION_FAILED" | null;
}

export interface PublicAvailabilitySlot {
  time: string; // "HH:mm"
  professionalId: string; // a quién quedaría asignada la cita en este bloque
}

export interface PublicAvailabilityResponse {
  date: string;
  serviceId: string;
  slots: PublicAvailabilitySlot[];
}

// === Analítica del panel — GET /analytics/dashboard ===
// Refleja exactamente lo que arma AnalyticsService en el backend.
export interface AnalyticsDashboard {
  generatedAt: string;
  revenue: {
    today: number;
    yesterday: number;
    last7Days: number;
  };
  bookings: {
    today: number;
    pending: number;
    cancelled: number;
  };
  topProfessional: {
    id: string;
    name: string;
    completedBookings: number;
  } | null;
}
