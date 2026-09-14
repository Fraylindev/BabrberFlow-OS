# PRD — Kortek Booking

Estado: definición vigente. El estado de entregas y checkpoints vive en [`PROJECT_MASTER.md`](../../PROJECT_MASTER.md).

## Visión

Kortek Booking es un SaaS multi-tenant para que barberías y salones administren su operación y ofrezcan reservas confiables. Debe funcionar como producto comercial real: datos legítimos, seguridad backend, privacidad por rol, experiencia clara y entregas auditables.

## Usuarios y resultados

| Usuario | Contexto | Resultado esperado |
| --- | --- | --- |
| OWNER | Responsable del negocio | Configurar y supervisar su organización sin acceder a otro tenant |
| ADMIN | Gestión delegada | Operar capacidades autorizadas con controles equivalentes de seguridad |
| RECEPTIONIST | Atención y agenda | Gestionar el trabajo permitido sin privilegios administrativos innecesarios |
| BARBER | Profesional vinculado | Consultar y operar únicamente sus reservas y datos autorizados |
| CUSTOMER | Flujo público B2C | Reservar con mínima fricción y mínima exposición de datos |

`CUSTOMER` no accede al dashboard interno. Roles y permisos efectivos se verifican en backend y en el contrato vigente de cada módulo.

## Capacidades y estado

- Reservas y Clientes están cerrados según [`PROJECT_MASTER.md`](../../PROJECT_MASTER.md).
- Profesionales, Servicios, Facturación interna y Equipo están cerrados/aprobados según sus checkpoints vigentes.
- Facturación-A Backend y Facturación-B Frontend están cerrados/aprobados; cualquier pago anticipado, transferencia, reembolso o propina requiere contrato posterior.
- El Resumen sigue congelado como agregador, aunque sus correctivos transversales de aislamiento y estabilidad tienen estado propio.
- Configuración/CMS C1/C2 y el backend C3 están cerrados/aprobados; el mini-sitio frontend C3 está implementado/en revisión. Cualquier ampliación posterior requiere autorización modular propia.
- Security A0.5 y A0.6-A están cerrados/aprobados. A0.6-B/C/D y el retiro legacy siguen pendientes de autorización.

Este documento no convierte una visión futura o una pantalla existente en una capacidad aprobada.

## Visión futura registrada

La base C3 ya convierte `/{slug}` en un mini-sitio con la proyección publicada y el asistente existente. La evolución adicional, todavía sin autorización de implementación, está definida en [`CONFIGURACION_CMS_PAGOS_VISION.md`](../features/CONFIGURACION_CMS_PAGOS_VISION.md):

- completar el panel en el orden Equipo → Configuración del negocio/CMS → Analytics → Resumen final;
- ampliar el mini-sitio con horarios editables, branding, galería, fotos de servicios y promociones;
- recorrer servicio → profesional o cualquiera → fecha/hora → datos mínimos del cliente → método de pago;
- permitir pago en local sin cobro confirmado y transferencia con comprobante pendiente de verificación, sin crear automáticamente un `Payment`;
- ampliar Pagos mediante un contrato formal futuro para pago anticipado, verificación, evidencia, pago pendiente y propina separada;
- usar en el futuro Resend para correo automático y `wa.me` como acción manual con mensaje prellenado y editable, siempre coherente con estados reales.

Esta visión no cambia el contrato Invoice–Payment ni el estado **CERRADO / APROBADO** de Facturación-B.

## Principios de producto

- Definir usuario, problema, resultado y criterio observable antes del contrato o código.
- Backend autoritativo para tenant, permisos e integridad; frontend representa esas reglas.
- Pedir, transportar y mostrar solo los datos necesarios para la tarea y el rol.
- No inventar endpoints, métricas, testimonios, precios, contenido, estados o integraciones.
- Separar reserva, prestación, factura interna y cobro.
- Explicar errores y horarios con lenguaje natural; los detalles técnicos son internos.
- Una compilación limpia prueba salud técnica parcial, no aprueba una experiencia.

## Requisitos transversales

- `organizationId` deriva del contexto autenticado y se aplica en la consulta autoritativa.
- Membership y rol local se revalidan en backend.
- Cachés financieras y de negocio se aíslan cuando cambian usuario, organización o rol.
- Las superficies remotas cubren loading, empty, error, recuperación, pending y success cuando aplican.
- Los cambios de contrato se registran en [`BACKEND_CHANGES.md`](../../BACKEND_CHANGES.md).
- QA funcional y visual registra entorno, rol, acción y resultado reales.

## No-alcance vigente

- No reabrir ni ampliar módulos cerrados por inferencia.
- No iniciar A0.6-B/C/D, retiro legacy A0.7, Supabase, reembolsos, anulaciones, comisiones o fiscalidad sin autorización propia.
- No publicar precios, límites de planes, testimonios o cifras comerciales sin decisión y evidencia del propietario.
- No crear un flujo de organizaciones adicionales hasta definir su contrato atómico, permisos, límites, auditoría y UX.
- No ampliar Configuración/CMS o el mini-sitio más allá de C3 ni implementar medios, promociones, cuentas bancarias, transferencias, comprobantes, propinas, Resend o nuevos estados de Booking hasta completar y aprobar sus planes y contratos propios.

## Proceso

```text
Producto y UX → contrato/arquitectura/seguridad → backend → aprobación backend
→ frontend → QA funcional y visual → checkpoint → auditoría → aprobación explícita
```

Usar [`FEATURE_BRIEF_TEMPLATE.md`](../features/FEATURE_BRIEF_TEMPLATE.md) y cumplir [`DELIVERY_GATES.md`](../quality/DELIVERY_GATES.md).
