# Documentación de Kortek Booking

## M3 Calendario y reagendar: C0 aprobado — 2026-10-10

**C0 APROBADO POR EL PROPIETARIO / SOLO DOCUMENTAL; SIN IMPLEMENTACIÓN.** [C0, contrato propuesto y plan de validación](quality/M3_CALENDARIO_C0.md): D1–D7 FIJADAS en A y D8 FIJADA. Formateador en dos fases: M3 incluye módulo puro compartido con vectores de paridad y migración web de calendario, lista, detalle y reagendar; plantillas de correo y demás consumidores API quedan para gate propio posterior. M3 no toca plantillas ni payloads sellados. Bases de compatibilidad aportadas por el propietario registradas sin nueva evidencia operativa; despliegue futuro migraciones → API → web compatible con API anterior. M3 requiere C1 backend y aprobación antes de C2; no se autoriza implementar ni ejecutar QA. Único commit/push documental autorizado a ai/antigravity-qa desde 523d993; sin cambios de producción/QA en ejecución, bases reales, flags, variables o ai/reserva-invitado-ci. Historial inferior preservado.

## Concurrencia E2E y preparación de Chrome en CI — 2026-10-08

**IMPLEMENTADO / VALIDADO LOCALMENTE / EN REVISIÓN.** Supertest cerraba el servidor iniciado por la primera solicitud mientras otras seguían pendientes; causa probable de los resets Linux, sin reproducción nativa en Windows. La contaminación tras Promise.all se demuestra con reset inyectado y PG18.1. Las dos suites mantienen puertos por instancia, agente explícito y esperan todo el lote antes de limpiar; cifras 35/80 y aserciones intactas. Cinco repeticiones: 125/0/0; E2E completo: 272/0/1; tipos/lint y Chrome dry-run pasan. Browser smoke instala explícitamente Chrome con dependencias. Linux/runner/PG16 pendientes del CI del PR 4; sin QA ni cambios de producto, migraciones, matriz, flags o dependencias. Un commit/push solo a ai/reserva-invitado-ci. [Informe, certeza y evidencia](quality/CI_CONCURRENCIA_HTTP.md).

## Entorno sintético del CI y lectura API — 2026-10-08

[Inventario por paso, resultados y evidencia](quality/CI_ENTORNO_SINTETICO.md): JWT_SECRET era la única variable obligatoria ausente; quality.yml genera claves efímeras y las enmascara solo en los pasos unitarias/componentes e integridad/E2E. Entorno limpio sin dotenv ni variables del arnés anterior: PG18.1, Prisma/runtime/tipos/lint, API 836/0/41, web 158+130, builds originales, API E2E 272/0/1 y browser 21/0/1 pasan. PG16/runner GitHub no reproducibles aquí; PR nuevo pendiente. Lectura mínima SSH autorizada: API active, PID 1523015, NRestarts 0, imagen 8ba1b6c8… y release b318ca5 exactos. Implementado/en revisión; publicación solo rama temporal, sin producto, contratos, dependencias, flags, migraciones ni cambios remotos.

## Diagnóstico Runtime privilege matrix gate y deployment web — 2026-10-08

[Informe, reproducción y límites](quality/DIAGNOSTICO_RUNTIME_PRIVILEGE_GATE.md): fallo aportado **(a), preparación CI**; las dos funciones son INVOKER pero quedan del runner por el clon. Migración 28 intacta. `9f04dba` también falla, por otra causa: CustomerOperation ausente de la matriz histórica. Correctivo solo del workflow: base independiente migrada como `kortek_migrator`; PG18.1 pasa guardia/gate y bloque Bash completo. PG16 no disponible localmente; CI remoto pendiente. Lectura autorizada confirma ahora alias web en **dpl_8iqUtQ6XMYgPv1wF3FcnpbczoaWe, READY, b318ca5**, distinto de dpl_KEKT6X12; sustituye el identificador anterior como estado actual, sin verificar variables/login. Commit/push solo `ai/reserva-invitado-ci`, implementado/en revisión; sin QA, bases reales, cambios de proveedores ni producción.

## Clave Clerk rotada en API QA — 2026-10-08

[Registro de actualización, hashes y verificaciones](quality/CLERK_ROTACION_API_QA_2026_10_08.md): solo `CLERK_SECRET_KEY` sustituida, editor adaptado autorizado/ensayado, copia protegida y reinicio exclusivo del API. Release/imagen b318ca5 preservados, GET/CORS aprobados, cero 5xx y coincidencias de errores Clerk en la ventana observada; worker intacto. Alias QA sigue en `dpl_KEKT6X12exUWoReFRPtxxTXGuo9K`, READY/b318ca5; nuevo deployment de rollback no confirmado, sin reasignación. Sin sesión real probada ni cambios de producción/bases/Clerk/Vercel. Commit/push documental solo a `ai/reserva-invitado-ci`.

