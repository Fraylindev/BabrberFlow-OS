# Notificaciones transaccionales — C0: auditoría y propuesta de contrato

**Autorización posterior:** el propietario autorizó explícitamente C1 con las decisiones siguientes. [Contrato C1 implementado/en revisión](NOTIFICACIONES_C1_CONTRATO.md). Las menciones a «C1 no autorizado» de este registro describen el cierre documental de C0 y quedan sustituidas por esa autorización; no habilita C2 ni activación C3.

Fecha: 2026-09-14. **C0 DOCUMENTAL ENTREGADO / DECISIONES D1–D10 FIJADAS POR EL PROPIETARIO.** C1 no iniciado ni autorizado por esta selección; módulo no implementado. Las decisiones de §3 sustituyen las alternativas de la auditoría inicial. El diseño técnico de §4 sigue siendo propuesta para el futuro contrato C1, no una capacidad existente ni un contrato backend aprobado.

## 1. Autorización, objetivo y límites

El propietario autorizó exclusivamente C0 de Notificaciones según [roadmap §5](ROADMAP_POST_CMS_AUDITORIA.md). Configuración/CMS C1–C3, H5/fechas y WhatsApp C1–C3 permanecen **CERRADOS / APROBADOS**. Esta auditoría no modifica su código, contratos ni evidencia. Tampoco modifica Reservas, Clientes, Facturación, autenticación u otro módulo.

**Usuario y problema:** el cliente necesita conocer el registro y los cambios reales de su reserva; el personal necesita distinguir el estado de la reserva del resultado de comunicarlo. Hoy no existe correo transaccional de Booking. Resultado esperado de una entrega futura: comunicación trazable y recuperable sin invalidar una reserva persistida por fallo externo, con aislamiento por negocio y mínima información personal.

Alcance de producto fijado por la decisión posterior: cinco eventos de correo — creación, confirmación real, cancelación real, reprogramación con cambio de horario de una reserva activa y entrada real a COMPLETED. El cierre es puramente transaccional, sin cupones, descuentos ni invitación a re-reservar. NO_SHOW no notifica al cliente. Se excluyen recordatorios ejecutables, eventos financieros, campañas, bandeja interna, autoservicio B2C, nuevos estados Booking, editor CMS, WhatsApp Business API y envíos automáticos de WhatsApp. WhatsApp manual del personal queda diseñado para una segunda entrega. Se diseña la invalidación futura de recordatorios, sin implementarlos.

Método: inspección estática de fuentes, consumidores y modelo; consulta de documentación oficial del candidato Resend. Sin base de datos, migraciones, aplicaciones, envíos, credenciales, instalaciones ni QA funcional nuevo. Reglas: [gates](../quality/DELIVERY_GATES.md), [seguridad](../quality/SECURITY_STANDARD.md), [producto](../product/PRODUCT_STANDARD.md) y [Definition of Done](../quality/DEFINITION_OF_DONE.md).

## 2. Evidencia del árbol actual

Base: rama `ai/antigravity-qa`, HEAD `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`. El árbol ya contenía código, pruebas y documentación de WhatsApp sin publicar; se preservan como trabajo previo aislable. El roadmap contiene descripciones históricas anteriores a C2: para la acción pública actual manda el helper y su consumidor actual, no esa descripción legacy.

