BEGIN;

-- Forward-only repair for instances previously synchronized without SQL checks.
-- No row is converted, deleted or silently normalized; pristine databases are
-- unchanged. Historical migration checksums/ledger entries are not rewritten.
DO $$
DECLARE
  actual_definition TEXT;
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);
  PERFORM set_config('statement_timeout', '30s', true);

  IF EXISTS (SELECT 1 FROM public."Invoice" WHERE amount <= 0 OR currency <> 'DOP') THEN
    RAISE EXCEPTION 'Invoice reconciliation blocked: invalid existing rows require explicit resolution';
  END IF;

  SELECT regexp_replace(pg_get_constraintdef(oid), ' NOT VALID$', '')
    INTO actual_definition
    FROM pg_constraint
    WHERE conrelid = 'public."Invoice"'::regclass
      AND conname = 'Invoice_amount_positive_check';
  IF actual_definition IS NULL THEN
    ALTER TABLE public."Invoice" ADD CONSTRAINT "Invoice_amount_positive_check"
      CHECK (amount > 0) NOT VALID;
  ELSIF actual_definition <> 'CHECK ((amount > (0)::numeric))' THEN
    RAISE EXCEPTION 'Invoice reconciliation blocked: unexpected amount constraint definition';
  END IF;

  actual_definition := NULL;
  SELECT regexp_replace(pg_get_constraintdef(oid), ' NOT VALID$', '')
    INTO actual_definition
    FROM pg_constraint
    WHERE conrelid = 'public."Invoice"'::regclass
      AND conname = 'Invoice_currency_dop_check';
  IF actual_definition IS NULL THEN
    ALTER TABLE public."Invoice" ADD CONSTRAINT "Invoice_currency_dop_check"
      CHECK (currency = 'DOP') NOT VALID;
  ELSIF actual_definition <> 'CHECK ((currency = ''DOP''::text))' THEN
    RAISE EXCEPTION 'Invoice reconciliation blocked: unexpected currency constraint definition';
  END IF;

  ALTER TABLE public."Invoice" VALIDATE CONSTRAINT "Invoice_amount_positive_check";
  ALTER TABLE public."Invoice" VALIDATE CONSTRAINT "Invoice_currency_dop_check";
END $$;

COMMIT;
