# Documentación de Kortek Booking

Ajuste posterior F0-E — 2026-10-02: **IMPLEMENTADO / VALIDADO LOCALMENTE / PUBLICACIÓN WEB QA EN PREPARACIÓN**. Por atender incluye emisión pendiente; Todas prioriza atención y fechas descendentes. Desktop recupera dos acciones cuando corresponden; fotos redondeadas uniformes, salida/contactos más visibles y WhatsApp previo a reservar en mini-sitio. 290 pruebas y tipos/lint/build pasan; 123 registros de navegador sin fallos. Enmiendas 25–27 registran la corrección y autorización. [Informe y límites](quality/CORRECTIVO_F0E_AJUSTE.md). M1 y QA física continúan en revisión; sin backend ni producción. Los cuatro documentos pendientes del despliegue anterior se incorporan a este checkpoint autorizado.

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
