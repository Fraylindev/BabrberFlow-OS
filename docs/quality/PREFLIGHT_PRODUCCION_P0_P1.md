# Preflight producción P0, respaldo P1 y ensayo P1b

## Continuación vigente — 2026-10-08, 22:34 America/Santo_Domingo

**P1 RESTORE Y COTEJOS DE PUBLIC APROBADOS TÉCNICAMENTE; P1b MIGRACIÓN/GATES APROBADOS TÉCNICAMENTE. NO-GO GLOBAL PARA PROMOCIÓN/APERTURA.** Base `ab5a0171c8fb162015936ac4ffe025fb03784687`, rama `ai/reserva-invitado-ci`. La nueva orden autoriza reparar el arnés y hasta dos intentos por paso para fallos locales posteriores a conexión exitosa; TLS/autenticación/conexión siguen limitados a uno. Copia externa del nuevo respaldo y ejecución real del código productivo anterior siguen pendientes. La cobertura del respaldo se delimita abajo: aplicación en public más suplemento de catálogo, no copia integral de la plataforma Supabase.

Vercel no se reconsultó ni modificó: se conserva la lectura previa Disabled. Docker se comprobó solo mediante `docker version --format '{{.Server.Version}}'`: exit 0, Server 29.6.1. Sin nuevo pull ni repetición de las comprobaciones completas PG17.6; se reutilizó la imagen exacta documentada en el checkpoint anterior.

### Arnés y referencia preservada

Archivos modificados/creados únicamente en `.tmp`, ignorados. Ensayo offline exit 0: documentos JSON consecutivos y multilínea, y fallo de parseo inyectado con archivo conservado. El arnés escribe stdout/stderr redactados **antes** de decodificar JSON, usando un decoder sobre documentos completos; conserva resultados y nombres por intento. Toda salida psql del clone/gates también se guarda antes de parsear/asertar. Stderr de pg_dump se conserva; su stdout binario se conserva cifrado en flujo antes de cualquier TOC/parseo, sin dump plano en disco.

Lectura repetida: `pwsh -NoProfile -File .tmp/prod-p1-run.ps1 catalog`, **exit 0**. Referencia cruda `.tmp/prod-p0/p1-catalog-20261009T021531Z.stdout.txt`, stderr correspondiente vacío; referencia parseada `.tmp/prod-p0/p1-source.json`. Estos archivos son evidencia local ignorada, no contenido del commit. Misma credencial DPAPI local migrador, stdin hacia el arnés y PGPASSFILE en `/dev/shm` del cliente temporal; no contraseña en argv/env/logs/chat/repo. Pooler de sesión `aws-0-us-east-1.pooler.supabase.com:5432`, usuario de conexión `kortek_migrator.ilaoolpcrlmqkftirjog`, `verify-full`, CA local absoluta con `/` montada readonly. Sin otras credenciales, postgres o SET ROLE en producción.

`current_user=session_user=kortek_migrator`, transaction_read_only=on, servidor 17.6, BEGIN READ ONLY/COMMIT. **31 tablas, 30 filas del ledger, 26 activas y 4 revertidas**. Booking=0, Client=0, User=2; no se imprimieron filas de negocio. Roles migrador/runtime: LOGIN, NOINHERIT, NOSUPERUSER, NOCREATEROLE, NOCREATEDB, NOREPLICATION, NOBYPASSRLS, connection limit -1, valid until/rolconfig null. Owners de relaciones public: kortek_migrator. Btree_gist 1.7 en public, owner supabase_admin.

La causa del parseo anterior queda confirmada con la referencia nueva: el agregado contiene documentos JSON multilínea; el lector anterior cortaba por líneas. No se atribuye a TLS/SQL. En esta continuación no hizo falta reintentar esa lectura.

### P1: respaldo cifrado, cobertura y custodia

Antes de iniciar pg_dump se detectó offline un error de formato SID en icacls (1332). Se corrigió el literal SID con `*` y se validaron permisos locales. No había comenzado pg_dump/conexión ni se había creado clave; esto no fue un reintento de login/dump. **Primer y único pg_dump real exit 0**, cifrado exit 0, 8.920 s de flujo completo. Cliente **pg_dump 17.6 (Debian 17.6-2.pgdg13+1)** desde `postgres:17.6`, digest previamente verificado `sha256:00bc86618629af00d2937fdc5a5d63db3ff8450acf52f0636ec813c7f4902929`. Sin cliente PG18.

`pg_dump --format=custom --schema=public --verbose`, conservando owners y ACL; mismo migrador/session pooler/verify-full, default_transaction_read_only=on. Stderr redactado persistido en `.tmp/prod-p0/p1-dump-20261009T021816Z.stderr.txt`: progreso normal, sin error. El dump se conectó directamente al cifrador AES-256-GCM; nunca se escribió plaintext del dump. El artefacto se cerró primero y después se validó/decodeó para restore.

| Artefacto nuevo P1 | Evidencia |
| --- | --- |
| Ruta | `C:\KortekBackups\prod-pre-promocion\kortek-prod-20261009T021816Z.p1.aes256gcm` |
| Tamaño | **280667 bytes** |
| SHA-256 | **`a72353911e5c47c6db8ab2a529c686de538dce48b7d7081b26c2a5121fefc297`**; recomprobado tras el ensayo |
| Cifrado | AES256-GCM, clave aleatoria 32 bytes, nonce aleatorio 12 bytes, tag 16 bytes; autenticación comprobada al descifrar |
| Contenido | Frame de catálogo/roles/ACL/extensiones/referencia/conteos en JSON y dump custom íntegro de public, incluido ledger con todas sus columnas/30 filas |
| Clave | `C:\KortekBackups\keys\kortek-prod-20261009T021816Z.key.txt`; una línea base64, sin valor en este informe |
| Protección de clave | ACL Windows solo usuario Fraylin, heredada de directorio protegido; clave fuera de argv/env/logs/chat/repo |
| Decodificador portable | `C:\KortekBackups\prod-pre-promocion\kortek-p1-aes256gcm.cjs`, SHA `8a74ad1c58f97ffca71964ddf64692d89e3479bb93b21fecf742ae2ebe5cb0a0`; sin clave embebida, usa Node estándar |
| Copia externa | **Pendiente del propietario**, artefacto y decodificador listos; no se transfirieron a otro destino |

Formato explícito para recuperación: ASCII `KORTEKP1` (8 bytes), nonce (12), ciphertext y tag final (16). Plaintext autenticado: longitud uint64 big-endian del JSON, JSON UTF-8 y bytes PGDMP. El decodificador verifica GCM antes de entregar contenido y permite modos metadata/dump; recibe **ruta** de clave, nunca su valor en argv. Se conservó junto al artefacto para no depender del archivo ignorado del repo. No es formato GPG ni un dump legible directamente por pg_restore.

**Custodia del propietario:** abre localmente `C:\KortekBackups\keys\kortek-prod-20261009T021816Z.key.txt` en una sesión privada y copia su única línea al campo secreto de una entrada de tu gestor, titulada «Kortek producción P1 20261009T021816Z». Anota nombre y SHA del artefacto en esa entrada; verifica que puedes recuperar la clave y vacía el portapapeles. No pegues la clave en el chat ni la guardes junto a la copia externa del cifrado. Conserva la copia local protegida hasta validar la recuperación desde tu gestor. El operador no abrió/imprimió la línea como evidencia.

**Cobertura frente a pg_dump public:** el frame suplementario conserva atributos de todos los roles no pg_, schemas/owners/ACL, default ACL, inventario de seis extensiones, relaciones/constraints/índices/funciones/triggers public y 39 tablas gestionadas fuera de public. Roles/default ACL y btree_gist no se suponen incluidos por el filtro public. Se recrearon roles y schemas necesarios del catálogo; en particular ambos roles de aplicación conservan exactamente sus atributos. No se respaldaron contraseñas/hashes de roles ni filas de auth/realtime/storage/vault, blobs de Storage o configuración de la plataforma. Supabase_vault y las otras extensiones gestionadas se **inventariaron**, no se clonó la plataforma. Esta limitación impide declarar «respaldo integral de toda Supabase» y requiere decisión de cobertura antes de promoción; no se buscaron otras credenciales ni se ampliaron permisos.

### P1: restore aislado y comparación

Clon `kortek-p1-20261009`, PG17.6, datos en tmpfs de 512 MiB, red Docker internal sin acceso externo. La publicación solicitada 127.0.0.1:55476 no quedó enlazada en esa red; Prisma usó un proxy temporal ligado exclusivamente a loopback, con transporte binario por docker exec/STDIO hacia PostgreSQL **del clon**. Ningún proceso de Prisma recibió credenciales productivas. El administrador de bootstrap del clon fue supabase_admin; no se usó para ejecutar las migraciones. Ambos roles Kortek permanecieron sin superusuario/BYPASSRLS/membresías administrativas.

Clientes **pg_restore y psql 17.6 (Debian 17.6-2.pgdg13+1)** desde la misma imagen, nunca PG18. Primera restauración conectó correctamente y falló al CREATE SCHEMA public porque ya existía; pg_restore exit 1, descifrado exit 0. Raw stdout/stderr/resultados conservados bajo prefijo attempt1. La transacción única no dejó una restauración parcial aplicada.

