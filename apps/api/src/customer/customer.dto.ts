import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PublicEmailPreferenceInput } from '../notifications/email-preference.dto';
import { ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN } from '../professionals/professional-availability.util';

export class CustomerListDto {
  @IsIn(['upcoming', 'history'], { message: 'Elige Próximas o Historial.' })
  view: 'upcoming' | 'history' = 'upcoming';

  @Type(() => Number)
  @IsInt({ message: 'Indica una cantidad entera de reservas.' })
  @Min(1, { message: 'Solicita al menos una reserva.' })
  @Max(50, { message: 'Solicita hasta 50 reservas por página.' })
  limit = 20;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString({ message: 'Actualiza la lista para continuar.' })
  @MinLength(1, { message: 'Actualiza la lista para continuar.' })
  @MaxLength(2048, { message: 'Actualiza la lista para continuar.' })
  cursor?: string;
}

export class CustomerProfileDto {
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString({ message: 'Indica un nombre válido.' })
  @MinLength(1, { message: 'Indica tu nombre.' })
  @MaxLength(120, { message: 'El nombre admite hasta 120 caracteres.' })
  name?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined && value !== null)
  @IsString({ message: 'Indica un teléfono válido.' })
  @MaxLength(30, {
    message: 'El teléfono admite hasta 30 caracteres de entrada.',
  })
  phone?: string | null;
}

export class CustomerCreateDto extends PublicEmailPreferenceInput {
  @IsUUID(undefined, { message: 'Elige un servicio válido.' })
  serviceId!: string;

  @IsUUID(undefined, { message: 'Elige un profesional válido.' })
  professionalId!: string;

  @IsDateString({}, { message: 'Elige una fecha y hora disponibles.' })
  @Matches(ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN, {
    message: 'Elige una fecha y hora disponibles.',
  })
  startTime!: string;
}
