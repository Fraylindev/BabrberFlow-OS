-- D12 ONLY: apply to two isolated, identical local clones to rehearse
-- post-write reconciliation. Never run on barberflow or Supabase production.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
BEGIN
  IF current_database() NOT IN ('kortek_c1_rollback_source', 'kortek_c1_rollback_target') THEN
    RAISE EXCEPTION 'Rollback fixture requires the named isolated clones';
  END IF;
  IF EXISTS (SELECT 1 FROM public."Booking" WHERE id = 'a9a96000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Rollback fixture already applied';
  END IF;
END $$;

INSERT INTO public."Booking"
  (id, "organizationId", "clientId", "professionalId", "serviceId",
   "startTime", "endTime", status, "createdAt", "updatedAt")
SELECT 'a9a96000-0000-4000-8000-000000000001', b."organizationId",
  b."clientId", b."professionalId", b."serviceId",
  '2020-01-01 12:00:00', '2020-01-01 13:00:00', 'COMPLETED',
  '2026-09-25 00:00:00', '2026-09-25 00:00:00'
FROM public."Booking" b
WHERE EXISTS (SELECT 1 FROM public."Membership" m
  WHERE m."organizationId" = b."organizationId")
ORDER BY b.id LIMIT 1;

INSERT INTO public."Invoice"
  (id, "organizationId", "bookingId", amount, currency, "createdAt", "updatedAt")
SELECT 'a9a96000-0000-4000-8000-000000000002', b."organizationId", b.id,
  125.00, 'DOP', '2026-09-25 00:00:00', '2026-09-25 00:00:00'
FROM public."Booking" b WHERE b.id = 'a9a96000-0000-4000-8000-000000000001';

INSERT INTO public."Payment"
  (id, "organizationId", "invoiceId", method, "paidAt", "recordedByUserId", "createdAt")
SELECT 'a9a96000-0000-4000-8000-000000000003', i."organizationId", i.id,
  'CASH', '2020-01-01 13:05:00', m."userId", '2026-09-25 00:00:00'
FROM public."Invoice" i JOIN public."Membership" m
  ON m."organizationId" = i."organizationId"
WHERE i.id = 'a9a96000-0000-4000-8000-000000000002'
ORDER BY m."userId" LIMIT 1;

INSERT INTO public."MediaAsset"
  (id, "organizationId", purpose, sha256, bytes, width, height, status,
   "moderationStatus", "altText", "uploadedByUserId", "createdAt", "updatedAt", "stagingExpiresAt")
SELECT 'a9a96000-0000-4000-8000-000000000004', b."organizationId",
  'GALLERY', repeat('a', 64), 1, 1, 1, 'STAGED', 'PENDING',
  'Ensayo de rollback', m."userId", '2026-09-25 00:00:00',
  '2026-09-25 00:00:00', '2099-01-01 00:00:00'
FROM public."Booking" b JOIN public."Membership" m
  ON m."organizationId" = b."organizationId"
WHERE b.id = 'a9a96000-0000-4000-8000-000000000001'
ORDER BY m."userId" LIMIT 1;

INSERT INTO public."BookingEmailPreference"
  ("bookingId", "organizationId", "clientId", sequence, version, "optedIn")
SELECT b.id, b."organizationId", b."clientId", 0, 0, false
FROM public."Booking" b WHERE b.id = 'a9a96000-0000-4000-8000-000000000001';

INSERT INTO public."BookingEmailEvent"
  ("bookingId", "organizationId", sequence, kind, "bookingStatus", "startTime",
   "endTime", "serviceId", "professionalId", "contactRevision", "preferenceVersion")
SELECT b.id, b."organizationId", 1, 'CREATED', b.status, b."startTime",
  b."endTime", b."serviceId", b."professionalId", c."emailRevision", 0
FROM public."Booking" b JOIN public."Client" c ON c.id = b."clientId"
WHERE b.id = 'a9a96000-0000-4000-8000-000000000001';

INSERT INTO public."EmailOutbox"
  (id, "bookingId", "organizationId", "eventSequence", status, reason,
   "createdAt", "expiresAt", "nextAttemptAt")
SELECT 'a9a96000-0000-4000-8000-000000000005', e."bookingId",
  e."organizationId", e.sequence, 'OMITTED', 'NO_OPT_IN',
  '2026-09-25 00:00:00', '2026-09-26 00:00:00', '2026-09-25 00:00:00'
FROM public."BookingEmailEvent" e
WHERE e."bookingId" = 'a9a96000-0000-4000-8000-000000000001';

INSERT INTO public."EmailChannelControl" (id, paused, reason)
VALUES ('EMAIL', true, 'ROLLBACK_DRILL')
ON CONFLICT (id) DO UPDATE SET paused = true, reason = 'ROLLBACK_DRILL';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."Payment" WHERE id = 'a9a96000-0000-4000-8000-000000000003')
    OR NOT EXISTS (SELECT 1 FROM public."MediaAsset" WHERE id = 'a9a96000-0000-4000-8000-000000000004')
    OR NOT EXISTS (SELECT 1 FROM public."EmailOutbox" WHERE id = 'a9a96000-0000-4000-8000-000000000005') THEN
    RAISE EXCEPTION 'Rollback fixture is incomplete';
  END IF;
END $$;
COMMIT;
