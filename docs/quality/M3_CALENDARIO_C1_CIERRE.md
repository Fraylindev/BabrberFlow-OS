# M3 Calendario y reagendar — cierre técnico C1

Fecha: 2026-10-11. **C1 APROBADO CON CONDICIONES POR EL PROPIETARIO.** Condiciones cumplidas y probadas, registradas en §13. No se abre C2 ni se autoriza QA desplegada. [C0 aprobado](M3_CALENDARIO_C0.md), [contrato implementado](../../BACKEND_CHANGES.md). Autorización: solo backend/contrato, cinco endpoints §7, D8 fase 1 y pruebas desechables; sin commit ni push.

## 1. Base, aislamiento y alcance

Worktree de trabajo: C:/Users/Fraylin/.codex/worktrees/m3-calendario-c0/Kortek-Booking, rama ai/antigravity-qa, HEAD 202f90199fc21a12e058059ad8fc95dfcf33b4ed (cierre C0). Fetch autorizado completado y referencia remota verificada. El checkout principal conserva ai/reserva-invitado-ci, HEAD de3a062aba70157da5fbf1b569a73aecb0d04087 y el Playbook ajeno sin versionar. Se reutilizó el worktree que ya contenía la rama autorizada; no se descartó trabajo ni se movió el checkout principal.

Cambios de producto: registro de CalendarController/Service/Guard en BookingsModule, cinco rutas nuevas, DTOs, módulo puro de presentación. Pruebas nuevas de colisión, contrato, integración, compatibilidad y paridad; arneses reproducibles y evidencia local. Web solo añade un test de paridad; ninguna pantalla ni consumidor productivo cambia. Fuentes públicas, BookingsController/Service legacy, ProfessionalAvailabilityService, Prisma/migraciones, SQL de permisos, notification-templates, notification-producer, payloads sellados y dependencias permanecen idénticos a la base.

Clústeres PostgreSQL 18.1 nuevos, UUID por ejecución, escucha exclusivamente 127.0.0.1/puerto efímero. Roles independientes migrator/runtime; fixtures sintéticos; bloqueo de red no loopback y carga dotenv deshabilitada. No conexiones a bases reales, QA ni producción. No instalaciones: dependencias existentes reutilizadas mediante junctions. No worker ni envío de correo/proveedores; las pruebas verifican eventos y outbox transaccionales, no entrega real.

## 2. Contrato, permisos y privacidad

| Ruta | Contrato |
| --- | --- |
| GET /bookings/calendar | from/to civiles, fin exclusivo, 1–7 días; status/professionalId; limit predeterminado100/máximo200; cursor; intersección de intervalos y orden startTime/id |
| GET /bookings/:id | Detalle mínimo con revision |
| GET /bookings/:id/reschedule-availability-days | from/to inclusivos, desde hoy del negocio, máximo31; availableDates |
| GET /bookings/:id/reschedule-availability | date civil; slots con inicio/fin ISO autoritativos |
| PATCH /bookings/:id/reschedule | startTime con zona, expectedUpdatedAt y expectedRevision obligatorios; cambia solo inicio/fin |

Proyección de lecturas: id, startTime, endTime, status, updatedAt, revision, client:{name}, professional:{id,name}, service:{id,name}. Sin email/teléfono/clientId/notas/factura/pagos/importes. Calendar añade zona, rango civil/UTC, generatedAt y nextCursor. Disponibilidad añade bookingId/revisión/zona/rango. Comando devuelve IDs profesional/servicio ya autorizados, inicio/fin/estado/revisión; no clientId ni contacto. DTO global rechaza campos extra, incluidos exclusión arbitraria y cambios de profesional/servicio/cliente.

| Actor | Agenda/detalle | Días/slots/comando |
| --- | --- | --- |
| OWNER, ADMIN, RECEPTIONIST | Negocio autenticado; filtro profesional tenant-scoped | Permitido, precondición y política autoritativa |
| BARBER vinculado | Solo profesional propio; filtro ajeno404 | 403 |
| BARBER sin vínculo | Lista vacía; detalle404 | 403 |
| Sesión revocada/inválida | 401 mediante Membership vigente | 401 |
| Recurso de otro negocio / inexistente | Mismo404 y mensaje | Mismo404 para operadores autorizados |

