import type {
  AnalyticsDashboard,
  AuthUser,
  Booking,
  Professional,
} from "./api";

export interface DashboardSummaryData {
  bookings: Booking[];
  professionals: Professional[];
  analytics: AnalyticsDashboard | null;
  nextBookingId: string | undefined;
}

export interface DashboardSummaryState {
  scopeKey: string | null;
  requestId: number;
  data: DashboardSummaryData | null;
  error: string | null;
  loading: boolean;
}

export type DashboardSummaryEvent =
  | { type: "reset"; requestId: number }
  | { type: "start"; scopeKey: string; requestId: number }
  | {
      type: "success";
      scopeKey: string;
      requestId: number;
      data: DashboardSummaryData;
    }
  | {
      type: "error";
      scopeKey: string;
      requestId: number;
      message: string;
    };

export const INITIAL_DASHBOARD_SUMMARY_STATE: DashboardSummaryState = {
  scopeKey: null,
  requestId: 0,
  data: null,
  error: null,
  loading: true,
};

export function dashboardSummaryScopeKey(
  user: Pick<AuthUser, "id" | "organizationId" | "role"> | null,
): string | null {
  return user ? `${user.id}:${user.organizationId}:${user.role}` : null;
}

export function dashboardSummaryForScope(
  state: DashboardSummaryState,
  scopeKey: string | null,
): DashboardSummaryState | null {
  return state.scopeKey === scopeKey ? state : null;
}

export function dashboardSummaryReducer(
  state: DashboardSummaryState,
  event: DashboardSummaryEvent,
): DashboardSummaryState {
  switch (event.type) {
    case "reset":
      return {
        ...INITIAL_DASHBOARD_SUMMARY_STATE,
        requestId: event.requestId,
      };
    case "start":
      return {
        scopeKey: event.scopeKey,
        requestId: event.requestId,
        data: null,
        error: null,
        loading: true,
      };
    case "success":
      if (
        state.scopeKey !== event.scopeKey ||
        state.requestId !== event.requestId
      ) {
        return state;
      }
      return {
        ...state,
        data: event.data,
        error: null,
        loading: false,
      };
    case "error":
      if (
        state.scopeKey !== event.scopeKey ||
        state.requestId !== event.requestId
      ) {
        return state;
      }
      return {
        ...state,
        data: null,
        error: event.message,
        loading: false,
      };
  }
}
