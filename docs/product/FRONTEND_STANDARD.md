# Estándar frontend — Kortek Booking

## Base técnica

- Next.js App Router, React, TypeScript estricto y Tailwind.
- React Query para datos remotos según el patrón existente.
- `apps/web/lib/api.ts` como cliente HTTP central.
- Componentes reutilizables existentes antes de crear variantes nuevas.
- Tema del dashboard basado en `--dash-*`.

## Antes de implementar

1. Completar el brief de [`PRODUCT_STANDARD.md`](PRODUCT_STANDARD.md).
2. Usar [`$kortek-product-ui`](../../.agents/skills/kortek-product-ui/SKILL.md).
3. Inspeccionar pantalla, componentes UI, hooks, query keys, contratos y permisos reales.
4. Identificar datos por rol y evitar que una respuesta más privilegiada quede reutilizada en otra sesión o tenant.
5. Confirmar que backend aprobado cubre el flujo. Si falta un contrato, detenerse y proponerlo.

## Diseño e interacción

- Construir para la tarea del usuario, no como CRUD genérico.
- Mantener jerarquía visual, acciones principales claras y densidad apropiada.
- Diseñar primero móvil y desktop como presentaciones válidas del mismo flujo.
- No esconder funciones necesarias para resolver responsive.
- Evitar scroll horizontal cuando cards o composición vertical sean más claras.
- Reutilizar patrones de [`UI_PATTERNS.md`](UI_PATTERNS.md).
- Presentar fechas y horas de forma natural en el contexto del negocio. No mostrar identificadores IANA, `UTC`, offsets ni detalles de conversión; esa lógica es interna.

## Estados y errores

Toda superficie remota debe contemplar, cuando aplique:

- loading estable, sin saltos innecesarios;
- empty inicial con próximo paso;
- empty filtrado con opción de limpiar;
- error con mensaje útil y reintento;
- pending/disabled durante mutación;
- éxito visible y datos actualizados;
- conflicto o validación con explicación accionable.

Traducir errores esperados del API. Ejemplos:

| Señal técnica | Lenguaje de producto |
| --- | --- |
| `409` por reserva futura | “No puedes aplicar este cambio porque afectaría una reserva futura.” |
| recurso tenant-scoped `404` | “Este registro no está disponible.” |
| validación de fecha | “Revisa la fecha y la hora e inténtalo de nuevo.” |

No mostrar códigos internos, SQL, Prisma, nombres de constraints ni stack traces.

## Privacidad y roles

- Renderizar solo acciones autorizadas, manteniendo backend como protección real.
- Minimizar PII en props, caché, logs, copy y estados de error.
- Incluir tenant, rol y usuario en query keys cuando cambie el alcance de datos.
- Marcar notas internas y nunca trasladarlas a superficies públicas.

## Accesibilidad

- HTML semántico, labels asociados y nombres accesibles.
- Foco visible, retorno de foco y operación por teclado.
- Errores asociados al campo y anuncios `role="alert"`/`aria-live` cuando corresponda.
- Contraste suficiente y significado no dependiente solo del color.
- Targets táctiles y acciones legibles en móvil.

## Evidencia y QA

Ejecutar TypeScript, lint y build; después validar en navegador:

- flujo principal y errores;
- roles y privacidad;
- desktop y móvil pequeño;
- loading/empty/error/success;
- consola sin errores o warnings relevantes;
- foco, teclado, navegación y overflow.

**Una compilación limpia no aprueba una interfaz.** Registrar qué se observó y cualquier QA manual pendiente.
