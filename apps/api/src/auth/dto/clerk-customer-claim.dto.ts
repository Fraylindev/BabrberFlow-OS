import {
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ORGANIZATION_SLUG_INPUT_PATTERN,
  ORGANIZATION_SLUG_MAX_LENGTH,
  ORGANIZATION_SLUG_MIN_LENGTH,
} from '../organization-slug';

export class ClerkCustomerClaimDto {
  @IsUUID()
  bookingId!: string;

  @IsString()
  @MinLength(ORGANIZATION_SLUG_MIN_LENGTH)
  @MaxLength(ORGANIZATION_SLUG_MAX_LENGTH)
  @Matches(ORGANIZATION_SLUG_INPUT_PATTERN)
  organizationSlug!: string;
}
