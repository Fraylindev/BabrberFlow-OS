# M2 Cuenta de cliente — C1 etapa 1: cierre técnico

**Estado vigente — 2026-10-03:** **BACKEND C1 DE M2, ETAPA 1, CERRADO / APROBADO EXPLÍCITAMENTE POR EL PROPIETARIO** en `9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4` (`9f04dba`). La aprobación y el bloqueo D4 de producción se registran al final. Los estados anteriores se conservan como historial y no revocan esta aprobación. Producción cerrada; sin despliegue. Esta tarea no inicia C2.

**Actualización vigente:** el apartado final «Correctivo D4 y publicación autorizada, 2026-10-03» sustituye la regla D4, los resultados y el estado Git del checkpoint local que sigue. Se conserva el informe anterior como historial; sus hashes/pruebas describen aquella revisión, no los archivos corregidos.

2026-10-03, America/Santo_Domingo. **IMPLEMENTADO LOCALMENTE / CANDIDATO EN REVISIÓN DEL PROPIETARIO.** Único gate abierto: C1 backend. No se declara aprobado el backend ni se abre C2/C3, etapa 2 o producción. [Contrato ejecutable/documentado](../features/M2_CUENTA_CLIENTE_C1_CONTRATO.md), [C0 aprobado D1–D8 A](M2_CUENTA_CLIENTE_C0.md#15-aprobación-del-propietario-y-publicación-documental-2026-10-03) y [decisiones vinculantes](DECISIONES_PROPIETARIO_2026_09_29.md).

## Base, autorización y aislamiento

HEAD inicial/final: `61ec6677b448a2ebbab4c32298b9246347ec1a10`, rama `ai/antigravity-qa`. Al comenzar, índice vacío y seis rutas ajenas: CHANGELOG, PROJECT_MASTER, docs/README, confirmación UX, cierre M1 C3 y JSON de aprobación M1. Se compararon sus seis SHA-256 iniciales/finales: idénticos. No se hizo staging, commit, push, fetch ni despliegue; no se comprobó SHA remoto porque no se publicó.

La orden del propietario autoriza expresamente C1 etapa 1 y enmienda limitada D8; las restricciones documentales históricas de C0 no revocan esta orden posterior. Se leyeron skill kortek-delivery, entrada documental, PROJECT_MASTER, gates, instrucciones API, C0/decisiones, ADR, arquitectura/modelo, seguridad/DoD, contratos relacionados, historial y código real. TRD/DATA_MODEL mantienen inconsistencias históricas ya identificadas por C0 (contador local/espera financiera); no se aplicaron a M2 ni se reabrieron esos módulos.

Se creó únicamente `kortek-m2-c1-disposable`, PostgreSQL 16, bind `127.0.0.1:55439`, sin volumen y con `--rm`. Bases nuevas `kortek_m2_test` y `kortek_m2_upgrade_test`; usuario `m2_runner` no superuser/CREATEDB/CREATEROLE y propietario solo de esas bases. Base ficticia `m2_primary_placeholder` con CONNECT revocado; globalSetup confirmó aislamiento antes de migrar/E2E. No se accedió a bases existentes, QA del propietario, Supabase, proveedores ni producción. Docker recibió autorización de acceso al motor para este clúster.

Las credenciales/variables **sintéticas y transitorias del proceso de ensayo** apuntaron exclusivamente a ese contenedor y pausaron/sustituyeron proveedores de prueba. No se editó ningún `.env`, flag o variable operativa/local persistida. No se instalaron dependencias. Versiones instaladas comprobadas: `@clerk/backend 3.16.5`, Prisma/client `6.19.3`. Entorno y datos no se anuncian como capacidad productiva.

## Implementación entregada

| Requisito | Resultado y evidencia |
| --- | --- |
| §9.2 backend | Seis endpoints `/customer` de negocios, listado, detalle, perfil GET/PATCH y POST Booking; rutas existentes de claim y reserva preservadas salvo D8 expresamente autorizado |
| Sesión/roles | Guard existente Clerk, sin Membership como sustituto del vínculo; personal de los cinco roles solo accede a su propio Client habilitado. Cliente no entra a agenda, directorios ni finanzas |
| Aislamiento/404 | Consulta final tenant+Client+User; ajeno/inexistente/sin vínculo/bloqueado/inactivo mismo cuerpo; sin PII ajena, notas, IDs internos, pagos ni comprobantes |
| Lista/cursor | Partición por endTime/asOf y status, orden/desempate, 20/50, en curso/vencidas/canceladas/completadas/NO_SHOW futuras; cursor cifrado ligado al contexto, manipulación negada, revisión DB invalida ante cambios SQL |
| D4 | Bloqueo autoritativo true por defecto, sin inferencia de identidad ni backfill; revisión asistida explícita habilita solo fixtures y cambio de userId vuelve a bloquear. Claim exitoso conserva contrato, no libera historial automáticamente |
| Perfil D7 | Nombre/teléfono propios por negocio, recibo idempotente 24 h obligatorio en PATCH, replay concurrente con una auditoría, rollback de contacto si falla recibo, null/normalización/validaciones y colisión neutra; sin correo/notas/rol/IDs/estado/vínculo, sin propagación ni cambio de emailRevision |
| Repetición | Alta nueva PENDING con perfil propio, publicación/recursos/agenda vigentes; no copia fecha/status/precio/finanzas ni reabre Booking anterior |
| §9.4 idempotencia | Mismo comando/contexto 201/200, distinto comando 409, pérdida de vínculo 404, TTL 24 h/recibo vencido 409, limpieza acotada y sin reenvío automático incierto |
| Atomicidad/concurrencia | Dos procesos Node/Nest distintos, misma clave: una Booking/recibo/evento/outbox/auditoría; distinto key mismo slot 201/409; fallo real de recibo/auditoría revierte todas las filas |
| Abuso | Lecturas 60/min, perfil 10, altas 5 por identidad+negocio, techo IP 180 incluso rotando actor/slug; PostgreSQL compartido, Retry-After, digests sin IP/email y purga máxima 100 probada |
| §9.5/migraciones | CustomerOperation, unicidad contextual, FKs tenant, CHECKs de operación/digest/TTL, índice paginado y dos triggers; 0→28/27→28, rollback de código e inversa aislada probados |

Archivos: módulo nuevo `apps/api/src/customer`, registro AppModule, schema/migración/SQL inversa, opción de limpieza acotada del contador compartido solo usada por M2, pruebas/scripts `customer*`, contrato, BACKEND_CHANGES y este informe/evidencia. Ningún archivo web o contrato de etapa 2 cambió. Los controles ajenos permanecen intactos; estado M2 centralizado en este cierre y BACKEND_CHANGES.

## D8-A: entrega separada y regresiones

Se eliminó la señal HTTP de existencia de User de la creación secundaria legacy. Tanto correo existente como nuevo, colisión de unicidad y fallo interno secundario entregan `accountCreated:false,accountCreationError:null`, con el mismo esquema de Booking y PENDING. `false/null` significa resultado de identidad no divulgado; no se puede inferir ausencia ni éxito de cuenta. Mantener true/false distintos habría conservado la enumeración aun retirando `EMAIL_ALREADY_EXISTS`.

Se conserva alta real User+Membership CUSTOMER con bcrypt cuando procede, fail-open después del commit de reserva, rechazo de colisiones Client, D11 y endpoints/JWT/password legacy. Bcrypt también se ejecuta para correo existente; ninguna unión por correo. No hay cambios al DTO público, Booking HTTP, claims A0.6-A o permisos.

Prueba HTTP real en desechable: correo existente vs nuevo, comparación de indicadores/status/claves del cuerpo; cuenta realmente nueva permite `POST /auth/login` y su JWT legacy sigue sin acceso M2. Un trigger de prueba hace fallar INSERT User después de reservar: respuesta idéntica, una Booking PENDING conservada, sin falso éxito de identidad. La unitaria de fallo secundario conserva el log genérico sin cuerpo/PII. M1 y auth/claims mantienen sus regresiones.

Muestra final de tiempos: existente **190 ms**, nuevo **133 ms**, una muestra por caso mientras corrían otras validaciones. **No prueba tiempo constante, equivalencia estadística ni ausencia de canal temporal.** Retira diferencia inmediata de bcrypt, pero conserva coste DB diferente. Alta/login/recuperación legacy globales y configuración estricta Clerk no quedan declarados protegidos integralmente. Producción continúa cerrada. Frontend intacto; C2 debe consumir Clerk y no anunciar resultado de cuenta usando estos indicadores.

## Evidencia de comandos y resultados

Solo cuentan ejecuciones finales exit `0`. [Registro verificable](evidence/m2-c1/validation.json), [catálogos PostgreSQL](evidence/m2-c1/database-invariants.json) y [planes completos](evidence/m2-c1/query-plans.json). Logs completos locales en `.tmp/m2-c1` (ignorados, no contienen sesiones de proveedores ni contactos reales); el registro versionado guarda huellas y resúmenes, no credenciales/cuerpos.

| Comando/ensayo | Resultado final |
| --- | --- |
| `pnpm --filter api type-check` | exit 0 |
| `pnpm --filter api lint` | exit 0 |
| `pnpm --filter api test --runInBand` | exit 0; **807 aprobadas, 37 omitidas**, 62 suites pasan/3 omitidas |
| `pnpm --filter api build` | exit 0 |
| `pnpm --filter api exec prisma validate` | exit 0 |
| `pnpm --filter api exec prisma generate` | exit 0, client 6.19.3 |
| `pnpm --filter api exec prisma migrate deploy` en base vacía | exit 0, **28 migraciones** |
| baseline mediante `--schema ../../.tmp/m2-c1/upgrade/prisma/schema.prisma`, fixture y deploy final | exit 0, **27→28**, huellas User/Client/Booking iguales; nueva reserva posterior/recibo conservados |
| `prisma migrate status`; `migrate diff --from-url … --to-schema-datamodel prisma/schema.prisma --exit-code` | exit 0; sin pendientes/sin diferencias en schema M2 |
| `pnpm --filter api test:e2e --runInBand customer.e2e-spec.ts` | exit 0; **47 aprobadas**, dos procesos/PIDs distintos y HTTP+PostgreSQL reales; sesiones Clerk sintéticas |
| E2E filtro `clerk-customer-claims\|clerk-me\|clerk-bootstrap\|auth.e2e\|business-schedule\|notifications-producer\|public-booking-m1` | exit 0; **81 aprobadas**, 7 suites; proveedor SDK/medios/correo controlados |
| `node apps/api/test/customer-query-plan.cjs` | exit 0; 50.000 reservas/50 Clients, 21 filas solicitadas, índice paginado en ambas vistas; **0,230 ms próximas / 0,234 ms historial** en este ensayo, no benchmark productivo |
| `node apps/api/test/customer-db-invariants.cjs` | exit 0; unicidad/FKs/CHECKs/índice y ambos triggers habilitados |
| `node -r …/ts-node/register apps/api/test/customer-code-rollback.cjs` | exit 0; código exacto HEAD base sobre schema aditivo: GET público 200, claim repetido 200, alta pública 201; preserva recibos/vínculos/reserva posterior |
| `customer-stage-one.disposable.sql` con psql; `customer-migration-fixture.cjs verify-inverse`; diff contra schema baseline | exit 0; datos original/nuevo conservados, schema igual al de 27 migraciones |
| `node --check` de los cuatro scripts `.cjs`; revisión de enlaces/diff/secretos y `git diff --check` | exit 0; scripts válidos y documentación local coherente |

La inversa borra recibos/bloqueo/revisión, no Bookings/User/Client. Ledger todavía contiene la migración 28 en ese ensayo inverso; se desecha el clúster, nunca se intenta desplegar/reusar ese ledger ni se edita a mano. Reversión recomendada de código preserva schema/recibos. Ninguno de estos ensayos autoriza operar sobre base real.

Se repitieron cero/upgrade/rollback tras finalizar el trigger de relink y la FK Client de los recibos de alta/perfil; no se usa como evidencia final una migración anterior. Las regresiones de 81 casos se repitieron tras ese trigger. La opción de purga M2 conserva la rama previa de otros consumidores. La revisión de §9.4 amplió el recibo al PATCH de perfil, sin guardar contacto en claro; se volvió a probar tipos/lint/unitarias completas/M2/build y las regresiones sobre la migración definitiva. No se repite testing sin cambios relevantes.

Fallos previos corregidos, no contados como éxito: pnpm/Docker inicialmente denegados por sandbox; expectativa 403 frente al 401 real de rutas B2B; nombre de token de login en la prueba (contrato real `accessToken`); tipo inferido UUID del helper de prueba; formato/tipado de Server; fixture baseline intentando escribir defaults del client generado nuevo y Schedule ausente; dependencia pnpm del baseline aislado; ausencia de clave sintética de firma de medios en prueba M1; índice único consultado como constraint. No se alteró código de negocio ajeno para hacer pasar estas pruebas.

## Riesgos residuales y verificaciones pendientes

- **D1 proveedor real:** no se verificaron alta/código por correo, recuperación, entrega, configuración estricta anti-enumeración, reenvíos/costos ni compatibilidad efectiva B2B/B2C en Clerk. Reutilización del backend/verificador y pruebas de SDK controlado no equivalen a proveedor vivo. No se cambió su instancia ni sus variables.
- **D4 revisión operativa:** toda historia sin revisión explícita queda bloqueada, también Clients nuevos. No hay endpoint administrativo nuevo para liberar: hace falta procedimiento autorizado por operador, evidencia de no mezcla y auditoría antes de activación. Tests habilitan solo fixtures. No se prometen historial completo o recuperación automática por contacto.
- **Temporal/idempotencia:** muestra D8 no acredita resistencia temporal; después del TTL no reenviar automáticamente resultados inciertos. Purga acotada puede acumular backlog bajo carga alta; validar operación/capacidad antes de producción. Rotación del secreto existente cambia digests y cursores; requiere reconciliación/ventana propia antes de activación, no se ejecutó aquí.
- **Despliegue/migración real:** sin grants/runtime real, volumen real, locks/latencia/carga multi-tenant productiva, planes pagados, backup/restore operativo o infraestructura nueva verificados. Migración normal crea índice en transacción; medir ventana de locks real antes de aplicarla. Role de tests es propietario aislado, no prueba grants del runtime productivo.
- **QA de producto:** sin frontend, navegador, hardware móvil, sesión/correo reales, retorno desde otra app, logout efectivo del proveedor, accesibilidad ni auditoría independiente. 37 pruebas opt-in omitidas siguen sin cobertura; no se llama aprobada a seguridad integral ni interfaz.
- Normalización/deduplicación legacy y unicidad de teléfono se conservan; no se introduce constraint nueva de teléfono que cambie contratos del personal. Revisión de casos mezclados reales pertenece a habilitación asistida; no se inventó identidad a partir de fixtures.

## Qué queda para C2

Requiere **aprobación explícita del backend C1** antes de iniciar. Integrar exclusivamente el contrato aprobado: rutas B2C, Clerk código por correo con nombre/verificación, retorno permitido, negocios vinculados, claim explícito/recuperación asistida D3, perfil D7, Próximas/Historial y nueva reserva con clave opaca. Claims/D4: presentar bloqueo útil y no afirmar que un claim libera automáticamente el historial. Rechazo de cursor obsoleto descarta páginas; 429 respeta Retry-After; timeout de alta recupera mismo comando/clave dentro del TTL sin duplicar.

Resolver compatibilidad/anti-enumeración D1 con instancia de desarrollo autorizada, sin modificar B2B por inferencia. Consumidor M2 omite password/createAccount legacy y no toma `false/null` D8 como fracaso confirmado. Cuenta/claim/Booking tienen resultados separados. Mantener consentimientos independientes, zona del negocio y contratos existentes. Limpiar memoria/caché al cambiar identidad/negocio/rol, A→B→A, logout/pérdida de permiso y efectos tardíos; no-store, sin PII persistida. QA funcional/visual responsive y accesibilidad; C3 físico/proveedor real y aprobación propios. Sin cancelar/reprogramar/política hasta etapa 2 autorizada.

## Git y limpieza finales

Se detuvieron los dos procesos de prueba tras cada suite. Contenedor exclusivo M2 y sus dos bases fueron eliminados al cerrar con `docker stop` y `--rm`, sin volumen; se comprobó su ausencia. Se conservan fuentes/scripts/evidencia y logs/fixtures sintéticos ignorados para reproducir; sin servicios M2 escuchando.

HEAD y rama iguales a la base; índice vacío. Los seis archivos ajenos permanecen byte a byte. Estado final completo registrado en [validation.json](evidence/m2-c1/validation.json); incluye cambios locales propios del API/contrato/informe y las seis rutas ajenas, **sin commit ni push**. La aprobación del propietario sigue pendiente; C2/producción no se abren.
## Correctivo D4 y publicación autorizada, 2026-10-03

**IMPLEMENTADO / EN REVISIÓN DEL PROPIETARIO.** La nueva orden autoriza corregir D4 y publicar todos los cambios propios C1 en un único commit/push a `origin/ai/antigravity-qa`. No aprueba el backend ni abre C2, etapa 2 o producción. Base sigue siendo `61ec6677b448a2ebbab4c32298b9246347ec1a10`; los seis archivos ajenos M1 se preservan por ruta y SHA-256 y quedan excluidos del staging. La decisión del propietario refina D4-A y revoca exclusivamente el requisito anterior de operador para todos los claims.

### Medición previa, resultado e implementación

Antes de editar código se aplicó el C1 previo en una nueva base desechable y se ejecutó por HTTP reserva invitada → claim A0.6-A → listado: **201 → 201 → 404**, vínculo persistido pero `customerAccessBlocked=true`. Después del correctivo el mismo recorrido sintético, en servidor/DB reales, devuelve **201 → 201 → 200**, contiene la reserva y deja el bloqueo false. No se intervino la ficha entre reserva, claim y lectura. [Evidencia comparativa sanitizada](evidence/m2-c1/d4-http-antes-despues.json).

La habilitación ocurre después del enlace y dentro de la misma transacción SERIALIZABLE. Se conservan body/status A0.6-A y validaciones de sesión/correo primario verificado; un replay habilitado continúa idempotente. Para liberar una revocación se exige otra vez coherencia del correo verificado con Client y User local, sin inferir ni reasignar identidad. El trigger revoca ante cualquier cambio/anulación de userId; ambas sesiones quedan bloqueadas hasta un nuevo claim válido. Fallar auditoría revierte User/enlace/habilitación; la reserva invitada permanece y el reintento no crea otra Booking.

El bloqueo default continúa para Clients sin claim válido; ahora queda separado de `customerHistoryAmbiguous=false` por defecto. La señal automática de cuarentena es **otra ficha distinta con reservas en el mismo tenant y el mismo teléfono almacenado**, detectada al validar el claim. También puede registrarse una mezcla confirmada mediante revisión asistida documentada. La cuarentena es persistente: quitar el síntoma o repetir un claim no la borra. El trigger y las consultas M2 impiden lectura incluso si se intenta liberar solo el bloqueo. No hay nuevo endpoint administrativo, propagación, backfill, consulta de identidad por contacto ni modificación de la deduplicación pública. El [contrato actualizado](../features/M2_CUENTA_CLIENTE_C1_CONTRATO.md#2026-10-03--correctivo-d4-autorizado-claim-habilita-lectura) define el criterio y la resolución asistida limitada a los casos ambiguos.

Se conserva todo el resto de C1: seis rutas, ownership tenant/Client/User, 404 neutro, proyecciones, cursor cifrado/revisión, presupuestos compartidos, recibos de alta y perfil, atomicidad, D8-A y autenticación legacy. D8 mantiene su sección separada anterior; se repitieron comparación HTTP, fallo secundario fail-open y login legacy. Muestra actual de tiempos: 146 ms existente / 122 ms nuevo, una observación por caso; no acredita resistencia temporal.

### Validaciones finales del correctivo

Ensayos solo en `kortek-m2-d4-disposable`, PostgreSQL 16, `--rm`, sin volumen, bind `127.0.0.1:55439`; bases nuevas `kortek_m2_test` y `kortek_m2_upgrade_test`, role `m2_runner` restringido y base primaria ficticia sin CONNECT. Se recreó únicamente la base desechable del probe antes del ensayo final 0→28. Sin acceso a base real, correo, Clerk vivo ni proveedor de medios. Variables sintéticas solo en procesos de ensayo; ningún `.env` o configuración operativa cambió.

| Comando/ensayo | Resultado final |
| --- | --- |
| `pnpm --filter api type-check` | exit 0 |
| `pnpm --filter api lint` | exit 0 |
| `pnpm --filter api test --runInBand` | exit 0; **812 aprobadas, 37 omitidas**, 62 suites pasan/3 omitidas |
| `pnpm --filter api build` | exit 0 |
| `pnpm --filter api exec prisma validate` / `generate` | ambos exit 0, client 6.19.3 |
| `prisma migrate deploy` en DB vacía | exit 0; **0→28**, migración corregida con cuarentena/trigger |
| deploy baseline 27, `customer-migration-fixture.cjs prepare`, deploy final, `verify-upgrade` | todos exit 0; **27→28**, User/Client/Booking originales iguales y nueva reserva/recibo conservados |
| `prisma migrate diff --from-url … --to-schema-datamodel prisma/schema.prisma --exit-code` | exit 0; schema final coincide con DB M2 |
| `pnpm --filter api test:e2e --runInBand --testPathPatterns=customer.e2e-spec` | exit 0; **53 aprobadas**, dos procesos Nest/HTTP independientes; Clerk sintético, PostgreSQL real |
| E2E filtro `clerk-customer-claims\|clerk-me\|clerk-bootstrap\|auth.e2e\|business-schedule\|notifications-producer\|public-booking-m1` | exit 0; **81 aprobadas**, 7 suites |
| `customer-query-plan.cjs` / `customer-db-invariants.cjs` | exit 0; planes con filtro final de cuarentena usan índice en ambas vistas; 28 migraciones, FKs/CHECKs/unicidad/triggers comprobados |
| `customer-code-rollback.cjs` contra código exacto base/schema aditivo | exit 0; GET público 200, claim repetido 200, reserva pública 201, datos/recibos preservados |
| inversa SQL con psql, `verify-inverse`, diff contra baseline | exit 0; columnas M2/recibos retirados, reservas/vínculos conservados, sin diferencia respecto al schema de 27 migraciones |

[Manifest y comandos con hashes de logs](evidence/m2-c1/d4-validation.json). Los logs sintéticos locales quedan en `.tmp/m2-d4`; no se versionan cuerpos, sesiones, claves ni contactos. Los scripts de migración y rollback quedan reproducibles en `apps/api/test/customer*`. El ledger inverso conserva la migración 28 solo para ese ensayo; la base se desecha, nunca se reutiliza ni se modifica el ledger a mano. Rollback recomendado: código anterior conservando schema aditivo.

Fallos corregidos y no contados como éxito: resolución sandbox de dependencias del probe, referencias iniciales del helper a `id` en vez de `booking.id`, dos usos `any` en expectativas nuevas de lint y normalización de formato Prisma que afectaba modelos ajenos. Se recuperó el schema del baseline con solo inserciones M2, sin alterar otros modelos; validate/generate/diff y todos los controles finales pasan. Las seis rutas M1 mantuvieron sus hashes durante todo el correctivo.

### Riesgos residuales y C2

El schema histórico no conserva contactos/identidad por Booking; la señal automática no descubre toda mezcla dentro de una sola ficha. Teléfono compartido puede ser legítimo: se elige cuarentena conservadora y revisión asistida, sin declarar prueba individual de titularidad. Una señal de duplicidad introducida fuera de las rutas de validación requiere inventario/revisión asistida; C1 no ejecuta un barrido ni cambia fichas reales. Nombre distinto, antigüedad, teléfono ausente o archivo no clasifican por sí solos mezcla. Los Clients sin claim permanecen bloqueados hasta claim válido; no requieren operador si no hay ambigüedad objetiva.

Continúan pendientes proveedor Clerk/código/correo vivos y protección estricta, carga/grants/locks/operación real, procedimiento autorizado y auditado para mezclas confirmadas, QA visual/físico/accesibilidad y 37 pruebas opt-in omitidas. No hay despliegue ni aprobación integral de seguridad o UI.

C2 permanece cerrado hasta aprobación explícita del backend. Al abrirse, consumir el contrato corregido: después de claim exitoso normal, refrescar «Mis reservas» y mostrar la reserva; si hay cuarentena/404, orientar a asistencia sin exponer historial ni contactos ajenos. Mantener claves idempotentes, descarte de cursor obsoleto, límites/no-store y separación Booking/cuenta/claim; no interpretar indicadores D8 como fracaso de cuenta. Las demás tareas C2/C3 del checkpoint anterior siguen pendientes.

### Git y publicación

Los procesos HTTP de ensayo terminaron al cerrar sus suites. El contenedor exclusivo se eliminó con `docker stop kortek-m2-d4-disposable` y `--rm`; sin volumen ni base desechable en ejecución.

Staging únicamente por rutas propias C1/correctivo; revisión completa de diff y diff staged/check/stat antes del único commit en español. Los seis archivos M1 quedan fuera. La publicación autorizada no equivale a aprobación C1 ni despliegue. El SHA del commit, la comprobación local=remoto y el `git status` final se reportan en la respuesta de entrega para evitar autorreferencia del commit en sus propios archivos. La evidencia previa de `validation.json` sigue describiendo el checkpoint sin commit; esta sección y `d4-validation.json` describen la revisión actual.

## Aprobación explícita del backend C1 y bloqueo de producción — 2026-10-03

El propietario **aprueba el backend C1 de M2 Cuenta de cliente, etapa 1**, en el commit `9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4` (`9f04dba`), que comprende C1, el correctivo D4 y la enmienda separada D8-A. Queda cerrado el gate de aprobación del backend. La aprobación es posterior a los checkpoints de implementación/en revisión conservados arriba y no reescribe sus pruebas, resultados ni límites.

### Riesgo residual D4 aceptado solo para QA; BLOQUEANTE en Paso 8

La detección automática de cuarentena D4 solo identifica **fichas Client distintas con reservas y el mismo teléfono dentro del mismo negocio**. No detecta una **única ficha que acumula reservas de varias personas**, por ejemplo, una familia que comparte un teléfono. La posibilidad de registrar manualmente una mezcla confirmada no elimina este límite de detección. Un claim válido habilita el Client y no prueba la titularidad individual de cada reserva de esa ficha.

El propietario acepta este riesgo **exclusivamente para QA**. Es **BLOQUEANTE para la Puerta de producción (Paso 8)**: antes de abrir un negocio real debe resolverse por una de estas vías, con evidencia y revisión del propietario:

1. Medir el riesgo mediante **lectura segura sobre datos reales**, con alcance controlado y evidencia sin PII, antes de considerar seguro habilitar el historial por Client. No se realizó ese inventario ni se accedió a datos reales en esta tarea.
2. Aplicar **D4-B**, con **autorización expresa del propietario**, contrato, implementación y validación propios. Esta aprobación C1 no autoriza D4-B.
3. Pasar al **alcance por reserva**, con autorización, contrato y validación de la titularidad de cada Booking; no conceder lectura del historial completo por el solo vínculo con Client. Esta tarea no cambia el modelo de acceso.

La aprobación C1 no acepta este riesgo para producción ni cierra Paso 8. **Producción permanece cerrada, sin despliegue**, sin cambios de flags, variables o bases reales. C2/C3 y etapa 2 no se implementan ni se abren por este registro documental; la aprobación del backend satisface únicamente su requisito previo.

### Alcance de este registro

Solo se actualizan este cierre y `PROJECT_MASTER.md` por petición expresa del propietario, mediante entradas nuevas. El contenido M1 que ya estaba pendiente en PROJECT_MASTER se preserva íntegro; los otros cinco archivos de su tarea permanecen intactos. No se consolidan ni publican cambios M1. Sin staging, commit o push nuevos, ni cambios de código; se verifica el gate documental mediante enlaces, diff y preservación del texto previo.

## Aclaración de consolidación posterior — 2026-10-03

Las secciones de aprobación C1 y su alcance describen un registro anterior a C2. Se conservan fechadas: «esta tarea no inicia C2», «no se consolidan cambios M1» y «sin commit nuevo» contradicen el checkpoint posterior solo si se leen como estado actual. C2 quedó implementado localmente/en revisión en `d222115f7d624b5698b67a24e22486625fec22b2`, con autorización separada, según su [informe](M2_C2_CIERRE.md); esta consolidación no modifica ese commit ni concede aprobación C2.

El [alcance vigente](../../PROJECT_MASTER.md) reúne ahora las siete rutas documentales pendientes en un único commit local y prohíbe push/despliegue. C1 conserva su aprobación, su evidencia y el riesgo residual D4 de la sección anterior: aceptado solo para QA, bloqueante en Paso 8. No se ejecuta ninguna de sus vías de resolución ni se amplían contrato, implementación o autorizaciones.
