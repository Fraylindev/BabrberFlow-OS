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

  // Solo tiene efecto cuando role=BARBER. El backend ignora true para
  // ADMIN/RECEPTIONIST; la UI no es la autoridad de esta regla.
  @IsOptional()
  @IsBoolean()
  createPublicProfile?: boolean;
}
