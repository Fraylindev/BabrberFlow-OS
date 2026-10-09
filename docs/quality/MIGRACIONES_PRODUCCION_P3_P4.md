# P3 + P4 producción — migraciones y grants aplicados, 2026-10-09

**GO TÉCNICO DE P3/P4 / IMPLEMENTADO Y VERIFICADO / EN REVISIÓN DEL PROPIETARIO.** Una única ejecución de Prisma aplicó 27 y 28, exit0 en **17,7772974 s**; suplemento de grants ejecutado una vez, exit0. Ledger32/28activas/4revertidas, 37tablas, checksums, funciones y matriz runtime correctos. Producción sigue con el API anterior, reserva cerrada y correo desactivado. **No autoriza promoción, despliegue, apertura ni gates posteriores.** Login runtime/P7 y readiness funcional no verificados aquí; P1c y la discrepancia de aliases P2 conservan sus límites.

## Reanudación y alcance

Orden directa del propietario sobre base **30b59d6a722d6d430aaff87d3a2d17c41cf5d0e2**, sustituye el antiguo0(c) por pg_locks(c1) y tabla administrativa aportada(c2). Mantiene las escrituras exclusivamente de migrate deploy y el suplemento; añade SIGINT si supera120s. Reanudación desde **05:40:38UTC (01:40:38 America/Santo_Domingo)**, fuera de la ventana OCI05:10–05:30UTC. El registro de parada anterior se conserva debajo como historia superada exclusivamente en0(c).

Se releyeron la skill kortek-delivery, estado/entrada documental, instrucciones backend, gates, seguridad y SQL reales; sin cambio de contratos/código. git fetch origin: exit0; ramas exactas:

- documental local/remoto30b59d6 completo;
- main remoto **8e1501e89a132e1b01d3633b1b3f896a8cbe5800**;
- QA remoto **523d993cfa0c797f356c224d5cc026d6c9ad4c7b**.

Worktree propio .tmp/prod-p3p4-main-8e1501e, detached8e1501e y limpio. Árbol **8f8f73b6eb677848de7d62680a49976bdc8ee7cd**, igual a523d993 según [P2](VERIFICACION_PRODUCCION_P2.md). Checksum de cada migration.sql exacto antes de ejecutar; SQL/grants inmutables. Node22.22.3/Prisma6.19.3 locales existentes; CLI absoluta del checkout principal, cwd y schema del worktree exacto. Sin instalación ni build.

## Paso 0 actualizado: todos los gates previos satisfechos

| Gate | Evidencia |
| --- | --- |
| a | psql local contra PostgreSQL17.6; pooler sesión5432, verify-full, CA con barras /; current_user=session_user=kortek_migrator, transaction_read_only=on, sin SET ROLE |
| b | Ledger completo idéntico a P1:30/26activas/4revertidas;31tablas y31conteos idénticos. Invoice histórico intacto |
| c1 | Locks de otras sesiones sobre relaciones public:[]; no concedidos:0; sin AccessExclusiveLock, ShareRowExclusiveLock ni ExclusiveLock ajenos. kortek_backup PID1477231/Supavisor:lock_count0,blocks_sessions0 |
| c2 | Tabla SQL Editor aportada por el propietario: cinco sesiones runtime idle, xact_age=null, wait_event_type=Client y wait_event=ClientRead. Ninguna idle in transaction, xact_age>1min o esperando Lock entre las filas aportadas |
| d | SSH exit0;API productiva b5615869/imagen8caacd85/PID151158/running true, PUBLIC_BOOKING_CLOSED=true, NOTIFICATIONS_EMAIL_ENABLED=false; QA también idéntica a referencia P1c |
| e | RespaldoP1 presente280667bytes;SHA-256 a72353911e5c47c6db8ab2a529c686de538dce48b7d7081b26c2a5121fefc297 recomprobado;sin descifrar/restaurar |

c1 fue observado en vivo como migrador READ ONLY; no afirma ver estado interno de la sesión backup, sino que no tiene locks ni bloquea. c2 es **evidencia aportada por el propietario**, leída tal cual; el agente no ejecutó la consulta administrativa, no verificó su timestamp/filtros ni accedió con postgres. state_age no es xact_age: la sesión idle de casi5días no es una transacción larga en esa tabla.

