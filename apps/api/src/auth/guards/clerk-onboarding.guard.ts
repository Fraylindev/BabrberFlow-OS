import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ClerkSessionVerifierService } from '../clerk/clerk-session-verifier.service';

export interface ClerkOnboardingRequest extends Request {
  clerkSession?: {
    clerkUserId: string;
    sessionId: string;
  };
}

@Injectable()
export class ClerkOnboardingGuard implements CanActivate {
  private readonly logger = new Logger(ClerkOnboardingGuard.name);

  constructor(private readonly verifier: ClerkSessionVerifierService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ClerkOnboardingRequest>();

    try {
      const session = await this.verifier.verify(this.toWebRequest(request));

      request.clerkSession = {
        clerkUserId: session.clerkUserId,
        sessionId: session.sessionId,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      const kind =
        error instanceof Error ? error.constructor.name : 'UnknownError';
      this.logger.error(`Error inesperado en ClerkOnboardingGuard: ${kind}`);
      throw new UnauthorizedException('Sesión no válida');
    }
  }

  private toWebRequest(request: Request): globalThis.Request {
    const headers = new Headers();

    for (const [name, value] of Object.entries(request.headers)) {
      if (Array.isArray(value)) {
        value.forEach((item) => headers.append(name, item));
      } else if (value !== undefined) {
        headers.set(name, value);
      }
    }

    const protocol = request.protocol || 'http';
    const host = request.get('host') || 'localhost';
    const path = request.originalUrl || request.url || '/';

    return new globalThis.Request(`${protocol}://${host}${path}`, {
      method: request.method,
      headers,
    });
  }
}
