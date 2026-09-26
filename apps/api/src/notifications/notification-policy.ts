import { BookingStatus } from '@prisma/client';
import { isEmail } from 'class-validator';

export const EMAIL_NOTICE_VERSION = 'booking-email-v1';
export const EMAIL_NOTICE_TEXT =
  'Quiero recibir por correo avisos sobre el registro, la confirmación, la cancelación, la reprogramación y el cierre de esta reserva. Puedo retirar esta preferencia a través del negocio. No incluye publicidad';
export const EMAIL_TEMPLATE_VERSION = 'booking-email-v1';
export const MAX_ATTEMPTS = 5;
export const INTENT_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const PRIVATE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export type EmailEvent =
  'CREATED' | 'CONFIRMED' | 'CANCELLED' | 'RESCHEDULED' | 'COMPLETED';

export type EmailState =
  | 'PENDING'
  | 'PROCESSING'
  | 'RETRY'
  | 'ACCEPTED'
  | 'DELIVERED'
  | 'FAILED'
  | 'UNCERTAIN'
  | 'OMITTED'
  | 'OBSOLETE';

export interface BookingRevision {
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  serviceId: string;
  professionalId: string;
}

const active = (status: BookingStatus) =>
  status === BookingStatus.PENDING || status === BookingStatus.CONFIRMED;

/** Classification only; BookingsService remains authority for mutations. */
export function classifyBookingChange(
  before: BookingRevision | null,
  after: BookingRevision,
  now: Date,
): { changed: boolean; event: EmailEvent | null } {
  if (!before) {
    return {
      changed: true,
      event: after.status === BookingStatus.PENDING ? 'CREATED' : null,
    };
  }
  const scheduleChanged =
    before.startTime.getTime() !== after.startTime.getTime() ||
    before.endTime.getTime() !== after.endTime.getTime();
  const changed =
    scheduleChanged ||
    before.status !== after.status ||
    before.serviceId !== after.serviceId ||
    before.professionalId !== after.professionalId;
  if (!changed) return { changed: false, event: null };

  if (before.status !== after.status) {
    if (
      after.status === BookingStatus.CONFIRMED &&
      (before.status === BookingStatus.PENDING ||
        before.status === BookingStatus.CANCELLED)
    ) {
      return { changed: true, event: 'CONFIRMED' };
    }
    if (after.status === BookingStatus.CANCELLED && active(before.status)) {
      return { changed: true, event: 'CANCELLED' };
    }
    if (
      before.status === BookingStatus.CONFIRMED &&
      after.status === BookingStatus.COMPLETED &&
      after.endTime.getTime() <= now.getTime()
    ) {
      return { changed: true, event: 'COMPLETED' };
    }
    return { changed: true, event: null };
  }
  return {
    changed: true,
    event: scheduleChanged && active(after.status) ? 'RESCHEDULED' : null,
  };
}

export function normalizedRecipient(value: unknown): string | null {
  if (typeof value !== 'string' || hasControlCharacters(value)) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length <= 254 && isEmail(normalized) ? normalized : null;
}

export function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

export type OmissionReason =
  'NO_CONSENT' | 'NO_VALID_EMAIL' | 'CONTACT_NOT_REVIEWED';

/** Neither public input nor User/Clerk can replace the stored recipient. */
export function corroborateRecipient(input: {
  optedIn: boolean;
  noticeVersion: string | null;
  persistedEmail: unknown;
  reviewedEmail: unknown;
}): { recipient: string | null; reason: OmissionReason | null } {
  if (!input.optedIn || input.noticeVersion !== EMAIL_NOTICE_VERSION) {
    return { recipient: null, reason: 'NO_CONSENT' };
  }
  const recipient = normalizedRecipient(input.persistedEmail);
  if (!recipient) return { recipient: null, reason: 'NO_VALID_EMAIL' };
  if (recipient !== normalizedRecipient(input.reviewedEmail)) {
    return { recipient: null, reason: 'CONTACT_NOT_REVIEWED' };
  }
  return { recipient, reason: null };
}

export interface DispatchRevision {
  sequence: number;
  contactRevision: number;
  preferenceVersion: number;
  optedIn: boolean;
  contactReviewed: boolean;
  status: BookingStatus;
}

export function isCurrentIntent(
  intent: {
    sequence: number;
    contactRevision: number;
    preferenceVersion: number;
    event: EmailEvent;
    bookingStatus: BookingStatus;
  },
  current: DispatchRevision,
): boolean {
  if (
    !current.optedIn ||
    !current.contactReviewed ||
    intent.sequence !== current.sequence ||
    intent.contactRevision !== current.contactRevision ||
    intent.preferenceVersion !== current.preferenceVersion ||
    intent.bookingStatus !== current.status
  ) {
    return false;
  }
  switch (intent.event) {
    case 'CREATED':
      return current.status === BookingStatus.PENDING;
    case 'CONFIRMED':
      return current.status === BookingStatus.CONFIRMED;
    case 'CANCELLED':
      return current.status === BookingStatus.CANCELLED;
    case 'COMPLETED':
      return current.status === BookingStatus.COMPLETED;
    case 'RESCHEDULED':
      return active(current.status);
  }
}

/** Delay after the failed attempt, never beyond the original event deadline. */
export function nextAttemptAt(input: {
  attempts: number;
  createdAt: Date;
  now: Date;
  retryAfter: Date | null;
  jitter: number;
}): Date | null {
  const { attempts, createdAt, now, retryAfter, jitter } = input;
  if (!Number.isInteger(attempts) || attempts < 1 || attempts >= MAX_ATTEMPTS) {
    return null;
  }
  const delay = [60_000, 300_000, 1_800_000, 7_200_000][attempts - 1];
  const jitterFactor = Number.isFinite(jitter)
    ? Math.max(0, Math.min(jitter, 1))
    : 0;
  const next = Math.max(
    now.getTime() + delay * (1 + jitterFactor * 0.1),
    retryAfter?.getTime() ?? 0,
  );
  return next < createdAt.getTime() + INTENT_LIFETIME_MS
    ? new Date(next)
    : null;
}

export function canManuallyRetry(input: {
  state: EmailState;
  attempts: number;
  createdAt: Date;
  now: Date;
  retryAfter: Date | null;
  current: boolean;
}): boolean {
  return (
    input.state === 'RETRY' &&
    input.current &&
    input.attempts >= 1 &&
    input.attempts < MAX_ATTEMPTS &&
    input.now.getTime() < input.createdAt.getTime() + INTENT_LIFETIME_MS &&
    (!input.retryAfter || input.retryAfter.getTime() <= input.now.getTime())
  );
}

export function shouldPurgePrivateData(closedAt: Date | null, now: Date) {
  return (
    closedAt !== null &&
    closedAt.getTime() + PRIVATE_RETENTION_MS <= now.getTime()
  );
}

export function canReconcileWithIdempotentPost(input: {
  firstDispatchedAt: Date | null;
  createdAt: Date;
  now: Date;
  attempts: number;
  hasSealedPayload: boolean;
  current: boolean;
}): boolean {
  return (
    input.firstDispatchedAt !== null &&
    input.hasSealedPayload &&
    input.current &&
    input.attempts >= 1 &&
    input.attempts < MAX_ATTEMPTS &&
    input.now.getTime() >= input.firstDispatchedAt.getTime() &&
    // Margin for transport latency at the provider's 24-hour boundary.
    input.now.getTime() <
      input.firstDispatchedAt.getTime() + INTENT_LIFETIME_MS - 60_000 &&
    input.now.getTime() < input.createdAt.getTime() + INTENT_LIFETIME_MS
  );
}
