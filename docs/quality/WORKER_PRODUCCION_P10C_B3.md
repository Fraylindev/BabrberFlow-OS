# P10c-B3 — Reanudación EMAIL y Fase 2 productiva

**GO TÉCNICO — EMAIL REANUDADO; AMBOS FLAGS TRUE; VERIFICACIÓN Y OBSERVACIÓN15MIN PASAN.** No acredita entrega/recepción de correo, webhook real ni QA funcional de envío. No se crearon reservas, enviaron pruebas ni llamaron proveedores. La Fase1 B2 se conservó; no se repitió instalación/build.

Base exacta `ai/reserva-invitado-ci` en `ae89e40b0aec12efa2a32f9f7f29cefb337e280c`. Ratificación actual **SÍ** del propietario para dominio, webhook y Reply-To: declaración del propietario, **sin evidencia capturada de proveedor/buzón**. El propietario amplió la autorización para encontrar la forma de cumplir el objetivo; se concretó antes de ejecutar el [procedimiento B3](EMAIL_REANUDACION_P10C_B3.md). El diagnóstico inicial detectó ausencia de runbook preciso en8e1501e; esa carencia se resolvió dentro de esta autorización ampliada, no se atribuye el procedimiento nuevo al código histórico.

## Prechecks y diagnóstico

Preflight SSH `2026-10-10T03:12:23.905848+00:00` (03:12 UTC /23:12 local2026-10-09): sin deriva frente a cierreB2 en archivos/servicios/contenedores, imágenes, release, flagsfalse, PIDs/StartedAt/env por hash y QA. Cuatro unidades active/running, NRestarts0. Fuera de ventana05:10–05:30UTC. API P5/8e1501e; worker nuevo bf343354. [Antes](evidence/prod-p10cb3/before.json). Migrador READ ONLY: cola **OMITTED=5, ningún otro estado presente**, EMAIL paused=true. [Cola inicial](evidence/prod-p10cb3/queue-before.json), [revalidación inmediata](evidence/prod-p10cb3/revalidate-queue.json).

Pausa inicial: reason=`BASE_PREPRODUCCION_C1`, updatedAt=`2026-09-26T01:13:04.914`, anterior a Fase1B2 `2026-10-10T02:45:03.538005Z`. Timestamp sin zona; sesión DB UTC. **Clasificación (ii): pausa manual durante el corte C1**, coherente con [informe C1, línea53](BASE_PREPRODUCCION_C1_EVIDENCIA.md). No es default de migración23 (pausedfalse); automático del worker escribe CONFIGURATION, distinto del motivo encontrado.

Autoría humana/rol de la pausa original: **no determinables**. La tabla solo tiene id,paused,reason,updatedAt, sin actor; sin triggers de usuario; AuditLog relacionado0 y sin historial dedicado de canal. Se atribuye al corte documentado, no a una identidad inventada. [Diagnóstico](evidence/prod-p10cb3/diagnosis.json), [búsqueda ampliada y UTC](evidence/prod-p10cb3/history.json).

## Procedimiento, rol y auditoría

Desde **8e1501e89a132e1b01d3633b1b3f896a8cbe5800**: [contrato C1 línea201](../features/NOTIFICACIONES_C1_CONTRATO.md) prevé operación técnica tras revisar configuración/inciertos, sin endpoint tenant; no especifica comando/rol/auditoría. CLI worker no tiene resume. [QA líneas227–254](STAGING_QA_2026-09-28.md), commit `389a169f97c6a95e174255bb2595c7a72c443357`, creó EMAIL ausente con pausedfalse, no reanudó fila existente. C3 worker-once es herramienta temporal con proveedor, no runbook productivo. [Hashes/líneas fuente](evidence/prod-p10cb3/sources.json).

Se documentó [resume-email.sql](evidence/prod-p10cb3/resume-email.sql), SHA256 `6486c858468c0dc64c616496b11b83c04dfee26996e177e0c2e69e2577ec865f`, y se ejecutó **una sola invocación**. Rol/session_user **kortek_migrator**, SELECT/UPDATE verificados previamente READ ONLY. TLS verify-full, credencial DPAPI solo en memoria/entorno, SQLstdin; no secretos argv/logs/evidencia.

`BEGIN READ WRITE`, lock_timeout5s/statement_timeout30s; bloqueo de fila EMAIL, guardias de rol/código/fecha y exactamente5OMITTED. **Única escritura de tabla: UPDATE EmailChannelControl.EMAIL** pausedfalse, reasonNULL y updatedAt de transacción. No tocó outbox, otras tablas ni permisos. Comprobación ROW_COUNT1. Idempotencia: si EMAIL ya es pausedfalse/reasonNULL, no hay UPDATE ni cambio de fecha; no hubo segunda invocación. Fallo/resultado incierto no se reintenta automáticamente.

