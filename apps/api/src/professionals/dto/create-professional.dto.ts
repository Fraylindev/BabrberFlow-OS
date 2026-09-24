import {
  IsInt,
  IsEmpty,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  PROFESSIONAL_BIO_MAX_LENGTH,
  PROFESSIONAL_NAME_MAX_LENGTH,
  PROFESSIONAL_PHONE_MAX_LENGTH,
  PROFESSIONAL_SPECIALTY_MAX_LENGTH,
} from '../professionals.constants';

export class CreateProfessionalDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'name no puede estar vacío' })
  @MaxLength(PROFESSIONAL_NAME_MAX_LENGTH)
  name!: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(PROFESSIONAL_BIO_MAX_LENGTH)
  bio?: string | null;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(PROFESSIONAL_PHONE_MAX_LENGTH)
  phone?: string | null;

  @Transform(trimString)
  @IsOptional()
  @IsEmpty({ message: 'El avatar se sube desde Medios.' })
  avatar?: null;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(PROFESSIONAL_SPECIALTY_MAX_LENGTH)
  specialty?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  experienceYears?: number | null;
}

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
