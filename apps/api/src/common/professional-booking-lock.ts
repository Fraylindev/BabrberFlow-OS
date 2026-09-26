import { Prisma, ProfessionalStatus } from '@prisma/client';

export interface LockedProfessional {
  id: string;
  status: ProfessionalStatus;
  isPublic: boolean;
}

/**
 * Shared PostgreSQL coordination point for every operation that can create
 * future operational work for a Professional and for archiving that profile.
 * The caller must execute this inside an interactive Prisma transaction and
 * keep the transaction open until its Booking/Professional write completes.
 */
export async function lockProfessionalForBookingIntegrity(
  transaction: Prisma.TransactionClient,
  professionalId: string,
  organizationId: string,
): Promise<LockedProfessional | null> {
  const rows = await transaction.$queryRaw<LockedProfessional[]>(Prisma.sql`
    SELECT "id", "status", "isPublic"
    FROM "Professional"
    WHERE "id" = ${professionalId} AND "organizationId" = ${organizationId}
    FOR UPDATE
  `);

  return rows[0] ?? null;
}
