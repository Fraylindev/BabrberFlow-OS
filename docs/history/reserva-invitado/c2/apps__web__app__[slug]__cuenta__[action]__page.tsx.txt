import { notFound } from 'next/navigation';
import { CustomerAuth } from '@/components/customer/CustomerAuth';
export const dynamic = 'force-dynamic';
export default async function CustomerAuthPage({ params, searchParams }: { params: Promise<{ slug: string; action: string }>; searchParams: Promise<{ next?: string }> }) {
  const { action } = await params;
  const { next } = await searchParams;
  if (action !== 'crear' && action !== 'entrar' && action !== 'recuperar') notFound();
  return <CustomerAuth key={action} mode={action === 'crear' ? 'create' : action === 'recuperar' ? 'recover' : 'login'} next={next ?? null} />;
}
