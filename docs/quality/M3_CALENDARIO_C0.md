# M3 — Calendario operativo y reagendar: C0

Fecha: 2026-10-10, República Dominicana. **C0 DOCUMENTAL APROBADO POR EL PROPIETARIO.** D1–D7 = A y D8 FIJADA. Sin implementación; C1/C2/C3 requieren autorización independiente.

## 1. Base, autorización y fuentes

La base es `origin/ai/antigravity-qa` tras `git fetch origin`, verificada en **523d993cfa0c797f356c224d5cc026d6c9ad4c7b**; no la rama local atrasada. Producción y QA permanecen intactos. No tocar `ai/reserva-invitado-ci`.

El checkout principal estaba en `ai/reserva-invitado-ci`, HEAD `de3a062aba70157da5fbf1b569a73aecb0d04087`, con `docs/Playbook Kortek Booking_ del 29 de septiembre al MVP.md` ajeno sin versionar. Se preservó. Se prepara únicamente este documento en un worktree aislado, HEAD separado en la base remota, sin mover ramas locales. Fetch actualiza referencias de seguimiento locales, no publica cambios. Toda publicación futura requiere autorización independiente y la rama `ai/antigravity-qa`.

**Alcance histórico de la elaboración inicial:** `docs/quality/M3_CALENDARIO_C0.md`. Prohibidos código, commit, push, despliegue, flags, variables, consultas o escrituras en bases reales, operaciones de QA/producción y cambios de proveedores. El plan de pruebas futuro no concede permiso para ejecutarlo.

**Cierre documental autorizado — 2026-10-10:** el propietario aprueba C0, fija D1–D7 en A y D8, y autoriza un único commit/push a `origin/ai/antigravity-qa` con este archivo y las referencias necesarias en `docs/README.md`, `PROJECT_MASTER.md` y `CHANGELOG.md`. Esta autorización supera únicamente la prohibición inicial de publicación documental; no autoriza implementación, despliegue, flags, variables, bases reales ni tocar `ai/reserva-invitado-ci` o entornos en ejecución.

Las tres fuentes solicitadas están localizadas y leídas en `docs/quality/` de la base: [decisiones vinculantes](DECISIONES_PROPIETARIO_2026_09_29.md), [auditoría técnica y roadmap](AUDITORIA_HALLAZGOS_ROADMAP_MVP_2026_09_29.md) y [auditoría UX y microcopy](AUDITORIA_DISENO_UX_MARKETING_2026_09_29.md). Se contrastaron con [entrada documental](../README.md), [estado](../../PROJECT_MASTER.md), [PRD](../product/PRD.md), [flujos](../product/APP_FLOWS.md), [horario/zona C1](../features/HORARIO_ZONA_C1_CONTRATO.md), [retiro B2C](../features/RESERVA_INVITADO_C0_C1.md), [contratos](../../BACKEND_CHANGES.md), [historial](../../CHANGELOG.md), código y schema reales. Aplicados [gates](DELIVERY_GATES.md), [seguridad](SECURITY_STANDARD.md), [DoD](DEFINITION_OF_DONE.md), estándares/patrones de producto y skills `kortek-delivery` y `kortek-product-ui`.

**Límite de evidencia:** el informe original `reporte_de_testing_y_hallazgos_t_cnicos_cto.md` no se localizó en la base. Sus observaciones se consultan mediante la auditoría técnica, sin afirmar lectura del original. El propietario confirmó en esta tarea que ya no conserva las dos capturas originales. Se utiliza su análisis preservado en la auditoría UX: exceso de cuadrícula de horas en imagen 1 y referencia compacta en imagen 2. La hora transitoria 2:24 no prueba disponibilidad ni defecto. No se sustituyen por capturas posteriores de M1 ni se declara inspección visual nueva. No se ejecutó QA funcional, visual, SQL ni medición de M3.

**Contradicciones históricas:** las auditorías del 29-sep y párrafos inferiores de PRD/flujos aún mencionan B2C y producción cerrada. La enmienda 07-oct retira M2; la orden actual confirma reserva pública ya en producción. Prevalecen estas instrucciones. No se reescribe historia ni se presenta el estado operativo de 523d993 como verificación viva actual.

## 2. Decisiones FIJADAS y alcance

