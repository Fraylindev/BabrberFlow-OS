'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

interface ClaimReference { bookingId: string; slug: string }
const ClaimContext = createContext<{ reference: ClaimReference | null; remember: (reference: ClaimReference | null) => void } | null>(null);
interface CustomerSession {
  slug: string; scope: string; loaded: boolean; signedIn: boolean; blocked: boolean;
  options: (signal?: AbortSignal) => { signal: AbortSignal; cache: 'no-store'; authResolver: (refresh?: boolean) => Promise<{ token: string; organizationId: null }> };
  reject: () => void; logout: () => Promise<void>; active: () => boolean;
  requestBookingTabFocus: () => void; shouldFocusBookingTab: () => boolean; finishBookingTabFocus: () => void;
}
const CustomerContext = createContext<CustomerSession | null>(null);

export function CustomerProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const clerk = useClerkAuth();
  const { user, organization } = useAuth();
  const pathname = usePathname();
  const [claimState, setClaimState] = useState<{ slug: string; userId: typeof clerk.userId; reference: ClaimReference | null }>({ slug, userId: clerk.userId, reference: null });
  const scope = JSON.stringify([slug, pathname, clerk.userId, clerk.sessionId, user?.role, organization?.id]);
  // Referencia técnica anónima → primera sesión: conserva solo ID para consentimiento explícito.
  // Cambio entre identidades/negocios o salida: descarta también la referencia.
  const clearReference = claimState.slug !== slug || (Boolean(claimState.userId) && claimState.userId !== clerk.userId);
  if (claimState.slug !== slug || claimState.userId !== clerk.userId) setClaimState({ slug, userId: clerk.userId, reference: clearReference ? null : claimState.reference });
  const remember = useCallback((reference: ClaimReference | null) => setClaimState({ slug, userId: clerk.userId, reference }), [slug, clerk.userId]);
  return <ClaimContext.Provider value={{ reference: clearReference ? null : claimState.reference, remember }}>
    <CustomerScope key={scope} slug={slug} scope={scope}>{children}</CustomerScope>
  </ClaimContext.Provider>;
}

function CustomerScope({ slug, scope, children }: { slug: string; scope: string; children: ReactNode }) {
  const clerk = useClerkAuth();
  const { remember } = useClaimReference();
  const getToken = clerk.getToken;
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false }, mutations: { retry: false, gcTime: 0 } } }));
  const [controller] = useState(() => new AbortController());
  const live = useRef(true);
  const bookingTabFocusRef = useRef(false);
  const requestBookingTabFocus = useCallback(() => { bookingTabFocusRef.current = true; }, []);
  const shouldFocusBookingTab = useCallback(() => bookingTabFocusRef.current, []);
  const finishBookingTabFocus = useCallback(() => { bookingTabFocusRef.current = false; }, []);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; queueMicrotask(() => { if (!live.current) { controller.abort(); client.clear(); } }); };
  }, [controller, client]);
  const reject = useCallback(() => { controller.abort(); client.clear(); remember(null); setBlocked(true); }, [controller, client, remember]);
  const options = useCallback((signal?: AbortSignal) => ({
    signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
    cache: 'no-store' as const,
    authResolver: async (refresh?: boolean) => {
      const token = await getToken({ skipCache: Boolean(refresh) });
      controller.signal.throwIfAborted();
      if (!token) throw new ApiError(401, 'Sesión no válida');
      return { token, organizationId: null };
    },
  }), [getToken, controller]);
  async function logout() {
    reject();
    // Un fallo mantiene oculta la información y conserva la acción de reintentar salida.
    await clerk.signOut();
  }
  return <CustomerContext.Provider value={{ slug, scope, loaded: clerk.isLoaded, signedIn: Boolean(clerk.isSignedIn), blocked, options, reject, logout, requestBookingTabFocus, shouldFocusBookingTab, finishBookingTabFocus, active: () => live.current && !controller.signal.aborted }}>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  </CustomerContext.Provider>;
}
export function useCustomer() { const context = useContext(CustomerContext); if (!context) throw new Error('Falta el contexto de cliente'); return context; }
export function useClaimReference() { const context = useContext(ClaimContext); if (!context) throw new Error('Falta la referencia de visita'); return context; }
