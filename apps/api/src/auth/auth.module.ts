import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { TeamService } from './team.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuditModule } from '../audit/audit.module';
import {
  clerkAuthConfigProvider,
  clerkBackendClientProvider,
} from './clerk/clerk-auth.providers';
import { ClerkSessionVerifierService } from './clerk/clerk-session-verifier.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

import { ClerkOnboardingController } from './clerk-onboarding.controller';
import { ClerkOnboardingService } from './clerk-onboarding.service';
import { ClerkOnboardingGuard } from './guards/clerk-onboarding.guard';

if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET no está configurado. Define esta variable en tu archivo .env antes de iniciar la API (ver .env.example).',
  );
}

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' }, // El token expirará en 1 día
    }),
    AuditModule,
  ],
  controllers: [AuthController, ClerkOnboardingController],
  providers: [
    AuthService,
    TeamService,
    JwtStrategy,
    clerkAuthConfigProvider,
    clerkBackendClientProvider,
    ClerkSessionVerifierService,
    ClerkAuthGuard,
    ClerkOnboardingService,
    ClerkOnboardingGuard,
  ],
  exports: [ClerkAuthGuard, ClerkOnboardingGuard, ClerkOnboardingService],
})
export class AuthModule {}
