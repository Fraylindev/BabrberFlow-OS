"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function onboardingError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "No pudimos crear el negocio con esos datos. Revisa la información o usa otra cuenta.";
  }
  if (error instanceof ApiError && error.status === 403) {
    return "Verifica el correo principal de tu cuenta antes de continuar.";
  }
  if (error instanceof ApiError && error.status === 503) {
    return "El servicio de acceso no está disponible ahora. Intenta de nuevo en unos minutos.";
  }
  return "No pudimos crear tu espacio de trabajo. Revisa tu conexión e intenta de nuevo.";
}

export default function AuthContinuePage() {
  return (
    <Suspense fallback={null}>
      <AuthContinueContent />
    </Suspense>
  );
}

function AuthContinueContent() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("next");
  const next = requested?.startsWith("/dashboard") ? requested : "/dashboard";
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [organizationEmail, setOrganizationEmail] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isLoaded) return;
    if (!auth.isSignedIn) {
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (auth.isReady) router.replace(next);
  }, [auth.isLoaded, auth.isReady, auth.isSignedIn, next, router]);

  async function submitOnboarding(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post("/auth/clerk/onboarding", {
        organizationName: organizationName.trim(),
        organizationSlug: organizationSlug.trim(),
        organizationEmail: organizationEmail.trim(),
      });
      const result = await auth.refresh();
      if (result?.state === "READY") router.replace(next);
    } catch (error) {
      setSubmitError(onboardingError(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (!auth.isLoaded || auth.isReady) {
    return (
      <AuthShell
        eyebrow="Acceso seguro"
        title="Preparando tu espacio"
        description="Estamos comprobando tus permisos y tu negocio."
      >
        <p role="status" className="text-sm text-[var(--color-muted)]">
          Un momento…
        </p>
      </AuthShell>
    );
  }

  if (auth.error) {
    return (
      <AuthShell
        eyebrow="No pudimos continuar"
        title="Revisa tu acceso"
        description={auth.error}
      >
        <div className="flex w-full flex-col gap-3">
          <Button onClick={() => void auth.refresh()}>Intentar de nuevo</Button>
          <Button variant="secondary" onClick={() => void auth.logout()}>
            Cerrar sesión
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (auth.state === "NO_ACCESS") {
    return (
      <AuthShell
        eyebrow="Acceso pendiente"
        title="Aún no tienes un negocio asignado"
        description="Pide a la persona administradora que revise tu invitación. Si acabas de aceptarla, vuelve a intentarlo."
      >
        <div className="flex w-full flex-col gap-3">
          <Button onClick={() => void auth.refresh()}>Revisar de nuevo</Button>
          <Button variant="secondary" onClick={() => void auth.logout()}>
            Usar otra cuenta
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Último paso"
      title="Configura tu negocio"
      description="Estos datos identificarán tu barbería o salón dentro de Kortek Booking."
    >
      <form
        onSubmit={submitOnboarding}
        className="flex w-full flex-col gap-4 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <InputField
          label="Nombre del negocio"
          name="organizationName"
          value={organizationName}
          onChange={(event) => {
            const value = event.target.value;
            setOrganizationName(value);
            if (!slugTouched) setOrganizationSlug(slugify(value));
          }}
          maxLength={100}
          required
        />
        <InputField
          label="Dirección de reservas"
          name="organizationSlug"
          value={organizationSlug}
          onChange={(event) => {
            setSlugTouched(true);
            setOrganizationSlug(slugify(event.target.value));
          }}
          placeholder="mi-barberia"
          minLength={3}
          maxLength={50}
          required
        />
        <p className="-mt-2 text-xs text-[var(--color-muted)]">
          Tus clientes la usarán para abrir la página de reservas.
        </p>
        <InputField
          label="Correo del negocio"
          name="organizationEmail"
          type="email"
          value={organizationEmail}
          onChange={(event) => setOrganizationEmail(event.target.value)}
          maxLength={254}
          required
        />
        {submitError && (
          <p
            role="alert"
            className="rounded-sm bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]"
          >
            {submitError}
          </p>
        )}

        <div className="flex w-full flex-col gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creando tu espacio…" : "Crear mi negocio"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={() => void auth.logout()}
          >
            Usar otra cuenta
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