Segundo y último pg_restore: lista TOC que omite **solo** la entrada de creación de SCHEMA public; no omite ACL/owners ni cambia SQL/ledger. `--exit-on-error --single-transaction`, **pg_restore exit 0, descifrado exit 0**, restore **3.394 s**. No hubo nuevo dump o conexión productiva para ese reintento local.

El suplemento respaldado reconstruyó ACL explícitas de 188 funciones miembro de btree_gist, no restauradas por pg_dump public: 1128 grants exclusivamente en el clon. El primer comparador detectó además orden de colecciones distinto por locale y orden ACL; el comparador final ordena colecciones/ACL conservando **todos** los campos y valores, sin omitir diferencias semánticas. Las referencias de ambos cotejos quedaron guardadas.

| Cotejo fuente → clon antes de migrar | Resultado |
| --- | --- |
| 31 tablas y conteos | Exactos |
| Ledger: entradas/metadatos/checksums | 30 filas/26 activas/4 revertidas, exactos; dump conserva también logs |
| Relations/owners/ACL/RLS | Exactos |
| Constraints e índices | Exactos |
| Funciones: firma, retorno, owner, cuerpo MD5, seguridad, ACL/config | 195 funciones, exactos |
| Triggers | Exactos |
| Migrador/runtime: atributos reales | Exactos, no superusuario/no BYPASSRLS |
| Btree_gist: versión/schema/owner | 1.7/public/supabase_admin, exactos |
| ACL de schema public y default ACL public | Exactas, normalizado solo el orden |

Los once checks finales son true en `.tmp/prod-p0/p1-compare-complete.json`. Este Go de restore corresponde a la cobertura de aplicación y suplemento descritos, no a schemas gestionados completos ni recuperación de proveedores.

### P1b: S exacto y comportamiento real de Prisma

`git fetch origin ai/antigravity-qa`, exit 0; FETCH_HEAD/remoto **`523d993cfa0c797f356c224d5cc026d6c9ad4c7b`**. Worktree detached creado desde ese SHA, limpio antes/después; código, SQL y ledger no editados. Las migraciones se comprobaron contra los hashes de sus bytes LF del worktree. Dependencias locales existentes Prisma **6.19.3**, coincidentes con S, sin instalación ni builds. CLI local ejecutada con cwd/schema del worktree S y URL exclusivamente del clon; conexión efectiva kortek_migrator/current_user=session_user, superuser=false, bypassrls=false, sin SET ROLE.

| Comando en el clon | Resultado observado |
| --- | --- |
| prisma migrate status | **exit 1**, stderr vacío; lista únicamente 27 business_schedule y 28 customer_stage_one pendientes. Ese exit no se cuenta como gate aprobado ni como fallo TLS |
| prisma migrate deploy | **exit 0**, stderr vacío; aplica 27 y 28, «All migrations have been successfully applied» |

**Checksum histórico ensayado sin corregirlo:** Invoice conserva en ledger `3c1f4f533f24f2b73159e1f9ddbe933684126a4b2ee6a5734c11158d3f88d62a`; blob/worktree S `39f522178c044b3ae135d6faaa9961c35f57ce83aa09632c390607f9e13f984b`. En este ensayo Prisma 6.19.3 **no bloqueó deploy por esa discrepancia**; el ledger de Invoice quedó con el hash original. No se generaliza a otras versiones/comandos ni se usa migrate resolve. Los cuatro intentos revertidos se conservaron.

Resultado después de migrar y aplicar el suplemento:

- **32 filas de ledger / 28 activas / 4 revertidas**, 37 tablas.
- 27 `20260927170000_business_schedule`: checksum **`82890d487a40d0c25edfd77019df6454f101f6222aa5235b3ea6f8a958272d82`** exacto al archivo S.
- 28 `20261003120000_customer_stage_one`: checksum **`6e1d854f285f4a4a691377d6654d0a4df80f29ca5c3ad375b352ae96894d6dee`** exacto al archivo S.
- `customer_access_relink()` y `customer_booking_revision()`: cero argumentos, retorno trigger, SECURITY INVOKER, owner kortek_migrator, ACL únicamente kortek_migrator/kortek_runtime EXECUTE, **sin PUBLIC**, config exacta `search_path=pg_catalog, public, pg_temp`.
- `customer-stage-one-runtime-grants.sql` de S aplicado **como migrador** en el clon, exit 0; funciones/ACL verificadas después de ese apply, sin afirmar que la migración sola fijó su search_path.
- `verify-runtime-role.sql` íntegro de S **como runtime**, exit 0, matriz **37 tablas**. `verify-integrity.cli.ts` de S **como runtime**, ejecución TS en memoria con dependencias existentes, exit 0: `Supplemental PostgreSQL constraints and indexes: OK`. Sin build ni reparación del esquema.

Adaptación explícita del entorno aislado: PostgreSQL estándar no incluye supabase_vault y el verificador permite TEMP únicamente bajo esa excepción de Supabase. Se revocaron CREATE/TEMP de PUBLIC **solo en la DB del clon** y se confirmó CONNECT de ambos roles; no se modificaron el verificador, migraciones, attrs de roles o ACL public. El gate se ensayó con restricción de TEMP más fuerte; no acredita igualdad de privilegios de DB/plataforma gestionada que no se respaldaron en P1.

**Duración y bloqueos:** migrate deploy completo **9.928 s**, incluido proceso/proxy/transporte; ledger Prisma registra 27 **22.965 ms** y 28 **11.695 ms** entre started_at/finished_at. Son intervalos de ejecución/contabilidad de migración, no cronometría individual de cada sentencia DDL. Muestreo del clon durante deploy: **3 muestras**, waiting_locks=0, blocked_sessions=0, AccessExclusiveLock concedidos observados=0. El transporte produjo muestras separadas unos 3.3 s y puede omitir locks de milisegundos; no se afirma ausencia total de locks ni se extrapola duración/bloqueo a producción con carga. Raw de status/deploy/muestreo y postledger se conservan ignorados.

### Client/Booking y código anterior: límite del ensayo adicional

Se ejecutó SQL temporal como runtime con fixtures sintéticas y columnas anteriores a 28: defaults de Client, relink/ambigüedad y revisión por INSERT/UPDATE/movimiento de Booking. El comando completo terminó **exit 3** al intentar DELETE Booking, permiso excluido del runtime; **no se cuenta como ensayo aprobado completo**. No se amplió ese permiso ni se cambió una aserción para convertirlo en éxito.

Una lectura posterior exit 0 confirma `has_table_privilege(Booking, DELETE)=false` y **cero fixtures Client/Booking restantes**, tras aborto/rollback de la transacción al cerrar conexión. Este resultado concuerda con la matriz de privilegios; no es evidencia de un fallo del trigger DELETE. Se detuvo el ensayo adicional en ese punto, sin repetirlo. **La ejecución del artefacto/API productivo anterior sobre schema28 sigue pendiente**: el ensayo SQL no ejecutó ese código ni acredita rollback de código, tenant HTTP o comportamiento del ORM anterior. No se reutilizó el dist actual como prueba de la versión histórica.

### OCI restore semanal: logs propios, persistencia y salidas 1

SSH sanitizado de solo lectura, exit 0, evidencia cruda redactada guardada antes del parseo. Se releen unidades/scripts/backup y se amplía journal de `kortek-restore-drill.service` **2026-09-25 → 2026-10-09 23:59:59 UTC**, máximo 200 entradas: **`-- No entries --`**, exit 0. Estado sigue failed/exit-code/ExecMainStatus=1 del **2026-10-04 06:32:08 UTC**. No se ejecutó/corrigió el job.

La unidad usa StandardOutput=journal, StandardError=inherit, WorkingDirectory vacío, StateDirectory=kortek-backup y PrivateTmp=yes. El script crea `kortek-restore.XXXXXX` bajo STATE_DIRECTORY (o /tmp de fallback), escribe allí `bucket.json`, `restore.list`, `decrypt.stderr`, `restore.stderr` y `counts.txt`; `cleanup` elimina **todo el workdir al salir**. Solo instala `/var/lib/kortek-backup/latest-restore-counts.txt` **tras éxito completo**. Ese archivo existe y contiene 31 tablas/30 filas ledger/25 Booking, referencia de un éxito previo sin fecha acreditada aquí, no log del fallo del 4 ni conteo actual. Búsqueda dirigida en /var/log, /var/lib/kortek-backup y /var/lib/kortek-restore no encontró log propio de fallo retenido. No se leyeron claves ni archivos secretos para esta investigación.

Journald **persistente demostrado**: drop-in `/etc/systemd/journald.conf.d/60-kortek-retention.conf`, Storage=persistent, SystemMaxUse=100M, RuntimeMaxUse=50M, MaxRetentionSec=7day; `/var/log/journal` existe, `/run/log/journal` vacío. Journal ocupa **95.9M**; `journalctl --list-boots` solo conserva el boot actual, primera entrada **2026-10-07 06:28:30 UTC**. El fallo del día 4 está fuera del intervalo retenido observado. **Hipótesis:** la cota de tamaño eliminó registros anteriores; no se demuestra qué mecanismo concreto los retiró. Siete días es máximo, no garantía mínima.

