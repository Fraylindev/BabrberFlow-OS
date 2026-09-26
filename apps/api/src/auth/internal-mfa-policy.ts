import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

// Hobby production operates with this switch off. Once Clerk MFA is available,
// activating it also closes every legacy JWT path to internal resources.
export function internalMfaRequired(): boolean {
  return process.env.REQUIRE_INTERNAL_MFA === 'true';
}

export function assertInternalMfa(verified: boolean | undefined): void {
  if (internalMfaRequired() && verified !== true) {
    throw new ForbiddenException(
      'Completa la verificación adicional de tu cuenta para continuar.',
    );
  }
}

export function assertLegacyAuthAllowed(): void {
  if (internalMfaRequired()) {
    throw new UnauthorizedException(
      'Inicia sesión con tu cuenta actual para continuar.',
    );
  }
}
