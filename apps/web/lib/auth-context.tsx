'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { runAuthOperation } from './auth-operation';
import { hasDefinitiveAccessError, isTransientQueryError, retryQuery } from './query-recovery';
import {
  api,
  ApiError,
  type AuthUser,
  type ClerkBootstrapResponse,
  type ClerkBootstrapState,
  type ClerkMembership,
  configureApiAuth,
} from './api';

interface AuthContextValue {
  isLoaded: boolean;
  isReady: boolean;
  isSignedIn: boolean;
  state: ClerkBootstrapState | null;
  error: string | null;
  isRecovering: boolean;
  user: AuthUser | null;
  organization: ClerkMembership['organization'] | null;
  memberships: ClerkMembership[];
  selectOrganization: (organizationId: string) => void;
  refresh: () => Promise<ClerkBootstrapResponse | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function clearLegacySession() {
  window.localStorage.removeItem('bf_token');
  window.localStorage.removeItem('bf_session');
  document.cookie = 'kb_session=; path=/; max-age=0; SameSite=Lax';
}

function friendlyBootstrapError(error: unknown): string {
  const message = friendlyBootstrapErrorText(error);
  return error instanceof ApiError ? error.withRequestCode(message) : message;
}

function friendlyBootstrapErrorText(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return 'Tu sesión ya no está disponible. Vuelve a iniciar sesión.';
  }
  if (error instanceof ApiError && error.status === 503) {
    return 'No pudimos consultar tu acceso. Revisa tu conexión y vuelve a intentarlo.';
  }
  return 'No pudimos preparar tu espacio de trabajo. Revisa tu conexión e intenta de nuevo.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    getToken,
    isLoaded: clerkLoaded,
    isSignedIn: clerkSignedIn,
    signOut,
    userId,
  } = useClerkAuth();
  const queryClient = useQueryClient();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const renewalRef = useRef<{ userId: typeof userId; getToken: typeof getToken; promise: Promise<string | null> } | null>(null);
  const resolveToken = useCallback((forceRefresh = false) => {
    if (!clerkSignedIn) return Promise.resolve(null);
    if (!forceRefresh) return getToken();
    const renewal = renewalRef.current;
    if (renewal?.userId === userId && renewal.getToken === getToken) return renewal.promise;
    // Share one Clerk renewal across simultaneous 401s in this identity.
    const promise = getToken({ skipCache: true }).finally(() => {
      if (renewalRef.current?.promise === promise) renewalRef.current = null;
    });
    renewalRef.current = { userId, getToken, promise };
    return promise;
  }, [getToken, userId, clerkSignedIn]);

  const bootstrapQuery = useQuery({
    queryKey: ['auth', 'clerk-bootstrap', userId],
    queryFn: ({ signal }) =>
      runAuthOperation(async (requestSignal) => {
        // The query can start before the layout effect registers business auth.
        // Bootstrap needs only the current Clerk session, never a previous tenant.
        return api.get<ClerkBootstrapResponse>('/auth/clerk/bootstrap', undefined, {
          signal: requestSignal,
          cache: 'no-store',
          authResolver: async (forceRefresh) => {
            const token = await resolveToken(forceRefresh);
            if (!token) throw new ApiError(401, 'Sesión no válida');
            return { token, organizationId: null };
          },
        });
      }, signal),
    enabled: clerkLoaded && clerkSignedIn,
    retry: retryQuery,
    staleTime: 30_000,
  });

  const accessDenied = hasDefinitiveAccessError(bootstrapQuery.error);
  const bootstrap = clerkSignedIn && !accessDenied ? (bootstrapQuery.data ?? null) : null;
  const memberships = useMemo(() => bootstrap?.memberships ?? [], [bootstrap?.memberships]);
  const selectedMembership = useMemo(() => {
    const selected = memberships.find(
      ({ organization }) => organization.id === selectedOrganizationId,
    );
    if (selected) return selected;
    const preferred = memberships.find(
      ({ organization }) => organization.id === bootstrap?.preferredOrganizationId,
    );
    return preferred ?? memberships[0] ?? null;
  }, [bootstrap?.preferredOrganizationId, memberships, selectedOrganizationId]);

  const refetchBootstrap = bootstrapQuery.refetch;
  useLayoutEffect(() => {
    clearLegacySession();
    return configureApiAuth(async (forceRefresh) => ({
      token: await resolveToken(forceRefresh),
      organizationId: selectedMembership?.organization.id ?? null,
    }), () => { void refetchBootstrap({ cancelRefetch: false }); });
  }, [
    resolveToken,
    refetchBootstrap,
    userId,
    clerkSignedIn,
    selectedMembership?.organization.id,
    selectedMembership?.role,
  ]);

  const refresh = useCallback(async () => {
    if (!clerkLoaded || !clerkSignedIn) return null;
    const result = await refetchBootstrap();
    if (result.error) return null;
    return result.data ?? null;
  }, [refetchBootstrap, clerkLoaded, clerkSignedIn]);

  const user =
    bootstrap?.user && selectedMembership
      ? {
          id: bootstrap.user.id,
          name: bootstrap.user.name,
          role: selectedMembership.role,
          organizationId: selectedMembership.organization.id,
        }
      : null;
  const businessScope = user ? `${user.id}:${user.organizationId}:${user.role}` : null;
  const previousBusinessScope = useRef<string | null>(null);

  useEffect(() => {
    const previous = previousBusinessScope.current;
    if (previous && previous !== businessScope) {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'auth',
      });
    }
    previousBusinessScope.current = businessScope;
  }, [businessScope, queryClient]);

  function selectOrganization(organizationId: string) {
    if (!memberships.some((membership) => membership.organization.id === organizationId)) {
      return;
    }
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== 'auth',
    });
    setSelectedOrganizationId(organizationId);
  }

  async function logout() {
    queryClient.clear();
    setSelectedOrganizationId(null);
    await signOut({ redirectUrl: '/login' });
  }

  const isLoaded = clerkLoaded && (!clerkSignedIn || !bootstrapQuery.isLoading);
  const isReady = Boolean(isLoaded && clerkSignedIn && user);
  // A background outage must not unmount a previously loaded workspace.
  // Definitive access rejection clears the authority even with cached data.
  const error = bootstrapQuery.error && (!bootstrap || accessDenied)
    ? friendlyBootstrapError(bootstrapQuery.error) : null;
  const isRecovering = isTransientQueryError(bootstrapQuery.error);

  return (
    <AuthContext.Provider
      value={{
        isLoaded,
        isReady,
        isSignedIn: Boolean(clerkSignedIn),
        state: bootstrap?.state ?? null,
        error,
        isRecovering,
        user,
        organization: selectedMembership?.organization ?? null,
        memberships,
        selectOrganization,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}

export { ApiError };
