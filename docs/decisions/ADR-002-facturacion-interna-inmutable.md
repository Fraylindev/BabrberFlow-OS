# ADR-002 — Facturación interna inmutable y cobro completo único

- Estado: **IMPLEMENTADO / EN REVISIÓN**
- Fecha de decisión: 2026-08-25
- Contrato aprobado: [`FACTURACION_A_CONTRATO_TECNICO.md`](../features/FACTURACION_A_CONTRATO_TECNICO.md)
- Checkpoint base del contrato: `2d66d7c301de6dfc69f2cead94356ed2e7bd95f1`

## Contexto

El modelo anterior permitía que el cliente enviara `amount`, persistía estados financieros sin un Payment autoritativo, no exigía Booking completada y atribuía ingresos a la fecha de emisión. Payment estaba relacionado directamente con Booking, tenía importe y estado propios, pero no conservaba el actor ni una fecha real de cobro explícita. Esa composición no podía garantizar aislamiento financiero, trazabilidad ni idempotencia concurrente.

Facturación-A es un registro operativo interno. No es comprobante fiscal, e-CF ni integración tributaria. Los reembolsos, anulaciones, pagos parciales, comisiones y hard-delete no tienen contrato en este checkpoint.

## Decisión

1. Una Booking `COMPLETED` admite como máximo una Invoice interna inmutable.
2. `Invoice.amount` es un snapshot `Decimal(65,2)` positivo tomado por el servidor desde `Service.price` dentro de la transacción de emisión. El cliente solo aporta `bookingId`.
3. La moneda es `DOP`; no existe multi-moneda en Facturación-A.
4. Invoice no persiste un estado mutable. La API deriva `ISSUED` cuando no hay Payment y `PAID` cuando existe el Payment único.
5. Una Invoice admite cero o un Payment completo e inmutable. Payment guarda método, `paidAt` asignado por servidor y `recordedByUserId`; no duplica amount, booking ni estado.
6. Booking, Invoice y Payment quedan unidos por claves compuestas con `organizationId`, además de consultas tenant-scoped. BARBER añade ownership autoritativo por `Booking.professional.userId`.
7. Emisión y cobro usan transacciones PostgreSQL `SERIALIZABLE`, bloqueos de fila, reintentos acotados y constraints únicas. Repetir la misma operación devuelve el agregado existente sin duplicar AuditLog; un método de cobro distinto devuelve conflicto.
8. `ISSUE_INVOICE` y `RECORD_INVOICE_PAYMENT` se escriben en la misma transacción que la mutación y sin PII. Si AuditLog falla, la operación financiera se revierte.
9. Analytics suma `Invoice.amount` únicamente cuando `Payment.paidAt` cae en el rango del día calculado con `Organization.timeZone`.
10. Las respuestas son mínimas y paginadas. No exponen tenant, actor, correo, teléfono, notas, objetos Prisma o estados legacy.

## Permisos

- OWNER, ADMIN y RECEPTIONIST consultan, emiten y cobran dentro de su tenant.
- BARBER vinculado consulta, emite y cobra únicamente sus propias reservas; puede completar su Booking mediante el contrato vigente de Reservas.
- BARBER ajeno recibe `404` neutro y BARBER sin vínculo obtiene listado vacío sin inferir recursos.
- CUSTOMER no accede a Facturación ni Analytics global.

## Migración y compatibilidad

La migración falla cerrada si encuentra Payment legacy, Invoice pagada/reembolsada o datos que no cumplan tenant, Booking completada y snapshot determinista. No inventa actor, método, fecha ni importe. Una Invoice legacy `UNPAID` solo se conserva cuando coincide exactamente con el precio válido del Service y todas las invariantes.

El contrato retira `PATCH /invoices/:id/pay`, elimina `amount` de `POST /invoices` y usa `POST /invoices/:id/payments`. El frontend actual es incompatible y no debe desplegarse contra este backend hasta una entrega frontend autorizada y coordinada.

## Alternativas descartadas

- Confiar en `amount` del navegador: permite alterar el registro financiero.
- Mantener estados Invoice/Payment independientes: admite combinaciones contradictorias.
- Crear Invoice o Payment automáticamente al completar Booking: confunde prestación, emisión y cobro.
- Usar `Invoice.createdAt` para ingresos: atribuye dinero antes del cobro real.
- Convertir datos legacy con valores por defecto: fabricaría trazabilidad financiera.
- AuditLog fail-open para emisión/cobro: permitiría una escritura financiera sin evidencia requerida.

## Consecuencias

- El modelo es más estricto y elimina estados hoy no contratados.
- La activación requiere coordinar un consumidor frontend posterior.
- Anulación, reembolso, pago parcial, comisiones y fiscalidad necesitarán decisiones y migraciones propias.
- La auditoría del checkpoint backend debe validar migración, concurrencia, IDOR, proyecciones y evidencia PostgreSQL antes de aprobarlo.
