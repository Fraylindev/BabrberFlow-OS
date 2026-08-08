"use client";

import { createContext, useContext, useSyncExternalStore, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, AuthUser, Organization } from "./api";

interface StoredSession {
  token: string;
  user: AuthUser;
  organization: Pick<Organization, "id" | "name" | "slug">;
}

interface AuthContextValue {
  user: AuthUser | null;
  organization: StoredSession["organization"] | null;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  registerOrganization: (input: {
    orgName: string;
    orgSlug: string;
    orgEmail: string;
    ownerName: string;
    ownerEmail: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "bf_session";

// El JWT real vive solo en localStorage (lo usa lib/api.ts en cada request).
// Esta cookie NO lleva el token — es únicamente una bandera de presencia de
// sesión para que middleware.ts (Edge, sin acceso a localStorage) pueda
// decidir si redirige a /login antes de renderizar /dashboard/*. La
// autorización real sigue validándose siempre contra el backend (JwtAuthGuard).
const SESSION_FLAG_COOKIE = "kb_session";

function setSessionFlagCookie(present: boolean) {
  const maxAge = present ? 60 * 60 * 24 * 7 : 0; // 7 días, o borrar
  document.cookie = `${SESSION_FLAG_COOKIE}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

// --- Store externo de la sesión (localStorage) leído vía
// useSyncExternalStore ---
//
// CAUSA RAÍZ de un hydration mismatch que existía antes: inicializar
// useState leyendo localStorage en su inicializador perezoso parece
// evitar el anti-patrón de "setState en el render", pero ese
// inicializador SÍ corre durante el primer render del cliente, antes de
// que termine la hidratación. En el servidor `window` no existe →
// session = null. En el cliente, en ese mismo primer render, `window`
// ya existe → session ya viene poblada. React compara ambos primeros
// renders para hidratar, y no coincidían → mismatch.
//
// `useSyncExternalStore` es la API que React ofrece exactamente para
// este caso: usa `getServerSnapshot` durante el render del servidor y
// la hidratación inicial, y solo después se actualiza al valor real del
// cliente — sin un `useEffect` que llame `setState` manualmente (que
// además dispara el lint de renders en cascada, `set-state-in-effect`).
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined = undefined;
let cachedSession: StoredSession | null = null;

function notify() {
  listeners.forEach((l) => l());
}

function subscribeToSession(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSessionSnapshot(): StoredSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  // Referencia estable si el contenido crudo no cambió — evita que
  // useSyncExternalStore entre en un bucle de re-render infinito por
  // devolver un objeto nuevo en cada llamada.
  if (raw === cachedRaw) return cachedSession;
  cachedRaw = raw;
  if (!raw) {
    cachedSession = null;
    return null;
  }
  try {
    cachedSession = JSON.parse(raw) as StoredSession;
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

function getServerSessionSnapshot(): StoredSession | null {
  return null;
}

function saveSession(session: StoredSession) {
  window.localStorage.setItem("bf_token", session.token);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  setSessionFlagCookie(true);
  notify();
}

function clearSession() {
  window.localStorage.removeItem("bf_token");
  window.localStorage.removeItem(STORAGE_KEY);
  setSessionFlagCookie(false);
  notify();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
  const router = useRouter();

  async function login(email: string, password: string, redirectTo?: string) {
    // El backend ahora resuelve la organización activa internamente
    const response = await api.post<{
      user: AuthUser;
      accessToken: string;
      organization: Pick<Organization, "id" | "name" | "slug">;
    }>("/auth/login", { email, password });

    const newSession: StoredSession = {
      token: response.accessToken,
      user: response.user,
      organization: response.organization,
    };

    saveSession(newSession);
    // Solo se acepta un destino interno al dashboard (evita open-redirect
    // si alguien manipula ?next= con una URL externa).
    const safeRedirect =
      redirectTo && redirectTo.startsWith("/dashboard") ? redirectTo : "/dashboard";
    router.push(safeRedirect);
  }

  async function registerOrganization(input: {
    orgName: string;
    orgSlug: string;
    orgEmail: string;
    ownerName: string;
    ownerEmail: string;
    password: string;
  }) {
    const organization = await api.post<Organization>("/organizations", {
      name: input.orgName,
      slug: input.orgSlug,
      email: input.orgEmail,
    });

    await api.post("/auth/register", {
      name: input.ownerName,
      email: input.ownerEmail,
      password: input.password,
      organizationId: organization.id,
    });

    // Encadenamos el nuevo login de un solo paso
    await login(input.ownerEmail, input.password);
  }

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        organization: session?.organization ?? null,
        login,
        registerOrganization,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

export { ApiError };
