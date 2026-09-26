import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEmail,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  CLIENT_EMAIL_MAX_LENGTH,
  CLIENT_NAME_MAX_LENGTH,
  CLIENT_NOTES_MAX_LENGTH,
  CLIENT_PHONE_INPUT_MAX_LENGTH,
} from '../clients.constants';

export class CreateClientDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'name no puede contener solo espacios' })
  @MaxLength(CLIENT_NAME_MAX_LENGTH)
  name!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsOptional()
  @MaxLength(CLIENT_EMAIL_MAX_LENGTH)
  email?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsOptional()
  @MaxLength(CLIENT_PHONE_INPUT_MAX_LENGTH)
  phone?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsOptional()
  @MaxLength(CLIENT_NOTES_MAX_LENGTH)
  notes?: string | null;
}