| Fuente inspeccionada | Hecho comprobado y consecuencia |
| --- | --- |
| [schema.prisma](../../apps/api/prisma/schema.prisma), `BookingStatus`, `Booking`, `Client` | Estados reales: `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`. No existe `IN_PROGRESS`. Booking nace `PENDING`, tiene `updatedAt`, pero no versión monotónica ni diario de eventos. Email/teléfono de Client son opcionales; Booking no guarda email ni preferencia de comunicación propios. |
| Schema, modelo `Notification` | Legacy con `organizationId`, `userId?`, `title`, `message`, `read`, `createdAt`; sin relaciones FK, destinatario externo, canal, intentos ni deduplicación. No es outbox ni historial de correo. Propuesta: no reutilizarlo ni migrarlo implícitamente. |
| [AppModule](../../apps/api/src/app.module.ts), [dependencias API](../../apps/api/package.json), búsqueda en API y web | No se encontró servicio/consumidor de Notification, integración Resend ni outbox/cola. `resend` de Equipo corresponde a invitaciones Clerk. No se presume Redis disponible. |
| [BookingsService](../../apps/api/src/bookings/bookings.service.ts), `create`, `updateStatus`, `reschedule` | Creación interna y pública comparten `createInTransaction`; cambios de estado/reprogramación usan transacciones. Repetir el mismo estado retorna la reserva sin cambio. No hay emisión durable de eventos. Actualizar por ID/tenant no aporta por sí solo una secuencia de eventos concurrentes. |
| [BookingsController](../../apps/api/src/bookings/bookings.controller.ts) | Tenant autenticado; BARBER resuelto desde su vínculo Professional y limitado a reservas propias. OWNER/ADMIN/RECEPTIONIST pueden reprogramar. No ampliar permisos al introducir comunicaciones. |
| [PublicBookingService](../../apps/api/src/public-booking/public-booking.service.ts), `findOrCreateClient` | Busca Client por teléfono y/o correo en el tenant. Al reutilizar un cliente activo no actualiza email; al reactivarlo solo cambia `isActive`. Un `clientEmail` aportado puede diferir del email finalmente persistido o no quedar guardado. No usar ambos como si fueran equivalentes. |
| [DTO público](../../apps/api/src/public-booking/dto/create-public-booking.dto.ts), [normalización](../../apps/api/src/clients/client-normalization.util.ts) | `clientEmail` es opcional y valida formato, no posesión. La normalización del teléfono admite números locales y transforma `00` inicial en `+`; no acredita procedencia internacional explícita ni cuenta WhatsApp. |
| [whatsapp-link.ts](../../apps/web/lib/whatsapp-link.ts) | Destino público: teléfono publicado del negocio. Rechaza caracteres fuera de `+`, dígitos ASCII, espacios, paréntesis, puntos y guiones; quita separadores y exige `^\+[1-9][0-9]{6,14}$`. Dominio fijo, mensaje genérico fijo. No admite texto arbitrario. |
| [Dashboard Reservas](../../apps/web/app/dashboard/bookings/page.tsx), `handleStatusChange` | Actualiza estado y presenta éxito; no existe pregunta ni enlace personal → cliente. Las mutaciones devuelven IDs/horarios/estado, sin contacto ni comprobante de transición. El listado incluye Client email/phone, filtrado por tenant y por agenda propia para BARBER. |

### Eventos fijados sobre operaciones existentes

| Cambio persistido | Correo de la primera entrega futura | WhatsApp manual: diseño para segunda entrega |
| --- | --- | --- |
| Creación interna o pública → `PENDING` | «Reserva registrada», nunca «confirmada» | Fuera del primer botón; este se propone para cambios de estado |
| `PENDING → CONFIRMED` | Confirmación | OWNER/ADMIN/RECEPTIONIST; BARBER solo propia |
| `CANCELLED → CONFIRMED` | Nueva confirmación de reactivación, evento distinto | Solo OWNER/ADMIN/RECEPTIONIST |
| `PENDING/CONFIRMED → CANCELLED` | Cancelación | Solo OWNER/ADMIN/RECEPTIONIST; BARBER no puede cancelar hoy |
| `CANCELLED → PENDING` | Sin correo; invalida cancelación pendiente. No es creación nueva | Sin botón en este alcance |
| Horario modificado en reserva `PENDING/CONFIRMED` | Reprogramación con nueva fecha/hora; invalida mensajes anteriores incompatibles | Sin botón de reprogramación |
| `CONFIRMED → COMPLETED` | Cierre transaccional; solo después de la transición real y del fin del servicio | Sin botón de completado |
| Petición de estado sin transición, reprogramación sin cambio de horario, rollback o `NO_SHOW` | Sin evento nuevo al cliente; NO_SHOW invalida mensajes pendientes incompatibles | Sin botón en este alcance |

Precisión de auditoría: se interpreta «reserva activa» como `PENDING/CONFIRMED`, sin crear enum. La ruta actual de reprogramación rechaza explícitamente CANCELLED; no debe tomarse eso como elegibilidad de notificación para todos los demás estados. El futuro evento exige estado activo y diferencia real de horario (`startTime` o `endTime`); cambiar solo profesional/servicio sin modificar horario no genera este evento. No se cambia el comportamiento actual de Reservas en esta entrega documental. `COMPLETED` procede hoy de CONFIRMED para los roles permitidos (BARBER propio incluido), con control servidor de `endTime`; repetir COMPLETED no vuelve a notificar y no implica cobro.

## 3. Decisiones fijadas por el propietario

La selección posterior fija A en D1 y D3–D10, con las precisiones de cada apartado; D2 conserva A y añade reprogramación y completado. No quedan alternativas de canal, permisos o preferencias pendientes de selección. Falta la identidad real del remitente antes de activar C3 y la autorización separada de la siguiente etapa.

### D1 — Canales y orden

**A fijada — Correo primero:** primera entrega funcional con correo automático, outbox e historial mínimo; WhatsApp manual del personal queda explícitamente para una segunda entrega. D3 queda fijado como diseño, sin ejecución actual. El clic manual futuro no apaga ni reintenta el correo.

