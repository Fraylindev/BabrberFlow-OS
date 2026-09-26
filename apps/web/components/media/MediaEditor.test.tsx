import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { ApiError, api } from '@/lib/api';
import { MediaEditor } from './MediaEditor';

vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ isReady: true, user: { id: 'user-1', role: 'OWNER' }, organization: { id: 'org-1' } }) }));
vi.mock('@/lib/queries/services', () => ({ useServicesQuery: () => ({ data: [] }) }));
vi.mock('@/lib/queries/media', () => ({
  useMediaAssets: () => ({ data: [], refetch: vi.fn(), isPending: false, error: null }),
  useGalleryOrder: () => ({ data: { version: 0, draftRevision: 0, publishedRevision: null, draftAssetIds: [], draftHeroAssetId: null, publishedAssetIds: [], publishedHeroAssetId: null }, refetch: vi.fn(), isPending: false, error: null }),
  usePromotions: () => ({ data: [], refetch: vi.fn(), isPending: false, error: null }),
}));

beforeEach(() => {
  vi.spyOn(api, 'get').mockResolvedValue([]);
  vi.spyOn(api, 'upload').mockRejectedValue(new ApiError(503, 'Proveedor privado'));
});

it('explica cuota o error de moderación, conserva el archivo y no anuncia publicación', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MediaEditor /></QueryClientProvider>);
  fireEvent.change(await screen.findByLabelText('Archivo'), { target: { files: [new File(['imagen'], 'foto.png', { type: 'image/png' })] } });
  fireEvent.change(screen.getByLabelText('Descripción de imagen'), { target: { value: 'Interior del salón de prueba' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Subir imagen' }).closest('form')!);
  expect(await screen.findByRole('alert')).toHaveTextContent('agotó su cuota');
  expect(screen.getByRole('alert')).toHaveTextContent('no se publicó');
  expect(screen.queryByText('Proveedor privado')).not.toBeInTheDocument();
  await waitFor(() => expect(api.upload).toHaveBeenCalledTimes(1));
  expect((screen.getByLabelText('Archivo') as HTMLInputElement).files?.length).toBe(1);
});
