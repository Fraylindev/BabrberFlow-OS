BEGIN;

-- Facturación-A is deliberately fail-closed. Legacy Payment rows have no
-- recorded actor and therefore cannot be converted without inventing audit
-- data. Paid/refunded invoices are likewise outside the approved contract.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Payment") THEN
    RAISE EXCEPTION 'Facturacion-A migration blocked: legacy Payment rows require explicit reconciliation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Invoice" i
    WHERE i."status" <> 'UNPAID'::"InvoiceStatus"
  ) THEN
    RAISE EXCEPTION 'Facturacion-A migration blocked: paid/refunded Invoice rows require explicit reconciliation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Invoice" i
    JOIN "Booking" b ON b."id" = i."bookingId"
    JOIN "Service" s ON s."id" = b."serviceId"
    WHERE b."organizationId" <> i."organizationId"
       OR s."organizationId" <> i."organizationId"
       OR b."status" <> 'COMPLETED'::"BookingStatus"
       OR i."amount" <= 0
       OR i."amount" <> trunc(i."amount", 2)
       OR i."amount" >= power(10::numeric, 63)
       OR s."price" <> trunc(s."price", 2)
       OR s."price" <= 0
       OR i."amount" <> s."price"
  ) THEN
    RAISE EXCEPTION 'Facturacion-A migration blocked: legacy Invoice rows violate the approved snapshot or tenant invariants';
  END IF;
END $$;

-- Tenant-consistent relational keys.
CREATE UNIQUE INDEX "Booking_id_organizationId_key"
  ON "Booking"("id", "organizationId");

ALTER TABLE "Invoice"
  DROP CONSTRAINT "Invoice_bookingId_fkey";

DROP INDEX "Invoice_organizationId_status_createdAt_idx";

ALTER TABLE "Invoice"
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'DOP',
  DROP COLUMN "status",
  ALTER COLUMN "amount" TYPE DECIMAL(65,2) USING "amount"::DECIMAL(65,2);

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_amount_positive_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "Invoice_currency_dop_check" CHECK ("currency" = 'DOP');

CREATE UNIQUE INDEX "Invoice_id_organizationId_key"
  ON "Invoice"("id", "organizationId");

CREATE UNIQUE INDEX "Invoice_bookingId_organizationId_key"
  ON "Invoice"("bookingId", "organizationId");

CREATE INDEX "Invoice_org_createdAt_id_idx"
  ON "Invoice"("organizationId", "createdAt", "id");

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_bookingId_organizationId_fkey"
  FOREIGN KEY ("bookingId", "organizationId")
  REFERENCES "Booking"("id", "organizationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Payment is rebuilt in-place. The preflight above guarantees the legacy
-- table is empty, so no actor, method or payment date is fabricated.
ALTER TABLE "Payment"
  DROP CONSTRAINT "Payment_bookingId_fkey";

DROP INDEX "Payment_bookingId_key";

ALTER TABLE "Payment"
  DROP COLUMN "bookingId",
  DROP COLUMN "amount",
  DROP COLUMN "status",
  ADD COLUMN "invoiceId" TEXT NOT NULL,
  ADD COLUMN "paidAt" TIMESTAMP(3) NOT NULL,
  ADD COLUMN "recordedByUserId" TEXT NOT NULL;

CREATE UNIQUE INDEX "Payment_invoiceId_key" ON "Payment"("invoiceId");

CREATE UNIQUE INDEX "Payment_invoiceId_organizationId_key"
  ON "Payment"("invoiceId", "organizationId");

CREATE UNIQUE INDEX "Payment_id_organizationId_key"
  ON "Payment"("id", "organizationId");

CREATE INDEX "Payment_org_paidAt_id_idx"
  ON "Payment"("organizationId", "paidAt", "id");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_invoiceId_organizationId_fkey"
  FOREIGN KEY ("invoiceId", "organizationId")
  REFERENCES "Invoice"("id", "organizationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE "PaymentStatus";
DROP TYPE "InvoiceStatus";

COMMIT;