Rutas de salida no cero del script instalado actual (set -Eeuo pipefail):

| Etapa | Rutas que pueden producir exit 1 / límite de diagnóstico |
| --- | --- |
| listing | OCI list/parseo fallidos o `test -n "$name"` con lista vacía |
| download | get del dump/sha fallido o `sha256sum --check` distinto |
| isolated_postgres | run/readiness/CREATE EXTENSION fallidos; exit real depende del comando |
| restore | gpg/pg_restore list o grep de SCHEMA fallidos; pipeline de restore captura PIPESTATUS y ejecuta **exit 1** explícito |
| verification | `test tables -eq 31`, `test migrations -ge 26`, **`test bookings -ge 1`**, o instalación del conteo fallida |
| cleanup | Conserva status, emite RESTORE_DRILL_FAILED stage/status y elimina stderr propios; no conserva causa detallada |

**Causa del incidente aún no demostrada.** Booking=0 en la referencia P1 actual y el test ≥1 demostrarían un fallo de verificación **si el objeto usado contuviera cero Booking**; no se conoce el contenido de aquel objeto ni la etapa real. Se conserva como hipótesis, junto con fallos posibles de descarga/descifrado/restore. No se atribuye el incidente al test sin evidencia histórica.

### Backup programado: lectura confirmada y carencias frente al plan

Unidad/script/timer releídos sin ejecutar. Script instalado equivale al repo normalizando CRLF/LF. `public --no-owner --no-acl`, rol operativo kortek_backup, pooler sesión verify-full, clientes `postgres:17` sin pin menor; **no se usó esa credencial**. Cifrado GPG AES256 en flujo, daily a bucket privado `kortek-booking-encrypted-backups`/namespace idujavz2hijf/us-ashburn-1 y sidecar SHA. Diario 05:17 UTC con hasta 300 s de variación; último éxito registrado 2026-10-08 05:20:45 UTC. Journal conserva BACKUP_OK, 21417 bytes, SHA `0e84441285a6ed61a086479f2eecabd37a4b1375c7c46d84a076a5f5ddac062d`; no se confunde con el artefacto P1 nuevo.

GET de lifecycle vuelve a devolver **LifecyclePolicyNotFound**, 404 específico: no política ni purga automática; script sin borrado, tope preventivo bucket 8 GB y objeto 450 MB, sin retención temporal garantizada. Le faltan frente a este plan: owners/ACL/roles y suplemento de extensiones, cobertura explícita fuera de public, pin menor PG17.6, restore vigente de 37 tablas y fixtures válidas para base sin reservas, logs de fallo durables, retención/lifecycle decididos y custodia/copia independiente verificadas. Solo se documentan; no se editaron scripts/jobs/IAM/políticas.

### Veredicto por criterio, limpieza y Git

| Criterio | Veredicto de esta continuación |
| --- | --- |
| Referencia migrador READ ONLY / TLS / ledger30/26 | **Go técnico**, capturada y conservada |
| Respaldo cifrado de aplicación + suplemento | **Go técnico** para cobertura declarada, tamaño/SHA/clave protegida; no backup integral de plataforma |
| Restore/cotejos public/roles/btree_gist/ACL | **Go técnico**, once checks exactos tras suplemento |
| Copia externa y recuperación independiente de laptop | **Pendiente / No-Go de continuidad**, destino/clave en gestor a cargo del propietario |
| Cobertura de schemas/datos/plataforma gestionada | **Incompleta**, solo inventario; decisión/verificación adicional pendiente |
| Prisma checksum histórico / deploy27/28 / ledger / funciones / runtime37 / integridad | **Go técnico del clon** con S/Prisma/PG exactos y adaptación TEMP documentada |
| Medición DDL/bloqueos | Intervalos y muestras capturados; **limitado**, sin perfil por sentencia ni prueba de carga productiva |
| Código anterior sobre schema28 / rollback funcional | **Pendiente**; SQL adicional exit3, no se declara aprobado |
| Restore semanal / retención / logs / alertas y demás criterios P0 pendientes | **No-Go operativo**, causa no demostrada, jobs intactos; sin nuevas consultas Clerk/IAM/Vercel |
| Integración M/artefactos/QA live/Piloto/Paso8/promoción/apertura | **No-Go global**, gates posteriores no autorizados ni ejecutados |

Limpieza exit 0: se retiraron únicamente clon tmpfs, red internal, proxy temporal y worktree limpio creados por esta tarea; respaldo/clave/decodificador quedan locales. No se descartó trabajo ajeno. Comparación final SSH: **4/4 contenedores producción/QA idénticos** en campos comunes (ID/imagen/PID/running/release/entorno/envHash/flags/presencia de RATE_LIMIT_SECRET); producción PUBLIC_BOOKING_CLOSED=true y correo false. Sin escrituras productivas/QA, cambios de proveedores/IAM, builds, despliegues ni flags.

Locales main `01113ef0be7d8abcd74e3e7297f7989b359c76c0` y QA `36061fc3c978758642b5a79ed6cb0e5ff25c003f` intactas; remotos main `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6` y QA `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`, sin mover ramas (locales atrasadas 2/6). Vercel no reconsultado por instrucción; ninguna acción de alias/configuración. Playbook ajeno sigue sin seguimiento y conserva SHA `3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090`. Solo informe y tres entradas de control documental en el único commit/push autorizado; artefacto/clave no entran al repo. SHA publicado, local=remoto y status final se reportan en la entrega.

## Registro histórico — continuación publicada en ab5a017

## Continuación vigente — 2026-10-08, 22:05 America/Santo_Domingo

**NO-GO GLOBAL / PAUSADO / INCOMPLETO EN P1: PROCESAMIENTO LOCAL DEL CATÁLOGO.** Base exacta `be90fd4812ff08a6d8f0a2fa69133a23e565e8f2`, rama `ai/reserva-invitado-ci`. Esta sección sustituye solo el estado vigente de los criterios revalidados; las secciones inferiores son historia fechada. El propietario habilitó Docker y declaró haber desactivado la autoasignación; ambas condiciones se comprobaron. Las lecturas independientes autorizadas se conservan pese a la parada de P1.

### 1(a): Vercel, autoasignación desactivada

