# BACKEND_CHANGES.md

Registro de cambios de contrato de API de Kortek Booking. Cada entrada indica endpoint, cambio, motivo e impacto en consumidores.

> Leer de arriba hacia abajo: la entrada más reciente aplicable define el contrato vigente. Los estados dentro de entradas antiguas son fotografías de su fecha. El estado actual del producto vive en [`PROJECT_MASTER.md`](PROJECT_MASTER.md) y las referencias a secciones numeradas antiguas se conservan en [`docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md`](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md).

G0 no cambia endpoints, DTOs, persistencia ni contratos; solo reorganiza gobierno y documentación.

G0.1 tampoco cambia contratos. Documenta el riesgo vigente de autenticación en [`ADR-001`](docs/decisions/ADR-001-authentication-strategy.md) y propone Security A0 para una entrega posterior, sujeta a aprobación.

## 2026-09-01 — Servicios A.1 Backend: ordenamiento del catálogo

**Estado:** **IMPLEMENTADO / EN REVISIÓN**. Requiere aprobación explícita antes de que Entrega B Frontend consuma este contrato.

- `GET /services` conserva `isActive=true|false` y añade el query opcional `sort=NAME_ASC|BOOKINGS_DESC|BOOKINGS_ASC|CREATED_DESC|CREATED_ASC|PRICE_ASC|PRICE_DESC`. Omitir `sort` mantiene exactamente `name ASC, id ASC`.
- `BOOKINGS_DESC` y `BOOKINGS_ASC` cuentan únicamente reservas del servicio cuyo estado no sea `CANCELLED`. El conteo ocurre después de limitar por el `organizationId` autenticado y nunca se devuelve al cliente; los empates se resuelven por `name ASC, id ASC`.
- Fecha y precio se ordenan en PostgreSQL. Fecha usa `createdAt` y desempata por `id ASC`; precio desempata por `name ASC, id ASC`. Ningún orden expone `createdAt`, conteos, relaciones o metadatos internos.
- La proyección sigue siendo `{ id, name, description, duration, price, isActive }` y ahora se construye campo por campo para impedir que una selección interna futura amplíe accidentalmente la respuesta.
- Roles, permisos, filtro de estado, mutaciones, AuditLog, caché pública, catálogo público y aislamiento tenant no cambian. No hay cambio de Prisma ni migración.
- Validación: 56/56 unitarias dirigidas, 15/15 E2E de Servicios sobre PostgreSQL temporal aislado con las 19 migraciones aplicadas desde cero, API TypeScript/lint/build y 392 unitarias completas aprobadas (11 omitidas). Prisma validate y generate terminaron en exit `0`.

## 2026-08-31 — Servicios Entrega B Frontend

**Estado:** Entrega A Backend **CERRADO / APROBADO** sobre `f7088a4abb14e61721f08f7eeb85adbd8e6650d6`; Entrega B Frontend **IMPLEMENTADO / EN REVISIÓN**.

- No cambia endpoints, DTOs, permisos, persistencia ni migraciones. El frontend consume exclusivamente los seis contratos B2B publicados en la entrada siguiente.
- `GET /services` envía el filtro opcional `isActive` al backend; no filtra una página o copia local. El tipo web refleja la proyección mínima real y no espera `organizationId` ni timestamps.
- `POST /services`, `PATCH /services/:id`, `DELETE /services/:id` y `PATCH /services/:id/reactivate` solo se ofrecen a OWNER/ADMIN. BARBER/RECEPTIONIST reciben listado y filtro en modo de solo lectura; el backend continúa siendo la autoridad.
- Las query keys de la pantalla incorporan usuario, organización y rol. Cada mutación invalida solo el alcance que la originó; el desmontaje por contexto y la identidad de visita impiden que respuestas tardías reabran modales o emitan éxito en otro tenant, incluso al volver A → B → A.
- El formulario limita los mismos cuatro campos del contrato, recorta texto y valida nombre, descripción, duración y DOP positiva con máximo dos decimales. Los errores del API se traducen sin exponer detalles internos.

## 2026-08-31 — Servicios Entrega A Backend

**Estado:** **CERRADO / APROBADO** por decisión oficial del propietario sobre `f7088a4abb14e61721f08f7eeb85adbd8e6650d6`.

### Contratos B2B

- `GET /services`: disponible para `OWNER`, `ADMIN`, `RECEPTIONIST` y `BARBER`. Devuelve un arreglo con orden estable `name ASC, id ASC`; acepta el filtro opcional `isActive=true|false`. Sin filtro conserva activos e inactivos por compatibilidad.
- `GET /services/:id`: disponible para los cuatro roles B2B. `:id` debe ser UUID; busca por el `organizationId` autenticado y responde `404 Servicio no encontrado` tanto para ausencia como para otro tenant.
- `POST /services`: solo `OWNER`/`ADMIN`. Crea activo por defecto y registra AuditLog `CREATE`.
- `PATCH /services/:id`: solo `OWNER`/`ADMIN`. Edita únicamente `name`, `description`, `duration` y `price`; un body vacío recibe `400` y `isActive` queda rechazado por whitelist. Registra AuditLog `UPDATE`.
- `DELETE /services/:id`: solo `OWNER`/`ADMIN`. No borra el registro: cambia `isActive=false`, conserva relaciones e historial y registra `DEACTIVATE` solo cuando existe transición real. Repetir la baja es idempotente.
- `PATCH /services/:id/reactivate`: solo `OWNER`/`ADMIN`. Cambia `isActive=true`, registra `REACTIVATE` solo cuando existe transición real y es idempotente.

### DTOs, proyección e invariantes

- `name` es obligatorio, se recorta y admite hasta 120 caracteres; `description` es opcional, se recorta y admite hasta 1000. `duration` exige un entero entre 1 y 1440 minutos. `price` conserva el contrato DOP: número finito, estrictamente positivo y con máximo dos decimales.
- Todas las respuestas de Servicios exponen únicamente `id`, `name`, `description`, `duration`, `price` como decimal de dos posiciones e `isActive`. No exponen `organizationId`, timestamps ni relaciones internas.
- Tenant e identidad del actor proceden exclusivamente del contexto autenticado. Las mutaciones usan consultas tenant-scoped, AuditLog guarda solo actor/tenant/acción/entidad/id y nunca nombre, descripción o precio.
- Crear, editar, desactivar o reactivar invalida la caché de lectura pública. El catálogo público sigue mostrando solo activos inmediatamente; una baja no elimina Booking, Invoice ni el snapshot financiero histórico, y el servicio inactivo no puede usarse para crear o reprogramar reservas.
- No se modifica el schema ni se añade migración: `Service.isActive` y las restricciones monetarias aprobadas ya existían.

### Evidencia del candidato

- Unitarias dirigidas de Servicios: 39/39.
- E2E PostgreSQL aisladas de Servicios: 14/14 sobre 19 migraciones reproducidas; cubren roles, tenant/IDOR, UUID, filtro, proyección, DTOs, auditoría, idempotencia, caché pública y preservación de Booking/Invoice.
- Prisma validate/generate y migrate status, TypeScript, lint y build finalizaron en exit `0`; la suite backend pasó 375 pruebas y omitió 11 integraciones opt-in. Las 39 unitarias dirigidas forman parte de ese total y las 14 E2E aisladas pasaron aparte.

## 2026-08-30 — Profesionales y Facturación-B Frontend: CERRADO / APROBADO

- **Aprobación oficial:** el propietario cierra Profesionales (Frontend general, A2 y correctivo de perfil/aislamiento) y Facturación-B Frontend sobre `bc3d1524d5ca185d46e963c086296895407f9cce`. Esta entrada sustituye únicamente sus estados candidatos anteriores; no modifica los contratos descritos más abajo.
- **Profesionales:** se mantienen permisos OWNER/ADMIN y perfil propio BARBER, lista explícita de campos editables, teléfono privado, aislamiento tenant/ownership y auditoría sin PII. A1/A2 Backend conservan su aprobación previa.
- **Facturación-B:** se aprueba el frontend vigente sin correcciones ni ampliaciones. Continúan inalterados Invoice interna, Payment completo único, importes server-side, proyecciones/paginación, ownership BARBER y `GET /invoices` por fecha de emisión local/estado. Facturación-A Backend conserva su cierre previo.
- **Acceso independiente:** el botón aceptado “Usar otra cuenta” de `apps/web/app/auth/continue/page.tsx` permanece sin cambios. Es una mejora de acceso, no de Profesionales; este cierre no modifica Clerk ni autenticación.
- **Evidencia y límites:** se conserva la evidencia registrada en los checkpoints funcionales. Esta entrega comprueba documentación y Git, no ejecuta código ni añade QA real. La aprobación oficial no se presenta como ejecución de pruebas antes pendientes; tampoco prueba la reconciliación de la instancia legacy con ledger inconsistente.
- **Alcance:** solo PROJECT_MASTER.md, CHANGELOG.md y BACKEND_CHANGES.md. Sin endpoints, DTOs, servicios, migraciones ni módulos nuevos; visión futura, fixtures, respaldo y cambios ajenos fuera del commit.

## 2026-08-30 — Profesionales: gestión propia A1, teléfono privado y aislamiento de contexto

