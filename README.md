# Kortek Booking

Monorepo del SaaS multi-tenant para la operación de barberías y salones.

La entrada autoritativa al proyecto es [`docs/README.md`](docs/README.md). Antes de desarrollar, lee también [`AGENTS.md`](AGENTS.md) y [`PROJECT_MASTER.md`](PROJECT_MASTER.md).

## Desarrollo local

Requisitos: Node.js 20.9+, pnpm 11.18 y Docker con PostgreSQL 16.

1. Copia `apps/api/.env.example` a `apps/api/.env` y `apps/web/.env.example` a `apps/web/.env.local`.
2. Sustituye los placeholders Clerk por claves Development propias; nunca las versiones.
3. Inicia PostgreSQL con `docker compose up -d postgres`.
4. Ejecuta `pnpm install --frozen-lockfile`.
5. En una base nueva, aplica el esquema con una conexión administrativa aislada; luego provisiona los roles con [`apps/api/ops/provision-database-roles.sql`](apps/api/ops/provision-database-roles.sql). En actualizaciones posteriores, usa exclusivamente el migrador para `pnpm --filter api exec prisma migrate deploy`. La API debe arrancar solo con runtime.
6. Inicia ambos servicios con `pnpm dev` después de verificar ambos roles.

Sin overrides, la API usa `http://localhost:3000` y la web `http://localhost:3001`; ambos listeners quedan en loopback.

Los scripts originales están versionados en [`apps/api/ops/`](apps/api/ops/README.md), no en un directorio `ops/` de la raíz. Se verificaron desde cero en PostgreSQL aislado; el procedimiento y sus límites están en la [evidencia del correctivo](docs/quality/CORRECTIVOS_2026_09_24.md). No usar el superusuario bootstrap como credencial de API.

## Validación

```bash
pnpm type-check
pnpm lint
pnpm test
pnpm build
```

Para el gate limpio de tipos generados y los smoke tests Chrome:

```bash
pnpm --filter web type-check:clean
pnpm --filter web test:browser
```

Las E2E exigen una base PostgreSQL `_test`, propietario no privilegiado y las variables de aislamiento descritas en `apps/api/test/global-setup.ts`. No deben ejecutarse contra la base principal. El workflow de calidad reproduce instalación estricta, auditoría, Prisma, unitarias/componentes, builds, integridad PostgreSQL, E2E y navegador; no despliega.
