# ADR-001 — Identidad con Clerk y persistencia PostgreSQL en Supabase

- Estado: **Security A0-D, A0.3-H, A0.3-A, A0.3-B, A0.4 y Security A0.5 completo (A, B, C y D) CERRADOS / APROBADOS; Security A0.1 y A0.2 implementados / en revisión**
- Fecha de decisión: 2026-08-14
- Checkpoint de diseño aprobado: `66e1c094b47e8bc7265803c122d851125023ce94`.

## Decisión

1. **Clerk** gestionará identidad, login, registro, verificación, recuperación de contraseña y sesiones.
2. **NestJS** continuará como backend autoritativo del negocio.
3. `Organization`, `Membership` y `Role` permanecerán en PostgreSQL. La autorización se resolverá localmente en cada petición.
4. Clerk Organizations no será fuente de tenants, roles ni permisos de Kortek Booking.
5. **Prisma** seguirá siendo la capa de datos y usará PostgreSQL administrado por **Supabase**.
6. No se usará Supabase Auth.
7. Clerk y Supabase comenzarán en sus planes Free solo para desarrollo, QA y ensayo de migración. El paso a pago es un gate previo al primer tenant externo o de pago en producción.

La implementación se dividirá en checkpoints independientes. Migrar identidad a Clerk y trasladar PostgreSQL a Supabase en un mismo cambio está prohibido.

## Estado real auditado

### Identidad y riesgo vigente

El diagnóstico que originó Security A0 encontró autenticación propia con estos riesgos; los resultados posteriores del ADR indican cuáles ya fueron corregidos:

- [`OrganizationsController`](../../apps/api/src/organizations/organizations.controller.ts) expone `POST /organizations` sin guard.
- `GET /organizations/by-slug/:slug` es público y [`OrganizationsService`](../../apps/api/src/organizations/organizations.service.ts) proyecta `{ id, name, slug }`.
- [`RegisterDto`](../../apps/api/src/auth/dto/register.dto.ts) acepta `organizationId` enviado por el cliente.
- [`AuthService.register()`](../../apps/api/src/auth/auth.service.ts) crea `User` y `Membership OWNER` para ese ID.
- En el diagnóstico original, `auth-context.tsx` guardaba `bf_token` y `bf_session` en `localStorage` y `proxy.ts` solo comprobaba una cookie indicadora `kb_session`. Security A0.5-B elimina ese comportamiento de la web; se conserva aquí como riesgo histórico que motivó la decisión.
- [`JwtStrategy`](../../apps/api/src/auth/strategies/jwt.strategy.ts) revalida la Membership por petición. Este control local es correcto y debe conservarse con Clerk.

La composición pública permitía solicitar OWNER sobre una Organization existente. Además, el JWT duraba un día, los límites de intentos vivían en memoria y no existían recuperación, verificación, MFA ni revocación general de sesiones. Security A0 corrige esos riesgos por checkpoints sin trasladar la autorización de negocio al proveedor de identidad.

### Clasificación de usuarios

La instancia inspeccionada es PostgreSQL local en Docker, no una base identificada como producción. El inventario sanitizado resultó:

| Elemento | Resultado |
| --- | ---: |
| Users locales | 19 |
| Coinciden con el inventario QA local ignorado por Git | 7 |
| Users sin clasificación comprobable | 12 |
| Organizations locales | 9 |
| Clients / Bookings | 33 / 22 |

No hay evidencia de usuarios reales de producción, pero tampoco evidencia suficiente para declarar que los 19 sean exclusivamente QA. Los 12 no clasificados se preservarán y deberán ser clasificados por el propietario antes de importar, fusionar o eliminar identidades. Ningún checkpoint puede inferir su naturaleza por nombre, dominio o actividad.

## Relación entre User local y Clerk

`User` conservará su UUID local estable para relaciones y auditoría. En un checkpoint posterior se añadirá un identificador externo nullable y único, por ejemplo `clerkUserId`, con estas reglas:

- una identidad Clerk solo puede enlazar un `User` local;
- después del enlace, la clave autoritativa es `clerkUserId`, no el correo;
- el correo normalizado sirve para proponer una coincidencia durante migración, nunca para enlazar silenciosamente;
- una coincidencia, colisión o cambio de correo ambiguo se detiene para resolución manual;
- webhooks verificados sincronizan datos de perfil mínimos, pero no conceden Membership ni roles;
- no se crea un segundo `User` si ya existe un enlace válido;
- todo enlace/importación es idempotente y auditable sin guardar tokens, contraseñas ni PII en AuditLog.

Un conflicto entre el correo verificado de una identidad Clerk y un `User` local no enlazado se rechaza sin enlazar por correo y se registra como `CLERK_ONBOARDING_EMAIL_CONFLICT`. Ese hecho ocurre antes de que exista una Organization autoritativa: por ello el registro usa `organizationId: NULL`, sin `userId`, `entityId`, correo ni `clerkUserId`. Una restricción PostgreSQL limita esta excepción al evento exacto; atribuirlo a un tenant ficticio falsearía la auditoría y queda prohibido.

