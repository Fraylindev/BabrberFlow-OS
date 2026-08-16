import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ClerkSessionVerifierService } from '../clerk/clerk-session-verifier.service';
import { ClerkOnboardingGuard } from './clerk-onboarding.guard';
import type { ClerkOnboardingRequest } from './clerk-onboarding.guard';

describe('ClerkOnboardingGuard', () => {
  let verifier: { verify: jest.Mock };
  let guard: ClerkOnboardingGuard;

  beforeEach(() => {
    verifier = {
      verify: jest.fn(),
    };

    guard = new ClerkOnboardingGuard(
      verifier as unknown as ClerkSessionVerifierService,
    );
  });

  function createContext(
    reqOverrides: Record<string, unknown> = {},
  ): ExecutionContext {
    const req: ClerkOnboardingRequest = {
      headers: { authorization: 'Bearer session-token' },
      protocol: 'http',
      get: (header: string) =>
        header === 'host' ? 'localhost:3000' : undefined,
      originalUrl: '/auth/clerk/onboarding',
      method: 'POST',
      ...reqOverrides,
    } as unknown as ClerkOnboardingRequest;

    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  }

  it('permite acceso e inyecta clerkSession cuando la sesión es válida', async () => {
    verifier.verify.mockResolvedValue({
      clerkUserId: 'user_clerk_123',
      sessionId: 'sess_123',
    });

    const context = createContext();
    const req = context.switchToHttp().getRequest<ClerkOnboardingRequest>();

    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(req.clerkSession).toEqual({
      clerkUserId: 'user_clerk_123',
      sessionId: 'sess_123',
    });
  });

  it('falla cerrado con UnauthorizedException cuando verifier lanza UnauthorizedException', async () => {
    verifier.verify.mockRejectedValue(
      new UnauthorizedException('Sesión no válida'),
    );

    const context = createContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Sesión no válida'),
    );
  });

  it('falla cerrado con UnauthorizedException genérico ante error inesperado', async () => {
    verifier.verify.mockRejectedValue(new Error('Network failure'));

    const context = createContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Sesión no válida'),
    );
  });
});
