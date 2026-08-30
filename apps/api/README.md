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

Por defecto escucha en el puerto definido por `PORT` en `.env` (se recomienda `3001` para no chocar con `apps/web`, que usa el `3000`).

## Estructura

Un módulo NestJS por dominio de negocio: `auth`, `organizations`, `professionals`, `services`, `clients`, `bookings`, `invoices`. Cada uno sigue el patrón controller → service → Prisma, con aislamiento multi-tenant por `organizationId` en cada consulta.
