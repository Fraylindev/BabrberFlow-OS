import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  assertInternalMfa,
  assertLegacyAuthAllowed,
} from './internal-mfa-policy';

describe('internal MFA activation', () => {
  const previous = process.env.REQUIRE_INTERNAL_MFA;
  afterEach(() => {
    if (previous === undefined) delete process.env.REQUIRE_INTERNAL_MFA;
    else process.env.REQUIRE_INTERNAL_MFA = previous;
  });

  it('allows Hobby operation only when the enforcement switch is off', () => {
    process.env.REQUIRE_INTERNAL_MFA = 'false';
    expect(() => assertInternalMfa(false)).not.toThrow();
    expect(() => assertLegacyAuthAllowed()).not.toThrow();
  });

  it('requires signed second-factor evidence and closes legacy access', () => {
    process.env.REQUIRE_INTERNAL_MFA = 'true';
    expect(() => assertInternalMfa(undefined)).toThrow(ForbiddenException);
    expect(() => assertInternalMfa(false)).toThrow(ForbiddenException);
    expect(() => assertInternalMfa(true)).not.toThrow();
    expect(() => assertLegacyAuthAllowed()).toThrow(UnauthorizedException);
  });
});
