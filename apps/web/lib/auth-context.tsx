"use client";

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
} from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  ApiError,
  type AuthUser,
  type ClerkBootstrapResponse,
  type ClerkBootstrapState,
  type ClerkMembership,
  configureApiAuth,
} from "./api";

interface AuthContextValue {
  isLoaded: boolean;
  isReady: boolean;
  isSignedIn: boolean;
  state: ClerkBootstrapState | null;
  error: string | null;
  user: AuthUser | null;
  organization: ClerkMembership["organization"] | null;
  memberships: ClerkMembership[];
  selectOrganization: (organizationId: string) => void;
  refresh: () => Promise<ClerkBootstrapResponse | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function clearLegacySession() {
  window.localStorage.removeItem("bf_token");
  window.localStorage.removeItem("bf_session");
  document.cookie = "kb_session=; path=/; max-age=0; SameSite=Lax";
}

function friendlyBootstrapError(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return "Tu sesión ya no está disponible. Vuelve a iniciar sesión.";
  }
  if (error instanceof ApiError && error.status === 503) {
    return "El acceso no está disponible en este momento. Intenta de nuevo en unos minutos.";
  }
  return "No pudimos preparar tu espacio de trabajo. Revisa tu conexión e intenta de nuevo.";
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

  const bootstrapQuery = useQuery({
    queryKey: ["auth", "clerk-bootstrap", userId],
    queryFn: () => api.get<ClerkBootstrapResponse>("/auth/clerk/bootstrap"),
    enabled: clerkLoaded && clerkSignedIn,
    retry: false,
    staleTime: 0,
  });

  const bootstrap = clerkSignedIn ? bootstrapQuery.data ?? null : null;
  const memberships = useMemo(
    () => bootstrap?.memberships ?? [],
    [bootstrap?.memberships],
  );
  const selectedMembership = useMemo(() => {
    const selected = memberships.find(
      ({ organization }) => organization.id === selectedOrganizationId,
    );
    if (selected) return selected;
    const preferred = memberships.find(
      ({ organization }) =>
        organization.id === bootstrap?.preferredOrganizationId,
    );
    return preferred ?? memberships[0] ?? null;
  }, [bootstrap?.preferredOrganizationId, memberships, selectedOrganizationId]);

  useLayoutEffect(() => {
    clearLegacySession();
    return configureApiAuth(async () => ({
      token: await getToken(),
      organizationId: selectedMembership?.organization.id ?? null,
    }));
  }, [getToken, selectedMembership?.organization.id]);

  const refresh = useCallback(async () => {
    if (!clerkLoaded || !clerkSignedIn) return null;
    const result = await bootstrapQuery.refetch();
    return result.data ?? null;
  }, [bootstrapQuery, clerkLoaded, clerkSignedIn]);

  const user =
    bootstrap?.user && selectedMembership
      ? {
          id: bootstrap.user.id,
          name: bootstrap.user.name,
          role: selectedMembership.role,
          organizationId: selectedMembership.organization.id,
        }
      : null;
  const businessScope = user
    ? `${user.id}:${user.organizationId}:${user.role}`
    : null;
  const previousBusinessScope = useRef<string | null>(null);

  useEffect(() => {
    const previous = previousBusinessScope.current;
    if (previous && businessScope && previous !== businessScope) {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "auth",
      });
    }
    previousBusinessScope.current = businessScope;
  }, [businessScope, queryClient]);

  function selectOrganization(organizationId: string) {
    if (
      !memberships.some(
        (membership) => membership.organization.id === organizationId,
      )
    ) {
      return;
    }
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== "auth",
    });
    setSelectedOrganizationId(organizationId);
  }

  async function logout() {
    queryClient.clear();
    setSelectedOrganizationId(null);
    await signOut({ redirectUrl: "/login" });
  }

  const isLoaded =
    clerkLoaded &&
    (!clerkSignedIn || !bootstrapQuery.isLoading);
  const isReady = Boolean(isLoaded && clerkSignedIn && user);
  const error = bootstrapQuery.error
    ? friendlyBootstrapError(bootstrapQuery.error)
    : null;

  return (
    <AuthContext.Provider
      value={{
        isLoaded,
        isReady,
        isSignedIn: Boolean(clerkSignedIn),
        state: bootstrap?.state ?? null,
        error,
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
  if (!context) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return context;
}

export { ApiError };
