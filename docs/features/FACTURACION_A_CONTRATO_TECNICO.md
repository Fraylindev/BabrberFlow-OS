# Facturación-A — contrato técnico aprobado

Estado: **IMPLEMENTADO / EN REVISIÓN**

Etapa: **Backend**

Fecha: 2026-08-25

Contrato aprobado: `2d66d7c301de6dfc69f2cead94356ed2e7bd95f1`
Rama autorizada: `ai/antigravity-qa`

Este documento define el contrato de producto, arquitectura y seguridad implementado por Facturación-A Backend. El checkpoint continúa pendiente de auditoría y aprobación; no autoriza frontend ni despliegue aislado.

## 1. Resultado de producto

Facturación-A permite registrar internamente la obligación de cobro de una reserva completada y un único cobro completo asociado. No genera comprobantes fiscales, e-CF ni documentos con validez tributaria.

Resultados por rol:

- `OWNER`, `ADMIN` y `RECEPTIONIST`: consultar la facturación del tenant, emitir una factura interna para una reserva completada y registrar su cobro.
- `BARBER` vinculado a un `Professional` del tenant: consultar únicamente la facturación y los cobros de sus propias reservas, completar su propia reserva mediante el contrato vigente de Reservas, emitir la factura interna y registrar su cobro.
- `BARBER` sin Professional vinculado: listado vacío; los recursos concretos se comportan como no disponibles.
- `CUSTOMER`: sin acceso al dashboard ni a este contrato.

Lenguaje futuro para BARBER: **“Facturación de mis servicios”** o **“Cobros de mis reservas”**. No usar “ganancias”, “ingresos netos”, “comisiones”, “comprobante fiscal” ni “e-CF”.

## 2. Alcance y no-alcance

### Incluido

- factura interna única por `Booking COMPLETED`;
- snapshot autoritativo del precio vigente de `Service` al emitir;
- un único `Payment` completo por Invoice;
- método de cobro, `paidAt` autoritativo y actor que registró el cobro;
- consulta mínima, paginada y tenant-scoped;
- ownership de BARBER derivado de `Professional.userId`;
- auditoría transaccional sin PII para emisión y cobro;
- Analytics basado en la fecha real de pago;
- estrategia de migración, compatibilidad, concurrencia, pruebas y QA.

### Excluido

- comprobantes fiscales, e-CF, numeración fiscal o integración tributaria;
- pagos parciales, múltiples pagos por factura, propinas, descuentos, impuestos o comisiones;
- modificación manual del importe;
- anulación, reembolso, contracargo, edición o hard-delete;
- pasarelas, links de pago, conciliación bancaria o carga de comprobantes;
- multi-moneda; Facturación-A conserva la moneda única vigente `DOP`/`RD$`;
- frontend, A0.6, Clerk, Supabase y cualquier cambio de autenticación.

## 3. Modelo objetivo

### Invoice

| Campo | Regla propuesta |
| --- | --- |
| `id` | UUID interno |
| `organizationId` | Tenant autoritativo; nunca viene del body |
| `bookingId` | Único; relación tenant-consistente con Booking |
| `amount` | Decimal positivo con escala máxima de 2; snapshot de `Service.price` tomado por servidor |
| `currency` | Constante `DOP`; nunca viene del cliente |
| `createdAt` | Fecha de emisión interna, asignada por servidor |
| `updatedAt` | Compatibilidad técnica; Invoice es inmutable en Facturación-A |

Invoice no conserva un estado mutable. La proyección deriva:

- `ISSUED`: no existe Payment;
- `PAID`: existe el Payment único.

Los valores persistidos actuales `UNPAID`, `PAID` y `REFUNDED` no forman parte del contrato nuevo. `REFUNDED` no se migra por inferencia ni se expone.

### Payment

