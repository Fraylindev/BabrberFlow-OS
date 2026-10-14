# M3 — gate 4: reprogramación QA y observación de correo

Fecha local: 2026-10-13, America/Santo_Domingo.

**GATE 4 CERRADO POR AUTORIZACIÓN ESCRITA DEL PROPIETARIO / EVIDENCIA TÉCNICA Y RECEPCIÓN DECLARADA.** La cita controlada pasó del **27 de octubre, 9:30–11:30**, al **28 de octubre, 9:30–11:30**, hora del negocio, con el selector mensual de la web QA y una sesión OWNER. Solo cambió esa reserva entre las 36 comparadas. Hubo un evento RESCHEDULED, un outbox nuevo y un intento, registrado como DELIVERED. El propietario confirmó recepción y horario correcto. La lectura directa del mensaje en Resend devolvió **401**: se detuvo esa verificación sin cambiar permisos, claves o configuración. No se afirma una lectura exitosa del proveedor ni una aprobación global de M3 o producción.

## 1. Autorización y correspondencia documental

Fuentes del SHA base: [entrada documental](../README.md), [estado maestro](../../PROJECT_MASTER.md), [decisiones vinculantes](DECISIONES_PROPIETARIO_2026_09_29.md), [gates](DELIVERY_GATES.md), [C0](M3_CALENDARIO_C0.md), [C1](M3_CALENDARIO_C1_CIERRE.md), [C2](M3_CALENDARIO_C2_CIERRE.md), [C3 gate1](M3_CALENDARIO_C3_GATE1_CIERRE.md) y [continuidad](M3_CALENDARIO_CONTINUIDAD_NUBE.md). Las decisiones 5, 6 y 13 no se reabren; reserva invitada y roles internos se conservan.

El primer preflight se detuvo antes de acceder a QA: C1 §15 distingue QA funcional/visual en el punto 4 y reagendado real/worker en el punto 5. La orden actual denominaba gate 4 al segundo alcance, pero simultáneamente prohibía modificar citas y disparar correos. El [código real](../../apps/api/src/bookings/calendar.service.ts), líneas 566–576, confirma que reagendar escribe Booking y produce el evento de correo.

Tras presentar las opciones, el propietario eligió expresamente **«Autorizar una sola reprogramación web y su correo automático al propietario, como excepción acotada.»** Esa respuesta resolvió el alcance para esta ejecución denominada gate 4. No se abrió otro gate ni se interpretó una mutación web como lectura. Las consultas de observación permanecieron READ ONLY; siguieron prohibidos SQL de escritura, creación/corrección de fixtures, reenvíos manuales, cambios de API/CORS, migraciones, flags/variables, despliegues y operaciones del worker o producción.

El propietario identificó el destinatario, después preparó la cita y aportó una captura con su fecha/hora; la imagen no se copió al repositorio. Finalmente proporcionó una cuenta interna de prueba OWNER en Norte y Sur para usarla en el navegador integrado. Solo se documentan rol y negocio, sin correo completo, código ni sesión.

La aprobación escrita del gate 3d y el deployment web `dpl_3FAzLtsUh6AsVjYrnnTbjVQJvYrB` son antecedentes del chat. No se repitió ni se modificó Vercel o CI en este gate. El API QA en `56e2e12` se revalidó por lectura de runtime. La diferencia de SHA web/API fue autorizada en el gate 3d para este correctivo web; no se convierte aquí en una nueva promoción.

## 2. Base y Git

Worktree de trabajo: `C:/Users/Fraylin/.codex/worktrees/m3-calendario-c0/Kortek-Booking`.

```text
Rama: ai/antigravity-qa
HEAD: 2e084ec453c90705cbc237d5bf103a4499b75044
Git inicial de la reanudación:
?? docs/quality/M3_GATE4_CIERRE.md
```

El único archivo sin versionar era el informe de los preflights anteriores de esta misma tarea. El worktree M3 había comenzado limpio en la rama cloud y el mismo SHA; se seleccionó la rama QA existente sin mover su commit. El checkout principal se preservó en `ai/reserva-invitado-ci`, HEAD `de3a062aba70157da5fbf1b569a73aecb0d04087`, con el Playbook ajeno sin versionar:

