# Horario y zona del negocio — contrato C1

Fecha: 2026-09-27. **BACKEND C1 APROBADO / INTEGRADO EN PROYECTO LOCAL**. El propietario seleccionó D1–D15 A y autorizó los pasos 2 y 4 de C0. El propietario aprobó expresamente la lógica del backend C1 y pidió integrarlo en su checkout local; la integración se completó sin ampliar etapa. Esta autorización comprende los ajustes backend de A2/H5/CMS y coordinación de dependencias; frontend, QA visual y producción necesitan sus gates expresos.

**Continuación posterior:** C1 quedó confirmado en `b0357af`; el propietario autorizó después D14-A/C2. [Estado y evidencia C2](HORARIO_ZONA_C2_FRONTEND.md): implementado/en revisión local; QA frontend en producción real mantiene su gate expreso. El inventario vigente abarca Dental Ross y Prueba de oro al 19:33:52.343696Z, ambas SQL_NULL, sin dependencias en tablas existentes; cierres no aplicable, modelo C1 ausente. Las referencias inferiores al «único tenant» y a frontend todavía no autorizado describen el corte histórico de C1, no revocan esta autorización posterior. C2 no migró ni confirmó producción.

## Brief y decisiones

OWNER confirma región y semana; OWNER/ADMIN mantienen semana y cierres. RECEPTIONIST/BARBER leen reglas globales sin motivos. CUSTOMER y visitantes no acceden a configuración o impactos. Semana de siete días explícitos, domingo=0, hasta cinco franjas por día/35 totales, minutos y fin `24:00` solo como extremo final. Contiguas globales se unen; individuales conservan su separación y `shifts: []` sigue heredando. Cierres completos de fechas inclusivas o parciales de una fecha solo restan, pueden superponerse y se cancelan conservando historia. Motivo privado opcional ≤500 caracteres.

El único tenant productivo, según lectura directa comunicada por el propietario del **27-09-2026 16:02:54 UTC**, tiene SQL NULL en `businessHours`, zona `America/Santo_Domingo` y cero citas futuras/en curso. Su clasificación D4-A es **SIN CONFIRMAR / SQL_NULL**. 09:00–19:00 siete días es solamente el resultado técnico legacy y la propuesta de equivalencia. No prueba la elección del propietario ni habilita una apertura. No se han consultado ni escrito sus filas en C1. Cero citas futuras no demuestra ausencia de historia, bloqueos, promociones o intenciones; D9 las vuelve a comprobar al cambiar zona.

## Persistencia y transición

Agregado relacional `BusinessSchedule` por Organization, `BusinessScheduleDay` (siete filas), `BusinessScheduleWindow`, `BusinessClosure` y `BusinessScheduleRevision`. Organization conserva la única zona autoritativa; CMS no escribe horario/zona. Revisión entera esperada para todos los comandos, historia inmutable de revisión sin motivos privados. No hay borrado operativo de cierres.

Estados: `LEGACY_UNCONFIRMED` conserva temporalmente la lectura anterior para organizaciones existentes inventariadas; `UNCONFIRMED` corresponde a altas nuevas y no ofrece disponibilidad; `CONFIRMED` usa solo filas relacionales y falla cerrado si están corruptas. Migración idempotente conserva JSON original y distingue SQL_NULL, JSON_NULL, VALID e INVALID; no confirma ni reemplaza Organization.businessHours. La propuesta equivalente se deriva con el lector antiguo y las claves extra se informan separadamente. Solo una autoridad por tenant: activar semana confirmada retira legacy para ese tenant.

La migración conserva elegibilidad pública únicamente para un sitio ya publicado antes del cambio; no abre ni publica nada. Nueva apertura CMS requiere semana/zona confirmadas. Confirmar zona es OWNER; guardar/confirmar semana es OWNER/ADMIN después de confirmación de zona. El tenant productivo seguirá sin confirmar hasta una acción expresa del dueño y autorización de implantación.

## API privada tipada

Prefijo `/organizations/mine/schedule`; tenant/actor exclusivamente del contexto B2B. DTOs cerrados mediante ValidationPipe, sin PATCH JSON.

| Ruta | Roles | Entrada/salida |
| --- | --- | --- |
| GET raíz | personal B2B | revisión, estado, región/zona, confirmación, semana efectiva, cantidad de cierres; gestión recibe además clasificación/propuesta legacy y elegibilidad de cambio de zona |
| GET regions | personal B2B | catálogo natural admitido: Santo Domingo, Nueva York, Madrid, São Paulo, isla Lord Howe y Samoa; IDs estables de región, IANA interno validado por runtime |
| GET closures | personal B2B | paginación offset/limit (máx.100); gestión puede incluir cancelados y motivos, otros solo activos sin motivos |
| POST week/impact | OWNER/ADMIN | expectedRevision y week; conteos y página de IDs/intervalos de citas afectadas sin PII, efectos por profesional con base explícita RECURRING_WEEK o DATED_RULE_MINUTES |
| PUT week | OWNER/ADMIN | expectedRevision y siete días con windows; confirma semana de inmediato tras D6 |
| POST closures/impact | OWNER/ADMIN | expectedRevision y cierre propuesto; impacto informativo paginado |
| POST closures | OWNER/ADMIN | mismo comando; agrega cierre atómicamente |
| POST closures/:id/cancel | OWNER/ADMIN | expectedRevision; ID ajeno/inexistente 404 uniforme |
| POST zone | OWNER | expectedRevision y regionId; confirma/cambia zona bajo D9 |

