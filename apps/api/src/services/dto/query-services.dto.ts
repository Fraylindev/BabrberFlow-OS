import { Transform, type TransformFnParams } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

export class QueryServicesDto {
  @Transform(trimString)
  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: 'true' | 'false';
}

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
