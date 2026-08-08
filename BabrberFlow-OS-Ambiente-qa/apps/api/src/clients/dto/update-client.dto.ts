import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateClientDto } from './create-client.dto';

// PartialType hace opcionales todos los campos de CreateClientDto.
// isActive se agrega aparte porque no existía en el DTO de creación.
export class UpdateClientDto extends PartialType(CreateClientDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
