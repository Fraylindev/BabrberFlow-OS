import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  CLERK_AUTH_CONFIG,
  CLERK_BACKEND_CLIENT,
} from './clerk-auth.providers';
import type { ClerkBackendClient } from './clerk-auth.providers';
import type { ClerkAuthConfig } from './clerk-auth.config';

export interface VerifiedClerkSession {
  clerkUserId: string;
  sessionId: string;
}

@Injectable()
export class ClerkSessionVerifierService {
  constructor(
    @Inject(CLERK_BACKEND_CLIENT)
    private readonly clerk: ClerkBackendClient,
    @Inject(CLERK_AUTH_CONFIG)
    private readonly config: ClerkAuthConfig,
  ) {}

  async verify(request: Request): Promise<VerifiedClerkSession> {
    try {
      const state = await this.clerk.authenticateRequest(request, {
        acceptsToken: 'session_token',
        authorizedParties: this.config.authorizedParties,
        ...(this.config.audience ? { audience: this.config.audience } : {}),
      });

      if (!state.isAuthenticated || state.status !== 'signed-in') {
        throw new UnauthorizedException('Sesión no válida');
      }

      const auth = state.toAuth();
      const claims = auth.sessionClaims;

      if (
        !auth.userId ||
        !auth.sessionId ||
        claims.sub !== auth.userId ||
        claims.sid !== auth.sessionId ||
        claims.iss !== this.config.issuer
      ) {
        throw new UnauthorizedException('Sesión no válida');
      }

      // authenticateRequest valida firma, expiración, nbf, azp y, cuando se
      // configura, aud. La consulta autoritativa evita aceptar una sesión
      // revocada después de emitido el JWT.
      const session = await this.clerk.sessions.getSession(auth.sessionId);

      if (session.status !== 'active' || session.userId !== auth.userId) {
        throw new UnauthorizedException('Sesión no válida');
      }

      return {
        clerkUserId: auth.userId,
        sessionId: auth.sessionId,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Sesión no válida');
    }
  }
}
