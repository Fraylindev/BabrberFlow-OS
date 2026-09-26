-- btree_gist provides GiST equality support for professionalId (TEXT).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Authoritative race protection: two non-cancelled bookings for the same
-- professional cannot occupy overlapping [startTime, endTime) ranges.
ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_professional_schedule_excl"
EXCLUDE USING gist (
  "professionalId" WITH =,
  tsrange("startTime", "endTime", '[)') WITH &&
)
WHERE ("status" <> 'CANCELLED');
