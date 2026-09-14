import {
  IsISO8601,
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
} from 'class-validator';

export class GetAvailabilityQueryDto {
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  // Opcional: cuando el cliente elige "Cualquiera disponible" en vez de un
  // barbero específico, se omite y el servicio evalúa a todo el equipo activo.
  @IsOptional()
  @IsString()
  professionalId?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe tener el formato YYYY-MM-DD',
  })
  @IsISO8601(
    { strict: true },
    { message: 'date debe ser una fecha calendario válida' },
  )
  date!: string;
}