| Fuente | Decisión vinculante |
| --- | --- |
| Propietario 5 | **FIJADA.** Una única política/formateador de fechas y horas para todo el proyecto, legible en español y zona confirmada del negocio. Relativo auxiliar; acciones con fecha absoluta inequívoca. |
| Propietario 6 | **FIJADA.** Calendario para el día y control compacto de hora dentro o junto a él; solo disponibilidad real, sin campo libre ni cuadrícula extensa. Reagendar compara actual → nueva y tiene un botón principal. |
| Propietario 13 | **FIJADA.** Recomendaciones C0-B de auditoría técnica adoptadas: día/semana, móvil agenda diaria, datos por rol vigente y Profesional solo propio, zona confirmada y fecha absoluta en acciones. Su dependencia B2C fue superada por enmienda; no se reabre. |
| Evolución de decisión 6 | **FIJADA.** Enmienda 17: semana de siete días y acceso compacto al mes para elegir fecha, días sin disponibilidad deshabilitados; con botones y más de doce horas, filtros Todos/Mañana/Tarde/Noche sin franjas vacías. M1 posterior documenta select compacto aprobado: conservar esa composición accesible, sin restaurar rejilla extensa. El mes del selector no es calendario operativo mensual. |
| Orden actual | **FIJADA.** Escritorio semana y opción día; móvil agenda vertical diaria; lista accesible equivalente, detalle y reagendar; sin arrastrar y soltar. Migraciones → API → web con API anterior corriendo contra esquema nuevo. |
| Enmienda 07-oct | **FIJADA.** Invitado sin cuenta; Client operativo conservado. Sin claim, perfil, historial o política B2C como dependencia. |

Entra lectura temporal, detalle autorizado, cambio de fecha/hora desde calendario/lista, disponibilidad interna y formato transversal. Fuera: mes complejo, recurrencia, sincronización Outlook/Teams, calendario externo, drag and drop, alta rápida desde un hueco, nueva política B2C, ampliación de permisos de Profesional, cambios financieros, edición de horario/zona desde M3, notificaciones nuevas y dependencias de UI por comodidad. Outlook/Teams describe organización temporal, no una integración.

## 3. Usuario, problema y resultado

OWNER, ADMIN y RECEPTIONIST necesitan localizar citas y coordinar al equipo en el tiempo sin descargar todo el historial. Profesional necesita consultar exclusivamente su agenda. Hoy Reservas ofrece lista/filtros, sin vista semanal temporal. El modal de reagendar deja introducir hora libre y descubre conflictos al guardar, sin ofrecer previamente opciones disponibles.

Resultado: encontrar una cita por día/semana, abrir detalle y, si el rol lo permite, seleccionar una nueva hora real, revisar actual → nueva, conservar el estado y comprobar el resultado. El invitado solicita cambios al negocio; el personal los opera. Client identifica a la persona atendida sin cuenta B2C.

## 4. Roles, permisos y privacidad

| Actor | Calendario, lista y detalle | Reagendar M3 |
| --- | --- | --- |
| OWNER / ADMIN | Todas las reservas del tenant activo | Sí, bajo elegibilidad D3 |
| RECEPTIONIST | Todas las reservas del tenant activo | Sí; sin editar horarios, zona, roles o configuración |
| BARBER, rótulo Profesional | Solo Professional vinculado al User en ese tenant | **No**, según backend vigente; acciones de estado existentes conservan su propio contrato |
| Profesional sin vínculo | Agenda vacía con explicación; nunca agenda global | No |
| Visitante / CUSTOMER histórico | Sin acceso al panel ni detalle | No; solicita el cambio al negocio |

Tenant y actor se derivan del contexto autenticado/Membership autoritativa. No se admiten organizationId/rol/User libres para decidir alcance. Un ID ajeno o inaccesible responde 404 indistinguible de inexistente; sin sesión 401; rol sin permiso de operación 403 antes de revelar el recurso.

Tarjeta/lista/detalle mínimos: ID técnico de reserva, inicio/fin, estado textual, nombre operativo de Client, servicio y Profesional. Sin correo/teléfono, notas, vínculo User, contacto privado del Profesional, motivos de cierres ni datos financieros. Contacto se consulta en capacidades existentes de Clientes con permiso independiente. El nombre es PII necesaria para operación: no se publica, exporta ni registra en telemetría. Sin búsqueda de contactos nueva.

Respuestas privadas `Cache-Control: no-store`. Caché en memoria separada por tenant, User, rol, vínculo profesional, visita, rango y filtros. Al cambiar contexto o salir: desmontar detalle/selector, vaciar datos, cancelar consultas e ignorar respuestas tardías mediante identidad de visita, también A → B → A. Sin PII/borradores en URL, localStorage, consola, errores o AuditLog. Sin persistir el borrador fuera de la visita.

## 5. Experiencia, copy y estados

Desktop abre semana; día/lista conservan fecha y filtros. Móvil abre agenda diaria vertical y selector compacto. Hoy/anterior/siguiente mantienen contexto de negocio y anuncian rango. Inicio de semana recomendado en D1. Cada cita tiene horas, servicio, Profesional y estado con texto además de color; simultáneas se agrupan sin ocultar citas. Un hueco gráfico **no significa disponibilidad**. Horarios/cierres sirven de contexto de lectura, sin motivos ni edición.

Lista equivalente: mismos registros completos, rango, filtros, orden y acciones, encabezados diarios y nombres accesibles completos. Teclado y lector de pantalla operan lista/calendario/detalle; no se fuerzan siete columnas móviles. Una única superficie de detalle pasa a reagendar sin modales superpuestos. Escape/cierre devuelven foco a la cita o encabezado si salió del rango. Zoom 200 %, texto grande, movimiento reducido, inputs ≥16 px y objetivos táctiles 44 × 44 CSS px como objetivo de diseño, sujetos a comprobación real.