```text
?? "docs/Playbook Kortek Booking_ del 29 de septiembre al MVP.md"
```

Comandos de orientación: `git branch --show-current`, `git rev-parse HEAD`, `git status --short`, `git worktree list --porcelain` y lecturas de contratos/código. No hubo staging, commit, fetch, push ni consulta nueva de SHA remotos durante este gate.

## 3. Precondición y sus revalidaciones

Las tres primeras lecturas, anteriores a la preparación del propietario, encontraron 0 citas futuras para el destinatario. Se conservaron como historia: 2026-10-14 a las 01:44:47.797, 01:47:28.728 y 01:48:20.831 UTC. No provocaron creación/corrección de datos por el agente. El objetivo quedó bloqueado hasta la respuesta del propietario con la cita preparada.

La lectura del **2026-10-14 01:53:20.235 UTC / 2026-10-13 21:53:20.235 local** encontró exactamente una candidata:

| Precondición | Resultado observado |
| --- | --- |
| Negocio | QA Horario Norte, slug `qa-horario-norte` |
| Identidad de cita | `15a6f16c-6978-4039-95f3-dcf97944871c` |
| Fecha/hora del negocio | 27 oct 2026, 9:30–11:30 |
| Estado | PENDING |
| Destinatario | `f***@gmail.com`, coincidencia normalizada por hash con el indicado |
| Consentimiento | optedIn=true, noticeVersion=`booking-email-v1` |
| Registro de consentimiento | 2026-10-14 01:50:07.446 UTC, source=PUBLIC |
| Contacto revisado | reviewedContactRevision=0, emailRevision=0 |
| Preferencia | sequence=1, version=1 |
| Cita futura | Sí, según el reloj PostgreSQL de la consulta |

La candidata coincide con la captura aportada. La precondición pasó antes de abrir su selector. El consentimiento de la reserva no se sustituyó por el de una identidad interna. El correo completo no se guardó en el informe, helpers o evidencia; se comparó su versión normalizada por hash y se devolvieron solo máscara/booleanos.

## 4. Método READ ONLY y evidencia antes/después

Se reutilizó SSH con verificación estricta de host y se ejecutaron lectores dentro de los contenedores QA existentes. No se crearon contenedores ni se reiniciaron servicios. Las credenciales permanecieron dentro del contenedor y nunca se imprimieron ni pasaron por argv.

Cada lector comprobó `DEPLOY_ENV=staging` e identidad de la base QA antes de consultar. Prisma abrió una transacción RepeatableRead y ejecutó primero:

```sql
SET TRANSACTION READ ONLY;
SELECT current_user AS role,
       current_setting('transaction_read_only') AS read_only,
       now() AS observed_at;
```

Todas las lecturas SQL remotas terminaron con exit 0, rol `kortek_runtime` y `read_only=on`.

### Consulta de precondición

La siguiente representación sustituye el hash real por un marcador de privacidad; la ejecución usó el hash normalizado real:

```sql
SELECT b.id, b."organizationId", o.slug, o."timeZone",
       b."startTime", b."endTime", b.status, b."updatedAt",
       c."customerBookingRevision", p."optedIn", p."noticeVersion",
       p."recordedAt", p.source, p."reviewedContactRevision", c."emailRevision",
       p.sequence, p.version
FROM "Booking" b
JOIN "Client" c ON c.id=b."clientId" AND c."organizationId"=b."organizationId"
JOIN "Organization" o ON o.id=b."organizationId"
LEFT JOIN "BookingEmailPreference" p
  ON p."bookingId"=b.id AND p."organizationId"=b."organizationId"
WHERE b."startTime">now()
  AND md5(lower(trim(c.email)))='<hash-del-correo-indicado>'
ORDER BY b."startTime", b.id;
```

### Instantáneas comparables

- **Antes:** 2026-10-14 01:58:11.877 UTC / 13-oct 21:58:11.877 local.
- **Después:** 2026-10-14 02:00:40.592 UTC / 13-oct 22:00:40.592 local.

