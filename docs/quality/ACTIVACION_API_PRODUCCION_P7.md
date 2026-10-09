# P7 — Activación de la API de producción

Fecha: 2026-10-09. **GO técnico para P7 / ACTIVACIÓN VERIFICADA**. Observación completa y OCI reconfirmado; no constituye apertura de la reserva ni cierre funcional del MVP. API activada con reserva pública cerrada y correo desactivado. El registro histórico de la parada por selector se conserva abajo; la autorización posterior del propietario lo supera.

Código ejecutado: `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`. Imagen P5: `sha256:1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775`. Selector autorizado, versionado en el commit operativo `323fef48594c903f876bb0cb2a6e3cbd31e3737c`: dos overrides no secretos, limitados a ese par exacto. La unidad los define; el wrapper los captura antes de cargar la credencial y los aplica después. Sus argumentos Podman y flags se conservan. No se construyó otra imagen.

## Autorizaciones y alcance efectivo

El propietario autorizó expresamente «el selector de imagen/release descrito en el informe publicado». Posteriormente autorizó «exclusivamente esas escrituras técnicas inherentes al único GET de verificación»: el ThrottlerGuard de booking-data puede insertar/actualizar SecurityRateBucket y limpiar filas vencidas antes de comprobar el cierre. Se hizo **un solo GET público**. Esa excepción no autoriza escrituras de negocio, migraciones ni cambios de ledger, flags o proveedores. No se afirma ausencia absoluta de escrituras DB, ni se atribuye un número exacto de filas técnicas afectadas sin evidencia.

Se aplicó kortek-delivery. La rama autorizada específicamente para esta entrega es ai/reserva-invitado-ci. Un commit operativo contiene el mecanismo aprobado; el informe y sus evidencias se entregan en un único commit documental separado. No se abrió la reserva, no se promovió la web y no se modificaron Vercel, Clerk, Supabase, QA ni workers.

## Prechecks actuales

| Requisito | Resultado |
| --- | --- |
| Imagen P5, imagen anterior y QA | Las tres presentes antes de activar; producción anterior 8caacd85…, QA 8ba1b6c8… |
| Credencial / flags | SHA256 42ce91a14849c9746109e2864c4500976bb98d2d2e1a3e7713f4485a3aaff23a; root 0600; PUBLIC_BOOKING_CLOSED=true, NOTIFICATIONS_EMAIL_ENABLED=false |
| Ledger y conteos, antes y después | 32 filas: 28 activas, 4 revertidas, 0 en curso; Booking=0, Client=0, User=2 |
| Locks del migrador READ ONLY | 0 no concedidos; 0 fuertes ajenos en public |
| Vista administrativa aportada por el propietario | 4 sesiones kortek_runtime idle, xact_age=null, Client/ClientRead; ninguna idle in transaction, ninguna transacción >1 minuto, ninguna espera Lock. Evidencia aportada por el propietario; no acceso administrativo ejecutado por el agente |
| Web pública | booking.kortek.cloud sigue en dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm |
| WEB: nombres requeridos / Vercel producción | DEPLOY_ENV, WEB_PUBLIC_ORIGIN, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY presentes; 0 faltantes y 0 variables production ocultas según el conector; sin leer valores |
| OCI antes | 8 definiciones activas; Alarm Status muestra solo kortek-prod-restore-stale (Critical, disparada 16:52 UTC); Error/Warning/Informational=0 |

Las lecturas SQL usaron el migrador autorizado en BEGIN READ ONLY, con exit 0. La captura administrativa es la tabla pegada por el propietario en esta sesión; sus state_age largos son tiempos idle, no edad de transacción. [Prechecks sanitizados](evidence/prod-p7/prechecks.json).

**Citas de P5:** el [informe P5](IMAGEN_API_PRODUCCION_P5.md), «Diff de variables», no identifica faltantes obligatorios API/worker. Ausentes condicionales de correo: NOTIFICATIONS_EMAIL_FROM, NOTIFICATIONS_EMAIL_REPLY_TO, NOTIFICATIONS_ABUSE_SECRET, RESEND_API_KEY, RESEND_WEBHOOK_SECRET. Opcionales API ausentes: CLERK_JWT_AUDIENCE, WHATSAPP_BASE_URL. KORTEK_API_IMAGE pertenece a operaciones, NODE_OPTIONS al wrapper y POSTGRES_PASSWORD al ejemplo local. [Inventario P5](evidence/prod-p5/variable-names.json).

P5, «Worker y preservación», registra una imagen distinta: 166af6ac2586ca622b06a69b17ad30af9da1802e64ed285bcfce25f578a5007f y unidad independiente kortek-email-worker.service. El diff b5615869 → 8e1501e en notificaciones añade el import y la llamada a lockOrganizationSchedule en el productor; no cambia email-worker, su CLI, política ni ResendAdapter. No requiere activar conjuntamente el worker; se conservó su proceso. No se le atribuye un release que su entorno no declara.

