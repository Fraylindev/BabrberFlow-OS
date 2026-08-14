# PRD — Kortek Booking

Estado: definición vigente de producto para G0.1. El estado de entregas y checkpoints vive en [`PROJECT_MASTER.md`](../../PROJECT_MASTER.md).

## Visión

Kortek Booking es un SaaS multi-tenant para que barberías y salones administren su operación y ofrezcan reservas confiables. Debe funcionar como producto comercial real: datos legítimos, seguridad backend, privacidad por rol, experiencia clara y entregas auditables.

## Usuarios y resultados

| Usuario | Contexto | Resultado esperado |
| --- | --- | --- |
| OWNER | Responsable del negocio | Configurar y supervisar su organización sin acceder a otro tenant |
| ADMIN | Gestión delegada | Operar capacidades autorizadas con controles equivalentes de seguridad |
| RECEPTIONIST | Atención y agenda | Gestionar el trabajo permitido sin privilegios administrativos innecesarios |
| BARBER | Profesional vinculado | Consultar y operar únicamente su alcance autorizado |
| CUSTOMER | Flujo público B2C | Reservar con mínima fricción y mínima exposición de datos |

`CUSTOMER` no accede al dashboard interno. Los roles y permisos efectivos deben verificarse en backend y en el contrato vigente.

## Capacidades y estado

- Reservas y Clientes están cerrados según [`PROJECT_MASTER.md`](../../PROJECT_MASTER.md).
- Profesionales tiene backend aprobado, pero su frontend y el módulo completo siguen en revisión.
- Servicios y módulos posteriores no están autorizados en el ciclo vigente.
- Resumen/Dashboard permanece congelado como agregador hasta completar sus fuentes.

Este documento no convierte una visión futura en funcionalidad implementada.

## Principios de producto

- Definir usuario, problema, resultado y criterio observable antes del contrato o código.
- Backend autoritativo para tenant, permisos e integridad; frontend representa esas reglas.
- Pedir, transportar y mostrar solo los datos necesarios para la tarea y el rol.
- No inventar endpoints, métricas, contenido, estados o integraciones.
- Separar reserva, prestación y cobro; una cita completada no equivale a un pago.
- Explicar errores y horarios con lenguaje natural. Identificadores de zona, UTC, offsets y detalles de implementación son internos.
- Una compilación limpia prueba salud técnica parcial; no aprueba una experiencia.

## Requisitos transversales

- Multi-tenancy por `organizationId` derivado del contexto autenticado.
- Roles y privacidad comprobados en el servidor.
- Flujos responsive y accesibles con loading, empty, error, pending y success cuando apliquen.
- Cambios de contrato documentados en [`BACKEND_CHANGES.md`](../../BACKEND_CHANGES.md).
- QA funcional y visual con entorno, rol, acción y resultado reales.

## No-alcance vigente

- No iniciar Servicios, Cloudinary, Configuración, Facturación, Analytics o Resumen sin mandato.
- No cerrar Profesionales ni aprobar Frontend A2 por inferencia.
- No cambiar autenticación durante G0.1. El riesgo y la propuesta están en [`ADR-001`](../decisions/ADR-001-authentication-strategy.md).

## Proceso

```text
Producto y UX → contrato/arquitectura/seguridad → backend → aprobación backend
→ frontend → QA funcional y visual → checkpoint → auditoría → aprobación explícita
```

Usar [`FEATURE_BRIEF_TEMPLATE.md`](../features/FEATURE_BRIEF_TEMPLATE.md) y cumplir [`DELIVERY_GATES.md`](../quality/DELIVERY_GATES.md).
