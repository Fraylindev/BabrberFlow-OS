# Horario y zona del negocio — C0 auditoría y decisiones propuestas

> Actualización posterior, 2026-09-27: el propietario seleccionó D1–D15 A y autorizó C1, pasos 2/4. [Contrato](HORARIO_ZONA_C1_CONTRATO.md) y [evidencia](HORARIO_ZONA_C1_EVIDENCIA.md), lógica backend aprobada expresamente e integrada en el proyecto local, sin autorización de frontend o implantación. El texto siguiente conserva el estado y los hallazgos históricos de C0; sus elecciones pendientes no describen el estado actual. Frontend/QA e implantación mantienen gates expresos.


Fecha: 2026-09-27. Estado: **C0 DOCUMENTAL ENTREGADO / D1–D15 PENDIENTES DE ELECCIÓN DEL PROPIETARIO**. Rama `ai/antigravity-qa`; HEAD inspeccionado `f357c9bfbda44aab3d5a086907f72070871fdb22`. Este informe no aprueba C1, modifica contratos ni autoriza migraciones, editor, apertura pública o despliegue.

## 1. Encargo, frontera y evidencia

El ítem 4 del [roadmap](../quality/AUDITORIA_INTEGRAL_2026_09_24.md) requiere definir semana, cierres y zona del negocio, compatibilidad legacy, reservas futuras y disponibilidad individual. OWNER necesita establecer cuándo atiende su negocio; ADMIN necesita operar la configuración delegada; RECEPTIONIST y BARBER necesitan una agenda coherente; visitantes deben recibir únicamente horarios realmente reservables. El resultado de C0 es elegir políticas antes de diseñar el contrato y desarrollar backend. Se sigue la estructura del [C0 de base previa a producción](../quality/BASE_PREPRODUCCION_C0_AUDITORIA.md).

**Alcance ejecutado:** lectura estática de código, schema, migraciones, pruebas y documentación; elaboración de este informe y sincronización de índice, estado e historial. **No ejecutado:** consultas a bases locales/productivas, inventario de filas, peticiones a la aplicación, ensayos de concurrencia, tests, builds, QA de navegador, cambios de configuración o datos. Las pruebas citadas se inspeccionaron, no se ejecutaron de nuevo. No se conoce desde esta auditoría cuántos tenants tienen JSON válido, inválido o reservas afectadas. La evidencia operativa anterior conserva su fecha y alcance.

Las fuentes de gobierno son [PROJECT_MASTER](../../PROJECT_MASTER.md), [gates](../quality/DELIVERY_GATES.md), [seguridad](../quality/SECURITY_STANDARD.md), [DoD](../quality/DEFINITION_OF_DONE.md), [PRD](../product/PRD.md), [flujos](../product/APP_FLOWS.md), [estándar de producto](../product/PRODUCT_STANDARD.md), [estándar frontend](../product/FRONTEND_STANDARD.md) y [patrones UI](../product/UI_PATTERNS.md). Se contrastaron [arquitectura](../architecture/TRD.md), [modelo](../architecture/DATA_MODEL.md), [contratos históricos](../../BACKEND_CHANGES.md) y [CHANGELOG](../../CHANGELOG.md), dando prioridad al código y al estado posterior de PROJECT_MASTER.

Fuera de alcance: nuevas sedes/organizaciones, horarios por servicio, recursos/cabinas, sobrecupos, capacidades de `ProfessionalService`, listas de espera, pagos, cambios de identidad, activación de correo, calendarios externos y feriados automáticos. No se usa ni se propone un PATCH libre de `Organization.businessHours`; tampoco SQL manual por tenant como editor. Todos los diseños siguientes son **alternativas pendientes**, no endpoints, campos ni permisos ya existentes.

## 2. Hallazgos que condicionan las decisiones