Lecturas de la cita, preferencia y eventos/outbox se hicieron por ID y organizationId mediante `findFirst/findMany` con proyecciones explícitas, sin nombres, teléfonos, notas ni contenido de correo en la salida. La revisión se cotejó como SHA-256 de la revisión calculada con la función pura de C1; no se guardó el token, no se inyectó en la UI ni se construyó un comando a mano. La UI consumió los tokens recibidos del API por su flujo normal.

Se inventariaron las tablas public con organizationId usando information_schema y `has_table_privilege(...,'SELECT')`: **30 tablas, ninguna sin permiso de lectura**. Para cada tabla se compararon multiconjuntos ordenados de huellas por negocio:

```sql
-- <tabla> procede del catálogo y se valida como identificador; es un SELECT.
SELECT md5(coalesce(t."organizationId",'')) AS tenant_hash,
       md5((to_jsonb(t)-'sealedPayload'-'recipient')::text) AS row_hash
FROM public."<tabla>" t
ORDER BY 1,2;

SELECT md5(id) AS id_hash, md5("organizationId") AS tenant_hash,
       md5(to_jsonb(b)::text) AS row_hash
FROM "Booking" b ORDER BY id;
```

En EmailOutbox se excluyeron del digest genérico recipient/sealedPayload para minimizar tratamiento de PII; el mensaje objetivo se comprobó separadamente mediante booleanos. También se compararon los conjuntos globales de BookingEmailEvent y EmailOutbox con identificadores en hash, secuencia, estado, fechas, intentos y coincidencia del destinatario; no se volcó el contenido.

Cobertura por negocio: AuditLog, Booking, BookingEmailEvent, BookingEmailPreference, BusinessClosure, BusinessSchedule, BusinessScheduleDay, BusinessScheduleRevision, BusinessScheduleWindow, Client, CmsOperation, CmsPage, CustomerOperation, EmailOutbox, EmailWebhookReceipt, GalleryImage, Invoice, MediaAsset, MediaGalleryOrder, MediaOperation, MediaPromotion, MediaPurgeJob, Membership, Notification, Payment, Professional, ProfessionalAvailabilityBlock, ProfessionalWeeklySchedule, Service y TeamInvitation.

Esta comparación cubre el estado visible en esas dos instantáneas; no es vigilancia continua ni prueba sobre tablas sin organizationId, otros sistemas o actividad externa a la aplicación.

## 5. Única acción web y resultado de reserva

Navegador integrado de Codex, sesión OWNER, negocio Norte. Se navegó hasta la semana 26-oct–1-nov, se abrió la cita coincidente y se pulsó Reprogramar. El calendario mensual ofreció el 28 de octubre y el API devolvió el slot de las 9:30. Se eligieron esos controles y se pulsó **Confirmar nuevo horario exactamente una vez**.

La web mostró «Reserva reagendada. El profesional, el servicio y el estado se conservaron» y la cita apareció el 28 de octubre. No se ejecutó un PATCH directo ni una segunda reprogramación en este gate. Un intento previo de rellenar el filtro de fecha no cambió su valor; se llegó al período con dos botones Siguiente, sin corregir producto.

| Campo | Antes | Después |
| --- | --- | --- |
| Inicio, hora del negocio | 27 oct 2026, 9:30 a. m. | 28 oct 2026, 9:30 a. m. |
| Fin, hora del negocio | 27 oct 2026, 11:30 a. m. | 28 oct 2026, 11:30 a. m. |
| Inicio UTC | 2026-10-27T13:30:00.000Z | 2026-10-28T13:30:00.000Z |
| Estado | PENDING | PENDING |
| updatedAt UTC | 2026-10-14T01:50:07.416Z | 2026-10-14T02:00:15.693Z |
| Contador de revisión del cliente | 1 | 2 |
| SHA-256 de revisión | `ccca0c6277667249ee90c173ec0814dfe47b199ae97a8f3bed30436899aef9d9` | `a93c4008e7bd091af518ace2d556619a1298828654db2435355491fed8cc335d` |
| Profesional/servicio/cliente | Huellas capturadas | Las tres huellas iguales |
| Consentimiento/contacto | Vigentes | Vigentes, mismos valores |
| Preferencia sequence/version | 1 / 1 | 2 / 1 |

