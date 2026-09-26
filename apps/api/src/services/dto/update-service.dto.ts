import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceDto } from './create-service.dto';

// El estado se modifica exclusivamente mediante los contratos explícitos de
// desactivación y reactivación; nunca mediante la edición general.
export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
