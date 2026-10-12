import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BookingStatus } from '@prisma/client';
export class CalendarQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) from: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) to: string;
  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
  @IsOptional() @IsUUID() professionalId?: string;
  @IsOptional() @IsString() @MaxLength(2048) cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
export class RescheduleDaysQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) from: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) to: string;
}
export class RescheduleAvailabilityQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string;
}
export class CalendarRescheduleDto {
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  startTime: string;
  @IsISO8601({ strict: true }) expectedUpdatedAt: string;
  @Matches(/^m3\.[a-f0-9]{64}$/) expectedRevision: string;
}
