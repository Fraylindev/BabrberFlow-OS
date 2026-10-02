'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { AUTH_ROUTES, resolveDashboardAccessRedirect } from '@/lib/auth-routes';

function LoadingPanel() {
  return (
    <div
      role="status"
      className="dashboard-shell flex min-h-screen items-center justify-center bg-[var(--dash-bg)] px-4 text-sm text-[var(--dash-text-muted)]"
    >
      Cargando…
    </div>
  );
}

function RestrictedPanel({
  children,
  onLogout,
}: {
  children: React.ReactNode;
  onLogout: () => void;
}) {
  return (
    <div className="dashboard-shell min-h-screen bg-[var(--dash-bg)]">
      <header className="border-b border-[var(--dash-sidebar-border)] bg-[var(--dash-sidebar-bg)] px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--dash-accent)] font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--dash-accent)]">
              KO
            </div>
            <p className="truncate font-[family-name:var(--font-display)] text-base font-semibold text-white">
              Kortek Booking
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 rounded-sm px-3 py-2 text-sm text-[var(--dash-sidebar-text)] transition-colors hover:bg-[var(--dash-sidebar-surface)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dash-accent)]"
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8 sm:py-14">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!auth.isLoaded) return;
    if (!auth.isSignedIn) {
      router.replace(AUTH_ROUTES.login);
      return;
    }
    if (auth.error) return;
    const destination = resolveDashboardAccessRedirect(auth.state, pathname);
    if (destination && destination !== pathname) {
      router.replace(destination);
    }
  }, [auth.error, auth.isLoaded, auth.isSignedIn, auth.state, pathname, router]);

  if (!auth.isLoaded || !auth.isSignedIn) return <LoadingPanel />;

  if (auth.error) {
    return (
      <RestrictedPanel onLogout={() => void auth.logout()}>
        <div className="mx-auto max-w-md rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)] p-6 text-center shadow-[var(--dash-shadow-card)]">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--dash-text)]">
            {auth.isRecovering ? 'Conectando con tu espacio de trabajo…' : 'Tu acceso necesita atención'}
          </h1>
          {auth.isRecovering ? (
            <p role="status" className="mt-2 text-sm text-[var(--dash-text-muted)]">La conexión se recuperará automáticamente.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-[var(--dash-text-muted)]"><ErrorText message={auth.error} /></p>
              <Button tone="light" className="mt-5" onClick={() => void auth.logout()}>Iniciar sesión</Button>
            </>
          )}
        </div>
      </RestrictedPanel>
    );
  }

  if (auth.state === 'ONBOARDING_REQUIRED' && pathname === AUTH_ROUTES.dashboardSetup) {
    return <RestrictedPanel onLogout={() => void auth.logout()}>{children}</RestrictedPanel>;
  }

  if (auth.state === 'NO_ACCESS' && pathname === AUTH_ROUTES.dashboardAccess) {
    return <RestrictedPanel onLogout={() => void auth.logout()}>{children}</RestrictedPanel>;
  }

  if (!auth.isReady) return <LoadingPanel />;

  return (
    <div className="dashboard-shell flex min-h-screen">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
          <div className={`mx-auto ${pathname === '/dashboard/bookings' ? 'max-w-[1440px]' : 'max-w-6xl'}`}>{children}</div>
        </main>
      </div>
    </div>
  );
}