**36 reservas antes y después; exactamente una huella de Booking cambió y corresponde a la cita objetivo.** En las 30 tablas observadas, ninguna huella de otro negocio cambió. Invoice, Payment, profesionales, servicios y horarios conservaron sus huellas.

Cambios asociados dentro de Norte: una Booking modificada; una Client con contador de revisión 1→2; una BookingEmailPreference con secuencia 1→2; un BookingEmailEvent nuevo; un EmailOutbox nuevo; dos EmailWebhookReceipt nuevos. Se distingue el contador automático de Client requerido por C1 de una edición manual de datos de cliente: no hubo edición de cliente por el agente. No se realizó una comparación campo por campo del resto de esa fila Client.

## 6. Evento, outbox y procesamiento

| Observación | Resultado |
| --- | --- |
| Eventos globales | 90→91, exactamente un evento nuevo |
| Evento objetivo | RESCHEDULED, sequence=2, PENDING |
| Horario del evento | 28-oct 13:30–15:30 UTC, coincide con la nueva reserva |
| Creación del evento | 2026-10-14T02:00:15.723Z |
| Evento anterior | CREATED, sequence=1, preservado |
| Outbox global | 73→74, exactamente uno nuevo |
| Estado del outbox nuevo | DELIVERED |
| Intentos | 1 |
| firstDispatchedAt | 2026-10-14T02:00:16.135Z |
| closedAt | 2026-10-14T02:00:16.389Z |
| providerEventAt | 2026-10-14T02:00:17.561Z |
| Identificador de proveedor | Presente; solo se conservó su hash |
| Outbox previos | Sin cambios en los metadatos comparados |
| Duplicados | Ningún evento ni outbox adicional en la ventana observada |

El estado y los timestamps acreditan procesamiento y resultado terminal registrado por la aplicación, no meramente flags/heartbeat. No se llamó a worker.tick, no se pausó/reinició el worker y no se repitió el envío.

## 7. Correo: comprobaciones, proveedor y declaración

Comprobaciones del payload sellado de **sequence=2** realizadas dentro del lector, devolviendo solo booleanos:

- Destinatario persistido coincide con `f***@gmail.com`; array to con **un único destinatario**, coincidente con el autorizado; sin cc/bcc en el payload observado.
- Asunto exacto **«Reserva reprogramada»**.
- Texto contiene fecha y hora formateadas para **28 de octubre de 2026, 9:30 a. m.**, zona America/Santo_Domingo, y la indicación de hora del negocio.
- Plantilla `booking-email-v1`; evento y payload corresponden al nuevo horario.
- Entre ambas instantáneas se produjo **una sola intención de correo en toda la base QA**, para esta cita y destinatario. No aparecieron intenciones para otros destinatarios. Esto no demuestra ausencia de correos ajenos a la aplicación o fuera de la ventana.

El mensaje CREATED de sequence=1 ya estaba DELIVERED antes del cambio; no se confundió con el de reprogramación. Su payload conserva correctamente la fecha anterior y no se reemitió.

Se intentó una **única lectura GET** del mensaje objetivo usando la API oficial de Resend, desde el worker QA y manteniendo la clave dentro del proceso. Resultado: **HTTP 401**, a las 2026-10-14 02:02:16.735 UTC de la consulta READ ONLY asociada. No se conoce la causa exacta; no se atribuye por certeza al alcance de la clave. Se detuvo la corroboración directa, sin reintentos, claves alternativas, cambios de permisos o configuración. Nunca se imprimieron el identificador del proveedor, clave ni contenido del correo.

Por tanto, **DELIVERED es evidencia del estado registrado en la aplicación**; no se afirma haber leído last_event en Resend ni cotejado el cuerpo remoto con el payload. La respuesta 401 está conservada como límite.

