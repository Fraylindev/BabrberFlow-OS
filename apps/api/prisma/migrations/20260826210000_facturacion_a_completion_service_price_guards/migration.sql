BEGIN;

-- Do not silently normalize historical money or accept a financial state
-- that could not be produced by the corrected Booking transition.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Service"
    WHERE "price" <= 0
       OR "price" <> trunc("price", 2)
       OR "price" >= power(10::numeric, 63)
  ) THEN
    RAISE EXCEPTION 'Facturacion-A correction blocked: Service.price requires explicit reconciliation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Booking"
    WHERE "status" = 'COMPLETED'::"BookingStatus"
      AND "endTime" > CURRENT_TIMESTAMP
  ) THEN
    RAISE EXCEPTION 'Facturacion-A correction blocked: future completed Booking requires explicit reconciliation';
  END IF;
END $$;

ALTER TABLE "Service"
  ALTER COLUMN "price" TYPE DECIMAL(65,2)
  USING "price"::DECIMAL(65,2);

ALTER TABLE "Service"
  ADD CONSTRAINT "Service_price_dop_check" CHECK ("price" > 0);

COMMIT;