Clerk soporta importar hashes bcrypt, pero usar esa capacidad requiere inventario aprobado, exportación protegida, ensayo y rollback. La alternativa preferida para cuentas QA o no clasificadas es invitación/activación o recuperación administrada por Clerk, evitando transportar hashes cuando no sea necesario. El campo local `password` se volverá nullable y se retirará únicamente después de validar Clerk y vencer la ventana de rollback.

## Onboarding seguro de Organization + primer OWNER

El registro de identidad sucede primero en Clerk. Con una sesión Clerk válida y una identidad verificada, el cliente solicita un único comando de onboarding a NestJS con los datos de la nueva organización, **sin** `organizationId` ni rol.

NestJS ejecutará una transacción idempotente:

1. verifica la sesión Clerk y obtiene su `sub`;
2. toma un bloqueo o clave de idempotencia para esa identidad;
3. resuelve o crea el `User` por `clerkUserId`;
4. comprueba que la identidad no consumió ya ese onboarding;
5. crea `Organization` y la primera `Membership OWNER` juntas;
6. establece el contexto local inicial de organización;
7. confirma todo o no persiste nada.

El endpoint público por slug dejará de ser un medio para obtener el ID interno de un tenant. Los flujos públicos resolverán el slug dentro del backend. Ningún endpoint de registro podrá conceder OWNER sobre una Organization preexistente elegida por el cliente.

## Sesiones Clerk verificadas por NestJS

- Next.js usará el SDK de Clerk y su sesión; se eliminan progresivamente login/register propios, JWT propio y credenciales en `localStorage`.
- Web enviará el token corto de sesión Clerk en `Authorization` cuando API y web sean orígenes distintos, o usará la integración de cookie admitida por Clerk cuando la topología final lo permita.
- NestJS usará el SDK backend de Clerk (`authenticateRequest`) o verificación equivalente para firma/JWKS, emisor, expiración, `nbf`, audiencia/origen autorizado y estado de sesión.
- El `sub` verificado resuelve `User.clerkUserId`. Luego NestJS consulta la `Membership` activa para el tenant seleccionado y obtiene el rol local.
- El contexto de organización se selecciona mediante un mecanismo local opaco o firmado después de comprobar Membership. Un ID enviado libremente por el navegador nunca autoriza.
- Quitar una Membership o cambiar su rol surte efecto en la siguiente petición aunque la sesión Clerk continúe activa.
- La UI puede representar permisos, pero Guards y decorators NestJS siguen siendo el límite real.

## Invitaciones, contraseñas, logout y revocación

### Invitaciones

- OWNER/ADMIN crean una invitación local pendiente con organización, rol permitido, correo normalizado, expiración, estado e invitador.
- NestJS solicita a Clerk una invitación de aplicación o un flujo equivalente; no usa Clerk Organizations para asignar rol.
- La Membership solo se activa dentro de una transacción cuando una sesión Clerk verificada acepta la invitación y su correo verificado coincide.
- Invitaciones, reintentos y webhooks son idempotentes. Un fallo de Clerk no deja una Membership activa parcial.
- `createPublicProfile` continúa limitado a BARBER y `Membership + Professional` se crean atómicamente al aceptar.
- Se elimina el intercambio de contraseñas temporales por WhatsApp. Una identidad Clerk existente se reutiliza; no se duplica.

### Ciclo de cuenta y sesión

- Clerk gestiona cambio y recuperación de contraseña, verificación de correo y MFA.
- Logout invoca `signOut`, limpia el contexto/caché local y termina la sesión Clerk correspondiente.
- Revocación global o por dispositivo se realiza con sesiones Clerk. La baja de Membership revoca inmediatamente el acceso al tenant desde NestJS.
- Los endpoints locales de contraseña y emisión JWT se retiran solo al final, después de QA y ventana de rollback.
- Rate limiting de operaciones de negocio sensibles seguirá siendo responsabilidad de NestJS y deberá ser distribuido antes de producción horizontal. Los límites de Clerk no sustituyen protección propia de onboarding e invitaciones.

### CUSTOMER y booking público

Crear una reserva pública seguirá siendo la operación primaria y atómica. La cuenta CUSTOMER será secundaria: se ofrecerá registro o enlace Clerk después del éxito, con provisión local idempotente. El booking público no aceptará ni transportará contraseñas y un fallo de identidad no revierte una reserva ya confirmada.

## Supabase PostgreSQL con Prisma

Supabase proveerá PostgreSQL; Prisma y sus migraciones existentes continuarán siendo la verdad ejecutable. No se habilita Supabase Auth ni se delega autorización al Data API.

### Preparación y conexión

