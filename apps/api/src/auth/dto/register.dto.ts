import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsUUID,
} from 'class-validator';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from '../auth.constants';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_MIN_LENGTH_MESSAGE })
  password!: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId!: string;
}
