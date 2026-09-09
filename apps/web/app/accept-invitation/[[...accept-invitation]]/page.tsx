'use client';

import { SignUp, useAuth as useClerkAuth } from '@clerk/nextjs';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { clerkAppearance } from '@/components/auth/clerk-appearance';
import { AUTH_ROUTES } from '@/lib/auth-routes';
import {
  invitationCompleteUrl,
  invitationIdFromSearchParams,
  invitationLoginUrl,
  retainInvitationId,
} from '@/lib/invitation-navigation';

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitationContent />
    </Suspense>
  );
}

function AcceptInvitationContent() {
  const clerk = useClerkAuth();
  const searchParams = useSearchParams();
  // Clerk can rewrite the URL/hash while the widget changes between sign-up
  // and sign-in. Capture our local UUID once so that rewrite cannot discard
  // the invitation context before the completion route is reached.
  const [invitationId] = useState(() =>
    retainInvitationId(null, invitationIdFromSearchParams(searchParams)),
  );
  const completeUrl = invitationId ? invitationCompleteUrl(invitationId) : null;
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  async function switchToInvitedAccount() {
    if (switchingAccount) return;
    setSwitchingAccount(true);
    setSwitchError(null);
    try {
      await clerk.signOut({ redirectUrl: window.location.href });
    } catch {
      setSwitchError('No pudimos cerrar la sesión actual. Vuelve a intentarlo.');
      setSwitchingAccount(false);
    }
  }

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
        title="Usa la cuenta invitada"
        description="Para evitar activar el acceso en la cuenta equivocada, cierra la sesión actual y continúa con el mismo correo que recibió esta invitación."
      >
        <div className="flex w-full flex-col gap-3">
          {switchError && (
            <p
              role="alert"
              className="rounded-sm bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]"
            >
              {switchError}
            </p>
          )}
          <Button disabled={switchingAccount} onClick={() => void switchToInvitedAccount()}>
            {switchingAccount ? 'Cerrando sesión…' : 'Continuar con otra cuenta'}
          </Button>
        </div>
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
