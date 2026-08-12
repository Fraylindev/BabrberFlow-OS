import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';

// isActive se gestiona exclusivamente mediante archive/restore para que
// autorización y auditoría no dependan de un PATCH genérico.
export class UpdateClientDto extends PartialType(CreateClientDto) {}
