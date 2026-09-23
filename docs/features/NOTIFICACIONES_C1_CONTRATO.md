# Notificaciones — C1: contrato backend

Actualizado: 2026-09-15. **CERRADO / APROBADO por el propietario sobre la base c7d43ad03a65a900a930a1a0d69dd258b8516a1e.** Autorización explícita del propietario: implementar C1 con D1–D10 de [C0](NOTIFICACIONES_C0_AUDITORIA.md), incluida reprogramación y COMPLETED. Este documento define el contrato implementado y su evidencia backend en §10. La aprobación explícita posterior autoriza frontend C2 según D1–D10; no autoriza activación C3.

## 1. Alcance y compatibilidad

Correo automático transaccional para clientes de reservas internas/públicas. Resend con remitente central, cinco textos fijos, opt-in por reserva, historial privado y outbox PostgreSQL con worker. Sin Redis, campañas, recordatorios ejecutables, editor, frontend C2 ni activación C3. D3-A queda exclusivamente diseñado en C0 para la segunda entrega; no hay rutas ni código nuevo de WhatsApp.

CMS, H5/fechas, WhatsApp y sus contratos/evidencias se preservan. Las únicas integraciones de dominio necesarias son captura atómica en creación/estado/reprogramación de Booking y revocación de corroboración al cambiar Client.email. No se modifican las transiciones ni los permisos de Reservas, la normalización de Clientes, cuentas o facturación. COMPLETED no significa cobrado.

Base inspeccionada: `ai/antigravity-qa`, HEAD `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`; trabajo previo sin publicar aislable. Schema, BookingsService, PublicBookingService, ClientsService, controladores/DTOs, guards, migraciones y pruebas existentes son las fuentes ejecutables. La autorización actual sustituye las frases históricas «C1 no autorizado» del C0 y controles.

## 2. Eventos y orden

Una secuencia monotónica por Booking se incrementa en cada cambio relevante real, dentro de la transacción que guarda el cambio. No usar `updatedAt`, estado o plantilla como identidad. Creación se captura una sola vez en el punto compartido `createInTransaction`; el wrapper público no duplica eventos. Un rollback elimina conjuntamente reserva/cambio, evento e intención.

| Operación real | Evento de correo | Vigencia al despachar |
| --- | --- | --- |
| Nueva reserva PENDING | CREATED | Sigue PENDING y misma revisión |
| PENDING/CANCELLED → CONFIRMED | CONFIRMED | Sigue CONFIRMED y misma revisión |
| PENDING/CONFIRMED → CANCELLED | CANCELLED | Sigue CANCELLED y misma revisión |
| PENDING/CONFIRMED cambia startTime o endTime | RESCHEDULED | Sigue en el estado de origen activo y misma revisión; nuevo horario persistido |
| CONFIRMED → COMPLETED después de endTime | COMPLETED | Sigue COMPLETED y misma revisión |
| CANCELLED → PENDING; entrada a NO_SHOW | Ninguno | Invalida pendientes anteriores |
| Solo cambia servicio/profesional | Ninguno si no cambia horario | Invalida pendientes anteriores |
| Estado/horario repetido sin otros cambios; rollback | Ninguno | No duplica ni consume secuencia por un no-op |

La elegibilidad de RESCHEDULED no amplía qué puede reprogramar Reservas. Un cambio a un estado terminal distinto de cancelación/completado no genera correo. Cada reactivación o segunda reprogramación real tiene identidad nueva. Una modificación de servicio que cambia duración/endTime sí constituye cambio de horario para una reserva activa.

Las mutaciones relevantes y el permiso de despacho se serializan por reserva. Contacto se coordina además por Client: orden global de adquisición Client → Booking → intención; las lecturas preliminares son localizadores y se revalidan bajo bloqueo. Mantener el orden de locks de integridad de agenda existente; revisar/reintentar conflictos de serialización sin repetir operaciones externas. Pruebas PostgreSQL deben demostrar que no se pierde una transición concurrente ni se conceden dos permisos para la misma intención.

## 3. Consentimiento y destinatario