Tabla c2 recibida:

| pid | usename | application_name | state | xact_age | state_age | wait_event_type | wait_event |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 931630 | kortek_runtime | Supavisor | idle | null | 00:00:39.718375 | Client | ClientRead |
| 1467693 | kortek_runtime | Supavisor | idle | null | 00:03:31.940915 | Client | ClientRead |
| 1470594 | kortek_runtime | Supavisor | idle | null | 00:03:31.881677 | Client | ClientRead |
| 1474921 | kortek_runtime | Supavisor | idle | null | 00:00:01.766756 | Client | ClientRead |
| 959908 | kortek_runtime | Supavisor | idle | null | 4 days 22:26:26.298682 | Client | ClientRead |

P1 fuente conservada .tmp/prod-p0/p1-source.json, comparación restaurada P1c/schema26 intacta. Huella de las filas Organization antes de escribir: **e1b7362def3994bd3fa26118b99ec3bc** (md5 calculado en DB sobre JSON ordenado por id;sin devolver PII). Ninguna credencial de postgres u otro rol abierta: solo DPAPI migrador local, secreto al helper por stdin/proceso, URL solo en entorno del proceso Prisma, nunca argv/logs/Git.

## Paso 1: ejecución real y duración

Primera preparación del helper terminó exit1 al reservar consola SIGINT, **antes de lanzar Prisma**: no existían deploy.started ni deploy.stdout. Se corrigió solo la preparación local mediante consola propia oculta; no fue una ejecución de migrate deploy ni una escritura DB. Se conserva este incidente como límite del arnés, sin contar ese comando fallido como validación.

Comando efectivo: node absoluto22.22.3 + prisma/build/index.js6.19.3, migrate deploy --schema prisma/schema.prisma, cwd worktree/apps/api. Identidad de URL=kortek_migrator.ilaoolpcrlmqkftirjog por pooler5432; sin SET ROLE. Login READ ONLY previo acredita el session_user del mismo principal; no se capturó pg_stat_activity de la conexión interna Prisma mientras migraba. Las funciones nuevas son propiedad kortek_migrator.

Prisma6 usa sslmode=require + sslaccept=strict + sslcert=CA absoluta con barras /, verificados contra [documentación oficial Prisma6](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql); no se le pasó un sslmode libpq no soportado. Login/consultas psql permanecen verify-full. El helper preparó SIGINT real mediante CTRL_C_EVENT en consola dedicada de Windows y timer120s; **no fue necesario enviarlo**. No se probó el caso de timeout en producción.

Inicio helper **05:45:19UTC**, deploy exit0, **17,7772974 segundos**, stdout/stderr escritos directamente en archivos binarios antes de parsear. Salida cruda relevante:

> Prisma schema loaded from prisma\schema.prisma
> Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-0-us-east-1.pooler.supabase.com:5432"
> 28 migrations found in prisma/migrations
> Applying migration 20260927170000_business_schedule
> Applying migration 20261003120000_customer_stage_one
> All migrations have been successfully applied.

stderr vacío. Aplicó exactamente27/28. **Una ejecución**, sin status/deploy extra, resolve, edición ledger/SQL ni restore.

Tras exit0 se ejecutó **una vez** apps/api/ops/customer-stage-one-runtime-grants.sql del worktree, mediante psql como migrador, con guardia current_user=session_user=kortek_migrator. Sus bytes permanecieron intactos. Script transaccional con lock_timeout5s; exit0, stdout/stderr vacíos por psql-q. No se amplió ningún grant fuera del suplemento.

## Paso 2: verificación READ ONLY

