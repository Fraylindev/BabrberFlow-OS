import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ClerkBootstrapService } from './clerk-bootstrap.service';
import {
  ClerkOnboardingGuard,
  type ClerkOnboardingRequest,
} from './guards/clerk-onboarding.guard';

@Controller('auth/clerk')
export class ClerkBootstrapController {
  constructor(private readonly bootstrap: ClerkBootstrapService) {}

  @UseGuards(ClerkOnboardingGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('bootstrap')
  resolve(@Req() request: ClerkOnboardingRequest) {
    const clerkUserId = request.clerkSession?.clerkUserId;
    if (!clerkUserId) {
      throw new UnauthorizedException('Sesión no válida');
    }
    return this.bootstrap.resolve(clerkUserId);
  }
}
