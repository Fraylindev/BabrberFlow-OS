# Estándar de producto — Kortek Booking

## Propósito

Cada cambio debe resolver un problema real de barberías y salones sin sacrificar seguridad, claridad ni mantenibilidad. La definición de producto y UX precede al contrato y al código.

## Brief obligatorio antes de implementar

Registrar de forma breve:

1. **Usuario:** quién usa la capacidad y desde qué rol/contexto.
2. **Problema:** qué tarea no puede completar o qué riesgo existe hoy.
3. **Resultado:** qué debe poder conseguir y cómo se comprobará.
4. **Alcance y no-alcance:** qué entra y qué se excluye expresamente.
5. **Roles y permisos:** quién ve, crea, modifica o solo consulta.
6. **Datos y privacidad:** qué datos son necesarios, sensibles o no deben exponerse.
7. **Flujo y estados:** camino principal, loading, vacío, error, éxito y recuperación.
8. **Lenguaje:** textos orientados a la tarea, sin jerga técnica.
9. **Responsive y accesibilidad:** comportamiento móvil/desktop, teclado, foco y semántica.
10. **Criterios de aceptación:** evidencia observable, no solo “compila”.

Si una decisión cambia contrato, permisos, persistencia o alcance, obtener aprobación antes de implementar.

## Principios vigentes

- Producto comercial multi-tenant, no demo.
- Datos y métricas deben provenir del sistema real; no usar mocks que parezcan producción.
- Pedir solo la información necesaria y aplicar mínima exposición por rol.
- Separar reserva, prestación y cobro: Booking no implica Payment.
- El backend es autoritativo para permisos e integridad.
- Las acciones irreversibles o sensibles requieren contexto y confirmación claros.
- Un estado vacío debe ayudar a continuar; un error debe explicar qué ocurrió y qué puede hacer la persona.
- Los nombres de tablas, constraints, códigos Prisma y términos internos no pertenecen al lenguaje de UI.

## Secuencia de producto

```text
Definición producto/UX → contrato/arquitectura → backend → aprobación backend
→ frontend → QA funcional/visual → auditoría → aprobación del propietario
```

Ninguna etapa autoriza automáticamente la siguiente.

## Aprobación

- Compilar, pasar lint o tests demuestra salud técnica parcial.
- Una interfaz solo puede considerarse candidata después de QA real en navegador.
- Un módulo solo cierra con documentación vigente y aprobación explícita del propietario.
