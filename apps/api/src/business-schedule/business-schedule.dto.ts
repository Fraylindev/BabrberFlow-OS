import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScheduleRevisionDto {
  @IsInt() @Min(0) expectedRevision!: number;
}
export class ScheduleWindowDto {
  @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime!: string;
  @IsString() @Matches(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/) endTime!: string;
}
export class ScheduleDayDto {
  @IsInt() @Min(0) @Max(6) dayOfWeek!: number;
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ScheduleWindowDto)
  windows!: ScheduleWindowDto[];
}
export class ReplaceBusinessWeekDto extends ScheduleRevisionDto {
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => ScheduleDayDto)
  week!: ScheduleDayDto[];
}
export class CreateBusinessClosureDto extends ScheduleRevisionDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate!: string;
  @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime!: string;
  @IsString() @Matches(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/) endTime!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
export class ConfirmBusinessZoneDto extends ScheduleRevisionDto {
  @IsString() @MaxLength(32) regionId!: string;
}
export class SchedulePageDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset: number = 0;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number =
    50;
}
export class ScheduleClosuresQueryDto extends SchedulePageDto {
  @IsOptional() @Matches(/^(true|false)$/) includeCancelled?: string;
}
