import { IsNotEmpty, IsDateString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  clientId!: string;

  @IsUUID()
  @IsNotEmpty()
  professionalId!: string;

  @IsUUID()
  @IsNotEmpty()
  serviceId!: string;

  @IsDateString()
  @IsNotEmpty()
  startTime!: string;
}
