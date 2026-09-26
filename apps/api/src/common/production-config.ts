function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing production variable: ${name}`);
  return value;
}

function httpsOrigin(value: string, name: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.origin !== value ||
    url.username ||
    url.password ||
    /(^localhost$|^127\.|^0\.0\.0\.0$|^\[?::1\]?$|\.localhost$)/i.test(
      url.hostname,
    )
  ) {
    throw new Error(`Invalid production origin: ${name}`);
  }
  return url.origin;
}

export function validateProductionConfig(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const remoteDeployment = ['staging', 'production'].includes(
    env.DEPLOY_ENV ?? '',
  );
  if (env.NODE_ENV !== 'production' && !remoteDeployment) return;
  if (env.NODE_ENV !== 'production') {
    throw new Error('NODE_ENV must be production for staging or production');
  }
  if (!['staging', 'production'].includes(env.DEPLOY_ENV ?? '')) {
    throw new Error('DEPLOY_ENV must identify staging or production');
  }

  const required = [
    'DATABASE_URL',
    'APP_RELEASE',
    'HOST',
    'PORT',
    'JWT_SECRET',
    'RATE_LIMIT_SECRET',
    'WEB_PUBLIC_ORIGIN',
    'API_PUBLIC_ORIGIN',
    'CORS_ALLOWED_ORIGINS',
    'CLERK_SECRET_KEY',
    'CLERK_PUBLISHABLE_KEY',
    'CLERK_AUTHORIZED_PARTIES',
    'CLERK_INVITATION_REDIRECT_URL',
    'PUBLIC_BOOKING_CLOSED',
    'REQUIRE_INTERNAL_MFA',
    'NOTIFICATIONS_EMAIL_ENABLED',
    'NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];
  for (const name of required) requireEnv(env, name);
  if (env.DEPLOY_ENV === 'production') {
    for (const [name, prefix] of [
      ['CLERK_SECRET_KEY', 'sk_live_'],
      ['CLERK_PUBLISHABLE_KEY', 'pk_live_'],
    ]) {
      const value = requireEnv(env, name);
      if (!value.startsWith(prefix) || value.length <= prefix.length) {
        throw new Error(`Production Clerk instance required: ${name}`);
      }
    }
  }
  if (!/^[a-f0-9]{7,40}$/.test(requireEnv(env, 'APP_RELEASE'))) {
    throw new Error('APP_RELEASE must identify the deployed Git revision');
  }
  if (requireEnv(env, 'RATE_LIMIT_SECRET').length < 32) {
    throw new Error('RATE_LIMIT_SECRET is too short');
  }
  if (requireEnv(env, 'JWT_SECRET').length < 32) {
    throw new Error('JWT_SECRET is too short');
  }
  for (const name of [
    'PUBLIC_BOOKING_CLOSED',
    'REQUIRE_INTERNAL_MFA',
    'NOTIFICATIONS_EMAIL_ENABLED',
    'NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED',
  ]) {
    // Consumers compare the raw value with 'true'; trimming here could accept
    // an enabled control that the consumer then silently treats as disabled.
    if (!['true', 'false'].includes(env[name] ?? '')) {
      throw new Error(`Invalid production boolean: ${name}`);
    }
  }

  const web = httpsOrigin(
    requireEnv(env, 'WEB_PUBLIC_ORIGIN'),
    'WEB_PUBLIC_ORIGIN',
  );
  httpsOrigin(requireEnv(env, 'API_PUBLIC_ORIGIN'), 'API_PUBLIC_ORIGIN');
  for (const name of ['CORS_ALLOWED_ORIGINS', 'CLERK_AUTHORIZED_PARTIES']) {
    const values = requireEnv(env, name)
      .split(',')
      .map((item) => item.trim());
    if (values.some((item) => item === '' || item.includes('*'))) {
      throw new Error(`Invalid production allowlist: ${name}`);
    }
    const origins = values.map((item) => httpsOrigin(item, name));
    if (!origins.includes(web)) {
      throw new Error(`Production allowlist lacks WEB_PUBLIC_ORIGIN: ${name}`);
    }
  }
  const redirect = new URL(requireEnv(env, 'CLERK_INVITATION_REDIRECT_URL'));
  if (redirect.protocol !== 'https:' || redirect.origin !== web) {
    throw new Error('Invalid production invitation redirect');
  }
  const database = new URL(requireEnv(env, 'DATABASE_URL'));
  if (
    !['postgres:', 'postgresql:'].includes(database.protocol) ||
    !/^kortek_runtime(?:\.[a-z0-9]+)?$/.test(
      decodeURIComponent(database.username),
    ) ||
    !database.password ||
    !database.hostname ||
    database.searchParams.has('host') ||
    database.searchParams.getAll('sslmode').length !== 1 ||
    database.searchParams.getAll('sslaccept').length !== 1 ||
    database.searchParams.get('sslaccept') !== 'strict' ||
    !['require', 'verify-ca', 'verify-full'].includes(
      database.searchParams.get('sslmode') ?? '',
    ) ||
    /(^localhost$|^127\.|^0\.0\.0\.0$|^\[?::1\]?$|\.localhost$)/i.test(
      database.hostname,
    )
  ) {
    throw new Error(
      'Production DATABASE_URL requires runtime role and strict remote TLS',
    );
  }
  if (env.NOTIFICATIONS_EMAIL_ENABLED === 'true') {
    for (const name of [
      'NOTIFICATIONS_EMAIL_FROM',
      'NOTIFICATIONS_EMAIL_REPLY_TO',
      'NOTIFICATIONS_ABUSE_SECRET',
      'RESEND_API_KEY',
      'RESEND_WEBHOOK_SECRET',
    ])
      requireEnv(env, name);
    if (env.NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED !== 'true') {
      throw new Error('Email domain must be verified before activation');
    }
  }
}
