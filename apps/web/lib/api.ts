/**
 * Cliente HTTP centralizado para la API de Kortek Booking.
 * Toda la app pasa por aquí — un solo lugar para adjuntar la sesión,
 * manejar errores del backend (NestJS ValidationPipe) y tipar respuestas.
 */

import { runAuthOperation } from './auth-operation.ts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
export const API_REQUEST_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  status: number;
  retryAfterSeconds: number | null;
  constructor(status: number, message: string, retryAfterSeconds: number | null = null) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.name = 'ApiError';
  }
}

interface ApiAuthContext {
  token: string | null;
  organizationId: string | null;
}

interface ApiRequestOptions extends RequestInit {
  authContext?: ApiAuthContext;
}

type ApiAuthResolver = () => Promise<ApiAuthContext>;

let resolveApiAuth: ApiAuthResolver = async () => ({
  token: null,
  organizationId: null,
});
let authScope = new AbortController();

export function configureApiAuth(resolver: ApiAuthResolver) {
  authScope.abort();
  const scope = new AbortController();
  authScope = scope;
  resolveApiAuth = resolver;
  return () => {
    scope.abort();
    if (authScope === scope) {
      resolveApiAuth = async () => ({ token: null, organizationId: null });
    }
  };
}

export interface ApiResponse<T> {
  data: T;
  headers: Headers;
}

async function requestWithHeaders<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const { authContext, ...requestOptions } = options;
  const isPublicRequest = path.startsWith('/public/');
  const resolver = resolveApiAuth;
  const scopeSignal = !authContext && !isPublicRequest ? authScope.signal : null;
  const signals = [scopeSignal, requestOptions.signal].filter((signal): signal is AbortSignal =>
    Boolean(signal),
  );
  const parentSignal = signals.length ? AbortSignal.any(signals) : undefined;
  return runAuthOperation(
    async (signal) => {
      const auth =
        authContext ?? (isPublicRequest ? { token: null, organizationId: null } : await resolver());
      signal.throwIfAborted();

      const res = await fetch(`${API_URL}${path}`, {
        ...requestOptions,
        signal,
        headers: {
          'Content-Type': 'application/json',
          ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
          ...(auth.organizationId ? { 'x-organization-id': auth.organizationId } : {}),
          ...requestOptions.headers,
        },
      });

      // 204 No Content u otras respuestas sin cuerpo
      const text = await res.text();
      signal.throwIfAborted();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        if (res.ok)
          throw new ApiError(502, 'Recibimos una respuesta incompleta. Vuelve a intentarlo.');
      }

      if (!res.ok) {
        // NestJS devuelve { message: string | string[], statusCode, error }
        const body = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
        const message =
          res.status >= 500
            ? 'No pudimos completar la solicitud. Revisa tu conexión y vuelve a intentarlo.'
            : typeof body.message === 'string'
              ? body.message
              : Array.isArray(body.message) &&
                  body.message.every((item) => typeof item === 'string')
                ? body.message.join('. ')
                : 'No pudimos completar la solicitud. Vuelve a intentarlo.';
        const retryAfterHeader = res.headers.get('Retry-After');
        const retryAfterSeconds =
          retryAfterHeader && /^\d+(?:\.\d+)?$/.test(retryAfterHeader)
            ? Math.max(0, Math.ceil(Number(retryAfterHeader)))
            : retryAfterHeader && Number.isFinite(Date.parse(retryAfterHeader))
              ? Math.max(0, Math.ceil((Date.parse(retryAfterHeader) - Date.now()) / 1000))
              : typeof body.retryAfterSeconds === 'number' &&
                  Number.isFinite(body.retryAfterSeconds)
                ? Math.max(0, Math.ceil(body.retryAfterSeconds))
                : null;
        throw new ApiError(res.status, message, retryAfterSeconds);
      }

      return { data: data as T, headers: res.headers };
    },
    parentSignal,
    API_REQUEST_TIMEOUT_MS,
    new ApiError(
      503,
      'La solicitud tardó demasiado. Revisa el estado antes de volver a intentarlo.',
    ),
  );
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await requestWithHeaders<T>(path, options);
  return response.data;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>, options: ApiRequestOptions = {}) => {
    const url = params ? `${path}?${new URLSearchParams(params).toString()}` : path;
    return request<T>(url, { ...options, method: 'GET' });
  },
  getWithHeaders: <T>(
    path: string,
    params?: Record<string, string>,
    options: ApiRequestOptions = {},
  ) => {
    const url = params ? `${path}?${new URLSearchParams(params).toString()}` : path;
    return requestWithHeaders<T>(url, { ...options, method: 'GET' });
  },
  post: <T>(path: string, body?: unknown, options: ApiRequestOptions = {}) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, options: ApiRequestOptions = {}) =>
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown, options: ApiRequestOptions = {}) =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, options: ApiRequestOptions = {}) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