Versión fija del aviso: `booking-email-v1`. Texto: «Quiero recibir por correo avisos sobre el registro, la confirmación, la cancelación, la reprogramación y el cierre de esta reserva. Puedo retirar esta preferencia a través del negocio. No incluye publicidad».

Alta pública: extensión opcional `emailNotifications: { optedIn: boolean, noticeVersion: "booking-email-v1" }`. Ausente equivale a no consentimiento. No se acepta fecha, origen, destinatario alternativo, tenant ni texto libre dentro de esta extensión. Validar objeto anidado y rechazar null/campos extra. Servidor registra fecha y origen PUBLIC. El éxito/respuesta pública sigue intacto; no agrega email histórico, estado del correo, outbox ni motivo de omisión. La ampliación no requiere modificar los campos de fechas ni CMS.

Alta interna: extensión opcional `emailNotifications: { optedIn, noticeVersion, reviewedEmail }`; solo OWNER/ADMIN/RECEPTIONIST pueden registrarla. `reviewedEmail` debe coincidir con el correo normalizado persistido; confirma revisión de contacto, no posesión. BARBER conserva creación propia sin capacidad de declarar preferencia. Sin extensión se crea intención omitida.

Para público se compara exclusivamente el email aportado en esa petición con Client.email finalmente persistido en el tenant. Ausencia, email inválido o discrepancia producen OMITTED, sin enviar ni revelar el histórico. Esto aplica a Client nuevo, reutilizado o reactivado. Tener User.email, Clerk, CUSTOMER o una cuenta creada no concede elegibilidad. La elección explícita y la corroboración quedan ligadas a esa reserva y revisión del contacto.

Cambiar Client.email, incluido A → B → A, revoca la corroboración anterior e invalida trabajos pendientes en la misma transacción. No basta comparar cadenas al ejecutar. Revisión posterior explícita permite eventos futuros; nunca revive eventos OMITTED/OBSOLETE ni crea correo por sí sola. Retirada de opt-in incrementa revisión e invalida pendientes; opt-in posterior no reenvía historia. La preferencia se guarda con versión optimista para evitar que una respuesta vieja vuelva a habilitar contacto retirado.

## 4. API privada objetivo y permisos

Todas las rutas usan B2bAuthGuard + RolesGuard, Membership local revalidada, tenant del contexto y `Cache-Control: no-store`. UUIDs son localizadores, nunca autoridad. CUSTOMER/anon sin acceso privado. Datos ajenos e inexistentes devuelven el mismo 404; rol sin operación obtiene 403 independientemente del recurso.

| Ruta | Roles | Entrada / respuesta |
| --- | --- | --- |
| GET /notifications | OWNER, ADMIN | `page` entero ≥1; `limit` 1–50, default 20; `bookingId` UUID opcional. `{ data, pagination: { page, limit, total, totalPages } }` |
| GET /bookings/:id/notifications | OWNER, ADMIN, RECEPTIONIST | Mismos límites; resumen solo de la reserva autorizada; reserva existente sin eventos devuelve lista vacía |
| GET /bookings/:id/email-preference | OWNER, ADMIN, RECEPTIONIST | `{ version, optedIn, noticeVersion, recordedAt, source, contactReviewed }`, sin correo crudo |
| PATCH /bookings/:id/email-preference | OWNER, ADMIN, RECEPTIONIST | `{ expectedVersion, optedIn, noticeVersion, reviewedEmail? }`; opt-in true exige revisión coincidente; false no exige email. Respuesta misma proyección |
| POST /notifications/:id/retry | OWNER, ADMIN | Cuerpo vacío validado; mismo evento/clave/payload; 200 proyección o 409 seguro si ya no es elegible |

BARBER no tiene historial, reintento ni edición de preferencia, aunque la reserva sea propia y tenga perfil válido. No se ofrece preparación WhatsApp, endpoint de configuración de remitente, preview ni editor de plantillas; por D4/D5/D8 son inexistentes en C1 para todos los roles. La operación técnica de plataforma queda fuera del dashboard.

