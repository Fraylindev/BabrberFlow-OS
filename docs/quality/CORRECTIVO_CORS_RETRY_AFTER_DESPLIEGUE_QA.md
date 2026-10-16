# CORS Retry-After — despliegue del API a QA

Fecha de cierre operativo: 2026-10-16, America/Santo_Domingo. **APROBADO POR EL PROPIETARIO / API QA DESPLEGADO / CONTADOR Y RECUPERACIÓN EN AGENDA CONFIRMADOS POR EL PROPIETARIO.** Este cierre acotado no cierra C3/M3 ni acredita entrega de correo o QA autenticada completa.

## 1. Autorización, base y alcance ejecutado

El propietario mantuvo AUTORIZO DESPLIEGUE A QA y autorizó opción A: editar exclusivamente KORTEK_API_IMAGE y APP_RELEASE en la credencial compartida QA, tras comprobar que no controlan ni llegan al contenedor del worker. Posteriormente permitió un único reintento con TMPDIR por proceso dentro del build y exceptuó expresamente SOLO el runroot del mínimo de3GiB. Todas las demás prohibiciones se conservaron.

Checkout aislado: `%USERPROFILE%/.codex/worktrees/m3-cors-retry-after-20261014/Kortek-Booking`. Rama codex/m3-cors-retry-after-20261014. HEAD y `git ls-remote origin refs/heads/ai/antigravity-qa`, al inicio y al final: **32f3b367a12c5f9cabcf805a0cf9989644c05a21**, exit0. Única entrada Git propia: este informe nuevo sin seguimiento.

Aplicados kortek-delivery, AGENTS, DELIVERY_GATES y decisiones/contratos M3. Solo se construyó la imagen API desde Git, se respaldó/editó la credencial QA en las dos claves autorizadas y se reinició kortek-api-staging.service. No se modificó código, dependencias, límites, worker, producción, Prisma, migraciones, otras variables/flags, unidades/wrappers, Vercel ni datos de negocio. Sin commit/push, borrado de imágenes/cachés ni provocación de429.

## 2. Preflight de código y migraciones

`git diff --stat 56e2e12..32f3b36 -- apps/api`, exit0:

```text
apps/api/src/bookings/calendar-budget.guard.spec.ts | 61 +
apps/api/src/common/cors.config.spec.ts              | 120 +
apps/api/src/common/cors.config.ts                   | 23 +
apps/api/src/main.ts                                | 17 +-
4 files changed, 206 insertions(+), 15 deletions(-)
```

Dos archivos ejecutables de CORS y dos pruebas. No cambia el guard ejecutable ni servicios. `git diff --name-status 56e2e12..32f3b36 -- apps/api/prisma`: exit0, vacío. Árbol de migraciones idéntico a5ee5fd512adb894e3eb38d5b55e9efaaa08c2f9. No hay migraciones nuevas entre esos SHAs; no se consultó el ledger ni se ejecutó ninguna migración.

## 3. Condición ajustada del worker QA — PASA

Lectura SSH de unidad efectiva, drop-ins, wrapper y nombres de Config.Env; exit0, revalidada antes del build exitoso. Sin drop-ins ni EnvironmentFile. Environment de systemd solo contiene XDG_RUNTIME_DIR y DBUS_SESSION_BUS_ADDRESS.

Líneas relevantes, valores omitidos:

```text
/etc/systemd/system/kortek-email-worker-staging.service
12 Environment=XDG_RUNTIME_DIR=<omitido>
13 Environment=DBUS_SESSION_BUS_ADDRESS=<omitido>
14 LoadCredential=runtime-env:<credencial compartida QA>
15 ExecStart=<wrapper QA efectivo>

/usr/local/libexec/kortek-worker-staging-run.sh
 6 set -a
 7 source "$credentials_dir/runtime-env"
 8 set +a
21 exec podman run --rm --replace --name <worker QA>
25 -e NODE_ENV -e DEPLOY_ENV -e DATABASE_URL
26 -e NOTIFICATIONS_EMAIL_ENABLED -e NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED
27 -e NOTIFICATIONS_EMAIL_FROM -e NOTIFICATIONS_EMAIL_REPLY_TO
28 -e NOTIFICATIONS_ABUSE_SECRET -e RESEND_API_KEY -e RESEND_WEBHOOK_SECRET
29 -e NODE_OPTIONS=<omitido>
32 "<ID_IMAGEN_FIJO>"
```

