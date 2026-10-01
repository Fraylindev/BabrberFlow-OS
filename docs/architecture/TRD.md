# TRD — Arquitectura técnica vigente

## C1 aprobado e integrado localmente — Horario y zona

**BACKEND C1 APROBADO / INTEGRADO EN PROYECTO LOCAL**. BusinessSchedule/Day/Window/Closure/Revision forman el agregado operativo por tenant; Organization conserva la zona autoritativa. Revisión esperada y lock Organization antes de Client/Booking/Professional protegen comandos globales y dependencias. Estado legacy no confirmado conserva diagnóstico/lectura; confirmado usa solo el agregado y falla cerrado ante corrupción. Revisión durable, motivos privados y cierres cancelados preservan historia. [Contrato](../features/HORARIO_ZONA_C1_CONTRATO.md) · [Evidencia](../features/HORARIO_ZONA_C1_EVIDENCIA.md). Estas relaciones están integradas en el código del proyecto local; el archivo de migración sigue pendiente de aplicación autorizada. No afirman migración productiva ni autorización C2.


## Alcance y fuentes

Este documento describe la arquitectura que ejecuta el repositorio. El código y Prisma son la verdad ejecutable; [`BACKEND_CHANGES.md`](../../BACKEND_CHANGES.md) documenta contratos y [`PROJECT_MASTER.md`](../../PROJECT_MASTER.md) estados.

## Sistema

- Monorepo pnpm + Turborepo.
- API: NestJS, TypeScript, Prisma y PostgreSQL en `apps/api`.
- Web: Next.js App Router, React, TypeScript, Tailwind y React Query en `apps/web`.
- Cliente HTTP único: [`apps/web/lib/api.ts`](../../apps/web/lib/api.ts).
- Desarrollo por defecto: API `3000`, web `3001`; ejemplos sin secretos en cada aplicación.
- Persistencia auditada: PostgreSQL local; Supabase todavía no está implementado.

## Identidad y autorización

La web interna usa Clerk como única autoridad de identidad para login, registro, verificación, recuperación, contraseña, logout y sesión. `GET /auth/clerk/bootstrap` resuelve User local mínimo y Memberships B2B. La web obtiene el token corto en memoria y añade `x-organization-id` únicamente desde ese conjunto autorizado.

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

El alta inicial separa identidad y negocio: Clerk termina primero la sesión y `/dashboard/setup` consume después el onboarding atómico existente. Antes de `READY`, el layout no monta navegación ni datos tenant. `/auth/continue` es solo compatibilidad de redirección y no contiene formularios ni decisiones de negocio. El middleware Clerk se limita a rutas de autenticación y dashboard; la landing y `/[slug]` públicos no lo atraviesan, aunque el `ClerkProvider` raíz mantiene la obligación de configurar la instancia al ejecutar la web. Las rutas genéricas `POST /organizations` y `GET /organizations/by-slug/:slug` están retiradas porque una creaba tenants sin Membership y la otra exponía UUID interno sin consumidor vigente. Un futuro flujo multi-organización necesita contrato propio.

## Capas backend

- Controllers validan DTOs/parámetros y aplican Guards/roles.
- Services contienen reglas, proyecciones y transacciones.
- Prisma accede a PostgreSQL; las migraciones expresan garantías no representables solo en el schema.
- ValidationPipe usa whitelist y rechazo de campos extra.
- AuditLog evita PII. La auditoría financiera es fail-closed y transaccional; otros módulos conservan el patrón aprobado por su contrato.

## Multi-tenancy e integridad

`Organization` es el tenant y `Membership` une `User × Organization × Role`. Toda consulta de negocio aplica `organizationId` derivado del contexto autenticado; BARBER añade ownership por Professional cuando el contrato lo exige.

PostgreSQL refuerza invariantes de agenda, disponibilidad individual, invitaciones, vínculo B2C, Configuración/CMS, Facturación, Notificaciones y Medios. Hay 25 migraciones versionadas, aplicadas en la base local de desarrollo según [Medios C3](../features/MEDIOS_PROMOCIONES_C3_ACTIVACION.md); el workflow las aplica desde cero sobre PostgreSQL 16 aislado. Los checks, exclusiones e índices suplementarios se verifican además mediante el CLI de integridad y no deben reconstruirse por inferencia desde Prisma.

