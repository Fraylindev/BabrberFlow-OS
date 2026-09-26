import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AvailabilityBlockStatus } from '@prisma/client';
import { ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN } from '../professional-availability.util';

const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class WeeklyShiftDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  @Matches(HH_MM_PATTERN)
  startTime!: string;

  @IsString()
  @Matches(HH_MM_PATTERN)
  endTime!: string;
}

export class ReplaceWeeklyScheduleDto {
  @IsArray()
  @ArrayMaxSize(35)
  @ValidateNested({ each: true })
  @Type(() => WeeklyShiftDto)
  shifts!: WeeklyShiftDto[];
}

export class CreateAvailabilityBlockDto {
  @IsISO8601({ strict: true })
  @Matches(ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN, {
    message: 'startTime debe incluir Z u offset explícito (±HH:mm)',
  })
  startTime!: string;

  @IsISO8601({ strict: true })
  @Matches(ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN, {
    message: 'endTime debe incluir Z u offset explícito (±HH:mm)',
  })
  endTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateAvailabilityBlockDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN, {
    message: 'startTime debe incluir Z u offset explícito (±HH:mm)',
  })
  startTime?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN, {
    message: 'endTime debe incluir Z u offset explícito (±HH:mm)',
  })
  endTime?: string;

  @IsOptional()
  @IsEnum(AvailabilityBlockStatus)
  status?: AvailabilityBlockStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export class QueryProfessionalAvailabilityDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @IsOptional()
  @IsEnum(AvailabilityBlockStatus)
  status?: AvailabilityBlockStatus;
}

export interface WeeklyShiftResponseDto {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface AvailabilityBlockResponseDto {
  id: string;
  startTime: Date;
  endTime: Date;
  status: AvailabilityBlockStatus;
  note: string | null;
}

export interface ProfessionalAvailabilityResponseDto {
  professionalId: string;
  timeZone: string;
  inheritsOrganizationHours: boolean;
  weeklySchedule: WeeklyShiftResponseDto[];
  blocks: AvailabilityBlockResponseDto[];
}
