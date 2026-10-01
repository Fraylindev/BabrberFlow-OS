# Reserva pública M1 — C1 backend y contrato

Fecha: 2026-10-01. **BACKEND C1 APROBADO EXPLÍCITAMENTE POR EL PROPIETARIO, CON SUS RIESGOS RESIDUALES DOCUMENTADOS.** C0 aprobado, D6-B y restantes recomendaciones seleccionadas; D11 con error genérico conservando el rechazo de la colisión. La instrucción posterior del propietario autoriza staging de las 15 rutas exactas, un commit con el mensaje indicado y push solo a `origin/ai/antigravity-qa`, sin despliegue. Único gate en curso: publicación Git del checkpoint aprobado. C2/C3 requieren nueva autorización; producción permanece cerrada e intacta.

## Aprobación y publicación Git autorizada — 2026-10-01

El propietario declaró: «apruebo el backend del C1 de M1 Reserva pública», con sus riesgos residuales documentados, y pidió commit/push sin despliegue. Esta aprobación procede de su instrucción expresa, no de las pruebas ni del push. No cambia el contrato ni amplía cuenta, pagos o frontend. C0 se conserva como documento histórico; PROJECT_MASTER, CHANGELOG, BACKEND_CHANGES y README reflejan esta decisión posterior en el mismo commit.

Base de publicación: `ad90bf52890ea2e2ba309ad5a87d1dcafcdde9f7`, rama `ai/antigravity-qa`, índice inicialmente vacío y exactamente 10 modificados/5 sin rastrear (lista al final). Se revisan las 15 rutas, el diff completo y el staged; sin .env, temporales, secretos, volcados ni artefactos de build en el alcance. No hay paquetes, flags o variables operativas nuevos, ni acceso a bases reales, QA o producción.

Mensaje autorizado: `feat(api): M1 C1 reserva publica - availability-days, rate limit y errores genericos de colision (D11)`. La entrega de publicación reporta el SHA resultante y verifica `git rev-parse HEAD` contra `git ls-remote origin ai/antigravity-qa`, además de `git status` limpio. Ese SHA se genera después de escribir estos documentos; no se inventa ni se introduce una autorreferencia al hash del propio commit.

Revalidación de publicación: `pnpm --filter api type-check`, `pnpm --filter api lint`, `pnpm --filter api test --runInBand` y `pnpm --filter api build` terminan con exit 0; **61 suites aprobadas / 798 pruebas aprobadas / 37 omitidas**. No se repite la integración PostgreSQL aprobada descrita abajo: no cambió código técnico en esta tarea; el clúster desechable permanece detenido. Los riesgos y límites de esa evidencia se conservan. `rg` no pudo iniciarse en este Windows; la inspección usa PowerShell. El workflow versionado que responde a push ejecuta calidad con base CI desechable; no contiene despliegue. La publicación no acredita el resultado remoto de CI ni QA visual/C2/C3.

Las secciones inferiores conservan la evidencia de implementación y, donde se indica, el estado histórico anterior a esta aprobación/publicación.

## Base y alcance

HEAD `ad90bf52890ea2e2ba309ad5a87d1dcafcdde9f7`, rama `ai/antigravity-qa`. Estado inicial: modificados `CHANGELOG.md`, `PROJECT_MASTER.md`, `docs/README.md`; nuevo sin rastrear `docs/quality/RESERVA_PUBLICA_M1_C0.md`. Se preservan íntegros C0 y las nueve líneas previas añadidas a los tres controles; C1 añade entradas separadas para sincronizar su estado. El encabezado histórico de C0 indica decisiones pendientes; la aprobación expresa de esta tarea las resuelve. Referencias vinculantes: [C0 §9.2](RESERVA_PUBLICA_M1_C0.md), [decisiones](DECISIONES_PROPIETARIO_2026_09_29.md), [gates](DELIVERY_GATES.md), [Horario C1](../features/HORARIO_ZONA_C1_CONTRATO.md), [Medios C1](../features/MEDIOS_PROMOCIONES_C1_CONTRATO.md).

Usuario: visitante que necesita elegir días con huecos reales. Resultado: fechas seleccionables coherentes con los slots diarios. El calendario D6-B y demás presentación pertenecen a C2. Sin frontend, pagos, proveedores, nuevas dependencias, algoritmo de asignación, edición de horario/zona ni apertura pública real.

## Contrato C1

`GET /public/:slug/availability-days` con `serviceId` UUID requerido, `professionalId` UUID opcional, `from` y `to` fechas reales `YYYY-MM-DD`. Rango inclusivo de 1–31 días civiles, desde el día actual del negocio; el extremo exclusivo debe ser representable. Omitir profesional mantiene cualquiera disponible.

