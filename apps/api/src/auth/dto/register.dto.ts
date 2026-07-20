import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsUUID,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId!: string;
}