| Campo | Regla propuesta |
| --- | --- |
| `id` | UUID interno |
| `organizationId` | Igual al tenant de Invoice |
| `invoiceId` | Único; una Invoice admite cero o un Payment |
| `method` | `CASH`, `CARD` o `TRANSFER` |
| `paidAt` | Instante autoritativo asignado por servidor al primer registro |
| `recordedByUserId` | UUID local del actor autenticado, denormalizado para conservar trazabilidad |
| `createdAt` | Instante técnico de creación |

Payment no necesita `amount`, `bookingId` ni estado propio en Facturación-A: su existencia representa el pago completo e inmutable del `Invoice.amount`. La reserva se obtiene mediante `Payment → Invoice → Booking`.

### Refuerzo relacional

- añadir unicidad compuesta `Booking(id, organizationId)`;
- añadir unicidad compuesta `Invoice(id, organizationId)`;
- relacionar Invoice con Booking mediante `(bookingId, organizationId)`;
- relacionar Payment con Invoice mediante `(invoiceId, organizationId)`;
- conservar `RESTRICT` para datos financieros;
- indexar listados por `(organizationId, createdAt, id)`;
- indexar cobros/Analytics por `(organizationId, paidAt, id)`.

## 4. Estrategia de migración

La migración debe fallar cerrada y no inventar fechas, actores, métodos ni estados financieros.

1. Inventariar por tenant, sin exponer PII:
   - Invoices por estado;
   - Payments por estado;
   - Invoice sin Payment marcada como pagada;
   - Payment sin Invoice correspondiente;
   - pares con tenant o importe divergente;
   - Invoice de Booking no completada;
   - importes no positivos, fuera de rango o con más de dos decimales.
2. Si existe cualquier fila financiera no convertible de forma determinista, detener la migración y exigir una decisión de reconciliación explícita. No usar `updatedAt` como `paidAt` ni seleccionar un actor o método por defecto.
3. Añadir primero claves compuestas, nuevas columnas/relaciones e índices compatibles.
4. Migrar únicamente filas que satisfagan todas las invariantes y tengan actor, método y fecha reales verificables.
5. Retirar `Invoice.status`, `Payment.status`, `Payment.bookingId` y `Payment.amount` solo después de verificar que el modelo nuevo representa todas las filas autorizadas.
6. Aplicar constraints de unicidad, tenant y precisión al final de la transacción de migración.
7. Validar en PostgreSQL aislado `migrate deploy`, rollback operativo mediante restore y consistencia de `_prisma_migrations` antes de tocar cualquier entorno persistente.

La migración no incluye Supabase ni traslado de datos entre proveedores.

## 5. Invariantes Invoice–Payment

1. Invoice existe solo si Booking pertenece al mismo tenant y está `COMPLETED`.
2. Una Booking admite como máximo una Invoice.
3. `Invoice.amount` se lee de `Booking.service.price` dentro de la transacción de emisión. El body no acepta `amount`.
4. El snapshot debe ser positivo, caber en la precisión acordada y tener escala máxima de dos decimales; una configuración inválida produce conflicto sin escrituras.
5. Invoice es inmutable: no se editan booking, importe, moneda o fecha de emisión.
6. Una Invoice admite como máximo un Payment.
7. Payment representa el pago completo de Invoice; no hay importes parciales ni modificación posterior.
8. `paidAt` y `recordedByUserId` los resuelve el servidor; el cliente no puede enviarlos.
9. Invoice/Payment/Booking comparten `organizationId` por consulta y FK compuesta.
10. Para BARBER, `Booking.professional.userId` debe coincidir con el actor dentro del mismo tenant.
11. No hay hard-delete ni transición desde `PAID` en Facturación-A.
12. Cada creación nueva de Invoice o Payment produce exactamente un AuditLog en la misma transacción.

## 6. Transiciones

```text
Booking no completada ── completar por contrato de Reservas ──► Booking COMPLETED
Booking COMPLETED sin Invoice ── emitir ──► Invoice ISSUED
Invoice ISSUED ── registrar método de cobro ──► Invoice PAID
Invoice PAID ──► estado terminal en Facturación-A
```

