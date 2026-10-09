import { CustomerBookingDetail } from '@/components/customer/CustomerBookingDetail';
export const dynamic = 'force-dynamic';
export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <CustomerBookingDetail key={id} id={id} />; }
