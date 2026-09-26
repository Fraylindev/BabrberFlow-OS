import { IsNotEmpty, IsDateString, IsUUID } from 'class-validator';
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
  @IsNotEmpty()
  startTime!: string;
}
