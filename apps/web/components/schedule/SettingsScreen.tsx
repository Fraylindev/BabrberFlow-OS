'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { CmsSettings } from '@/components/cms/CmsSettings';
import { PageHeader } from '@/components/ui/PageHeader';
import { BusinessScheduleSettings } from './BusinessScheduleSettings';
export function SettingsScreen() {
  const { user, isReady } = useAuth();
  const scope = user ? `${user.id}:${user.organizationId}:${user.role}` : 'no-context';
  return (
    <SettingsVisit
      key={scope}
      manages={Boolean(isReady && user && ['OWNER', 'ADMIN'].includes(user.role))}
    />
  );
}
function SettingsVisit({ manages }: { manages: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // AuthProvider clears business queries after a scope change. New observers
    // must mount after that commit, including a complete A → B → A visit.
    let active = true;
    queueMicrotask(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        tone="light"
        title="Configuración del negocio"
        description="Organiza la atención y prepara la información pública."
      />
      {ready ? (
        <>
          <BusinessScheduleSettings />
          {manages && <CmsSettings />}
        </>
      ) : (
        <p role="status">Cargando configuración…</p>
      )}
    </div>
  );
}
