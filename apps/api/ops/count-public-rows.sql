-- psql-only read-only inventory; emits table_name|count, never business rows.
BEGIN READ ONLY;
SELECT format('SELECT %L || ''|'' || count(*) FROM public.%I', tablename, tablename)
FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
\gexec
COMMIT;