// === Tipos que reflejan las entidades reales del backend (Prisma) ===

export type UserRole = 'OWNER' | 'ADMIN' | 'BARBER' | 'RECEPTIONIST';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export type InvoiceState = 'ISSUED' | 'PAID';
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';
export type ProfessionalStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  timeZone?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  organizationId: string;
}

export type ClerkBootstrapState = 'ONBOARDING_REQUIRED' | 'NO_ACCESS' | 'READY';

export interface ClerkMembership {
  role: UserRole;
  organization: Pick<Organization, 'id' | 'name' | 'slug'>;
}

export interface ClerkBootstrapResponse {
  state: ClerkBootstrapState;
  user: Pick<AuthUser, 'id' | 'name'> | null;
  preferredOrganizationId: string | null;
  memberships: ClerkMembership[];
}

export type TeamInvitationStatus =
  'CREATING' | 'PENDING' | 'RESENDING' | 'REVOKING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED' | 'FAILED';

export interface TeamInvitation {
  id: string;
  email: string;
  role: Exclude<UserRole, 'OWNER'>;
  createPublicProfile: boolean;
  status: TeamInvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamInvitationPage {
  items: TeamInvitation[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TeamDirectoryMember {
  name: string;
  email: string;
  role: UserRole;
  accessStatus: 'ACTIVE';
  professional: {
    name: string;
    status: ProfessionalStatus;
  } | null;
}

export interface TeamDirectoryPage {
  items: TeamDirectoryMember[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
  phone: string | null;
  experienceYears: number | null;
  isPublic: boolean;
}

export type ProfessionalAvailabilityBlockStatus = 'ACTIVE' | 'CANCELLED';

export interface ProfessionalWeeklyShift {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ProfessionalAvailabilityBlock {
  id: string;
  startTime: string;
  endTime: string;
  status: ProfessionalAvailabilityBlockStatus;
  note: string | null;
}

export interface ProfessionalAvailability {
  professionalId: string;
  timeZone: string;
  inheritsOrganizationHours: boolean;
  weeklySchedule: ProfessionalWeeklyShift[];
  blocks: ProfessionalAvailabilityBlock[];
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
  description: string | null;
  duration: number;
  price: string;
  isActive: boolean;
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
  client?: ClientContact;
  professional?: Pick<Professional, 'id' | 'name'>;
  service?: Pick<Service, 'id' | 'name' | 'duration'>;
}

/**
 * Parámetros opcionales de GET /bookings — refleja QueryBookingsDto del backend.
 * Todos opcionales: sin ellos, el backend devuelve todo el historial.
 */
export interface BookingFilters {
  from?: string; // ISO date — inicio del rango
  to?: string; // ISO date — fin del rango
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
  state: InvoiceState;
  amount: string;
  currency: 'DOP';
  issuedAt: string;
  booking: {
    id: string;
    startTime: string;
    clientName: string;
    serviceName: string;
    professionalName: string;
  };
  payment: {
    method: PaymentMethod;
    paidAt: string;
  } | null;
}

export interface InvoicePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InvoicePage {
  items: Invoice[];
  pagination: InvoicePagination;
}

// === Flujo público B2C (sin autenticación) ===

export interface PublicBookingData {
  organization: {
    name: string;
    slug: string;
    phone: string | null;
  };
  services: Pick<Service, 'id' | 'name' | 'description' | 'duration' | 'price'>[];
  professionals: Pick<Professional, 'id' | 'name' | 'bio' | 'avatar'>[];
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
  accountCreationError: 'EMAIL_ALREADY_EXISTS' | 'ACCOUNT_CREATION_FAILED' | null;
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

export interface DashboardOperationalSummary {
  generatedAt: string;
  timeZone: string;
  agenda: {
    items: Array<Pick<Booking, 'id' | 'startTime' | 'endTime' | 'status'> & {
      client: { name: string };
      service: { name: string };
      professional: { name: string };
    }>;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    completed: number;
    nextBookingId: string | null;
  };
  workload: {
    items: Array<{ id: string; name: string; count: number }>;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    idleCount: number;
  } | null;
  isBrandNew: boolean;
}
