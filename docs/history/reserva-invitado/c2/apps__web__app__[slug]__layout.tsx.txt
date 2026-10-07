import { CustomerProvider } from '@/components/customer/CustomerProvider';
import '@/components/customer/customer.css';
export default async function BusinessLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CustomerProvider key={slug} slug={slug}>{children}</CustomerProvider>;
}
