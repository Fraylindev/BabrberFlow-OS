'use client';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { customerRoutes } from '@/lib/customer-routes';
export function CustomerEntryLinks({ slug }: { slug: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const routes = customerRoutes(slug);
  if (!isLoaded) return <p role="status" className="text-sm">Comprobando cuenta…</p>;
  return <nav aria-label="Tu cuenta" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">{isSignedIn ? <><Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={routes.bookings}>Mis reservas</Link><Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={routes.profile}>Mi perfil</Link></> : <><Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={routes.create}>Crear cuenta</Link><Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={routes.login}>Iniciar sesión</Link></>}</nav>;
}
