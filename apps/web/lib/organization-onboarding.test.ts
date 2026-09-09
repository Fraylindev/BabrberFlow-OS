import assert from "node:assert/strict";
import test from "node:test";
import {
  organizationOnboardingPayload,
  organizationSlugFromName,
} from "./organization-onboarding.ts";

test("dashboard onboarding derives a safe editable public slug", () => {
  assert.equal(
    organizationSlugFromName("  Salón Doña María & Hijos  "),
    "salon-dona-maria-hijos",
  );
});

test("dashboard onboarding sends only the approved normalized contract", () => {
  assert.deepEqual(
    organizationOnboardingPayload({
      organizationName: "  Negocio QA  ",
      organizationSlug: "  negocio-qa  ",
      organizationEmail: "  negocio@example.test  ",
    }),
    {
      organizationName: "Negocio QA",
      organizationSlug: "negocio-qa",
      organizationEmail: "negocio@example.test",
    },
  );
});