**Declaración posterior del propietario:** respondió «Sí, recibido y horario correcto» a la pregunta sobre este mensaje y el 28 de octubre a las 9:30. Confirma por declaración su recepción en buzón y coherencia del nuevo horario; no se inspeccionó el buzón, no se copió contenido ni se presenta la declaración como captura independiente del proveedor.

## 8. Runtime, límites y pendientes de producción

Runtime QA leído antes de la acción:

- API release: `56e2e1278c0dacd679accca4f1bd501e7cf9a1f9`; DEPLOY_ENV=staging; destino DB QA comprobado.
- Imagen API efectiva: `ec199b2dfb81bec113b96df537089148e497e1acfb5118c935b4d7f4131e40f5`.
- Imagen worker efectiva: `7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1`.

No se cambiaron imágenes, servicios, variables, flags, canales o proveedores. Leer el ID de imagen no acredita su fuente. El envío real de QA y la procedencia no acreditada del worker fueron aceptados por el propietario para esta prueba; no se extrapola esa aceptación a producción.

Pendientes explícitos antes de producción:

1. **Reasignación de profesional/servicio retirada de Reservas:** definir contrato y alcance propios para esa capacidad; no restaurarla por inferencia.
2. **PATCH legacy `/bookings/:id`:** inventariar consumidores y decidir coexistencia/deprecación con cobertura de todos los escritores y rollback.
3. **Retry-After en CORS:** correctivo separado; permanece el fallback web de 60 s. No se cambió CORS.
4. **Procedencia de la imagen del worker:** falta vincular imagen efectiva con fuente/SHA reproducibles y acreditar compatibilidad antes de una decisión productiva.

Otros límites:

- Acceso directo al mensaje en Resend no disponible (401); no se corrigió en este gate. Si se requiere esa corroboración adicional, necesita acceso de lectura válido o evidencia del propietario, sin repetir el correo.
- No se indujo ni se aportó un 409 en este mismo flujo; era opcional si el propietario lo compartía. No se creó una colisión ni se consumió otro slot.
- No se ejecutó un intento redundante de mismo instante: la excepción autorizaba una sola reprogramación. La prueba local histórica C1 no se presenta como nueva prueba QA.
- No se repitió una matriz completa de roles, responsive, Safari/iPhone físico, 429 o accesibilidad en este gate. La captura del propietario no acredita por sí sola la reprogramación de esta ejecución en un dispositivo físico.
- La comparación de aislamiento es de 30 tablas con organizationId entre dos instantes. No prueba ausencia universal de efectos fuera de ese conjunto/ventana ni entrega a cada destinatario externo del proveedor.
- El propietario autorizó posteriormente el cierre acotado del gate 4 (§11); no equivale a aprobar C3/M3 ni promover producción.

## 9. Evidencias y comandos

Evidencia sanitizada fuera del repositorio, carpeta `C:/Users/Fraylin/.codex/visualizations/2026/10/13/01a137b3-7f48-7ed3-ac0d-5869ddc74e9a/`:

- `m3-gate4-precondition-20261014T014447Z.json`, `...014728Z.json`, `...014820Z.json`: precondiciones históricas sin candidata.
- `m3-gate4-precondition.json`: candidata preparada y consentimiento válido a las 01:53:20 UTC.
- `m3-gate4-before.json`, `m3-gate4-after.json`: instantáneas READ ONLY, sin correos completos ni contenido de mensajes.
- `m3-gate4-comparison.json`: comparación de reservas, huellas por negocio, eventos y outbox.
- `m3-gate4-provider.json`: HTTP 401 de la lectura directa, sin secretos ni payload.
- `m3-gate4-selector-before.jpg`, `m3-gate4-web-after.jpg`: selector y éxito en la web. La imagen privada aportada no se versiona.

Helpers locales ignorados por Git en `.tmp` del checkout principal: `m3-gate4-precondition.py`, `m3-gate4-snapshot.cjs`, `m3-gate4-snapshot.py` y `m3-gate4-provider-read.py`. No contienen credenciales ni correos completos. Comandos relevantes y resultado:

