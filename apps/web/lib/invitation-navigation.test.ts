import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptInvitationUrl,
  invitationCompleteUrl,
  invitationIdFromSearchParams,
  invitationLoginUrl,
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
