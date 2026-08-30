# TRD — Arquitectura técnica vigente

## Alcance y fuentes

Este documento describe la arquitectura que ejecuta el repositorio. El código y Prisma son la verdad ejecutable; [`BACKEND_CHANGES.md`](../../BACKEND_CHANGES.md) documenta contratos y [`PROJECT_MASTER.md`](../../PROJECT_MASTER.md) estados.

## Sistema

- Monorepo pnpm + Turborepo.
- API: NestJS, TypeScript, Prisma y PostgreSQL en `apps/api`.
- Web: Next.js App Router, React, TypeScript, Tailwind y React Query en `apps/web`.
- Cliente HTTP único: [`apps/web/lib/api.ts`](../../apps/web/lib/api.ts).
- Desarrollo por defecto: web `3000`, API `3001`; ejemplos sin secretos en cada aplicación.
- Persistencia auditada: PostgreSQL local; Supabase todavía no está implementado.

## Identidad y autorización

La web interna usa Clerk para login, registro, recuperación, logout y sesión. `GET /auth/clerk/bootstrap` resuelve User local mínimo y Memberships B2B. La web obtiene el token corto en memoria y añade `x-organization-id` únicamente desde ese conjunto autorizado.

NestJS conserva compatibilidad temporal:

```text
Clerk session ──► ClerkAuthGuard ─┐
                                 ├─► User + Membership local ─► RolesGuard
JWT legacy ─────► B2bAuthGuard ──┘
```

- Clerk prueba identidad; no concede tenant ni rol.
- `Organization`, `Membership` y `UserRole` en PostgreSQL son autoridad de negocio.
- Clerk Organizations, metadata cliente y coincidencia de correo no autorizan.
- La baja o cambio de Membership tiene efecto en la siguiente petición.
- JWT/password backend permanece solo para rollback hasta un A0.7 autorizado.

El alta inicial usa onboarding Clerk atómico. Las rutas genéricas `POST /organizations` y `GET /organizations/by-slug/:slug` están retiradas porque una creaba tenants sin Membership y la otra exponía UUID interno sin consumidor vigente. Un futuro flujo multi-organización necesita contrato propio.

## Capas backend

- Controllers validan DTOs/parámetros y aplican Guards/roles.
- Services contienen reglas, proyecciones y transacciones.
- Prisma accede a PostgreSQL; las migraciones expresan garantías no representables solo en el schema.
- ValidationPipe usa whitelist y rechazo de campos extra.
- AuditLog evita PII. La auditoría financiera es fail-closed y transaccional; otros módulos conservan el patrón aprobado por su contrato.

## Multi-tenancy e integridad

`Organization` es el tenant y `Membership` une `User × Organization × Role`. Toda consulta de negocio aplica `organizationId` derivado del contexto autenticado; BARBER añade ownership por Professional cuando el contrato lo exige.

PostgreSQL refuerza invariantes de agenda, disponibilidad individual, invitaciones, vínculo B2C y Facturación. Las 19 migraciones vigentes se aplican desde cero sobre PostgreSQL 16; los checks y exclusiones no deben reconstruirse por inferencia desde Prisma.

## Frontend

- React Query gestiona estado remoto y purga datos de negocio al cambiar el contexto.
- Resumen y Facturación añaden claves `usuario + organización + rol` y control de solicitudes tardías.
- `api.ts` obtiene la sesión en cada petición; no persiste el JWT legacy.
- Las pantallas deben cubrir loading, empty, error/reintento, pending y success.
- La autorización vive en API; una build limpia no sustituye QA en navegador.

## Persistencia administrada aprobada, no implementada

Prisma continuará sobre PostgreSQL cuando se traslade a Supabase. Supabase Auth y el Data API no serán autoridad de negocio. El cutover requiere proyecto separado, rol mínimo, SSL, ensayo `pg_dump`/restore, preservación de `_prisma_migrations`, constraints, conteos y rollback probado. No se mezcla con cambios de identidad.

## Riesgos técnicos vigentes

- rate limiting y caché son locales al proceso;
- JWT/password legacy aumenta superficie hasta A0.7;
- no existe CI/CD versionado;
- configuración y titularidad de enlaces comerciales deben verificarse antes de producción;
- Supabase y planes productivos siguen sujetos a gates de pago, backup y restore.

Las decisiones y secuencia completas están en [`ADR-001`](../decisions/ADR-001-authentication-strategy.md), [`ADR-002`](../decisions/ADR-002-facturacion-interna-inmutable.md) y [`DELIVERY_GATES.md`](../quality/DELIVERY_GATES.md).
