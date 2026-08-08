import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  duration!: number; // Duración en minutos

  @IsNumber()
  @Min(0)
  price!: number;
}
