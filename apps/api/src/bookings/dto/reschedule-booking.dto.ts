import { IsOptional, IsDateString, IsUUID, Matches } from 'class-validator';
import { ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN } from '../../professionals/professional-availability.util';

export class RescheduleBookingDto {
  @IsUUID()
  @IsOptional()
  professionalId?: string;

  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @IsDateString()
  @Matches(ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN)
  @IsOptional()
  startTime?: string;
}
