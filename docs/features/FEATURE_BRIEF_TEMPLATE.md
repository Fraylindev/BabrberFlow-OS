# Plantilla de brief de capacidad

Completar antes de contrato o código. Eliminar secciones que no apliquen explicando por qué.

## Identificación

- Capacidad / módulo:
- Etapa autorizada:
- Checkpoint base y rama:
- Propietario de la decisión:

## Producto y UX

- Usuario y rol:
- Problema real:
- Resultado esperado:
- Flujo principal:
- Errores y recuperación:
- Alcance:
- No-alcance:
- Lenguaje de interfaz:
- Estados loading / empty / error / pending / success:
- Móvil / desktop:
- Accesibilidad:

## Datos, roles y privacidad

- Datos necesarios:
- PII/notas/secretos:
- Lectura y acciones por rol:
- Aislamiento de tenant:
- Datos públicos y proyección mínima:

## Contrato y arquitectura

- Código y componentes reutilizables auditados:
- Endpoints/DTOs existentes:
- Cambios propuestos:
- Persistencia/migración:
- Transacciones/concurrencia:
- Integraciones/dependencias:
- Riesgos de seguridad y mitigación:
- Compatibilidad/rollback:

## Aceptación y evidencia

- Criterios observables:
- Pruebas automatizadas:
- Validaciones requeridas:
- QA funcional/visual:
- Documentos a actualizar:
- Condición para checkpoint:

## Decisiones pendientes

- Decisión:
- Opciones:
- Impacto:
- Quién debe aprobar:

No iniciar implementación si una decisión pendiente cambia permisos, contrato, persistencia, seguridad o flujo principal. Ver [`DELIVERY_GATES.md`](../quality/DELIVERY_GATES.md).
