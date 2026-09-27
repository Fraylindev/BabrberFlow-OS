# Documentación de Kortek Booking

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

- [`API_OCI_DESPLIEGUE.md`](quality/API_OCI_DESPLIEGUE.md): API desplegada en la VM Always Free de 2 OCPU/12 GB, Caddy/TLS real, CORS exacto, Supabase runtime y evidencia HTTPS externa; implementado/en revisión.
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