- crear proyectos separados para QA/staging y producción;
- crear un rol PostgreSQL dedicado para Prisma con privilegios mínimos compatibles con migraciones y runtime;
- exigir SSL y custodiar CA/configuración cuando se use verificación completa;
- usar conexión directa para `pg_dump`, restauración y migraciones cuando haya IPv6; si no, Supavisor en modo sesión por puerto 5432;
- reservar Supavisor transaccional 6543 para runtimes serverless que lo requieran, no para migraciones;
- separar `DATABASE_URL` de runtime y una URL directa/de migración si la versión/configuración Prisma finalmente lo requiere;
- guardar URLs, passwords, claves Clerk, signing/JWT key y webhook secret exclusivamente en el gestor de secretos del entorno.

Variables previstas, sujetas a confirmar en implementación: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_KEY` o JWKS, `CLERK_WEBHOOK_SIGNING_SECRET`, `DATABASE_URL` y `DIRECT_URL`/URL de migración. Nunca se versionan valores.

### Migración, verificación y rollback

1. inventariar versión PostgreSQL, extensiones (`btree_gist` incluida), tamaño, secuencias, constraints y tabla `_prisma_migrations`;
2. ensayar `pg_dump`/restore en un proyecto no productivo y aplicar/verificar todas las migraciones Prisma;
3. comparar conteos por tabla, claves, índices, exclusiones, timestamps y pruebas de negocio;
4. programar ventana de escritura congelada, tomar dump final, restaurar y cambiar el secreto de conexión;
5. ejecutar smoke tests multi-tenant, agenda, autenticación vigente y rollback antes de abrir escrituras;
6. conservar la fuente en solo lectura y un dump cifrado durante la ventana acordada; nunca permitir doble escritura;
7. si falla un gate, revertir `DATABASE_URL` a la fuente, reabrirla y descartar/reconciliar cualquier escritura posterior al corte antes de reintentar.

Los datos QA solo migrarán a un proyecto QA. Los 12 Users no clasificados no se borran ni se promueven a producción sin decisión del propietario.

## Planes Free y gate de pago

Límites verificados el 2026-08-14; deben revalidarse antes de presupuestar:

- Clerk Hobby incluye hasta 50,000 monthly retained users por aplicación, tres usuarios de dashboard, sesión fija de siete días, un día de logs y no incluye MFA en producción. Al superar 50,000 MRU exige Pro y ofrece un mes de gracia. Fuente: [Clerk Pricing](https://clerk.com/pricing).
- Supabase Free permite dos proyectos activos, 500 MB de base por proyecto, 5 GB de egress, no incluye backups automáticos y puede pausar proyectos tras una semana de baja actividad. Al superar 500 MB la base entra en modo solo lectura. Fuentes: [Supabase Pricing](https://supabase.com/pricing), [Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing) y [Database Size](https://supabase.com/docs/guides/platform/database-size).

**Gate de Kortek:** actualizar Clerk a Pro y Supabase a Pro **antes del primer tenant externo o de pago en producción**, aunque el uso esté por debajo de los límites. Antes de ese corte deben estar habilitados MFA para OWNER/ADMIN, retención operativa de logs, backups automáticos, alertas de cuota, restore ensayado, presupuesto/alertas y responsables de facturación. Un hard limit, necesidad de MFA productivo, necesidad de soporte/SLA o ensayo de carga que exceda Free adelanta el upgrade; nunca lo pospone.

## Pruebas obligatorias

- intento de crear OWNER para una Organization existente: siempre denegado;
- reintento/concurrencia de onboarding: una Organization y una Membership OWNER, o ninguna;
- `sub` inexistente, duplicado, correo ambiguo y webhook repetido/falsificado;
- sesión válida, expirada, revocada, de otro issuer/audience y logout;
- cambio/baja de Membership con sesión Clerk aún válida;
- matriz OWNER/ADMIN/RECEPTIONIST/BARBER/CUSTOMER y recursos ajenos con respuesta no enumerable;
- invitación nueva, existente, expirada, revocada, correo distinto, reintento y atomicidad de Professional BARBER;
- recuperación/verificación/MFA y eliminación de secretos de `localStorage`;
- booking público sin contraseña y provisión CUSTOMER fail-open/idempotente;
- restauración completa a Supabase con extensiones, `_prisma_migrations`, constraints de agenda, conteos y checksums/muestreo;
- fallo durante cutover y rollback probado sin doble escritura ni pérdida aceptada.

## Checkpoints posteriores propuestos

Cada checkpoint requiere contrato/threat model, validaciones, QA aplicable, documentación y auditoría independiente:

1. **Security A0.1 — base de enlace (implementado / en revisión):** `clerkUserId` nullable/unique, sin backfill, sin enlace por correo, sin cambio de login ni modificación de cuentas existentes.
2. **Security A0.2 — verificación backend (implementado / en revisión):** guard Clerk y resolución local User/Membership en compatibilidad controlada; sin cambiar frontend ni rutas existentes.
3. **Security A0.3 — onboarding:** comando atómico Organization + OWNER y retiro del escalamiento público.
4. **Security A0.4 — invitaciones:** invitación pendiente local, aceptación Clerk y Membership/Professional atómicos.
5. **Security A0.5-A — preparación backend:** bootstrap de sesión, compatibilidad temporal JWT/Clerk para rutas B2B y redirección segura de invitaciones.
6. **Security A0.5-B — frontend de identidad (cerrado / aprobado):** Clerk login/register/recovery/logout, sesión efímera para API, bootstrap local y retiro del JWT propio de `localStorage`.
7. **Security A0.6 — CUSTOMER:** registro/enlace posterior al booking público.
8. **Security A0.7 — retiro legado:** passwords/JWT/endpoints/secrets propios, solo tras ventana de rollback.
9. **Data D0.1 — Supabase preparado:** proyecto QA, roles, SSL, conexión y ensayo vacío; sin migrar identidad.
10. **Data D0.2 — ensayo de datos:** dump/restore QA y reconciliación completa.
11. **Data D0.3 — cutover:** traslado controlado de PostgreSQL con freeze y rollback probado.
12. **Data D0.4 — operación:** backups, alertas, restore periódico y gate de pago/productivo.

## Referencias operativas

- [Clerk: verificación de tokens de sesión](https://clerk.com/docs/guides/sessions/manual-jwt-verification)
- [Clerk: migración de usuarios](https://clerk.com/docs/guides/development/migrating/overview)
- [Clerk: invitaciones de aplicación](https://clerk.com/docs/guides/users/inviting)
- [Supabase: Prisma](https://supabase.com/docs/guides/database/prisma)
- [Supabase: modos de conexión](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: migrar PostgreSQL](https://supabase.com/docs/guides/platform/migrating-to-supabase/postgres)
- [Supabase: backups](https://supabase.com/docs/guides/platform/backups)

## Resultado de Security A0.1

- `User` conserva su UUID, email, password, relaciones y comportamiento de login.
- `clerkUserId` es `TEXT NULL` con índice único PostgreSQL; varios `NULL` son válidos y un ID no nulo no puede repetirse.
- La migración es aditiva y no ejecuta `UPDATE`, clasificación, fusión, eliminación o enlace de usuarios.
- PostgreSQL real preservó los 19 IDs existentes con la misma huella; 19 quedaron en `NULL` y 0 enlazados.
- El test opt-in aplica la migración real sobre fixtures pre-A0.1 en un schema temporal; cubre preservación, múltiples usuarios sin enlace y rechazo PostgreSQL de un ID Clerk duplicado sin depender del dataset local.
- No cambia endpoints, DTOs, Guards, JWT, frontend, dependencias, variables ni Supabase.

## Resultado de Security A0.2 (incluyendo correctivo)

- `@clerk/backend` está instalado y registrado. El proceso **arranca sin variables Clerk**: los providers devuelven funciones tipadas (`ClerkConfigLoader`, `ClerkClientFactory`) cuya evaluación se difiere hasta la primera petición que alcanza el guard.
- Al invocarse el guard, `ClerkSessionVerifierService.initializeIfNeeded()` llama al loader y al factory; si alguno falla, lanza `UnauthorizedException` genérico y registra internamente solo el nombre de clase del error (sin secretos ni tokens). `ClerkAuthGuard` añade su propio `try/catch` exterior para errores inesperados de infraestructura.
- `CLERK_AUTHORIZED_PARTIES` es la variable que alimenta `authorizedParties` en `authenticateRequest()`. Acepta orígenes exactos `http`/`https` con o sin puerto explícito (p. ej. `http://localhost:3001`). `CORS_ALLOWED_ORIGINS` conserva su uso exclusivo en `main.ts`.
- `authenticateRequest()` acepta solo `session_token` y verifica firma/JWKS, expiración y claims temporales. `authorizedParties` se deriva de `CLERK_AUTHORIZED_PARTIES`; la audiencia se pasa cuando `CLERK_JWT_AUDIENCE` está definida. El issuer se compara con el Frontend API codificado en `CLERK_PUBLISHABLE_KEY`.
- Tras la verificación criptográfica, `sessions.getSession()` exige una sesión `active` del mismo `sub`. La revocación, expiración/finalización, sujeto distinto o fallo de Clerk producen `401` sin detalles internos.
- El guard busca `User` únicamente por `clerkUserId`, nunca por correo. Después exige la Membership compuesta para el selector UUID de Organization y construye el contexto con el rol local actual. Claims o headers de rol/usuario no participan en la autorización.
- Cambiar el rol o eliminar la Membership tiene efecto en la siguiente petición. Un User no enlazado y un User sin Membership se rechazan de forma segura.
- La capa está registrada pero no aplicada a controllers. Los endpoints actuales conservan JWT propio; login/register/password, Prisma, Supabase y frontend no cambian. Los 19 usuarios citados corresponden al inventario histórico de A0.1, no a un invariante ni al estado de la instancia nativa actual.
- Los tests de A0.2 son aislados y no consumen sesiones ni secretos reales. Cubren sesión válida/inválida, issuer, estado remoto, enlace local, Membership, revocación local de acceso, arranque sin variables Clerk, fallo cerrado del loader, fallo cerrado del guard por error inesperado y reutilización del cliente inicializado.

