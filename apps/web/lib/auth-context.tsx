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
  login: (
    orgSlug: string,
    email: string,
    password: string,
  ) => Promise<void>;
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

async function resolveOrganization(slug: string) {
  return api.get<Pick<Organization, "id" | "name" | "slug">>(
    `/organizations/by-slug/${encodeURIComponent(slug)}`,
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Inicialización perezosa: se ejecuta durante el mount (incluida la
  // hidratación en cliente), nunca dentro de un efecto — evita el
  // anti-patrón de "setState síncrono en un efecto".
  const [session, setSession] = useState<StoredSession | null>(() =>
    typeof window === "undefined" ? null : loadSession(),
  );
  const router = useRouter();

  async function login(orgSlug: string, email: string, password: string) {
    const organization = await resolveOrganization(orgSlug);
    const { user, accessToken } = await api.post<{
      user: AuthUser;
      accessToken: string;
    }>("/auth/login", { email, password, organizationId: organization.id });

    const newSession: StoredSession = {
      token: accessToken,
      user,
      organization,
    };
    saveSession(newSession);
    setSession(newSession);
    router.push("/");
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

    // El registro no devuelve token — encadenamos un login para que el
    // dueño entre directo a su panel sin escribir sus datos dos veces.
    await login(input.orgSlug, input.ownerEmail, input.password);
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