No-store aplicado como middleware exclusivamente a las cinco rutas, también antes de Guards/errores. Lecturas RepeatableRead. Cursor HMAC ligado a actor/tenant/rol/profesional/zona/filtros/rango/límite, fingerprint temporal de toda la proyección; cambios concurrentes entre páginas exigen409 y reiniciar desde primera página, no omiten silenciosamente. Reutilización entre tenants o filtros devuelve400. Mensajes no revelan SQL/constraints; fallo de lectura es503, no disponibilidad vacía.

| Amenaza | Control / evidencia |
| --- | --- |
| IDOR /tenant o vínculo falsificado | Guards Membership, scope de cada consulta y404 uniforme; dos negocios/roles probados |
| Escritura obsoleta /ABA /carrera | Dos precondiciones +trigger existente +locks +exclusión; colisión y carreras reales |
| Excluir cita arbitraria pública | Sin DTO ni cambio de lector público; exclusión B2B tras autorización |
| Enumeración de contacto /PII /finanzas | Proyección explícita/no-store; respuesta mínima e Invoice/Payment preservados |
| Abuso del selector/comando | Límites civiles/DTO/buckets PG actor+tenant; dos procesos y dos instancias HTTP |
| Omisión silenciosa entre páginas | Fingerprint bajo snapshot +cursor ligado al contexto;409 y reinicio probado |

## 3. D5 — colisión y revisión compatible

La prueba real calendar-collision.integration.spec.ts hace dos updates Prisma consecutivos en una transacción: PENDING → CONFIRMED → PENDING. Ambos devuelven exactamente el mismo updatedAt: 2026-10-11T20:34:00.987Z en la ejecución final. **updatedAt no basta**, tampoco un hash de los valores finales por ABA. El contador existente Client.customerBookingRevision aumenta1→3 pese a volver al estado original. El log y metrics.json conservan las fechas exactas observadas.

Token aditivo opaco revision = m3. + SHA-256 de organizationId/bookingId/clientId/professionalId/serviceId/inicio/fin/estado/updatedAt/contador BIGINT decimal. El PATCH nuevo exige expectedUpdatedAt y expectedRevision; web deberá devolver ambos sin derivarlos. Relectura posterior al AFTER trigger garantiza token actualizado en la respuesta.

Se reutiliza Booking_customer_revision de la migración existente 20261003120000. INSERT/UPDATE/DELETE de Booking incrementan el contador de Client con todos los escritores, incluidos los dos APIs anteriores y SQL; no requiere que esos consumidores envíen el nuevo token. No se añade persistencia, columna, trigger ni DDL, y no se restaura una cuenta B2C. El contador por Client invalida conservadoramente otras citas del mismo cliente. Overflow de BIGINT aborta la escritura; no vuelve a cero. La matriz runtime impide al runtime desactivar triggers/alterar esquema y conserva ownership migrator.

Se prueban invalidación por reagendar legacy y cambio de estado, ABA, replay409 y dos operadores M3. También se ensaya explícitamente la ventana legacy de último escritor: dos operadores legacy reciben éxito y producen dos eventos, persiste el último inicio. Una escritura legacy posterior puede sobrescribir una operación M3 ya confirmada. Preservar esa ruta fue requisito; esta limitación no se declara resuelta.

## 4. Disponibilidad interna y regresión pública

Solo el lector B2B autenticado excluye la cita propia, tras comprobar tenant/rol/vínculo. No hay parámetro público de exclusión. Reutiliza política del negocio, rangos UTC, disponibilidad profesional y evaluador existentes, sin editar el lector público. Profesional ACTIVE y servicio activo; publicación/CMS privada no impide operación interna. Horario/zona confirmados requeridos. PENDING/CONFIRMED elegibles; COMPLETED/NO_SHOW/CANCELLED rechazan comando. Ocupación de todos los estados salvo CANCELLED se conserva.

Candidatos normales cada30 minutos más reloj contextual de la cita, incluidos segundos/milisegundos y exacto instante original cuando corresponde; solo se ofrecen futuros que satisfacen duración completa, turno, bloques/cierres y ocupación. El comando acepta exclusivamente un ISO ofrecido al reevaluar bajo locks. Hora ambigua/no existente no se fabrica; días23/25h, Lord Howe23.5/24.5h, medianoche desplazada y fecha omitida cubiertos. El calendario resuelve correctamente un límite civil exclusivo que cae en la fecha omitida de Apia.