- **`GET /professionals/me`:** la proyección propia de `BARBER` añade `phone: string | null`. El número solo se entrega al Professional vinculado a la identidad y organización autenticadas; no se añade al directorio mínimo, a rutas públicas ni a perfiles ajenos.
- **Decisión y alcance:** el propietario solicita gestionar toda la información del perfil profesional propio junto con disponibilidad. Se conserva/restaura la edición pública de A1 ya aprobada; la restricción local intermedia a solo teléfono queda sustituida por esta decisión. No se concede gestión administrativa ni se modifica la identidad global User/Clerk.
- **`PATCH /professionals/me`:** PATCH parcial no vacío con lista explícita `name`, `bio`, `avatar`, `specialty`, `experienceYears`, `phone`. Strings con trim; nombre no vacío/no `null`, máximo 120; bio 2000; especialidad 120; avatar HTTP(S) 2048, sin subida de imágenes; experiencia entera ≥0. Los opcionales admiten `null`; teléfono privado máximo 30, vacío normalizado a `null`. Estado, publicación, vínculo, tenant, IDs, rol y demás campos reciben `400`. La mutación autoritativa usa `organizationId + userId` del contexto autenticado, nunca IDs enviados en el cuerpo. Sin perfil vinculado en el tenant: `404`; roles distintos de BARBER no reciben esta ruta.
- **Permisos, integridad y auditoría:** OWNER/ADMIN conservan la gestión existente. BARBER edita solo el Professional vinculado a su identidad en el tenant activo; RECEPTIONIST no recibe este contrato. La actualización de una fila y las proyecciones explícitas conservan el comportamiento A1. AuditLog fail-open registra solo actor, tenant, acción y entidad, nunca teléfono ni contenido del perfil. Pruebas de mass assignment/IDOR evitan que editar información habilite estado, publicación, vínculo o perfiles ajenos.
- **Frontend/brief UX:** la ficha propia ofrece “Gestionar mi perfil”, con detalle, “Editar información” y “Mi disponibilidad” mediante los contratos A1/A2; un solo modal por vez, acciones apiladas en móvil y en dos columnas en desktop. Se reutilizan formulario, Modal, foco/teclado, loading/error/reintento, pending y confirmación de éxito; los datos introducidos se conservan ante error. El teléfono se etiqueta privado. No cambia publicación, estados, servicios, carga de medios ni capacidades financieras. El menú común dice “Facturación”; la pantalla BARBER conserva “Facturación de mis servicios”.
- **Aislamiento frontend:** `/dashboard/professionals` usa la clave `usuario + organización + rol`; cambiar contexto destruye de inmediato datos, formularios, gestión propia, confirmaciones y disponibilidad anteriores. Las query keys del listado usan ese alcance y los efectos tardíos de mutaciones se ignoran. La revisión final añadió una instancia única por visita: volver A → B → A no reactiva callbacks de la primera A; salir de la pantalla invalida también esa instancia. La regresión automatizada cubre ambos casos. La disponibilidad mantiene la zona autoritativa internamente y presenta solo “Hora del negocio”.
- **Persistencia:** no cambia Prisma ni requiere migración; `Professional.phone` ya era nullable.
- **Validación:** 71 pruebas dirigidas API y 22/22 E2E HTTP PostgreSQL aisladas cubren campos públicos, teléfono, `null`, datos inválidos, siete campos administrativos prohibidos, cambio de tenant, actualización propia sin afectar al colega, auditoría sin PII y ausencia de teléfono en directorio/perfil ajeno/ruta pública. Las 19 migraciones se aplicaron desde cero en otro clúster temporal con rol sin privilegios, separado del fixture QA del propietario y de la base principal. Web añade una regresión del payload explícito y conserva pruebas de aislamiento.
- **Validaciones finales de esta iteración:** API y web TypeScript, lint y build en exit `0`; API 354 unitarias pasadas/11 omitidas y web 27/27. `git diff --check` del alcance pasa. La autorización más reciente permite incluir `auth/continue/page.tsx`: se conserva su botón “Usar otra cuenta” y solo se eliminan los espacios finales de cinco líneas; no se altera la lógica de acceso. Smoke local: web `/login` y API pública del fixture QA responden `200`; no sustituye QA autenticado visual. El clúster E2E separado quedó detenido y el fixture del propietario continúa levantado.
- **Publicación y QA pendiente:** checkpoint **IMPLEMENTADO / EN REVISIÓN**, por instrucción explícita del propietario el 2026-08-30, sobre `27214da509e9a94358924e6a8be6c2eed8fd793f`; no cierra Profesionales ni Facturación-B. La revisión del propietario y sus capturas originaron el ajuste, pero no sustituyen la matriz visual pendiente: OWNER → BARBER → OWNER, cambio de organización con modal abierto, permisos, perfil/disponibilidad, error/reintento, teclado, consola y desktop/móvil. En esta publicación se comprobó en navegador local que `/auth/continue` sin sesión redirige a login; el logout real con sesión Clerk queda pendiente. El botón reutiliza `auth.logout()` (limpieza de caché/selector y signOut existente), tiene `type="button"` y se deshabilita durante onboarding. Cinco pruebas nuevas ejecutan el componente con dobles unitarios de hooks/servicios y cubren no enviar el formulario al cambiar cuenta, disabled, payload original y redirecciones; no son QA Clerk integrado. No cambian contratos de autenticación, Clerk, Prisma ni migraciones. El fixture sintético OWNER en A/BARBER en B sigue reservado al QA del propietario; no se retira ni se revierte la configuración temporal. La visión futura permanece solo local y fuera del commit.

## 2026-08-29 — Auditoría integral de contratos y configuración

- **Organizations:** se retiran `POST /organizations` y `GET /organizations/by-slug/:slug`. La primera ruta podía crear una Organization sin Membership ni AuditLog; la segunda exponía públicamente el UUID interno y no tenía consumidor vigente. El alta inicial continúa por `/auth/register` legacy o `/auth/clerk/onboarding`, ambos atómicos. No se implementa un flujo de organizaciones adicionales.
- **IDs de ruta:** `PATCH /bookings/:id`, `PATCH /bookings/:id/status`, `PATCH /services/:id` y `DELETE /services/:id` usan `ParseUUIDPipe`; un ID malformado devuelve `400` antes de Prisma.
- **Analytics:** la ventana presentada como “últimos 30 días” incluye exactamente el día local actual y los 29 anteriores; antes incluía 31 días por un límite inferior desplazado.
- **Configuración:** el lint API deja de escribir archivos por defecto, los ejemplos de entorno sin secretos quedan versionados y el desarrollo fresco alinea web `3000` con API `3001`.
- **Dependencias:** API usa Prisma/Client `6.19.3`; el workspace fija transitivas vulnerables mediante overrides pnpm auditadas. Se retiró `@types/bcryptjs`, ya redundante, y API usa ESLint 10. No cambian DTOs ni comportamiento de persistencia.
- **Persistencia:** no hay cambio estructural ni migración nueva. El schema Prisma mapea los nombres históricos reales de las claves foráneas compuestas de `ProfessionalWeeklySchedule` y `ProfessionalAvailabilityBlock`; así deja de proponer renombres espurios. PostgreSQL 16 temporal aplicó las 19 migraciones desde cero y `prisma migrate diff` confirmó ausencia de drift.
- **Compatibilidad:** ningún consumidor web usaba las dos rutas retiradas. Un futuro alta multi-organización requiere contrato, permisos, límites, transacción, auditoría y UX propios.
- **Estado:** auditoría **IMPLEMENTADA / EN REVISIÓN**; no cierra Facturación-B ni abre otro módulo.

## 2026-08-29 — Filtro de fecha de emisión para `GET /invoices`

- **Contrato:** `GET /invoices` añade query opcional `from` y `to` en formato calendario `YYYY-MM-DD`; los extremos abiertos son válidos. El filtro corresponde exclusivamente a `Invoice.createdAt`, presentado en producto como “Fecha de emisión”, y no cambia la semántica de `Payment.paidAt`.
- **Zona del negocio:** cada extremo se convierte en backend con `Organization.timeZone`. `from` incluye el inicio del día local y `to` usa como límite exclusivo el inicio del día local siguiente, haciendo inclusivo el día seleccionado sin aritmética UTC en el navegador.
- **Validación:** una fecha imposible o `from > to` devuelve `400` claro antes de consultar organización, conteo o filas financieras. La zona ausente o inválida falla cerrada; no se sustituye por UTC.
- **Consulta y seguridad:** fecha, estado, tenant y ownership BARBER forman un único `where` previo a `count`, orden estable y paginación. Se mantienen la proyección mínima y los headers `X-Total-Count`, `X-Page`, `X-Limit`, `X-Total-Pages`.
- **Persistencia:** no cambia Prisma ni añade migración. Los `500` observados provenían de un PostgreSQL local cuyo esquema financiero seguía legacy aunque su ledger declaraba aplicadas las migraciones aprobadas de Facturación-A; el API conservó respuestas genéricas seguras. La validación integrada continuó en una base local desechable creada desde cero y con las 19 migraciones reales.
- **Validación:** API TypeScript, lint y build terminaron con exit `0`; pasaron 331 unitarias y 21/21 E2E específicas de Facturación sobre PostgreSQL 16 temporal, base `_test` y rol propietario no privilegiado. Las E2E cubren límites locales, extremos abiertos, rango/fecha inválidos, filtro antes de paginar, orden estable, tenant y ownership BARBER.
- **Estado:** correctivo **IMPLEMENTADO / EN REVISIÓN**. Facturación-B no queda cerrada ni aprobada.

## 2026-08-26 — Facturación-A Backend cerrado y aprobado

- **Aprobación:** el propietario aprobó y cerró explícitamente Facturación-A Backend sobre el checkpoint correctivo `21761ac573b075ec627c0e91593d61a4279c2b8f`.
- **Contrato vigente:** permanecen aprobados Invoice interna única e inmutable, Payment completo único, importe server-side, tenant/ownership de BARBER, respuestas mínimas paginadas, auditoría financiera transaccional sin PII y Analytics por `Payment.paidAt`.
- **Correctivo incluido:** ningún rol puede completar, emitir o cobrar antes de `Booking.endTime`; `Service.price` es DOP positivo con máximo dos decimales y la migración monetaria falla cerrada ante datos históricos inválidos.
- **Evidencia aprobada:** Prisma format/validate/generate, TypeScript, lint y build en exit `0`; 328 unitarias; 80/80 E2E PostgreSQL aisladas; 19 migraciones aplicadas desde cero; QA de roles, tenant/IDOR, concurrencia, auditoría, mínima exposición y rollback atómico.
- **Alcance del cierre:** este commit no modifica endpoints, DTOs, guards, Prisma, migraciones, persistencia ni código. Facturación-B queda limitada a análisis y plan; frontend, A0.6-B, Clerk, Supabase, reembolsos, anulaciones y comisiones requieren autorización separada.
- **Estado:** **CERRADO / APROBADO**.

## 2026-08-26 — Correctivo de auditoría de Facturación-A Backend

- **`PATCH /bookings/:id/status`:** toda transición a `COMPLETED`, para OWNER, ADMIN, RECEPTIONIST o BARBER, compara `Booking.endTime` con el tiempo autoritativo del servidor. Antes del fin responde `409` y no modifica la Booking.
- **Defensa financiera histórica:** `POST /invoices` y `POST /invoices/:id/payments` vuelven a verificar `endTime` dentro de su transacción y bloqueo tenant/ownership-scoped. Una Booking futura marcada `COMPLETED` por datos previos no puede emitir ni cobrar.
- **`POST /services` y `PATCH /services/:id`:** `price` debe ser número finito, estrictamente mayor que cero y con máximo dos decimales. `0`, negativos y `125.555` reciben `400`; `UpdateServiceDto` conserva las mismas reglas.
- **Persistencia:** `Service.price` pasa a `Decimal(65,2)` y `Service_price_dop_check` exige valor positivo. El servicio normaliza valores válidos a `Prisma.Decimal` antes de crear o editar.
- **Migración:** `20260826210000_facturacion_a_completion_service_price_guards` usa una transacción explícita y falla cerrada antes de redondear ante `Service.price` histórico no positivo, con más de dos decimales o fuera de rango; también bloquea Booking futura ya `COMPLETED` para reconciliación explícita.
- **Validación:** Prisma format/validate/generate, TypeScript, lint y build terminaron con exit `0`; 328 unitarias y 80/80 E2E pasaron. PostgreSQL temporal aplicó las 19 migraciones con rol sin privilegios globales.
- **QA de migración:** el fixture válido terminó con escala `2` y constraint activa. Los fixtures con `0`/`125.555` y Booking futura `COMPLETED` fallaron como se esperaba y conservaron escala `30`, filas originales y ausencia de constraint, demostrando rollback atómico.
- **Estado:** **IMPLEMENTADO / EN REVISIÓN**. La auditoría no aprueba ni cierra Facturación-A; frontend y todos los no-alcances permanecen bloqueados.