- repetir “emitir” para la misma Booking devuelve la Invoice existente y no duplica auditoría;
- repetir “registrar cobro” con el mismo método devuelve el Payment existente y no cambia actor ni `paidAt`;
- repetir el cobro con un método diferente devuelve conflicto;
- anular, reembolsar, editar o borrar no tiene endpoint.

## 7. Endpoints propuestos

Todos usan `B2bAuthGuard`, Membership y rol locales. `organizationId`, actor, Professional y ownership nunca se aceptan desde body o query.

### `PATCH /bookings/:id/status` — dependencia existente de Reservas

Facturación-A conserva la ruta vigente; no crea una transición paralela ni combina completar y facturar en una sola operación.

Para habilitar la emisión, el body es `{ "status": "COMPLETED" }` y se mantienen las transiciones autorizadas por Reservas:

- BARBER solo puede pasar de `CONFIRMED` a `COMPLETED` una Booking cuyo `professional.userId` coincide con su identidad en el tenant activo;
- un BARBER ajeno recibe `404` neutro y uno sin Professional vinculado queda denegado sin resolver el recurso;
- OWNER, ADMIN y RECEPTIONIST conservan las transiciones que defina el contrato vigente de Reservas;
- completar no crea Invoice ni Payment automáticamente, y repetir `COMPLETED` no duplica efectos financieros.

### `GET /invoices`

Consulta paginada tenant-scoped.

Query DTO:

| Campo | Regla |
| --- | --- |
| `page` | entero positivo; default `1` |
| `limit` | entero `1..100`; default `20` |
| `state` | opcional: `ISSUED` o `PAID` |

- orden estable: `createdAt DESC, id DESC`;
- metadata mediante `X-Total-Count`, `X-Page`, `X-Limit`, `X-Total-Pages`, siguiendo el contrato vigente de listados;
- OWNER/ADMIN/RECEPTIONIST reciben el tenant completo;
- BARBER recibe solo filas cuyo `Booking.professional.userId` coincide con su User local;
- BARBER sin Professional vinculado recibe `200 []` y metadata en cero.

### `GET /invoices/:id`

Devuelve la misma proyección mínima para una Invoice autorizada. Recurso de otro tenant, de otro Professional para BARBER o inexistente responde `404` neutro.

### `POST /invoices`

Body `CreateInvoiceDto`:

| Campo | Tipo |
| --- | --- |
| `bookingId` | UUID obligatorio |

No acepta `amount`, `organizationId`, `professionalId`, `serviceId`, estado, actor o fecha.

- `201`: Invoice creada;
- `200`: repetición idempotente de una emisión ya existente y autorizada;
- `404`: Booking no disponible para el tenant/ownership;
- `409`: Booking no está completada o el precio no puede convertirse en un snapshot válido.

### `POST /invoices/:id/payments`

Body `RecordInvoicePaymentDto`:

| Campo | Tipo |
| --- | --- |
| `method` | `CASH`, `CARD` o `TRANSFER` |

No acepta amount, `paidAt`, actor, tenant, Booking o Professional.

- `201`: Payment creado;
- `200`: repetición idempotente con el mismo método;
- `404`: Invoice no disponible para el tenant/ownership;
- `409`: ya existe Payment con otro método o la fila financiera está en estado incompatible.

### Contratos retirados

- `PATCH /invoices/:id/pay` queda retirado: no registra método ni Payment seguro.
- `POST /invoices` deja de aceptar `amount`.
- No se añade un listado independiente de Payments; la proyección de Invoice incluye su Payment mínimo.

Estos cambios rompen el consumidor frontend actual. El backend candidato no debe desplegarse por separado: la activación requiere una entrega frontend autorizada y coordinada o un mecanismo de compatibilidad aprobado que nunca confíe en amount ni invente un método de pago.

## 8. Proyecciones mínimas

### InvoiceListItem / InvoiceDetail

