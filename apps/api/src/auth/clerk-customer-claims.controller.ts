import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { ClerkCustomerClaimsService } from './clerk-customer-claims.service';
import { ClerkCustomerClaimDto } from './dto/clerk-customer-claim.dto';
import {
  ClerkOnboardingGuard,
  type ClerkOnboardingRequest,
} from './guards/clerk-onboarding.guard';

@Controller('auth/clerk/customer')
export class ClerkCustomerClaimsController {
  constructor(private readonly claims: ClerkCustomerClaimsService) {}

  @UseGuards(ClerkOnboardingGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('claims')
  async claim(
    @Req() request: ClerkOnboardingRequest,
    @Body() dto: ClerkCustomerClaimDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const clerkUserId = request.clerkSession?.clerkUserId;
    if (!clerkUserId) {
      throw new UnauthorizedException('Sesión no válida');
    }

    const result = await this.claims.claim(clerkUserId, dto);
    response.status(result.isNew ? HttpStatus.CREATED : HttpStatus.OK);
    return { claimed: true };
  }
}
