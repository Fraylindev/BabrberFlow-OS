# ADR-002 — Facturación interna inmutable y cobro completo único

- Estado: **CERRADO / APROBADO**
- Fecha de decisión: 2026-08-25
- Correctivo de auditoría: 2026-08-26
- Contrato aprobado: [`FACTURACION_A_CONTRATO_TECNICO.md`](../features/FACTURACION_A_CONTRATO_TECNICO.md)
- Checkpoint base del contrato: `2d66d7c301de6dfc69f2cead94356ed2e7bd95f1`
- Checkpoint backend aprobado: `21761ac573b075ec627c0e91593d61a4279c2b8f`

## Contexto

El modelo anterior permitía que el cliente enviara `amount`, persistía estados financieros sin un Payment autoritativo, no exigía Booking completada y atribuía ingresos a la fecha de emisión. Payment estaba relacionado directamente con Booking, tenía importe y estado propios, pero no conservaba el actor ni una fecha real de cobro explícita. Esa composición no podía garantizar aislamiento financiero, trazabilidad ni idempotencia concurrente.

Facturación-A es un registro operativo interno. No es comprobante fiscal, e-CF ni integración tributaria. Los reembolsos, anulaciones, pagos parciales, comisiones y hard-delete no tienen contrato en este checkpoint.

## Decisión

1. Una Booking solo puede pasar a `COMPLETED` cuando el tiempo autoritativo del servidor alcanza `Booking.endTime`; la regla central aplica a todos los roles y se repite en emisión/cobro para datos históricos.
2. `Service.price` es una fuente DOP `Decimal(65,2)`, estrictamente positiva y con máximo dos decimales. `Invoice.amount` toma ese snapshot dentro de la transacción de emisión; el cliente solo aporta `bookingId`.
3. La moneda es `DOP`; no existe multi-moneda en Facturación-A.
4. Invoice no persiste un estado mutable. La API deriva `ISSUED` cuando no hay Payment y `PAID` cuando existe el Payment único.
5. Una Invoice admite cero o un Payment completo e inmutable. Payment guarda método, `paidAt` asignado por servidor y `recordedByUserId`; no duplica amount, booking ni estado.
6. Booking, Invoice y Payment quedan unidos por claves compuestas con `organizationId`, además de consultas tenant-scoped. BARBER añade ownership autoritativo por `Booking.professional.userId`.
7. Emisión y cobro usan transacciones PostgreSQL `SERIALIZABLE`, bloqueos de fila, reintentos acotados y constraints únicas. Repetir la misma operación devuelve el agregado existente sin duplicar AuditLog; un método de cobro distinto devuelve conflicto.
8. `ISSUE_INVOICE` y `RECORD_INVOICE_PAYMENT` se escriben en la misma transacción que la mutación y sin PII. Si AuditLog falla, la operación financiera se revierte.
9. Analytics suma `Invoice.amount` únicamente cuando `Payment.paidAt` cae en el rango del día calculado con `Organization.timeZone`.
10. Las respuestas son mínimas y paginadas. No exponen tenant, actor, correo, teléfono, notas, objetos Prisma o estados legacy.
11. DTO, servicio y PostgreSQL protegen Service.price. La migración no redondea datos históricos inválidos: falla cerrada para reconciliación explícita.

## Permisos

- OWNER, ADMIN y RECEPTIONIST consultan, emiten y cobran dentro de su tenant.
- BARBER vinculado consulta, emite y cobra únicamente sus propias reservas; puede completar su Booking mediante el contrato vigente de Reservas solo después de `endTime`.
- BARBER ajeno recibe `404` neutro y BARBER sin vínculo obtiene listado vacío sin inferir recursos.
- CUSTOMER no accede a Facturación ni Analytics global.

## Migración y compatibilidad

La migración falla cerrada si encuentra Payment legacy, Invoice pagada/reembolsada o datos que no cumplan tenant, Booking completada y snapshot determinista. No inventa actor, método, fecha ni importe. Una Invoice legacy `UNPAID` solo se conserva cuando coincide exactamente con el precio válido del Service y todas las invariantes.

La migración correctiva `20260826210000_facturacion_a_completion_service_price_guards` falla antes de cambiar tipos si detecta `Service.price` no positivo, con más de dos decimales o fuera de `Decimal(65,2)`, o una Booking futura ya `COMPLETED`. El camino válido convierte Service a `Decimal(65,2)` y añade `Service_price_dop_check`; el fallo revierte toda la transacción y no redondea filas.

El contrato retira `PATCH /invoices/:id/pay`, elimina `amount` de `POST /invoices` y usa `POST /invoices/:id/payments`. Facturación-B ya consume este contrato como candidato compatible, pero sigue pendiente de aprobación explícita antes de cierre o activación.

## Alternativas descartadas

- Confiar en `amount` del navegador: permite alterar el registro financiero.
- Confiar solo en el estado `COMPLETED`: permite facturar datos históricos completados antes de `endTime`.
- Redondear Service.price al migrar: altera silenciosamente el importe que luego será autoritativo.
- Mantener estados Invoice/Payment independientes: admite combinaciones contradictorias.
- Crear Invoice o Payment automáticamente al completar Booking: confunde prestación, emisión y cobro.
- Usar `Invoice.createdAt` para ingresos: atribuye dinero antes del cobro real.
- Convertir datos legacy con valores por defecto: fabricaría trazabilidad financiera.
- AuditLog fail-open para emisión/cobro: permitiría una escritura financiera sin evidencia requerida.

## Consecuencias

- El modelo es más estricto y elimina estados hoy no contratados.
- La activación exige reconciliar explícitamente precios históricos inválidos o reservas futuras ya completadas si existen.
- La activación requiere coordinar un consumidor frontend posterior.
- Anulación, reembolso, pago parcial, comisiones y fiscalidad necesitarán decisiones y migraciones propias.
- La auditoría validó migración, concurrencia, IDOR, proyecciones y evidencia PostgreSQL; el propietario aprobó y cerró Facturación-A Backend sobre el checkpoint correctivo registrado.
- Facturación-B permanece separada y **IMPLEMENTADA / EN REVISIÓN**; su implementación y QA no equivalen a aprobación ni cierre.
