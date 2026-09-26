-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "emailRevision" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BookingEmailPreference" (
    "bookingId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "optedIn" BOOLEAN NOT NULL DEFAULT false,
    "noticeVersion" TEXT,
    "recordedAt" TIMESTAMP(3),
    "source" TEXT,
    "reviewedContactRevision" INTEGER,

    CONSTRAINT "BookingEmailPreference_pkey" PRIMARY KEY ("bookingId","organizationId")
);

-- CreateTable
CREATE TABLE "BookingEmailEvent" (
    "bookingId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "bookingStatus" "BookingStatus" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "serviceId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "contactRevision" INTEGER NOT NULL,
    "preferenceVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEmailEvent_pkey" PRIMARY KEY ("bookingId","organizationId","sequence")
);

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventSequence" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retryAfter" TIMESTAMP(3),
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "firstDispatchedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "recipient" TEXT,
    "sealedPayload" JSONB,
    "providerId" TEXT,
    "providerEventAt" TIMESTAMP(3),

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailWebhookReceipt" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailWebhookReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAbuseBucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EmailAbuseBucket_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateIndex
CREATE INDEX "BookingEmailPreference_clientId_organizationId_idx" ON "BookingEmailPreference"("clientId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_providerId_key" ON "EmailOutbox"("providerId");

-- CreateIndex
CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "EmailOutbox_organizationId_createdAt_id_idx" ON "EmailOutbox"("organizationId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "EmailOutbox_closedAt_idx" ON "EmailOutbox"("closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_bookingId_organizationId_eventSequence_key" ON "EmailOutbox"("bookingId", "organizationId", "eventSequence");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_id_organizationId_key" ON "EmailOutbox"("id", "organizationId");

-- CreateIndex
CREATE INDEX "EmailAbuseBucket_windowStart_idx" ON "EmailAbuseBucket"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "Client_id_organizationId_key" ON "Client"("id", "organizationId");

-- AddForeignKey
ALTER TABLE "BookingEmailPreference" ADD CONSTRAINT "BookingEmailPreference_bookingId_organizationId_fkey" FOREIGN KEY ("bookingId", "organizationId") REFERENCES "Booking"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEmailPreference" ADD CONSTRAINT "BookingEmailPreference_clientId_organizationId_fkey" FOREIGN KEY ("clientId", "organizationId") REFERENCES "Client"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEmailEvent" ADD CONSTRAINT "BookingEmailEvent_bookingId_organizationId_fkey" FOREIGN KEY ("bookingId", "organizationId") REFERENCES "BookingEmailPreference"("bookingId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_bookingId_organizationId_eventSequence_fkey" FOREIGN KEY ("bookingId", "organizationId", "eventSequence") REFERENCES "BookingEmailEvent"("bookingId", "organizationId", "sequence") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailWebhookReceipt" ADD CONSTRAINT "EmailWebhookReceipt_notificationId_organizationId_fkey" FOREIGN KEY ("notificationId", "organizationId") REFERENCES "EmailOutbox"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Operational constraints are intentionally stronger than the Prisma model.
ALTER TABLE "Client" ADD CONSTRAINT "Client_emailRevision_check" CHECK ("emailRevision" >= 0);
ALTER TABLE "BookingEmailPreference" ADD CONSTRAINT "BookingEmailPreference_revision_check"
  CHECK ("sequence" >= 0 AND "version" >= 0 AND ("reviewedContactRevision" IS NULL OR "reviewedContactRevision" >= 0));
ALTER TABLE "BookingEmailPreference" ADD CONSTRAINT "BookingEmailPreference_source_check"
  CHECK ("source" IS NULL OR "source" IN ('PUBLIC', 'STAFF'));
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_budget_check"
  CHECK ("attempts" BETWEEN 0 AND 5 AND "expiresAt" > "createdAt" AND "expiresAt" <= "createdAt" + INTERVAL '24 hours');
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_channel_check" CHECK ("channel" = 'EMAIL');
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_status_check"
  CHECK ("status" IN ('PENDING', 'PROCESSING', 'RETRY', 'ACCEPTED', 'DELIVERED', 'FAILED', 'UNCERTAIN', 'OMITTED', 'OBSOLETE'));
ALTER TABLE "BookingEmailEvent" ADD CONSTRAINT "BookingEmailEvent_kind_check"
  CHECK ("kind" IN ('CREATED', 'CONFIRMED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED', 'INVALIDATED'));
ALTER TABLE "EmailAbuseBucket" ADD CONSTRAINT "EmailAbuseBucket_count_check" CHECK ("count" >= 0);

-- A contact change must invalidate corroboration even when A changes to B and back.
-- The updating statement holds Client first, matching dispatch's lock order.
CREATE FUNCTION notification_client_email_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF lower(btrim(NEW."email")) IS DISTINCT FROM lower(btrim(OLD."email")) THEN
    NEW."emailRevision" := OLD."emailRevision" + 1;
  ELSE
    NEW."emailRevision" := OLD."emailRevision";
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notification_client_email_revision_before
  BEFORE UPDATE OF "email", "emailRevision" ON "Client"
  FOR EACH ROW EXECUTE FUNCTION notification_client_email_revision();

CREATE FUNCTION notification_client_email_invalidation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."emailRevision" <> OLD."emailRevision" THEN
    UPDATE "BookingEmailPreference"
       SET "reviewedContactRevision" = NULL, "version" = "version" + 1
     WHERE "clientId" = NEW."id" AND "organizationId" = NEW."organizationId";
    UPDATE "EmailOutbox" o
       SET "status" = 'OBSOLETE', "reason" = 'CONTACT_CHANGED',
           "closedAt" = CURRENT_TIMESTAMP, "leaseToken" = NULL, "leaseExpiresAt" = NULL
      FROM "BookingEmailPreference" p
     WHERE p."clientId" = NEW."id" AND p."organizationId" = NEW."organizationId"
       AND o."bookingId" = p."bookingId" AND o."organizationId" = p."organizationId"
       AND o."status" IN ('PENDING', 'RETRY', 'PROCESSING');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notification_client_email_invalidation_after
  AFTER UPDATE OF "email", "emailRevision" ON "Client"
  FOR EACH ROW EXECUTE FUNCTION notification_client_email_invalidation();
