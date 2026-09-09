import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptInvitationUrl,
  invitationAcceptanceIssue,
  invitationCompleteUrl,
  invitationIdFromSearchParams,
  invitationLoginUrl,
  invitationProfileNeedsName,
  retainInvitationId,
} from "./invitation-navigation.ts";

const invitationId = "ca0986f6-7578-4473-93c5-d2122cfe3a59";

test("keeps the local invitation locator on fixed internal routes", () => {
  assert.equal(
    acceptInvitationUrl(invitationId),
    `/accept-invitation?invitation=${invitationId}`,
  );
  assert.equal(
    invitationLoginUrl(invitationId),
    `/invitation-login?invitation=${invitationId}`,
  );
  assert.equal(
    invitationCompleteUrl(invitationId),
    `/auth/invitation/complete?invitation=${invitationId}`,
  );
});

test("accepts only one valid UUID locator and ignores all authority-like input", () => {
  assert.equal(
    invitationIdFromSearchParams(
      new URLSearchParams({
        invitation: invitationId,
        organizationId: "attacker-tenant",
        role: "OWNER",
        redirect: "https://example.test",
      }),
    ),
    invitationId,
  );
  assert.equal(
    invitationIdFromSearchParams(new URLSearchParams("invitation=invalid")),
    null,
  );
  assert.equal(
    invitationIdFromSearchParams(
      new URLSearchParams(
        `invitation=${invitationId}&invitation=${invitationId}`,
      ),
    ),
    null,
  );
  assert.equal(invitationIdFromSearchParams(new URLSearchParams()), null);
});

test("retains the invitation locator when Clerk rewrites the URL", () => {
  assert.equal(retainInvitationId(invitationId, null), invitationId);
  assert.equal(retainInvitationId(null, invitationId), invitationId);
  assert.equal(retainInvitationId(invitationId, "another-id"), invitationId);
});

test("keeps invitation acceptance gated until the profile name is persisted", () => {
  assert.equal(invitationProfileNeedsName(null, false), true);
  assert.equal(invitationProfileNeedsName("   ", false), true);
  assert.equal(invitationProfileNeedsName("Nombre guardado", false), false);
  assert.equal(invitationProfileNeedsName(null, true), false);
});

test("terminal invitation failures never offer a useless retry", () => {
  for (const status of [401, 403, 409]) {
    const issue = invitationAcceptanceIssue(status);
    assert.equal(issue.retryable, false);
    assert.match(issue.message, /invitación más reciente/);
    assert.match(issue.message, /mismo correo/);
  }
});

test("transient invitation failures keep a real retry action", () => {
  assert.deepEqual(invitationAcceptanceIssue(429, 18), {
    message: "La invitación está temporalmente limitada. Intenta de nuevo en 18 s.",
    retryable: true,
  });
  assert.equal(invitationAcceptanceIssue(503).retryable, true);
  assert.equal(invitationAcceptanceIssue(null).retryable, true);
});
