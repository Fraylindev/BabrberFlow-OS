# TRD — Arquitectura técnica vigente

## Alcance y fuentes

Este documento orienta la arquitectura actual; no reemplaza el código. Prisma es la verdad ejecutable del modelo y [`BACKEND_CHANGES.md`](../../BACKEND_CHANGES.md) es la fuente de contratos publicados.

## Sistema

- Monorepo pnpm + Turborepo.
- API: NestJS, TypeScript, Prisma y PostgreSQL en `apps/api`.
- Web: Next.js App Router, React, TypeScript, Tailwind y React Query en `apps/web`.
- Cliente HTTP único: [`apps/web/lib/api.ts`](../../apps/web/lib/api.ts).
- Identidad: JWT propio + Passport + bcryptjs.

No se documenta un proveedor productivo de hosting, correo, caché distribuida o almacenamiento de imágenes porque no está definido como arquitectura vigente.

## Capas backend

- Controllers exponen rutas, validan DTOs y aplican Guards/roles.
- Services contienen reglas de negocio y orquestación.
- Prisma accede a PostgreSQL y las migraciones expresan garantías de base de datos.
- DTOs usan validación global con whitelist y rechazo de campos no permitidos.
- AuditLog registra contexto mínimo sin PII y conserva el patrón fail-open donde está adoptado.

## Multi-tenancy

`Organization` es el tenant; `Membership` une `User × Organization × Role`. Toda consulta de negocio debe aplicar `organizationId` proveniente del contexto autenticado. Las claves compuestas y constraints PostgreSQL refuerzan invariantes donde están implementadas, pero no sustituyen autorización.

## Integridad de agenda

Las operaciones de agenda aprobadas coordinan Professional y Booking mediante transacciones, bloqueo de fila tenant-scoped y restricciones PostgreSQL de solapamiento. La disponibilidad efectiva combina horario global, horario individual, bloqueos y reservas operativas. Los detalles vigentes están en [`BACKEND_CHANGES.md`](../../BACKEND_CHANGES.md).

## Frontend

- React Query gestiona estado remoto con aislamiento de keys por alcance.
- `api.ts` adjunta Bearer token y normaliza errores técnicos; las pantallas deben traducir errores esperados a lenguaje de tarea.
- La autorización permanece en API.
- QA en navegador es obligatorio para declarar una interfaz candidata.

## Autenticación y riesgo abierto

La implementación actual usa JWT de un día guardado en `localStorage`, revalida Membership por request y limita intentos en memoria. El onboarding público permite componer creación/resolución de Organization con registro OWNER. Consultar [`ADR-001`](../decisions/ADR-001-authentication-strategy.md) antes de cualquier cambio de autenticación.

## Decisiones técnicas

- No agregar dependencias o proveedores sin decisión aprobada.
- No inventar endpoints para desbloquear frontend.
- Diseñar invariantes concurrentes con garantía PostgreSQL real cuando una lectura previa sea insuficiente.
- Mantener código, [`DATA_MODEL.md`](DATA_MODEL.md), contratos y estado sincronizados.
