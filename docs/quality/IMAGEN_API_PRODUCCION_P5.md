# P5 — Imagen API construida, sin activación

Fecha: 2026-10-09. Estado: **GO técnico para P5 / IMPLEMENTADO EN REVISIÓN**. La imagen se construyó e inspeccionó correctamente. **NO-GO para inferir activación**: P5 no acredita arranque, conexión runtime, smoke funcional ni aprobación de una etapa posterior.

Base documental: `ai/reserva-invitado-ci` en `92716cfff6752e23611f4c872136f8c142dcced3`. Código construido: `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`, confirmado en `origin/main` por `git ls-remote`. La autorización comprende lecturas sanitizadas, una imagen nueva y esta entrega documental; no comprende activación, reinicios, cambios de credenciales/flags ni escrituras en DB.

## Recursos y procedimiento

Preflight capturado por SSH el 2026-10-09 a las 06:05:15 UTC: disco disponible **11.067.006.976 bytes**, memoria disponible **9.633.038.336 bytes**. Supera los umbrales de 6 GB y 1 GB, también interpretados como GiB. Después del build: disco **9.375.330.304 bytes**, memoria **9.540.538.368 bytes**. Una lectura durante la construcción observó 8.380.383.232 y 8.817.242.112 bytes respectivamente; el proceso de build y sus procesos Node tenían nice 19.

Se utilizó el procedimiento de [ops/oci-api/README.md](../../ops/oci-api/README.md) y su [api.Containerfile](../../ops/oci-api/api.Containerfile), sin modificarlo. Delegación rootless ya existente: cpu, cpuset, memory y pids. Podman 5.8.2 confirmó soporte para `--env` y `--label`; nice e ionice estaban disponibles. No se instaló ni reinició infraestructura.

Contexto mínimo de 268 archivos obtenido con `git archive` del SHA exacto: manifests raíz, package API, Prisma, src, tsconfig, nest-cli, startup drill y Containerfile. Sin dotenv, secretos, dumps ni node_modules. SHA256 del archivo transferido y observado en VM: `6b28065dc61bf50e3e7e15064462c489f7a6e6b8d8148a086583fabee04002d4`.

Comando ejecutado bajo `opc`, desde el contexto nuevo:

```bash
nice -n 19 ionice -c 2 -n 7 podman build --network host \
  --cpu-period 100000 --cpu-quota 150000 --memory 3g \
  --env APP_RELEASE=8e1501e89a132e1b01d3633b1b3f896a8cbe5800 \
  --label org.opencontainers.image.revision=8e1501e89a132e1b01d3633b1b3f896a8cbe5800 \
  -f ops/oci-api/api.Containerfile \
  -t localhost/kortek-api:p5-8e1501e-20261009 .
```

La etiqueta no existía antes. Build único, **exit 0**, de 06:05:51 a 06:08:20 UTC (149 segundos). Instalación congelada con pnpm 11.18.0, `prisma generate` 6.19.3 y `nest build` completados. El registro contiene una advertencia de descarga npm de 11 segundos, sin fallo del build. No se ejecutó el startup drill ni el CMD de la imagen nueva.

## Inspección de imagen y Prisma

| Evidencia | Resultado |
| --- | --- |
| ID inmutable | `sha256:1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775` |
| Etiqueta nueva | `localhost/kortek-api:p5-8e1501e-20261009` |
| Arquitectura / tamaño | arm64 / 1.778.986.963 bytes |
| `APP_RELEASE` y label `org.opencontainers.image.revision` | Ambos identifican `8e1501e89a132e1b01d3633b1b3f896a8cbe5800` |
| Usuario / CMD declarados | node / node dist/main.js; dist/main.js presente |
| Prisma y @prisma/client | Ambos 6.19.3 |
| SHA256 schema fuente del commit y copia en imagen | `b8f4dc32085bac898ff9ef40e9794d1d40b61a68b33c4d84946d9ffad4296f30` |
| SHA256 schema del cliente generado | `fd8829521909c300e08b6cac110268b4f220f4b891c8aef09087541dd90b50df` |
| SHA256 tokens normalizados, fuente = generado | `aef0873e48088b42d3d1ef6bd39aa5026dd8e88ddcad2f5d260533ee0a9522f2` |

