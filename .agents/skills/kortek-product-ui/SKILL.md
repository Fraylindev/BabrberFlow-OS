---
name: kortek-product-ui
description: Define y valida producto, UX, privacidad, roles, responsive, accesibilidad, estados y QA visual para Kortek Booking. Usar en todo trabajo frontend: nuevas pantallas, cambios de UI, formularios, componentes, copy, integración con API, responsive, accesibilidad o revisión visual.
---

# Kortek Product UI

Aplicar este flujo antes, durante y después de cualquier cambio frontend del repositorio.

## 1. Leer el contexto vigente

Leer, en este orden:

1. `PROJECT_MASTER.md` para estado, decisiones y alcance;
2. `docs/product/PRODUCT_STANDARD.md` para definir el resultado;
3. `docs/product/FRONTEND_STANDARD.md` para implementación y evidencia;
4. `docs/product/UI_PATTERNS.md` para patrones de interacción;
5. `docs/quality/DEFINITION_OF_DONE.md` para cierre.

Inspeccionar además `apps/web/AGENTS.md`, el código, componentes, hooks y contratos reales relacionados.

## 2. Definir producto y UX antes del código

Registrar un brief breve con:

- usuario y rol;
- problema y resultado esperado;
- flujo principal y casos de error;
- alcance y no-alcance;
- permisos y datos visibles por rol;
- privacidad/PII;
- lenguaje de interfaz;
- estados loading, empty, error, pending y success;
- comportamiento móvil y desktop;
- accesibilidad y criterios de aceptación observables.

No escribir código mientras una decisión pendiente pueda cambiar contrato, permisos, persistencia o flujo.

## 3. Auditar antes de crear

- Buscar componentes, patrones, estilos, hooks y utilidades reutilizables.
- Confirmar el contrato backend publicado; no inventar endpoints, campos ni mocks permanentes.
- Identificar aislamiento de caché por tenant, rol y usuario.
- Reducir datos a lo necesario para la tarea y el rol.
- Detenerse y proponer el contrato faltante si el backend no permite completar el flujo.

## 4. Diseñar la experiencia

- Usar lenguaje centrado en la tarea, sin Prisma, SQL, constraints, códigos HTTP ni jerga técnica.
- Traducir errores esperados del API a una explicación útil y una acción siguiente.
- Mantener notas internas y PII fuera de superficies públicas, logs y mensajes innecesarios.
- Diseñar responsive real; no resolver móvil ocultando acciones necesarias.
- Asegurar labels, semántica, foco visible, teclado, contraste y anuncios de estado/error.
- Cubrir todos los estados definidos antes de considerar la pantalla completa.

## 5. Implementar con el sistema existente

- Reutilizar componentes y variables visuales antes de introducir variantes.
- Usar `apps/web/lib/api.ts` y React Query según el patrón vigente.
- Mantener autorización en backend; la UI solo refleja el permiso.
- Evitar dependencias nuevas, clientes HTTP paralelos, casts inseguros y datos ficticios.
- Limitar el cambio al módulo y etapa autorizados.

## 6. Validar con evidencia

Ejecutar TypeScript, lint y build web con exit code `0`. Después hacer QA real en navegador:

- rol autorizado y rol restringido;
- flujo principal, errores y recuperación;
- loading, empty, pending y success;
- desktop y móvil pequeño sin overflow;
- foco, teclado y labels;
- consola sin errores o warnings relevantes;
- privacidad y datos realmente recibidos.

Registrar entorno, rol, acción y resultado. Una compilación limpia nunca aprueba una interfaz.

## 7. Detenerse con seguridad

Si falta contrato, decisión, tiempo o QA, no fingir cierre. Aplicar el protocolo de relevo de `AGENTS.md`, dejar el punto exacto de continuación y marcar cualquier checkpoint autorizado como **PAUSADO / INCOMPLETO**.
