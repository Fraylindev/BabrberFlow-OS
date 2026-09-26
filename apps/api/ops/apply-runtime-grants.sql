-- Apply after a verified backup and migrations. Run as the database administrator.
-- This is the explicit privilege matrix for the 26-migration baseline.
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

-- Remove historical default DML. No application table privilege is inherited
-- by future objects: each migration must explicitly grant and update the gate.
ALTER DEFAULT PRIVILEGES FOR ROLE kortek_migrator IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, kortek_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE kortek_migrator
  REVOKE ALL ON TABLES FROM PUBLIC, kortek_runtime;
COMMIT;
