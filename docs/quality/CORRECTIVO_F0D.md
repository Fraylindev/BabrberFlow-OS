# Correctivo F0-D — fechas relativas e invitaciones

Trabajo iniciado: 2026-09-30; validación final: 2026-10-01 (America/Santo_Domingo). Base: `666516f2ebf56e9620a0da3bfebe9c0496b4de7f`, rama `ai/antigravity-qa`, árbol inicial limpio.

Publicación posterior autorizada el 2026-10-01: el propietario pidió **«haz commit, push y despliegue. reportame y dime que validar en qa»**. Ejecutada exclusivamente en origin/ai/antigravity-qa y API/worker/Preview QA desde el commit de código `92f61274dcb733e0e43f14a45851c0da346430c2`. El resultado operativo y los recorridos pendientes constan al final. Las secciones anteriores conservan la historia de las etapas sin publicación. Esta autorización no aprueba el QA final.

**PUBLICADO Y DESPLEGADO EN QA / EN REVISIÓN; BACKENDS 2A Y 1A APROBADOS, LIMITACIÓN 3A ACEPTADA.** El propietario confirmó después que el correo recibido estaba en spam. Se conserva la UI honesta sin señal automática de aceptación del mensaje. Producción, .env, flags, proveedores, permisos, aceptación, migraciones y datos existentes permanecen intactos. La publicación no equivale a cierre global, aprobación de toda la interfaz o QA funcional autenticada del nuevo despliegue. La indicación del propietario sobre pruebas satisfactorias de F0-C es contexto; este informe no aprueba retrospectivamente otros gates.

## Brief y criterios

Usuarios: personal dentro de su alcance vigente (OWNER/ADMIN/RECEPTIONIST/BARBER) y visitante público. Problema: fechas con estilos distintos y zona del dispositivo, más un texto de envío no sustentado. Resultado: lectura compacta y consistente de fechas en zona del negocio, instante completo en HTML y fecha completa accesible; invitaciones sin promesa de envío/entrega inventada. No se amplían datos visibles, roles ni PII. Estados remotos existentes y botón Reenviar se conservan. Si falta zona, mostrar fecha no disponible en vez de convertir con el dispositivo. Responsive y teclado deben conservarse.

Criterios de fecha: Hoy/Ayer/Mañana calculados con días civiles del negocio; otros días `26 sept, 6:24 p. m.`; año únicamente distinto al año actual del negocio; reloj de 12 horas y texto completo en title; actualizar una pantalla abierta al pasar medianoche y al regresar de suspensión. Las fechas civiles y horarios semanales no se convierten en instantes ficticios.

## 1. Causa y correctivo de fechas

Evidencia base: `business-time.ts` usaba `dateStyle: medium/timeStyle: short`; Facturación añadía semana y año siempre; Equipo y Clientes omitían timeZone; Resumen tenía una implementación adicional; disponibilidad y Notificaciones otras dos. Los componentes no compartían semántica time. El mismo instante podía aparecer con fecha/estilo distinto según pantalla o dispositivo.

Correctivo mínimo de presentación: `formatBusinessTime` en `apps/web/lib/business-time.ts`, con delegados compatibles y reloj local de presentación; `BusinessTime` aplica `<time datetime>` y title absoluto completo. Una suscripción compartida actualiza cada minuto y al recuperar visibilidad, y se desmonta al desaparecer la última fecha. Consultas de zona de Equipo/Clientes reutilizan el contrato `/organizations/mine` y la query tenant/actor/rol existente. No cambian API, persistencia ni consultas de negocio.

Riesgos: «hoy» depende del reloj del dispositivo para el instante actual, pero nunca de su zona; un reloj incorrecto no queda resuelto por este correctivo. No existe contrato de reloj del servidor común. Los campos civiles carecen de hora: no se les atribuye medianoche. Público conservó inicialmente la excepción de zona; 2A y su backend aprobado permiten ahora usar el mismo criterio relativo.

### Inventario de superficies

| Superficie | Fechas/horas existentes | Tratamiento F0-D |
| --- | --- | --- |
| Reservas desktop/móvil y reagendar | startTime, endTime | BusinessTime, zona de `/organizations/mine`, ambos instantes completos |
| Facturación desktop/móvil | cita, issuedAt, paidAt | BusinessTime, mismo formateador y zona autorizada |
| Equipo/invitaciones | createdAt, expiresAt | BusinessTime y etiquetas Creada / Vence el; estado separado |
| Miembros de Equipo | sin fecha visible | no se agregan campos |
| Clientes/detalle | createdAt, updatedAt según proyección/rol | BusinessTime; misma condición showNotes, sin ampliar BARBER |
| Resumen | generatedAt y agenda startTime | BusinessTime con timeZone del resumen autorizado |
| Notificaciones globales/por reserva | createdAt | BusinessTime; estados de EmailOutbox intactos |
| Perfil propio/Profesionales | bloqueos startTime/endTime en disponibilidad | BusinessTime con zona de disponibilidad; perfil no mostraba createdAt/updatedAt |
| Horario/cierres e impacto | bloqueos startTime/endTime; cierres startDate/endDate | BusinessTime; fechas civiles preservadas sin hora inventada |
| Semana operativa/CMS y horarios de cierre | HH:mm y límite 24:00 | política de reloj común; 24:00 conserva «final del día» |
| Reserva pública/éxito | booking.startTime y timeZone aprobado 2A | BusinessTime con relativos y año del negocio; instante completo y fecha accesible |
| Confirmación pública/slots | startTime autoritativo del slot; fecha civil y HH:mm de disponibilidad | confirmación usa BusinessTime y zona 2A; botones conservan reloj común e instante completo, control de fecha nativo intacto |
| Formularios/filtros/editores de promociones | date/datetime-local y valores HH:mm | controles editables nativos conservados; no son etiquetas de instantes ni se reemplazan por texto relativo |
| DateTimePicker legacy | formatos del dispositivo | componente sin consumidores según inventario Git; no se activa ni rediseña el selector en este correctivo |
| Plantillas aprobadas de correo | `apps/api/src/notifications`, contenido sellado y zona del negocio | excepción solicitada: intactas; tampoco se edita plantilla Clerk |
| Contratos/transportes | ISO, fechas civiles, parámetros y formato de errores cerrado | intactos: no convertir payloads, slots, filtros o mensajes de correo |

**Límite público de la primera etapa:** el contrato H5 no exponía Organization.timeZone en booking-data. Fecha/hora civil y el instante de slot no identifican de manera única una zona IANA, y no permiten decidir «hoy» en fechas arbitrarias/DST sin inventarla. Se detuvieron ese requisito relativo y la omisión del año corriente público. Opciones: A) aprobar campo público timeZone, mantenido dentro de la capa técnica, y consumirlo; B) aprobar referencia de día del negocio/servidor con revalidación al cambiar de día. El propietario eligió explícitamente **2A** el 2026-10-01; véase la continuación debajo. No aprobó la decisión 1 sobre siete días.

