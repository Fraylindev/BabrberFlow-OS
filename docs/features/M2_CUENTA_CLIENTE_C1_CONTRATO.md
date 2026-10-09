# M2 Cuenta de cliente — C1, etapa 1

**Vigencia D4:** la enmienda del propietario añadida al final de este documento sustituye exclusivamente el bloqueo general y la revisión obligatoria descritos en «D4: revisión de historial y perfil». Ese texto se conserva como historial del checkpoint anterior.

2026-10-03. **IMPLEMENTADO LOCALMENTE / EN REVISIÓN DEL PROPIETARIO.** Único gate: C1 backend. Diseño [C0 aprobado](../quality/M2_CUENTA_CLIENTE_C0.md#15-aprobación-del-propietario-y-publicación-documental-2026-10-03), D1–D8 A y enmiendas 28–29 vinculantes. La orden de esta tarea autoriza implementación de etapa 1 y D8 por separado; no abre C2, etapa 2 ni producción. [Cierre y evidencia](../quality/M2_C1_CIERRE.md).

## Autoridad y permisos

Todos los endpoints M2 usan sesión Clerk verificada por el servicio vigente, incluidos firma, issuer, azp/aud configurados, expiración y sesión remota activa. Se resuelve User solo por `clerkUserId`; lectura sin User devuelve negocios vacíos y nunca crea identidad, Organization ni Membership. JWT CUSTOMER legacy no autoriza M2. No se busca identidad por contacto ni se exige Membership CUSTOMER, header tenant o rol elegidos por el consumidor.

Visitante/JWT legacy: `401`; dependencia de identidad no disponible: `503` cerrado. Identidad Clerk sin vínculo o sin revisión D4: negocios vacíos/`404` privado. OWNER, ADMIN, RECEPTIONIST, BARBER y CUSTOMER no adquieren privilegios B2C por su rol. El personal que también tenga Client propio habilitado usa exactamente ese vínculo, sin acceso a otros clientes. La autorización se implementa mediante Guards de sesión/presupuesto y consultas de ownership; `@Roles` B2B no sustituye el vínculo B2C. No se amplían permisos del panel.

El slug es un selector no confiable. Se convierte en tenant autoritativo únicamente al resolver `Client.user.clerkUserId` y organización activa/no borrada. Consultas finales de Booking incluyen tenant, Client y User vinculado. Ajeno, inexistente, inactivo, sin vínculo y bloqueado D4 devuelven el mismo cuerpo `404`: `{"message":"Información no disponible.","error":"Not Found","statusCode":404}`.

## Endpoints de etapa 1

| Método y ruta | Entrada | Salida |
| --- | --- | --- |
| `GET /customer/businesses` | Sesión; sin selectores de identidad | `{businesses:[{slug,name,canBook}]}`; vínculos propios habilitados y negocios activos, orden por slug |
| `GET /customer/:slug/bookings` | `view=upcoming\|history` default upcoming; `limit` entero 1–50, default 20; `cursor` opcional ≤2048 caracteres | `{business:{slug,name,timeZone},items,nextCursor,asOf}` |
| `GET /customer/:slug/bookings/:id` | UUID válido | Detalle propio mínimo |
| `GET /customer/:slug/profile` | Sesión y vínculo habilitado | `{name,phone,email,canEditContact}` |
| `PATCH /customer/:slug/profile` | Uno o ambos de `{name?:string,phone?:string\|null}`; `Idempotency-Key` UUID v4 opaco | Perfil propio; `200` primera mutación y replay autorizado |
| `POST /customer/:slug/bookings` | `{serviceId:UUID,professionalId:UUID,startTime:ISO_con_zona,emailNotifications?:{optedIn:boolean,noticeVersion:string}}`; `Idempotency-Key` UUID v4 opaco | `{booking:detalle}`; `201` primera alta; `200` mismo comando recuperado |

DTOs conservan whitelist/rechazo global de extras; listado rechaza `clientId`, `asOf`, otros scopes y límites inválidos. UUID de detalle inválido devuelve `400`, no permite consultar recursos por contacto. Headers ajenos no conceden autoridad. Todas las respuestas M2 incluyen `Cache-Control: private, no-store`, también `400/401/404/409/429/503`.

Resumen: `{id,startTime,endTime,status,service:{id,name},professional:{id,name},canBookAgain}`. Detalle añade `{business:{slug,name,timeZone,phone,address,googleMapsUrl},actions:{canBookAgain}}`. No hay precio histórico sellado, acciones de etapa 2, notas, IDs de User/Client/Organization, contactos de profesionales, fotos privadas, Memberships, factura, pago ni comprobante. Contactos del negocio solo proceden del snapshot publicado; retirado devuelve `null`. Identidad operativa mínima y zona del negocio se mantienen para reconocer historial vinculado.

## Lista, tiempo y cursor

Próximas: PENDING/CONFIRMED con `endTime > asOf`, incluidas citas en curso; `startTime ASC,id ASC`. Historial: complemento, incluidas COMPLETED/CANCELLED/NO_SHOW futuras y pendientes vencidas; `startTime DESC,id DESC`. No cambia status al cambiar de pestaña. `asOf` nace en servidor y se conserva en páginas sucesivas.

Cada lectura usa RepeatableRead. Cursor AES-256-GCM aleatorio/autenticado, ligado a actor local, tenant, Client, vista, revisión de reservas, orden implícito y última pareja fecha/id. Vence a los 15 minutos; consumidor no elige el instante ni firma. Usa derivación por propósito del secreto existente, sin variable nueva; no hay IDs legibles dentro del cursor. Manipulación/formato/vencimiento: `400`; cursor de otro actor/tenant/vista: `404` neutro.

`Client.customerBookingRevision` BIGINT se incrementa mediante trigger de PostgreSQL para cualquier INSERT/UPDATE/DELETE de Booking, incluyendo SQL ajeno al ORM y cambios de Client/tenant. Si cambió entre páginas: `409`, «Tus reservas cambiaron. Actualiza la lista para continuar.» El consumidor debe descartar páginas y empezar otra lectura. No se mezcla un historial cambiado ni se promete snapshot perpetuo entre peticiones. No se descarga toda la historia para comprobarlo.

Índice `Booking_customer_page_idx (organizationId,clientId,startTime,id)`, lectura limitada a `limit+1`; [EXPLAIN ANALYZE](../quality/evidence/m2-c1/query-plans.json) justifica acceso ascendente y descendente con 50.000 reservas/50 clientes sintéticos. No mide capacidad productiva ni confirma tiempos bajo carga real.

## D4: revisión de historial y perfil

`Client.customerAccessBlocked=true` por defecto para existentes y nuevos: sin backfill ni confianza inferida de deduplicación. C1 elige negar acceso a todo historial no revisado porque el schema previo no prueba que cada Client corresponda a una sola persona. Los casos mezclados permanecen bloqueados. A0.6-A conserva body, estados, claim de Client e idempotencia; claim exitoso no libera automáticamente M2.

La habilitación requiere revisión asistida explícita del negocio, con evidencia de titularidad/ausencia de mezcla y auditoría sin PII, antes de poner el bloqueo en false. C1 no crea endpoint administrativo, no concede esa mutación a clientes ni personal desde M2, y no habilita registros reales. Los tests aplican la revisión directamente a fixtures sintéticos. Antes de activación deberá existir y ensayarse el procedimiento autorizado de revisión por operador; no es una promesa de autoservicio C2. Si `userId` cambia o se anula, un trigger vuelve a bloquear incluso si la actualización intenta liberar simultáneamente. Una nueva identidad requiere otra revisión.

Client archivado conserva lectura y `canEditContact:false`; no crea otra reserva ni edita perfil. Organización retirada del mini-sitio conserva lectura si está activa, pero niega alta. Organización inactiva/borrada: `404`.

Nombre 1–120, sin vacío/null, trim con normalizador vigente; teléfono entrada ≤30, normalización vigente de 7–15 dígitos, nullable. Colisión con otro teléfono del tenant: `409` neutro. No se cambian User, email/`emailRevision`, consentimientos, vínculo ni otros negocios. Mutación de perfil usa locks y auditoría sin valores. No se añade una unicidad global de teléfono ni se redefine la deduplicación legacy.

§9.4 también se aplica al perfil: recibo UPDATE_PROFILE ligado al Client actual, HMAC de comando normalizado y clave opaca, TTL 24 h. Misma clave/comando relee perfil autorizado sin volver a escribir ni auditar; distinta entrada o expiración devuelve 409. Perfil, recibo y auditoría son atómicos; pérdida/cambio de vínculo impide recuperar el recibo. No se guarda el nombre/teléfono en el recibo. Se exige el header también en PATCH porque §9.4 comprende las mutaciones autenticadas, aunque la tabla resumida de §9.2 no lo repita. La FK Client/tenant ata ambos tipos de recibo al recurso propio, sin exponerla en HTTP.

## Alta autenticada, recibos y concurrencia

Client se obtiene del vínculo vigente, no del body. Servicio activo y profesional ACTIVE/público del mismo negocio; publicación/horarios actuales se releen. Se reutiliza BookingsService con validación pública, agenda global/individual, exclusión de solapamientos y eventos de Notificaciones. No se exige ProfessionalService como relación nueva. Nueva Booking PENDING, duración del Service actual; no se copia Booking anterior ni su fecha/status/precio/pago/notas.

Locks Organization → Client → recursos de agenda, mediante SERIALIZABLE y máximo tres intentos solo para fallos de serialización reconocidos. Booking, recibo, preferencia/evento/outbox y auditoría confirman juntos. Un fallo de recibo/auditoría revierte todo; un replay no crea eventos. Colisión de slot es `409`; recursos ajenos/inactivos se rechazan sin revelar otro tenant. Las transacciones no garantizan conservar el hueco entre leer disponibilidad y enviar.

`CustomerOperation`: UUID técnico; tenant, actor local, referencia Client y operación `CREATE_BOOKING` o `UPDATE_PROFILE`, HMAC SHA-256 por propósito de clave y comando, `bookingId` nullable (CHECK exige Booking en alta y null para perfil), fechas. Unicidad `(organizationId,actorUserId,operation,keyDigest)`; FKs a Organization/User y compuestas Client/Booking + tenant; CHECK operación/digests/TTL y revisión no negativa. No guarda comandos, contactos, cuerpos ni snapshots privados.

El comando canónico contiene IDs de recursos, instante normalizado y consentimiento aprobado u omisión. Misma clave/contexto y comando: relee detalle con ownership actual y `200`, incluso para conocer una reserva ya creada después de retirar catálogo; no ejecuta una nueva alta. Distinto comando: `409` neutro. Perdido vínculo, bloqueado D4 o negocio inactivo: `404` antes de leer recibo. Otros actores/tenants tienen espacio de claves independiente.

TTL técnico 24 horas exactas desde createdAt. Recibo vencido todavía presente: `409`, sin reenviar. Limpieza de como máximo 100 filas por mutación, con índice expiresAt, solo para recibos vencidos hace más de 24 horas (hasta 48 h de presencia como retención conservadora). Tras eliminarlo ya no existe prueba de esa clave: el consumidor nunca reenvía automáticamente una mutación incierta después del TTL; debe comprobar la reserva y pedir decisión expresa. Retirar recibos no borra Bookings. No cambia idempotencia del POST invitado ni del claim.

Avisos independientes de cuenta, con DTO público aprobado/versionado; email se toma solo del perfil. Opt-in sin correo propio: `400`. No se acepta reviewedEmail del consumidor M2, no se activa proveedor ni se crea un nuevo canal.

## Presupuestos y errores

Contador PostgreSQL compartido, claves HMAC sin IP/email crudos. Lecturas: 60/min identidad+slug autorizado o solicitado; perfil: 10/min; altas: 5/min. Techo adicional global IP: 180/min para M2, independiente de slug/actor/handler. Ventana/bloqueo de un minuto, incluye fallos de validación/ownership una vez verificada sesión. `429` incluye Retry-After ≥1 en segundos. M2 elige limpieza de hasta 100 contadores vencidos hace más de 24 h, una pasada por hora/proceso, sin cambiar la limpieza previa de otros consumidores del almacenamiento. Conserva fail-closed `503`. Claim conserva sus 10/min aprobados. Control de reenvíos/verificaciones Clerk se debe validar con proveedor antes de activación.

`400` datos inválidos; `401` sesión inválida; `404` privado neutro; `409` conflicto/archivo/retirada/clave/cursor obsoleto; `429` límite; `503` identidad/DB/operación no disponibles. M2 no publica constraints, SQL, Prisma ni datos de terceros. Se conservan envelopes Nest y mensajes de validación global existentes; los campos nuevos añaden textos en español. El consumidor debe traducir el envelope a UX aprobada y no pintar errores técnicos de librerías.

## D8-A: enmienda limitada separada

Solo el resultado secundario de `POST /public/:slug/bookings`: conserva estructura y campos de Booking, status PENDING, `201` de reserva real y rechazo/rollback neutro D11. Después de la reserva se intenta el alta legacy igual que antes, con User/password/Membership CUSTOMER nuevos cuando procede y fail-open ante fallo secundario.

Todos los resultados secundarios —correo nuevo, existente, colisión de unicidad y fallo interno— devuelven `accountCreated:false,accountCreationError:null`. Estos campos ahora representan **resultado de identidad no divulgado**, no prueba de ausencia de cuenta ni confirmación de Clerk. Neutralizar solo `EMAIL_ALREADY_EXISTS` dejando true/false distinguibles habría conservado la enumeración. Bcrypt se ejecuta también antes de comprobar existencia para retirar la diferencia inmediata de coste; no se afirma indistinguibilidad estadística de tiempos o protección integral de todas las rutas legacy.

No se modifican DTOs de reserva, estados HTTP de rechazo/éxito, colisiones de Client, A0.6-A, JWT, passwords, rutas de login/register, roles, Memberships ni vínculos por email. Regresiones prueban persistencia PENDING tras fallo real del alta secundaria, indicadores/campos iguales y login legacy efectivo de la cuenta realmente creada. La web existente no se modifica: C2 debe integrar el consumidor Clerk sin interpretar estos indicadores como resultado de cuenta; la UX legacy secundaria requiere revisar su copy dentro de ese alcance autorizado.

## Migración y reversión

Migración aditiva `20261003120000_customer_stage_one`, sin backfill/enlaces ni CustomerBookingPolicy. Probada desde cero y desde las 27 migraciones anteriores, con fixtures y huellas iguales de User/Client/Booking.

Rollback recomendado: código HEAD anterior con schema aditivo intacto. El ensayo ejecutó lectura/alta pública y claim repetido en el código exacto anterior y conservó vínculo, recibo y reserva posterior. Esto vuelve a los límites legacy anteriores, incluida señal D8 si se revierte ese código; producción sigue cerrada.

La [inversa SQL](../../apps/api/prisma/rollback/customer-stage-one.disposable.sql) se ensayó únicamente en DB desechable: conserva User/Client/Booking pero elimina recibos, bloqueo/revisión, triggers e índice; diff contra schema anterior vacío. No es recomendación de operación real ni autorización de rollback destructivo. Su ledger de migraciones se desecha con el clúster; no debe aplicarse en una base operativa ni marcar migraciones a mano. [Evidencia y límites](../quality/M2_C1_CIERRE.md).
## 2026-10-03 — Correctivo D4 autorizado: claim habilita lectura

La decisión posterior del propietario refina D4-A: un claim explícito válido habilita el Client sin operador. Prevalece esta sección sobre el bloqueo general anterior; conserva íntegros los demás contratos C1 y D8. Publicación del código autorizada exclusivamente en `ai/antigravity-qa`; C1 sigue en revisión, C2 y producción cerradas.

- `customerAccessBlocked=true` continúa como default seguro para Clients sin claim válido y tras cualquier cambio/anulación de `userId`. No hay backfill, nueva identidad por consulta ni vínculo por coincidencia de contacto.
- Claim nuevo A0.6-A conserva `201` y `{claimed:true}`: identidad de sesión Clerk, correo primario verificado coherente con Client/User y controles de colisión existentes. Tras enlazar, habilita en una segunda escritura dentro de la misma transacción SERIALIZABLE; el trigger de revocación no puede anular esta habilitación. User, enlace, habilitación y auditoría no quedan parcialmente aplicados si falla la transacción; la reserva invitada permanece.
- Replay del mismo vínculo conserva `200`. Si el acceso fue revocado, habilitar exige otra vez correo primario verificado coincidente con Client y User local; discordancia devuelve el `409` genérico existente y conserva bloqueo. Cambiar el correo global después de un claim previamente habilitado no reinterpreta ni une identidades; replay ya habilitado mantiene la idempotencia A0.6-A.
- **Señal objetiva automática de ambigüedad:** al validar el claim, otra ficha Client del mismo negocio, distinta y con reservas en ese negocio, comparte el mismo teléfono almacenado. Es una señal conservadora de contacto compartido, no prueba de identidad ni de titularidad individual. Nunca cruza negocios ni usa nombre/correo para descubrir o enlazar otra ficha. Un teléfono compartido entre Norte y Sur no bloquea el vínculo.
- **Mezcla confirmada:** `customerHistoryAmbiguous=true` registra una cuarentena persistente tras revisión asistida con evidencia objetiva de personas distintas bajo la misma ficha. Default false, sin clasificar masivamente registros históricos. El claim puede enlazar correctamente y devolver `claimed:true`, pero esa cuarentena mantiene lectura `404`; éxito del vínculo no promete lectura de un historial ambiguo.
- El claim registra la señal automática en esa misma cuarentena. No la borra aunque desaparezca el teléfono duplicado. El trigger mantiene bloqueado cualquier Client marcado ambiguo, incluso ante un intento SQL de poner solo `customerAccessBlocked=false`; todas las consultas M2 exigen además `customerHistoryAmbiguous=false`.
- Resolver una mezcla exige revisar/separar el historial por un procedimiento asistido autorizado, registrar evidencia y auditoría sin PII y retirar explícitamente la cuarentena; después se exige claim válido para habilitar. C1 no añade endpoint ni permiso administrativo, no habilita datos reales y no ofrece recuperación por contacto.

**Límite:** el schema histórico no conserva la identidad de quien originó cada Booking ni los contactos presentados en cada reutilización pública. No se puede detectar retrospectivamente toda mezcla de personas dentro de una única ficha sin señal registrada. Se conserva la deduplicación legacy; no se presenta el claim como prueba individual de todo el historial. Nombres distintos, correo global cambiado, falta de teléfono, archivo o mera antigüedad no bastan para clasificar una mezcla. Solo se habilita por claim explícito; discordancias de identidad y claims fallidos nunca conceden lectura ni modifican una ficha ajena.

La migración 28 todavía no publicada añade `customerHistoryAmbiguous` y amplía el trigger; la inversa desechable retira también esa columna. Se repitieron 0→28, 27→28 y reversa con preservación de filas. [HTTP antes/después](../quality/evidence/m2-c1/d4-http-antes-despues.json), [validaciones actuales](../quality/evidence/m2-c1/d4-validation.json) y [cierre actualizado](../quality/M2_C1_CIERRE.md#correctivo-d4-y-publicación-autorizada-2026-10-03).
