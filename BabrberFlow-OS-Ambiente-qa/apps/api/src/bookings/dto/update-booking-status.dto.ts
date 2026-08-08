import { IsNotEmpty, IsEnum } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingStatusDto {
  @IsNotEmpty()
  @IsEnum(BookingStatus)
  status!: BookingStatus;
}