## Cierre documental de reserva invitada en QA — 2026-10-08

**C3: ACEPTADO POR DECLARACIÓN DEL PROPIETARIO, sin evidencia capturada.** Pruebas manuales satisfactorias declaradas en iPhone sobre `qa.booking.kortek.cloud`, sin casos enumerados. Reserva invitada activa en QA con pareja `b318ca5`, API `sha256:8ba1b6c8…` y web `dpl_KEKT6X12…`; M2 retirada. Otros dispositivos/navegadores, correo real, WhatsApp real y concurrencia no verificados. Reservas residuales conservadas; limpieza transaccional fuera de alcance por decisión del propietario. Rollback no ejecutado, artefactos anteriores retenidos; restaurarlos reexpone B2C. [Registro vigente y pendientes por riesgo, sin ejecución](features/RESERVA_INVITADO_C3_CIERRE_QA.md). Este cierre sustituye los estados previos de C3 pendiente/detenido conservados debajo como historia. Solo documentación, un commit y push a `ai/reserva-invitado-ci`; prohibidos `ai/antigravity-qa` y main. Producción cerrada; sin consultas ni cambios de proveedores/bases en este gate.

## Correctivo Dependency and peer audit — 2026-10-07

Gate único sobre `36061fc`, rama temporal `ai/reserva-invitado-ci`. Audit local pnpm 11.18.0: 11 avisos en versiones idénticas a la base, corregidos mediante parches/minor de Next, sharp, multer, proxy-addr y source-map-js; pins exactos autorizados después por el propietario. Audit y peers estrictos exit 0. Tipos/lint y builds API/web pasan; PG18.1 nuevo: 877/0/0 unitarias API, 272/0/1 e2e API; web 158+130 pruebas y browser 21/0/1, exit 0. Clúster propio eliminado. Validado localmente/en revisión; commit/push autorizados solo a la rama temporal, sin merge, workflows, contratos, proveedores, QA desplegada ni producción. CI remoto posterior no verificado. [Informe y evidencia](quality/CORRECTIVO_CI_DEPENDENCY_PEER_AUDIT.md).


## Correctivo Retry-After, CI y evidencia — 2026-10-07

Gate único local sobre base `58f536f`: restante de bloqueo/expiración calculado en el mismo upsert y reloj PostgreSQL; 30/min, bloqueo 60 s, fail-closed y HMAC preservados. Caso original intacto; 20/20 clústeres fríos pasan con header 60. Solo dos separadores Jest retirados de quality.yml y una regla whitespace para evidencia .txt, con 40 hashes existentes idénticos. Unitarias API 877/0/0, e2e 272/0/1 y browser 21/0/1, exit 0; implementado/en revisión. Resultado final de suites y P4b en [informe del correctivo](quality/CORRECTIVO_RETRY_AFTER_CI_WHITESPACE.md). Tres commits locales separados, sin push/proveedores/QA/producción/dependencias ni contratos nuevos. Ningún gate posterior abierto.

## Preparación del candidato QA — sólo plan, 2026-10-07

Revisión preparatoria local y plan de commit/P4b/push/pareja API-web/rollback/fixtures entregados. Referencia remota sólo local `9f04dba`: 20 commits previos no publicados requieren auditoría del rango completo antes de push. Sin staging, commit, fetch, proveedores, POST, despliegue ni cambios QA/producción/Clerk/variables/servicios/DB. C3 permanece incompleto; ninguna autorización de ejecución inferida. [Plan, inventario y matriz de autorizaciones](features/RESERVA_INVITADO_PREPARACION_QA.md).


## C3 QA autorizado — preflight detenido, 2026-10-07

C3 permite validar QA sin publicación. Preflight vivo: API `bc1d559`, web `9f04dba`, ambos anteriores al candidato C0/C1/C2 no commiteado. API aún registra CustomerModule/alta secundaria/flags y GET `/customer/businesses` da 401. Se detienen pruebas funcionales y cualquier POST: activar el candidato exige despliegue, prohibido en esta autorización. Sólo documentación/evidencia local; ningún dato sintético creado, ningún cambio QA/Clerk/schema/flags/variables/producción/P4b. C3 INCOMPLETO; no se infiere aprobación. [Causa, comandos, versiones, límites y propuesta separada](features/RESERVA_INVITADO_C3_PREFLIGHT.md).


## C2 reserva invitada — validado localmente / en revisión, 2026-10-07