Regresión propia compara lector público con cita propia ocupada, candidato contextual solo interno, cadencia30, slot ISO autoritativo y rechazo fuera de candidatos. Suite HTTP M1 existente, **sin cambiar fuente ni expectativas**, prueba rango31/32 civil, cinco roles iguales para público, dos tenants, exclusión de estados ocupados, cierres/bloques/duración completa, DST, límites públicos compartidos30/min y 35 concurrentes:30 admitidas/5 rechazos, snapshot coherente y fail-closed503. Resultado17/0/0, exit0. Límites públicos y GET/PATCH legacy intactos.

## 5. Carreras y atomicidad en PostgreSQL

No se simula la base. M3 toma locks existentes Organization → Client → Booking → Professional, relee precondiciones/política y mantiene exclusión PostgreSQL. Actualiza la cita y produce evento/outbox en la misma transacción.

| Carrera real | Aserciones |
| --- | --- |
| Dos operadores M3 con misma revisión | Exactamente un éxito y un evento; replay/stale409 |
| M3 vs alta pública al mismo destino | Exactamente un ganador; sin evento ni cliente residual del alta perdedora; si M3 pierde, origen intacto |
| M3 vs bloque profesional / cierre del negocio | Un ganador para estado conflictivo, horario no inválido; perdedor sin evento y origen intacto |
| Archivo de profesional vs mover cita histórica al futuro | Un ganador; no futuro válido con profesional archivado; sin evento del perdedor |
| Cambio de estado mientras M3 espera lock Organization | Escritor de estado real bajo transacción gana; M3 relee y rechaza revisión; inicio original y exactamente evento del estado |

Invoice/Payment, Client/preferencia, servicio/profesional y estado se comparan antes/después. Pruebas de negocio ajeno, BARBER ajeno/sin vínculo, Membership cambiado/revocado, desconocidos DTO y abuso incluidas. Las suites previas de integridad de citas9 y horario26 permanecen sin modificaciones y pasan.

## 6. D6 — presupuestos propuestos y dos procesos

No se modifican los presupuestos públicos. Se usa SecurityRateBucket/PostgresThrottlerStorage existente con clave HMAC actor+tenant y grupos independientes. Propuesta: calendario/detalle60/min; días y slots comparten30/min; comando10/min, bloqueo60s. Retry-After calculado por reloj PostgreSQL, entre1 y60. El error del contador cierra de forma segura por storage existente.

Tres ensayos con dos procesos Node independientes contra el mismo runtime prueban exactamente60/30/10 admitidas, exceso rechazado y Retry-After. Pruebas HTTP con dos instancias verifican lectura61, alternancia días/slots31 y comandos inválidos11; el exceso retorna429 sin cambios/eventos. El selector máximo31 días confirma31 resultados y termina dentro del timeout transaccional15000ms;32 se rechaza. Ensayo final: lectura80 intentos/60 admitidas/20 bloqueadas; disponibilidad40/30/10; escritura20/10/10. Retry-After observado60s. Selector31 días419.488ms <15000ms. Detalle por proceso en metrics.json. Son presupuestos locales propuestos, no SLA ni capacidad probada en varios hosts.

## 7. D7 — EXPLAIN e índices

Dataset reproducible:20000 citas de30min a cadencia1h repartidas en50 profesionales ACTIVE de un negocio sintético, ANALYZE Booking, rango civil de7 días con168 filas. EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) de la proyección ordenada, tenant y tenant+professional; después10 mediciones del servicio completo (incluye fingerprint para cursor), limit200. Umbral propuesto y aserción100ms; p95 de rango cercano sobre10 muestras = muestra10, no estadística de producción.

Planes íntegros y buffers en explain.json/log. Resultado final: tenant5.431ms/1240 shared hits, tenant+professional2.963ms/653 shared hits; p95 servicio42.914ms sobre10 muestras (24.329–42.914ms), inferior a100ms. Los índices/exclusión existentes bastan para esta carga local; **no se añade índice ni DDL**. No se afirma que un Sequential Scan sea defecto: se decide por medición. Memoria caliente/datos uniformes/local/PG18.1 limitan extrapolación; revisar D7 con distribución y carga real en gate autorizado si cambian volúmenes o latencias.