- Imagen fija literal, sin referencia a KORTEK_API_IMAGE.
- Ausencia de APP_RELEASE y KORTEK_API_IMAGE en argumentos/expansiones del wrapper. Sin --env-file, --env-host, --env-merge, --env ni eval para reenviarlas.
- Unidad efectiva sin inyección de esas claves por Environment, EnvironmentFile o drop-ins.
- Comprobación por nombres en el contenedor: target_env_names_in_container=[] para ambas claves; nunca se imprimió el resto del entorno.

Al reiniciarse, el shell del wrapper y su hijo Podman seguirán cargando/exportando ambas variables por el source completo. No seleccionan la imagen del worker y no entran al entorno del contenedor: sin efecto funcional en su configuración comprobada. No se reinició ni modificó el worker.

## 4. Diagnóstico y único reintento

El primer intento falló exit125 en COPY apps/api/src al crear /var/tmp/container_images_storage3414231222, con no such file or directory. /var/tmp existe desde el host; la causa exacta no quedó demostrada. El reintento autorizado pasó utilizando un TMPDIR nuevo y vacío dentro del build. No se atribuye retroactivamente una causa definitiva al primer error.

Diagnóstico de solo lectura:

| Ruta | Disponibilidad inicial | Inodos usados / libres | Resultado |
| --- | --- | --- | --- |
| /var/tmp | 7488831488bytes, df7.0G | 619167 / 14628321 | Superior a3GiB |
| /home/opc/.local/share/containers/storage | 7488831488bytes, df7.0G | 619167 / 14628321 | Superior a3GiB |
| /run/user/1000/containers | 1142505472bytes, df1.1G | 156 / 278837 | Excepción explícita del propietario |

El runroot está en tmpfs de capacidad total1142755328bytes, con249856bytes usados en el filesystem; du -sk del runroot104KiB. Inicialmente se detuvo el flujo por el umbral; no consumió el reintento. Tras la excepción, antes del build, graphroot y /var/tmp tenían7487520768bytes libres; runroot1142505472bytes. No se amplió tmpfs ni se cambiaron permisos/configuración del sistema.

Podman rootless bajo opc: graphRoot=/home/opc/.local/share/containers/storage, runRoot=/run/user/1000/containers, imageCopyTmpDir=/var/tmp. Sesión SSH: XDG_RUNTIME_DIR=/run/user/1000; DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus; TMPDIR ausente antes del reintento. XDG/DBUS coinciden con la unidad QA y el helper histórico consultado. No se localizó un wrapper independiente identificado inequívocamente como gate3b; el proceso usa Containerfile y límites de build documentados y el helper histórico de API QA.

Journal de últimos30min consultado en el diagnóstico previo, procesado en memoria:0 coincidencias de systemd-tmpfiles, /var/tmp o errores de almacenamiento. No acredita otros períodos. Regla tmpfiles vigente: q /var/tmp 1777 root root 30d. Última salida observada de systemd-tmpfiles-clean:2026-10-15 04:25:02 GMT, ExecMainStatus=0. Sin cambios ni ejecución del servicio.

## 5. Export limpio, imagen y drill

`git archive --format=tar --output=<temporal> 32f3b367a12c5f9cabcf805a0cf9989644c05a21 -- <rutas explícitas>`: exit0. Contexto mínimo: manifests raíz, package API, prisma, src, tsconfigs, nest-cli, startup drill y api.Containerfile. Sin dotenv/node_modules; enlaces y rutas fuera del contexto rechazados. SHA256 del tar: **05161aeae88ee82602743dc6cd9342993d07a9b855ed69ca0a0912eabf87c28d**, revalidado antes del único reintento junto con el contenido de cada archivo extraído. No se usó el árbol de trabajo.

