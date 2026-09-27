# Modelo de datos — mapa vigente

## C1 aprobado e integrado localmente — Horario y zona

**BACKEND C1 APROBADO / INTEGRADO EN PROYECTO LOCAL**. BusinessSchedule/Day/Window/Closure/Revision forman el agregado operativo por tenant; Organization conserva la zona autoritativa. Revisión esperada y lock Organization antes de Client/Booking/Professional protegen comandos globales y dependencias. Estado legacy no confirmado conserva diagnóstico/lectura; confirmado usa solo el agregado y falla cerrado ante corrupción. Revisión durable, motivos privados y cierres cancelados preservan historia. [Contrato](../features/HORARIO_ZONA_C1_CONTRATO.md) · [Evidencia](../features/HORARIO_ZONA_C1_EVIDENCIA.md). Estas relaciones están integradas en el código del proyecto local; el archivo de migración sigue pendiente de aplicación autorizada. No afirman migración productiva ni autorización C2.


## Fuente autoritativa

[`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) y las migraciones en [`apps/api/prisma/migrations/`](../../apps/api/prisma/migrations/) son la verdad ejecutable. Este documento explica relaciones; si difiere, auditar el código y corregir este mapa, nunca inferir que el Markdown altera la base.

## Identidad y tenant

- `Organization`: tenant y raíz de datos de negocio.
- `User`: identidad global con UUID local estable y email único; `password` es nullable para identidades Clerk y permanece solo por compatibilidad legacy. No contiene rol ni tenant propios.
- `User.clerkUserId`: enlace externo Clerk nullable y único. Los flujos Clerk autorizados lo crean o reutilizan explícitamente y nunca lo infieren por correo; múltiples usuarios legacy pueden permanecer en `NULL`.
- `Membership`: relación `User × Organization` con `UserRole`; única por pareja.
- `TeamInvitation`: invitación tenant-scoped de Equipo con actor, rol no OWNER, referencia externa Clerk, expiración, estado local y aceptación opcional. Una restricción parcial permite como máximo una invitación abierta por organización y correo normalizado.
- `User.lastOrganizationId`: preferencia para resolver una Membership activa; no autoriza por sí sola.

## Operación

- `Professional`: pertenece a Organization y puede vincularse opcionalmente a User; el vínculo es único por organización.
- `ProfessionalWeeklySchedule`: turnos recurrentes tenant-scoped de un Professional.
- `ProfessionalAvailabilityBlock`: bloqueo temporal tenant-scoped con estado y nota interna.
- `Client`: pertenece a Organization; email es único por organización cuando existe.
- `Service`: pertenece a Organization; `price` es una fuente DOP `Decimal(65,2)`, estrictamente positiva y validada antes de persistir.
- `Booking`: une Organization, Client, Professional y Service; las reglas de agenda también viven en migraciones PostgreSQL.
- `ProfessionalService`: relación futura de precio/comisión; no limita qué servicio activo puede realizar un Professional activo en la fase vigente.

## Contenido, auditoría y finanzas

- `CmsPage`: agregado editorial uno a uno por Organization, separado de los escalares operativos. Conserva borrador, revisión optimista, snapshot publicado y estado/fechas de publicación sin reutilizar `Organization.active` o `deletedAt`.
- `CmsOperation`: recibo idempotente de mutaciones editoriales por organización, actor, tipo y clave; no guarda contenido ni PII.
- `GalleryImage`: tabla legacy asociada a Organization; no es la custodia de archivos del contrato nuevo de Medios.
- `MediaAsset`, `MediaGalleryOrder`, `MediaPromotion`, `MediaOperation` y `MediaPurgeJob`: activos moderados, orden/portada, promociones editoriales, recibos idempotentes y purga durable tenant-scoped de [Medios C1](../features/MEDIOS_PROMOCIONES_C1_CONTRATO.md). C1–C3 están cerrados/aprobados; no hay activación productiva.
- `AuditLog`: guarda organización, actor, acción, entidad e ID sin relación dura a User; no debe contener PII o notas.
- `Invoice`: registro interno inmutable, único por Booking completada y tenant-consistente. Conserva el snapshot positivo `Decimal(65,2)` del precio del Service y moneda `DOP`; su estado API se deriva de la existencia de Payment.
- `Payment`: cobro completo único por Invoice. Conserva método, fecha real asignada por servidor y actor local denormalizado; no duplica importe, Booking ni estado.
- `Notification`: registro con `organizationId` y `userId` opcional; debe auditarse en su módulo antes de asumir contratos o relaciones.

## Invariantes

Notificaciones C1–C3 están cerradas/aprobadas: `Client.emailRevision` invalida corroboración incluso A → B → A; `BookingEmailPreference` conserva secuencia/consentimiento/revisión por reserva y tenant; `BookingEmailEvent` guarda eventos durables; `EmailOutbox` guarda intención, lease, presupuesto, snapshot privado purgable y versión de plantilla. `EmailWebhookReceipt` deduplica señales externas; `EmailAbuseBucket` limita envíos entre workers; `EmailChannelControl` pausa el canal compartido. FKs compuestas refuerzan tenant. `Notification` legacy permanece intacto y no se usa como outbox. El [contrato C1](../features/NOTIFICACIONES_C1_CONTRATO.md) y [QA C3](../features/NOTIFICACIONES_C3_ACTIVACION.md) no implican activación productiva: el canal sigue pausado.

- Todo dato de negocio debe aislarse por `organizationId` en consultas y contratos.
- Relaciones sin clave compuesta tenant-scoped requieren que el servicio valide la organización de todos los recursos en la operación autoritativa.
- No usar hard-delete para datos operativos o financieros sin una decisión explícita.
- `Booking` solo puede pasar a `COMPLETED` cuando el tiempo del servidor alcanza `endTime`; Invoice y Payment repiten el control ante datos históricos.
- `Service.price` no admite cero, negativos ni más de dos decimales; la migración falla cerrada en vez de redondear datos históricos.
- Booking–Invoice–Payment comparten `organizationId` mediante claves compuestas; emisión y cobro son transacciones serializables, idempotentes y con AuditLog fail-closed sin PII.
- Analytics atribuye ingresos por `Payment.paidAt`, nunca por la fecha de emisión de Invoice.
- Los enums y defaults se leen del schema vigente; este mapa no los redefine.