Autorización posterior de C2 local: retirado el portal B2C exclusivo, navegación, proveedor, hooks, páginas y paso de cuenta. `POST /public/:slug/bookings` responde sólo `{booking}` después de migrar los consumidores ejecutables conocidos de `accountCreated`/`accountCreationError`; quedan únicamente assertions negativas e historia. Client operativo y roles internos/Clerk preservados. 871 pruebas API (0 omitidas), 37 integraciones anteriores + 4 HTTP PostgreSQL y 288 pruebas web aprobadas; tipos/lint/build de ambas apps pasan. Nueve escenarios locales Chrome de flujo, foco/teclado/campos/overflow/consola aprobados, con transporte y Clerk controlados; no equivalen a QA/proveedor/dispositivo físico. C2 implementado y validado localmente, en revisión del propietario; **C3 NO EJECUTADO**. Sin commit/push/PR/despliegue, cambios de QA/producción, Prisma/migraciones ni P4b. Los checkpoints inferiores conservan sus estados fechados; las menciones C2 pendiente y campos deprecated quedaron superadas por este registro.

[Informe C2, inventario, contrato, resultados, diff y rollback](features/RESERVA_INVITADO_C2_LOCAL.md).


## Validación PostgreSQL posterior — 2026-10-07

[Informe de cierre técnico C1](features/RESERVA_INVITADO_C1_CIERRE_TECNICO.md): PostgreSQL 18.1 desechable, 28 migraciones intactas y gate runtime aprobados; **37/37 integraciones + 2/2 HTTP claim, 0 omitidas, exit 0**. Se corrigió una expectativa H5 obsoleta según F0-D/2A aprobado, conservando su fallo inicial. C0 aprobado; C1 validado localmente, candidato a cierre técnico/en revisión, **sin aprobación de cierre ni commit**; C2/C3 pendientes y detenidos. Sin commit/push/despliegue ni QA; Clerk, datos reales y P4b intactos. Los resultados inferiores conservan sus checkpoints fechados y no implican una repetición nueva.

## Alcance vigente — 2026-10-07

**Reserva exclusivamente de invitado; cuenta de cliente final fuera del producto/MVP.** [Entrega C0/C1 de retiro B2C](features/RESERVA_INVITADO_C0_C1.md): C0 aprobado; C1 implementado y validado parcialmente en local, en revisión; C2 pendiente; C3 pendiente, sin commit/push/despliegue ni QA. `Client` es ficha operativa del negocio. C2/C3 pendientes de autorización separada; la web local aún contiene el portal anterior. Las referencias M2/A0.6 inferiores conservan historia y no autorizan continuidad B2C. Datos y compatibilidad intactos; Clerk y autenticación interna preservados; P4b excluido.

[Checkpoint corregido de consistencia](features/RESERVA_INVITADO_CONSISTENCIA_C0_C1.md): positivos de claim retirados de pruebas activas y helpers segregados como historia tras autorización posterior. 308 pruebas web y 22 HTTP API aprobadas; 37 integraciones PostgreSQL aprobadas en el ensayo posterior superior. UI B2C pendiente de C2; sin publicación ni QA.

