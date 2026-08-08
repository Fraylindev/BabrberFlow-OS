import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProfessionalDto } from './create-professional.dto';

// PartialType hace opcionales todos los campos de CreateProfessionalDto.
// isActive se agrega aparte porque no existía en el DTO de creación.
// Antes escrito a mano, duplicando los campos — ahora sigue el mismo
// patrón que UpdateServiceDto/UpdateClientDto.
export class UpdateProfessionalDto extends PartialType(CreateProfessionalDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
