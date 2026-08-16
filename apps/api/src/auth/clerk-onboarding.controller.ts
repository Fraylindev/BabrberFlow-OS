import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ClerkOnboardingGuard } from './guards/clerk-onboarding.guard';
import type { ClerkOnboardingRequest } from './guards/clerk-onboarding.guard';
import { ClerkOnboardingService } from './clerk-onboarding.service';
import { ClerkOnboardingDto } from './dto/clerk-onboarding.dto';

@Controller('auth/clerk')
export class ClerkOnboardingController {
  constructor(private readonly onboardingService: ClerkOnboardingService) {}

  @UseGuards(ClerkOnboardingGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('onboarding')
  async onboard(
    @Req() req: ClerkOnboardingRequest,
    @Body() dto: ClerkOnboardingDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clerkUserId = req.clerkSession?.clerkUserId;
    if (!clerkUserId) {
      throw new UnauthorizedException('Sesión no válida');
    }

    const result = await this.onboardingService.onboardOwner(clerkUserId, dto);
    res.status(result.isNew ? HttpStatus.CREATED : HttpStatus.OK);

    return {
      user: result.user,
      organization: result.organization,
      role: result.role,
    };
  }
}
