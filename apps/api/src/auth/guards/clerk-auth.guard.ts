import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ClerkSessionVerifierService } from '../clerk/clerk-session-verifier.service';
import { AuthenticatedRequest } from '../types/authenticated-request';

export const ORGANIZATION_ID_HEADER = 'x-organization-id';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly verifier: ClerkSessionVerifierService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const organizationId = this.readOrganizationId(request);
    const session = await this.verifier.verify(this.toWebRequest(request));

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
