import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { lockOrganizationSchedule } from '../common/organization-schedule-lock';
import {
  classifyBookingChange,
  corroborateRecipient,
  EMAIL_NOTICE_VERSION,
  INTENT_LIFETIME_MS,
  type BookingRevision,
} from './notification-policy';

export interface EmailChoice {
  optedIn: boolean;
  noticeVersion: string;
  reviewedEmail?: string;
  source: 'PUBLIC' | 'STAFF';
}

export async function lockEmailClient(
  tx: Prisma.TransactionClient,
  organizationId: string,
  clientId: string,
) {
  await lockOrganizationSchedule(tx, organizationId);
  const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id" FROM "Client"
    WHERE "id" = ${clientId} AND "organizationId" = ${organizationId}
    FOR UPDATE
  `);
  if (!rows.length) throw new NotFoundException('Cliente no encontrado');
}

/** All callers acquire Client before Booking; preliminary lookup grants no access. */
export async function lockEmailBooking(
  tx: Prisma.TransactionClient,
  organizationId: string,
  bookingId: string,
) {
  const locator = await tx.booking.findFirst({
    where: { id: bookingId, organizationId },
    select: { clientId: true },
  });
  if (!locator) throw new NotFoundException('Reserva no encontrada');
  await lockEmailClient(tx, organizationId, locator.clientId);
  const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id" FROM "Booking"
    WHERE "id" = ${bookingId} AND "organizationId" = ${organizationId}
      AND "clientId" = ${locator.clientId}
    FOR UPDATE
  `);
  if (!rows.length) throw new NotFoundException('Reserva no encontrada');
}

export async function obsoletePendingEmail(
  tx: Prisma.TransactionClient,
  organizationId: string,
  bookingId: string,
  reason: string,
  now: Date,
) {
  await tx.emailOutbox.updateMany({
    where: {
      organizationId,
      bookingId,
      status: { in: ['PENDING', 'RETRY', 'PROCESSING'] },
    },
    data: {
      status: 'OBSOLETE',
      reason,
      closedAt: now,
      leaseToken: null,
      leaseExpiresAt: null,
    },
  });
}

/** Called inside the business transaction, exactly once after a real write. */
export async function recordBookingEmailChange(
  tx: Prisma.TransactionClient,
  organizationId: string,
  before: BookingRevision | null,
  after: BookingRevision & { id: string; clientId: string },
  choice?: EmailChoice,
  now = new Date(),
) {
  const change = classifyBookingChange(before, after, now);
  if (!change.changed) return;
  const previousEvent = await tx.bookingEmailEvent.findFirst({
    where: { bookingId: after.id, organizationId },
    orderBy: { sequence: 'desc' },
  });
  if (
    previousEvent &&
    !classifyBookingChange(
      {
        status: previousEvent.bookingStatus,
        startTime: previousEvent.startTime,
        endTime: previousEvent.endTime,
        serviceId: previousEvent.serviceId,
        professionalId: previousEvent.professionalId,
      },
      after,
      now,
    ).changed
  )
    return;
  const client = await tx.client.findFirst({
    where: { id: after.clientId, organizationId },
    select: { email: true, emailRevision: true },
  });
  if (!client) throw new NotFoundException('Cliente no encontrado');
  const checked = corroborateRecipient({
    optedIn: choice?.optedIn === true,
    noticeVersion: choice?.noticeVersion ?? null,
    persistedEmail: client.email,
    reviewedEmail: choice?.reviewedEmail,
  });
  const preference = await tx.bookingEmailPreference.upsert({
    where: {
      bookingId_organizationId: { bookingId: after.id, organizationId },
    },
    create: {
      bookingId: after.id,
      organizationId,
      clientId: after.clientId,
      sequence: 1,
      optedIn:
        choice?.optedIn === true &&
        choice.noticeVersion === EMAIL_NOTICE_VERSION,
      version: choice ? 1 : 0,
      noticeVersion: choice?.noticeVersion ?? null,
      recordedAt: choice ? now : null,
      source: choice?.source ?? null,
      reviewedContactRevision: checked.recipient ? client.emailRevision : null,
    },
    update: { sequence: { increment: 1 } },
  });
  await obsoletePendingEmail(
    tx,
    organizationId,
    after.id,
    'BOOKING_CHANGED',
    now,
  );
  await tx.bookingEmailEvent.create({
    data: {
      bookingId: after.id,
      organizationId,
      sequence: preference.sequence,
      kind: change.event ?? 'INVALIDATED',
      bookingStatus: after.status,
      startTime: after.startTime,
      endTime: after.endTime,
      serviceId: after.serviceId,
      professionalId: after.professionalId,
      contactRevision: client.emailRevision,
      preferenceVersion: preference.version,
      createdAt: now,
    },
  });
  if (!change.event) return;
  let reason: string | null = null;
  if (!preference.optedIn) reason = 'NO_CONSENT';
  else if (preference.reviewedContactRevision !== client.emailRevision) {
    reason = before ? 'CONTACT_NOT_REVIEWED' : checked.reason;
  }
  await tx.emailOutbox.create({
    data: {
      bookingId: after.id,
      organizationId,
      eventSequence: preference.sequence,
      status: reason ? 'OMITTED' : 'PENDING',
      reason,
      createdAt: now,
      expiresAt: new Date(now.getTime() + INTENT_LIFETIME_MS),
      nextAttemptAt: now,
      closedAt: reason ? now : null,
    },
  });
}
