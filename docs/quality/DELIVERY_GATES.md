# Gates de entrega — Kortek Booking

Este documento gobierna el paso entre etapas. La terminación detallada se verifica con [`DEFINITION_OF_DONE.md`](DEFINITION_OF_DONE.md).

## Definition of Ready

Una entrega puede iniciar implementación solo cuando:

- módulo, etapa, alcance y no-alcance están autorizados;
- usuario, problema, resultado y criterios observables están definidos;
- roles, privacidad, tenant y datos necesarios están identificados;
- código, componentes y contratos relacionados fueron auditados;
- decisiones que cambiarían contrato, persistencia, permisos o UX están resueltas;
- riesgos de seguridad y dependencias están evaluados;
- rama, checkpoint base y árbol de trabajo fueron verificados.

Usar [`FEATURE_BRIEF_TEMPLATE.md`](../features/FEATURE_BRIEF_TEMPLATE.md). Si falta un punto material, la entrega no está Ready.

## Gate 1 — Producto y UX

- Brief aprobado o inequívoco.
- Flujo principal, errores, estados, lenguaje, responsive y accesibilidad definidos.
- Ninguna interfaz muestra jerga técnica, identificadores de zona, UTC u offsets; las horas se explican de forma natural.

Salida: criterios de aceptación observables y no-alcance explícito.

## Gate 2 — Contrato, arquitectura y seguridad

- Modelo/contratos reales inspeccionados; Prisma sigue como verdad ejecutable.
- Tenant, roles, PII, respuestas, errores, transacciones y concurrencia definidos.
- Threat model breve cuando toca auth, privilegios, endpoints públicos o sesiones.
- Migración, compatibilidad y rollback definidos cuando aplican.

Salida: contrato propuesto y riesgos aceptados; no autoriza frontend.

## Gate 3 — Backend

- Implementación limitada al contrato autorizado.
- DTOs, proyecciones, autorización, tenant e invariantes cubiertos.
- Tests y validaciones backend aplicables terminan con exit code `0`.
- Contrato y documentos sincronizados.

Salida: checkpoint backend candidato. Frontend requiere aprobación explícita del backend.

## Gate 4 — Frontend

- Consume contrato aprobado sin mocks ni endpoints inventados.
- Reutiliza componentes y cubre roles, privacidad, estados, responsive y accesibilidad.
- TypeScript, lint y build web terminan con exit code `0`.
- Usar además [`$kortek-product-ui`](../../.agents/skills/kortek-product-ui/SKILL.md).

Salida: implementación lista para QA, no interfaz aprobada.

## Gate 5 — QA funcional y visual

- Flujo principal, errores y recuperación probados con datos reales/controlados.
- Roles, privacidad, desktop, móvil, consola, teclado y estados comprobados.
- Evidencia registra entorno, rol, acción y resultado.

Una compilación limpia no satisface este gate.

## Gate 6 — Checkpoint candidato

- Se cumple la sección aplicable de [`DEFINITION_OF_DONE.md`](DEFINITION_OF_DONE.md).
- Diff completo, `git diff --check`, alcance, secretos, temporales y documentación revisados.
- Staging por rutas explícitas; un commit coherente; push solo a la rama autorizada.
- El checkpoint queda **IMPLEMENTADO / EN REVISIÓN**, nunca aprobado por el push.

## Gate 7 — Auditoría y aprobación

- Revisión independiente del código/diff, pruebas, contratos, seguridad y QA.
- Hallazgos bloqueantes corregidos y revalidados.
- Aprobación explícita del propietario antes de cerrar o avanzar.

## Gate de documentación

Un cambio exclusivamente documental no ejecuta builds por defecto. Debe validar enlaces sintácticos y semánticos, estados, estructura de skills, ausencia de contradicciones, `git diff --check` y diff completo.

## Relevo o pausa

Si falta tiempo, contexto, acceso o validación:

1. detenerse en un punto estable;
2. registrar estado, intención, archivos, Git y validaciones exactas;
3. listar pendientes y el siguiente paso reproducible;
4. sincronizar controles;
5. publicar solo si está autorizado y marcar **PAUSADO / INCOMPLETO**.

Una pausa no satisface gates posteriores ni autoriza otra etapa.
