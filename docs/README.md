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

- [`PRD.md`](product/PRD.md): definición vigente del producto y sus límites.
- [`APP_FLOWS.md`](product/APP_FLOWS.md): recorridos reales y fronteras entre etapas.
- [`PRODUCT_STANDARD.md`](product/PRODUCT_STANDARD.md): criterios permanentes para definir una capacidad.
- [`FRONTEND_STANDARD.md`](product/FRONTEND_STANDARD.md): implementación y evidencia frontend.
- [`UI_PATTERNS.md`](product/UI_PATTERNS.md): patrones reutilizables de interacción.
- [`FEATURE_BRIEF_TEMPLATE.md`](features/FEATURE_BRIEF_TEMPLATE.md): plantilla previa a una entrega funcional.
- [`CONFIGURACION_CMS_PAGOS_VISION.md`](features/CONFIGURACION_CMS_PAGOS_VISION.md): visión futura no autorizada para Configuración/CMS, mini-sitio público, reserva pública y Pagos.
- [`CONFIGURACION_CMS_PLAN.md`](features/CONFIGURACION_CMS_PLAN.md): secuencia modular; C1–C3 cerrados/aprobados; D1–D6 fijadas y entregas posteriores fuera.
- [`CONFIGURACION_CMS_C0_AUDITORIA.md`](features/CONFIGURACION_CMS_C0_AUDITORIA.md): auditoría y brief históricos; propuestas D1–D6 resueltas por la autorización C1 posterior.
- [`CONFIGURACION_CMS_C1_CONTRATO.md`](features/CONFIGURACION_CMS_C1_CONTRATO.md): contrato backend, migración/rollback y evidencia C1; no autoriza frontend ni mini-sitio.
- [`CONFIGURACION_CMS_C2_FRONTEND.md`](features/CONFIGURACION_CMS_C2_FRONTEND.md): editor/preview privado, integración C1 y QA con cuatro roles en dos negocios de prueba.
- [`CONFIGURACION_CMS_C3_BACKEND.md`](features/CONFIGURACION_CMS_C3_BACKEND.md): proyección pública C3 cerrada/aprobada y autorización del cambio visible de `/{slug}`.
- [`CONFIGURACION_CMS_C3_FRONTEND.md`](features/CONFIGURACION_CMS_C3_FRONTEND.md): mini-sitio público, revalidación de retiro, integración de reserva y QA real de C3.

### Arquitectura y seguridad

- [`TRD.md`](architecture/TRD.md): arquitectura técnica vigente y límites.
- [`DATA_MODEL.md`](architecture/DATA_MODEL.md): mapa conceptual; Prisma sigue siendo la verdad ejecutable.
- [`SECURITY_STANDARD.md`](quality/SECURITY_STANDARD.md): requisitos permanentes de seguridad y privacidad.
- [`ADR-001-authentication-strategy.md`](decisions/ADR-001-authentication-strategy.md): auditoría y recomendación de autenticación; no implica implementación.
- [`ADR-002-facturacion-interna-inmutable.md`](decisions/ADR-002-facturacion-interna-inmutable.md): invariantes, migración, concurrencia y compatibilidad de Facturación-A Backend.

### Calidad y publicación

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
