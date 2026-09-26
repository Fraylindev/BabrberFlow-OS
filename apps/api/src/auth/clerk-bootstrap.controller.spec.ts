import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ClerkOnboardingRequest } from './guards/clerk-onboarding.guard';
import { ClerkBootstrapController } from './clerk-bootstrap.controller';
import type { ClerkBootstrapService } from './clerk-bootstrap.service';

describe('ClerkBootstrapController', () => {
  const resolve = jest.fn();
  const controller = new ClerkBootstrapController({
    resolve,
  } as unknown as ClerkBootstrapService);

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.REQUIRE_INTERNAL_MFA;
  });

  afterAll(() => delete process.env.REQUIRE_INTERNAL_MFA);

  it('resuelve exclusivamente el sub verificado por el guard', async () => {
    const request = {
      clerkSession: { clerkUserId: 'user_clerk_123', sessionId: 'sess_123' },
    } as ClerkOnboardingRequest;
    resolve.mockResolvedValue({ state: 'READY' });

    await expect(controller.resolve(request)).resolves.toEqual({
      state: 'READY',
    });
    expect(resolve).toHaveBeenCalledWith('user_clerk_123');
  });

  it('falla cerrado si el contexto verificado no está presente', () => {
    expect(() => controller.resolve({} as ClerkOnboardingRequest)).toThrow(
      UnauthorizedException,
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it('exige segundo factor antes de revelar las organizaciones si se activa MFA', () => {
    process.env.REQUIRE_INTERNAL_MFA = 'true';
    expect(() =>
      controller.resolve({
        clerkSession: { clerkUserId: 'user_clerk_123', sessionId: 'sess_123' },
      } as ClerkOnboardingRequest),
    ).toThrow(ForbiddenException);
    expect(resolve).not.toHaveBeenCalled();
  });
});
