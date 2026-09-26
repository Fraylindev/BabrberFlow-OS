import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { TeamService } from './team.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuditModule } from '../audit/audit.module';
import {
  clerkAuthConfigProvider,
  clerkBackendClientProvider,
  clerkInvitationRedirectUrlProvider,
} from './clerk/clerk-auth.providers';
import { ClerkSessionVerifierService } from './clerk/clerk-session-verifier.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

import { ClerkOnboardingController } from './clerk-onboarding.controller';
import { ClerkOnboardingService } from './clerk-onboarding.service';
import { ClerkOnboardingGuard } from './guards/clerk-onboarding.guard';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ClerkMeController } from './clerk-me.controller';
import {
  TeamInvitationAcceptanceController,
  TeamInvitationsController,
} from './team-invitations.controller';
import { TeamInvitationsService } from './team-invitations.service';
import { B2bAuthGuard } from './guards/b2b-auth.guard';
import { ClerkBootstrapController } from './clerk-bootstrap.controller';
import { ClerkBootstrapService } from './clerk-bootstrap.service';
import { ClerkCustomerClaimsController } from './clerk-customer-claims.controller';
import { ClerkCustomerClaimsService } from './clerk-customer-claims.service';

if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET no está configurado. Define esta variable en tu archivo .env antes de iniciar la API (ver .env.example).',
  );
}

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' }, // El token expirará en 1 día
    }),
    AuditModule,
    OrganizationsModule,
  ],
  controllers: [
    AuthController,
    ClerkOnboardingController,
    ClerkMeController,
    TeamInvitationsController,
    TeamInvitationAcceptanceController,
    ClerkBootstrapController,
    ClerkCustomerClaimsController,
  ],
  providers: [
    AuthService,
    TeamService,
    JwtStrategy,
    clerkAuthConfigProvider,
    clerkBackendClientProvider,
    clerkInvitationRedirectUrlProvider,
    ClerkSessionVerifierService,
    ClerkAuthGuard,
    ClerkOnboardingService,
    ClerkOnboardingGuard,
    TeamInvitationsService,
    B2bAuthGuard,
    ClerkBootstrapService,
    ClerkCustomerClaimsService,
  ],
  exports: [
    ClerkAuthGuard,
    ClerkOnboardingGuard,
    ClerkOnboardingService,
    B2bAuthGuard,
  ],
})
export class AuthModule {}
