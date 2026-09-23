import { BookingStatus } from '@prisma/client';
import {
  canManuallyRetry,
  canReconcileWithIdempotentPost,
  classifyBookingChange,
  corroborateRecipient,
  EMAIL_NOTICE_VERSION,
  isCurrentIntent,
  nextAttemptAt,
  normalizedRecipient,
  PRIVATE_RETENTION_MS,
  shouldPurgePrivateData,
  type BookingRevision,
  type EmailEvent,
  type EmailState,
} from './notification-policy';
import { renderNotification } from './notification-templates';

const now = new Date('2026-09-14T18:00:00Z');
const booking: BookingRevision = {
  status: BookingStatus.PENDING,
  startTime: new Date('2026-09-14T16:00:00Z'),
  endTime: new Date('2026-09-14T16:30:00Z'),
  serviceId: 'service',
  professionalId: 'professional',
};

describe('Notification event policy — C0 §5.1/§5.6', () => {
  it('classifies a new PENDING once and a repeated state as a no-op', () => {
    expect(classifyBookingChange(null, booking, now)).toEqual({
      changed: true,
      event: 'CREATED',
    });
    expect(classifyBookingChange(booking, { ...booking }, now)).toEqual({
      changed: false,
      event: null,
    });
  });

  it.each([
    ['PENDING', 'CONFIRMED', 'CONFIRMED'],
    ['CANCELLED', 'CONFIRMED', 'CONFIRMED'],
    ['PENDING', 'CANCELLED', 'CANCELLED'],
    ['CONFIRMED', 'CANCELLED', 'CANCELLED'],
    ['CANCELLED', 'PENDING', null],
    ['CONFIRMED', 'NO_SHOW', null],
    ['CONFIRMED', 'COMPLETED', 'COMPLETED'],
  ] as const)('%s → %s has event %s', (before, after, event) => {
    expect(
      classifyBookingChange(
        { ...booking, status: before },
        { ...booking, status: after },
        now,
      ),
    ).toEqual({ changed: true, event });
  });

  it.each(['PENDING', 'CONFIRMED'] as const)(
    'rescheduling %s captures start or end change independently',
    (status) => {
      const before = { ...booking, status };
      for (const field of ['startTime', 'endTime'] as const) {
        const after = { ...before, [field]: new Date('2026-09-15T16:00:00Z') };
        expect(classifyBookingChange(before, after, now)).toEqual({
          changed: true,
          event: 'RESCHEDULED',
        });
        expect(classifyBookingChange(after, { ...after }, now).changed).toBe(
          false,
        );
      }
    },
  );

  it.each(['CANCELLED', 'COMPLETED', 'NO_SHOW'] as const)(
    'does not notify a schedule change in terminal %s',
    (status) => {
      const before = { ...booking, status };
      expect(
        classifyBookingChange(
          before,
          { ...before, startTime: new Date('2026-09-15T16:00:00Z') },
          now,
        ),
      ).toEqual({ changed: true, event: null });
    },
  );

  it.each(['serviceId', 'professionalId'] as const)(
    'invalidates a %s-only change without a replacement event',
    (field) => {
      expect(
        classifyBookingChange(booking, { ...booking, [field]: 'other' }, now),
      ).toEqual({ changed: true, event: null });
    },
  );

  it('completion requires CONFIRMED, service end and a real transition', () => {
    const before = { ...booking, status: BookingStatus.CONFIRMED };
    const completed = { ...booking, status: BookingStatus.COMPLETED };
    expect(
      classifyBookingChange(before, completed, booking.endTime).event,
    ).toBe('COMPLETED');
    expect(
      classifyBookingChange(
        before,
        completed,
        new Date(booking.endTime.getTime() - 1),
      ).event,
    ).toBeNull();
    expect(classifyBookingChange(booking, completed, now).event).toBeNull();
    expect(classifyBookingChange(completed, completed, now)).toEqual({
      changed: false,
      event: null,
    });
  });
});

