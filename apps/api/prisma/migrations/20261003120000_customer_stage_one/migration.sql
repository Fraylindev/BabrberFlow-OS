BEGIN;
ALTER TABLE "Client" ADD COLUMN "customerAccessBlocked" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "customerHistoryAmbiguous" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "customerBookingRevision" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "Client" ADD CONSTRAINT "Client_customer_revision_check" CHECK ("customerBookingRevision" >= 0);
CREATE INDEX "Booking_customer_page_idx" ON "Booking"("organizationId", "clientId", "startTime", "id");
CREATE TABLE "CustomerOperation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "actorUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "clientId" TEXT NOT NULL,
  "operation" VARCHAR(30) NOT NULL,
  "keyDigest" VARCHAR(64) NOT NULL,
  "commandDigest" VARCHAR(64) NOT NULL,
  "bookingId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "CustomerOperation_bookingId_organizationId_fkey" FOREIGN KEY ("bookingId", "organizationId") REFERENCES "Booking"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerOperation_clientId_organizationId_fkey" FOREIGN KEY ("clientId", "organizationId") REFERENCES "Client"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerOperation_valid_check" CHECK (
    (("operation" = 'CREATE_BOOKING' AND "bookingId" IS NOT NULL) OR ("operation" = 'UPDATE_PROFILE' AND "bookingId" IS NULL))
    AND "keyDigest" ~ '^[0-9a-f]{64}$' AND "commandDigest" ~ '^[0-9a-f]{64}$'
    AND "expiresAt" > "createdAt" AND "expiresAt" <= "createdAt" + INTERVAL '24 hours'
  )
);
CREATE UNIQUE INDEX "CustomerOperation_context_key" ON "CustomerOperation"("organizationId", "actorUserId", "operation", "keyDigest");
CREATE INDEX "CustomerOperation_expiresAt_idx" ON "CustomerOperation"("expiresAt");

-- Una revisión previa no autoriza a una identidad distinta tras desvincular/reclamar.
CREATE FUNCTION customer_access_relink() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."userId" IS DISTINCT FROM OLD."userId" THEN
    NEW."customerAccessBlocked" := true;
  END IF;
  IF NEW."customerHistoryAmbiguous" THEN
    NEW."customerAccessBlocked" := true;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Client_customer_access_relink" BEFORE UPDATE OF "userId", "customerHistoryAmbiguous", "customerAccessBlocked" ON "Client"
  FOR EACH ROW EXECUTE FUNCTION customer_access_relink();

-- Invalida cursor sin depender de updatedAt del ORM ni descargar el historial.
CREATE FUNCTION customer_booking_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    UPDATE "Client" SET "customerBookingRevision" = "customerBookingRevision" + 1
    WHERE "id" = OLD."clientId" AND "organizationId" = OLD."organizationId";
  END IF;
  IF TG_OP <> 'DELETE' AND (TG_OP = 'INSERT' OR NEW."clientId" IS DISTINCT FROM OLD."clientId" OR NEW."organizationId" IS DISTINCT FROM OLD."organizationId") THEN
    UPDATE "Client" SET "customerBookingRevision" = "customerBookingRevision" + 1
    WHERE "id" = NEW."clientId" AND "organizationId" = NEW."organizationId";
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER "Booking_customer_revision" AFTER INSERT OR UPDATE OR DELETE ON "Booking"
  FOR EACH ROW EXECUTE FUNCTION customer_booking_revision();
COMMIT;