El hash byte a byte del schema generado difiere porque Prisma aplica formato y reordena tres atributos compuestos `@@unique` respecto a otros atributos de bloque. La comparación conserva nombres, campos, tipos, literales y argumentos; ignora comentarios, espacios y orden de atributos `@@` dentro de cada bloque. El resultado coincide. Además, el `inlineSchema` de index.js del cliente generado coincide byte a byte con su schema.prisma. SHA256 de index.js: `12f12774ba7d5a4a47f5ffcd53461cee55ea5f6cb782385b5da4df6ea40afce5`.

Solo se usaron `podman image inspect`, lectura del filesystem mediante `podman unshare`/image mount y posterior unmount. No se arrancó la imagen nueva ni se conectó a ninguna DB. Sus únicos nombres de entorno son `APP_RELEASE`, `NODE_VERSION`, `PATH`, `YARN_VERSION`; no incorpora credenciales de aplicación.

## Diff de variables — solo nombres

Fuentes: validación productiva, Clerk, telemetría, media, reserva pública y notificaciones del commit construido; `.env.example` raíz y API; wrappers y documentación de operaciones. Comparación contra nombres de `/etc/kortek-api/runtime-env` y del contenedor worker productivo. Este inventario no valida valores, formatos, presencia no vacía ni suficiencia de una futura configuración de arranque.

| Grupo | Nombres / resultado |
| --- | --- |
| API obligatorios presentes | `NODE_ENV`, `DEPLOY_ENV`, `DATABASE_URL`, `APP_RELEASE`, `HOST`, `PORT`, `JWT_SECRET`, `RATE_LIMIT_SECRET`, `WEB_PUBLIC_ORIGIN`, `API_PUBLIC_ORIGIN`, `CORS_ALLOWED_ORIGINS`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_AUTHORIZED_PARTIES`, `CLERK_INVITATION_REDIRECT_URL`, `PUBLIC_BOOKING_CLOSED`, `REQUIRE_INTERNAL_MFA`, `NOTIFICATIONS_EMAIL_ENABLED`, `NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| API faltantes obligatorios | Ninguno |
| API faltantes condicionales para solicitar correo activo | `NOTIFICATIONS_EMAIL_FROM`, `NOTIFICATIONS_EMAIL_REPLY_TO`, `NOTIFICATIONS_ABUSE_SECRET`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` |
| API opcionales ausentes | `CLERK_JWT_AUDIENCE`, `WHATSAPP_BASE_URL` |
| Extra respecto al código API, consumido por operaciones | `KORTEK_API_IMAGE`; no es un sobrante sin uso |
| Entorno añadido por el wrapper API | `NODE_OPTIONS`; presente en el contenedor, no en la credencial |
| Solo ejemplo de PostgreSQL local, ausente en runtime productivo | `POSTGRES_PASSWORD`; no es requisito de API/worker productivos |
| Worker obligatorios presentes | `DATABASE_URL`, `NOTIFICATIONS_EMAIL_ENABLED` |
| Worker control de canal presente | `NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED` |
| Worker faltantes obligatorios | Ninguno |
| Worker faltantes condicionales de correo | `NOTIFICATIONS_EMAIL_FROM`, `NOTIFICATIONS_EMAIL_REPLY_TO`, `NOTIFICATIONS_ABUSE_SECRET`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` |
| Variables técnicas del contenedor | `HOME`, `HOSTNAME`, `NODE_VERSION`, `PATH`, `YARN_VERSION`, `container`; no son sobrantes de aplicación |
| Cambios de significado entre b5615869 y 8e1501e | Ninguno identificado en validación/config API, Clerk, telemetría, proveedor de correo y wrappers productivos comparados |

