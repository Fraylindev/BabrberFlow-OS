# Visión futura — Configuración/CMS, mini-sitio público y Pagos

Estado: **VISIÓN FUTURA / PLANIFICACIÓN DOCUMENTAL**. Esta definición no autoriza implementación, no cambia contratos vigentes y no altera el estado **CERRADO / APROBADO** de Facturación-B. El plan modular preparado se encuentra en [`CONFIGURACION_CMS_PLAN.md`](CONFIGURACION_CMS_PLAN.md).

## 1. Propósito y secuencia

Kortek Booking debe permitir que cada barbería convierta su ruta pública `/[slug]` en un mini-sitio propio, administrado desde el panel y conectado a un flujo público de reservas. Antes de abrir esa capacidad, el panel debe completar los módulos administrativos pendientes en este orden:

1. Equipo;
2. Configuración del negocio/CMS;
3. Analytics;
4. Resumen, al final, como agregador de módulos ya cerrados.

Esta secuencia expresa la dirección de producto; cada módulo conserva sus gates y necesita autorización propia antes de contrato o código.

## 2. Configuración del negocio y CMS

La planificación de Configuración/CMS debe cubrir:

- información pública oficial del negocio;
- ubicación y horarios publicados;
- branding del tenant;
- galería;
- fotos de servicios;
- promociones reales configuradas por el negocio;
- cuentas bancarias y métodos de pago habilitados;
- plantillas de notificación;
- reglas de publicación y proyección pública mínima para `/[slug]`.

La ruta pública futura debe presentar esa información, las promociones vigentes, un CTA de reserva y el flujo público. No se publicarán datos internos, notas, secretos, contenido ficticio ni información financiera fuera del paso que realmente la necesite.

Antes de contrato deben resolverse roles de edición y publicación, borrador frente a publicado, propiedad y límites de archivos, accesibilidad de imágenes, vigencia de promociones, protección de cuentas bancarias y auditoría sin PII. No se presupone proveedor de almacenamiento ni contrato API.

## 3. Flujo público futuro de reserva

El recorrido objetivo es:

1. servicio;
2. profesional específico o “cualquiera”;
3. fecha y hora;
4. datos mínimos del cliente;
5. método de pago.

Semántica aprobada para la futura definición:

- **Pago en local:** crea la reserva sin cobro confirmado; no crea automáticamente un `Payment`.
- **Transferencia:** muestra únicamente las cuentas bancarias configuradas y habilitadas para ese tenant, permite aportar un comprobante y lo mantiene pendiente de verificación. La carga del comprobante no crea automáticamente un `Payment`.

El contrato futuro deberá definir el momento exacto de creación o retención de la reserva ante una transferencia, expiración y liberación de horario, reintentos, duplicados y resolución de fallos entre reserva y comprobante. El filtro y la semántica vigentes de Facturación-B no cambian.

## 4. Ampliación futura de Pagos y Facturación

El contrato aprobado de Facturación-A continúa siendo autoritativo: una Invoice interna de una Booking completada admite cero o un `Payment` completo, único e inmutable. Ese modelo no representa un comprobante pendiente ni debe forzarse durante Reservas.

La planificación formal de Pagos deberá definir, antes de cualquier implementación:

- pago anticipado y su relación con Booking e Invoice;
- verificación o rechazo de transferencia;
- evidencia de pago y su custodia privada;
- pago pendiente como estado real de dominio, sin fingir un `Payment` confirmado;
- momento autoritativo en que una verificación válida puede crear o registrar el cobro;
- propina separada del importe autoritativo del servicio;
- idempotencia, concurrencia, expiración, auditoría, conciliación y recuperación ante fallos;
- migración y compatibilidad con Invoice–Payment vigente.

La ampliación requerirá un contrato técnico y una decisión arquitectónica propios. Hasta entonces, [`ADR-002`](../decisions/ADR-002-facturacion-interna-inmutable.md) y el [contrato de Facturación-A](FACTURACION_A_CONTRATO_TECNICO.md) permanecen sin cambios.

## 5. Notificaciones futuras

- El correo automático usará Resend una vez aprobados integración, eventos, consentimiento, remitentes, reintentos y tratamiento de fallos.
- WhatsApp será una acción manual mediante `wa.me`, con mensaje prellenado y editable por la persona operadora; no se presupone envío automático.
- Las plantillas se administrarán desde Configuración y deberán reflejar el estado real de la reserva.
- “En proceso” solo podrá mostrarse si existe como estado real de Booking con transiciones, permisos y persistencia definidos; no puede introducirse únicamente como copy.

No se definen todavía endpoints, eventos, proveedores alternativos ni una matriz de permisos para estas capacidades.

## 6. Seguridad, privacidad y QA que deberá cubrir el plan

La próxima planificación debe incluir como mínimo:

- aislamiento tenant-scoped de contenido, cuentas, plantillas, comprobantes y reservas;
- proyecciones públicas mínimas sin UUID internos, notas privadas ni PII innecesaria;
- control de acceso a cuentas bancarias y evidencias de pago;
- validación de tipo, tamaño y contenido de archivos, almacenamiento privado, acceso temporal y retención;
- secretos de Resend y cualquier proveedor solo en configuración segura del servidor;
- AuditLog sin PII, datos bancarios, comprobantes, mensajes ni cuerpos completos;
- pruebas unitarias, E2E PostgreSQL aisladas, concurrencia e IDOR;
- QA real por rol, tenant, desktop y móvil de todos los estados y recuperaciones.

## 7. Próximos planes documentales requeridos

### Configuración/CMS

Debe producir un brief de producto y UX, matriz de roles, modelo de publicación, proyección pública, política de medios, seguridad de cuentas bancarias, estados, responsive, accesibilidad y criterios de cierre. Solo después corresponde proponer contrato y arquitectura.

### Pagos

Debe producir una máquina de estados formal para reserva, evidencia, verificación y cobro; invariantes frente al modelo actual; tratamiento separado de propina; contratos mínimos; amenazas; migración; rollback; pruebas y QA. No podrá reinterpretar la mera existencia de un comprobante como `Payment`.

## 8. No-alcance actual

- No hay código, frontend, backend, Prisma, migración, endpoint, DTO ni integración autorizados por este documento.
- No se modifica `/[slug]`, Reservas, Facturación-A, Facturación-B, Analytics, Clerk, Supabase ni estados de Booking.
- No se activa Resend, carga de archivos, transferencias, cuentas bancarias, promociones ni notificaciones.
- No se cierra ni aprueba Facturación-B.
