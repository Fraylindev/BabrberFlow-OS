import { createHmac } from 'node:crypto';
import {
  emailChannelConfig,
  ResendAdapter,
  validEnvelope,
  verifyEmailWebhook,
  type EmailChannelConfig,
  type EmailEnvelope,
} from './resend.adapter';

const config: EmailChannelConfig = {
  enabled: true,
  apiKey: 'controlled-test-key',
  fromAddress: 'central@example.com',
  replyTo: 'reply@example.com',
  webhookSecret: `whsec_${Buffer.alloc(32, 7).toString('base64')}`,
  abuseSecret: 'controlled-test-secret-with-32-characters',
};
const payload: EmailEnvelope = {
  from: 'Negocio <central@example.com>',
  to: ['controlled@example.com'],
  reply_to: 'reply@example.com',
  subject: 'Reserva registrada',
  text: 'Mensaje controlado',
  html: '<p>Mensaje controlado</p>',
};

describe('Resend controlled transport — C0 §5.5', () => {
  const enabledEnv = {
    NOTIFICATIONS_EMAIL_ENABLED: 'true',
    NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED: 'true',
    NOTIFICATIONS_EMAIL_REPLY_TO: config.replyTo,
    RESEND_API_KEY: config.apiKey,
    RESEND_WEBHOOK_SECRET: config.webhookSecret,
    NOTIFICATIONS_ABUSE_SECRET: config.abuseSecret,
  };

  it.each([
    [' Booking <CENTRAL@example.com> ', 'Booking <central@example.com>'],
    [
      'Kortek Booking <central@example.com>',
      'Kortek Booking <central@example.com>',
    ],
    ['CENTRAL@example.com', 'central@example.com'],
  ])('accepts a single configured sender %s', (sender, expected) => {
    const actual = emailChannelConfig({
      ...enabledEnv,
      NOTIFICATIONS_EMAIL_FROM: sender,
    });
    expect(actual.fromAddress).toBe(expected);
    expect(actual.enabled).toBe(true);
    expect(validEnvelope({ ...payload, from: actual.fromAddress })).toBe(true);
  });

  it.each([
    'Booking <invalid>',
    'Booking <central@example.com> trailing',
    'first@example.com, Booking <central@example.com>',
    'Booking\r\nBcc: other@example.com <central@example.com>',
    '<central@example.com>',
    'Booking <central@example.com><other@example.com>',
  ])('rejects invalid configured sender %s', (sender) => {
    expect(() =>
      emailChannelConfig({ ...enabledEnv, NOTIFICATIONS_EMAIL_FROM: sender }),
    ).toThrow('EMAIL_CHANNEL_CONFIGURATION_INVALID');
    expect(validEnvelope({ ...payload, from: sender })).toBe(false);
  });

  it('does not activate from credentials alone', async () => {
    expect(emailChannelConfig({ RESEND_API_KEY: config.apiKey }).enabled).toBe(
      false,
    );
    expect(() =>
      emailChannelConfig({ NOTIFICATIONS_EMAIL_ENABLED: 'true' }),
    ).toThrow('EMAIL_CHANNEL_CONFIGURATION_INVALID');
    const transport = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >();
    const adapter = new ResendAdapter({ ...config, enabled: false }, transport);
    expect(await adapter.send(payload, 'notification/one')).toEqual({
      kind: 'DISABLED',
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it('sends only to the fixed HTTPS provider with stable key and identical payload', async () => {
    const transport = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ id: 'controlled-id' }), {
            status: 200,
          }),
        ),
      );
    const adapter = new ResendAdapter(config, transport);
    expect(await adapter.send(payload, 'notification/one')).toEqual({
      kind: 'ACCEPTED',
      providerId: 'controlled-id',
    });
    const restored = Object.fromEntries(
      Object.entries(payload).reverse(),
    ) as unknown as EmailEnvelope;
    await adapter.send(restored, 'notification/one');
    expect(transport.mock.calls[0][0]).toBe('https://api.resend.com/emails');
    const first = transport.mock.calls[0][1];
    const second = transport.mock.calls[1][1];
    expect(first?.body).toBe(JSON.stringify(payload));
    expect(first?.body).toBe(second?.body);
    expect(first?.headers).toEqual(second?.headers);
    expect(first?.redirect).toBe('error');
    expect(first?.headers).toMatchObject({
      'Idempotency-Key': 'notification/one',
    });
  });

  it.each([408, 409, 500, 502, 503])(
    'keeps HTTP %i uncertain, never a blind retry',
    async (status) => {
      const transport = jest
        .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
        .mockResolvedValue(new Response('{}', { status }));
      expect(
        await new ResendAdapter(config, transport).send(
          payload,
          'notification/one',
        ),
      ).toEqual({ kind: 'UNCERTAIN' });
    },
  );

  it('treats a thrown transport/timeout as ambiguous even if acceptance happened', async () => {
    const accepted: string[] = [];
    const transport = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockImplementation((_url, request) => {
        if (typeof request?.body !== 'string')
          throw new Error('expected sealed JSON');
        accepted.push(request.body);
        return Promise.reject(new Error('controlled timeout after acceptance'));
      });
    expect(
      await new ResendAdapter(config, transport).send(
        payload,
        'notification/one',
      ),
    ).toEqual({ kind: 'UNCERTAIN' });
    expect(accepted).toHaveLength(1);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('keeps a successful response without a correlation ID uncertain', async () => {
    const transport = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response('{}'));
    expect(
      await new ResendAdapter(config, transport).send(
        payload,
        'notification/one',
      ),
    ).toEqual({ kind: 'UNCERTAIN' });
  });

  it('honours explicit 429 Retry-After', async () => {
    const transport = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        new Response('{}', { status: 429, headers: { 'retry-after': '120' } }),
      );
    const before = Date.now();
    const result = await new ResendAdapter(config, transport).send(
      payload,
      'notification/one',
    );
    expect(result.kind).toBe('RETRY');
    if (result.kind !== 'RETRY') throw new Error('expected retry');
    expect(result.retryAfter!.getTime()).toBeGreaterThanOrEqual(
      before + 120_000,
    );
  });

  it.each([401, 403])(
    'signals channel configuration failure on %i',
    async (status) => {
      const transport = jest
        .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
        .mockResolvedValue(new Response('{}', { status }));
      expect(
        await new ResendAdapter(config, transport).send(
          payload,
          'notification/one',
        ),
      ).toEqual({ kind: 'CONFIGURATION' });
    },
  );

  it('stops a permanent rejection without copying external PII/errors', async () => {
    const transport = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ message: 'controlled@example.com rejected' }),
          { status: 422 },
        ),
      );
    expect(
      await new ResendAdapter(config, transport).send(
        payload,
        'notification/one',
      ),
    ).toEqual({ kind: 'PERMANENT' });
  });

  it.each([
    { ...payload, bcc: ['other@example.com'] },
    { ...payload, to: ['one@example.com', 'two@example.com'] },
    { ...payload, subject: 'test\r\nBcc:other@example.com' },
    { ...payload, from: 'invalid' },
    { ...payload, reply_to: 'invalid' },
  ])('rejects unsafe envelope %j before transport', async (value) => {
    expect(validEnvelope(value)).toBe(false);
    const transport = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >();
    expect(
      await new ResendAdapter(config, transport).send(
        value as EmailEnvelope,
        'notification/one',
      ),
    ).toEqual({ kind: 'PERMANENT' });
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([
    ['sent', 'ACCEPTED'],
    ['delivered', 'DELIVERED'],
    ['bounced', 'FAILED'],
    ['complained', 'FAILED'],
    ['unknown', null],
  ] as const)(
    'reconciles %s only by matching provider ID',
    async (event, expected) => {
      const transport = jest
        .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              id: 'controlled-id',
              last_event: event,
              to: ['private@example.com'],
            }),
          ),
        );
      const adapter = new ResendAdapter(config, transport);
      expect(await adapter.retrieve('controlled-id')).toBe(expected);
      expect(transport.mock.calls[0][1]?.method).toBe('GET');
    },
  );
});