## 2a. Diagnóstico inicial de correo de invitaciones

Actualización posterior: el propietario encontró el mensaje en spam y eligió 3A; véase la última sección. Los límites de la lectura técnica inicial se conservan como evidencia histórica, no como afirmación vigente de que el mensaje no llegó.

`TeamInvitationsService.createClerkInvitation` llama a Clerk `invitations.createInvitation` con `notify: true`, `expiresInDays`, ignoreExisting y redirectUrl controlada. No usa Resend, EmailOutbox, worker ni NOTIFICATIONS_EMAIL_ENABLED. PENDING se escribe después de esperar la respuesta; el fallo lanza 503/429 seguro y queda FAILED. Las pruebas vigentes cubren fallo y generación/concurrencia.

Lectura real remota desde el contenedor **kortek-api-staging**, con comprobación DEPLOY_ENV y proyecto QA `prirlabbnlcuvnzuaczp`, transacción PostgreSQL READ ONLY y consultas GET de Clerk (sin GET del listado aplicativo, que escribe expiraciones): release igual a la base, Resend flag `true`, clave Clerk Development. Una fila local PENDING y la invitación Clerk correspondiente `pending`, respuesta HTTP 200. No hay TTL de dos minutos en esa fila. Evidencia sin correo, UUID de invitación, ticket, cookies, claves o cuerpo: `.tmp/f0d/qa-diagnostic.json` (ignorado).

La respuesta de invitación no acredita aceptación por ESP ni entrega. No se consultó la bandeja del destinatario. Chrome bloqueó la lectura de la sesión QA por una UI de extensión abierta; no se cerró ni manipuló esa UI ajena. No se atribuye la no recepción a flag apagado, simulación, cuota o fallo sin una señal adicional.

