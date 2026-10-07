import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type BookingStatus } from '@/lib/api';
import { useCustomer } from '@/components/customer/CustomerProvider';

export interface CustomerBusiness { slug: string; name: string; canBook: boolean }
export interface CustomerSummary { id: string; startTime: string; endTime: string; status: BookingStatus; service: { id: string; name: string }; professional: { id: string; name: string }; canBookAgain: boolean }
export interface CustomerDetail extends CustomerSummary { business: { slug: string; name: string; timeZone: string; phone: string | null; address: string | null; googleMapsUrl: string | null }; actions: { canBookAgain: boolean } }
export interface CustomerPage { business: { slug: string; name: string; timeZone: string }; items: CustomerSummary[]; nextCursor: string | null; asOf: string }
export interface CustomerProfile { name: string; phone: string | null; email: string | null; canEditContact: boolean }

export function useCustomerRead<T>(path: string, params?: Record<string, string>, enabled = true) {
  const session = useCustomer();
  const reject = session.reject;
  const query = useQuery({ queryKey: ['customer', session.scope, path, params ?? null], queryFn: ({ signal }) => api.get<T>(path, params, session.options(signal)), enabled: session.loaded && session.signedIn && !session.blocked && enabled });
  useEffect(() => { if (query.error instanceof ApiError && [401, 403, 404].includes(query.error.status)) reject(); }, [query.error, reject]);
  return query;
}
export function useCustomerRevalidation(refresh: () => void, allowed: boolean) {
  useEffect(() => {
    const revalidate = () => { if (allowed && document.visibilityState !== 'hidden') refresh(); };
    window.addEventListener('focus', revalidate); window.addEventListener('pageshow', revalidate); document.addEventListener('visibilitychange', revalidate);
    return () => { window.removeEventListener('focus', revalidate); window.removeEventListener('pageshow', revalidate); document.removeEventListener('visibilitychange', revalidate); };
  }, [refresh, allowed]);
}
export function useClearCustomerPages() {
  const client = useQueryClient();
  return () => { void client.cancelQueries({ queryKey: ['customer'] }); client.removeQueries({ queryKey: ['customer'] }); };
}
