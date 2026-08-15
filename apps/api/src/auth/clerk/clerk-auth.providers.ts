import { Provider } from '@nestjs/common';
import { ClerkClient, createClerkClient } from '@clerk/backend';
import { ClerkAuthConfig, loadClerkAuthConfig } from './clerk-auth.config';

export const CLERK_AUTH_CONFIG = Symbol('CLERK_AUTH_CONFIG');
export const CLERK_BACKEND_CLIENT = Symbol('CLERK_BACKEND_CLIENT');

export type ClerkBackendClient = Pick<
  ClerkClient,
  'authenticateRequest' | 'sessions'
>;

export const clerkAuthConfigProvider: Provider<ClerkAuthConfig> = {
  provide: CLERK_AUTH_CONFIG,
  useFactory: loadClerkAuthConfig,
};

export const clerkBackendClientProvider: Provider<ClerkBackendClient> = {
  provide: CLERK_BACKEND_CLIENT,
  inject: [CLERK_AUTH_CONFIG],
  useFactory: (config: ClerkAuthConfig) =>
    createClerkClient({
      secretKey: config.secretKey,
      publishableKey: config.publishableKey,
    }),
};
