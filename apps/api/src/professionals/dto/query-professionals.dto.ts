import { ProfessionalStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PROFESSIONAL_SEARCH_MAX_LENGTH } from '../professionals.constants';
import { Transform, type TransformFnParams } from 'class-transformer';

export class QueryProfessionalsDto {
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'search no puede estar vacío' })
  @MaxLength(PROFESSIONAL_SEARCH_MAX_LENGTH)
  search?: string;

  @IsOptional()
  @IsEnum(ProfessionalStatus)
  status?: ProfessionalStatus;

  @Transform(trimString)
  @IsOptional()
  @Matches(/^[1-9]\d*$/, { message: 'page debe ser un entero positivo' })
  page?: string;

  @Transform(trimString)
  @IsOptional()
  @Matches(/^(?:[1-9]|[1-9]\d|100)$/, {
    message: 'limit debe ser un entero entre 1 y 100',
  })
  limit?: string;
}

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
