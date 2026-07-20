import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

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
}
