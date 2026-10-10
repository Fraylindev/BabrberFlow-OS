# P10c-A — Unidades, wrappers y construcción del worker sin activar

Fecha local: **2026-10-09**, Santo Domingo. Lecturas: 2026-10-10T02:01:17.270029+00:00 y 2026-10-10T02:03:10.506380+00:00 UTC. **ANÁLISIS Y CONSTRUCCIÓN COMPLETADOS / EN REVISIÓN; SIN ACTIVACIÓN.** Base documental `ai/reserva-invitado-ci` en `37a01ba7f4e9421e145d8625366a82105987a9cc`; fuente operativa y de construcción exclusivamente `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`. Esta orden sustituye P10c original por A y una futura B del propietario. No acredita correo real, QA funcional ni aprobación de B.

## Instalado frente a fuente exacta 8e1501e

[Contenido completo de las cuatro unidades y cuatro wrappers](evidence/prod-p10ca/installed-content.md), [diff exacto instalado/versionado](evidence/prod-p10ca/installed-vs-versioned.patch) y [tabla JSON](evidence/prod-p10ca/comparison.json). Hashes SHA256 de bytes originales individuales; no de salida de systemctl. Sin drop-ins en las cuatro unidades.

| Instalado | Plantilla en 8e1501e | Hash instalado | Hash versionado | Comparación |
| --- | --- | --- | --- | --- |
| `/etc/systemd/system/kortek-api.service` | `ops/oci-api/kortek-api.service` | `333f948911c06cfcbac45efc98a204894ab4d75aaaca56cb0b05b8f6bb3fa94f` | `7212bddcbdce426bd6017c102dc34272653d97608256088be48f5475e1f3f17b` | Diferencia descrita debajo |
| `/etc/systemd/system/kortek-api-staging.service` | `ops/oci-api/kortek-api-staging.service` | `91ce7997af89f16927acae71c6030c60765ab16c43022cfb64e0b143ac6c3a90` | `91ce7997af89f16927acae71c6030c60765ab16c43022cfb64e0b143ac6c3a90` | Idéntico |
| `/etc/systemd/system/kortek-email-worker.service` | `ops/oci-free-backup/kortek-email-worker.service` | `01b1fc2d63b459b482bf16333afcd0de89275c238ca01956b51503ccb20acbf1` | `01b1fc2d63b459b482bf16333afcd0de89275c238ca01956b51503ccb20acbf1` | Idéntico |
| `/etc/systemd/system/kortek-email-worker-staging.service` | `ops/oci-api/kortek-email-worker-staging.service` | `a06049b34039fa7cc8afac0186501543250d44aaf282c07fbeb9b7e5d05bb70f` | `a06049b34039fa7cc8afac0186501543250d44aaf282c07fbeb9b7e5d05bb70f` | Idéntico |
| `/usr/local/libexec/kortek-api-run.sh` | `ops/oci-api/api-run.sh` | `7bfe37be39267b8015a288ac9b5cc83724590ca30ef3f01ce0317b01cc442f6f` | `336f773a2516f5f788cc0470130f2af5ed38da7c6870396b5fed973eef7d7dfe` | Diferencia descrita debajo |
| `/usr/local/libexec/kortek-api-staging-run.sh` | `ops/oci-api/api-staging-run.sh` | `118d2c83c4b800f9e63d72c365d486f47b6f4aaf491ec8221be84305ff27cbf8` | `118d2c83c4b800f9e63d72c365d486f47b6f4aaf491ec8221be84305ff27cbf8` | Idéntico |
| `/usr/local/libexec/kortek-worker-run.sh` | `ops/oci-free-backup/worker-run.sh` | `c1737c618d268897f3a355c11ac86564ba419f12f7a556a0084a94ce9233338b` | `c1737c618d268897f3a355c11ac86564ba419f12f7a556a0084a94ce9233338b` | Idéntico |
| `/usr/local/libexec/kortek-worker-staging-run.sh` | `ops/oci-api/kortek-worker-staging-run.sh` | `919d73ca08e6485f34a456d88a01e2406537c2c34ac7722e3564f84c06f99ad6` | `5ffe5f37541b1830d799c696052bc733fea05a61f1f91229d5d9777988b7333d` | Diferencia descrita debajo |

