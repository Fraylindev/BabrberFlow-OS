import {
  IsInt,
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  SERVICE_DESCRIPTION_MAX_LENGTH,
  SERVICE_MAX_DURATION_MINUTES,
  SERVICE_NAME_MAX_LENGTH,
} from '../services.constants';

export class CreateServiceDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(SERVICE_NAME_MAX_LENGTH)
  name!: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(SERVICE_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(SERVICE_MAX_DURATION_MINUTES)
  duration!: number; // Duración en minutos

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price!: number;
}

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