Franjas `{startTime,endTime}`; días `{dayOfWeek,windows}`. Cierre `{startDate,endDate,startTime,endTime,reason?}`: rango completo `00:00–24:00`, parcial exige misma fecha. El último día admitido para fin de un cierre es 9999-12-30, porque su impacto necesita un extremo exclusivo representable. Consulta de impacto y cierres acepta offset/limit; la validación al guardar no usa esa paginación. 400 entrada inválida/tiempo ambiguo, 401 sin sesión, 403 rol no permitido, 404 recurso ajeno/inexistente, 409 revisión obsoleta/citas afectadas/zona congelada, 503 imposibilidad de evaluación. Errores seguros no incluyen motivos, clientes o detalles Prisma.

## Cálculo y tiempos

Un solo motor compartido: semana global → intersección de un turno individual completo (cero filas hereda) → resta de la unión de cierres/bloqueos → ocupación no CANCELLED. Reserva completa en una franja y un día local, intervalos `[inicio,fin)`. PENDING/CONFIRMED con `endTime > ahora` se protegen, incluidos todos los futuros y en curso; CANCELLED no bloquea, COMPLETED/NO_SHOW preservan ocupación/historia. Guardar no mueve/cancela citas, no cambia estados, cobros, promociones o correo.

Cadencia pública de 30 minutos anclada en cada apertura global antes de filtrar, deduplicada por instante. Horarios internos válidos fuera de la cuadrícula siguen permitidos. H5 conserva `minimumBookingDate`, hora local y `startTime` autoritativo y mínimo público sin zona ni tenant.

Hasta la confirmación, LEGACY_UNCONFIRMED conserva el conversor y la interpretación temporal anteriores de disponibilidad; no se endurece retroactivamente ese lector. CONFIRMED aplica D10. Conversión con Intl sin dependencia nueva: enumerar offsets cercanos y verificar todas las ocurrencias. Solo inicio inequívoco; horas inexistentes/repetidas no se desplazan. Extremos de franjas fechadas ambiguos se rechazan; una franja recurrente inválida en una fecha se omite sin anular otras. Límites de día por búsqueda de fecha local, contemplando días de 23/25/23,5/24,5 horas, medianoche desplazada y fechas omitidas. Duración en minutos reales. Nuevos timestamps de Bookings/A2 exigen Z/offset; consumidores actuales envían ISO con zona; no se reescriben históricos.

## Transacciones, permisos y amenazas

Orden: **Organization → Client → Booking → Professional → disponibilidad/outbox**. Comandos globales toman Organization y releen revisión/roles/datos; alta interna/pública, reprogramación, estados/reactivación y A2 toman Organization antes de locks existentes. CMS y promociones ya empiezan por Organization; productor/worker/preferencias de correo se incorporan antes de Client/Booking. Claim de outbox es sentencia independiente que libera su lock antes de preparar; webhook/purga nunca adquieren después Organization. Los claims de identidad también toman Organization antes de Client/Booking. No se instala serialización global entre tenants.

D9 considera cualquier Booking histórica, cualquier bloqueo A2 (también cancelado), cualquier cierre fechado, promociones con intervalos sellados/publicados (también retiradas) e intenciones de correo. Confirmar la misma zona no reconvierte nada; cambiarla con cualquiera de esas dependencias devuelve 409. Primera dependencia y cambio de zona comparten Organization.

Revisión no sustituye el lock. Preview informativo, guardado vuelve a evaluar toda cita protegida sin horizonte ni truncamiento. Fallo de cualquier lectura/cálculo revierte todo; historia del agregado es transaccional y AuditLog separado fail-open solo acción/revisión/IDs. Threat model: tenant/IDOR y escritura privilegiada mediante guards más Membership autoritativa; corrupción confirmada falla cerrada; slot obsoleto revalidado; carrera global/individual/dependencia serializada; notas omitidas de proyecciones mínimas, auditoría, errores y caché pública. Lecturas consistentes del agregado en transacción RepeatableRead.

El impacto de profesionales cuenta minutos de reglas de reloj, intersección y unión de cierres; no es pronóstico de citas libres ni duración real futura bajo cambios de reloj. Los cierres largos se cuentan por segmentos calendario sin recorrer cada fecha. CMS agrega `readOnly.operationalSchedule` como proyección derivada; los diagnósticos legacy se conservan para adaptar la superficie en C2. Facturación, Analytics, Resumen y nuevas promociones usan límites reales de día, también si la medianoche se omite. Payloads de correo e intervalos de promociones ya sellados se reutilizan, nunca se reconvierten.

## Ensayo, grants y rollback

Solo PostgreSQL desechable dedicado dentro de work, datos sintéticos, sin proveedores/correos reales. Migrar desde cero y desde baseline, repetir backfill, constraints/FKs/exclusiones, matriz runtime explícita, fallos/rollback y carreras. Restore debe cotejar agregado y Booking/Invoice/Payment/promociones/payloads; nunca volver al lector legacy con nuevas escrituras abiertas después de confirmar cierres.

Rollback seguro: cerrar las escrituras mediante mantenimiento autorizado, detener API/worker, restaurar/verificar el agregado completo y operar binario compatible. No aplanar a open/close ni borrar tablas/cierres. Este procedimiento aislado no autoriza mantenimiento productivo, cambio de interruptores de reserva/correo, despliegue, commit/push remoto ni frontend. La evidencia final se registra en `HORARIO_ZONA_C1_EVIDENCIA.md`; el backend quedó aprobado por el propietario; el siguiente avance requiere autorización expresa de frontend/QA y su gate de implantación independiente.