| Área | Estado comprobado y límite | Evidencia ejecutable |
| --- | --- | --- |
| H1. Modelo global | `Organization.businessHours` es `Json?`; `timeZone` es String con default `America/Santo_Domingo`. No hay modelo global semanal, cierres, revisión o vigencia. Las altas Clerk y legacy omiten ambos valores: dependen del default de zona y del horario nulo. No significa que todas las filas reales sigan así. | [schema](../../apps/api/prisma/schema.prisma), [onboarding](../../apps/api/src/auth/clerk-onboarding.service.ts), [alta legacy](../../apps/api/src/auth/auth.service.ts). |
| H2. Interpretación legacy | `resolveBusinessHours` reconoce únicamente `open` y `close` como `HH:mm`, con apertura anterior al cierre, horas 00–23/minutos 00–59. Lo aplica todos los días. Campos adicionales no afectan el cálculo. `null`, forma inválida, semana por días, cierre anterior/igual o `24:00` caen a 09:00–19:00. No existe representación de «cerrado». | [resolver y slots](../../apps/api/src/public-booking/availability.util.ts), [pruebas del resolver](../../apps/api/src/public-booking/availability.util.spec.ts). |
| H3. Lectura y edición | La disponibilidad pública y la validación de reservas **sí leen** el JSON real. No existe ruta global de edición de horario/zona en Organizations. `/organizations/mine` proyecta id/name/slug/timeZone; CMS entrega horario/zona en `readOnly` y rechaza su edición. | [Organizations](../../apps/api/src/organizations/organizations.controller.ts), [proyección](../../apps/api/src/organizations/organization-projection.ts), [CMS](../../apps/api/src/cms/cms.service.ts), [pruebas DTO CMS](../../apps/api/src/cms/cms.dto.spec.ts). |
| H4. Semana individual | `ProfessionalWeeklySchedule`: día 0=domingo a 6=sábado, varios turnos, sin solapamiento. Cero filas hereda global; con cualquier fila, un día omitido no tiene disponibilidad. Reemplazo atómico, máximo **35 turnos totales**, no cinco por día. DTO termina en 23:59 aunque el check SQL permite `endMinute=1440`. No hay modo explícito «toda la semana no disponible»: enviar lista vacía restablece herencia. | [servicio](../../apps/api/src/professionals/professional-availability.service.ts), [DTO](../../apps/api/src/professionals/dto/professional-availability.dto.ts), [migración A2](../../apps/api/prisma/migrations/20260813193000_professional_individual_availability_a2/migration.sql). |
| H5. Bloqueos individuales | Rangos de instantes con zona explícita, `ACTIVE/CANCELLED`, nota interna de hasta 500 caracteres. Pueden cruzar días; un bloqueo activo debe terminar en el futuro. Consultas por defecto de 90 días/máximo 366: ese límite de lectura **no** limita la búsqueda de reservas futuras al cambiar turnos. No equivalen a un cierre global y copiarlos a cada profesional deja fuera altas posteriores. | [DTO y servicio A2](../../apps/api/src/professionals/professional-availability.service.ts), [FK compuesta tenant](../../apps/api/prisma/migrations/20260813200000_professional_availability_tenant_fk/migration.sql). |
| H6. Cálculo efectivo | Reserva completa dentro de una franja global y, si existe, de una franja individual; mismo día local; se restan bloqueos activos y reservas no canceladas. Los límites son intervalos `[inicio, fin)`: se permite terminar al cierre y empezar donde otro intervalo termina. Actualmente no atraviesa descansos ni medianoche. | [utilidades individuales](../../apps/api/src/professionals/professional-availability.util.ts), [servicio A2](../../apps/api/src/professionals/professional-availability.service.ts), [Bookings](../../apps/api/src/bookings/bookings.service.ts). |
| H7. Slots públicos | Paso fijo 30 minutos desde la apertura global, duración completa del servicio, solo instantes posteriores al reloj servidor. «Cualquiera» elige el primer profesional elegible entre los activos/públicos ordenados por nombre. Se devuelve hora local y `startTime` autoritativo; no zona ni motivos privados. Un slot leído no es una retención. Las escrituras revalidan disponibilidad. La validación de Booking no exige alinearse al paso público. | [PublicBookingService](../../apps/api/src/public-booking/public-booking.service.ts), [correctivo H5](RESERVA_PUBLICA_H5_FECHAS.md). |
| H8. Reservas protegidas | Cambio de semana/bloqueo individual rechaza con 409 si invalida `PENDING/CONFIRMED` con **startTime > ahora**, sin horizonte de 90/366 días. No incluye una cita ya iniciada que aún no termina. En cambio, ocupación y exclusión SQL incluyen **todo estado distinto de CANCELLED**, también COMPLETED/NO_SHOW. No confundir protección del cambio con ocupación. | [assertFutureBookingsRemainAvailable / assertBlockDoesNotAffectFutureBookings](../../apps/api/src/professionals/professional-availability.service.ts), [exclusión Booking](../../apps/api/prisma/migrations/20260811180000_booking_schedule_exclusion/migration.sql). |
| H9. Concurrencia existente | Crear, reprogramar, reactivar una cancelada futura y mutar disponibilidad comparten lock tenant-scoped de Professional. Alta pública además bloquea Organization para coordinar retiro CMS; alta interna/reprogramación no comparten hoy ese lock global. Notificaciones añade locks Client/Booking. El lock individual y la exclusión de reservas no protegen por sí solos un cambio global futuro. | [lock común](../../apps/api/src/common/professional-booking-lock.ts), [Bookings](../../apps/api/src/bookings/bookings.service.ts), [alta pública](../../apps/api/src/public-booking/public-booking.service.ts), [productor de correo](../../apps/api/src/notifications/notification-producer.ts). |
| H10. Zona y cambios de reloj | Backend usa `Intl` y conversión iterativa con comprobación de ida/vuelta. El conversor devuelve un único instante o null; no enumera dos ocurrencias de una hora repetida. El día público exige convertir ambas medianoches; si no puede, devuelve fecha inválida. Las pruebas leídas cubren Santo Domingo, Nueva York en verano y fechas imposibles, no una política completa de horas repetidas/inexistentes o medianoche irregular. | [utilidad y pruebas](../../apps/api/src/professionals/professional-availability.util.spec.ts), [getUtcRangeForLocalDate](../../apps/api/src/professionals/professional-availability.service.ts). |
| H11. Agenda interna | `bookings/page.tsx` formatea sin `timeZone`, construye límites con `new Date(year, month, day, …)` y usa `DateTimePicker` basado en hora del navegador (pasos de 15 minutos). Esto puede diferir del negocio. La disponibilidad individual sí convierte usando la zona recibida; el público H5 reenvía el instante del API. DTOs de Booking validan fecha ISO pero no incorporan la exigencia explícita de sufijo usada por los bloqueos A2. | [agenda](../../apps/web/app/dashboard/bookings/page.tsx), [DateTimePicker](../../apps/web/components/ui/DateTimePicker.tsx), [modal A2](../../apps/web/app/dashboard/professionals/ProfessionalAvailabilityModal.tsx), [DTO interno](../../apps/api/src/bookings/dto/create-booking.dto.ts), [reprogramación](../../apps/api/src/bookings/dto/reschedule-booking.dto.ts), [DTO público](../../apps/api/src/public-booking/dto/create-public-booking.dto.ts). |
| H12. Consumidores adicionales | Facturación filtra días usando zona actual; Analytics/Resumen calculan límites diarios/mensuales con ella. Worker consulta zona actual al sellar primer payload, luego reutiliza el payload sellado. Promociones convierten fechas locales a límites absolutos y conservan zona al publicar. Cambiar solo Organization.timeZone puede cambiar agrupación histórica y producir divergencias entre elementos ya sellados y nuevos. | [Invoices](../../apps/api/src/invoices/invoices.service.ts), [Analytics](../../apps/api/src/analytics/analytics.service.ts), [Resumen](../../apps/api/src/analytics/dashboard-summary.service.ts), [worker](../../apps/api/src/notifications/email-worker.ts), [promociones](../../apps/api/src/media/media-promotions.service.ts), [intervalos](../../apps/api/src/media/media-policy.ts). |
| H13. Permisos y privacidad | OWNER/ADMIN gestionan disponibilidad por ID; BARBER solo `/me` por identidad/tenant autenticados. RECEPTIONIST no tiene GET de disponibilidad A2 ni mutaciones; su acceso a directorio/agenda no concede notas de bloqueos. Público recibe solo slots y proyección mínima. La auditoría individual guarda acción/IDs, nunca nota. | [controller Profesionales](../../apps/api/src/professionals/professionals.controller.ts), [servicio A2](../../apps/api/src/professionals/professional-availability.service.ts). |