Flujo: cita → detalle revalidado → Cambiar fecha y hora → servicio/Profesional conservados bajo D4-A → consultar días/horas → seleccionar → revisar Actual → Nueva con fecha absoluta/año e inicio/fin, estado aparte → Guardar nueva fecha. Cambiar día borra la hora anterior; respuestas tardías no la restauran. Cancelar no escribe. Principal deshabilitado sin cambio válido y durante envío. Consultar slot no lo retiene. Tras éxito actualizar origen/destino, detalle y consumidores existentes; si sale del rango, explicar y ofrecer Ver nuevo día.

Copy adaptado de auditoría UX; fechas siguientes son ilustrativas:

| Contexto | Texto y recuperación |
| --- | --- |
| Encabezado | Calendario / Mi agenda; Hoy · Día · Semana · Ver lista |
| Vacío real | No hay reservas para este día. / No hay reservas esta semana. |
| Vacío filtrado | No hay reservas con estos filtros. · Limpiar filtros |
| Sin vínculo | Tu perfil profesional aún no está vinculado. Contacta a la administración del negocio. |
| Carga | Cargando agenda… / Consultando horarios…; estructura estable, sin afirmar vacío |
| Error agenda | No pudimos cargar la agenda. · Reintentar |
| Detalle inaccesible | Esta reserva ya no está disponible. · Volver a la agenda |
| Reagendar | Cambiar fecha y hora; Actual: 30 de septiembre de 2026, 2:30 p. m. → Nueva: 1 de octubre de 2026, 3:00 p. m.; estado separado |
| Sin horas | No hay horarios para este día. · Elegir otro día |
| Error horas | No pudimos cargar los horarios. · Reintentar, conservando fecha |
| Sin horario confirmado | El negocio debe confirmar su horario antes de ofrecer nuevas horas. · Volver a la agenda |
| Conflicto | Ese horario no está disponible. Elige otro. |
| Edición obsoleta | La reserva cambió mientras la editabas. Revisa sus datos antes de continuar. · Actualizar reserva |
| Principal / envío | Guardar nueva fecha / Guardando… |
| Éxito | La fecha de la reserva se actualizó. + horario persistente; Ver nuevo día si salió del rango |
| Timeout/5xx | No pudimos comprobar si el cambio se guardó. Actualiza la reserva antes de intentarlo de nuevo. |

Errores persistentes asociados al control y anunciados. Éxito solo tras respuesta o lectura autoritativa; sin replay automático incierto. Confirmada solo para CONFIRMED; mover no transforma PENDING. No prometer correo/WhatsApp enviado ni cobro. Identificadores IANA/UTC/offset permanecen en capa técnica; UI dice hora del negocio cuando ayuda.

## 6. Auditoría de código y reutilización

| Evidencia en 523d993 | Consecuencia |
| --- | --- |
| [Controller](../../apps/api/src/bookings/bookings.controller.ts) / [QueryBookingsDto](../../apps/api/src/bookings/dto/query-bookings.dto.ts): GET /bookings, from/to/status opcionales, BARBER propio por vínculo | Reutilizar permisos. No hay lectura calendario/detalle general ni filtro profesional administrativo en ese contrato |
| [Service](../../apps/api/src/bookings/bookings.service.ts): startTime >= from y endTime <= to; lista con contacto Client e invoice | Contención omite citas que cruzan límites. Nueva lectura por intersección/proyección mínima; no alterar semántica legacy |
| PATCH /bookings/:id: tres roles administrativos, [DTO](../../apps/api/src/bookings/dto/reschedule-booking.dto.ts) opcional startTime/professionalId/serviceId | Sin precondición de edición expuesta; no ampliar BARBER ni romper body antiguo |
| reschedule rechaza CANCELLED/pasado, no excluye explícitamente COMPLETED/NO_SHOW; UI no ofrece esas acciones | Contradicción UI/backend de elegibilidad. D3 resuelve comando nuevo; legado queda riesgo explícito |
| [Modal de Reservas](../../apps/web/app/dashboard/bookings/page.tsx) / [BusinessDateTimeField](../../apps/web/components/booking/BusinessDateTimeField.tsx) | Hora libre sin slots internos; decisión 6 incompleta |
| [AvailabilityPicker](../../apps/web/components/booking/AvailabilityPicker.tsx) / [DateTimeStep](../../apps/web/app/[slug]/_components/DateTimeStep.tsx) | Reutilizar presentación accesible, no transporte público para operación B2B |
| [Horario C1](../features/HORARIO_ZONA_C1_CONTRATO.md), [A2](../../apps/api/src/professionals/professional-availability.service.ts), [público](../../apps/api/src/public-booking/public-booking.service.ts) | Zona confirmada, intersección, cierres/bloqueos, ocupación, DST y locks existentes; no otro motor |
| [business-time.ts](../../apps/web/lib/business-time.ts) y wrappers web | Formateador web común ya existe: formatBusinessTime/fullText y formatBusinessClock; no helper local nuevo |
| [Plantillas correo](../../apps/api/src/notifications/notification-templates.ts) | Intl separado: consolidación de plantillas de correo y demás consumidores API en fase 2 de D8, gate posterior propio; M3 no toca plantillas ni payloads sellados |
| [Prisma](../../apps/api/prisma/schema.prisma) | Booking.updatedAt, Organization.timeZone, BusinessSchedule.zoneConfirmed/state y exclusión ya existen; no tabla Calendar ni identidad cliente |

