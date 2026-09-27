import { IsNotEmpty, IsDateString, IsUUID, Matches } from 'class-validator';
import { ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN } from '../../professionals/professional-availability.util';
import { InternalEmailPreferenceInput } from '../../notifications/email-preference.dto';

export class CreateBookingDto extends InternalEmailPreferenceInput {
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
  @Matches(ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN)
  @IsNotEmpty()
  startTime!: string;
}
