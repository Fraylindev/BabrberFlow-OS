import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from '../auth.constants';

export class InviteUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_MIN_LENGTH_MESSAGE })
  password!: string;

  // OWNER no se asigna por invitación — se crea únicamente vía /auth/register
  // al fundar una organización nueva.
  @IsEnum([UserRole.ADMIN, UserRole.BARBER, UserRole.RECEPTIONIST])
  role!: 'ADMIN' | 'BARBER' | 'RECEPTIONIST';

  // Checkbox "Crear perfil público" — cuando viene en true, además del
  // User se crea un Professional vinculado (ver Professional.userId),
  // para que esta persona aparezca en la reserva pública y tenga "mi
  // agenda"/"mis clientes" en el panel (Fase 7).
  @IsOptional()
  @IsBoolean()
  createPublicProfile?: boolean;
}
