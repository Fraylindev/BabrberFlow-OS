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
- Profesionales tiene backend aprobado; su frontend y el módulo completo siguen en revisión.
- Facturación-A Backend está cerrado/aprobado y Facturación-B Frontend permanece implementado/en revisión.
- El Resumen sigue congelado como agregador, aunque sus correctivos transversales de aislamiento y estabilidad tienen estado propio.
- Servicios y los módulos posteriores no se abren por la mera existencia de código legacy; requieren auditoría y autorización modular.
- Security A0.5 y A0.6-A están cerrados/aprobados. A0.6-B/C/D y el retiro legacy siguen pendientes de autorización.

Este documento no convierte una visión futura o una pantalla existente en una capacidad aprobada.

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

- No cerrar Facturación-B ni Profesionales por inferencia.
- No iniciar A0.6-B/C/D, retiro legacy A0.7, Supabase, reembolsos, anulaciones, comisiones o fiscalidad sin autorización propia.
- No publicar precios, límites de planes, testimonios o cifras comerciales sin decisión y evidencia del propietario.
- No crear un flujo de organizaciones adicionales hasta definir su contrato atómico, permisos, límites, auditoría y UX.

## Proceso

```text
Producto y UX → contrato/arquitectura/seguridad → backend → aprobación backend
→ frontend → QA funcional y visual → checkpoint → auditoría → aprobación explícita
```

Usar [`FEATURE_BRIEF_TEMPLATE.md`](../features/FEATURE_BRIEF_TEMPLATE.md) y cumplir [`DELIVERY_GATES.md`](../quality/DELIVERY_GATES.md).
