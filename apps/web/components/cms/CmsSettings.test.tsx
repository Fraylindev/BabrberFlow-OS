import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '@/lib/api';
import type { CmsEditor, CmsPreview } from '@/lib/cms-ui';
import { CmsSettings } from './CmsSettings';

const session = vi.hoisted(() => ({
  user: { id: 'actor-a', role: 'OWNER', organizationId: 'tenant-a' },
  organization: { id: 'tenant-a', name: 'Operativo A', slug: 'negocio-a' },
  isReady: true,
  refresh: vi.fn(),
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => session }));

function editor(name = 'Nombre A', version = 0): CmsEditor {
  return {
    version,
    isPublished: false,
    publishedRevision: null,
    draftRevision: version,
    draft: { publicName: name, description: null, phone: null, address: null, googleMapsUrl: null },
    publishedSnapshot: null,
    readOnly: { slug: 'negocio-a', businessHours: null, timeZone: 'America/Santo_Domingo' },
  };
}
function preview(data: CmsEditor): CmsPreview {
  return {
    version: data.version,
    draftRevision: data.draftRevision,
    content: data.draft,
    slug: data.readOnly.slug,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const tree = () => (
    <QueryClientProvider client={client}>
      <CmsSettings />
    </QueryClientProvider>
  );
  const rendered = render(tree());
  return { ...rendered, client, change: () => rendered.rerender(tree()) };
}
const nameField = () => screen.getByRole('textbox', { name: 'Nombre público' });

beforeEach(() => {
  session.user = { id: 'actor-a', role: 'OWNER', organizationId: 'tenant-a' };
  session.organization = { id: 'tenant-a', name: 'Operativo A', slug: 'negocio-a' };
  session.isReady = true;
  vi.spyOn(api, 'get').mockResolvedValue(editor());
  vi.spyOn(api, 'patch').mockResolvedValue({
    version: 1,
    isPublished: false,
    publishedRevision: null,
  });
  vi.spyOn(api, 'post').mockResolvedValue({ version: 1, isPublished: true, publishedRevision: 0 });
});

describe('Configuración C2', () => {
  it.each(['BARBER', 'RECEPTIONIST'])('no monta consultas ni editor para %s', (role) => {
    session.user.role = role;
    mount();
    expect(
      screen.getByText('No tienes acceso a la configuración del negocio.'),
    ).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('distingue carga/error de vacío y recupera con lectura privada', async () => {
    const pending = deferred<CmsEditor>();
    vi.mocked(api.get).mockReturnValueOnce(pending.promise);
    mount();
    expect(screen.getByText('Cargando configuración…')).toBeInTheDocument();
    await act(async () => pending.reject(new ApiError(503, 'Prisma private detail')));
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar carga' }));
    expect(await screen.findByRole('textbox', { name: 'Nombre público' })).toHaveValue('Nombre A');
    expect(screen.getByText('Sin publicar')).toBeInTheDocument();
    expect(screen.queryByText(/Prisma/)).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      '/organizations/mine/cms',
      undefined,
      expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }),
    );
  });

  it('guarda exclusivamente los cinco campos y controles; preview usa el borrador releído', async () => {
    mount();
    await screen.findByRole('textbox', { name: 'Nombre público' });
    fireEvent.change(nameField(), { target: { value: '  Nuevo nombre  ' } });
    expect(screen.getByRole('button', { name: 'Vista previa' })).toBeDisabled();
    vi.mocked(api.get).mockResolvedValueOnce(editor('Nuevo nombre', 1));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(nameField()).toHaveValue('Nuevo nombre'));
    const body = vi.mocked(api.patch).mock.calls[0][1];
    expect(body).toEqual({
      publicName: 'Nuevo nombre',
      description: null,
      phone: null,
      address: null,
      googleMapsUrl: null,
      expectedVersion: 0,
      idempotencyKey: expect.stringMatching(/^[0-9a-f-]{14}4[0-9a-f-]{21}$/),
    });
    expect(api.post).not.toHaveBeenCalled();
    vi.mocked(api.get).mockResolvedValueOnce(preview(editor('Nuevo nombre', 1)));
    fireEvent.click(screen.getByRole('button', { name: 'Vista previa' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Nuevo nombre')).toBeInTheDocument();
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith(
      '/organizations/mine/cms/preview',
      undefined,
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('ADMIN puede revisar pero no recibe acciones de publicación', async () => {
    session.user.role = 'ADMIN';
    mount();
    await screen.findByRole('textbox', { name: 'Nombre público' });
    vi.mocked(api.get).mockResolvedValueOnce(preview(editor()));
    fireEvent.click(screen.getByRole('button', { name: 'Vista previa' }));
    await screen.findByText('Revisión guardada 0. Esta vista es privada y no se puede compartir.');
    expect(screen.queryByRole('button', { name: /Publicar esta/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retirar página pública' }),
    ).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('OWNER publica únicamente después de preview y confirmación y relee el estado', async () => {
    mount();
    await screen.findByRole('textbox', { name: 'Nombre público' });
    vi.mocked(api.get).mockResolvedValueOnce(preview(editor()));
    fireEvent.click(screen.getByRole('button', { name: 'Vista previa' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Publicar esta revisión' }));
    expect(api.post).not.toHaveBeenCalled();
    vi.mocked(api.get).mockResolvedValueOnce({
      ...editor('Nombre A', 1),
      draftRevision: 0,
      publishedRevision: 0,
      isPublished: true,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar publicación' }));
    await screen.findByText('Publicado');
    expect(api.post).toHaveBeenCalledWith(
      '/organizations/mine/cms/publish',
      { expectedVersion: 0, idempotencyKey: expect.any(String) },
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('rechaza preview de otra versión sin ofrecer publicación', async () => {
    mount();
    await screen.findByRole('textbox', { name: 'Nombre público' });
    vi.mocked(api.get).mockResolvedValueOnce(preview(editor('Edición concurrente', 1)));
    fireEvent.click(screen.getByRole('button', { name: 'Vista previa' }));
    await screen.findByText(
      'El borrador cambió. Cierra esta vista y recarga la configuración para revisarlo.',
    );
    expect(screen.queryByText('Edición concurrente')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Publicar esta revisión' }),
    ).not.toBeInTheDocument();
  });

  it('conserva texto en conflicto y exige comparación y confirmación antes de usar la versión nueva', async () => {
    mount();
    await screen.findByRole('textbox', { name: 'Nombre público' });
    fireEvent.change(nameField(), { target: { value: 'Mi texto' } });
    vi.mocked(api.patch).mockRejectedValueOnce(new ApiError(409, 'Version conflict'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await screen.findByText('Revisa los cambios antes de guardar');
    expect(nameField()).toHaveValue('Mi texto');
    vi.mocked(api.get).mockResolvedValueOnce(editor('Texto de otro editor', 1));
    fireEvent.click(screen.getByRole('button', { name: 'Recargar para comparar' }));
    await screen.findByText('Texto de otro editor');
    expect(screen.getByRole('button', { name: 'Guardar borrador' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Conservar mi texto tras comparar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Conservar mi texto' }));
    vi.mocked(api.get).mockResolvedValueOnce(editor('Mi texto', 2));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.patch).mock.calls[1][1]).toMatchObject({
      publicName: 'Mi texto',
      expectedVersion: 1,
    });
  });

  it('tras resultado incierto reintenta la misma clave/cuerpo y consulta después del recibo histórico', async () => {
    mount();
    await screen.findByRole('textbox', { name: 'Nombre público' });
    fireEvent.change(nameField(), { target: { value: 'Cambio incierto' } });
    vi.mocked(api.patch).mockRejectedValueOnce(new ApiError(503, 'Timeout'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await screen.findByText('Resultado por confirmar');
    expect(nameField()).toBeDisabled();
    vi.mocked(api.get).mockResolvedValueOnce(editor('Versión autoritativa posterior', 3));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar la misma acción' }));
    await waitFor(() => expect(nameField()).toHaveValue('Versión autoritativa posterior'));
    expect(vi.mocked(api.patch).mock.calls[0][1]).toEqual(vi.mocked(api.patch).mock.calls[1][1]);
  });

  it('desmonta formulario y descarta efectos tardíos de guardado en A → B → A', async () => {
    const view = mount();
    await screen.findByRole('textbox', { name: 'Nombre público' });
    const pending = deferred<unknown>();
    vi.mocked(api.patch).mockReturnValueOnce(pending.promise);
    fireEvent.change(nameField(), { target: { value: 'Texto viejo secreto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    const oldSignal = vi.mocked(api.patch).mock.calls[0][2]?.signal;
    session.organization = { id: 'tenant-b', name: 'Operativo B', slug: 'negocio-b' };
    session.user.organizationId = 'tenant-b';
    vi.mocked(api.get).mockResolvedValue(editor('Nombre B'));
    view.change();
    expect(screen.queryByDisplayValue('Texto viejo secreto')).not.toBeInTheDocument();
    await waitFor(() => expect(nameField()).toHaveValue('Nombre B'));
    session.organization = { id: 'tenant-a', name: 'Operativo A', slug: 'negocio-a' };
    session.user.organizationId = 'tenant-a';
    vi.mocked(api.get).mockResolvedValue(editor('Nueva visita A'));
    view.change();
    await waitFor(() => expect(nameField()).toHaveValue('Nueva visita A'));
    const reads = vi.mocked(api.get).mock.calls.length;
    await act(async () => pending.resolve({ version: 1 }));
    expect(oldSignal?.aborted).toBe(true);
    expect(api.get).toHaveBeenCalledTimes(reads);
    expect(nameField()).toHaveValue('Nueva visita A');
    expect(screen.queryByText(/Guardado confirmado/)).not.toBeInTheDocument();
  });

  it('desmonta preview pendiente al cambiar de usuario o de rol', async () => {
    const view = mount();
    await screen.findByRole('textbox', { name: 'Nombre público' });
    const pending = deferred<CmsPreview>();
    vi.mocked(api.get).mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByRole('button', { name: 'Vista previa' }));
    await screen.findByRole('dialog');
    session.user = { id: 'actor-b', role: 'ADMIN', organizationId: 'tenant-a' };
    view.change();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await act(async () => pending.resolve(preview(editor('Privado del actor anterior'))));
    expect(screen.queryByText('Privado del actor anterior')).not.toBeInTheDocument();
    session.user.role = 'BARBER';
    view.change();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('retira los datos ante permiso revocado en una mutación', async () => {
    mount();
    await screen.findByRole('textbox', { name: 'Nombre público' });
    fireEvent.change(nameField(), { target: { value: 'Texto privado' } });
    vi.mocked(api.patch).mockRejectedValueOnce(new ApiError(403, 'Forbidden'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await screen.findByRole('button', { name: 'Actualizar mi acceso' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Texto privado')).not.toBeInTheDocument();
  });
});