Clerk documenta `notify`/expiración en días y creación de invitaciones en [createInvitation](https://clerk.com/docs/reference/backend/invitations/create-invitation); [Development](https://clerk.com/docs/guides/development/testing/test-emails-and-phones) admite supresión de otras notificaciones al agotar cuota, y [plantillas](https://clerk.com/docs/guides/customizing-clerk/email-sms-templates) permite desactivar Delivered by Clerk por plantilla. Son posibilidades, **no causa probada en QA**. No se modifica ninguna de esas opciones.

## 2b. Estado honesto

Causa probada: Equipo imprimía incondicionalmente «Enviada createdAt», incluso FAILED/CREATING/EXPIRED, y los toasts afirmaban envío al resolver la operación. createdAt solo acredita creación local; PENDING solo acredita invitación pendiente después de respuesta Clerk.

Correctivo frontend compatible: «Creada», FAILED «No se pudo completar la acción», PENDING «La entrega del correo no está confirmada», toasts de solicitud procesada y Reenviar existente. FAILED también representa fallos de revocación/reenvío: no permite afirmar siempre «No se pudo enviar». No se muestra «Enviada» sin señal de correo. No se afirma «Correo desactivado en este entorno» a partir del flag de Resend.

**Contrato inicialmente detenido; limitación aceptada después mediante 3A:** los campos aprobados de TeamInvitation no contienen mailStatus/acceptedAt por ESP, envío desactivado o identificador de mensaje. Para implementar los tres estados pedidos con certeza se necesitaría una señal aditiva de envío separada de los estados de aceptación. Opción A inicial: campo de resultado de correo confirmado por Clerk/ESP cuando el proveedor lo exponga; B inicial: mantener pendiente/entrega no confirmada y diagnóstico del proveedor fuera de la respuesta mientras no haya señal. El propietario acepta este último resultado ya implementado mediante la decisión 3A posterior. No se reutiliza acceptedAt de invitación, updatedAt ni PENDING como entrega. Riesgo residual aceptado para QA: la UI explica incertidumbre, pero no puede identificar una supresión o aceptación ESP sin contrato/datos nuevos.

## 2c. Expiración y siete días

Causa del TTL de dos minutos **no reproducida**. La fila QA fue creada `2026-10-01T02:47:38.852Z`, actualizada `2026-10-01T02:49:49.288Z`, vence `2026-10-31T02:49:49.288Z`. En Santo Domingo: 30 septiembre 22:47, actualización 22:49, vencimiento 30 octubre 22:49. Diferencia creación/vencimiento: 720,036 h; actualización/vencimiento: 720 h. Esa actualización es compatible con reenvío, pero updatedAt por sí solo no prueba su causa.

Código en la base HEAD auditada: expiresAt multiplica días por `24*60*60*1000`; CreateTeamInvitationDto admite 1..30 y tenía default 30; create usaba dto/default 30; resend fijaba 30. No hay configuración TTL de minutos. La UI ya consumía expiresAt, no createdAt, para vencer; el error demostrado era el texto de envío independiente del estado.

**Detenido inicialmente por contrato aprobado**: BACKEND_CHANGES §2026-08-21/A0.4 fijaba explícitamente default 30 días y rango 1..30. Sustituir default/reenvío por 7 días cambia comportamiento contractual, aunque no exija migración. El propietario autorizó luego **1A**, resolviendo este bloqueo de contrato; implementación en la última sección. Opciones presentadas originalmente:

1. **Recomendada:** default 7 al crear y 7 al reenviar; preservar entrada explícita 1..30 para compatibilidad. Actualizar DTO, fallback de create y constante de resend, contrato y regresiones; sin migrar invitaciones existentes ni cambiar aceptación/permisos.
2. Siempre 7: retirar/restringir expiresInDays; modifica además validación/compatibilidad y requiere aprobación específica.
3. Enviar expiresInDays=7 desde web usa contrato actual para creación, pero no resuelve resend (30); no se aplica como sustituto parcial.

Prueba prevista tras autorización: fijar reloj en creación/reenvío, comprobar payload Clerk expiresInDays=7 y expiresAt exactamente +604800000 ms, que una invitación sigue válida a los dos minutos y vence en el límite exacto de siete días, fallo Clerk sin PENDING y concurrencia/generación intactas. Las expectativas nuevas fallaron antes del cambio y pasaron con 1A (resultados abajo). Riesgo: invitaciones ya emitidas conservan el plazo existente; reenviar revoca la anterior como hoy.

## Validación y continuación

Regresión de formato contra el código anterior: `pnpm --filter web exec node --test lib/business-time-format.test.ts` terminó 1 (3 casos fallidos); después terminó 0 (3 casos aprobados). Casos incluyen hoy, ayer, mañana, dos días atrás, otro año, año/medianoche del negocio, Asia/Tokyo y Pacific/Honolulu como dispositivo, DST, 12 a. m./p. m. Componentes añaden semántica y actualización al volver a la pestaña. Las regresiones que exigen contrato permanecen sin implementar: no se declara que pasaron.

Regresión visual del estado: el harness de Chrome renderizó primero Equipo desde HEAD (lectura `git show`, sin sobrescribir el árbol); la aserción que prohíbe «Enviada» en FAILED terminó 1. La versión corregida pasó esa misma aserción, además de PENDING sin promesa de envío, vencimiento separado y Reenviar visible. Las pruebas de componente permanentes comprueban también la presentación «Vence el 7 oct, 6:24 p. m.» con fecha completa y exclusión BARBER; la fecha es una entrada de prueba, no una emisión real de siete días.

Resultados de la primera etapa; los logs web se repitieron y actualizaron al integrar 2A (resultados vigentes en la sección final):

| Comando | Resultado real | Evidencia local ignorada |
| --- | --- | --- |
| `pnpm --filter web type-check:clean` | exit 0, regeneración limpia y tsc | `.tmp/f0d/web-types.log` |
| `pnpm --filter web lint` | exit 0, sin warnings | `.tmp/f0d/web-lint.log` |
| `pnpm --filter web test` | exit 0, 149 pruebas Node + 94 de componentes (243) | `.tmp/f0d/web-tests.log` |
| `pnpm --filter web build` | exit 0, Next build y prerender | `.tmp/f0d/web-build.log` |
| `pnpm --filter api exec jest --runInBand src/auth/team-invitations.service.spec.ts` | exit 0, 11 pruebas | `.tmp/f0d/api-invitations.log` |
| `node .tmp/f0d/browser.mjs --baseline` | exit 1 esperado, HEAD anuncia Enviada para FAILED | `.tmp/f0d/browser-red.log` |
| `node .tmp/f0d/browser.mjs` | exit 0, 20 comprobaciones/superficies en dos anchos | `.tmp/f0d/browser-green.log`, `browser-results.json` |
| `git diff --check` | exit 0 | revisión final del árbol |

El primer pnpm en sandbox falló por lectura de config/dependencias; se usó escalación para comandos locales autorizados, sin instalaciones. Primer lint terminó 0 con un warning de parámetro heredado, corregido después. Expectativas antiguas de mes largo y botones HH:mm fallaron con la nueva presentación; se actualizaron verificando title/datetime y preservando la cobertura de zona, payload civil y estado PENDING. La primera regeneración de tipos encontró DEPLOY_ENV ausente: tipos/build se ejecutaron luego con marcadores locales de proceso (development, API localhost y claves sintéticas), sin escribir .env ni contactar proveedores. Un intento de navegador quedó esperando bootstrap con el reloj artificial pausado; se reanudó el reloj del harness antes del cambio de rol, sin cambiar código de producto, y la repetición terminó 0.

QA local de navegador utiliza código real de las pantallas y DashboardLayout/CSS, con transportes, identidad y reloj controlados; no acredita sesión Clerk, envío real ni integración nueva en QA desplegada. Dispositivo Asia/Tokyo y negocio America/Santo_Domingo, 375/1280 px: Equipo, Reservas, Facturación, Clientes, Notificaciones, Resumen, disponibilidad y éxito público; semántica time, fecha completa, ausencia de desbordamiento horizontal y consola; paso de medianoche y restricción BARBER. Capturas y resultados: `.tmp/f0d/*-{375,1280}.png`, `browser-results.json` (ignorados). Safari físico y revisión del propietario pendientes.

En la primera etapa, API sin modificaciones. Se ejecutaron adicionalmente las 11 pruebas existentes de `team-invitations.service.spec.ts`, exit 0; no sustituían los cuatro gates API de una modificación posterior. No se agregan migraciones ni pruebas de siete días como si el contrato estuviera autorizado.

Estado Git al terminar la primera etapa: rama `ai/antigravity-qa`, HEAD igual a la base `666516f2ebf56e9620a0da3bfebe9c0496b4de7f`; 26 archivos rastreados modificados y 5 nuevos, todos sin staging. Áreas: presentación web/auxiliares, regresiones de fecha/Equipo y cuatro documentos de control (este informe, PROJECT_MASTER, CHANGELOG y docs/README). Índice vacío; sin commit, push ni despliegue. Árbol inicial limpio y cambios exclusivos del correctivo. BACKEND_CHANGES conservaba entonces el contrato aprobado intacto. No se comparan SHA remoto ni estado productivo como si se hubiera publicado: no hubo operación de publicación ni acceso a producción en esta tarea.

Siguiente gate de la primera etapa: decisiones expresas de contrato, backend mínimo con rojo/verde y cuatro gates API, y aprobación backend antes de integrarlo. QA remota sigue sin despliegue nuevo. No se declara F0-D cerrado, aprobado ni candidato final.

## Continuación 2026-10-01 — decisión 2A

Autorización exacta del propietario: «2A», en respuesta a agregar timeZone como campo técnico de booking-data para calcular Hoy/Ayer/Mañana y el año del negocio. Después de presentar los cuatro gates API y preguntar por aprobación del backend e integración frontend, respondió **«Aprobado» el 2026-10-01**. **BACKEND 2A APROBADO / INTEGRACIÓN FRONTEND AUTORIZADA.** En esa etapa, siete días seguía sin decisión; después eligió 1A. La señal de correo continúa sin evidencia suficiente.

Brief: visitante público de un negocio activo/publicado; necesita leer una fecha relativa respecto al día y año de ese negocio aunque el dispositivo esté en otra región. El flujo y sus estados permanecen iguales. La zona no aparece como texto en la UI; el formato común la usará solo técnicamente después de aprobar backend. Fechas civiles, startTime de slots y POST de aceptación/reserva no cambian. Se mantiene español, semántica time, responsive y la proyección mínima.

Contrato 2A: `GET /public/:slug/booking-data` añade en la raíz `timeZone: string`, zona IANA válida procedente de la organización resuelta por slug, la misma usada para minimumBookingDate. Clientes anteriores pueden ignorarla. El campo no se acepta como selector de tenant ni como edición. No se añade zona en organization, availability, POST ni CMS público. No se retorna UUID de Organization, correo, nombre/telefono operativo privado, borrador o notas. Publicación, flag de cierre, límites de consulta y no-store siguen vigentes. Zona inválida conserva 503 genérico sin devolver el valor.

Threat model: atacante anónimo controla slug, query y headers; no puede elegir una zona distinta mediante timeZone ni x-organization-id. Proyección explícita de un solo campo ya validado, consultas de catálogo aisladas al tenant publicado y 404 neutro para retirado/inactivo/borrado/inexistente. La zona identifica una región amplia y su exposición técnica fue autorizada; ningún dato de contacto privado adicional resulta necesario. No hay escrituras, migraciones o proveedor externo. Rollback: retirar el campo aditivo antes de integrar frontend; posteriormente coordinar retirada del consumo y campo. Ningún dato requiere reparación.

Aceptación backend: respuesta serializada con timeZone autoritativo y fecha mínima consistente en el borde UTC/local; A → B → A con zonas distintas no mezcla tenants ni acepta override externo; allowlist pública exacta, datos privados ausentes, no-store y errores sin filtración; una prueba roja antes del cambio y verde después. Ejecutar tipos/lint/test/build API completos. Garantía modificada: proyección determinista, sin nueva invariante PostgreSQL; HTTP Nest real con persistencia controlada complementa unitarias, sin conectar bases.

Implementación mínima: una línea en `apps/api/src/public-booking/public-booking.service.ts` proyecta timeZone después del resolvedor/validación existentes. No cambia ninguna consulta, guard, estado, timeout o transacción. Regresiones en `public-booking.service.spec.ts` y `whatsapp-contract.spec.ts`: mismo instante cercano a medianoche con tres zonas, campo raíz y fecha mínima consistente; HTTP con allowlist exacta, A → B → A y override timeZone=UTC ignorado; zona inválida 503 sin valor ni consultas de catálogo. Se mantienen casos de cierre/publicación/404 y POST PENDING sin PII.

| Comando de esta continuación | Resultado real | Evidencia local ignorada |
| --- | --- | --- |
| `pnpm --filter api exec jest --runInBand src/public-booking/public-booking.service.spec.ts src/public-booking/whatsapp-contract.spec.ts` antes del cambio | exit 1; 5 fallos por timeZone ausente, 35 pasan | `.tmp/f0d/api-zone-red.log` |
| Mismo comando después del cambio | exit 0; 40 pasan | `.tmp/f0d/api-zone-green.log` |
| `pnpm --filter api exec tsc --noEmit` | exit 0 | `.tmp/f0d/api-types.log` |
| `pnpm --filter api lint` | exit 0, sin warnings | `.tmp/f0d/api-lint.log` |
| `pnpm --filter api test -- --runInBand` | exit 0; 60 suites/767 pruebas pasan, 3 suites/37 pruebas omitidas por gates opt-in existentes | `.tmp/f0d/api-tests.log` |
| `pnpm --filter api build` | exit 0 | `.tmp/f0d/api-build.log` |
| `git diff --check` | exit 0 | revisión del diff API/documental |

No se ejecuta integración con PostgreSQL ni Prisma: no cambió la selección autoritativa ni persistencia/invariante; el HTTP Nest real usa dobles de persistencia y cubre la proyección y los errores. No se conectó QA/producción ni proveedor en esta continuación. Las 37 omitidas no se cuentan como aprobadas. Los resultados web de arriba corresponden al código web conservado de la primera etapa: no hay nuevos cambios web ni consumo de timeZone, así que no se repiten esos gates como si hubiera integración pública.

Estado final de esta continuación: `ai/antigravity-qa`, HEAD/base `666516f2ebf56e9620a0da3bfebe9c0496b4de7f`, 33 archivos rastreados modificados y 5 nuevos, índice vacío; sin staging, commit, push o despliegue. Además de lo anterior: tres archivos API y contratos/arquitectura/flujos actualizados, con H5 histórico distinguido de la extensión autorizada. Ningún .env, dependencia, migración, dato, permiso o proveedor cambia.

Riesgo residual de backend 2A: zona técnica ahora expuesta anónimamente según autorización; clientes previos pueden ignorarla. No acredita QA desplegada ni la interfaz relativa antes de validarla. El siguiente gate recibió aprobación explícita; la integración y sus pruebas se registran debajo. F0-D permanece incompleto por decisión 1 y evidencia de correo.

## Integración frontend 2A — 2026-10-01

Estado: **BACKEND 2A APROBADO / FRONTEND INTEGRADO LOCALMENTE, EN REVISIÓN**. La respuesta «Aprobado» autoriza esta integración; no autoriza siete días, nuevos estados de correo ni publicación. Se conservó el resto del árbol del correctivo.

`PublicBookingData` tipa el campo timeZone aprobado. PublicMiniSite lo entrega a SuccessView y a StepRouter/ConfirmStep; este último recibe también selectedStartTime. Confirmación usa el instante del slot; éxito usa booking.startTime del resultado. Ambos usan BusinessTime con la zona autoritativa para decidir relativos/año y exponer time/title completos; ya no reconstruyen una fecha desde texto local. No se añade timeZone al POST ni cambia startTime. Caché sigue separada por slug, key del visitador desmonta A → B → A y la revalidación de publicación se conserva. La zona nunca se renderiza como etiqueta. Los botones de slots mantienen HH:mm autoritativo presentado por el reloj común; las entradas date siguen nativas.

Regresión permanente `PublicDates.test.tsx`: ocho fallos antes de integrar, ocho aprobadas después. Hoy/Ayer/Mañana, dos días atrás, otro año, actualización al cruzar medianoche y año actual según negocio al cambiar de zona. Incluye recorrido completo con negocio Asia/Tokyo: confirmación y éxito reciben la zona de booking-data, datetime íntegro, POST conserva exactamente el slot y no incorpora timeZone. No afirma confirmación, PENDING ni envío. Datos y props de pruebas anteriores se alinearon con el campo aprobado; el caso F0-A ahora muestra las 10 a. m. correspondientes a su instante 14Z, sin mantener el antiguo texto civil sintético contradictorio de 23:00. Plantillas y contratos de correo permanecen intactos.

| Comando de integración web | Resultado real | Evidencia local ignorada |
| --- | --- | --- |
| `pnpm --filter web exec vitest run components/public/PublicDates.test.tsx` antes/después | exit 1, ocho fallos / exit 0, ocho aprobadas | `.tmp/f0d/web-public-red.log`, `web-public-green.log` |
| `pnpm --filter web type-check:clean` | exit 0 | `.tmp/f0d/web-types.log` |
| `pnpm --filter web lint` | exit 0, sin warnings | `.tmp/f0d/web-lint.log` |
| `pnpm --filter web test` | exit 0; 149 Node + 102 componentes (251) | `.tmp/f0d/web-tests.log` |
| `pnpm --filter web build` | exit 0 | `.tmp/f0d/web-build.log` |
| `node .tmp/f0d/public-browser.mjs` | exit 0; seis recorridos/comprobaciones en 375/1280 px | `.tmp/f0d/public-browser.log`, `public-browser-results.json` |
| `git diff --check` | exit 0 | revisión final |

QA en Chrome instalado, código real de PublicMiniSite/StepRouter/ConfirmStep/SuccessView y CSS: completar asistente con datos QA sintéticos, confirmar y presentar éxito; negocio Santo Domingo, dispositivo Tokio; datetime/title, ninguna zona/UTC visible, POST exacto, cero errores/warnings de consola y sin overflow. Vista de éxito cruza medianoche en negocio y muestra los cinco formatos solicitados. Capturas revisadas: `public-confirm-{375,1280}.png`, `public-success-{375,1280}.png` y `public-dates-{375,1280}.png` en .tmp/f0d. El harness ejecuta además getBookingData del servicio API compilado 2A con persistencia controlada y comprueba timeZone/no UUID; fecha mínima/slots/POST y reloj se controlan localmente para el escenario. No equivale a integración con base ni despliegue QA; no conecta Clerk ni proveedores. Safari físico y revisión del propietario de esta interfaz pendientes.

API no volvió a cambiar desde la aprobación; sus cuatro gates y 767 aprobadas/37 omitidas de arriba permanecen como evidencia del backend integrado. Build/tipos web usan los mismos marcadores locales de proceso que la primera etapa, sin escribir .env. Fixtures E2E de Medios/WhatsApp incorporan el campo aditivo; no se cuentan como nuevas E2E ejecutadas.

Estado Git vigente: rama `ai/antigravity-qa`, HEAD/base `666516f2ebf56e9620a0da3bfebe9c0496b4de7f`; 39 rastreados modificados y seis nuevos, todos sin staging. Nuevos cambios de esta etapa: propagación del campo/instante en API web, asistente y éxito, regresión pública y fixtures; documentación de contrato, flujos y controles sincronizada. Sin commit, push, despliegue, migraciones, datos, .env, flags o proveedores reales.

Siguiente acción al terminar 2A: decisión 1 y backend mínimo con rojo/verde y cuatro gates antes de integración. El propietario eligió después **1A**; continuación debajo. El motivo de la no recepción y una señal verificable de correo siguen sin probarse; no atribuir PENDING/FAILED a aceptación ESP ni activar envíos para resolverlo. F0-D no se declara completo ni aprobado en conjunto.

## Continuación 2026-10-01 — decisión 1A

Autorización exacta: **«1A»** en respuesta a siete días por defecto y desde cada reenvío, conservando entradas explícitas de 1–30 días e invitaciones existentes. Autoriza ese cambio de contrato/backend; no aprueba anticipadamente su implementación ni correo real. Después de presentar la implementación, rojo/verde y cuatro gates, el propietario respondió **«Aprobado» el 2026-10-01**, aprobando explícitamente backend 1A. No es cierre de F0-D ni autorización de publicación o envío real.

Brief/contrato: OWNER/ADMIN crean y reenvían según permisos vigentes. Crear sin expiresInDays usa siete días; una entrada explícita válida 1–30 conserva su valor. Reenviar fija siete días desde el reloj del reenvío exitoso, no desde createdAt; expiración absoluta calculada en milisegundos (604800000 para siete días), no minutos. El resolvedor de expiraciones y aceptación continúa usando expiresAt. Crear equivalente reutiliza la invitación existente sin alterar su plazo; no se migran fechas ya persistidas. Vence el usa el formateador común existente. Invitaciones anteriores revocadas al reenviar siguen el flujo aprobado.

No cambia respuesta, roles, tenant, identidad, aceptación, DTO de reenvío, flag, proveedor, timeout, auditoría ni transacciones. Amenaza/riesgo: un plazo más corto limita el uso de enlaces nuevos; siete días son días de 24 horas, sin ajustar duración por DST. Valores explícitos 1–30 preservan compatibilidad autorizada. No presentar respuesta Clerk como entrega de correo. Rollback de configuración de código vuelve a treinta para operaciones futuras; no modifica fechas emitidas. No hay migración o necesidad de datos reales.

Aceptación backend: DTO omitido/default y fallback de servicio siete; payload Clerk y fecha persistida/retornada +604800000; PENDING a dos minutos y justo antes del límite, EXPIRED en el límite; reenvío días después gana siete días nuevos y conserva createdAt; entradas explícitas 1 y 30 siguen válidas, valores fuera de rango rechazados; invitación previa no recibe ampliación por crear equivalente; fallo externo no queda PENDING. Prueba roja antes del código y verde después, cuatro gates API. Frontend no necesita nuevo campo o payload: aprobación backend sigue siendo el siguiente gate.

Implementación mínima: default de `CreateTeamInvitationDto` siete, fallback de `TeamInvitationsService.create` siete y constante de resend siete. Tres valores modificados, sin cambiar la fórmula correcta de días ni los predicates de expiración/aceptación.

Regresiones en `team-invitations.service.spec.ts` usan fechas persistidas por el servicio (doble de almacenamiento controlado), DTO real y cliente Clerk simulado que no envía correo. Cinco fallos antes: DTO default, creación default, fallback sin campo, límite de siete días y reenvío; veinte pruebas pasaban. Después, 25 pasan: además conservan entradas explícitas 1/30, rechazan 0/31/fracción, PENDING a los dos minutos y justo antes del límite, EXPIRED en +604800000 ms, reenvío dos días después con siete adicionales y createdAt original, creación equivalente con fecha previa intacta, fallo externo sin renovación/PENDING y regresiones existentes de generación/deadline/roles. Para crear el 30 sept a las 6:24 p. m. en Santo Domingo, expiresAt es `2026-10-07T22:24:00.000Z`; la regresión UI existente ya verifica «Vence el 7 oct, 6:24 p. m.» y fecha completa en time/title.

| Comando de backend 1A | Resultado real | Evidencia local ignorada |
| --- | --- | --- |
| `pnpm --filter api exec jest --runInBand src/auth/team-invitations.service.spec.ts` antes/después | exit 1, cinco fallos y veinte aprobadas / exit 0, 25 aprobadas | `.tmp/f0d/api-ttl-red.log`, `api-ttl-green.log` |
| `pnpm --filter api exec tsc --noEmit` | exit 0 | `.tmp/f0d/api-ttl-types.log` |
| `pnpm --filter api lint` | exit 0 final, sin warnings | `.tmp/f0d/api-ttl-lint.log` |
| `pnpm --filter api test -- --runInBand` | exit 0; 60 suites/781 aprobadas, tres suites/37 omitidas | `.tmp/f0d/api-ttl-tests.log` |
| `pnpm --filter api build` | exit 0 | `.tmp/f0d/api-ttl-build.log` |
| `git diff --check` | exit 0 | revisión final |

El primer lint encontró tres saltos de línea LF en archivos CRLF; se normalizaron con Prettier en esas dos rutas y se repitió lint con exit 0. No se cambió lógica para pasar las validaciones. Tipos/build y suite completa verifican el código; 37 opt-in omitidas no cuentan como aprobadas. No se aplicó migración ni ejecutó integración sobre base: cálculo/validación del plazo y consultas existentes, sin nueva garantía de almacenamiento o concurrencia. No hubo lectura de QA, envío ni conexión externa en esta continuación.

Web no necesitó cambio de contrato para 1A: omite expiresInDays al crear, el backend aplica el default, Reenviar ya usa la ruta aprobada y Vence el presenta expiresAt. Los cuatro gates web/251 pruebas y QA 2A de la etapa anterior son evidencia de esa etapa, no QA integrado de 1A. No es necesario modificar un consumidor ni inventar estados nuevos. El backend 1A quedó en revisión hasta la respuesta posterior **«Aprobado»**; ahora **BACKEND 1A APROBADO**. La continuación siguiente registra la comprobación del consumidor.

Estado Git final de 1A: rama `ai/antigravity-qa`, HEAD/base `666516f2ebf56e9620a0da3bfebe9c0496b4de7f`; cambios previos preservados más DTO/servicio/pruebas de invitaciones y documentación. Sin staging, commit, push, despliegue, .env, flags, proveedores, permisos, aceptación o datos existentes modificados. Riesgo residual: fechas ya emitidas no se acortan; crear equivalente tampoco renueva; reenvío sustituye el enlace y concede siete días nuevos como se autorizó.

El gate de backend 1A recibió aprobación explícita del propietario. Sigue pendiente evidencia de correo del proveedor para determinar la no recepción y representar aceptación/desactivación/fallo de correo con certeza; no reutilizar el estado de la invitación para afirmarlo. F0-D no se declara completo ni aprobado en conjunto.

## Después de aprobar backend 1A — 2026-10-01

La aprobación habilitó comprobar el consumidor existente sin cambiar su contrato. Revisión del formulario encontró otra promesa de recepción: «La persona recibirá un enlace seguro». Se sustituyó por «La invitación permite que la persona cree su propia cuenta mediante un enlace seguro». Es texto de capacidad, sin inferir envío a partir del estado de invitación. No se agrega un campo ni se cambia API después de la aprobación.

QA funcional/visual local: `team-browser.mjs` monta TeamPage, DashboardLayout, AuthProvider, React Query y CSS reales en Chrome; los POST de crear/reenvío y GET del listado se resuelven mediante **TeamInvitationsService compilado del backend aprobado**, DTO real validado y almacenamiento controlado en memoria. Cliente Clerk simulado, sin llamada de red ni correo; identidad de OWNER/BARBER y reloj también controlados. No sustituye guard HTTP, PostgreSQL, concurrencia ni sesión autenticada desplegada, cubiertos o pendientes según sus etapas previas.

En 375 y 1280 px, dispositivo Asia/Tokyo y negocio Santo Domingo: completar formulario omite expiresInDays, backend aplica siete y la pantalla muestra «Creada Hoy, 6:24 p. m. · Vence el 7 oct, 6:24 p. m.»; time/datetime/title corresponden a `2026-10-07T22:24:00.000Z`. PENDING a dos minutos; dos días después se pulsa Reenviar en la UI, backend revoca la invitación externa simulada, concede siete días nuevos y la pantalla cambia a «Vence el 9 oct, 6:24 p. m.» sin modificar createdAt. Payloads externos simulados llevan siete en ambos casos. Nunca aparece Enviada; Reenviar permanece disponible, BARBER queda excluido, cero errores/warnings de consola y sin overflow horizontal. Capturas revisadas: `.tmp/f0d/team-create-{375,1280}.png`, `team-resend-{375,1280}.png`.

El primer intento de harness no abría la pestaña Invitaciones después de cerrar el formulario; se corrigió ese paso. Se fijó además el reloj del navegador explícitamente con setFixedTime, independiente del reloj controlado del servicio, y se añadió aserción Hoy: no se cuenta el intento con relojes distintos como validación de relativos. No se cambió producto para resolver fallos del harness.

| Comando después de aprobación 1A | Resultado real | Evidencia local ignorada |
| --- | --- | --- |
| `node .tmp/f0d/team-browser.mjs` | exit 0, crear y reenviar en ambos tamaños | `.tmp/f0d/team-browser.log`, `team-browser-results.json` |
| `pnpm --filter web type-check:clean` | exit 0 | `.tmp/f0d/web-approval-types.log` |
| `pnpm --filter web lint` | exit 0 | `.tmp/f0d/web-approval-lint.log` |
| `pnpm --filter web test` | exit 0, 149 Node + 102 componentes (251) | `.tmp/f0d/web-approval-tests.log` |
| `pnpm --filter web build` | exit 0 | `.tmp/f0d/web-approval-build.log` |

Build/tipos conservan marcadores sintéticos de proceso de la etapa anterior, sin archivo .env. Backend no cambia después de aprobar: siguen vigentes sus cuatro gates, 781 aprobadas y 37 omitidas. Se actualizan BACKEND_CHANGES, PROJECT_MASTER, CHANGELOG, README y APP_FLOWS con la aprobación. Rama y HEAD originales, 42 rastreados modificados/seis nuevos, índice vacío y diff --check limpio; sin publicación, producción, proveedores, flags o datos reales alterados.

Pendiente concreto: el contrato cerrado no devuelve una señal separada de aceptación del mensaje por el servicio de correo. Ninguna de las decisiones 2A/1A autoriza esa extensión. Para diagnosticar la no recepción se solicitó al propietario únicamente el estado actual de Delivered by Clerk en la plantilla de invitación Development y cualquier aviso de cuota, sin cambiar opciones. La documentación pública de [Email Logs](https://clerk.com/changelog/2026-06-01-email-logs-public-beta) anuncia esa evidencia para instancias de producción; no se infiere su disponibilidad en esta QA Development ni se accede a producción. Una configuración actual tampoco demuestra por sí sola el estado histórico de ese mensaje. Se mantienen las opciones de §2b; ampliar el contrato o integrar recepción de eventos requiere una propuesta y aprobación separadas cuando exista una fuente verificable, sin migraciones/envíos reales dentro de esta tarea. F0-D sigue **INCOMPLETO / EN REVISIÓN**, sin nueva solicitud de aprobación del backend 1A.

## Configuración de correo confirmada por el propietario — 2026-10-01

Respuesta exacta: **«Esta activado, no aparece aviso de cuota agotada»**, acerca de Delivered by Clerk en la plantilla de invitación Development. Se registra como observación directa del propietario de la configuración actual, no como recibo técnico del mensaje anterior. No se volvió a consultar QA ni se hizo una llamada al proveedor en esta continuación.

Conclusión acotada: no hay evidencia de plantilla actualmente desactivada ni aviso visible de cuota agotada. No basta para etiquetar «Correo desactivado», «Enviada» o «No se pudo enviar» en la fila examinada. Tampoco prueba que la cuota estuviera disponible en el instante del mensaje: la [documentación de Development](https://clerk.com/docs/guides/development/testing/test-emails-and-phones#limitations) permite supresión de otras notificaciones al alcanzar el límite mensual. No garantiza que una creación de invitación devuelva un error o un aviso de Dashboard por esa supresión. Esa posibilidad sigue sin demostrarse y no se atribuye como causa raíz.

Se inspeccionó **SDK instalado @clerk/backend 3.16.5**, sin instalación o cambios: `dist/api/endpoints/EmailApi.d.ts` ofrece create, método experimental de envío, sin método get/list de recibos; no se llamó. `dist/api/resources/Invitation.d.ts` expone estado de invitación, sin identificador/estado de su correo asociado. Existe un recurso Email con status opcional y deliveredByClerk, pero no forma parte de la respuesta de invitación ni hay prueba de que un evento de creación acredite aceptación ESP. No se inventa una consulta ni se toma ese campo sin correlación/documentación como confirmación. Email Logs se anuncia para producción; no se entra a ella para diagnosticar QA. La inspección inicial de dependencias fue denegada por sandbox; repetida con lectura escalada autorizada, exit 0, sin rechazo del revisor automático.

La causa demostrada de «Enviada» sigue siendo el texto incondicional de la UI; está corregido. El motivo exacto de no recepción continúa desconocido. La vigencia de siete días y sus dos aprobaciones permanecen independientes de ese diagnóstico. Ningún cambio de API/web desde sus últimas verificaciones; se mantiene evidencia de 781 API/37 omitidas, 251 web y los cuatro gates de ambos, sin contar esta continuación documental como nuevas pruebas.

Decisión pendiente concreta, sobre el resultado ya implementado y revisable:

- **3A:** aceptar para QA la limitación explícita de correo («La entrega del correo no está confirmada», sin afirmar envío/desactivación/fallo), manteniendo Reenviar; registrar que la no recepción no tiene causa probada. No añade campos, proveedores, permisos, migraciones o configuración. Aceptar esta limitación no equivale por sí solo a aprobar toda la interfaz o publicar.
- **3B:** mantener 2a/2b incompletos hasta obtener un recibo/diagnóstico del mensaje emitido, correlacionado por Clerk. Su eventual integración necesitará propuesta de contrato separada y evidencia de qué acredita la fuente; no se prometen un webhook, consulta o estado implementables con el contrato actual. No se generan nuevos envíos ni se contacta soporte en nombre del propietario sin instrucción explícita.

Punto estable de esta etapa: sin código nuevo, rama/base e índice intactos, trabajo previo preservado. Se esperaba decisión 3A/3B; el propietario la resolvió después como se registra debajo. No se solicita otra aprobación de 1A/2A.

## Resultado vigente — correo localizado y decisión 3A, 2026-10-01

El propietario informó: **«El correo si llego, solo que estaba en spam y no lo lo vi mala mia, pero igual eligiendo una de las opciones elijo la 3A»**. Esta confirmación directa del destinatario resuelve la observación de no recepción: el mensaje estaba recibido en la carpeta de spam. No se afirma conocer qué regla del filtro lo clasificó allí, ni que otros mensajes futuros lleguen. No se añade al informe correo, enlace de invitación, cabeceras, identificador de mensaje o contenido privado.

**3A ACEPTADA explícitamente** para QA: conservar «La entrega del correo no está confirmada» y Reenviar, sin nuevos campos o integración de recibos. La limitación técnica sigue siendo real: el backend no recibe una señal automática de aceptación ESP correlacionada. La recepción confirmada por el propietario no se escribe como estado general del sistema ni convierte todas las invitaciones PENDING en Enviada. No hay contrato nuevo que implementar ni diagnóstico de no recepción pendiente para este mensaje; 3B no fue seleccionada.

| Punto | Causa/evidencia vigente | Corrección y regresión | Riesgo/límite |
| --- | --- | --- | --- |
| Fechas | formatos sueltos, zona del dispositivo y falta de semántica comunes en la base auditada | formateador/BusinessTime; zona pública 2A aprobada; rojo/verde de formatos, componentes y público; relativos, año y medianoche cubiertos | reloj actual del dispositivo; controles civiles/nativos y plantillas aprobadas preservados |
| No recepción 2a | destinatario confirma mensaje recibido en spam; lectura técnica previa solo acreditaba invitación pending | diagnóstico actualizado sin envío adicional; ninguna corrección del canal requerida por esta observación | clasificación de spam no diagnosticada; confirmación manual de este mensaje, no recibo automático |
| Estado 2b | UI afirmaba Enviada incondicionalmente, incluso FAILED; createdAt no prueba correo | etiquetas Creada/Vence el y entrega no confirmada; fallo de acción sin atribución inventada; rojo/verde de Equipo y Reenviar conservado; 3A aceptada | no se representa aceptación ESP/desactivación/fallo específico sin señal; limitación aceptada para QA |
| Vigencia 2c/2d | código y fila QA tenían treinta días con unidades correctas; dos minutos no reproducidos | tres valores pasan a siete mediante 1A aprobada; cinco fallos antes/25 aprobadas después; servicio/UI crear y reenviar comprobados | fechas existentes y rango explícito 1–30 preservados; aceptación, permisos y migraciones intactos |

Entrega autorizada implementada y validada localmente, con evidencias y excepciones documentadas: web tipos/lint/tests/build exit 0, 251 pruebas; API tipos/lint/tests/build exit 0, 781 aprobadas y 37 omitidas. Chrome controlado en 375/1280 y las regresiones descritas pasan; no se atribuye esta confirmación del propietario a QA remota del nuevo código. Esta continuación cambia únicamente documentación: no repite builds/tests ni altera sus resultados.

Estado de control: backends 1A/2A aprobados y limitación 3A aceptada; implementación local **EN REVISIÓN FINAL**, sin declarar cerrado/aprobado el conjunto. Auditoría/aprobación global y QA desplegada/Safari físico quedan como etapas posteriores, sin autorización de publicación. No bloquean la terminación del trabajo local solicitado ni autorizan commit, push o despliegue. Si se autoriza otro alcance, su primer paso será revisión del candidato y sus evidencias, no reactivar el envío ni fabricar un estado de entrega.

Git de la etapa local: `ai/antigravity-qa`, HEAD/base `666516f2ebf56e9620a0da3bfebe9c0496b4de7f`, 42 archivos rastreados modificados/seis nuevos, índice vacío; trabajo previo preservado. PROJECT_MASTER, CHANGELOG y README sincronizados; diff --check y referencias locales revisados. Producción, .env, flags, proveedores y datos reales intactos. Sin staging, commit, push o despliegue en esa etapa.

## Publicación y despliegue QA — 2026-10-01

Autorización posterior exacta registrada al inicio. Commit de código `92f61274dcb733e0e43f14a45851c0da346430c2`, mensaje `fix(qa): unificar fechas del negocio y vigencia de invitaciones F0-D`, 48 rutas explícitas revisadas; push exclusivo a origin/ai/antigravity-qa con exit 0. Se verificó igualdad de SHA local/remoto de código y main permaneció en `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6`. Este informe operativo se publica después en un commit solo documental: no cambia el código desplegado ni exige reconstruir API.

| Operación | Resultado comprobado | Evidencia local ignorada |
| --- | --- | --- |
| Contexto API mediante git archive del commit, build ARM con límites, pnpm frozen del Containerfile | exit 0, imagen inmutable `7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1` | `.tmp/f0d/api-image-build.log`, `api-context.tar.gz` |
| Drill de arranque fail-closed sobre imagen, red deshabilitada | 23 casos negativos pasan, exit 0 | `api-image-build.log` |
| Despliegue QA API y worker, verificación posterior | scripts exit 0, ambos activos con imagen y APP_RELEASE del commit de código | `api-deployment.log`, `api-final-check.json` |
| Smoke HTTPS del API QA | exit 0: raíz 404, privado 401, catálogo 200 con timeZone America/Santo_Domingo, preflight 204; origen ajeno sin ACAO; UUID/exposición X-Request-Id correctos | `external-smoke.json` |
| Vercel Git Preview de código | Ready `dpl_Erb4T1Cri2GpGjm6rxkRsoH41bux`, SHA/branch exactos, alias QA asociado automáticamente | `vercel-code-ready.json` |
| Producción | despliegue Vercel `dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm`/main iguales; API mantiene imagen, contenedor/PID, tres servicios y hashes de archivos protegidos | `vercel-before.json`, `vercel-code-ready.json`, `api-deployment.log`, `api-final-check.json` |

Solo se sustituyeron KORTEK_API_IMAGE y APP_RELEASE en la credencial operativa del servicio QA; igualdad del resto de líneas/configuración funcional verificada, incluidos flags y secretos. Ningún archivo .env local, variable Vercel, plantilla, proveedor, permiso o dato persistido se modificó. No se enviaron invitaciones/correos de prueba ni se crearon reservas durante despliegue. Reinicios exclusivos de kortek-api-staging y kortek-email-worker-staging; Caddy y servicios productivos preservados. Imagen anterior `1ef5e81d42801498e2903e423b770ed7f1d8e22e65e7f0fdf7db9a9ef8660911` retenida y respaldo operativo protegido, sin migración; rollback preparado en el script. El worker conserva la configuración previamente autorizada, sin activar ni desactivar correo.

La sesión almacenada de Vercel estaba vencida y se renovó mediante su flujo OAuth oficial sin mostrar credenciales. CLI no instalado: se empleó integración Git existente y API Vercel para consultar estado/alias, sin instalar dependencias ni modificar configuración. El helper de reporte tuvo un error de precedencia Path/string al guardar snapshot; se corrigió y la consulta posterior terminó con exit 0. No fue fallo de producto o despliegue.

QA visual remota automatizada: Chrome con perfil limpio intentó abrir el alias; fue redirigido al SSO existente de Vercel. No se cuenta ese intento como validación funcional remota, ni se deshabilita protección o se crea un bypass. `.tmp/f0d/remote-browser.log` registra la limitación. Conservan validez los recorridos locales de componentes reales y backend compilado ya documentados; no sustituyen QA autenticada del nuevo despliegue ni Safari físico. Riesgo operativo residual: el nuevo código requiere ese recorrido del propietario sobre sesión/datos QA; publicación no significa aprobación funcional final.

### Validación del propietario en QA

Abrir https://qa.booking.kortek.cloud con acceso Vercel habitual y sesión QA. Recargar para recibir el nuevo Preview.

1. Fechas de reservas, facturación, equipo/invitaciones, clientes, notificaciones, disponibilidad del perfil y confirmación/éxito público: Hoy/Ayer/Mañana; dos días atrás sin semana; año solo si difiere. Ejemplos: «Hoy, 10:43 p. m.», «26 sept, 6:24 p. m.», «26 sept 2025, 6:24 p. m.». Revisar fecha completa al pasar el puntero/foco accesible y datetime del instante correcto. Campos editables civiles/nativos y plantillas aprobadas son excepciones documentadas, no regresiones.
2. Cambiar zona del dispositivo, conservar la del negocio y repetir una fecha cerca de medianoche; la fecha/hora y Hoy/Ayer deben seguir la del negocio. Mantener la pantalla abierta y volver después de suspensión: actualiza relativo al siguiente minuto/recuperar visibilidad. No cambiar el reloj o zona del negocio persistida solo para esta prueba.
3. Crear una invitación QA nueva sin plazo explícito: Creada y Vence el separados por siete días; a los dos minutos continúa pendiente. «La entrega del correo no está confirmada» y Reenviar, sin garantía Enviada. Revisar spam si se comprueba recepción; la UI no representa recibos automáticos.
4. Reenviar: Vence el suma siete días desde ese reenvío, conservando fecha de creación; comprobar enlace nuevo y revocación del anterior conforme al flujo vigente. Invitaciones existentes conservan su fecha; crear equivalente tampoco renueva, y entradas explícitas 1–30 permanecen válidas. No esperar acortamiento retroactivo.
5. Validar como OWNER/ADMIN, Profesional sin acceso a Equipo y cambio de organización A → B → A sin datos ajenos. Revisar móvil/Safari físico y escritorio: textos, botones Reenviar y fechas sin desbordamientos, y consola sin errores de producto.

Estado final de producto: **DESPLEGADO EN QA / EN REVISIÓN**, backends 1A/2A aprobados y 3A aceptada; QA autenticada/aprobación global pendientes. El informe documental y sus selectores Git se verifican al terminar la publicación; API conserva el SHA del commit de código aunque el HEAD posterior incorpore únicamente documentación.
