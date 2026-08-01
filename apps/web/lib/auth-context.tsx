"use client";

import { createContext, useContext, useState, ReactNode } from "react";
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
  login: (email: string, password: string) => Promise<void>;
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

function saveSession(session: StoredSession) {
  window.localStorage.setItem("bf_token", session.token);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function loadSession(): StoredSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Inicialización perezosa para evitar el anti-patrón de setState síncrono
  const [session, setSession] = useState<StoredSession | null>(() =>
    typeof window === "undefined" ? null : loadSession(),
  );
  const router = useRouter();

  async function login(email: string, password: string) {
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
    setSession(newSession);
    router.push("/dashboard");
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
    window.localStorage.removeItem("bf_token");
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
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