Directorio remoto: /home/opc/kortek-api-staging/build-cors-retry-after-32f3b367-20261015. TMPDIR por proceso: su subdirectorio tmp-podman, nuevo/vacío, opc, modo0700. Se conservaron tar, logs y cachés; no se podaron imágenes. Variables de sesión para Podman: XDG/DBUS habituales y únicamente TMPDIR temporal autorizado. Nada persistido en configuración.

```bash
podman build --network host --cpu-period 100000 --cpu-quota 150000 \
  --memory 3g \
  --label org.opencontainers.image.revision=32f3b367a12c5f9cabcf805a0cf9989644c05a21 \
  -f ops/oci-api/api.Containerfile \
  -t localhost/kortek-api-staging:32f3b367a12c5f9cabcf805a0cf9989644c05a21 .
```

**Único reintento: exit0.** Luego `podman run --rm --network none <imagen nueva> node ops/production-startup-drill.cjs`: **exit0;23 configuraciones inválidas rechazadas**. Fue un contenedor transitorio aislado, sin credenciales de runtime ni red; no operó producción.

| Identificador | Antes | Después |
| --- | --- | --- |
| Release | 56e2e1278c0dacd679accca4f1bd501e7cf9a1f9 | 32f3b367a12c5f9cabcf805a0cf9989644c05a21 |
| ID de imagen | ec199b2dfb81bec113b96df537089148e497e1acfb5118c935b4d7f4131e40f5 | 4296fb36c1e8de44b53ea63810b0b8988dcb60074b4776f59d4a02af10b57dc8 |
| Digest manifiesto | sha256:39d2264fe7cfc87094217d2047cfb100a988da76bacb4f67ea14edba9fc734d4 | sha256:dfcd609c4ec767e55ef13150bf20dfac23b48059edf2c48891a0bcf8005c4fe6 |

RepoDigests disponibles bajo localhost/kortek-api-staging@<digest correspondiente>. Label org.opencontainers.image.revision de la nueva imagen coincide con el SHA exacto. No confundir ID de configuración con digest de manifiesto.

## 6. Respaldo, cambio exclusivo y reinicio

Antes de editar: cp --preserve=all de la credencial QA a **/etc/kortek-api-staging/runtime-env.pre-cors-retry-after-32f3b367-20261016**. Archivo regular root:root0600; SHA256fd92cf31d71251b6a63c911a5f933802334fe9978396a86b6968cd8670827c62. Verificados bytes idénticos, hash baseline, propietario/modo, lectura, escritura del directorio destino y bash -n exit0. Restaurabilidad comprobada en lectura, sin ejecutar restauración. Comando de rollback registrado en este informe antes de editar.

Edición manteniendo propietario, modo y bytes de todas las demás líneas. Cada clave estaba presente una sola vez. Comparación de líneas y nombres de claves modificadas: **[APP_RELEASE, KORTEK_API_IMAGE]**, ninguna otra. Imagen seleccionada por ID inmutable y APP_RELEASE por el SHA completo aprobado. Sintaxis bash -n exit0 después de editar. Entorno del contenedor API comparado en memoria antes/después: solo cambia APP_RELEASE; KORTEK_API_IMAGE no se reenvía al contenedor.

Único servicio reiniciado: `sudo systemctl restart kortek-api-staging.service`, exit0.

## 7. Health operativo, CORS y smoke — PASAN

Comprobación desde la VM y repetición externa desde el cliente con TLS/certificados validados por defecto, sin --insecure ni overrides DNS. No hay un endpoint dedicado de health en el contrato inspeccionado: se acreditan proceso/servicio, arranque, listener HTTP esperado y guard de ruta privada, sin presentarlo como diagnóstico profundo de base de datos.

API QA final: contenedor ec9d334f6aca59cc4e6e35608f9dd0233e8a53c65e04f91f052a8f05027491c8; PID2630459, MainPID2630435; active/running, **NRestarts=0**, DEPLOY_ENV=staging, release exacta32f3b367a12c5f9cabcf805a0cf9989644c05a21 e imagen/digest nuevos correctos. Revalidación final posterior: mismo contenedor, imagen, estado y cero reinicios automáticos.