## Resultado de Security A0.3-H (Hardening Legacy) — CERRADO / APROBADO

- El `RegisterDto` se volvió atómico: exige `name`, `email`, `password`, `organizationName`, `organizationSlug` y el correo de la organización de forma independiente (`organizationEmail`), y rechaza `organizationId`. Se implementó validación de formato (3-50 caracteres, caracteres alfanuméricos aceptando mayúsculas y minúsculas con guiones intermedios, sin espacios ni rutas) y normalización explícita a minúsculas (`toLowerCase().trim()`) para la persistencia del slug y correos en el servicio.
- `AuthService.register()` crea `User`, `Organization` y `Membership` OWNER en una sola transacción estricta (`isolationLevel: Prisma.TransactionIsolationLevel.Serializable`). Se implementó reintento acotado a exactamente 3 intentos exclusivo para fallas de serialización (`P2034`), mientras que errores de unicidad (`P2002`) en slug o email se traducen inmediatamente a `409 ConflictException` sin reintentos ciegos.
- La transacción atómica escribe el evento `CREATE` en `AuditLog` vía `AuditService.logTransactional()`, sin PII y de forma requerida (si falla la auditoría, la transacción completa hace rollback sin dejar filas huérfanas).
- `POST /organizations` (`OrganizationsController`) está protegido con JWT y rol `OWNER`; ya no es ruta pública para el alta inicial.
- `User.password` es nullable en persistencia. `login()` y `updatePassword()` protegen contra contraseñas locales nulas (devuelven rechazo neutro 401 y 400 respectivamente sin invocar bcrypt con null).
- Frontend web (`apps/web/lib/auth-context.tsx`) envía el payload atómico completo incluyendo `organizationEmail`.
- El aislamiento E2E original aceptaba un schema `test` dentro de la base principal y una credencial privilegiada. Esa evidencia no cumple aislamiento estricto y no sustenta una aprobación.
- La recuperación del 2026-08-20 exige una base `_test` y usuario diferentes. Antes de migrar, consulta PostgreSQL real y rechaza superusuario, privilegios globales o heredados y cualquier acceso a la base principal. `global-setup.ts` dejó de crear schemas mediante SQL dinámico.
- La E2E concurrente verifica persistencia real: exactamente un `User`, una `Organization`, una `Membership OWNER` y un `AuditLog`. La suite completa pasó 21/21 en `kortek_e2e_test`, dentro de un clúster temporal separado y con `kortek_e2e_runner` sin privilegios globales.
- El propietario confirmó mediante QA manual en navegador el registro, cierre de sesión, login válido y el mensaje genérico ante credenciales inválidas.
- Estado vigente por decisión explícita del propietario: **CERRADO / APROBADO**. Las entradas cronológicas anteriores conservan el estado histórico que tenían al publicarse.