Respuesta: `{from,to,serviceId,availableDates:string[]}`; únicas, ascendentes y dentro del rango. `[]` solo significa sin slots en ese rango. `Cache-Control: no-store`. No reserva huecos. Slots diarios conservan contrato y POST conserva su resultado/autoridad, con traducción pública de errores D11 descrita abajo.

Se captura un ahora y se leen publicación, organización, servicio, profesionales, política, turnos, bloques y reservas dentro de una sola transacción RepeatableRead. Las consultas operativas cargan el rango completo, nunca por slot/día. El mismo generador evalúa slots diarios y corta cada día tras el primer hueco. Conserva duración completa, cadencia, conversores legacy/confirmado, bloqueos ACTIVE, cierres y ocupación no CANCELLED. Sin reglas ProfessionalService nuevas.

400 entrada/rango/selección inválidos; recurso de otro tenant equivale a inexistente. 404 neutro por ausencia, retiro, inactividad o cierre. 503 genérico ante dependencia/cálculo que no puede verificarse, duración corrupta o transacción agotada; no se transforma fallo en calendario vacío. **30 solicitudes/minuto por IP/handler**, compartidas entre slugs e instancias mediante SecurityRateBucket PostgreSQL; 429 con Retry-After al agotarse. Consultas inválidas también consumen presupuesto; no comparten el contador de slots diarios. Sin alteración del límite diario ni del POST.

Ruta pública de lectura: acceso anónimo, igual para todos los roles; headers de tenant/rol no cambian el slug resuelto en servidor. No concede permisos internos. No responde clientes, notas, contactos privados, cantidades de ocupación ni UUID de Organization.

## Fotos ya existentes

No se añade proyección: `GET /public/:slug/media` ya proyecta `services:[{serviceId,image}]` y `professionals:[{professionalId,avatar}]`. Filtra PUBLISHED, servicio activo y profesional ACTIVE/isPublic del negocio. Solo metadata publicada y localizador revocable de 60 s; la entrega revalida tenant, publicación y destino. C2 debe usar esta proyección, sin URLs avatar legacy ni datos privados. La integración nueva acredita exclusión de borrador, metadatos privados, destino inactivo/no público, entrega ajena y revocación del localizador por inelegibilidad; Medios y Profesionales también pasan su regresión vigente. Cloudinary se sustituye por un proveedor controlado en el ensayo: no hubo upload, moderación ni entrega externa real nueva.

## D11 — decisión y contrato implementado

El conflicto inicial entre indistinguibilidad absoluta y reserva real se documentó antes de modificar el rechazo. El propietario lo resolvió expresamente el 2026-10-01: **«Opto por Error genérico conservando el rechazo de la colisión.»** Esta decisión acota D11 a neutralizar errores sin inventar reservas o recibos. Éxito y rechazo siguen distinguibles; no se afirma igualdad HTTP/cuerpo entre una reserva exitosa y una rechazada.

