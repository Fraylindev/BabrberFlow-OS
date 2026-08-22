import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import {
  isSerializationFailureError,
  isUniqueConstraintError,
} from '../common/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkOnboardingService } from './clerk-onboarding.service';
import { ClerkCustomerClaimDto } from './dto/clerk-customer-claim.dto';
import {
  normalizeAccountEmail,
  normalizeOrganizationSlug,
} from './organization-slug';

interface LockedBooking {
  id: string;
  organizationId: string;
  clientId: string;
}

interface LockedClient {
  id: string;
  organizationId: string;
  email: string | null;
  userId: string | null;
}

interface ClaimResult {
  isNew: boolean;
}

@Injectable()
export class ClerkCustomerClaimsService {
  private static readonly MAX_SERIALIZATION_ATTEMPTS = 3;
  private static readonly CONFLICT_MESSAGE =
    'No es posible reclamar esta reserva.';

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly onboarding: ClerkOnboardingService,
  ) {}

  async claim(
    clerkUserId: string,
    dto: ClerkCustomerClaimDto,
  ): Promise<ClaimResult> {
    const profile = await this.onboarding.getVerifiedClerkProfile(clerkUserId);
    const organizationSlug = normalizeOrganizationSlug(dto.organizationSlug);

    for (
      let attempt = 1;
      attempt <= ClerkCustomerClaimsService.MAX_SERIALIZATION_ATTEMPTS;
      attempt++
    ) {
      try {
        return await this.prisma.db.$transaction(
          (tx) =>
            this.claimInTransaction(
              tx,
              clerkUserId,
              profile.name,
              profile.email,
              dto.bookingId,
              organizationSlug,
            ),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error: unknown) {
        if (
          isSerializationFailureError(error) &&
          attempt < ClerkCustomerClaimsService.MAX_SERIALIZATION_ATTEMPTS
        ) {
          continue;
        }
        if (
          isSerializationFailureError(error) ||
          isUniqueConstraintError(error)
        ) {
          throw new ConflictException(
            ClerkCustomerClaimsService.CONFLICT_MESSAGE,
          );
        }
        throw error;
      }
    }

    throw new ConflictException(ClerkCustomerClaimsService.CONFLICT_MESSAGE);
  }

  private async claimInTransaction(
    tx: Prisma.TransactionClient,
    clerkUserId: string,
    name: string,
    verifiedEmail: string,
    bookingId: string,
    organizationSlug: string,
  ): Promise<ClaimResult> {
    const bookings = await tx.$queryRaw<LockedBooking[]>`
      SELECT b."id", b."organizationId", b."clientId"
      FROM "Booking" b
      INNER JOIN "Organization" o ON o."id" = b."organizationId"
      WHERE b."id" = ${bookingId} AND o."slug" = ${organizationSlug}
      FOR UPDATE OF b
    `;
    const booking = bookings[0];
    if (!booking) {
      throw new NotFoundException('No se encontró la reserva.');
    }

    const clients = await tx.$queryRaw<LockedClient[]>`
      SELECT c."id", c."organizationId", c."email", c."userId"
      FROM "Client" c
      WHERE c."id" = ${booking.clientId}
        AND c."organizationId" = ${booking.organizationId}
      FOR UPDATE OF c
    `;
    const client = clients[0];
    if (!client) {
      throw new NotFoundException('No se encontró la reserva.');
    }

    if (client.userId) {
      const linkedUser = await tx.user.findUnique({
        where: { id: client.userId },
        select: { clerkUserId: true },
      });
      if (linkedUser?.clerkUserId === clerkUserId) {
        return { isNew: false };
      }
      throw new ConflictException(ClerkCustomerClaimsService.CONFLICT_MESSAGE);
    }

    if (
      !client.email ||
      normalizeAccountEmail(client.email) !== verifiedEmail
    ) {
      throw new ConflictException(ClerkCustomerClaimsService.CONFLICT_MESSAGE);
    }

    let user = await tx.user.findUnique({
      where: { clerkUserId },
      select: { id: true, email: true },
    });

    const userByEmail = await tx.user.findUnique({
      where: { email: verifiedEmail },
      select: { id: true, clerkUserId: true },
    });
    if (userByEmail && userByEmail.id !== user?.id) {
      throw new ConflictException(ClerkCustomerClaimsService.CONFLICT_MESSAGE);
    }

    if (user && normalizeAccountEmail(user.email) !== verifiedEmail) {
      throw new ConflictException(ClerkCustomerClaimsService.CONFLICT_MESSAGE);
    }

    if (!user) {
      user = await tx.user.create({
        data: {
          name,
          email: verifiedEmail,
          password: null,
          clerkUserId,
        },
        select: { id: true, email: true },
      });
    }

    const linked = await tx.client.updateMany({
      where: {
        id: client.id,
        organizationId: booking.organizationId,
        userId: null,
      },
      data: { userId: user.id },
    });
    if (linked.count !== 1) {
      throw new ConflictException(ClerkCustomerClaimsService.CONFLICT_MESSAGE);
    }

    await this.audit.logTransactional(
      {
        organizationId: booking.organizationId,
        userId: user.id,
        action: 'LINK',
        entity: 'Client',
        entityId: client.id,
      },
      tx,
    );

    return { isNew: true };
  }
}
