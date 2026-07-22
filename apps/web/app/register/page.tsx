"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth, ApiError } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { Brand } from "@/components/Brand";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function RegisterPage() {
  const { registerOrganization } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [orgEmail, setOrgEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleOrgNameChange(value: string) {
    setOrgName(value);
    if (!slugTouched) setOrgSlug(slugify(value));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerOrganization({
        orgName: orgName.trim(),
        orgSlug: orgSlug.trim(),
        orgEmail: orgEmail.trim(),
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
        password,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No pudimos conectar con el servidor. Intenta de nuevo.",
      );
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Brand />
          <p className="text-sm text-[var(--color-muted)]">
            Registra tu barbería y crea tu cuenta de dueño
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        >
          <p className="text-xs uppercase tracking-wider text-[var(--color-brass)]">
            Tu barbería
          </p>
          <InputField
            label="Nombre del negocio"
            name="orgName"
            placeholder="Elite Barber Shop"
            value={orgName}
            onChange={(e) => handleOrgNameChange(e.target.value)}
            required
          />
          <InputField
            label="Slug (usarás esto para entrar)"
            name="orgSlug"
            placeholder="elite-barber-shop"
            value={orgSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setOrgSlug(slugify(e.target.value));
            }}
            required
          />
          <InputField
            label="Correo del negocio"
            name="orgEmail"
            type="email"
            placeholder="contacto@elitebarber.com"
            value={orgEmail}
            onChange={(e) => setOrgEmail(e.target.value)}
            required
          />

          <p className="mt-2 text-xs uppercase tracking-wider text-[var(--color-brass)]">
            Tu cuenta (dueño)
          </p>
          <InputField
            label="Tu nombre"
            name="ownerName"
            placeholder="Fraylin Peña"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            required
          />
          <InputField
            label="Tu correo"
            name="ownerEmail"
            type="email"
            placeholder="tu@correo.com"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
          />
          <InputField
            label="Contraseña"
            name="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
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
            {loading ? "Creando…" : "Crear mi barbería"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-[var(--color-brass)] hover:text-[var(--color-brass-hover)]"
          >
            Entra aquí
          </Link>
        </p>
      </div>
    </main>
  );
}