D8 **FIJADA:** decisión 5 en dos fases. **Fase 1, dentro de M3:** módulo puro compartido a partir de la política existente, compatible con builds API/web y con vectores de paridad; migración de las pantallas web del calendario, lista, detalle y reagendar. El inventario transversal (Reservas públicas, revisión/éxito, Facturación, Resumen/Analytics, Equipo/invitaciones, Horarios/A2, CMS/promociones y avisos/correos) no amplía esa migración de M3. **Fase 2, gate propio posterior:** consolidación de plantillas de correo y demás consumidores de la API. M3 **NO toca plantillas de correo ni payloads sellados**. Sin nuevo paquete/dependencia por comodidad. Conversión técnica y formatos ISO/iCalendar siguen separados de presentación; fecha civil no se interpreta en zona del navegador. Relativos usan día del negocio, revisión/correos fecha absoluta/año; zona inválida sin fallback al dispositivo. Eventos/payloads históricos sellados no se reconvierten ni reenvían.

## 7. Contrato propuesto aprobado en C0, no implementado

D1–D7 FIJADAS en A. D8 limita el formateador al módulo puro compartido con vectores de paridad y las pantallas web de calendario, lista, detalle y reagendar; plantillas de correo y demás consumidores API quedan para fase 2 en gate propio. M3 no modifica plantillas ni payloads sellados. Rutas nuevas B2B con Guards/proyecciones explícitas; no cambiar públicos ni GET/PATCH legacy. Registrar prefijo estático calendar antes de :id.

| Endpoint propuesto | Entrada DTO | Salida/permiso |
| --- | --- | --- |
| GET /bookings/calendar | CalendarQueryDto: from/to civiles obligatorios YYYY-MM-DD, to exclusivo; status?: BookingStatus; professionalId?: UUID; cursor?: opaco; limit?: entero 1–200, defecto100 | Cuatro roles internos recortados; CalendarPageDto |
| GET /bookings/:id | UUID ruta, sin tenant query | BookingCalendarDetailDto mínimo con updatedAt; 404 tenant/ownership |
| GET /bookings/:id/reschedule-availability-days | from/to civiles inclusivos, ≤31 días; servicio/Profesional derivados de cita bajo D4-A | Tres roles que reagendan; {bookingId,updatedAt,timeZone,from,to,availableDates:string[]} |
| GET /bookings/:id/reschedule-availability | date civil válida | Tres roles; {bookingId,updatedAt,timeZone,date,slots:[{startTime,endTime}]} |
| PATCH /bookings/:id/reschedule | CalendarRescheduleDto: startTime obligatorio ISO con Z/offset; expectedUpdatedAt obligatorio ISO exacto del detalle | Tres roles; {id,professionalId,serviceId,startTime,endTime,status,updatedAt}; conserva Client/estado/avisos |

CalendarPageDto: `{timeZone,from,to,rangeStart,rangeEnd,generatedAt,items,nextCursor}`. from/to civiles, extremos UTC ISO autoritativos. items: `{id,startTime,endTime,status,client:{name},professional:{id,name},service:{id,name},updatedAt}`. Detail conserva esa proyección autorizada. Sin contacto/notas/factura/Organization/identidad B2C; UUID internos solo para operación autenticada. Zona técnica no visible como identificador.

**Rango y consulta:** validación estricta de fecha, from < to, 1–7 días civiles; siete días no equivalen necesariamente a 168 horas. Servidor convierte límites reales del negocio. Predicado `organizationId = contexto AND startTime < rangeEnd AND endTime > rangeStart`, más ownership/filtros. Intervalos `[inicio,fin)`: una cita terminada al inicio o que empieza al extremo final queda fuera; una que cruza aparece una vez. Orden startTime/id; cursor vinculado a rango/filtros/tenant/alcance sin datos de contacto. Cambio de filtro reinicia cursor. Profesional no selecciona agenda ajena: filtro inaccesible 404; sin vínculo items vacío. Sin descarga de historial entero.

Paginación sin truncado silencioso: completar páginas antes de presentar agenda completa, anunciar carga parcial, revalidar recursos antes de actuar. Deduplicar por id y refrescar rango al detectar cambio durante paginado; no prometer snapshot entre peticiones. C1 debe probar omisiones concurrentes y adoptar mecanismo más fuerte si no puede garantizar cobertura. generatedAt no reserva huecos. Lista/calendario comparten conjunto y filtros.

