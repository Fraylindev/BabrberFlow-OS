# Patrones UI — Kortek Booking

## Pantallas de módulo

Orden recomendado:

1. encabezado con objetivo y acción principal;
2. filtros/búsqueda si reducen el conjunto real;
3. contenido con estado explícito;
4. paginación real cuando el backend la ofrece;
5. acciones secundarias dentro del contexto del recurso.

No presentar datos inventados ni controles que no tengan contrato real.

## Listados responsive

- Desktop: tabla cuando comparar columnas aporta valor.
- Tablet/móvil: cards o filas apiladas con las mismas acciones esenciales.
- Mantener orden, filtros y paginación consistentes entre presentaciones.
- Evitar `min-width` que fuerce overflow como solución permanente.

## Estados

- **Loading:** skeleton que refleje la estructura.
- **Empty inicial:** explicar qué falta y ofrecer el siguiente paso autorizado.
- **Empty filtrado:** indicar que los filtros no produjeron resultados y permitir limpiar.
- **Error:** explicar en lenguaje de tarea, permitir reintentar cuando tenga sentido.
- **Success:** confirmar la acción y refrescar/invalidate la fuente real.
- **Pending:** impedir doble envío sin bloquear información necesaria.

## Formularios

- Labels visibles; placeholder solo como ayuda.
- Validación local para feedback rápido y validación backend autoritativa.
- Conservar datos introducidos ante errores recuperables.
- Marcar campos opcionales y límites relevantes.
- Mostrar errores junto al campo o al formulario con una acción clara.
- No enviar campos invisibles o privilegiados por conveniencia.

## Modales y confirmaciones

- Usar modal para una tarea acotada; no convertirlo en una aplicación anidada sin necesidad.
- Título orientado a la acción, cierre accesible, `Escape`, focus trap y retorno de foco.
- En móvil, respetar `100dvh`, scroll interno y acciones alcanzables.
- Confirmar archivo, cancelación u otras acciones de impacto indicando consecuencia, no detalles técnicos.

## Mensajes

- Hablar desde la tarea: “No pudimos guardar el horario”, no “P2002” o “constraint violation”.
- Explicar qué puede hacer la persona a continuación.
- No revelar si existe un recurso de otro tenant.
- No exponer PII o notas internas en toasts, URLs, consola o copy público.

## Búsqueda, filtros y paginación

- Usar búsqueda backend para conjuntos paginados.
- Debounce cercano a 300 ms cuando filtra al escribir; el botón puede ser alternativa.
- Reiniciar a página 1 cuando cambien filtros.
- Leer metadata real; un fallback defensivo no debe presentarse como paginación normal.
- Etiquetar filtros por su comportamiento real, por ejemplo “Todos (sin archivados)”.

## Roles

- OWNER/ADMIN: gestión según contrato.
- RECEPTIONIST: mostrar solo las operaciones autorizadas para su trabajo.
- BARBER: priorizar “mi agenda”, “mis clientes” o “mi disponibilidad” cuando el alcance es propio.
- CUSTOMER: nunca acceder al dashboard interno.

La UI no es el límite de seguridad; el backend debe rechazar la misma acción.

## Fechas y zonas horarias

- Mostrar fechas y horas naturales en el contexto del negocio, por ejemplo “lunes, 9:30 a. m.”.
- Nunca mostrar identificadores IANA, `UTC`, offsets ni detalles de conversión al usuario.
- Resolver internamente la zona autoritativa y enviar instantes inequívocos cuando el contrato lo exija.
- No depender silenciosamente de la zona del navegador; si existe ambigüedad, explicarla con lenguaje cotidiano, como “hora del negocio”.
- Mantener motivos/notas de bloqueos fuera del flujo público; usar un mensaje genérico de falta de horarios.
