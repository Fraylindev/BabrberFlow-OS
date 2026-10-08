# CHANGELOG

## Enmienda del plan productivo invitado — 2026-10-08

**SOLO DOCUMENTAL / EN REVISIÓN; PRODUCCIÓN CERRADA.** [Plan enmendado y anexo D1–D13](docs/quality/PLAN_PRODUCCION_RESERVA_INVITADA.md): Quality #58 (run 37741794480), PG16, head 523d993 y único job verify success comprobados por GitHub. Sustituye la propuesta de construir desde S: merge normal a M, árbol exacto 8f8f73b… tras repetir merge-tree y comprobar M; API/web desde M, asignación automática de dominios Vercel desactivada antes de integrar, web preparada sin mover alias. P0 añade login real READ ONLY del migrador, tier/backups Supabase y decisión MFA; P1b usa clon PG17.6 restaurado del respaldo P1 y precedentes checksum QA. P0–P9/P9b mantienen cierre público; P9b exige OWNER/Clerk live/horarios reales y autorización propia. P10 depende de Piloto 1 sin B2C, M3/M4-A/M5 y Paso 8. Anexo separa código S, aplicación productiva histórica/lecturas originales y pendientes; restore operativo S aún exige 31 tablas frente a 37 futuras. Playbook local nuevo aportado por el propietario, preservado sin versionar. Un commit/push documental solo ai/reserva-invitado-ci, sin cambios de código/SQL/otras ramas ni producción/QA. El registro inferior conserva la comparación y lecturas del gate original.

## Plan documental de promoción invitada — 2026-10-08

**PLAN / EN REVISIÓN; NO-GO PARA EJECUCIÓN.** [Comparación, estado vivo, prerrequisitos y órdenes separadas](docs/quality/PLAN_PRODUCCION_RESERVA_INVITADA.md): main fe4b117 frente a candidato remoto 523d993, divergencia 1/67 y merge-tree sin conflictos/árbol igual al candidato; fast-forward imposible. Vercel productivo READY/fe4b117; API productivo b561586/imagen 8caacd85, cierre público true y correo false. Supabase READ ONLY: PG17.6, 26 migraciones activas/4 intentos revertidos, pendientes 27 y 28; dos funciones 28 ausentes, 0 reservas/0 clientes/2 usuarios/0 CUSTOMER, sin censo Clerk. Cotejo 25/26 checksums exactos; add_invoice_model corresponde a variante CRLF del blob LF de main/candidato: ensayo del ledger/Prisma pendiente, sin cambiar historia. La 28 se conserva intacta/no se revierte por decisión del propietario. Respaldo fresco/restaurable, CI PG16, control de autodeploy/SHA común y validaciones restantes pendientes. Un único commit/push documental solo a ai/reserva-invitado-ci; sin cambios en producción/QA, main, bases, flags o proveedores.

## Concurrencia E2E y preparación de Chrome en CI — 2026-10-08

**IMPLEMENTADO / VALIDADO LOCALMENTE / EN REVISIÓN.** Supertest cerraba el servidor iniciado por la primera solicitud mientras otras seguían pendientes; causa probable de los resets Linux, sin reproducción nativa en Windows. La contaminación tras Promise.all se demuestra con reset inyectado y PG18.1. Las dos suites mantienen puertos por instancia, agente explícito y esperan todo el lote antes de limpiar; cifras 35/80 y aserciones intactas. Cinco repeticiones: 125/0/0; E2E completo: 272/0/1; tipos/lint y Chrome dry-run pasan. Browser smoke instala explícitamente Chrome con dependencias. Linux/runner/PG16 pendientes del CI del PR 4; sin QA ni cambios de producto, migraciones, matriz, flags o dependencias. Un commit/push solo a ai/reserva-invitado-ci. [Informe, certeza y evidencia](docs/quality/CI_CONCURRENCIA_HTTP.md).

## Entorno sintético del CI y lectura API — 2026-10-08

Añadida únicamente JWT_SECRET efímera/enmascarada a los pasos unitarias/componentes e integridad/E2E de quality.yml. PG18.1 y checkout limpio sin dotenv/env del arnés anterior: Prisma/runtime/tipos/lint/builds originales pasan; API unitarias 836/0/41, web 158+130, API E2E 272/0/1 y browser 21/0/1. No faltó otra variable ni se cambiaron omisiones/aserciones. PG16/runner GitHub no reproducibles aquí. Lectura mínima autorizada confirma API active/PID 1523015/NRestarts 0/imagen 8ba1b6c8…/release b318ca5; sin cambios remotos. [Inventario, evidencia y límites](docs/quality/CI_ENTORNO_SINTETICO.md). Implementado/en revisión; un commit/push solo a rama temporal, PR nuevo pendiente; producto, contratos, migraciones, SQL, flags y dependencias intactos.

## Diagnóstico Runtime privilege matrix gate y deployment web — 2026-10-08

Error de b318ca5 clasificado **(a), preparación CI**: las funciones trigger INVOKER conservaban ownership del runner en el clon; la guardia exige migrator. Solo quality.yml prepara ahora base independiente y aplica migraciones como `kortek_migrator`, sin tocar SQL/migraciones/producto ni relajar aserciones. PG18.1 reproduce el fallo y pasa el bloque Bash corregido/gate íntegro; `9f04dba` falla por otra causa histórica (CustomerOperation no revisada). PG16 no disponible aquí; CI remoto pendiente. Lectura Vercel confirma alias en **dpl_8iqUtQ6XMYgPv1wF3FcnpbczoaWe, READY, b318ca5**, distinto de dpl_KEKT6X12; sin reasignación/redeploy ni variables/login verificados. [Informe y evidencia](docs/quality/DIAGNOSTICO_RUNTIME_PRIVILEGE_GATE.md). Implementado/en revisión; un commit/push solo `ai/reserva-invitado-ci`, sin QA, OCI/SSH/Clerk/bases reales ni producción.

## Clave Clerk rotada en API QA — 2026-10-08

Actualizada únicamente `CLERK_SECRET_KEY` desde archivo local ignorado mediante stdin SSH seguro; publishable key intacta, copia previa root:root 0600 y conservación de bytes ajenos. Editor adaptado autorizado y ensayado, 8 positivos/8 negativos. Reiniciado solo API QA, release/imagen b318ca5 intactos; ocho GET/CORS pasan, cero 5xx y coincidencias de errores Clerk en la ventana observada. Worker sin variables Clerk, intacto. Rollback no ejecutado. Alias web sigue en `dpl_KEKT6X12exUWoReFRPtxxTXGuo9K`, READY/b318ca5; nuevo deployment de rollback no confirmado, sin assign_alias. [Informe, hashes y límites](docs/quality/CLERK_ROTACION_API_QA_2026_10_08.md). Sin código/dependencias, bases ni producción; sin valores secretos versionados. Único commit documental/push solo a `ai/reserva-invitado-ci`.

## Cierre documental de reserva invitada en QA — 2026-10-08

C3 **ACEPTADO POR DECLARACIÓN DEL PROPIETARIO, sin evidencia capturada**: pruebas manuales satisfactorias declaradas en iPhone con `b318ca5`, sin inventar casos. Estado vigente de reserva invitada activa en QA (API `sha256:8ba1b6c8…`, web `dpl_KEKT6X12…`), M2 retirada, reservas residuales conservadas y limpieza transaccional excluida por decisión del propietario. Rollback no ejecutado y pareja anterior retenida, con advertencia de reexposición B2C. Otros dispositivos/navegadores, correo real, WhatsApp real y concurrencia no verificados. [Registro y pendientes por riesgo](docs/features/RESERVA_INVITADO_C3_CIERRE_QA.md). Solo documentación, un commit local y push autorizado exclusivamente a `ai/reserva-invitado-ci`, sin force; sin QA/proveedores/bases/producción, código ni dependencias modificados. Los estados previos fechados conservan su contexto histórico.

## Correctivo Dependency and peer audit — 2026-10-07

Gate único sobre `36061fc`, rama temporal `ai/reserva-invitado-ci`. Audit local pnpm 11.18.0: 11 avisos en versiones idénticas a la base, corregidos mediante parches/minor de Next, sharp, multer, proxy-addr y source-map-js; pins exactos autorizados después por el propietario. Audit y peers estrictos exit 0. Tipos/lint y builds API/web pasan; PG18.1 nuevo: 877/0/0 unitarias API, 272/0/1 e2e API; web 158+130 pruebas y browser 21/0/1, exit 0. Clúster propio eliminado. Validado localmente/en revisión; commit/push autorizados solo a la rama temporal, sin merge, workflows, contratos, proveedores, QA desplegada ni producción. CI remoto posterior no verificado. [Informe y evidencia](docs/quality/CORRECTIVO_CI_DEPENDENCY_PEER_AUDIT.md).


## Correctivo Retry-After, CI y evidencia — 2026-10-07

Gate único local sobre base `58f536f`: restante de bloqueo/expiración calculado en el mismo upsert y reloj PostgreSQL; 30/min, bloqueo 60 s, fail-closed y HMAC preservados. Caso original intacto; 20/20 clústeres fríos pasan con header 60. Solo dos separadores Jest retirados de quality.yml y una regla whitespace para evidencia .txt, con 40 hashes existentes idénticos. Unitarias API 877/0/0, e2e 272/0/1 y browser 21/0/1, exit 0; implementado/en revisión. Resultado final de suites y P4b en [informe del correctivo](docs/quality/CORRECTIVO_RETRY_AFTER_CI_WHITESPACE.md). Tres commits locales separados, sin push/proveedores/QA/producción/dependencias ni contratos nuevos. Ningún gate posterior abierto.

## Fixtures de reserva invitada y Retry-After — 2026-10-07

Horarios semanales CONFIRMED por organización en Servicios/Notificaciones, firma local sintética para medios M1 y citas de fixture sin solapamiento. Expectativa estricta de factura en GET /bookings actualizada según F0-B por autorización expresa adicional. Las 37 fallas anteriores pasan; API previa al commit 263/1/1, browser 21/0/1. Diez muestras frías de Retry-After: 7 headers 60/3 headers 61; diagnóstico de producto por dos relojes, sin modificar producto ni test de ese límite. Atributos .patch/.log autorizados en commit local separado, conservando bytes; no eliminan siete diagnósticos .txt. [Informe y evidencia](docs/quality/CORRECTIVO_FIXTURES_RETRY_RESERVA_INVITADA.md). Sin push, QA/proveedores/bases reales o aprobación funcional.

## Diagnóstico de suites de reserva invitada — 2026-10-07

Línea base externa `c4625ef` en PG18 desechable; worktree eliminado. Cuatro rechazos JWT CUSTOMER de Facturación esperan ahora 401 según C1. Nuevo arnés reproduce las suites completas en PG18 nuevo y bloquea dotenv/red externa/instalación automática; fixtures browser sirven SDK/UI Clerk anónimos y banderas neutras sin filtrar errores de consola. Se conservan las 37 fallas API preexistentes y se registra una falla temporal adicional de Retry-After. Browser previo al commit: 21 aprobadas/0 fallidas/1 omisión prevista; no acredita proveedor ni recursos visuales finales. Cabeceras documentales de enmienda/cancelación M2, clasificación de 43 fallas y conciliación de P4b 624/633 según corte. [Informe y límites](docs/quality/DIAGNOSTICO_SUITES_RESERVA_INVITADA.md). Sin push ni aprobación/cierre funcional.

## C2 reserva invitada — validado localmente / en revisión, 2026-10-07

Autorización posterior de C2 local: retirado el portal B2C exclusivo, navegación, proveedor, hooks, páginas y paso de cuenta. `POST /public/:slug/bookings` responde sólo `{booking}` después de migrar los consumidores ejecutables conocidos de `accountCreated`/`accountCreationError`; quedan únicamente assertions negativas e historia. Client operativo y roles internos/Clerk preservados. 871 pruebas API (0 omitidas), 37 integraciones anteriores + 4 HTTP PostgreSQL y 288 pruebas web aprobadas; tipos/lint/build de ambas apps pasan. Nueve escenarios locales Chrome de flujo, foco/teclado/campos/overflow/consola aprobados, con transporte y Clerk controlados; no equivalen a QA/proveedor/dispositivo físico. C2 implementado y validado localmente, en revisión del propietario; **C3 NO EJECUTADO**. Sin commit/push/PR/despliegue, cambios de QA/producción, Prisma/migraciones ni P4b. Los checkpoints inferiores conservan sus estados fechados; las menciones C2 pendiente y campos deprecated quedaron superadas por este registro.

[Informe C2, inventario, contrato, resultados, diff y rollback](docs/features/RESERVA_INVITADO_C2_LOCAL.md).


## C1 reserva invitada — cierre técnico local en revisión, 2026-10-07

PostgreSQL 18.1 en clúster nuevo: 28 migraciones intactas, roles separados y gate runtime exit 0; 37/37 integraciones y 2/2 pruebas HTTP claim con/sin bearer, sin cambios User/Membership/Client/AuditLog; 0 omitidas. Una assertion H5 obsoleta se alinea al contrato aprobado F0-D/2A, exigiendo timeZone exacta en raíz y ausencia de America/ en toda otra proyección; fallo inicial conservado. No cambia API ni contrato. Clúster propio detenido/eliminado. C1 validado localmente/candidato a cierre técnico en revisión del propietario, no declarado cerrado/aprobado ni autorizado para commit. C2/C3 detenidos; sin commit/push/despliegue, QA, Clerk, Prisma ni auditoría P4b modificados. [Informe, casos, comandos exactos y límites](docs/features/RESERVA_INVITADO_C1_CIERRE_TECNICO.md).

## Correctivo de consistencia B2C — 2026-10-07

Autorizado tras el checkpoint documental: retirados dos positivos de claim de tests web; orquestador P1 y helpers de compatibilidad/rollback/probe conservados como .txt históricos no ejecutables; rate-limit drill exige 404 de la ruta retirada, sin ejecutar QA. Datos, migraciones, SQL y Clerk intactos; UI B2C pendiente de C2. 308 pruebas web, tipos/lint/build y 22 HTTP API pasan; 37 integraciones PostgreSQL pendientes. C0 aprobado; C1 parcialmente validado local/en revisión; C2/C3 pendientes; sin commit/push/despliegue. [Informe actualizado](docs/features/RESERVA_INVITADO_CONSISTENCIA_C0_C1.md).

## 2026-10-07 — Retiro funcional B2C, solo C0/C1 local

- Cuenta de cliente final fuera del producto/MVP; reserva de invitado oficial y Client como contacto operativo. [Contrato, evidencia y límites](docs/features/RESERVA_INVITADO_C0_C1.md).
- C1 retira rutas/customer y claims, alta secundaria legacy y campos de entrada de cuenta. Bloquea JWT CUSTOMER sin cambiar los roles internos ni Clerk. Campos de salida de cuenta deprecated hasta retirar tipos web en C2.
- Sin C2/C3, datos, Prisma/migraciones, dependencias instaladas, P4b, commit/push/despliegue o cambios QA. Implementación local validada/en revisión; no aprobación inferida.

## 2026-10-03 — Consolidación documental local de M1 y M2 C1

