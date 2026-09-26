'use client';

import { Suspense, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { runAuthOperation } from '@/lib/auth-operation';
import { completeInvitationAccess } from '@/lib/invitation-completion';
import {
  invitationAcceptanceIssue,
  invitationIdFromSearchParams,
  invitationProfileNeedsName,
  invitationLoginUrl,
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
  const searchParams = useSearchParams();
  const locator = invitationIdFromSearchParams(searchParams);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => setLoadTimedOut(true), 15_000);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  if (!locator) {
    return (
      <AuthShell
        eyebrow="Invitación de equipo"
        title="No pudimos activar tu acceso"
        description="No encontramos una invitación válida. Abre de nuevo el enlace original o pide una nueva."
      >
        <Button onClick={() => void auth.logout()}>Cerrar sesión</Button>
      </AuthShell>
    );
  }
  if (!isLoaded) {
    return (
      <AuthShell
        eyebrow="Invitación de equipo"
        title={loadTimedOut ? 'No pudimos consultar tu sesión' : 'Consultando tu sesión'}
        description={
          loadTimedOut
            ? 'Revisa tu conexión y vuelve a intentarlo.'
            : 'Estamos comprobando tu acceso.'
        }
      >
        {loadTimedOut ? (
          <Button onClick={() => window.location.reload()}>Intentar de nuevo</Button>
        ) : (
          <p role="status">Un momento…</p>
        )}
      </AuthShell>
    );
  }
  if (!user) {
    return (
      <AuthShell
        eyebrow="Invitación de equipo"
        title="Inicia sesión para continuar"
        description="Usa el mismo correo que recibió la invitación."
      >
        <Link href={invitationLoginUrl(locator)} className="font-medium underline">
          Iniciar sesión
        </Link>
      </AuthShell>
    );
  }
  return <SignedInInvitation key={`${user.id}:${locator}`} user={user} locator={locator} />;
}

function SignedInInvitation({
  user,
  locator,
}: {
  user: NonNullable<ReturnType<typeof useUser>['user']>;
  locator: string;
}) {
  const auth = useAuth();
  const refresh = auth.refresh;
  const router = useRouter();
  const visit = useRef<AbortController | null>(null);
  useLayoutEffect(() => {
    const controller = new AbortController();
    visit.current = controller;
    return () => controller.abort();
  }, []);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [nameSaveCompleted, setNameSaveCompleted] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaving, setNameSaving] = useState(false);
  const [error, setError] = useState<{
    message: string;
    retryable: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const needsName =
    Boolean(nameError) || invitationProfileNeedsName(user.fullName, nameSaveCompleted);

  useEffect(() => {
    if (needsName || nameSaving) return;
    const controller = new AbortController();

    void (async () => {
      try {
        const ready = await completeInvitationAccess(
          (signal) => api.post(`/auth/clerk/invitations/${locator}/accept`, undefined, { signal }),
          refresh,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        if (ready) router.replace('/dashboard');
        else {
          setError({
            message:
              'La invitación se confirmó, pero no pudimos cargar el acceso. Vuelve a intentarlo.',
            retryable: true,
          });
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          invitationAcceptanceIssue(
            cause instanceof ApiError ? cause.status : null,
            cause instanceof ApiError ? cause.retryAfterSeconds : null,
          ),
        );
      }
    })();
    return () => controller.abort();
  }, [attempt, refresh, locator, needsName, nameSaving, router]);

  function retryAcceptance() {
    setError(null);
    setAttempt((current) => current + 1);
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const controller = visit.current;
    if (!controller || controller.signal.aborted || nameSaving) return;
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
      await runAuthOperation(() => user.update({ firstName: normalized }), controller.signal);
      if (controller.signal.aborted) return;
      setNameSaveCompleted(true);
    } catch {
      if (controller.signal.aborted) return;
      setNameError('No pudimos guardar tu nombre. Revisa tu conexión y vuelve a intentarlo.');
    } finally {
      if (!controller.signal.aborted) setNameSaving(false);
    }
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
