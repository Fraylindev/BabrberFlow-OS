import { randomUUID } from 'node:crypto';
import { BookingStatus, PrismaClient } from '@prisma/client';
import {
  lockEmailBooking,
  lockEmailClient,
  recordBookingEmailChange,
} from '../src/notifications/notification-producer';
import {
  EMAIL_NOTICE_VERSION,
  EMAIL_TEMPLATE_VERSION,
} from '../src/notifications/notification-policy';
import { EmailWorker } from '../src/notifications/email-worker';
import {
  type EmailChannelConfig,
  type EmailProvider,
  serializeEnvelope,
} from '../src/notifications/resend.adapter';

describe('Notifications C1 — PostgreSQL producer and contact integrity', () => {
  const db = new PrismaClient();
  // globalSetup has already proved this is an isolated database. Other HTTP
  // suites leave fixtures; the global worker must start with an empty queue.
  beforeAll(async () => {
    await db.emailWebhookReceipt.deleteMany();
    await db.emailOutbox.deleteMany();
    await db.bookingEmailEvent.deleteMany();
    await db.bookingEmailPreference.deleteMany();
  });
  let organizationId: string;
  let clientId: string;
  let serviceId: string;
  let professionalId: string;
  const choice = {
    optedIn: true,
    noticeVersion: EMAIL_NOTICE_VERSION,
    reviewedEmail: 'controlled@example.com',
    source: 'PUBLIC' as const,
  };
  const channel: EmailChannelConfig = {
    enabled: true,
    apiKey: 'test-only',
    fromAddress: 'central@example.com',
    replyTo: 'reply@example.com',
    webhookSecret: 'test-only',
    abuseSecret: 'controlled-32-character-secret-for-tests',
  };
  function provider() {
    return {
      send: jest
        .fn<
          ReturnType<EmailProvider['send']>,
          Parameters<EmailProvider['send']>
        >()
        .mockImplementation(() =>
          Promise.resolve({ kind: 'ACCEPTED', providerId: randomUUID() }),
        ),
      retrieve: jest
        .fn<
          ReturnType<EmailProvider['retrieve']>,
          Parameters<EmailProvider['retrieve']>
        >()
        .mockResolvedValue('ACCEPTED'),
    };
  }

  beforeEach(async () => {
    await db.emailChannelControl.update({
      where: { id: 'EMAIL' },
      data: { paused: false, reason: null },
    });
    organizationId = randomUUID();
    await db.organization.create({
      data: {
        id: organizationId,
        name: 'Notification test',
        slug: organizationId,
        email: `${organizationId}@example.com`,
      },
    });
    const client = await db.client.create({
      data: {
        organizationId,
        name: 'Controlled client',
        email: choice.reviewedEmail,
      },
    });
    const service = await db.service.create({
      data: {
        organizationId,
        name: 'Controlled service',
        duration: 30,
        price: 100,
      },
    });
    const professional = await db.professional.create({
      data: { organizationId, name: 'Controlled professional' },
    });
    clientId = client.id;
    serviceId = service.id;
    professionalId = professional.id;
  });

  afterEach(async () => {
    await db.emailWebhookReceipt.deleteMany({ where: { organizationId } });
    await db.emailOutbox.deleteMany({ where: { organizationId } });
    await db.bookingEmailEvent.deleteMany({ where: { organizationId } });
    await db.bookingEmailPreference.deleteMany({ where: { organizationId } });
    await db.booking.deleteMany({ where: { organizationId } });
    await db.client.deleteMany({ where: { organizationId } });
    await db.professional.deleteMany({ where: { organizationId } });
    await db.service.deleteMany({ where: { organizationId } });
    await db.cmsPage.deleteMany({ where: { organizationId } });
    await db.organization.delete({ where: { id: organizationId } });
  });
  afterAll(() => db.$disconnect());

  it.each([
    ['Booking <central@example.com>', 'Booking <central@example.com>'],
    ['central@example.com', 'Notification test <central@example.com>'],
  ])(
    'seals the configured sender %s without nested mailboxes',
    async (fromAddress, expected) => {
      await create();
      const remote = provider();
      await new EmailWorker(db, { ...channel, fromAddress }, remote).tick();
      expect(remote.send).toHaveBeenCalledTimes(1);
      expect(remote.send.mock.calls[0][0].from).toBe(expected);
      const row = await db.emailOutbox.findFirstOrThrow({
        where: { organizationId },
      });
      expect(row.status).toBe('ACCEPTED');
      expect(row.sealedPayload).toMatchObject({ from: expected });
    },
  );

  it('caps a transient failure at five dispatches with one immutable key/payload', async () => {
    await create();
    const remote = provider();
    remote.send.mockResolvedValue({ kind: 'RETRY', retryAfter: null });
    const worker = new EmailWorker(db, channel, remote);
    for (let attempt = 0; attempt < 6; attempt++) {
      await worker.tick();
      await db.emailOutbox.updateMany({
        where: { organizationId },
        data: { nextAttemptAt: new Date(Date.now() - 1000) },
      });
    }
    expect(remote.send).toHaveBeenCalledTimes(5);
    expect(
      remote.send.mock.calls.every(
        (call) =>
          call[1] === remote.send.mock.calls[0][1] &&
          serializeEnvelope(call[0]) ===
            serializeEnvelope(remote.send.mock.calls[0][0]),
      ),
    ).toBe(true);
    expect(
      await db.emailOutbox.findFirstOrThrow({ where: { organizationId } }),
    ).toMatchObject({
      status: 'FAILED',
      attempts: 5,
      reason: 'BUDGET_EXHAUSTED',
    });
  });

  it('retains the sealed template version and sender across worker deployments', async () => {
    await create();
    const remote = provider();
    remote.send.mockResolvedValue({ kind: 'UNCERTAIN' });
    await new EmailWorker(db, channel, remote).tick();
    const first = await db.emailOutbox.findFirstOrThrow({
      where: { organizationId },
    });
    expect(first.templateVersion).toBe(EMAIL_TEMPLATE_VERSION);
    await db.emailOutbox.update({
      where: { id: first.id },
      data: {
        templateVersion: 'previous-deployment',
        nextAttemptAt: new Date(0),
      },
    });
    await new EmailWorker(
      db,
      { ...channel, fromAddress: 'changed@example.com' },
      remote,
    ).tick();
    const next = await db.emailOutbox.findUniqueOrThrow({
      where: { id: first.id },
    });
    expect(next.templateVersion).toBe('previous-deployment');
    expect(next.sealedPayload).toEqual(first.sealedPayload);
    expect(remote.send).toHaveBeenCalledTimes(2);
    expect(remote.send.mock.calls[1]).toEqual(remote.send.mock.calls[0]);
  });

  it('never retransmits an uncertain snapshot whose template provenance is missing', async () => {
    await create();
    const remote = provider();
    remote.send.mockResolvedValue({ kind: 'UNCERTAIN' });
    const worker = new EmailWorker(db, channel, remote);
    await worker.tick();
    await db.emailOutbox.updateMany({
      where: { organizationId },
      data: {
        templateVersion: null,
        nextAttemptAt: new Date(0),
      },
    });
    await worker.tick();
    expect(remote.send).toHaveBeenCalledTimes(1);
    const unresolved = await db.emailOutbox.findFirstOrThrow({
      where: { organizationId },
    });
    expect(unresolved).toMatchObject({
      status: 'UNCERTAIN',
      reason: 'UNRESOLVED',
    });
    expect(unresolved.closedAt).toBeInstanceOf(Date);
  });

  it('closes an uncertain event beyond 24h without another POST', async () => {
    await create();
    const remote = provider();
    remote.send.mockResolvedValue({ kind: 'UNCERTAIN' });
    const worker = new EmailWorker(db, channel, remote);
    await worker.tick();
    await db.emailOutbox.updateMany({
      where: { organizationId },
      data: {
        createdAt: new Date(Date.now() - 25 * 3_600_000),
        expiresAt: new Date(Date.now() - 3_600_000),
        firstDispatchedAt: new Date(Date.now() - 25 * 3_600_000),
        nextAttemptAt: new Date(Date.now() - 1000),
      },
    });
    await worker.tick();
    expect(remote.send).toHaveBeenCalledTimes(1);
    expect(
      await db.emailOutbox.findFirstOrThrow({ where: { organizationId } }),
    ).toMatchObject({ status: 'UNCERTAIN', reason: 'UNRESOLVED' });
  });

  it('enforces the shared destination budget without rejecting bookings', async () => {
    const remote = provider();
    for (let day = 1; day <= 4; day++) {
      await create(true, day);
    }
    await Promise.all(
      Array.from({ length: 4 }, () =>
        new EmailWorker(db, channel, remote).tick(),
      ),
    );
    expect(remote.send).toHaveBeenCalledTimes(3);
    expect(await db.booking.count({ where: { organizationId } })).toBe(4);
    expect(
      await db.emailOutbox.count({
        where: { organizationId, status: 'OMITTED', reason: 'ABUSE_LIMIT' },
      }),
    ).toBe(1);
  });

  it.each(['CANCELLED', 'COMPLETED'] as const)(
    'dispatches the terminal %s event with its fixed text',
    async (status) => {
      const row = await create();
      await db.$transaction(async (tx) => {
        await lockEmailBooking(tx, organizationId, row.id);
        const before =
          status === 'COMPLETED'
            ? await tx.booking.update({
                where: { id: row.id },
                data: { status: 'CONFIRMED' },
              })
            : row;
        const after = await tx.booking.update({
          where: { id: row.id },
          data: { status },
        });
        await recordBookingEmailChange(tx, organizationId, before, after);
      });
      const remote = provider();
      await new EmailWorker(db, channel, remote).tick();
      expect(remote.send).toHaveBeenCalledTimes(1);
      expect(remote.send.mock.calls[0][0].subject).toBe(
        status === 'COMPLETED' ? 'Reserva completada' : 'Reserva cancelada',
      );
      if (status === 'COMPLETED')
        expect(remote.send.mock.calls[0][0].text).toBe(
          'Notification test: tu reserva fue completada, gracias por visitarnos',
        );
    },
  );

  it('suppresses a change committed before the dispatch permission', async () => {
    const booking = await create();
    const remote = provider();
    let processing: Promise<boolean> | undefined;
    await db.$transaction(async (tx) => {
      await lockEmailBooking(tx, organizationId, booking.id);
      processing = new EmailWorker(db, channel, remote).tick();
      let claimed = false;
      for (let n = 0; n < 100; n++) {
        const row = await tx.emailOutbox.findFirstOrThrow({
          where: { organizationId },
        });
        if (row.status === 'PROCESSING') {
          claimed = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(claimed).toBe(true);
      const after = await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'NO_SHOW' },
      });
      await recordBookingEmailChange(tx, organizationId, booking, after);
    });
    await processing;
    expect(remote.send).not.toHaveBeenCalled();
  });

  it('preserves a dispatched acceptance when Booking changes after permission', async () => {
    const booking = await create();
    const remote = provider();
    remote.send.mockImplementation(async () => {
      await db.$transaction(async (tx) => {
        await lockEmailBooking(tx, organizationId, booking.id);
        const after = await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED' },
        });
        await recordBookingEmailChange(tx, organizationId, booking, after);
      });
      return { kind: 'ACCEPTED', providerId: randomUUID() };
    });
    await new EmailWorker(db, channel, remote).tick();
    const rows = await db.emailOutbox.findMany({
      where: { organizationId },
      orderBy: { eventSequence: 'asc' },
    });
    expect(rows.map((row) => row.status)).toEqual(['ACCEPTED', 'PENDING']);
  });

  it('fences a late result from an expired worker generation', async () => {
    await create();
    const remote = provider();
    let release:
      ((value: Awaited<ReturnType<EmailProvider['send']>>) => void) | undefined;
    let signal!: () => void;
    const dispatched = new Promise<void>((resolve) => {
      signal = resolve;
    });
    remote.send.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
          signal();
        }),
    );
    const first = new EmailWorker(db, channel, remote).tick();
    await dispatched;
    await db.emailOutbox.updateMany({
      where: { organizationId },
      data: { leaseExpiresAt: new Date(Date.now() - 1000) },
    });
    await new EmailWorker(db, channel, remote).tick();
    const accepted = await db.emailOutbox.findFirstOrThrow({
      where: { organizationId },
    });
    release!({ kind: 'ACCEPTED', providerId: randomUUID() });
    await first;
    expect(
      await db.emailOutbox.findFirstOrThrow({ where: { organizationId } }),
    ).toMatchObject({
      status: 'ACCEPTED',
      providerId: accepted.providerId,
      attempts: 2,
    });
  });

  it('two workers grant only one dispatch and keep the sealed payload', async () => {
    await create();
    const remote = provider();
    await Promise.all([
      new EmailWorker(db, channel, remote).tick(),
      new EmailWorker(db, channel, remote).tick(),
    ]);
    expect(remote.send).toHaveBeenCalledTimes(1);
    const row = await db.emailOutbox.findFirstOrThrow({
      where: { organizationId },
    });
    expect(row).toMatchObject({
      status: 'ACCEPTED',
      attempts: 1,
      recipient: choice.reviewedEmail,
    });
    expect(row.sealedPayload).toMatchObject({
      to: [choice.reviewedEmail],
      subject: 'Reserva registrada',
    });
    expect(row.leaseToken).toBeNull();
  });

  it('recovers a crashed preparation lease without losing the intent', async () => {
    await create();
    const row = await db.emailOutbox.findFirstOrThrow({
      where: { organizationId },
    });
    await db.emailOutbox.update({
      where: { id: row.id },
      data: {
        status: 'PROCESSING',
        leaseToken: randomUUID(),
        leaseExpiresAt: new Date(Date.now() - 1000),
      },
    });
    const remote = provider();
    await new EmailWorker(db, channel, remote).tick();
    expect(remote.send).toHaveBeenCalledTimes(1);
    expect(
      await db.emailOutbox.findUniqueOrThrow({ where: { id: row.id } }),
    ).toMatchObject({ status: 'ACCEPTED', attempts: 1 });
  });

  it('reconciles ambiguous acceptance with exactly the sealed key/payload inside budget', async () => {
    await create();
    const remote = provider();
    remote.send.mockResolvedValueOnce({ kind: 'UNCERTAIN' });
    const worker = new EmailWorker(db, channel, remote);
    await worker.tick();
    const uncertain = await db.emailOutbox.findFirstOrThrow({
      where: { organizationId },
    });
    expect(uncertain.status).toBe('UNCERTAIN');
    await db.emailOutbox.update({
      where: { id: uncertain.id },
      data: { nextAttemptAt: new Date(Date.now() - 1000) },
    });
    await worker.tick();
    expect(remote.send.mock.calls[0]).toEqual(remote.send.mock.calls[1]);
    expect(
      await db.emailOutbox.findUniqueOrThrow({ where: { id: uncertain.id } }),
    ).toMatchObject({ status: 'ACCEPTED', attempts: 2 });
  });

  it('does not resend an obsolete uncertain message or one outside the window', async () => {
    const booking = await create();
    const remote = provider();
    remote.send.mockResolvedValue({ kind: 'UNCERTAIN' });
    const worker = new EmailWorker(db, channel, remote);
    await worker.tick();
    await db.$transaction(async (tx) => {
      await lockEmailBooking(tx, organizationId, booking.id);
      const after = await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'NO_SHOW' },
      });
      await recordBookingEmailChange(tx, organizationId, booking, after);
    });
    await db.emailOutbox.updateMany({
      where: { organizationId },
      data: { nextAttemptAt: new Date(Date.now() - 1000) },
    });
    await worker.tick();
    expect(remote.send).toHaveBeenCalledTimes(1);
    const row = await db.emailOutbox.findFirstOrThrow({
      where: { organizationId },
    });
    expect(row).toMatchObject({ status: 'UNCERTAIN', reason: 'UNRESOLVED' });
    expect(row.closedAt).not.toBeNull();
    expect(
      await db.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    ).toMatchObject({ status: 'NO_SHOW' });
  });

  it('deduplicates webhooks and does not downgrade delivered with late sent events', async () => {
    await create();
    const worker = new EmailWorker(db, channel, provider());
    await worker.tick();
    const row = await db.emailOutbox.findFirstOrThrow({
      where: { organizationId },
    });
    const event = {
      id: randomUUID(),
      providerId: row.providerId!,
      kind: 'email.delivered' as const,
      occurredAt: new Date(),
    };
    expect(await worker.receiveWebhook(event)).toBe(true);
    expect(await worker.receiveWebhook(event)).toBe(true);
    expect(
      await worker.receiveWebhook({
        ...event,
        id: randomUUID(),
        kind: 'email.sent',
        occurredAt: new Date(Date.now() - 10_000),
      }),
    ).toBe(true);
    expect(
      await db.emailWebhookReceipt.count({ where: { organizationId } }),
    ).toBe(2);
    expect(
      (await db.emailOutbox.findUniqueOrThrow({ where: { id: row.id } }))
        .status,
    ).toBe('DELIVERED');
    expect(
      await worker.receiveWebhook({
        ...event,
        id: randomUUID(),
        providerId: 'unmatched',
      }),
    ).toBe(false);
  });

  it('pauses all workers on configuration failure and preserves Booking', async () => {
    const booking = await create();
    const remote = provider();
    remote.send.mockResolvedValue({ kind: 'CONFIGURATION' });
    await new EmailWorker(db, channel, remote).tick();
    expect(
      (
        await db.emailChannelControl.findUniqueOrThrow({
          where: { id: 'EMAIL' },
        })
      ).paused,
    ).toBe(true);
    expect(await new EmailWorker(db, channel, remote).tick()).toBe(false);
    expect(remote.send).toHaveBeenCalledTimes(1);
    expect(
      (await db.booking.findUniqueOrThrow({ where: { id: booking.id } }))
        .status,
    ).toBe('PENDING');
  });

  it('purges private data after 30 days while retaining deduplication identity', async () => {
    await create();
    const worker = new EmailWorker(db, channel, provider());
    await worker.tick();
    const row = await db.emailOutbox.findFirstOrThrow({
      where: { organizationId },
    });
    await db.emailOutbox.update({
      where: { id: row.id },
      data: { closedAt: new Date(Date.now() - 31 * 86_400_000) },
    });
    await worker.housekeeping();
    await worker.housekeeping();
    expect(
      await db.emailOutbox.findUniqueOrThrow({ where: { id: row.id } }),
    ).toMatchObject({
      status: 'ACCEPTED',
      recipient: null,
      sealedPayload: null,
      eventSequence: 1,
    });
    expect(
      await db.bookingEmailEvent.count({ where: { organizationId } }),
    ).toBe(1);
  });

  async function create(optedIn = true, day = 1) {
    return db.$transaction(async (tx) => {
      await lockEmailClient(tx, organizationId, clientId);
      const row = await tx.booking.create({
        data: {
          organizationId,
          clientId,
          serviceId,
          professionalId,
          startTime: new Date(
            `2020-01-${String(day).padStart(2, '0')}T15:00:00Z`,
          ),
          endTime: new Date(
            `2020-01-${String(day).padStart(2, '0')}T15:30:00Z`,
          ),
        },
      });
      await recordBookingEmailChange(tx, organizationId, null, row, {
        ...choice,
        optedIn,
      });
      return row;
    });
  }

  it('commits one event/intention and ignores the same trigger twice', async () => {
    const row = await create();
    await db.$transaction(async (tx) => {
      await lockEmailBooking(tx, organizationId, row.id);
      await recordBookingEmailChange(tx, organizationId, null, row, choice);
    });
    expect(
      await db.bookingEmailEvent.count({ where: { organizationId } }),
    ).toBe(1);
    const intents = await db.emailOutbox.findMany({
      where: { organizationId },
    });
    expect(intents).toHaveLength(1);
    expect(intents[0]).toMatchObject({
      status: 'PENDING',
      attempts: 0,
      recipient: null,
      sealedPayload: null,
    });
  });

  it('rolls back Booking and outbox together', async () => {
    await expect(
      db.$transaction(async (tx) => {
        await lockEmailClient(tx, organizationId, clientId);
        const row = await tx.booking.create({
          data: {
            organizationId,
            clientId,
            serviceId,
            professionalId,
            startTime: new Date('2020-01-01T15:00:00Z'),
            endTime: new Date('2020-01-01T15:30:00Z'),
          },
        });
        await recordBookingEmailChange(tx, organizationId, null, row, choice);
        throw new Error('controlled rollback');
      }),
    ).rejects.toThrow('controlled rollback');
    expect(await db.booking.count({ where: { organizationId } })).toBe(0);
    expect(await db.emailOutbox.count({ where: { organizationId } })).toBe(0);
    expect(
      await db.bookingEmailEvent.count({ where: { organizationId } }),
    ).toBe(0);
  });

  it('serializes two real reschedules with distinct sequences and only newest pending', async () => {
    const original = await create();
    await Promise.all(
      [2, 3].map((day) =>
        db.$transaction(async (tx) => {
          await lockEmailBooking(tx, organizationId, original.id);
          const before = await tx.booking.findUniqueOrThrow({
            where: { id: original.id },
          });
          const after = await tx.booking.update({
            where: { id: original.id },
            data: {
              startTime: new Date(`2020-01-0${day}T15:00:00Z`),
              endTime: new Date(`2020-01-0${day}T15:30:00Z`),
            },
          });
          await recordBookingEmailChange(tx, organizationId, before, after);
        }),
      ),
    );
    const rows = await db.emailOutbox.findMany({
      where: { organizationId },
      orderBy: { eventSequence: 'asc' },
      include: { event: true },
    });
    expect(rows.map((row) => row.eventSequence)).toEqual([1, 2, 3]);
    expect(rows.map((row) => row.status)).toEqual([
      'OBSOLETE',
      'OBSOLETE',
      'PENDING',
    ]);
    expect(rows.slice(1).map((row) => row.event.kind)).toEqual([
      'RESCHEDULED',
      'RESCHEDULED',
    ]);
    const current = await db.booking.findUniqueOrThrow({
      where: { id: original.id },
    });
    expect(rows[2].event.startTime).toEqual(current.startTime);
  });

  it('emits COMPLETED exactly once after CONFIRMED and suppresses operational messages', async () => {
    const original = await create();
    for (const status of [
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
      BookingStatus.COMPLETED,
    ]) {
      await db.$transaction(async (tx) => {
        await lockEmailBooking(tx, organizationId, original.id);
        const before = await tx.booking.findUniqueOrThrow({
          where: { id: original.id },
        });
        const after = await tx.booking.update({
          where: { id: original.id },
          data: { status },
        });
        await recordBookingEmailChange(tx, organizationId, before, after);
      });
    }
    const rows = await db.emailOutbox.findMany({
      where: { organizationId },
      orderBy: { eventSequence: 'asc' },
      include: { event: true },
    });
    expect(rows.map((row) => row.event.kind)).toEqual([
      'CREATED',
      'CONFIRMED',
      'COMPLETED',
    ]);
    expect(rows.map((row) => row.status)).toEqual([
      'OBSOLETE',
      'OBSOLETE',
      'PENDING',
    ]);
  });

  it('invalidates contact A→B→A atomically and does not restore corroboration', async () => {
    await create();
    await db.client.update({
      where: { id: clientId },
      data: { email: 'changed@example.com' },
    });
    await db.client.update({
      where: { id: clientId },
      data: { email: choice.reviewedEmail },
    });
    const client = await db.client.findUniqueOrThrow({
      where: { id: clientId },
    });
    const pref = await db.bookingEmailPreference.findFirstOrThrow({
      where: { organizationId },
    });
    expect(client.emailRevision).toBe(2);
    expect(pref.reviewedContactRevision).toBeNull();
    expect(pref.version).toBe(3);
    expect(
      await db.emailOutbox.findFirstOrThrow({ where: { organizationId } }),
    ).toMatchObject({ status: 'OBSOLETE', reason: 'CONTACT_CHANGED' });
  });

  it('preserves a successful booking without opt-in and records safe omission', async () => {
    const row = await create(false);
    expect(row.status).toBe('PENDING');
    expect(
      await db.emailOutbox.findFirstOrThrow({ where: { organizationId } }),
    ).toMatchObject({
      status: 'OMITTED',
      reason: 'NO_CONSENT',
      recipient: null,
    });
  });

  it('enforces tenant FKs and the five-attempt budget in PostgreSQL', async () => {
    await create();
    const intent = await db.emailOutbox.findFirstOrThrow({
      where: { organizationId },
    });
    await expect(
      db.emailOutbox.update({
        where: { id: intent.id },
        data: { organizationId: randomUUID() },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      db.emailOutbox.update({
        where: { id: intent.id },
        data: { attempts: 6 },
      }),
    ).rejects.toThrow();
    expect(
      (await db.emailOutbox.findUniqueOrThrow({ where: { id: intent.id } }))
        .attempts,
    ).toBe(0);
  });
});