## Resultado de Security A0.3-A (Onboarding Backend Clerk) — CERRADO / APROBADO

- Se amplió `ClerkClientFactory` con `users: Pick<ClerkClient['users'], 'getUser'>` y se habilitó su acceso lazy sin duplicación desde `ClerkSessionVerifierService.getClient()`.
- Se extrajo el helper `toWebRequest` (`apps/api/src/auth/clerk/to-web-request.ts`) para unificar la conversión de Express Request a Web Fetch API Request entre `ClerkAuthGuard` y `ClerkOnboardingGuard`.
- Se implementó `ClerkOnboardingGuard` para proteger endpoints de onboarding verificando la autenticidad y estado activo de la sesión Clerk sin exigir inquilino ni usuario previo en PostgreSQL.
- Se implementó `POST /auth/clerk/onboarding` (`ClerkOnboardingController`) con `ClerkOnboardingDto` (`organizationName`, `organizationSlug`, `organizationEmail`). El payload no acepta datos de identidad (`clerkUserId`, `name`, `email`, `role`, `organizationId`).
- Resolución autoritativa de perfil Clerk con validación estricta de ID: se comprueba que `clerkUser.id === clerkUserId` (401 seguro antes de tocar base de datos si no coincide). Se extrae nombre estrictamente de `firstName`/`lastName` o `username` (400 si falta; prohibido body o metadata). Correo principal verificado obligatorio (403 si `status !== 'verified'`). Falla de Clerk API responde 503 controlado.
- Política anti-enlace: si el correo verificado coincide con un usuario local no enlazado, se rechaza con `409 ConflictException` neutro (*"No es posible completar el registro con los datos proporcionados"*).
- Creación atómica en transacción `SERIALIZABLE` de `User(password: null, clerkUserId, lastOrganizationId: org.id)`, `Organization` y `Membership(role: 'OWNER')` junto con `AuditLog` sin PII. Rollback total si falla `logTransactional`.
- Reintento acotado a 3 intentos para `P2034`.
- Manejo de concurrencia e idempotencia `Promise.all`: ante ráfagas concurrentes con el mismo `clerkUserId`, se resuelve la entidad existente retornando `200 OK` idempotente garantizando exactamente 1 User, 1 Organization, 1 Membership OWNER y 1 AuditLog en PostgreSQL.
- Control de estado parcial: si `clerkUserId` existe sin exactamente 1 membresía OWNER, se rechaza con 409 y nunca se crea una segunda organización.
- Códigos HTTP dinámicos vía `@Res({ passthrough: true })`: `201 Created` en creación inicial y `200 OK` en reintento idempotente.
- Suite E2E: 23 tests ejecutados con dobles en memoria para Clerk, cero secretos y cero llamadas de red externas. Desde la recuperación del 2026-08-20 se ejecutan bajo el mismo aislamiento estricto de base y credencial separadas descrito arriba.
- Correctivo bloqueante: la suite aislada incluye carreras reales entre dos `clerkUserId` distintos sobre el mismo slug y exige `201 + 409`, una sola Organization y ninguna fila parcial del perdedor. También fuerza una falla de `Clerk.users.getUser()` y exige `503` genérico con cero cambios en User, Organization, Membership y AuditLog. El conflicto Clerk/local queda auditable mediante el evento pre-tenant restringido descrito arriba.
- QA integrado real: el propietario verificó con sesiones Clerk Development el alta inicial (`201`), el reintento idempotente de la misma identidad (`200` y misma organización), el conflicto de slug de una segunda identidad (`409`) y el rechazo de una sesión revocada (`401`). La evidencia se registra sin PII, tokens, claves, cookies ni identificadores sensibles.
- Estado vigente por decisión explícita del propietario: **CERRADO / APROBADO**. La utilidad temporal local de QA fue eliminada y nunca estuvo rastreada.
- Alcance 100% backend. Este cierre no implementa ni autoriza por sí solo A0.3-B.

