import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// Login de un solo paso: solo email + password. La organización activa
// se resuelve del lado del servidor vía User.lastOrganizationId (o la
// primera membresía disponible si no hay ninguna todavía) — nunca se
// pide en el body. Ver AuthService.login().
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
