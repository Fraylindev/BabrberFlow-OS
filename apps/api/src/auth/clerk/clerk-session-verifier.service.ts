import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  isClerkAPIResponseError,
  TokenVerificationError,
  TokenVerificationErrorReason,
} from '@clerk/backend/errors';
import { withClerkDeadline } from './clerk-deadline';
import {
  CLERK_AUTH_CONFIG,
  CLERK_BACKEND_CLIENT,
} from './clerk-auth.providers';
import type {
  ClerkConfigLoader,
  ClerkClientFactory,
  ClerkBackendClient,
} from './clerk-auth.providers';
import type { ClerkAuthConfig } from './clerk-auth.config';

export interface VerifiedClerkSession {
  clerkUserId: string;
  sessionId: string;
  secondFactorVerified?: boolean;
}

// Clerk puede emitir el JWT unos segundos por delante del reloj del host.
// La tolerancia permanece deliberadamente acotada; las demás verificaciones
// criptográficas y la consulta autoritativa de la sesión siguen vigentes.
const CLERK_SESSION_CLOCK_SKEW_MS = 10_000;

/**
 * Verifica session tokens de Clerk de forma diferida: el SDK y la configuración
 * se construyen en la primera llamada a verify(), no al registrar el módulo.
 * Si la configuración no está disponible, el guard falla cerrado con 503 genérico
 * y registra internamente solo el nombre de clase del error (sin valores de secretos).
 */
@Injectable()
export class ClerkSessionVerifierService {
  private readonly logger = new Logger(ClerkSessionVerifierService.name);

  private client: ClerkBackendClient | null = null;
  private config: ClerkAuthConfig | null = null;

  constructor(
    @Inject(CLERK_AUTH_CONFIG)
    private readonly loadConfig: ClerkConfigLoader,
    @Inject(CLERK_BACKEND_CLIENT)
    private readonly createClient: ClerkClientFactory,
  ) {}

  /**
   * Inicializa config y cliente Clerk la primera vez que se invoca.
   * Si alguno de los dos falla, registra el tipo de error y devuelve 503
   * sin exponer detalles al cliente.
   */
  private initializeIfNeeded(): {
    client: ClerkBackendClient;
    config: ClerkAuthConfig;
  } {
    if (!this.client || !this.config) {
      try {
        const config = this.loadConfig();
        const client = this.createClient(config);
        // Asignamos solo tras éxito completo para evitar estado parcial
        this.config = config;
        this.client = client;
      } catch (error) {
        // Solo registramos el nombre de clase del error — el mensaje podría
        // contener fragmentos de claves si el SDK los genera.
        const kind =
          error instanceof Error ? error.constructor.name : 'UnknownError';
        this.logger.warn(`Clerk no disponible: ${kind}`);
        throw new ServiceUnavailableException(
          'Servicio de autenticación no disponible temporalmente',
        );
      }
    }

    return { client: this.client, config: this.config };
  }

  getClient(): ClerkBackendClient {
    return this.initializeIfNeeded().client;
  }

  async verify(request: Request): Promise<VerifiedClerkSession> {
    return withClerkDeadline((signal) =>
      this.verifyWithinDeadline(request, signal),
    );
  }

  private async verifyWithinDeadline(
    request: Request,
    signal: AbortSignal,
  ): Promise<VerifiedClerkSession> {
    try {
      const { client, config } = this.initializeIfNeeded();

      const state = await client.authenticateRequest(request, {
        acceptsToken: 'session_token',
        authorizedParties: config.authorizedParties,
        clockSkewInMs: CLERK_SESSION_CLOCK_SKEW_MS,
        ...(config.audience ? { audience: config.audience } : {}),
      });

      signal.throwIfAborted();

      if (!state.isAuthenticated || state.status !== 'signed-in') {
        if (
          state.reason === TokenVerificationErrorReason.RemoteJWKFailedToLoad ||
          state.reason === TokenVerificationErrorReason.InvalidSecretKey
        ) {
          throw new ServiceUnavailableException(
            'Servicio de autenticación no disponible temporalmente',
          );
        }
        this.logger.warn('Clerk session rejected: authentication_state');
        throw new UnauthorizedException('Sesión no válida');
      }

      const auth = state.toAuth();
      const claims = auth.sessionClaims;

      if (
        !auth.userId ||
        !auth.sessionId ||
        claims.sub !== auth.userId ||
        claims.sid !== auth.sessionId ||
        claims.iss !== config.issuer
      ) {
        this.logger.warn('Clerk session rejected: claims_mismatch');
        throw new UnauthorizedException('Sesión no válida');
      }

      // authenticateRequest valida firma, expiración, nbf, azp y, cuando se
      // configura, aud. La consulta autoritativa evita aceptar una sesión
      // revocada después de emitido el JWT.
      const session = await client.sessions
        .getSession(auth.sessionId)
        .catch((error: unknown) => {
          if (isClerkAPIResponseError(error) && error.status === 404) {
            throw new UnauthorizedException('Sesión no válida');
          }
          throw error;
        });
      signal.throwIfAborted();

      if (session.status !== 'active' || session.userId !== auth.userId) {
        this.logger.warn('Clerk session rejected: authoritative_session');
        throw new UnauthorizedException('Sesión no válida');
      }

      return {
        clerkUserId: auth.userId,
        sessionId: auth.sessionId,
        ...(Array.isArray(auth.factorVerificationAge)
          ? {
              secondFactorVerified:
                typeof auth.factorVerificationAge[1] === 'number' &&
                auth.factorVerificationAge[1] >= 0,
            }
          : {}),
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      if (
        error instanceof TokenVerificationError &&
        [
          TokenVerificationErrorReason.TokenExpired,
          TokenVerificationErrorReason.TokenInvalid,
          TokenVerificationErrorReason.TokenInvalidAlgorithm,
          TokenVerificationErrorReason.TokenInvalidAuthorizedParties,
          TokenVerificationErrorReason.TokenInvalidSignature,
          TokenVerificationErrorReason.TokenNotActiveYet,
          TokenVerificationErrorReason.TokenIatInTheFuture,
        ].includes(error.reason)
      ) {
        throw new UnauthorizedException('Sesión no válida');
      }

      const kind =
        error instanceof Error ? error.constructor.name : 'UnknownError';
      this.logger.warn(`Clerk session verification failed: ${kind}`);
      throw new ServiceUnavailableException(
        'Servicio de autenticación no disponible temporalmente',
      );
    }
  }
}
