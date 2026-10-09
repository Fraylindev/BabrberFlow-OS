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
