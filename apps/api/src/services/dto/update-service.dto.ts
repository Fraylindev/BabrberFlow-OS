import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateServiceDto } from './create-service.dto';

// PartialType hace opcionales todos los campos de CreateServiceDto.
// isActive se agrega aparte porque no existía en el DTO de creación.
export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
