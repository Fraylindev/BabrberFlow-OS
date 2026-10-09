# P9 — Pareja nueva en producción, reserva cerrada

Fecha: 2026-10-09. **NO-GO frente a los criterios escritos de P9. Verificación completada; sin apertura ni correcciones operativas.** La pareja web/API nueva coincide y sus comprobaciones técnicas pasan, pero el estado de negocio no coincide con el censo exigido ni con P3/P4: hay 1 reserva, 1 cliente, 3 usuarios, 3 organizaciones y 1 horario confirmado. Estos datos ya estaban presentes en la lectura anterior a los GET de P9; no se atribuye su origen o autoría. No se limpió ni modificó negocio, horarios o ledger.

## Alcance y base

Se aplicó kortek-delivery y las reglas neutrales del repositorio. La orden autoriza lecturas, informe y un único commit documental/push a ai/reserva-invitado-ci. Base corregida expresamente por el propietario: `a18098649383cb97ae562b9422651c5e8aceb1f1`. La referencia inicialmente escrita a181809 no se resolvió tras git fetch; no se creó ni sustituyó una rama para simularla.

El propietario autorizó adicionalmente las escrituras técnicas inherentes a las **dos consultas booking-data**, y aclaró el presupuesto: hasta 8 peticiones de verificación, más los recursos JS/CSS del navegador. Esa excepción se aplica solo al limitador SecurityRateBucket (INSERT/UPDATE y posible limpieza de vencidos), sin escrituras de negocio. También autorizó el acceso de sesión al proveedor OCI para leer las alarmas; el propietario abrió la sesión y el agente navegó a Alarm Status. No hubo login de usuario de Kortek/Clerk, creación de reservas, cambios de horarios, builds, despliegues, flags, promociones ni modificaciones en proveedores.

## 1. Vercel y promoción del propietario

| Elemento | Evidencia actual |
| --- | --- |
| booking.kortek.cloud | dpl_A5G1gZA8q2KFrDLg6UFsceL3mmQu |
| kortek-booking.vercel.app | dpl_A5G1gZA8q2KFrDLg6UFsceL3mmQu |
| Deployment nuevo | READY, target production, SHA 8e1501e89a132e1b01d3633b1b3f896a8cbe5800 |
| Deployment anterior conservado | dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm, READY, fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6 |
| Alias qa.booking.kortek.cloud | dpl_3WyqcfwaKgpsnQzLaMmgifuB3mHg, sin cambio |
| Autoasignación | Settings → Environments → Production: checkbox Auto-Assign Custom Production Domains desmarcado, Save deshabilitado; ninguna interacción de escritura |

Hora de asignación usada como evidencia de la promoción, según updatedAt de los aliases leído en Vercel: booking **2026-10-09 13:44:06.030 Santo Domingo (UTC−04:00) / 17:44:06.030 UTC**; dominio vercel.app **13:44:06.031 / 17:44:06.031 UTC**, 1 ms después. Se utiliza esta evidencia de asignación solicitada por el propietario; no se confunde con createdAt/ready del build anterior ni se inventa un evento interno Promote. [Vercel](evidence/prod-p9/vercel.json), [horas de asignación](evidence/prod-p9/promotion.json), [lectura de Settings](evidence/prod-p9/browser.json).

Logs de runtime consultados desde **17:44:06.030 UTC hasta la consulta final 18:22:51 UTC**, sustituyendo la ventana inicial de 15 minutos por la ampliación expresa del propietario. El conector get_runtime_errors no encontró errores; get_runtime_logs, deployment nuevo/environment production/group_by level, devolvió tabla de grupos vacía (sin afirmar que no existió tráfico HTTP). Para comprobar estados HTTP, Chrome Logs/Last hour mostró únicamente **200:84 y 304:1**, sin otros estados, con Warning/Error/Fatal=0. Esta ventana y todos los entornos son un superset del intervalo productivo desde la promoción: no se observaron 5xx dentro de esa cobertura más amplia. No se interpreta una tabla de console.log vacía como ausencia de solicitudes. [Consulta y cobertura](evidence/prod-p9/logs.json).

## 2. Pareja exacta

Web `dpl_A5G1gZA8q2KFrDLg6UFsceL3mmQu` con SHA **8e1501e89a132e1b01d3633b1b3f896a8cbe5800**, y API con **APP_RELEASE idéntico** en imagen P5 **sha256:1ad03d2e040cbe7c38faef2afca15ad0b6d11481f5258e425aed541ef57fe775**. El commit documental no se presenta como código de la aplicación. [Vercel](evidence/prod-p9/vercel.json), [SSH sanitizado](evidence/prod-p9/ssh.json).

