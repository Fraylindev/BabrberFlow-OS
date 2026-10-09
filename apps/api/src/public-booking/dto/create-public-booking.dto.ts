import {
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN } from '../../professionals/professional-availability.util';
import { PublicEmailPreferenceInput } from '../../notifications/email-preference.dto';
import {
  CLIENT_EMAIL_MAX_LENGTH,
  CLIENT_NAME_MAX_LENGTH,
  CLIENT_PHONE_INPUT_MAX_LENGTH,
} from '../../clients/clients.constants';

export class CreatePublicBookingDto extends PublicEmailPreferenceInput {
  @IsUUID()
  @IsNotEmpty()
  serviceId!: string;

  @IsUUID()
  @IsNotEmpty()
  professionalId!: string;

  @IsISO8601()
  @Matches(ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN)
  startTime!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'clientName no puede contener solo espacios' })
  @MaxLength(CLIENT_NAME_MAX_LENGTH)
  clientName!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(CLIENT_PHONE_INPUT_MAX_LENGTH)
  clientPhone!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsEmail()
  @MaxLength(CLIENT_EMAIL_MAX_LENGTH)
  clientEmail?: string;
}
