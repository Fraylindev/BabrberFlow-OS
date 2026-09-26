-- Run as kortek_migrator AFTER restoring the 26-migration public schema.
BEGIN;
SET LOCAL lock_timeout = '5s';
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, kortek_runtime;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, kortek_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kortek_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE kortek_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO kortek_runtime;
GRANT USAGE ON TYPE public."MediaAssetPurpose", public."MediaAssetStatus",
  public."MediaModerationStatus" TO kortek_runtime;
COMMIT;
\ir apply-runtime-grants.sql
