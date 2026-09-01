import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "./api.ts";
import {
  formatServicePrice,
  isCurrentServicesScope,
  serviceErrorMessage,
  serviceFilterValue,
  servicesScopeKey,
  serviceWriteInput,
  validateServiceDraft,
} from "./service-ui.ts";

test("services scope changes with user, organization, and role", () => {
  const owner = { id: "user-1", organizationId: "org-a", role: "OWNER" as const };
  assert.equal(servicesScopeKey(owner), "user-1:org-a:OWNER");
  assert.notEqual(servicesScopeKey(owner), servicesScopeKey({ ...owner, organizationId: "org-b" }));
  assert.notEqual(servicesScopeKey(owner), servicesScopeKey({ ...owner, role: "BARBER" }));
  assert.notEqual(servicesScopeKey(owner), servicesScopeKey({ ...owner, id: "user-2" }));
  assert.equal(servicesScopeKey(null), null);
});

test("returning A to B to A does not revive effects from the first visit", () => {
  const firstA = { key: "user-1:org-a:OWNER" };
  const scopeB = { key: "user-1:org-b:BARBER" };
  const secondA = { key: firstA.key };
  assert.equal(isCurrentServicesScope(scopeB, firstA), false);
  assert.equal(isCurrentServicesScope(secondA, firstA), false);
  assert.equal(isCurrentServicesScope(secondA, secondA), true);
  assert.equal(isCurrentServicesScope(null, secondA), false);
});

test("service form sends only contract fields and trims text", () => {
  const draft = {
    name: "  Corte clásico  ",
    description: "  Incluye lavado  ",
    duration: "45",
    price: "750.50",
    organizationId: "other-org",
    isActive: false,
  };
  assert.deepEqual(serviceWriteInput(draft), {
    name: "Corte clásico",
    description: "Incluye lavado",
    duration: 45,
    price: 750.5,
  });
});

test("service form enforces published limits and monetary precision", () => {
  const valid = { name: "Corte", description: "", duration: "30", price: "500.00" };
  assert.deepEqual(validateServiceDraft(valid), {});
  assert.equal(validateServiceDraft({ ...valid, name: "  " }).name, "Ingresa el nombre del servicio.");
  assert.ok(validateServiceDraft({ ...valid, duration: "0" }).duration);
  assert.ok(validateServiceDraft({ ...valid, duration: "30.5" }).duration);
  assert.ok(validateServiceDraft({ ...valid, price: "0" }).price);
  assert.equal(
    validateServiceDraft({ ...valid, price: "125.555" }).price,
    "Usa un máximo de dos decimales.",
  );
});

test("state filter maps to the real backend query and supports all", () => {
  assert.equal(serviceFilterValue("ALL"), undefined);
  assert.equal(serviceFilterValue("ACTIVE"), true);
  assert.equal(serviceFilterValue("INACTIVE"), false);
});

test("service messages are safe and do not expose backend details", () => {
  assert.equal(
    serviceErrorMessage(new ApiError(403, "internal guard detail"), "update"),
    "No tienes permiso para realizar esta acción.",
  );
  assert.equal(
    serviceErrorMessage(new ApiError(404, "resource id"), "deactivate"),
    "Este servicio ya no está disponible en esta organización.",
  );
  assert.match(serviceErrorMessage(new Error("database"), "list"), /cargar los servicios/);
  assert.doesNotMatch(serviceErrorMessage(new Error("database"), "list"), /database/);
  assert.match(formatServicePrice("1250.50"), /1[,.]250/);
});
