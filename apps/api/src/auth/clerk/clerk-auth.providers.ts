import { Provider } from '@nestjs/common';
import { ClerkClient, createClerkClient } from '@clerk/backend';
import { ClerkAuthConfig, loadClerkAuthConfig } from './clerk-auth.config';

export const CLERK_AUTH_CONFIG = Symbol('CLERK_AUTH_CONFIG');
export const CLERK_BACKEND_CLIENT = Symbol('CLERK_BACKEND_CLIENT');

/**
 * Función que, al invocarse, lee el entorno y devuelve la configuración Clerk.
 * Se evalúa en la primera petición que llegue al guard, no al arrancar el módulo.
 * Si las variables no están presentes en ese momento el guard falla cerrado con 401.
 */
export type ClerkConfigLoader = () => ClerkAuthConfig;

/**
 * Función que, dado un config válido, construye el cliente SDK de Clerk.
 * Separada del loader para permitir inyectar dobles de prueba sin cambiar
 * la inicialización lazy del servicio.
 */
export type ClerkClientFactory = (
  config: ClerkAuthConfig,
) => Pick<
  ClerkClient,
  'authenticateRequest' | 'sessions' | 'users' | 'invitations'
>;

/** Alias publico del tipo Pick del cliente, reutilizado en el verifier. */
export type ClerkBackendClient = ReturnType<ClerkClientFactory>;

/**
 * Provider de la función cargadora de configuración.
 * La factory de NestJS devuelve la función — NO la llama.
 * Esto garantiza que el proceso arranca aunque falten CLERK_SECRET_KEY,
 * CLERK_PUBLISHABLE_KEY o CLERK_AUTHORIZED_PARTIES.
 */
export const clerkAuthConfigProvider: Provider<ClerkConfigLoader> = {
  provide: CLERK_AUTH_CONFIG,
  useFactory: (): ClerkConfigLoader => () => loadClerkAuthConfig(process.env),
};

/**
 * Provider de la función creadora del cliente SDK.
 * Devuelve la función constructora — la llamada a createClerkClient se
 * difiere hasta que el verifier necesita el cliente por primera vez.
 */
export const clerkBackendClientProvider: Provider<ClerkClientFactory> = {
  provide: CLERK_BACKEND_CLIENT,
  useFactory:
    (): ClerkClientFactory =>
    (config: ClerkAuthConfig): ClerkBackendClient =>
      createClerkClient({
        secretKey: config.secretKey,
        publishableKey: config.publishableKey,
      }),
};
