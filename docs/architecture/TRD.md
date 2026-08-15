# TRD — Arquitectura técnica vigente y dirección aprobada

## Alcance y fuentes

Este documento distingue lo que ejecuta hoy el repositorio de la arquitectura aprobada todavía no implementada. El código demuestra el estado real; Prisma es la verdad ejecutable del modelo y [`BACKEND_CHANGES.md`](../../BACKEND_CHANGES.md) documenta contratos publicados.

## Sistema vigente

- Monorepo pnpm + Turborepo.
- API: NestJS, TypeScript, Prisma y PostgreSQL en `apps/api`.
- Web: Next.js App Router, React, TypeScript, Tailwind y React Query en `apps/web`.
- Cliente HTTP único: [`apps/web/lib/api.ts`](../../apps/web/lib/api.ts).
- Identidad efectiva actual: JWT propio + Passport + bcryptjs. El SDK backend de Clerk y un guard aislado existen desde A0.2, pero todavía no protegen rutas.
- Persistencia actual auditada: PostgreSQL local; aún no se trasladó a Supabase.

## Capas backend

- Controllers exponen rutas, validan DTOs y aplican Guards/roles.
- Services contienen reglas de negocio y orquestación.
- Prisma accede a PostgreSQL y las migraciones expresan garantías de base de datos.
- DTOs usan validación global con whitelist y rechazo de campos no permitidos.
- AuditLog registra contexto mínimo sin PII y conserva el patrón fail-open donde está adoptado.

## Multi-tenancy y autorización

`Organization` es el tenant; `Membership` une `User × Organization × Role`. Toda consulta de negocio aplica `organizationId` derivado del contexto autenticado. Las claves compuestas y constraints PostgreSQL refuerzan invariantes, pero no sustituyen autorización.

La dirección aprobada conserva esta autoridad en NestJS/PostgreSQL. Clerk prueba quién es la persona; no decide a qué Organization pertenece ni qué rol posee. Clerk Organizations no se usará como fuente de autorización y Supabase Auth no se usará.

## Integridad de agenda

Las operaciones de agenda aprobadas coordinan Professional y Booking mediante transacciones, bloqueo de fila tenant-scoped y restricciones PostgreSQL de solapamiento. La disponibilidad efectiva combina horario global, horario individual, bloqueos y reservas operativas. Los detalles vigentes están en [`BACKEND_CHANGES.md`](../../BACKEND_CHANGES.md).

## Frontend vigente

- React Query gestiona estado remoto con aislamiento de keys por alcance.
- `api.ts` adjunta el Bearer JWT propio actual; las pantallas traducen errores esperados a lenguaje de tarea.
- El JWT y la sesión se almacenan hoy en `localStorage`; es un riesgo abierto hasta Security A0.5.
- La autorización permanece en API.
- QA en navegador es obligatorio para declarar una interfaz candidata.

## Arquitectura de identidad aprobada, parcialmente preparada

```text
Next.js + Clerk session
        │ token de sesión verificado
        ▼
NestJS Clerk guard ── sub ──► User.clerkUserId
        │
        └── contexto local ──► Membership(organizationId, role)
                                      │
                                      ▼
                              autorización de negocio
```

- Clerk: identidad, registro, login, verificación, recuperación, MFA y sesiones.
- NestJS: onboarding, selección de tenant, invitaciones de negocio, Guards, roles y toda autorización.
- PostgreSQL: `User`, `Organization`, `Membership`, entidades de negocio y auditoría.
- A0.2 implementa sin activar en endpoints la primera parte del diagrama: `authenticateRequest()` valida el session token con issuer/orígenes autorizados y audiencia configurada, una consulta Clerk exige sesión `active`, y el guard resuelve `sub → User.clerkUserId → Membership` en PostgreSQL.
- El `organizationId` que llegue del cliente es únicamente un selector de contexto validado como UUID; no concede acceso sin la clave compuesta local. El rol siempre sale de la Membership actual, por lo que cambio o baja tienen efecto en la siguiente petición.
- Los session tokens estándar de Clerk no incluyen `aud` por defecto. `authorizedParties` valida su `azp`; si se configura `CLERK_JWT_AUDIENCE`, el SDK exige también ese claim. La publishable key determina la instancia y el issuer esperado.
- La comprobación de estado consulta Clerk y falla cerrada. Antes de activarla ampliamente deben medirse latencia, cuotas y disponibilidad; no se cacheará una autorización de manera que retrase una revocación.
- El onboarding crea Organization + primera Membership OWNER en una transacción idempotente y no acepta un tenant preexistente del cliente.
- La eliminación/cambio de Membership tiene efecto en cada request aunque Clerk mantenga la sesión de identidad.
- El diseño completo, migración, rollback y checkpoints están en [`ADR-001`](../decisions/ADR-001-authentication-strategy.md).

## Arquitectura de datos aprobada, no implementada

- Prisma seguirá operando PostgreSQL y sus migraciones no se reemplazan por un esquema paralelo.
- Supabase alojará PostgreSQL; no se usará Supabase Auth ni el Data API como autoridad de negocio.
- Runtime persistente usa conexión directa o Supavisor sesión 5432 según conectividad; migraciones/dump nunca usan el pool transaccional 6543.
- SSL, rol Prisma dedicado, secretos separados, backups y rollback son gates.
- Migración de datos y migración Clerk se ejecutan en series de checkpoints separadas.

## Restricciones de despliegue y planes

Free se limita a desarrollo, QA y ensayos. Clerk Pro y Supabase Pro son obligatorios antes del primer tenant externo o de pago en producción, además de cualquier upgrade anticipado por MFA, capacidad, backups, soporte o cuotas. Los límites verificados y el gate exacto se mantienen en ADR-001.

## Decisiones técnicas permanentes

- No aceptar tenant/rol desde claims o bodies no autoritativos.
- No aceptar `sub` sin verificación criptográfica ni usar correo para enlazar identidades.
- No agregar proveedores o dependencias antes del checkpoint autorizado.
- No inventar endpoints para desbloquear frontend.
- Diseñar invariantes concurrentes con garantía PostgreSQL real cuando una lectura previa sea insuficiente.
- Mantener código, [`DATA_MODEL.md`](DATA_MODEL.md), contratos y estado sincronizados.
