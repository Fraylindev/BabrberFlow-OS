import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const loginSource = readFileSync(
  new URL("../app/login/[[...login]]/page.tsx", import.meta.url),
  "utf8",
);
const registerSource = readFileSync(
  new URL("../app/register/[[...register]]/page.tsx", import.meta.url),
  "utf8",
);
const invitationSource = readFileSync(
  new URL(
    "../app/accept-invitation/[[...accept-invitation]]/page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const proxySource = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");

test("normal Clerk login enters the requested dashboard directly", () => {
  assert.match(loginSource, /forceRedirectUrl=\{next\}/);
  assert.equal(loginSource.includes("/auth/continue"), false);
});

test("Clerk registration enters the protected dashboard setup", () => {
  assert.match(registerSource, /forceRedirectUrl=\{AUTH_ROUTES\.dashboardSetup\}/);
  assert.equal(registerSource.includes("mode=onboarding"), false);
});

test("an existing session must be closed before processing an invitation", () => {
  assert.match(
    invitationSource,
    /clerk\.signOut\(\{ redirectUrl: window\.location\.href \}\)/,
  );
  assert.equal(invitationSource.includes("router.replace(completeUrl)"), false);
});

test("Next and Nest use the same bounded Clerk clock tolerance", () => {
  assert.match(proxySource, /CLERK_SESSION_CLOCK_SKEW_MS = 10_000/);
  assert.match(proxySource, /clockSkewInMs: CLERK_SESSION_CLOCK_SKEW_MS/);
});
