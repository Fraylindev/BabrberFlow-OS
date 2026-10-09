import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { createQueryClient } from '@/lib/query-client';

const clerk = vi.hoisted(() => ({
  getToken: vi.fn(async () => 'qa-synthetic-token'),
  userId: 'A',
}));
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken: clerk.getToken, isLoaded: true, isSignedIn: true, userId: clerk.userId, signOut: vi.fn() }) }));
afterEach(() => { vi.unstubAllGlobals(); clerk.userId = 'A'; clerk.getToken.mockClear(); });

function Draft() {
  const [draft, setDraft] = useState('');
  return <input aria-label="Borrador" value={draft} onChange={(event) => setDraft(event.target.value)} />;
}
function Workspace() {
  const auth = useAuth();
  if (auth.error) return <p role="alert">{auth.error}</p>;
  if (!auth.user) return <p role="status">{auth.state ?? 'Cargando'}</p>;
  return <Draft key={`${auth.user.id}:${auth.user.organizationId}:${auth.user.role}`} />;
}
const bootstrap = (id = 'A') => ({ state: 'READY', user: { id, name: 'QA' }, preferredOrganizationId: 'org', memberships: [{ role: 'OWNER', organization: { id: 'org', name: 'QA', slug: 'qa' } }] });
function mount() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retryDelay: 0 } });
  const tree = <QueryClientProvider client={client}><AuthProvider><Workspace /></AuthProvider></QueryClientProvider>;
  const view = render(tree);
  return { client, view, tree };
}

describe('F0-B: recuperación de acceso sin perder la pantalla', () => {
  it('recupera el bootstrap inicial sin intervención tras un fallo de servicio', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => ++calls === 1 ? Response.json({}, { status: 503 }) : Response.json(bootstrap())));
    const { client, view } = mount();
    expect(await screen.findByLabelText('Borrador')).toBeInTheDocument();
    expect(calls).toBe(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    view.unmount(); client.clear();
  });
  it('un fallo transitorio de refetch conserva el nodo y el borrador; se recupera después', async () => {
    let outage = false;
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(outage ? {} : bootstrap(), { status: outage ? 503 : 200 })));
    const { client, view } = mount();
    const input = await screen.findByLabelText('Borrador');
    fireEvent.change(input, { target: { value: 'Trabajo sin guardar' } });
    outage = true;
    await act(async () => { await client.refetchQueries({ queryKey: ['auth', 'clerk-bootstrap'] }); });
    expect(screen.getByLabelText('Borrador')).toBe(input);
    expect(input).toHaveValue('Trabajo sin guardar');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    outage = false;
    await act(async () => { await client.refetchQueries({ queryKey: ['auth', 'clerk-bootstrap'] }); });
    expect(screen.getByLabelText('Borrador')).toBe(input);
    view.unmount(); client.clear();
  });
  it('un rechazo definitivo no mantiene el acceso ni la caché del negocio anterior', async () => {
    let revoked = false;
    const fetchMock = vi.fn(async () => Response.json(revoked ? {} : bootstrap(), { status: revoked ? 401 : 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { client, view } = mount();
    await screen.findByLabelText('Borrador');
    client.setQueryData(['bookings', 'A:org:OWNER'], [{ id: 'private' }]);
    revoked = true;
    await act(async () => { await client.refetchQueries({ queryKey: ['auth', 'clerk-bootstrap'] }); });
    expect(await screen.findByRole('alert')).toHaveTextContent('Tu sesión ya no está disponible');
    expect(screen.queryByLabelText('Borrador')).not.toBeInTheDocument();
    await waitFor(() => expect(client.getQueryData(['bookings', 'A:org:OWNER'])).toBeUndefined());
    expect(clerk.getToken).toHaveBeenCalledWith({ skipCache: true });
    expect(fetchMock).toHaveBeenCalledTimes(3); // one load + exactly two auth attempts
    view.unmount(); client.clear();
  });
  it('una identidad nueva no recibe el borrador de la identidad anterior', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(bootstrap(clerk.userId))));
    const { client, view, tree } = mount();
    fireEvent.change(await screen.findByLabelText('Borrador'), { target: { value: 'Privado A' } });
    clerk.userId = 'B';
    view.rerender(tree);
    // Force the provider to rerender with the new mocked Clerk identity.
    view.rerender(<QueryClientProvider client={client}><AuthProvider><Workspace /></AuthProvider></QueryClientProvider>);
    await waitFor(() => expect(screen.getByLabelText('Borrador')).toHaveValue(''));
    view.unmount(); client.clear();
  });
});