### Discrepancias documentales y evidencia de pruebas

- El encabezado de `availability.util.ts` dice que ningún endpoint lee el JSON; H3 demuestra que quedó obsoleto. Este informe corrige esa interpretación; el comentario fuente queda intacto por el límite documental del encargo.
- CMS muestra «No hay un horario global confirmado para mostrar» ante JSON inválido/nulo ([cmsHours](../../apps/web/lib/cms-ui.ts)), mientras el motor aplica 09:00–19:00. Son dos comportamientos reales diferentes; ausencia de texto **no significa negocio cerrado**.
- La frase histórica «RECEPTIONIST conserva solo lectura» en BACKEND_CHANGES no concede lectura de los bloqueos A2: los decoradores actuales permiten OWNER/ADMIN o BARBER propio. No se modifica ese contrato histórico; H13 precisa el alcance observado para este C0.
- La regla general de UI «hora del negocio» no se cumple íntegramente en la agenda interna H11. Es un hallazgo estático, sin reproducirlo en navegador ni presentarlo como corrección realizada.
- Hay pruebas unitarias de resolver/intersección, privacidad, tenant y 409; [integración de concurrencia](../../apps/api/src/bookings/booking-concurrency.integration.spec.ts) enfrenta semana contra creación, bloqueo contra reprogramación/reactivación y prueba FK tenant. [CMS E2E](../../apps/api/test/cms.e2e-spec.ts) conserva semántica de `null`, JSON malformado y horario válido al publicar. No prueban semana/cierre global ni cambio de zona, capacidades inexistentes hoy.
- TRD y otros párrafos históricos aún describen estados previos a Supabase/despliegue. Para entorno manda el encabezado vigente de PROJECT_MASTER; este C0 no vuelve a certificar infraestructura ni amplía su saneamiento documental.

## 3. Decisiones pendientes para el propietario

Cada letra es alternativa **no seleccionada**. Las recomendaciones no son autorización. D1–D15 pueden responderse por número/letra; sus límites propuestos se incluyen en la elección. Si se cambia una recomendación, resolver sus dependencias antes de C1. Ninguna alternativa admite PATCH libre del JSON legacy.

### D1 — Fuente de verdad y persistencia del horario

| Opción | Diseño | Trade-off |
| --- | --- | --- |
| **A. Agregado operativo tipado y relacional** | Semana, cierres y revisión propios del tenant, separados del CMS; zona autoritativa conservada en Organization. Comandos limitados, validación de dominio y constraints donde correspondan. Legacy solo como entrada de adaptación durante transición. | Mejor integridad y consulta de impactos; requiere migración, grants mínimos, compatibilidad y rollback ensayados. |
| **B. Documento nuevo, estricto y versionado** | Persistir un documento separado con esquema cerrado y reemplazo atómico validado; nunca aceptar propiedades arbitrarias ni reutilizar el JSON actual como editor. | Menos tablas; más invariantes y consultas dependen del servicio y de validar cada versión. |

**Recomendación: A.** Se ajusta a las garantías ya usadas por disponibilidad individual. C1 fijaría nombres y contratos exactos; aquí no se inventan rutas. No mantener dos autoridades escribibles ni permitir editar horario por el CMS editorial.

### D2 — Semana, descansos y medianoche

| Opción | Política | Trade-off |
| --- | --- | --- |
| **A. Siete días explícitos y múltiples franjas diurnas** | Cada día cerrado o con hasta cinco franjas (35 globales como máximo propuesto), precisión de minuto, sin solapamiento; normalizar franjas contiguas. Permitir final «medianoche» del mismo día, sin reserva que cruce al siguiente. | Cubre jornadas partidas; requiere distinguir fin de día de inicio del siguiente y comprobar todo el servicio dentro de una franja. |
| **B. Una franja por día** | Cierre semanal explícito; un solo inicio/fin. | Editor simple, no cubre pausa de almuerzo sin sumar excepciones artificiales. |
| **C. Turnos nocturnos que cruzan día** | Día de inicio y cierre en el siguiente, incluyendo reservas que crucen medianoche. | Útil para operación nocturna; amplía cálculo, cierres, filtros, pruebas y contratos individuales. |

**Recomendación: A.** Semana explícita vacía de franjas significa negocio cerrado, nunca default. Medianoche sería 1440 interno, mostrada con lenguaje natural. La elección incluye diseñar compatibilidad del fin de día individual: su DB ya admite 1440 pero DTO/UI no; C1 debe proponer y aprobar ese ajuste aditivo antes de habilitarlo. No convertir 23:59 en «medianoche» ni cambiar el significado de `shifts: []` profesional. La apertura 22:00–02:00 queda rechazada en A; una capacidad nocturna requiere C.