**Disponibilidad interna:** validar Booking/tenant/permiso antes de excluir **solo** esa cita. No admitir excludeBookingId libre en público. Profesional activo privado y negocio sin CMS publicado son válidos B2B; no reutilizar elegibilidad editorial anónima. Zona/semana confirmadas; sin confirmación permitir historia pero negar nuevas opciones sin confirmar automáticamente. Validar servicio activo, duración completa en una franja/día, reglas globales/individuales, cierres/bloqueos y ocupación de todo estado salvo CANCELLED. Lecturas consistentes RepeatableRead; reloj servidor. Slots consultados no retienen ni sustituyen mutación final.

Cadencia D2-A: 30 minutos anclados a apertura global, más inicio actual y misma hora local actual en otro día **solo si válidos**; mantiene citas fuera de cuadrícula sin hora libre. Duración en minutos reales; horas inexistentes/repetidas no se ofrecen ni desplazan. Días y slots usan mismo cálculo. Se reenvía startTime autoritativo, sin reconstruirlo desde texto ni reloj del teléfono.

**Mutación propuesta:** endpoint nuevo para precondición/elegibilidad estrictas; PATCH legacy conserva body/semántica. Orden existente Organization → Client cuando aplique → Booking → Professional → disponibilidad/outbox. Releer bajo lock, comparar expectedUpdatedAt exacto, estado y recursos, recalcular fin, validar destino/candidato/reloj, disponibilidad y choque excluyendo propia cita. Conservar exclusión GiST y traducción segura. Fallo nunca libera origen. No basta consultar slots fuera de transacción.

Dos ediciones M3 con misma revisión: una gana, otra 409 sin sobrescribir. Edición legacy también altera updatedAt y debe invalidar revisión M3. Legado conserva riesgo de último escritor entre clientes antiguos: C1 debe probarlo/documentarlo durante ventana sin imponer incompatibilidad silenciosa. Repetir comando exitoso con revisión antigua no crea otro evento; no se promete idempotencia durable. Timeout exige leer detalle antes de nuevo intento; coincidencia del destino confirma estado observado, no autoría.

Precondición a verificar en C1: precisión/avance de updatedAt no pueden permitir que dos escrituras consecutivas compartan la misma revisión. Probar colisión temporal y escritores legacy/estados. Si el timestamp existente no basta, definir token opaco basado en estado persistido completo o revisión monotónica aditiva con compatibilidad de todos los escritores; revisar D5 y §9 antes de implementar, sin afirmar que updatedAt solo ya garantiza esa propiedad.

RESCHEDULED/outbox existentes dentro de la transacción, respetando opt-in/canal; sin nuevo evento, cambio financiero/contacto/preferencia, WhatsApp o reinicio worker. AuditLog recomendado fail-open según patrón, IDs/actor/acción/revisión solamente, sin PII ni motivos. La mutación no acredita entrega de correo.

| Respuesta propuesta | Semántica |
| --- | --- |
| 400 | DTO/rango/instante/cursor inválido, campos desconocidos o ausencia de cambio válido |
| 401/403 | Sesión ausente/revocada / operación no permitida |
| 404 | Reserva/Profesional inaccesible o inexistente, sin revelar otro tenant |
| 409 | Slot perdido, revisión obsoleta, estado/recursos/horario cambiados; sin escritura parcial |
| 429 | Límite y Retry-After, sin reintento masivo automático |
| 503 | Fallo de evaluación: no convertirlo en vacío exitoso |

C1 definirá códigos de dominio seguros si hacen falta para recuperar, sin asumir existentes ni mostrar Prisma/constraints.

## 8. Amenazas, abuso y regresión pública

| Riesgo | Mitigación y prueba |
| --- | --- |
| IDOR/agenda ajena | Tenant/ownership en consultas finales, vínculo servidor y 404 uniforme; IDs ajenos válidos |
| Escalamiento/sesión obsoleta | Guards/Membership actual; Profesional sin reagendar; revocación/rol cambiado con modal abierto |
| PII/caché | Proyección mínima/no-store, scope/visita separados, sin cuerpos/motivos en logs |
| Rangos/navegación abusivos | Calendario ≤7, selector ≤31, páginas ≤200, cancelación de consultas y presupuesto D6 |
| Slot obsoleto/doble edición | Revisión bajo lock, revalidación y exclusión; perdedor sin eventos y origen intacto |
| Hora/DST manipulados | Backend autoritativo aun en petición fabricada; sin confianza en UI/reloj cliente |
| Mutación/correo repetidos | Límite actor+tenant y outbox/opt-in vigentes; doble clic no duplica evento |
| Timeout | Incertidumbre explícita, lectura detalle, sin replay automático |