| Requisito | Resultado |
| --- | --- |
| Ledger | **32filas /28activas /4revertidas**;30filas históricas conservan todos los metadatos |
| Invoice histórico | **3c1f4f533f24f2b73159e1f9ddbe933684126a4b2ee6a5734c11158d3f88d62a**, intacto |
| 27 | **82890d487a40d0c25edfd77019df6454f101f6222aa5235b3ea6f8a958272d82**, finished=true,rolled_back=null,applied_steps_count1 |
| 28 | **6e1d854f285f4a4a691377d6654d0a4df80f29ca5c3ad375b352ae96894d6dee**, finished=true,rolled_back=null,applied_steps_count1 |
| Tablas public | **37** |
| Funciones28 | Ambas sin argumentos, resultado trigger, SECURITY INVOKER, owner kortek_migrator |
| ACL funciones | Exactamente migrador y runtime EXECUTE, sin PUBLIC ni otro grantee;is_grantable=false |
| search_path | Exacto pg_catalog, public, pg_temp |
| Triggers | Gate confirma Client_customer_access_relink y Booking_customer_revision habilitados/tipos esperados |
| Conteos de negocio | Booking0,Client0,User2;Organization2 y demás conteos previos iguales antes de GET |
| Organización | Huella antes/después y censo final **e1b7362def3994bd3fa26118b99ec3bc**, filas originales idénticas |
| Horarios | BusinessSchedule2 por backfill27;CONFIRMED0. Days/windows/revisions/closures0;CustomerOperation0 |
| SSH final | Exit0;JSON exacto al inicial para ambas APIs:imagen/PID/release/running/flags/envHash y hashes archivos |

Tiempos del ledger, distintos de la duración total Prisma:27 started05:45:36.542578Z/finished05:45:36.947148Z;28 started05:45:37.058510Z/finished05:45:37.352087Z.

### Runtime: matriz37 vía migrador, sin login runtime

La reanudación prohíbe credenciales de otro rol. Aunque existe DPAPI runtime local, **no se abrió ni usó**. Se aplicó la alternativa de has_table_privilege desde migrador: adaptación local READ ONLY de verify-runtime-role.sql del worktree con rol objetivo explícito kortek_runtime en has_table/database/schema/type/function_privilege y chequeos de atributos/membresías/owner; guardia del lector exige migrador. La comprobación de identidad de una sesión runtime se sustituye por esa guardia y queda pendiente para P7; no se presenta la adaptación como ejecución con login runtime.

Exit0, stderr vacío.37tablas exactas;todos los permisos esperados pasan y TRUNCATE/REFERENCES/TRIGGER/MAINTAIN son false en todas. Cubre también funciones/triggers, default ACL, privilegios administrativos/DDL y la excepción TEMP de Supabase prevista en el script original. Matriz observada (S=SELECT,I=INSERT,U=UPDATE,D=DELETE):

| Permisos | Tablas |
| --- | --- |
| SI | AuditLog,BookingEmailEvent,BusinessScheduleRevision,CmsOperation,EmailWebhookReceipt,Invoice,MediaOperation,Payment |
| SIU | Booking,BookingEmailPreference,BusinessClosure,BusinessSchedule,Client,CmsPage,EmailChannelControl,EmailOutbox,MediaAsset,MediaGalleryOrder,MediaPromotion,MediaPurgeJob,Organization,Professional,ProfessionalAvailabilityBlock,ProfessionalService,Service,TeamInvitation,User |
| SID | BusinessScheduleDay,BusinessScheduleWindow,CustomerOperation |
| SIUD | EmailAbuseBucket,Membership,ProfessionalWeeklySchedule,SecurityRateBucket |
| S | GalleryImage,Notification |
| Ninguno | _prisma_migrations |

### GET y datos finales

GET HTTPS api.booking.kortek.cloud/ devuelve404 JSON "Cannot GET /", igual al contrato histórico descrito en [API OCI](API_OCI_DESPLIEGUE.md). Código productivo b561586 tiene controllers:[] en AppModule y no registra endpoint health dedicado. Esta sonda acredita respuesta HTTP del API anterior, **no un health/readiness exitoso ni un recorrido funcional de negocio**.

GET /public/dental-ross/booking-data devuelve404, message "Información no disponible.", error Not Found, statusCode404. El código b561586 produce ese contrato cuando PUBLIC_BOOKING_CLOSED=true; flag corroborado por SSH antes/después. No se hizo POST ni se intentó abrir/confirmar horarios.

Censo READ ONLY repetido después de GET: ledger32 y negocio Booking0/Client0/User2/Organization2, misma huella de organizaciones. **SecurityRateBucket pasó2→1** entre el censo anterior y el final; se registra como variación operativa observada en la ventana del GET, sin afirmar causalidad exclusiva ni igualdad de todos los datos del limitador. No cambió otro conteo; no se limpió manualmente ninguna fila. La igualdad de los31conteos del precheck era real y anterior al DDL/GET.

