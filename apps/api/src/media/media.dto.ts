import {
  IsIn,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MediaAssetPurpose } from '@prisma/client';

export class UploadMediaDto {
  @IsIn(Object.values(MediaAssetPurpose))
  purpose!: MediaAssetPurpose;

  @IsOptional()
  @IsUUID('4')
  targetId?: string;

  @IsString()
  @MaxLength(160)
  altText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string | null;

  @IsIn(['true', 'false'])
  decorative!: 'true' | 'false';
}

export class UpdateMediaDto {
  @IsInt()
  @Min(1)
  expectedRevision!: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  altText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string | null;

  @IsOptional()
  @IsIn([true, false])
  decorative?: boolean;
}

export class MediaMutationDto {
  @IsInt()
  @Min(1)
  expectedRevision!: number;

  @IsUUID('4')
  idempotencyKey!: string;
}

export class GalleryOrderDto {
  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @IsArray()
  @IsUUID('4', { each: true })
  assetIds!: string[];

  @IsOptional()
  @IsUUID('4')
  heroAssetId?: string | null;

  @IsUUID('4')
  idempotencyKey!: string;
}

export class GalleryOrderPublishDto {
  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @IsUUID('4')
  idempotencyKey!: string;
}

export class PromotionDraftDto {
  @IsUUID('4')
  idempotencyKey!: string;

  @IsString()
  @MaxLength(100)
  title!: string;

  @IsString()
  @MaxLength(500)
  body!: string;

  @IsString()
  @MaxLength(10)
  startDate!: string;

  @IsString()
  @MaxLength(10)
  endDate!: string;

  @IsOptional()
  @IsUUID('4')
  imageAssetId?: string;
}

export class UpdatePromotionDraftDto extends PromotionDraftDto {
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedVersion!: number;
}

export class PromotionMutationDto {
  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @IsUUID('4')
  idempotencyKey!: string;
}
