import type { QueryClient } from '@tanstack/react-query';
import type { Booking, Invoice, InvoicePage } from '../api';
import { queryKeys } from './keys';

/** Apply only the server-confirmed financial result to this operation's scope. */
export async function synchronizeInvoiceQueries(client: QueryClient, invoice: Invoice, scopeKey: string) {
  client.setQueriesData<Booking[]>({ queryKey: queryKeys.bookings.scope(scopeKey) }, (bookings) =>
    bookings?.map((booking) => booking.id === invoice.booking.id
      ? { ...booking, invoice: { id: invoice.id, state: invoice.state } } : booking),
  );
  client.setQueriesData<InvoicePage>({ queryKey: queryKeys.invoices.scope(scopeKey) }, (page) =>
    page ? { ...page, items: page.items.map((item) => item.id === invoice.id ? invoice : item) } : page,
  );
  await refreshInvoiceQueries(client, scopeKey);
}

export async function refreshInvoiceQueries(client: QueryClient, scopeKey: string) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.bookings.scope(scopeKey) }),
    client.invalidateQueries({ queryKey: queryKeys.invoices.scope(scopeKey) }),
  ]);
}