| Campo | Exposición |
| --- | --- |
| `id` | necesario para detalle/cobro |
| `state` | `ISSUED` o `PAID`, derivado |
| `amount` | string decimal, nunca `number` flotante |
| `currency` | `DOP` |
| `issuedAt` | `createdAt` de Invoice |
| `booking.id` | navegación interna autorizada |
| `booking.startTime` | contexto de la reserva |
| `booking.clientName` | identificación mínima de la cita |
| `booking.serviceName` | servicio facturado |
| `booking.professionalName` | profesional de la reserva |
| `payment` | `null` o `{ method, paidAt }` |

No devolver `organizationId`, correo, teléfono, notas, objetos Prisma completos, precio actual de Service, IDs de User, `recordedByUserId`, AuditLog ni estados legacy.

## 9. Matriz de permisos

| Acción | OWNER | ADMIN | RECEPTIONIST | BARBER vinculado | BARBER ajeno/sin vínculo | CUSTOMER |
| --- | --- | --- | --- | --- | --- | --- |
| Listar Invoice/Payment | Tenant | Tenant | Tenant | Solo reservas propias | Vacío | Denegado |
| Ver detalle | Tenant | Tenant | Tenant | Solo reserva propia | `404` | Denegado |
| Completar Booking | Contrato Reservas | Contrato Reservas | Contrato Reservas | Solo Booking propia | `404` | Denegado |
| Emitir Invoice | Tenant + COMPLETED | Tenant + COMPLETED | Tenant + COMPLETED | Propia + COMPLETED | `404` | Denegado |
| Registrar Payment | Tenant | Tenant | Tenant | Solo Invoice propia | `404` | Denegado |
| Cambiar amount | Nunca | Nunca | Nunca | Nunca | Nunca | Nunca |
| Anular/reembolsar/borrar | Fuera de alcance | Fuera de alcance | Fuera de alcance | Nunca | Nunca | Nunca |
| Analytics global | Sí, contrato Analytics | Sí | Sí | Nunca | Nunca | Nunca |

El menú y la UI futura reflejarán esta matriz, pero la autorización efectiva vive en cada consulta backend.

## 10. Aislamiento, ownership e IDOR

- resolver `RequestUser` completo en controller; no extraer solo `organizationId` cuando la acción necesita ownership o actor;
- revalidar Membership y rol mediante la capa B2B vigente;
- para BARBER, resolver `Professional` por `(userId, organizationId)` y añadir ese `professionalId` a la consulta final de Invoice/Booking;
- aplicar `organizationId` y ownership en la misma consulta autoritativa; una lectura previa aislada no concede acceso;
- verificar en creación que Booking, Service y Professional pertenecen al tenant;
- verificar en Payment que Invoice y Booking continúan dentro del mismo tenant y ownership;
- no aceptar filtros `organizationId`, `userId` o `professionalId` para ampliar alcance;
- contar y paginar después de aplicar tenant y ownership;
- responder `404` neutro para IDs ajenos y probar IDOR horizontal/vertical.

Threat model mínimo:

| Amenaza | Mitigación contractual |
| --- | --- |
| Body altera amount | DTO no lo acepta; snapshot server-side |
| BARBER usa Invoice/Booking ajena | tenant + Professional ownership en consulta final |
| selector tenant concede acceso | Membership local revalidada; selector nunca autoriza |
| carrera duplica Invoice/Payment | lock + unicidad + traducción idempotente |
| respuesta filtra PII | `select` explícito y DTO mínimo |
| mutación queda sin auditoría | escritura financiera y AuditLog en la misma transacción |
| revenue cae en fecha incorrecta | Analytics consulta `Payment.paidAt` |

## 11. Concurrencia e idempotencia

### Emisión

1. Transacción PostgreSQL `SERIALIZABLE` con reintento acotado para `P2034`.
2. Bloquear Booking tenant-scoped y verificar `COMPLETED`.
3. Bloquear/leer Service de esa Booking dentro de la misma transacción.
4. Validar y copiar `Service.price` a Invoice.
5. Crear Invoice y AuditLog `ISSUE_INVOICE`.
6. Ante carrera por `bookingId`, releer la Invoice autorizada y devolver `200`; no crear segundo AuditLog.

