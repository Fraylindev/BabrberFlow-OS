import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsEmail()
  email!: string;
}