**Riesgo público ALTO si se altera código compartido:** BookingsService, A2, conversores/política global, ocupación, locks y productor son compartidos con POST /public/:slug/bookings, availability y availability-days, ya en producción por esta orden. La exclusión interna de cita no puede llegar al lector anónimo ni permitir sobreventa. Diferencias B2B de publicación nunca deben abrir un negocio público retirado/inactivo.

Añadir adaptador autenticado y reutilizar primitivas, conservando defaults, DTO/respuestas y cadencia públicos. Si se extrae cálculo, inventariar consumidores internos/públicos/A2/horarios/estados/reactivación/outbox y demostrar equivalencia antes/después: candidatos/minimos, 30 minutos, professionalId, instante autoritativo, no-store y límites distribuidos. Sin parámetro público de exclusión, cuenta B2C ni borrado de persistencia histórica.

Carreras PostgreSQL desechable: reagendar ↔ alta pública al mismo hueco, cierre/turno/bloqueo, archivo profesional, edición de estado y dos operadores. Un ganador cuando compiten por ocupación, sin eventos del perdedor; origen conservado al fallar. Preservar orden de locks, sin serializar todos los tenants. No relajar asserts, skips/retries ni reclasificar defecto como fixture. No consultar/probar producción en C0.

## 9. Modelo, migración y rollback

**Recomendación: ninguna migración funcional de datos.** Reutilizar Booking (IDs/tenant/inicio/fin/estado/updatedAt), Organization.timeZone, BusinessSchedule (confirmación/estado/días/franjas/cierres), disponibilidad individual, Client, Invoice/outbox. Calendario es proyección, no entidad nueva. Sin Calendar, User cliente, Membership CUSTOMER, backfill de identidades, reescritura de citas ni cambios de tipos de timestamps.

Posible DDL **solo aditivo de índices**, condicionado a C1/D7: medir `(organizationId,startTime,id)` y `(organizationId,professionalId,startTime,id)` frente a índices/GiST existentes. endTime puede quedar filtro. No afirmar mejora sin EXPLAIN/carga sintética. No tocar exclusión/tipos/nullabilidad/constraints usados por API anterior. Índices solos no requieren nuevos permisos DML; todo objeto nuevo exige ownership/ACL mínimos y matriz runtime actualizada.

**Orden real obligatorio: migraciones → API → web.** En primera ventana API/web anteriores siguen sobre esquema nuevo. C1 debe identificar SHA/imagen exactos del API desplegado bajo autorización futura: 523d993 es base de fuente, no prueba del binario productivo. Toda migración debe demostrar compatibilidad con ese binario y API base. Prohibidos quitar/renombrar tablas/columnas, cambiar tipos o endurecer constraints incompatibles, nuevos campos requeridos sin defaults compatibles. Sin DDL, primer paso no aplicable; no invertir orden para acomodar código.

**Bases de compatibilidad declaradas por el propietario para el cierre C0 (sin evidencia operativa capturada en esta tarea):** API de producción release `8e1501e`, imagen `sha256:1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775`; API de QA release `b318ca5`, imagen `sha256:8ba1b6c8a45391433998deeae1111d2d96c6cbf84932a7e9972cb6cf90e95eec`; web de producción `8e1501e`; web de QA `523d993`. Estas son las bases para los ensayos futuros de API anterior contra esquema nuevo y parejas API/web; no prueban compatibilidad ni sustituyen la comprobación de artefactos en el gate de ejecución autorizado. No se consultaron ni alteraron producción o QA.

Ensayo futuro desechable: API anterior/esquema base → API anterior/esquema aditivo → API nueva/esquema aditivo con web anterior → API/web nuevas → rollback API/web sobre esquema aditivo. Comprobar en cada pareja reserva interna/pública invitada, disponibilidad, PATCH legacy, estados/outbox/grants. Sin DDL, probar ambas parejas API/web en mismo esquema. Ledger/hashes/migraciones previas y retiro B2C intactos.

Rollback de índice: forward con nombres nuevos únicos; reversión elimina **únicamente índices agregados**, jamás uno previo. Probar lectura/escritura de ambas APIs y bloqueo acotado. C1 escogerá forma compatible con runner Prisma; si necesita CREATE INDEX CONCURRENTLY, documentar ejecución fuera de transacción, índices inválidos y recuperación. No publicar SQL en C0 ni aplicarlo.

Rollback aplicación: volver primero a web anterior compatible y luego API anterior compatible, conservando esquema aditivo y reservas válidas posteriores. Retener artefactos/SHA y plan de comprobación. Eliminar índices nuevos después solo si autorizado/ensayado; no es requisito para recuperar servicio. No restaurar snapshot para deshacer UI: perdería reservas nuevas. Si C1 exige persistencia nueva, detener y ampliar C0 con compatibilidad forward/reverse/retención y aprobación expresa antes de implementar. Nada aquí autoriza mantenimiento/flags/backup/restore real.

## 10. Criterios de aceptación observables

