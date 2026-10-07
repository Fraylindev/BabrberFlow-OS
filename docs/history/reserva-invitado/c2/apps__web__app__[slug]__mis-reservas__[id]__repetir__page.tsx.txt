import { CustomerRepeatBooking } from '@/components/customer/CustomerRepeatBooking';
export const dynamic = 'force-dynamic';
export default async function RepeatPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <CustomerRepeatBooking key={id} id={id} />; }