## Rollback preparado y activación

Copias verificadas en `/var/backups/kortek-api/p7-20261009T171143Z`, directorio root 0700; unit, wrapper y runtime-env copiados como root 0600, imagen anterior registrada. Hashes originales/copias: unit `7212bddcbdce426bd6017c102dc34272653d97608256088be48f5475e1f3f17b`; wrapper `336f773a2516f5f788cc0470130f2af5ed38da7c6870396b5fed973eef7d7dfe`; credencial `42ce91a14849c9746109e2864c4500976bb98d2d2e1a3e7713f4485a3aaff23a`.

Se instalaron solamente el wrapper y unidad versionados, con root 0755/0644 respectivamente. bash -n y systemd-analyze verify terminaron con exit 0. Startup drill versionado en contenedor efímero, sin red y con datos sintéticos: **23 casos, exit 0**. Se ejecutaron daemon-reload y **un reinicio** de kortek-api a las 17:12:04.521638 UTC; disponible a las 17:12:07.330230 UTC. Rollback no ejecutado en esta fase: 0 reinicios de rollback. [Manifest sanitizado](evidence/prod-p7/activation.json).

## Verificación real

La imagen exacta P5 corre con APP_RELEASE completo 8e1501e…, systemd active/running y NRestarts=0. Hash instalado del wrapper: `7bfe37be39267b8015a288ac9b5cc83724590ca30ef3f01ce0317b01cc442f6f`; unidad: `333f948911c06cfcbac45efc98a204894ab4d75aaaca56cb0b05b8f6bb3fa94f`. Credencial y flags intactos.

verify-runtime-role.sql se ejecutó sin modificar su DO dentro de una transacción READ ONLY, y se comprobó current_user=kortek_runtime mediante la conexión real. Su SHA256 es `2f0b87a2147ce1f0fe4f25c7fd4b4c08b6ec97c061814fe1b5fad61c37f5456d`. Después se ejecutó dist/prisma/verify-integrity.cli.js versionado. Ambos **exit 0** en el mismo contenedor efímero de P5, sin puertos publicados, read-only, cap-drop ALL y CA montada. Se cargó el env-file de producción desde la copia LoadCredential de systemd (uid opc, modo 0400, mismo hash): source aplica su sintaxis de comillas igual que el wrapper; los valores pasan por entorno, nunca por argv ni logs. No se creó otro archivo de secretos.

Smoke local de la API nueva: GET `/` → **404**; único GET `/public/dental-ross/booking-data` → **404** con reserva cerrada; GET `/organizations/mine/schedule` sin sesión → **401**. Sin POST ni escrituras de negocio. [Resultados sanitizados](evidence/prod-p7/verify.json).

Observación completada: **900 segundos, 21 muestras**, desde 2026-10-09T17:13:00.792118+00:00 hasta 2026-10-09T17:28:01.267598+00:00; todas active/running, NRestarts=0, hash y flags intactos, con cero errores detectados de arranque/conexión/Prisma. Se leyeron logs del contenedor y journal desde la activación cada unos 45 segundos. [Serie sanitizada](evidence/prod-p7/observation.jsonl). El primer helper de observación devolvió exit 1 al no admitir journalctl el formato ISO con fracción; no fue un fallo de la API. Se corrigió solo el formato de fecha del lector y comenzó una observación nueva desde cero, conservando los logs desde la activación. No se relajaron controles ni se reinició la API.

OCI se leyó por Chrome porque la API con instance principal devolvió 404 NotAuthorizedOrNotFound y el conector no tenía signer disponible. No se cambiaron políticas ni credenciales. Lecturas antes/durante/después: solo restore-stale en la inicial y posteriores; una lectura intermedia mostró cero. La lectura final a 2026-10-09 17:28:34 UTC muestra **1 Critical, 0 Error/Warning/Informational**, únicamente restore-stale. No se observaron otras alarmas disparadas. Se conserva el estado mostrado, sin afirmar resolución permanente ni causa de las variaciones de restore-stale. [Antes](evidence/prod-p7/oci-browser-before.json), [intermedia](evidence/prod-p7/oci-browser-mid.json), [intermedia posterior](evidence/prod-p7/oci-browser-mid2.json), [final](evidence/prod-p7/oci-browser-after.json).

Lectura SSH final: copias root 0600 verificadas otra vez, directorio root 0700, runtime-env root 0600 y mismo hash. Las tres imágenes retenidas existen; PID 1735374, StartedAt 2026-10-09T17:12:04.999949373Z, sin reinicios posteriores. **Un reinicio de activación, cero de rollback**. [Estado final](evidence/prod-p7/end.json). Ningún contenedor efímero quedó activo por esta tarea; ambos se ejecutaron con --rm.

