import 'reflect-metadata';
import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { EMAIL_NOTICE_VERSION } from './notification-policy';

export class PublicEmailPreferenceDto {
  @IsBoolean()
  optedIn!: boolean;

  @Equals(EMAIL_NOTICE_VERSION)
  noticeVersion!: string;
}

export class InternalEmailPreferenceDto extends PublicEmailPreferenceDto {
  @ValidateIf(
    (dto: InternalEmailPreferenceDto) =>
      dto.optedIn || dto.reviewedEmail !== undefined,
  )
  @IsEmail()
  @MaxLength(254)
  reviewedEmail?: string;
}

export class UpdateEmailPreferenceDto extends InternalEmailPreferenceDto {
  @IsInt()
  @Min(0)
  expectedVersion!: number;
}

export class PublicEmailPreferenceInput {
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => PublicEmailPreferenceDto)
  emailNotifications?: PublicEmailPreferenceDto;
}

export class InternalEmailPreferenceInput {
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => InternalEmailPreferenceDto)
  emailNotifications?: InternalEmailPreferenceDto;
}

export class NotificationQueryDto {
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page?: number;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  @IsUUID()
  bookingId?: string;
}