## 2026-08-25 — Facturación-A Backend: factura interna y cobro completo

- **Modelo:** `Invoice` es única por Booking, inmutable, tenant-scoped y conserva `amount Decimal(65,2)` positivo más `currency = DOP`. El estado de respuesta se deriva como `ISSUED` sin Payment o `PAID` con Payment; se retiran los estados Invoice legacy.
- **Payment:** relación uno-a-uno con Invoice mediante tenant compuesto. Guarda exclusivamente `method`, `paidAt` server-side, `recordedByUserId` y timestamps técnicos; no duplica amount, Booking o estado.
- **Migración:** `20260825220000_facturacion_a_internal_invoices` añade claves compuestas, checks, índices y relaciones `RESTRICT`. Falla cerrada ante Payment legacy, Invoice pagada/reembolsada o filas que no cumplan tenant, Booking completada y snapshot determinista. No inventa actor, método, fecha ni importe.
- **`GET /invoices`:** OWNER, ADMIN y RECEPTIONIST reciben el tenant completo; BARBER solo reservas cuyo `Professional.userId` coincide con su identidad. Query opcional `page`, `limit` y `state=ISSUED|PAID`; respuesta array mínima con headers `X-Total-Count`, `X-Page`, `X-Limit`, `X-Total-Pages`.
- **`GET /invoices/:id`:** misma proyección mínima. ID inexistente, otro tenant o otro Professional para BARBER devuelve `404` neutro.
- **`POST /invoices`:** body exclusivo `{ bookingId: UUID }`. Solo Booking `COMPLETED`; toma `Service.price` dentro de transacción. Devuelve `201` al crear y `200` al repetir la misma emisión. `amount` y cualquier campo autoritativo extra reciben `400` por whitelist.
- **`POST /invoices/:id/payments`:** body exclusivo `{ method: CASH | CARD | TRANSFER }`. Devuelve `201` al registrar y `200` al repetir el mismo método sin cambiar actor o `paidAt`; otro método devuelve `409`.
- **Contrato retirado:** ya no existe `PATCH /invoices/:id/pay`; `POST /invoices` no acepta amount. No hay endpoints de edición, anulación, reembolso, delete o listado Payment independiente.
- **Concurrencia:** emisión y cobro usan `SERIALIZABLE`, bloqueo de Booking/Service o Invoice, reintento acotado y unicidad PostgreSQL. Ráfagas concurrentes producen un agregado y un AuditLog.
- **Auditoría:** `ISSUE_INVOICE` y `RECORD_INVOICE_PAYMENT` son fail-closed dentro de la transacción financiera. Guardan tenant, actor, entidad e ID; excluyen PII, importe, método y bodies.
- **Analytics:** ingresos suman `Invoice.amount` mediante `Payment.paidAt`, filtrando Payment e Invoice por tenant y calculando días con `Organization.timeZone`. BARBER y CUSTOMER continúan excluidos de Analytics global.
- **Privacidad:** las respuestas no incluyen organizationId, actor, correo, teléfono, notas, IDs de User, objetos Prisma ni estados legacy.
- **Validación:** Prisma format/validate/generate, TypeScript, lint y build terminaron con exit `0`; 305 unitarias y 78/78 E2E pasaron. Las E2E usaron un clúster temporal separado, base `_test` y rol propietario sin privilegios globales.
- **QA backend integrado:** HTTP NestJS real con JWT controlados, Membership revalidada y PostgreSQL cubrió OWNER, ADMIN, RECEPTIONIST, dos BARBER vinculados, BARBER sin vínculo y CUSTOMER en dos tenants; emisión/cobro, repetición, método conflictivo, cambio de rol/tenant, IDOR, proyección, concurrencia, constraints, auditoría, rollback y Analytics.
- **Estado:** **IMPLEMENTADO / EN REVISIÓN**. El frontend actual es incompatible y no debe desplegarse contra este backend hasta una entrega coordinada y autorizada. No incluye frontend, A0.6-B, Clerk, Supabase, reembolsos, anulaciones, comisiones ni integraciones de pago.

## 2026-08-22 — Security A0.6-A cerrado: vínculo B2C posterior a reserva

- **Persistencia aditiva:** `Client.userId` es nullable, referencia `User` con `ON DELETE SET NULL` y tiene unicidad compuesta por `organizationId + userId`. No hay backfill, no se modifican Clients existentes y no se crea `Membership CUSTOMER`.
- **Nuevo contrato:** `POST /auth/clerk/customer/claims`, protegido por `ClerkOnboardingGuard` y rate limit, acepta exclusivamente `{ bookingId: UUID, organizationSlug: string }`. El navegador no aporta User, correo, tenant ID, rol ni autoridad.
- **Respuesta:** `{ claimed: true }`; `201` al crear el vínculo y `200` para la repetición idempotente por la misma identidad. Reserva/slug inexistente o ajeno devuelve el mismo `404`; una colisión de identidad, correo o vínculo devuelve `409` genérico.
- **Autoridad y atomicidad:** Clerk aporta `sub`, nombre y correo principal verificado. PostgreSQL resuelve y bloquea Booking y Client tenant-scoped dentro de una transacción `SERIALIZABLE`, reintenta únicamente fallos de serialización (`P2034` o `P2010` con código PostgreSQL exacto `40001`) y persiste User opcional, vínculo y AuditLog como una unidad.
- **Anti-enlace:** la coincidencia de correo nunca enlaza un User local existente, incluso con rol CUSTOMER legacy. La colisión no crea User, Membership, vínculo ni AuditLog. El correo solo debe coincidir con el Client de la reserva para demostrar la reclamación.
- **Privacidad:** la respuesta no expone Client, Booking, User, correo, tenant ni timestamps. AuditLog registra solo `LINK`, `Client`, IDs internos tenant-scoped y actor local, sin PII.
- **Compatibilidad:** no cambia el contrato público legacy, la creación de Booking/Client, la cuenta/password fail-open ni rutas JWT. A0.6-B/C/D quedan fuera de alcance.
- **Evidencia aprobada:** Prisma validate/generate, API TypeScript/lint/build, 286 unitarias y 5 E2E PostgreSQL aisladas finalizaron con exit `0`. Las E2E verificaron idempotencia, concurrencia, ganador único, colisión CUSTOMER legacy sin escrituras y privacidad tenant; el clúster temporal se eliminó al terminar.
- **Estado:** **CERRADO / APROBADO** por decisión explícita del propietario sobre `cbd7b8762b24ddc6802051e98ebb128d53f5f99e`. A0.6-B/C/D continúan sin implementación.

## 2026-08-22 — Security A0.5 completo cerrado y aprobado

- **Estado vigente:** Security A0.5, incluidos los subalcances A, B, C y D definidos por el propietario, queda **CERRADO / APROBADO**. Esta entrada de cierre no modifica endpoints, DTOs, Guards, Prisma, persistencia ni contratos.
- **Evidencia preservada:** permanecen vigentes el bootstrap Clerk, la compatibilidad B2B temporal con autorización local, la web Clerk sin JWT propio persistido y el correctivo de invitaciones para cuentas preexistentes. Las validaciones automatizadas y el QA real ya registrados sustentan el cierre sin conservar PII, tokens, claves, cookies ni identificadores sensibles.
- **Siguiente alcance:** A0.6 queda únicamente para análisis y planificación; no hay implementación autorizada por este cierre.

## 2026-08-22 — Security A0.5-B: consumidor web de identidad Clerk

- **Contratos backend:** no se añaden ni modifican endpoints, DTOs, guards, Prisma o migraciones. A0.5-B consume exclusivamente los contratos aprobados e implementados por A0.3-A, A0.4 y A0.5-A.
- **Bootstrap y tenant:** la web llama `GET /auth/clerk/bootstrap`, selecciona `x-organization-id` solo desde sus Memberships B2B y purga caché de negocio al cambiar de organización. El header continúa siendo selector; NestJS conserva User, Membership y rol local como autoridad.
- **Onboarding e invitaciones:** el alta de primera organización usa `POST /auth/clerk/onboarding`; Equipo usa listado/creación/reenvío/revocación y la aceptación A0.4. La UI ya no consume `/auth/invite` ni solicita contraseñas temporales.
- **Correlación segura de invitaciones:** al crear o reenviar, NestJS añade el UUID local de `TeamInvitation` a la URL base controlada por `CLERK_INVITATION_REDIRECT_URL`; no escribe `publicMetadata` para esta correlación. La web solo entrega ese UUID al endpoint existente. No acepta desde el navegador URL, tenant, rol, correo ni identificador de invitación Clerk, y la aceptación conserva sesión verificada, correo principal verificado, aceptación externa real, coincidencia de correo, estado local y transacción `SERIALIZABLE`.
- **QA y validación correctiva:** una cuenta Clerk preexistente recorrió el enlace real, la primera aceptación devolvió `201`, la repetición devolvió `200` y ambas terminaron en el dashboard. API TypeScript, lint, build y 278 unitarias; Web 5 pruebas de rutas, TypeScript, lint y build; y 11 E2E de invitaciones en PostgreSQL temporal aislado finalizaron con exit `0`. La evidencia fue anonimizada y las utilidades temporales quedaron fuera de Git.
- **Compatibilidad:** la web deja de consumir `/auth/login`, `/auth/register`, JWT propio y cookie indicadora legacy. Esos contratos backend no se eliminan en este checkpoint y permanecen temporalmente para rollback.
- **Estado:** **IMPLEMENTADO / EN REVISIÓN**. No es aprobación ni cierre y no autoriza A0.6, retiro legacy, Supabase u otro módulo.

## 2026-08-22 — Security A0.5-A: preparación backend para la transición Clerk

