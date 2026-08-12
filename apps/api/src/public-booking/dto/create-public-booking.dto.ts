import {
  IsBoolean,
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from '../../auth/auth.constants';
import {
  CLIENT_EMAIL_MAX_LENGTH,
  CLIENT_NAME_MAX_LENGTH,
  CLIENT_PHONE_INPUT_MAX_LENGTH,
} from '../../clients/clients.constants';

export class CreatePublicBookingDto {
  @IsUUID()
  @IsNotEmpty()
  serviceId!: string;

  @IsUUID()
  @IsNotEmpty()
  professionalId!: string;

  @IsISO8601()
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

  @IsOptional()
  @IsBoolean()
  createAccount?: boolean;

  @ValidateIf((dto: CreatePublicBookingDto) => dto.createAccount === true)
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_MIN_LENGTH_MESSAGE })
  password?: string;
}
