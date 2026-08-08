import { Request } from 'express';
import { UserRole } from '@prisma/client';

// Ya no se deriva de Omit<User, 'password'> — desde el refactor a
// identidad global, User no tiene organizationId ni role propios (viven
// en Membership). Esto es lo que JwtStrategy.validate() construye
// combinando User + la Membership activa de la organización del token.
export interface RequestUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}