La API productiva difiere solo por el selector P7: dos Environment en la unidad (imagen P5/release 8e1501e) y captura/validación/aplicación de ese par en el wrapper, antes/después de source. El reenvío de correo no cambió. No reinstalar la plantilla 8e1501e sin conservar P7: perdería el selector efectivo y tomaría la selección histórica de runtime-env. [Antecedente P7](ACTIVACION_API_PRODUCCION_P7.md).

QA procede de las plantillas `ops/oci-api/api-staging-run.sh`, `kortek-api-staging.service`, `kortek-worker-staging-run.sh` y `kortek-email-worker-staging.service`. Las dos unidades y wrapper API son idénticos a 8e1501e. El wrapper worker difiere en **una línea**: fija `sha256:7eafd5c9…` donde la plantilla toma KORTEK_API_IMAGE. Así conserva F0-D aunque la API QA haya avanzado. El [registro F0-D](CORRECTIVO_F0D.md) asocia ese mismo ID al build de `92f61274dcb733e0e43f14a45851c0da346430c2`. La igualdad/diff identifica las plantillas; no demuestra retrospectivamente qué comando de instalación se ejecutó.

Producción usa las plantillas independientes de `ops/oci-free-backup`, creadas para C1 con canal deshabilitado, credencial database-url y tag c1. Unidad y wrapper productivos worker son idénticos a 8e1501e: la diferencia con QA es **de diseño versionado**, no un wrapper QA instalado incorrectamente. QA añade entorno común, siete reenvíos, guardas de QA, entrada explícita y límites. No copiar sus guardas/orígenes/proyecto a producción.

### Reenvíos y procedimiento versionado