- **Bootstrap:** nuevo `GET /auth/clerk/bootstrap`, protegido por `ClerkOnboardingGuard` y rate limit, sin `x-organization-id`. Resuelve exclusivamente el `sub` verificado por `User.clerkUserId`; nunca enlaza por correo ni acepta identidad, tenant o rol del cliente.
- **Respuesta explícita:** devuelve `ONBOARDING_REQUIRED` cuando no existe User enlazado, `NO_ACCESS` cuando existe pero no tiene Membership B2B y `READY` cuando hay acceso. La proyección limita User a `id`/`name` y cada Membership a rol más Organization `id`/`name`/`slug`; excluye email, `clerkUserId`, roles CUSTOMER y timestamps. `preferredOrganizationId` solo aparece si pertenece al conjunto autorizado.
- **Compatibilidad B2B:** Organizations, Bookings, Professionals, Services, Clients, Invoices y Analytics usan `B2bAuthGuard`. Un JWT legacy firmado conserva su tenant únicamente tras revalidar la Membership y el rol locales. Si no es JWT legacy válido, la petición pasa por `ClerkAuthGuard`, que exige un único `x-organization-id`, sesión Clerk válida y Membership local vigente. `RolesGuard` conserva la matriz de cada controller.
- **Legacy preservado:** `/auth/login`, `/auth/register`, `/auth/invite`, password, onboarding Clerk, aceptación/gestión de invitaciones y rutas públicas no cambian de contrato. No se emiten ni intercambian tokens y no hay cambios de Prisma.
- **Redirección de invitaciones:** la creación externa incluye `redirectUrl` obtenido de `CLERK_INVITATION_REDIRECT_URL`. La variable se evalúa al crear o reenviar la invitación y exige URL absoluta `http`/`https` sin credenciales, query ni hash. NestJS agrega el UUID local como único parámetro de correlación y no depende de `publicMetadata`; la aceptación mantiene todas sus validaciones autoritativas.
- **Fallos:** sesión, selector o Membership inválidos producen errores genéricos; un rol local fuera de B2B queda en `403` por `RolesGuard`. La redirección ausente/inválida falla antes de llamar a Clerk y no introduce un valor por defecto inseguro.
- **Validación candidata:** API TypeScript, lint y build finalizaron con exit `0`; 277 unitarias pasaron (11 integraciones opt-in omitidas) y 55/55 E2E pasaron sobre PostgreSQL temporal separado, base `_test` y rol sin privilegios globales. El clúster temporal fue eliminado al terminar.
- **Estado:** **IMPLEMENTADO / EN REVISIÓN**. No incluye frontend A0.5-B, Supabase ni aprobación/cierre.

## 2026-08-21 — Security A0.4 cerrado: invitaciones de Equipo con Clerk

- **Persistencia:** nueva entidad `TeamInvitation`, aislada por `organizationId`, con actor local, rol, expiración, referencia Clerk, opción de perfil público BARBER y estados `CREATING`, `PENDING`, `RESENDING`, `REVOKING`, `ACCEPTED`, `REVOKED`, `EXPIRED` y `FAILED`. PostgreSQL prohíbe `OWNER`, limita el perfil público a `BARBER` y permite una sola invitación abierta por tenant/correo normalizado.
- **Gestión:** `POST /auth/clerk/invitations`, `GET /auth/clerk/invitations`, `POST /auth/clerk/invitations/:id/resend` y `POST /auth/clerk/invitations/:id/revoke` requieren `ClerkAuthGuard + RolesGuard` y rol local `OWNER` o `ADMIN`. Los IDs son UUID y toda consulta autoritativa incluye la organización del contexto verificado.
- **Creación:** acepta `email`, rol `ADMIN | BARBER | RECEPTIONIST`, `createPublicProfile` solo para BARBER y expiración de 1 a 30 días (30 por defecto). El listado admite estado, `page` y `limit` (20 por defecto, máximo 100) y devuelve una proyección explícita paginada.
- **Aceptación:** `POST /auth/clerk/invitations/:id/accept` requiere sesión Clerk verificada y aplica rate limit local. Responde `201` en la primera aceptación y `200` en repetición idempotente; devuelve solo `organizationId`, rol y si se creó Professional.
- **Identidad:** se reutiliza exclusivamente `User.clerkUserId`. Si no existe, se crea un User sin contraseña solo cuando no hay colisión de correo. Un User local con el mismo correo y enlace nulo o con otro `clerkUserId` produce `409` neutro, sin enlace automático ni escrituras parciales.
- **Atomicidad:** antes de abrir la transacción se comprueban en Clerk el perfil, correo principal verificado e invitación externa aceptada. La transacción `SERIALIZABLE` bloquea la invitación local y escribe atómicamente User cuando aplica, Membership, Professional BARBER opcional, aceptación y AuditLog sin PII; reintenta de forma acotada conflictos de serialización/unicidad.
- **Coordinación externa:** crear, reenviar y revocar no mantienen una transacción PostgreSQL durante llamadas a Clerk. Los estados intermedios, la compensación best-effort y la recuperación de transiciones estancadas evitan presentar como completada una operación externa fallida.
- **Fallos:** conflictos de identidad, estado, tenant o concurrencia responden de forma neutra; indisponibilidad de Clerk devuelve `503` genérico. La nota/metadata externa contiene solo el ID técnico de la invitación local y nunca rol, tenant o PII adicional.
- **Auditoría:** CREATE/RESEND/REVOKE/ACCEPT se registran con organización, actor cuando existe, acción y entidad; no se guardan correo, nombre, token, cookie o secreto.
- **Validación candidata:** Prisma validate/generate, API TypeScript, lint y build en exit `0`; 3 pruebas unitarias y 11 E2E pasaron sobre PostgreSQL temporal estrictamente aislado. No se ejecutó envío real de invitaciones Clerk ni QA de frontend.
- **QA integrado posterior:** con sesiones reales de Clerk Development, la aceptación inicial respondió `201` y la repetición de la misma identidad respondió `200`. PostgreSQL confirmó una sola Membership y un solo Professional, sin duplicados. Una segunda invitación controlada fue revocada y el intento posterior de aceptación respondió `409` neutro sin crear acceso adicional.
- **Evidencia segura:** la utilidad local fue temporal, ignorada y eliminada al finalizar. No se conservaron PII, tokens, claves, cookies ni identificadores sensibles y no se modificó frontend productivo.
- **Estado:** **CERRADO / APROBADO** por decisión explícita del propietario. No modifica `/auth/invite`, JWT/login/register/password, Supabase ni frontend productivo.

---

## 2026-08-21 — Security A0.3-B cerrado: piloto de contexto Clerk

- **Nuevo endpoint:** `GET /auth/clerk/me`, protegido por `ClerkAuthGuard`, `RolesGuard` y `B2B_ROLES` (`OWNER`, `ADMIN`, `RECEPTIONIST`, `BARBER`). `CUSTOMER` recibe `403`.
- **Entrada:** exige `Authorization: Bearer <session token>` y exactamente una ocurrencia UUID de `x-organization-id`. El header selecciona contexto, pero la autorización proviene del `sub` verificado, `User.clerkUserId` y la Membership/rol local actual.
- **Duplicados:** `ClerkAuthGuard` inspecciona las ocurrencias físicas case-insensitive en `rawHeaders`. Ausencia, formato inválido, arreglo, valor combinado o cualquier duplicado —incluso idéntico— devuelve `401` genérico antes de invocar Clerk o PostgreSQL; nunca se toma el primer valor.
- **Respuesta `200`:** delegación directa en `OrganizationsService.findMine()`, por lo que el cuerpo es idéntico al de `GET /organizations/mine`. La ruta JWT legacy, sus guards y su contrato no cambian.
- **Fallos seguros:** sesión inválida/revocada, User no enlazado, Membership inexistente/baja o tenant ajeno devuelven `401` genérico; un rol local no B2B devuelve `403` sin detalles internos.
- **Persistencia:** no añade migraciones ni cambia Prisma, usuarios, organizaciones o Memberships.
- **Validación y cierre:** API TypeScript, lint y build terminaron en exit `0`; pasaron 262 unitarias y 36/36 E2E en PostgreSQL temporal estrictamente aislado. El propietario confirmó una llamada real con sesión Clerk válida y selector propio: `GET /auth/clerk/me` respondió `200` y la organización coincidió con la ya autorizada. La evidencia no conserva PII, tokens, claves, cookies ni identificadores sensibles; la utilidad temporal ignorada fue eliminada sin entrar en Git.
- **Estado:** **CERRADO / APROBADO** por decisión explícita del propietario.

---

## 2026-08-20 — Cierre aprobado de Security A0.3-A

- **Estado:** el propietario declaró Security A0.3-A **CERRADO / APROBADO** después de QA integrado con sesiones reales de Clerk Development.
- **Evidencia segura:** el flujo real confirmó alta `201`, repetición idempotente `200` sobre la misma organización, colisión de slug de una segunda identidad `409` y sesión revocada `401`. No se registran PII, tokens, claves, cookies ni identificadores sensibles.
- **Contrato:** este checkpoint documental no cambia `POST /auth/clerk/onboarding` ni otro contrato. La utilidad local de QA fue eliminada y nunca estuvo rastreada.
- **Siguiente alcance:** Security A0.3-B queda **PLANIFICADO / PENDIENTE DE AUTORIZACIÓN**. Su piloto propuesto `GET /auth/clerk/me` reutilizará la lógica y respuesta vigentes de `GET /organizations/mine`; todavía no está implementado.

---

## 2026-08-20 — Security A0.3-A: auditoría pre-tenant y carreras de onboarding

- **Contrato HTTP sin cambios:** `POST /auth/clerk/onboarding` conserva sus respuestas. Un conflicto de correo devuelve `409` neutro y una falla de `Clerk.users.getUser()` devuelve `503` genérico, sin PII, IDs ni detalles del proveedor.
- **Evento de seguridad:** un conflicto confirmado de correo Clerk/local registra `CLERK_ONBOARDING_EMAIL_CONFLICT` con `organizationId`, `userId` y `entityId` nulos. No se atribuye el evento a una organización inexistente.
- **Persistencia mínima segura:** la migración `20260820220000_audit_log_pre_tenant_security_events` vuelve nullable solo `AuditLog.organizationId` y añade un `CHECK` que limita esa excepción al evento exacto `SecurityEvent`; las auditorías tenant-scoped continúan exigiendo su organización real en el tipo de aplicación y en la restricción.
- **Concurrencia real:** una E2E con dos `clerkUserId` y correos distintos sobre el mismo slug exige exactamente `201 + 409`, una Organization y únicamente el User, Membership OWNER y AuditLog del ganador. No quedan filas parciales de la petición perdedora.
- **Falla externa sin efectos:** una E2E fuerza el rechazo de `Clerk.users.getUser()` y exige `503` genérico y deltas cero en User, Organization, Membership y AuditLog.
- **Estado:** Security A0.3-A sigue **IMPLEMENTADO / EN REVISIÓN**. Este correctivo no aprueba el checkpoint ni autoriza A0.3-B.

