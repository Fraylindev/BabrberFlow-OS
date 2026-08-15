# ADR-001 — Identidad con Clerk y persistencia PostgreSQL en Supabase

- Estado: **Security A0-D CERRADO / APROBADO; Security A0.1 y A0.2 implementados / en revisión**
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

El código todavía implementa autenticación propia:

- [`OrganizationsController`](../../apps/api/src/organizations/organizations.controller.ts) expone `POST /organizations` sin guard.
- `GET /organizations/by-slug/:slug` es público y [`OrganizationsService`](../../apps/api/src/organizations/organizations.service.ts) proyecta `{ id, name, slug }`.
- [`RegisterDto`](../../apps/api/src/auth/dto/register.dto.ts) acepta `organizationId` enviado por el cliente.
- [`AuthService.register()`](../../apps/api/src/auth/auth.service.ts) crea `User` y `Membership OWNER` para ese ID.
- [`auth-context.tsx`](../../apps/web/lib/auth-context.tsx) guarda `bf_token` y `bf_session` en `localStorage`; [`proxy.ts`](../../apps/web/proxy.ts) solo comprueba una cookie indicadora `kb_session`.
- [`JwtStrategy`](../../apps/api/src/auth/strategies/jwt.strategy.ts) revalida la Membership por petición. Este control local es correcto y debe conservarse con Clerk.

La composición pública permite solicitar OWNER sobre una Organization existente. Además, el JWT dura un día, los límites de intentos viven en memoria y no existen recuperación, verificación, MFA ni revocación general de sesiones. Security A0 debe cerrar esos riesgos sin trasladar la autorización de negocio al proveedor de identidad.

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
5. **Security A0.5 — frontend de identidad:** Clerk login/register/recovery/logout; retirar `localStorage` tras QA.
6. **Security A0.6 — CUSTOMER:** registro/enlace posterior al booking público.
7. **Security A0.7 — retiro legado:** passwords/JWT/endpoints/secrets propios, solo tras ventana de rollback.
8. **Data D0.1 — Supabase preparado:** proyecto QA, roles, SSL, conexión y ensayo vacío; sin migrar identidad.
9. **Data D0.2 — ensayo de datos:** dump/restore QA y reconciliación completa.
10. **Data D0.3 — cutover:** traslado controlado de PostgreSQL con freeze y rollback probado.
11. **Data D0.4 — operación:** backups, alertas, restore periódico y gate de pago/productivo.

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

## Resultado de Security A0.2

- `@clerk/backend` crea el cliente backend con secretos obtenidos exclusivamente del entorno; ningún valor se registra o versiona.
- `authenticateRequest()` acepta solo `session_token` y verifica firma/JWKS, expiración y claims temporales. `authorizedParties` se deriva de los orígenes CORS exactos; la audiencia se pasa cuando `CLERK_JWT_AUDIENCE` está definida. El issuer se compara con el Frontend API codificado en `CLERK_PUBLISHABLE_KEY`.
- Tras la verificación criptográfica, `sessions.getSession()` exige una sesión `active` del mismo `sub`. La revocación, expiración/finalización, sujeto distinto o fallo de Clerk producen `401` sin detalles internos.
- El guard busca `User` únicamente por `clerkUserId`, nunca por correo. Después exige la Membership compuesta para el selector UUID de Organization y construye el contexto con el rol local actual. Claims o headers de rol/usuario no participan en la autorización.
- Cambiar el rol o eliminar la Membership tiene efecto en la siguiente petición. Un User no enlazado y un User sin Membership se rechazan de forma segura.
- La capa está registrada pero no aplicada a controllers. Los endpoints actuales conservan JWT propio; login/register/password, los 19 usuarios existentes, Prisma, Supabase y frontend no cambian.
- Los tests de A0.2 son aislados y no consumen sesiones ni secretos reales. Cubren sesión válida/inválida, issuer, estado remoto, enlace local, Membership y revocación local de acceso.

## Fuera de alcance del diagnóstico Security A0-D

- Instalar Clerk, crear proyectos Supabase o cambiar variables/secrets.
- Modificar endpoints, DTOs, Prisma, dependencias, frontend o base de datos.
- Clasificar, fusionar, eliminar o importar usuarios.
- Corregir/cerrar Profesionales A2 o iniciar Servicios.

Aplican [`SECURITY_STANDARD.md`](../quality/SECURITY_STANDARD.md) y [`DELIVERY_GATES.md`](../quality/DELIVERY_GATES.md).
