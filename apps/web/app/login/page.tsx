"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth, ApiError } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { Brand } from "@/components/Brand";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // El backend ahora resuelve la organización automáticamente usando el correo
      await login(email.trim(), password, next);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No pudimos conectar con el servidor. Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Brand />
          <p className="text-sm text-[var(--color-muted)]">
            Entra a tu panel de control
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        >
          <InputField
            label="Correo"
            name="email"
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <PasswordField
            label="Contraseña"
            name="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && (
            <p
              role="alert"
              className="rounded-sm bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]"
            >
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          ¿Primera vez aquí?{" "}
          <Link
            href="/register"
            className="text-[var(--color-brass)] hover:text-[var(--color-brass-hover)]"
          >
            Registra tu negocio
          </Link>
        </p>
      </div>
    </main>
  );
}