Prisma/schema/migraciones/constraints/matriz de permisos sin cambios.28 migraciones previas aplicadas y ledger capturado; runtime-gate exit0. Forward/reverse de migración C1: no aplicable porque no existe migración; se prueba igualmente API anterior en el mismo esquema y rollback de aplicaciones reteniendo reservas posteriores.

## 8. Compatibilidad §9 — cinco parejas por base

Fuentes exactas archivadas mediante git archive, compiladas localmente y ejecutadas con AppModule real, runtime y HTTP loopback. El cliente real apps/web/lib/api.ts de cada base se transpila con imports relativos y hace las solicitudes; no es una respuesta mock. Producto web C1 está intacto; solo añade test del formateador. Schema canónico LF de ambas bases: SHA-256 5406e5fb29a0d8ab0d24c8af863231f25a2bf9ea5b75499e802ea3c0f6f358a0, igual a C1;28 migraciones idénticas. Manifest/hash en evidencia.

Bases C0: API producción8e1501e89a132e1b01d3633b1b3f896a8cbe5800/web mismo SHA; API QA b318ca591d1ca6681269a6d25e29ca106d824df9/web523d993cfa0c797f356c224d5cc026d6c9ad4c7b. C1 significa fuente local base202f901 más diff sin commit.

| Fase | Pareja producción (fuentes) | Pareja QA (fuentes) | Esquema / resultado |
| --- | --- | --- | --- |
| 1 base | API8e1501e / web8e1501e | APIb318ca5 / web523d993 | C0; pasa |
| 2 migraciones | API8e1501e / web8e1501e | APIb318ca5 / web523d993 | C1=C0 sin DDL; pasa |
| 3 API | APIC1 / web8e1501e | APIC1 / web523d993 | C1; pasa |
| 4 web | APIC1 / webC1 (producto intacto) | APIC1 / webC1 (producto intacto) | C1; pasa |
| 5 rollback | API8e1501e / web8e1501e | APIb318ca5 / web523d993 | C1 y citas creadas por C1 conservadas; pasa |

Cada pareja verifica catálogo/disponibilidad/días públicos, reserva invitada201/PENDING, reserva interna/lista legacy, PATCH legacy a15:10 fuera de cadencia, cambio de estado/outbox y grants runtime. Fases3/4 además detalle y nuevo comando. Fase5 preserva citas CONFIRMED creadas/reagendadas por C1; no restaura snapshot. No se borran reservas para simular rollback. Los buckets sintéticos se limpian entre parejas solamente después de cerrar solicitudes/apps en el clúster propio; ensayos de abuso separados conservan conteos estrictos.

C0 declaró imágenes producción sha256:1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775 y QA sha256:8ba1b6c8a45391433998deeae1111d2d96c6cbf84932a7e9972cb6cf90e95eec. **No se ejecutaron ni verificaron esos binarios desplegados**, ni sus entornos. Este ensayo prueba fuentes fijadas y clientes HTTP, no navegador/QA visual ni compatibilidad binaria del artefacto remoto. Verificar procedencia de artefactos corresponde al gate de publicación autorizado. Sin migración, orden futuro conserva API→web; no hay primer paso DDL.

## 9. D8 fase 1

Nuevo módulo puro compartido business-time.presentation.ts, sin I/O, Prisma, side effects o dependencias nuevas, copia fiel del comportamiento actual de web. Vectores de paridad API/web: formatos de fecha/hora/fecha-hora, zona inválida, DST/hora ambigua/no existente, días23/25/23.5/24.5h y fecha civil omitida. Web test importa la fuente compartida y contrasta helper actual; no migra pantallas. No se tocaron notification-templates ni payloads sellados; demás consumidores API/correo quedan para fase2 con gate propio, como C0.

## 10. Comandos, resultados y evidencia

Entrada reproducible desde worktree, pnpm sin instalar dependencias:

~~~powershell
node apps/api/test/m3-validation-run.cjs
$env:M3_RUN_FULL_API='1'; $env:M3_ONLY_PUBLIC='0'
node apps/api/test/m3-postgres-run.cjs
~~~

El primer arnés ejecuta type-check/lint/build API y type-check:clean/lint/test/build web. Build web usa pnpm --config.verify-deps-before-run=false --filter web build --webpack. El build predeterminado Turbopack falló porque el junction de node_modules sale de la raíz del worktree; Webpack completó exit0 sin cambiar configuración ni dependencias. El intento fallido queda únicamente en el archivo local externo de ejecuciones anteriores; el build exitoso/log y final-checks.json identifican --webpack. No se presenta el intento Turbopack como exitoso.

Resultados finales y enlaces: [validaciones](evidence/m3-calendario-c1/final-checks.json), [métricas](evidence/m3-calendario-c1/metrics.json), [EXPLAIN íntegro](evidence/m3-calendario-c1/explain.json), [manifest de archivos](evidence/m3-calendario-c1/source-manifest.json). La ejecución de PostgreSQL final se identifica en esos archivos, con logs/JSON de Jest, ledger, versiones, permisos, compatibilidad y cleanup:true. Todos los comandos contados como validación terminaron exit0.

| Validación final | Resultado | Exit |
| --- | --- | --- |
| API type-check / lint / build | Los tres pasan |0 |
| API suite completa con flags de integración |920 pasadas /0 fallas /0 omitidas |0 |
| Integración C1 dedicada | Colisión1 + calendario27 + compatibilidad2 (10 parejas) |0 |
| Regresiones integridad / horario previas |9 +26 pasadas, sin omitidas |0 |
| Pública M1 HTTP existente |17 pasadas /0 fallas /0 omitidas |0 |
| Web type-check:clean / lint | Ambos pasan |0 |
| Web pruebas |159 unitarias +130 componentes, sin fallas |0 |
| Web build --webpack | Compilación, tipos y16 páginas |0 |
| Permisos runtime /28 migraciones previas /cleanup | Gate correcto, sin DDL C1, clúster eliminado |0 |

Ejecución final: [d8e52b185fee461c83cc96195d8439a3/run.json](evidence/m3-calendario-c1/postgres/d8e52b185fee461c83cc96195d8439a3/run.json). Las unitarias C1 están incluidas en la suite920, no se suman dos veces. La regresión pública de la misma ejecución también pasó17/0/0. Corrección de la afirmación de sanitización (revisión 2026-10-11): sanitize() se aplica a logs y al contenido JSON leído por results(), pero solo sustituye los valores exactos de los secretos admin/migrator/runtime generados por el arnés, JWT de tres segmentos cuyo primero empieza por eyJ, y URLs postgres:// o postgresql:// hasta un delimitador de espacio/comilla. No cubre URL HTTPS con userinfo, correos, ni Bearer no JWT. full-api.json conserva títulos de Jest: la URL sintética con credenciales procede del caso negativo cms.dto.spec.ts y el candidato Bearer de una frase del título guest-retirement.spec.ts, no de un token de autenticación registrado. La frase anterior sobre retirada completa de URLs era incorrecta. No se usó una conexión real; esta cobertura no garantiza sanitización universal.

Historia conservada: un fixture inicial profesional INACTIVE se corrigió a ACTIVE, sin cambiar producto/aserciones; preparación de20000 registros excedió timeout Jest5s, se acotó ese test a120s manteniendo umbral de consulta100ms; type/lint detectaron errores corregidos antes de validación final. No se añadieron retries, skips ni expectativas laxas. Las pruebas previas intactas se mantienen. Un bloqueo previo del auto-review por cuota se resolvió al continuar; no habilitó acceso a bases remotas.

## 11. Riesgos residuales y C2

| Riesgo / límite | Tratamiento |
| --- | --- |
| Legacy permite último escritor y estados históricos según contrato previo | Probado/documentado; una ruta legacy posterior puede sobrescribir M3. Requiere gate propio para cambiarla |
| Counter por Client invalida otras citas del mismo cliente | Rechazo conservador409; volver a leer antes de reintentar |
| Agenda no retiene snapshot entre páginas |409 y reinicio completo; C2 debe limpiar páginas previas |
| Rendimiento PG18.1/local,50 profesionales,20k citas uniformes | No extrapolar a PG/artefacto/carga remotos; medir en gate autorizado |
| Imágenes declaradas C0 no ejecutadas; cliente HTTP no UI | Procedencia y despliegue pendientes; QA funcional/visual real en C3 |
| Formateador compartido aún sin consumo productivo | C2 migrará solo calendario/lista/detalle/reagendar; correo aparte |

