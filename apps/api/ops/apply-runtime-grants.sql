-- Apply after a verified backup and migrations. Run as the database administrator.
-- Explicit privilege matrix including M2 C1 customer (28 migrations / 37 tables).
BEGIN;
SET LOCAL lock_timeout = '5s';
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM kortek_runtime;

GRANT SELECT, INSERT ON TABLE public."AuditLog", public."BookingEmailEvent",
  public."CmsOperation", public."EmailWebhookReceipt", public."Invoice",
  public."MediaOperation", public."Payment" TO kortek_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE public."Booking",
  public."BookingEmailPreference", public."Client", public."CmsPage",
  public."EmailChannelControl", public."EmailOutbox", public."MediaAsset",
  public."MediaGalleryOrder", public."MediaPromotion", public."MediaPurgeJob",
  public."Organization", public."Professional",
  public."ProfessionalAvailabilityBlock", public."ProfessionalService",
  public."Service", public."TeamInvitation", public."User" TO kortek_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."EmailAbuseBucket",
  public."Membership", public."ProfessionalWeeklySchedule",
  public."SecurityRateBucket" TO kortek_runtime;
GRANT SELECT ON TABLE public."GalleryImage", public."Notification" TO kortek_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE public."BusinessSchedule",public."BusinessClosure" TO kortek_runtime;
GRANT SELECT, INSERT, DELETE ON TABLE public."BusinessScheduleDay",public."BusinessScheduleWindow" TO kortek_runtime;
GRANT SELECT, INSERT ON TABLE public."BusinessScheduleRevision" TO kortek_runtime;
GRANT USAGE ON TYPE public."BusinessScheduleState" TO kortek_runtime;

-- Remove historical default DML. No application table privilege is inherited
-- by future objects: each migration must explicitly grant and update the gate.
ALTER DEFAULT PRIVILEGES FOR ROLE kortek_migrator IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, kortek_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE kortek_migrator
  REVOKE ALL ON TABLES FROM PUBLIC, kortek_runtime;
COMMIT;
-- The reviewed supplement supplies CustomerOperation SID and invoker functions.
-- Both transactions must finish and the runtime gate pass before activation.
\ir customer-stage-one-runtime-grants.sql