describe('Signed webhook boundary — C0 §5.5/§5.7', () => {
  const now = new Date('2026-09-14T18:00:00Z');
  const timestamp = String(now.getTime() / 1000);
  const raw = Buffer.from(
    JSON.stringify({
      type: 'email.delivered',
      created_at: now.toISOString(),
      data: { email_id: 'controlled-id', to: ['private@example.com'] },
    }),
  );
  function headers(body = raw, time = timestamp) {
    const signature = createHmac(
      'sha256',
      Buffer.from(config.webhookSecret.slice(6), 'base64'),
    )
      .update(`msg_test.${time}.`)
      .update(body)
      .digest('base64');
    return {
      'svix-id': 'msg_test',
      'svix-timestamp': time,
      'svix-signature': `v1,${signature}`,
    };
  }
  it('authenticates exact bytes and exposes only minimum correlation metadata', () => {
    expect(
      verifyEmailWebhook(raw, headers(), config.webhookSecret, now),
    ).toEqual({
      id: 'msg_test',
      providerId: 'controlled-id',
      kind: 'email.delivered',
      occurredAt: now,
    });
  });
  it('rejects changed bytes, wrong secret, malformed signature and future/old timestamps', () => {
    expect(
      verifyEmailWebhook(
        Buffer.concat([raw, Buffer.from(' ')]),
        headers(),
        config.webhookSecret,
        now,
      ),
    ).toBeNull();
    expect(
      verifyEmailWebhook(
        raw,
        headers(),
        `whsec_${Buffer.alloc(32, 9).toString('base64')}`,
        now,
      ),
    ).toBeNull();
    expect(
      verifyEmailWebhook(
        raw,
        { ...headers(), 'svix-signature': 'v1,bad' },
        config.webhookSecret,
        now,
      ),
    ).toBeNull();
    for (const offset of [-301, 301]) {
      expect(
        verifyEmailWebhook(
          raw,
          headers(raw, String(Number(timestamp) + offset)),
          config.webhookSecret,
          now,
        ),
      ).toBeNull();
    }
  });
  it('accepts a valid rotated signature and rejects array headers or missing correlation', () => {
    const original = headers();
    expect(
      verifyEmailWebhook(
        raw,
        {
          ...original,
          'svix-signature': `v1,ZmFrZQ== ${original['svix-signature']}`,
        },
        config.webhookSecret,
        now,
      ),
    ).not.toBeNull();
    expect(
      verifyEmailWebhook(
        raw,
        { ...original, 'svix-id': ['msg_test'] },
        config.webhookSecret,
        now,
      ),
    ).toBeNull();
    const uncorrelated = Buffer.from(
      JSON.stringify({
        type: 'email.delivered',
        created_at: now.toISOString(),
        data: {},
      }),
    );
    expect(
      verifyEmailWebhook(
        uncorrelated,
        headers(uncorrelated),
        config.webhookSecret,
        now,
      ),
    ).toBeNull();
  });
});