### Cobro

1. Transacción PostgreSQL `SERIALIZABLE` con reintento acotado.
2. Bloquear Invoice tenant/ownership-scoped.
3. Si no existe Payment, crearlo con método del DTO, `paidAt = now` del servidor y actor de sesión; crear AuditLog `RECORD_INVOICE_PAYMENT`.
4. Si ya existe con el mismo método, devolverlo `200` sin cambiar `paidAt`, actor ni auditoría.
5. Si existe con otro método, devolver `409`.

Las constraints únicas son la garantía final; las comprobaciones previas solo producen mejores errores.

## 12. Auditoría

Eventos:

| Acción | Entidad | entityId | Datos excluidos |
| --- | --- | --- | --- |
| `ISSUE_INVOICE` | `Invoice` | Invoice.id | importe, cliente, servicio, notas |
| `RECORD_INVOICE_PAYMENT` | `Payment` | Payment.id | importe, método, cliente, datos bancarios |

- `organizationId` y `userId` proceden del contexto autenticado;
- no se guarda PII ni bodies;
- la auditoría de estas dos mutaciones es transaccional/fail-closed: si falla, la escritura financiera se revierte;
- repeticiones idempotentes no generan eventos duplicados;
- Payment conserva además `recordedByUserId` como trazabilidad operacional no expuesta.

## 13. Analytics

- ingresos = suma de `Invoice.amount` para Payments cuyo `paidAt` cae en el rango;
- filtrar `Payment.organizationId` e `Invoice.organizationId` por el tenant autoritativo;
- calcular los límites del día del negocio usando `Organization.timeZone` y comparar instantes inequívocos;
- no usar `Invoice.createdAt` para ingresos;
- BARBER continúa excluido de Analytics global;
- no inferir ingresos, ganancias netas o comisiones del BARBER.

## 14. Pruebas unitarias

### DTO/controller

- body válido contiene solo `bookingId` o `method` según endpoint;
- whitelist rechaza amount, tenant, actor, estado, `paidAt` y ownership enviados;
- UUID, método, page y limit inválidos devuelven `400`;
- headers de paginación exactos;
- matriz de roles del controller y uso de `RequestUser` completo.
- para el flujo de Facturación-A, `PATCH /bookings/:id/status` acepta `CONFIRMED` a `COMPLETED` solo sobre la Booking propia del BARBER y no crea efectos financieros; las demás transiciones continúan bajo las pruebas y el contrato de Reservas.

### Service

- snapshot exacto del precio y salida decimal como string;
- rechazo de Booking no completada y precio inválido;
- Invoice/Payment idempotentes;
- conflicto por método diferente;
- BARBER vinculado propio, ajeno y sin vínculo;
- proyección OWNER/ADMIN/RECEPTIONIST y BARBER sin PII extra;
- orden/paginación deterministas y total calculado tras ownership;
- AuditLog exacto una vez y rollback si falla;
- Analytics usa `paidAt`, tenant y zona del negocio.

## 15. E2E PostgreSQL

Ejecutar en base `_test`, usuario no privilegiado y entorno temporal aislado:

1. OWNER, ADMIN y RECEPTIONIST pueden listar, emitir y cobrar dentro de su tenant.
2. BARBER A completa su Booking `CONFIRMED`; BARBER B recibe `404` sobre el mismo ID y completar no crea Invoice.
3. BARBER A opera su Invoice; BARBER B recibe `404` sobre los mismos IDs financieros.
4. BARBER sin vínculo recibe lista vacía y queda denegado en detalle/mutaciones sin inferir recursos.
5. Tenant B no puede inferir recursos de tenant A usando UUIDs válidos.
6. Invoice de PENDING/CONFIRMED/CANCELLED/NO_SHOW se rechaza; COMPLETED se acepta.
7. Amount y campos privilegiados enviados se rechazan y nunca alteran el snapshot.
8. Ráfaga concurrente de emisión produce una Invoice y un AuditLog.
9. Ráfaga concurrente de cobro produce un Payment y un AuditLog; `paidAt`/actor permanecen estables.
10. Repetición con método diferente produce `409` sin mutación parcial.
11. Constraints impiden Booking–Invoice–Payment cruzados entre tenants.
12. Fallo forzado de auditoría revierte Invoice/Payment.
13. Paginación no mezcla tenants ni profesionales y no expone PII prohibida.
14. Analytics atribuye el ingreso al día de `Payment.paidAt`, no a emisión ni Booking.
15. La migración falla ante datos legacy no reconciliables y pasa con un fixture convertible aprobado.

## 16. QA manual planificado

### Backend integrado de Facturación-A

- sesiones reales/controladas para OWNER, ADMIN, RECEPTIONIST, dos BARBER vinculados y un BARBER sin vínculo;
- dos organizaciones con reservas completadas y no completadas;
- emitir, repetir emisión, cobrar, repetir cobro y probar método conflictivo;
- verificar amount igual al precio server-side aunque el cliente intente enviar otro;
- cambiar tenant y repetir IDs ajenos;
- comprobar Payment, `paidAt`, actor y AuditLog en PostgreSQL sin registrar PII en evidencia;
- comprobar que Analytics cambia en el día real del cobro;
- confirmar que BARBER solo ve “Facturación de mis servicios”/“Cobros de mis reservas” y nunca Analytics global.

### Frontend futuro, fuera de esta autorización

Después de aprobación explícita del backend: loading, empty, error, pending, success, confirmación de cobro, teclado/foco, desktop, 390 px, cambio de tenant/rol sin datos obsoletos y consola limpia. No iniciar este QA ni frontend en Facturación-A.

## 17. Compatibilidad y activación

- el contrato cambia bodies, respuestas, modelo y endpoint de cobro;
- el frontend actual envía amount, espera estados legacy y usa `PATCH /invoices/:id/pay`;
- el checkpoint backend debe considerarse candidato de revisión, no desplegable de forma aislada;
- la activación requiere frontend autorizado y coordinado, o una compatibilidad explícitamente aprobada que ignore de forma segura amount y nunca invente método/actor/fecha;
- rollback operativo: restaurar binario y base desde backup previo; no intentar downgrade destructivo de filas financieras nuevas;
- `BACKEND_CHANGES.md` se actualizará al implementar el contrato, no durante este plan.

## 18. Gates y siguiente autorización

Gate 1 y Gate 2 fueron aprobados por el propietario al autorizar Facturación-A Backend. Gate 3 queda **IMPLEMENTADO / EN REVISIÓN** como checkpoint candidato.

Para cerrar el backend se requiere auditoría y aprobación explícita del propietario. Frontend exige una autorización posterior independiente. Continúan fuera de alcance A0.6-B, Clerk, Supabase, reembolsos, anulaciones, comisiones e integraciones de pago.

## 19. Evidencia del checkpoint backend

- migración versionada fail-closed, validada sobre una Invoice legacy convertible y un Payment legacy bloqueante;
- Prisma format/validate/generate, TypeScript, lint y build en exit `0`;
- 305 pruebas unitarias aprobadas; 11 integraciones opt-in omitidas por diseño;
- 78/78 E2E aprobadas sobre PostgreSQL temporal separado, base `_test` y rol propietario sin privilegios globales;
- QA backend integrado dentro de la E2E: OWNER, ADMIN, RECEPTIONIST, dos BARBER vinculados, BARBER sin vínculo y CUSTOMER; dos tenants; cambio de rol/tenant para una misma identidad; emisión/cobro idempotentes y concurrentes; IDOR; mínima exposición; auditoría; rollback y Analytics por `paidAt`;
- frontend, A0.6-B, Clerk, Supabase y demás no-alcances permanecieron intactos.
