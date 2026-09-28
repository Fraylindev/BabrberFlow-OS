import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  BusinessSchedule,
  ScheduleClosure,
  SchedulePage,
  ScheduleRegion,
} from '@/lib/business-schedule';

export const scheduleBase = '/organizations/mine/schedule';
const privateRead = {
  retry: false,
  staleTime: 0,
  gcTime: 0,
  refetchOnWindowFocus: 'always' as const,
};
export function useBusinessSchedule(scope: string, visit: string) {
  return useQuery({
    ...privateRead,
    queryKey: ['business-schedule', scope, visit, 'read'],
    queryFn: ({ signal }) =>
      api.get<BusinessSchedule>(scheduleBase, undefined, { signal, cache: 'no-store' }),
  });
}
export function useScheduleRegions(scope: string, visit: string) {
  return useQuery({
    ...privateRead,
    queryKey: ['business-schedule', scope, visit, 'regions'],
    queryFn: ({ signal }) =>
      api.get<ScheduleRegion[]>(`${scheduleBase}/regions`, undefined, {
        signal,
        cache: 'no-store',
      }),
  });
}
export function useScheduleClosures(
  scope: string,
  visit: string,
  offset: number,
  includeCancelled: boolean,
) {
  return useQuery({
    ...privateRead,
    queryKey: ['business-schedule', scope, visit, 'closures', offset, includeCancelled],
    queryFn: ({ signal }) =>
      api.get<SchedulePage<ScheduleClosure>>(
        `${scheduleBase}/closures`,
        {
          offset: String(offset),
          limit: '20',
          ...(includeCancelled ? { includeCancelled: 'true' } : {}),
        },
        { signal, cache: 'no-store' },
      ),
  });
}