**Auditoría documental, no AuditLog transaccional.** No hay trigger/operación automática y no se insertó AuditLog adicional. AuditService no define un evento global de canal y reserva organizationIdNULL para conflicto de seguridad pre-tenant; no se inventó tenant/actor. SQL/hash, session_user/rol, transaction_id1596, horas, antes/después/exit0 se capturaron y el commit fue confirmado con READ ONLY. [Recibo](evidence/prod-p10cb3/resume-once.json), [permiso/rol](evidence/prod-p10cb3/role.json), [commit durable](evidence/prod-p10cb3/queue-resumed.json), [auditoría final](evidence/prod-p10cb3/history-after.json). La auditoría DB relacionada sigue0; este límite no se presenta como auditoría automática creada.

Reanudación: transacción inició `2026-10-10T03:13:29.566Z` / `2026-10-09T23:13:29.566-04:00`; recibo antes `03:13:29.733637Z`, antescommit `03:13:30.049992Z`; psql exit0. Después: pausedfalse, reasonNULL, updatedAt03:13:29.566, colaOMITTED5. Los OMITTED **siguen terminales**: claim worker líneas40–53 solo PENDING/RETRY/UNCERTAIN con closedAtNULL; housekeeping no reencola OMITTED. Retención puede purgar payload/destinatario terminales sin cambiar estado. No se probaron envíos para demostrarlo.

## Fase 2 y hashes

Respaldo nuevo `/var/backups/kortek-api/p10cb3-20261010T031422Z` root:root0700, runtime-env root0600 y hash `f2243fcf0f47df66fcacfc2586df6ca3eb7bcfa8130e163ec2884ac604baef4b`, relectura igual al original. Edición protegida por SSHstdin: **únicamente líneas15/16**, NOTIFICATIONS_EMAIL_ENABLED y NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED, false→true; comillas/LF y todos los demás bytes conservados. Invertir esas dos sustituciones produce exactamente los bytes/hash originales. No se copiaron secretos a otro entorno; solo respaldo requerido.

| Archivo | SHA256 inicioB3 | SHA256 final |
| --- | --- | --- |
| `/usr/local/libexec/kortek-api-run.sh` | `0a28312626216cdee50901541e374cca07b8da2e505d40a4b6954dae1cae5944` | `0a28312626216cdee50901541e374cca07b8da2e505d40a4b6954dae1cae5944` |
| `/usr/local/libexec/kortek-worker-run.sh` | `280ff5a101abee4bdd692735a3a97fecb041b8a6a0972ac02f04808431d91c84` | `280ff5a101abee4bdd692735a3a97fecb041b8a6a0972ac02f04808431d91c84` |
| `/etc/systemd/system/kortek-email-worker.service` | `e23c8c2a01ddf75373bf8427ee6fb172863f87daf05dce9d268911c5072993a0` | `e23c8c2a01ddf75373bf8427ee6fb172863f87daf05dce9d268911c5072993a0` |
| `/etc/systemd/system/kortek-api.service` | `333f948911c06cfcbac45efc98a204894ab4d75aaaca56cb0b05b8f6bb3fa94f` | `333f948911c06cfcbac45efc98a204894ab4d75aaaca56cb0b05b8f6bb3fa94f` |
| `/etc/kortek-api/runtime-env` | `f2243fcf0f47df66fcacfc2586df6ca3eb7bcfa8130e163ec2884ac604baef4b` | `d85fd3e351eca992db1e242a106c3fb3c6e0db90cac95084c1b7402e98a8839d` |
| `/etc/kortek-worker/database-url` | `4f4e71b985c7783935a1348f129b3c2deba081e6fff2ef37f761d934b8f39f05` | `4f4e71b985c7783935a1348f129b3c2deba081e6fff2ef37f761d934b8f39f05` |
| `/etc/kortek-api-staging/runtime-env` | `d6a94be929feb44056e3c64020127f6543de3d356fdac09e275c0362c64a57f6` | `d6a94be929feb44056e3c64020127f6543de3d356fdac09e275c0362c64a57f6` |
| `/usr/local/libexec/kortek-api-staging-run.sh` | `118d2c83c4b800f9e63d72c365d486f47b6f4aaf491ec8221be84305ff27cbf8` | `118d2c83c4b800f9e63d72c365d486f47b6f4aaf491ec8221be84305ff27cbf8` |
| `/usr/local/libexec/kortek-worker-staging-run.sh` | `919d73ca08e6485f34a456d88a01e2406537c2c34ac7722e3564f84c06f99ad6` | `919d73ca08e6485f34a456d88a01e2406537c2c34ac7722e3564f84c06f99ad6` |
| `/etc/systemd/system/kortek-api-staging.service` | `91ce7997af89f16927acae71c6030c60765ab16c43022cfb64e0b143ac6c3a90` | `91ce7997af89f16927acae71c6030c60765ab16c43022cfb64e0b143ac6c3a90` |
| `/etc/systemd/system/kortek-email-worker-staging.service` | `a06049b34039fa7cc8afac0186501543250d44aaf282c07fbeb9b7e5d05bb70f` | `a06049b34039fa7cc8afac0186501543250d44aaf282c07fbeb9b7e5d05bb70f` |