Las cinco variables son `NOTIFICATIONS_EMAIL_FROM`, `NOTIFICATIONS_EMAIL_REPLY_TO`, `NOTIFICATIONS_ABUSE_SECRET`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`; los flags son `NOTIFICATIONS_EMAIL_ENABLED`, `NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED`.

| Plantilla 8e1501e | Cinco variables | Dos flags | Fuente |
| --- | --- | --- | --- |
| API QA | Sí, -e NOMBRE | Sí, desde credencial | runtime-env QA |
| Worker QA | Sí, -e NOMBRE | Sí, desde credencial | runtime-env QA |
| API producción | No | Sí, desde credencial | runtime-env producción |
| Worker producción | No | Literales false, no reenvío | solo database-url |

Inventario `git ls-tree -r 8e1501e apps/api/ops ops`: los helpers de apps/api/ops son verificadores/drills, no instaladores systemd. No existe instalador versionado completo que convierta automáticamente producción al modelo de correo QA. [README API](../../ops/oci-api/README.md) en 8e1501e documenta construcción e instalación manual de CA/wrapper/unidades; el selector instalado es la adaptación posterior P7; [README continuidad](../../ops/oci-free-backup/README.md) y sus worker.Containerfile/worker-run.sh/unidad describen el worker histórico. Para B hay que versionar y validar las adaptaciones productivas precisas antes de instalarlas; no hay una plantilla productiva actual que ya haga los siete reenvíos. No se ejecutó ningún instalador. [Hashes de los README y Containerfiles exactos de 8e1501e](evidence/prod-p10ca/procedure-source-hashes.json); los enlaces al workspace pueden contener documentación posterior.

### Archivos de entorno realmente consumidos

No se publica contenido ni valores; se leyó en memoria solo para nombres, hashes y redacción. Son los tres archivos alcanzados por LoadCredential. QA API/worker comparten el primero; el worker productivo consume el tercero. No hay EnvironmentFile ni source adicional en wrappers. No se copiaron secretos.

| Archivo | Hash SHA256 | Propietario / modo | Nombres |
| --- | --- | --- | --- |
| `/etc/kortek-api-staging/runtime-env` | `d6a94be929feb44056e3c64020127f6543de3d356fdac09e275c0362c64a57f6` | root:root / 0600 | API_PUBLIC_ORIGIN, APP_RELEASE, CLERK_AUTHORIZED_PARTIES, CLERK_INVITATION_REDIRECT_URL, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, CORS_ALLOWED_ORIGINS, DATABASE_URL, DEPLOY_ENV, HOST, JWT_SECRET, KORTEK_API_IMAGE, NODE_ENV, NOTIFICATIONS_ABUSE_SECRET, NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED, NOTIFICATIONS_EMAIL_ENABLED, NOTIFICATIONS_EMAIL_FROM, NOTIFICATIONS_EMAIL_REPLY_TO, PORT, PUBLIC_BOOKING_CLOSED, RATE_LIMIT_SECRET, REQUIRE_INTERNAL_MFA, RESEND_API_KEY, RESEND_WEBHOOK_SECRET, WEB_PUBLIC_ORIGIN |
| `/etc/kortek-api/runtime-env` | `6798f01f28e7309b4f7cfbd8abf414e5cfbe86301888557087b79624c6018bc6` | root:root / 0600 | API_PUBLIC_ORIGIN, APP_RELEASE, CLERK_AUTHORIZED_PARTIES, CLERK_INVITATION_REDIRECT_URL, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, CORS_ALLOWED_ORIGINS, DATABASE_URL, DEPLOY_ENV, HOST, JWT_SECRET, KORTEK_API_IMAGE, NODE_ENV, NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED, NOTIFICATIONS_EMAIL_ENABLED, PORT, PUBLIC_BOOKING_CLOSED, RATE_LIMIT_SECRET, REQUIRE_INTERNAL_MFA, WEB_PUBLIC_ORIGIN |
| `/etc/kortek-worker/database-url` | `4f4e71b985c7783935a1348f129b3c2deba081e6fff2ef37f761d934b8f39f05` | root:root / 0600 | DATABASE_URL |

El archivo productivo API no contiene las cinco variables. Los hashes anteriores y posteriores son iguales. La credencial database-url del worker se conserva independiente: no reemplazarla por DATABASE_URL de API sin validar su pool y contrato operativo.

## Procedencia y compatibilidad

[Imagen e historial completos sanitizados](evidence/prod-p10ca/before.json), [comparación de modelos](evidence/prod-p10ca/schema-model-comparison.json), [diff exacto createBooking invitado](evidence/prod-p10ca/guest-event.patch), [comparación del evento](evidence/prod-p10ca/event-comparison.json).

| Worker | Imagen / creación UTC | Procedencia | Clasificación |
| --- | --- | --- | --- |
| Producción | `166af6ac2586ca622b06a69b17ad30af9da1802e64ed285bcfce25f578a5007f` / 2026-09-26T00:59:31.809237039Z | Tag localhost/kortek-worker:c1; label solo io.buildah.version=1.43.1; APP_RELEASE y revision ausentes | **Exige imagen nueva: SHA desconocido** |
| QA | `7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1` / 2026-10-01T05:44:09.549668977Z | Tag con SHA 92f61274dcb733e0e43f14a45851c0da346430c2, corroborado por ID/registro F0-D; solo label Buildah, sin release/revision en imagen | **Con cambios compatibles**, según esa procedencia documental |

El historial productivo muestra build pnpm/Prisma/Nest y CMD del worker; no contiene un SHA Git identificable. Fecha/tag c1 no permiten atribuirle b561586 ni otro SHA. **No se puede hacer un diff real SHA productivo → 8e1501e**; no se sustituye por el SHA histórico de la API. Esto dispara la construcción autorizada. La procedencia QA es tag + registro de build, no atestación criptográfica del contenido completo.

Diff QA `92f61274dcb733e0e43f14a45851c0da346430c2` → `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`, limitado al consumidor/productor de correo:

- `apps/api/src/notifications` completo: diff vacío; entrada email-worker.cli.ts, email-worker.ts, outbox, política, plantillas, productor y ResendAdapter idénticos.
- Modelos Notification, BookingEmailPreference, BookingEmailEvent, EmailOutbox, EmailWebhookReceipt, EmailAbuseBucket y EmailChannelControl: bloques idénticos por hash. Los 33 renglones añadidos al schema completo pertenecen a CustomerOperation/campos/índice de cliente y relaciones; no cambian estos modelos de correo. No se ejecutó migración ni consulta DB.
- `BookingsService.create` es idéntico por hash: llama `recordBookingEmailChange` dentro de la misma transacción con before=null, reserva creada, choice y source PUBLIC/STAFF. La reserva invitada conserva emailNotifications/reviewedEmail y delegación al create público en transacción; elimina alta secundaria B2C y campos de respuesta de cuenta, y cambia mensaje de teléfono inválido. No cambia formato/secuencia/evento de outbox ni consentimiento.
- La disponibilidad y los demás cambios públicos quedan fuera de la comparación de eventos; no justifican sustituir por sí solos un consumidor cuyo código/modelos son iguales. Compatibilidad estática QA, sin ejecutar el worker contra esquema/cola actuales.

## Construcción nueva completada

[Preflight de recursos](evidence/prod-p10ca/build-preflight.json), [manifest mínimo](evidence/prod-p10ca/manifest.json), [resultado](evidence/prod-p10ca/build-result.json), [inspección](evidence/prod-p10ca/new-image.json).

Antes de transferir: disco libre **9.367.949.312 bytes**, MemAvailable **9.537.822.720 bytes**; mínimos P5 **6 GiB / 1 GiB** satisfechos. Tag y directorio nuevos confirmados ausentes. Contexto de git archive del SHA exacto, sin dotenv/secretos/dumps/node_modules; únicamente manifests, package API, Prisma/src/config de compilación y `ops/oci-free-backup/worker.Containerfile` de 8e1501e. Contexto autorizado conservado en `/home/opc/kortek-build-p10ca-8e1501e-20261009`, sin helper persistente ni instalaciones adicionales. Archivo transferido comprobado por SHA256 antes de extraer.

```bash
nice -n 19 ionice -c 2 -n 7 podman build --network host \
  --cpu-period 100000 --cpu-quota 150000 --memory 3g \
  --env APP_RELEASE=8e1501e89a132e1b01d3633b1b3f896a8cbe5800 \
  --label org.opencontainers.image.revision=8e1501e89a132e1b01d3633b1b3f896a8cbe5800 \
  -f ops/oci-free-backup/worker.Containerfile \
  -t localhost/kortek-worker:p10ca-8e1501e-20261009 .