### D3 — Cierres y excepciones por fecha

| Opción | Política | Trade-off |
| --- | --- | --- |
| **A. Cierres completos o parciales que solo restan** | Fecha local o rango de fechas inclusivas para días completos; cierres parciales por fecha y franja. Aplican a todos los profesionales, incluidos los creados después. Sin apertura excepcional ni repetición anual automática. | Cubre vacaciones, feriados elegidos y salidas anticipadas; no permite abrir excepcionalmente un día semanal cerrado. |
| **B. Reemplazo de la jornada por fecha** | La excepción sustituye las franjas semanales de esa fecha, pudiendo abrir o cerrar. | Más flexible; exige precedencia explícita y evaluar ampliaciones inesperadas para profesionales que heredan. |
| **C. Solo días completos inicialmente** | Sin cierre parcial ni apertura excepcional. | Menor alcance; cierres de unas horas requieren bloquear más agenda o esperar otra entrega. |

**Recomendación: A.** Semana → intersección individual → resta de cierres/bloqueos → resta de reservas. Intervalos solapados se descuentan por su unión; cancelar un cierre no anula otro superpuesto. Estado cancelable con historial, sin hard-delete operativo. Motivo opcional privado, máximo propuesto 500 caracteres, visible solo a gestión; el público solo ve falta de horarios. No copiar cierres como N bloqueos individuales, ni usar retiro CMS como cierre temporal del negocio.

### D4 — Compatibilidad legacy y alta de negocios

| Opción | Política | Trade-off |
| --- | --- | --- |
| **A. Adaptación fiel y confirmación explícita** | Clasificar el legado antes del cambio; conservar temporalmente su resultado efectivo. Proponer semana equivalente y pedir confirmación antes de activar el nuevo modelo y antes de abrir reserva pública de un negocio no confirmado. Altas nuevas quedan sin horario confirmado hasta configurarlo. | Evita atribuir al dueño un default automático; exige transición y criterio de activación por tenant. |
| **B. Migración automática de toda semántica actual** | `open/close` válidos se repiten siete días; cualquier otro valor se materializa como 09:00–19:00 todos los días y se considera operativo. | Conserva slots de inmediato, pero convierte una suposición técnica en horario declarado. |
| **C. Cierre preventivo de todo legado no confirmado** | El nuevo motor no admite reservas nuevas hasta que cada dueño configure la semana. | Menor riesgo de ofrecer horas incorrectas, mayor interrupción incluso donde el legado era válido. |

**Recomendación: A**, con estas reglas de conversión propuestas:

| Entrada encontrada en inventario futuro | Tratamiento propuesto |
| --- | --- |
| Objeto con `open/close` válidos | Previsualizar exactamente esa franja siete días. No inferir domingo cerrado ni pausas. Registrar por separado claves adicionales ignoradas por el lector. |
| SQL NULL / JSON null / campo ausente | Marcar «horario sin confirmar»; explicar el fallback efectivo actual. No etiquetarlo como horario elegido por el propietario. |
| Forma semanal desconocida, valores inválidos, invertidos/iguales o `24:00` | Clasificar para revisión; conservar el original en respaldo de migración. No reinterpretar intenciones que el motor actual no entiende. |
| Nuevo modelo confirmado y corrupto/incompleto | Fallar de forma controlada y bloquear nuevas reservas; nunca volver silenciosamente al default legacy. Una semana válida totalmente cerrada no es corrupción. |

Durante compatibilidad, tenants existentes aún no convertidos conservan lectura legacy identificada como tal hasta su transición explícita; negocios nuevos y apertura pública nueva exigen confirmación. Si ya hubiera tenants abiertos, inventariarlos y acordar ventana antes del corte, sin asumir su existencia desde este C0. La confirmación debe pasar D6; no alterar reservas para hacer encajar la conversión. Migración idempotente, cotejo de slots/filas y respaldo restaurable; después de activar una semana con cierres no es seguro volver a un binario que solo entiende `open/close`: rollback debe cerrar nuevas escrituras y preservar/restaurar el agregado completo, nunca aplanarlo perdiendo restricciones.

### D5 — Relación con disponibilidad individual

| Opción | Política | Trade-off |
| --- | --- | --- |
| **A. Preservar herencia e intersección** | Cero filas individuales sigue heredando global; horario personalizado conserva sus filas y se intersecta. Los cierres globales prevalecen siempre. No borrar ni recortar turnos individuales al reducir horario global. | Compatible con A2 y reversible; ampliar global puede ampliar inmediatamente la disponibilidad de quienes heredan o tienen franjas antes recortadas. |
| **B. Exigir horarios individuales contenidos en el global** | Rechazar cambio global o pedir ajustes de profesionales aunque no existan reservas afectadas. | Evita turnos sin efecto, pero acopla mantenimiento de dos agendas y puede exigir muchos cambios. |
| **C. Añadir modos individuales explícitos** | Heredar, personalizado y no disponible como estados distintos. | Resuelve «sin disponibilidad toda la semana»; implica contrato/migración A2 más amplio. |

**Recomendación: A.** Mostrar en el impacto qué profesionales ganan/pierden horas efectivas, sin convertirlo en cambios de sus filas. Los turnos adyacentes individuales deben conservar su semántica actual salvo ajuste expresamente contratado; no ampliar automáticamente las reservas que hoy no caben en un único turno. Una ausencia temporal total usa bloqueos existentes. C se reserva para otra ampliación, evitando que una lista vacía pase de heredar a cerrar por accidente.