describe('Contact and opt-in policy — D6/D7', () => {
  it.each([
    null,
    undefined,
    '',
    'invalid',
    'a@example.com\r\nBcc:b@example.com',
  ])('rejects missing or unsafe recipient %s', (value) =>
    expect(normalizedRecipient(value)).toBeNull(),
  );
  it('only returns the normalized persisted and reviewed address', () => {
    expect(
      corroborateRecipient({
        optedIn: true,
        noticeVersion: EMAIL_NOTICE_VERSION,
        persistedEmail: ' Person@Example.com ',
        reviewedEmail: 'person@example.com',
      }),
    ).toEqual({ recipient: 'person@example.com', reason: null });
  });
  it.each([undefined, null, 'other@example.com'])(
    'omits a historical address when submitted review is %s',
    (reviewedEmail) => {
      expect(
        corroborateRecipient({
          optedIn: true,
          noticeVersion: EMAIL_NOTICE_VERSION,
          persistedEmail: 'historical@example.com',
          reviewedEmail,
        }),
      ).toEqual({ recipient: null, reason: 'CONTACT_NOT_REVIEWED' });
    },
  );
  it.each([
    [false, EMAIL_NOTICE_VERSION],
    [true, null],
    [true, 'unknown-version'],
  ] as const)(
    'requires explicit opt-in and known notice',
    (optedIn, version) => {
      expect(
        corroborateRecipient({
          optedIn,
          noticeVersion: version,
          persistedEmail: 'person@example.com',
          reviewedEmail: 'person@example.com',
        }),
      ).toEqual({ recipient: null, reason: 'NO_CONSENT' });
    },
  );
});

describe('Dispatch revision — C0 §5.6', () => {
  const intent = {
    sequence: 2,
    contactRevision: 1,
    preferenceVersion: 1,
    event: 'RESCHEDULED' as EmailEvent,
    bookingStatus: BookingStatus.PENDING,
  };
  const current = {
    ...intent,
    optedIn: true,
    contactReviewed: true,
    status: BookingStatus.PENDING,
  };
  it('keeps the current reschedule eligible', () => {
    expect(isCurrentIntent(intent, current)).toBe(true);
  });
  it.each([
    { sequence: 3 },
    { contactRevision: 3 },
    { preferenceVersion: 3 },
    { optedIn: false },
    { contactReviewed: false },
    { status: BookingStatus.CONFIRMED },
    { status: BookingStatus.CANCELLED },
    { status: BookingStatus.COMPLETED },
    { status: BookingStatus.NO_SHOW },
  ])('rejects obsolete or withdrawn intent %j', (change) => {
    expect(isCurrentIntent(intent, { ...current, ...change })).toBe(false);
  });
  it.each(['CANCELLED', 'COMPLETED'] as const)(
    'allows the terminal %s message only in its matching state',
    (status) => {
      const terminal = { ...intent, event: status, bookingStatus: status };
      expect(isCurrentIntent(terminal, { ...current, status })).toBe(true);
      expect(isCurrentIntent(terminal, current)).toBe(false);
    },
  );
});

describe('Retry and retention budgets — D9/D10', () => {
  it.each([60_000, 300_000, 1_800_000, 7_200_000])(
    'uses the prescribed delay %i',
    (delay) => {
      const attempts =
        [60_000, 300_000, 1_800_000, 7_200_000].indexOf(delay) + 1;
      expect(
        nextAttemptAt({
          attempts,
          createdAt: now,
          now,
          retryAfter: null,
          jitter: 0,
        }),
      ).toEqual(new Date(now.getTime() + delay));
    },
  );
  it('caps attempts, honours Retry-After and expires at 24 hours', () => {
    const input = {
      attempts: 1,
      createdAt: now,
      now,
      retryAfter: null,
      jitter: 0,
    };
    expect(nextAttemptAt({ ...input, attempts: 5 })).toBeNull();
    const later = new Date(now.getTime() + 3_600_000);
    expect(nextAttemptAt({ ...input, retryAfter: later })).toEqual(later);
    expect(
      nextAttemptAt({
        ...input,
        retryAfter: new Date(now.getTime() + 86_400_000),
      }),
    ).toBeNull();
    expect(nextAttemptAt({ ...input, jitter: 1 })).toEqual(
      new Date(now.getTime() + 66_000),
    );
  });
  it.each([
    'PENDING',
    'PROCESSING',
    'ACCEPTED',
    'DELIVERED',
    'FAILED',
    'UNCERTAIN',
    'OMITTED',
    'OBSOLETE',
  ] as EmailState[])('never manually retries %s', (state) => {
    expect(
      canManuallyRetry({
        state,
        attempts: 1,
        createdAt: now,
        now,
        retryAfter: null,
        current: true,
      }),
    ).toBe(false);
  });
  it('only retries current RETRY within budget and outside Retry-After', () => {
    const input = {
      state: 'RETRY' as const,
      attempts: 1,
      createdAt: now,
      now,
      retryAfter: null,
      current: true,
    };
    expect(canManuallyRetry(input)).toBe(true);
    expect(canManuallyRetry({ ...input, attempts: 5 })).toBe(false);
    expect(canManuallyRetry({ ...input, current: false })).toBe(false);
    expect(
      canManuallyRetry({ ...input, retryAfter: new Date(now.getTime() + 1) }),
    ).toBe(false);
    expect(
      canManuallyRetry({ ...input, now: new Date(now.getTime() + 86_400_000) }),
    ).toBe(false);
  });
  it('uncertain reconciliation requires sealed current payload within both windows', () => {
    const input = {
      firstDispatchedAt: now,
      createdAt: now,
      now,
      attempts: 1,
      hasSealedPayload: true,
      current: true,
    };
    expect(canReconcileWithIdempotentPost(input)).toBe(true);
    expect(
      canReconcileWithIdempotentPost({ ...input, hasSealedPayload: false }),
    ).toBe(false);
    expect(canReconcileWithIdempotentPost({ ...input, current: false })).toBe(
      false,
    );
    expect(canReconcileWithIdempotentPost({ ...input, attempts: 5 })).toBe(
      false,
    );
    expect(
      canReconcileWithIdempotentPost({
        ...input,
        now: new Date(now.getTime() + 86_340_000),
      }),
    ).toBe(false);
  });
  it('purges closed private data at exactly 30 days, never open data', () => {
    const boundary = new Date(now.getTime() + PRIVATE_RETENTION_MS);
    expect(shouldPurgePrivateData(null, boundary)).toBe(false);
    expect(shouldPurgePrivateData(now, new Date(boundary.getTime() - 1))).toBe(
      false,
    );
    expect(shouldPurgePrivateData(now, boundary)).toBe(true);
  });
});