C2 requiere una autorización expresa de inicio pese a la aprobación condicionada del backend; permanece cerrado por instrucción del propietario. Su alcance previsto implementará agenda día/semana, filtros/paginación con reinicio409, detalle mínimo, selector compacto días/slots, retorno de ambos tokens y errores útiles400/401/403/404/409/429/503. Aislar estado/cache por usuario/tenant/rol/visita incluso A→B→A y respuestas tardías, mostrar zona/formato compartido e instante autoritativo. Probar móvil/desktop/accesibilidad/estados/permisos/dos tenants en navegador real; sin ampliar BARBER ni público. No se inicia C2 en esta entrega.

## 12. Estado Git y limpieza

Checkpoint local C1 autorizado posteriormente por el propietario, sin push. Base202f90199fc21a12e058059ad8fc95dfcf33b4ed; SHA del checkpoint en el relevo final. Staging por rutas explícitas y revisión completa del índice; [listado de archivos del checkpoint](evidence/m3-calendario-c1/checkpoint-files.txt). Checkout principal/Playbook ajeno intactos. git diff --check y controles de archivos/enlaces reportados en final-checks.json. Todos los clústeres propios detenidos/eliminados; archivos ignorados .tmp/m3-compat son fuentes archivadas locales reproducibles, sin bases ni credenciales. No se tocó main, QA, producción o proveedores. Entrega técnica para revisión, no cierre final M3.

## 13. Revisión aprobada con condiciones — 2026-10-11

El propietario aprobó C1 con condiciones y autorizó un commit local de checkpoint sin push; pidió expresamente no abrir C2. No se infiere autorización de frontend, despliegue o QA. Este apartado complementa las pruebas históricas de §10; los resultados de revisión están en [review-checks.json](evidence/m3-calendario-c1/review-checks.json).

1. **Mismo instante:** prueba HTTP real con startTime2099-01-01T13:10:00.000Z y equivalente2099-01-01T09:10:00.000-04:00. Ambos rechazan400, no-store, sin UPDATE de Booking/Client, mismos updatedAt/token/counter,0 eventos y delta outbox0. Es rechazo seguro del comando redundante, no un éxito que reemite correo. El presupuesto técnico de solicitudes sí se consume; no forma parte de la revisión de la cita. No cambió código productivo: ya normalizaba ISO y comparaba el instante antes de escribir.
2. **Dependencia migración28:** Booking_customer_revision, customer_booking_revision() y Client.customerBookingRevision son ahora dependencias funcionales M3, no restos B2C prescindibles. [Plan de limpieza actualizado](MIGRACION_28_PLAN_LIMPIEZA.md), enlazado en los planes de reserva invitada. Prohibido retirarlos/deshabilitarlos/reiniciar contador durante una limpieza mientras M3 dependa de ellos; una sustitución requiere gate propio, todos los escritores, transición/rollback probados y aprobación. SQL/migración histórica/ledger/grants productivos intactos.
3. **Control negativo real:** en clúster UUID desechable se extrae pg_get_triggerdef, se elimina solo el trigger y se ejecuta exactamente calendar-collision.integration.spec.ts. Debe fallar exit1: dos timestamps iguales, counter0→0, Expected2n/Received0n. La definición se restaura en finally y se comprueba habilitada; después positivo y suites deben pasar. El primer intento ya mostró el fallo correcto, pero --json de Jest falló al serializar BigInt; ese log queda en el archivo local externo de ejecuciones anteriores; se corrigió únicamente la salida negativa a log/summary y se repitió. No retries ni cambios de aserciones. El exit1 esperado no se cuenta como suite positiva aprobada; el arnés exige esa falla exacta y termina exit0 cuando pasa todo el ensayo.
4. **C3 pendiente obligatorio:** incluirá un reagendado real en QA por una sesión autorizada, con el worker QA consumiendo el evento/outbox de esa misma cita. Capturar origen/destino/estado/revisión, único BookingEmailEvent y su outbox, identidad/SHA del worker y evidencia del consumo/estado terminal. Distinguir consumo/aceptación del proveedor de entrega efectiva de correo; flags, heartbeat o un registro producido no acreditan consumo ni entrega. Probar además intento redundante sin nuevos eventos/correo y preservar datos financieros. Caso pendiente de autorización C3 y despliegue coordinado; no se ejecutó en C1 ni se tocó QA/producción.
5. **Checkpoint:** incluir implementación C1, contrato, pruebas, evidencias sanitizadas y enmiendas del plan. Un único commit local en ai/antigravity-qa; no push. El SHA y listado exacto se entregan al propietario; C2 permanece cerrado.

