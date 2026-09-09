'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AUTH_ROUTES } from '@/lib/auth-routes';
import {
  organizationOnboardingPayload,
  organizationSlugFromName,
} from '@/lib/organization-onboarding';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InputField } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';

function onboardingError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return 'No pudimos crear el negocio con esos datos. Revisa la información o usa otra cuenta.';
  }
  if (error instanceof ApiError && error.status === 403) {
    return 'Verifica el correo principal de tu cuenta en Clerk antes de continuar.';
  }
  if (error instanceof ApiError && error.status === 400) {
    return 'Revisa el nombre del negocio, su dirección de reservas y el correo antes de continuar.';
  }
  if (error instanceof ApiError && error.status === 503) {
    return 'El servicio de acceso no está disponible ahora. Vuelve a intentarlo.';
  }
  return 'No pudimos crear tu negocio. Revisa tu conexión y vuelve a intentarlo.';
}

export default function DashboardSetupPage() {
  const auth = useAuth();
  const { user: clerkUser, isLoaded: profileLoaded } = useUser();
  const router = useRouter();
  const [personalName, setPersonalName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [organizationEmail, setOrganizationEmail] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submitOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !profileLoaded || !clerkUser) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (!clerkUser.fullName?.trim() && !clerkUser.username?.trim()) {
        const normalizedName = personalName.trim().replace(/\s+/g, ' ');
        if (normalizedName.length < 2 || normalizedName.length > 120) {
          setSubmitError('Escribe tu nombre completo para continuar.');
          return;
        }
        await clerkUser.update({ firstName: normalizedName });
      }
      await api.post(
        '/auth/clerk/onboarding',
        organizationOnboardingPayload({
          organizationName,
          organizationSlug,
          organizationEmail,
        }),
      );
      const result = await auth.refresh();
      if (result?.state === 'READY') {
        router.replace(AUTH_ROUTES.dashboard);
      } else {
        setSubmitError('El negocio se creó, pero no pudimos abrirlo. Vuelve a intentarlo.');
      }
    } catch (error) {
      setSubmitError(onboardingError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        tone="light"
        title="Configura tu negocio"
        description="Tu cuenta ya está protegida con Clerk. Completa ahora los datos que identificarán tu barbería o salón en Kortek Booking."
      />

      <Card tone="light" className="p-5 sm:p-7">
        <form onSubmit={submitOnboarding} className="flex flex-col gap-5">
          {profileLoaded && clerkUser && !clerkUser.fullName?.trim() && !clerkUser.username?.trim() && (
            <InputField
              tone="light"
              label="Tu nombre"
              name="personalName"
              value={personalName}
              onChange={(event) => setPersonalName(event.target.value)}
              autoComplete="name"
              minLength={2}
              maxLength={120}
              required
            />
          )}
          <InputField
            tone="light"
            label="Nombre del negocio"
            name="organizationName"
            value={organizationName}
            onChange={(event) => {
              const value = event.target.value;
              setOrganizationName(value);
              if (!slugTouched) {
                setOrganizationSlug(organizationSlugFromName(value));
              }
            }}
            maxLength={100}
            minLength={2}
            autoComplete="organization"
            required
          />
          <div>
            <InputField
              tone="light"
              label="Dirección de reservas"
              name="organizationSlug"
              value={organizationSlug}
              onChange={(event) => {
                setSlugTouched(true);
                setOrganizationSlug(organizationSlugFromName(event.target.value));
              }}
              placeholder="mi-barberia"
              minLength={3}
              maxLength={50}
              required
            />
            <p className="mt-1.5 text-xs text-[var(--dash-text-muted)]">
              Tus clientes la usarán para abrir la página de reservas.
            </p>
          </div>
          <InputField
            tone="light"
            label="Correo del negocio"
            name="organizationEmail"
            type="email"
            value={organizationEmail}
            onChange={(event) => setOrganizationEmail(event.target.value)}
            maxLength={254}
            autoComplete="email"
            required
          />

          {submitError && (
            <p
              role="alert"
              className="rounded-sm bg-[var(--dash-danger-bg)] px-3 py-2 text-sm text-[var(--dash-danger)]"
            >
              {submitError}
            </p>
          )}

          <div className="flex justify-end">
            <Button tone="light" type="submit" disabled={submitting || !profileLoaded || !clerkUser}>
              {submitting ? 'Creando negocio…' : 'Entrar a mi panel'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