## Resultado de Security A0.3-B — CERRADO / APROBADO

- Piloto propuesto: `GET /auth/clerk/me`, protegido por el `ClerkAuthGuard` existente seguido de `RolesGuard` y `@Roles(...B2B_ROLES)`.
- Entrada obligatoria: `Authorization: Bearer <session token>` y `x-organization-id` con UUID. El header solo selecciona contexto; la autorización proviene de la sesión Clerk verificada y la Membership local.
- Ambigüedad prohibida e implementada: `x-organization-id` debe aparecer exactamente una vez. `ClerkAuthGuard` inspecciona las ocurrencias reales en `rawHeaders` sin distinguir mayúsculas/minúsculas y devuelve `401` antes de verificar la sesión si llega duplicado, incluso cuando los valores sean iguales. Un valor combinado o de tipo arreglo también se rechaza; nunca se elige el primero.
- Resolución: `sub` verificado → `User.clerkUserId` único → Membership compuesta `userId + organizationId` → rol local actual. No se acepta usuario, rol o tenant como autoridad desde el navegador o metadata Clerk.
- Respuesta `200`: exactamente la misma entidad y lógica de `GET /organizations/mine`, reutilizando `OrganizationsService.findMine()` para evitar dos contratos. La ruta legacy conserva `JwtAuthGuard`, `RolesGuard` y su comportamiento sin cambios.
- Fallos: `401` genérico para sesión inválida/revocada, header ausente o inválido, User no enlazado, Membership inexistente/baja o error inesperado del guard; `403` genérico para un rol local fuera del conjunto B2B. Si el contexto autorizado no encuentra la Organization, se conserva el resultado vigente de `findMine()` para mantener paridad; cualquier endurecimiento común deberá proponerse aparte para no bifurcar contratos.
- Permisos: cualquier Membership local válida de roles B2B (`OWNER`, `ADMIN`, `RECEPTIONIST`, `BARBER`) puede consultar su propia Organization, igual que la ruta legacy. `CUSTOMER` no debe recibir acceso al dashboard; debe probarse explícitamente según la autoridad local vigente.
- Pruebas obligatorias del selector: unitarias de `ClerkAuthGuard` para header único válido, ausente, inválido, arreglo y dos ocurrencias idénticas o distintas, comprobando que los duplicados producen `401` antes de Clerk o PostgreSQL; E2E en PostgreSQL aislado que envíe físicamente dos líneas `x-organization-id` idénticas y confirme `401`, además de la matriz tenant/roles y la paridad de respuesta con la ruta legacy.
- Criterio de QA: la comprobación real se limita a una sesión Clerk válida sobre el tenant autorizado y selector único con `200`; selector ausente/ajeno/duplicado y sesión revocada quedan cubiertos por la E2E aislada, sin repetir escenarios ya validados en A0.3-A ni registrar o exponer token, PII o detalles internos.
- Validación automatizada: API TypeScript, lint y build en exit `0`; 262 unitarias aprobadas y 11 integraciones opt-in omitidas; 36/36 E2E pasaron en una base `_test` propiedad de una credencial no privilegiada dentro de un clúster PostgreSQL temporal separado. La suite incluye dos líneas físicas idénticas de `x-organization-id`, matriz B2B/CUSTOMER, tenant ajeno, enlace/Membership, cambio/baja local, sesión revocada y paridad exacta con JWT legacy. Los clústeres temporales fueron eliminados al finalizar.
- No alcance: no reabre el comportamiento de sesión de A0.2 más allá del rechazo puntual del header duplicado expresamente incluido en A0.3-B; no cambia onboarding, JWT/login/register/password, Prisma, Supabase, frontend ni otras rutas.
- QA integrado real: el propietario confirmó `GET /auth/clerk/me` con una sesión Clerk válida y el selector propio; respondió `200` y la organización coincidió con la ya autorizada. No se repitieron los escenarios de A0.3-A ni se conservaron PII, tokens, claves, cookies o identificadores sensibles. La utilidad temporal ignorada fue eliminada sin entrar en Git.
- Estado: **CERRADO / APROBADO** por decisión explícita del propietario.

