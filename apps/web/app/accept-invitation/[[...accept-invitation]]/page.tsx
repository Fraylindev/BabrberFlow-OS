"use client";

import { SignUp, useAuth as useClerkAuth } from "@clerk/nextjs";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { clerkAppearance } from "@/components/auth/clerk-appearance";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import {
  invitationCompleteUrl,
  invitationIdFromSearchParams,
  invitationLoginUrl,
} from "@/lib/invitation-navigation";

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitationContent />
    </Suspense>
  );
}

function AcceptInvitationContent() {
  const clerk = useClerkAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = invitationIdFromSearchParams(searchParams);
  const completeUrl = invitationId
    ? invitationCompleteUrl(invitationId)
    : null;

  useEffect(() => {
    if (clerk.isLoaded && clerk.isSignedIn && completeUrl) {
      router.replace(completeUrl);
    }
  }, [clerk.isLoaded, clerk.isSignedIn, completeUrl, router]);

  if (!invitationId || !completeUrl) {
    return (
      <AuthShell
        eyebrow="Invitación de equipo"
        title="No pudimos abrir la invitación"
        description="El enlace no está completo o ya no es válido. Pide una nueva invitación a la persona administradora."
      >
        <p role="alert" className="text-sm text-[var(--color-muted)]">
          No se pudo continuar con este enlace.
        </p>
      </AuthShell>
    );
  }

  if (clerk.isLoaded && clerk.isSignedIn) {
    return (
      <AuthShell
        eyebrow="Invitación de equipo"
        title="Preparando tu acceso"
        description="Estamos confirmando el espacio de trabajo al que te invitaron."
      >
        <p role="status" className="text-sm text-[var(--color-muted)]">
          Un momento…
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Invitación de equipo"
      title="Activa tu acceso"
      description="Completa tu cuenta para entrar al negocio que te invitó. La invitación define tu acceso de forma segura."
    >
      <SignUp
        routing="path"
        path={AUTH_ROUTES.acceptInvitation}
        signInUrl={invitationLoginUrl(invitationId)}
        signInForceRedirectUrl={completeUrl}
        forceRedirectUrl={completeUrl}
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}
