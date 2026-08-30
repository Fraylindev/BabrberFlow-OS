# Kortek Booking — Web

Frontend Next.js del producto multi-tenant. El estado vigente y el gobierno están en [`../../docs/README.md`](../../docs/README.md) y [`../../PROJECT_MASTER.md`](../../PROJECT_MASTER.md).

## Desarrollo

1. Copia `.env.example` a `.env.local`.
2. Configura claves Clerk Development propias, sin versionarlas.
3. Inicia la API en `http://localhost:3001`.
4. Desde la raíz ejecuta `pnpm --filter web dev`.

La web escucha en `http://localhost:3000` por defecto y consume `NEXT_PUBLIC_API_URL`.

## Validación

```bash
pnpm --filter web type-check
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
```

La autenticación interna usa Clerk y el contexto de negocio proviene del bootstrap local de NestJS; la web no persiste el JWT legacy.
