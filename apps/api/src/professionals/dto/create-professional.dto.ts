import { IsString, IsOptional, IsNotEmpty, IsInt } from 'class-validator';

export class CreateProfessionalDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  specialty?: string;

  @IsInt()
  @IsOptional()
  experienceYears?: number;
}