Correo: el servidor procesa el evento automáticamente después del commit, sin clic humano. WhatsApp: el personal abre `wa.me` con Client.phone y texto prellenado y decide enviar dentro de WhatsApp. Es una segunda superficie del mecanismo manual ya aprobado; no requiere Business API, plantillas aprobadas por Meta ni prueba de entrega automatizada. La cola de correo no procesa WhatsApp.

### D2 — Cobertura de eventos y reactivación

**A fijada, ampliada expresamente a cinco eventos:** creación, entrada real a CONFIRMED, entrada real a CANCELLED, reprogramación con cambio de horario de reserva activa y entrada real a COMPLETED. `CANCELLED → PENDING` invalida cancelaciones pendientes, pero no manda correo de reactivación. Una cancelación ya enviada no se retira del buzón. Una reprogramación posterior elegible sí tiene su evento propio.

Completado solo comunica «Tu reserva fue completada, gracias por visitarnos», sin cupones, descuentos, invitación a re-reservar ni marketing/campañas. NO_SHOW no genera notificación al cliente. No se incluyen recordatorios, cobros ni una transición `IN_PROGRESS`.

### D3 — WhatsApp manual del personal (diseño fijado para segunda entrega)

Las cuatro filas quedan fijadas en A; no se implementan ahora:

| Decisión | A fijada |
| --- | --- |
| D3-roles | OWNER/ADMIN/RECEPTIONIST en reservas del tenant; BARBER solo confirmación propia |
| D3-transiciones | Confirmación y cancelación de la tabla, respetando permisos reales; sin reprogramación ni completado |
| D3-teléfono | Client.phone persistido que cumpla [D2-A de WhatsApp aprobado](WHATSAPP_C1_CONTRATO.md) al momento de preparar el enlace; `+` explícito en ese valor, sin inferir país |
| D3-datos | Nombre del negocio, servicio, fecha/hora de inicio en hora del negocio y estado real; sin nombre del cliente ni profesional |

**Límite de D3-teléfono A:** una cadena guardada con `+` pudo proceder de `00` normalizado por Clientes. No podemos demostrar cómo se escribió originalmente; la decisión acepta el valor persistido elegible. No convierte números locales por país supuesto ni cambia ahora la normalización de Clientes. Número ausente, extensión, letras, salto de línea, `+` duplicado, primer dígito cero o longitud inválida: sin enlace. La elegibilidad de formato no prueba que exista una cuenta WhatsApp.

**Flujo propuesto:** después de un cambio persistido elegible, mostrar «¿Notificar al cliente por WhatsApp?» con acciones «Ahora no» y «Revisar mensaje». Preparar datos actuales con autorización backend y comprobar el evento/estado; presentar destinatario y texto al personal autorizado. El enlace final «Abrir WhatsApp» abre una nueva pestaña solo con un clic explícito. Explicación: «Abrirás WhatsApp con este mensaje. Revísalo y envíalo allí». No abrir durante el `await` de la mutación ni afirmar «enviado» al hacer clic. Si la reserva cambió, retirar la propuesta anterior y pedir revisar la actual.

Ejemplos de plantilla, no datos de prueba ni mensaje enviado:

- Confirmación: «{negocio}: tu reserva de {servicio} para {fecha}, {hora} (hora del negocio), está confirmada».
- Cancelación: «{negocio}: tu reserva de {servicio} para {fecha}, {hora} (hora del negocio), fue cancelada».

Destino siempre Client.phone del Booking autorizado, nunca teléfono del negocio, query libre ni contacto de otro tenant. Mensaje sin email, notas, motivos privados, pagos, IDs internos, enlaces de acceso ni nombre del cliente. Se permite servicio/fecha/hora por autorización explícita del propietario para esta comunicación del personal; esos datos salen en una URL a WhatsApp y pueden quedar en el navegador. No copiar URL ni cuerpo a logs, AuditLog o analítica. Codificar texto y mantener dominio fijo `https://wa.me/`.

Reutilización: conservar intactos helper y consumidores públicos aprobados. En una futura entrega autorizada, tomar su patrón de validación/enlace para una utilidad de la nueva superficie, con contrato separado de texto; no pasarle un teléfono de cliente al helper actual esperando que cambie el mensaje. Edición del mensaje dentro de WhatsApp; editor libre en Kortek queda fuera.

Loading al preparar; acción deshabilitada durante mutación; sin teléfono: «No hay un teléfono internacional válido para abrir WhatsApp»; error recuperable: «El cambio quedó guardado. No pudimos preparar el mensaje»; bloqueo del navegador conserva la reserva y enlace para reintento, sin prometer detectar el envío. Limpiar destinatario/texto al cambiar usuario, organización, rol, reserva o visita, incluidos A → B → A y efectos tardíos. Teclado, foco, anuncio de pestaña nueva, móvil 375 px y escritorio forman parte del QA futuro.

