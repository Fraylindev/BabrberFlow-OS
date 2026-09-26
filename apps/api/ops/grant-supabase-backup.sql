-- Run as kortek_migrator after restoring the public application schema.
-- Future migrations must declare backup SELECT grants for each new table.
BEGIN;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kortek_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO kortek_backup;
COMMIT;
