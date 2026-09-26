import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Prisma, type EmailOutbox } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  type NotificationQueryDto,
  type UpdateEmailPreferenceDto,
} from './email-preference.dto';
import {
  canManuallyRetry,
  corroborateRecipient,
  isCurrentIntent,
  type EmailEvent,
  type EmailState,
} from './notification-policy';
import {
  lockEmailBooking,
  obsoletePendingEmail,
} from './notification-producer';

export const includeHistory = {
  event: {
    include: {
      preference: {
        include: {
          client: { select: { emailRevision: true } },
          booking: { select: { status: true } },
        },
      },
    },
  },
} satisfies Prisma.EmailOutboxInclude;
type HistoryRow = Prisma.EmailOutboxGetPayload<{
  include: typeof includeHistory;
}>;

export function currentHistoryIntent(row: HistoryRow) {
  const pref = row.event.preference;
  return isCurrentIntent(
    {
      sequence: row.eventSequence,
      contactRevision: row.event.contactRevision,
      preferenceVersion: row.event.preferenceVersion,
      event: row.event.kind as EmailEvent,
      bookingStatus: row.event.bookingStatus,
    },
    {
      sequence: pref.sequence,
      contactRevision: pref.client.emailRevision,
      preferenceVersion: pref.version,
      optedIn: pref.optedIn,
      contactReviewed:
        pref.reviewedContactRevision === pref.client.emailRevision,
      status: pref.booking.status,
    },
  );
}

function retryAllowed(row: HistoryRow, now: Date) {
  return canManuallyRetry({
    state: row.status as EmailState,
    attempts: row.attempts,
    createdAt: row.createdAt,
    now,
    retryAfter: row.retryAfter,
    current: currentHistoryIntent(row),
  });
}

function historyProjection(row: HistoryRow, mayRetry: boolean, now: Date) {
  return {
    id: row.id,
    bookingId: row.bookingId,
    event: row.event.kind,
    channel: row.channel,
    createdAt: row.createdAt,
    status: row.status,
    attempts: row.attempts,
    reason: row.reason,
    recipientMasked: row.recipient ? '***@***' : null,
    canRetry: mayRetry && retryAllowed(row, now),
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async history(
    organizationId: string,
    query: NotificationQueryDto,
    mayRetry: boolean,
    bookingId?: string,
  ) {
    const selectedBooking = bookingId ?? query.bookingId;
    if (selectedBooking)
      await this.assertBooking(this.prisma.db, organizationId, selectedBooking);
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const where = {
      organizationId,
      ...(selectedBooking ? { bookingId: selectedBooking } : {}),
    };
    const [total, rows] = await this.prisma.db.$transaction([
      this.prisma.db.emailOutbox.count({ where }),
      this.prisma.db.emailOutbox.findMany({
        where,
        include: includeHistory,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const now = new Date();
    return {
      data: rows.map((row) => historyProjection(row, mayRetry, now)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async preference(
    organizationId: string,
    bookingId: string,
    tx: Prisma.TransactionClient = this.prisma.db,
  ) {
    await this.assertBooking(tx, organizationId, bookingId);
    const pref = await tx.bookingEmailPreference.findUnique({
      where: { bookingId_organizationId: { bookingId, organizationId } },
      include: { client: { select: { emailRevision: true } } },
    });
    return {
      version: pref?.version ?? 0,
      optedIn: pref?.optedIn ?? false,
      noticeVersion: pref?.noticeVersion ?? null,
      recordedAt: pref?.recordedAt ?? null,
      source: pref?.source ?? null,
      contactReviewed:
        !!pref && pref.reviewedContactRevision === pref.client.emailRevision,
    };
  }

  async updatePreference(
    organizationId: string,
    bookingId: string,
    userId: string,
    dto: UpdateEmailPreferenceDto,
  ) {
    const result = await this.prisma.db.$transaction(async (tx) => {
      await lockEmailBooking(tx, organizationId, bookingId);
      const booking = await this.assertBooking(tx, organizationId, bookingId);
      const client = await tx.client.findFirstOrThrow({
        where: { id: booking.clientId, organizationId },
        select: { email: true, emailRevision: true },
      });
      const current = await tx.bookingEmailPreference.findUnique({
        where: { bookingId_organizationId: { bookingId, organizationId } },
      });
      if ((current?.version ?? 0) !== dto.expectedVersion) {
        throw new ConflictException(
          'La preferencia cambió. Vuelve a consultarla',
        );
      }
      const reviewed = corroborateRecipient({
        ...dto,
        reviewedEmail: dto.reviewedEmail,
        persistedEmail: client.email,
      });
      if (dto.optedIn && !reviewed.recipient) {
        throw new ConflictException(
          'Revisa el correo del cliente antes de habilitar los avisos',
        );
      }
      const now = new Date();
      const data = {
        optedIn: dto.optedIn,
        noticeVersion: dto.noticeVersion,
        recordedAt: now,
        source: 'STAFF',
        version: dto.expectedVersion + 1,
        reviewedContactRevision: reviewed.recipient
          ? client.emailRevision
          : null,
      };
      await tx.bookingEmailPreference.upsert({
        where: { bookingId_organizationId: { bookingId, organizationId } },
        create: {
          bookingId,
          organizationId,
          clientId: booking.clientId,
          ...data,
        },
        update: data,
      });
      await obsoletePendingEmail(
        tx,
        organizationId,
        bookingId,
        'PREFERENCE_CHANGED',
        now,
      );
      return this.preference(organizationId, bookingId, tx);
    });
    await this.audit.log({
      organizationId,
      userId,
      entity: 'BookingEmailPreference',
      entityId: bookingId,
      action: dto.optedIn ? 'OPT_IN' : 'OPT_OUT',
    });
    return result;
  }

  async retry(organizationId: string, id: string, userId: string) {
    const result = await this.prisma.db.$transaction(async (tx) => {
      const locator: Pick<EmailOutbox, 'bookingId'> | null =
        await tx.emailOutbox.findFirst({
          where: { id, organizationId },
          select: { bookingId: true },
        });
      if (!locator) throw new NotFoundException('Notificación no encontrada');
      await lockEmailBooking(tx, organizationId, locator.bookingId);
      const row = await tx.emailOutbox.findFirst({
        where: { id, organizationId },
        include: includeHistory,
      });
      const now = new Date();
      if (!row) throw new NotFoundException('Notificación no encontrada');
      if (!retryAllowed(row, now))
        throw new ConflictException('Este aviso ya no admite reintento');
      const changed = await tx.emailOutbox.updateMany({
        where: { id, organizationId, status: 'RETRY', leaseToken: null },
        data: { nextAttemptAt: now },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Este aviso ya no admite reintento');
      }
      return historyProjection(row, true, now);
    });
    await this.audit.log({
      organizationId,
      userId,
      entity: 'EmailOutbox',
      entityId: id,
      action: 'RETRY',
    });
    return result;
  }

  private async assertBooking(
    tx: Prisma.TransactionClient,
    organizationId: string,
    bookingId: string,
  ) {
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, organizationId },
      select: { clientId: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    return booking;
  }
}
