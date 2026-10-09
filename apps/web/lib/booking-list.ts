import type { Booking, BookingStatus } from './api';

export type BookingStatusFilter = BookingStatus | 'ALL' | 'TO_ATTEND';

export function bookingNeedsAttention(booking: Booking): boolean {
  return booking.status === 'PENDING' || booking.status === 'CONFIRMED' ||
    (booking.status === 'COMPLETED' && booking.invoice === null);
}

export function visibleBookings(items: Booking[], filter: BookingStatusFilter): Booking[] {
  const visible = items.filter(booking => filter !== 'TO_ATTEND' || bookingNeedsAttention(booking));
  return visible.sort((a, b) => {
    if (filter === 'ALL') {
      const priority = Number(bookingNeedsAttention(b)) - Number(bookingNeedsAttention(a));
      return priority || b.startTime.localeCompare(a.startTime);
    }
    return a.startTime.localeCompare(b.startTime);
  });
}