## Resultado de Security A0.4 — CERRADO / APROBADO

- `TeamInvitation` es la autoridad local tenant-scoped para invitar personal. Conserva actor, rol, expiración, referencia Clerk, opción BARBER/Professional, estado y timestamps; una restricción PostgreSQL impide invitar como `OWNER`, limita el perfil público a BARBER y evita dos invitaciones abiertas para el mismo tenant/correo.
- OWNER y ADMIN administran invitaciones con una Membership local vigente. Clerk Organizations, metadata cliente, correo o headers no conceden tenant ni rol.
- Las operaciones externas de crear, reenviar y revocar usan estados intermedios locales y no dejan una transacción PostgreSQL abierta durante llamadas a Clerk. Los fallos externos quedan cerrados y son compensados cuando es posible.
- La aceptación valida fuera de la transacción una sesión Clerk auténtica, el perfil retornado para el mismo `sub`, correo principal verificado y la invitación externa aceptada. Después bloquea la fila local y persiste en aislamiento `SERIALIZABLE` User nuevo cuando aplica, Membership, Professional BARBER opcional, estado y AuditLog sin PII.
- Decisión fija: nunca se enlaza automáticamente un User existente por coincidencia de correo. Solo se reutiliza por `clerkUserId`; si el correo pertenece a un User no enlazado o a otra identidad Clerk se responde `409` neutro y la transacción no deja escrituras parciales.
- La aceptación es idempotente para la misma identidad e invitación. Tenant, rol, estado, expiración, concurrencia, colisiones y fallos de Clerk se cubren con pruebas unitarias y E2E PostgreSQL aisladas.
- El checkpoint no modifica `/auth/invite`, JWT/login/register/password, frontend, Supabase ni cuentas existentes. Tampoco envía invitaciones Clerk reales durante la validación automatizada.
- QA integrado posterior con Clerk Development: una aceptación real devolvió `201`, repetirla devolvió `200` y PostgreSQL confirmó una sola Membership y un solo Professional. Una segunda invitación controlada fue revocada y su aceptación posterior devolvió `409` neutro sin acceso adicional. La utilidad temporal ignorada fue eliminada y no se conservaron PII, tokens, claves, cookies ni identificadores sensibles.
- Estado: **CERRADO / APROBADO** por decisión explícita del propietario tras auditoría y QA integrado real. La autorización posterior habilitó exclusivamente A0.5-A backend.

## Resultado de Security A0.5-A — CERRADO / APROBADO

- `GET /auth/clerk/bootstrap` usa el guard de sesión Clerk sin selector tenant para resolver únicamente por `User.clerkUserId`. No busca ni enlaza por correo y no acepta User, Organization o rol desde el cliente.
- El contrato distingue `ONBOARDING_REQUIRED`, `NO_ACCESS` y `READY`. Solo entrega User local mínimo, Memberships con roles B2B y Organizations mínimas; excluye CUSTOMER, PII, identidad Clerk y timestamps. La preferencia solo se devuelve cuando corresponde a una Membership autorizada.
- `B2bAuthGuard` es la compatibilidad temporal de rutas internas: primero verifica un JWT legacy con el secreto vigente y revalida Membership/rol local; cualquier token que no sea un JWT legacy válido se delega al `ClerkAuthGuard`, que mantiene sesión, selector tenant único y Membership local como autoridad. Los `RolesGuard` de cada dominio siguen decidiendo permisos.
- La convivencia se aplica a Organizations, Bookings, Professionals, Services, Clients, Invoices y Analytics. No cambia login, registro, password, `/auth/invite`, onboarding/aceptación Clerk, rutas públicas, JWT emitido, Prisma o Supabase.
- La invitación Clerk recibe una `redirectUrl` configurada por `CLERK_INVITATION_REDIRECT_URL`. El backend valida que sea `http`/`https`, sin credenciales, query ni hash, y no usa fallback. En creación y reenvío agrega el UUID local de `TeamInvitation` como único parámetro de correlación y no depende de `publicMetadata`; tenant, rol e identidad se verifican como en A0.4.
- Cobertura: unitarias de bootstrap, guard dual y configuración/redirección; E2E de estados, privacidad, tenant, rol/baja local, header duplicado y regresión JWT legacy. API TypeScript, lint y build pasaron; 277 unitarias y 55 E2E finalizaron correctamente, estas últimas en un clúster PostgreSQL temporal separado con base `_test` y rol no privilegiado, eliminado al terminar.
- Estado: **CERRADO / APROBADO** por decisión explícita del propietario como parte del cierre completo de Security A0.5. Su cierre no retira por sí solo el rollback legacy ni autoriza Supabase u otro módulo.