API producción: release **b5615869dcbec4bd174608f2373e73ff618fae26**, imagen **8caacd8548a61d94807c0b865229a731df594f63f609ca9ab57df99283dceca2**, PID151158, running=true,cierre=true,correo=false. QA: release **b318ca591d1ca6681269a6d25e29ca106d824df9**, imagen **8ba1b6c8a45391433998deeae1111d2d96c6cbf84932a7e9972cb6cf90e95eec**, PID1523029,cierre=false,correo=true. Archivos runtime-env y entornos contenedor conservan los hashes de P1c/P2.

## Evidencia, entrega y límites

Evidencia local preservada sin sobrescribir la parada: .tmp/prod-p3p4-resume/{precheck.*,ssh-before.json,deploy.*,grants.*,post.*,runtime-matrix.*,http.json,ssh-after.json,final-census.*}. Capturas SQL/DDL crudas guardadas antes del parseo. stdout deploy SHA-256 **dbfcaef082bdb13bcaf640c88c4421fa988c6f3d456ac3afe815df66f95bbd98**; stderr deploy, ambos streams grants y matriz vacíos: **e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855**. post-summary.json SHA-256 **6922f7b04cff48893bf0dd2b9fd1c6cfb396048b043c4bb017d5d095b16aa94d**. Evidencia ignorada, sin secretos/PII en Git; no se publicaron dumps de entorno ni datos personales.

Un único commit documental sobre30b59d6, solo este informe; staging por ruta explícita, revisión completa de diff/staged, enlaces y diff --check. Push sin force a ai/reserva-invitado-ci; SHA y local=remoto se entregan fuera del archivo para evitar hash autorreferencial. Main/QA locales y remotas sin mover. Playbook del propietario preservado untracked y mismo hash. Worktree propio limpio al final de ejecución, retirado después de preservar la evidencia; ninguna dependencia instalada.

**Go técnico acotado al esquema/grants P3/P4**, no aprobación del propietario ni cierre de P1c/P2. Login runtime, API nueva, readiness real/funcional y smoke P7 siguen pendientes. No hubo builds, despliegues, reinicios, flags, promociones ni cambios de proveedores; la única escritura productiva fue27/28 y el suplemento explícito. No se buscaron/usaron otras credenciales ni se confirmaron horarios.

---

# Registro histórico de la parada anterior

# P3 + P4 producción — precheck detenido, 2026-10-09

**NO-GO / PAUSADO / INCOMPLETO EN PASO 0(c).** No se ejecutaron migraciones 27/28 ni grants. El migrador pudo autenticarse en READ ONLY y el ledger/conteos coinciden exactamente con P1; no dispone de visibilidad suficiente de `pg_stat_activity` para acreditar ausencia de transacciones largas o sesiones inesperadas. Se observó además una sesión `kortek_backup` cuya actividad no es visible. Se aplica la instrucción del propietario: ante una discrepancia del precheck, detenerse antes de escribir.

## Autorización y base

El propietario confirmó directamente en el chat la autorización P3/P4 descrita en el objetivo. Permite una ejecución de `prisma migrate deploy` con Node22.22.3/Prisma6.19.3 desde worktree detached de main8e1501e, seguida de customer-stage-one-runtime-grants.sql solo si pasa, con prechecks obligatorios. No permite resolve, edición SQL/ledger, restore productivo, builds, despliegues, flags, promoción o cambios de proveedores; no se confirmaron horarios.

Antes de esa confirmación, la revisión automática rechazó el primer fetch por interpretar que solo existía autorización P2. No se eludió el rechazo. Tras la confirmación directa, `git fetch origin` terminó exit0. Base local y remota documental: **`3878fa863fa9f6b67183e06020e4d3ddf50f0b00`**. Rama `ai/reserva-invitado-ci`; único archivo ajeno, Playbook local sin versionar, preservado. Se consultaron [entrada documental](../README.md), [estado vigente](../../PROJECT_MASTER.md), [gates](DELIVERY_GATES.md), [seguridad](SECURITY_STANDARD.md), instrucciones backend, scripts SQL reales y [P1/P1c](PREFLIGHT_PRODUCCION_P0_P1.md). [P2](VERIFICACION_PRODUCCION_P2.md) mantiene su discrepancia de aliases y no constituye autorización de promoción.

