import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  hasControlCharacters,
  normalizedRecipient,
} from './notification-policy';

export interface EmailEnvelope {
  from: string;
  to: [string];
  reply_to: string;
  subject: string;
  text: string;
  html: string;
}

export function serializeEnvelope(payload: EmailEnvelope): string {
  return JSON.stringify({
    from: payload.from,
    to: payload.to,
    reply_to: payload.reply_to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}

export interface EmailChannelConfig {
  enabled: boolean;
  apiKey: string;
  fromAddress: string;
  replyTo: string;
  webhookSecret: string;
  abuseSecret: string;
}

/** One mailbox, optionally preceded by a plain display name. */
function normalizedSender(value: unknown): string | null {
  if (typeof value !== 'string' || hasControlCharacters(value)) return null;
  const sender = value.trim();
  if (sender.length > 500) return null;
  const mailbox = normalizedRecipient(sender);
  if (mailbox) return mailbox;
  const named = sender.match(/^([^<> ,";:]+(?: [^<>,";:]+)*)\s+<([^<>]+)>$/);
  if (!named) return null;
  const address = normalizedRecipient(named[2]);
  return address ? `${named[1].trim()} <${address}>` : null;
}

/** No implicit activation from the presence of credentials. */
export function emailChannelConfig(env: NodeJS.ProcessEnv): EmailChannelConfig {
  const requested = env.NOTIFICATIONS_EMAIL_ENABLED === 'true';
  const fromAddress = normalizedSender(env.NOTIFICATIONS_EMAIL_FROM);
  const replyTo = normalizedRecipient(env.NOTIFICATIONS_EMAIL_REPLY_TO);
  const apiKey = env.RESEND_API_KEY ?? '';
  const webhookSecret = env.RESEND_WEBHOOK_SECRET ?? '';
  const abuseSecret = env.NOTIFICATIONS_ABUSE_SECRET ?? '';
  const verified = env.NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED === 'true';
  if (
    requested &&
    (!verified ||
      !fromAddress ||
      !replyTo ||
      !apiKey ||
      hasControlCharacters(apiKey) ||
      !webhookSecret.startsWith('whsec_') ||
      abuseSecret.length < 32)
  ) {
    throw new Error('EMAIL_CHANNEL_CONFIGURATION_INVALID');
  }
  return {
    enabled: requested,
    apiKey,
    fromAddress: fromAddress ?? '',
    replyTo: replyTo ?? '',
    webhookSecret,
    abuseSecret,
  };
}

export type SendResult =
  | { kind: 'ACCEPTED'; providerId: string }
  | { kind: 'RETRY'; retryAfter: Date | null }
  | { kind: 'PERMANENT' | 'CONFIGURATION' | 'UNCERTAIN' | 'DISABLED' };

export interface EmailProvider {
  send(payload: EmailEnvelope, key: string): Promise<SendResult>;
  retrieve(
    providerId: string,
  ): Promise<'ACCEPTED' | 'DELIVERED' | 'FAILED' | null>;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function providerId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}

function retryAfter(value: string | null, now: Date): Date | null {
  if (!value) return null;
  const millis = /^\d+$/.test(value)
    ? now.getTime() + Number(value) * 1000
    : Date.parse(value);
  return Number.isFinite(millis)
    ? new Date(Math.max(now.getTime(), millis))
    : null;
}

export class ResendAdapter implements EmailProvider {
  constructor(
    private readonly config: EmailChannelConfig,
    private readonly transport: typeof fetch = fetch,
  ) {}

  async send(payload: EmailEnvelope, key: string): Promise<SendResult> {
    if (!this.config.enabled) return { kind: 'DISABLED' };
    if (!/^[a-zA-Z0-9_/-]{1,256}$/.test(key) || !validEnvelope(payload)) {
      return { kind: 'PERMANENT' };
    }
    try {
      const response = await this.transport('https://api.resend.com/emails', {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: serializeEnvelope(payload),
      });
      if (response.status === 429)
        return {
          kind: 'RETRY',
          retryAfter: retryAfter(
            response.headers.get('retry-after'),
            new Date(),
          ),
        };
      if (response.status === 401 || response.status === 403)
        return { kind: 'CONFIGURATION' };
      if (
        response.status >= 500 ||
        response.status === 408 ||
        response.status === 409
      )
        return { kind: 'UNCERTAIN' };
      if (!response.ok) return { kind: 'PERMANENT' };
      const data = objectValue(await response.json());
      return providerId(data?.id)
        ? { kind: 'ACCEPTED', providerId: data.id }
        : { kind: 'UNCERTAIN' };
    } catch {
      // The transport may have transmitted the request before throwing.
      return { kind: 'UNCERTAIN' };
    }
  }

  async retrieve(
    id: string,
  ): Promise<'ACCEPTED' | 'DELIVERED' | 'FAILED' | null> {
    if (!this.config.enabled || !providerId(id)) return null;
    try {
      const response = await this.transport(
        `https://api.resend.com/emails/${id}`,
        {
          method: 'GET',
          redirect: 'error',
          signal: AbortSignal.timeout(10_000),
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
        },
      );
      if (!response.ok) return null;
      const data = objectValue(await response.json());
      if (data?.id !== id) return null;
      if (data.last_event === 'delivered') return 'DELIVERED';
      if (
        ['bounced', 'complained', 'failed', 'suppressed'].includes(
          String(data.last_event),
        )
      )
        return 'FAILED';
      if (data.last_event === 'sent') return 'ACCEPTED';
      return null;
    } catch {
      return null;
    }
  }
}

export function validEnvelope(value: unknown): value is EmailEnvelope {
  const data = objectValue(value);
  if (
    !data ||
    Object.keys(data).sort().join(',') !== 'from,html,reply_to,subject,text,to'
  )
    return false;
  if (
    !Array.isArray(data.to) ||
    data.to.length !== 1 ||
    !normalizedRecipient(data.to[0]) ||
    !normalizedRecipient(data.reply_to)
  )
    return false;
  if (!normalizedSender(data.from)) return false;
  return (
    typeof data.subject === 'string' &&
    data.subject.length <= 200 &&
    !hasControlCharacters(data.subject) &&
    typeof data.text === 'string' &&
    data.text.length <= 10_000 &&
    typeof data.html === 'string' &&
    data.html.length <= 30_000
  );
}

export interface VerifiedEmailWebhook {
  id: string;
  providerId: string;
  kind:
    | 'email.sent'
    | 'email.delivered'
    | 'email.bounced'
    | 'email.complained'
    | 'email.failed';
  occurredAt: Date;
}

/** Standard Webhooks/Svix signature over the exact original bytes, not parsed JSON. */
export function verifyEmailWebhook(
  raw: Buffer,
  headers: Record<string, unknown>,
  secret: string,
  now = new Date(),
): VerifiedEmailWebhook | null {
  const id = headers['svix-id'];
  const timestamp = headers['svix-timestamp'];
  const signatures = headers['svix-signature'];
  if (
    raw.length > 65_536 ||
    typeof id !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(id) ||
    typeof timestamp !== 'string' ||
    !/^\d{1,12}$/.test(timestamp) ||
    typeof signatures !== 'string' ||
    signatures.length > 2048 ||
    !secret.startsWith('whsec_')
  )
    return null;
  if (Math.abs(now.getTime() / 1000 - Number(timestamp)) > 300) return null;
  const key = Buffer.from(secret.slice(6), 'base64');
  if (key.length < 16) return null;
  const expected = createHmac('sha256', key)
    .update(`${id}.${timestamp}.`)
    .update(raw)
    .digest();
  const valid = signatures.split(' ').some((signature) => {
    const [version, encoded] = signature.split(',');
    if (version !== 'v1' || !encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
      return false;
    const actual = Buffer.from(encoded, 'base64');
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  });
  if (!valid) return null;
  try {
    const body = objectValue(JSON.parse(raw.toString('utf8')));
    const data = objectValue(body?.data);
    const occurredAt = new Date(String(body?.created_at));
    if (
      !providerId(data?.email_id) ||
      !Number.isFinite(occurredAt.getTime()) ||
      occurredAt.getTime() > now.getTime() + 300_000 ||
      ![
        'email.sent',
        'email.delivered',
        'email.bounced',
        'email.complained',
        'email.failed',
      ].includes(String(body?.type))
    )
      return null;
    return {
      id,
      providerId: data.email_id,
      kind: body?.type as VerifiedEmailWebhook['kind'],
      occurredAt,
    };
  } catch {
    return null;
  }
}
