'use client';

import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '@/components/auth/AuthShell';
import { clerkAppearance } from '@/components/auth/clerk-appearance';
import { AUTH_ROUTES } from '@/lib/auth-routes';

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Nueva cuenta"
      title="Crea el acceso de tu negocio"
      description="Primero protege tu cuenta. Después te pediremos únicamente los datos necesarios de tu barbería o salón."
    >
      <SignUp
        routing="path"
        path={AUTH_ROUTES.register}
        signInUrl={AUTH_ROUTES.login}
        forceRedirectUrl={AUTH_ROUTES.dashboardSetup}
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}
