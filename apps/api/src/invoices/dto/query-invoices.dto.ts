import { IsIn, IsOptional, Matches } from 'class-validator';

export const INVOICE_STATES = ['ISSUED', 'PAID'] as const;
export type InvoiceState = (typeof INVOICE_STATES)[number];

export class QueryInvoicesDto {
  @IsOptional()
  @Matches(/^[1-9]\d*$/, { message: 'page debe ser un entero positivo' })
  page?: string;

  @IsOptional()
  @Matches(/^(?:[1-9]|[1-9]\d|100)$/, {
    message: 'limit debe ser un entero entre 1 y 100',
  })
  limit?: string;

  @IsOptional()
  @IsIn(INVOICE_STATES)
  state?: InvoiceState;
}