Fila de historial máxima: `{ id, bookingId, event, channel: "EMAIL", createdAt, status, attempts, reason, recipientMasked, canRetry }`. RECEPTIONIST recibe el mismo resumen limitado por reserva, nunca búsqueda global. No hay cuerpo, plantilla renderizada, email completo, respuesta externa, providerId, clave de idempotencia ni datos de otras entidades. Máscara fija que no revela dominio ni longitud: `***@***` si se retuvo destinatario; null si no existe o fue purgado. `reason` es catálogo cerrado, sin texto del proveedor.

Errores: 400 «Revisa los datos de la solicitud»; 401 sesión inválida/revocada; 403 operación no permitida; 404 «Reserva no encontrada»/«Notificación no encontrada» según ruta; 409 «La preferencia cambió. Vuelve a consultarla» o «Este aviso ya no admite reintento»; 503 «No pudimos consultar los avisos. Inténtalo de nuevo». No exponer Prisma, constraints, stack ni respuestas Resend. AuditLog registra actor/tenant/ID/acción de preferencia y reintento sin contenido ni contacto.

## 5. Persistencia objetivo

Persistencia aditiva implementada en `schema.prisma`: `Client.emailRevision`, `BookingEmailPreference`, `BookingEmailEvent`, `EmailOutbox`, `EmailWebhookReceipt`, `EmailAbuseBucket` y `EmailChannelControl`. Migraciones 22 `20260914120000_booking_email_outbox` y 23 `20260914120100_email_channel_control`, sin backfill de envíos ni reutilización/borrado de Notification legacy. Aplicadas solo al PostgreSQL aislado C1. El ensayo con datos de las 21 migraciones previas, actualización 21 → 23 → 24, preservación de datos y backup/restore está completado y documentado en §10, incluida recuperación de intenciones despachadas. La migración 24 `20260915120000_email_template_version` conserva explícitamente la versión de plantilla.

- Revisión de correo del Client: contador incrementado únicamente ante cambio real del email normalizado. Permite invalidar A → B → A.
- Agregado por reserva: tenant/Booking con FK compuesta, secuencia, versión de preferencia, opt-in false por defecto, versión/fecha/origen del aviso y revisión de contacto corroborada. Sin copia permanente de email de revisión.
- Evento durable: tenant/Booking/secuencia únicos, tipo de cambio, estado/horario/revisión relevantes. No contiene email, cuerpo ni notas.
- Intención outbox: FK compuesta a evento, canal EMAIL, unicidad `(organizationId, bookingId, eventSequence, channel)`; evento y estado capturados, intentos 0–5, vencimiento, próximo intento, lease/generación, primer despacho, resultado/correlación, cierre. PII/payload nullable en campos separados purgables.
- Snapshot privado sellado: destinatario normalizado, asunto genérico, texto/HTML, From/Reply-To/revisión central e identidad de plantilla. Antes de primer despacho se prepara desde relaciones tenant-scoped, comparando revisión de reserva/contacto/preferencia. Después de sellado es inmutable, incluidos reintentos.
- Recibo webhook: ID externo único, correlación local, tipo e instante; no conserva cuerpo, direcciones ni cabeceras. Acuse solo después de commit.
- Control de abuso distribuido PostgreSQL con claves HMAC de destino y periodo; sin email en claves/logs. Se cuenta el permiso inicial de envío, no reservas rechazadas ni reintentos del mismo mensaje. El límite omite correo y conserva reserva.

Estados: PENDING, PROCESSING, RETRY, ACCEPTED, DELIVERED, FAILED, UNCERTAIN, OMITTED, OBSOLETE. Nunca se agregan estados a Booking. ACCEPTED acredita aceptación del proveedor; DELIVERED exige señal específica; ninguno acredita lectura. UNCERTAIN no habilita reintento manual. Motivos internos fijos separan ausencia/consentimiento/contacto, obsolescencia, plazo/presupuesto, rechazo permanente, configuración y resultado incierto.

## 6. Worker, proveedor y frontera de despacho

El canal inicia desactivado. El proceso worker no se ejecuta desde una petición de Booking y no hace llamadas a Resend dentro de una transacción de negocio. Sin configuración central verificada no sale a red. C3 requiere From/dominio reales del propietario, Reply-To atendido, validación de dominio y autorización de activación; no se solicitan ahora.

