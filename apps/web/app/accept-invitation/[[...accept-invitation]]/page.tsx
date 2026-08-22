"use client";

import { SignUp, useAuth as useClerkAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { clerkAppearance } from "@/components/auth/clerk-appearance";

export default function AcceptInvitationPage() {
  const clerk = useClerkAuth();
  const router = useRouter();

  useEffect(() => {
    if (clerk.isLoaded && clerk.isSignedIn) {
      router.replace("/auth/invitation/complete");
    }
  }, [clerk.isLoaded, clerk.isSignedIn, router]);

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
        path="/accept-invitation"
        signInUrl="/login"
        forceRedirectUrl="/auth/invitation/complete"
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}
