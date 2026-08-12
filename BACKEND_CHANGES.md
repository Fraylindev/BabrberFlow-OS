# BACKEND_CHANGES.md

Registro de cambios de contrato de API del backend de Kortek OS. Cada entrada indica endpoint, qué cambió, por qué, y el impacto en frontend. Complementa a `PROJECT_MASTER.md` (que es la referencia completa del proyecto) con un formato enfocado solo en contratos.

---

## 2026-08-11 — Clientes: Entrega A Backend

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
- Impacto frontend limitado a sincronizar `PublicBookingResult`; Clientes UI no fue modificada. Entrega A todavía pendiente de aprobación explícita.

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
El refactor `User` + `Membership` (identidad global multi-organización) y el cambio de `/auth/login` siguen **bloqueados** a la espera de que se confirme si existen correos duplicados entre organizaciones en la base real (regla explícita del CTO: detener y reportar, no resolver automáticamente). Ver `PROJECT_MASTER.md` §24.14 para el detalle y la consulta de verificación pendiente.

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
