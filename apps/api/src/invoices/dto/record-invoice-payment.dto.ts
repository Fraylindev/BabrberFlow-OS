import { PaymentMethod } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class RecordInvoicePaymentDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
