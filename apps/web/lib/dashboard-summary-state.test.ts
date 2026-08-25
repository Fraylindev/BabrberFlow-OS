import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardSummaryData } from "./dashboard-summary-state.ts";
import {
  INITIAL_DASHBOARD_SUMMARY_STATE,
  dashboardSummaryForScope,
  dashboardSummaryReducer,
  dashboardSummaryScopeKey,
} from "./dashboard-summary-state.ts";

function summary(label: string): DashboardSummaryData {
  return {
    bookings: [
      {
        id: `booking-${label}`,
        startTime: "2026-08-24T14:00:00.000Z",
        endTime: "2026-08-24T14:30:00.000Z",
        status: "CONFIRMED",
        clientId: `client-${label}`,
        professionalId: `professional-${label}`,
        serviceId: `service-${label}`,
      },
    ],
    professionals: [
      {
        id: `professional-${label}`,
        name: `Profesional ${label}`,
        avatar: null,
        specialty: null,
        status: "ACTIVE",
        isActive: true,
      },
    ],
    analytics: null,
    nextBookingId: `booking-${label}`,
  };
}

test("the business scope includes user, organization, and role", () => {
  assert.equal(
    dashboardSummaryScopeKey({
      id: "user-1",
      organizationId: "organization-1",
      role: "OWNER",
    }),
    "user-1:organization-1:OWNER",
  );
  assert.equal(dashboardSummaryScopeKey(null), null);
});

test("changing organization clears the previous summary immediately", () => {
  let state = dashboardSummaryReducer(INITIAL_DASHBOARD_SUMMARY_STATE, {
    type: "start",
    scopeKey: "user-1:organization-a:OWNER",
    requestId: 1,
  });
  state = dashboardSummaryReducer(state, {
    type: "success",
    scopeKey: "user-1:organization-a:OWNER",
    requestId: 1,
    data: summary("A"),
  });

  assert.equal(
    dashboardSummaryForScope(state, "user-1:organization-b:BARBER"),
    null,
  );

  state = dashboardSummaryReducer(state, {
    type: "start",
    scopeKey: "user-1:organization-b:BARBER",
    requestId: 2,
  });

  assert.equal(state.scopeKey, "user-1:organization-b:BARBER");
  assert.equal(state.data, null);
  assert.equal(state.error, null);
  assert.equal(state.loading, true);
});

test("a late response from the previous organization is ignored", () => {
  const state = dashboardSummaryReducer(INITIAL_DASHBOARD_SUMMARY_STATE, {
    type: "start",
    scopeKey: "user-1:organization-b:BARBER",
    requestId: 2,
  });

  const unchanged = dashboardSummaryReducer(state, {
    type: "success",
    scopeKey: "user-1:organization-a:OWNER",
    requestId: 1,
    data: summary("A-late"),
  });

  assert.equal(unchanged, state);
  assert.equal(unchanged.data, null);
});

test("an old A response cannot overwrite a newer A request after A to B to A", () => {
  let state = dashboardSummaryReducer(INITIAL_DASHBOARD_SUMMARY_STATE, {
    type: "start",
    scopeKey: "user-1:organization-a:OWNER",
    requestId: 3,
  });

  state = dashboardSummaryReducer(state, {
    type: "success",
    scopeKey: "user-1:organization-a:OWNER",
    requestId: 1,
    data: summary("A-old"),
  });
  assert.equal(state.data, null);

  state = dashboardSummaryReducer(state, {
    type: "success",
    scopeKey: "user-1:organization-a:OWNER",
    requestId: 3,
    data: summary("A-new"),
  });
  assert.equal(state.data?.bookings[0]?.id, "booking-A-new");
});

test("a late error from another role does not replace the current state", () => {
  const state = dashboardSummaryReducer(INITIAL_DASHBOARD_SUMMARY_STATE, {
    type: "start",
    scopeKey: "user-1:organization-a:BARBER",
    requestId: 4,
  });

  const unchanged = dashboardSummaryReducer(state, {
    type: "error",
    scopeKey: "user-1:organization-a:OWNER",
    requestId: 3,
    message: "late error",
  });

  assert.equal(unchanged, state);
  assert.equal(unchanged.error, null);
});
