'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import {
  invitationAcceptanceIssue,
  invitationIdFromSearchParams,
  invitationProfileNeedsName,
} from '@/lib/invitation-navigation';

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
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [nameSaveCompleted, setNameSaveCompleted] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaving, setNameSaving] = useState(false);
  const [error, setError] = useState<{
    message: string;
    retryable: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [locator] = useState(() => invitationIdFromSearchParams(searchParams));
  const needsName = Boolean(user && invitationProfileNeedsName(user.fullName, nameSaveCompleted));
  const locatorError = !locator
    ? 'No encontramos una invitación válida para esta cuenta. Abre de nuevo el enlace original o pide una nueva.'
    : null;

  useEffect(() => {
    if (!isLoaded || !user || !locator || needsName || started.current) {
      return;
    }
    started.current = true;

    void (async () => {
      try {
        await api.post(`/auth/clerk/invitations/${locator}/accept`);
        const result = await auth.refresh();
        if (result?.state === 'READY') router.replace('/dashboard');
        else {
          setError({
            message:
              'La invitación se confirmó, pero no pudimos cargar el acceso. Vuelve a intentarlo.',
            retryable: true,
          });
        }
      } catch (cause) {
        setError(
          invitationAcceptanceIssue(
            cause instanceof ApiError ? cause.status : null,
            cause instanceof ApiError ? cause.retryAfterSeconds : null,
          ),
        );
      }
    })();
  }, [attempt, auth, isLoaded, locator, needsName, router, user]);

  function retryAcceptance() {
    started.current = false;
    setError(null);
    setAttempt((current) => current + 1);
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || nameSaving) return;
    const normalized = (nameOverride ?? '').trim().replace(/\s+/g, ' ');
    if (normalized.length < 2) {
      setNameError('Escribe tu nombre para continuar.');
      return;
    }
    if (normalized.length > 120) {
      setNameError('El nombre no puede superar 120 caracteres.');
      return;
    }

    setNameError(null);
    setError(null);
    setNameSaving(true);
    try {
      await user.update({ firstName: normalized });
      setNameSaveCompleted(true);
    } catch {
      setNameError('No pudimos guardar tu nombre. Revisa tu conexión y vuelve a intentarlo.');
    } finally {
      setNameSaving(false);
    }
  }

  if (locatorError) {
    return (
      <AuthShell
        eyebrow="Invitación de equipo"
        title="No pudimos activar tu acceso"
        description={locatorError}
      >
        <div className="flex w-full flex-col gap-3">
          <Button onClick={() => void auth.logout()}>Cerrar sesión</Button>
        </div>
      </AuthShell>
    );
  }

  if (!isLoaded || !user) {
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

  if (needsName) {
    return (
      <AuthShell
        eyebrow="Invitación de equipo"
        title="Completa tu perfil"
        description="Indica tu nombre para activar el acceso a la organización."
      >
        <form className="flex w-full flex-col gap-4" onSubmit={saveName}>
          <InputField
            label="Nombre"
            id="invitation-name"
            value={nameOverride ?? ''}
            onChange={(event) => setNameOverride(event.target.value)}
            autoComplete="name"
            maxLength={120}
            error={nameError ?? undefined}
            autoFocus
          />
          <Button type="submit" disabled={nameSaving}>
            {nameSaving ? 'Guardando…' : 'Continuar'}
          </Button>
        </form>
      </AuthShell>
    );
  }

  if (error) {
    return (
      <AuthShell
        eyebrow="Invitación de equipo"
        title="No pudimos activar tu acceso"
        description={error.message}
      >
        <div className="flex w-full flex-col gap-3">
          {error.retryable && <Button onClick={retryAcceptance}>Intentar de nuevo</Button>}
          <Button variant="secondary" onClick={() => void auth.logout()}>
            Cerrar sesión
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
