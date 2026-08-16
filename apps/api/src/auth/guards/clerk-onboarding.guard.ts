import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ClerkSessionVerifierService } from '../clerk/clerk-session-verifier.service';
import { toWebRequest } from '../clerk/to-web-request';

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
      const session = await this.verifier.verify(toWebRequest(request));

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
}
