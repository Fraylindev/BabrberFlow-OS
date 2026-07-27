import { HttpException, HttpStatus } from '@nestjs/common';
import type { Cache } from 'cache-manager';

/**
 * Bloqueo temporal por cuenta contra fuerza bruta — complementa (no
 * reemplaza) el límite por IP de @nestjs/throttler ya existente en las
 * rutas. Un atacante que rota de IP sigue tropezando con esto, porque la
 * clave es el identificador de la cuenta (email o userId), no la IP.
 *
 * Usa el CACHE_MANAGER en memoria ya registrado globalmente (Fase 1 de
 * la auditoría) — nada nuevo que instalar, nada que persistir en la
 * base de datos (evita el vector de "bloquear la cuenta de otro a
 * propósito" que tendría un lockout guardado en User).
 *
 * Contrato: se registra un fallo solo cuando el intento fue
 * efectivamente incorrecto (nunca en cada request), y se resetea el
 * contador en cuanto hay un éxito — así un usuario real que se equivocó
 * una vez no queda cerca del límite para su próximo intento legítimo.
 */
export class AttemptLimiter {
  constructor(
    private readonly cache: Cache,
    private readonly keyPrefix: string,
    private readonly maxAttempts: number,
    private readonly windowMs: number,
  ) {}

  private key(identifier: string): string {
    return `${this.keyPrefix}:${identifier.toLowerCase().trim()}`;
  }

  async assertNotLocked(identifier: string, message: string): Promise<void> {
    const attempts = (await this.cache.get<number>(this.key(identifier))) ?? 0;
    if (attempts >= this.maxAttempts) {
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async recordFailure(identifier: string): Promise<void> {
    const k = this.key(identifier);
    const attempts = (await this.cache.get<number>(k)) ?? 0;
    await this.cache.set(k, attempts + 1, this.windowMs);
  }

  async reset(identifier: string): Promise<void> {
    await this.cache.del(this.key(identifier));
  }
}
