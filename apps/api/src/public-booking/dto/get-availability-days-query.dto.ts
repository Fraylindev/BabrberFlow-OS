import { IsISO8601, IsOptional, IsUUID, Matches } from 'class-validator';

export class GetAvailabilityDaysQueryDto {
  @IsUUID()
  serviceId!: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from debe tener el formato YYYY-MM-DD',
  })
  @IsISO8601({ strict: true }, { message: 'from debe ser una fecha válida' })
  from!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to debe tener el formato YYYY-MM-DD',
  })
  @IsISO8601({ strict: true }, { message: 'to debe ser una fecha válida' })
  to!: string;
}
