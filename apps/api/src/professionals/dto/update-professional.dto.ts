import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class UpdateProfessionalDto {
  @IsString()
  @IsOptional()
  name?: string;

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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