## Preservación y Git

Las capturas [anterior](evidence/prod-p7/ssh-before.json) y [posterior](evidence/prod-p7/ssh-after.json) permiten comparar imágenes, PID, StartedAt y hash del entorno de QA y ambos workers: sin cambios. Hash runtime-env QA d6a94be929feb44056e3c64020127f6543de3d356fdac09e275c0362c64a57f6 intacto. La API nueva es el único contenedor permanente cambiado. Se conservan las imágenes previas para rollback.

Remote main `8e1501e89a132e1b01d3633b1b3f896a8cbe5800` y remote QA `523d993cfa0c797f356c224d5cc026d6c9ad4c7b` conservados. Local main `01113ef0be7d8abcd74e3e7297f7989b359c76c0`, local QA `36061fc3c978758642b5a79ed6cb0e5ff25c003f`, sin mover. main remoto solo incorpora el merge del propietario acreditado en P2; esta tarea no escribe esa rama.

Playbook ajeno no seguido preservado: `docs/Playbook Kortek Booking_ del 29 de septiembre al MVP.md`, SHA256 `3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090`. Sin staging de ese archivo. SHA final documental, local=remoto y status se reportan después de publicar, sin force, exclusivamente a origin/ai/reserva-invitado-ci.

# Registro histórico

La sección siguiente es el checkpoint anterior, conservado como evidencia histórica. Su NO-GO se refiere al procedimiento previo a la autorización del selector; no describe la ejecución actual.

# P7 — Parada en prechecks por selección de imagen

Fecha: 2026-10-09. **NO-GO / PAUSADO / INCOMPLETO.** La API nueva no se activó. Se detuvo la tarea antes de cualquier escritura en OCI, al comprobar que la selección de imagen/release del procedimiento versionado contradice la prohibición de tocar runtime-env. Esta publicación es únicamente documental y no aprueba P7.

Base: `ai/reserva-invitado-ci` en `2e6487023e2e82853a6fa84987d2f3c08d7ce390`. Código e imagen candidatos: `8e1501e89a132e1b01d3633b1b3f896a8cbe5800` / `sha256:1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775`.

## Bloqueo comprobado

El [procedimiento versionado](../../ops/oci-api/README.md) establece: «Configurar `KORTEK_API_IMAGE` con ID inmutable en la credencial». La [unidad versionada](../../ops/oci-api/kortek-api.service) carga `/etc/kortek-api/runtime-env` mediante LoadCredential y ejecuta `/usr/local/libexec/kortek-api-run.sh`.

El [wrapper versionado](../../ops/oci-api/api-run.sh) hace, en este orden:

```bash
set -a
source "$credentials_dir/runtime-env"
set +a
# ... podman run, con los controles versionados ...
# reenvía APP_RELEASE desde ese entorno y selecciona KORTEK_API_IMAGE
```

El wrapper instalado coincide byte a byte con el archivo de `8e1501e`: SHA256 `336f773a2516f5f788cc0470130f2af5ed38da7c6870396b5fed973eef7d7dfe`. SSH confirmó que carga la credencial, selecciona la imagen mediante KORTEK_API_IMAGE y reenvía APP_RELEASE con `-e APP_RELEASE`. systemd confirmó ExecStart apuntando al wrapper y ausencia de drop-ins.

**Consecuencia:** añadir Environment para esos dos nombres a la unidad no los impone, porque el wrapper vuelve a asignarlos al cargar la credencial. El APP_RELEASE incorporado en la imagen P5 tampoco prevalece sobre `-e APP_RELEASE`. El procedimiento actual no ofrece argumentos ni overrides para seleccionar ambos después de cargar runtime-env. Sustituirlo por un ExecStart nuevo o adaptar el wrapper requeriría definir/aprobar otro mecanismo, excluido por «no inventes uno». Actualizar la credencial contradice la prohibición expresa y su hash exigido.

No se intentó ninguna de esas alternativas. No hubo rechazo de auto-review: la parada responde al código/procedimiento real y al alcance de la orden.

## Prechecks capturados

Lectura SSH sanitizada con exit 0: podman inspect/image exists bajo opc; stat/hash/nombres de la credencial; selección del wrapper; systemctl show. No se imprimieron secretos. Los únicos valores de flags expuestos fueron los dos exigidos por el Paso 0(d).

