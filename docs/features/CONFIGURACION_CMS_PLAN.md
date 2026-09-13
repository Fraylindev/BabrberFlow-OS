# Configuración/CMS — plan de próxima entrega

Estado: **C1 CERRADO / APROBADO** por decisión explícita del propietario el 2026-09-12 sobre `288a62d30e7005a849d9e6d107daed635f7a89b2`. El propietario fijó D1–D6 y posteriormente aprobó **C2** el 2026-09-13 sobre `7dd9986264aeb1cb144351296626cfa65028349a`, documentado en [frontend y QA C2](CONFIGURACION_CMS_C2_FRONTEND.md). C3, medios, pagos e integraciones permanecen sin autorización. La autorización operacional del 2026-09-13 permite aplicar C1 en la única base de prueba y crear cuentas para QA; es independiente de la aprobación C2 y no autoriza un despliegue productivo.

Checkpoint 2026-09-12: tras la [auditoría y brief C0](CONFIGURACION_CMS_C0_AUDITORIA.md), la autorización expresa resuelve D1–D6. El [contrato C1](CONFIGURACION_CMS_C1_CONTRATO.md) define la implementación y evidencia. La secuencia C1 → aprobación backend → C2 → C3 se conserva; ninguna aprobación se deduce de un commit/push.

## 1. Resultado y límites

El módulo permite que OWNER/ADMIN preparen la identidad pública de su negocio; solo OWNER publica/retira. BARBER y RECEPTIONIST no reciben acceso CMS. Slug, horario global y zona permanecen de solo lectura en C1–C3. La evolución de `/[slug]` a mini-sitio conserva su fase separada.

Quedan fuera de la primera entrega: Cloudinary u otro proveedor, galería binaria, fotos de servicios, promociones ejecutables, cuentas bancarias, comprobantes, transferencias, Resend, `wa.me`, nuevos estados de Booking y cambios a Invoice/Payment.

## 2. Secuencia propuesta

1. **C0 — auditoría y brief de producto:** inventariar campos reales de Organization, horario y ruta pública; decidir qué es interno/público, roles, borrador/publicado, copy, estados, responsive y accesibilidad.
2. **C1 — contrato backend de perfil público:** proyección mínima tenant-scoped, validación, concurrencia, auditoría sin PII e idempotencia. D5 autoriza el agregado editorial separado y la migración aditiva; diseño y ensayo se resuelven dentro de C1 antes de su aprobación backend.
3. **C2 — frontend de configuración base:** consumir exclusivamente C1, con loading/vacío/error/reintento/éxito, confirmaciones y aislamiento inmediato al cambiar usuario, tenant o rol.
4. **C3 — publicación del mini-sitio:** leer únicamente la proyección pública aprobada; no exponer UUID, correo privado, datos bancarios ni contenido no publicado.
5. **Entregas separadas posteriores:** medios; promociones; métodos/cuentas; plantillas/notificaciones; ampliación de Pagos. Cada una necesita brief, contrato, seguridad y aprobación propios.

No se salta de C0 a UI ni se agrupan C1–C3 en un checkpoint por conveniencia.

## 3. Decisiones que C0 debe cerrar

- campos editables y fuente autoritativa para nombre público, descripción, contacto público, ubicación y horarios;
- relación entre slug vigente, cambio de slug, enlaces existentes y unicidad;
- visibilidad por campo, borrador/publicado y vista previa;
- permisos exactos OWNER/ADMIN y cualquier lectura operativa de otros roles;
- política de contenido vacío, despublicación y negocio inactivo;
- límites de longitud/formato, zona horaria y presentación local;
- si la configuración reutiliza horario global existente o requiere un agregado distinto;
- ownership, límites, formatos, texto alternativo, retención y moderación para la futura fase de medios;
- enmascarado, cifrado, lectura y auditoría para la futura fase bancaria;
- eventos reales y estados de dominio antes de diseñar plantillas o notificaciones.

## 4. Seguridad y privacidad

- `organizationId`, usuario y rol proceden exclusivamente del contexto autenticado; toda lectura/escritura final repite tenant.
- Las rutas públicas devuelven solo campos publicados y necesarios, sin IDs internos, notas, correo privado, metadatos de proveedor ni secretos.
- Cambiar organización o rol desmonta formularios, previews, mutaciones y archivos seleccionados; respuestas tardías no actualizan el contexto nuevo.
- Mutaciones sensibles usan control de concurrencia e idempotencia acordes al contrato; AuditLog registra acción/entidad/actor sin contenido ni PII.
- Medios y banca permanecen fail-closed hasta definir almacenamiento privado, acceso temporal, validación, retención y recuperación.

## 5. Riesgos

- El schema ya contiene campos y modelos legacy que no equivalen automáticamente a un contrato aprobado.
- Cambiar slug puede romper enlaces o permitir confusión de tenant si no se diseña su ciclo de vida.
- Mezclar borrador con proyección pública puede publicar datos incompletos o privados.
- Galería, banca y comprobantes elevan superficie de PII, archivos maliciosos y secretos; no deben incorporarse a C1 por similitud visual.
- La página pública actual y el horario operativo pueden tener consumidores existentes que C0 debe rastrear antes de cambiar semántica.

## 6. Pruebas y QA exigidos cuando se autorice

- unitarias de DTO, normalización, proyección, permisos y fallos;
- E2E PostgreSQL aisladas para tenant/IDOR, rol, concurrencia, idempotencia, publicación y regresión de `/[slug]`;
- TypeScript, lint, build, Prisma validate/generate y diff de migración cuando aplique;
- QA real OWNER/ADMIN y roles sin gestión, dos tenants, A → B → A, error/reintento y respuestas tardías;
- escritorio, 375 px, teclado, foco, lectores, textos alternativos y ausencia de overflow;
- Network/console sin secretos, PII, UUID internos ni consultas del tenant anterior.

## 7. Criterio de cierre de la planificación

C0 puede solicitar aprobación para contrato solo cuando exista un inventario código/schema/consumidores, matriz campo × visibilidad × rol, flujo borrador/publicado, no-alcance por fase, amenazas, estrategia de compatibilidad/migración y criterios observables de QA. Este documento por sí solo no satisface ese gate.

La [auditoría C0](CONFIGURACION_CMS_C0_AUDITORIA.md) aporta esos entregables. El propietario resolvió D1–D6 y aprobó explícitamente C1. C2 queda cerrado/aprobado por su decisión posterior independiente; C3 sigue requiriendo autorización propia.
