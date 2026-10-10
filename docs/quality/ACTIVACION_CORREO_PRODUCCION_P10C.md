# P10c — Activación de correo en producción

**NO-GO / DETENIDO EN PASO 0 / INCOMPLETO.** Fecha local: 2026-10-09, 21:46:53 Santo Domingo; lectura OCI: 2026-10-10T01:46:53.527118Z. Base local y remota autorizada: `ai/reserva-invitado-ci` en `8f8ce6679788a2847030242b8bbb2abd121bf35c`.

La orden solo permite copiar cinco variables y cambiar dos flags en archivos de entorno, con una edición por archivo y un reinicio por unidad afectada. Su Paso 0 exige detenerse si algo no cuadra. Las lecturas prueban que esa edición no llega a los procesos actuales: la API no reenvía las cinco variables y el worker no carga un archivo de entorno de correo. **Sin copias de rollback, ediciones OCI ni reinicios; correo sigue desactivado y reserva pública abierta.** No se ejecutó verificación de 15 minutos ni rollback, pues no hubo activación.

## Declaraciones y comprobaciones

El propietario respondió «TODO SÍ»: dominio verificado en Resend, webhook productivo con cinco eventos/secreto del archivo local y Reply-To con buzón real. Se tomó `booking.kortek.cloud` como dominio remitente declarado; el archivo coincide. Son **declaraciones del propietario, sin evidencia capturada del proveedor o buzón**. No se consultaron ni modificaron Resend, Clerk, Vercel o Supabase.

`apps/api/.env.resend.prod` existe y `git check-ignore` lo confirma ignorado. Lectura íntegra solo en memoria: los cinco valores obligatorios presentes/no vacíos, sin marcadores detectados, formatos de remitente/Reply-To correctos y restricciones del adaptador satisfechas (sin caracteres de control en API key, prefijo de webhook y longitud mínima de abuse secret). El remitente es distinto del de QA. Se comparan hashes de valores interpretados, sin comillas delimitadoras; no se imprimieron ni guardaron valores en logs, evidencias o repo. Los siguientes hashes pertenecen al archivo local; **no prueban instalación en producción**.

| Variable | SHA256 local producción | SHA256 QA | Comparación |
| --- | --- | --- | --- |
| NOTIFICATIONS_EMAIL_FROM | 8d95dc5d6a73286f67a3e0709fd21aa7a9e4d056aacc904d7134f3e938b49280 | 391eb421b1b339c0b165592ead461befabe5d1d6b01011866b298bfe12dca0e7 | Distinto |
| NOTIFICATIONS_EMAIL_REPLY_TO | 903fb429b6dd846361c30bb7f73c098b9ec0e517ca1a8e70b455bdcc73540ea9 | b6ab7baa412b1e187899da2e1b6a830e7c93fa4db63b185fd82eeddd10e76868 | Distinto |
| RESEND_API_KEY | 1a1ca59ca537edd9e697248002a0ac7acfbba9e1635d21c0d0baa08148e6b33d | 5c45ec62b6e66d315e910b2853765b0265d54573c5155300ce0f8584736f4e89 | Distinto |
| RESEND_WEBHOOK_SECRET | 2aa6cf2a02be96f4967bce36f36f3fb9926de4a286d159c057e36c533008b027 | 60b30cb3725d7e48e58417a6eef123b077f0d451d5d04f5355e405bb51c83875 | Distinto |
| NOTIFICATIONS_ABUSE_SECRET | 21d9373ddf093621ae309762bb7816d9760157dfab263fe31eefd03f8f43e3de | 178b228979309290599f8a37605cb60749e5ea52c44ff2d664ea3f3e21520c9d | Distinto |

## Bloqueos observados en OCI

| Proceso | Fuente real y mecanismo | Resultado |
| --- | --- | --- |
| API producción | `kortek-api.service`: `LoadCredential=runtime-env:/etc/kortek-api/runtime-env`; `ExecStart=/usr/local/libexec/kortek-api-run.sh` | Carga el archivo, pero Podman recibe solo los dos flags: faltan los cinco nombres en los argumentos `-e`. Añadirlos al archivo no los entrega al contenedor. |
| Worker producción | `kortek-email-worker.service`: `LoadCredential=database-url:/etc/kortek-worker/database-url`; `ExecStart=/usr/local/libexec/kortek-worker-run.sh` | No carga runtime-env; `/etc/kortek-worker/runtime-env` no existe. Wrapper fija `NOTIFICATIONS_EMAIL_ENABLED=false` y `NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED=false`, pasando solo DATABASE_URL. No hay archivo de correo actualmente consumido que pueda editarse con el alcance autorizado. |
| QA API y worker | Sus unidades cargan `/etc/kortek-api-staging/runtime-env` | Solo lectura comparativa; no copia, edición ni reinicio. |

