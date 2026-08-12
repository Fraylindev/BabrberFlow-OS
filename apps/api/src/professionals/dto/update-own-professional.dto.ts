import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateProfessionalDto } from './create-professional.dto';

// BARBER solo edita su perfil público; nunca teléfono interno, estado,
// publicación o vínculo de cuenta.
export class UpdateOwnProfessionalDto extends PartialType(
  PickType(CreateProfessionalDto, [
    'name',
    'bio',
    'avatar',
    'specialty',
    'experienceYears',
  ] as const),
) {}
