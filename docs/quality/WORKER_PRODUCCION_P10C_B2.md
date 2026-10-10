# P10c-B2 — Instalación productiva con correo desactivado

**FASE 1 INSTALADA / VERIFICACIÓN TÉCNICA PASA / FASE 2 NO EJECUTADA. NO-GO para activar correo: canal EMAIL pausado.** La aceptación completa condicionada a canal no pausado no se alcanza. No hay autorización inferida para cambiar la pausa. Fecha de operación: 2026-10-10 UTC / 2026-10-09 Santo Domingo.

Base exacta: `ai/reserva-invitado-ci` en `4cc5ad239eae1ea1c43a632004cd3977544b789d`. Los tres archivos se extrajeron mediante `git show` desde `ops/oci-api/production/`, se validaron LF y SHA256 y se instalaron por bytes. [B1](WORKER_PRODUCCION_P10C_B1.md) conserva las pruebas previas; este informe registra la operación B2. El propietario ratificó **SÍ** dominio, webhook de cinco eventos y secreto y buzón Reply-To: **declaración del propietario, sin evidencia capturada del proveedor/buzón**.

## Prechecks y respaldo

Preflight SSH sanitizado `2026-10-10T02:39:38.598924+00:00`: hashes coinciden con P10c-A, cuatro servicios active/running, NRestarts=0, API P5/8e1501e, reserva abierta y correo false, imagen nueva disponible. Fuera de ventana de respaldo 05:10–05:30 UTC. Archivo local `.env.resend.prod` ignorado por git; cinco variables presentes y válidas sin mostrar valores. [Captura inicial](evidence/prod-p10cb2/before.json), [blobs y hashes locales](evidence/prod-p10cb2/local.json).

Consultas migrador con `BEGIN READ ONLY`, `transaction_read_only=on`, sin PII/contenido: EmailOutbox solo **OMITTED=5**, sin estados pendientes presentes; EmailChannelControl **EMAIL paused=true**. Se repitieron después del arranque y después de observar; las tres salidas son iguales. No se cambió la pausa ni se escribió en la base. [Inicial](evidence/prod-p10cb2/queue-before.json), [arranque](evidence/prod-p10cb2/queue-start.json), [final](evidence/prod-p10cb2/queue-after.json).

Respaldo `/var/backups/kortek-api/p10cb2-20261010T024503Z`, root:root 0700; cuatro copias root:root 0600 de API wrapper, worker wrapper, unidad worker y runtime-env. Cada copia se releyó y su hash coincidió con el original antes de editar. [Hashes del respaldo y acciones](evidence/prod-p10cb2/install.json). Se conservó para rollback; no se borraron imágenes.

## Instalación y hashes

| Archivo VM | SHA256 inicial | SHA256 final | Modo final |
| --- | --- | --- | --- |
| `/usr/local/libexec/kortek-api-run.sh` | `7bfe37be39267b8015a288ac9b5cc83724590ca30ef3f01ce0317b01cc442f6f` | `0a28312626216cdee50901541e374cca07b8da2e505d40a4b6954dae1cae5944` | 0o755 root:root |
| `/usr/local/libexec/kortek-worker-run.sh` | `c1737c618d268897f3a355c11ac86564ba419f12f7a556a0084a94ce9233338b` | `280ff5a101abee4bdd692735a3a97fecb041b8a6a0972ac02f04808431d91c84` | 0o755 root:root |
| `/etc/systemd/system/kortek-email-worker.service` | `01b1fc2d63b459b482bf16333afcd0de89275c238ca01956b51503ccb20acbf1` | `e23c8c2a01ddf75373bf8427ee6fb172863f87daf05dce9d268911c5072993a0` | 0o644 root:root |
| `/etc/kortek-api/runtime-env` | `6798f01f28e7309b4f7cfbd8abf414e5cfbe86301888557087b79624c6018bc6` | `f2243fcf0f47df66fcacfc2586df6ca3eb7bcfa8130e163ec2884ac604baef4b` | 0o600 root:root |
| `/etc/kortek-worker/database-url` | `4f4e71b985c7783935a1348f129b3c2deba081e6fff2ef37f761d934b8f39f05` | `4f4e71b985c7783935a1348f129b3c2deba081e6fff2ef37f761d934b8f39f05` | 0o600 root:root |
| `/etc/systemd/system/kortek-api.service` | `333f948911c06cfcbac45efc98a204894ab4d75aaaca56cb0b05b8f6bb3fa94f` | `333f948911c06cfcbac45efc98a204894ab4d75aaaca56cb0b05b8f6bb3fa94f` | 0o644 root:root |
| `/etc/kortek-api-staging/runtime-env` | `d6a94be929feb44056e3c64020127f6543de3d356fdac09e275c0362c64a57f6` | `d6a94be929feb44056e3c64020127f6543de3d356fdac09e275c0362c64a57f6` | 0o600 root:root |

Runtime-env conserva **todos los bytes originales como prefijo**, LF y comillas simples. Se anexaron **exactamente cinco líneas**, con los cinco nombres permitidos, por stdin SSH cifrado hacia Python root; valores solo en memoria y archivo autorizado, sin argv/logs/evidencia. Sintaxis `bash -n` por stdin exit0; relectura verificó los cinco valores en memoria. Ambos flags permanecieron false y modo0600. No se creó otro archivo de configuración. El único duplicado persistente de runtime-env es el respaldo explícitamente requerido.

