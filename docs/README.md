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

### Arquitectura y seguridad

- [`TRD.md`](architecture/TRD.md): arquitectura técnica vigente y límites.
- [`DATA_MODEL.md`](architecture/DATA_MODEL.md): mapa conceptual; Prisma sigue siendo la verdad ejecutable.
- [`SECURITY_STANDARD.md`](quality/SECURITY_STANDARD.md): requisitos permanentes de seguridad y privacidad.
- [`ADR-001-authentication-strategy.md`](decisions/ADR-001-authentication-strategy.md): auditoría y recomendación de autenticación; no implica implementación.
- [`ADR-002-facturacion-interna-inmutable.md`](decisions/ADR-002-facturacion-interna-inmutable.md): invariantes, migración, concurrencia y compatibilidad de Facturación-A Backend.

### Calidad y publicación

- [`DELIVERY_GATES.md`](quality/DELIVERY_GATES.md): controles por etapa y protocolo de relevo.
- [`DEFINITION_OF_DONE.md`](quality/DEFINITION_OF_DONE.md): condiciones de terminación verificable.
- [`BACKEND_CHANGES.md`](../BACKEND_CHANGES.md): contratos de API y persistencia, leídos de lo más reciente a lo antiguo.
- [`CHANGELOG.md`](../CHANGELOG.md): historia cronológica; una entrada describe su fecha, no el estado actual.
- [`docs/history/`](history/): snapshots preservados que nunca sustituyen fuentes vigentes.

## Skills repo-scoped

- [`$kortek-delivery`](../.agents/skills/kortek-delivery/SKILL.md): usar en cualquier entrega, auditoría, correctivo o checkpoint.
- [`$kortek-product-ui`](../.agents/skills/kortek-product-ui/SKILL.md): usar además en todo trabajo frontend o de experiencia.

Las reglas esenciales viven en los Markdown anteriores. Las skills solo conducen su aplicación y no son una fuente paralela.

## Regla de lectura histórica

Una referencia con sección numerada del antiguo `PROJECT_MASTER.md` apunta al snapshot [`PROJECT_MASTER_LEGACY_2026-08-13.md`](history/PROJECT_MASTER_LEGACY_2026-08-13.md). Para comportamiento vigente, volver siempre a [`PROJECT_MASTER.md`](../PROJECT_MASTER.md), al contrato más reciente y al código.