## Resultado de Security A0.5-B — CERRADO / APROBADO

- Next.js integra `ClerkProvider`, componentes Clerk localizados y middleware de sesión para login, registro, recuperación, invitaciones y logout. La presencia de sesión en frontend mejora el flujo, pero no concede permisos de negocio.
- El cliente HTTP obtiene el token corto mediante el SDK en cada petición autenticada y añade `x-organization-id` solo desde una Membership incluida en `GET /auth/clerk/bootstrap`. No acepta tenant o rol libres y limpia la caché de negocio al cambiar de contexto sin borrar el bootstrap autoritativo.
- La web elimina la persistencia y consumo de `bf_token`, `bf_session` y la cookie indicadora `kb_session`; durante la transición borra esos artefactos legacy si existen. Los endpoints y secretos JWT/password backend no se retiran en este checkpoint y permanecen como rollback.
- Los estados `ONBOARDING_REQUIRED`, `NO_ACCESS` y `READY` tienen recorridos explícitos. Onboarding consume A0.3-A; aceptación y gestión de invitaciones consumen A0.4. Equipo ya no solicita ni muestra contraseñas temporales y solo OWNER/ADMIN ven la gestión, mientras backend continúa siendo el límite de autorización.
- La selección de organización usa exclusivamente Memberships locales del bootstrap y purga queries de negocio al cambiar de tenant/rol. La información de identidad Clerk no se usa como autoridad de Membership.
- Para invitaciones, el navegador solo interpreta un UUID local único y válido añadido por el servidor, y construye destinos internos fijos. No aporta URL, tenant, rol, correo ni identificador de invitación Clerk. El endpoint existente sigue verificando sesión Clerk, correo principal verificado, invitación externa aceptada, coincidencia de correo, estado local y persistencia `SERIALIZABLE` antes de conceder acceso.
- El QA correctivo con una cuenta Clerk preexistente confirmó aceptación inicial `201`, repetición idempotente `200` y acceso al dashboard. API TypeScript, lint, build y 278 unitarias; Web 5 pruebas de rutas, TypeScript, lint y build; y 11 E2E de invitaciones sobre PostgreSQL temporal aislado finalizaron con exit `0`. Las utilidades temporales fueron eliminadas; la evidencia no registra PII, secretos, sesiones ni identificadores sensibles.
- Web TypeScript, lint y build finalizaron con exit `0`. QA en navegador con sesiones Clerk Development verificó BARBER sin acceso a Equipo, OWNER con gestión de invitaciones, login, recuperación visible, logout, registro visible sin crear cuentas y layouts de 390 px y 1440 px sin overflow. La consola no mostró errores de aplicación; únicamente el aviso esperado de claves Development. No se crearon identidades ni se enviaron invitaciones durante este QA.
- Estado: **CERRADO / APROBADO** por decisión explícita del propietario. El cierre comprende Security A0.5 completo, incluidos los subalcances A, B, C y D; las etiquetas C/D no agregan en este ADR contratos o evidencia distintos de los ya documentados. A0.6 permanece sin implementación hasta autorización posterior.

## Nota operativa de recuperación local — 2026-08-20

- La instancia PostgreSQL nativa tenía las cuatro reglas `host` locales en `trust`. Antes de corregirlas se creó `pg_hba.conf.backup-20260819-234953`; solo esas reglas volvieron a `scram-sha-256` y se verificó una conexión autenticada con contraseña SCRAM.
- `barberflow` era superusuario. Se preservaron el rol, el login, la herencia, su base y sus objetos, retirando únicamente `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION` y `BYPASSRLS`.
- La base nativa inspeccionada tiene 0 Users, 0 Organizations y 0 Memberships. Los 19 usuarios citados por A0.1 son evidencia histórica y no se reinterpretan como estado actual; este saneamiento no eliminó datos.

## Fuera de alcance del diagnóstico Security A0-D

- Instalar Clerk, crear proyectos Supabase o cambiar variables/secrets.
- Modificar endpoints, DTOs, Prisma, dependencias, frontend o base de datos no mencionados.
- Clasificar, fusionar, eliminar o importar usuarios.
- Corregir/cerrar Profesionales A2 o iniciar Servicios.

Aplican [`SECURITY_STANDARD.md`](../quality/SECURITY_STANDARD.md) y [`DELIVERY_GATES.md`](../quality/DELIVERY_GATES.md).
