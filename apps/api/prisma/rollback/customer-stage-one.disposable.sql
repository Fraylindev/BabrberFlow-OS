-- SOLO ensayo en base desechable y tras retirar el API M2.
-- Rollback productivo recomendado: código anterior y schema aditivo intacto.
-- Esta inversa pierde recibos/revisión de acceso y requiere autorización propia.
BEGIN;
DROP TRIGGER "Booking_customer_revision" ON "Booking";
DROP FUNCTION customer_booking_revision();
DROP TRIGGER "Client_customer_access_relink" ON "Client";
DROP FUNCTION customer_access_relink();
DROP TABLE "CustomerOperation";
DROP INDEX "Booking_customer_page_idx";
ALTER TABLE "Client" DROP COLUMN "customerAccessBlocked", DROP COLUMN "customerHistoryAmbiguous", DROP COLUMN "customerBookingRevision";
COMMIT;
