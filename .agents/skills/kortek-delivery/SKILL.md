---
name: kortek-delivery
description: Gobierna cualquier entrega, auditoría, diagnóstico, correctivo, documentación, backend, frontend, QA, checkpoint o relevo de Kortek Booking. Usar para definir alcance y gates, aplicar producto, arquitectura, seguridad, validación, Git y estado antes de implementar o publicar.
---

# Kortek Delivery

Aplicar el proceso del repositorio sin duplicar sus reglas. Las fuentes neutrales en Markdown son autoritativas; esta skill conduce su lectura y ejecución.

## 1. Orientarse

Leer en orden:

1. [`docs/README.md`](../../../docs/README.md);
2. [`PROJECT_MASTER.md`](../../../PROJECT_MASTER.md);
3. [`DELIVERY_GATES.md`](../../../docs/quality/DELIVERY_GATES.md);
4. instrucciones de área y documentos especializados aplicables;
5. código real, contratos y pruebas relacionados.

Confirmar rama, checkpoint, árbol y autorización. Detenerse ante cambios ajenos o contradicciones no aislables.

## 2. Comprobar Ready

Definir usuario, problema, resultado, alcance, no-alcance, roles, privacidad, tenant, flujo, errores y criterios observables. Auditar código y reutilización antes de proponer.

No iniciar código si falta una decisión que cambie permisos, persistencia, contrato, seguridad o experiencia.

## 3. Pasar gates en orden

1. Producto y UX.
2. Contrato, arquitectura y seguridad.
3. Backend y validaciones.
4. Aprobación explícita del backend cuando aplique.
5. Frontend y validaciones; usar además [`$kortek-product-ui`](../kortek-product-ui/SKILL.md).
6. QA funcional y visual con evidencia.
7. Checkpoint candidato.
8. Auditoría y aprobación explícita.

No inferir que una etapa, commit o push autoriza la siguiente.

## 4. Proteger seguridad y alcance

- Derivar tenant y actor del contexto autenticado.
- Aplicar mínima exposición y permisos backend.
- Revisar [`SECURITY_STANDARD.md`](../../../docs/quality/SECURITY_STANDARD.md) para auth, endpoints públicos, roles, sesiones o PII.
- No inventar endpoints, datos, métricas o comportamiento.
- No ampliar módulo, dependencias o arquitectura sin autorización.

## 5. Validar y documentar

Ejecutar solo las validaciones aplicables con exit code `0`. Revisar contratos, estados, documentación, diff completo, temporales y secretos. Cumplir [`DEFINITION_OF_DONE.md`](../../../docs/quality/DEFINITION_OF_DONE.md).

Una compilación limpia no aprueba una interfaz. Un checkpoint publicado queda implementado/en revisión hasta aprobación del propietario.

## 6. Relevar con seguridad

Si no se puede completar, detenerse estable y registrar estado, intención, archivos, Git, validaciones, pendientes y continuación exacta. Sincronizar controles y marcar cualquier publicación autorizada como **PAUSADO / INCOMPLETO**.