## Notificaciones y medios

Notificaciones C1–C3 están cerradas/aprobadas: Booking y la intención de correo comparten transacción local; un worker separado usa leases PostgreSQL y Resend fuera de esa transacción. Snapshot y versión de plantilla quedan sellados. Las cinco entregas reales de C3 se verificaron; el canal permanece pausado, sin activación productiva. [Contrato](../features/NOTIFICACIONES_C1_CONTRATO.md) y [activación](../features/NOTIFICACIONES_C3_ACTIVACION.md).

Medios/Promociones C1–C3 están cerrados/aprobados; el backend controla custodia Cloudinary `authenticated`, moderación, publicación, proyección pública y purga durable. C3 cerró el mantenimiento documental con aprobación expresa del propietario. El agotamiento observado de cuota Free en QA y el control operativo previo a tráfico externo están en [C3](../features/MEDIOS_PROMOCIONES_C3_ACTIVACION.md). Ninguna de estas aprobaciones activa producción.

## Frontend

- React Query gestiona estado remoto y purga datos de negocio al cambiar el contexto.
- Resumen y Facturación añaden claves `usuario + organización + rol` y control de solicitudes tardías.
- `api.ts` obtiene la sesión en cada petición; no persiste el JWT legacy.
- El gate limpio regenera los tipos Next antes de TypeScript; las pruebas web incluyen lógica, componentes y smoke tests Chrome en escritorio/375 px.
- Las pantallas deben cubrir loading, empty, error/reintento, pending y success.
- La autorización vive en API; una build limpia no sustituye QA en navegador.
- `/{slug}` consume la proyección publicada de `booking-data`, revalida al recuperar foco y antes de montar la reserva, y presenta el mismo estado neutro para inexistente, inactivo, borrado o retirado. No recibe UUID de Organization ni correo privado.
- Reserva pública: `booking-data` expone el día mínimo del negocio y, por decisión F0-D/2A, la zona IANA técnica autoritativa en la raíz (backend aprobado e integrado en web localmente/en revisión). `availability` convierte cada hora local a un `startTime` UTC autoritativo. El navegador conserva fecha/hora civil y reenvía ese instante sin convertirlo con su propia zona; confirmación/éxito usan el formateador relativo común con timeZone técnico y el instante del slot/reserva. Fechas públicas y filtros `from`/`to` de Facturación cruzan validación ISO calendario estricta; la utilidad compartida devuelve fallo controlado ante entradas imposibles o extremas.

## Persistencia administrada aprobada, no implementada

Prisma continuará sobre PostgreSQL cuando se traslade a Supabase. Supabase Auth y el Data API no serán autoridad de negocio. El cutover requiere proyecto separado, rol mínimo, SSL, ensayo `pg_dump`/restore, preservación de `_prisma_migrations`, constraints, conteos y rollback probado. No se mezcla con cambios de identidad.

## Riesgos técnicos vigentes

- rate limiting y caché son locales al proceso;
- JWT/password legacy aumenta superficie hasta A0.7;
- el workflow versionado ejecuta gates de calidad; no despliega ni sustituye QA funcional autenticado;
- el smoke Chrome local del [2026-09-24](../quality/AUDITORIA_INTEGRAL_2026_09_24.md) terminó con exit `1`; los scripts `ops/` de provisión de roles citados por documentación anterior no están en el checkout;
- configuración y titularidad de enlaces comerciales deben verificarse antes de producción;
- Supabase y planes productivos siguen sujetos a gates de pago, backup y restore.

Las decisiones y secuencia completas están en [`ADR-001`](../decisions/ADR-001-authentication-strategy.md), [`ADR-002`](../decisions/ADR-002-facturacion-interna-inmutable.md) y [`DELIVERY_GATES.md`](../quality/DELIVERY_GATES.md).
