"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { clerkAppearance } from "@/components/auth/clerk-appearance";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("next");
  const next = requested?.startsWith("/dashboard") ? requested : "/dashboard";
  const continueUrl = `/auth/continue?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      eyebrow="Acceso seguro"
      title="Entra a tu espacio de trabajo"
      description="Usa tu cuenta para continuar. Si olvidaste tu contraseña, puedes recuperarla aquí mismo."
    >
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/register"
        forceRedirectUrl={continueUrl}
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}