Las cinco variables condicionales no son exigidas por el código cuando el canal no se solicita activo. El wrapper API productivo versionado tampoco las reenvía: cualquier futura activación de correo requiere revisar esa entrega por separado. No se modificó ese wrapper. Las variables web de la sección D8 de ops no son requisitos del API/worker y quedan fuera de este inventario. `CREDENTIALS_DIRECTORY`, `XDG_RUNTIME_DIR` y `DBUS_SESSION_BUS_ADDRESS` pertenecen al lanzamiento systemd/Podman, no a la configuración de aplicación inventariada.

## Worker y preservación

El worker productivo utiliza **imagen distinta** del API: `sha256:166af6ac2586ca622b06a69b17ad30af9da1802e64ed285bcfce25f578a5007f`. Unidad activa: `kortek-email-worker.service`, archivo `/etc/systemd/system/kortek-email-worker.service`, usuario opc, ExecStart `/usr/local/libexec/kortek-worker-run.sh`. Su contenedor no declara APP_RELEASE; P5 no atribuye un SHA Git al worker desplegado a partir de ese dato ausente.

`git diff b5615869 8e1501e -- apps/api/src/notifications` muestra un único archivo: notification-producer.ts, dos líneas añadidas (import y llamada a `lockOrganizationSchedule(tx, organizationId)` antes del bloqueo del cliente). No cambia el código de email-worker, su CLI, política ni ResendAdapter. Los Containerfiles y wrappers productivos comparados no cambian. La imagen API nueva tampoco reemplaza la imagen del worker.

Comparación antes/después: iguales imágenes, PID, StartedAt, nombres/hash del entorno de los cuatro contenedores; iguales hashes de credenciales API producción/QA; iguales unidades, MainPID, estado active/running y delegación rootless.

| Servicio | Imagen preservada | PID del contenedor |
| --- | --- | --- |
| API producción | `8caacd8548a61d94807c0b865229a731df594f63f609ca9ab57df99283dceca2` | 151158 |
| API QA | `8ba1b6c8a45391433998deeae1111d2d96c6cbf84932a7e9972cb6cf90e95eec` | 1523029 |
| Worker producción | `166af6ac2586ca622b06a69b17ad30af9da1802e64ed285bcfce25f578a5007f` | 6654 |
| Worker QA | `7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1` | 1084581 |

Ambas imágenes API anteriores siguen presentes. Sin reinicios, activación, cambios de flags/runtime-env, rotación/borrado de imágenes ni consultas/escrituras DB por esta tarea. El contexto nuevo se conserva en `/home/opc/kortek-build-p5-8e1501e-20261009`; temporales locales ignorados en `.tmp/p5` conservan scripts, manifest y registro completo.

## Evidencia y entrega Git

Evidencia sanitizada versionada: [build](evidence/prod-p5/build-result.json), [imagen/Prisma](evidence/prod-p5/image-inspection.json), [nombres de variables](evidence/prod-p5/variable-names.json), [preservación antes/después](evidence/prod-p5/preservation.json). Las comprobaciones locales de correspondencia de release, archivo transferido, schema, cliente generado y preservación terminaron con exit 0.

Alcance del único commit: este informe y los cuatro JSON documentales. Staging por rutas explícitas, revisión del diff completo y `git diff --cached --check`; push exclusivamente a `ai/reserva-invitado-ci`, sin force. SHA definitivo y comparación local/remoto se reportan tras publicar, evitando autorreferencia del commit en su propio contenido.

`main` remoto permanece en `8e1501e89a132e1b01d3633b1b3f896a8cbe5800` (merge del propietario registrado en P2); QA remoto permanece en `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`. Las ramas locales main y QA tampoco se movieron. El Playbook ajeno no seguido se conserva sin cambios ni staging; SHA256 `3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090`.
