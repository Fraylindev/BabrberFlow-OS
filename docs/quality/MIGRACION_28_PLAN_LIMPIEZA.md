# Migración 28 — plan de limpieza y dependencias vigentes

Actualización 2026-10-11 por revisión C1 M3. **SOLO PLAN; NINGÚN RETIRO O DDL AUTORIZADO.** Migración histórica: 20261003120000_customer_stage_one. El retiro de cuenta B2C no convierte todos sus objetos en prescindibles. [Cierre M3](M3_CALENDARIO_C1_CIERRE.md) y [plan previo de producción](../features/RESERVA_INVITADO_C3_CIERRE_QA.md#pendientes-ordenados-por-riesgo--sin-ejecución-autorizada).

| Objeto | Dependencia vigente | Regla para limpieza futura |
| --- | --- | --- |
| Booking_customer_revision | M3 D5: invalida expectedRevision ante todos los escritores y ABA | Conservar habilitado AFTER INSERT/UPDATE/DELETE en Booking; no eliminar por retiro B2C |
| customer_booking_revision() | Función ejecutada por el trigger; incrementa Client en cada escritura | Conservar firma, comportamiento y owner/grants mínimos existentes |
| Client.customerBookingRevision | BIGINT persistente incluido en revision M3 y fingerprint de paginación | Conservar contador, defaults, semántica y Client_customer_revision_check; no reiniciar/backfill destructivo |
| CustomerOperation, Client.customerAccessBlocked/customerHistoryAmbiguous y Client_customer_access_relink | Estructuras históricas B2C; no forman el token M3 actual | Candidatos a análisis separado, no a borrado autorizado; inventariar fuentes, grants, datos/retención, artefactos anteriores y rollback |
| Booking_customer_page_idx y demás objetos históricos | Evaluar consumidores/EXPLAIN antes de decidir | No asumir innecesarios por el nombre customer; no modificados en C1 |

**Booking_customer_revision, su función y el contador son dependencia funcional de M3 desde C1.** El plan previo que ofrecía revertir toda la migración28 como alternativa requiere esta enmienda: ya no es admisible una compensatoria que retire esos objetos mientras M3 esté activo. No borrar ni editar SQL histórico, ledger o hashes. Tampoco ampliar privilegios runtime para compensar su falta. La matriz de permisos existente y el gate runtime deben permanecer vigentes.

Antes de cualquier limpieza futura autorizada:

1. Censar esquema/ledger, trigger habilitado, función/owner/ACL y todos los lectores/escritores vigentes; confirmar artefactos API/web realmente desplegados bajo autorización específica.
2. Separar objetos exclusivos B2C de dependencias M3 y de compatibilidad/retención. Preservar Client operativo, reservas y datos financieros.
3. Si se propone reemplazar la revisión, aprobar primero un contrato/persistencia compatible para todos los escritores, transición hacia delante y rollback, sin ventana sin invalidación ni pérdida de revisiones. C1 no autoriza ese reemplazo.
4. Ensayar migración compensatoria aditiva/retirada selectiva, matriz permisos, ambas APIs anteriores y API nueva; probar rollback conservando reservas posteriores en PostgreSQL desechable. Nunca restaurar snapshot para retirar código.
5. Ejecutar la misma prueba de colisión/ABA con el mecanismo activo y su control negativo sin mecanismo: positivo exit0; negativo debe fallar por contador que no avanza. Preservar token distinto incluso cuando updatedAt coincide. Repetir carreras M3 y paginación.
6. Requerir aprobación de la limpieza y su ejecución; este documento no permite operar QA/producción ni retirar un objeto.

Control C1: el arnés m3-postgres-run.cjs extrae la definición exacta del catálogo, elimina exclusivamente Booking_customer_revision en su clúster propio, ejecuta **sin cambiar aserciones** calendar-collision.integration.spec.ts esperando exit1 por Expected2n/Received0n y restaura la definición en finally. Después repite el positivo y las suites de integridad/compatibilidad. No es una migración del producto ni un ensayo sobre una base real. Evidencia y resultados en [condiciones de revisión](M3_CALENDARIO_C1_CIERRE.md#13-revisión-aprobada-con-condiciones--2026-10-11).
