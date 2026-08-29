import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "./api.ts";
import {
  createInvoicePayload,
  createPaymentPayload,
  formatBusinessDateTime,
  formatDopAmount,
  invoiceErrorMessage,
  invoiceDateRangeError,
  invoiceScopeKey,
  isCurrentInvoiceScope,
  parseInvoicePagination,
} from "./invoice-ui.ts";

test("invoice scope includes user, organization, and role", () => {
  assert.equal(
    invoiceScopeKey({
      id: "user-1",
      organizationId: "organization-1",
      role: "BARBER",
    }),
    "user-1:organization-1:BARBER",
  );
  assert.equal(invoiceScopeKey(null), null);
  assert.equal(
    isCurrentInvoiceScope(
      "user-1:organization-1:BARBER",
      "user-1:organization-1:BARBER",
    ),
    true,
  );
  assert.equal(
    isCurrentInvoiceScope(null, "user-1:organization-1:BARBER"),
    false,
  );
  assert.equal(
    isCurrentInvoiceScope(
      "user-1:organization-2:OWNER",
      "user-1:organization-1:BARBER",
    ),
    false,
  );
});

test("financial payloads contain only client-authorized fields", () => {
  assert.deepEqual(createInvoicePayload("booking-1"), {
    bookingId: "booking-1",
  });
  assert.deepEqual(createPaymentPayload("TRANSFER"), {
    method: "TRANSFER",
  });
});

test("invoice issue date range validates both inclusive local endpoints", () => {
  assert.equal(
    invoiceDateRangeError("2026-08-11", "2026-08-10"),
    "Desde no puede ser posterior a Hasta.",
  );
  assert.equal(invoiceDateRangeError("2026-08-10", "2026-08-10"), null);
  assert.equal(invoiceDateRangeError("", "2026-08-10"), null);
  assert.equal(invoiceDateRangeError("2026-08-10", ""), null);
});

test("DOP formatting preserves decimal strings without floating point", () => {
  assert.equal(formatDopAmount("125.50"), "RD$125.50");
  assert.equal(
    formatDopAmount("123456789012345678901234567890.10"),
    "RD$123,456,789,012,345,678,901,234,567,890.10",
  );
  assert.equal(formatDopAmount("invalid"), "RD$—");
});

test("pagination requires all authoritative response headers", () => {
  const headers = new Headers({
    "X-Total-Count": "41",
    "X-Page": "2",
    "X-Limit": "20",
    "X-Total-Pages": "3",
  });
  assert.deepEqual(parseInvoicePagination(headers), {
    total: 41,
    page: 2,
    limit: 20,
    totalPages: 3,
  });
  assert.throws(() => parseInvoicePagination(new Headers()));
});

test("dates are formatted in the business zone without exposing its identifier", () => {
  const formatted = formatBusinessDateTime(
    "2026-08-25T12:00:00.000Z",
    "America/Santo_Domingo",
  );
  assert.match(formatted, /8:00/);
  assert.doesNotMatch(formatted, /America|Santo_Domingo|UTC/);
});

test("expected API errors become task-oriented messages", () => {
  assert.equal(
    invoiceErrorMessage(new ApiError(404, "Factura no encontrada"), "payment"),
    "Esta factura ya no está disponible.",
  );
  assert.equal(
    invoiceErrorMessage(new ApiError(409, "constraint"), "issue"),
    "No pudimos emitir la factura. Confirma que el servicio terminó y la reserva está completada.",
  );
});