| Verificación | Resultado |
| --- | --- |
| HTTP local 127.0.0.1:3001 raíz | 404 esperado; listener operativo |
| HTTPS API OPTIONS /, Origin QA y Access-Control-Request-Method GET | 204; Allow-Origin exacto QA; credentials=true; seis headers expuestos |
| HTTPS API GET /, Origin QA | 404 esperado; misma política CORS |
| HTTPS API GET / y OPTIONS /, origen ajeno | 404 y204; sin Access-Control-Allow-Origin |
| HTTPS API GET /bookings sin sesión | 401 esperado |
| HTTPS web QA GET / | 200 desde VM y cliente externo |
| HTTPS web QA GET /login | 200 desde VM y cliente externo |

Origin permitido: https://qa.booking.kortek.cloud. Access-Control-Expose-Headers observado y comparado como conjunto exacto:

```text
X-Total-Count,X-Page,X-Limit,X-Total-Pages,X-Request-Id,Retry-After
```

No se expuso otro header ni se amplió CORS. El origen ajeno puede recibir la lista de headers expuestos, pero carece de Allow-Origin y no obtiene permiso CORS. No se provocó429: comprobar que se expone el header no demuestra todavía la respuesta429 ni el comportamiento iPhone de extremo a extremo.

## 8. Preservación de worker y producción

Baseline y comparación posterior/final de IDs, imágenes, PID, Config y HostConfig: iguales en los tres contenedores protegidos; todos running. Sin reinicios ni cambios.

| Contenedor protegido | PID antes = después | ID de imagen antes = después |
| --- | --- | --- |
| Worker QA | 1084581 | 7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1 |
| API producción | 1800788 | 1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775 |
| Worker producción | 1801019 | bf343354991622b55de47655d749a558c19397ff940badc0831f15774a3da23f |

Hashes SHA256 de archivos; root:root y modos preservados. Solo cambió la credencial QA:

| Archivo | Antes | Después | Modo |
| --- | --- | --- | --- |
| /etc/kortek-api-staging/runtime-env | fd92cf31d71251b6a63c911a5f933802334fe9978396a86b6968cd8670827c62 | a41d32780a0ab963d7246ba064e6492933ce6a189d83505ef0cce3ceb41dd1e6 | 0600 |
| /etc/kortek-api/runtime-env | d85fd3e351eca992db1e242a106c3fb3c6e0db90cac95084c1b7402e98a8839d | Idéntico | 0600 |
| /usr/local/libexec/kortek-api-staging-run.sh | 118d2c83c4b800f9e63d72c365d486f47b6f4aaf491ec8221be84305ff27cbf8 | Idéntico | 0755 |
| /usr/local/libexec/kortek-api-run.sh | 0a28312626216cdee50901541e374cca07b8da2e505d40a4b6954dae1cae5944 | Idéntico | 0755 |
| /etc/systemd/system/kortek-api-staging.service | 91ce7997af89f16927acae71c6030c60765ab16c43022cfb64e0b143ac6c3a90 | Idéntico | 0644 |
| /etc/systemd/system/kortek-api.service | 333f948911c06cfcbac45efc98a204894ab4d75aaaca56cb0b05b8f6bb3fa94f | Idéntico | 0644 |
| /usr/local/libexec/kortek-worker-staging-run.sh | 919d73ca08e6485f34a456d88a01e2406537c2c34ac7722e3564f84c06f99ad6 | Idéntico | 0755 |
| /etc/systemd/system/kortek-email-worker-staging.service | a06049b34039fa7cc8afac0186501543250d44aaf282c07fbeb9b7e5d05bb70f | Idéntico | 0644 |
| /usr/local/libexec/kortek-worker-run.sh | 280ff5a101abee4bdd692735a3a97fecb041b8a6a0972ac02f04808431d91c84 | Idéntico | 0755 |
| /etc/systemd/system/kortek-email-worker.service | e23c8c2a01ddf75373bf8427ee6fb172863f87daf05dce9d268911c5072993a0 | Idéntico | 0644 |

Config/HostConfig protegidos: SHA256 de json.dumps(objeto, sort_keys=True), solo hashes emitidos, nunca configuración/entornos completos:

| Contenedor | Config antes = después | HostConfig antes = después |
| --- | --- | --- |
| Worker QA | 2b3bd86757d49d5596d5814476816eb909f628521c1ba3b1af47a11b8003a0e6 | aee1ec8864ee9ccbbe8ff9a3af7c5166947ff49f9b60349cde7285ff601b9d23 |
| API producción | aa052e8ce1e90ea854cb35822cd70ea49b78fa5c07e0309f66f15c0f0080316d | c7ed3892e30bc3186a1f7b61983017d5a8c884d8014580f66eff98c68191167d |
| Worker producción | 3f56c3f95b1ab7fa6c9a04710420195f99e2e6e5508119a62a7a4c6439deaf31 | 9fa76db8f06658f331a0f62bebbc723c6ec9ee72ef1c6f3234bd3f836601faaa |

## 9. Rollback exacto y retenido

Registrado antes de editar, respaldo verificado en lectura antes y después del despliegue:

```bash
sudo cp --preserve=all -- /etc/kortek-api-staging/runtime-env.pre-cors-retry-after-32f3b367-20261016 /etc/kortek-api-staging/runtime-env && sudo systemctl restart kortek-api-staging.service
```

Restaura los selectores anteriores, root:root0600, y arranca únicamente el API QA con IDec199b2dfb81bec113b96df537089148e497e1acfb5118c935b4d7f4131e40f5, digestsha256:39d2264fe7cfc87094217d2047cfb100a988da76bacb4f67ea14edba9fc734d4 y release56e2e1278c0dacd679accca4f1bd501e7cf9a1f9. La imagen sigue disponible: inspeccionada después del cambio y en el cierre final.

El procedimiento de cambio incorporó restauración/reinicio exclusivo ante cualquier fallo de verificación. Todas las verificaciones pasaron; **no se ejecutó rollback real** ni se reinició por probarlo. La prueba fue de lectura/restaurabilidad, no un ensayo funcional de reversión. Tras usarlo habría que verificar release/imagen anteriores, active/running, NRestarts, HTTP raíz404 esperado y ruta privada401, conservando PID y hashes protegidos.

## 10. Evidencia, límites y riesgos

Comandos de Git, diagnósticos, build, drill, respaldo y verificaciones terminaron exit0, salvo el primer build exit125, la parada deliberada del diagnóstico exit1 y check-ignore exit1 documentados. Estos fallos no se cuentan como validaciones exitosas.

Artefactos remotos del gate, sin secretos, en el directorio del build: api-context.tar, build.log del primer intento, build-retry.log, startup-drill.log, baseline-20261016.json, image-result.json, backup-result.json y deployment-result.json (status VERIFIED). El respaldo con secretos queda exclusivamente en /etc/kortek-api-staging con0600; nunca se copió al repositorio. No se imprimieron valores de credenciales ni PII. El build mínimo no recibió la credencial de runtime.

El agente no ejecutó429 real ni prueba iPhone. El propietario confirma prueba QA con contador y recuperación en Agenda; no aportó números, tiempos medidos, respuesta HTTP ni captura y no se amplía esa declaración. No se verificaron por el agente login funcional u operaciones autenticadas de calendario/reprogramación, negocio/DB por consultas, ledger, entrega de correo/proveedor/worker o rollback ejecutado. El smoke HTTP no constituye QA visual/funcional completa. No se reejecutaron suites de producto porque no cambió código; este gate sí ejecutó el build de imagen y el drill solicitados.

Riesgos remanentes: credencial compartida continúa existiendo con la independencia funcional comprobada del worker; fallo temporal inicial sin causa exacta demostrada; archivo oci.env ajeno sin ignore; sondeo previo de15s ante errores transitorios, incluido429, pendiente de correctivo propio. No se hicieron reparaciones fuera de alcance.

## 11. oci.env del worktree M3 — comprobación solo Git

Revalidado al cierre, sin leer contenido:

```text
git -C <M3> check-ignore -v -- ops/oci-api/oci.env
exit1, sin coincidencias: NO cubierto por las reglas de ignore actuales.
git -C <M3> ls-files -- ops/oci-api/oci.env
exit0, 0 rutas: no versionado.
git -C <M3> log --all --format=%H -- ops/oci-api/oci.env
exit0, 0 commits: ausente del historial alcanzable por refs locales.
```

