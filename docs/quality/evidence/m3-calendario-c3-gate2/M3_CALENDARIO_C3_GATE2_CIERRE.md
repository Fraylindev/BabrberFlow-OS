# M3 C3 — Gate 2: lectura de QA y producción

**EN REVISIÓN / SIN PUSH.** Gate 1 aceptado por el propietario en 8187600. Solo lectura remota y preparación local de candidata. No se desplegó, reinició, migró, activó, escribió en bases reales ni llamó a proveedores. No se inicia gate 3.

## Workflow completo

```diff
diff --git a/.github/workflows/quality.yml b/.github/workflows/quality.yml
index c9333c0..8e8bfab 100644
--- a/.github/workflows/quality.yml
+++ b/.github/workflows/quality.yml
@@ -54,6 +54,9 @@ jobs:
           node-version: 22
           cache: pnpm

+      - name: Reject excluded OCR images in candidate tree
+        run: node apps/api/test/m3-ocr-publication-gate.cjs HEAD
+
       - name: Install dependencies
         run: pnpm install --frozen-lockfile
```

El único cambio agrega el filtro de las 15 imágenes OCR antes de instalar dependencias. El workflow mantiene push únicamente a ai/antigravity-qa y pull_request hacia main o ai/antigravity-qa; no alcanza cada push a cualquier rama. No cambia producto ni despliegue. Un fallo de Quality no detiene por sí mismo la publicación automática de Vercel: no hay Deployment Checks configurados. El filtro se debe ejecutar también manualmente sobre cualquier candidata fuera de esos triggers.

## Artefactos vivos

Dos lecturas OCI: 2026-10-12T01:02:12.848198+00:00 y 2026-10-12T01:27:17.527929+00:00. PIDs, imágenes, flags y hashes de wrappers/unidades permanecieron iguales. Es una comparación puntual, no una garantía frente a cambios concurrentes externos.

| Servicio | ID de configuración OCI | Digest de manifiesto | Release / procedencia |
| --- | --- | --- | --- |
| qaApi | `8ba1b6c8a45391433998deeae1111d2d96c6cbf84932a7e9972cb6cf90e95eec` | `sha256:ba5e194591f35b5befc793b621b1bcce20df0006be81948ba2e84cd0771ea03c` | `b318ca591d1ca6681269a6d25e29ca106d824df9`; etiqueta `b318ca591d1ca6681269a6d25e29ca106d824df9` |
| qaWorker | `7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1` | `sha256:3a32fc08b6271c9d561583ec56d0d26c3879daceab6d44d116dadc7065c31946` | `None`; etiqueta `None` |
| productionApi | `1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775` | `sha256:fdd923c117f6569d0cf8846a3efaa1c212be48e77d1edbe5ea824345665fed0f` | `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`; etiqueta `8e1501e89a132e1b01d3633b1b3f896a8cbe5800` |
| productionWorker | `bf343354991622b55de47655d749a558c19397ff940badc0831f15774a3da23f` | `sha256:49e45d76f766ad7b8a75bf8e93aef499f8db544a3663e18c032e02710dffe7bb` | `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`; etiqueta `8e1501e89a132e1b01d3633b1b3f896a8cbe5800` |

Los IDs de configuración de ambos API coinciden exactamente con los valores llamados “imagen sha256” en C0. No confundir esos IDs con los digests de manifiesto anteriores. C0 no declara digest del worker. QA worker usa tag 92f61274…, sin label OCI de revisión ni APP_RELEASE: su procedencia completa no está acreditada. Los cinco archivos compilados inspeccionados coinciden entre los cuatro contenedores; esa paridad parcial no acredita todo el build. Producción API/worker declaran 8e1501e. Inventario íntegro y hashes: oci-before.json y oci-after.json.

La web de Vercel no publica una imagen OCI ni su digest: se identifica por deployment inmutable y Git SHA. QA: dpl_4q1Ap9c6XAnsPv8BXM9j87fBWqDJ, SHA202f90199fc21a12e058059ad8fc95dfcf33b4ed (Preview READY). Producción: dpl_A5G1gZA8q2KFrDLg6UFsceL3mmQu, SHA8e1501e89a132e1b01d3633b1b3f896a8cbe5800 (production READY). C0 declara QA web523d993: el alias avanzó a202f901; la comparación de apps/ops/packages entre esos SHAs es vacía. No se atribuye a la web un digest de contenedor inexistente.

## Ledger, flags y worker

Lecturas SQL encerradas en BEGIN READ ONLY / COMMIT; transactionReadOnly=on en ambos proyectos. Cada ledger tiene32 filas:28 aplicaciones efectivas y4 intentos revertidos. Los nombres efectivos concuerdan con las28 migraciones locales. Migration28 customer_stage_one mantiene Booking_customer_revision habilitado (O), propietario kortek_migrator y contador Client.customerBookingRevision presente. No se modifica el ledger ni se ejecuta migrate resolve.

Los checksums distintos son exactamente variantes CRLF: add_invoice_model en ambos entornos y customer_stage_one en QA. La variante LF local y la CRLF histórica constan en checksum-variants.json; no hay discrepancias de bytes sin explicar dentro de esta comparación.

API y worker de ambos entornos: NOTIFICATIONS_EMAIL_ENABLED=true y NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED=true. QA DEPLOY_ENV=staging; producción=production. Servicios active/running. No están definidas EMAIL_WORKER_ENABLED, NOTIFICATIONS_EMAIL_WORKER_ENABLED ni NOTIFICATIONS_EMAIL_DRY_RUN; ausencia no significa false. Las variables sensibles de configuración solo se comprobaron por presencia, sin valores. EMAIL paused=false en ambas bases.