```

Mismo enfoque P5, usando el Containerfile específico del worker sin editarlo. Build único **exit 0**, 02:02:13–02:02:31 UTC (22:02 del 9 de octubre local), capas reutilizadas; pnpm frozen/Prisma generate/Nest build son los pasos del Containerfile. No se reemplazó ningún tag anterior.

| Inspección solo de imagen | Resultado |
| --- | --- |
| ID inmutable | `sha256:bf343354991622b55de47655d749a558c19397ff940badc0831f15774a3da23f` |
| Tag nuevo | `localhost/kortek-worker:p10ca-8e1501e-20261009` |
| Arquitectura / tamaño | arm64 / 1778978246 bytes |
| APP_RELEASE / label revision | `8e1501e89a132e1b01d3633b1b3f896a8cbe5800` / `8e1501e89a132e1b01d3633b1b3f896a8cbe5800` |
| Entorno declarado, solo nombres | APP_RELEASE, NODE_VERSION, PATH, YARN_VERSION |
| Usuario / CMD | node / node dist/notifications/email-worker.cli.js |
| Entrada compilada | presente |
| Schema fuente dentro de imagen | `b8f4dc32085bac898ff9ef40e9794d1d40b61a68b33c4d84946d9ffad4296f30`, igual a git archive |

Se usaron image inspect y image mount/unmount bajo podman unshare para leer la entrada/schema. **No podman run, startup drill, CLI ni conexión DB de la imagen nueva.** Build no valida operación/env/cola ni entrega Resend. No se reconstruyó ni activó API.

## Cambios exactos propuestos para producción, pendientes de B

1. **API** `/usr/local/libexec/kortek-api-run.sh`: añadir los cinco `-e NOMBRE` a los argumentos Podman existentes. Mantener carga por LoadCredential, los dos flags y todo el selector P7/imagen P5/release, CA y límites actuales. `/etc/systemd/system/kortek-api.service` ya carga runtime-env y fija el par aprobado: **no necesita modificación para correo**.
2. **Worker** `/etc/systemd/system/kortek-email-worker.service`: conservar `LoadCredential=database-url:/etc/kortek-worker/database-url`; añadir `LoadCredential=runtime-env:/etc/kortek-api/runtime-env`. Proponer selección explícita inmutable de `sha256:bf343354991622b55de47655d749a558c19397ff940badc0831f15774a3da23f` y release `8e1501e89a132e1b01d3633b1b3f896a8cbe5800` en la unidad mediante KORTEK_WORKER_IMAGE_OVERRIDE y KORTEK_WORKER_RELEASE_OVERRIDE, capturados antes del source y aplicados después; no reutilizar KORTEK_API_IMAGE del archivo, que conserva selección histórica para rollback API. Mantener usuario, supervisión, timeouts y nombres de contenedor.
3. **Worker** `/usr/local/libexec/kortek-worker-run.sh`: capturar/validar selector antes de source; cargar runtime-env con set -a y después sobrescribir DATABASE_URL con la credencial database-url propia. Aplicar release del selector después del source para evitar un release antiguo del API. Sustituir ambos `=false` por `-e NOMBRE` y añadir los cinco nombres; reenviar NODE_ENV/DEPLOY_ENV/APP_RELEASE y conservar CA del worker. Usar ID nuevo y CMD del worker; guardas productivas para impedir entorno/base QA sin publicar valores. No exige añadir nuevos límites para completar este alcance; cualquier endurecimiento adicional debe estar expresamente incluido en B.
4. **Entorno API** `/etc/kortek-api/runtime-env`: B debe autorizar instalación segura de los cinco valores productivos y cambio de ambos flags a true, preservando bytes ajenos, PUBLIC_BOOKING_CLOSED=false y selectores. No hace falta crear `/etc/kortek-worker/runtime-env` ni copiar los secretos a un segundo archivo con la propuesta de credencial compartida. database-url no se modifica. Los secretos se transmiten por stdin protegido, nunca argv/logs. Nada de esto se ejecutó en A.

Versionar primero estas adaptaciones operativas y probar carga/selector/reenvíos de siete nombres con fixtures sintéticos y flags false/true; Bash y systemd-analyze verify. La implementación propuesta aún no existe como plantilla aprobada. B debe concretar esa autorización y los gates antes de instalar, además de decidir prueba controlada real/lecturas de cola/proveedor. No asumir que A la autoriza.

## Plan propuesto de activación y rollback

1. Repetir preflight sanitizado; exigir mismos hashes, IDs/releases, QA intacta, cuatro servicios sanos, recursos, nueva imagen disponible y metadata exacta. Revalidar declaraciones/formato/presencia de correo con hashes; no tratar declaración del propietario como entrega real. Detener por deriva.
2. Respaldar con hashes y permisos root protegidos los **tres archivos a instalar** (wrapper API, unidad worker, wrapper worker) y runtime-env; conservar unidad API para rollback de referencia, database-url y ambas imágenes históricas. Validar candidatos y su correspondencia con plantillas aprobadas. B debe autorizar copias e instalación; A no creó respaldos ni candidatos en VM.
3. Detener primero **solo el worker productivo** para evitar consumo/env dispar durante el cambio. Instalar los tres archivos y editar una vez runtime-env con valores productivos/flags. daemon-reload por cambio de unidad worker. Mantener API P5 y selector P7; no reinstalar unidad API, no tocar QA/Caddy/timers.
4. Reiniciar **API productiva primero**, comprobar arranque/imagen/release/flags y nombres/hash efectivos, rutas públicas/privadas/CORS y endpoint webhook sin divulgar secretos; solo tras pasar, iniciar worker nuevo y comprobar active/running, imagen/release, credencial DB propia, siete valores por hash y heartbeat. El monitor existente puede alertar durante la parada: B debe incluir ventana operativa acotada y responsables.
5. Observar al menos 15 minutos: estados/NRestarts/recursos, códigos seguros de logs y heartbeat. Verificar estados de outbox/pausa EMAIL y una reserva/envío/webhook controlados **solo si B autoriza esas lecturas/escrituras y llamadas**; el flag true no demuestra que EmailChannelControl permita enviar. Verificar consentimiento, evento único, recepción y ausencia de duplicados/PII. Comparar QA/protegidos antes/después y Git main/QA. No ampliar a proveedores/DB por inferencia.
6. Ante fallo: detener worker primero, restaurar runtime-env anterior (correo false) y wrapper API; reiniciar API y validar reserva abierta/P5. Restaurar unidad+wrapper worker originales, daemon-reload e iniciar imagen histórica c1 con ambos flags false; validar heartbeat y QA intacta. No cambiar database-url ni base, no borrar imagen nueva/anterior. Correos ya emitidos no se revierten: si se autorizó prueba real, conciliar su estado y no reenviar POST ante resultado incierto. Rollback de software no equivale a deshacer entregas.

## Preservación, validaciones y entrega

Comparación antes/después exacta verificada: cuatro unidades active/running/NRestarts=0 y MainPID idénticos; archivos/hash/propietarios/modos idénticos; cuatro contenedores mismos ID de imagen/PID/StartedAt/hash de entorno/flags; imágenes worker históricas conservadas. API producción sigue P5/release 8e1501e, reserva abierta y correo false; QA intacta. Disco final **9.253.425.152 bytes**, memoria disponible **9.501.851.648 bytes**. Se escribió en VM únicamente contexto/cache/imagen derivados del build autorizado; sin editar/instalar unidades/wrappers/runtime-env, copiar secretos, reiniciar/recargar ni activar.

SSH estricto con clave/known-hosts existentes, BatchMode y timeout; lector sanitiza antes de devolver. Lecturas SSH, comparación, build, inspección y preservación exit0. Los primeros intentos de red quedaron bloqueados por sandbox (SSH255, git128) antes de acceso; las ejecuciones autorizadas con permisos de red terminaron exit0. La búsqueda con globs no admitidos por rg en Windows se corrigió mediante rutas explícitas; esos fallos de búsqueda no son validación.

Sin consultas DB/HTTP, cambios Resend/Clerk/Vercel/Supabase, instalación de dependencias en host ni QA funcional. P10c-B queda pendiente de orden explícita. Informe, evidencia y enlaces de control son el único alcance documental del commit; diff completo/check/JSON/enlaces y ausencia de secretos revisados antes de staging explícito y push sin force.

Baseline remoto comprobado: main `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`, QA `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`; locales main `01113ef0be7d8abcd74e3e7297f7989b359c76c0`, QA `36061fc3c978758642b5a79ed6cb0e5ff25c003f`. Playbook ajeno no seguido/hash `3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090` preservado. SHA documental, igualdad local/remoto, referencias protegidas y git status se reportan después del único push a ai/reserva-invitado-ci.
