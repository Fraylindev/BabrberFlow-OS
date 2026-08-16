import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ClerkSessionVerifierService } from '../clerk/clerk-session-verifier.service';
import { toWebRequest } from '../clerk/to-web-request';
import { AuthenticatedRequest } from '../types/authenticated-request';

export const ORGANIZATION_ID_HEADER = 'x-organization-id';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly verifier: ClerkSessionVerifierService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // readOrganizationId lanza UnauthorizedException directamente; se deja fuera
    // del try/catch para que no sea capturado ni transformado.
    const organizationId = this.readOrganizationId(request);

    try {
      const session = await this.verifier.verify(toWebRequest(request));

      const user = await this.prisma.db.user.findUnique({
        where: { clerkUserId: session.clerkUserId },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        throw new UnauthorizedException(
          'Sesión no válida para esta organización',
        );
      }

      const membership = await this.prisma.db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId,
          },
        },
        select: { organizationId: true, role: true },
      });

      if (!membership) {
        throw new UnauthorizedException(
          'Sesión no válida para esta organización',
        );
      }

      request.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: membership.organizationId,
        role: membership.role,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(
        `Error inesperado en ClerkAuthGuard: ${error instanceof Error ? error.constructor.name : 'UnknownError'}`,
      );
      throw new UnauthorizedException(
        'Sesión no válida para esta organización',
      );
    }
  }

  private readOrganizationId(request: Request): string {
    const header = request.headers[ORGANIZATION_ID_HEADER];
    const organizationId = Array.isArray(header) ? header[0] : header;

    if (!organizationId || !isUUID(organizationId)) {
      throw new UnauthorizedException(
        'Sesión no válida para esta organización',
      );
    }

    return organizationId;
  }
}
