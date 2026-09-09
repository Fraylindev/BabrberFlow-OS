import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTH_ROUTES,
  resolveDashboardAccessRedirect,
  resolveDashboardRedirect,
} from "./auth-routes.ts";

test("keeps the invitation sign-in flow on fixed internal routes", () => {
  assert.equal(AUTH_ROUTES.invitationLogin, "/invitation-login");
  assert.equal(AUTH_ROUTES.invitationComplete, "/auth/invitation/complete");
  assert.equal(AUTH_ROUTES.invitationLogin.includes("?"), false);
  assert.equal(AUTH_ROUTES.invitationComplete.includes("?"), false);
});

test("allows only the dashboard and its descendants after normal login", () => {
  assert.equal(resolveDashboardRedirect("/dashboard"), "/dashboard");
  assert.equal(
    resolveDashboardRedirect("/dashboard/professionals"),
    "/dashboard/professionals",
  );
});

test("rejects external, ambiguous, and missing normal-login destinations", () => {
  for (const destination of [
    null,
    "https://example.test/dashboard",
    "//example.test/dashboard",
    "/dashboard-elsewhere",
    "/auth/invitation/complete",
  ]) {
    assert.equal(resolveDashboardRedirect(destination), "/dashboard");
  }
});

test("routes authenticated accounts to the correct dashboard gate", () => {
  assert.equal(
    resolveDashboardAccessRedirect("ONBOARDING_REQUIRED", "/dashboard"),
    AUTH_ROUTES.dashboardSetup,
  );
  assert.equal(
    resolveDashboardAccessRedirect("NO_ACCESS", "/dashboard/team"),
    AUTH_ROUTES.dashboardAccess,
  );
  assert.equal(
    resolveDashboardAccessRedirect("READY", AUTH_ROUTES.dashboardSetup),
    AUTH_ROUTES.dashboard,
  );
  assert.equal(
    resolveDashboardAccessRedirect("READY", AUTH_ROUTES.dashboardAccess),
    AUTH_ROUTES.dashboard,
  );
  assert.equal(resolveDashboardAccessRedirect("READY", "/dashboard/team"), null);
  assert.equal(resolveDashboardAccessRedirect(null, "/dashboard"), null);
});
