# Kortek Booking

Monorepo del SaaS multi-tenant para la operación de barberías y salones.

La entrada autoritativa al proyecto es [`docs/README.md`](docs/README.md). Antes de desarrollar, lee también [`AGENTS.md`](AGENTS.md) y [`PROJECT_MASTER.md`](PROJECT_MASTER.md).

## Desarrollo local

Requisitos: Node.js 20.9+, pnpm 11.18 y Docker con PostgreSQL 16.

1. Copia `apps/api/.env.example` a `apps/api/.env` y `apps/web/.env.example` a `apps/web/.env.local`.
2. Sustituye los placeholders Clerk por claves Development propias; nunca las versiones.
3. Inicia PostgreSQL con `docker compose up -d postgres`.
4. Ejecuta `pnpm install --frozen-lockfile`.
5. Aplica el esquema con `pnpm --filter api exec prisma migrate deploy`.
6. Inicia ambos servicios con `pnpm dev`.

Sin overrides, la web usa `http://localhost:3000` y la API `http://localhost:3001`.

## Validación

```bash
pnpm type-check
pnpm lint
pnpm test
pnpm build
```

Las E2E exigen una base PostgreSQL `_test`, propietario no privilegiado y las variables de aislamiento descritas en `apps/api/test/global-setup.ts`. No deben ejecutarse contra la base principal.