Se detuvo solo el worker productivo, se instalaron wrappers root0755 y unidad worker root0644, y se ejecutó daemon-reload. La unidad API P7 no cambió. Se reinició API **una vez**; tras pasar su verificación y GET, se inició worker nuevo **una vez**. Ningún reinicio adicional ni rollback fue necesario.

| Acción | Inicio UTC | Inicio local UTC−04 | Exit |
| --- | --- | --- | --- |
| `systemctl stop kortek-email-worker` | 2026-10-10T02:45:03.538005+00:00 | 2026-10-09T22:45:03.538005-04:00 | 0 |
| `systemctl daemon-reload` | 2026-10-10T02:45:04.712238+00:00 | 2026-10-09T22:45:04.712238-04:00 | 0 |
| `systemctl restart kortek-api` | 2026-10-10T02:45:05.028715+00:00 | 2026-10-09T22:45:05.028715-04:00 | 0 |
| `systemctl start kortek-email-worker` | 2026-10-10T02:45:54.242429+00:00 | 2026-10-09T22:45:54.242429-04:00 | 0 |

Los finales de cada comando están en la evidencia para conciliar worker-down; no se tocó monitor/alarma.

## Verificación efectiva

API conserva imagen `sha256:1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775`, APP_RELEASE `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`, PUBLIC_BOOKING_CLOSED=false y ambos flags false. DATABASE_URL por hash coincide con la inicial. Tres GET públicos, una vez cada uno, sin 5xx: elegible `jhonatan`200, inexistente `p10-no-existe-20261009`404, no elegible `dental-ross`404. **Total: 3 de máximo6**, sin reservas/envíos/pruebas de proveedor. [HTTP sin cuerpos](evidence/prod-p10cb2/public-get.json).

Worker usa `sha256:bf343354991622b55de47655d749a558c19397ff940badc0831f15774a3da23f`, release8e1501e y DEPLOY_ENV=production. DATABASE_URL efectiva coincide con la credencial propia por hash `4f4e71b985c7783935a1348f129b3c2deba081e6fff2ef37f761d934b8f39f05` y difiere de API `2e5efc173f1df97bc32f8aa317807ede3dec2676bac9426e4581f0345f07842a`; credencial propia intacta. Están los cinco nombres y los dos flags false.

| Variable | SHA256 del valor local | Coincide en API / worker |
| --- | --- | --- |
| `NOTIFICATIONS_EMAIL_FROM` | `8d95dc5d6a73286f67a3e0709fd21aa7a9e4d056aacc904d7134f3e938b49280` | Sí / Sí |
| `NOTIFICATIONS_EMAIL_REPLY_TO` | `903fb429b6dd846361c30bb7f73c098b9ec0e517ca1a8e70b455bdcc73540ea9` | Sí / Sí |
| `NOTIFICATIONS_ABUSE_SECRET` | `21d9373ddf093621ae309762bb7816d9760157dfab263fe31eefd03f8f43e3de` | Sí / Sí |
| `RESEND_API_KEY` | `1a1ca59ca537edd9e697248002a0ac7acfbba9e1635d21c0d0baa08148e6b33d` | Sí / Sí |
| `RESEND_WEBHOOK_SECRET` | `2aa6cf2a02be96f4967bce36f36f3fb9926de4a286d159c057e36c533008b027` | Sí / Sí |

Observación **600.6 segundos**, 21 muestras: API y worker active/running, NRestarts=0, imágenes/flags estables; cero coincidencias de error de arranque, Prisma, conexión, HTTP5xx y ERROR en logs de ambos desde el reinicio API. Conteos de heartbeat capturados; no se guardaron logs crudos. No prueba envío, recepción, webhook ni procesamiento de outbox con correo activo. [Observación y snapshot final](evidence/prod-p10cb2/observation.json).

QA: hashes de los cinco archivos observados, imágenes, entornos por hash, PIDs de contenedores, MainPID, StartedAt y NRestarts iguales al inicio. Cuatro servicios siguen active/running. database-url y unidad API conservan hashes iniciales. No se modificaron CA, QA, Caddy, timers, alarmas, monitor, proveedores, migraciones ni datos.

## Resultado y continuación

**Fase 1 técnica pasa y queda instalada con correo false. Fase 2 no se ejecuta porque EMAIL está pausado. NO-GO para correo activo.** No hubo cambios false→true, correos de prueba, reservas o llamadas a Resend. No es cierre funcional de correo ni aprobación del propietario.

Siguiente orden debe decidir explícitamente el canal pausado y volver a leer cola/canal/configuración antes de cualquier activación. Este checkpoint no autoriza levantar la pausa ni cambiar flags. La imagen histórica y respaldo quedan disponibles. Rollback autorizado preparado pero **no ejecutado**: detener worker, restaurar runtime-env/API wrapper de este respaldo, reiniciar API una vez y verificar P5/reserva/base; restaurar unidad y wrapper worker, daemon-reload, iniciar histórico con correofalse y verificar heartbeat/QA. No restaurar database-url/CA ni tocar DB.

## Integridad Git y límites

Commit único documental: este informe y evidencia sanitizada. Sin modificaciones de código/ops. Rama autorizada ai/reserva-invitado-ci; sin force, merge ni escrituras a main/QA. Referencias preservadas: local main `01113ef0be7d8abcd74e3e7297f7989b359c76c0`, local ai/antigravity-qa `36061fc3c978758642b5a79ed6cb0e5ff25c003f`; remoto main `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`, remoto QA `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`. El Playbook ajeno no rastreado se preservó fuera del índice. SHA final y comparación local=remoto se reportan al entregar; no se inserta un SHA autorreferente en este commit.
