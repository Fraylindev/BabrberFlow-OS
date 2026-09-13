import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CmsContent, CmsEditor, CmsPreview, CmsReceipt } from '@/lib/cms-ui';
import { queryKeys } from './keys';

export type CmsOperation =
  | {
      kind: 'draft';
      body: CmsContent & { expectedVersion: number; idempotencyKey: string };
    }
  | {
      kind: 'publish' | 'unpublish';
      body: { expectedVersion: number; idempotencyKey: string };
    };

const base = '/organizations/mine/cms';
const privateQuery = {
  retry: false,
  staleTime: 0,
  gcTime: 0,
  refetchOnWindowFocus: 'always' as const,
};

export function useCmsEditor(scope: string, visit: string) {
  return useQuery({
    ...privateQuery,
    queryKey: queryKeys.cms.editor(scope, visit),
    queryFn: ({ signal }) => api.get<CmsEditor>(base, undefined, { signal, cache: 'no-store' }),
  });
}

export function useCmsPreview(scope: string, visit: string) {
  return useQuery({
    ...privateQuery,
    queryKey: queryKeys.cms.preview(scope, visit),
    queryFn: ({ signal }) =>
      api.get<CmsPreview>(`${base}/preview`, undefined, { signal, cache: 'no-store' }),
  });
}

export function useCmsMutation() {
  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: ({ operation, signal }: { operation: CmsOperation; signal: AbortSignal }) =>
      operation.kind === 'draft'
        ? api.patch<CmsReceipt>(`${base}/draft`, operation.body, { signal, cache: 'no-store' })
        : api.post<CmsReceipt>(`${base}/${operation.kind}`, operation.body, {
            signal,
            cache: 'no-store',
          }),
  });
}