---

## 2026-08-20 — Recuperación y aislamiento verificable de Security A0.3-H

- **Estado corregido:** Security A0.3-H y Security A0.3-A permanecen **IMPLEMENTADOS / EN REVISIÓN**. No existe aprobación vigente verificable para ninguno; A0.3-A no se amplió.
- **Aislamiento E2E estricto:** `DATABASE_URL` debe apuntar a otra base cuyo nombre termine en `_test` y usar una credencial distinta de la principal. La preparación consulta PostgreSQL real y exige que el usuario sea propietario de esa base sin `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION`, `BYPASSRLS` ni herencia de roles privilegiados, y que no pueda conectar a la base principal. Un `schema=test` dentro de la misma base ya no es válido.
- **Migraciones sin privilegios globales:** `global-setup.ts` dejó de crear schemas con SQL inseguro. Valida primero la conexión limitada y luego ejecuta las migraciones versionadas sobre la base aislada.
- **Atomicidad concurrente observable:** la E2E de registro concurrente no se limita a los códigos HTTP; consulta la base real y exige exactamente un `User`, una `Organization`, una `Membership OWNER` y un `AuditLog` para el alta.
- **Tipos:** la proyección segura de miembros de Equipo dejó de depender de `eslint-disable` para omitir contraseñas y usa una proyección explícita tipada.
- **Evidencia del entorno recuperado:** 21/21 E2E pasaron en `kortek_e2e_test`, propiedad de `kortek_e2e_runner`, un rol sin privilegios globales alojado en un clúster temporal separado donde la base principal no existe.
- **QA manual:** el propietario confirmó en navegador registro, cierre de sesión, login válido y rechazo de credenciales inválidas con mensaje genérico. Security A0.3-H permanece **IMPLEMENTADO / EN REVISIÓN** hasta auditoría.

---

## 2026-08-15 — Security A0.3-A: Onboarding backend con Clerk

- **Endpoint de Onboarding:** Se implementó `POST /auth/clerk/onboarding` (`ClerkOnboardingController`), protegido por `ClerkOnboardingGuard`. Permite a nuevos usuarios autenticados en Clerk crear su tenant inicial sin requerir pertenencia previa a una organización.
- **Helper Compartido de Conversión:** Se extrajo `toWebRequest` (`apps/api/src/auth/clerk/to-web-request.ts`) para estandarizar la conversión de peticiones Express a Request de Web Fetch API en `ClerkAuthGuard` y `ClerkOnboardingGuard`.
- **Cero confianza en payload de cliente:** El `ClerkOnboardingDto` solo acepta `organizationName`, `organizationSlug` y `organizationEmail`. Prohíbe y rechaza con 400 cualquier campo de identidad o privilegio (`clerkUserId`, `name`, `email`, `role`, `organizationId`).
- **Resolución autoritativa y validación estricta de perfil:** Se consulta `users.getUser(clerkUserId)` de forma lazy reutilizando la instancia de `ClerkSessionVerifierService`. Se valida estrictamente que `clerkUser.id === clerkUserId` (401 seguro antes de interactuar con la base de datos). El nombre se extrae estrictamente de `firstName`/`lastName` o `username` (400 si falta). El correo principal debe estar verificado en Clerk (403 si `status !== 'verified'`). Falla de infraestructura externa responde 503 controlado.
- **Anti-Enlace Neutro:** Si el correo verificado de Clerk coincide con un usuario local no enlazado, devuelve `409 ConflictException` completamente neutro (*"No es posible completar el registro con los datos proporcionados"*).
- **Alta Atómica e Idempotente:** Creación en transacción PostgreSQL `SERIALIZABLE` de `User(password: null, clerkUserId, lastOrganizationId: org.id)`, `Organization` y `Membership(role: 'OWNER')` junto con `AuditLog` sin PII. Rollback total ante fallo de auditoría. Reintento acotado a 3 intentos para fallos `P2034`.
- **Manejo de concurrencia e idempotencia `Promise.all`:** Ante colisiones de unicidad (`P2002`) derivadas de peticiones simultáneas para el mismo `clerkUserId`, se resuelve la entidad existente fuera de la transacción fallida y se retorna `200 OK` idempotente garantizando exactamente 1 User, 1 Organization, 1 Membership OWNER y 1 AuditLog. Si el estado es parcial/inconsistente, responde 409 y nunca crea una segunda organización.
- **Respuestas dinámicas:** Retorna `201 Created` en alta nueva y `200 OK` en reintento idempotente.
- **Pruebas y Aislamiento:** 21 pruebas E2E ejecutadas con dobles controlados de Clerk (sin secretos ni red externa, validando rechazo 401 sin header Authorization). La recuperación del 2026-08-20 sustituye el aislamiento insuficiente por schema por una base y credencial realmente separadas.
- **Estado:** Security A0.3-A **IMPLEMENTADO / EN REVISIÓN** (No aprobado. Entrega estrictamente backend; no incluye frontend ni QA de navegador).

---

## 2026-08-15 — Security A0.3-H: Hardening legacy

- **Registro atómico:** El endpoint `POST /auth/register` (legacy) ya no acepta `organizationId`. Ahora exige los datos para crear la nueva barbería (`organizationName`, `organizationSlug`, `organizationEmail`) y crea `User`, `Organization` y `Membership OWNER` en una única transacción atómica estricta (aislamiento `Serializable`) con reintentos acotados a exactamente 3 para `P2034` y una política de denegación inmediata (`409 ConflictException`) ante colisiones `P2002` de email o slug. Se normalizan explícitamente a minúsculas `slug` y `email` en el servicio (`.toLowerCase().trim()`). Además, registra un `AuditLog` sin PII tras el alta vía `AuditService.logTransactional()`, haciendo rollback completo de la transacción si la auditoría falla. Esto elimina la vulnerabilidad que permitía registrarse solicitando privilegios de OWNER sobre una organización existente.
- **Protección de organizaciones:** `POST /organizations` ya no es un endpoint público para registrar una barbería inicial. Ha sido protegido con `JwtAuthGuard` y `RolesGuard(OWNER)`, reservándose para usuarios autenticados con privilegios que necesiten registrar organizaciones adicionales.
- **Cuentas sin contraseña local:** La columna `User.password` en Prisma ahora es `String?` (nullable). Esto prepara la base de datos para usuarios autenticados mediante Clerk. El endpoint `POST /auth/login` se modificó para verificar explícitamente `user.password !== null` antes de usar `bcrypt`, retornando siempre el genérico `401 Credenciales inválidas` en caso de intentar un login legacy sobre una cuenta Clerk, preservando la seguridad y evitando fugas de información. `PATCH /auth/update-password` previene el pase de nulls lanzando explícitamente un 400.
- **Frontend actualizado:** El cliente de registro en `apps/web/lib/auth-context.tsx` ha sido modificado para enviar el nuevo payload unificado a `/auth/register` incluyendo el nuevo campo de correo de la organización (`organizationEmail`), eliminando la llamada previa y vulnerable a `/organizations`.
- **Aislamiento E2E histórico:** el checkpoint original aceptaba una base con sufijo `_test` o un schema `test`/`_test`. La segunda opción no era aislamiento estricto y queda revocada por la entrada de recuperación del 2026-08-20.
- **Estado vigente corregido:** Security A0.3-H (Hardening Legacy) **IMPLEMENTADO / EN REVISIÓN**. La afirmación histórica de cierre/aprobación fue retirada por no contar con autorización verificable.

---

## 2026-08-15 — Security A0.2: correctivo de inicialización diferida y separación de variables

- **Problema corregido:** la implementación anterior llamaba a `loadClerkAuthConfig()` en el factory del provider, obligando a que `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` y una variable CORS estuvieran presentes al arrancar el proceso aunque `ClerkAuthGuard` no proteja ningún endpoint. Además, `authorizedParties` se derivaba de `CORS_ALLOWED_ORIGINS`, mezclando dos mecanismos con semánticas distintas.
- **Inicialización diferida:** `clerkAuthConfigProvider` y `clerkBackendClientProvider` ahora devuelven funciones tipadas (`ClerkConfigLoader` y `ClerkClientFactory`). La configuración y el cliente Clerk se construyen solo en la primera petición que alcanza el guard, mediante `initializeIfNeeded()` en `ClerkSessionVerifierService`. El proceso arranca sin variables Clerk.
- **`CLERK_AUTHORIZED_PARTIES` separado:** nueva variable de entorno independiente que alimenta `authorizedParties` en `authenticateRequest()`. Acepta únicamente orígenes exactos `http`/`https` con o sin puerto explícito (p. ej. `http://localhost:3001`). `CORS_ALLOWED_ORIGINS` conserva su función exclusiva en `main.ts`.
- **Fallo cerrado:** si el loader o el factory fallan al invocarse, `ClerkSessionVerifierService` lanza `UnauthorizedException` genérico y registra internamente solo el nombre de clase del error (sin valores de secretos ni tokens). `ClerkAuthGuard` añade un `try/catch` exterior que convierte cualquier error inesperado de infraestructura (BD caída, timeout) en el mismo `401` genérico con log seguro.
- **Tests:** 3 nuevas pruebas — arranque sin variables Clerk (el cargador no evalúa al construirse), fallo cerrado del verifier cuando el loader lanza, fallo cerrado del guard cuando una dependencia lanza inesperadamente. Se añade test de reutilización del cliente ya inicializado. El spec del verifier actualiza sus constructores al nuevo patrón loader+factory.
- No se aplica el guard a endpoints; no cambian login, JWT, register, password, frontend, Prisma, Supabase ni los 19 usuarios existentes.

**Estado:** Security A0.2 correctivo **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría. No autoriza aplicación a endpoints, Security A0.3, frontend Clerk, Supabase ni otro módulo.

---

## 2026-08-15 — Security A0.2: verificación Clerk backend candidata (checkpoint original)

