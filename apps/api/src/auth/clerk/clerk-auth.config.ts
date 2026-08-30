export interface ClerkAuthConfig {
  secretKey: string;
  publishableKey: string;
  issuer: string;
  authorizedParties: string[];
  audience?: string[];
}

function requireValue(value: string | undefined, name: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${name} no está configurado para Clerk.`);
  }

  return normalized;
}

function parseList(value: string | undefined): string[] {
  return [
    ...new Set(
      (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function parseAuthorizedParties(value: string | undefined): string[] {
  const parties = parseList(value).map((party) => {
    const url = new URL(party);

    // Acepta orígenes exactos http/https con o sin puerto explícito (p. ej.
    // http://localhost:3001). Rechaza paths, queries, hashes y credenciales.
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      throw new Error(
        'CLERK_AUTHORIZED_PARTIES contiene un origen no permitido; ' +
          'cada valor debe ser un origen exacto http o https.',
      );
    }

    return url.origin;
  });

  if (parties.length === 0) {
    throw new Error(
      'CLERK_AUTHORIZED_PARTIES debe incluir al menos un origen http o https autorizado.',
    );
  }

  return [...new Set(parties)];
}

/**
 * Clerk codifica el Frontend API de la instancia en la publishable key.
 * Ese host es el issuer autoritativo de sus session tokens.
 */
export function issuerFromPublishableKey(publishableKey: string): string {
  const prefix = publishableKey.startsWith('pk_test_')
    ? 'pk_test_'
    : publishableKey.startsWith('pk_live_')
      ? 'pk_live_'
      : null;

  if (!prefix) {
    throw new Error('CLERK_PUBLISHABLE_KEY no tiene un formato válido.');
  }

  const decoded = Buffer.from(
    publishableKey.slice(prefix.length),
    'base64url',
  ).toString('utf8');
  const frontendApi = decoded.endsWith('$') ? decoded.slice(0, -1) : '';

  const issuer = new URL(`https://${frontendApi}`);

  if (
    !frontendApi ||
    issuer.hostname !== frontendApi ||
    issuer.port ||
    issuer.username ||
    issuer.password
  ) {
    throw new Error('CLERK_PUBLISHABLE_KEY no tiene un formato válido.');
  }

  return issuer.origin;
}

export function loadClerkAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): ClerkAuthConfig {
  const publishableKey = requireValue(
    env.CLERK_PUBLISHABLE_KEY,
    'CLERK_PUBLISHABLE_KEY',
  );
  const audience = parseList(env.CLERK_JWT_AUDIENCE);

  return {
    secretKey: requireValue(env.CLERK_SECRET_KEY, 'CLERK_SECRET_KEY'),
    publishableKey,
    issuer: issuerFromPublishableKey(publishableKey),
    authorizedParties: parseAuthorizedParties(env.CLERK_AUTHORIZED_PARTIES),
    ...(audience.length > 0 ? { audience } : {}),
  };
}

export function loadClerkInvitationRedirectUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const value = requireValue(
    env.CLERK_INVITATION_REDIRECT_URL,
    'CLERK_INVITATION_REDIRECT_URL',
  );
  const url = new URL(value);

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'CLERK_INVITATION_REDIRECT_URL debe ser una URL http o https sin credenciales, query ni hash.',
    );
  }

  return url.href;
}