`POST /public/:slug/bookings` traduce colisión entre contactos diferentes y unicidad de correo al crear Client a **400**, con cuerpo idéntico al de un teléfono inválido sin contacto existente:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "No pudimos registrar la reserva con esos datos. Revísalos o contacta al negocio."
}
```

No devuelve correo, teléfono, IDs de clientes ajenos ni detalle de constraint. Conserva rollback, sin Booking ni auditoría de alta fallida; no altera errores de ocupación ni fallos de persistencia ajenos a la colisión. La normalización pública del teléfono usa el mismo mensaje seguro. Las validaciones DTO restantes conservan su contrato. El código interno de Clients no cambia.

Pruebas unitarias e integración comparan exactamente código y cuerpo entre colisión y rechazo sin contacto existente. La carrera de correo provoca un P2002 real mediante actualización sintética concurrente entre lectura e inserción y acredita rollback. Reutilización válida y contacto nuevo devuelven **201/PENDING**, con la misma estructura y sin indicador de existencia del contacto; una reserva conserva sus IDs/instantes propios. Reutilizar un contacto dentro del mismo tenant sigue siendo válido. La identidad secundaria legacy conserva `accountCreated/accountCreationError` y su señal de correo global; no pertenece a la colisión entre Clients neutralizada ni se declara corregida en esta entrega.

## Persistencia, amenazas y rollback

**Sin migración nueva:** no se modifica Prisma, modelos, constraints ni grants. Se reutiliza SecurityRateBucket y persistencia existente. No hay rollback SQL de una migración C1 aplicable. Las 27 migraciones existentes se aplicaron desde cero a `m1_c1_test`, PostgreSQL 18.1 nuevo en loopback `127.0.0.1:55461`; el validador E2E confirmó base distinta y rol propietario sin superusuario/CREATEDB/CREATEROLE/replicación/BYPASSRLS ni acceso al principal. No existe `barberflow` en este clúster.

Se hizo pg_dump/pg_restore a un segundo clon desechable, cotejando conteo y huella ordenada de filas de las **36 tablas**, incluida _prisma_migrations: **36/36 iguales, 27 migraciones**. Integridad suplementaria, migrate status y migrate diff sobre el clon pasan. Es restauración del mismo esquema y datos sintéticos, no un ensayo de downgrade SQL nuevo. Reversión de código: retirar consumidor futuro/ruta aditiva y restituir evaluador previo, sin modificar filas ni reservas. PostgreSQL desechable se detiene al finalizar; logs/scripts/dump sintéticos quedan ignorados en `.tmp/m1-c1` para reproducir la evidencia, sin credenciales reales.

Amenazas: tenant/IDOR mitigado por consultas scoped; lectura incoherente mitigada por snapshot; agotamiento acotado por rango y contador PostgreSQL compartido; notas/PII omitidas; dependencia falla cerrada. Sin cambios de flags, variables operativas, .env, infraestructura ni bases reales. Se usó configuración efímera del proceso de pruebas para abrir exclusivamente su API sintética y desactivar proveedores; no se aplicó a procesos operativos ni a archivos de entorno. Clerk/verificación y Cloudinary son proveedores controlados; guards, DTOs, Memberships, política, transacciones y contador PostgreSQL son reales.

## Presupuesto medido antes de fijar el límite

Tres solicitudes por escenario, rango de 31 días y consulta directa al servicio real sobre PostgreSQL. Son muestras pequeñas de laboratorio, no percentiles ni capacidad del hosting. Las muestras iniciales exitosas, previas al decorador 30/min, fueron:

| Profesionales | Duración (min) | Bloques | Muestras (ms) | Sentencias SQL por solicitud | CPU total de 3 consultas (ms) |
| --- | --- | --- | --- | --- | --- |
| 1 | 30 | 0 | 159 / 104 / 115 | 19 | 438 |
| 10 | 60 | 0 | 89 / 50 / 46 | 19 | 187 |
| 40 | 15 | 1240 | 182 / 196 / 218 | 19 | 657 |
| 40 | 360 | 1240 | 147 / 146 / 152 | 19 | 484 |

El primer ensayo pesado agotó el plazo transaccional y devolvió 503. Se corrigió el coste, sin ampliar ese plazo: evaluar primero bloqueos/ocupación e indexar las reservas por profesional antes de las comprobaciones de reloj conserva el mismo predicado y orden de asignación. El motor compartido sigue evaluando duración, política y turno individual. No hay cache de respuestas ni truncamiento de profesionales, bloques o reservas.

30/min conserva la recomendación C0 tras medir el presupuesto: 30 × 218 ms = 6,54 s de trabajo observado por minuto para una IP en ese escenario; no es límite total del servidor. La regresión posterior con dos instancias observó hasta 316 ms (9,48 s/min por IP al extrapolar esa muestra); no invalida el techo de 30 para QA, pero tampoco acredita tráfico real. Ambos ensayos mantuvieron 19 sentencias y resultados completos. Los catálogos mayores, agendas densas, turnos heterogéneos y bots distribuidos necesitan ensayo propio antes de apertura real.

## Evidencia de comandos y resultados

| Comando/ensayo | Resultado real |
| --- | --- |
| git branch --show-current; git rev-parse HEAD; git status | Exit 0; rama/base y cambios iniciales descritos arriba |
| pnpm --filter api exec jest --runInBand src/public-booking/public-booking-days.spec.ts src/public-booking/public-booking.service.spec.ts | Exit 0; primera validación 28 pruebas. Después se añadieron tres negativos de duración corrupta, incluidos en la suite final |
| pnpm --filter api type-check | Exit 0 final |
| pnpm --filter api lint | Exit 0 final |
| pnpm --filter api test --runInBand | Exit 0 final tras D11; **61 suites / 798 aprobadas / 37 omitidas**, 835 total. Las omitidas no se cuentan verificadas |
| pnpm --filter api build | Exit 0 final |
| pnpm --filter api test --runInBand public-booking.service.spec.ts | Exit 0 tras D11; 18 pruebas |
| node .tmp/m1-c1/run-e2e.cjs test/public-booking-m1.e2e-spec.ts | Exit 0 tras D11; 17 pruebas. Primera integración histórica: 9 pasan / 2 fallan (constraint y coste pesado); corregidos antes de la validación final |
| node .tmp/m1-c1/run-e2e.cjs test/public-booking-m1.e2e-spec.ts test/business-schedule.e2e-spec.ts test/professionals.e2e-spec.ts test/cms.e2e-spec.ts test/media.e2e-spec.ts | Exit 0 final tras D11; **5 suites / 95 pruebas**. Runner ejecuta pnpm --filter api exec jest --config test/jest-e2e.json --runInBand con esas rutas y globalSetup/migrate deploy aislados |
| node .tmp/m1-c1/verify-db.cjs | Exit 0; dump/restore 36/36, 27 migraciones, verify-integrity.cli.js, prisma migrate status y prisma migrate diff --exit-code pasan, sin drift |
| pg_ctl -D .tmp/m1-c1/postgres -m fast -w stop | Exit 0; clúster desechable detenido |
| node .tmp/m1-c1/audit.cjs | Exit 0; 15 rutas esperadas, cinco enlaces locales del informe válidos, espacios/newline de archivos nuevos correctos, índice vacío y alcance protegido sin cambios |
| git diff --check; git diff --stat; git diff; git diff --cached --stat; git status --short; git rev-parse HEAD | Exit 0; diff revisado, sin errores de espacios, 10 modificados/5 sin rastrear, índice vacío y HEAD conservado. Avisos LF→CRLF informativos; stat ordinario excluye archivos nuevos |

También hubo fallos no contados como éxito: sandbox bloqueó configuración local de pnpm/initdb; se repitieron fuera de él mediante revisión automática autorizada. El arranque temporal tuvo una espera por handles heredados, se detuvo ese clúster y se corrigió stdio del helper. El validador de aislamiento rechazó la primera URL sin password; se añadió una contraseña aleatoria efímera sin imprimirla. Type-check detectó tipos de query en el test y lint detectó casts/bind/formato: corregidos sin desactivar reglas. La primera regresión ampliada falló 23 casos de Profesionales porque su fixture publicaba CMS sin horario confirmado: se añadió solo semana/zona sintéticas confirmadas, no se alteró la política. El error sintético de auditoría de CMS en stdout es una prueba intencional de rollback; el resultado final es exit 0.

Cobertura nueva: 31 días y bordes/formato/minimumBookingDate por zona; mismo ahora, filtro de pasado y duración; específico/cualquiera; cierre total/parcial, turno individual, bloques activos/cancelados; ocupación de los cinco estados Booking; días DST de 23/25/23,5/24,5 horas y legado fiel; corrupción/fallo seguros; IDs ajenos=inexistentes y headers de tenant ignorados; snapshot real frente a cierre concurrente; visitante y cinco roles con permisos privados conservados; fotos mínimas y revocación; 30/min en dos aplicaciones Nest con conexiones independientes, cambio de slug, headers de IP falsificados, recreación de una instancia, expiración simulada en el contador aislado y 35 peticiones concurrentes (**30 admitidas, 5 limitadas**). Dependencia del contador caída produce 503 antes del cálculo. D11 acredita neutralización de errores HTTP/cuerpo, rollback y unicidad real concurrente; alta/reutilización válida siguen PENDING.

## Riesgos residuales y lo no verificado

- D11 neutraliza errores por decisión expresa; no acredita indistinguibilidad temporal ni igualdad entre éxito y rechazo. La cuenta secundaria legacy conserva señal de identidad global en `accountCreated/accountCreationError`; permanece documentada dentro de la frontera de cuenta D8, sin ampliación B2C ni afirmación de anti-enumeración total.
- No hay QA navegador, frontend, móvil físico, C2 ni C3: esta tarea los excluye. Tampoco apertura, despliegue, correo, Cloudinary real o sesión Clerk externa nueva.
- El ensayo usa PostgreSQL 18.1 local y dos apps Nest en un proceso de pruebas, no OCI/Caddy ni dos hosts/procesos desplegados. Se probó recreación de la app y persistencia DB, no supervisión real de procesos. Los headers falsificados se ensayaron con Express sin proxy confiable; infraestructura externa conserva su evidencia previa y necesita validación propia al desplegar.
- No hay prueba de carga sostenida/distribuida ni garantía de catálogos arbitrariamente grandes. Los GET no retienen slots; el POST sigue revalidando y protegiendo escritura. Reservas spam distribuidas y ausencia de idempotencia/recibo siguen los límites D10/D12 de C0.
- No se accedió a bases reales ni se inspeccionó su estado actual; «producción intacta» describe ausencia de operaciones en esta tarea, no un nuevo chequeo remoto. Durante la implementación no se verificó un SHA remoto porque no se publicaba; la publicación posterior autorizada verifica la igualdad de SHA local/remoto según el registro superior.
- TRD/DATA_MODEL conservan párrafos históricos desactualizados (rate limit local, Supabase no implementado, cantidad de migraciones y controles temporales de facturación). Se contrastaron con código, PROJECT_MASTER y contratos posteriores; no se reabren esas áreas ni se modifican sus políticas en M1.

## Git histórico de implementación y continuación exacta

Auditoría requisito por requisito, incorporando la decisión expresa D11 del propietario:

| Requisito de la tarea | Estado y evidencia autoritativa |
| --- | --- |
| 1. Días reales por rango ≤31, zona/cierres/tenant y slots conservados | Implementado y validado por unitarias y HTTP/PostgreSQL; snapshot concurrente, estados y DST cubiertos |
| 2. Fotos públicas elegibles solo si faltaban | Ya existían; no se duplican. Proyección/entrega y privacidad verificadas con fixtures y proveedor controlado |
| 3. D11 según decisión expresa: error genérico, rechazo conservado | Implementado; HTTP 400/cuerpo idénticos para colisión y rechazo sin contacto existente, P2002 concurrente real y rollback; éxito/reutilización conservan 201/PENDING sin indicador de existencia del contacto |
| 4. Rate limit con presupuesto medido y prueba | Implementado: medición previa, 30/min compartido, dos instancias, concurrencia, spoof, recreación, expiración y fallo cerrado |
| 5. Declarar migración o probarla/rollback | Sin migración nueva; 27 existentes desde cero, dump/restore 36/36 y verificación de integridad/drift en clones desechables |
| Unitarias, integración, aislamiento, roles, abuso, type-check/lint/tests/build y documento solicitado | Comandos finales exit 0 y evidencia descrita arriba; las pruebas omitidas y los límites externos se declaran expresamente |

Las ejecuciones de implementación terminaron y el clúster desechable está detenido. En ese momento el alcance técnico C1 quedó entregado con D11 elegida, pendiente de revisión y aprobación explícita del backend. La aprobación y autorización Git posteriores se registran en el encabezado; no se infieren de las pruebas ni de la decisión de implementación.

Estado histórico al finalizar la implementación, antes de la aprobación/publicación: HEAD y rama conservados; índice vacío. Sin commit, push, staging, despliegue, nuevos paquetes, frontend, Prisma/migraciones ni .env. **10 archivos modificados / 5 nuevos sin rastrear**, incluidos los tres controles y C0 previos. Las entradas C0 anteriores permanecen intactas; las entradas nuevas C1 explican las autorizaciones posteriores y el estado vigente.

```text
 M BACKEND_CHANGES.md
 M CHANGELOG.md
 M PROJECT_MASTER.md
 M apps/api/src/bookings/bookings.service.ts
 M apps/api/src/professionals/professional-availability.service.ts
 M apps/api/src/public-booking/public-booking.controller.ts
 M apps/api/src/public-booking/public-booking.service.spec.ts
 M apps/api/src/public-booking/public-booking.service.ts
 M apps/api/test/professionals.e2e-spec.ts
 M docs/README.md
?? apps/api/src/public-booking/dto/get-availability-days-query.dto.ts
?? apps/api/src/public-booking/public-booking-days.spec.ts
?? apps/api/test/public-booking-m1.e2e-spec.ts
?? docs/quality/RESERVA_PUBLICA_M1_C0.md
?? docs/quality/RESERVA_PUBLICA_M1_C1_CIERRE.md
```

Siguiente paso vigente: completar la publicación Git expresamente autorizada y verificar SHA local/remoto y árbol limpio. Después, esperar autorización expresa de C2; la aprobación del backend C1 ya consta. La selección D11 se implementó y validó; no queda pendiente de aclaración. Cualquier ampliación de identidad secundaria o indistinguibilidad absoluta necesita su propio contrato y autorización.

Para C2, después de aprobación del backend y autorización expresa: ruta /{slug}/reservar, consumo de rango/día y fotos existentes, calendario D6-B con días no disponibles visibles/deshabilitados y hora compacta, copy PENDING, error D11 útil/genérico, revalidación, aislamiento del estado de visita y estados de C0. Mis reservas/cuenta real, Pagos, editor y calendario del panel conservan sus módulos. QA visual C3 y producción separados.