Sesión Chrome existente, pestaña del propietario en [Production de kortek-booking](https://vercel.com/fraylindev/kortek-booking/settings/environments/production): Branch Tracking **main**; Auto-assign Custom Production Domains muestra **Disabled**, checkbox sin marcar, nota «Production deployments will need to be manually promoted», botón **Save deshabilitado**. No se accionó el checkbox ni Save, no se cambiaron variables, dominios o despliegues. **Go técnico para este prerrequisito**, sin autorización de promoción.

Conector de lectura `get_deployment(withGitRepoInfo=true)` confirma aliases sin cambios frente al checkpoint previo:

| Alias | Deployment / estado | SHA |
| --- | --- | --- |
| booking.kortek.cloud | `dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm` / READY | `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6` / main |
| qa.booking.kortek.cloud | `dpl_3WyqcfwaKgpsnQzLaMmgifuB3mHg` / READY | `523d993cfa0c797f356c224d5cc026d6c9ad4c7b` / ai/antigravity-qa |

### 1(b): diagnóstico de restore semanal y cobertura del backup

SSH de solo lectura con la misma clave y known-hosts locales del preflight sanitizado, `BatchMode=yes`, `StrictHostKeyChecking=yes`, `sudo -n python3 -`. Lectura de `systemctl cat/show`, scripts por ruta ExecStart y `journalctl -u ... -n 70 --no-pager -o short-iso`; **SSH exit 0**. Redacción antes de transmitir: sustitución de secretos de entorno en memoria, URIs PostgreSQL y asignaciones de contraseña/token/secret. No se leyó el contenido de la frase de cifrado ni se ejecutaron los scripts, reinicios, cambios de permisos o correcciones.

Restore: unidad `/etc/systemd/system/kortek-restore-drill.service`, User/Group opc, oneshot, `LoadCredential=encryption-passphrase:/etc/kortek-backup/encryption-passphrase`, StateDirectory kortek-backup, PrivateTmp true, timeout 900 s; ExecStart `/usr/local/libexec/kortek-restore-drill.sh`. Timer domingos 06:30 UTC, Persistent true y variación hasta 300 s. Estado **failed / Result exit-code / ExecMainStatus 1**, última salida **2026-10-04 06:32:08 UTC**. Journal devuelve literalmente **`-- No entries --`**: no existe stderr histórico recuperable en esta lectura.

**Demostrado:** el fallo registrado y la ausencia actual de entradas del journal. La etapa y causa concreta del fallo siguen **no demostradas**. El script descarga el último `.dump.gpg`, comprueba SHA, restaura en contenedor `postgres:17` con red none y exige exactamente 31 tablas, al menos 26 filas de ledger y **Booking ≥1**. Ese último requisito es incompatible con una copia que contenga cero reservas. **Hipótesis:** pudo fallar ese test, dada la lectura histórica de producción con Booking=0; no se conoce el conteo del objeto usado el 4 de octubre ni se conservó la lectura nueva de P1. También pueden fallar descarga, descifrado o restore; sin journal no se elige una causa. La exigencia de 31 tablas tampoco cubre el futuro esquema de 37. No se corrigió ni ejecutó el restore semanal.

Comparación de scripts instalados con los archivos actuales del repo:

| Script | SHA-256 OCI (bytes) | SHA-256 repo (bytes) | Comparación |
| --- | --- | --- | --- |
| restore-drill.sh | `cfdf9313235a52fbbc7d705dee1ee4eaa353dba5d76a3b91c8683c1c663cb90c` | `6699fbfebf2afa4893828be1526bc69293b357c9d25f2882cdae4c5a29f31956` | Bytes distintos; contenido igual al normalizar CRLF/LF |
| backup.sh | `21cdd60b21f3cc62183600463c4896464d9cd5ac7ad9d89e39e761d9e96136f1` | `6a681613626e6060639e7b34fbcc3ce4937a9e1263533937222bda4566c6089c` | Bytes distintos; contenido igual al normalizar CRLF/LF |

No se normalizó ni escribió ninguno de los archivos originales. Comparación normalizada en memoria, antes de la redacción de su contenido.

Backup: unidad `/etc/systemd/system/kortek-backup.service`, oneshot/opc, LoadCredential para contraseña DB y frase de cifrado, StateDirectory kortek-backup, PrivateTmp true, timeout 900 s; ExecStart `/usr/local/libexec/kortek-backup.sh`. Diario 05:17 UTC, Persistent true y variación hasta 300 s. Estado inactive / Result success / ExecMainStatus 0, salida **2026-10-08 05:20:45 UTC**. Journal acredita:

```text
BACKUP_OK object=daily/20261008T052037Z-637ea479-382d-4a1e-8329-e16d9bad492d.dump.gpg
bytes=21417
sha256=0e84441285a6ed61a086479f2eecabd37a4b1375c7c46d84a076a5f5ddac062d
```

Cobertura y límites demostrados por script instalado: `pg_dump --format=custom --schema=public --no-owner --no-acl`, cliente imagen `postgres:17` sin pin menor, usuario operativo `kortek_backup` y pooler sesión 5432/TLS verify-full. **No se usó esa credencial en esta tarea.** Dump en flujo hacia GPG `--symmetric --cipher-algo AES256`; no dump plano en disco. Objeto cifrado y `.sha256` en bucket privado `kortek-booking-encrypted-backups`, namespace `idujavz2hijf`, región us-ashburn-1, prefijo daily. Valida TOC, tamaño ≤450000000 bytes, tope preventivo bucket <8000000000 bytes y longitud tras subida. No respalda globals/roles ni conserva owners/ACL; no sustituye el respaldo ampliado P1 solicitado. El BACKUP_OK observado no acredita un restore actual exitoso.

**Retención actual:** el script no elimina objetos. GET OCI `object-lifecycle-policy get`, misma identidad instance_principal, devuelve exit 1 / HTTP 404 **LifecyclePolicyNotFound**, mensaje específico «does not define a lifecycle policy». Aquí sí demuestra ausencia de política lifecycle, a diferencia del 404 ambiguo de alarmas del checkpoint anterior. Sin plazo/purga automática configurada; revisión manual pendiente. No se descargaron objetos ni se consultaron/cambiaron IAM, claves o políticas.

### 1(c): Docker y clientes autorizados

`docker version --format '{{json .}}'`: **exit 0**, Client y Server **29.6.1**, API 1.55, contexto desktop-linux, Docker Desktop **4.82.0 (233772)**, servidor Linux amd64. Prerrequisito antes bloqueado resuelto.

`docker pull postgres:17.6`: **exit 0**. Tag exacta disponible; no fallback. Digest **`sha256:00bc86618629af00d2937fdc5a5d63db3ff8450acf52f0636ec813c7f4902929`**. Lectura de versiones en contenedor temporal con `--network none`, exit 0:

```text
pg_dump (PostgreSQL) 17.6 (Debian 17.6-2.pgdg13+1)
pg_restore (PostgreSQL) 17.6 (Debian 17.6-2.pgdg13+1)
psql (PostgreSQL) 17.6 (Debian 17.6-2.pgdg13+1)
```

Solo se ejecutaron `--version` de pg_dump/pg_restore; no un dump/restore. El único psql de conexión DB de esta continuación se ejecutó desde esa imagen. **Sin cliente PG18 del host.** La imagen descargada queda local; los contenedores de clientes usaron `--rm`.

### P1: fallo local tras una lectura SQL exitosa; parada exacta

Se prepararon arneses ignorados `.tmp/prod-p1-run.ps1`, `.tmp/prod-p1.py` y `.tmp/prod-p1-catalog.sql`. **Un solo intento** `pwsh -NoProfile -File .tmp/prod-p1-run.ps1 catalog`. Misma credencial migrador DPAPI local, enviada al arnés por stdin; dentro del contenedor PGPASSFILE en `/dev/shm`, sin contraseña en argv/logs/chat/repo. Misma conexión `kortek_migrator.ilaoolpcrlmqkftirjog`, pooler `aws-0-us-east-1.pooler.supabase.com:5432`, `sslmode=verify-full`, CA local absoluta con `/` montada readonly en `/ca.crt`. Sin postgres, otra credencial ni SET ROLE en producción.

SQL: `BEGIN READ ONLY`, SELECT de identidad, catálogo de roles/ACL/extensiones/relaciones/constraints/índices/funciones/triggers/default ACL, ledger completo sin columna logs, inventario de tablas fuera de public y conteos de public; COMMIT. `default_transaction_read_only=on`, ON_ERROR_STOP=1. **Proceso psql exit 0; stderr vacío.** A continuación el proceso Python y el comando completo terminaron **exit 1**:

```text
catalog_exit 0 stderr [vacío]
json.decoder.JSONDecodeError: Expecting value: line 1 column 250 (char 249)
```

**Causa demostrada de la parada P1:** excepción del procesamiento local JSON, posterior al éxito del cliente. El arnés usa `json.loads(x)` sobre cada línea que comienza por `{` de `stdout.splitlines()`, en vez de conservar/procesar documentos JSON completos. El traceback señala esa comprensión. **Hipótesis de detalle:** el agregado JSON multilínea quedó fragmentado; no se conserva el stdout bruto para probar qué contenido ocupaba exactamente la columna 250. Error evitable del arnés, no fallo de login/TLS ni de SQL demostrado. No se suprime ni sustituye el stderr del cliente: estaba vacío; se reporta por separado la excepción local.

La salida completa quedó solo en memoria y no se escribió antes del parseo. Por ello **no se verifican ahora identidad/atributos mediante aserción, ledger 30/26, conteos, ACL ni catálogo**: el archivo `p1-source.json` nunca llegó a crearse. La identidad/atributos del login P0 anterior siguen como evidencia fechada, no como comparación P1 nueva. No se inventan resultados a partir del exit 0 SQL. Conforme a «si P1 falla en un paso, detente en ese paso», no se repitió el login/lectura, no se reparó y reejecutó el arnés ni se avanzó al dump.

**Sin respaldo nuevo:** no artefacto ni clave nueva en `C:\KortekBackups\prod-pre-promocion`; tamaño y SHA P1 no disponibles. El hash del backup OCI anterior no es un hash P1. No se generó una clave que el propietario deba importar al gestor. Copia externa P1 pendiente y todavía sin artefacto listo. No se recrearon roles, extensiones o ACL en un clon, no hubo pg_restore ni comparación.

**P1b no ejecutado:** no fetch/worktree de S ni Prisma status/deploy/resolve, cambios SQL/ledger, grants o verificación runtime37/integrity. Comportamiento de Prisma frente a add_invoice_model, ledger final 28 activas, checksums exactos de 27/28, funciones/owners/ACL/search_path, duración DDL/bloqueos e invariantes Client/Booking permanecen pendientes. No hay DDL cuya duración medir.

### Veredicto por criterio y siguiente paso

| Criterio | Resultado vigente |
| --- | --- |
| Autoasignación de dominios antes de integrar | **Go técnico:** desactivada, lectura Chrome; rama main |
| Docker / disponibilidad PG17.6 / versiones clientes | **Go técnico:** Server presente, imagen exacta descargada, tres clientes 17.6 |
| TLS/login P0 y atributos migrador | Go técnico anterior conservado; lectura SQL PG17 actual exit 0, aserciones/catálogo P1 no completados |
| Restore semanal / causa | **No-Go:** failed/exit1; journal vacío, etapa/causa no demostrada; incompatibilidades del verificador documentadas sin corrección |
| Backup operativo / cobertura / retención | Cifrado y ejecución exitosa observados; cobertura limitada a public sin owners/ACL, sin lifecycle; **no satisface P1 ni prueba recuperabilidad actual** |
| P1 respaldo ampliado, clave, restore/comparación/copia externa | **No-Go:** excepción local en lectura de referencia, sin respaldo/clon ni clave nueva |
| P1b checksum / migraciones / ledger28 / matriz37 / integridad / DDL | **No-Go:** no ejecutado |
| Alertas, sondas públicas, secret Clerk Vercel, MFA/OWNER y demás gates del plan | Pendientes previos conservados; no revalidados ni ampliados en esta orden |
| Promoción / apertura | **No-Go global**, no autorizadas por esta evidencia |

Siguiente paso preciso, bajo continuación autorizada: corregir y ensayar offline el manejo de JSON multilínea y la conservación segura de evidencia **antes** de otra lectura productiva; luego obtener referencia P1 verificable, cifrar el respaldo ampliado en flujo y registrar ruta/tamaño/SHA/ubicación protegida de clave. Restore/clientes PG17.6; comparar fuente y clon antes de P1b con S exacto desde remoto tras fetch. La causa del restore semanal seguirá pendiente sin logs del incidente; no corregirlo/ejecutarlo por inferencia. Esta parada no requiere cambios productivos ni IAM.

### Git y preservación

Rama/base comprobadas; único archivo ajeno sin seguimiento, `docs/Playbook Kortek Booking_ del 29 de septiembre al MVP.md`, preservado con SHA-256 `3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090`. Solo este informe y entradas de control documental se publican en el único commit autorizado; arneses/evidencia ignorados, imagen local y ningún artefacto de respaldo en repo.

Remotos main `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6` y QA `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`; locales main `01113ef0be7d8abcd74e3e7297f7989b359c76c0` y QA `36061fc3c978758642b5a79ed6cb0e5ff25c003f`, sin moverlas (atrasadas 2/6). SHA del commit documental/local=remoto/status final se entregan después del push.

OCI API producción conserva release `b5615869dcbec4bd174608f2373e73ff618fae26`, imagen `8caacd8548a61d94807c0b865229a731df594f63f609ca9ab57df99283dceca2`, cierre true/correo false. API QA conserva b318ca5/imagen `8ba1b6c8a45391433998deeae1111d2d96c6cbf84932a7e9972cb6cf90e95eec`. Contenedores/entornos/flags se cotejan al cierre; aliases ya iguales al checkpoint previo. Sin escrituras productivas/QA, reinicios, cambios de proveedores, IAM, builds, despliegues ni flags. La desactivación de autoasignación fue realizada por el propietario antes de esta ejecución.

Verificación final antes de publicar: **4/4 contenedores iguales** en los campos comunes del preflight inicial/final (ID, imagen, PID, running, release, entorno, envHash, cierre/correo y presencia de RATE_LIMIT_SECRET); no se comparan como diferencias los campos añadidos por el preflight ampliado. `docker ps` solo muestra el contenedor local preexistente barberflow-postgres, que no se usó ni modificó. Código/SQL/ops/config/lockfile/workflows sin diff frente a be90fd4; arneses ignorados comprobados por Git; `git diff --check` exit 0. Sin builds o pruebas de producto ajenas al alcance.

## Registro histórico — continuación publicada en be90fd4

## Continuación vigente — 2026-10-08, 21:30 America/Santo_Domingo

**P0(a) LOGIN APROBADO TÉCNICAMENTE; P0(b) LEÍDO; P0(c–d) CON LÍMITES DE ACCESO; P1 DETENIDO ANTES DEL RESPALDO; P1b NO EJECUTADO. NO-GO GLOBAL / PAUSADO / INCOMPLETO.** Esta continuación parte de `515a1062b75f1b80cee78aa8f44830da33b6e2c9`. La orden actual establece que P0(a–d) son independientes: un fallo en (a) solo bloquea P1/P1b. Se completaron las lecturas independientes disponibles; los datos inaccesibles se identifican debajo. La parada anterior no describe el resultado vigente del login.

### TLS sin credenciales: causa demostrada y comprobaciones

Arnés ignorado actualizado: `.tmp/prod-p0-login.ps1`. CA resuelta a ruta absoluta con `/`, sin rebajar `verify-full`. Stderr se muestra entre marcadores y se guarda redactado; se sustituyen la contraseña exacta, su representación URI y asignaciones `password=...`. No se modificaron claves, CA productivas, variables ni proveedores.

**Causa demostrada del defecto del arnés:** `PQconninfoParse` de la misma libpq del cliente, invocado localmente sin conectar ni usar credenciales, elimina los separadores `\` no escapados del conninfo original. Resultado:

```text
Entrada: C:\Users\Fraylin\Desktop\Kortek-Booking\.tmp\base-preprod-c1\supabase-ca.crt
Parseado: C:UsersFraylinDesktopKortek-Booking.tmpbase-preprod-c1supabase-ca.crt
Existe el parseado: false
Entrada corregida: C:/Users/Fraylin/Desktop/Kortek-Booking/.tmp/base-preprod-c1/supabase-ca.crt
Parseado corregido: misma ruta absoluta; existe: true
```

El archivo original sí existía. El primer stderr no fue retenido, por lo que no se reconstruye su frase literal. La reproducción local del parseo demuestra el defecto; el handshake y el único login posterior demuestran que la CA/cadena/hostname actuales funcionan con la ruta corregida. No se atribuye el fallo a contraseña, caducidad o cambio de CA.

| CA local / comparación oficial | Evidencia |
| --- | --- |
| Ruta y existencia | `C:/Users/Fraylin/Desktop/Kortek-Booking/.tmp/base-preprod-c1/supabase-ca.crt`, existente |
| Sujeto y emisor | Ambos: `C=US, ST=Delware, L=New Castle, O=Supabase Inc, CN=Supabase Root 2021 CA` |
| Vigencia UTC | 2021-04-28 10:56:53 → 2031-04-26 10:56:53; vigente en esta lectura |
| SHA-256 del archivo PEM | `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7` |
| Huella SHA-256 del certificado DER | `807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa` |
| Descarga oficial comparada | [CA pública de Supabase](https://supabase-downloads.s3.amazonaws.com/prod/ssl/prod-ca-2021.crt), mismos bytes/SHA del PEM |
| Copia nueva ignorada | `.tmp/prod-p0/supabase-official-ca.crt`; no sustituyó el archivo original porque son idénticos |

La [documentación SSL oficial](https://supabase.com/docs/guides/platform/ssl-enforcement) identifica `prod-ca-2021.crt` y recomienda `verify-full`; la [guía psql](https://supabase.com/docs/guides/database/psql) indica obtener CA y parámetros del proyecto. La copia HTTPS descargada coincide con la raíz presentada/verificada por el pooler; no se confunde hash del PEM con huella DER.

Handshake **sin login**, sin StartupMessage de autenticación, OpenSSL **3.2.3**:

```text
openssl s_client -starttls postgres
  -connect aws-0-us-east-1.pooler.supabase.com:5432
  -servername aws-0-us-east-1.pooler.supabase.com
  -verify_hostname aws-0-us-east-1.pooler.supabase.com
  -CAfile C:/Users/Fraylin/Desktop/Kortek-Booking/.tmp/base-preprod-c1/supabase-ca.crt
  -verify_return_error -showcerts -no_ticket
Exit 0; Verification: OK; Verify return code: 0 (ok)
```

Cadena observada, sujeto → emisor, fechas UTC y huella DER SHA-256:

| Certificado | Emisor / vigencia / huella |
| --- | --- |
| `*.pooler.supabase.com` | Supabase Intermediate 2021 CA; 2025-03-12 15:56:33 → 2030-03-11 15:56:33; `03709ca44d1b06e4504da0a83b6ca065761edc704cd5634bcc3894fd5c7b3248` |
| Supabase Intermediate 2021 CA | Supabase Root 2021 CA; 2023-10-24 07:53:45 → 2033-10-21 07:53:45; `303b0a59bbc8d77e967fbed20b3fe68ec5d7d391c3081ece9936efcef0a55ea` |
| Supabase Root 2021 CA | Autofirmada; vigencia/huella indicadas arriba |

SAN del certificado servidor: `DNS:*.pooler.supabase.com`, `DNS:*.pooler.supabase.co`. IP observada `52.45.94.125`; no se fija como destino permanente. El primer OpenSSL dentro del sandbox falló por permiso MSYS; la ejecución permitida posterior terminó exit 0. No se desactivó verificación.

**Host exacto confirmado:** el conector `supabase_get_project` solo informó el host directo/región; no expone configuración del pooler. Se verificó entonces en el [Connect del proyecto](https://supabase.com/dashboard/project/ilaoolpcrlmqkftirjog?showConnect=true&method=session), sesión Chrome existente, `Session pooler` seleccionado: `aws-0-us-east-1.pooler.supabase.com:5432`. Solo se extrajeron host/puerto; no se copiaron ni mostraron credenciales. La [documentación de conexiones](https://supabase.com/docs/guides/database/connecting-to-postgres) advierte que el índice del pooler no se deduce de la región. No se probó otro host ni pooler transaccional.

### P0(a): único reintento real

`& .tmp/prod-p0-login.ps1`: **exit 0**, cliente **psql PostgreSQL 18.1** exclusivamente para el login autorizado. Misma credencial DPAPI local, usuario `kortek_migrator.ilaoolpcrlmqkftirjog`, puerto sesión 5432, TLS `verify-full`, CA absoluta corregida. Se ejecutaron `BEGIN READ ONLY`, SELECT de identidad/atributos y `COMMIT`; también `default_transaction_read_only=on` y timeout de statement 10 s.

```text
PSQL_STDERR_REDACTED_BEGIN
[vacío: cero caracteres, esta aclaración no es salida de psql]
PSQL_STDERR_REDACTED_END
current_user=kortek_migrator; session_user=kortek_migrator
transaction_read_only=on; current_database=postgres; server_version=17.6
BEGIN / COMMIT correctos; psql exit 0
```

Ambos roles productivos `kortek_migrator` y `kortek_runtime`: LOGIN true; SUPERUSER, INHERIT, CREATEROLE, CREATEDB, REPLICATION y BYPASSRLS false; CONNECTION LIMIT `-1`; VALID UNTIL y rolconfig null. Estos son atributos leídos realmente, no recreados todavía en un clon. Sin postgres, SET ROLE, credencial alternativa ni otro reintento del login.

### P0(b): Vercel, lectura completa de configuración solicitada

Proyecto `kortek-booking`, `prj_Bb980XG9fFTCSeP5MHOL5eTK9F1p`, equipo `team_BBm9XjRsZkjh2iZdqZ0909Q8`. Conector: `get_project`, `filter_project_envs(decrypt=false)` y `list_project_domains(production=true)`. La salida se proyectó antes de mostrarla; ningún valor de variable se imprimió/guardó. El GET con el token local existente devolvió HTTP **403** y no se usó para afirmar configuración. Fallback de solo lectura mediante la sesión Chrome ya abierta en [Production](https://vercel.com/fraylindev/kortek-booking/settings/environments/production):

- Branch Tracking: **main**, campo visible y texto explicativo coincidentes.
- Auto-Assign Custom Production Domains: **activado**, checkbox Value `1`; Save deshabilitado. **No se cambió el toggle ni se guardó configuración.** Bloquea el prerrequisito de retener dominios antes de integrar.
- Dominios productivos comprobados: `booking.kortek.cloud` y `kortek-booking.vercel.app`, sin branch preview y verificados en el conector.
- Cinco variables productivas presentes: `WEB_PUBLIC_ORIGIN`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`, `DEPLOY_ENV`. La secret key es Secret/sensitive; las otras cuatro son Config/encrypted. No se validaron valores de orígenes ni flags web, fuera del inventario pedido.

El [control de promoción documentado por Vercel](https://vercel.com/docs/deployments/promoting-a-deployment) distingue retener dominios de deshabilitar builds. Este informe no autoriza cambiarlo.

Aliases leídos por conector: producción **READY**, `dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm`, main `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6`; QA **READY**, `dpl_3WyqcfwaKgpsnQzLaMmgifuB3mHg`, `ai/antigravity-qa` / `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`. QA web S difiere de snapshots históricos b318ca5 del plan, sin modificación del alias en esta tarea. No se atribuye la transición a esta continuación; el API QA sigue en b318ca5 según SSH. No se relanzó build/despliegue ni se amplió QA funcional.

### P0(c): SSH, monitoreo y límites actuales de alertas

Se reutilizaron las funciones `run/inspect` del preflight sanitizado `.tmp/m1-c3/preflight.py`, con la misma clave/known-hosts y `BatchMode=yes`, `StrictHostKeyChecking=yes`. Lectura `sudo -n python3 -`; exit **0**. Solo proyecciones de presencia, hashes, flags y estados. No se imprimieron archivos de entorno ni logs. Lectura de logs del worker produjo únicamente un booleano de heartbeat.

| Componente productivo | Resultado |
| --- | --- |
| API | active/running, NRestarts 0; unidad PID 151141 / contenedor PID 151158; release `b5615869dcbec4bd174608f2373e73ff618fae26`; imagen `8caacd8548a61d94807c0b865229a731df594f63f609ca9ab57df99283dceca2` |
| Caddy | active/running, NRestarts 0, PID 172458 |
| Worker | active/running, NRestarts 0; unidad PID 6618 / contenedor PID 6654; heartbeat presente en últimos 180 s |
| Flags API | PUBLIC_BOOKING_CLOSED=true; NOTIFICATIONS_EMAIL_ENABLED=false; REQUIRE_INTERNAL_MFA=false; NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED=false |
| Flags worker | NOTIFICATIONS_EMAIL_ENABLED=false; NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED=false |
| Backup programado | Servicio inactive/dead tras exit 0/Result success, última salida 2026-10-08 05:20:45 UTC; timer active/waiting. No equivale a validar cobertura/artefacto P1 |
| Restore programado | **failed/failed, ExecMainStatus=1, Result=exit-code**, última salida 2026-10-04 06:32:08 UTC; timer active/waiting. Causa no investigada ni corregida en esta orden |
| Monitor | Timer activo. Se observó un ciclo activating/start y luego inactive/dead, Result success/ExecMainStatus 0, salidas 01:28:29 y 01:30:19 UTC del 2026-10-09 (noche local del 8). Es oneshot, no caída del servicio |
| Sondas públicas | KORTEK_PUBLIC_HTTP_ENABLED=false, leído en configuración existente; sin activación |

Variables de aplicación API presentes/no vacías: `API_PUBLIC_ORIGIN`, `APP_RELEASE`, `CLERK_AUTHORIZED_PARTIES`, `CLERK_INVITATION_REDIRECT_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CORS_ALLOWED_ORIGINS`, `DATABASE_URL`, `DEPLOY_ENV`, `HOST`, `JWT_SECRET`, `NODE_ENV`, `NODE_OPTIONS`, `NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED`, `NOTIFICATIONS_EMAIL_ENABLED`, `PORT`, `PUBLIC_BOOKING_CLOSED`, `RATE_LIMIT_SECRET`, `REQUIRE_INTERNAL_MFA`, `WEB_PUBLIC_ORIGIN`. RATE_LIMIT_SECRET cumple la comprobación existente de longitud ≥32, sin valor mostrado. Worker: DATABASE_URL y ambos flags de correo presentes; no claves Clerk. Variables técnicas de imagen también presentes: HOME/HOSTNAME/PATH/NODE_VERSION/YARN_VERSION/container; no se muestran sus valores.

Archivos protegidos: `/etc/kortek-api/runtime-env` root:root/0600, SHA-256 `42ce91a14849c9746109e2864c4500976bb98d2d2e1a3e7713f4485a3aaff23a`; staging root:root/0600, SHA `d6a94be929feb44056e3c64020127f6543de3d356fdac09e275c0362c64a57f6`; configuración del monitor root:root/0644, SHA `7919f1b859f283765d721de46d21bd3760ea0b92dee4d69a372211084d440b85`.

**Alertas actuales no verificables con la identidad disponible.** `/bin/oci`, CLI **3.83.0** / SDK **2.175.0**, misma identidad `instance_principal`, región `us-ashburn-1`, GET `monitoring alarm list`: exit **1**, HTTP **404**, `NotAuthorizedOrNotFound`. No se convierte ese 404 en «no existen alarmas» ni en autorización denegada demostrada: el proveedor no distingue recurso/permiso. El primer intento `alarm-status list` fue un error de sintaxis (exit 2); ayuda local exit 0 identifica `list-alarms-status`. Ese comando correcto también terminó exit **1**, HTTP **404**, `NotAuthorizedOrNotFound`, operación `list_alarms_status`. No se amplió IAM, no se usó debug ni otra identidad, no se dispararon alertas o métricas. FIRING/OK, reglas/destinatarios y recepción actual permanecen pendientes para el propietario; el monitor exitoso y la recepción histórica no los prueban.

### P0(d): prefijos Clerk, sin API de Clerk

| Ubicación / variable | Presencia / prefijo comprobado |
| --- | --- |
| API producción / CLERK_SECRET_KEY | Presente / `sk_live_` |
| API producción / CLERK_PUBLISHABLE_KEY | Presente / `pk_live_` |
| API staging / ambas | Presentes / `sk_test_`, `pk_test_`; lectura del preflight para preservación, sin cambios |
| Workers / claves Clerk | Ausentes |
| Web producción / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Presente / `pk_live_`; revelado solo en memoria DOM, salida limitada al prefijo y campo vuelto a ocultar |
| Vercel producción / CLERK_SECRET_KEY | Presente como Secret/sensitive, **prefijo no verificable**: no existe Reveal Value en la interfaz y no se leyó otra credencial para sustituirlo |

Los prefijos no prueban pertenencia a la misma instancia, authorized parties ni login de OWNER. No se llamó a la API de Clerk ni se imprimieron/guardaron claves completas.

### P1: bloqueo local antes de respaldo; P1b pendiente

Después del login correcto se comprobó el requisito local de clientes PG17 y restore aislado: `docker version --format '{{json .}}'`, exit **1**. Cliente Docker **29.6.1**, API **1.55**, contexto `desktop-linux`; **Server=null**. Diagnóstico real:

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine;
check if the path is correct and if the daemon is running:
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

Esto demuestra que el endpoint del motor configurado no está disponible; «Docker apagado» es una hipótesis, no causa adicional confirmada. Conforme a la orden original se detuvo **P1 en su prerrequisito**, sin arrancar/reconfigurar Docker ni adaptar el ensayo a PG18. P0(b–d) siguieron de forma independiente. No se ejecutaron pg_dump/pg_restore/psql de restore: **no hay versión de esos clientes que registrar**. La ruta del futuro ensayo exige imagen PG17, ideal 17.6; no se verificó disponibilidad de tag ni se hizo pull. psql 18.1 del host se usó solo para el login P0(a), nunca para respaldo/restore.

Destino P1 autorizado `C:\KortekBackups\prod-pre-promocion`: no se creó artefacto nuevo, tamaño/SHA no disponibles, copia externa pendiente sin artefacto listo. Sin lectura del ledger para P1, snapshot/dump, restore/clon, worktree S ni Prisma status/deploy/resolve. Ledger 30/26, cotejo de catálogo/ACL/extensiones/btree_gist y posterior 28/funciones/grants/matriz37/verify-integrity/DDL/bloqueos/invariantes Client/Booking permanecen pendientes, no resultados inventados.

### Veredicto actualizado y relevo

| Criterio del plan | Estado vigente |
| --- | --- |
| Login real migrador READ ONLY / TLS | **Go técnico para este subcriterio**, único reintento exit 0; no aprueba migraciones |
| Plan/tier y política backups | Free/tier_free comprobado en ejecución anterior; no reconsultado en esta continuación, puede cambiar; sin inventario específico recuperable |
| Configuración de rama/dominios y presencia de variables Vercel | Lectura completada; **No-Go para integrar**, autoasignación está activada |
| Configuración OCI / cierre | Lectura exit 0, cierre true/correo false y claves API live; no prueba valores completos de orígenes/instancia ni sesión OWNER |
| Observabilidad / recuperación operativa | **No-Go**: sondas públicas false, restore semanal fallido, alarmas actuales inaccesibles y recepción no ensayada |
| Prefijos Clerk | API y publishable web live comprobados; **incompleto** para secret Vercel, no para lectura API |
| Respaldo / recuperación independiente / PG productivo aislado | **No-Go**, motor Docker local no disponible, sin P1/restore PG17 ni custodia externa nueva |
| Migraciones / roles-triggers / checksum histórico | **No-Go**, atributos fuente sí leídos, ningún ensayo P1b ni matriz37/postledger |
| Origen, integración, CI exacto M, pareja nueva, smoke, observación tras activación, QA/canales, horarios reales, Piloto/Paso8 y apertura | Heads comprobados; gates posteriores del plan conservan sus pendientes, no autorizados/ejecutados por este informe |

Siguiente paso estable: propietario habilita el motor Docker local configurado y resuelve acceso de lectura a alarmas sin ampliar permisos por inferencia; confirma mecanismo autorizado de retención de dominios, prefijo de la secret key Vercel y revisión del restore semanal fallido. Reanudar P1 desde imagen/clientes PG17 documentados, respaldo en flujo AES256/clave protegida y restore completo; luego P1b en clon restaurado con S exacto. No repetir más el login en esta orden, no tocar producción/QA y no usar PG18 para el restore. Este resultado no aprueba promoción ni apertura.

### Git y preservación de esta continuación

Ramas locales **no movidas** frente a remotos consultados por `git ls-remote`, exit 0:

| Rama | Local | Remoto | Comparación |
| --- | --- | --- | --- |
| main | `01113ef0be7d8abcd74e3e7297f7989b359c76c0` | `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6` | 0 exclusivos local / 2 remoto: atrasada 2 |
| ai/antigravity-qa | `36061fc3c978758642b5a79ed6cb0e5ff25c003f` | `523d993cfa0c797f356c224d5cc026d6c9ad4c7b` | 0 exclusivos local / 6 remoto: atrasada 6 |
| ai/reserva-invitado-ci al entrar | `515a1062b75f1b80cee78aa8f44830da33b6e2c9` | Mismo SHA | Igual |

Código/SQL/ops/config/workflows/lockfiles sin diff frente a 515a106, exit 0. Arnés y evidencia TLS/login/SSH son ignorados; no entran al commit. Playbook ajeno preservado con SHA `3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090`. Solo informe y tres entradas de control se publican en el único commit documental autorizado; su SHA/igualdad remoto/estado final se reportan en la entrega. Sin POST de negocio, grants, migraciones, cambios de claves/flags/proveedores ni reinicios. La comprobación final compara heads y snapshots estables de OCI/aliases; los ciclos autónomos del monitor no se consideran cambios del agente.

Comparación final ejecutada antes del commit: **4/4 contenedores producción/QA iguales** en ID/imagen/PID/running/release/entorno/hash/flags, archivos protegidos iguales, y **2/2 aliases Vercel iguales** en deployment/SHA/READY. Enlaces locales del informe **6/6 existentes**, scan de secretos de adiciones en cuatro documentos y `git diff --check` exit 0. Sin builds/tests de producto en una entrega documental. Solo se asegura preservación en las ventanas observadas y ausencia de mutaciones del agente, no ausencia absoluta de acciones de terceros fuera de esas ventanas.

## Registro histórico anterior — parada en 515a106

El registro siguiente se conserva íntegro. Sus frases de fallo TLS y P0(b–d) no ejecutados describen la ejecución anterior, superada por la continuación anterior; sus pendientes P1/P1b siguen sin ejecutarse por el nuevo bloqueo local.

Fecha: 2026-10-08, America/Santo_Domingo. **NO-GO / PAUSADO / INCOMPLETO. Parada en P0(a): login del migrador fallido en TLS.** Producción permanece cerrada por el alcance autorizado; no se cambiaron producción ni QA. El cierre efectivo de sus flags no se refrescó en esta ejecución.

## Alcance y base

Orden del propietario: ejecutar P0 → P1 → P1b; si una parte falla, detenerse en esa parte y reportar. Solo lecturas productivas, respaldo cifrado y escrituras en el clon aislado; un único commit documental y push a `origin/ai/reserva-invitado-ci`, sin force. Se aplica esa excepción expresa a la rama habitual de AGENTS.md. No se autorizaron cambios de proveedores, producción/QA, flags, builds, despliegues ni publicación a main/QA.

Base local y remota comprobada: `f043260c64e837242853518447d18d38098f9d3e`, rama `ai/reserva-invitado-ci`. Índice vacío. Único archivo ajeno sin versionar al entrar: `docs/Playbook Kortek Booking_ del 29 de septiembre al MVP.md`; preservado y excluido del commit. SHA-256: `3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090`.

Fuentes vigentes: [plan y criterios Go/No-Go](PLAN_PRODUCCION_RESERVA_INVITADA.md), [gates](DELIVERY_GATES.md), [seguridad](SECURITY_STANDARD.md), [Definition of Done](DEFINITION_OF_DONE.md), [estado maestro](../../PROJECT_MASTER.md) y [entrada documental](../README.md). Se leyeron las skills kortek-delivery/Supabase y el preflight SSH sanitizado existente; no se ejecutó SSH. La autorización actual prevalece sobre prohibiciones históricas del plan, pero no amplía los pasos posteriores al primer fallo.

## P0(a): evidencia actual de Supabase

Lecturas del conector, sin SQL ni cambios:

| Consulta | Resultado observado |
| --- | --- |
| `supabase_list_projects` y `supabase_get_project` | Proyecto productivo `ilaoolpcrlmqkftirjog`, Kortek Booking, organización `wjzvskpjlnsbwixejmua`, región `us-east-1`, `ACTIVE_HEALTHY` |
| Versión informada por gestión | `17.6.1.166`, engine `17`, canal `ga`; no sustituye `SELECT version()` del servidor |
| `supabase_list_organizations` y `supabase_get_organization` | Organización correspondiente, `plan=free`, `tier=tier_free` |
| Credencial local del migrador | Archivo DPAPI local presente; descifrado correcto en este contexto, valor no mostrado. No se buscó credencial remota ni en otro equipo |

La [política oficial de respaldos](https://supabase.com/docs/guides/platform/backups), consultada en esta ejecución, ofrece backups diarios recuperables en Pro/Team/Enterprise (retención 7/14/hasta 30 días); para Free recomienda exportación periódica y copias externas. PITR es un complemento de los planes de pago y requiere al menos Small compute. **Free vigente no acredita backup recuperable ni PITR para este proyecto.** No se enumeraron objetos, copias, fechas ni recuperación del proyecto en el dashboard/API de backups. Los objetos de Storage no quedan cubiertos por un respaldo de base de datos. La consulta del índice `changelog.md` por web falló por tipo de contenido; no se implementó una función de Supabase.

### Login READ ONLY: fallo bloqueante

Se preparó un arnés local ignorado `.tmp/prod-p0-login.ps1`, sin cambios en código versionado. Cliente existente: `C:\Program Files\PostgreSQL\18\bin\psql.exe`. **Es la ruta del cliente local, no evidencia de la versión de producción ni de un clon.**

Destino exacto: `aws-0-us-east-1.pooler.supabase.com:5432/postgres`; usuario de conexión `kortek_migrator.ilaoolpcrlmqkftirjog`. Puerto de **sesión 5432**, nunca pooler transaccional. TLS `sslmode=verify-full` con CA local existente `.tmp/base-preprod-c1/supabase-ca.crt`, timeout de conexión 15 s. Contraseña DPAPI descifrada en memoria y transmitida solo al entorno del proceso hijo; fuera de argv, salida y archivos nuevos. No se usó ninguna clave de cifrado P1.

El arnés fija `default_transaction_read_only=on`, `statement_timeout=10000`, `psql -X -w -A -t -v ON_ERROR_STOP=1`. SQL preparado por stdin:

```sql
BEGIN READ ONLY;
SELECT json_build_object(
  'current_user', current_user, 'session_user', session_user,
  'read_only', current_setting('transaction_read_only'),
  'database', current_database(),
  'server_version', current_setting('server_version'));
SELECT json_agg(r) FROM (
  SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb,
         rolcanlogin, rolreplication, rolbypassrls, rolconnlimit,
         rolvaliduntil, rolconfig
  FROM pg_roles
  WHERE rolname IN ('kortek_migrator', 'kortek_runtime')
  ORDER BY rolname
) r;
COMMIT;
```

Resultado real de `& .tmp/prod-p0-login.ps1`:

```text
P0_LOGIN FAILED category=tls_failed exit=2; raw stderr suppressed
```

El proceso interno psql terminó con **2**; la herramienta de ejecución informó **1** para la invocación fallida. La categoría procede del filtro de errores TLS del arnés, que agrupa problemas de certificado raíz/verificación/SSL. No se conservó stderr crudo y no se atribuye una causa específica no demostrada. **No hay resultado de conexión autenticada, current_user, sesión READ ONLY, atributos, versión SQL ni ledger.** No se rebajó TLS, no se probó otra contraseña, no se usó postgres/SET ROLE y no se reintentó la conexión después del fallo.

## Parada y pendientes de las tres partes

| Paso autorizado | Estado / evidencia faltante |
| --- | --- |
| P0(a), plan y política | Plan/tier actual comprobado y política pública consultada; inventario recuperable específico no comprobado |
| P0(a), login real migrador y atributos | **FALLÓ / NO-GO**, TLS; no evidencia SQL |
| P0(b), Vercel | No ejecutado tras la parada: rama productiva, asignación automática de dominios y nombres/presencia de variables pendientes |
| P0(c), OCI | Preflight existente inspeccionado, sin SSH ejecutado; variables, flags, servicios, monitoreo y alertas actuales pendientes |
| P0(d), Clerk | Prefijos de claves productivas no comprobados; no se llamó a la API de Clerk |
| P1(e), respaldo AES256 en flujo | No iniciado. Destino autorizado `C:\KortekBackups\prod-pre-promocion`; **ningún artefacto de esta tarea**, tamaño y SHA-256 no disponibles |
| P1(f), restore aislado | No se creó contenedor ni se consultó/pull de imagen PG17.6; roles/ACL/extensiones/btree_gist, tablas, conteos, constraints, índices, funciones, triggers y ledger no cotejados |
| P1(g), copia externa | Pendiente; no se identificó destino externo ni existe artefacto nuevo listo para copiar |
| P1b(h), Prisma/checksum | No iniciado; no se creó worktree S ni se ejecutó migrate status/deploy/resolve. Hash ledger `3c1f4f53…` frente a blob `39f52217…` es antecedente del plan, **no cotejo nuevo** |
| P1b(i), posterior a migración | No medidos 28 activas/checksums 27–28, funciones/owner/ACL/search_path, grants, matriz de 37 tablas, verify-integrity, duración DDL ni bloqueos |
| P1b(j), código previo / invariantes | Pendiente: no existe clon restaurado donde ensayar Client/Booking |

Las cifras esperadas 30 filas/26 activas antes y 28 activas después, así como los hashes históricos, siguen siendo criterios del plan y de la orden. No se convierten aquí en lecturas productivas ni resultados del ensayo. No hubo dumps nuevos, SQL/ledger editado, grants, restore, fixtures ni escrituras de negocio.

## Veredicto por criterio del plan

**NO-GO global para continuar P1/P1b o promover producción.** No es rechazo del candidato ni prueba de una contraseña inválida: falta el login seguro exigido. Los criterios fuera de P0/P1/P1b no se ejecutan por inferencia.

| Criterio de §8 del plan | Veredicto en esta tarea |
| --- | --- |
| Origen congelado | Base documental exacta y heads remotos comprobados; auditoría integral, merge-tree y ensayo de checksum no repetidos. No-Go para promoción |
| Integración/despliegues | No-Go: control Vercel no consultado; M/integración fuera del alcance |
| CI exacto | Pendiente: éxito histórico de S no reconsultado; M inexistente según plan, sin CI nuevo |
| Respaldo | No-Go: sin copia fresca, hash/tamaño, restore ni custodia externa demostrados |
| Migraciones | No-Go: sin ensayo real de checksum ni ledger/checksums postmigración |
| Roles/triggers | No-Go: login TLS fallido, atributos/funciones/ACL/gate no validados |
| PG productivo | Gestión confirma rama 17.6; No-Go: falta clon PG17.6 restaurado y validado |
| Configuración | No-Go: inventarios Vercel/OCI/Clerk y flags actuales pendientes; decisión MFA no renovada en esta orden |
| Pareja nueva | No ejecutada, fuera del alcance; no satisface promoción |
| Smoke cerrado | No ejecutado, fuera del alcance; no satisface promoción |
| Observación | No-Go: monitoreo/alertas/ventana de 15 minutos no revalidados |
| QA/canales | No ejecutados, fuera del alcance; aceptación histórica no sustituye nueva evidencia |
| Horarios reales | P9b no ejecutado ni autorizado aquí |
| Piloto y puerta | Cierre/aprobación no acreditados por esta tarea |
| Apertura | No autorizada; no se activó ningún flag |
| Recuperación | No-Go: falta restore/rollback aislado y disponibilidad de artefactos demostrada |

## Git, comandos y preservación

Antes de editar: `git branch --show-current`, `git rev-parse HEAD`, `git status --short` e índice revisados; base exacta y trabajo ajeno aislable. Lecturas de skills, fuentes vigentes, scripts existentes y presencia DPAPI no provocaron cambios remotos.

`git ls-remote origin refs/heads/main refs/heads/ai/antigravity-qa refs/heads/ai/reserva-invitado-ci` falló inicialmente dentro del sandbox (`getaddrinfo() thread failed to start`); la misma lectura con permiso de red terminó exit **0**. Esto fue una limitación local de lectura Git, anterior al fallo bloqueante P0. Una búsqueda recursiva local de arneses recorrió enlaces rotos de node_modules y se interrumpió; no constituye validación y se sustituyó por lecturas puntuales.

| Referencia | Antes de la publicación documental |
| --- | --- |
| main remoto | `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6` |
| ai/antigravity-qa remoto | `523d993cfa0c797f356c224d5cc026d6c9ad4c7b` |
| ai/reserva-invitado-ci local/remoto | `f043260c64e837242853518447d18d38098f9d3e` |
| main local (atrasado, sin mover) | `01113ef0be7d8abcd74e3e7297f7989b359c76c0` |
| ai/antigravity-qa local (atrasada, sin mover) | `36061fc3c978758642b5a79ed6cb0e5ff25c003f` |

Único commit autorizado: este informe y entradas de control en docs/README.md, PROJECT_MASTER.md y CHANGELOG.md. Sin modificación de contratos/BACKEND_CHANGES, código, SQL ni workflow. Validar `git diff --check`, diff completo, enlaces locales, ausencia de secretos, staging explícito y diff cached completo antes del commit/push. La respuesta de entrega registrará SHA final, igualdad local/remoto y comparación final de main/QA, evitando otro commit solo para incluir el SHA propio.

**Producción/QA no recibieron cambios de esta tarea.** La evidencia viva se limita a metadatos de gestión Supabase y al intento TLS fallido; no hay comparación operativa antes/después de OCI/Vercel/flags/DB. Por tanto no se afirma haber probado ausencia de modificaciones concurrentes de terceros ni cierre vivo actual. No se invocaron herramientas de mutación de proveedores. El push se limita a documentación en la rama autorizada; builds/despliegues no se solicitaron y cualquier automatismo externo no se verificó.

## Relevo preciso

Detención estable antes de P1. Siguiente paso: revisar localmente la CA/cadena/hostname que exige el pooler de sesión y preparar un login con TLS estricto válido, sin tocar credenciales ni configuración productiva y sin imprimir secretos. Reanudar desde P0(a) tras resolver esa condición y recibir continuación del propietario; exigir exit 0, `current_user=session_user=kortek_migrator`, READ ONLY activo y atributos reales. Después completar P0(b–d); solo si P0 pasa, generar P1 completo y restaurarlo, y únicamente entonces ensayar P1b con S `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`. Conservar los intentos históricos y parar ante cualquier diferencia. Este checkpoint documental no aprueba producción ni cierra los gates pendientes.