### D6 — Reservas afectadas y citas en curso

| Opción | Política | Trade-off |
| --- | --- | --- |
| **A. Rechazo atómico y resolución previa** | Si semana/cierre deja fuera alguna `PENDING/CONFIRMED` con **endTime > ahora**, rechazar todo el cambio. Incluye citas en curso y todas las fechas futuras, sin recortar al horizonte visible del editor. Resolver reservas con sus flujos/permisos actuales y volver a validar. | Conserva compromisos sin excepciones ocultas; puede impedir un cierre urgente hasta gestionar las citas afectadas. |
| **B. Excepciones para reservas existentes** | Aplicar el nuevo horario, conservar citas incompatibles como excepciones identificadas, prohibiendo nuevas en ese intervalo. | Facilita cambios; necesita modelo, interfaz y política de reprogramación/confirmación de excepciones. |
| **C. Aplicación futura hasta evitar conflictos** | Posponer vigencia al día elegido donde el impacto sea aceptable, sin mover citas. | Útil en cambios planificados; depende de versionado temporal D7-B y no resuelve cierres urgentes por sí solo. |

**Recomendación: A.** Ampliar de `startTime > ahora` a `endTime > ahora` es una **decisión propuesta**, no la garantía vigente. Aplicarla coherentemente a cambios globales e individuales si se aprueba, usando un único instante de evaluación dentro de la operación. El impacto mostrará conteos y acceso al flujo autorizado de reservas, sin devolver PII innecesaria. CANCELLED no bloquea el cambio; COMPLETED/NO_SHOW conservan historia y su ocupación vigente, sin reclasificarlos. No cancelar, mover, cambiar profesional/estado ni enviar correos automáticamente al guardar horario. Reactivar/reprogramar vuelve a validar las reglas vigentes.

### D7 — Momento de aplicación

| Opción | Política | Trade-off |
| --- | --- | --- |
| **A. Semana vigente al guardar; cierres fechados** | Un horario global operativo, aplicación inmediata tras validación; los cierres ya llevan sus fechas. Historial de revisiones para auditoría, sin reescribir Booking pasada. | Menor complejidad; no permite programar una semana distinta desde el mes próximo. |
| **B. Semanas con vigencia por fecha** | Mantener versiones con intervalos efectivos, seleccionando la de cada fecha solicitada y validando todas las reservas alcanzadas. | Planificación completa; mayor complejidad de edición, reservas futuras y rollback. |

**Recomendación: A** para primera entrega, manteniendo D6-A. El guardado no actúa retroactivamente sobre registros ni promete reconstruir disponibilidad histórica a partir de la semana nueva. Un cierre completo del día actual con cita en curso debe ser rechazado según D6; para cerrar desde una hora posterior se usa cierre parcial. Si se elige D6-C, también se necesita D7-B.

### D8 — Selección de zona y cobertura inicial

| Opción | Política | Trade-off |
| --- | --- | --- |
| **A. Catálogo de regiones respaldado por zonas IANA válidas** | Selección explícita por ciudad/región con etiquetas naturales; validar contra catálogo admitido y runtime servidor. No inferir desde navegador, teléfono ni dirección. | Atiende distintos territorios; cada zona ofrecida exige cálculo y QA de sus transiciones, incluidos días irregulares. |
| **B. Solo Santo Domingo inicialmente** | Confirmar la zona vigente sin habilitar selección de otras. | Reduce casos temporales; limita el ítem y no habilita negocios de otras zonas. |

**Recomendación: A**, con catálogo permitido documentado y probado en C1, no una entrada libre de texto. Mostrar «Hora del negocio» y nombre natural de región; IANA/UTC/offsets permanecen técnicos. La zona por defecto es sugerencia a confirmar, no evidencia de ubicación. No ofrecer una zona cuyo inicio de día no pueda calcular correctamente el motor. D10 y D14 son gates de esta opción.

### D9 — Cambio de zona después de operar

| Opción | Política | Trade-off |
| --- | --- | --- |
| **A. Configurar antes de compromisos; congelar después** | OWNER puede cambiar zona solo mientras no exista historial de reservas, bloqueos individuales, cierres globales fechados, promociones publicadas/intervalos sellados ni intenciones de correo. Con dependencias, exigir una auditoría/migración separada. | Primera entrega predecible; una corrección posterior real necesita procedimiento dedicado aunque ya no haya citas futuras. |
| **B. Conservar instantes absolutos al cambiar** | No mover Booking/bloqueos; cambia su lectura local. Evaluar impacto, historia, reportes, promociones y correos, con coordinación operativa. | Evita desplazar instantes, pero puede alterar lo que cliente y profesional entendían por «10:00», y los límites históricos de reportes. |
| **C. Conservar fecha/hora local** | Recalcular instantes futuros manteniendo la hora del reloj prometida; tratar por separado historia, bloqueos, promociones y comunicaciones. | Puede mover citas reales y crear colisiones/horas imposibles; equivale a migración de compromisos, no a editar un campo. |

**Recomendación: A.** Semana recurrente sin dependencias puede conservar sus horas locales al elegir la zona inicial. La comprobación de elegibilidad debe ser transaccional y considerar creación concurrente de dependencias, no solo contar reservas futuras. Ninguna alternativa mueve historia financiera o payloads enviados; B/C requieren diseño adicional explícito antes de implementarse. A no soluciona por sí sola cambios futuros de las reglas de la zona en el runtime: actualizar esas reglas exige comparar instantes y horarios próximos, detectar desviaciones y conservar compromisos sin reconvertirlos silenciosamente.

### D10 — Horas inexistentes/repetidas y duración del servicio

