# Kortek Booking — API

Backend NestJS del SaaS multi-tenant. El estado vigente y el gobierno están en [`../../docs/README.md`](../../docs/README.md) y [`../../PROJECT_MASTER.md`](../../PROJECT_MASTER.md).

## Requisitos

- Node.js 20.9+
- pnpm
- Docker Desktop (para PostgreSQL)

## Configuración inicial

1. Copia `.env.example` a `.env` y completa las variables (ver comentarios dentro del archivo — `JWT_SECRET` es obligatorio).
2. Levanta la base de datos: `docker compose up -d` (desde la raíz del repo).
3. Desde la raíz, instala dependencias: `pnpm install --frozen-lockfile`.
4. Aplica las migraciones: `pnpm --filter api exec prisma migrate deploy`.

## Ejecutar en desarrollo

```bash
pnpm --filter api start:dev
```

Por defecto escucha en el puerto definido por `PORT` en `.env` (`3000` en el ejemplo); `apps/web` usa `3001`. Ambos servicios enlazan loopback en desarrollo.

## Validación de persistencia

Las E2E solo aceptan una base terminada en `_test`, con propietario no privilegiado y sin acceso a la base principal. Después de compilar, `node dist/prisma/verify-integrity.cli.js` comprueba en modo de solo lectura los constraints e índices suplementarios publicados. El procedimiento de roles runtime/migrador está en [`ops/README.md`](ops/README.md).

## Estructura

Un módulo NestJS por dominio de negocio: `auth`, `organizations`, `professionals`, `services`, `clients`, `bookings`, `invoices`. Cada uno sigue el patrón controller → service → Prisma, con aislamiento multi-tenant por `organizationId` en cada consulta.
