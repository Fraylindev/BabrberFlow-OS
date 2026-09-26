import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from '../auth.constants';
import {
  ORGANIZATION_SLUG_INPUT_PATTERN,
  ORGANIZATION_SLUG_MAX_LENGTH,
  ORGANIZATION_SLUG_MIN_LENGTH,
} from '../organization-slug';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_MIN_LENGTH_MESSAGE })
  password!: string;

  @IsString()
  @IsNotEmpty()
  organizationName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(ORGANIZATION_SLUG_MIN_LENGTH, {
    message: 'El slug debe tener al menos 3 caracteres',
  })
  @MaxLength(ORGANIZATION_SLUG_MAX_LENGTH, {
    message: 'El slug no puede exceder 50 caracteres',
  })
  @Matches(ORGANIZATION_SLUG_INPUT_PATTERN, {
    message:
      'El slug solo puede contener letras, números y guiones intermedios',
  })
  organizationSlug!: string;

  @IsEmail()
  organizationEmail!: string;
}
