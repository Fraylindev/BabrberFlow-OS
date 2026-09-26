"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { clerkAppearance } from "@/components/auth/clerk-appearance";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import {
  acceptInvitationUrl,
  invitationCompleteUrl,
  invitationIdFromSearchParams,
} from "@/lib/invitation-navigation";

export default function InvitationLoginPage() {
  return (
    <Suspense fallback={null}>
      <InvitationLoginContent />
    </Suspense>
  );
}

function InvitationLoginContent() {
  const searchParams = useSearchParams();
  const invitationId = invitationIdFromSearchParams(searchParams);

  if (!invitationId) {
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

  return (
    <AuthShell
      eyebrow="Invitación de equipo"
      title="Inicia sesión para aceptar"
      description="Usa la cuenta que recibió la invitación. Al entrar, confirmaremos tu acceso al negocio de forma segura."
    >
      <SignIn
        routing="path"
        path={AUTH_ROUTES.invitationLogin}
        signUpUrl={acceptInvitationUrl(invitationId)}
        forceRedirectUrl={invitationCompleteUrl(invitationId)}
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}