## 3. Preflight SSH y aislamiento

Lectura final 18:19:38 UTC, exit 0: producción active/running, NRestarts=0; PID contenedor 1735374, StartedAt 17:12:04.999949373 UTC, igual al P7. PUBLIC_BOOKING_CLOSED=true, NOTIFICATIONS_EMAIL_ENABLED=false. SHA256 runtime-env **42ce91a14849c9746109e2864c4500976bb98d2d2e1a3e7713f4485a3aaff23a**, intacto; hash del entorno del contenedor edd37b5f… también igual a P7.

API QA conserva imagen 8ba1b6c8a45391433998deeae1111d2d96c6cbf84932a7e9972cb6cf90e95eec, release b318ca591d1ca6681269a6d25e29ca106d824df9, PID 1523029, StartedAt 2026-10-08T04:47:16.500690063Z, NRestarts=0, runtime-env d6a94be929feb44056e3c64020127f6543de3d356fdac09e275c0362c64a57f6 y hash de entorno 8dc966eb… iguales a la [captura P7](evidence/prod-p7/ssh-after.json). No se reinició ni cambió QA.

Podman logs y journal de los últimos 15 minutos se procesaron en memoria sin imprimir logs crudos ni valores de credenciales. Cero coincidencias de errores Prisma, conexión, arranque y HTTP 5xx para producción y QA. Esto registra la ventana leída y los patrones del lector, sin atribuir cobertura histórica completa del servicio. [Datos sanitizados](evidence/prod-p9/ssh.json).

## 4. HTTP anónimo, seguridad y cierre

Cuatro GET HTML, sin JavaScript ni seguimiento de redirects; dos navegaciones para renderizar los slugs y sus dos consultas API: **8 peticiones de verificación en total**, más recursos automáticos expresamente excluidos del presupuesto. Sin POST, credenciales, sesión de aplicación, retries ni carga. Las dos pestañas de slugs se cerraron tras leerlas para evitar reconsulta por focus.

| URL web | HTTP HTML | Resultado |
| --- | --- | --- |
| / | 200 | HTML de raíz |
| /login | 200 | HTML de login; no inicio de sesión |
| /dental-ross | 200 | Inicialmente carga; tras JavaScript: «Esta página no está disponible» |
| /p9-ruta-inexistente-20261009 | 200 | Mismo encabezado y texto visible que el negocio cerrado |

La API registra exactamente dos eventos GET `/public/:slug/booking-data` con **404 / NotFoundException**, a las 18:18:10.486 y 18:19:12.665 UTC. El router de telemetría conserva la plantilla, no el slug/PII. La reserva cerrada responde 404, y el cliente muestra el mismo estado neutro para negocio cerrado e inexistente, **comportamiento esperado e indistinguible por diseño**. Un slug desconocido coincide con la ruta dinámica: el documento web es 200; no se inventa un 404 del documento cuando lo devuelve el API. [HTTP](evidence/prod-p9/http.json), [contenido visible](evidence/prod-p9/browser.json), [eventos API](evidence/prod-p9/ssh.json).

Una consulta adicional de existencia con el migrador READ ONLY, psql exit 0, confirma que dental-ross existe y que p9-ruta-inexistente-20261009 no existe. Solo se capturaron ambos booleanos: la comparación visible comprende un negocio real cerrado y un slug inexistente, sin nuevas peticiones HTTP.

Las cuatro respuestas tienen **Strict-Transport-Security: max-age=63072000**. CSP, CSP-Report-Only, X-Frame-Options, X-Content-Type-Options y Referrer-Policy no están presentes en estas respuestas. No se declara protección equivalente de framing sin evidencia ni se añade configuración fuera del alcance.

Se examinó el HTML en memoria: cero patrones sk_live/sk_test, URLs PostgreSQL, asignaciones de JWT_SECRET/RATE_LIMIT_SECRET/DATABASE_URL/CLERK_SECRET_KEY o claves privadas. Solo se guardan hash, tamaño y resultados, no HTML bruto ni valores. **Hay clave pública de Clerk en el HTML**, esperada para el cliente y no secreta. Por tanto no se cumple literalmente «ningún valor de entorno en HTML» si incluye esa configuración pública; no se oculta esa presencia ni se afirma ausencia exhaustiva de cualquier valor privado arbitrario solo a partir de patrones. [Alcance del escaneo](evidence/prod-p9/http.json).

