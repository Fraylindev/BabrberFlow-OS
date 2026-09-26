import { NotificationsView } from '@/components/notifications/NotificationsView';

export default async function BookingNotificationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NotificationsView bookingId={id} />;
}