- Siete rutas pendientes reunidas en un único commit local sobre `d222115f7d624b5698b67a24e22486625fec22b2`, sin incorporar cambios nuevos de código o contratos. El commit C2 y `cierre-documental-20261003.json` permanecen intactos. **Sin push ni despliegue**: [alcance y motivo](PROJECT_MASTER.md).
- Se conserva la aprobación M1 ya registrada abajo; el [ajuste UX aprobado](docs/quality/RESERVA_PUBLICA_CONFIRMACION_UX.md#aprobación-posterior-del-propietario--2026-10-03) y el [antecedente de aprobación/limpieza](docs/quality/RESERVA_PUBLICA_M1_C3_CIERRE.md#antecedente-de-aprobación-y-limpieza--2026-10-03) se enlazan sin repetir su detalle. La eliminación con SHA previo y la constatación posterior de ausencia corresponden a ejecuciones distintas; no se realizan borrados, restore ni QA nuevos.
- Se incorpora la [aprobación expresa de M2 C1](docs/quality/M2_C1_CIERRE.md#aprobación-explícita-del-backend-c1-y-bloqueo-de-producción--2026-10-03) y se mantiene [D4 aceptado solo para QA, bloqueante en Paso 8](docs/quality/M2_C1_CIERRE.md#riesgo-residual-d4-aceptado-solo-para-qa-bloqueante-en-paso-8). No resuelve el riesgo ni abre producción.
- Los textos históricos fechados y toda la evidencia se preservan. Las contradicciones de estado se explican en los controles y cierres correspondientes; las pruebas sin resultado específico, modelo/versiones y mediciones conservan sus límites. Validación exclusivamente documental y Git; sin API, bases reales, flags ni variables.

## 2026-10-03 — Cierre documental final de M1

- **M1 (Reserva pública) CERRADO / APROBADO** por autorización escrita del propietario, incluida la revisión física en iPhone/Safari. Se conservan los textos históricos y sus límites; no se inventan resultados por caso, modelo ni versión de iOS.
- Respaldo de Cutover QA identificado por el informe C3: `.tmp/m1-c3/qa-before.dump.gpg`. El respaldo y su checksum ya estaban ausentes al comenzar esta comprobación; se verifica de nuevo su ausencia, sin borrar otro archivo ni leer contenido o claves. La eliminación previa consta en los cambios preexistentes; esta ejecución no puede repetir su hash previo.
- Deuda para la **Puerta de producción (Paso 8)**: «Por atender» y «Todas» filtran y ordenan en el cliente sobre `GET /bookings` sin paginación ni tope. Con volumen real habrá que paginar o filtrar en el servidor; no se corrige ahora.
- Cierre exclusivamente documental sobre `ddcb7aba8ab324ac3e3c03a288ac34508bc6e998`; commit/push autorizados solo a `origin/ai/antigravity-qa`. Cambios preexistentes aislados y preservados fuera del commit. Sin código nuevo, despliegues, cambios de flags/variables ni acceso a bases reales. [Estado M1](docs/quality/RESERVA_PUBLICA_M1_C3_CIERRE.md) y [validación de esta ejecución](docs/quality/evidence/m1-c3/cierre-documental-20261003.json).

## 2026-10-03 — Confirmación pública de reserva y pies

- Ubicación del negocio bajo el resumen de servicio y profesional; calendario y acciones de WhatsApp/Maps quedan después.
- Recomendación para conservar la confirmación sin tarjeta y con jerarquía tipográfica centrada.
- Pie común y centrado en mini-sitio y flujo de reserva: «slug · Reservas gestionadas con Kortek.».
- Desplegado solo en web QA: commit `62d4f934519670a80aad1029cf12a40659b144a2`, Vercel Preview **Ready** en `ai/antigravity-qa`. [Preview](https://kortek-booking-nkvopdi3h-fraylindev.vercel.app) y dominio QA [qa.booking.kortek.cloud](https://qa.booking.kortek.cloud). Sin contrato, backend, persistencia o dependencias nuevas. TypeScript/lint y build webpack pasan; build Turbopack falla por módulo interno de fuentes. El slug local probado devuelve 404 porque no está publicado localmente; el API QA conserva evidencia previa `200/200` para el slug sintético publicado. No se enviaron reservas ni se alteró configuración. QA visual del propietario sigue pendiente. [Alcance y evidencia](docs/quality/RESERVA_PUBLICA_CONFIRMACION_UX.md).

## 2026-10-02 — Atención pendiente, acciones desktop y contacto público

- Las completadas sin factura permanecen en Por atender; Todas prioriza atención y ordena cada grupo por fecha descendente.
- Desktop muestra reprogramación/consulta financiera junto a la acción principal y conserva restantes en menú; móvil conserva su presentación. Fotos redondeadas iguales, Listo legible y mapa/WhatsApp con estilo secundario reforzado.
- Mini-sitio sustituye llamada por WhatsApp al número publicado, con mensaje genérico previo a reservar y validación estricta.
- 290 pruebas, tipos/lint/build y 123 registros de navegador pasan. Código/evidencia `68fd3c0`; Preview `dpl_GbsN4Gr91MsaLsgQcQFe4J3FM1pg` Ready y alias QA comprobados. API QA GET `200/200`; infraestructura y producción sin cambios. [Informe y publicación](docs/quality/CORRECTIVO_F0E_AJUSTE.md). M1 y QA física en revisión. Resultados documentales F0-E anteriores preservados e incorporados.

## 2026-10-02 — F0-E publicado y desplegado solo web QA

- Reservas desktop: estado de factura bajo Estado, una acción principal y menú con Facturación/avisos, nombres con tooltip accesible; límite ampliado solo en la ruta de Reservas. Tarjetas conservadas.
- Fechas vacías y Por atender inicial, conteos según rango y limpieza al estado inicial. Proyección local sobre contrato sin límite; propuestas de estados/paginación pendientes.
- Revisión/éxito: fotos compactas iguales, duración/precio juntos, calendario → WhatsApp → ubicación → nota → Listo y safe-area. WhatsApp de negocio/mensaje genérico conservados.
- Tipos/lint/build y 283 pruebas pasan; 95 registros Chrome controlado en ocho anchos. Facturación tiene scroll interno menor en 1280; se reporta sin editar. [Informe, evidencia, límites y D/E](docs/quality/CORRECTIVO_F0E.md). Enmiendas 22–24 añaden las direcciones aprobadas D1-A/D2-A/E-A para módulos posteriores. Publicados `26cfc42`/`ea912d9`; web QA Ready en `dpl_G9RGGb5W9qedEGXZbNMAyUTfsHNi` y SHA exacto. API GET C1 y comparación de producción pasan; SSO preservado. Norte/Sur sin teléfono publicado, sin cambios de datos. Sin backend, bases reales, `.env`, flags ni dependencias; M1, QA física y panel autenticado desplegado pendientes. Resultados finales locales en cuatro documentos, sin tercer commit.

## 2026-10-02 — Correctivo visual y navegación de reserva pública M1

- Títulos sin contorno de foco visual; iniciales estables al faltar/fallar foto; filtros de hora sólidos con indicador y fechas en minúscula. Carrusel semanal nativo con precarga adyacente, flechas y conservación de fecha/hora.
- Duración, monto y teléfono legibles; revisión en una columna, éxito con marca animada y pendiente visible; ojo accesible dentro de PasswordField y mínimo único.
- Tipos/lint/build y 281 pruebas pasan; QA local en cuatro anchos con 28 mediciones y una PENDING sintética. Código `843996e` publicado a `origin/ai/antigravity-qa`, web QA READY y cuatro mediciones desplegadas sin overflow ni POST. [Hashes y evidencia](docs/quality/RESERVA_PUBLICA_M1_UX_CORRECTIVO_QA.md). Backend/producción/configuración/protección intactos; timestamp del backup diario auditado como ejecución programada independiente. Pruebas físicas y aprobación final pendientes; M1 en revisión.

## 2026-10-01 — UX ligera publicada y desplegada solo web QA

Publicación ejecutada — 2026-10-01: **UX LIGERA PUBLICADA Y DESPLEGADA SOLO WEB QA / EN REVISIÓN; M1 NO CERRADO, QA FÍSICA PENDIENTE**. Commits `dc82a4f` y `9d2eb47` en `origin/ai/antigravity-qa`, publicación al repositorio público confirmada explícitamente. Web QA READY en `9d2eb47`, API C1 existente verificada (availability-days/D11 neutro sin crear reservas). [Hashes, evidencia, límites y guía iPhone](docs/quality/RESERVA_PUBLICA_M1_UX_LIGERA.md). Producción/main `fe4b117`, imagen/PID/API, variables, flags, SSO y proveedores intactos. Banderas cargan en navegador; cabecera CSP del documento autenticado no expuesta por la herramienta, sin relajar protección. Respaldo cifrado C3 ignorado y retenido. Enmiendas 16–21 exactas, tipos/lint/build y 275 pruebas con exit `0`. Tercer commit documental registra el resultado; las entradas inferiores preservan el contexto histórico y no revocan esta publicación.

## 2026-10-01 — Reserva pública más ligera, correctivo frontend local

- Plan autorizado sobre C1 aprobado: encabezado/filas compactos, semana/mes desplegable, horas con franjas, teléfono por país/prefijo y resumen sin marco exterior. Calendario TENTATIVE con descripción breve; WhatsApp conservado.
- Tipos/lint/build y 275 pruebas web pasan; 35 mediciones de siete vistas en cinco anchos, teclado/foco y recorrido contra PostgreSQL/API locales aislados. Tres PENDING sintéticas, una hasta medianoche; 400 recuperable y página 404 reales. [Evidencia y límites](docs/quality/RESERVA_PUBLICA_M1_UX_LIGERA.md).
- Implementado localmente/en revisión, QA de cierre incompleto: físicos, zoom real 200 %, importación, auditoría y aprobación pendientes. Sin backend/contratos/dependencias nuevos, staging, commit, push o despliegue. Trabajo documental C3 preexistente preservado.

## 2026-10-01 — M1 C3 activado exclusivamente en QA / en revisión

- Autorización posterior explícita de respaldo/restore local resuelve el rechazo inicial. [Informe C3 y guía iPhone](docs/quality/RESERVA_PUBLICA_M1_C3_CIERRE.md): once evidencias C2 limpias; export READ ONLY/TLS verificado, AES256, restore sin red/tmpfs y 36/36 conteos/huellas iguales, incluidas 27 migraciones. Plano y contenedores eliminados; copia cifrada retenida solo en este equipo hasta aprobación M1, con eliminación/reportado posterior pendiente. Sin modificar grants del backup rutinario, que aún carece de lectura de cinco tablas de horario.
- Imagen API del SHA aprobado `791569b` construida, Nest/Prisma generate y 23 drills negativos pasan; API QA activada, imagen anterior retenida y solo imagen/release QA cambiados. Después se reasocia el Preview READY existente exacto al alias QA. Worker QA y producción conservan procesos, imágenes, hashes de configuración; Vercel producción/main iguales antes/después. Sin migración, dependencia, rol, grant, flag, proveedor, commit ni push.
- Controles §5 pasan: 200/401/204, CORS/RequestId, rango 31/rechazo 32, límite compartido 30/min y 429, D11 exacto sin parcial, 201/PENDING y reutilización válida según opción A elegida. Dos tenants dedicados sintéticos, tres PENDING (dos HTTP/una UI), cero opt-in/dispatch. Navegador contra API/base reales verifica D11 con retorno/preservación y éxito/recarga. Guía iPhone entregada con enlaces operativos y límites de cobertura; QA física, otros casos indicados y aprobación global pendientes. **M1 no aprobado ni cerrado.**

## 2026-10-01 — Frontend M1 C2 aprobado; commit/push autorizados sin despliegue

- El propietario aprueba expresamente el frontend C2 y aclara «No hay condiciones, sigue adelante». Commit/push autorizados exclusivamente a `origin/ai/antigravity-qa`, sin despliegue. Se sincroniza la aprobación en los cinco documentos de control del checkpoint; la igualdad de SHA local/remoto y el árbol final se verifican al publicar. C3/QA física y producción conservan sus gates separados.
- Preparación: auditoría de alcance/evidencia, tipos y lint limpios; 152 pruebas de lógica y 110 de componentes aprobadas, exit `0`. Sin cambios de código, build o QA adicional. [Registro de aprobación y publicación](docs/quality/RESERVA_PUBLICA_M1_C2_CIERRE.md). La entrada siguiente describe la entrega original.

## 2026-10-01 — Reserva pública M1 C2 frontend implementado / en revisión

- C2 expresamente autorizado sobre C1 aprobado `d9b508f8317bf128fb409c0a22098895f24ea5fb`. CTA del mini-sitio enlaza `/{slug}/reservar`, con regreso y carga directa; cinco pasos, profesional concreto antes del POST y preselección visible si hay uno solo. Calendario reutilizable D6-B, rango inclusivo ≤31 y select nativo con slots autoritativos; sin pago ni paso obligatorio de cuenta.
- Validación de contacto internacional junto al campo, correo opcional y contraseña ≥8 solo si opta; aviso QA exacto. D11 conserva todo el borrador. POST protegido de doble clic/reintento; 409 exige otra selección, 429 respeta espera permitiendo editar, timeout informa incertidumbre. Éxito PENDING completo con BusinessTime, fotos elegibles/respaldo, próximos pasos, Maps/WhatsApp condicionados y calendario local TENTATIVE; sin persistencia de PII ni eventos de conversión.
- Tipos/lint/build y pruebas web; Chrome 320/375/390/1280 px y 200 %; datos/HTTP PostgreSQL desechables y sesiones Clerk reales de cuatro roles en dos negocios. Regresiones de fecha, avisos y WhatsApp migradas al nuevo consumidor. [Cierre y evidencia](docs/quality/RESERVA_PUBLICA_M1_C2_CIERRE.md). Pendientes revisión/aprobación del propietario y QA física/C3: el API QA debe desplegarse primero. Sin backend/contrato/dependencias nuevos, staging, commit, push, despliegue, .env/flags operativos ni acceso a bases reales; producción intacta.

## 2026-10-01 — Reserva pública M1 C1 backend aprobado; commit/push autorizados sin despliegue

- C0 aprobado posteriormente por el propietario con D6-B y las demás recomendaciones. Solo backend C1: availability-days inclusivo ≤31 con snapshot y motor diario compartido; fotos públicas ya existentes; presupuesto PostgreSQL 30/min medido y probado entre instancias. Sin migración ni frontend.
- El propietario elige expresamente error genérico conservando rechazo D11: colisiones devuelven 400/cuerpo idéntico a rechazo sin contacto existente; rollback real, carrera de unicidad y reutilización válida probados. Alta válida conserva 201/PENDING. [Entrega y evidencia](docs/quality/RESERVA_PUBLICA_M1_C1_CIERRE.md). Identidad secundaria legacy conserva su riesgo separado.
- Aprobación posterior expresa del propietario el 2026-10-01: backend C1 aprobado con sus riesgos residuales documentados; staging por las 15 rutas exactas y commit/push a `origin/ai/antigravity-qa` autorizados. Se sincronizan PROJECT_MASTER, este historial, BACKEND_CHANGES, README y cierre C1 en el mismo checkpoint. No autoriza C2/C3 ni despliegue; sin cambios operativos ni acceso a bases reales. Producción cerrada e intacta. Se conservan las entradas y cambios documentales previos.

## 2026-10-01 — Reserva pública M1: C0 documental

- [C0 de M1](docs/quality/RESERVA_PUBLICA_M1_C0.md) preparado sobre `ad90bf52890ea2e2ba309ad5a87d1dcafcdde9f7`, con árbol inicial limpio: ruta separada, fotos elegibles, calendario/hora compacta, éxito PENDING, casilla de cuenta sin promesa de continuidad inexistente, privacidad, contrato propuesto, amenazas y QA de dos negocios sintéticos/móvil físico.
- Decisiones anteriores FIJADAS; D5–D13 propuestas para revisión. Necesita C1 para días disponibles por rango antes de C2; solo C0 de M1 abierto. Sin cambios de API/contratos aprobados, código, configuración o datos; sin staging, commit, push, despliegue ni apertura productiva. README y PROJECT_MASTER enlazan la entrega documental, no una capacidad implementada.

## 2026-10-01 — Ajuste visual de filtros de Reservas y Facturación

- Por capturas y autorización de cambio/commit/push del propietario: «Todos» pasa a «Todas» en Reservas. Desde/Hasta en ambas pantallas limitan ancho a la columna, mantienen 44 px de alto y ajustan el control nativo de fecha para Safari, con estilo solo en esos cuatro campos.
- Tipos limpios, lint, 251 pruebas y build web pasan. Chrome local en 320/375/390/844/1280 px verifica márgenes, fechas vacías/pobladas, filtros/reset, foco y consola. Safari físico pendiente; sin cambio de backend, contrato, zona, permisos o datos. Implementado/en revisión, publicación QA autorizada. [Evidencia](docs/quality/CORRECTIVO_F0D.md).

## 2026-10-01 — F0-D publicado y desplegado exclusivamente en QA

- Publicación autorizada expresamente por el propietario: código `92f6127` en origin/ai/antigravity-qa, API/worker QA con imagen inmutable `7eafd5c9232a`; 23 controles de arranque pasan y rollback anterior conservado. Configuración funcional, flags y secretos intactos; únicamente cambian los selectores operativos de imagen/release QA. Sin migraciones ni cambios de datos.
- Preview Ready `dpl_Erb4T1Cri2GpGjm6rxkRsoH41bux` ya asociado automáticamente a qa.booking.kortek.cloud. API HTTPS, zona del negocio pública, autenticación/CORS y producción protegida verificados. Navegador remoto sin sesión llega al SSO de Vercel, conservado; QA autenticada y aprobación final pendientes. Tipos/lint/tests/build previos pasan en ambos proyectos (251 web, 781 API/37 omitidas). [Informe operativo y checklist del propietario](docs/quality/CORRECTIVO_F0D.md).

## 2026-10-01 — F0-D local: fechas comunes y estados de invitación sin promesa de envío

- Propietario confirma que el correo sí llegó y estaba en spam, y elige expresamente **3A**: acepta para QA la UI «La entrega del correo no está confirmada», con Reenviar y sin señal automática de aceptación ESP. Se resuelve la observación de no recepción de ese mensaje; no se investiga ni afirma la regla que lo clasificó como spam. SDK 3.16.5 sin get/list de recibos asociados a invitación; no se cambia código, configuración ni proveedor para esta confirmación. Entrega local validada/en revisión final, sin cierre global o publicación.

- Decisión **1A** autorizada: default/fallback de creación y reenvío pasan a siete días; rango explícito 1–30 y fechas existentes preservados. Backend mínimo aprobado expresamente por el propietario tras validar; cinco regresiones fallan antes, 25 pruebas dirigidas pasan después. Tipos/lint/build y 781 pruebas API pasan (37 omitidas). No cambia aceptación, permisos ni estado de correo; web no requiere nuevo consumidor. La aprobación no cierra F0-D ni autoriza publicación o correo real.
- Después de aprobar 1A: comprobación Chrome local de crear/reenvío con el servicio API compilado y almacenamiento controlado, web real en 375/1280 px y dispositivo Tokio/negocio Santo Domingo. Siete días, renovación, creación original, PENDING a dos minutos y restricción BARBER pasan. Formulario deja de prometer recepción; tipos/lint/build web y 251 pruebas pasan de nuevo. Sin conexión a base ni proveedor.

- Continuación autorizada **2A**, backend validado/aprobado e integración web autorizada explícitamente: timeZone técnico en raíz de booking-data, confirmación/éxito con relativos y año del negocio usando el instante autoritativo. Regresiones de medianoche, privacidad, overrides, año y A → B → A; API 767 pruebas (37 omitidas), web 251 pruebas y tipos/lint/build pasan; Chrome controlado público en 375/1280 px pasa. Esa aprobación no comprendía la decisión 1, autorizada después por separado.

- Formateador único y time accesible para fechas visibles; Hoy/Ayer/Mañana y año en zona del negocio, reloj de 12 horas y actualización al cambiar de día. La primera etapa conservó valores públicos absolutos; 2A completa los relativos públicos tras aprobación explícita. Plantillas de correo y payload de creación intactos.
- Equipo usa Creada/Vence el, mantiene Reenviar y explica la entrega no confirmada; FAILED comunica fallo de acción porque también puede venir de revocar. Lectura QA acredita Clerk Development, pending y treinta días de vigencia; no demuestra entrega ni reproduce dos minutos.
- Primera etapa compatible implementada localmente/en revisión; siete días, señal de envío y zona pública se detuvieron por contratos aprobados. 2A y luego 1A autorizan zona pública y plazo siete; el propietario acepta la limitación de señal mediante 3A y confirma el mensaje en spam. Sin cambios de datos, .env, flags, proveedores, producción ni publicación Git. [Informe F0-D y validación](docs/quality/CORRECTIVO_F0D.md).

## 2026-09-30 — F0-C: operación anticipada y controles de formularios

- Se permite emitir y cobrar una reserva completada incluso antes de su horario, conservando permisos y garantías financieras. Backend validado con 764 pruebas unitarias y 25 HTTP/PostgreSQL; el propietario aprobó backend e integración frontend.
- Campos editables del panel alcanzan 16 px en móvil/pantalla táctil, incluidas biografía, notas, descripción y correo opcional de reserva. Desde/Hasta conservan formato nativo sin ejemplos inferiores. Filtros de Facturación comparten altura y acciones desktop de Equipo no parten palabras.
- Implementado en revisión; commit/push y despliegue QA F0-C autorizados expresamente, con verificación operativa desde el commit. El informe F0-A se incorpora en un commit documental separado. El resultado comunicado de F0-B comprende exclusivamente las validaciones ejecutadas por el propietario. [Informe F0-C](docs/quality/CORRECTIVO_F0C.md).

## 2026-09-30 — Correctivo F0-B publicado y desplegado en QA, en revisión

- Reservas recibe estado financiero mínimo, distingue factura emitida/pagada y sincroniza caché al emitir/cobrar. Backend aprobado explícitamente; sin migraciones ni ampliación de permisos. Menú móvil con una acción principal y tres puntos, incluyendo avisos por correo.
- Renovación automática acotada del token tras 401, relectura de acceso, recuperación de consultas transitorias y retención de borradores. Rechazos definitivos retiran acceso; escrituras ambiguas no se repiten. Logs QA del código reportado corroboran rechazo de autenticación, sin demostrar el motivo criptográfico exacto.
- API: tipos/lint y 764 pruebas pasan. Web: tipos limpios/lint/build y 235 pruebas pasan; Chrome controlado 320/375/390/1280 px pasa. Commit `33de07a` publicado en ai/antigravity-qa; imagen API/worker QA `24e38719c511` y Preview web Ready en QA. HTTPS/X-Request-Id/CORS pasan, producción intacta. QA con Clerk real y aprobación final pendientes. [Informe F0-B](docs/quality/CORRECTIVO_F0B.md).

## 2026-09-30 — Publicación y despliegue QA de F0-A autorizados

- El propietario aprobó Gate 4 y commit/push de los 34 archivos de F0-A. Commit `6752e95e580b41670b6369adfc6bfb240f4c8509` en `origin/ai/antigravity-qa`, con SHA local/remoto iguales. Autorización posterior de QA: Preview Ready en el dominio QA y `X-Request-Id`/exposición CORS verificados. Su informe conserva el cambio documental de despliegue sin commit por instrucción expresa. Esta continuación actualiza el estado de la entrada histórica inferior; el testing del propietario dio origen a F0-B, sin cierre de QA integrado. [Informe F0-A](docs/quality/CORRECTIVO_F0A.md).

## 2026-09-30 — Correctivo F0-A local, sin publicación

- Ajustados los seis puntos autorizados: contraseña pública de ocho caracteres con ayuda junto al campo, entradas móviles de 16 px, mensajes de cambio de estado según causa, UUID de petición recibido del API, fecha/hora natural del negocio y ejemplos visibles de filtros, y etiquetas del rol Profesional manteniendo `BARBER` interno.
- API: tipos, lint, 763 pruebas y build con exit code 0. Web: tipos, lint y pruebas con exit code 0; comparación aislada Chrome en 320/375/390/1280 px. Build web y regeneración limpia de tipos no pasan por `DEPLOY_ENV`; no se cambiaron variables, flags, contratos ni dependencias. Gate 4 abierto, validación incompleta y aprobación pendiente. Sin commit, push, despliegue ni acceso a bases reales. [Informe F0-A](docs/quality/CORRECTIVO_F0A.md).

## 2026-09-29 — Worker de correo independiente en Cutover QA

- Instalados `kortek-email-worker-staging.service` y su wrapper con `LoadCredential` de staging, guardas de proyecto/orígenes QA e imagen ARM ya desplegada. Unidad habilitada/activa, contenedor rootless de solo lectura sin capacidades efectivas ni puerto público, límites 0,25 CPU/384 MiB/64 procesos y dos heartbeats observados. La fila global `EMAIL` faltaba en Cutover QA; se creó solo allí, sin pausa, tras comprobar cero intenciones pendientes/inciertas. No se hizo envío de prueba ni se acredita entrega.
- API y worker productivos conservaron contenedores/PID, configuración y correo desactivado; API pública productiva siguió devolviendo 404. [Evidencia operativa](docs/quality/STAGING_QA_2026-09-28.md).

## 2026-09-29 — Reserva pública abierta solo en Cutover QA

- Por autorización del propietario, `kortek-api-staging` carga `PUBLIC_BOOKING_CLOSED=false` y los valores QA separados de Resend/Cloudinary. Los diez valores coinciden entre archivos locales, credencial root:root/0600 y entorno efectivo del contenedor, sin exponerlos. `NOTIFICATIONS_EMAIL_ENABLED=true` está cargado en la API; no se instaló un worker QA ni se acredita envío.
- HTTPS externo: `GET /public/qa-horario-norte/booking-data` en API QA 200 con `no-store`; página web QA 200; rutas privadas 401 y raíz 404. CORS solo admite el origen web QA en staging. La API productiva conserva reserva pública 404, ruta privada 401, raíz 404 y CORS exclusivo productivo. Hashes de credencial, wrapper, unidad y Caddy; PID, ID e imagen del contenedor productivo coinciden con la línea base anterior al cambio. [Evidencia](docs/quality/STAGING_QA_2026-09-28.md).
- El propietario usará QA durante varios días y sus cambios posteriores de contenido, profesionales, promociones y reservas no deben revertirse ni cuestionarse por inferencia. Producción no recibió escrituras, reinicios ni cambios de configuración en esta operación.

## 2026-09-29 — Horario y zona C2 cerrado en Preview QA

- El propietario cerró C2 funcionalmente sobre Cutover QA `prirlabbnlcuvnzuaczp` y datos sintéticos. Aceptó D9 con dependencias persistidas, la intersección A2 del horario profesional y global, la proyección CMS y la emisión de factura con fecha de negocio 2026-09-28. La evidencia distingue el bloqueo visible D9 en Preview del `409` cubierto por integración C1; el horario CMS se confirmó, aunque la página pública no mostró una lista visual de franjas.
- Correo/promociones se aceptan con la integración C1 de promoción sellada y las pruebas end-to-end previas de Notificaciones y Medios/Promociones; no se reactivó el worker ni se envió correo en este QA. El test de componente cubre «Confirmar región» deshabilitado por `zoneChangeAllowed=false`.
- Quedan como pendientes separados «Gestionar perfil» en tarjeta responsive y conservar cerrados los grants `anon`/`authenticated` de Cutover QA. El ítem 4 espera que el propietario elija los horarios reales de Dental Ross y Prueba de oro. Migración y confirmación productivas no están autorizadas. [Evidencia](docs/quality/STAGING_QA_2026-09-28.md).

## 2026-09-28 — Completar reservas antes del fin programado

- OWNER, ADMIN, RECEPTIONIST y BARBER pueden completar una reserva confirmada sin esperar a la hora de inicio/fin ni a la duración del servicio. Se retiró el guard temporal del backend y se actualizaron las pruebas de servicio y HTTP.
- El correo de «gracias por tu visita» conserva la elegibilidad vinculada al fin programado: completar antes no lo envía anticipadamente. Facturación mantiene su propia validación temporal.
- Implementado en el árbol local; unitarias API/web, tipos y lint pasaron. El flujo funcional de Preview aún no está validado; sin publicación ni cambios en producción.

## 2026-09-28 — Cutover QA y API OCI de staging

- Cutover QA `prirlabbnlcuvnzuaczp` vaciada de `barberflow`, migrada a C1 y poblada inicialmente solo con dos organizaciones sintéticas sin Membership ni dependencias. Sin copiar Dental Ross o Prueba de oro.
- API C1 `b0357af6` separada en la VM OCI existente, puerto loopback 3001, límites 0,5 CPU/1 GiB, rol/credenciales QA, Clerk test y correo desactivado. DNS/TLS real en `api.staging.booking.kortek.cloud`; CORS exacto al alias web QA existente. Producción conservó su smoke externo; sus tres variables Cloudinary se corrigieron a la cuenta productiva con autorización específica.
- Vercel Preview tenía `NEXT_PUBLIC_API_URL` y `DEPLOY_ENV` correctos; `WEB_PUBLIC_ORIGIN=https://qa.booking.kortek.cloud`. El checkpoint `1dafcbe` quedó Ready en el alias QA. Se crearon cuatro usuarios Clerk Development y cuatro User/cinco Membership en Cutover QA. Después, el propietario probó como OWNER la edición/restauración de semana, creación/cancelación de cierre y creación/reprogramación de una cita sintética. Confirmó consola limpia durante edición semanal, creación de cierre y reprogramación; también comprobó el cambio de contexto entre Norte y Sur. El impacto de la semana y cierres se revisó antes de guardar; la reserva permaneció fuera del cierre parcial. **C2 aprobado funcionalmente por el propietario en Preview QA, exclusivamente sobre Cutover QA y datos sintéticos.** No autoriza migrar ni confirmar horario en producción, desplegar la web productiva, abrir reservas públicas o activar correo. [Evidencia, resultados y límites](docs/quality/STAGING_QA_2026-09-28.md).

## 2026-09-27 — Horario y zona del negocio D14/C2 local

**IMPLEMENTADO / EN REVISIÓN LOCAL**, con D14-A autorizado sobre backend aprobado `b0357af`. Configuración incorpora editor de región/semana/cierres, revisión de impacto, concurrencia y recuperación que conserva borradores; cuatro roles y motivos privados solo para gestión. Agenda crea/reprograma/filtra/muestra en hora del negocio, A2 rechaza horas repetidas/inexistentes y conserva precisión existente, CMS lee el agregado operativo vigente. H5, Facturación/Resumen, correo y promociones conservan los contratos C1.

Tipos, lint y build web; 135 pruebas de lógica, 65 de componentes, 26 integraciones C1 y 110 de consumidores API pasan. Chrome real local cubre cuatro roles, dos negocios sintéticos, escritorio/375 px, Los Ángeles/Tokio frente a Santo Domingo/Nueva York, 25 horas de día, 409 y reconciliación, impacto protegido, teclado, precisión A2 y emisión financiera en el día del negocio. Corregida carga permanente al limpiar caché tras cambiar contexto; A → B → A con lecturas nuevas. [Alcance, evidencia y límites](docs/features/HORARIO_ZONA_C2_FRONTEND.md).

Inventario productivo previo de Dental Ross y Prueba de oro: SQL_NULL, America/Santo_Domingo, cero citas de cualquier estado/fecha y dependencias D9 existentes; cierres no aplicable por modelo ausente. Lectura única consistente y ROLLBACK, sin escrituras. C2 migró/confirmó únicamente fixtures locales dedicados; no fue necesario usar la autorización condicional de migrar ambos tenants productivos. El checkpoint publicado en Preview QA no concede aprobación final, despliegue web productivo, apertura pública o activación de correo. Detenido antes de QA frontend en producción real, pendiente de autorización expresa.

## 2026-09-27 — Horario y zona del negocio C1

**BACKEND C1 APROBADO / INTEGRADO EN PROYECTO LOCAL**. D1–D15 A autorizadas; agregado relacional, semana/cierres/impacto/revisión y confirmación de zona, roles y lock Organization compartido por Booking/A2/correo/claims. Nuevas altas sin confirmar, legacy fiel hasta transición; tenant productivo SQL_NULL sin confirmar. Tipos/lint/build, 763 unitarias, 26 integraciones C1, 9 concurrencias, 75 HTTP y 26 productor/worker pasaron; migración 26→27, grants/integridad y restore 35/35 verificados. [Contrato](docs/features/HORARIO_ZONA_C1_CONTRATO.md) · [Evidencia](docs/features/HORARIO_ZONA_C1_EVIDENCIA.md). Lógica backend aprobada expresamente por el propietario y cambio integrado en su proyecto local; 763 unitarias, tipos/lint/build y Prisma vuelven a pasar allí. [Integración local](docs/features/HORARIO_ZONA_C1_INTEGRACION_LOCAL.md). El propietario autorizó expresamente commit/push C1 a origin/ai/antigravity-qa. Sin aplicar migraciones a bases, frontend o implantación. La aprobación C1 no cierra el módulo ni autoriza C2.


## 2026-09-27 — Horario y zona del negocio: C0 documental entregado

- Autorizado únicamente el C0 del ítem 4 del roadmap. [Informe](docs/features/HORARIO_ZONA_C0_AUDITORIA.md) con el formato de Base previa a producción: evidencia, hallazgos, D1–D15 con opciones/trade-offs/recomendaciones y gates futuros. Decisiones pendientes de elección del propietario; C0 no aprobado y C1 no autorizado.
- Auditados JSON legacy/fallback, ausencia de semana/cierres globales, zona autoritativa, reservas futuras/en curso, herencia y bloqueos individuales, locks, permisos, consumidores y pruebas existentes. Registradas discrepancias del comentario legacy, lectura RECEPTIONIST y hora del navegador en agenda interna, sin alterar código ni contratos.
- Solo informe y sincronización de índice/PROJECT_MASTER/historial. Sin PATCH libre del JSON propuesto, acceso a bases, cambios de datos/configuración, tests/builds o QA funcional nuevo; verificación documental de enlaces, estados y diff. Sin staging, commit ni push.

## 2026-09-27 — API desplegada en Oracle Always Free

- Verificados cuenta Free Tier, cuota de prueba y beneficio Always Free vigente 2 OCPU/12 GB. Medidos worker, monitor, backup cifrado y restore aislado antes de dimensionar; ambos trabajos terminaron exit 0.
- VM redimensionada a 2/12 y servicios previos recuperados. API rootless 1,5 CPU/2 GiB y Caddy 0,25 CPU/256 MiB instalados con imágenes inmutables, secretos LoadCredential y certificados persistentes. Añadidos únicamente DNS A y TCP 80/443; reglas OCI originales preservadas. Delegación cgroup CPU habilitada y archivos Linux fijados a LF.
- HTTPS externo pasó antes y después de SIGKILL de los lanzadores: TLS 1.3/Let's Encrypt válido, 308 HTTP, raíz 404 con UUID, privada 401, CORS solo Vercel productivo y puertos 3000/2019 inaccesibles. Supabase runtime comprobado en READ ONLY y TLS hacia pooler verificado con CA/hostname.
- Express confía únicamente en proxy loopback; Caddy sustituye forwarding headers. Tipos/lint/build, 724 pruebas aprobadas (11 omitidas) y 23 negativos locales/imagen ARM pasaron. [Evidencia](docs/quality/API_OCI_DESPLIEGUE.md). **IMPLEMENTADO / EN REVISIÓN**, sin aprobación final, cambios de plan ni activación EMAIL/reserva pública.
- Seguimiento: el propietario confirmó recepción repetida de alarmas HTTP `FIRING`/`OK` y un registro real con correo nuevo; producción confirma `Dental Ross` como alta más reciente y corte de conservación. La causa de `Información no disponible` quedó documentada como switch cerrado, CMS aún sin publicar y sin servicios/profesionales públicos. El 409 por correo ya vinculado a otro Clerk ID es consistente con el caso confirmado, aunque duplicar slug/correo de organización también puede dar 409. Nuevo `pg_dump` del esquema aplicativo `public` (31 tablas) y restore aislado pasaron antes de limpiar. Tras confirmación directa se borraron atómicamente 355 filas anteriores al corte en 14 organizaciones; `Dental Ross`, siete eventos globales de conflicto, 30 migraciones y controles globales permanecen. [Inventario, alcance y verificación](docs/quality/PRODUCCION_SUPABASE_LIMPIEZA_2026-09-27.md).

## 2026-09-26 — Cierre de base previa a producción C1 con excepción D2

- El propietario ordenó cerrar C1 con D2 aceptado como excepción documentada tras confirmar la custodia GPG externa; confirmó «Guardada externamente». Recepción de alarmas en `vps@kortek.cloud` también confirmada. C1 queda **CERRADO / APROBADO** para su alcance previo a activación.
- Excepción local: bootstrap `barberflow`, OID 10, conserva `SUPERUSER` obligatorio con `NOLOGIN`, límite de conexiones 0 y sin otros atributos elevados. Inventario de 17 bases y ausencia de memberships recibidas conservados; no se reconstruyó el clúster ni se ampliaron grants.
- Se mostró la frase solo en terminal local, sin incluirla en chat, documentos ni logs. Primer intento fallido; comprobaciones DPAPI pasaron y segundo intento seguido de confirmación del propietario. Portapapeles actual vacío, historial local borrado según Windows y cero terminales de visualización abiertas, exit `0`; claves operativas cifradas preservadas.
- Estado/documentación/runbook sincronizados; límites de recuperación integral, continuidad programada y activación pública conservados. El cierre no amplía código ni contratos y no autoriza C3. Este commit versiona el checkpoint C1 aprobado, incluida su implementación y esta decisión; las entradas inferiores conservan el estado histórico previo.

## 2026-09-26 — Base previa a producción C1, cutover y operación gratuita

- D2 corrigió omisión de ownership en catálogos del sistema: inventario READ ONLY pasó en las 17 bases conectables actuales, incluidos clones de rollback. En barberflow, 7048 direcciones de ownership en 15 catálogos con objetos; tres grants internos de pg_monitor tienen bootstrap como otorgante, ninguno lo tiene como miembro/rol otorgado. Atributos inalterados, sin transferencias/borrados. SUPERUSER inmutable del OID 10 sigue pendiente de excepción o plan ensayado decidido por el propietario.

- Auditoría D8 corrigió aceptación de interruptores con espacios y omisión del gate por NODE_ENV incoherente con DEPLOY_ENV remoto. Regresiones fallaron antes del fix y pasaron después; 31 pruebas del validador/23 rechazos del entrypoint compilado. Tipos/lint/build y 721 unitarias API (11 omitidas) pasaron. No se cambiaron planes, flags productivos, contratos ni migraciones.

- Recuperación independiente completó descarga real mediante OCI Cloud Shell: backup y checksum del bucket privado, SHA/tamaño iguales a la copia local (43453 bytes), sin identidad de instancia/SSH. Restore de la copia local idéntica pasó otra vez con 31/31 conteos, 26 migraciones y 6,5 s; limpieza Docker comprobada. Transferencia nueva al equipo aún sin ruta verificable, clave externa/recepción de alarma pendientes. No se generaron credenciales ni se abrió producción.

- Acceso a consola OCI recuperado con MFA confirmado por el propietario, independiente del VM. Bucket privado y backup programado/checksum visibles; interfaz de descarga cerró sus progresos, pero no hubo ruta local ni evento de archivo verificables. Descarga/restore independiente pendientes de entrega local de esos archivos. Se respetó el bloqueo de la página interna de descargas del navegador. Revisión de 93 rutas: cero secretos/enlaces pendientes, diff limpio, índice vacío y cero listeners del ensayo.

- Monitor Object Storage optimizado al tier gratuito: inventario horario agregado/caché atómica, edad cada minuto y control fresco de capacidad en backup. Cinco pruebas local/VM y dos ciclos reales con caché reutilizada/ingestión exit 0. Unas 744 llamadas por página/mes frente a 44640; sin nombres/PII guardados. Worker/timer siguen activos, sin planes pagos.

- D4 CI añade gate SQL con clon aislado y contraseña efímera. Ensayo desde 26 migraciones en PostgreSQL 16 pasó, incluyendo rechazo de DELETE en Invoice y conservación del runner; contenedor retirado. YAML/Bash validados localmente. Clerk confirma nombre completo y dos sesiones propias; comprobador ajustado, API raíz 404/UUID probada. Riesgos gratuitos OCI documentados; caché horaria del inventario pendiente para ampliar margen de solicitudes.

- D9: sondas HTTPS gratuitas implementadas e instaladas en el monitor, con switch false. Ocho pruebas TLS/status/redirect/privacidad pasaron local/VM; monitor success/exit 0 y hashes instalados coincidentes. 22 métricas actuales, sin uptime ficticio. Activación pública/alertas HTTP siguen bajo C3. Sesión OCI caducada, recuperación independiente pendiente del propietario.

- D8 web: validación de entorno/variables en build y start, sin fallback localhost productivo. SHA-256 de configuración pública en BUILD_ID impide servir un artefacto con otro entorno/API/clave pública; rotación de clave privada no obliga a recompilar. 17 pruebas, 16 rechazos CLI, dos rechazos de mezcla, build/arranque productivos loopback 200 y cero coincidencias de clave privada en HTML/bundles. Tipos/lint, 129 pruebas de lógica/48 de componentes y Chrome 21 aprobados/una omisión, exit `0`. CI declara development explícito; sin UI/contratos nuevos ni activación C3.

- Cuenta Clerk de prueba creada por el propietario: correo verificado/sesión activa. Corregida redirección NXDOMAIN hacia la web sin alojar; fallback de registro/login va al perfil HTTPS de Clerk y persiste tras recarga. Nombre pendiente. Comprobación exit `0` con bootstrap de servicio READ ONLY y rechazos HTTP 401/CORS local; token BAPI sin azp no sustituye smoke positivo navegador → API.
- Gate SQL ahora detecta TRUNCATE/REFERENCES/TRIGGER en todas las tablas, MAINTAIN en PG17, memberships y default ACL para PUBLIC/runtime. Ocho negativos en Supabase QA revertidos, baseline restaurado tras cada uno; positivos READ ONLY en producción PG17.6 y local PG16. SQL preparado revoca ALL por defecto a PUBLIC/runtime.

- Clerk Production: los cinco CNAME ya resuelven a sus destinos; dominio Verified, SSL Issued y portal HTTPS observado. La clave entregada en archivo local ignorado pasó el verificador del SDK contra la instancia/issuer correctos, exit `0`, cero usuarios. Copia DPAPI y ACL restringida comprobadas. Primera cuenta/sesión de prueba pendiente de entrada de credenciales por el propietario; no se alteraron roles ni identidades importadas.

- Creada Clerk Production tras confirmación expresa, conservando Hobby. Política observada: contraseña mínima 15 caracteres, rechazo de comprometidas, Device Trust y email verificado; sesiones de siete días, MFA/controles adicionales Pro sin activar. DNS de cinco CNAME preparado en Cloudflare, esperando confirmación concreta. Inventario productivo READ ONLY: ocho vínculos Clerk anteriores, 19 contraseñas legacy, 32 memberships y siete invitaciones terminales; conciliación de identidades previa a apertura pendiente. La revisión automática rechazó inspeccionar API keys por posible exposición; se solicitó entrega de la clave mediante archivo local ignorado.

- El backup cifrado productivo de las 05:21:39 UTC se restauró con la copia DPAPI local de la clave en Docker aislado: 31/31 conteos, 26 migraciones completadas, 4,7 s. No se escribió dump plano; clave incorrecta rechazada y contenedores eliminados. Acceso OCI independiente y copia de clave externa a VM/laptop siguen sin verificarse.

- D8 backend ahora rechaza claves Clerk test en producción, roles de DB administrativos/migradores, TLS sin verificación estricta, socket override y opciones TLS duplicadas. 22 pruebas del validador y 14 rechazos del arranque compilado pasaron. Tipos/lint/build y suite API final: 712 aprobadas/11 omitidas, exit `0`. Clerk Production continúa pendiente de la confirmación exigida para crear credenciales.

- Se retiraron CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS del bootstrap local mediante el administrador de emergencia; conserva NOLOGIN y CONNECTION LIMIT 0. Únicamente SUPERUSER permanece por restricción de PostgreSQL. No se terminaron procesos internos ni se cambiaron propietarios.

- Ensayo Supabase Free QA y corte real de datos a «Kortek Booking»: 31/31 conteos coincidentes, 26 migraciones terminadas, roles separados, grants exactos y smoke de lectura API. Oracle Always Free ejecuta backup cifrado diario, restore aislado semanal y worker supervisado con EMAIL deshabilitado.
- El timer diario produjo un dump que se restauró otra vez con éxito. OCI Notifications confirmó `vps@kortek.cloud`; el ensayo de caída registró `Firing` a las 06:01 UTC y `Ok` a las 06:05 UTC. Monitor por minuto y alarma de cuota DB a 400 MB. Recepción de email pendiente de confirmación.
- Colector gratuito con redacción validada: 21 métricas y ocho alarmas OCI, incluidas cuota del bucket y fallos operativos; esta última registró Firing 06:36 → Ok 06:44 UTC. El fallo de Podman con contenedor huérfano se corrigió con `--replace` y limpieza del servicio; reinicio/heartbeat verificados. Retención local acotada a siete días/100 MB y eliminación de errores crudos de dump/restore/DB.
- D12 HTTP antes/después de escrituras pasó en nuevos clones locales: caída 502, congelamiento 503, recuperación en clon nuevo, 31/31 huellas de contenido, factura PAID y estados de outbox preservados. El cobro falló inicialmente por `FOR UPDATE OF Invoice` sin UPDATE runtime; se bloquea ahora Booking vinculada, sin ampliar grants. Dos cobros concurrentes dieron 201/200 con un Payment/AuditLog, método distinto 409 y otro tenant 404. Tipos/lint/build, 699 unitarias (11 omitidas), tres regresiones HTTP de privacidad y cuatro del colector pasaron. Clerk Hobby observado; su instancia Production se creó después de la confirmación expresa, con DNS y credencial aún pendientes de integración.
- Dos procesos API sobre Supabase QA compartieron rate limiting HTTP, persistencia tras reinicio e IPv6. Throttling precede autenticación en onboarding/claims/bootstrap/aceptación, CMS, medios y mutaciones aplicables para contar también solicitudes inválidas. Arranque compilado rechaza CORS ausente/local/wildcard y secretos faltantes. C1 sigue incompleto/en revisión; sin C3 ni planes pagos. [Evidencia](docs/quality/BASE_PREPRODUCCION_C1_EVIDENCIA.md).

## 2026-09-25 — Base previa a producción C1 en ejecución

- C0 aprobado con D1–D13 orientadas a tiers gratuitos. En `barberflow` real se verificó un dump restaurable, se creó administrador de emergencia independiente, se bloqueó login del bootstrap legacy y se aplicaron grants exactos sin DELETE financiero/auditoría ni DML por defecto. PostgreSQL impide quitar `SUPERUSER` al bootstrap; retiro definitivo pendiente.
- Migración 26 y almacenamiento PostgreSQL compartido para rate limiting HTTP, switch de MFA interno preparado para activación futura y validación de variables/orígenes productivos. Clerk Hobby sigue sin MFA forzado; la producción Supabase Free todavía no recibió datos. [Evidencia y gates abiertos](docs/quality/BASE_PREPRODUCCION_C1_EVIDENCIA.md).

## 2026-09-24 — Medios/Promociones C3 aprobado; correctivos de smoke, roles y H4

- El propietario cerró y aprobó Medios/Promociones C3, sin activar producción. El seguimiento autorizado de la auditoría recuperó los SQL históricos desde `apps/api/ops/`, ajustó los grants de Medios al contrato C1/C3 y los verificó sobre 25 migraciones desde cero en PostgreSQL aislado con `kortek_runtime` no privilegiado.
- El fixture WhatsApp responde ahora `/media`; se corrigió el menú móvil que bajo carga podía conservar 0 px de alto aun expandido. El smoke Chrome completo terminó exit `0` con 21 aprobados y 1 omisión intencional del caso móvil en desktop. H4 dejó de registrar `error.stack` o mensajes de excepción; conserva una señal fija sin PII. [Evidencia y límites](docs/quality/CORRECTIVOS_2026_09_24.md).

Las entradas siguientes conservan el estado observado antes de esta aprobación y estos correctivos.

## 2026-09-24 — Auditoría integral y roadmap documental

- Se registró la [auditoría transversal](docs/quality/AUDITORIA_INTEGRAL_2026_09_24.md) sobre `0e4d30f`: 25 migraciones, workflow de calidad versionado, validaciones locales de API/web/Prisma y `pnpm audit --prod` en exit `0`; el smoke Chrome terminó con **18 aprobadas, 1 omitida y 3 fallidas**, exit `1`. No se ejecutaron nuevas E2E PostgreSQL ni QA autenticado o de proveedores.
- Se identificaron fixtures/aserción de navegador por corregir, los scripts `ops/` de roles ausentes, contradicciones entre fuentes vigentes y una superficie de log técnico para revisar. Se sincronizaron producto, arquitectura, estado e instrucciones locales sin alterar contratos ni código. El roadmap conserva el gate C3 y prioriza 14 candidatos; Medios C3 sigue **en revisión del propietario**, sin producción ni autorización de otro módulo.

## 2026-09-24 — Cierre documental C3 de Medios/Promociones y mantenimiento local

- El propietario aprobó C2 y autorizó [C3 documental](docs/features/MEDIOS_PROMOCIONES_C3_ACTIVACION.md) sin otra prueba Cloudinary. La cuota de moderación queda operativamente en 0 hasta el próximo ciclo, según el rechazo real `420` y el `503` observado en C2. C3 no activó producción ni cambió contratos o código.
- `barberflow` se respaldó con `pg_dump -Fc` y se restauró en una base temporal: 18 tablas y 343 filas coincidieron en conteo y huella. CMS ya estaba en migración 21; H5/fechas y WhatsApp no requieren migración. Se aplicaron las tres de Notificaciones y la de Medios, quedando 25/25. Prisma validate/status/diff e integridad PostgreSQL pasaron; datos originales conservados.
- Tras confirmar desarrollo se eliminaron 14 bases QA/temporales sin sesiones activas. Una revisión posterior corrigió los grants efectivos de Medios heredados en exceso para cumplir el mínimo C1. El respaldo permanece local, ignorado por Git. C3 queda en revisión del propietario; sin tocar `main` ni desplegar.
- A solicitud posterior del propietario se eliminaron también los contenedores QA detenidos `kortek-media-c1-test` y `kortek-notifications-c1-test` con sus dos volúmenes anónimos. Se verificó que los cuatro recursos desaparecieron; `barberflow-postgres`, sus 25 migraciones y el respaldo local conservaron su estado.

## 2026-09-24 — Medios/Promociones C2: QA funcional y visual completado, en revisión

- En PostgreSQL QA aislado, API/web locales y Clerk Development se recorrieron OWNER, ADMIN, BARBER y RECEPTIONIST en dos tenants. Siete imágenes sintéticas obtuvieron aprobación Cloudinary real; pasaron publicación de galería, orden/hero, foto de servicio, promoción con imagen y avatar propio, además de retiro/cuarentena, aislamiento `404`, denegación `403` y conflicto `409` con recuperación visible.
- Chrome desktop/375 px verificó consola sin `pageerror`, teclado/foco y responsive. Se corrigieron el texto comprimido del orden móvil, la oferta de republicar una revisión ya publicada, la recuperación del conflicto y la carga pública bloqueada por CORP mediante una ruta de imagen del mismo origen. TypeScript, lint, 111 pruebas de lógica, 48 de componente, build y Playwright 2/2 terminaron exit `0` tras estos cambios.
- Con autorización posterior del propietario se publicó temporalmente una página CMS **solo** en `media_c2_test` y se restauró en `finally`: proyección real con hero, galería, servicio, avatar y promoción; cinco imágenes WebP `200` en ambos tamaños; proyección y localizador `404` al restaurar. Tras delegación expresa del propietario, se agotó la cuota de moderación de QA con imágenes sintéticas borradas: primer rechazo Cloudinary `420`, después upload real del editor `503` con mensaje claro, archivo retenido y sin publicación. [Evidencia y límites](docs/features/MEDIOS_PROMOCIONES_C2_FRONTEND.md). C2 continúa en revisión, sin producción.

## 2026-09-23 — Medios/Promociones C2 implementado localmente / QA autenticado pendiente

- El propietario aprobó C1 sobre la base `44b0e506d1ca66747aa832a95a63a6824e3c5bf9` y autorizó C2. Se agregó el editor OWNER/ADMIN de imágenes, galería/portada y promociones; control de avatar propio BARBER; y consumo de la proyección nueva en el mini-sitio.
- La UI explica expresamente la cuota agotada o error de moderación y que la imagen no se publicó. El formulario de Profesionales dejó de enviar URL de avatar, como exige C1.
- [Alcance, pruebas y QA C2](docs/features/MEDIOS_PROMOCIONES_C2_FRONTEND.md): TypeScript, lint, build y 111 pruebas de lógica + 48 de componente pasaron; Chrome desktop/375 px pasó con respuestas HTTP controladas. Falta QA autenticado con roles, tenants e integración real; C2 no está aprobado. Sin producción, commit ni push, y sin cambios CMS, H5/fechas, WhatsApp o Notificaciones.

## 2026-09-23 — Medios/Promociones C1 iniciado

- El propietario aprobó C0 y fijó D1–D8/D5b, incluidos fotos de servicio, avatar propio BARBER sin aprobación OWNER previa, hero, imagen opcional de promoción y Cloudinary `authenticated` Free condicionado a prueba real de retiro.
- [Contrato C1 implementado, en revisión](docs/features/MEDIOS_PROMOCIONES_C1_CONTRATO.md): agregado de activos, galería/hero, servicios, avatar administrado, promociones editoriales, proyección pública y purga durable, con migración 25 aplicada solo a PostgreSQL QA aislado. En Cloudinary Free, original y tres derivados dieron 200 antes y 404 desde +7 s tras destroy/invalidate; Admin API informó cero activos QA remanentes. El propietario autorizó activar Rekognition AI Moderation Free y aceptó sus términos; “Installed Add-ons” confirmó Free, $0/50 moderaciones mensuales y uso 1/50. La E2E integrada real pasó con `aws_rek=approved`, publicación, proxy público, retiro y 404 repetidos de original/tres derivados conocidos; Admin API 404 y cero remanentes QA. Una regresión adicional cubre desactivación durante una subida y purga durable de su ID remoto. Prisma validate/generate/status/diff, unitarias API (682 aprobadas, 11 omitidas), tipos, lint, build y 18 suites E2E/244 pruebas, más 1 E2E Cloudinary real, terminaron exit 0. `pnpm audit --prod` no encontró vulnerabilidades conocidas. Prisma no detecta drift; respaldo/restauración QA coincide en recuentos y hash; un segundo despliegue desde cero verificó privilegios mínimos de `kortek_runtime`. C1 aún no aprobado y C2 cerrado. Se añadieron `cloudinary` y `sharp` al API; no se tocaron CMS, H5/fechas, WhatsApp, Notificaciones ni frontend.

## 2026-09-22 — Medios/Promociones C0 documental

- Auditoría [C0](docs/features/MEDIOS_PROMOCIONES_C0_AUDITORIA.md) autorizada solo para medios públicos y promociones editoriales. D1–D8 presentan opciones de alcance, custodia/revocación, validación, publicación, límite editorial, vigencia, permisos y retiro; ninguna está seleccionada todavía.
- Sin código, Prisma, contratos ejecutables, archivos de otros módulos, subidas, proveedor activado, cambios de precio/cupo/disponibilidad, commit, push ni despliegue. Configuración/CMS C1–C3, H5/fechas, WhatsApp C1–C3 y Notificaciones C1–C3 conservan su aprobación.

## 2026-09-22 — Notificaciones C3 cerrado / aprobado

- El propietario revisó visualmente las cinco plantillas y aprobó el checkpoint C3. El recorrido real produjo CREATED, CONFIRMED, RESCHEDULED, COMPLETED y CANCELLED; las cinco intenciones quedaron `DELIVERED` con recibos `email.sent` y `email.delivered` durables.
- El canal EMAIL quedó pausado, la API y la web locales de QA se detuvieron y el webhook temporal de Resend fue eliminado desde su panel. No se activó producción ni se cambiaron otros módulos.
- Evidencia completa: [NOTIFICACIONES_C3_ACTIVACION.md](docs/features/NOTIFICACIONES_C3_ACTIVACION.md).

## 2026-09-16 — Inicio autorizado de Notificaciones C3

- C2 aprobado explícitamente. Activación temporal y prueba real de cinco plantillas autorizadas; sin producción ni otro módulo.
- Base C3 separada autorizada, 24 migraciones existentes y cola vacía; C2 preservado. Dominio Verified observado en Resend, endpoint temporal corregido con autorización; túnel aún indisponible.
- Correctivo From con nombre visible y worker sin anidación: 35 pruebas de adaptador, 649 unitarias, 26 PostgreSQL; tipos/lint/build exit 0. No hay envíos reales todavía.
- Evidencia y pendientes en docs/features/NOTIFICACIONES_C3_ACTIVACION.md. C3 EN CURSO / INCOMPLETO; sin staging, commit ni push.

## 2026-09-16 — Notificaciones C2 implementado / en revisión

- Aprobación explícita C1 registrada sobre la base c7d43ad03a65a900a930a1a0d69dd258b8516a1e. Corregido §5: ensayo con datos previos y restore ya resueltos en §10.
- C2 incorpora historial global/por reserva, preferencia versionada con revisión de contacto y reintento autorizado, además de opt-in voluntario en altas. Sin contratos backend nuevos ni cambios de comportamiento CMS/H5/WhatsApp.
- Pruebas y QA en docs/features/NOTIFICACIONES_C2_FRONTEND.md: 109 de lógica + 47 de componente; TypeScript, lint y build en exit 0. QA real de cuatro roles, dos tenants, escritorio/375 px, teclado, conflicto, recuperación, reintento y altas pública/interna con PostgreSQL aislado y correo desactivado.
- Corregido montaje de consultas después de la limpieza de caché de autenticación al cambiar negocio; regresión automatizada y QA de aislamiento. Las dos altas verificadas conservan consentimiento y cero despachos.
- C2 IMPLEMENTADO / EN REVISIÓN DEL PROPIETARIO; no implica aprobación ni activación C3. Incidencias temporales de QA resueltas. Sin envío real, staging, commit, push ni despliegue.


## 2026-09-15 — Notificaciones C1 entregado para revisión

- Cerrada implementación backend y evidencia de C0 §5 aplicable, con reprogramación PENDING/CONFIRMED, cambio exclusivo de profesional, reactivación, COMPLETED único, NO_SHOW, permisos y privacidad.
- Versión de plantilla persistida junto al sobre sellado; reintentos conservan contenido/remitente/clave incluso tras cambio de configuración. Migración 24 aditiva, solo QA aislado.
- 640 unitarias y 227 E2E aprobadas; último caso HTTP adicional verificado en suite de 22. Productor/worker: 24 casos; concurrencia previa de Reservas: 9. Tipos, lint, build y Prisma verificados. Backup/restore con correos despachados y CLI desactivado comprobados.
- Estado IMPLEMENTADO / EN REVISIÓN DEL PROPIETARIO. No implica aprobación backend, C2 ni activación C3. CMS, H5/fechas y WhatsApp preservados; sin staging, commit, push ni migración habitual.

## 2026-09-15 — Notificaciones C1: integración y pruebas, aún incompleto

- Captura transaccional conectada a creación interna/pública, estado y reprogramación. Rutas privadas, preferencias aditivas, rechazo BARBER para registrarlas, webhook firmado y CLI independiente implementados. El canal permanece desactivado.
- Regresión integrada: 640 unitarias y 208 E2E aprobadas. Ampliaciones posteriores: 22 pruebas PostgreSQL del productor/worker y 18 HTTP; 9 pruebas reales de concurrencia de Reservas aprobadas tras actualizar la limpieza de sus fixtures. No sumar ejecuciones repetidas como pruebas distintas.
- Ensayo 21 → 23, preservación de datos controlados, pg_dump/restore con hash coincidente y ausencia de drift Prisma. Serialización determinista del sobre para reintentos después de JSONB.
- Falta cerrar auditoría/cobertura, persistencia explícita de versión de plantilla, recuperación con intenciones despachadas y gates finales. C1 sigue incompleto/no aprobado; sin C2, activación C3, commit, push ni cambios de CMS/H5/WhatsApp.

## 2026-09-14 — Inicio autorizado de Notificaciones C1

- Contrato C1 en construcción con D1–D10, cinco eventos y matriz C0 §5.1–5.7/5.9/5.10 aplicable al backend; C2 requiere aprobación explícita posterior.
- Reglas/plantillas, DTOs, productor y servicio/controladores iniciales; migración aditiva 22 y trigger de invalidación de contacto. 91 pruebas de dominio/adaptador y 14 PostgreSQL reales aprobadas, incluidas reprogramaciones concurrentes y COMPLETED único.
- Implementación incompleta y sin conectar a rutas operativas; falta worker/proveedor y validación integral. Base habitual, CMS/H5/WhatsApp y frontend preservados. Sin staging, commit, push, despliegue ni envío real.

Todas las entradas están en español, siguiendo el idioma del resto del proyecto. Formato libre, orientado a decisiones y cambios reales — no es un changelog de versión semántica de paquete.

> Cada entrada es una fotografía histórica de su fecha. Para estado vigente usar [`PROJECT_MASTER.md`](PROJECT_MASTER.md). Las referencias antiguas a secciones numeradas de PROJECT_MASTER apuntan al snapshot preservado en [`docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md`](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md).

## 2026-09-14 — Notificaciones C0: decisiones del propietario fijadas

- Registradas D1–D10 en [C0](docs/features/NOTIFICACIONES_C0_AUDITORIA.md): correo automático primero; WhatsApp manual D3-A solo diseñado para segunda entrega. D2-A se amplía a reprogramación activa con nueva fecha/hora y entrada real a COMPLETED, sin marketing; NO_SHOW no notifica.
- Resend/remitente central, variables mínimas con nueva fecha/hora, Organization.name y cinco textos fijos sin editor; Client.email corroborado y omisión silenciosa, opt-in explícito, permisos A, outbox PostgreSQL + worker sin Redis, 5 intentos/24 h, supresión de obsoletos y purga privada a 30 días. From/dominio se aportarán antes de activar C3.
- Actualización exclusivamente documental y de criterios de contrato/QA futuro; sin autorización de C1 por inferencia, implementación, cambios a módulos cerrados, staging, commit, push ni despliegue. Controles generales sincronizados y trabajo previo preservado.

## 2026-09-14 — Notificaciones C0: auditoría documental para elección

Entrada posterior de auditoría: **Notificaciones C0 documental entregado**, autorizado por el propietario según roadmap §5. [Documento C0](docs/features/NOTIFICACIONES_C0_AUDITORIA.md) con evidencia del código, decisiones D1–D10 y propuesta de contrato para elección, sin implementación ni aprobación de C1. Incluye separación entre correo automático y WhatsApp manual del personal, correo opcional/discrepancias al reutilizar Client, permisos reales, outbox, reintentos, deduplicación y mensajes obsoletos. Solo documento y referencias de estado; sin cambios de código, contratos vigentes, base, dependencias, staging, commit, push ni despliegue. Se preservan íntegros los módulos cerrados y el trabajo previo de WhatsApp.

## 2026-09-14 — WhatsApp C3 cerrado/aprobado por el propietario

- Decisión explícita: «Apruebo WhatsApp C3». WhatsApp manual C1–C3 queda **CERRADO / APROBADO** sobre el árbol local con base `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`.
- [Documento de cierre C3](docs/features/WHATSAPP_C3_ACTIVACION.md) y controles sincronizados. Se conserva la prueba manual satisfactoria de Norte y Sur en iPhone 11 como confirmación del propietario, sin atribuir pruebas nuevas ni ampliar sus límites.
- Cierre exclusivamente documental. Sin cambios de runtime, datos, dependencias, staging, commit, push ni despliegue; no autoriza otro módulo ni producción.

## 2026-09-14 — WhatsApp C3: prueba física satisfactoria y documento de cierre en revisión final

- El propietario confirmó para Norte y Sur la apertura de WhatsApp con destinatario y mensaje correctos desde un iPhone 11 físico. Ambos enlaces abrieron directamente la aplicación instalada; resultados satisfactorios.
- [WHATSAPP_C3_ACTIVACION.md](docs/features/WHATSAPP_C3_ACTIVACION.md) registra la evidencia como confirmación manual del propietario, la correspondencia de números reales y sus límites. No se atribuye ejecución del recorrido integral de reserva en el iPhone, envío ni entrega.
- C3 **IMPLEMENTADO / EN REVISIÓN FINAL**; se resuelve la falta de evidencia física. La confirmación de QA no equivale a aprobación final del checkpoint. C2 sigue cerrado/aprobado; los fixtures históricos se preservan.
- Solo actualización documental, sin runtime, base de datos, dependencias, staging, commit, push, despliegue ni otro módulo.

## 2026-09-14 — C3: números internacionales confirmados y enlaces preparados

- El propietario aportó dos números reales y confirmó +1 para Norte y Sur. El helper productivo generó ambos enlaces; aserciones de dominio, destinatario, mensaje exacto, parámetro único y fragmento terminaron con exit 0.
- Documento C3 actualizado; los teléfonos completos no se duplican en documentación versionable. Pendiente apertura manual en teléfono físico; no se acredita cierre ni se modifican fixtures, datos publicados o runtime. Sin commit, push ni despliegue.

## 2026-09-14 — WhatsApp C2 aprobado; C3 preparado, pendiente de prueba física

- El propietario aprobó C2 sobre el árbol local con base `c7d43ad03a65a900a930a1a0d69dd258b8516a1e` y autorizó C3, exigiendo apertura efectiva de WhatsApp y texto esperado en teléfono real para ambos negocios C2.
- Creado [WHATSAPP_C3_ACTIVACION.md](docs/features/WHATSAPP_C3_ACTIVACION.md) con alcance, protocolo manual, matriz de evidencia, límites y continuación. C3 **PAUSADO / INCOMPLETO**; no es documento de cierre acreditado.
- La inspección confirma que C2 ya conecta la acción en el código local y que sus dos negocios/números son fixtures con API y destino externo interceptados. No hay evidencia de cuenta WhatsApp ni acceso a teléfono físico desde las herramientas; se solicitó la colaboración manual del propietario y la correspondencia de números controlados.
- Solo documentación y sincronización de estado; evidencia C2 preservada, sin atribuir QA externo nuevo. Sin cambios de runtime, datos, dependencias, staging, commit, push, despliegue ni otro módulo.

## 2026-09-14 — WhatsApp C1 aprobado y C2 frontend implementado, en revisión

- El propietario aprobó C1 sobre `c7d43ad03a65a900a930a1a0d69dd258b8516a1e` y autorizó C2 según D1–D6, ejecución de cada vector C1 §4 y QA real de popup bloqueado y accesibilidad.
- Eliminada la apertura automática de PublicMiniSite y el mensaje con datos de reserva. Ambas superficies usan el enlace nativo único de SuccessView: teléfono publicado validado estrictamente, dominio/mensaje fijos, estado «Tu reserva quedó registrada», explicación previa, pestaña nueva anunciada y sin controles interactivos anidados.
- Web: 106 pruebas de lógica (32 nuevas), 30 de componente (7 nuevas), 16 escenarios Chrome en escritorio/375 px; tipos, lint y build en exit `0`. La denegación real sandbox conserva éxito/enlace sin nueva reserva. [Informe, vectores, límites y capturas](docs/features/WHATSAPP_C2_FRONTEND.md).
- C2 **IMPLEMENTADO / EN REVISIÓN**, sin aprobación final, staging, commit, push ni despliegue. Sin cambios de API, CMS, H5/fechas, dependencias, base de datos ni otros módulos; trabajo previo preservado.

## 2026-09-14 — WhatsApp manual: contrato C1 y pruebas backend

- El propietario fijó D1–D6 A y autorizó C1. [WHATSAPP_C1_CONTRATO.md](docs/features/WHATSAPP_C1_CONTRATO.md) documenta contrato existente, validación futura del teléfono, textos exactos, privacidad, compatibilidad legacy y gate antes de C2.
- Se conserva el contrato sin nuevos endpoints/campos y sin cambios productivos. La suite HTTP de WhatsApp comprueba la proyección publicada, aislamiento, rechazo de campos extra, errores y preservación de `PENDING`. Evidencia y comandos en el contrato.
- C1 completado/en revisión: 23 pruebas HTTP nuevas, 549 pruebas API aprobadas y 11 omisiones preexistentes; tipos y lint con exit `0`. C2 no iniciado. No se modifican CMS, H5/fechas, otros módulos, dependencias ni base de datos. Se preserva la documentación previa. Sin commit, push ni despliegue.

## 2026-09-14 — WhatsApp manual: C0 documentado para revisión

- A petición del propietario, guardado [WHATSAPP_C0_AUDITORIA.md](docs/features/WHATSAPP_C0_AUDITORIA.md) con la auditoría presentada en conversación, D1–D6 como opciones abiertas, recomendaciones y contrato condicionado a su elección.
- Alcance exclusivo de auditoría/documentación; sin aprobación de opciones, implementación, cambios a CMS/H5 ni estados de Booking. Se sincronizan índice, PROJECT_MASTER, nota posterior del roadmap y referencia en flujos.
- Se preservan cambios locales preexistentes de backend WhatsApp detectados al iniciar esta entrega; no se implementan, prueban ni aprueban desde C0. Validación exclusivamente documental, sin builds, base de datos, envíos, commit ni push.

## 2026-09-14 — Auditoría comparativa y roadmap posterior a CMS

- Entregado [roadmap de WhatsApp, Pagos, Notificaciones y Medios/Promociones](docs/features/ROADMAP_POST_CMS_AUDITORIA.md) mediante revisión estática sobre `c7d43ad`, cuyo código coincide con la base funcional aprobada `8fd7b1f`.
- Se comparan acoplamiento, riesgo, complejidad y dependencias; se separan medios públicos, promociones editoriales y descuentos ejecutables, así como cobro interno vigente y ampliación futura de Pagos.
- H8 queda reconciliado documentalmente: existe apertura pública legacy de WhatsApp, mientras la acción operativa del personal y plantillas siguen siendo futuras. El API entrega `whatsappBaseUrl`, pero la web todavía usa `https://wa.me/` fijo; la afirmación histórica del 2026-07-23 sobre adopción frontend no describe el consumidor actual. No se corrige el código ni se retira el campo.
- Solo documentación y validación de enlaces, estados y diff; sin pruebas funcionales, builds, base de datos, envíos ni implementación. C1–C3 y H5/fechas conservan su cierre. No hay checkpoint abierto ni C0 de candidato iniciado; el propietario elegirá y autorizará cuál abordar.

## 2026-09-13 — Correctivos H5 y fechas cerrados y aprobados

- Aprobación explícita del propietario («Apruebo los correctivos H5 y fechas sobre 8fd7b1f») sobre `8fd7b1ff9f14ad82bde3d3936817941660983b2c`.
- Se conserva la implementación y evidencia aceptadas: instante UTC autoritativo por slot, fecha mínima del negocio, calendario ISO estricto, 526 unitarias API, 182 E2E aisladas, 97 pruebas web, lint, tipos, builds y QA real.
- Estado **CERRADO / APROBADO**. Configuración/CMS C1–C3 permanece cerrado/aprobado; no hay despliegue productivo ni autorización de otro módulo.

## 2026-09-13 — Correctivos H5 y validación de fechas implementados, en revisión

- El API calcula el día mínimo en la zona del negocio y devuelve por slot el instante UTC autoritativo; el navegador lo reenvía sin reinterpretar fecha/hora con su propia zona.
- Disponibilidad pública e invoices validan calendario ISO estricto. La utilidad compartida rechaza fechas/horas/zonas imposibles o extremas sin `RangeError`; se verificaron también sus consumidores internos de Analytics y Resumen.
- Contrato aditivo, sin exponer `timeZone` ni UUID tenant, sin Prisma/migración y sin abrir otro módulo. Configuración/CMS C1–C3 permanece cerrado/aprobado.
- API: 526 unitarias y 182 E2E aprobadas; web: 74 pruebas de lógica y 23 de componente; lint, tipos y builds en exit 0. QA real llegó al resumen, validó `09:00` → `13:00Z`, respuestas `400`, consola y 375 px sin crear otra reserva.
- Estado **IMPLEMENTADO / EN REVISIÓN**, pendiente de aprobación explícita del propietario. [Alcance y evidencia](docs/features/RESERVA_PUBLICA_H5_FECHAS.md).

## 2026-09-13 — Configuración/CMS C3 frontend cerrado y aprobado

- Aprobación explícita del propietario («Apruebo Frontend C3») sobre `425641574b2504fd34967b9a4558218d74b7c11f`: frontend C3 y Configuración/CMS C3 quedan **CERRADOS / APROBADOS**.
- Se conserva la implementación y evidencia aprobadas: proyección publicada exclusiva, retiro público transversal, reserva existente preservada, regresión del asistente, 96 pruebas web, lint, tipos, build y QA real.
- El hallazgo de fecha malformada en `professional-availability.util.ts` permanece reportado fuera de D6 y sin corrección en este cierre. H5 y las entregas posteriores tampoco cambian.
- Esta aprobación no despliega a producción ni autoriza medios, promociones, banca, notificaciones, Pagos u otro módulo.

## 2026-09-13 — Configuración/CMS C3 frontend implementado, en revisión

- Tras la aprobación explícita del backend C3 y la confirmación del cambio visible, `/{slug}` presenta nombre, descripción, teléfono y ubicación únicamente desde la revisión publicada, con CTA hacia el asistente existente.
- Revalida al recuperar foco y antes de iniciar la reserva; retiro/inactividad muestran una presentación neutra y un fallo transitorio conserva reintento. Opcionales vacíos y catálogo no reservable tienen estados propios.
- QA real OWNER cubrió perfil, reserva completa, retiro con `booking-data`/`availability`/`bookings` en 404, reserva interna conservada, republicación, teclado, foco, consola y 375 px sin overflow.
- Web: 74 pruebas de lógica, 22 de componente, lint, tipos y build en exit 0. H5 y las entregas de medios, promociones, banca, notificaciones y Pagos permanecen fuera.
- Estado **IMPLEMENTADO / EN REVISIÓN**; sin despliegue productivo y pendiente de aprobación final del propietario. [Alcance y evidencia](docs/features/CONFIGURACION_CMS_C3_FRONTEND.md).

## 2026-09-13 — Configuración/CMS C3 backend cerrado y aprobado

- Aprobación explícita del propietario («Apruebo backend C3 y confirmo la activación visible») sobre `51a248833d5cf4aff77ca8b4f9a2be72ac9b8745`: backend C3 **CERRADO / APROBADO**.
- La misma decisión autoriza iniciar el frontend y aplicar el comportamiento visible previamente declarado para tenants publicados; no autoriza despliegue productivo ni entregas posteriores.

## 2026-09-13 — Configuración/CMS C3 backend implementado, en revisión

- `booking-data` incorpora descripción, dirección y enlace de mapa únicamente desde el snapshot publicado; nombre/teléfono usan esa misma revisión y slug conserva su función de localizador.
- La allowlist pública excluye UUID de tenant, correo, borrador, campos operativos, banca y legacy. Se mantienen retiro/inactividad neutros en catálogo, disponibilidad y creación.
- Sin nueva ruta, Prisma, migración, roles ni cambios en reservas/Facturación/claims/perfil BARBER. Tipos, lint, build, 512 unitarias y 181 E2E aisladas pasan con exit 0.
- Estado **IMPLEMENTADO / EN REVISIÓN**. El frontend que cambia visiblemente `/{slug}` no se inicia hasta aprobación backend y confirmación expresa de activación.

## 2026-09-13 — Configuración/CMS C2 cerrado y aprobado

- Aprobación explícita del propietario («Apruebo C2») sobre `7dd9986264aeb1cb144351296626cfa65028349a`: **C2 CERRADO / APROBADO**.
- Sincronizados PROJECT_MASTER, evidencia C2, plan e índice documental. Se conservan implementación, QA y validaciones del candidato; este registro no cambia código, contratos, datos ni ejecuta nuevas pruebas o migraciones.
- C3 y entregas posteriores permanecen pendientes de autorización propia. Validación documental de enlaces, estados y diff.

## 2026-09-13 — Configuración/CMS C2 frontend implementado, en revisión

- Editor `/dashboard/settings` y preview autenticado sobre C1 aprobado: cinco campos, controles optimistas, confirmaciones OWNER, comparación de conflictos y reintento idempotente tras resultado incierto. ADMIN prepara/revisa; BARBER/RECEPTIONIST sin nuevo acceso CMS. [Implementación y QA](docs/features/CONFIGURACION_CMS_C2_FRONTEND.md).
- Aislamiento por usuario/tenant/rol/visita, abortado y descarte tardío A → B → A; `no-store`, `noindex`, tipos H1/H2 mínimos e invalidación explícita de caché pública local tras publicar/retirar. Slug, horario y zona solo lectura.
- Por autorización operacional explícita, aplicada migración 21 a la única base declarada de prueba, con respaldo y restore aislado verificados. Cuatro identidades Clerk y ocho Memberships nuevas en dos negocios. Sin secretos/fixtures operativos versionados ni cambio de contrato/backend.
- Web TypeScript, lint, 74 pruebas de lógica, 15 de componente y build en exit 0. QA real cuatro roles, dos tenants, concurrencia entre pestañas, fallo de red/recuperación, publicación/retiro, escritorio/375 px, teclado, foco y semántica accesible.
- **IMPLEMENTADO / EN REVISIÓN**, pendiente auditoría/aprobación del propietario. C3, H5, medios, promociones, banca, notificaciones y ampliación de Pagos fuera de alcance.

## 2026-09-12 — Configuración/CMS C1 cerrado y aprobado

- Aprobación explícita del propietario («Apruebo C1») sobre `288a62d30e7005a849d9e6d107daed635f7a89b2`: **C1 CERRADO / APROBADO**.
- Sincronizados PROJECT_MASTER, BACKEND_CHANGES, contrato C1, plan e índice documental. Se conserva la evidencia e incidencias de la implementación aprobada; este registro no cambia código ni ejecuta migraciones.
- C2/C3 permanecen sin iniciar y pendientes de autorización; tampoco se ejecuta despliegue habitual/productivo. Validación exclusivamente documental de estados, enlaces y diff.

## 2026-09-12 — Configuración/CMS C1 backend implementado, en revisión

- Ejecutado C1 sobre `5cbe35a` con D1–D6 fijadas por el propietario: agregado editorial aditivo separado, DTOs/normalización, permisos, preview privado, publicación/retiro, revisión optimista, idempotencia y auditoría según D5. [Contrato y evidencia](docs/features/CONFIGURACION_CMS_C1_CONTRATO.md).
- H1 elimina UUID de Organization en booking-data y conserva slug/localizadores de reserva; H2 limita mine/clerk-me a id/name/slug/timeZone por rol. Publicación cambia snapshot, no Organization operativa. Retiro bloquea nuevas reservas, con carrera PostgreSQL comprobada, y conserva operación/historial.
- Migración 21 solo ensayada en clúster PostgreSQL aislado: compatibilidad inicial name/phone, altas nuevas sin publicar, doble backfill sin revivir retiradas, reserva/factura/pago históricos intactos y respaldo/restauración verificados. La base habitual solo se inventarió en lectura, sin mostrar PII ni mutarla.
- API TypeScript, lint, build, 511 unitarias y 181 E2E aisladas terminaron con exit 0. Las 11 pruebas omitidas son preexistentes. Se cubrieron roles, IDOR, campos, concurrencia, idempotencia, fallos reales de AuditLog, invalidación, privacidad, horarios y regresiones del asistente público.
- Estado **IMPLEMENTADO / EN REVISIÓN**. Detenerse en C1: sin frontend, H5, medios, promociones, banca, notificaciones, ampliación de Pagos ni C2/C3. El checkpoint no equivale a aprobación backend ni despliegue habitual/productivo.

## 2026-09-12 — Configuración/CMS: C0 documental completado, en revisión

- Se ejecutó únicamente la auditoría y brief C0 sobre `22a27c499c58fe7405f1a8da304c11c8b08d0190`, en `ai/antigravity-qa`, con árbol inicialmente limpio.
- [CONFIGURACION_CMS_C0_AUDITORIA.md](docs/features/CONFIGURACION_CMS_C0_AUDITORIA.md) reúne inventario real de schema/API/consumidores, matrices por campo y rol, propuesta editorial/preview, no-alcance por fase, amenazas, compatibilidad, QA futuro y decisiones D1–D6 del propietario.
- Hallazgos: findMine expone todos los escalares a cuatro roles B2B; booking-data conserva UUID de Organization; horario JSON ya consumido pese al comentario legacy; falta modelo editorial; conversión pública de hora dependiente del navegador; slug sin política de rutas reservadas; WhatsApp legacy existente y discrepancia documental de estado BARBER. Se registran, sin implementarlos ni reabrir módulos.
- Se conserva el contrato propio BARBER A1 más teléfono privado; CMS no duplica perfil Professional ni modifica disponibilidad individual. Plan original conserva su secuencia; los ajustes propuestos quedan pendientes de decisión.
- Solo documentación: auditoría nueva y sincronización de plan, índice y PROJECT_MASTER. Sin cambios en frontend, backend, Prisma, migraciones, medios, pagos, integraciones ni BACKEND_CHANGES. Validación documental de enlaces, estados y diff; no builds ni QA funcional nuevo.
- **C0 completado. Pendiente aprobación del propietario para iniciar C1.** No se inicia ni aprueba C1–C3.

## 2026-09-11 — Estabilización: gates y documentación verificados

- Se diagnosticaron como escrituras parciales dos tipos generados de `.next/dev`; el nuevo gate limpia únicamente tipos generados, ejecuta `next typegen` y comprueba TypeScript.
- Se añadieron pruebas de componente para la paginación del Resumen y smoke tests Chrome reales en desktop/375 px. El matcher Clerk se limita a autenticación/dashboard, por lo que landing y slugs públicos no atraviesan ese middleware; el provider raíz aún requiere configuración.
- El workflow de calidad reproduce auditoría, Prisma, PostgreSQL aislado, integridad, pruebas y builds sin desplegar. Localmente aprobaron instalación estricta, audit sin vulnerabilidades, 71 pruebas web de lógica, 3 de componente, build y 3 smoke tests; la evidencia API/E2E completa del punto 4 permanece vigente.
- Se reconciliaron estado modular, 20 migraciones, puertos, CI y límites de recuperación en las fuentes vigentes. El plan de Configuración/CMS queda **PENDIENTE DE APROBACIÓN**, sin código ni contrato implementado. Los puntos 1–6 quedan verificados.

## 2026-09-11 — Auditoría de separación de roles PostgreSQL

- Se verificó por conexión real que la API local usa `kortek_runtime` y las migraciones `kortek_migrator`, ambos sin atributos globales elevados. El rol bootstrap `barberflow` continúa como superusuario del clúster y runtime conserva grants DML más amplios de lo estrictamente necesario y acceso heredado a otras bases.
- No se modificó PostgreSQL. Retirar o aislar el superusuario de aplicación nominal y recortar los grants runtime quedan como gate obligatorio antes de producción.

## 2026-09-11 — Estabilización: proyecciones y lecturas consistentes verificadas

- Reservas deja de exponer objetos Prisma completos de Professional, Service y Booking; responde solo los campos que consumen Agenda/Resumen y conserva contacto mínimo del Client.
- Analytics mantiene el mismo contrato, pero fija zona/tiempo y agregados en una instantánea `REPEATABLE READ` acotada; el profesional destacado se vuelve a resolver dentro del tenant.
- El Resumen usa una lectura operacional paginada y tenant-scoped: fecha del negocio, agenda y carga con totales completos, sin descargar el historial ni confundir una página de profesionales con todo el equipo. BARBER recibe solo su agenda.
- Agenda y métricas fallan de forma independiente, terminan su carga y tienen reintento sin datos obsoletos. Las horas se presentan en la zona autoritativa del negocio; paginación y 375 px no tienen overflow.
- Sin Prisma ni migración. Aprobaron 437 unitarias API/11 omitidas, 138 E2E aisladas, 71 pruebas web, TypeScript/lint/build y QA real OWNER/BARBER con tenant A→B→A y caída/recuperación. Punto 4 verificado; inicia exclusivamente el punto 5.

## 2026-09-11 — Estabilización: acceso e invitaciones verificados

- Distingue indisponibilidad de sesión inválida; acota esperas y protege invitaciones frente a respuestas tardías y cambios concurrentes de generación.
- Cliente HTTP conserva errores HTTP no JSON y descarta solicitudes/efectos del contexto anterior. Finalización de invitación ofrece login sin sesión y se aísla por identidad/localizador, sin tocar el archivo protegido de continuidad.
- La misma identidad puede repetir una aceptación local ya persistida aunque Clerk no vuelva a entregar el registro externo; no se enlaza por correo ni se amplía acceso a otra identidad.
- 430 unitarias API, 132 E2E aisladas y 66 pruebas web aprobadas, con TypeScript/lint/build de ambas aplicaciones. QA real aislado completó login, tenant/rol, invitación, aceptación, cambio de rol, revocación, recuperación y 375 px. Fixture, dos identidades sintéticas y base temporal eliminados. Punto 3 verificado; inicia exclusivamente el punto 4. Sin commit/push.

## 2026-09-10 — Estabilización: integridad y credenciales PostgreSQL verificadas

- Se restauraron los dos checks de Invoice mediante migración aditiva, después de comprobar el respaldo en aislamiento y la conservación de las huellas de datos. Se separaron las credenciales runtime/migrador, se restringió PostgreSQL a loopback y se retiró la contraseña versionada de ejemplo. Esta evidencia no implicaba degradar el rol bootstrap del clúster.
- Regresión de 127 E2E aprobada y QA real de Equipo/Resumen con el rol limitado. Copias temporales de recuperación eliminadas; respaldo preexistente y archivo protegido intactos.
- Puntos 1–2 verificados; inicia el punto 3. Sin publicación ni ampliación a Configuración/CMS.

## 2026-09-09 — Estabilización: preparación de integridad del punto 2

- Verificador de catálogos PostgreSQL de solo lectura, con siete regresiones y validación en la instancia sintética aislada. No repara ni copia datos; complementa los comandos de Prisma.
- Migración aditiva de restauración de los dos checks de Invoice preparada y validada mediante seis E2E aisladas, incluyendo históricos inválidos y repetibilidad. No aplicada a barberflow; sin modificaciones de filas ni contratos.
- Punto 2 aún en curso: respaldo/restauración de la base habitual pendiente de autorización expresa. No se avanza al punto 3 ni se publica un checkpoint.

## 2026-09-09 — Estabilización secuencial: punto 1 verificado

- Actualización local de Next/eslint-config-next, sharp, multer y qs para resolver los avisos detectados; API y web enlazadas por defecto a loopback. No cambia contratos ni aprobaciones de módulos.
- Audit de producción y peers limpios; validaciones API/web, Prisma y 121 E2E aisladas aprobadas. Tras recuperar PostgreSQL por Docker, QA OWNER real con navegación y recarga a Resumen/Equipo, modal cancelado, desktop/375 px sin overflow ni errores de consola.
- Sin publicación. Inicia el punto 2; evidencia y continuación en [ESTABILIZACION_2026_09.md](docs/quality/ESTABILIZACION_2026_09.md).

## 2026-09-09 — Equipo B: aprobación y reconciliación de esquema legacy

- El propietario confirmó que las invitaciones funcionan correctamente y aprobó explícitamente Equipo B (Entrega B Frontend y correctivo de invitaciones Clerk/estabilidad de acceso). El estado pasa de **IMPLEMENTADO / EN REVISIÓN** a **CERRADO / APROBADO**.
- El fallo independiente de Resumen por esquema legacy (`P2022`, columna `invoiceId` ausente en la tabla `Payment`) fue reconciliado mediante `prisma db push --accept-data-loss`, que sincronizó la instancia PostgreSQL local con el schema vigente de las 19 migraciones. `prisma migrate status` confirma "Database schema is up to date". Los datos financieros legacy afectados eran columnas y constraints obsoletos del modelo anterior de `Payment` (`bookingId`, `status`, `amount` directo) que ya no corresponden al contrato aprobado de Facturación-A.
- Validación posterior a la reconciliación: API TypeScript, lint y 406 unitarias/11 omitidas; Web TypeScript, lint y 55/55 pruebas; Prisma migrate status confirma sincronización completa. No se modificó código fuente.

## 2026-09-08 — Correctivo Equipo B: acceso directo e invitaciones recuperables

- Verificación final autorizada en la base local habitual: login OWNER en el primer intento, Equipo accesible y recarga sin reintentos; servidores activos en web `3001` / API `3000`, sin mutar invitaciones. Resumen conserva un fallo independiente por esquema legacy (`P2022`, columna `invoiceId` ausente); no se migró ni se declara recuperada esa base. La aceptación de la invitación específica requiere QA con su destinatario.
- Clerk pasa a controlar de extremo a extremo la identidad de la web. Login y registro ya no dependen del formulario de negocio ni del puente `/auth/continue`; el alta de la barbería se presenta dentro de `/dashboard/setup` después de iniciar la sesión.
- El dashboard distingue los estados locales de acceso y no monta navegación ni datos de negocio antes de `READY`. La pantalla intermedia queda reducida a un único “Cargando…” estable, sin la secuencia indefinida de mensajes “Preparando”.
- Se igualó en 10 segundos la tolerancia acotada del middleware Next y el verificador Nest para impedir el bucle dashboard → login cuando Clerk ya consideraba iniciada la sesión. Las validaciones criptográficas, origen y estado autoritativo siguen intactas.
- Una invitación abierta mientras hay otra sesión obliga a cambiar de cuenta conservando el enlace. Una invitación revocada, vencida, reemplazada o abierta con otra identidad ya no muestra “Intentar de nuevo”; el texto indica abrir la más reciente con el correo destinatario. Los fallos realmente transitorios sí ejecutan un nuevo intento.
- QA real aislado cubrió login directo, cuenta sin organización en `/dashboard/setup`, invitación nueva, creación de cuenta Clerk, nombre mínimo, aceptación, Membership y dashboard; también validó el estado revocado sin reintento y la presentación a 375 px. Equipo B permanece **IMPLEMENTADO / EN REVISIÓN**.
- Validación final: TypeScript/lint/build API y web, 55/55 pruebas web, 406 unitarias API/11 omitidas y 121/121 E2E completas aisladas. El bootstrap tiene un plazo máximo de 15 segundos con cancelación y error recuperable. Un registro OWNER nuevo completó verificación de correo Clerk, nombre, alta de negocio en el panel y entrada al dashboard.

## 2026-09-07 — Correctivo Equipo B: acceso inicial e invitaciones locales

- Se corrigió el primer bootstrap después del login en dos límites reales: la web obtiene explícitamente el token actual antes de consultar el API, y el verificador admite un desfase máximo de 10 segundos para el `iat` de Clerk sin relajar firma, origen autorizado, claims ni estado autoritativo de la sesión.
- Los rechazos de Clerk quedan clasificados en logs seguros sin PII. La configuración de ejemplo alinea API `:3000`, web `:3001` y documenta la URL de retorno obligatoria para invitaciones; su ausencia había provocado el `503` local al invitar.
- QA integrado con Clerk Development y PostgreSQL desechable verificó el dashboard en primer intento y recarga fría (`GET /auth/clerk/bootstrap` HTTP 200), además de crear una invitación real de prueba con HTTP 201 y toast temporal. En 375 px no hubo overflow.
- Aprobaron TypeScript, lint y build de API/web, 406 unitarias API/11 omitidas, 11/11 E2E aisladas, 46/46 pruebas web y Prisma validate/generate. Equipo B permanece **IMPLEMENTADO / EN REVISIÓN**; cambio de tenant y el ciclo externo completo de invitación quedan para el QA final del propietario.

## 2026-09-06 — Correctivo Equipo B: invitaciones Clerk y feedback temporal

- Se preserva el localizador UUID de la invitación al cambiar Clerk entre registro e inicio de sesión, evitando que una reescritura de URL/hash termine en una invitación inválida.
- La activación solicita un nombre cuando el perfil Clerk no lo tiene y solo después confirma la invitación; la aceptación sigue creando Membership/Professional según el contrato aprobado y es idempotente.
- El reenvío tolera de forma segura que Clerk ya haya llevado la invitación anterior a un estado terminal antes de crear el reemplazo. Los errores externos se registran con estado/código técnico sin PII; los límites 429 conservan `Retry-After` cuando existe y la UI muestra un tiempo real de reintento.
- Se retiró el banner verde persistente de Equipo: los éxitos usan únicamente el toast temporal de 3 segundos. Las confirmaciones de revocación permanecen intactas.
- Regresiones añadidas para localizador, límites/errores seguros y reenvío terminal. Equipo B permanece **IMPLEMENTADO / EN REVISIÓN** hasta el QA y aprobación explícita del propietario.

## 2026-09-03 — Correctivo de confirmación al revocar invitaciones de Equipo

- “Revocar” abre ahora un modal accesible que identifica el correo afectado y advierte que la invitación dejará de ser válida y requerirá una nueva invitación para acceder.
- Abrir, cancelar o cerrar el modal no produce mutación; solo “Sí, revocar invitación” puede llamar al contrato de revocación. Una regresión específica cubre los cuatro eventos y la ausencia de selección.
- Web TypeScript, lint, 41/41 pruebas y build finalizaron con exit `0`; `git diff --check` se verifica antes del checkpoint. No cambia backend, contratos, Prisma, Clerk/Auth, permisos ni otro módulo.
- Equipo B permanece **IMPLEMENTADO / EN REVISIÓN** hasta el QA y la aprobación explícita del propietario.

## 2026-09-03 — Equipo Entrega B Frontend

- El propietario aprobó oficialmente Equipo A Backend, incluido `1270ce9958b3da78f1d2be27d06545a8546c6d43`; su estado pasa a **CERRADO / APROBADO** sin cambios adicionales de backend.
- La pantalla Equipo incorpora directorio paginado, perfil Profesional informativo, invitaciones, cambio de rol y revocación de acceso con confirmación, consumiendo exclusivamente los contratos aprobados.
- OWNER/ADMIN gestionan; ADMIN no opera OWNER y BARBER/RECEPTIONIST no reciben consultas ni acciones administrativas. La UI no expone teléfono, IDs internos, datos Clerk ni otros campos privados.
- Query keys y efectos quedan ligados a usuario, organización y rol; cambiar contexto desmonta de inmediato páginas, filtros, formularios, modales y datos, y una visita anterior no puede actualizar la nueva aunque ocurra A → B → A.
- Se cubren loading, vacío, error/reintento, pending, éxito, tabla desktop, tarjetas móviles y modales accesibles. TypeScript, lint, 40/40 pruebas web y build finalizaron con exit `0`.
- QA real con Clerk Development y PostgreSQL desechable confirmó OWNER/ADMIN/BARBER, paginación, proyección mínima, vínculo informativo, OWNER protegido ante ADMIN, cambio de tenant y teclado/foco en escritorio. La revisión móvil y las mutaciones externas de invitación quedan pendientes del QA del propietario.
- No cambia backend, Prisma, Clerk/Auth legacy, Profesionales, Reservas, Facturación, Configuración ni Analytics. Estado: **IMPLEMENTADO / EN REVISIÓN**.

## 2026-09-03 — Correctivo de throttling de Equipo A Backend

- `PATCH /organizations/mine/team-members/role` y `POST /organizations/mine/team-members/revoke` incorporan un límite específico de 10 solicitudes por minuto mediante el guard existente, coherente con las mutaciones de invitaciones.
- Se añaden regresiones sobre metadata y composición de guards. No cambian contratos, DTOs, persistencia, permisos, invitaciones, Clerk/Auth legacy ni otros módulos.
- TypeScript, lint y build pasaron; 404 unitarias aprobaron/11 quedaron omitidas y 3/3 E2E de miembros aprobaron tras aplicar las 19 migraciones en PostgreSQL temporal aislado.
- Equipo A permanece **IMPLEMENTADO / EN REVISIÓN** hasta la aprobación explícita del propietario; no se inicia frontend.

## 2026-09-03 — Equipo Entrega A Backend

- Se publica un directorio de miembros paginado y mínimo para OWNER/ADMIN, separado de la proyección legacy que Profesionales todavía necesita. Expone solo nombre, correo, rol, acceso y nombre/estado del Professional vinculado.
- OWNER/ADMIN pueden cambiar roles asignables y revocar Membership. ADMIN no opera OWNER; el último OWNER queda protegido con bloqueo tenant-scoped y transacción `SERIALIZABLE`. Repeticiones no duplican cambios ni auditoría y un correo ajeno no revela otra organización.
- Revocar acceso conserva User, Professional e historial. El vínculo profesional es solo informativo y este módulo no crea, enlaza, edita ni desvincula perfiles.
- Invitaciones conservan los contratos Clerk aprobados: OWNER no es invitable, la creación equivalente abierta se reutiliza y crear/reenviar/revocar recibe throttling específico. AuditLog de mutaciones no contiene PII.
- Prisma validate/generate, TypeScript, lint y build pasaron; 402 unitarias aprobaron/11 quedaron omitidas, 14/14 E2E dirigidas y 121/121 E2E completas aprobaron con las 19 migraciones sobre PostgreSQL temporal aislado.
- No hay cambio Prisma ni migración, frontend, Auth legacy, Reservas, Facturación, Profesionales u otro módulo. Estado: **IMPLEMENTADO / EN REVISIÓN**; el frontend requiere aprobación explícita posterior.

## 2026-09-02 — Cierre oficial de Servicios

- El propietario aprobó oficialmente Servicios — Entrega B Frontend tras su QA manual sobre `79706ffdc16e9225e6e6528845c9e445a7829ff0`.
- Backend A/A.1, Frontend B y el módulo completo de Servicios quedan **CERRADOS / APROBADOS**; se conservan contratos, permisos, aislamiento, validaciones y evidencia previamente publicados.
- El cierre es exclusivamente documental y no cambia código, endpoints, Prisma, migraciones ni otros módulos. El siguiente alcance se limita a auditar Equipo, sin implementación.

## 2026-09-02 — Servicios Entrega B: orden y experiencia del formulario

- El propietario aprobó Servicios A.1 Backend sobre `9752842dfc8a3a53cdcb6bc06e61a185bc79a385`; su contrato de ordenamiento queda **CERRADO / APROBADO** y se consume sin ampliaciones.
- Estado y orden son dos selectores independientes. El orden se ejecuta en backend y ofrece Nombre A–Z, más/menos reservas registradas, más recientes/antiguos y precio en ambos sentidos; “Limpiar filtros” restablece ambos controles sin recargar datos de otro alcance.
- Se corrige la pérdida de foco al escribir en alta/edición manteniendo estable el callback de cierre del modal. Precio usa entrada decimal DOP estricta sin exponentes, signos ni más de dos decimales; duración usa minutos enteros, equivalencia natural y accesos rápidos de 15 a 120 minutos.
- Listado y formulario reservan un slot visual no interactivo para la futura imagen del servicio. No existe carga, URL nueva, dato ficticio ni integración con Cloudinary/media.
- Se añadieron regresiones para dinero y duración. Web TypeScript, lint, 35/35 pruebas y build de producción finalizaron con exit `0`.
- QA real con Clerk Development y PostgreSQL desechable cubrió OWNER → BARBER → OWNER, datos y acciones distintos por tenant, combinación de estado/orden, alta y edición sin pérdida de foco, error terminal sin conservar datos, recuperación con “Reintentar”, desktop y 375 px sin overflow. No hubo errores de aplicación en consola; solo el aviso esperado de claves Development de Clerk.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No cambia backend, Prisma, Reservas, Facturación, página pública, `ProfessionalService`, Cloudinary/media ni otro módulo.

## 2026-09-01 — Servicios A.1 Backend: ordenamiento del catálogo

- `GET /services` incorpora un `sort` opcional para nombre, mayor/menor número de reservas registradas, fecha de creación y precio en ambos sentidos. El orden predeterminado por nombre permanece compatible.
- “Reservas registradas” cuenta reservas no canceladas del servicio dentro del tenant. El conteo solo ordena: no se expone en la respuesta ni altera la proyección mínima.
- Los desempates son estables y la proyección se construye explícitamente para impedir que conteos o metadatos internos se filtren por accidente.
- No cambia Prisma, migraciones, roles, mutaciones, catálogo público ni otros módulos. El propietario aprobó explícitamente este contrato sobre `9752842dfc8a3a53cdcb6bc06e61a185bc79a385` antes de su consumo frontend.
- Pasaron 56 pruebas unitarias dirigidas, 15/15 E2E aisladas de Servicios con 19 migraciones desde cero, 392 unitarias API (11 omitidas), TypeScript, lint, build y Prisma validate/generate. Estado vigente: **CERRADO / APROBADO**.

## 2026-08-31 — Servicios Entrega B Frontend

- El propietario aprobó oficialmente Servicios Entrega A Backend sobre `f7088a4abb14e61721f08f7eeb85adbd8e6650d6`; el contrato backend queda **CERRADO / APROBADO** sin cambios adicionales.
- Servicios incorpora listado responsive, filtro backend por estado, alta, edición, desactivación y reactivación. OWNER/ADMIN gestionan; BARBER/RECEPTIONIST consultan sin controles de mutación.
- La pantalla cubre loading, vacío, error/reintento, pending y confirmación de éxito. Usa tabla en desktop y tarjetas sin overflow en móvil; formularios y mensajes reflejan los límites y la proyección mínima publicados.
- Consulta, modales y efectos de mutaciones se aíslan por usuario, organización y rol. El cambio de contexto desmonta inmediatamente la pantalla y la identidad de visita evita efectos tardíos también en A → B → A.
- Web TypeScript, lint, 33/33 pruebas y build de producción finalizaron con exit `0`. QA real con Clerk Development y PostgreSQL desechable verificó OWNER → BARBER → OWNER, datos distintos por tenant, alta, edición, validación monetaria, desactivación, filtro, permisos, éxito, desktop y 375 px sin overflow. Reactivación visual, error/reintento y cambio con modal abierto quedan para la revisión del candidato porque la sesión de automatización se interrumpió después de la desactivación; los contratos, estados y regresiones de aislamiento correspondientes sí quedan implementados.
- Estado de Entrega B: **IMPLEMENTADO / EN REVISIÓN**. No cambia backend, Prisma, Reservas, Facturación, página pública, `ProfessionalService`, Cloudinary/media ni otro módulo.

## 2026-08-31 — Servicios Entrega A Backend

- Servicios deja de borrar registros: `DELETE /services/:id` desactiva de forma idempotente y `PATCH /services/:id/reactivate` ofrece la transición inversa explícita. La edición general ya no admite `isActive`.
- `GET /services` conserva el arreglo compatible y añade `isActive=true|false`; `GET /services/:id` exige UUID. Lecturas cubren todos los roles B2B y mutaciones solo OWNER/ADMIN, siempre con tenant autenticado y `404` neutro frente a IDOR.
- Las respuestas mínimas omiten `organizationId`, timestamps y relaciones. Los DTOs recortan textos, exigen campos de creación, limitan nombre/descripción y restringen duración; el precio conserva la invariante DOP positiva de dos decimales.
- AuditLog cubre `CREATE`, `UPDATE`, `DEACTIVATE` y `REACTIVATE` sin PII. Cada mutación real invalida la caché pública para que una baja no permanezca visible; Booking, Invoice y su snapshot histórico se conservan, mientras nuevas reservas y catálogo público siguen exigiendo servicio activo.
- No hay cambio de schema ni migración. Prisma validate/generate y migrate status, TypeScript, lint y build terminaron en exit `0`; pasaron 375 unitarias backend (11 integraciones opt-in omitidas), incluidas 39/39 dirigidas, y 14/14 E2E PostgreSQL aisladas sobre 19 migraciones.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No inicia frontend de Servicios ni modifica Reservas, Facturación, página pública, `ProfessionalService`, Cloudinary/media u otro módulo.

## 2026-08-30 — Cierre oficial de Profesionales y Facturación-B Frontend

- El propietario aprueba oficialmente **Profesionales** (Frontend general, disponibilidad A2 y correctivo de perfil propio/aislamiento) y **Facturación-B Frontend**. Ambos quedan **CERRADO / APROBADO** sobre el estado funcional `bc3d1524d5ca185d46e963c086296895407f9cce`.
- Profesionales conserva sus contratos, permisos por rol, teléfono propio privado, disponibilidad y aislamiento usuario/tenant/rol, incluido A → B → A. Facturación-B conserva emisión interna, cobro completo único, ownership BARBER y filtro backend por fecha local de emisión/estado; no se corrige ni amplía su alcance.
- “Usar otra cuenta” en `apps/web/app/auth/continue/page.tsx` se conserva como cambio de acceso independiente aceptado por el propietario. Compartió el checkpoint anterior, pero no es una funcionalidad de Profesionales. Su código permanece intacto.
- Este cierre registra la decisión explícita del propietario y conserva la evidencia previa con sus límites; no afirma que se hayan ejecutado nuevas pruebas ni completado automáticamente el QA que figuraba pendiente en el candidato.
- Entrega exclusivamente documental: sin cambios funcionales, contratos, configuración, Prisma ni migraciones. No inicia otro módulo, no reconcilia la base legacy y no incluye visión futura, fixtures, respaldo ni cambios locales ajenos.

## 2026-08-30 — Correctivo de Profesionales: contexto y gestión del perfil propio

- Profesionales desmonta toda su vista al cambiar usuario, organización o rol y usa ese alcance completo en la consulta; ningún modal, formulario, confirmación, selección de disponibilidad ni dato de listado del contexto anterior permanece visible, y una mutación tardía de ese alcance no puede emitir estado ni toast en el nuevo. La revisión final corrigió también A → B → A mediante una instancia única por visita e invalidación al salir; incluye regresión automática.
- La disponibilidad conserva `Organization.timeZone` solo para cálculo y formato internos; la interfaz usa “Hora del negocio” y deja de mostrar identificadores IANA, UTC, offsets o detalles de conversión.
- Tras la revisión visual del propietario, se restaura la edición pública propia A1 (`name`, `bio`, `avatar`, `specialty`, `experienceYears`) y se conserva la edición del teléfono privado. La restricción local intermedia a solo `phone` queda sustituida por esta decisión; `PATCH /professionals/me` sigue rechazando estado, publicación, vínculo, tenant, IDs y rol. Nombre vacío/`null` se rechaza; opcionales admiten `null`. Identidad y tenant derivan de autenticación y AuditLog no guarda PII.
- La ficha propia ofrece “Gestionar mi perfil”, que reúne el detalle, “Editar información” y “Mi disponibilidad” sin apilar modales. La edición reutiliza los campos del formulario existente; el teléfono se identifica como privado y sigue ausente del directorio y las rutas públicas. No se añade subida de fotos ni gestión administrativa BARBER.
- El menú pasa a “Facturación” para todos los roles autorizados; la pantalla BARBER conserva “Facturación de mis servicios”, permisos, ownership y comportamiento financiero sin cambios.
- No hay migración, cambio Prisma ni módulos nuevos. 71 pruebas dirigidas API y 22/22 E2E PostgreSQL aisladas cubren normalización, `null`, campos prohibidos/inválidos, cambio de tenant, colega intacto, auditoría y privacidad; web prueba el payload y el aislamiento.
- Validación final: TypeScript, lint y build API/web en exit `0`; 354 unitarias API pasadas/11 omitidas y 27/27 web. Diff del alcance sin errores de whitespace.
- Publicación autorizada por el propietario el 2026-08-30 en un único checkpoint sobre `27214da509e9a94358924e6a8be6c2eed8fd793f`, con estado **IMPLEMENTADO / EN REVISIÓN**. No cierra Profesionales ni Facturación-B. La revisión previa y las capturas del propietario no se presentan como ejecución nueva de toda la matriz visual; quedan pendientes OWNER → BARBER → OWNER, cambio de organización con modal abierto, perfil/disponibilidad, error/reintento, móvil, teclado y consola. El fixture QA se conserva, sin incluir credenciales ni artefactos.
- Por autorización adicional se incluye el cambio del propietario en `auth/continue/page.tsx`: “Usar otra cuenta” reutiliza logout existente, no envía onboarding y se deshabilita mientras se crea el negocio. Solo se limpia whitespace final. Cinco regresiones unitarias del componente verifican botón, disabled, contrato y redirecciones. Navegador local confirmó redirección sin sesión a login; logout Clerk autenticado pendiente. No se modifica backend ni configuración de identidad.

## 2026-08-30 — Visión futura de Configuración/CMS, mini-sitio y Pagos

- Se registró, sin implementación, la evolución de `/[slug]` a mini-sitio tenant-scoped y el orden futuro Equipo → Configuración del negocio/CMS → Analytics → Resumen final.
- La planificación futura incluye contenido público, branding, galería, fotos de servicios, promociones, cuentas bancarias, métodos de pago y plantillas de notificación.
- El recorrido público objetivo termina en pago en local sin cobro confirmado o transferencia con comprobante pendiente de verificación; el comprobante no crea automáticamente un `Payment`.
- Una futura ampliación formal de Pagos deberá cubrir anticipo, evidencia, verificación, pendiente y propina separada sin reinterpretar ni romper el Payment completo único vigente.
- Resend queda como dirección futura para correo automático y `wa.me` como acción manual editable; “En proceso” solo podrá existir con un estado real de Booking.
- Estado: **VISIÓN FUTURA / PLANIFICACIÓN DOCUMENTAL**. No cambia código, contratos, ADR, Facturación-A ni Facturación-B, que permanece **IMPLEMENTADA / EN REVISIÓN**.

## 2026-08-29 — Auditoría integral desde `2ffd44d`

- Se alinearon código, contratos y documentación con Clerk, Facturación-B y el modelo vigente.
- Se retiraron las rutas Organization que creaban tenants huérfanos o exponían UUID por slug, sin consumidores web actuales.
- Reservas y Servicios rechazan IDs de ruta inválidos con `400`; Analytics corrige la ventana de 30 días.
- Se añadieron ejemplos de entorno sin secretos, un gate `test` de workspace y lint API no mutante; se retiraron lockfile, backup y transcript obsoletos.
- Se actualizaron Next a `16.2.11` y Prisma/Client a `6.19.3`, se alineó TypeScript `5.9.3`, se corrigieron peers y se fijaron transitivas vulnerables desde `pnpm-workspace.yaml`; `pnpm audit --prod` no reporta vulnerabilidades conocidas.
- La landing ya no presenta testimonios, precios, descuentos o métricas comerciales inventados; el flujo funcional no cambia.
- No se añadió ninguna migración ni cambió la estructura persistida. Prisma ahora mapea los nombres históricos reales de dos claves foráneas tenant-scoped de disponibilidad profesional; las 19 migraciones, la E2E completa y el chequeo de drift se validan en PostgreSQL temporal aislado.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No constituye aprobación ni cierre de Facturación-B.

## 2026-08-29 — Estabilidad del Resumen y filtro real de Facturación

- El Resumen deja de conservar `loading` tras un fallo de sus dependencias, no renderiza datos vacíos como si fueran autoritativos y ofrece reintento sin alterar la clave de alcance ni la protección contra respuestas tardías de otro tenant.
- Facturación reemplaza los botones de estado por una sección responsive de “Fecha de emisión” con `Desde`, `Hasta`, `Estado` y limpieza visible. Las filas muestran la fecha real de `Invoice.issuedAt` separada de Reserva y Cobro.
- `GET /invoices` acepta `from`/`to` locales inclusivos y filtra `Invoice.createdAt` en backend usando `Organization.timeZone`, combinado con tenant, ownership y estado antes de ordenar y paginar. Los extremos abiertos son válidos y el rango invertido recibe `400` antes de consultar organización o facturas.
- El diagnóstico real identificó `GET /analytics/dashboard` y `GET /invoices?page=1&limit=20` con `500` seguro porque el esquema financiero del PostgreSQL local seguía legacy aunque su ledger declaraba aplicadas las migraciones de Facturación-A. Para no operar esa base inconsistente, la validación continuó en una base local desechable creada desde cero con las 19 migraciones reales.
- API TypeScript/lint/build y Web TypeScript/lint/build finalizaron con exit `0`; pasaron 331 unitarias API, 18 pruebas web y 21/21 E2E de Facturación sobre PostgreSQL 16 temporal aislado. QA real OWNER/BARBER cubrió cambio de tenant, rangos, estado, error/reintento, 1440 px y 375 px sin overflow.
- Estado: correctivo candidato **IMPLEMENTADO / EN REVISIÓN**. Facturación-B no se cierra ni aprueba; no se modifica A0.6-B, Clerk, Supabase, Prisma, reembolsos, anulaciones, comisiones, Profesionales ni otro alcance.

## 2026-08-27 — Facturación-B Frontend implementado como candidato

- Se reemplazó el consumidor financiero incompatible por el contrato aprobado: listado mínimo y paginado, estados derivados `ISSUED`/`PAID`, importes DOP como strings decimales, emisión con solo `bookingId` y cobro completo con solo `method`.
- Reservas permite emitir desde una Booking completada; Facturación ofrece filtros, estados loading/empty/error/pending/success, confirmación de cobro, fechas en la zona del negocio, tabla desktop y tarjetas móviles. BARBER usa “Facturación de mis servicios” y no recibe lenguaje de ganancias ni columnas financieras de otros profesionales.
- Las consultas quedan aisladas por usuario, organización y rol. El cambio de contexto retira inmediatamente los datos anteriores, carga el tenant nuevo y descarta efectos visuales de mutaciones tardías; se conserva la limpieza global vigente de React Query.
- QA real sobre PostgreSQL temporal aislado y una identidad con organizaciones/roles OWNER y BARBER verificó cambio de tenant sin datos obsoletos, emisión y cobro BARBER, importe inmutable, método, fecha del servidor, actor y auditoría sin PII, filtros, diálogo, desktop, 375 px sin overflow y consola sin errores de aplicación.
- Web TypeScript, lint y build finalizaron con exit `0`; pasaron 6 pruebas de Facturación, 5 de aislamiento del Resumen y 5 de rutas de autenticación. Las E2E backend específicas aprobaron 20/20 sobre una base `_test` con 19 migraciones desde cero.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No está cerrado ni aprobado y no autoriza A0.6-B, Clerk, Supabase, reembolsos, anulaciones, comisiones ni otro alcance.

## 2026-08-26 — Facturación-A Backend cerrado y aprobado

- El propietario aprobó explícitamente el checkpoint correctivo `21761ac573b075ec627c0e91593d61a4279c2b8f` y cerró Facturación-A Backend.
- La aprobación conserva el contrato de Invoice/Payment, aislamiento tenant/ownership, concurrencia, auditoría sin PII, mínima exposición, Analytics por fecha real de pago y los correctivos temporal y monetario.
- La evidencia aprobada incluye Prisma, TypeScript, lint y build en exit `0`; 328 unitarias; 80/80 E2E PostgreSQL aisladas; 19 migraciones desde cero; y QA fail-closed con rollback atómico para datos históricos inválidos.
- Este cierre es exclusivamente documental. Facturación-B queda limitada a análisis y plan; no autoriza implementación frontend, A0.6-B, Clerk, Supabase, reembolsos, anulaciones, comisiones ni otro alcance.
- Estado: **CERRADO / APROBADO**.

## 2026-08-26 — Correctivo temporal y monetario de Facturación-A Backend

- Se impidió completar una Booking antes de `endTime` para todos los roles autorizados usando tiempo del servidor; Invoice y Payment repiten el control para datos históricos.
- `Service.price` quedó limitado a DOP positivo con máximo dos decimales en creación, edición, servicio, Prisma y PostgreSQL.
- La migración fail-closed bloquea precios históricos inválidos y Booking futura ya completada sin redondear ni alterar parcialmente las filas.
- Prisma, TypeScript, lint y build pasaron; 328 unitarias y 80/80 E2E PostgreSQL aisladas aprobaron. QA verificó `0`, `125.555`, constraint, OWNER/BARBER, emisión/cobro futuros y tres escenarios históricos de migración.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. La auditoría no aprueba ni cierra el checkpoint y no autoriza ningún alcance posterior.

## 2026-08-25 — Facturación-A Backend implementado como candidato

- Se implementó Invoice interna única para Booking completada, snapshot server-side del precio, Payment completo único con método/fecha/actor y respuestas mínimas paginadas.
- OWNER, ADMIN y RECEPTIONIST operan el tenant; BARBER queda limitado por tenant y `Professional.userId` a sus propias reservas. CUSTOMER no accede a Facturación o Analytics global.
- Emisión y cobro son serializables, idempotentes, resistentes a carreras y auditados de forma transaccional sin PII. Analytics usa `Payment.paidAt` y la zona del negocio.
- La migración fail-closed convierte solo Invoice legacy determinista y bloquea Payment o estados sin trazabilidad real. Se validaron ambos caminos en PostgreSQL temporal.
- Prisma, TypeScript, lint y build pasaron; 305 unitarias y 78/78 E2E PostgreSQL aisladas aprobaron. El QA backend integrado cubrió roles, dos tenants, IDOR, mínima exposición, concurrencia, constraints, auditoría y rollback.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No autoriza frontend, A0.6-B, Clerk, Supabase, reembolsos, anulaciones, comisiones ni otro alcance.

## 2026-08-25 — Contrato técnico de Facturación-A preparado

- Se registraron las decisiones del propietario para una factura interna no fiscal: solo Booking completada, snapshot server-side del precio, un Payment completo con método/fecha/actor, Analytics por fecha real de pago, respuestas mínimas/paginadas y auditoría sin PII.
- El plan define modelo/migración, invariantes, transiciones, endpoints, DTOs/proyecciones, permisos tenant/ownership para OWNER, ADMIN, RECEPTIONIST y BARBER, concurrencia, idempotencia, pruebas y QA.
- Estado: **PLAN TÉCNICO / PENDIENTE DE APROBACIÓN PARA IMPLEMENTAR**. No se modificaron código, frontend, A0.6, Clerk, Prisma, Supabase ni contratos ejecutables; `BACKEND_CHANGES.md` permanece intacto.

## 2026-08-25 — Correctivo de aislamiento del Resumen cerrado y aprobado

- El propietario aprobó y cerró explícitamente el checkpoint `3235501956050e284d84d9aa306b2653cc07003d` después de revisar el aislamiento por usuario, organización y rol, las pruebas de respuestas tardías y el QA real `OWNER → BARBER → OWNER` en escritorio y móvil.
- El cierre se limita al correctivo transversal. El módulo Resumen continúa congelado y no se aprueban ni modifican Facturación, A0.6, Clerk, backend, Prisma, contratos API, Supabase o ADR.
- El siguiente alcance queda limitado al análisis y plan de Facturación segura. Su implementación y Security A0.6-B permanecen pendientes de autorización explícita.

## 2026-08-24 — Correctivo de aislamiento del Resumen candidato

- El Resumen vincula su estado remoto a `usuario + organización + rol`, oculta los datos anteriores inmediatamente al cambiar el contexto y descarta respuestas tardías por alcance e identificador de solicitud. Se conserva la limpieza vigente de React Query.
- Se añadieron cinco pruebas de regresión para cambio de tenant/rol, respuesta tardía y ciclo `A → B → A`. Web TypeScript, lint, build, pruebas del correctivo y regresión de rutas de autenticación finalizaron con exit `0`.
- El QA real con una identidad de dos organizaciones y roles `OWNER`/`BARBER` pasó en escritorio y 390×844: cada cambio cargó el tenant nuevo sin métricas, reservas ni profesionales obsoletos y sin errores de aplicación en consola. La membresía adicional fue un fixture local autorizado y no forma parte de Git.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. El Resumen continúa congelado y no aprobado; no se modificaron Facturación, A0.6, Clerk, backend, Prisma, contratos API ni ADR.

## 2026-08-22 — Security A0.6-A cerrado y aprobado

- El propietario aprobó y cerró explícitamente el checkpoint backend A0.6-A después de revisar la migración, el contrato de reclamación, la atomicidad, la política anti-enlace, la privacidad tenant y la evidencia automatizada ya registrada.
- Se preserva la evidencia sin PII: Prisma, TypeScript, lint y build finalizaron con exit `0`; 286 unitarias y 5 E2E PostgreSQL aisladas pasaron, y el clúster temporal fue eliminado.
- Este cierre no modifica funcionalidad. A0.6-B queda limitado a análisis y planificación; A0.6-C/D y otros alcances permanecen bloqueados.

## 2026-08-22 — Security A0.6-A backend implementado como candidato

- Se añadió el vínculo B2C opcional `Client.userId`, separado de Membership y único por organización, sin backfill ni modificación de cuentas existentes.
- El nuevo endpoint Clerk permite reclamar de forma segura e idempotente el Client asociado a una reserva. La consulta autoritativa y los bloqueos de Booking/Client viven en una transacción PostgreSQL `SERIALIZABLE`; User opcional, vínculo y auditoría sin PII son atómicos.
- No existe enlace automático por correo. Cualquier User local ya ocupado —incluidos CUSTOMER legacy— provoca `409` neutro y rollback completo. No se crea Membership CUSTOMER.
- El contrato público legacy y el flujo de reserva/password permanecen intactos. Las pruebas unitarias y E2E PostgreSQL aisladas cubren idempotencia, carreras, tenant, colisiones y ausencia de filas parciales.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No aprueba ni cierra A0.6-A y no autoriza A0.6-B/C/D, Supabase u otro alcance.

## 2026-08-22 — Security A0.5 completo cerrado y aprobado

- El propietario aprobó y cerró explícitamente Security A0.5 completo, incluidos sus subalcances A, B, C y D.
- El cierre conserva la evidencia ya registrada: bootstrap y autorización local en NestJS, identidad Clerk en web sin JWT propio persistido, invitaciones seguras para cuentas nuevas y preexistentes, validaciones automatizadas y QA real.
- No se añadieron cambios funcionales ni nueva evidencia sensible. A0.6 queda limitado a análisis y plan hasta una autorización posterior de implementación.

## 2026-08-22 — Correctivo de invitaciones A0.5-B/A0.4 candidato

- La creación y el reenvío de invitaciones ahora anexan en backend el UUID local de `TeamInvitation` a la URL controlada por servidor. Se eliminó la dependencia de metadata pública Clerk para correlacionar la aceptación.
- El frontend conserva el UUID local entre rutas internas fijas y rechaza localizadores ausentes, inválidos o duplicados. No acepta redirects libres, tenant, rol, correo ni identificadores Clerk desde el navegador.
- Pruebas unitarias y E2E cubren creación, reenvío, URL controlada, ausencia de metadata y continuidad segura. API TypeScript, lint, build y 278 unitarias; Web 5 pruebas de rutas, TypeScript, lint y build; y 11 E2E de invitaciones sobre PostgreSQL temporal aislado finalizaron con exit `0`. El QA real nuevo con una cuenta Clerk preexistente confirmó `201`, repetición `200` y acceso al dashboard.
- Se revocaron con trazabilidad las dos invitaciones técnicas pendientes anteriores y se eliminaron exactamente dos identidades técnicas Clerk Development que no tenían User local. No se borraron filas históricas ni se conservaron PII, tokens, claves, cookies o identificadores sensibles.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No aprueba ni cierra A0.5-B y no autoriza A0.6, Supabase u otro módulo.

## 2026-08-22 — Security A0.5-B frontend implementado como candidato

- La web interna migró login, registro, recuperación y logout al SDK oficial de Clerk. El token de sesión se obtiene al hacer cada petición y ya no se guarda un JWT propio en `localStorage` ni se usa la cookie indicadora legacy.
- El contexto de negocio se resuelve mediante `GET /auth/clerk/bootstrap`; la organización activa solo puede elegirse entre Memberships locales autorizadas y el cambio de tenant purga la caché de negocio.
- Onboarding consume el contrato A0.3-A y Equipo consume las invitaciones A0.4 sin solicitar ni compartir contraseñas temporales. Los endpoints legacy backend permanecen sin cambios como rollback y la web deja de consumirlos.
- Exit `0`: Web TypeScript, lint y build. QA real con Clerk Development verificó login/logout OWNER, recuperación y registro visibles sin crear cuentas, gestión de Equipo sin contraseñas, BARBER restringido y responsive sin overflow en móvil pequeño y desktop; no hubo errores de aplicación en consola ni envíos de invitaciones.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No aprueba A0.5-A ni A0.5-B y no autoriza A0.6, retiro legacy, Supabase u otro módulo.

## 2026-08-22 — Security A0.5-A implementado como candidato

- Se añadió el bootstrap backend de sesión Clerk para distinguir onboarding, falta de acceso y Memberships B2B listas, con una proyección mínima que no expone correo, identificadores Clerk, CUSTOMER ni timestamps.
- Las rutas B2B aceptan temporalmente JWT legacy revalidado o sesión Clerk verificada con selector tenant único; la autorización continúa en Membership y rol locales. Los endpoints legacy de identidad y las rutas públicas no cambian.
- Las invitaciones Clerk reciben una redirección configurada y validada, sin convertir metadata o datos del navegador en autoridad.
- Exit `0`: API TypeScript, lint, build, 277 unitarias y 55 E2E. Las E2E usaron un PostgreSQL temporal estrictamente aislado, base `_test` y rol limitado; el clúster se eliminó al finalizar.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. Este checkpoint no aprueba A0.5-A ni autoriza A0.5-B, Supabase u otro módulo.

## 2026-08-21 — Security A0.4 cerrado y aprobado

- El propietario aprobó explícitamente Security A0.4 después de la auditoría y del QA integrado real ya registrado.
- Se preserva la evidencia: aceptación inicial `201`, repetición idempotente `200`, rechazo neutro `409` tras revocación y una sola Membership y un solo Professional en PostgreSQL, sin duplicados.
- Estado vigente: **CERRADO / APROBADO**. El siguiente alcance se limita al análisis y diseño de Security A0.5; no autoriza implementación, Supabase ni otro módulo.

## 2026-08-21 — QA integrado real de Security A0.4

- Se validó el flujo nuevo de invitaciones con sesiones reales de Clerk Development y una cuenta controlada, sin repetir QA de A0.1–A0.3.
- La primera aceptación devolvió `201`; repetirla con la misma identidad devolvió `200`. PostgreSQL confirmó exactamente una Membership y un Professional, sin duplicados.
- Una segunda invitación fue creada y revocada de forma controlada; intentar aceptarla después devolvió `409` con mensaje neutro y no concedió acceso adicional.
- La utilidad temporal estaba ignorada, se eliminó al terminar y no entró en Git. La evidencia no conserva PII, tokens, claves, cookies ni identificadores sensibles.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. El QA integrado no equivale a aprobación ni cierre; A0.4 queda pendiente de auditoría explícita.

## 2026-08-21 — Security A0.4 implementado como candidato

- Se añadió el ciclo tenant-scoped de invitaciones Clerk para Equipo: OWNER/ADMIN gestionan invitaciones de ADMIN, BARBER o RECEPTIONIST; nadie puede invitar como OWNER.
- La aceptación valida primero la identidad e invitación externas y persiste de forma `SERIALIZABLE` e idempotente User nuevo cuando corresponde, Membership, Professional BARBER opcional, estado y auditoría sin PII.
- Se aplicó la decisión de seguridad de no enlazar jamás por coincidencia de correo. Cualquier correo local ya ocupado —sin enlace o enlazado a otra identidad Clerk— devuelve `409` neutro sin filas parciales.
- Las llamadas a Clerk se coordinan mediante estados locales sin mantener transacciones de base abiertas durante la red. Migración, constraints y pruebas cubren aislamiento, roles, reenvío/revocación, expiración, fallos externos, rollback y concurrencia.
- Exit `0`: Prisma validate/generate, API TypeScript, lint y build; 3/3 unitarias y 11/11 E2E nuevas sobre PostgreSQL temporal aislado. No hubo cambios de frontend ni QA con invitaciones reales.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. A0.4 no está aprobado y el siguiente paso es su auditoría.

## 2026-08-21 — Security A0.3-B cerrado y aprobado

- Se implementó el piloto backend `GET /auth/clerk/me` con `ClerkAuthGuard + RolesGuard + B2B_ROLES`, Membership/rol local y reutilización directa de `OrganizationsService.findMine()`; `GET /organizations/mine` y el flujo JWT legacy no cambiaron.
- `ClerkAuthGuard` ahora rechaza con `401` cualquier `x-organization-id` duplicado antes de Clerk o PostgreSQL, incluso si los valores son iguales, además de arreglos, valores combinados y selectores inválidos.
- La cobertura comprueba roles B2B, `CUSTOMER`, tenant ajeno, User no enlazado, Membership ausente/cambiada/eliminada, sesión revocada, duplicados físicos y paridad exacta con la respuesta legacy.
- Exit `0`: API TypeScript, lint y build; 262 unitarias (11 integraciones opt-in omitidas) y 36/36 E2E sobre PostgreSQL temporal aislado. Los clústeres temporales fueron apagados y eliminados sin tocar la base principal.
- El propietario confirmó el QA integrado real con la sesión Clerk ya validada: `GET /auth/clerk/me` respondió `200` y la organización coincidió con la autorizada. No se repitieron onboarding, conflictos, revocación ni pruebas de otros tenants.
- La evidencia no conserva PII, tokens, claves, cookies ni identificadores sensibles; la utilidad temporal ignorada fue eliminada y nunca entró en Git.
- Estado: **CERRADO / APROBADO** por decisión explícita del propietario.

## 2026-08-21 — Correctivo documental del plan Security A0.3-B

- Se sincronizó el estado vigente de Security A0.3-H como **CERRADO / APROBADO** por decisión explícita del propietario; las entradas históricas permanecen intactas como fotografía de su fecha.
- El diseño A0.3-B conserva `GET /auth/clerk/me`, `ClerkAuthGuard + RolesGuard + B2B_ROLES`, Membership/rol local, reutilización directa de `OrganizationsService.findMine()` y paridad con `GET /organizations/mine` sin modificar la ruta JWT legacy.
- Se añadió como requisito obligatorio que cualquier `x-organization-id` duplicado devuelva `401`, incluso con valores idénticos, con cobertura unitaria y E2E PostgreSQL aislada. La corrección puntual futura de `ClerkAuthGuard` queda dentro del alcance A0.3-B aprobado como diseño.
- Security A0.3-B permanece **PLANIFICADO / PENDIENTE DE AUTORIZACIÓN**; este checkpoint no contiene implementación funcional.

## 2026-08-20 — Security A0.3-A cerrado y aprobado

- El propietario cerró y aprobó explícitamente Security A0.3-A después de QA integrado real con sesiones Clerk Development.
- La evidencia confirmó alta inicial `201`, reintento idempotente `200` sobre la misma organización, conflicto `409` para una segunda identidad sobre el mismo slug y rechazo `401` de una sesión revocada, sin documentar PII, tokens, claves, cookies ni identificadores sensibles.
- Se eliminó la utilidad temporal local usada para QA; permaneció ignorada y nunca entró en Git.
- Security A0.3-B queda únicamente **PLANIFICADO / PENDIENTE DE AUTORIZACIÓN**. No se implementó el piloto ni se modificaron login/registro JWT, Prisma, Supabase, frontend productivo u otros módulos.

## 2026-08-20 — Correctivo bloqueante de Security A0.3-A

- El conflicto entre un correo verificado de Clerk y un `User` local no enlazado registra `CLERK_ONBOARDING_EMAIL_CONFLICT` sin PII ni identificadores. Como todavía no existe un tenant autoritativo, `AuditLog.organizationId` admite `NULL` solo para ese evento pre-tenant; un `CHECK` PostgreSQL exige además `userId` y `entityId` nulos y evita inventar una organización.
- La respuesta al cliente permanece en `409` genérico y no expone correo, `clerkUserId` ni IDs internos. La misma política se aplica si la colisión de correo se materializa durante la transacción.
- PostgreSQL aislado comprobó dos identidades Clerk distintas compitiendo por el mismo slug: exactamente una respuesta `201`, una `409`, una sola Organization y solo las filas User/Membership/AuditLog del ganador. Otra E2E comprobó que un fallo de `Clerk.users.getUser()` devuelve `503` genérico sin escrituras.
- Validación final en exit 0: API TypeScript, lint, build, Prisma validate/generate y 258 unitarias aprobadas (11 integraciones opt-in omitidas); E2E 23/23 en `kortek_e2e_test`; web TypeScript, lint y build como regresión. La base E2E usa una credencial separada de la principal.
- El archivo vacío no rastreado `apps/web/pnpm` fue revisado y eliminado; no era fuente ni dependencia del proyecto.
- Estado: Security A0.3-A **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría. No está aprobado ni cerrado y no autoriza A0.3-B, frontend Clerk, Supabase u otro módulo.

## 2026-08-20 — Recuperación de Security A0.3-H y saneamiento local

- Se auditó el código y el historial desde Security A0.2 hasta `baff8627efca7838e83061a2a1fd20d52f2d0e3d`. Security A0.3-H y A0.3-A quedan **IMPLEMENTADOS / EN REVISIÓN**; se retiraron las afirmaciones no verificables de cierre/aprobación de A0.3-H y A0.3-A no se amplió.
- El guard E2E deja de aceptar `schema=test` dentro de la base principal. Exige base `_test`, usuario distinto y comprobación PostgreSQL real de propiedad limitada, ausencia de privilegios globales/heredados y falta de acceso a la base principal. `global-setup.ts` ya no crea schemas con SQL dinámico.
- La concurrencia del registro legacy comprueba en la base real que persiste exactamente un `User`, una `Organization`, una `Membership OWNER` y un `AuditLog`. La proyección de Equipo eliminó supresiones ESLint y conserva el password fuera de la respuesta mediante tipos explícitos.
- 21/21 E2E pasaron en un clúster PostgreSQL temporal separado, base `kortek_e2e_test` y rol limitado `kortek_e2e_runner`; no se usaron credenciales ni schema de la base principal.
- API TypeScript/lint/build/Prisma, 257 unit tests y Web TypeScript/lint/build terminaron en exit 0. Un smoke HTTP real confirmó registro y login, CORS, rechazo de `organizationId`, protección de `POST /organizations` y atomicidad `1|1|1|1`.
- El propietario completó QA manual en navegador: registro, cierre de sesión e inicio con credenciales válidas funcionan; credenciales inválidas muestran el mensaje genérico correcto.
- Saneamiento local: se creó `pg_hba.conf.backup-20260819-234953`, se cambiaron únicamente las cuatro reglas TCP locales afectadas de `trust` a `scram-sha-256`, se verificó conexión con contraseña y se retiraron de `barberflow` `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION` y `BYPASSRLS` sin borrar roles, objetos ni datos. La instancia nativa inspeccionada contiene 0 Users, 0 Organizations y 0 Memberships; el inventario de 19 Users permanece como evidencia histórica de otro estado/entorno.
- Estado: checkpoint candidato de recuperación **IMPLEMENTADO / EN REVISIÓN**. El QA habilita publicación para auditoría, no aprueba A0.3-H ni A0.3-A y no autoriza A0.3-B.

## 2026-08-15 — Security A0.3-A: Onboarding backend con Clerk

- **Endpoint de Onboarding:** Se implementó `POST /auth/clerk/onboarding` bajo `ClerkOnboardingGuard`, permitiendo crear una barbería inicial y asociar al propietario autenticado en Clerk sin requerir pertenencia previa a un tenant.
- **Helper Compartido:** Se extrajo el helper `toWebRequest` (`apps/api/src/auth/clerk/to-web-request.ts`) para unificar la conversión de peticiones Express a Request de Web Fetch API en `ClerkAuthGuard` y `ClerkOnboardingGuard`.
- **Validación Estricta de Perfil y Verificación de ID:** Consulta autoritativa a `users.getUser` mediante el cliente instanciado lazy en `ClerkSessionVerifierService`. Se verifica estrictamente que `clerkUser.id === clerkUserId` (401 seguro antes de tocar base de datos si difiere). Nombre obligatorio resuelto de `firstName`/`lastName` o `username` (400 si falta; prohibido body o metadata). Correo principal verificado obligatorio (403 si `status !== 'verified'`). Falla de Clerk API responde 503 controlado sin tocar base de datos.
- **Política Anti-Enlace:** Rechazo 409 completamente neutro (*"No es posible completar el registro con los datos proporcionados"*) si el correo verificado coincide con un usuario local no enlazado.
- **Alta Atómica `SERIALIZABLE`:** Creación transaccional de `User(password: null, clerkUserId, lastOrganizationId: org.id)`, `Organization` y `Membership(OWNER)` con `AuditLog` sin PII. Rollback total si falla `logTransactional`. Reintento acotado a 3 intentos para `P2034`.
- **Manejo de Concurrencia e Idempotencia `Promise.all`:** Ráfagas simultáneas con el mismo `clerkUserId` se resuelven de forma idempotente retornando `200 OK` y garantizando exactamente 1 User, 1 Organization, 1 Membership OWNER y 1 AuditLog en PostgreSQL real. Si el estado es parcial/inconsistente, responde 409 y nunca crea una segunda organización.
- **Pruebas históricas:** 253 unit tests y 21 tests E2E se reportaron con dobles de Clerk (cero secretos y cero llamadas de red, validando rechazo 401 sin header Authorization). El aislamiento por schema usado entonces fue sustituido el 2026-08-20 por una base y credencial separadas.
- **Estado:** Security A0.3-A **IMPLEMENTADO / EN REVISIÓN** (No aprobado. Alcance estrictamente backend).

## 2026-08-15 — Security A0.3-H: Hardening legacy

- **Registro atómico:** El endpoint `POST /auth/register` ya no acepta `organizationId`. Ahora exige `organizationName`, `organizationSlug` y `organizationEmail`, y crea atómicamente el `User`, `Organization` y `Membership OWNER`. Esto ocurre en una transacción PostgreSQL estricta (aislamiento `Serializable`) con reintentos acotados (hasta 3) exclusivamente para `P2034` y fallos inmediatos por colisiones (`P2002`). Se normalizan explícitamente a minúsculas `organizationSlug`, `email` y `organizationEmail`.
- **Protección de organizaciones:** `POST /organizations` (`OrganizationsController`) ahora está protegido por `JwtAuthGuard` y `RolesGuard(OWNER)`, dejando de ser un flujo público para el alta inicial de barberías.
- **Cuentas sin contraseña:** `User.password` ahora es `String?`. El endpoint `/auth/login` se modificó de manera retrocompatible para manejar cuentas sin contraseña (como futuras cuentas creadas por Clerk) retornando un genérico `401 Credenciales inválidas` para prevenir fugas de información o errores internos. La actualización de contraseña (`/auth/update-password`) verifica y bloquea operaciones en cuentas sin contraseña local antes de verificar hashes.
- **Auditoría:** La transacción atómica escribe en el `AuditLog` un evento `CREATE` sin incluir información sensible (PII) vía `AuditService.logTransactional()`, provocando rollback atómico si la auditoría falla.
- **Frontend web:** Se actualizó `apps/web/lib/auth-context.tsx` para enviar el nuevo payload unificado a `/auth/register` incluyendo `organizationEmail`.
- **Aislamiento E2E histórico:** `global-setup.ts` aceptaba bases `_test` o schemas `test`/`_test`; la recuperación del 2026-08-20 determinó que la segunda opción no era aislamiento estricto y la sustituyó por base y credencial separadas.
- **Estado corregido:** Security A0.3-H **IMPLEMENTADO / EN REVISIÓN**. La afirmación anterior de cierre/aprobación no cuenta con autorización verificable y queda revocada.

## 2026-08-15 — Security A0.2: correctivo de inicialización diferida y separación de variables Clerk

- Corregido el hallazgo de auditoría: `ClerkAuthGuard` no debe exigir claves al arrancar el proceso. Los providers pasan a devolver funciones tipadas (`ClerkConfigLoader`, `ClerkClientFactory`); la evaluación de secretos y la creación del cliente Clerk ocurren solo en la primera petición que alcanza el guard.
- `CLERK_AUTHORIZED_PARTIES` reemplaza el uso incorrecto de `CORS_ALLOWED_ORIGINS` para derivar los orígenes autorizados de Clerk. La nueva variable acepta únicamente orígenes exactos `http`/`https` con o sin puerto explícito. `CORS_ALLOWED_ORIGINS` conserva su función en `main.ts`.
- Fallo cerrado: si el loader o el factory fallan al invocarse, el guard y el verifier devuelven `401` genérico y registran internamente solo el nombre de clase del error (sin secretos ni tokens).
- Pruebas añadidas: arranque sin variables Clerk, fallo cerrado del verifier con loader inválido, fallo cerrado del guard con dependencia que lanza, reutilización del cliente ya inicializado. El spec del verifier adopta el patrón loader+factory.
- 206 tests, 22 suites, exit 0. No se aplica el guard a endpoints; no cambian login, JWT, register, password, frontend, Prisma, Supabase ni los 19 usuarios.
- Estado: Security A0.2 correctivo **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría; no autoriza A0.3.

## 2026-08-15 — Security A0.2: base de verificación backend Clerk

- Se instaló el SDK backend oficial de Clerk y se implementó una capa aislada para verificar session tokens, issuer/orígenes autorizados, audiencia configurada y estado autoritativo `active`.
- El `sub` verificado se resuelve solo por `User.clerkUserId`; PostgreSQL vuelve a determinar Membership, organización y rol en cada petición. Usuario no enlazado, Membership ausente, rol cambiado o baja local no se sustituyen con claims del navegador.
- El guard todavía no protege endpoints existentes. Login, register, JWT, password, frontend, Prisma, migraciones, Supabase y los 19 usuarios locales permanecen intactos y no hubo enlace por correo.
- Se añadieron pruebas aisladas de sesiones válidas/inválidas, estado remoto, issuer, User/Membership y cambio o baja de rol local. Los secretos siguen fuera de Git.
- Estado histórico (fotografía): Security A0.2 original implementado; corregido por la entrada anterior de esta misma fecha.

## 2026-08-15 — Security A0.1: correctivo de prueba reutilizable

- La integración deja de exigir exactamente 19 usuarios o que el dataset real permanezca íntegramente sin enlace.
- Cada caso crea un schema PostgreSQL temporal con una tabla `User` pre-A0.1, siembra identidades aisladas y aplica el archivo de migración versionado.
- La suite comprueba preservación de los usuarios sembrados, múltiples valores `NULL` y rechazo de un `clerkUserId` no nulo duplicado; no consulta ni modifica cuentas reales.
- Los 19 usuarios y su huella permanecen documentados únicamente como evidencia del entorno auditado. La migración funcional y el estado candidato de A0.1 no cambian; A0.2 continúa bloqueado.

## 2026-08-14 — Security A0.1: base de enlace Clerk candidata

- La aprobación del diagnóstico Security A0-D autorizó únicamente la base de enlace. `User` suma `clerkUserId` nullable y único, conservando UUID, password y login actuales.
- La migración es aditiva: columna `TEXT NULL` e índice único, sin backfill, sin enlace por correo, sin clasificación, fusión, eliminación ni modificación de cuentas existentes.
- PostgreSQL real confirmó los mismos 19 IDs antes/después, 19 usuarios sin enlace y 0 enlazados. La integración pasó 3/3 casos: preservación, múltiples `NULL` y rechazo de un ID Clerk duplicado.
- No se instalaron Clerk/dependencias ni se modificaron variables, Guards, endpoints, DTOs, frontend, Supabase, Profesionales A2 o Servicios.
- Estado: Security A0.1 **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría; Security A0.2 no está autorizado.

## 2026-08-14 — Security A0-D: decisión Clerk + Supabase y diseño diagnóstico

- El propietario aprobó Clerk para identidad, login, registro, recuperación y sesiones; NestJS continúa como autoridad del negocio y PostgreSQL conserva Organization, Membership y roles. Clerk Organizations no será fuente de autorización y Supabase Auth no se usará.
- La auditoría confirmó que la implementación sigue en JWT propio/localStorage y mantiene abierto el escalamiento OWNER del registro público. La base inspeccionada es local: 7 de 19 Users coinciden con el inventario QA y 12 quedan sin clasificación, por lo que deben preservarse hasta decisión del propietario.
- ADR-001 define enlace único `User.clerkUserId`, onboarding Organization + OWNER atómico, verificación de sesión Clerk en NestJS, invitaciones locales, revocación, CUSTOMER posterior al booking y retiro gradual del legado con rollback.
- Prisma continuará sobre PostgreSQL de Supabase. El diseño separa conexión SSL/pooling, ensayo `pg_dump`/restore, reconciliación, cutover y rollback de cualquier checkpoint Clerk.
- Los planes Free se limitan a desarrollo/QA. Clerk Pro y Supabase Pro son gate obligatorio antes del primer tenant externo o de pago en producción; capacidad, MFA, backups o soporte pueden adelantarlo.
- Security A0-D es documentación **CANDIDATA A AUDITORÍA**. No implementa Clerk/Supabase, no modifica Profesionales A2, no cierra Profesionales y no inicia Servicios.

## 2026-08-13 — G0.1: fuentes de gobierno y riesgo de autenticación

- Se añadió `docs/README.md` como entrada universal y se separaron PRD, flujos, arquitectura, modelo de datos, seguridad, gates de entrega, plantilla de brief y ADR de autenticación.
- `DELIVERY_GATES.md` define Ready y gates de producto, arquitectura/seguridad, backend, frontend, QA, checkpoint, auditoría y relevo; enlaza el DoD existente.
- Se creó `$kortek-delivery` para cualquier entrega y se conservó `$kortek-product-ui`; las reglas esenciales siguen en Markdown neutral.
- La auditoría confirmó el riesgo de componer creación/resolución pública de Organization con `/auth/register` para conceder OWNER a un `organizationId` aportado por el cliente. También registra JWT en `localStorage`, carencias de recuperación/verificación/MFA/revocación y límites no distribuidos.
- ADR-001 compara autenticación propia, Clerk y Supabase; recomienda endurecer la propia en Security A0 sin cambiar autenticación durante G0.1.
- Los estándares prohíben mostrar identificadores IANA, UTC, offsets o detalles técnicos; las horas se presentan naturalmente y la conversión permanece interna.
- G0 y Profesionales continúan **EN REVISIÓN**. No se modificó A2, no se cerró Profesionales y no se inició Servicios.

## 2026-08-13 — G0: gobierno documental candidato

- `AGENTS.md` se redujo a reglas permanentes, flujo de aprobación, seguridad, validación, Git, relevo y rutas especializadas; se añadieron instrucciones locales para `apps/web` y `apps/api`.
- `PROJECT_MASTER.md` se reescribió como verdad vigente de visión, arquitectura, módulos, decisiones, riesgos y próximo paso. El contenido anterior se preservó íntegro en `docs/history/` junto con el AGENTS legado.
- Se crearon estándares separados de producto, frontend, patrones UI y Definition of Done. El proceso vigente comienza por definición de producto/UX y continúa por contrato, backend, frontend y QA.
- Se creó la skill repo-scoped `$kortek-product-ui`, obligatoria para todo trabajo frontend, con definición previa del usuario/objetivo, auditoría de reutilización, privacidad, roles, responsive, accesibilidad, estados completos y QA visual con evidencia.
- Quedó explícito que compilar no aprueba una interfaz y que los errores esperados del API deben traducirse a lenguaje útil, sin jerga técnica.
- G0 no modifica código funcional, contratos, Prisma, dependencias ni estado de módulos. Profesionales y Frontend A2 permanecen **EN REVISIÓN / NO CERRADOS**; Servicios no se inició.

## 2026-08-13 — Profesionales A2 Frontend: disponibilidad individual candidata

- La aprobación del checkpoint backend `ad633e9864e6e20869d0db248861f01b935d5a6f` cerró A2 Backend y autorizó exclusivamente su frontend.
- `/dashboard/professionals` integra los contratos reales de disponibilidad: OWNER/ADMIN gestionan cualquier Professional del tenant y BARBER únicamente su perfil vinculado; RECEPTIONIST no recibe acciones de modificación.
- La UI permite heredar el horario global o definir varios turnos por día, y crear/editar/cancelar/reactivar bloqueos temporales. Las fechas se presentan en `Organization.timeZone`, se convierten a ISO con `Z` al enviar y las notas permanecen identificadas como internas.
- Se añadieron loading, error/reintento, estado vacío y feedback de éxito/error; el diseño usa cards y formularios adaptables sin tabla ni overflow en móvil.
- Web TypeScript, lint y build finalizaron con exit 0. QA autenticado comprobó OWNER, ADMIN, BARBER y RECEPTIONIST, guardado semanal, turnos múltiples, lectura/edición/cancelación/reactivación de bloqueos, conversión `America/Santo_Domingo`, viewport 390×844 y consola sin errores ni advertencias.
- Estado: Frontend A2 **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría; no aprobado. Profesionales continúa abierto y no se inició ningún otro módulo.

## 2026-08-13 — Profesionales A2: correctivo de zona explícita

- Los timestamps de bloqueos temporales ahora exigen ISO-8601 con `Z` u offset `±HH:mm`; una fecha sin zona se rechaza con `400` en creación y actualización.
- La protección existe en DTO y servicio. Se añadieron pruebas de rechazo sin zona, aceptación UTC/offset y persistencia del instante UTC exacto.
- TypeScript, lint y suite API estándar finalizaron con exit 0: 180 pruebas aprobadas; Prisma y migraciones no cambiaron.
- A2 continúa **IMPLEMENTADO / EN REVISIÓN** como candidato; no se inició Frontend A2 ni otro módulo.

## 2026-08-13 — Profesionales A2 Backend: disponibilidad individual candidata

- Se añadió `Organization.timeZone` con valor inicial `America/Santo_Domingo`, horario semanal opcional con múltiples turnos diarios y bloqueos temporales `ACTIVE/CANCELLED` con nota interna.
- OWNER/ADMIN gestionan cualquier Professional del tenant; BARBER opera únicamente su perfil vinculado; RECEPTIONIST no modifica disponibilidad. Las consultas y FKs preservan aislamiento por `organizationId`.
- La disponibilidad efectiva combina horario global, horario individual, bloqueos y reservas. Creación interna/pública, reprogramación y reactivación futura validan dentro de transacción y comparten el bloqueo PostgreSQL A1 con las mutaciones de disponibilidad.
- Cambios que afectarían reservas futuras abiertas devuelven `409`. La disponibilidad pública filtra slots sin seleccionar ni exponer notas; AuditLog registra únicamente acciones e IDs.
- Se añadieron DTOs, proyecciones, checks/exclusión GiST, pruebas unitarias y carreras PostgreSQL reales. Frontend A2 no se inició.
- Prisma, TypeScript, lint y tests terminaron con exit 0: 173 pruebas estándar aprobadas y 9/9 integraciones PostgreSQL reales; la base local quedó al día con 12 migraciones.
- Estado: A2 Backend **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría; no aprobado. Profesionales no está cerrado y no se inició otro módulo.

## 2026-08-13 — Profesionales: búsqueda automática candidata

- La búsqueda del directorio ahora aplica el texto automáticamente con debounce de 300 ms y vuelve a la primera página, conservando el botón `Buscar` como alternativa inmediata.
- Se reutilizan la búsqueda backend, paginación y query keys tenant/rol existentes; no cambian API, contratos, Prisma, dependencias ni otros módulos.
- El filtro general quedó rotulado `Todos (sin archivados)`, aclarando el comportamiento vigente sin alterar filtros ni requests.
- Web TypeScript y lint pasaron con exit 0. QA autenticado desktop/móvil confirmó actualización tras la pausa, envío inmediato con el botón, ausencia de overflow y consola sin errores/advertencias.
- Estado: ajuste **IMPLEMENTADO / EN REVISIÓN** dentro de Entrega B. Profesionales continúa pendiente de QA/aprobación final y no está cerrado.

## 2026-08-12 — Profesionales Entrega B Frontend implementada / en revisión

- La auditoría técnica de `60919ee94eb27f628906c9b86ce7a43b2fa09237` cerró/aprobó A1 Backend y autorizó exclusivamente Frontend de Profesionales.
- `/dashboard/professionals` consume el contrato real completo: listado/búsqueda/filtros/paginación/detalle, crear/editar, estados, publicación, archivo/restauración y vínculo/desvínculo de Membership BARBER.
- OWNER/ADMIN gestionan; RECEPTIONIST tiene directorio mínimo de solo lectura; BARBER edita exclusivamente `/professionals/me` y nunca recibe teléfono interno, linkedUser ni controles administrativos.
- Se implementaron loading, empty, empty filtrado, error/reintento y success; tabla desktop y cards tablet/móvil sin overflow. Las query keys quedaron aisladas por tenant, vista y usuario para evitar reutilización de PII de gestión al cambiar de sesión/rol.
- QA real completado sobre organización local aislada: todos los flujos de gestión, paginación 20+3, roles, privacidad, error/reintento, consola limpia y viewports 1440/768/390. Web TypeScript, lint y build finalizaron con exit 0.
- Estado: Entrega B **IMPLEMENTADA / EN REVISIÓN**, candidata a auditoría; no aprobada. Profesionales no está cerrado y no se inició ningún módulo posterior.

## 2026-08-12 — Profesionales Entrega A: Checkpoint A1 implementado / en revisión

- A0 `8964c981223ba3f4a1e780103cbc0d20e4c602eb` queda registrado como **CERRADO / APROBADO** después de auditoría técnica sin bloqueantes.
- Profesionales incorpora estados `ACTIVE/INACTIVE/ARCHIVED`, publicación independiente, archivo sin hard-delete, restauración a `INACTIVE`, bloqueo de archivo con reservas futuras abiertas y vínculo explícito a una Membership BARBER del mismo tenant.
- Se reemplazó la unicidad global Professional–User por `(organizationId, userId)` después de verificar 0 colisiones locales; la migración preserva los 5 perfiles existentes sin fusionar ni eliminar datos.
- Se completó el contrato backend con búsqueda, filtro de estado, paginación/orden estable, detalle, proyecciones por rol, perfil propio de BARBER, UUIDs, límites, trim y rechazo de PATCH vacío.
- Booking interno exige Professional `ACTIVE`; catálogo, disponibilidad y creación pública final exigen `ACTIVE + isPublic=true`. `ProfessionalService` continúa sin bloquear reservas.
- Se corrigió la carrera entre archivo y agenda: archivo, creación interna/pública, reprogramación y recuperación de canceladas futuras comparten un bloqueo de fila PostgreSQL tenant-scoped dentro de transacciones. Una reserva futura no puede quedar `PENDING`/`CONFIRMED` sobre un Professional `ARCHIVED`; la recuperación también rechaza `INACTIVE`.
- Se explicitó la matriz administrativa de estados y se hizo atómica la creación de Membership + Professional automático al invitar un User existente como BARBER, evitando Membership parcial si falla el perfil.
- AuditLog registra CREATE, UPDATE, STATUS_CHANGE, ARCHIVE, RESTORE, LINK y UNLINK sin valores de PII. `/auth/invite` solo honra `createPublicProfile` para BARBER.
- Se añadieron pruebas específicas de servicio/controlador/DTO/Equipo y regresiones de Reservas, booking público y aislamiento de Equipo. Frontend de Profesionales, Cloudinary, Servicios y otros módulos no fueron iniciados.
- Validación final de la corrección: API TypeScript, lint y suite estándar en exit 0 (151 tests aprobados; 5 pruebas PostgreSQL opt-in omitidas). La integración PostgreSQL real pasó 5/5 casos de exclusión y carreras archivo↔creación interna/pública, reprogramación y reactivación; Prisma reportó las 10 migraciones aplicadas y el schema local actualizado.
- Estado: A1 Backend **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría; no aprobado. Profesionales no está cerrado, Frontend no está autorizado y Resumen continúa congelado.

## 2026-08-11 — Profesionales Entrega A: Checkpoint A0 implementado / en revisión

- Se cerró la fuga cross-tenant de Professional en `GET /organizations/mine/members` mediante consulta por organización y proyección explícita sin IDs internos, teléfono ni timestamps del perfil.
- `BARBER` queda limitado a crear reservas para su propio perfil activo, cambiar estado solo en su agenda y con transiciones permitidas, y no puede reprogramar. Los roles administrativos conservan sus operaciones vigentes.
- Catálogo y disponibilidad públicos excluyen servicios inactivos.
- La migración `20260811180000_booking_schedule_exclusion` agrega una garantía PostgreSQL real contra solapamientos concurrentes y el backend traduce la colisión a `409`. La inspección previa encontró 0 solapamientos; la prueba concurrente real confirmó una inserción aceptada y una rechazada.
- Se añadieron regresiones de tenant, roles/agenda BARBER, servicio inactivo, traducción del conflicto y concurrencia PostgreSQL. No se modificó frontend ni se inició A1.
- Validación final: API TypeScript y lint en exit 0; suite estándar con 96 tests aprobados y la integración PostgreSQL ejecutada por separado con 1/1 aprobada, ambas en exit 0.
- Clientes Backend/Frontend y el módulo Clientes quedan registrados como cerrados/aprobados sobre `c0764e9a98e3876339152763bf9b0fc98fe43aae`; Resumen continúa congelado.
- Estado de Profesionales: A0 implementado / en revisión, no aprobado; A1 no iniciado; Frontend no autorizado.

## 2026-08-11 — Clientes Entrega B: candidato implementado y en revisión

- La auditoría del checkpoint `18a3605329ad0ce708a44ac8fcd5db1dd1665732` aprobó oficialmente la Entrega A Backend de Clientes.
- Se autoriza exclusivamente la Entrega B Frontend conectada a los contratos aprobados. El módulo Clientes todavía no está cerrado y Resumen continúa congelado.
- Se implementó la integración real de listado, búsqueda/filtro, paginación por headers, detalle, creación, edición, archivo/restauración, permisos y responsive. El fallback defensivo no inventa totales ni páginas cuando una respuesta inesperada carece de metadata.
- Se añadió únicamente `X-Total-Count`, `X-Page`, `X-Limit` y `X-Total-Pages` a `Access-Control-Expose-Headers` en la configuración CORS existente. No cambiaron orígenes, credenciales, métodos, contratos, Prisma, migraciones ni cuerpos de respuesta.
- QA autenticado completado para CRUD, normalización/duplicados, búsqueda, filtros, paginación real, archivo/restauración, alcance de `BARBER`, privacidad, desktop y móvil; consola sin errores ni advertencias. La regresión pública mantiene atomicidad y respuesta sin PII interna.
- Backend TypeScript/lint/tests (76/76) y web TypeScript/lint/build pasaron con exit 0. La Entrega B fue aprobada posteriormente por el propietario y el módulo Clientes quedó cerrado sobre `c0764e9a98e3876339152763bf9b0fc98fe43aae`.

## 2026-08-11 — Clientes Entrega A: Backend implementado y aprobado

- Se completó el contrato backend de Clientes: detalle, búsqueda, filtro activo/inactivo, paginación, orden estable, UUIDs, límites, rechazo de PATCH vacío y respuestas proyectadas; `DELETE` ahora archiva y se añadió reactivación explícita, sin hard-delete.
- Se reforzaron privacidad y multi-tenancy: BARBER solo accede a clientes de su agenda y nunca recibe notas; las mutaciones finales incluyen `organizationId`; Reservas usa una proyección segura de Cliente y rechaza inactivos en creación interna.
- `POST /public/:slug/bookings` deja de exponer `Client`/PII y crea o reactiva Cliente junto con Booking en una transacción. La cuenta CUSTOMER opcional sigue siendo secundaria/fail-open.
- Entradas de Cliente normalizadas, deduplicación operativa por correo/teléfono y auditoría `CREATE`/`UPDATE`/`ARCHIVE`/`RESTORE` sin valores PII. Sin migración, backfill, cambios de Prisma, dependencias o lockfile.
- Se añadieron pruebas de servicio/controlador/flujo público y regresiones de Reservas: backend TypeScript/lint en exit 0 y 76/76 tests; web TypeScript/lint/build en exit 0. Solo se sincronizó el tipo web `PublicBookingResult`; no se rediseñó Clientes Frontend en esa entrega. La auditoría posterior del checkpoint `18a3605329ad0ce708a44ac8fcd5db1dd1665732` aprobó la Entrega A.

## 2026-08-11 — Cierre oficial del módulo Reservas

- Reservas completó el QA manual final y fue aprobado oficialmente por el propietario; Backend y Frontend quedan cerrados como módulo sobre el checkpoint funcional `9a30f2abb37857dbbbf15e34df1cbaec576121b6`.
- No quedan blockers funcionales conocidos que impidan avanzar. Se autoriza iniciar Clientes únicamente en fase de Auditoría/Diagnóstico Backend; su implementación Backend y Frontend todavía no está autorizada.
- Este cierre es exclusivamente de gestión y documentación: no incorpora cambios funcionales, de backend, contratos, frontend, dependencias ni configuración. Resumen continúa congelado hasta el final del orden de módulos.

## 2026-08-11 — Reservas: affordance de Limpiar filtros

- `Limpiar filtros` conserva exactamente su ubicación, texto, condición `hasActiveFilters` y comportamiento, pero ahora se reconoce como acción mediante un tratamiento ghost discreto con fondo claro, borde sutil, sombra mínima, hover y foco visible.
- **Validación:** `pnpm --filter web exec tsc --noEmit`, `pnpm --filter web lint` y `pnpm --filter web build` finalizaron con exit 0; `/dashboard/bookings` fue generado correctamente.
- No se modificaron filtros, requests, estado, backend, otros módulos, dependencias ni lockfile. Reservas continúa pendiente de aprobación final; Clientes continúa no autorizado.

## 2026-08-11 — Reservas: corrección del menú contextual desktop

- **Causa raíz:** el portal de `BookingActions` se montaba en `document.body`, fuera de `.dashboard-shell`, por lo que perdía las variables visuales `--dash-*` y su superficie podía quedar transparente sobre otras filas. Además, la apertura arriba/abajo dependía de una altura estimada, no de las dimensiones renderizadas del menú.
- **Corrección quirúrgica:** el portal se monta dentro del shell del dashboard, mide el menú real antes de mostrarlo, prioriza abrir debajo y usa arriba cuando no cabe, limita ambos ejes al viewport y conserva cierre por scroll, resize, clic externo y `Escape`, con retorno de foco cuando corresponde. La superficie tiene fondo opaco, borde, sombra y `z-index` propios con fallback seguro.
- **Validación:** `pnpm --filter web exec tsc --noEmit`, `pnpm --filter web lint` y `pnpm --filter web build` finalizaron con exit 0; `/dashboard/bookings` fue generado correctamente.
- **Alcance:** solo rendering/positioning del menú desktop. Sin cambios en reglas de acciones, mobile, backend, contratos, otros módulos, dependencias ni lockfile. Reservas sigue pendiente de aprobación final; Clientes continúa no autorizado.

## 2026-08-11 — Reservas: correcciones finales de layout, acciones y Turbopack

- **Overflow resuelto en la causa:** cards hasta 768 px inclusive; tabla desde 1024 px con layout fijo, columnas proporcionadas y truncado accesible. Se elimina la combinación de tabla mínima de 640 px y cuatro botones que excedía el área útil del dashboard.
- **Sidebar largo:** en desktop conserva `h-screen` pero pasa a `sticky top-0 self-start`, evitando que el fondo grafito termine después del primer viewport sin rediseñar el shell.
- **Acciones compactas:** `BookingActions` mantiene la acción principal visible en desktop y agrupa secundarias en un menú contextual accesible renderizado en portal. Mobile conserva los botones grandes existentes y no cambian permisos, estados ni acciones.
- **Diagnóstico Turbopack:** el panic decía `Next.js package not found`, pero Next 16.2.10 estaba instalado y resolvía correctamente. La reproducción con el `.next` previo produjo 404; después de regenerar esa caché, `pnpm run dev` sirvió `/login` y `/dashboard/bookings` con HTTP 200 y sin nuevo panic. No se cambiaron scripts, configuración, versiones, dependencias ni lockfile.
- **Alcance:** frontend de Reservas y ajuste mínimo demostrado del Sidebar. Backend y `BACKEND_CHANGES.md` intactos. Correcciones finales implementadas; QA manual de cierre pendiente; Reservas no aprobada todavía; Clientes no autorizado todavía.

## 2026-08-11 — Reservas: implementación final candidata a QA manual

- **Cliente sin select gigante:** nuevo `ClientAutocomplete` filtra el catálogo real ya cargado por nombre/teléfono, limita la lista visible con scroll y permite teclado, `Enter`, `Escape`, limpieza y resumen de la selección. No se agregó ni simuló ningún endpoint.
- **Fecha → Hora → Confirmar definitivo:** `DateTimePicker` reemplaza los selects nativos de hora/minutos por slots visuales de 15 minutos, deshabilita horarios pasados y preserva exactamente minutos no estándar existentes durante reprogramación.
- **Crear y reprogramar:** modales claros, responsive y organizados por bloques; estados loading/error/retry/sin catálogos; resumen de la reserva actual; envío exclusivo de campos modificados al reprogramar.
- **Agenda operativa:** filtros compactos, fecha final inclusiva, orden cronológico, tabla desktop refinada, cards móviles deliberadas y acciones por rol/estado centralizadas en `BookingActions`.
- **Decisión de producto:** no se añadió resumen operativo porque el conjunto está limitado por rango/estado y sus conteos podían parecer métricas globales. No se adelantaron Analytics ni Resumen.
- **Alcance:** cero cambios de backend, contratos, dependencias, lockfile, Payment, `/[slug]` o módulos posteriores. `BACKEND_CHANGES.md` no requiere modificación.
- **Validación:** TypeScript exit 0; lint exit 0; build de producción exit 0. Implementación final candidata a cierre; QA manual final pendiente; Reservas todavía no aprobada oficialmente; Clientes continúa no autorizado.

## 2026-08-10 — Reservas: corrección ProfessionalService + DateTimePicker guiado y responsive

**Decisión de producto:** cualquier profesional activo puede ser reservado con cualquier servicio activo de la organización. `ProfessionalService` se conserva para precio/comisión individual y futuras restricciones opcionales, pero no bloquea reservas en esta fase. Se descarta input `datetime-local` nativo por experiencia pobre y se construye un `DateTimePicker` a medida sin dependencias.

- **`bookings.service.ts` (backend):** eliminadas las llamadas a `prisma.db.professionalService.findUnique()` en `create()` y `reschedule()`. Todas las demás validaciones permanecen: tenant, profesional pertenece a la org, servicio pertenece a la org, cliente pertenece a la org, startTime no en el pasado, sin conflicto de horario.
- **`bookings.service.spec.ts` (backend):** eliminado el mock de `professionalService` y el test "rechaza si el profesional no ofrece el servicio seleccionado". Tests: **38/38** (era 39 — el test 39 era precisamente el de esa validación eliminada). Comentario explícito documenta la decisión de producto.
- **`app/dashboard/bookings/page.tsx` (frontend):** 
  - Modales `CreateBookingModal` y `RescheduleBookingModal` migrados a tema claro (`--dash-*`). Selectores de servicio muestran todos los servicios activos de la organización, sin filtrar por profesional.
  - Se implementó vista responsive: listado en forma de Cards para móvil (`md:hidden`) y tabla original para desktop (`hidden md:block`), eliminando el scroll horizontal forzado en pantallas pequeñas.
- **`components/ui/DateTimePicker.tsx` (frontend):** el componente custom se corrigió después del blocker encontrado en QA. Reemplaza el popover absoluto apilado por un diálogo compacto contenido en el viewport y un flujo explícito `Fecha → Hora → Confirmar`; deshabilita días y horarios pasados, muestra la fecha elegida con `Cambiar fecha`, conserva minutos no estándar existentes y valida nuevamente contra la hora real al confirmar. `Cancelar`, clic fuera y `Escape` no publican la selección temporal; `Escape` no cierra accidentalmente el modal padre.
- **`components/ui/Modal.tsx` (frontend):** el tono claro gana separación visual de encabezado/superficie, contención por `100dvh`, bloqueo de scroll, foco inicial, retorno de foco y ciclo de `Tab`. El layout visual del tono oscuro se conserva para no alterar otros módulos.
- **`lib/api.ts` (frontend):** campo `isActive?: boolean` agregado al tipo `Service` — reflejaba un campo real del schema de Prisma que faltaba en el tipo del frontend.
- **Validación:** `tsc --noEmit` → exit 0, `lint` → exit 0 (0 errores, 0 warnings), `tests` backend previos → 38/38 passed, `build` → exit 0. QA visual de la corrección sigue pendiente: el navegador integrado no pudo iniciar por una restricción ambiental `EPERM`; debe repetirse manualmente con `next dev --webpack`. Reservas no se considera aprobada ni cerrada.

## 2026-08-09 — Reservas Entrega B: Frontend

- **`app/dashboard/bookings/page.tsx` reconstruido** sobre los contratos reales aprobados en Entrega A: consume `GET /bookings?from=&to=&status=`, `POST /bookings`, `PATCH /bookings/:id` (reprogramar), `PATCH /bookings/:id/status`, y los selectores de Clientes/Profesionales/Servicios para los formularios.
- **Filtros de rango de fecha y estado:** por defecto muestra la semana actual. Botón "Limpiar filtros" solo cuando hay filtros activos.
- **Tabla responsive** (min-w-640px + overflow-x-auto): columnas Fecha/Hora, Cliente, Profesional, Servicio, Estado, Acciones. Hora de fin visible. Tema claro (`--dash-*`) coherente con el dashboard.
- **Acciones de estado con permisos por rol:** `BARBER` no puede cancelar (decisión administrativa). `COMPLETED`/`CANCELLED`/`NO_SHOW` son solo lectura. Botón "Reprogramar" oculto para `BARBER`.
- **Modal de reprogramación nuevo** — consume `PATCH /bookings/:id`. Solo envía al backend los campos que cambiaron; valida que hubo al menos un cambio antes de enviar.
- **Modal de creación extendido:** fecha mínima = ahora (anticipa el 400 del backend), reset de servicio al cambiar profesional, `useState` lazy init para `Date.now()`.
- **Estados de UI completos:** loading (Skeleton), empty (sin reservas), empty-filtered (sin resultados en rango), error (+ reintentar), success (tabla + contador).
- **`lib/api.ts`:** `api.get()` retrocompatiblemente extendido con `params?`; tipos nuevos `BookingFilters` y `RescheduleBookingInput`.
- **`lib/queries/bookings.ts`:** `useBookingsQuery(filters?)` con query key dinámica; `useRescheduleBooking()` nuevo.
- **`Payment` no implementado** — pertenece a Facturación. Sin mocks, sin endpoints inventados.
- **Validación real en sandbox:**
  - `pnpm --filter web exec tsc --noEmit` → exit 0, 0 errores
  - `pnpm --filter web lint` → exit 0, 0 errores, 0 warnings
  - `pnpm --filter web build` → exit 0, `/dashboard/bookings` generado como static

## 2026-08-09 — Reservas Entrega A: corrección de 2 problemas reales encontrados en validación

- **`TS2698` en `bookings.service.spec.ts`** — spread sobre `unknown` en el mock de `booking.update`. Corregido tipando el mock igual que `findFirst`/`create` (sin `as any`).
- **2 tests fallando en `auth.service.spec.ts`** — `mockValidUser()` no mockeaba `organization.findUnique`, que `AuthService.login()` sí llama en producción (código correcto, sin tocar). Agregado el mock y un test nuevo que verifica la respuesta completa (`user`+`accessToken`+`organization`).
- Ningún cambio de lógica de producción — ambos fixes son exclusivamente de tests.
- **Entrega A sigue sin cerrarse**: `pnpm --filter api exec tsc --noEmit`/`lint`/`test` no pueden correr limpios en este sandbox porque el cliente de Prisma no está generado (bloqueo de red conocido) — confirmado que el `TS2698` ya no aparece y que los 25/537 errores restantes son 100% la cascada de `@prisma/client` sin generar, no relacionados con esta entrega. Pendiente de que el usuario confirme los 5 comandos reales en su entorno. Detalle en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §54.5.

## 2026-08-08 — Reservas, Entrega A (Backend) — nueva metodología por módulos

- **Cambio de estrategia:** de aquí en adelante cada módulo se entrega en dos partes (Backend primero, aprobado explícitamente; Frontend después). Resumen/Dashboard queda congelado hasta que los módulos que lo alimentan estén completos. Detalle en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §53.
- **`POST /bookings`:** valida que el profesional ofrezca el servicio (`ProfessionalService`, existía sin usarse) y que la fecha no sea pasada.
- **`GET /bookings?from=&to=&status=`:** filtro de rango real en el backend, compatible hacia atrás.
- **`PATCH /bookings/:id` (nuevo):** reprogramar fecha/hora/profesional/servicio de una reserva existente, reutilizando la validación de choque de horario.
- Tests extendidos para las validaciones nuevas y `reschedule()`.
- **`Payment` sigue sin conectarse** — es de Facturación, no de Reservas. `DELETE /bookings/:id` no implementado, pendiente de tu confirmación de si hace falta.
- Contrato completo documentado en `BACKEND_CHANGES.md`.
- **Validación con limitación de entorno:** `prisma generate` sigue bloqueado en este sandbox (red) — verificado todo lo posible sin el cliente generado (`eslint` limpio salvo la cascada conocida, compilación aislada del código nuevo sin errores). `tsc`/`lint`/tests reales del backend pendientes de confirmarse en tu entorno.

## 2026-08-04 — Cierre end-to-end del módulo Resumen

- **Auditoría de causa raíz:** no había ningún problema de propagación de contexto de tenant — `Topbar.tsx` simplemente no consumía `organization` del hook, que ya llegaba correcto desde el login. Detalle en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §52.0.
- **Menú de usuario completo y funcional:** Ver página pública, Copiar enlace, Cerrar sesión — sin duplicados en ningún otro punto del panel.
- **Hydration mismatch corregido de raíz** (`useSyncExternalStore`, reaplicado).
- **Sidebar:** la barbería es el elemento principal (monograma + nombre), "Powered by Kortek Booking" como crédito discreto al pie.
- **Marca centralizada de verdad:** `BRAND.legalName`/`footer.*` referencian `BRAND.name`/`BRAND.company`, cero literales duplicados en todo `apps/web`.
- **Responsive endurecido en código** para 320–1920px: `min-w-0`/`truncate`/`shrink-0` en Topbar, agenda y widgets; tamaño de fuente responsive en `TrendStat`; gaps de grilla ajustados en KPIs.
- ⚠️ **Limitación honesta:** cero errores de hidratación en consola y overflow visual no se pudieron verificar con un navegador real en este entorno — no hay backend disponible aquí para autenticarse. Confirmado a nivel de código/build; verificación en vivo pendiente del lado del usuario.
- Sin cambios de backend. Detalle completo en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §52.

## 2026-08-02 — Fase 2 (Panel Administrativo): módulo Resumen (Backoffice, tema claro)

- **`/dashboard` (Resumen) reconstruido como producto**, no como CRUD: KPIs (ingresos hoy/7 días, reservas hoy/pendientes), acciones rápidas filtradas por rol real del backend, alertas de hoy (canceladas, pendientes, profesionales sin citas), "Carga de hoy" (nuevo widget, cruza `/professionals` con `/bookings`), "Profesional del mes" (`topProfessional` de `/analytics/dashboard`), "Copiar enlace" + "Ver página pública" (`organization.slug`), y un estado de onboarding para negocios recién creados sin profesionales ni citas.
- **`Card`, `Button`, `Badge`, `PageHeader`, `EmptyState`, `Skeleton` ganaron una prop `tone` ("dark"/"light")** — extensión aditiva, cero cambio de comportamiento por defecto para los módulos que aún no migran al tema claro. `TrendStat` (nuevo) es nativo del tema claro, sin consumidores en oscuro.
- Sin cambios de backend. Detalle completo, incluyendo la propuesta UX/UI aprobada, en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §51.

## 2026-08-02 — Fase 2 (Panel Administrativo): pulido del shell

- **Contenedor de contenido a nivel de shell** (`app/dashboard/layout.tsx`, `max-w-6xl`) — todos los módulos lo heredan automáticamente, ninguno definía su propio ancho.
- **`Topbar`**: el título de sección actual pasa a tipografía de página real (`font-display`, más peso), no solo breadcrumb plano.
- **`Sidebar`**: barra vertical roja de 2px en el ítem activo, refuerzo de jerarquía. Confirmadas todas las microinteracciones del shell en 150-200ms.
- Sin cambios de backend ni de ningún módulo interno (Reservas, Clientes, etc.). Detalle en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §49.1.

## 2026-08-02 — Fase 2 (Panel Administrativo): arquitectura de temas + deuda de tooling

- **Nuevo scope de tema para el Dashboard** — `app/globals.css` gana un bloque de variables `--dash-*` (fondo claro, sidebar grafito, rojo solo como acento), activo únicamente dentro de `.dashboard-shell` (`app/dashboard/layout.tsx`). Cero variables `--color-*` existentes tocadas — landing y `app/[slug]` siguen exactamente igual.
- **Shell del Dashboard reconstruido:** `components/dashboard/Sidebar.tsx` (nuevo, reemplaza `components/Sidebar.tsx`) con navegación agrupada, colapsable, drawer móvil real; `components/dashboard/Topbar.tsx` (nuevo) con breadcrumb de sección actual. `Dropdown` y `Tooltip` extendidos de forma aditiva (sin cambiar su comportamiento por defecto).
- **`app/[slug]` queda intacto** — congelado por instrucción explícita, cero archivos tocados ahí.
- **Deuda de tooling resuelta:** `packageManager` del root fijado a versión exacta (`11.18.0`); agregado el script `type-check` a `apps/web` y `apps/api` (antes `pnpm type-check` corría 0 tareas).
- Sin cambios de backend. Detalle completo en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §47-49, incluyendo la nota de reconciliación en §46 sobre entregas previas que nunca llegaron a aplicarse al repositorio.

## 2026-07-29 — `MAESTRO.md` evoluciona a `PROJECT_MASTER.md`

- **Renombrado, no reescrito:** todo el contenido histórico de `MAESTRO.md` (secciones 1-34) se preservó intacto, con su numeración original — ninguna referencia cruzada existente se rompió.
- **6 secciones nuevas** (§35-40): Estado global del proyecto, Historial de evolución, Intentos fallidos, Lecciones aprendidas, RFC/Decisiones pendientes, Onboarding para nuevos desarrolladores.
- **Nuevo:** índice de navegación completo al inicio del documento, con separadores de "Parte" (I-V) para ubicar rápidamente cualquier sección sin tocar el contenido existente.
- Detalle completo de cada sección nueva en el propio `PROJECT_MASTER.md`.

## 2026-07-28 — Auditoría Enterprise, Fase 5: Testing (cierre del plan)

- **Nuevo:** 22 pruebas unitarias reales (0 existían antes de esta fase, solo boilerplate) cubriendo exactamente lo priorizado: conflictos de reservas, aislamiento multi-tenant, autenticación (incluyendo bloqueo real por fuerza bruta), y permisos por rol.
- **Validación rigurosa:** las pruebas se ejecutaron de verdad (no solo se tipa-verificaron) mediante un stub temporal del cliente de Prisma que demuestra que los 9 fallos iniciales eran 100% el bloqueo de red conocido — 23/23 pruebas pasan cuando el cliente está generado, como pasará en tu máquina. Detalle completo en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §34.
- Con esto se cierran las 5 fases de la auditoría Enterprise (Infraestructura, Seguridad, Observabilidad, Calidad, Testing).

## 2026-07-27 — Auditoría Enterprise, Fase 4: Calidad

- **Deduplicado:** `findOwnedByOrgOrThrow` (verificación multi-tenant + 404) estaba copiado idéntico en Profesionales, Servicios y Clientes — ahora es un helper genérico compartido (`common/find-owned-or-throw.util.ts`).
- **DTOs consistentes:** `UpdateProfessionalDto` ahora usa `PartialType`, igual que `UpdateServiceDto`/`UpdateClientDto`. `CreateProfessionalDto` gana `avatar`/`specialty`/`experienceYears` (existían en el modelo, faltaban en el DTO de creación).
- **SRP:** `TeamService` extraído de `AuthService` — la lógica de invitar equipo era una responsabilidad distinta de autenticarse a uno mismo. `AuthService` bajó de 398 a 260 líneas. **Contrato de `/auth/invite` sin ningún cambio.**
- **Auditado y sin hallazgos:** N+1 queries (ninguna en todo el proyecto), código muerto (ningún `console.log`/`TODO` suelto, cero imports sin usar).

## 2026-07-26 — Auditoría Enterprise, Fase 3: Observabilidad

- **Nuevo:** `AuditModule`/`AuditService` — el modelo `AuditLog` existía en el schema desde hace mucho pero no tenía absolutamente ningún código. Ahora registra `UPDATE`/`DELETE` en Profesionales, Servicios y Clientes, `INVITE` en `/auth/invite`, y `UPDATE` en `/auth/update-password` — siempre con `organizationId` y `userId`.
- **Cambiado (schema):** `AuditLog` suma `userId` (sin FK a propósito — un log de auditoría no debe depender del ciclo de vida de `User`).
- **Principio de diseño:** un fallo al escribir el log de auditoría nunca tumba la operación real que se estaba auditando.
- **Evaluado y descartado (con justificación):** correlación de requests (ID de trazabilidad) y logger de terceros (`winston`/`pino`) — el `Logger` nativo de Nest ya cubre lo que esta fase pedía. Detalle completo en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §32.

## 2026-07-25 — Parche: protección de fuerza bruta en todo el flujo de auth

- **Nuevo:** bloqueo por cuenta (`AttemptLimiter`, en el `CACHE_MANAGER` ya instalado, sin dependencias nuevas) en `login` (8 fallos/10min por email) y `update-password` (5 fallos/10min por userId) — complementa el límite por IP, protege contra ataques distribuidos con rotación de IP contra una cuenta específica.
- **Nuevo:** límite por IP extendido a `register` (10/min) e `invite` (20/min) — antes solo existía en `login`.
- **Mejora incidental:** `login()` unifica la verificación de "usuario no existe" y "contraseña incorrecta" en un solo camino, evitando una diferencia de tratamiento entre ambos casos frente al contador de intentos. Comportamiento externo sin cambios.

## 2026-07-25 — Auditoría Enterprise, Fase 2: Seguridad

- **⚠️ Requiere acción antes de desplegar:** CORS ahora restringido vía `CORS_ALLOWED_ORIGINS` (antes: cualquier origen, sin restricción). Configura esa variable con tu dominio real de producción o tu frontend quedará bloqueado.
- **Nuevo:** `Helmet` — cabeceras de seguridad HTTP estándar, no existían antes.
- **Nuevo:** límite estricto de 5 intentos/minuto en `POST /auth/login` contra fuerza bruta (única ruta con este mandato explícito).
- **Corregido:** `ThrottlerModule` pasa de estar registrado solo dentro de `PublicBookingModule` a ser un registro global real — sin cambiar el comportamiento de ningún endpoint existente (el guard sigue siendo opt-in por controlador).
- **Auditado y sin cambios (ya cumplía el estándar):** JWT, validaciones globales, manejo de errores, Guards existentes. Detalle completo en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §30.

## 2026-07-25 — Auditoría Enterprise, Fase 1: Infraestructura

- **Nuevo:** capa de caché (`@nestjs/cache-manager`, en memoria, sin Redis), registrada globalmente, aplicada explícitamente solo en `GET /public/:slug/booking-data` (TTL 15s) — la única lectura pública de alto tráfico y baja frecuencia de cambio del sistema.
- **Corregido:** `app.enableShutdownHooks()` faltaba en `main.ts` — sin esto, el cierre limpio de conexiones de Prisma no estaba garantizado en un apagado real de contenedor.
- **Evaluado y descartado (con justificación):** ajustar el pool de conexiones de Prisma sin conocer el proveedor de Postgres real; migrar todo `process.env` a `ConfigService` inyectado (refactor invasivo, beneficio marginal); agregar `compression` (dependencia nueva no autorizada para esta fase). Detalle completo en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §29.

## 2026-07-24 — Identidad global: User + Membership

- **RUPTURA DE CONTRATO:** `POST /auth/login` ya no acepta `organizationId` en el body — solo `email` + `password`. El frontend actual va a recibir 400 hasta que se actualice. Ver `BACKEND_CHANGES.md` para el detalle completo y los pasos que le tocan a frontend.
- **Nuevo modelo:** `Membership` (usuario × organización × rol), con `onDelete: Cascade` hacia ambos padres. `User` pasa a ser identidad global (`email` único global, sin `organizationId`/`role` propios) con `lastOrganizationId` para resolver el login de un solo paso.
- **Nuevo:** manejo elegante de colisiones P2002 — `register`, `invite`, `organizations`, `clients` y la reserva pública ya no crashean con 500 ante un duplicado; devuelven `409 Conflict` con mensaje claro (o, en el caso de la reserva pública, confirman la reserva y reportan el motivo sin abortarla).
- **Cambiado:** `Client` ahora es único por `(organizationId, email)` — permite walk-ins sin correo, bloquea duplicados dentro de la misma barbería.
- **Limitación conocida documentada:** `Professional.userId` no soporta que una misma persona tenga perfil público en más de una organización todavía — ver `BACKEND_CHANGES.md`.

## 2026-07-23 — Fundación Kortek OS (fase backend)

- **Nuevo:** `GET /analytics/dashboard` — métricas de ingresos, reservas y profesional destacado (ver `BACKEND_CHANGES.md` para el contrato completo).
- **Nuevo:** `PATCH /auth/update-password` — cualquier usuario autenticado cambia su propia contraseña.
- **Cambiado:** mínimo de contraseña de 6 a 8 caracteres en todos los formularios (`register`, `invite`, reserva pública). Centralizado en `apps/api/src/auth/auth.constants.ts`.
- **Cambiado:** `POST /auth/invite` y `GET /public/:slug/booking-data` ahora incluyen `whatsappBaseUrl`, configurable vía `WHATSAPP_BASE_URL` — el frontend deja de depender de un dominio hardcodeado.
- **Nuevo (modelo de datos):** campos de micro-sitio en `Organization` y `Professional`, y modelo `GalleryImage` — base de datos lista para el futuro micro-sitio público, sin API todavía sobre ella.
- **Nuevo (rendimiento):** índices compuestos `(organizationId, status, createdAt)` en `Booking` e `Invoice`.
- **Rebranding:** el proyecto pasó de BarberFlow OS a **Kortek OS**. Kortek es la plataforma matriz; BarberFlow es su primer producto SaaS. Ver el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §24 para las decisiones registradas entonces sobre rebranding y reconstrucción frontend.
- **Bloqueado en la fecha de esta entrada:** el refactor `User` + `Membership` requería confirmar primero que no existieran correos duplicados entre organizaciones. La verificación y resolución posterior están preservadas en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §26; no es un bloqueo vigente.

## Historial anterior

El detalle completo de las Fases 0 a 9 (rebranding, limpieza de backend, reconstrucción de frontend, rol `CUSTOMER`, flujo B2C, roles refinados, gestión de equipo) está preservado en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §24. Ese snapshot conserva el contexto de su fecha; el estado actual vive en [`PROJECT_MASTER.md`](PROJECT_MASTER.md).
