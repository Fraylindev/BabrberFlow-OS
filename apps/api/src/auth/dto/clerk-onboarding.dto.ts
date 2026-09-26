import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import {
  ORGANIZATION_SLUG_INPUT_PATTERN,
  ORGANIZATION_SLUG_MAX_LENGTH,
  ORGANIZATION_SLUG_MIN_LENGTH,
} from '../organization-slug';

export class ClerkOnboardingDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la organización es obligatorio' })
  @MinLength(2, {
    message: 'El nombre de la organización debe tener al menos 2 caracteres',
  })
  @MaxLength(100, {
    message: 'El nombre de la organización no puede exceder 100 caracteres',
  })
  organizationName!: string;

  @IsString()
  @IsNotEmpty({ message: 'El slug de la organización es obligatorio' })
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

  @IsEmail(
    {},
    {
      message: 'El correo electrónico de la organización no es válido',
    },
  )
  @IsNotEmpty({
    message: 'El correo electrónico de la organización es obligatorio',
  })
  organizationEmail!: string;
}
