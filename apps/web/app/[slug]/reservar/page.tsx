import { PublicBookingScreen } from '@/components/public/PublicBookingScreen';

export default async function ReservePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicBookingScreen key={slug} slug={slug} />;
}
