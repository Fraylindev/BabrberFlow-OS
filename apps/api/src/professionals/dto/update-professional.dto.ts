import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessionalDto } from './create-professional.dto';

// Estado, publicación y vínculo se gestionan por endpoints explícitos.
export class UpdateProfessionalDto extends PartialType(CreateProfessionalDto) {}
