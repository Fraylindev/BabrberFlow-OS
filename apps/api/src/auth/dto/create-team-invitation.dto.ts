import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UserRole } from '@prisma/client';

const INVITABLE_ROLES = [
  UserRole.ADMIN,
  UserRole.BARBER,
  UserRole.RECEPTIONIST,
] as const;

export class CreateTeamInvitationDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn(INVITABLE_ROLES)
  role!: 'ADMIN' | 'BARBER' | 'RECEPTIONIST';

  @IsOptional()
  @IsBoolean()
  createPublicProfile?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays: number = 30;
}