| ID | Resultado y evidencia futura |
| --- | --- |
| AC01 | Desktop semana/día/lista conservan rango/filtros; móvil agenda diaria sin rejilla semanal/overflow |
| AC02 | Tres roles ven tenant; Profesional solo propio; sin vínculo nunca agenda global; anónimo/CUSTOMER rechazados |
| AC03 | Intersección muestra una vez citas cruzadas; extremos exclusivos correctos en día/semana/mes/año |
| AC04 | Lista/calendario muestran mismo conjunto completo; carga parcial no aparenta vacío |
| AC05 | Detalle revalidado y retorno contextual; IDs ajenos/inaccesibles uniformes y sin PII excesiva |
| AC06 | Profesional sin botón ni permiso backend; otros tres solo estados elegibles |
| AC07 | Selector compacto de día/hora real, sin entrada libre; actual → nueva absoluta y un principal; cancelar no escribe |
| AC08 | Días/slots coinciden; propia cita solo se excluye en lectura interna autorizada; activo privado opera sin CMS público |
| AC09 | Cambio de día/visita invalida selección; A → B → A y efectos tardíos no reutilizan datos |
| AC10 | Carreras/revisión/slot perdido rechazan sin perder origen ni duplicar eventos |
| AC11 | Éxito real conserva Client/estado/Invoice/Payment/opt-in y refresca origen/destino; sin promesa de entrega |
| AC12 | Timeout posterior a commit comunica incertidumbre y consulta detalle sin replay |
| AC13 | Formato común proyecto, relativo al negocio; acciones/correos absolutos; teléfono en otra zona muestra mismas horas |
| AC14 | Días 23/25/23,5/24,5 h, medianoche desplazada/fecha omitida/horas ambiguas sin instantes inventados ni historia alterada |
| AC15 | Carga/vacío/filtrado/error/sin vínculo/sin confirmación/éxito distinguibles; 429 respeta plazo |
| AC16 | Payload calendario/logs/URLs/caché sin contacto/notas/motivos privados ni datos ajenos |
| AC17 | Teclado/VoiceOver/TalkBack operan lista/reagendar; foco/color/zoom/texto grande conservan acciones |
| AC18 | Ruta pública mantiene invitado/CMS/mínimos/cadencia/PENDING/Client-Booking atómicos/limitador/respuesta |
| AC19 | API anterior funciona con esquema nuevo antes de API nueva; rollback preserva reservas; web anterior compatible |

## 11. Plan de QA, no ejecutado

Tras autorización preparar **dos tenants sintéticos A/B** aislados, sin PII ni credenciales productivas, con cuatro roles internos y profesional sin vínculo. Una identidad con distintos roles entre tenants permite probar cambio de contexto. Client/servicios/profesionales propios por negocio; A zona confirmada Santo Domingo, B zona admitida con cambio de reloj confirmada por flujo existente. Semana explícita de siete días, múltiples franjas, cierre total/parcial, herencia/turno individual, bloques, profesionales activos privados/públicos.

Fixtures PENDING/CONFIRMED/CANCELLED/COMPLETED/NO_SHOW, sin factura/emitida/pagada, horas libres/ocupadas/minutos no estándar, inactivo/archivado. Cruces de límites como historia sintética controlada, documentando origen sin debilitar validaciones activas. Baseline/limpieza solo bajo autorización futura, nunca sobre datos ajenos.

| Etapa | Cobertura/evidencia |
| --- | --- |
| C1 unitarias/contrato | DTO/rangos/proyecciones/404/roles/estados, exclusión propia/revisión obsoleta, paridad formatos y reloj controlado |
| C1 PostgreSQL desechable real | Compatibilidad/rollback, grants/exclusión/carreras §8, filas y outbox antes/después; fallos atómicos |
| C1 regresión pública | Disponibilidad/horarios, creación invitada, colisiones/limitador dos procesos, consumidores antiguos; sin proveedor/envíos reales |
| C2 | API aprobada, foco/lista/scope/efectos tardíos/paginado/estados/timeouts/409/429/503 |
| C3 desktop | OWNER → Profesional → OWNER, A → B → A, semana/día/lista/detalle/reagendar, zoom200%, contraste claro/oscuro medido, consola |
| C3 móvil **real** | iPhone/Safari+VoiceOver y Android/Chrome+TalkBack: orientación, teclado, barras/áreas seguras, suspensión/regreso, selector, foco, texto grande/zoom |
| Tamaños complementarios | 320/375/390 CSS px y desktop1280/1440; emulación no sustituye hardware |
| Registro | Entorno/SHA API-web/esquema, tenant/rol, dispositivo/SO/navegador, acción/resultado, capturas/status/request-id saneados; fallos/pendientes explícitos |

Comandos futuros pnpm de tipos/lint/tests/build API/web, suites PostgreSQL/E2E y formateador según scripts reales de C1; solo exit0 cuenta. No instalaciones si dependencias no cambian. Build limpia no aprueba UI. Aceptación anterior de reserva invitada por declaración **sin evidencia capturada** no acredita M3. No activar proveedor/correo ni QA productiva por inferencia.

