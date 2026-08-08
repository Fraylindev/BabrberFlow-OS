import { IsNotEmpty, IsUUID, IsNumber, Min } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId!: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount!: number;
}
