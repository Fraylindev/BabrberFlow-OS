import { Prisma } from '@prisma/client';
import type { InvoiceState } from './query-invoices.dto';

export const invoiceResponseSelect = {
  id: true,
  amount: true,
  currency: true,
  createdAt: true,
  booking: {
    select: {
      id: true,
      startTime: true,
      client: { select: { name: true } },
      service: { select: { name: true } },
      professional: { select: { name: true } },
    },
  },
  payment: { select: { method: true, paidAt: true } },
} satisfies Prisma.InvoiceSelect;

export type InvoiceResponseRecord = Prisma.InvoiceGetPayload<{
  select: typeof invoiceResponseSelect;
}>;

export interface InvoiceResponseDto {
  id: string;
  state: InvoiceState;
  amount: string;
  currency: string;
  issuedAt: Date;
  booking: {
    id: string;
    startTime: Date;
    clientName: string;
    serviceName: string;
    professionalName: string;
  };
  payment: { method: string; paidAt: Date } | null;
}

export interface InvoiceListResult {
  data: InvoiceResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function toInvoiceResponse(
  record: InvoiceResponseRecord,
): InvoiceResponseDto {
  return {
    id: record.id,
    state: record.payment ? 'PAID' : 'ISSUED',
    amount: record.amount.toFixed(2),
    currency: record.currency,
    issuedAt: record.createdAt,
    booking: {
      id: record.booking.id,
      startTime: record.booking.startTime,
      clientName: record.booking.client.name,
      serviceName: record.booking.service.name,
      professionalName: record.booking.professional.name,
    },
    payment: record.payment
      ? { method: record.payment.method, paidAt: record.payment.paidAt }
      : null,
  };
}