- Se instaló `@clerk/backend` y se añadió una integración aislada con `authenticateRequest()` que acepta únicamente `session_token`. El SDK verifica firma/JWKS, expiración y claims temporales; la configuración fija `authorizedParties`, pasa `audience` cuando se define y la capa compara el `iss` con la instancia codificada en la publishable key.
- Después de validar el token, la API consulta `sessions.getSession()` y exige estado `active` y el mismo `userId`; fallos, revocación, expiración, cambio de sujeto o error del proveedor se cierran con `401` genérico.
- `ClerkAuthGuard` resuelve exclusivamente el `sub` verificado mediante `User.clerkUserId`. El tenant recibido es solo un selector UUID: se autoriza mediante `Membership(userId, organizationId)` y el rol se lee de PostgreSQL en cada petición. No se aceptan `sub`, rol ni tenant como autoridad del navegador o de Clerk Organizations.
- El guard queda registrado para adopción posterior, pero **no está aplicado a ningún endpoint**. Login, register, JWT, password, contratos HTTP y los 19 Users existentes no cambian; no existe enlace por correo ni escritura de identidades.
- Pruebas aisladas cubren sesión válida/inválida, issuer ajeno, sesión revocada/expirada/finalizada, usuario de sesión distinto, User no enlazado, Membership inexistente, selector inválido y efecto inmediato de cambio/baja de rol local.

**Estado histórico (fotografía):** Security A0.2 original implementado; corregido por la entrada anterior de esta misma fecha.

---

## 2026-08-14 — Security A0.1: base de enlace Clerk candidata

### Persistencia

- `User.clerkUserId`: `String? @unique`, materializado como `TEXT NULL` e índice único `User_clerkUserId_key`.
- Migración `20260814190000_add_user_clerk_link_a0_1`: solo agrega la columna y el índice; no ejecuta backfill ni modifica filas existentes.
- PostgreSQL permite múltiples `NULL`, por lo que todos los usuarios pueden permanecer sin enlace; dos valores Clerk no nulos iguales se rechazan por la base.
- Los 19 usuarios locales conservaron UUID y datos. La huella de IDs antes/después coincidió; quedaron 19 `NULL` y 0 enlaces.

### Contrato y comportamiento

- No cambian endpoints, DTOs, respuestas, Guards, roles ni multi-tenancy.
- Login, registro, invitaciones, JWT, password y `lastOrganizationId` continúan con el comportamiento previo.
- No existe enlace automático por correo ni lógica que lea/escriba `clerkUserId` en runtime.
- No se instalaron Clerk/dependencias, variables, frontend ni Supabase.

### Validación

- La evidencia ambiental de A0.1 conserva el conteo y la huella de los 19 usuarios locales; no es un requisito fijo de la suite.
- La integración PostgreSQL reutilizable crea un schema temporal y una tabla `User` pre-A0.1, siembra fixtures aislados, aplica el SQL versionado y comprueba preservación, múltiples `NULL` y unicidad de valores no nulos. No consulta ni modifica usuarios reales.
- Estado: **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría. No autoriza Security A0.2.

---

## 2026-08-13 — Profesionales A2: disponibilidad individual candidata

### Persistencia

- `Organization.timeZone`: zona horaria IANA autoritativa, con default/backfill inicial `America/Santo_Domingo`.
- `ProfessionalWeeklySchedule`: múltiples turnos por `dayOfWeek` (`0..6`) y minutos desde medianoche. Sin filas hereda el horario global; con filas, solo esos turnos forman el horario individual. PostgreSQL valida rangos y usa `EXCLUDE USING gist` para impedir solapamientos del mismo Professional/día.
- `ProfessionalAvailabilityBlock`: rango UTC, `status: ACTIVE | CANCELLED` y `note` interna opcional (máximo 500). No hay hard-delete.
- Ambos modelos incluyen `organizationId`; la FK compuesta `(professionalId, organizationId)` referencia al Professional del mismo tenant y evita asociaciones cross-tenant desde la base de datos.

### Endpoints `/professionals`

- **`GET /professionals/:id/availability`** — `OWNER`, `ADMIN`. Query opcional `from`, `to`, `status`; rango por defecto de 90 días y máximo 366. Devuelve `{ professionalId, timeZone, inheritsOrganizationHours, weeklySchedule, blocks }` sin `organizationId`.
- **`PUT /professionals/:id/availability/weekly`** — `OWNER`, `ADMIN`. Body `{ shifts: [{ dayOfWeek, startTime: "HH:mm", endTime: "HH:mm" }] }`; máximo 35, varios turnos diarios y reemplazo atómico. `shifts: []` restablece herencia del horario global.
- **`POST /professionals/:id/availability/blocks`** y **`PATCH /professionals/:id/availability/blocks/:blockId`** — `OWNER`, `ADMIN`. Body de creación `{ startTime, endTime, note? }`; PATCH permite rango, `status` y nota, pero no vacío. Un bloqueo activo debe terminar en el futuro.
- En creación y PATCH, `startTime`/`endTime` deben ser ISO-8601 con `Z` u offset explícito `±HH:mm`. Los timestamps sin zona se rechazan con `400`; la regla se aplica en DTO y servicio para evitar que la zona del proceso cambie el instante almacenado.
- Validación del correctivo: TypeScript, lint y suite API estándar en exit 0, con 180 pruebas aprobadas y 9 integraciones PostgreSQL opt-in omitidas. No cambió Prisma ni las migraciones.
- Las variantes **`/professionals/me/availability`**, **`/professionals/me/availability/weekly`** y **`/professionals/me/availability/blocks[/:blockId]`** ofrecen el mismo contrato solo a `BARBER`, resolviendo el perfil vinculado por `userId + organizationId` del JWT. `RECEPTIONIST` no modifica disponibilidad.
- IDs de Professional/bloqueo pasan `ParseUUIDPipe`. Recurso ajeno o inexistente conserva el mismo `404` tenant-scoped.

### Reservas, privacidad y concurrencia

- Disponibilidad efectiva: horario global ∩ horario individual − bloqueos activos − reservas no canceladas. La zona horaria de Organization se usa para transformar fecha/hora local a UTC.
- `POST /bookings`, `POST /public/:slug/bookings`, `PATCH /bookings/:id` y la recuperación futura `CANCELLED → PENDING/CONFIRMED` validan horario global, horario individual y bloqueos dentro de la misma transacción que escribe la reserva.
- Las operaciones anteriores y las mutaciones de disponibilidad comparten el bloqueo `Professional(id, organizationId) FOR UPDATE` aprobado en A1. Un cambio de horario/bloqueo que afecte reservas futuras `PENDING`/`CONFIRMED` devuelve `409`; las carreras no pueden dejar una reserva operativa fuera de disponibilidad efectiva.
- **`GET /public/:slug/availability`** filtra slots por horario individual y bloqueos usando `Organization.timeZone`. Conserva el cuerpo público `{ date, serviceId, slots }`; la nota interna y el motivo del bloqueo nunca se seleccionan ni exponen. Cuando no hay slots, el frontend público conserva el mensaje genérico existente.
- AuditLog: `WEEKLY_UPDATE`, `BLOCK_CREATE`, `BLOCK_UPDATE`; solo contexto e IDs, sin nota/PII, con fail-open.
- Validación: Prisma generate/validate, TypeScript, lint y suite API estándar en exit 0 (173 aprobadas; 9 PostgreSQL opt-in omitidas). La ejecución PostgreSQL real pasó 9/9 casos y `prisma migrate status` confirmó 12 migraciones aplicadas.

**Impacto frontend vigente:** tras la aprobación explícita de A2 Backend sobre `ad633e9864e6e20869d0db248861f01b935d5a6f`, el Frontend A2 consume estos contratos sin modificarlos. OWNER/ADMIN gestionan la disponibilidad de cualquier Professional del tenant; BARBER usa exclusivamente las rutas `/me`; RECEPTIONIST conserva solo lectura. `timeZone`, UTC y offsets son datos técnicos para conversión interna; la UI debe presentar horas naturales sin esos identificadores. El módulo continúa abierto y su frontend sigue en revisión.

**Estado vigente:** A2 Backend **CERRADO / APROBADO** sobre `ad633e9864e6e20869d0db248861f01b935d5a6f`. Frontend A2 está **IMPLEMENTADO / EN REVISIÓN** como candidato; no aprobado. A0/A1 siguen cerrados/aprobados y no se autoriza iniciar Servicios ni otro módulo.

---

## 2026-08-12 — Profesionales A1: contrato backend candidato a auditoría

### Modelo y estados

- `Professional.status`: `ACTIVE | INACTIVE | ARCHIVED`; reemplaza `isActive`. `isPublic` es independiente y solo `ACTIVE + isPublic=true` es elegible públicamente.
- `Professional.userId` deja de ser único global y pasa a `@@unique([organizationId, userId])`. El vínculo continúa opcional y no crea identidades.
- Migración `20260812010000_professionals_backend_a1`: preserva activos como `ACTIVE/publicados`, inactivos como `INACTIVE/privados`, sin hard-delete, fusión ni backfill de PII.

### Endpoints internos `/professionals`

- **`POST /professionals`** — `OWNER`, `ADMIN`. Crea `INACTIVE`/privado. Campos: `name` obligatorio; `bio`, `phone`, `avatar`, `specialty`, `experienceYears` opcionales.
- **`GET /professionals`** — roles B2B. Query: `search`, `status`, `page`, `limit`; por defecto excluye `ARCHIVED`, página 1, 20 elementos, máximo 100, orden `name ASC, id ASC`. Cuerpo array y headers `X-Total-Count`, `X-Page`, `X-Limit`, `X-Total-Pages`. El filtro `ARCHIVED` solo produce resultados para `OWNER`/`ADMIN`; el directorio de `BARBER`/`RECEPTIONIST` no expone archivados.
- **`GET /professionals/:id`**, **`PATCH /professionals/:id`** — `OWNER`, `ADMIN`; UUID, PATCH no vacío, proyección de gestión y consulta/mutación final por `id + organizationId`.
- **`PATCH /professionals/:id/status`** — `OWNER`, `ADMIN`; body `{ status: "ACTIVE" | "INACTIVE" }`. Un archivado debe restaurarse primero.
- **`PATCH /professionals/:id/visibility`** — `OWNER`, `ADMIN`; body `{ isPublic: boolean }`.
- **`DELETE /professionals/:id`** — archiva; devuelve `409` si hay Booking futuro `PENDING`/`CONFIRMED`. No elimina filas.
- **`PATCH /professionals/:id/restore`** — restaura un archivado a `INACTIVE`.
- **`PATCH /professionals/:id/link`** — body `{ userId: UUID }`; exige Membership BARBER del mismo tenant. **`DELETE /professionals/:id/link`** desvincula. Colisión de cuenta ya vinculada: `409`.
- **`GET /professionals/me`**, **`PATCH /professionals/me`** — solo `BARBER`; el tenant y User provienen del token. Campos editables: `name`, `bio`, `avatar`, `specialty`, `experienceYears`.

### Respuestas, integraciones y límites