describe('Five fixed templates — C0 §5.7', () => {
  const variables = {
    organizationName: 'Negocio de prueba',
    serviceName: 'Servicio de prueba',
    startTime: new Date('2026-09-15T14:00:00Z'),
    timeZone: 'America/Santo_Domingo',
  };
  it.each([
    'CREATED',
    'CONFIRMED',
    'CANCELLED',
    'RESCHEDULED',
    'COMPLETED',
  ] as EmailEvent[])(
    'renders %s with a generic subject and escaped body',
    (event) => {
      const result = renderNotification(event, {
        ...variables,
        organizationName: '<b>Negocio & "prueba"</b>',
      });
      expect(result.html).not.toContain('<b>');
      expect(result.html).toContain('&lt;b&gt;');
      expect(result.html).toContain('&amp;');
      expect(result.subject).not.toContain('prueba');
      expect(result.version).toBe('booking-email-v1');
    },
  );
  it('reschedule contains the new schedule without claiming confirmation', () => {
    const first = renderNotification('RESCHEDULED', variables);
    const second = renderNotification('RESCHEDULED', {
      ...variables,
      startTime: new Date('2026-09-16T15:00:00Z'),
    });
    expect(first.text).toContain('15 de septiembre de 2026');
    expect(second.text).toContain('16 de septiembre de 2026');
    expect(second.text).not.toContain('15 de septiembre');
    expect(second.text).not.toMatch(/confirmad|UTC|America\//);
  });
  it('completion is exactly transactional, with no payment or marketing', () => {
    expect(renderNotification('COMPLETED', variables).text).toBe(
      'Negocio de prueba: tu reserva fue completada, gracias por visitarnos',
    );
  });
  it('requires safe known variables and a valid business timezone', () => {
    expect(() =>
      renderNotification('CREATED', {
        ...variables,
        organizationName: 'Negocio\r\nBcc:private@example.com',
      }),
    ).toThrow('INVALID_NOTIFICATION_VARIABLE');
    expect(() =>
      renderNotification('CREATED', { ...variables, timeZone: 'Invalid/Zone' }),
    ).toThrow('INVALID_NOTIFICATION_DATE');
    expect(() =>
      renderNotification('CREATED', {
        ...variables,
        clientEmail: 'private@example.com',
      } as typeof variables),
    ).toThrow('UNKNOWN_NOTIFICATION_VARIABLE');
  });
  it('formats in the business zone regardless of process timezone', () => {
    const previous = process.env.TZ;
    try {
      process.env.TZ = 'Asia/Tokyo';
      const tokyo = renderNotification('CREATED', variables);
      process.env.TZ = 'America/Los_Angeles';
      expect(renderNotification('CREATED', variables)).toEqual(tokyo);
      expect(tokyo.text).toContain('10:00');
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
});
