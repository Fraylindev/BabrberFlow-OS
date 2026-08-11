import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class RescheduleBookingDto {
  @IsUUID()
  @IsOptional()
  professionalId?: string;

  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;
}
