import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from 'react';
import {
  api,
  type Invoice,
  type InvoicePage,
  type InvoiceState,
  type Organization,
  type PaymentMethod,
} from "@/lib/api";
import {
  createInvoicePayload,
  createPaymentPayload,
  parseInvoicePagination,
} from "@/lib/invoice-ui";
import { queryKeys } from "./keys";

interface InvoiceFilters {
  page: number;
  limit: number;
  state?: InvoiceState;
  from?: string;
  to?: string;
}

export function useInvoicesQuery(
  scopeKey: string | null,
  filters: InvoiceFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: scopeKey
      ? queryKeys.invoices.list(scopeKey, filters)
      : ["invoices", "disabled"],
    queryFn: async (): Promise<InvoicePage> => {
      const response = await api.getWithHeaders<Invoice[]>("/invoices", {
        page: String(filters.page),
        limit: String(filters.limit),
        ...(filters.state ? { state: filters.state } : {}),
        ...(filters.from ? { from: filters.from } : {}),
        ...(filters.to ? { to: filters.to } : {}),
      });
      return {
        items: response.data,
        pagination: parseInvoicePagination(response.headers),
      };
    },
    enabled: Boolean(scopeKey) && enabled,
  });
}

export function useOrganizationTimeZoneQuery(scopeKey: string | null) {
  const [readyScope, setReadyScope] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setReadyScope(scopeKey); });
    return () => { active = false; };
  }, [scopeKey]);
  return useQuery({
    queryKey: scopeKey
      ? queryKeys.organizations.scope(scopeKey)
      : ["organizations", "disabled"],
    queryFn: async ({ signal }) => {
      const organization = await api.get<Organization>("/organizations/mine", undefined, { signal, cache: 'no-store' });
      if (!organization.timeZone) {
        throw new Error("La zona horaria del negocio no está disponible");
      }
      return organization.timeZone;
    },
    enabled: Boolean(scopeKey) && readyScope === scopeKey,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId }: { bookingId: string; scopeKey: string }) =>
      api.post<Invoice>("/invoices", createInvoicePayload(bookingId)),
    onSuccess: (_invoice, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.scope(variables.scopeKey),
      });
    },
  });
}

export function useRecordInvoicePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      method,
    }: {
      invoiceId: string;
      method: PaymentMethod;
      scopeKey: string;
    }) =>
      api.post<Invoice>(
        `/invoices/${invoiceId}/payments`,
        createPaymentPayload(method),
      ),
    onSuccess: (_invoice, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.scope(variables.scopeKey),
      });
    },
  });
}
