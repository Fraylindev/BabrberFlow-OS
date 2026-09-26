import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TeamInvitationStatus } from '@prisma/client';

export class ListTeamInvitationsDto {
  @IsOptional()
  @IsEnum(TeamInvitationStatus)
  status?: TeamInvitationStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
