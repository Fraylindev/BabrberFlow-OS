import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateProfessionalDto } from './create-professional.dto';

// Perfil público A1 y teléfono propio privado. Nunca estado, publicación,
// vínculo de cuenta ni tenant. El nombre puede omitirse, pero no ser null.
export class UpdateOwnProfessionalDto extends PartialType(
  PickType(CreateProfessionalDto, [
    'name',
    'bio',
    'phone',
    'avatar',
    'specialty',
    'experienceYears',
  ] as const),
  { skipNullProperties: false },
) {}
