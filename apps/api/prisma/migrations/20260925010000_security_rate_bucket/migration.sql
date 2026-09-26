CREATE TABLE "SecurityRateBucket" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "blockedUntil" TIMESTAMPTZ(6),
  CONSTRAINT "SecurityRateBucket_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "SecurityRateBucket_expiresAt_idx" ON "SecurityRateBucket"("expiresAt");

-- D4: the migrator grants each new table explicitly; no inherited DML.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kortek_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "SecurityRateBucket" TO kortek_runtime;
  END IF;
END $$;
