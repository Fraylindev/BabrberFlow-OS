import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsIn, IsOptional } from 'class-validator';

export enum ServiceSort {
  NAME_ASC = 'NAME_ASC',
  BOOKINGS_DESC = 'BOOKINGS_DESC',
  BOOKINGS_ASC = 'BOOKINGS_ASC',
  CREATED_DESC = 'CREATED_DESC',
  CREATED_ASC = 'CREATED_ASC',
  PRICE_ASC = 'PRICE_ASC',
  PRICE_DESC = 'PRICE_DESC',
}

export class QueryServicesDto {
  @Transform(trimString)
  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: 'true' | 'false';

  @Transform(trimString)
  @IsOptional()
  @IsEnum(ServiceSort)
  sort?: ServiceSort;
}

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