No se puede afirmar «nunca se commiteó» fuera del historial consultado; no se auditaron objetos inaccesibles ni clones ajenos. No se modificó ese archivo, .gitignore o el worktree M3. El hallazgo se conserva para su propietario, sin incluirlo en publicación ni ampliar el gate.

## 12. Aprobación del propietario, observación y pendientes productivos

El 2026-10-16 el propietario aprueba el correctivo CORS-RETRY-AFTER y el despliegue del API QA32f3b36. Declara probado en QA el contador y la recuperación en Agenda. La declaración cierra esa comprobación manual dentro de este alcance; no se presenta como una prueba ejecutada por el agente ni como validación de todas las rutas, roles, navegador, valores del header o tiempos exactos.

La auditoría estática del mismo SHA identificó la reconsulta automática cada15s ante errores transitorios, incluido429: comportamiento previo al correctivo, conservado y observado para un correctivo aparte. Referencias: apps/web/lib/query-client.ts:21, apps/web/lib/query-recovery.ts:4 y apps/web/components/calendar/CalendarScreen.tsx:98. retry:false de Agenda no desactiva el intervalo global heredado. No se modifica ni se declara resuelto ese sondeo en este cierre.

CalendarBudgetGuard conserva read60 por60000ms y bloqueo60000ms por actor/tenant, compartido calendario/detalle; desde bucket vacío, la petición61 provoca429. Availability30/min y write10/min intactos. El agente no provocó429 ni reintentó escrituras.

Antes de producción siguen pendientes:

- Separar credenciales de API y worker; la independencia funcional comprobada no elimina la credencial compartida.
- Acreditar la procedencia completa de la imagen del worker QA; su ID fijo no demuestra todo el código de origen.
- Resolver PATCH legacy.
- Resolver la reasignación de profesional/servicio en Reservas.
- Proteger ops/oci-api/oci.env del worktree M3 con .gitignore; el archivo continúa fuera de seguimiento y del historial alcanzable consultado, pero sin regla de ignore.

No se atienden estos pendientes ni se autoriza producción o cierre C3/M3 completo. La publicación documental autorizada comprende únicamente este informe, PROJECT_MASTER.md y CHANGELOG.md.

## 13. Checkpoint del despliegue antes de la publicación documental

`git diff --check`: exit0. Al terminar el despliegue este informe permanecía sin seguimiento; ese estado histórico no anticipa el commit/push documental autorizado posteriormente. Revisión directa de privacidad/whitespace antes de publicar.

- Aislado: codex/m3-cors-retry-after-20261014, HEAD32f3b367a12c5f9cabcf805a0cf9989644c05a21; única entrada `?? docs/quality/CORRECTIVO_CORS_RETRY_AFTER_DESPLIEGUE_QA.md`.
- Principal: ai/reserva-invitado-ci, HEADde3a062aba70157da5fbf1b569a73aecb0d04087; solo Playbook ajeno sin seguimiento, preservado.
- M3: ai/antigravity-qa, HEAD2896d249942c13a11eb161ff481ba54f8f69eae0; seis modificados (.gitattributes, CHANGELOG.md, PROJECT_MASTER.md, docs/README.md, ops/oci-free-backup/README.md, ops/oci-free-backup/restore-drill.sh) y tres sin seguimiento (docs/quality/RESTORE_SEMANAL_CORRECTIVO_LOCAL.md, ops/oci-api/oci.env, ops/oci-free-backup/test-restore-drill.py). Mismo inventario ajeno antes/después; sin escrituras de este gate.

## 14. Publicación documental autorizada — 2026-10-16

El propietario autoriza un único commit de este informe, PROJECT_MASTER.md y CHANGELOG.md, con push fast-forward desde codex/m3-cors-retry-after-20261014 a ai/antigravity-qa. Sin tocar main ni los otros checkouts, y sin nuevas operaciones de API, worker, VM o producción. Antes del commit se revisan privacidad, diff completo y staging por rutas explícitas. Quality, SHA remoto y posible despliegue web se verificarán tras el push; este documento no anticipa su resultado.
