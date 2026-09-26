import { Transform } from 'class-transformer';
import { IsEmail, IsIn, MaxLength } from 'class-validator';
import { UserRole } from '@prisma/client';

const ASSIGNABLE_TEAM_ROLES = [
  UserRole.ADMIN,
  UserRole.BARBER,
  UserRole.RECEPTIONIST,
] as const;

export class UpdateTeamMemberRoleDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn(ASSIGNABLE_TEAM_ROLES)
  role!: 'ADMIN' | 'BARBER' | 'RECEPTIONIST';
}
