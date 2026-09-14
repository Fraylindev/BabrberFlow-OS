import { PublicMiniSite } from "@/components/public/PublicMiniSite";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicMiniSite key={slug} slug={slug} />;
}