Fetch confirmó `origin/main=8e1501e89a132e1b01d3633b1b3f896a8cbe5800` y `origin/ai/antigravity-qa=523d993cfa0c797f356c224d5cc026d6c9ad4c7b`. No se creó worktree: se priorizó comprobar la base productiva antes de preparar la ejecución; la parada deja el código de ejecución pendiente. Node local devuelve v22.22.3 y Prisma local 6.19.3; no se instaló ninguna dependencia ni se ejecutó Prisma contra producción.

## Paso 0: evidencia y parada

Lectura SQL mediante psql18 local contra servidor **PostgreSQL17.6**. Conexión ya verificada: pooler de sesión5432, `sslmode=verify-full`, CA local con barras normales `/`, `connect_timeout=15`; login `kortek_migrator`, sin SET ROLE. Credencial DPAPI local existente transferida al proceso mediante su entorno, sin secreto en argumentos, salida ni Git. `PGOPTIONS` fuerza default_transaction_read_only=on y statement_timeout=120000; consultas en `BEGIN READ ONLY`. stdout/stderr y exit se guardaron antes de parsear en `.tmp/prod-p3p4/`. Comando `& ./.tmp/prod-p3p4-precheck.ps1`: **exit0**, stderr vacío. El resultado de ese comando no satisface por sí mismo todos los prechecks.

| Requisito | Evidencia | Resultado |
| --- | --- | --- |
| 0(a), identidad/READ ONLY | current_user=session_user=kortek_migrator, transaction_read_only=on, server17.6 | Pasa |
| 0(b), ledger | 30 filas / 26 activas / 4 revertidas; metadatos de todas las filas idénticos a P1 | Pasa |
| 0(b), tablas/conteos | 31 tablas; ninguna diferencia en los 31 conteos frente a P1 | Pasa |
| 0(b), invoice histórico | `20260720044928_add_invoice_model`, checksum `3c1f4f533f24f2b73159e1f9ddbe933684126a4b2ee6a5734c11158d3f88d62a`, finished_at2026-07-20T23:44:07.694054+00:00, rolled_back_at=null | Intacto |
| 0(c), actividad | pg_has_role(current_user,pg_read_all_stats,MEMBER)=false; detalles de otras sesiones ocultos | **No acreditado; parada** |
| 0(d), SSH API productiva | No ejecutado en esta ventana, porque la parada ocurre en 0(c) | Pendiente; no reutilizar P2 como prueba viva |
| 0(e), respaldo P1 | Archivo existente280667 bytes; Get-FileHash vuelve a obtener `a72353911e5c47c6db8ab2a529c686de538dce48b7d7081b26c2a5121fefc297` | Pasa; lectura local adelantada |

Referencia P1 real conservada: `.tmp/prod-p0/p1-source.json`. La carpeta mencionada en el objetivo `.tmp/prod-p1` no existe; los scripts P1 y P1c localizados apuntan a prod-p0. `.tmp/prod-p1c/schema26/comparison.json` conserva el cotejo de restauración con todos sus checks true. No se regeneró ninguna referencia ni respaldo. Backup: `C:\KortekBackups\prod-pre-promocion\kortek-prod-20261009T021816Z.p1.aes256gcm`; no se leyó la clave ni se descifró/restauró.

