import { createHmac, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import {
  canReconcileWithIdempotentPost,
  nextAttemptAt,
  normalizedRecipient,
  PRIVATE_RETENTION_MS,
  type EmailEvent,
} from './notification-policy';
import { lockEmailBooking } from './notification-producer';
import { currentHistoryIntent, includeHistory } from './notifications.service';
import { renderNotification } from './notification-templates';
import {
  type EmailChannelConfig,
  type EmailEnvelope,
  type EmailProvider,
  type SendResult,
  validEnvelope,
  type VerifiedEmailWebhook,
} from './resend.adapter';

const LEASE_MS = 30_000;

export class EmailWorker {
  constructor(
    private readonly db: PrismaClient,
    private readonly config: EmailChannelConfig,
    private readonly provider: EmailProvider,
    private readonly report: (code: string) => void = () => undefined,
  ) {}

  async tick(): Promise<boolean> {
    await this.housekeeping();
    if (!this.config.enabled) return false;
    const control = await this.db.emailChannelControl.findUnique({
      where: { id: 'EMAIL' },
    });
    if (!control || control.paused) return false;
    const token = randomUUID();
    const claimed = await this.db.$queryRaw<
      { id: string; organizationId: string; bookingId: string }[]
    >(Prisma.sql`
      UPDATE "EmailOutbox" SET "leaseToken" = ${token},
        "leaseExpiresAt" = CURRENT_TIMESTAMP + INTERVAL '30 seconds',
        "status" = CASE WHEN "status" = 'UNCERTAIN' THEN 'UNCERTAIN' ELSE 'PROCESSING' END
      WHERE "id" = (
        SELECT "id" FROM "EmailOutbox"
        WHERE "status" IN ('PENDING', 'RETRY', 'UNCERTAIN') AND "closedAt" IS NULL
          AND "leaseToken" IS NULL AND "nextAttemptAt" <= CURRENT_TIMESTAMP
          AND "expiresAt" > CURRENT_TIMESTAMP
        ORDER BY "nextAttemptAt", "id" FOR UPDATE SKIP LOCKED LIMIT 1
      ) RETURNING "id", "organizationId", "bookingId"
    `);
    if (!claimed.length) return false;
    const locator = claimed[0];
    const prepared = await this.db.$transaction(async (tx) => {
      await lockEmailBooking(tx, locator.organizationId, locator.bookingId);
      const row = await tx.emailOutbox.findFirst({
        where: {
          id: locator.id,
          organizationId: locator.organizationId,
          leaseToken: token,
        },
        include: includeHistory,
      });
      const now = new Date();
      if (!row || !row.leaseExpiresAt || row.leaseExpiresAt <= now) return null;
      const channel = await tx.emailChannelControl.findUnique({
        where: { id: 'EMAIL' },
      });
      if (!channel || channel.paused) {
        await tx.emailOutbox.updateMany({
          where: { id: row.id, leaseToken: token },
          data: {
            status:
              row.status === 'UNCERTAIN'
                ? 'UNCERTAIN'
                : row.attempts
                  ? 'RETRY'
                  : 'PENDING',
            leaseToken: null,
            leaseExpiresAt: null,
          },
        });
        return null;
      }
      const current = currentHistoryIntent(row);
      if (row.status === 'UNCERTAIN' && row.providerId) {
        return {
          id: row.id,
          organizationId: row.organizationId,
          providerId: row.providerId,
          payload: null,
        };
      }
      if (
        row.status === 'UNCERTAIN' &&
        !canReconcileWithIdempotentPost({
          firstDispatchedAt: row.firstDispatchedAt,
          createdAt: row.createdAt,
          now,
          attempts: row.attempts,
          hasSealedPayload:
            !!row.templateVersion && validEnvelope(row.sealedPayload),
          current,
        })
      ) {
        await tx.emailOutbox.updateMany({
          where: { id: row.id, leaseToken: token },
          data: {
            reason: 'UNRESOLVED',
            closedAt: now,
            leaseToken: null,
            leaseExpiresAt: null,
          },
        });
        return null;
      }
      if (!current || row.expiresAt <= now || row.attempts >= 5) {
        await tx.emailOutbox.updateMany({
          where: { id: row.id, leaseToken: token },
          data: {
            status: current ? 'FAILED' : 'OBSOLETE',
            reason: current ? 'BUDGET_EXHAUSTED' : 'BOOKING_CHANGED',
            closedAt: now,
            leaseToken: null,
            leaseExpiresAt: null,
          },
        });
        return null;
      }
      let payload: EmailEnvelope;
      let templateVersion = row.templateVersion;
      if (templateVersion && validEnvelope(row.sealedPayload))
        payload = row.sealedPayload;
      else {
        if (row.attempts > 0) {
          await tx.emailOutbox.updateMany({
            where: { id: row.id, leaseToken: token },
            data: {
              status: 'FAILED',
              reason: 'SEALED_PAYLOAD_UNAVAILABLE',
              closedAt: now,
              leaseToken: null,
              leaseExpiresAt: null,
            },
          });
          return null;
        }
        const client = await tx.client.findFirst({
          where: {
            id: row.event.preference.clientId,
            organizationId: row.organizationId,
          },
          select: { email: true },
        });
        const recipient = normalizedRecipient(client?.email);
        const organization = await tx.organization.findUnique({
          where: { id: row.organizationId },
          select: { name: true, timeZone: true },
        });
        const service = await tx.service.findFirst({
          where: {
            id: row.event.serviceId,
            organizationId: row.organizationId,
          },
          select: { name: true },
        });
        if (!recipient || !organization || !service) {
          await tx.emailOutbox.updateMany({
            where: { id: row.id, leaseToken: token },
            data: {
              status: 'OMITTED',
              reason: 'NO_VALID_EMAIL',
              closedAt: now,
              leaseToken: null,
              leaseExpiresAt: null,
            },
          });
          return null;
        }
        try {
          const rendered = renderNotification(row.event.kind as EmailEvent, {
            organizationName: organization.name,
            serviceName: service.name,
            startTime: row.event.startTime,
            timeZone: organization.timeZone,
          });
          templateVersion = rendered.version;
          const visibleName = organization.name.replace(/[<>"\\]/g, '').trim();
          payload = {
            from: this.config.fromAddress.includes('<')
              ? this.config.fromAddress
              : `${visibleName} <${this.config.fromAddress}>`,
            to: [recipient],
            reply_to: this.config.replyTo,
            subject: rendered.subject,
            text: rendered.text,
            html: rendered.html,
          };
          if (!validEnvelope(payload)) throw new Error('INVALID_ENVELOPE');
        } catch {
          await tx.emailOutbox.updateMany({
            where: { id: row.id, leaseToken: token },
            data: {
              status: 'FAILED',
              reason: 'INVALID_CONTENT',
              closedAt: now,
              leaseToken: null,
              leaseExpiresAt: null,
            },
          });
          return null;
        }
        if (
          !(await this.reserveAbuseBudget(
            tx,
            row.organizationId,
            recipient,
            now,
          ))
        ) {
          await tx.emailOutbox.updateMany({
            where: { id: row.id, leaseToken: token },
            data: {
              status: 'OMITTED',
              reason: 'ABUSE_LIMIT',
              closedAt: now,
              leaseToken: null,
              leaseExpiresAt: null,
            },
          });
          return null;
        }
      }
      // Durable permission precedes network; a crash after this point is ambiguous.
      const changed = await tx.emailOutbox.updateMany({
        where: {
          id: row.id,
          organizationId: row.organizationId,
          leaseToken: token,
          leaseExpiresAt: { gt: now },
        },
        data: {
          status: 'UNCERTAIN',
          attempts: { increment: 1 },
          firstDispatchedAt: row.firstDispatchedAt ?? now,
          recipient: payload.to[0],
          sealedPayload: payload as unknown as Prisma.InputJsonValue,
          templateVersion,
          leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
        },
      });
      return changed.count
        ? {
            id: row.id,
            organizationId: row.organizationId,
            providerId: null,
            payload,
          }
        : null;
    });
    if (!prepared) return true;
    if (prepared.providerId) {
      const state = await this.provider.retrieve(prepared.providerId);
      await this.db.emailOutbox.updateMany({
        where: {
          id: prepared.id,
          organizationId: prepared.organizationId,
          leaseToken: token,
          status: 'UNCERTAIN',
        },
        data: {
          ...(state
            ? {
                status: state,
                reason: state === 'FAILED' ? 'PROVIDER_REJECTED' : null,
                closedAt: new Date(),
              }
            : { nextAttemptAt: new Date(Date.now() + 300_000) }),
          leaseToken: null,
          leaseExpiresAt: null,
        },
      });
      return true;
    }
    let result: SendResult;
    try {
      result = await this.provider.send(
        prepared.payload!,
        `notification/${prepared.id}`,
      );
    } catch {
      result = { kind: 'UNCERTAIN' };
    }
    await this.finish(prepared.id, prepared.organizationId, token, result);
    return true;
  }

  private async finish(
    id: string,
    organizationId: string,
    token: string,
    result: SendResult,
  ) {
    await this.db.$transaction(async (tx) => {
      const row = await tx.emailOutbox.findFirst({
        where: { id, organizationId, leaseToken: token, status: 'UNCERTAIN' },
      });
      if (!row) return;
      const now = new Date();
      let data: Prisma.EmailOutboxUpdateManyMutationInput = {
        leaseToken: null,
        leaseExpiresAt: null,
      };
      if (result.kind === 'ACCEPTED')
        data = {
          ...data,
          status: 'ACCEPTED',
          providerId: result.providerId,
          reason: null,
          closedAt: now,
        };
      else if (result.kind === 'PERMANENT')
        data = {
          ...data,
          status: 'FAILED',
          reason: 'PROVIDER_REJECTED',
          closedAt: now,
        };
      else if (result.kind === 'UNCERTAIN')
        data = {
          ...data,
          reason: 'UNKNOWN_RESULT',
          nextAttemptAt: new Date(now.getTime() + 60_000),
        };
      else {
        const after = result.kind === 'RETRY' ? result.retryAfter : null;
        const next = nextAttemptAt({
          attempts: row.attempts,
          createdAt: row.createdAt,
          now,
          retryAfter: after,
          jitter: Math.random(),
        });
        data = {
          ...data,
          status: next ? 'RETRY' : 'FAILED',
          reason: next ? 'PROVIDER_UNAVAILABLE' : 'BUDGET_EXHAUSTED',
          retryAfter: after,
          nextAttemptAt: next ?? now,
          closedAt: next ? null : now,
        };
        if (result.kind === 'CONFIGURATION' || result.kind === 'DISABLED') {
          await tx.emailChannelControl.update({
            where: { id: 'EMAIL' },
            data: { paused: true, reason: 'CONFIGURATION', updatedAt: now },
          });
          this.report('EMAIL_CHANNEL_PAUSED');
        }
      }
      await tx.emailOutbox.updateMany({
        where: { id, organizationId, leaseToken: token, status: 'UNCERTAIN' },
        data,
      });
    });
  }

  async receiveWebhook(event: VerifiedEmailWebhook): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        {
          id: string;
          organizationId: string;
          status: string;
          providerEventAt: Date | null;
          closedAt: Date | null;
        }[]
      >(Prisma.sql`
        SELECT "id", "organizationId", "status", "providerEventAt", "closedAt" FROM "EmailOutbox" WHERE "providerId" = ${event.providerId} FOR UPDATE
      `);
      const row = rows[0];
      if (!row) return false;
      if (await tx.emailWebhookReceipt.findUnique({ where: { id: event.id } }))
        return true;
      await tx.emailWebhookReceipt.create({
        data: {
          id: event.id,
          notificationId: row.id,
          organizationId: row.organizationId,
          kind: event.kind,
          occurredAt: event.occurredAt,
        },
      });
      const failed = [
        'email.bounced',
        'email.complained',
        'email.failed',
      ].includes(event.kind);
      const state = failed
        ? 'FAILED'
        : event.kind === 'email.delivered'
          ? 'DELIVERED'
          : 'ACCEPTED';
      if (
        row.status === 'FAILED' ||
        (row.status === 'DELIVERED' && state === 'ACCEPTED') ||
        (!failed &&
          row.providerEventAt &&
          row.providerEventAt > event.occurredAt)
      )
        return true;
      await tx.emailOutbox.update({
        where: { id: row.id, organizationId: row.organizationId },
        data: {
          status: state,
          reason: failed ? 'PROVIDER_REJECTED' : null,
          providerEventAt: event.occurredAt,
          closedAt: row.closedAt ?? new Date(),
          leaseToken: null,
          leaseExpiresAt: null,
        },
      });
      return true;
    });
  }

  async housekeeping() {
    const now = new Date();
    await this.db.$executeRaw(Prisma.sql`
      UPDATE "EmailOutbox" SET "leaseToken" = NULL, "leaseExpiresAt" = NULL,
        "status" = CASE WHEN "status" = 'PROCESSING' THEN CASE WHEN "attempts" = 0 THEN 'PENDING' ELSE 'RETRY' END ELSE "status" END
      WHERE "leaseExpiresAt" <= ${now} AND "status" IN ('PROCESSING', 'UNCERTAIN')
    `);
    await this.db.emailOutbox.updateMany({
      where: {
        status: { in: ['PENDING', 'RETRY', 'PROCESSING'] },
        expiresAt: { lte: now },
        closedAt: null,
      },
      data: {
        status: 'FAILED',
        reason: 'EXPIRED',
        closedAt: now,
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
    await this.db.emailOutbox.updateMany({
      where: {
        status: 'UNCERTAIN',
        expiresAt: { lte: now },
        closedAt: null,
        OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
      },
      data: {
        reason: 'UNRESOLVED',
        closedAt: now,
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
    await this.db.$executeRaw(Prisma.sql`
      UPDATE "EmailOutbox" SET "recipient" = NULL, "sealedPayload" = NULL
      WHERE "id" IN (
        SELECT "id" FROM "EmailOutbox"
        WHERE "closedAt" <= ${new Date(now.getTime() - PRIVATE_RETENTION_MS)}
          AND ("recipient" IS NOT NULL OR "sealedPayload" IS NOT NULL)
        ORDER BY "closedAt", "id" FOR UPDATE SKIP LOCKED LIMIT 100
      )
    `);
    await this.db.emailAbuseBucket.deleteMany({
      where: { windowStart: { lt: new Date(now.getTime() - 86_400_000) } },
    });
  }

  private async reserveAbuseBudget(
    tx: Prisma.TransactionClient,
    organizationId: string,
    recipient: string,
    now: Date,
  ) {
    const digest = createHmac('sha256', this.config.abuseSecret)
      .update(`${organizationId}:${recipient}`)
      .digest('hex');
    const windowStart = new Date(
      Math.floor(now.getTime() / 3_600_000) * 3_600_000,
    );
    const buckets = [
      { key: `destination:${digest}`, limit: 3 },
      { key: `tenant:${organizationId}`, limit: 100 },
    ].sort((a, b) => a.key.localeCompare(b.key));
    for (const bucket of buckets) {
      await tx.emailAbuseBucket.upsert({
        where: { key_windowStart: { key: bucket.key, windowStart } },
        create: { key: bucket.key, windowStart },
        update: {},
      });
      const [row] = await tx.$queryRaw<{ count: number }[]>(
        Prisma.sql`SELECT "count" FROM "EmailAbuseBucket" WHERE "key" = ${bucket.key} AND "windowStart" = ${windowStart} FOR UPDATE`,
      );
      if (row.count >= bucket.limit) return false;
    }
    for (const bucket of buckets)
      await tx.emailAbuseBucket.update({
        where: { key_windowStart: { key: bucket.key, windowStart } },
        data: { count: { increment: 1 } },
      });
    return true;
  }
}
