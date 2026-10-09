import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Always first: Organization -> Client -> Booking -> Professional -> child rows. */
export async function lockOrganizationSchedule(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<void> {
  const rows = await tx.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT "id" FROM "Organization" WHERE "id"=${organizationId} FOR UPDATE`,
  );
  if (rows.length !== 1)
    throw new NotFoundException('Información no disponible.');
}