## 5. Base READ ONLY — discrepancia bloqueante

Dos lecturas de censo como current_user=session_user=kortek_migrator, transaction_read_only=on, psql exit 0. Los resultados de negocio y horarios son iguales antes y después de las dos consultas técnicas. No se expusieron nombres, usuarios, correos, teléfonos, detalles de reservas ni horarios concretos.

| Criterio | Exigido / P3+P4 | Observado P9 |
| --- | --- | --- |
| Ledger total/activas/revertidas/en curso | 32/28/4/0 | 32/28/4/0 |
| Tablas public | 37 | 37 |
| Reservas / clientes / usuarios | 0 / 0 / 2 | **1 / 1 / 3** |
| Organizaciones | 2 | **3** |
| BusinessSchedule / CONFIRMED / zoneConfirmed | 2 / 0 / 0 | **3 / 1 / 1** |
| Días / ventanas / cierres / revisiones | 0 / 0 / 0 / 0 | **7 / 7 / 0 / 3** |

Los estados actuales son CONFIRMED y dos LEGACY_UNCONFIRMED. La confirmación se comprueba con el modelo vigente BusinessSchedule, sin tratar el JSON legacy businessHours como prueba de confirmación. La huella de organizaciones con el mismo algoritmo to_jsonb/orden id/salto de línea de P3/P4 es ahora **d34686e050be2f08c97ae4d591fdc9e6**, frente a **e1b7362def3994bd3fa26118b99ec3bc** en el corte anterior: distinta. La primera lectura P9 usó otro algoritmo de huella, preservado en su evidencia, y no se usa para ese cotejo.

**No-Go:** no se satisface «0 reservas, 0 clientes, 2 usuarios; horarios sin confirmar; sin cambios inesperados frente a P3+P4». Los cambios ya existían antes de los GET P9. No se determina causalidad ni se borran filas para hacer pasar el criterio. [Antes](evidence/prod-p9/db-before.json), [después](evidence/prod-p9/db-after.json), [referencia P3/P4](MIGRACIONES_PRODUCCION_P3_P4.md).

## 6. OCI y respaldo

Chrome Alarm Status muestra **solo kortek-prod-restore-stale**, Critical, última activación mostrada 18:16:00 UTC; Error/Warning/Informational=0. No se tocaron alarmas, métricas ni políticas. [Lectura de consola](evidence/prod-p9/browser.json).

Timer instalado: OnCalendar=*-*-* 05:17:00 UTC, Persistent=true, RandomizedDelaySec=300; active/waiting. El respaldo sigue a las **05:17 UTC (01:17 Santo Domingo)** con retraso de hasta 5 minutos. Último trigger 2026-10-09 05:19:33 UTC, servicio Result=success/ExecMainStatus=0, fin 05:19:42 UTC. Próximo trigger mostrado 2026-10-10 05:20:21 UTC. Esta lectura acredita programación y ejecución del servicio, no un nuevo restore ni auditoría del objeto cifrado. [systemd](evidence/prod-p9/ssh.json).

## 7. Git y entrega

Antes de la escritura documental, ai/reserva-invitado-ci local/remoto seguía en la base corregida **a18098649383cb97ae562b9422651c5e8aceb1f1**. main remoto sigue **8e1501e89a132e1b01d3633b1b3f896a8cbe5800**, QA remoto **523d993cfa0c797f356c224d5cc026d6c9ad4c7b**. main local 01113ef0be7d8abcd74e3e7297f7989b359c76c0 y QA local 36061fc3c978758642b5a79ed6cb0e5ff25c003f sin mover. main conserva el merge del propietario; esta tarea no modifica main ni QA.

Entrega autorizada: este informe y evidencias sanitizadas, único commit documental y push sin force exclusivamente a origin/ai/reserva-invitado-ci. El avance final de esa rama es únicamente esta entrega P9; SHA definitivo, local=remoto y status se reportan después del push. Playbook ajeno no seguido preservado sin staging: SHA256 3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090.

No se solicita ni infiere autorización para corregir el estado de negocio, reducir protecciones, abrir la reserva o cambiar proveedores. Para un Go del estado de negocio hace falta que el propietario determine si el censo exigido sigue vigente y resuelva esa discrepancia mediante una orden independiente; este informe conserva el veredicto contra la orden actual.
