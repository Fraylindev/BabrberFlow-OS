// Proceso HTTP independiente para ensayos; jamás se usa con identidad/proveedores reales.
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { ClerkSessionVerifierService } from '../src/auth/clerk/clerk-session-verifier.service';
import { MediaPurgeWorker } from '../src/media/media-purge.worker';
import { createE2eApp } from './create-e2e-app';

async function main() {
  const app = await createE2eApp((builder) =>
    builder
      .overrideProvider(ClerkSessionVerifierService)
      .useValue({
        getClient() {
          return {
            users: {
              getUser(clerkUserId: string) {
                return Promise.resolve({
                  id: clerkUserId,
                  firstName: 'Cliente',
                  lastName: 'Sintético',
                  primaryEmailAddressId: 'synthetic-primary',
                  emailAddresses: [
                    {
                      id: 'synthetic-primary',
                      emailAddress: `${clerkUserId.slice(8)}@test.invalid`,
                      verification: { status: 'verified' },
                    },
                  ],
                });
              },
            },
          };
        },
        verify(request: globalThis.Request) {
          const actor = request.headers
            .get('authorization')
            ?.replace(/^Bearer /, '');
          if (actor === 'synthetic-clerk-unavailable')
            throw new ServiceUnavailableException(
              'Servicio de autenticación no disponible temporalmente',
            );
          if (!actor?.startsWith('m2_test_'))
            throw new UnauthorizedException('Sesión no válida');
          return Promise.resolve({
            clerkUserId: actor,
            sessionId: `synthetic-${actor}`,
          });
        },
      })
      .overrideProvider(MediaPurgeWorker)
      .useValue({ onModuleInit() {}, onModuleDestroy() {} }),
  );
  app.useLogger(false);
  await app.listen(0, '127.0.0.1');
  process.send?.({
    port: ((app.getHttpServer() as Server).address() as AddressInfo).port,
    pid: process.pid,
  });
  process.on('message', (message: unknown) => {
    if (message === 'close') void app.close().then(() => process.exit(0));
  });
}
void main().catch(() => process.exit(1));
