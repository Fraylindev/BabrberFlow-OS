'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export default function DashboardAccessPage() {
  const auth = useAuth();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        tone="light"
        title="Tu cuenta está lista"
        description="Todavía no tienes acceso a una organización de Kortek Booking."
      />
      <Card tone="light" className="p-5 sm:p-7">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--dash-text)]">
          Revisa tu invitación
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--dash-text-muted)]">
          Abre la invitación más reciente desde tu correo y continúa con la misma cuenta que la
          recibió. Si ya la aceptaste, puedes revisar el acceso de nuevo.
        </p>
        <Button tone="light" className="mt-5" onClick={() => void auth.refresh()}>
          Revisar acceso
        </Button>
      </Card>
    </div>
  );
}