1. Selección atómica con `FOR UPDATE SKIP LOCKED`; lease con token/generación y vencimiento. Revalidación autoritativa Client/Booking/preferencia antes de conceder permiso de despacho. Compare-and-set de generación en todas las escrituras de resultado; proceso antiguo no pisa al nuevo.
2. Intención incompatible sin despacho: OBSOLETE. Omisión de origen no se vuelve elegible. Cancelación y completado permanecen elegibles en sus respectivos estados terminales. Dos reprogramaciones dejan solo la revisión nueva enviable.
3. Sellar payload y clave `notification/<intentId>` y persistir permiso/contador antes de llamar al adaptador. Cambios comprometidos antes del permiso bloquean ese intento; cambios posteriores no pueden retirar un mensaje en tránsito. No cambiar destinatario/payload de una petición incierta.
4. Caída antes del permiso: recuperar lease sin consumir envío. Caída después del permiso, aun antes de llamar al adaptador: UNCERTAIN conservador. Nunca asumir ausencia de aceptación por falta de resultado local. Nuevo worker reconcilia; no reenvía ciegamente.
5. Hasta cinco intentos: inicial y esperas 1 min, 5 min, 30 min, 2 h desde fallo anterior, jitter acotado 0–10%, respetando Retry-After. Límite absoluto 24 h desde intención; intentos manuales consumen el mismo presupuesto y no ignoran Retry-After. Caducidad se revisa antes de despachar, no solo al seleccionar.
6. Fallo comprobado antes de transmisión/429 explícito permite RETRY; rechazo permanente detiene; credencial/dominio inválido pausa canal y señala error seguro de operación. HTTP 5xx y timeout tras invocar transporte son potencialmente ambiguos y pasan a UNCERTAIN para reconciliación. No cancelar/modificar Booking.
7. Correlación comprobada permite consulta por providerId. Si no se conoce y sigue vigente, conciliación puede usar exactamente el payload/clave sellados dentro de la ventana de idempotencia y del presupuesto; esta operación debe contabilizarse como intento de red. Fuera de ventana, fuera de vigencia o sin payload idéntico no hay POST: queda para revisión. No inventar una API de búsqueda por clave.
8. Webhook verifica firma sobre bytes originales, antigüedad (5 min), formato/límite y correlación contra providerId local. ID externo único evita replay. Evento desconocido no establece tenant ni destinatario. Repetidos/fuera de orden no degradan DELIVERED a ACCEPTED; rebote/queja son terminales y detienen reintentos. Correlación aún no disponible recibe respuesta recuperable para que el proveedor repita, sin perder evento por acuse prematuro.

Las cinco plantillas y sus asuntos son fijos de despliegue. Organization.name identifica negocio; Service.name y Booking.startTime se formatean con Organization.timeZone y locale es-DO en backend. RESCHEDULED usa exclusivamente el horario nuevo confirmado. COMPLETED: «{negocio}: tu reserva fue completada, gracias por visitarnos». Sin servicio/fecha necesarios, pagos, descuentos o invitación a reservar. Texto y HTML escapado; variables extra/control de cabecera rechazados; nunca cliente/profesional/notas/importe/IDs/links en cuerpo. Remitente central validado; C3 admite el From explícito con nombre visible aportado por el propietario. Si la configuración contiene solo dirección, conserva el nombre visible saneado del negocio. Nunca usa Organization.email. Snapshot y reintentos conservan el From sellado.