El worker QA está configurado para envío real mediante ResendAdapter, no para consumir únicamente el evento. Historial QA:9 outbox DELIVERED y56 OMITTED; producción:2 DELIVERED y5 OMITTED. Se contaron registros y presencia de providerId, nunca direcciones, payloads ni IDs del proveedor. Estos estados históricos no prueban recepción actual ni entrega de una cita M3; no se creó una cita/evento ni se invocó worker.tick.

## Reversión propuesta, no ejecutada

Hay13 imágenes locales incluyendo bases. Para volver de una futura promoción M3, conservar como primera opción las imágenes actuales b318ca5 del API QA y 7eafd5… del worker QA, y las actuales 8e1501e del API/worker productivos. Deben validarse por ID y digest exactos antes de una ventana autorizada. Imágenes anteriores adicionales disponibles figuran en oci-after.json: QA807bcb… sin tag, staging791569b…,666516f…,33de07a…,b0357af6; API histórico b5615869… y worker c1/166af6…. Disponibilidad no demuestra compatibilidad ni autorización: los anteriores a reserva invitada pueden reintroducir B2C; c1 tiene procedencia insuficiente. No se eligen automáticamente.

Procedimiento bajo autorización propia futura:

1. Fijar pares imagen/release y deployment web actuales; respaldar configuración protegida y comparar hashes sin exportar secretos. Conservar outbox/eventos y DB; no restaurar esquema por defecto.
2. Si falla web, reasignar el alias QA al deployment READY anterior compatible (el actual dpl_4q1… queda como retorno); comprobar origen y aislamiento. No lanzar build/promotion en este gate.
3. Si falla API, detener temporalmente solo worker QA bajo ventana aprobada, restaurar selector y release del API y su wrapper compatible, reiniciar solo API QA y comprobar salud/contrato. Los wrappers productivos tienen pares permitidos fijos: no sustituirlos por plantillas staging ni asumir que aceptan una nueva imagen.
4. Restaurar par y wrapper/unidad del worker QA si cambió, manteniendo su credencial DB propia; validar flags/pausa y comenzar solo con autorización de correo. No reemitir correos ya enviados; conciliar eventos inciertos.
5. Si hubo DDL futuro, aplicar exclusivamente rollback aditivo ya ensayado y autorizado. C1 no introduce DDL: conservar migration28 y su trigger requerido por revisión.
6. Verificar API/web/worker y documentar estado. Producción tiene procedimiento independiente; no se modifica al revertir QA. No se acreditó reversión operativa en este gate.

## Conciliación y rama local

origin/ai/antigravity-qa=202f901; origin/main=8e1501e; ai/reserva-invitado-ci y su remoto=de3a062. ops/oci-api/production/ existe solo en la rama de reserva invitada, árbol25e9a673c4f27d53358b767cebe7043939872ae8, con cinco archivos. Se preserva allí sin modificación. Añadirlo ahora rompería la condición literal de árbol idéntico a8187600 fuera de evidencias. La candidata codex/m3-c3-gate2-readonly tiene un solo commit sobre origin/ai/antigravity-qa y conserva exactamente8187600 fuera de docs/quality/evidence/. No representa todavía una conciliación lista para despliegue; branch-reconciliation.json describe la integración posterior requerida, con aprobación propia.

## Preview e importación compartida

Configuración viva observada por DOM: Root Directory apps/web; Include files outside the root directory Enabled; Skip unaffected deployments Enabled; overrides de build/install desactivados; Next.js; Node24.x. El Preview actual ejecutó turbo run build y web:build fue cache hit. La importación relativa a business-time.presentation.ts es posterior a su fuente202f901: no se afirma una compilación remota observada del candidato. El gate1 obtuvo build local --webpack exit0; no equivale al Preview Turbopack de Vercel.

La opción de archivos externos permite incluir apps/api según [Vercel](https://vercel.com/docs/monorepos/monorepo-faq). Riesgo inferido del código real: web no declara api como dependencia y turbo.json no incluye el módulo compartido en globalDependencies/inputs; un cambio exclusivo de ese archivo puede quedar fuera de la invalidación del caché o del criterio de skip. Primera promoción M3 cambia también web, pero debe verificarse un build del SHA exacto con logs y una segunda prueba de invalidación bajo autorización propia. Este gate no cambia configuración ni código aprobado.

## PATCH legacy: propuesta

Conservar por ahora PATCH /bookings/:id y GET legacy durante la ventana de compatibilidad/reversión. La web C2 usa el comando nuevo y devuelve expectedUpdatedAt/expectedRevision recibidos, sin derivarlos. El PATCH legacy aún permite escritores sin precondición de revisión; no ocultar ese límite ni traducirlo silenciosamente al comando nuevo.

Antes de retirarlo: inventariar consumidores y llamadas por endpoint sin PII, confirmar versiones web/API activas y rollback compatibles, separar actualizaciones de estado de cambios de horario, aprobar contrato de deprecación y luego bloquear/retirar la edición de horario mediante gate backend propio con regresión de roles y carreras. No ampliar BARBER, público ni estado. Nada se modifica en backend en este gate.

## Límites y continuación

El propietario acepta CORS sin Retry-After expuesto y fallback web60s en QA. Correctivo CORS separado; backend C1 preservado. No hay autorización de gate3, QA funcional con proveedor, envío real M3 ni publicación. Quedan pendientes: conciliación productiva en candidata distinta, procedencia completa de worker QA, Preview del SHA exacto e invalidación de importación. El escaneo exacto y SHA local se entregan aparte para evitar que el informe se autorreferencie en su propio hash.