Hashes de wrappers instalados: API `7bfe37be39267b8015a288ac9b5cc83724590ca30ef3f01ce0317b01cc442f6f`; worker `c1737c618d268897f3a355c11ac86564ba419f12f7a556a0084a94ce9233338b`. La evidencia también contiene hashes de la **salida de systemctl cat**; no se presentan como hashes de archivos individuales. No existen drop-ins en las cuatro unidades inspeccionadas.

## Estado base confirmado

Las cuatro unidades API/worker producción y QA están active/running y NRestarts=0; contenedores running. API producción conserva imagen P5 `1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775`, release efectivo `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`, PUBLIC_BOOKING_CLOSED=false y ambos flags de correo false. runtime-env root0600 SHA256 `6798f01f28e7309b4f7cfbd8abf414e5cfbe86301888557087b79624c6018bc6`, exacto al cierre de [P10](ACTIVACION_RESERVA_PUBLICA_PRODUCCION_P10.md).

El worker productivo conserva imagen histórica `166af6ac2586ca622b06a69b17ad30af9da1802e64ed285bcfce25f578a5007f`, no P5, y no declara APP_RELEASE. PID6654/StartedAt2026-09-27T04:15:24.544231174Z, coherentes con [P7](ACTIVACION_API_PRODUCCION_P7.md). No se atribuye un SHA efectivo ausente ni se cambia la imagen para forzar el criterio de P10c. QA conserva hash `d6a94be929feb44056e3c64020127f6543de3d356fdac09e275c0362c64a57f6`, imagen API8ba1b6c8…/PID1523029 y worker7eafd5c9…/PID1084581, iguales a las lecturas previas. No se ha revalidado negocio/ledger: P10c prohíbe acceder a la base de datos.

El código exacto `8e1501e` confirma `@Controller('notifications/resend')` y `@Post('webhook')`: **POST /notifications/resend/webhook**. Inspección local de `resend.adapter.ts` y wrappers versionados contrastada con los nombres del entorno efectivo. Sin llamadas HTTP, correos de prueba, reservas ni pruebas de entrega; tampoco builds, despliegues, cambios de proveedor o DB.

## Relevo necesario

La autorización actual no cubre cambios de wrappers/unidad, crear un nuevo entorno de worker ni seleccionar su imagen/release. Para reanudar, una nueva orden debe concretar:

1. Reenvío de los cinco nombres de correo desde el wrapper API mediante `-e NOMBRE`, sin valores por argv.
2. Fuente protegida del entorno del worker, carga mediante credencial systemd, reenvío de las cinco variables y dos flags, sustituyendo los flags hardcodeados; preservar DATABASE_URL y los demás argumentos.
3. Decisión explícita sobre conservar la imagen histórica del worker o exigir P5, con mecanismo y validación de compatibilidad aprobados; no puede afirmarse que ya usa P5/8e1501e.
4. Repetir prechecks antes de toda escritura y concretar entrega documental posterior: el único commit documental de esta orden registra esta parada.

La orden P10c original no se considera completada y la paridad de correo sigue pendiente. No se solicita ni se ejecuta una ampliación implícita.

## Evidencia y Git

[Prechecks sanitizados](evidence/prod-p10c/prechecks.json): local/SSH exit0, solo metadatos/nombres/flags/hashes; salida SSH sin volcado de valores. `git show 8e1501e:apps/api/src/notifications/email-webhook.controller.ts` exit0; `git diff --check`, validación de JSON/enlaces y diff completo antes del único commit documental. No se ejecutan builds en esta entrega documental.

Referencia remota main `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`, QA `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`. Locales main `01113ef0be7d8abcd74e3e7297f7989b359c76c0` y QA `36061fc3c978758642b5a79ed6cb0e5ff25c003f`: solo leídas y preservadas. Playbook ajeno sin seguimiento/hash `3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090`, sin staging. SHA del commit documental, local=remoto y estado final se reportan después del push sin force a `ai/reserva-invitado-ci`.
