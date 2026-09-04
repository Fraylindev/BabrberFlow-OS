import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "./api.ts";
import {
  canManageTeam,
  canManageTeamMember,
  invitationRevocationDecision,
  isCurrentTeamScope,
  teamErrorMessage,
  teamRevokeInput,
  teamRoleInput,
  teamScopeKey,
} from "./team-ui.ts";

test("team scope changes with user, organization, and role", () => {
  const owner = { id: "user-1", organizationId: "org-a", role: "OWNER" as const };
  assert.equal(teamScopeKey(owner), "user-1:org-a:OWNER");
  assert.notEqual(teamScopeKey(owner), teamScopeKey({ ...owner, organizationId: "org-b" }));
  assert.notEqual(teamScopeKey(owner), teamScopeKey({ ...owner, role: "ADMIN" }));
  assert.notEqual(teamScopeKey(owner), teamScopeKey({ ...owner, id: "user-2" }));
  assert.equal(teamScopeKey(null), null);
});

test("returning A to B to A does not revive effects from the first team visit", () => {
  const firstA = { key: "user-1:org-a:OWNER" };
  const scopeB = { key: "user-1:org-b:ADMIN" };
  const secondA = { key: firstA.key };
  assert.equal(isCurrentTeamScope(scopeB, firstA), false);
  assert.equal(isCurrentTeamScope(secondA, firstA), false);
  assert.equal(isCurrentTeamScope(secondA, secondA), true);
  assert.equal(isCurrentTeamScope(null, secondA), false);
});

test("only owner and admin manage team, and admin cannot manage an owner", () => {
  assert.equal(canManageTeam("OWNER"), true);
  assert.equal(canManageTeam("ADMIN"), true);
  assert.equal(canManageTeam("BARBER"), false);
  assert.equal(canManageTeam("RECEPTIONIST"), false);
  assert.equal(canManageTeamMember("ADMIN", "OWNER"), false);
  assert.equal(canManageTeamMember("OWNER", "OWNER"), true);
  assert.equal(canManageTeamMember("ADMIN", "BARBER"), true);
});

test("member mutations send only normalized contract fields", () => {
  const member = { email: "  Person@Example.Test  ", internalId: "private" };
  assert.deepEqual(teamRoleInput(member, "BARBER"), {
    email: "person@example.test",
    role: "BARBER",
  });
  assert.deepEqual(teamRevokeInput(member), { email: "person@example.test" });
});

test("invitation revocation only yields an API id after final confirmation", () => {
  const invitation = { id: "invitation-1", email: "person@example.test" };

  const opened = invitationRevocationDecision(null, {
    type: "OPEN",
    invitation,
  });
  assert.equal(opened.nextInvitation, invitation);
  assert.equal(opened.revokeId, null);

  assert.deepEqual(
    invitationRevocationDecision(opened.nextInvitation, { type: "CANCEL" }),
    { nextInvitation: null, revokeId: null },
  );
  assert.deepEqual(
    invitationRevocationDecision(opened.nextInvitation, { type: "CLOSE" }),
    { nextInvitation: null, revokeId: null },
  );
  assert.deepEqual(
    invitationRevocationDecision(opened.nextInvitation, { type: "CONFIRM" }),
    { nextInvitation: invitation, revokeId: invitation.id },
  );
  assert.deepEqual(
    invitationRevocationDecision(null, { type: "CONFIRM" }),
    { nextInvitation: null, revokeId: null },
  );
});

test("team errors use safe task language", () => {
  assert.match(teamErrorMessage(new ApiError(429, "throttler"), "role"), /Espera/);
  assert.match(teamErrorMessage(new ApiError(409, "owner_count"), "revokeMember"), /propietario/);
  assert.equal(
    teamErrorMessage(new Error("database unavailable"), "members"),
    "No pudimos cargar los miembros del equipo.",
  );
  assert.doesNotMatch(teamErrorMessage(new Error("database unavailable"), "members"), /database/);
});
