import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { publicReadMayRefresh } from './public-booking';
import type { GalleryOrder, MediaAsset, Promotion, PublicMedia } from '@/lib/media-ui';

const privateOptions = { retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: 'always' as const };

export function mediaKeys(scope: string, visit: string) {
  return {
    assets: ['media', scope, visit, 'assets'] as const,
    order: ['media', scope, visit, 'order'] as const,
    promotions: ['media', scope, visit, 'promotions'] as const,
  };
}

export function useMediaAssets(scope: string, visit: string) {
  return useQuery({ ...privateOptions, queryKey: mediaKeys(scope, visit).assets,
    queryFn: ({ signal }) => api.get<MediaAsset[]>('/media', undefined, { signal, cache: 'no-store' }) });
}

export function useGalleryOrder(scope: string, visit: string) {
  return useQuery({ ...privateOptions, queryKey: mediaKeys(scope, visit).order,
    queryFn: ({ signal }) => api.get<GalleryOrder>('/media/gallery-order', undefined, { signal, cache: 'no-store' }) });
}

export function usePromotions(scope: string, visit: string) {
  return useQuery({ ...privateOptions, queryKey: mediaKeys(scope, visit).promotions,
    queryFn: ({ signal }) => api.get<Promotion[]>('/media/promotions', undefined, { signal, cache: 'no-store' }) });
}

export function usePublicMedia(slug: string, enabled = true, visit = 'page') {
  return useQuery({ queryKey: ['public-media', slug, visit], enabled,
    queryFn: ({ signal }) => api.get<PublicMedia>(`/public/${encodeURIComponent(slug)}/media`, undefined, { signal, cache: 'no-store' }),
    retry: false, gcTime: 0, staleTime: 0,
    refetchInterval: query => publicReadMayRefresh(query.state.error, query.state.errorUpdatedAt) ? 45_000 : false,
    refetchOnWindowFocus: query => publicReadMayRefresh(query.state.error, query.state.errorUpdatedAt) ? 'always' : false });
}