- Directorio `BARBER`/`RECEPTIONIST`: `{ id, name, avatar, specialty, status, isActive }`. Gestión `OWNER`/`ADMIN`: perfil completo seguro y `linkedUser`, sin `organizationId`/`userId` crudo. Perfil propio BARBER no incluye teléfono interno ni cuenta vinculada. Un vínculo `ARCHIVED` no resuelve agenda ni clientes operativos para BARBER.
- Booking interno/reprogramación exige `status=ACTIVE`. Booking público exige además `isPublic=true` en la consulta final dentro de su transacción. `ProfessionalService` no se consulta como barrera.
- **Coordinación agenda/archivo:** creación interna, creación pública, reprogramación, recuperación futura de una reserva cancelada y archivo adquieren el mismo bloqueo de fila PostgreSQL sobre `Professional(id, organizationId)` dentro de sus transacciones. El orden serializado garantiza que el archivo devuelve `409` si ya quedó una reserva futura operativa, o que la operación de agenda rechaza al Professional ya archivado.
- **`PATCH /bookings/:id/status`:** para roles administrativos la matriz vigente es `PENDING → CONFIRMED/CANCELLED`, `CONFIRMED → COMPLETED/NO_SHOW/CANCELLED` y `CANCELLED → PENDING/CONFIRMED`; `COMPLETED`/`NO_SHOW` son terminales. Si una cancelada futura vuelve a `PENDING` o `CONFIRMED`, el Professional tenant-scoped debe seguir `ACTIVE`; `INACTIVE`/`ARCHIVED` producen `409`. Las reglas BARBER de A0 no cambian.
- `/auth/invite`: `createPublicProfile=true` solo tiene efecto para `BARBER`; crea `ACTIVE/publicado`. ADMIN/RECEPTIONIST se ignoran por autoridad backend. Para un User existente, Membership y perfil automático son atómicos; cualquier fallo inesperado del Professional revierte la Membership.
- Límites: nombre 120, bio 2000, teléfono 30, especialidad 120, avatar HTTP(S) 2048, experiencia entera ≥0, búsqueda 120; strings con trim, UUIDs validados, Base64 no aceptado.
- Auditoría: `CREATE`, `UPDATE`, `STATUS_CHANGE`, `ARCHIVE`, `RESTORE`, `LINK`, `UNLINK`, sin valores PII y con fail-open.
- **Impacto frontend al publicar A1:** el frontend de Profesionales todavía no se había modificado y requería aprobación explícita del backend. Esa aprobación llegó posteriormente y el consumo vigente de Entrega B se registra debajo.

**Estado:** A0 aprobado sobre `8964c981223ba3f4a1e780103cbc0d20e4c602eb`. A1 quedó **CERRADO / APROBADO** después de la auditoría del correctivo `60919ee94eb27f628906c9b86ce7a43b2fa09237`. Entrega B Frontend está implementada / en revisión; Profesionales todavía no está cerrado.

**Consumo frontend Entrega B:** `/dashboard/professionals` consume sin alterar estos contratos: paginación por headers, proyecciones management/directory/own, estados, visibilidad, archivo/restauración y vínculo BARBER. No hubo cambios de backend, Prisma, migraciones ni cuerpos de respuesta en Entrega B.

---

## 2026-08-11 — Profesionales A0: seguridad transversal e integridad de agenda

### `GET /organizations/mine/members`

- El perfil Professional ya no se resuelve mediante la relación global `User.professional`. Se consulta con `organizationId + userId`, evitando que una Membership de un tenant arrastre un perfil perteneciente a otro.
- La proyección del perfil se limita a `id`, nombre público, bio, avatar, especialidad, experiencia e indicador activo. No devuelve `organizationId`, `userId`, teléfono ni timestamps.

### Autorización interna de Reservas

- **`POST /bookings`**: `BARBER` solo puede crear para su propio Professional vinculado y activo. `OWNER`, `ADMIN` y `RECEPTIONIST` conservan la operación administrativa vigente.
- **`PATCH /bookings/:id`**: queda limitado a `OWNER`, `ADMIN` y `RECEPTIONIST`; `BARBER` no puede reprogramar.
- **`PATCH /bookings/:id/status`**: para `BARBER`, la consulta y la mutación se restringen a su `professionalId`; agenda ajena e ID inexistente devuelven el mismo `404`. Solo permite `PENDING → CONFIRMED` y `CONFIRMED → COMPLETED | NO_SHOW`. Los roles administrativos conservan el contrato vigente.

### Catálogo público y concurrencia

- **`GET /public/:slug/booking-data`** devuelve únicamente servicios con `isActive=true`.
- **`GET /public/:slug/availability`** rechaza servicios inactivos y no genera horarios para ellos.
- La migración `20260811180000_booking_schedule_exclusion` agrega la restricción PostgreSQL `Booking_professional_schedule_excl`: impide rangos solapados para el mismo profesional mientras el estado no sea `CANCELLED`, incluso ante inserciones concurrentes.
- Una violación autoritativa de esa restricción se traduce a HTTP `409`; la comprobación previa permanece como optimización, no como única garantía.
- **Impacto frontend:** no cambia ningún body exitoso ni tipo web. Los nuevos `403/404/409` reflejan autorización o integridad backend; `apps/web` no fue modificado.

**Estado:** Checkpoint A0 implementado / en revisión. No implica aprobación, no inicia A1 y no autoriza Frontend de Profesionales.

---

## 2026-08-11 — Clientes: Entrega A Backend aprobada

### Contrato interno `/clients`

- **`POST /clients`** — `OWNER`, `ADMIN`, `RECEPTIONIST`. Normaliza nombre/notas (`trim`), correo (`trim + lowercase`) y teléfono (formato canónico, 7–15 dígitos). Devuelve `{ id, name, email, phone, notes, isActive, createdAt, updatedAt }`; nunca devuelve `organizationId`. Un correo o teléfono ya asociado a otro Cliente de la organización produce `409`.
- **`GET /clients`** — roles B2B. Query opcional: `search` (nombre/correo/teléfono), `isActive=true|false`, `page` y `limit`. Por defecto: activos, página 1, 20 elementos; `limit` máximo 100; orden estable `name ASC, id ASC`. El cuerpo continúa siendo `ClientResponse[]` por compatibilidad y la metadata está en `X-Total-Count`, `X-Page`, `X-Limit`, `X-Total-Pages`.
- **`GET /clients/:id` (nuevo)** — UUID obligatorio. Devuelve la misma proyección explícita; `404` idéntico para inexistente o tenant ajeno.
- **`PATCH /clients/:id`** — `OWNER`, `ADMIN`, `RECEPTIONIST`; UUID obligatorio, body parcial no vacío, mismas normalizaciones/límites. La mutación final incluye `id + organizationId`.
- **`DELETE /clients/:id` (cambio semántico)** — deja de hacer hard-delete y archiva (`isActive=false`). Es idempotente y mantiene el mismo aislamiento `404`.
- **`PATCH /clients/:id/restore` (nuevo)** — reactiva (`isActive=true`), roles de gestión y aislamiento idénticos al archivo.
- Límites: nombre 120, correo 254, teléfono de entrada 30 caracteres, notas 2000, búsqueda 120; `page >= 1`, `limit 1..100`.

Para `BARBER`, listado y detalle se restringen a clientes con una reserva vinculada a su `Professional` dentro del tenant. La respuesta reducida es `{ id, name, email, phone, isActive }` y nunca incluye `notes`, `organizationId` ni timestamps.

### Integración con Reservas

- **`POST /bookings`** rechaza Clientes inactivos mediante la consulta conjunta `{ id, organizationId, isActive: true }`.
- **`GET /bookings`** ya no usa `client: true`; `client` queda proyectado a `{ id, name, email, phone }`, sin notas, tenant ni timestamps. El resto del comportamiento aprobado de Reservas no cambia.
- La resolución del perfil `Professional` de un `BARBER` ahora incluye `userId + organizationId`.

### Contrato público seguro

**`POST /public/:slug/bookings`** valida `serviceId`/`professionalId` como UUID y devuelve:

```json
{
  "booking": {
    "id": "uuid",
    "serviceId": "uuid",
    "professionalId": "uuid",
    "startTime": "ISO-8601",
    "endTime": "ISO-8601",
    "status": "PENDING"
  },
  "accountCreated": false,
  "accountCreationError": null
}
```

La respuesta ya no contiene `client`, `clientId`, `organizationId` ni PII interna. Cliente y Reserva se crean/reutilizan en una sola transacción; un Cliente inactivo se reactiva en esa misma operación. La cuenta `CUSTOMER` opcional permanece secundaria/fail-open y puede reportar `EMAIL_ALREADY_EXISTS` o `ACCOUNT_CREATION_FAILED` sin abortar una reserva confirmada.

### Auditoría, persistencia e impacto frontend

- `AuditLog`: `CREATE`, `UPDATE`, `ARCHIVE`, `RESTORE`; solo IDs/contexto, nunca valores PII; fail-open.
- **Sin migración/backfill:** no cambió Prisma y no se fusionaron, eliminaron ni reescribieron registros existentes.
- El vínculo `Client ↔ User CUSTOMER` no se implementa; queda como requisito futuro para historial/autoservicio B2C.
- La auditoría del checkpoint `18a3605329ad0ce708a44ac8fcd5db1dd1665732` fue aprobada por el propietario: **Clientes Backend está aprobado**.
- La Entrega B Frontend y el módulo Clientes fueron aprobados/cerrados posteriormente por el propietario sobre el checkpoint `c0764e9a98e3876339152763bf9b0fc98fe43aae`.
- **Integración CORS de paginación resuelta:** `apps/api/src/main.ts` expone únicamente `X-Total-Count`, `X-Page`, `X-Limit` y `X-Total-Pages` mediante `Access-Control-Expose-Headers`, por lo que el frontend cross-origin puede leer la metadata real de `GET /clients`. No cambiaron orígenes permitidos, `credentials`, métodos, DTOs, servicios, Prisma, migraciones ni cuerpos de respuesta.

---

## 2026-08-08 — Reservas: validaciones nuevas, filtro de rango, reprogramar

### Cambio: `POST /bookings` — validaciones nuevas, mismo contrato de entrada/salida
- Rechaza (`400`) si `startTime` ya pasó.
- **Nota (2026-08-10):** La validación por `ProfessionalService` introducida originalmente el 2026-08-08 fue revocada. Regla vigente: cualquier profesional activo de la organización puede realizar cualquier servicio activo de esa organización. `ProfessionalService` se conserva únicamente para capacidades futuras como precio/comisión específica o restricciones opcionales.
- **Impacto frontend:** el formulario de creación debe mostrar el mensaje de error del backend tal cual (ya lo hace vía `ApiError`) — no hace falta duplicar la validación en el cliente, pero se agregó como mejora de UX en el `DateTimePicker` (deshabilitar horas pasadas).

