'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useCustomer } from './CustomerProvider';
import { customerRoutes } from '@/lib/customer-routes';
import { CUSTOMER_ASSISTANCE, CUSTOMER_UNAVAILABLE } from '@/lib/customer-ui';
import './customer.css';

export function CustomerShell({ title, children, privatePage = true }: { title: string; children: ReactNode; privatePage?: boolean }) {
  const session = useCustomer();
  const routes = customerRoutes(session.slug);
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  useEffect(() => { heading.current?.focus(); }, [title]);
  async function leave() {
    setSigningOut(true); setLogoutError(false);
    try { await session.logout(); router.replace(routes.root); }
    catch { setLogoutError(true); }
    finally { setSigningOut(false); }
  }
  return <main className="customer-page">
    <a href="#customer-content" className="customer-skip">Ir al contenido</a>
    <nav aria-label="Cuenta de cliente"><Link href={routes.root}>← Volver al negocio</Link>{session.signedIn && <><Link href={routes.bookings}>Mis reservas</Link><Link href={routes.profile}>Mi perfil</Link><Button variant="ghost" disabled={signingOut} onClick={() => void leave()}>{signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</Button></>}</nav>
    {logoutError && <p role="alert">No pudimos cerrar la sesión. Inténtalo de nuevo.</p>}
    <h1 ref={heading} tabIndex={-1}>{title}</h1>
    <div id="customer-content" className="customer-stack">
      {!session.loaded ? <p role="status">Comprobando tu sesión…</p> : privatePage && !session.signedIn ? <><p>Inicia sesión de nuevo para ver tus reservas.</p><Link href={routes.login}>Iniciar sesión</Link><Link href={routes.create}>Crear cuenta</Link></> : privatePage && session.blocked ? <><p role="alert">{CUSTOMER_UNAVAILABLE}</p><p>{CUSTOMER_ASSISTANCE}</p><Link href={routes.login}>Iniciar sesión</Link><Link href={routes.root}>Contactar al negocio</Link></> : children}
    </div>
  </main>;
}