API se reinició **una vez**, se verificó y pasó tres GET; después worker se reinició **una vez**. [API/edición](evidence/prod-p10cb3/api-enable.json), [worker](evidence/prod-p10cb3/worker-enable.json).

| Acción | Inicio UTC | Inicio local UTC−04 | Exit |
| --- | --- | --- | --- |
| `systemctl restart kortek-api` | 2026-10-10T03:14:22.862623+00:00 | 2026-10-09T23:14:22.862623-04:00 | 0 |
| `systemctl restart kortek-email-worker` | 2026-10-10T03:15:12.448694+00:00 | 2026-10-09T23:15:12.448694-04:00 | 0 |

API conserva imagen `sha256:1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775`, release8e1501e, PUBLIC_BOOKING_CLOSED=false y los dos flagstrue. Worker conserva `sha256:bf343354991622b55de47655d749a558c19397ff940badc0831f15774a3da23f`, release8e1501e/DEPLOY_ENVproduction, dosflagstrue. Los cinco hashes de valores correo son iguales a B2 en API y worker. DATABASE_URLworker coincide con credencial propia por hash y difiere de API; credencial no modificada. Unidad API P7 y los tres archivos B1 intactos.

GET públicos **3 de máximo6**: jhonatan200, inexistente p10-no-existe-20261009=404, no elegible dental-ross404; sin5xx, sin cuerpos capturados. [Evidencia](evidence/prod-p10cb3/public-get.json). No se hicieron pruebas de correo/reserva/proveedor.

Observación **900.79 segundos**, **31 muestras**, estados/recursos Podman de ambos procesos y logs desde reinicioAPI: active/running, NRestarts0, imágenes/flags estables; cero errores detectados de configuración/proveedor, arranque/Prisma/conexión/5xx/ERROR y fallos de ciclo. Sin logs crudos. [Recursos, heartbeat y snapshotfinal](evidence/prod-p10cb3/observation.json). Cola/canal antes/después de activación/observación iguales: OMITTED5, EMAILsinpausa. [Tras flags](evidence/prod-p10cb3/queue-enabled.json), [final](evidence/prod-p10cb3/queue-after.json).

QA mantiene cinco hashes de archivos, imágenes, flags/env por hash, PIDs/StartedAt, MainPID y NRestarts iguales a inicioB3/cierreB2. Cuatro unidades active/running. No se tocaron QA, Caddy, CA, timers, monitor, alarmas, migraciones, proveedores ni ramas main/QA. No se hicieron builds/despliegues adicionales.

## Veredicto y rollback

**GO TÉCNICO B3: canal reanudado y Fase2 verificada.** No es prueba de correo entregado/webhook recibido ni aprobación funcional. Auditoría operativa documental disponible; auditoría transaccional DB no existe y no se añadió.

Rollback **preparado, no ejecutado** porque no hubo fallo: volver exactamente las dos líneas a false, comprobar hash inicial y reiniciar API/worker una vez cada uno; verificar y detenerse. **El canal reanudado no se revierte** por ordenB3, aunque hubiera rollback de flags. Respaldo B3 y B2 e imágenes conservados; no restaurar DB/credencial/CA.

## Git y validación

Único commit documental: informe, procedimiento SQL/documental, evidencia sanitizada y entradas docs/README/PROJECT_MASTER. Sin modificar ops/código. Baseae89e40, push sinforce a ai/reserva-invitado-ci. Mainlocal `01113ef0be7d8abcd74e3e7297f7989b359c76c0`, QAlocal `36061fc3c978758642b5a79ed6cb0e5ff25c003f`; mainremoto `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`, QAremoto `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`, preservados. Playbook ajeno fuera del índice. JSON parseados, cotejos/hashes asertados, exit0 de operaciones/verificaciones, diffcheck y revisión íntegra del índice con escaneo de los valores locales sin coincidencias. SHA final/local=remoto/status se reportan al entregar, sin SHA autorreferente.
