-- P10c-B3: una invocacion autorizada; rol kortek_migrator.
-- Solo escribe EmailChannelControl.EMAIL. Auditoria documental, no AuditLog.
-- Resultado incierto: leer estado; nunca reintentar automaticamente.
BEGIN READ WRITE;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SELECT json_build_object('stage','before','utc',clock_timestamp(),'transaction_id',txid_current(),'current_user',current_user,'session_user',session_user,'read_only',current_setting('transaction_read_only'));
SELECT json_build_object('control_before',json_agg(r)) FROM (SELECT id,paused,reason,"updatedAt" FROM public."EmailChannelControl" WHERE id='EMAIL') r;
DO $b3$
DECLARE c record; changed integer;
BEGIN
 IF current_user <> 'kortek_migrator' THEN RAISE EXCEPTION 'B3_ROLE_MISMATCH'; END IF;
 SELECT id,paused,reason,"updatedAt" INTO STRICT c FROM public."EmailChannelControl" WHERE id='EMAIL' FOR UPDATE;
 IF (SELECT count(*) FROM public."EmailOutbox") <> 5 OR EXISTS (SELECT 1 FROM public."EmailOutbox" WHERE status <> 'OMITTED') THEN RAISE EXCEPTION 'B3_QUEUE_DRIFT'; END IF;
 IF c.paused THEN
  IF c.reason IS DISTINCT FROM 'BASE_PREPRODUCCION_C1' OR c."updatedAt" <> TIMESTAMP '2026-09-26 01:13:04.914' THEN RAISE EXCEPTION 'B3_PAUSE_DRIFT'; END IF;
  UPDATE public."EmailChannelControl" SET paused=false,reason=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE id='EMAIL' AND paused=true;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'B3_UPDATE_COUNT'; END IF;
 ELSE
  IF c.reason IS NOT NULL THEN RAISE EXCEPTION 'B3_UNPAUSED_DRIFT'; END IF;
  -- Idempotencia: canal ya reanudado no recibe UPDATE ni nueva fecha.
 END IF;
END $b3$;
SELECT json_build_object('control_after',json_agg(r)) FROM (SELECT id,paused,reason,"updatedAt" FROM public."EmailChannelControl" WHERE id='EMAIL') r;
SELECT json_build_object('outbox_by_state',json_agg(r)) FROM (SELECT status,count(*) AS count FROM public."EmailOutbox" GROUP BY status ORDER BY status) r;
SELECT json_build_object('stage','before_commit','utc',clock_timestamp(),'transaction_id',txid_current());
COMMIT;