Consolidación documental local — 2026-10-03, posterior a C2 `d222115`: [alcance vigente y contradicciones históricas](../PROJECT_MASTER.md). **Un commit local autorizado; sin push ni despliegue** por la migración 28 pendiente en el API QA. M2 C1 está [cerrado/aprobado](quality/M2_C1_CIERRE.md#aprobación-explícita-del-backend-c1-y-bloqueo-de-producción--2026-10-03); [D4](quality/M2_C1_CIERRE.md#riesgo-residual-d4-aceptado-solo-para-qa-bloqueante-en-paso-8) se acepta solo para QA y bloquea Paso 8. C2 mantiene su [estado local/en revisión](quality/M2_C2_CIERRE.md).

Las referencias históricas inferiores a confirmación UX pendiente, C3 en revisión y respaldo retenido contradicen el estado posterior aprobado, conservado en la cabecera y en los registros de [aprobación UX](quality/RESERVA_PUBLICA_CONFIRMACION_UX.md#aprobación-posterior-del-propietario--2026-10-03) y [limpieza previa](quality/RESERVA_PUBLICA_M1_C3_CIERRE.md#antecedente-de-aprobación-y-limpieza--2026-10-03). El [JSON de aprobación/limpieza](quality/evidence/m1-c3/aprobacion-cierre-20261003.json) documenta SHA previo y eliminación; el [JSON del cierre documental](quality/evidence/m1-c3/cierre-documental-20261003.json) acredita ausencia posterior. Ambos se conservan sin reescribir evidencia ni repetir operaciones o QA.

Estado vigente al 2026-10-03: **M1 (Reserva pública) CERRADO / APROBADO POR EL PROPIETARIO**, incluida su revisión física en iPhone/Safari según autorización escrita. [Cierre documental, respaldo y deuda de Paso 8](quality/RESERVA_PUBLICA_M1_C3_CIERRE.md) · [Evidencia de esta ejecución](quality/evidence/m1-c3/cierre-documental-20261003.json). Producción continúa cerrada y ningún gate posterior se abre. Las entradas inferiores se conservan como registros históricos y no revocan este cierre.

Ajuste posterior F0-E — 2026-10-02: **PUBLICADO Y DESPLEGADO SOLO WEB QA / EN REVISIÓN**. Código/evidencia `68fd3c0`; Preview `dpl_GbsN4Gr91MsaLsgQcQFe4J3FM1pg` Ready en 39 s, SHA exacto y alias `qa.booking.kortek.cloud` comprobados. Por atender incluye emisión pendiente; Todas prioriza atención y fechas descendentes. Desktop recupera dos acciones cuando corresponden; fotos redondeadas uniformes, salida/contactos más visibles y WhatsApp previo a reservar en mini-sitio. 290 pruebas, tipos/lint/build y 123 registros de navegador pasan. API QA GET `200/200`; comparación final de contenedores, unidades, archivos protegidos y main sin cambios. [Informe y límites](quality/CORRECTIVO_F0E_AJUSTE.md). M1 y QA física continúan en revisión; sin backend ni producción. Los cuatro documentos pendientes del despliegue anterior se incorporaron a este checkpoint autorizado.

Correctivo F0-E — 2026-10-02: **PUBLICADO Y DESPLEGADO SOLO WEB QA / EN REVISIÓN; M1 NO CERRADO**. Código `26cfc42`, documentación/enmiendas `ea912d9`, SHA local/remoto iguales. Preview `dpl_G9RGGb5W9qedEGXZbNMAyUTfsHNi` Ready, alias qa.booking.kortek.cloud y SHA exacto comprobados. 283 pruebas, tipos regenerados, lint y build pasan; 95 registros locales y revisión QA real en 320/375/390/1280. API C1 por GET y comparación de producción pasan; sin API/DB/migraciones/flags/variables/SSO modificados. Norte/Sur carecen de teléfono publicado; no se cambió. [Hashes, límites y guía de QA](quality/CORRECTIVO_F0E.md). Enmiendas 22–24 fijan direcciones D1-A/D2-A/E-A para módulos propios posteriores. QA física y panel autenticado desplegado pendientes; cuatro documentos finales locales sin tercer commit.

Correctivo M1 — 2026-10-02: **PUBLICADO Y DESPLEGADO SOLO WEB QA / EN REVISIÓN; M1 NO CERRADO, QA FÍSICA PENDIENTE**. Código `843996e` en `origin/ai/antigravity-qa` y web QA READY; commit documental posterior registra el resultado. Tipos/lint/build y 281 pruebas pasan; 28 mediciones locales y cuatro desplegadas en 320/375/390/1280 sin overflow. [Hashes, evidencias y pendientes](quality/RESERVA_PUBLICA_M1_UX_CORRECTIVO_QA.md). Backend y producción intactos; ejecución programada del backup auditada. Reemplaza solo la presentación de UX ligera.

Publicación ejecutada — 2026-10-01: **UX LIGERA PUBLICADA Y DESPLEGADA SOLO WEB QA / EN REVISIÓN; M1 NO CERRADO, QA FÍSICA PENDIENTE**. Commits `dc82a4f` y `9d2eb47` en `origin/ai/antigravity-qa`, publicación al repositorio público confirmada explícitamente. Web QA READY en `9d2eb47`, API C1 existente verificada (availability-days/D11 neutro sin crear reservas). [Hashes, evidencia, límites y guía iPhone](quality/RESERVA_PUBLICA_M1_UX_LIGERA.md). Producción/main `fe4b117`, imagen/PID/API, variables, flags, SSO y proveedores intactos. Banderas cargan en navegador; cabecera CSP del documento autenticado no expuesta por la herramienta, sin relajar protección. Respaldo cifrado C3 ignorado y retenido. Enmiendas 16–21 exactas, tipos/lint/build y 275 pruebas con exit `0`. Tercer commit documental registra el resultado; las entradas inferiores preservan el contexto histórico y no revocan esta publicación.

Esta es la entrada universal para cualquier agente o persona que trabaje en el repositorio. La documentación separa estado vigente, reglas permanentes, contratos e historia para evitar que una entrada antigua se interprete como una decisión actual.

## Lectura mínima obligatoria

1. [`AGENTS.md`](../AGENTS.md): reglas permanentes, seguridad, Git y relevo.
2. [`PROJECT_MASTER.md`](../PROJECT_MASTER.md): estado, decisiones, riesgos y siguiente etapa.
3. [`DELIVERY_GATES.md`](quality/DELIVERY_GATES.md): Definition of Ready y gates de la entrega.
4. Documento de producto, arquitectura o área aplicable.
5. Código real relacionado: demuestra qué está implementado.

Las instrucciones específicas de área están en [`apps/api/AGENTS.md`](../apps/api/AGENTS.md) y [`apps/web/AGENTS.md`](../apps/web/AGENTS.md).

## Mapa de fuentes

### Producto y experiencia

Confirmación pública de reserva y pies de mini-sitio: [brief, implementación y QA pendiente](quality/RESERVA_PUBLICA_CONFIRMACION_UX.md), desplegada solo en web QA/en revisión, sin cambios al contrato o API; validación visual del propietario pendiente.

Revisión posterior autorizada: [Reserva pública más ligera](quality/RESERVA_PUBLICA_M1_UX_LIGERA.md), **implementada localmente/en revisión; QA de cierre incompleto**. Filas compactas, semana/mes desplegable, horas visibles, teléfono por país y resumen abierto sobre C1 aprobado. Tipos/lint/build y 275 pruebas pasan; evidencia responsive y API/PostgreSQL local aislado. Físicos, zoom 200 %, importación de calendario, auditoría y aprobación pendientes. Sin publicación/despliegue; historia y trabajo C3 preservados.

Estado vigente M1 C3: **ACTIVADO SOLO EN QA / EN REVISIÓN**, sin cierre ni aprobación M1. [Informe, evidencia y guía iPhone](quality/RESERVA_PUBLICA_M1_C3_CIERRE.md): respaldo local cifrado restaurado, 36/36 tablas y 27 migraciones iguales; plano/contenedor eliminados, cifrado retenido hasta aprobación M1. API `791569b` activada y Preview exacto existente reasociado después; §5 pasa con D11 opción A, limitador real y altas PENDING exclusivamente sintéticas. Recorrido web documentado y comparación productiva/main/worker QA iguales. Sin migración, grants, flags, proveedor, commit ni push. Safari/iPhone, casos no cubiertos y aprobación final pendientes; entradas inferiores conservan contexto anterior.

Estado posterior de M1 C2: frontend cerrado/aprobado expresamente por el propietario, quien aclaró «No hay condiciones, sigue adelante». Commit/push autorizados exclusivamente a `origin/ai/antigravity-qa`, sin despliegue. [Registro de aprobación, validaciones y publicación](quality/RESERVA_PUBLICA_M1_C2_CIERRE.md). C3/QA física y producción siguen sin autorización; la entrada siguiente conserva el contexto de la entrega original.

- [`RESERVA_PUBLICA_M1_C2_CIERRE.md`](quality/RESERVA_PUBLICA_M1_C2_CIERRE.md): frontend C2 autorizado posteriormente sobre C1 aprobado `d9b508f8317bf128fb409c0a22098895f24ea5fb`, implementado/en revisión. Ruta propia, cinco pasos, calendario D6-B real y éxito pendiente; pruebas, navegador responsive y cuatro roles/dos negocios sintéticos en PostgreSQL desechable. Sin commit/push/despliegue ni bases reales. C3 requiere primero desplegar el API QA y después QA física/autorización separada; producción cerrada. Las referencias C0/C1 inferiores conservan su contexto histórico.

- [`RESERVA_PUBLICA_M1_C1_CIERRE.md`](quality/RESERVA_PUBLICA_M1_C1_CIERRE.md): backend C1 aprobado expresamente el 2026-10-01 con riesgos residuales aceptados y commit/push autorizados solo a `origin/ai/antigravity-qa`, sin despliegue. Días por rango, fotos existentes, aislamiento y límite compartido medido; D11 con error genérico conservando rechazo, HTTP/cuerpo y rollback probados. Único gate en curso: publicación Git del checkpoint. C2/C3 y producción no se abren. La referencia C0 inferior conserva su estado histórico previo; las decisiones quedan resueltas por las instrucciones posteriores del propietario.

- [`RESERVA_PUBLICA_M1_C0.md`](quality/RESERVA_PUBLICA_M1_C0.md): C0 documental de M1 entregado/en revisión, sin implementación; decisiones previas FIJADAS y D5–D13 pendientes. Ruta de reserva separada, fotos públicas elegibles, calendario/hora compacta, éxito PENDING, privacidad y QA futura. Requiere C1 para días disponibles por rango, sin autorizar C2 ni apertura productiva.

- [`HORARIO_ZONA_C1_CONTRATO.md`](features/HORARIO_ZONA_C1_CONTRATO.md) y [`HORARIO_ZONA_C1_EVIDENCIA.md`](features/HORARIO_ZONA_C1_EVIDENCIA.md): D1–D15 A; backend C1 aprobado, commit `b0357af`. [Integración local](features/HORARIO_ZONA_C1_INTEGRACION_LOCAL.md).
- [`HORARIO_ZONA_C2_FRONTEND.md`](features/HORARIO_ZONA_C2_FRONTEND.md): D14-A implementado y C2 cerrado/aprobado por el propietario en Preview sobre Cutover QA y datos sintéticos. D9, A2, CMS y Facturación tienen evidencia aceptada; correo/promociones conservan la cobertura de C1 y de sus módulos. Dental Ross y Prueba de oro siguen sin migración ni confirmación de horario productivas hasta que el propietario decida sus horarios reales y lo autorice por separado.
- [`HORARIO_ZONA_C0_AUDITORIA.md`](features/HORARIO_ZONA_C0_AUDITORIA.md): auditoría histórica; las alternativas A fueron seleccionadas posteriormente para C1.

- [`MEDIOS_PROMOCIONES_C3_ACTIVACION.md`](features/MEDIOS_PROMOCIONES_C3_ACTIVACION.md): C3 cerrado/aprobado expresamente, cuota de moderación en 0 hasta el próximo ciclo, respaldo/restauración y actualización verificada de desarrollo a 25 migraciones, con limpieza posterior de QA.
- [`MEDIOS_PROMOCIONES_C2_FRONTEND.md`](features/MEDIOS_PROMOCIONES_C2_FRONTEND.md): editor de medios/promociones, avatar propio y consumo público; QA funcional/visual de cuatro roles, dos tenants, proyección pública real y cuota de moderación agotada con `503` real. C2 cerrado/aprobado.
- [`MEDIOS_PROMOCIONES_C1_CONTRATO.md`](features/MEDIOS_PROMOCIONES_C1_CONTRATO.md): decisiones D1–D8/D5b y backend C1 aprobados expresamente para C2; Cloudinary Free y Rekognition Free probados en ciclo integrado real.
- [`MEDIOS_PROMOCIONES_C0_AUDITORIA.md`](features/MEDIOS_PROMOCIONES_C0_AUDITORIA.md): auditoría documental C0 aprobada; sus opciones históricas quedaron resueltas en la autorización posterior de C1.

- [`NOTIFICACIONES_C3_ACTIVACION.md`](features/NOTIFICACIONES_C3_ACTIVACION.md): C3 cerrado/aprobado tras QA real de las cinco plantillas y cinco entregas `DELIVERED`; canal pausado, webhook temporal eliminado y sin producción.

- [`NOTIFICACIONES_C2_FRONTEND.md`](features/NOTIFICACIONES_C2_FRONTEND.md): C2 cerrado/aprobado explícitamente; historial, opt-in y reintento. Pruebas, QA real de cuatro roles/dos tenants y altas pública/interna documentados. C3 temporal fue aprobado después; ver documento de activación.

- [`NOTIFICACIONES_C1_CONTRATO.md`](features/NOTIFICACIONES_C1_CONTRATO.md): backend aprobado explícitamente; cinco eventos, outbox/worker, preferencias, permisos, reintentos y retención. Evidencia HTTP/PostgreSQL, migración y recuperación; C2–C3 aprobados después, canal pausado.

- [`NOTIFICACIONES_C0_AUDITORIA.md`](features/NOTIFICACIONES_C0_AUDITORIA.md): C0 con D1–D10 fijadas por el propietario; correo automático para cinco eventos, incluidos reprogramación y completado sin marketing. WhatsApp manual diseñado para segunda entrega; opt-in, permisos, outbox y retención fijados. Sin implementación ni C1 autorizado; remitente real antes de activar C3.

- [`PRD.md`](product/PRD.md): definición vigente del producto y sus límites.
- [`APP_FLOWS.md`](product/APP_FLOWS.md): recorridos reales y fronteras entre etapas.
- [`PRODUCT_STANDARD.md`](product/PRODUCT_STANDARD.md): criterios permanentes para definir una capacidad.
- [`FRONTEND_STANDARD.md`](product/FRONTEND_STANDARD.md): implementación y evidencia frontend.
- [`UI_PATTERNS.md`](product/UI_PATTERNS.md): patrones reutilizables de interacción.
- [`FEATURE_BRIEF_TEMPLATE.md`](features/FEATURE_BRIEF_TEMPLATE.md): plantilla previa a una entrega funcional.
- [`CONFIGURACION_CMS_PAGOS_VISION.md`](features/CONFIGURACION_CMS_PAGOS_VISION.md): visión histórica parcialmente realizada por entregas posteriores; Pagos, banca y otras ampliaciones conservan autorización propia.
- [`CONFIGURACION_CMS_PLAN.md`](features/CONFIGURACION_CMS_PLAN.md): secuencia modular; C1–C3 cerrados/aprobados; D1–D6 fijadas y entregas posteriores fuera.
- [`CONFIGURACION_CMS_C0_AUDITORIA.md`](features/CONFIGURACION_CMS_C0_AUDITORIA.md): auditoría y brief históricos; propuestas D1–D6 resueltas por la autorización C1 posterior.
- [`CONFIGURACION_CMS_C1_CONTRATO.md`](features/CONFIGURACION_CMS_C1_CONTRATO.md): contrato backend, migración/rollback y evidencia C1; no autoriza frontend ni mini-sitio.
- [`CONFIGURACION_CMS_C2_FRONTEND.md`](features/CONFIGURACION_CMS_C2_FRONTEND.md): editor/preview privado, integración C1 y QA con cuatro roles en dos negocios de prueba.
- [`CONFIGURACION_CMS_C3_BACKEND.md`](features/CONFIGURACION_CMS_C3_BACKEND.md): proyección pública C3 cerrada/aprobada y autorización del cambio visible de `/{slug}`.
- [`CONFIGURACION_CMS_C3_FRONTEND.md`](features/CONFIGURACION_CMS_C3_FRONTEND.md): mini-sitio público, revalidación de retiro, integración de reserva y QA real de C3.
- [`RESERVA_PUBLICA_H5_FECHAS.md`](features/RESERVA_PUBLICA_H5_FECHAS.md): correctivos H5 y fecha estricta cerrados/aprobados; contrato aditivo, superficies de entrada y evidencia.
- [`ROADMAP_POST_CMS_AUDITORIA.md`](features/ROADMAP_POST_CMS_AUDITORIA.md): auditoría comparativa histórica de WhatsApp, Pagos, Notificaciones y Medios/Promociones; la autorización posterior aprobó C1 y comprende C2 de WhatsApp.
- [`WHATSAPP_C0_AUDITORIA.md`](features/WHATSAPP_C0_AUDITORIA.md): auditoría y alternativas históricas; D1–D6 resueltas en A por el propietario al autorizar C1.
- [`WHATSAPP_C1_CONTRATO.md`](features/WHATSAPP_C1_CONTRATO.md): contrato backend existente aprobado, pruebas automáticas y decisiones D1–D6.
- [`WHATSAPP_C2_FRONTEND.md`](features/WHATSAPP_C2_FRONTEND.md): implementación del enlace manual compartido, ejecución de vectores y evidencia de QA de navegador, popup bloqueado y accesibilidad.

- [`WHATSAPP_C3_ACTIVACION.md`](features/WHATSAPP_C3_ACTIVACION.md): C2 aprobado; activación C3 documentada con prueba manual satisfactoria de ambos destinos en iPhone 11, confirmada por el propietario; C3 cerrado/aprobado explícitamente el 2026-09-14.

### Arquitectura y seguridad

- [`TRD.md`](architecture/TRD.md): arquitectura técnica vigente y límites.
- [`DATA_MODEL.md`](architecture/DATA_MODEL.md): mapa conceptual; Prisma sigue siendo la verdad ejecutable.
- [`SECURITY_STANDARD.md`](quality/SECURITY_STANDARD.md): requisitos permanentes de seguridad y privacidad.
- [`ADR-001-authentication-strategy.md`](decisions/ADR-001-authentication-strategy.md): auditoría y recomendación de autenticación; no implica implementación.
- [`ADR-002-facturacion-interna-inmutable.md`](decisions/ADR-002-facturacion-interna-inmutable.md): invariantes, migración, concurrencia y compatibilidad de Facturación-A Backend.

### Calidad y publicación

- [`CORRECTIVO_F0D.md`](quality/CORRECTIVO_F0D.md): publicado/desplegado exclusivamente en QA desde código `92f6127`, API/worker con imagen `7eafd5c9232a`, Preview Ready y HTTPS/CORS/zona pública verificados; producción intacta. Backends 2A/1A aprobados, correo recibido en spam y 3A aceptada. Pruebas, riesgos y checklist documentados; SSO de Vercel conservado, QA autenticada/aprobación final pendientes.

- [`CORRECTIVO_F0A.md`](quality/CORRECTIVO_F0A.md): Gate 4 aprobado y publicado en `6752e95`; Preview QA y header verificados. Informe de despliegue incorporado por autorización expresa en el commit documental separado 52e43a6; QA integrado no cerrado.
- [`CORRECTIVO_F0B.md`](quality/CORRECTIVO_F0B.md): sincronización Reserva/Factura, recuperación de acceso y menú móvil. Backend aprobado, publicado/desplegado desde `33de07a`; API/worker QA y Preview Ready, headers verificados. Testing del propietario pasa exclusivamente los recorridos indicados salvo la espera del reloj, abordada en F0-C; aprobación final pendiente.
- [`CORRECTIVO_F0C.md`](quality/CORRECTIVO_F0C.md): completar/emitir/cobrar sin esperar al horario, campos del panel a 16 px en móvil/táctil, filtros alineados sin ayudas redundantes y acciones de Equipo legibles. Backend validado y aprobado; commit/push y despliegue QA autorizados expresamente. Resultado operativo pendiente de verificación desde el commit.

- [`STAGING_QA_2026-09-28.md`](quality/STAGING_QA_2026-09-28.md): Cutover QA limpia/migrada, dos tenants sintéticos, API OCI de staging en HTTPS y web Preview. QA autenticado de Horario y zona C2 cerrado/aprobado sobre datos sintéticos; apertura pública posterior en QA y worker Resend QA independiente activo, sin envío real acreditado. Producción intacta; evidencia D9, A2, CMS y Facturación, límites productivos y pendientes separados.
- [`API_OCI_DESPLIEGUE.md`](quality/API_OCI_DESPLIEGUE.md): API desplegada en la VM Always Free de 2 OCPU/12 GB, Caddy/TLS real, CORS exacto, Supabase runtime y evidencia HTTPS externa; implementado/en revisión.
- [`PRODUCCION_SUPABASE_LIMPIEZA_2026-09-27.md`](quality/PRODUCCION_SUPABASE_LIMPIEZA_2026-09-27.md): respaldo/restauración verificados, inventario anterior al corte y limpieza atómica completada con `Dental Ross` preservada; contiene conteos y evidencia posterior.
- [`BASE_PREPRODUCCION_C0_AUDITORIA.md`](quality/BASE_PREPRODUCCION_C0_AUDITORIA.md): C0 documental del ítem 3, aprobado después por el propietario con D1–D13 fijadas.
- [`BASE_PREPRODUCCION_C1_EVIDENCIA.md`](quality/BASE_PREPRODUCCION_C1_EVIDENCIA.md): C1 cerrado/aprobado por instrucción del propietario, con D2 aceptado como excepción local, recepción de alarmas y custodia externa GPG confirmadas; limpieza local comprobada. Activación C3 y publicación Git conservan su estado separado.
- [`AUDITORIA_INTEGRAL_2026_09_24.md`](quality/AUDITORIA_INTEGRAL_2026_09_24.md): inventario transversal y roadmap de 14 candidatos en el momento de la auditoría; su gate C3 y H1/H2/H4 tienen seguimiento posterior autorizado.
- [`CORRECTIVOS_2026_09_24.md`](quality/CORRECTIVOS_2026_09_24.md): seguimiento autorizado tras esa auditoría; smoke Chrome, roles PostgreSQL originales y log de reserva pública.
- [`DELIVERY_GATES.md`](quality/DELIVERY_GATES.md): controles por etapa y protocolo de relevo.
- [`DEFINITION_OF_DONE.md`](quality/DEFINITION_OF_DONE.md): condiciones de terminación verificable.
- [`ESTABILIZACION_2026_09.md`](quality/ESTABILIZACION_2026_09.md): ejecución y evidencia de los seis puntos de estabilización sobre la base auditada.
- [`BACKEND_CHANGES.md`](../BACKEND_CHANGES.md): contratos de API y persistencia, leídos de lo más reciente a lo antiguo.
- [`CHANGELOG.md`](../CHANGELOG.md): historia cronológica; una entrada describe su fecha, no el estado actual.
- [`docs/history/`](history/): snapshots preservados que nunca sustituyen fuentes vigentes.

## Skills repo-scoped

- [`$kortek-delivery`](../.agents/skills/kortek-delivery/SKILL.md): usar en cualquier entrega, auditoría, correctivo o checkpoint.
- [`$kortek-product-ui`](../.agents/skills/kortek-product-ui/SKILL.md): usar además en todo trabajo frontend o de experiencia.

Las reglas esenciales viven en los Markdown anteriores. Las skills solo conducen su aplicación y no son una fuente paralela.

## Regla de lectura histórica

Una referencia con sección numerada del antiguo `PROJECT_MASTER.md` apunta al snapshot [`PROJECT_MASTER_LEGACY_2026-08-13.md`](history/PROJECT_MASTER_LEGACY_2026-08-13.md). Para comportamiento vigente, volver siempre a [`PROJECT_MASTER.md`](../PROJECT_MASTER.md), al contrato más reciente y al código.

## Enmienda del propietario y cancelación de M2 — 2026-10-07

[Enmienda vinculante](quality/DECISIONES_PROPIETARIO_2026_09_29.md): cuenta B2C fuera del MVP/Piloto 1; **M2 C3/P4/P5 CANCELADOS**, con historia conservada. Cierre local del candidato autorizado, SIN PUSH ni activación externa; no constituye aprobación final.