## 12. Decisiones FIJADAS D1–D8

El propietario seleccionó D1–D7 = A y fijó D8 el 2026-10-10. No quedan decisiones abiertas de este C0. Las opciones B se conservan solo como alternativas históricas descartadas; no reabren 5/6/13, zona autoritativa, alcance propio ni vistas acordadas.

| ID | Opción A: pros / contras | Opción B: pros / contras | Decisión del propietario |
| --- | --- | --- | --- |
| D1 semana/estados | Lunes–domingo y todos los estados con filtro; historia clara / más densidad | Domingo–sábado y PENDING/CONFIRMED iniciales; operación pendiente limpia / oculta historia | **FIJADA: A**; no cambiar Por atender/Todas ni rango por defecto de lista legacy |
| D2 cadencia interna | 30min + hora actual contextual validada; comparte reglas y preserva minutos / probar candidato extra | 15min + actual validada; flexible / más opciones y carga; nunca libre | **FIJADA: A**; escritura legacy fuera de cuadrícula y cadencia pública intactas |
| D3 elegibilidad | Solo PENDING/CONFIRMED; protege historia / nueva restricción del comando M3 | Legacy salvo CANCELLED; menor cambio / puede mover COMPLETED/NO_SHOW facturadas y contradice UI | **FIJADA: A** en ruta nueva; incoherencia legacy explícita, correctivo de ella necesita gate propio |
| D4 campos | Solo fecha/hora, conserva servicio/Profesional; simple y acotado / reasignación usa Reservas | Cambios opcionales de servicio/Profesional; paridad modal / contratos/snapshots/conflictos adicionales | **FIJADA: A**, sin decidir precios ni ampliar finanzas |
| D5 API/revisión | Rutas M3 aditivas y expectedUpdatedAt existente obligatorio; compatibles / dos adaptadores y riesgo legacy | Modo calendario/precondición opcional en GET/PATCH actuales; menos rutas / mezcla semántica/proyecciones y revisión no universal | **FIJADA: A**, primitivas comunes sin motor duplicado |
| D6 abuso | Calendario/detalle60/min; días/slots30/min compartidos entre esas dos consultas; mutación10/min por actor+tenant, distribuido/Retry-After; acota / medir coste | Solo rangos/páginas; menos contador / sin techo ante abuso autenticado | **FIJADA: A**, presupuestos propuestos, no capacidad medida; validar dos procesos y uso normal sin tocar límites públicos |
| D7 DDL | Medir índices existentes primero; evita DDL / quizá añadir índice antes de C2 | Agregar ambos índices ya; posible mejora / coste/bloqueo sin evidencia | **FIJADA: A**; acordar carga/umbral en C1; si exige índices, aditivos/rollback de §9 |
| D8 formateador en dos fases | Fase 1 M3: módulo puro compartido con vectores de paridad y migración web de calendario, lista, detalle y reagendar. Fase 2: plantillas de correo y demás consumidores API en gate propio posterior | No se reabre; M3 no toca plantillas de correo ni payloads sellados | **FIJADA**, decisión nueva del propietario |

Proyección mínima del detalle es propuesta conservadora; más PII/acciones requieren revisar contrato. Cadencia/paginado/presupuestos son diseños, no valores activos ni garantías medidas.

## 13. Validación documental y siguiente gate

Revisión de enlaces locales, fijadas/abiertas, invitado/roles/horarios, alcance y whitespace; sin builds/QA/SQL/servicios/proveedores. En la elaboración inicial los controles se enlazaron sin editarlos. El cierre autorizado añade únicamente las referencias necesarias en docs/README.md, PROJECT_MASTER.md y CHANGELOG.md, sin declarar implementación. Insumos originales faltantes se declaran en §1, sin inventar evidencia.

Verificación histórica de elaboración inicial: fetch exit0 y base exacta; comprobador de 28 enlaces locales y whitespace exit0; git diff --check exit0. Archivo nuevo inspeccionado contra NUL mediante diff --no-index (exit1 significa diferencia esperada, no una prueba aprobada). Git aislado: solo `?? docs/quality/M3_CALENDARIO_C0.md`, índice sin cambios y HEAD523d993. Checkout principal conserva rama/HEAD y únicamente Playbook ajeno sin versionar. Sin staging, commit o push; no se compara SHA de un commit nuevo inexistente con remoto. Las comprobaciones no acreditan QA del módulo.

**M3 necesita C1 (backend); NO puede pasar directo a C2.** Faltan lectura por intersección/rango y proyección mínima, detalle autorizado, disponibilidad interna con exclusión segura y protección de edición obsoleta, además de compatibilidad API anterior y regresión pública. D1–D7 están FIJADAS en A, D8 está FIJADA y C0 está aprobado; este cierre documental no autoriza implementación. C1 requiere orden expresa, validación y aprobación explícita del backend para C2; C3 requiere roles/dos tenants/móvil real y aprobación final. Entregar C0 no cierra M3 ni altera QA/producción.
