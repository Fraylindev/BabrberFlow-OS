"use client";

import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";
import { clerkAppearance } from "@/components/auth/clerk-appearance";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Nueva cuenta"
      title="Crea el acceso de tu negocio"
      description="Primero protege tu cuenta. Después te pediremos únicamente los datos necesarios de tu barbería o salón."
    >
      <SignUp
        routing="path"
        path="/register"
        signInUrl="/login"
        forceRedirectUrl="/auth/continue?mode=onboarding"
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}
