# BACKEND_CHANGES.md

Registro de cambios de contrato de API de Kortek Booking. Cada entrada indica endpoint, cambio, motivo e impacto en consumidores.

> Leer de arriba hacia abajo: la entrada más reciente aplicable define el contrato vigente. Los estados dentro de entradas antiguas son fotografías de su fecha. El estado actual del producto vive en [`PROJECT_MASTER.md`](PROJECT_MASTER.md) y las referencias a secciones numeradas antiguas se conservan en [`docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md`](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md).

G0 no cambia endpoints, DTOs, persistencia ni contratos; solo reorganiza gobierno y documentación.

G0.1 tampoco cambia contratos. Documenta el riesgo vigente de autenticación en [`ADR-001`](docs/decisions/ADR-001-authentication-strategy.md) y propone Security A0 para una entrega posterior, sujeta a aprobación.

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
