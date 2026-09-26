-- Read-only aggregate evidence for this schema (all public tables have id).
-- Compare source/restore output privately; do not publish row data or use a
-- changing source as if it were the dump's transaction snapshot.
-- Intended for bounded local verification, not large production datasets.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT tablename,
  query_to_xml(format(
    'SELECT count(*) AS row_count, md5(coalesce(string_agg(row_to_json(t)::text, chr(10) ORDER BY t.id), '''')) AS fingerprint FROM public.%I t',
    tablename
  ), false, true, '')::text
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
COMMIT;