### D4 — Proveedor y remitente de correo

**A fijada — Resend y remitente central controlado por Kortek:** dirección técnica y dominio verificados, operados fuera de CMS. Nombre visible identifica al negocio mediante D5; un buzón central atendido recibe respuestas. Sin remitentes por tenant ni otro proveedor en esta entrega.

El propietario aportará la dirección `From` y el dominio reales antes de activar el canal en C3. No se verificó ninguna cuenta, dominio ni dirección autorizada; queda también concretar el buzón `Reply-To` del remitente central, sin inventar direcciones. Esta información pendiente es un gate de activación C3, no motivo para volver a solicitarla ahora ni para reabrir D4. Sin verificación no se activa el canal. `Organization.email` no prueba titularidad ni autorización de envío y `Client.email` nunca es remitente. Sin CC/BCC por defecto ni credenciales en CMS/frontend.

Resend requiere dominio propio verificado mediante SPF/DKIM; se documenta DMARC como control adicional. Es capacidad del proveedor, no configuración existente de Kortek. [Documentación oficial de dominios](https://resend.com/docs/dashboard/domains/introduction), consultada 2026-09-14.

### D5 — Variables, fuente del negocio y plantillas

| Decisión | A fijada |
| --- | --- |
| D5-variables | Nombre del negocio, etiqueta del evento/estado, servicio y fecha/hora de inicio; reprogramación usa la nueva fecha/hora. Sin nombre del profesional ni datos personales adicionales |
| D5-negocio | Organization.name como identidad operativa consistente para reservas internas/públicas; sin snapshot ni borrador CMS |
| D5-plantillas | Cinco textos fijos, versionados por despliegue del módulo; sin editor tenant |

Cinco textos base de contrato, todavía sin plantillas implementadas:

| Evento | Texto transaccional |
| --- | --- |
| Creación | «{negocio}: tu reserva de {servicio} para {fecha}, {hora} (hora del negocio), quedó registrada y está pendiente de confirmación». |
| Confirmación | «{negocio}: tu reserva de {servicio} para {fecha}, {hora} (hora del negocio), está confirmada». |
| Cancelación | «{negocio}: tu reserva de {servicio} para {fecha}, {hora} (hora del negocio), fue cancelada». |
| Reprogramación | «{negocio}: tu reserva de {servicio} fue reprogramada para {nuevaFecha}, {nuevaHora} (hora del negocio)». No afirma confirmación si sigue PENDING. |
| Completado | «{negocio}: tu reserva fue completada, gracias por visitarnos». Sin cupones, descuentos ni invitación a re-reservar. |

`nuevaFecha/nuevaHora` proceden del horario persistido después de reprogramar, no del DTO sin confirmar ni de la agenda anterior. No se requiere mostrar horario anterior. Completado no necesita servicio/fecha en su cuerpo y no acredita pago. La elección de variables es una allowlist máxima, no una obligación de incluirlas todas.

Fuentes de servicio/fecha: Booking.serviceId → Service.name, Booking.startTime y Organization.timeZone del mismo tenant. No se altera H5 ni se usa la zona del navegador. Conservar snapshot mínimo y versión al preparar el intento; validar vigencia antes de enviar (§4). Renderizar HTML escapado y alternativa texto; rechazar variables desconocidas, HTML arbitrario e inyección de cabeceras. Asunto genérico por evento sin nombre del cliente ni servicio.

Fuera de allowlist: Client.name/email/phone en cuerpo, nombre del profesional, Client.notes, notas/bloqueos del profesional, UUID internos, User/Membership, importes, facturas, pagos, secretos y links de reclamación. El email solo se usa como destinatario privado. Retirar el mini-sitio no borra reservas ni implica su cancelación; los textos usan Organization.name sin depender de publicación CMS.

### D6 — Destinatario, ausencia y discrepancia de email

**D6-fuente A fijada:** destinatario exclusivamente Client.email persistido, normalizado y válido, dentro del tenant. Para creación pública, si el email aportado difiere del persistido o se omite y existe un correo histórico no corroborado, registrar omisión segura; no revelar ese correo ni usarlo silenciosamente. Si el cliente nuevo queda guardado con el email aportado, es elegible sujeto a D7. Para eventos posteriores, usar el contacto corroborado para esa reserva; una creación omitida no se vuelve elegible sola por confirmar/cancelar/reprogramar/completar. Reservas internas requieren revisión del email por el personal antes de habilitar contacto. Esta corroboración es metadato propuesto de Notificaciones, todavía inexistente; no prueba posesión del buzón. Nunca vincula identidades por coincidencia de email.

No depender de User.email, cuenta CUSTOMER ni Clerk; no enviar a dos destinatarios por duda; contacto cambiado después del evento invalida intentos pendientes hasta nueva revisión. Formato válido no garantiza posesión: los textos mínimos limitan exposición accidental; C1 debe contemplar límites de abuso distribuido en altas públicas para evitar convertirlas en spam.

**D6-ausencia A fijada:** omisión silenciosa para el cliente, éxito de reserva normal sin promesa de correo; motivo seguro en historial interno. Nunca bloquear reserva ni abrir WhatsApp como sustitución automática. No afirmar cobertura del 100%.

### D7 — Preferencia/consentimiento

**A fijada — Opt-in explícito:** preferencia de comunicaciones de esa reserva, sin premarcar, con versión del texto y fecha/origen. El aviso cubre los cinco eventos transaccionales de D2, sin marketing. En interno, el personal registra la elección declarada del cliente; no puede presumirla por tener email. Datos históricos sin elección: no enviar. Retirada detiene trabajos pendientes. Requiere contrato aditivo propio; no hay ese campo hoy. No inferir permiso desde CMS, tener email o crear cuenta.

D7 aplica a correo automático. Para WhatsApp manual la decisión de abrir corresponde al personal autorizado tras revisar destinatario; no inscribe al cliente en correo ni automatiza campañas. Si el cliente manifestó que no desea ese contacto, la propuesta es no ofrecerlo. Un centro de preferencias B2C queda fuera; el contrato futuro debe permitir al personal autorizado registrar una retirada sin crear ese módulo.

### D8 — Permisos de administración e historial (no heredados de CMS)

| Operación | A fijada |
| --- | --- |
| Remitente/dominio/secretos | Operación técnica de plataforma fuera del dashboard; OWNER solicita/autoriza identidad del tenant |
| Plantillas | Regla A conservada para una eventual autorización de editor: OWNER edita/activa; ADMIN solo preview. Inactiva en esta entrega por D5-A: cinco textos fijos, sin editor |
| Historial correo | OWNER/ADMIN tenant; RECEPTIONIST resumen por reserva; BARBER sin historial |
| Forzar reintento elegible | OWNER/ADMIN |
| Registrar/revocar preferencia declarada | OWNER/ADMIN/RECEPTIONIST tenant; BARBER sin edición |

Con plantillas fijas ningún rol tenant las edita. Lectura mínima: evento, reserva autorizada, canal, fecha, estado, número de intentos, motivo seguro y destinatario enmascarado; sin cuerpo completo, email/URL crudos ni respuesta externa. La vista no confirma lectura del cliente. Historial y reintentos siempre tenant-scoped con Membership revalidada; recurso ajeno responde como inexistente. Acceder a correo en otras pantallas no concede estos permisos.

Reintentar significa reactivar la misma intención elegible, no crear otro evento o poder enviar texto/destinatario libres. No se ofrece para enviado/aceptado, obsoleto, sin consentimiento, contacto cambiado, resultado incierto no reconciliado o fallo permanente. AuditLog registra actor, entidad y acción sin PII.

### D9 — Persistencia, fallos y operación

**Arquitectura A fijada — Outbox PostgreSQL + worker:** intención durable en la misma transacción que el evento Booking, worker con leases recuperables; sin Redis ni cola externa.

**Plazo A fijado:** hasta cinco intentos totales (inicial, 1 min, 5 min, 30 min y 2 h, con jitter y respeto de limitación externa), vencimiento máximo 24 h y siempre antes de que el mensaje sea obsoleto. Aplica §4. No reintentar indefinidamente ni trasladar error del proveedor al resultado de una reserva ya persistida.

### D10 — Obsolescencia y retención

**D10-vigencia A fijada:** suprimir correos pendientes incompatibles si cambió estado, horario, servicio, profesional incluido o contacto; registrar motivo. Un evento posterior elegible genera su propia intención. La reprogramación activa con cambio real de horario ahora genera su propio evento por D2: invalida los mensajes anteriores y encola un aviso nuevo con la nueva fecha/hora, sujeto a D6/D7. No se recalcula ni recicla la intención vieja. Un cambio sin evento elegible (por ejemplo, solo profesional sin cambio de horario) no genera sustituto.

**D10-retención A fijada:** purgar destinatario y payload privado 30 días después del cierre de la intención; conservar metadatos seguros e identidad de deduplicación mientras exista la reserva. No duplicar cuerpos en historial general.

## 4. Contrato conceptual propuesto para el futuro C1, con D1–D10 fijadas

### 4.1 Evento, intención y atomicidad

Proponer un diario de eventos y una intención de correo nuevos, separados de Notification legacy. Campos conceptuales (no schema aprobado): tenant, bookingId, eventId estable, secuencia monotónica de Booking, tipo de evento, estado anterior/nuevo, instante confirmado, versión de agenda/contacto, canal, revisión de plantilla/remitente, elegibilidad/preferencia, destinatario privado y snapshot mínimo, estado técnico, intentos, próximo intento, lease y correlación externa. FK compuestas deben impedir mezclar Booking/Client de otros tenants.

En backend privado el tenant viene del contexto autenticado. Para creación pública, el slug es un localizador no confiable; la transacción obtiene Organization mediante resolución pública ya existente. Worker usa exclusivamente el tenant de la intención validada y vuelve a consultar las relaciones tenant-scoped. No acepta tenant del payload del navegador como autoridad.

Propuesta: serializar mutaciones relevantes por Booking o usar comparación de versión y reintento; asignar secuencia y evento dentro de la transacción real. Creación pública/interna produce un único evento en el punto compartido, no un trigger por cada capa. Repetir una petición de estado sin transición real, repetir horario sin modificación y una transacción abortada no producen evento. Reprogramar sí puede generar evento manteniendo el mismo estado. Cada reprogramación efectiva y cada transición elegible reciben secuencia propia; una reactivación posterior recibe una secuencia distinta: no deduplicar solo por `bookingId + status`. No usar `updatedAt` como identificador suficiente.

Reserva y evento/intención se confirman juntos. Si falla esa escritura local, se revierte la transacción antes de declarar éxito; eso es fallo de persistencia, no de entrega externa. Después del commit, una caída de Resend, timeout, rebote o fallo del worker jamás revierte ni cancela Booking. El request no espera al proveedor. La falta de email/preferencia queda como intención omitida con motivo seguro, sin trabajo enviable.

### 4.2 Worker, deduplicación y resultados inciertos

1. Restricción única local conceptual `(organizationId, bookingId, eventSequence, channel)`; un reintento reutiliza identidad y plantilla/payload sellados. Guardar marcador durable aun después de purgar PII. La revisión de plantilla no permite duplicar el evento.
2. Adquirir lease atómicamente para un solo worker; intentos y lease tienen token de generación para rechazar escrituras tardías. Reiniciar un proceso recupera trabajos vencidos sin perder la intención. Revalidar estado/contacto/preferencia antes de preparar envío.
3. Sellar petición y clave estable antes de salir a red. Registrar `aceptado por proveedor` solo con respuesta/correlación comprobada. `Entregado` requiere señal específica; ni aceptación ni entrega significan leído. Resend distingue eventos de envío, entrega, rebote y queja. [Tipos de eventos oficiales](https://resend.com/docs/webhooks/event-types).
4. Timeouts después de enviar pueden significar aceptación externa desconocida. Marcar resultado incierto; reconciliar antes de repetir. Resend conserva claves de idempotencia 24 horas, por lo que se usan como defensa adicional con payload idéntico, nunca como única deduplicación. Fuera de esa ventana no reenviar a ciegas; detener para revisión si no puede probarse que no se envió. [Idempotencia oficial](https://resend.com/docs/dashboard/emails/idempotency-keys), consultada 2026-09-14.
5. Transitorios comprobados (indisponibilidad/limitación) siguen D9; dirección inválida, rebote permanente o queja detienen reintentos. Configuración inválida pausa el canal y alerta al operador. Reintento manual respeta vigencia, presupuesto y permisos; no reinicia la identidad.
6. Si C1 incorpora webhooks para reconciliar/entrega: firma y antigüedad verificadas, deduplicación por ID externo, correlación con mensaje/tenant local, cuerpo sin PII en logs y manejo de eventos repetidos/fuera de orden sin degradar un resultado terminal válido. No aceptar el tenant declarado por el webhook como autoridad.

Estados técnicos propuestos: pendiente, en procesamiento, esperando reintento, aceptado por proveedor, entregado, fallido definitivo, incierto, omitido y obsoleto. Son estados de notificación, **no estados nuevos de Booking**. Un fallo de comunicación se muestra separado de la reserva guardada.

Garantía honesta: una intención por evento y procesamiento recuperable con deduplicación local. No se promete exactamente un email físico ante todo fallo de red; la ambigüedad se detiene/reconcilia. WhatsApp no tiene confirmación de envío desde `wa.me` ni esta garantía: reabrir permite un segundo envío humano. Puede impedirse doble clic accidental, no garantizar deduplicación externa manual.

### 4.3 Mensajes obsoletos y recordatorios posteriores

Con D10, cada mutación relevante invalida intenciones incompatibles dentro del mismo orden serializado por reserva. El worker compara versión de agenda/estado/contacto justo antes de despachar. Confirmación en cola seguida de cancelación: suprimir confirmación; cancelación elegible tiene su propio evento. Cancelación seguida de reactivación: suprimir cancelación pendiente. Plantilla o destinatario cambiados no mutan una petición externa incierta.

Reprogramación activa: suprimir avisos con horario anterior y generar una nueva intención con horario persistido y secuencia nueva. Dos reprogramaciones sucesivas conservan solo la intención pendiente vigente; no reutilizar la clave del horario anterior. Completado: suprimir avisos operativos anteriores incompatibles y generar el cierre transaccional, que sigue siendo elegible mientras la reserva esté COMPLETED y cumpla contacto/preferencia/plazo. La validación del worker es específica por evento: no puede exigir reserva activa para todos, porque cancelación y completado requieren sus estados terminales respectivos. NO_SHOW no encola correo, pero sí invalida los pendientes incompatibles. No reenviar mensajes ya aceptados ni alterar peticiones inciertas.

**Recordatorios futuros, aunque fuera del primer envío:** clave por reserva + revisión de agenda + regla/instante del recordatorio. Reprogramar cancela trabajos de la revisión anterior y calcula el nuevo vencimiento desde startTime y zona del negocio; cancelar elimina su elegibilidad; no crear recordatorio vencido ni de reserva terminal. Propuesta futura A: recalcular automáticamente al reprogramar; alternativa B: cancelar y exigir nueva programación autorizada. Ambas deben cancelar al cambiar a CANCELLED y revisar estado/versión al ejecutar. No se construyen scheduler ni jobs ahora.

Carrera con la red: un mensaje ya despachado no puede retirarse. C1 debe establecer el orden entre permiso de despacho y mutaciones mediante coordinación por reserva; cambios confirmados antes de ese permiso invalidan el trabajo. Cambios posteriores pueden hacer antiguo un mensaje en tránsito; registrar ese límite y enviar solo el evento posterior permitido. No afirmar garantía absoluta de ausencia de datos antiguos en el buzón, ni mantener transacciones de negocio abiertas esperando entrega del proveedor.

### 4.4 Superficies propuestas y compatibilidad

No hay endpoints nuevos disponibles. Un C1 autorizado definiría rutas/DTO exactos conforme a las decisiones fijadas para lectura paginada del historial autorizado, reintento por intención y preferencias. Remitente fuera del dashboard y plantillas fijas: sin editor ni administración tenant de secretos. La preparación manual por Booking/evento pertenece exclusivamente a la segunda entrega D3. Su diseño acepta localizadores de reserva/evento, nunca teléfono/texto/tenant libres; salida mínima: elegibilidad, estado/evento vigente, contacto autorizado y variables permitidas. Preparar mensaje no cambia estado ni envía.

Respuestas públicas de reserva conservan su éxito e IDs/estado vigentes; no exponen outbox, remitente, email histórico ni errores del proveedor. Una preferencia o aviso nuevo exige contrato aditivo propio, sin cambiar los contratos CMS/H5. Las futuras integraciones en puntos de evento de Reservas requieren autorización C1 explícita; C0 no autoriza editar esos módulos.

Migración futura aditiva, sin backfill de envíos históricos y sin borrar Notification. Rollback: pausar workers/canal, conservar eventos/intenciones y deduplicación para reconciliar; no retirar tablas con trabajos pendientes. Ensayar restauración y rollback antes de activar. Secretos solo en entorno del servicio, sin edición desde roles tenant.

Riesgos principales y defensa: contacto incorrecto → corroboración y minimización; IDOR → consultas/FK tenant-scoped; doble trigger → secuencia y único local; caída entre commit/envío → outbox; caída después de aceptación → incierto/reconciliación; mensajes viejos → revisión/versiones; abuso público → límites distribuidos antes de activación; inyección → allowlist y escape; fuga por URL → datos D3 limitados, sin logs y revisión humana. No se reabre autenticación para resolverlos por inferencia.

## 5. Criterios de aceptación para una implementación posterior

Estos son pruebas exigibles, **no pruebas ejecutadas en C0**:

1. Crear pública/interna produce un solo evento `PENDING`; repetir estado o rollback no produce correo. Cubrir confirmación, cancelación y reactivación según D2. Reprogramar PENDING/CONFIRMED con horario distinto produce una intención con nueva fecha/hora; repetir el horario o cambiar solo profesional sin horario nuevo no la produce. Dos reprogramaciones sucesivas invalidan el aviso antiguo. Entrar a COMPLETED produce un único cierre; repetir COMPLETED, intentar completar antes de endTime o entrar a NO_SHOW no envía correo. Completado no incluye marketing ni acredita cobro.
2. Dos tenants, cada rol, BARBER propio/ajeno, vínculo ausente y Membership revocada: historial/configuración/reintento/preparación rechazan acceso indebido sin revelar existencia.
3. Email ausente, inválido, distinto al persistido, cliente reutilizado/reativado, preferencia ausente/retirada y contacto cambiado: resultado conforme D6/D7, reserva válida y sin fuga pública ni envío a destinatario inferido.
4. PostgreSQL real: rollback conjunto, dos mutaciones concurrentes, dos workers, lease vencido, doble trigger y reinicio tras commit. Unicidad y secuencia deben sostenerse fuera de mocks.
5. Proveedor controlado: timeout antes/después de aceptación, 429/5xx, rechazo permanente, webhook repetido/fuera de orden, reconciliación y ventana de idempotencia vencida. Nunca cancelar Booking ni reenviar inciertos a ciegas.
6. Confirmar/cancelar/reprogramar/completar/NO_SHOW/contacto cambiado durante cola o preparación: suprimir incompatibles según D10-A, sin recalcular intención vieja; crear nueva solo para evento elegible. Probar frontera de despacho y elegibilidad de cancelación/completado en estado terminal. Recordatorios quedan sin implementación y con contrato de invalidación documentado.
7. Escape de variables, cabeceras, ausencia de PII en logs/AuditLog/respuestas; horarios iguales aunque cambie zona del navegador; no tocar H5 para resolver formato.
8. Para la segunda entrega D3, no esta primera: matriz A de transiciones/roles, teléfono válido/local/`00` histórico según D3-teléfono A, servicio/fecha correctos, destinatario cliente, bloqueo del navegador, doble clic, ninguna repetición del PATCH al reabrir y ninguna afirmación de enviado. QA real desktop/375 px, teclado/foco/consola y salida física a WhatsApp con datos controlados. No añadir botones de reprogramación/completado por la ampliación del correo.
9. Historial vacío/loading/error/reintento/éxito, correo omitido/aceptado/entregado/fallido/obsoleto distinguibles, caché y efectos tardíos aislados por visita/tenant/rol. Sin métricas ficticias.
10. Build/tipos/lint/tests y gates de migración aplicables, QA real, auditoría y aprobación backend antes de frontend; aprobación final del propietario antes del cierre del módulo.

## 6. Registro de selección y siguiente gate

Selección explícita registrada: **D1-A; D2-A + reprogramación + COMPLETED; D3-A en las cuatro filas solo para segunda entrega; D4-A; D5-A en las tres filas con cinco textos; D6-A en fuente/ausencia; D7-A; D8-A en las cinco filas; D9-A en arquitectura/plazo; D10-A en vigencia/retención.** NO_SHOW sin notificación al cliente. La política de recordatorios de §4.3 queda para su futura entrega; la invalidación sigue siendo requisito documentado.

El propietario entregará From/dominio antes de activar C3; la activación exige su verificación y concretar Reply-To. No se solicita ese dato anticipadamente. La elección de D1–D10 no acredita dominio ni autoriza por sí sola C1. Siguiente gate: autorización explícita de C1 con estas decisiones como entrada; backend validado y aprobado antes de frontend. No se vuelve a pedir elegir decisiones ya fijadas.

## 7. Evidencia documental y estado de entrega

C0 entrega este documento; solo se añaden referencias/estado de Notificaciones a los controles generales. No cambia BACKEND_CHANGES porque no hay contrato vigente nuevo. Trabajo previo de WhatsApp y demás módulos preservado; sin staging, commit, push ni despliegue. HEAD permanece en la base indicada; no se afirma sincronización remota nueva.

Validación de C0: revisión completa del documento, matriz de solicitud cubierta por §§2–6, enlaces locales comprobados, `git diff --check` y comparación de huellas SHA-256 de los archivos preexistentes. Solo se permiten diferencias en los controles generales declarados. No se ejecutaron builds ni suites: corresponde el gate documental. `rg` no pudo iniciarse en este entorno; se usó `Get-ChildItem`/`Select-String`. Una lectura inicial usó un nombre de archivo de normalización inexistente; se corrigió a `client-normalization.util.ts` y se inspeccionó su contenido real.

Actualización documental posterior: decisiones D1–D10 fijadas, cinco eventos y cinco textos incorporados, criterios de elegibilidad/obsolescencia y QA futuro sincronizados; controles generales actualizados. Se verifican enlaces, diff y preservación por huellas de los archivos ajenos al alcance documental. Sin pruebas runtime nuevas.

Entrega de auditoría con decisiones registradas; módulo **no implementado / no aprobado**. Falta autorización C1 y, antes de activar C3, identidad real del remitente verificada; no quedan decisiones D1–D10 por elegir ni código parcial aplicado.
