# Modelo de datos — mapa vigente

## Fuente autoritativa

[`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) y las migraciones en [`apps/api/prisma/migrations/`](../../apps/api/prisma/migrations/) son la verdad ejecutable. Este documento explica relaciones; si difiere, auditar el código y corregir este mapa, nunca inferir que el Markdown altera la base.

## Identidad y tenant

- `Organization`: tenant y raíz de datos de negocio.
- `User`: identidad global con UUID local estable, email único y contraseña vigente; no contiene rol ni tenant propios.
- `User.clerkUserId`: enlace externo nullable y único reservado para Clerk. Security A0.1 no lo puebla ni usa para autenticar; múltiples usuarios pueden permanecer en `NULL`.
- `Membership`: relación `User × Organization` con `UserRole`; única por pareja.
- `TeamInvitation`: invitación tenant-scoped de Equipo con actor, rol no OWNER, referencia externa Clerk, expiración, estado local y aceptación opcional. Una restricción parcial permite como máximo una invitación abierta por organización y correo normalizado.
- `User.lastOrganizationId`: preferencia para resolver la Membership activa, no autorización por sí sola.

## Operación

- `Professional`: pertenece a Organization y puede vincularse opcionalmente a User; el vínculo es único por organización.
- `ProfessionalWeeklySchedule`: turnos recurrentes tenant-scoped de un Professional.
- `ProfessionalAvailabilityBlock`: bloqueo temporal tenant-scoped con estado y nota interna.
- `Client`: pertenece a Organization; email es único por organización cuando existe.
- `Service`: pertenece a Organization.
- `Booking`: une Organization, Client, Professional y Service; las reglas de agenda también viven en migraciones PostgreSQL.
- `ProfessionalService`: relación futura de precio/comisión; no limita qué servicio activo puede realizar un Professional activo en la fase vigente.

## Contenido, auditoría y finanzas

- `GalleryImage`: contenido asociado a Organization; su API/almacenamiento no está autorizado.
- `AuditLog`: guarda organización, actor, acción, entidad e ID sin relación dura a User; no debe contener PII o notas.
- `Payment` e `Invoice`: modelos separados de Booking. Su presencia en Prisma no significa que el módulo de Facturación esté aprobado o completo.
- `Notification`: registro con `organizationId` y `userId` opcional; debe auditarse en su módulo antes de asumir contratos o relaciones.

## Invariantes

- Todo dato de negocio debe aislarse por `organizationId` en consultas y contratos.
- Relaciones sin clave compuesta tenant-scoped requieren que el servicio valide la organización de todos los recursos en la operación autoritativa.
- No usar hard-delete para datos operativos o financieros sin una decisión explícita.
- Los enums y defaults se leen del schema vigente; este mapa no los redefine.
