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
