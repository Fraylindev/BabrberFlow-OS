"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { invitationIdFromSearchParams } from "@/lib/invitation-navigation";

function acceptanceError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "Esta invitación ya no se puede usar. Pide una nueva a la persona administradora.";
  }
  if (error instanceof ApiError && error.status === 503) {
    return "No pudimos confirmar la invitación ahora. Intenta de nuevo en unos minutos.";
  }
  return "No pudimos confirmar tu acceso. Abre de nuevo el enlace original o pide una nueva invitación.";
}

export default function CompleteInvitationPage() {
  return (
    <Suspense fallback={null}>
      <CompleteInvitationContent />
    </Suspense>
  );
}

function CompleteInvitationContent() {
  const { isLoaded, user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const locator = invitationIdFromSearchParams(searchParams);
  const locatorError =
    !locator
      ? "No encontramos una invitación válida para esta cuenta. Abre de nuevo el enlace original o pide una nueva."
      : null;

  useEffect(() => {
    if (
      !isLoaded ||
      !user ||
      !locator ||
      started.current
    ) {
      return;
    }
    started.current = true;

    void (async () => {
      try {
        await api.post(`/auth/clerk/invitations/${locator}/accept`);
        const result = await auth.refresh();
        if (result?.state === "READY") router.replace("/dashboard");
        else setError("La invitación se confirmó, pero el acceso todavía no está disponible.");
      } catch (cause) {
        setError(acceptanceError(cause));
      }
    })();
  }, [auth, isLoaded, locator, router, user]);

  const visibleError = error ?? locatorError;

  if (visibleError) {
    return (
      <AuthShell
        eyebrow="Invitación de equipo"
        title="No pudimos activar tu acceso"
        description={visibleError}
      >
        <div className="flex w-full flex-col gap-3">
          <Button onClick={() => window.location.reload()}>Intentar de nuevo</Button>
          <Button variant="secondary" onClick={() => void auth.logout()}>
            Usar otra cuenta
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Invitación de equipo"
      title="Activando tu acceso"
      description="Estamos confirmando tu invitación y tus permisos en el negocio."
    >
      <p role="status" className="text-sm text-[var(--color-muted)]">
        Un momento…
      </p>
    </AuthShell>
  );
}