| Requisito | Evidencia / estado |
| --- | --- |
| 0(a), P5 presente | Imagen exacta `1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775` presente |
| 0(a), producción conservada | Imagen `8caacd8548a61d94807c0b865229a731df594f63f609ca9ab57df99283dceca2`, PID 151158, StartedAt 2026-09-28T04:18:48.811406175Z, release `b5615869dcbec4bd174608f2373e73ff618fae26` |
| 0(a), QA conservada | Imagen `8ba1b6c8a45391433998deeae1111d2d96c6cbf84932a7e9972cb6cf90e95eec`, PID 1523029, StartedAt 2026-10-08T04:47:16.500690063Z |
| 0(b), nombres obligatorios API | Todos los 22 nombres obligatorios inventariados en P5 están presentes; sin faltantes obligatorios detectados por nombre |
| 0(c), worker | Imagen distinta `166af6ac2586ca622b06a69b17ad30af9da1802e64ed285bcfce25f578a5007f`, PID 6654, StartedAt 2026-09-27T04:15:24.544231174Z; unidad independiente kortek-email-worker.service según P5 |
| 0(d), runtime-env | SHA256 `42ce91a14849c9746109e2864c4500976bb98d2d2e1a3e7713f4485a3aaff23a`, igual al último verificado; uid 0, modo 0600 |
| 0(d), flags | `PUBLIC_BOOKING_CLOSED=true`, `NOTIFICATIONS_EMAIL_ENABLED=false` |
| Servicio actual, sin activación | active/running, MainPID 151141, NRestarts=0 |
| 0(e), ledger/conteos/sesiones y dominio web | No repetidos en P7: parada por la contradicción del procedimiento. P3/P4 y P2 son evidencia histórica, no una comprobación actual de estos requisitos |
| 0(f), nombres WEB frente a Vercel producción | No ejecutado tras la parada; no se declara ausencia de faltantes |

El hash completo de la credencial permanece igual al capturado en P5, por lo que su inventario de nombres también permanece igual. Esta comparación no sustituye validación de valores ni login runtime.

## Citas de P5 — variables y worker

El [informe P5](IMAGEN_API_PRODUCCION_P5.md), sección «Diff de variables», registra **ningún faltante obligatorio** del API o worker. Los cinco nombres condicionales de correo ausentes son `NOTIFICATIONS_EMAIL_FROM`, `NOTIFICATIONS_EMAIL_REPLY_TO`, `NOTIFICATIONS_ABUSE_SECRET`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`. Los opcionales API ausentes son `CLERK_JWT_AUDIENCE`, `WHATSAPP_BASE_URL`. `KORTEK_API_IMAGE` es consumido por operaciones; `NODE_OPTIONS` lo añade el wrapper. `POSTGRES_PASSWORD` pertenece al ejemplo local. No se identificaron cambios de significado en la configuración comparada. [Inventario de nombres P5](evidence/prod-p5/variable-names.json).

P5, sección «Worker y preservación», confirma imagen distinta y unidad `kortek-email-worker.service`. El único diff de notificaciones entre b5615869 y 8e1501e añade el import y la llamada a `lockOrganizationSchedule` en notification-producer.ts. No cambia email-worker, su CLI, política ni ResendAdapter. P5 no identifica una obligación de activar ese worker junto con la API; la activación conjunta no se ejecutó ni se añadió al alcance. Su entorno carece de APP_RELEASE, de modo que no se le atribuye un SHA de código a partir de ese dato ausente.

## Lo que no se ejecutó y continuación necesaria

Pasos 1–4 no ejecutados: sin directorio de rollback, copias de credenciales/unit, cambios de unidad/wrapper, daemon-reload, reinicios, activación o rollback. Tampoco se ejecutaron smoke de la API nueva, contenedor efímero de verificación, login runtime, observación de 15 minutos ni consulta de alarmas OCI. Sin consultas/migraciones/escrituras DB ni cambios en Vercel, Clerk o Supabase.

Para reanudar conservando runtime-env intacto, se requiere una orden que autorice y concrete un selector de imagen/release en el wrapper/unidad. Propuesta para revisión del propietario, **no implementada ni autorizada**: dos overrides no secretos, `KORTEK_API_IMAGE_OVERRIDE` y `APP_RELEASE_OVERRIDE`, definidos en la unidad y aplicados por el wrapper después de cargar la credencial; limitar ambos a la imagen P5 y al SHA exacto, preservar los argumentos Podman y no modificar flags. Esto cambia el wrapper/procedimiento y por eso no se aplicó dentro de P7. Después de aprobar y versionar el mecanismo, repetir todos los prechecks antes de preparar rollback y del único reinicio autorizado.

## Entrega documental y preservación Git

Único archivo de esta entrega: este informe. Publicación autorizada solamente en `ai/reserva-invitado-ci`, con staging explícito, revisión de diff, checks y push sin force. El SHA definitivo y su igualdad local/remoto se reportan después de publicar.

Lectura remota previa a la publicación: main `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`; QA `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`. No se movieron main ni QA por esta tarea. Playbook ajeno no seguido, preservado sin staging: SHA256 `3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090`.