Referencia de proveedor consultada 2026-09-14: [envío](https://resend.com/docs/api-reference/emails/send-email), [idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys), [consulta por ID](https://resend.com/docs/api-reference/emails/retrieve-email), [firma webhook](https://resend.com/docs/webhooks/verify-webhooks-requests). Resend conserva la clave 24 h; nuestra identidad durable sobrevive esa ventana. No se promete exactamente un correo físico ante toda ambigüedad de red.

## 7. Retención, migración y rollback

Cerrar intención fija `closedAt`. A los 30 días se elimina destinatario/payload privado y cualquier copia de cabecera/cuerpo; nunca purgar filas abiertas como si estuvieran cerradas. Los inciertos se cierran al agotar plazo para revisión, conservando estado UNCERTAIN y sin habilitar un envío futuro. Metadatos y clave local permanecen mientras exista Booking. No duplicar cuerpos en AuditLog/historial. Purga idempotente y acotada; probar frontera exacta de 30 días y segunda ejecución.

Ensayar desde 21 migraciones y desde cero en PostgreSQL aislado; preservar reservas/clientes/CMS/finanzas y Notification legacy. No habilitar preferencia histórica ni encolar envíos por migración. Validar FKs tenant, únicos/checks/índices, drift Prisma, backup/restore, rollback y roles runtime/migrador separados. No aplicar a base habitual ni productiva durante C1.

Rollback operativo: cerrar canal/parar nuevos despachos; esperar o reconciliar leases; conservar agregado/eventos/outbox/recibos. No eliminar tablas ni retroceder secuencias. Un binario anterior que no escribe eventos necesita mantener canal cerrado; antes de reactivar con versión nueva se suprimen pendientes afectados durante esa ventana. Backup/restore no debe revivir trabajos ya aceptados: reconciliar contra proveedor antes de habilitar. Migración inversa destructiva no es estrategia de rollback.

## 8. Seguridad y límites de abuso

Amenazas: IDOR (FK/consultas tenant); escalamiento de BARBER (matriz backend); correo histórico incorrecto (corroboración por reserva); A → B → A (revisión); opt-in supuesto (default false); spam público (presupuesto de destino y tenant en PostgreSQL); doble envío (único/lease/clave); fuga (proyecciones/escape/no logs); webhook falso (firma/correlación local); mensaje viejo (secuencia/permiso serializado).

Contrato de limitación inicial: máximo 3 nuevos mensajes por destino/tenant/hora y 100 por tenant/hora, contadores atómicos compartidos entre réplicas. Reserva válida no falla al alcanzar el límite; intención OMITTED/ABUSE_LIMIT. Secretos HMAC/Resend/webhook solo en entorno. Caducidad y limpieza de contadores no afecta deduplicación de intenciones. Estos límites son protección técnica inicial, no precios/cuotas comerciales. Verificar que reintentos no duplican el conteo y que varias reservas simultáneas no superan límite.

## 9. Matriz de aceptación y evidencia requerida

También se incluye §5.3 de C0 porque D6/D7 dependen de ella, aunque la solicitud enumera las demás secciones backend. Cada vector debe vincularse a prueba ejecutable y resultado real; una prueba de funciones no acredita PostgreSQL ni HTTP.

| C0 | Pruebas obligatorias C1 | Evidencia necesaria |
| --- | --- | --- |
| §5.1 | Creación interna/pública; estados reales/repetidos; reactivación; RESCHEDULED PENDING/CONFIRMED, start/end, mismo horario, solo profesional; dos reprogramaciones; COMPLETED único después de fin; antes de fin rechazado; NO_SHOW; rollback | Dominio + integración servicios/HTTP + PostgreSQL |
| §5.2 | Dos tenants; OWNER/ADMIN/RECEPTIONIST/BARBER/CUSTOMER; propio/ajeno/vínculo ausente; Membership revocada; historial/configuración/reintento/preferencia; rutas excluidas inexistentes | HTTP con guards reales y BD |
| §5.3 | Email ausente/inválido/distinto; Client nuevo/reutilizado/reactivado; opt-in ausente/retirado; revisión de contacto A→B→A; sin fugas/identidades inferidas | DTO + servicio + HTTP/BD |
| §5.4 | Rollback; mutaciones concurrentes; dos workers; lease vencido; resultado de generación anterior; doble trigger; reinicio tras commit | PostgreSQL real, sin mocks de unicidad/locks |
| §5.5 | Fallo antes de transmisión, timeout después de aceptación, 429/5xx, rechazo, webhook repetido/fuera de orden, reconciliación y ventana vencida | Adaptador controlado + estado durable; sin envío real |
| §5.6 | Cancelación/confirmación/reprogramación/completado/NO_SHOW/contacto/retirada durante cola/preparación; terminales elegibles; frontera de despacho | BD y barreras deterministas de concurrencia |
| §5.7 | Escape/headers/campos extra, PII en respuestas/logs/auditoría, zona del negocio independiente del proceso, completado sin marketing/pago | Unitarias y capturas HTTP/logs controladas |
| §5.9 | Historial vacío/paginado, motivos/estados diferenciados, reintento/idempotencia/error, no-store, aislamiento por rol/tenant | Backend HTTP; loading/caché/efectos por visita implementados y en revisión en [C2](NOTIFICACIONES_C2_FRONTEND.md) |
| §5.10 | Tipos/lint/unitarias/build, Prisma/migración/drift/integridad, pruebas funcionales API y rollback/restore | Comandos exit 0 y resultados registrados; aprobación explícita posterior |
| D9/D10 | Presupuesto 5/24h, Retry-After/jitter, limitación distribuida, purga 30 días/deduplicación durable | Dominio + PostgreSQL + adaptador |

Recordatorios futuros: identidad Booking + revisión de agenda + regla/instante. Reprogramar cancela revisión anterior y calcula vencimiento nuevo; cancelar/terminal invalida. No ejecutar vencidos. No hay scheduler/jobs ni botones WhatsApp de reprogramación/completado en C1.

## 10. Evidencia de entrega C1 — 2026-09-15

Evidencia backend entregada el 2026-09-15 y **aprobada explícitamente por el propietario** sobre la base indicada en la cabecera. Esa aprobación autorizó C2; no cierra el módulo ni habilita C3, que requiere remitente/dominio reales verificados y autorización de activación.

### Resultado y trazabilidad

- AppModule registra historial/preferencias/reintento y webhook. Creación interna/pública, estado y reprogramación capturan eventos en la transacción de Booking. No cambian las respuestas existentes ni las reglas de agenda.
- Worker PostgreSQL independiente, cinco plantillas fijas, Resend controlado, consentimiento/corroboración, límites compartidos, leases, reconciliación y purga implementados. Canal desactivado por defecto; no hubo envío real.
- `EmailOutbox.templateVersion` persiste la versión del renderizador en el mismo commit que sella contenido y permiso de despacho. No es `noticeVersion`. El sobre conserva el From/Reply-To exacto de ese despacho; los reintentos conservan esa identidad de remitente y no leen la configuración nueva para reconstruirla. La versión de plantilla es metadato no privado y permanece tras purgar el sobre. Snapshots despachados sin versión no se retransmiten; quedan pendientes de conciliación segura o terminan sin reenvío. La migración no inventa versiones históricas.
- `serializeEnvelope` fija el orden de claves antes del POST: JSONB reordena propiedades, por lo que comparar objetos no bastaba para acreditar igualdad de bytes. La prueba de cinco intentos verifica clave y cuerpo idénticos.

| C0 | Evidencia ejecutable de backend |
| --- | --- |
| §5.1 | `notifications-http.e2e-spec.ts`: creación pública/interna, estado repetido, reactivación, reprogramación CONFIRMED y PENDING, mismo horario, cambio exclusivo de profesional, COMPLETED propio después del fin/único y rechazo temprano, NO_SHOW sin correo. `notifications-producer.e2e-spec.ts`: rollback y dos reprogramaciones concurrentes. |
| §5.2 | HTTP con B2bAuthGuard/RolesGuard/Membership reales, verificador externo controlado: todos los roles, BARBER propio/ajeno/sin vínculo, tenant ajeno, Membership ausente/revocada, acceso a historial/preferencia/reintento y allowlists. |
| §5.3 | HTTP/DTO y PostgreSQL: opt-in ausente/retirado, email público nuevo/reutilizado/reactivado/omitido/discrepante; A → B → A invalida revisión; proyección pública conserva contrato. |
| §5.4 | PostgreSQL: doble trigger, rollback conjunto, dos mutaciones, workers simultáneos, leases vencidos y respuesta de generación anterior. Recuperación desde dump con intenciones despachadas, detallada abajo. |
| §5.5 | `resend.adapter.spec.ts` y PostgreSQL: timeout/429/5xx/rechazo, firma sobre bytes, webhook duplicado/fuera de orden, reconciliación y expiración incierta. Proveedor controlado, sin red real de correo. |
| §5.6 | Política, productor y HTTP: supresión de revisiones incompatibles, contacto y consentimiento; cancelación/completado terminales enviables; barreras antes y después del permiso de despacho. |
| §5.7 | `notification-policy.spec.ts`: escape, cabeceras, allowlist y zona explícita; HTTP: respuestas y AuditLog sin email, error de almacenamiento con PII sintética no aparece en respuesta ni capturas de logger/consola. COMPLETED sin marketing ni afirmación de pago. |
| §5.9 | HTTP: historial vacío/paginado/no-store, roles, estados/motivos seguros, reintento sobre misma intención, errores y preferencias optimistas. Loading y efectos tardíos visuales corresponden a C2. |
| §5.10 | Tipos/lint/build/unitarias, E2E real, Prisma/drift/migración/restore y revisión de alcance. Aprobación del propietario pendiente. |
| D9/D10 | Política y PostgreSQL: 5 intentos/24 h, Retry-After/jitter, cuatro workers respetan 3 mensajes por destino/hora; purga privada a 30 días idempotente con identidad durable. |

### Validaciones realizadas

Cada resultado listado terminó con exit code 0. No sumar repeticiones parciales a la regresión completa.

| Comando / verificación | Resultado |
| --- | --- |
| `pnpm --filter api test --runInBand` | 640 aprobadas, 11 omitidas preexistentes; 52 suites aprobadas, 2 omitidas |
| `pnpm --filter api test:e2e --runInBand` | 227 aprobadas, 17 suites; posterior caso HTTP añadido verificado en repetición específica |
| `pnpm --filter api test:e2e --runInBand notifications-http.e2e-spec.ts` | 22 aprobadas, incluido el caso adicional de PENDING/profesional |
| `notifications-producer.e2e-spec.ts` | 24 aprobadas: incluye versión sellada, cambio de configuración y ausencia de procedencia |
| `notification-policy.spec.ts` + `resend.adapter.spec.ts` | 91 aprobadas, incluidas en unitarias completas |
| `RUN_POSTGRES_INTEGRATION=1` + `booking-concurrency.integration.spec.ts` | 9 aprobadas en PostgreSQL aislado; limpieza de fixtures actualizada para FKs nuevas y CmsPage existente |
| `pnpm --filter api exec tsc --noEmit` | Exit 0 |
| `pnpm --filter api lint` | Exit 0 después de corregir aserción de fecha, sin desactivar reglas |
| `pnpm --filter api build` | Exit 0 |
| Prisma validate/generate/migrate deploy | Exit 0; 24 migraciones en QA aislado |
| Prisma migrate diff datasource → datamodel `--exit-code` | Exit 0, `No difference detected` sobre base restaurada con schema final |
| CLI `node apps/api/dist/notifications/email-worker.cli.js --once`, canal false | Exit 0 en base aislada restaurada |
| `git diff --check` y huellas SHA-256 previas | Exit 0; trabajo previo ajeno preservado |

Las suites generales provocan fallos sintéticos de auditoría/servicios para comprobar comportamiento existente y pueden imprimir esos errores esperados. No se cuentan como fallos reales del gate ni como prueba de privacidad de todo el sistema. La captura de privacidad indicada arriba pertenece específicamente a Notificaciones.

### Migración, integridad y recuperación

Tres migraciones aditivas: `20260914120000_booking_email_outbox`, `20260914120100_email_channel_control`, `20260915120000_email_template_version`. No se aplicaron a la base habitual ni productiva. No se modificaron las 21 migraciones anteriores ni se creó backfill de correo o preferencias históricas.

PostgreSQL 16 exclusivo `kortek-notifications-c1-test`, loopback `127.0.0.1:55439`, sin montajes de datos habituales. Rol de prueba `kortek_notify_runner` sin SUPERUSER/CREATEDB/CREATEROLE. Las credenciales del fixture se suministran solo mediante entorno; no pertenecen a este contrato. Para E2E usar base `kortek_notifications_test` y las protecciones `E2E_PRIMARY_DATABASE_NAME`/`E2E_PRIMARY_DATABASE_USER` del harness.

Separación comprobada en la base restaurada: `kortek_notify_runtime` recibe acceso DML y uso del schema, sin propiedad de tablas ni privilegios de creación. Una prueba transaccional confirma rechazo de ALTER TABLE (`DDL_DENIED`); el CLI desactivado ejecuta su ciclo con ese rol y termina con exit 0. El rol propietario `kortek_notify_runner` se reserva para migraciones del fixture. Esta configuración de QA no modifica credenciales ni permisos habituales.

Ensayo 21 → 23 y luego 24 en `kortek_notifications_upgrade_test`, con cliente/reserva completada/factura/pago/Notification legacy controlados. La primera restauración a `kortek_notifications_restore_test` conservó el hash combinado Booking/Client/Invoice/Payment/Notification/CmsPage `ef7d75e69a61417e3f7846884756b316`, sin backfill.

El ensayo final añade tres reservas independientes: correo aceptado, incierto sin correlación y un incierto con ID conocido. `pg_dump -Fc` y `pg_restore --exit-on-error` hacia una base vacía `kortek_notifications_recovery_test` terminaron correctamente. El [fixture ejecutable de recuperación](evidence/notifications-c1/recovery.cjs), usando el worker compilado y proveedor controlado, comprobó:

1. Canal desactivado: cero envíos/consultas al proveedor.
2. Correo aceptado: mantiene identidad e intento; no se reenvía.
3. Incierto con correlación: consulta GET y pasa a DELIVERED.
4. Incierto sin correlación dentro de ventana: concilia con la misma clave y el snapshot exacto; no crea otra intención.

Ejecutar el fixture desde la raíz, con `DATABASE_URL` del destino aislado: `node docs/features/evidence/notifications-c1/recovery.cjs seed` antes del dump y `... verify` después de restaurar. El script valida host/puerto/nombre de base y requiere los datos legacy del ensayo. No es una herramienta de recuperación productiva. Los scripts auxiliares del ensayo inicial permanecen en `.tmp/notifications-upgrade/`.

Un backup anterior a un envío no puede demostrar por sí solo qué ocurrió externamente después. La recuperación operativa exige cerrar canal y reconciliar antes de reactivarlo; fuera de la ventana de idempotencia no se reenvía un incierto a ciegas. El rollback conserva tablas, claves y secuencias.

### Operación técnica prevista y siguiente gate

Tras build, desde `apps/api`: `node --env-file=.env dist/notifications/email-worker.cli.js`; `--once` ejecuta un ciclo. SIGINT/SIGTERM dejan terminar la operación en curso y cierran Prisma. Se registran códigos seguros, nunca sobres/correos/errores crudos.

Variables: `NOTIFICATIONS_EMAIL_ENABLED` (solo `true` activa), `NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED`, `NOTIFICATIONS_EMAIL_FROM`, `NOTIFICATIONS_EMAIL_REPLY_TO`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` y `NOTIFICATIONS_ABUSE_SECRET` (mínimo 32 caracteres). From/dominio/Reply-To reales y verificación pertenecen a C3. No se cambiaron variables del entorno habitual.

`EmailChannelControl` contiene la fila `EMAIL`; fallos de configuración pausan todos los workers. Reanudar requiere operación técnica de plataforma después de corregir configuración y revisar inciertos; no hay endpoint tenant. Desactivar canal y detener procesos evita permisos nuevos; despachos ya autorizados requieren conciliación. Webhook firmado `POST /notifications/resend/webhook`: 204 solo tras recibo durable, 401 firma inválida, 503 sin correlación/configuración o ante fallo de almacenamiento.

Git: rama `ai/antigravity-qa`, HEAD `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`; cambios C1 locales sin staging, commit ni push. Trabajo previo ajeno preservado según `.tmp/notifications-c1-before.json`. No hay despliegue ni aprobación inferida. El propietario aprobó explícitamente C1 y autorizó C2. La implementación y evidencia frontend se documentan en [NOTIFICACIONES_C2_FRONTEND.md](NOTIFICACIONES_C2_FRONTEND.md); activación C3 continúa sin autorizar.
