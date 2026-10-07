import { CustomerBookings } from '@/components/customer/CustomerBookings';
export const dynamic = 'force-dynamic';
export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista } = await searchParams;
  return <CustomerBookings key={vista} view={vista === 'historial' ? 'history' : 'upcoming'} />;
}