Registro histórico de la aprobación anterior (916 pruebas; sustituido como evidencia final por §14): mismo instante HTTP400/400, revisión intacta,0 eventos/delta outbox0; control sin trigger exit1 esperado con counter0→0, restauración habilitada, positivo1/0/0; integración M3 27/0/0; API completa916/0/0; regresión pública17/0/0; tipos y lint exit0. Arnés completo exit0 y cleanup:true. Pruebas, build y checks web/API previos de §10 siguen aplicando porque no cambió código productivo; solo se añadieron pruebas/arnés/documentación. C1 queda aprobado con las condiciones verificadas; C2 permanece cerrado.


## 14. Pendientes de revisión atendidos — 2026-10-11, sin push

El log de CalendarService.read() registra únicamente un nombre de tipo conocido (Error, tipos nativos permitidos o tipos Prisma permitidos). Nombres personalizados se sustituyen por Error y valores no Error por NonError. No registra mensaje, stack, SQL, identificadores, contexto autenticado ni datos de la reserva. Los HttpException esperados se propagan sin ese log. Cuatro casos de regresión adicionales prueban el filtrado y la conservación de HTTP; API tipos/lint/build exit0, suite completa920/0/0 y regresión pública17/0/0 exit0. La regresión web existente de Reservas F0B.test.tsx pasó11/11 exit0, sin cambios de frontend.

Lectura remota autorizada del entorno efectivo mediante podman exec/node, sin mostrar valores: QA RATE_LIMIT_SECRET=96 caracteres y JWT_SECRET=96; producción 64 y 64. En ambos se selecciona RATE_LIMIT_SECRET y se cumple el mínimo32 de sign(). No prueba entropía, rotación ni calidad criptográfica. Sin cambios de variables, procesos, despliegues o bases. Evidencia: [longitudes](evidence/m3-calendario-c1/review-final/runtime-secret-lengths.json).

BARBER no ve Reprogramar en Reservas: BookingActions exige !isBarber, igual que antes de C2. Ya podía confirmar PENDING, completar CONFIRMED y marcar NO_SHOW; no cancelar ni reagendar. M3 ofrece agenda/detalle propio de lectura; sus rutas de disponibilidad y comando solo admiten OWNER/ADMIN/RECEPTIONIST. No se amplía BARBER.

Se conserva únicamente la ejecución PostgreSQL final y sus métricas derivadas, incluyendo el control negativo esperado exit1 con trigger ausente, restauración y positivos exit0. Las ejecuciones anteriores se archivaron fuera del repositorio en un ZIP local; no se borran del historial Git ni se reescriben los checkpoints. Las validaciones finales web ya aprobadas permanecen porque el frontend no cambia. Este correctivo queda IMPLEMENTADO / VALIDADO LOCALMENTE / EN REVISIÓN; con un único commit local del correctivo autorizado sobre baba8b5, sin push ni apertura de C3; SHA en la entrega.

Contraste del informe: BACKEND_CHANGES.md892/896 y CHANGELOG.md255/292 del blob C1 da77c88 coinciden exactamente en el historial de ambas ramas remotas tras fetch. [Prueba redactada con commits y blobs](evidence/m3-calendario-c1/review-final/four-lines-remote-proof.json). La numeración CHANGELOG corresponde al checkpoint C1 y cambió en C2.