| Comando | Resultado |
| --- | --- |
| `python .tmp/m3-gate4-precondition.py` | exit 0; tres lecturas históricas con 0 filas y una posterior con 1 candidata válida |
| `python .tmp/m3-gate4-snapshot.py before` | exit 0, READ ONLY, 30 tablas legibles, 36 reservas |
| Acción web OWNER | Una confirmación, éxito visible; persistencia comprobada en after |
| `python .tmp/m3-gate4-snapshot.py after` | exit 0, READ ONLY; evento/outbox únicos, DELIVERED |
| Comparador local de JSON | exit 0; una Booking y cero negocios ajenos modificados en cobertura |
| `python .tmp/m3-gate4-provider-read.py` | exit 0 del lector; operación HTTP de proveedor 401, **no cuenta como verificación exitosa de Resend** |
| Comprobación documental y privacidad | Enlaces locales válidos, sin correos completos ni espacios al final; git diff --check exit 0 |

No suites ni builds: no hubo cambios de código de producto. Se aplicaron kortek-delivery, lectura del modelo/privacidad de Supabase y criterios de evidencia de kortek-product-ui; no se presenta este flujo acotado como una auditoría UI completa.

## 10. Git al finalizar la observación, antes de la autorización documental

```text
Rama: ai/antigravity-qa
HEAD: 2e084ec453c90705cbc237d5bf103a4499b75044
?? docs/quality/M3_GATE4_CIERRE.md
```

El checkout principal conserva rama/HEAD y Playbook ajenos. Solo este informe permanece sin versionar en QA; helpers ignorados y evidencia fuera del árbol candidato. Sin staging, commit, push, despliegues, migraciones, modificaciones de API/CORS, flags/variables, cambios manuales de base, operaciones del worker ni lecturas/acciones productivas.

La excepción de una reprogramación web y su correo automático quedó **consumida una sola vez**. No autoriza repetir el envío o volver a cambiar la cita. La observación terminó con resultados y límites documentados; la autorización posterior de cierre se registra en §11. La corroboración directa de Resend se detuvo en 401; su remedio queda fuera del gate y no se improvisó.

## 11. Autorización posterior de cierre y publicación documental — 2026-10-13

El propietario autorizó por escrito reflejar el **cierre del gate 4**, hacer commit de **solo** este informe, PROJECT_MASTER.md y CHANGELOG.md, y publicar sin force exclusivamente a origin/ai/antigravity-qa. Mensaje exacto:

```text
docs(m3): cierre gate 4, reprogramacion QA y observacion de correo
```

La autorización no comprende otras rutas, el Playbook ajeno, main, reescritura de historia ni despliegues. Esta sección prevalece sobre el estado histórico de revisión de §10; conserva íntegros el 401 de Resend, la recepción declarada y los cuatro pendientes de producción. Cerrar este gate no cierra C3/M3 ni abre otro gate.

**Publicación documental pendiente de compatibilizar con «No despliegues nada».** El commit se prepara y valida localmente; no se considera publicado ni se afirma un CI nuevo verde antes de comprobarlos. pnpm-workspace.yaml incluye apps/* y packages/*: las tres rutas documentales autorizadas quedan fuera. La [documentación oficial de Vercel](https://vercel.com/docs/monorepos#requirements) considera globales esos cambios y puede desplegar todas las aplicaciones, aun con Skip unaffected projects habilitado. apps/web/vercel.json solo excluye la rama cloud, no QA. El conector de lectura confirma que el último deployment sigue siendo el del correctivo, pero no expone una regla vigente que bloquee el despliegue de este push; el intento de ampliar esa lectura con la autenticación CLI existente recibió 403. No se cambiaron credenciales, reglas o ajustes para sortearlo.

Por ello el push se retiene hasta disponer de un mecanismo confirmado que evite despliegue automático. No se amplía el commit a un cuarto archivo ni se cambia configuración por inferencia. El SHA local final y la situación de push/Quality se entregan en el chat, sin introducir una autorreferencia de hash en el commit. El informe no afirma una comprobación remota que todavía no se haya realizado.