### Cambio: `GET /bookings` — acepta query params opcionales, compatible hacia atrás
- `?from=<ISO date>&to=<ISO date>&status=<BookingStatus>` — todos opcionales. Sin ellos, mismo comportamiento de siempre (todo el historial de la organización/profesional).
- **Impacto frontend:** el frontend puede migrar de "traer todo y filtrar en el cliente" a pedir solo el rango que necesita — recomendado para el módulo Reservas cuando se construya su Entrega B, no aplicado todavía a `bookings/page.tsx`.

### Nuevo: `PATCH /bookings/:id` — reprogramar
Body: `{ professionalId?, serviceId?, startTime? }` — los tres opcionales, cualquier combinación. Devuelve el `Booking` actualizado.
- Reutiliza la misma validación de choque de horario que `POST /bookings` (excluyendo la propia reserva de la comprobación).
- Rechaza (`400`) reprogramar una reserva `CANCELLED`.
- Rechaza (`404`) si la reserva no pertenece a la organización del token.
- Separado deliberadamente de `PATCH /bookings/:id/status` — son dos operaciones de negocio distintas.
- **Impacto frontend:** habilita el botón "Reprogramar" pendiente desde la Fase 0 — implementado en el frontend usando los modales.

### Sin cambios
`PATCH /bookings/:id/status`, `DELETE /bookings/:id` (no implementado — pendiente de decisión de negocio, ver `PROJECT_MASTER.md`).

---

## 2026-07-23 — Fundación Kortek: micro-sitio, analytics, seguridad, WhatsApp (RFC aprobado)

### Nuevo: `GET /analytics/dashboard`
Protegido — `OWNER`, `ADMIN`, `RECEPTIONIST` (excluye `BARBER`, mismo criterio que `/invoices`).

```json
{
  "generatedAt": "2026-07-23T18:00:00.000Z",
  "revenue": { "today": 4500, "yesterday": 3900, "last7Days": 28700 },
  "bookings": { "today": 6, "pending": 2, "cancelled": 1 },
  "topProfessional": { "id": "uuid", "name": "Ana", "completedBookings": 14 }
}
```
- `revenue.*`: suma de `Invoice.amount` con `status: PAID`, por rango de fecha sobre `createdAt`.
- `bookings.today`: citas cuyo `startTime` cae hoy. `bookings.pending`: total actual con `status: PENDING` (no acotado por fecha — es una foto del momento). `bookings.cancelled`: canceladas **hoy** (`updatedAt` de hoy) — decisión documentada, no una suposición oculta: si se necesita "canceladas de todo el histórico", es un cambio de una línea en `AnalyticsService`.
- `topProfessional`: profesional con más citas `COMPLETED` en los últimos 30 días (ventana fija, no configurable todavía — YAGNI). `null` si no hay ninguna en la ventana.
- Formato agrupado por categoría a propósito — agregar una métrica nueva no debería requerir romper ninguna existente.

**Impacto en frontend:** ninguno todavía — no se ha construido la pantalla que lo consume (queda para un ciclo futuro, fuera del alcance de este RFC que era backend-only).

### Cambiado: `POST /auth/invite` — respuesta
Se agregó `whatsappBaseUrl: string` a la respuesta (ej. `"https://wa.me/"`, configurable vía `WHATSAPP_BASE_URL`). **No rompe compatibilidad** — es un campo nuevo agregado, no uno removido ni renombrado. El frontend puede seguir ignorándolo hasta que lo adopte.

### Cambiado: `GET /public/:slug/booking-data` — respuesta
Mismo agregado: `whatsappBaseUrl: string` en el nivel raíz de la respuesta. No rompe compatibilidad, mismo motivo que arriba.

### Nuevo: `PATCH /auth/update-password`
Protegido — `JwtAuthGuard` únicamente (cualquier rol, incluido `CUSTOMER`, cambia su propia contraseña).

```json
// Request
{ "currentPassword": "string", "newPassword": "string (mín. 8 caracteres)" }
// Response
{ "success": true }
```

### Cambiado: política de contraseñas — mínimo 6 → 8 caracteres
Afecta la validación de `POST /auth/register`, `POST /auth/invite`, y `POST /public/:slug/bookings` (cuando `createAccount: true`). Sin cambio de forma en el contrato — mismo campo `password`/`newPassword`, solo cambia el mínimo aceptado. **Impacto en frontend:** cualquier `minLength={6}` en un formulario de contraseña debe subir a `8` para que la validación del cliente coincida con la del servidor (si no, el usuario ve el error recién al enviar, no antes).

### Modelo de datos — sin impacto de API todavía
Se agregaron campos a `Organization` (`address`, `googleMapsUrl`, `aboutUs`, `heroImageUrl`, `socialLinks`, `businessHours`) y a `Professional` (`specialty`, `experienceYears`), y el modelo nuevo `GalleryImage`. **Ningún endpoint los expone ni los acepta todavía** — es la base de datos preparada para el micro-sitio público, sin la capa de API sobre ella. No hay impacto de contrato en esta entrega.

### Pendiente — NO incluido en esta entrega
El refactor `User` + `Membership` (identidad global multi-organización) y el cambio de `/auth/login` estaban **bloqueados en la fecha de esta entrada** hasta verificar correos duplicados (regla explícita del CTO: detener y reportar, no resolver automáticamente). La verificación y resolución posterior están en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §26; no interpretar este bloqueo como estado vigente.

---

## 2026-07-24 — Identidad global (`User` + `Membership`) — RUPTURA DE CONTRATO CONFIRMADA

**Verificación de duplicados: aprobada por el CTO** (verificó la base real forzando errores P2002 en `email`/`slug`, integridad confirmada). Migración `20260724023058_global_identity_membership` implementada, probada con datos representativos (no solo contra schema vacío) y verificada con `onDelete: Cascade` funcionando correctamente antes de entregarse.

### ⚠️ `POST /auth/login` — CAMBIO DE CONTRATO QUE ROMPE EL FRONTEND ACTUAL

**Antes:**
```json
{ "email": "string", "password": "string", "organizationId": "uuid" }
```
**Ahora:**
```json
{ "email": "string", "password": "string" }
```

`organizationId` ya no es un campo válido de `LoginDto`. La API tiene `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` global (`main.ts`) — esto significa que **el frontend actual, que todavía envía `organizationId` en el body del login, va a recibir un 400 Bad Request en cuanto se despliegue este backend.** No es una advertencia teórica: es una ruptura real y inmediata hasta que el frontend se actualice para dejar de enviar ese campo.

**Por qué:** el login pasa a resolver la organización activa del lado del servidor (`User.lastOrganizationId`, o la primera membresía disponible si no existe todavía), habilitando que una persona pertenezca a varias organizaciones con un solo login — el objetivo completo de este ciclo. No se consideró viable una alternativa incremental que mantuviera compatibilidad, porque el problema de fondo (una sola credencial, potencialmente varias organizaciones) es exactamente lo que el contrato viejo no podía expresar.

**Respuesta de login — sin cambios de forma** (para minimizar el impacto): sigue devolviendo `{ user: { id, name, email, organizationId, role }, accessToken }`, aunque `organizationId`/`role` ya no sean columnas de `User` — se arman combinando `User` + la `Membership` resuelta.

**Requerimiento para frontend (no implementado en este ciclo — fuera de mi alcance como Backend Lead):**
1. El formulario de login deja de necesitar resolver el slug de la organización antes de loguear — solo `email` + `password`.
2. Dejar de enviar `organizationId` en `POST /auth/login`.
3. El paso de resolución de slug (`GET /organizations/by-slug/:slug`) sigue siendo necesario para **registro** (fundar una organización nueva), no se tocó ese flujo.

### Payload del JWT — sin cambio de forma, cambio de origen
`{ sub, email, organizationId, role }` — igual que antes en estructura, pero `organizationId`/`role` ahora se resuelven de la `Membership` activa en cada login, no de columnas directas de `User`.

### Nuevo: manejo de errores P2002 (antes crasheaba con 500)
- `POST /auth/register` — correo ya existe globalmente → **409 Conflict** (antes: nada, el problema no podía ocurrir con email por-organización; ahora si el email ya existe en Kortek, se rechaza en vez de crear una cuenta duplicada o reutilizar una ajena).
- `POST /auth/invite` — comportamiento nuevo, no solo manejo de error: si el correo invitado **ya existe globalmente**, no se crea un `User` nuevo — se le agrega una `Membership` nueva a su cuenta existente (es el caso de uso real de la identidad global: alguien con acceso a varias barberías). Si esa persona ya es miembro de **esta misma** organización → 409. Ver limitación conocida abajo sobre `Professional.userId`.
- `POST /organizations` — slug o email duplicado → **409 Conflict** (antes: 500 crudo de Prisma).
- `POST /clients` — correo duplicado dentro de la misma organización (nueva restricción, ver más abajo) → **409 Conflict**.
- `POST /public/:slug/bookings` — si falla la creación de cuenta `CUSTOMER` por correo duplicado, **la reserva NO se aborta**: se confirma igual, y la respuesta indica `accountCreated: false, accountCreationError: "EMAIL_ALREADY_EXISTS"`. Decisión deliberada, no un descuido: la reserva es la acción principal de esa solicitud, la cuenta es secundaria — abortar una reserva exitosa por un conflicto no relacionado sería peor UX que informar el motivo.

### Cambiado: `Client` — restricción única por organización
`@@unique([organizationId, email])`, `email` sigue siendo opcional (permite walk-ins sin correo — `NULL` no colisiona consigo mismo en Postgres). La misma persona puede seguir siendo cliente de varias barberías, como registros independientes — no se tocó esa semántica.

### Limitación conocida y documentada: `Professional.userId` no soporta perfiles públicos en múltiples organizaciones
`Professional.userId` es único **globalmente** (se diseñó antes de que existiera el concepto de multi-organización real). Si una persona ya tiene un perfil `Professional` en la Organización A y es invitada como `BARBER` con "crear perfil público" a la Organización B, la `Membership` se crea correctamente, pero el segundo `Professional` **no** se crea — se reporta `professionalCreated: false` sin abortar la invitación. Es una limitación real, no un bug silencioso: para resolverla de raíz habría que cambiar `Professional.userId` a una restricción compuesta `(userId, organizationId)`, lo cual es en sí mismo un cambio de modelo de datos que merece su propia decisión explícita antes de tocarlo — no se hizo en este ciclo por no estar dentro del alcance pedido.