La lectura autorizada por hashes confirma claves distintas en QA y en producción. [Prueba SHA-256 sin valores](evidence/m3-calendario-c1/review-final/runtime-secret-hash-comparison.json). [Informe de clasificación completo](CLASIFICACION_M3_REVISION.md).


## 15. Plan C3 por gates propios — propuesto, no autorizado para ejecución

Esta autorización permite solo completar el informe y hacer un commit local del correctivo. C3 no se abre ni se ejecuta. Cada punto requiere la autorización propia indicada; el resultado de una prueba o un commit no sustituye ese permiso.

1. **Integración local primero.** Autorizar expresamente web C2 contra el API real C1 sobre PostgreSQL desechable, con identidades/datos controlados y red restringida. Usar los cinco endpoints reales, sin sustituir respuestas por transporte simulado. Probar agenda día/semana, filtros/cursor y reinicio409, detalle mínimo, disponibilidad por fecha, caché30/min y comando que devuelve intactos expectedUpdatedAt/expectedRevision recibidos. Verificar aislamiento por usuario/negocio/rol/visita, A→B→A, respuestas tardías, slots obsoletos, mismo instante sin efectos, permisos BARBER y errores400/401/403/404/409/429/503; navegador real móvil/escritorio, consola y accesibilidad. Registrar qué parte de autenticación es controlada localmente y cuál requiere proveedor en QA. Salida: evidencia contra API real y aprobación del propietario antes del siguiente gate.
2. **Preparar QA.** Con permiso separado para lecturas QA, identificar candidato y pareja actual API/web, worker, esquema, trigger Booking_customer_revision y su función/contador, permisos runtime y entorno de autenticación. Definir respaldo/rollback y datos de prueba controlados. No asumir que QA contiene C1 por estar publicada la web. Si falta una dependencia de migración28, detenerse y pedir gate de remediación antes de mutaciones. Sin cambios de producción.
3. **Publicación y activación coordinada en QA.** Requiere autorización explícita independiente para commit/publicación del candidato, despliegues y eventuales acciones de esquema. Usar una pareja API/web del mismo SHA; esquema compatible primero (C1 no añade DDL), después API y después web. Evitar push aislado a ai/antigravity-qa que active web antes del API. Verificar releases y disponer de rollback de la pareja anterior. Este plan no autoriza push, PR, merge ni despliegue.
4. **QA funcional y visual.** Autorizar escrituras únicamente sobre datos y organizaciones de prueba definidos en QA. Ejecutar flujo real con roles/negocios distintos, móvil/escritorio, errores y conflictos, sin ampliar BARBER ni público. Comprobar origen intacto y ausencia de eventos del perdedor. Guardar evidencia sin PII ni secretos; las pruebas locales de carreras no prueban por sí solas QA desplegada.
5. **Reagendado real y worker.** Autorizar expresamente un reagendado de una cita controlada en QA y la observación del evento, outbox y worker efectivo consumiéndolo. Verificar correlación mínima, unicidad, ausencia de evento/correo al mismo instante y ausencia de duplicados. Cualquier envío a proveedor o destinatario de prueba requiere autorización explícita del canal y destino. Separar evento producido, evento consumido, aceptación del proveedor y entrega: ninguna bandera ni heartbeat demuestra entrega. No cambiar flags, canales, destinatarios, claves o servicios por inferencia.
6. **Cierre del propietario.** Entregar matriz de resultados, versiones, rollback disponible o probado, riesgos residuales y pruebas no verificadas; obtener aprobación explícita de C3. Producción y promoción posterior requieren gate separado. No presentar el checkpoint local como cierre de M3 ni como autorización de publicación.


## 16. Autorización posterior exclusiva C3 gate1 — 2026-10-11

El propietario autoriza integración local web C2/API C1 real en PostgreSQL desechable y SHA local. [Cierre gate1, evidencia y límites](M3_CALENDARIO_C3_GATE1_CIERRE.md):13 escenarios y138 solicitudes, sin cambios de producto, QA, proveedores, bases reales o push. Gates2–6 permanecen sin autorización. Hallazgo real de Retry-After no expuesto por CORS, documentado para gate propio.15 imágenes OCR inciertas excluidas de cualquier árbol candidato mediante manifiesto/gate, con historial anterior preservado.