Integridad de evidencia local (SHA-256): precheck.stdout=`5d674f0e5c740fac3cae7fe2a889666a909a479b896edc13c4191082dcb29ce3`; precheck.stderr=`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (vacío); precheck-summary.json=`656d361ca02bcdd15380fd8c137a79d8d5c425c287c8817915d565b3e77458ae`; referencia p1-source.json=`b0a3e060790f305fdd2ed38bcda256b9fd4f7446f602671eb5922618c04385be`.

Conteos P1 iguales a la lectura viva: AuditLog9; Booking0; BookingEmailEvent0; BookingEmailPreference0; Client0; CmsOperation0; CmsPage2; EmailAbuseBucket0; EmailChannelControl1; EmailOutbox0; EmailWebhookReceipt0; GalleryImage0; Invoice0; MediaAsset0; MediaGalleryOrder0; MediaOperation0; MediaPromotion0; MediaPurgeJob0; Membership2; Notification0; Organization2; Payment0; Professional0; ProfessionalAvailabilityBlock0; ProfessionalService0; ProfessionalWeeklySchedule0; SecurityRateBucket2; Service0; TeamInvitation0; User2; _prisma_migrations30. Estos conteos no prueban igualdad byte a byte de datos de organizaciones: esa verificación postmigración no se ejecutó.

### Actividad observada

Se consultó pg_stat_activity para esta base, excluyendo el PID del lector. Las 14 sesiones restantes devuelven **null** en backend_type, state, client_addr, xact_seconds, query_seconds, wait_event_type y wait_event. No se consultó ni publicó el texto SQL de sesiones.

| Rol | Aplicación visible | PID(s) |
| --- | --- | --- |
| postgres | pg_net0.20.4 | 4892 |
| supabase_admin | pg_cron scheduler / postgres_exporter / vacía | 4893 / 5529 / 35651 |
| authenticator | PostgREST14.5 | 5787 |
| pgbouncer | Supavisor(auth_query) / vacía | 220008 / 1474207 / 1474236 / 1473540 |
| kortek_runtime | Supavisor | 931630 / 959908 / 1467693 / 1470594 |
| kortek_backup | Supavisor | 1474206 |

Los nombres de aplicaciones son compatibles con servicios de plataforma, pero esa inferencia no acredita que las sesiones sean inocuas ni que las runtime correspondan exclusivamente a API/worker. `kortek_backup` es otra identidad distinta de API/worker: no se demuestra si está idle, en transacción o realizando un respaldo. La ausencia de tiempos visibles impide comprobar el requisito de transacciones largas. **No se otorgó pg_read_all_stats, no se buscó otra credencial administrativa y no se terminó ninguna sesión.**

## P3/P4 y verificación posterior no ejecutados

`prisma migrate deploy`: **0 ejecuciones**, duración **no aplicable**. `customer-stage-one-runtime-grants.sql`: **0 ejecuciones**. No hubo error de migración que exigiera leer un ledger posterior; el ledger capturado sigue siendo el previo30/26/4. No se aplicaron27/28, ni resolve, ni SQL compensatorio, ni restore.

Por la parada no se verificaron ledger32/28/4, checksums nuevos27/28, 37tablas, funciones/ACL/search_path, matriz runtime37, datos después del DDL, GET health/booking-data ni SSH final. Se comprobó solo la existencia local de `supabase-production-runtime.dpapi`, sin abrirla ni usarla; el login runtime queda pendiente. No se buscaron credenciales fuera del equipo ni se contactó Vercel/OCI/Clerk/Supabase por sus conectores. Ninguna API/imagen/PID/flag fue modificada por esta tarea; **su estado vivo no fue revalidado por SSH en esta ventana**.

## Continuación exacta

Resolver primero la observabilidad de 0(c) con una lectura administrativa **READ ONLY** expresamente autorizada y una conexión ya custodiada, o evidencia equivalente que permita verificar edades/estados y procedencia de sesiones. No ampliar grants del migrador por inferencia. Aclarar la sesión kortek_backup antes de reabrir la ventana. No autoriza omitir el requisito ni tomar los null por cero.

Después, volver a verificar todos los prerrequisitos vivos, incluido SSH, respaldo y ledger/conteos; preparar el worktree detached de main exacto y confirmar bytes/checksums. Solo con los prechecks satisfechos procede la única ejecución autorizada; no se consumió ningún intento en esta ventana. Conservar stdout/stderr crudos y duración; detenerse si exit no es0, sin reintentos. Tras deploy exitoso, aplicar los grants una vez y completar toda la verificación solicitada. **No-Go actual no autoriza P7, despliegue ni apertura.**

## Entrega documental

Único archivo versionado: este informe en docs/quality, con un commit sobre3878fa8 y push sin force solo a ai/reserva-invitado-ci. Validar enlaces, diff completo, diff --check y staged --check; staging por ruta exacta. SHA documental y cotejo local=remoto se reportan al entregar, evitando un hash autorreferencial. Main y QA deben conservar los SHA arriba; no hubo merge ni push a ellas. El Playbook ajeno sigue untracked, hash `3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090`. Evidencia local ignorada preservada en `.tmp/prod-p3p4/`; sin secretos o valores PII en el informe. No se ejecutaron builds/tests.
