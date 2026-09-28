import { useEffect, type ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { SettingsScreen } from './SettingsScreen';

const session = vi.hoisted(() => ({ user: { id: 'actor', organizationId: 'A', role: 'OWNER' }, organization: { id: 'A' }, isReady: true }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => session }));
vi.mock('@/components/cms/CmsSettings', () => ({ CmsSettings: () => <p>Página pública controlada</p> }));

it('loads new observers after auth clears the prior scope cache, also A → B → A', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(api, 'get').mockImplementation(async path => {
    await Promise.resolve();
    if (path.endsWith('/regions')) return [{ id: 'santo-domingo', label: 'Santo Domingo' }];
    if (path.endsWith('/closures')) return { items: [], total: 0, offset: 0, limit: 20 };
    return { revision: 0, state: 'CONFIRMED', zoneConfirmed: true, timeZone: 'America/Santo_Domingo', region: { id: 'santo-domingo', label: `Negocio ${session.organization.id}` }, activeClosureCount: 0, week: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, windows: [{ startTime: '09:00', endTime: '19:00' }] })) };
  });
  function AuthCacheBoundary({ scope, children }: { scope: string; children: ReactNode }) {
    useEffect(() => { client.removeQueries({ predicate: query => query.queryKey[0] !== 'auth' }); }, [scope]);
    return children;
  }
  const tree = () => <QueryClientProvider client={client}><AuthCacheBoundary scope={session.organization.id}><SettingsScreen /></AuthCacheBoundary></QueryClientProvider>;
  const view = render(tree());
  await screen.findByText('Horario confirmado · Negocio A · Hora del negocio');
  fireEvent.change(screen.getByLabelText('Hasta · Lunes 1'), { target: { value: '18:00' } });
  session.user = { ...session.user, organizationId: 'B' }; session.organization = { id: 'B' }; view.rerender(tree());
  await screen.findByText('Horario confirmado · Negocio B · Hora del negocio');
  expect(screen.getByLabelText('Hasta · Lunes 1')).toHaveValue('19:00');
  session.user = { ...session.user, organizationId: 'A' }; session.organization = { id: 'A' }; view.rerender(tree());
  await screen.findByText('Horario confirmado · Negocio A · Hora del negocio');
  expect(screen.getByLabelText('Hasta · Lunes 1')).toHaveValue('19:00');
});