| Opción | Política | Trade-off |
| --- | --- | --- |
| **A. Resolver solo instantes inequívocos** | Horas locales inexistentes o con dos ocurrencias no se ofrecen como inicio ni se desplazan automáticamente. Entradas manuales ambiguas se rechazan con explicación; duración siempre en minutos reales transcurridos. Calcular límites del día y continuidad del intervalo completo. | Comportamiento claro y conservador, pero pierde algunas oportunidades en el cambio de reloj. |
| **B. Desambiguación explícita** | Ofrecer ambas ocurrencias con etiquetas comprensibles y conservar el instante elegido; horas inexistentes siguen rechazadas. | Más disponibilidad, mayor carga UX y QA. |

**Recomendación: A.** No basta comparar dos horas de reloj ni verificar ida/vuelta: se necesita detectar multiplicidad. Ante límites de una franja ambiguos, rechazar esa excepción manual o no ofrecer la franja afectada y avisar a gestión; no invalidar indiscriminadamente las demás franjas válidas del día. El día local se resuelve con reglas de zona, no sumando siempre 24 horas. Slots, entradas internas y bloqueos deben compartir política; la implementación exacta se elige en C1 sin instalar dependencias en C0. TC39 explica por qué una hora puede repetirse o no existir y por qué hay que escoger una política de conversión ([fuente primaria](https://tc39.es/proposal-temporal/docs/timezone.html)); no se prescribe usar Temporal ni se afirma que esté disponible en este runtime.

### D11 — Cadencia pública y coherencia de entradas

| Opción | Política | Trade-off |
| --- | --- | --- |
| **A. Conservar paso público de 30 minutos** | Generar desde apertura de cada franja global; después filtrar por intersección/cierres/reservas, sin reiniciar la cuadrícula al terminar un bloqueo. Deduplicar instantes. Mantener precisión de minuto en reglas y los horarios internos válidos fuera de esa cuadrícula. | Conserva legado; un profesional que entra 09:15 bajo global 09:00 no obtiene automáticamente un slot 09:15. |
| **B. Paso configurable común de 15/30/60 minutos** | Parámetro operativo validado y política de anclaje común para nuevas reservas. | Más flexible; amplía alcance y puede cambiar slots/preferencias históricas, sin deber invalidar citas existentes. |

**Recomendación: A.** La cuadrícula es presentación pública, no duración del servicio ni capacidad de agenda. No añadir un horizonte máximo/antelación nueva por inferencia: el código actual usa «futuro» y no define esas políticas globales. Para todos los timestamps de nuevas escrituras, proponer exigencia de instante inequívoco con `Z`/offset como en A2; identificar consumidores actuales antes de endurecer DTOs. No reinterpretar timestamps legacy sin zona ni corregirlos masivamente. Esto necesita contrato C1 explícito y regresión H5.

### D12 — Permisos, lectura y motivos privados

| Opción | Política | Trade-off |
| --- | --- | --- |
| **A. Gestión delegada limitada** | OWNER/ADMIN editan semana/cierres y consultan impacto; solo OWNER confirma/cambia zona bajo D9. RECEPTIONIST/BARBER consultan reglas globales efectivas sin notas; BARBER conserva A2 propio. | Operación cotidiana delegada y zona restringida; requiere proyección de lectura separada de gestión. |
| **B. Todo cambio global solo OWNER** | ADMIN y otros roles permitidos leen versión mínima. | Menos delegación, mayor dependencia del dueño para un cierre urgente. |
| **C. Delegar también cierres a RECEPTIONIST** | Solo cierres fechados, sin semana/zona ni disponibilidad ajena. | Agiliza recepción; amplía privilegio de bloquear a todo el negocio. |

**Recomendación: A.** El permiso nuevo de lectura global no concede lectura de bloqueos o notas de profesionales. Visitantes/CUSTOMER no leen configuración privada ni lista de conflictos; reciben solo disponibilidad y, si D14 lo aprueba, horario público mínimo. Todos los IDs/lecturas/escrituras deben quedar tenant-scoped; tenant y actor derivados del contexto. Notas privadas fuera de AuditLog, errores, métricas y cachés públicas. Auditoría con acción/revisión/IDs, siguiendo fail-open vigente sin confundirla con almacenamiento de versión del agregado.

### D13 — Concurrencia, revisión y evaluación de impacto

| Opción | Diseño | Trade-off |
| --- | --- | --- |
| **A. Coordinación por organización + revisión esperada** | Escrituras que afectan agenda/configuración comparten un punto de coordinación por tenant, con orden único antes de locks existentes de Client/Booking/Professional; revalidación autoritativa en la misma transacción. Revisión esperada evita sobrescribir otro editor. Impacto previo es informativo; al guardar se vuelve a calcular. | Sencillo de razonar; serializa más escrituras de un mismo negocio y requiere revisar todos los caminos y su carga. |
| **B. Transacciones SERIALIZABLE con reintentos acotados** | Lecturas/escrituras de configuración y agenda participan en el protocolo y manejan abortos, sin depender solo de un preview. | Mayor concurrencia potencial; exige demostrar predicados, reintentos, idempotencia y cobertura de todos los caminos. |

**Recomendación: A**, sujeto a ensayo de carga y carreras. Una revisión optimista por sí sola no impide reservar mientras otro cierra. La exclusión SQL actual solo evita reservas solapadas, no horario inválido. No basta agregar lock global al nuevo editor: alta interna, pública, reprogramación, reactivación, A2 y creación de dependencias de D9 deben coordinarse; revisar CMS, promociones y productor/worker para no invertir locks existentes. PostgreSQL recomienda orden consistente para evitar interbloqueos ([documentación oficial](https://www.postgresql.org/docs/current/explicit-locking.html)). La lista de locks y sus efectos se fijará en C1, no se presupone implementada.

Una lectura pública puede quedar obsoleta; guardar debe rechazar el slot ya no elegible de manera segura y permitir elegir otro. El preview de impacto debe ser paginado y sin truncar la validación real; una falla al evaluar cualquier parte impide guardar, sin cambios parciales. Para D6-A probar también ampliaciones: no deben introducir colisiones, revivir bloqueos ni alterar estados.

### D14 — Editor y superficies consumidoras

| Opción | Alcance posterior al backend aprobado | Trade-off |
| --- | --- | --- |
| **A. Editor operativo y coherencia de consumidores** | Sección «Horario y zona» en Configuración, independiente de publicación CMS; semana/cierres/zona/impacto en el mismo contexto. Corregir entrada, filtro y presentación de agenda interna para hora del negocio; adaptar lectura CMS y regresiones A2/H5/reportes/correo/promociones. | Cierra el riesgo transversal; más trabajo que un formulario de configuración. |
| **B. Editor y motor solamente** | Posponer consumidores internos a otro correctivo y restringir activación a contextos cuya coherencia temporal esté probada. | Entrega menor, pero deja H11 y no permite declarar resuelto el ítem para otras zonas. |

**Recomendación: A.** Guardar horario operativo debe afectar disponibilidad sin publicar contenido editorial; no copiarlo a un snapshot CMS que pueda quedar desactualizado. Conservar público H5 sin exponer zona técnica, UUID tenant ni motivos. La primera entrega no necesita añadir un cartel nuevo de semana en el mini-sitio; si se desea, requerirá proyección pública derivada de la misma fuente, nunca horario escrito a mano. No cambiar plantillas, estados de correo ni promocionar automáticamente contenidos al guardar.

Flujo propuesto: leer reglas y estado de confirmación → editar → revisar consecuencia → guardar → ver resultado vigente. Cubrir carga, sin confirmar, semana cerrada, sin excepciones, error/reintento, pending, éxito, conflicto de revisión y conflicto por reservas. Mensajes como «Este cambio afectaría citas que ya tienes. Revísalas antes de guardar» y «El horario cambió mientras lo editabas. Actualiza para continuar». Conservar edición ante fallo recuperable; desmontarla al cambiar usuario/tenant/rol y descartar respuestas tardías, incluido A → B → A. Semana en tarjetas accesibles móvil/escritorio, labels/foco/teclado, sin esconder acciones ni exponer IANA/UTC. Estas son condiciones de aceptación propuestas, no QA realizado.

### D15 — Implantación y gate de apertura

| Opción | Estrategia | Trade-off |
| --- | --- | --- |
| **A. Transición por tenant con gate de confirmación** | Inventario y ensayo aislado; activar modelo confirmado por negocio, comparar disponibilidad antes/después y conservar diagnóstico de compatibilidad hasta retirar el lector antiguo con autorización. | Facilita detener un caso inválido sin cambiar todos los negocios; añade temporalmente dos rutas de lectura controladas y una sola autoridad por tenant. |
| **B. Corte conjunto en mantenimiento** | Confirmar/migrar todos los negocios antes de admitir nuevas escrituras con el motor nuevo. | Menos coexistencia, mayor riesgo de interrupción y coordinación. |

**Recomendación: A**, dependiente de D4-A. No supone una feature flag existente ni autoriza crearla ahora. Cerrar antes de ofrecer reserva pública a negocios con horarios distintos: confirmación de semana/zona, cero conflictos sin resolver, conversión y consumidores verificados, backend aprobado, editor con QA real y aprobación final del propietario. La reserva pública y EMAIL conservan sus interruptores actuales; aprobar este C0 no los activa. Una transición solo se considera final tras retirar ambigüedades del legacy con evidencia; no eternizar el fallback como configuración normal.

## 4. Secuencia y salida exigible de C1 futuro

1. **Elección y brief:** propietario selecciona D1–D15, ajusta límites y autoriza explícitamente C1. Recomendación conjunta: A en todas, entendiendo que D2 incluye fin de día y D6 amplía protección a citas en curso. Ninguna está seleccionada por defecto. Si elige vigencias, reapertura excepcional o cambio de zona con compromisos, revisar dependencias antes del contrato.
2. **Contrato y arquitectura:** definir comandos tipados, proyecciones, revisiones, normalización, precedencia, errores, transición/rollback, matriz de roles y orden de locks. Threat model: IDOR, escritura privilegiada, JSON desconocido, validación incompleta del impacto, slot obsoleto, carrera global/individual, fuga de notas y cambio de zona con efectos pendientes. Mantener el comportamiento seguro de H5 y CMS.
3. **Inventario autorizado separado:** antes de tocar una base real, identificar destino/backup y clasificar JSON sin copiar PII al informe; contar por categoría, validar zonas, dependencias temporales y citas afectadas de todos los profesionales/estados pertinentes. No deducir del alta reciente ni de una prueba con JSON null el estado de una base entera. Preparar migración idempotente y grants por operación, ensayo de restore/rollback y cotejo de citas, factura/pago y proyecciones temporales.
4. **Backend aislado:** implementar solo contrato aprobado; compartir cálculo entre disponibilidad, escrituras y evaluación de impacto. Ensayar PostgreSQL real con fallos y carreras. Ejecutar tipos, lint, unitarias, build, Prisma/migraciones/integridad/grants aplicables con exit 0. No usar base habitual/productiva como fixture. Documentar resultados reales y contrato en la etapa autorizada.
5. **Aprobación backend:** entregar evidencia y detener el avance de etapa hasta aprobación expresa. C1 implementado/commit/push no autoriza C2.
6. **Frontend y QA posterior:** editor y consumidores de D14 con backend aprobado; escritorio y 375 px, roles, dos tenants, navegador en otra zona, estados, teclado, consola y aislamiento de caché. Aprobación final independiente de tests/builds. Implantación real/activación requieren autorización propia y el gate D15.

### Matriz mínima de aceptación futura

| Eje | Evidencia exigible antes de declarar candidato |
| --- | --- |
| Semana/cierres | Siete días, cerrado total, varias franjas, descanso, contigüidad, límites exactos, fin de día, fecha inválida, bisiesto, cierre parcial/completo/multidía y superposición/cancelación de cierres. Nunca un slot que atraviese una pausa o cierre. |
| Legado | SQL NULL/JSON null, objeto válido, inválido, claves extra, semana desconocida, apertura igual/invertida/24:00; equivalencia de slots del lector anterior durante transición. Modelo confirmado corrupto no vuelve a default. Segunda ejecución de migración no altera resultado ni confirmación. |
| Reservas | PENDING/CONFIRMED futuras y en curso, CANCELLED/reactivación, NO_SHOW/COMPLETED preservadas; servicio cuya duración supera franja; conflictos fuera de 366 días y de la página visible. Guardado fallido deja todas las filas/revisión intactas. |
| Profesionales | Herencia, turno personalizado, día omitido, día sin turnos, alta posterior a cierre global, ampliación que aumenta disponibilidad, profesional inactivo/archivado/privado, «cualquiera», BARBER propio y tenant ajeno. No alterar filas A2 al cambiar global. |
| Zona | Selección/confirmación; navegador y servidor en zonas distintas; horas repetidas/inexistentes, transición no necesariamente de una hora, medianoche irregular, día inexistente y límites calendario. Conservar instantes existentes y rechazar cambio de zona con dependencias según D9-A. |
| Concurrencia | Dos editores; cierre o semana contra alta interna/pública, reprogramación, reactivación y cambio individual; zona inicial contra primera reserva/bloqueo/promoción/intención; CMS retiro/publicación y correo bajo orden compatible. Repeticiones/fallas no dejan escrituras parciales ni duplican efectos. |
| Consumidores | H5 conserva `minimumBookingDate`, hora visible y `startTime`; agenda interna crea/filtra/muestra en hora del negocio; Facturación/Analytics/Resumen conservan criterios de fechas; promoción publicada y payload sellado no se reescriben por guardar horario. |
| Seguridad/UX | Matriz OWNER/ADMIN/RECEPTIONIST/BARBER/CUSTOMER, tenant A/B, mismas respuestas seguras para ajeno/inexistente, cero motivos privados públicos/logs, revisión obsoleta recuperable, cambio A → B → A y salida con petición pendiente, teclado/lector/móvil. |
| Operación/rollback | Restore cotejado y rollback que no pierda cierres ni citas nuevas; runtime con grants mínimos; decisión explícita del destino y del corte. No activar público/correo por migración o publicación CMS. |

## 5. Fuentes verificadas y cierre documental de C0

Las rutas de §2 prueban el comportamiento auditado y remiten a las pruebas existentes. Las dos referencias externas, verificadas el 2026-09-27, fundamentan únicamente ambigüedad temporal y orden de locks: [TC39, zonas y ambigüedad](https://tc39.es/proposal-temporal/docs/timezone.html) y [PostgreSQL, explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html). No acreditan el comportamiento de una base real ni autorizan dependencias nuevas.

Validación de esta entrega: rama y HEAD comprobados, árbol inicialmente limpio, lectura del código y pruebas citadas, enlaces locales y diff documental revisados. `rg` no pudo arrancar en Windows; la búsqueda continuó con `git grep` y PowerShell. No se presentan búsquedas sin coincidencias como tests aprobados. No se ejecutaron builds, suites o QA funcional porque no cambió código; el [gate documental](../quality/DELIVERY_GATES.md) exige enlaces, estados y diff.

| Comprobación ejecutada | Resultado real |
| --- | --- |
| `git branch --show-current`, `git rev-parse HEAD`, `git status --short` inicial | Exit 0; rama/HEAD del encabezado y árbol limpio. |
| Verificador PowerShell de enlaces de los cuatro documentos | Exit 0; 217 enlaces locales existentes, cero rotos. Revisión semántica contra fuentes citadas, sin dar aprobación a etapas futuras. |
| Verificador de estructura del informe | Exit 0; D1–D15 consecutivas, 15 recomendaciones y ausencia de whitespace final. |
| `git diff --check` y revisión del diff de documentos de control | Exit 0; solo las adiciones documentales indicadas. Git advierte normalización LF/CRLF, sin error de whitespace. |
| Lectura completa del informe nuevo | Exit 0; revisión de hallazgos, alternativas, dependencias y límites. Al ser archivo nuevo sin staging, no aparece en el diff ordinario. |
| `git diff --no-index --check -- NUL docs/features/HORARIO_ZONA_C0_AUDITORIA.md` | Exit 1; no se cuenta como validación aprobada. El comando mostró aviso LF/CRLF; el chequeo explícito del contenido nuevo mediante PowerShell terminó exit 0. |

Archivos del alcance: este informe, `docs/README.md`, `PROJECT_MASTER.md` y `CHANGELOG.md`. `BACKEND_CHANGES.md`, código, Prisma, migraciones, datos y configuración quedan sin cambios. Sin staging, commit ni push en este C0. **Informe entregado para elección; C0 no aprobado, C1 no autorizado.** Siguiente paso: recibir D1–D15 y autorización separada de la etapa que corresponda.
