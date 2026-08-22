import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { B2B_ROLES } from './roles.constants';

export type ClerkBootstrapState = 'ONBOARDING_REQUIRED' | 'NO_ACCESS' | 'READY';

@Injectable()
export class ClerkBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(clerkUserId: string) {
    const user = await this.prisma.db.user.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        name: true,
        lastOrganizationId: true,
        memberships: {
          where: { role: { in: B2B_ROLES } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            role: true,
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (!user) {
      return {
        state: 'ONBOARDING_REQUIRED' as ClerkBootstrapState,
        user: null,
        preferredOrganizationId: null,
        memberships: [],
      };
    }

    const memberships = user.memberships.map((membership) => ({
      role: membership.role,
      organization: membership.organization,
    }));
    const preferredOrganizationId = memberships.some(
      ({ organization }) => organization.id === user.lastOrganizationId,
    )
      ? user.lastOrganizationId
      : null;

    if (preferredOrganizationId) {
      memberships.sort((left, right) =>
        left.organization.id === preferredOrganizationId
          ? -1
          : right.organization.id === preferredOrganizationId
            ? 1
            : 0,
      );
    }

    return {
      state: (memberships.length > 0
        ? 'READY'
        : 'NO_ACCESS') as ClerkBootstrapState,
      user: { id: user.id, name: user.name },
      preferredOrganizationId,
      memberships,
    };
  }
}
