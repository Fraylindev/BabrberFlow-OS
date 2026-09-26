-- D12: read-only evidence for the two isolated local clones only.
BEGIN READ ONLY;
DO $$
BEGIN
  IF current_database() NOT IN ('kortek_c1_rollback_source', 'kortek_c1_rollback_target') THEN
    RAISE EXCEPTION 'Rollback inspection requires the named isolated clones';
  END IF;
END $$;
SELECT current_database() AS clone,
  (SELECT count(*) FROM public."Booking") AS bookings,
  (SELECT count(*) FROM public."Invoice") AS invoices,
  (SELECT count(*) FROM public."Payment") AS payments,
  (SELECT count(*) FROM public."MediaAsset") AS media_assets,
  (SELECT count(*) FROM public."BookingEmailPreference") AS email_preferences,
  (SELECT count(*) FROM public."BookingEmailEvent") AS email_events,
  (SELECT count(*) FROM public."EmailOutbox") AS email_outbox,
  (SELECT count(*) FROM public."Booking" WHERE id = 'a9a96000-0000-4000-8000-000000000001') AS fixture_booking,
  (SELECT count(*) FROM public."Payment" WHERE id = 'a9a96000-0000-4000-8000-000000000003') AS fixture_payment,
  (SELECT count(*) FROM public."MediaAsset" WHERE id = 'a9a96000-0000-4000-8000-000000000004') AS fixture_media,
  (SELECT count(*) FROM public."EmailOutbox" WHERE id = 'a9a96000-0000-4000-8000-000000000005') AS fixture_email,
  (SELECT paused FROM public."EmailChannelControl" WHERE id = 'EMAIL') AS email_paused;
COMMIT;
