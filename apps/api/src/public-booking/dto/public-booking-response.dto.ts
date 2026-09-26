import { BookingStatus } from '@prisma/client';

export class PublicBookingSummaryDto {
  id!: string;
  serviceId!: string;
  professionalId!: string;
  startTime!: Date;
  endTime!: Date;
  status!: BookingStatus;
}

export class PublicBookingResponseDto {
  booking!: PublicBookingSummaryDto;
  accountCreated!: boolean;
  accountCreationError!: string | null;
}
