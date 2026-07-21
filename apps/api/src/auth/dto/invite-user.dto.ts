import { IsString, IsEmail, IsNotEmpty, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class InviteUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  // OWNER no se asigna por invitación — se crea únicamente vía /auth/register
  // al fundar una organización nueva.
  @IsEnum([UserRole.ADMIN, UserRole.BARBER, UserRole.RECEPTIONIST])
  role!: 'ADMIN' | 'BARBER' | 'RECEPTIONIST';
}
