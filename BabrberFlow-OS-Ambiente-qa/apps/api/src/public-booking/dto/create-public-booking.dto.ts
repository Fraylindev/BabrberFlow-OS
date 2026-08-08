import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsISO8601,
  IsBoolean,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from '../../auth/auth.constants';

export class CreatePublicBookingDto {
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @IsString()
  @IsNotEmpty()
  professionalId!: string;

  @IsISO8601()
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  clientName!: string;

  // Validación básica de formato — la regla de "máximo 11 caracteres" del
  // brief se aplica en el frontend sobre el input; aquí solo garantizamos
  // que no llegue vacío ni absurdamente largo.
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  clientPhone!: string;

  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  // Checkbox "Crear cuenta para reservar más rápido" del flujo B2C.
  @IsOptional()
  @IsBoolean()
  createAccount?: boolean;

  // Solo se exige si createAccount viene en true. La cuenta se crea con
  // rol CUSTOMER — nunca con acceso al panel interno.
  @ValidateIf((dto: CreatePublicBookingDto) => dto.createAccount === true)
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_MIN_LENGTH_MESSAGE })
  password?: string;
}
