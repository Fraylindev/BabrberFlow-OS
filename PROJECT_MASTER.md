# PROJECT_MASTER.md — Verdad vigente de Kortek Booking

Actualizado: 2026-08-22. Este documento describe el producto y el estado actual. El historial completo anterior a G0 se preserva en [`docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md`](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md).

## 1. Visión

Kortek Booking es un SaaS multi-tenant para operar barberías y salones: organización, equipo, profesionales, servicios, clientes, reservas y facturación. Se construye como producto comercial real, con seguridad backend, datos legítimos, UX responsive y entregas auditables por módulo.

Kortek Studio es la empresa; Kortek Booking es este producto.

## 2. Fuentes de verdad

1. El código real demuestra qué está implementado.
2. Este documento define estado, decisiones activas, riesgos y próximo paso.
3. [`BACKEND_CHANGES.md`](BACKEND_CHANGES.md) documenta contratos y sus cambios.
4. [`CHANGELOG.md`](CHANGELOG.md) conserva el historial cronológico.
5. [`docs/history/`](docs/history/) conserva snapshots; no define comportamiento vigente.

Gobierno y estándares:

- [`docs/README.md`](docs/README.md)
- [`AGENTS.md`](AGENTS.md)
- [`docs/product/PRD.md`](docs/product/PRD.md)
- [`docs/product/APP_FLOWS.md`](docs/product/APP_FLOWS.md)
- [`docs/product/PRODUCT_STANDARD.md`](docs/product/PRODUCT_STANDARD.md)
- [`docs/product/FRONTEND_STANDARD.md`](docs/product/FRONTEND_STANDARD.md)
- [`docs/product/UI_PATTERNS.md`](docs/product/UI_PATTERNS.md)
- [`docs/architecture/TRD.md`](docs/architecture/TRD.md)
- [`docs/architecture/DATA_MODEL.md`](docs/architecture/DATA_MODEL.md)
- [`docs/quality/SECURITY_STANDARD.md`](docs/quality/SECURITY_STANDARD.md)
- [`docs/quality/DELIVERY_GATES.md`](docs/quality/DELIVERY_GATES.md)
- [`docs/quality/DEFINITION_OF_DONE.md`](docs/quality/DEFINITION_OF_DONE.md)

## 3. Arquitectura vigente

### Monorepo

- pnpm + Turborepo.
- `apps/api`: NestJS, Prisma y PostgreSQL.
- `apps/web`: Next.js App Router, React, TypeScript, Tailwind y React Query.
- Cliente HTTP web central: `apps/web/lib/api.ts`.

### Identidad y tenants

- `Organization` es el tenant.
- `User` es identidad global.
- `Membership` relaciona User × Organization × Role.
- Roles internos: `OWNER`, `ADMIN`, `RECEPTIONIST`, `BARBER`.
- `CUSTOMER` pertenece al flujo B2C y no accede al dashboard interno.
- El frontend interno usa Clerk para login, registro, recuperación, logout y sesión. Ya no guarda ni consume el JWT propio en `localStorage`.
- NestJS mantiene temporalmente compatibilidad dual en rutas B2B: JWT legacy revalidado o sesión Clerk verificada. El UUID de `User` sigue siendo la identidad local estable y se enlaza de forma única a la identidad Clerk.
- `Organization`, `Membership` y roles continúan como autoridad local; Clerk Organizations no se usará para autorización.
- Security A0.1 añade `User.clerkUserId` nullable y único. La auditoría de aquel entorno preservó 19 usuarios sin enlace; ese conteo es evidencia histórica, no un invariante ni el estado de la instancia PostgreSQL nativa actual.
- Security A0.2 instaló el SDK backend oficial de Clerk; A0.5-A aplica esa verificación a rutas B2B mediante la compatibilidad dual. Verifica session tokens y estado remoto, resuelve `sub` por `User.clerkUserId` y vuelve a consultar la `Membership` local en cada petición.

### Seguridad

- Todo dato de negocio debe aislarse por `organizationId` en la consulta autoritativa.
- Guards y roles backend son el límite real; la UI solo representa permisos.
- Recurso ajeno e inexistente comparten respuesta cuando revelar existencia sería un riesgo.
- AuditLog es fail-open en los flujos donde ya se adoptó y no debe guardar PII.
- Las rutas internas B2B aceptan temporalmente JWT legacy o Clerk mediante `B2bAuthGuard`; en ambos casos NestJS vuelve a resolver Membership y rol locales. Los endpoints legacy permanecen como rollback backend, pero la web A0.5-B ya no los consume.
- La decisión aprobada es usar Clerk para identidad/sesiones y NestJS + Membership local para autorización. [`ADR-001`](docs/decisions/ADR-001-authentication-strategy.md) define el diseño y el avance incremental de Security A0.
- Prisma se mantendrá sobre PostgreSQL y la base se trasladará a Supabase en checkpoints separados de la migración Clerk. No se usará Supabase Auth.

### Frontend

- Dashboard con tema claro basado en `--dash-*`.
- React Query gestiona datos remotos y sus query keys deben aislar tenant/rol/usuario cuando cambie el alcance.
- Las pantallas deben cubrir loading, empty, error, pending y success, además de responsive y accesibilidad básica.
- Una build limpia no aprueba una interfaz: se exige QA real en navegador.

## 4. Estado de módulos

| Orden | Módulo | Estado vigente | Checkpoint / nota |
| --- | --- | --- | --- |
| 1 | Reservas | **CERRADO / APROBADO** | Funcional aprobado `9a30f2abb37857dbbbf15e34df1cbaec576121b6`; A0 transversal aprobado `8964c981223ba3f4a1e780103cbc0d20e4c602eb` |
| 2 | Clientes | **CERRADO / APROBADO** | Backend `18a3605329ad0ce708a44ac8fcd5db1dd1665732`; módulo cerrado `c0764e9a98e3876339152763bf9b0fc98fe43aae` |
| 3 | Profesionales A1 Backend | **CERRADO / APROBADO** | `60919ee94eb27f628906c9b86ce7a43b2fa09237` |
| 3 | Profesionales Frontend general | **IMPLEMENTADO / EN REVISIÓN** | CRUD, permisos, responsive y búsqueda; todavía no aprobado |
| 3 | Profesionales A2 Backend | **CERRADO / APROBADO** | Disponibilidad individual `ad633e9864e6e20869d0db248861f01b935d5a6f` |
| 3 | Profesionales A2 Frontend | **IMPLEMENTADO / EN REVISIÓN** | Candidato `75b35f7f6fdd69a18e3fcede8fcaf4f39e57f06b` |
| 3 | Módulo Profesionales | **NO CERRADO / NO APROBADO** | Pendiente de auditoría y aprobación frontend |
| 4 | Servicios | **NO INICIADO en el ciclo modular vigente** | No autorizado mientras Profesionales siga abierto |
| 5–8 | Facturación, Equipo, Configuración, Analytics | **PENDIENTES** | Seguir orden modular y auditoría previa |
| 9 | Resumen / Dashboard | **CONGELADO** | Se revisa al final como agregador |

G0 es un checkpoint exclusivamente documental de gobierno. No cambia el estado funcional ni aprueba Frontend A2.

Estado de G0: **IMPLEMENTADO / EN REVISIÓN**. G0.1 corrige y completa sus fuentes como checkpoint documental candidato; ninguno de los dos es aprobación funcional de un módulo.

Security A0-D: **CERRADO / APROBADO** por el propietario sobre `66e1c094b47e8bc7265803c122d851125023ce94`.

Security A0.1: **IMPLEMENTADO / EN REVISIÓN**. Añade únicamente la base nullable/única de enlace Clerk; no cambia login ni enlaza usuarios.

Security A0.2: **IMPLEMENTADO / EN REVISIÓN** (correctivo aplicado). Añade verificación backend, resolución local aislada, inicialización diferida (el proceso arranca sin claves Clerk), `CLERK_AUTHORIZED_PARTIES` separado de `CORS_ALLOWED_ORIGINS` y fallo cerrado en el guard. A0.3-B reutiliza esta capa únicamente en su endpoint piloto; no reemplaza JWT/login/register.

Security A0.3-H: **CERRADO / APROBADO** por decisión explícita del propietario. Hardening legacy y web con los siguientes atributos:
    *   **Registro Atómico Estricto:** La creación de usuario (`User`), inquilino (`Organization`) y el vínculo de propiedad (`Membership` con rol `OWNER`) ocurre en una **transacción PostgreSQL con aislamiento `Serializable`** (`Prisma.TransactionIsolationLevel.Serializable`), previniendo escalamiento y cuentas fantasma por concurrencia. Se incluyen reintentos (max 3) para lidiar con fallas de serialización (`P2034`).
    *   **Inquilinos Aislados:** `POST /organizations` ya no es un endpoint público. Solo un usuario con rol `OWNER` puede crear nuevos tenants adicionales.
    *   **Correo de Organización:** La barbería recibe su propio correo electrónico, disociado del correo personal del propietario, exigido como `organizationEmail` durante el registro inicial.
    *   **Tolerancia a contraseñas nulas:** Las cuentas sin contraseña local (preparación para usuarios autenticados vía Clerk) reciben el mismo rechazo neutro "Credenciales inválidas" en el login legacy en lugar de errores internos de servidor (500). La actualización de contraseñas protege contra bcrypt(null).
    *   **Evidencia recuperada:** API TypeScript/lint/build/Prisma y Web TypeScript/lint/build están en exit 0; 257 unit tests y 21 E2E pasaron. Un smoke HTTP real confirmó registro 201, login 201, CORS para la web, rechazo 400 de `organizationId`, protección 401 de `POST /organizations` y conteos atómicos `1|1|1|1`.
    *   **QA manual y cierre:** el propietario confirmó en navegador el registro, cierre de sesión e inicio con credenciales válidas; credenciales inválidas muestran el mensaje genérico esperado. La decisión posterior del propietario cerró y aprobó A0.3-H.

Security A0.3-A: **CERRADO / APROBADO** por decisión explícita del propietario. Onboarding backend de propietarios con Clerk con los siguientes atributos:
    *   **Endpoint Seguro:** `POST /auth/clerk/onboarding` protegido por `ClerkOnboardingGuard`, verificando sesión activa en Clerk sin requerir inquilino ni usuario previo en PostgreSQL.
    *   **Helper Compartido:** Conversión unificada de peticiones Express a Web Fetch API Request (`toWebRequest`) compartida entre `ClerkAuthGuard` y `ClerkOnboardingGuard`.
    *   **Reutilización Lazy:** Amplía `ClerkClientFactory` con `users.getUser` y reutiliza el cliente ya instanciado en `ClerkSessionVerifierService`.
    *   **Perfil Autoritativo con Validación de ID:** Validación estricta de que el perfil devuelto por `users.getUser` posea exactamente el mismo `id` que el `clerkUserId` autenticado (401 antes de tocar PostgreSQL si no coincide). Nombre obligatorio resuelto de `firstName`/`lastName` o `username` (400 si falta; prohibido body o metadata). Correo principal verificado obligatorio (403 si no está verificado). Falla externa de Clerk responde 503 sin tocar base de datos.
    *   **Anti-Enlace Neutro y Auditable:** Rechazo 409 completamente neutro si el correo verificado coincide con un usuario local no enlazado, sin revelar existencia de cuentas. Se registra `CLERK_ONBOARDING_EMAIL_CONFLICT` sin PII ni IDs; como el conflicto sucede antes de tener tenant, `AuditLog.organizationId` es `NULL` solo para este evento y una restricción PostgreSQL prohíbe usar esa excepción con otra acción o con `userId`/`entityId`.
    *   **Transacción Atómica e Idempotente:** Alta atómica en transacción `SERIALIZABLE` de `User(password: null, clerkUserId, lastOrganizationId: org.id)`, `Organization` (`name`, `slug` normalizado, `email` normalizado) y `Membership(OWNER)` con `AuditLog` sin PII. Reintento acotado a 3 para `P2034`.
    *   **Códigos Dinámicos y Concurrencia:** Retorna `201 Created` en alta nueva y `200 OK` en reintento idempotente. Resuelve de forma idempotente ante ráfagas concurrentes `Promise.all` garantizando exactamente 1 User, 1 Organization, 1 Membership OWNER y 1 AuditLog. Rollback atómico total garantizado si falla `logTransactional`.
    *   **Control de Estado Parcial:** Si `clerkUserId` existe sin exactamente 1 membresía OWNER, responde 409 y nunca crea una segunda organización.
    *   **Validación recuperada:** API TypeScript/lint/build, Prisma validate/generate y 258 unitarias pasaron; las 23 E2E se ejecutan contra una base separada `kortek_e2e_test`, propiedad de un usuario distinto y sin privilegios globales. El guard comprueba en PostgreSQL real que esa credencial no puede conectar a la base principal. Cubren dos identidades compitiendo por el mismo slug (`201 + 409`, un único agregado ganador y cero filas parciales perdedoras) y fallo de `Clerk.users.getUser()` (`503`, cero escrituras). Web TypeScript/lint/build pasó como regresión. `schema=test` dentro de la base principal no es aceptado.
    *   **QA integrado real y cierre:** el propietario verificó con sesiones reales de Clerk Development el alta inicial (`201`), el reintento idempotente de la misma identidad (`200` y la misma organización), el conflicto de un segundo usuario sobre el mismo slug (`409`) y el rechazo de una sesión revocada (`401`). La evidencia no registra PII, tokens, claves, cookies ni identificadores sensibles. La utilidad local temporal usada para el QA fue eliminada y nunca formó parte de Git.

Security A0.3-B: **CERRADO / APROBADO** por decisión explícita del propietario. `GET /auth/clerk/me` usa `ClerkAuthGuard`, `RolesGuard` y `B2B_ROLES`; resuelve `User.clerkUserId`, Membership y rol locales en cada petición y delega directamente en `OrganizationsService.findMine()`, manteniendo paridad completa con `GET /organizations/mine` sin modificar la ruta JWT legacy. `x-organization-id` sigue siendo solo selector y debe aparecer exactamente una vez: el guard devuelve `401` antes de Clerk/PostgreSQL ante ausencia, formato inválido, arreglo, valor combinado o duplicado, incluso si los valores repetidos son iguales. API TypeScript, lint y build pasaron; 262 unitarias y 36 E2E pasaron, estas últimas sobre una base `_test` y credencial no privilegiada dentro de un clúster PostgreSQL temporal separado que fue eliminado al terminar. El propietario confirmó además el QA integrado real con una sesión Clerk válida: `GET /auth/clerk/me` respondió `200` y la organización coincidió con la ya autorizada. La evidencia no conserva PII, tokens, claves, cookies ni identificadores sensibles; la utilidad temporal ignorada fue eliminada sin entrar en Git.

Security A0.4: **CERRADO / APROBADO** por decisión explícita del propietario. Incorpora invitaciones tenant-scoped de Equipo mediante Clerk para roles `ADMIN`, `BARBER` y `RECEPTIONIST`; `OWNER` nunca es invitable. OWNER/ADMIN pueden crear, listar, reenviar y revocar dentro de su organización. La aceptación exige una sesión Clerk real, valida fuera de la transacción la invitación externa aceptada y su correo principal verificado, y persiste en una transacción `SERIALIZABLE` el User nuevo cuando corresponde, Membership, Professional BARBER opcional, estado local y AuditLog sin PII. Nunca enlaza un User local por coincidencia de correo: cualquier colisión con un User sin enlace o enlazado a otra identidad produce `409` neutro y rollback total. Las llamadas a Clerk no mantienen transacciones PostgreSQL abiertas y los estados intermedios permiten fallo cerrado, reintento y compensación. La validación cubrió tipos, lint, build, pruebas unitarias y 11 E2E sobre PostgreSQL temporal estrictamente aislado. El QA integrado posterior usó sesiones reales de Clerk Development: la primera aceptación devolvió `201`, su repetición idempotente `200`, una segunda invitación fue revocada y su aceptación posterior devolvió `409` neutro; PostgreSQL confirmó exactamente una Membership y un Professional para la invitación aceptada, sin duplicados. La utilidad temporal ignorada fue eliminada y la evidencia no conserva PII, tokens, claves, cookies ni identificadores sensibles. No se modificó frontend productivo.

Security A0.5-A — Preparación backend: **CERRADO / APROBADO** por decisión explícita del propietario como parte del cierre completo A0.5. Añade `GET /auth/clerk/bootstrap`, protegido por sesión Clerk verificada sin exigir todavía selector tenant, para devolver únicamente el estado `ONBOARDING_REQUIRED`, `NO_ACCESS` o `READY`, el User local mínimo y sus Memberships B2B autorizadas. Las rutas internas de negocio usan temporalmente `B2bAuthGuard`: un JWT legacy válido conserva su contexto tras revalidar Membership local, mientras una sesión Clerk exige exactamente un `x-organization-id` y vuelve a resolver User, Membership y rol locales. Login, registro, invitación y contraseñas legacy no cambian. La creación y el reenvío de invitaciones construyen en servidor una URL desde `CLERK_INVITATION_REDIRECT_URL` y agregan únicamente el UUID local de `TeamInvitation`; no dependen de metadata pública Clerk ni aceptan destinos o autoridad desde el navegador. No cambia Prisma ni Supabase. API TypeScript, lint, build, 277 pruebas unitarias y 55 E2E pasaron; las E2E usaron PostgreSQL temporal separado, base `_test` y rol no privilegiado, eliminados al finalizar.

Security A0.5-B — Frontend de identidad Clerk: **CERRADO / APROBADO** por decisión explícita del propietario como parte del cierre completo A0.5. La web usa el SDK oficial de Clerk para login, registro, recuperación y logout; obtiene el token corto de la sesión en memoria y usa `GET /auth/clerk/bootstrap` para resolver estado, User mínimo y Memberships locales. `x-organization-id` se selecciona únicamente entre Memberships devueltas por NestJS, nunca desde datos libres del navegador, y al cambiar de organización se purga la caché de negocio sin borrar el bootstrap autoritativo. Onboarding usa el contrato aprobado de A0.3-A y Equipo consume las invitaciones A0.4 sin contraseñas temporales. En el retorno de una invitación, la web acepta como localizador exclusivamente un único UUID local válido y solo construye rutas internas fijas de aceptación, inicio de sesión y finalización; no acepta redirects, tenant, rol, correo ni identificadores Clerk como autoridad. El endpoint conserva sesión Clerk, correo principal verificado, aceptación externa real, coincidencia de correo, estado local y transacción `SERIALIZABLE`. Las rutas backend JWT/login/register/password legacy siguen disponibles para rollback, pero la web productiva ya no guarda `bf_token`, `bf_session` ni la cookie indicadora legacy. El QA correctivo real con una cuenta Clerk preexistente confirmó aceptación `201`, repetición idempotente `200` y acceso al dashboard. API TypeScript, lint, build y 278 unitarias; Web 5 pruebas de rutas, TypeScript, lint y build; y 11 E2E de invitaciones sobre PostgreSQL temporal aislado finalizaron con exit `0`. Las dos invitaciones técnicas anteriores quedaron revocadas con trazabilidad y se retiraron exactamente dos identidades técnicas sin User local; la evidencia no conserva PII, tokens, claves, cookies ni identificadores sensibles.

Security A0.5 completo — subalcances A, B, C y D: **CERRADO / APROBADO** por decisión explícita del propietario. Las etiquetas técnicas conservadas en este documento describen A, B y el correctivo final publicado; el cierre A–D no añade comportamiento ni evidencia distintos de los ya registrados y auditados.

Security A0.6-A — Base backend B2C posterior a reserva: **CERRADO / APROBADO** por decisión explícita del propietario sobre `cbd7b8762b24ddc6802051e98ebb128d53f5f99e`. `Client.userId` es nullable y enlaza explícitamente una identidad global sin crear `Membership CUSTOMER`; una restricción única `[organizationId, userId]` permite como máximo un Client por identidad y tenant sin alterar los registros existentes. `POST /auth/clerk/customer/claims` exige sesión Clerk válida y solo acepta `bookingId` y `organizationSlug` como localizadores. La reserva y el Client se resuelven y bloquean con aislamiento tenant-scoped dentro de una transacción PostgreSQL `SERIALIZABLE`; la primera reclamación devuelve `201`, la repetición de la misma identidad `200`, y colisiones o identidades distintas reciben `409` genérico sin escrituras parciales. El correo verificado solo comprueba que la persona reclama su registro: nunca enlaza un User local preexistente por coincidencia, incluidos CUSTOMER legacy. El alta opcional crea un User Clerk sin password ni Membership y registra `LINK Client` atómicamente sin PII. El contrato público legacy, el password y el flujo actual de reserva permanecen sin cambios. La evidencia aprobada incluye Prisma validate/generate, API TypeScript/lint/build, 286 unitarias y 5 E2E PostgreSQL aisladas sobre idempotencia, concurrencia, colisión legacy, privacidad tenant y ausencia de Membership, todas con exit `0`. El clúster temporal se eliminó al terminar. A0.6-B/C/D no están implementados.

## 5. Decisiones activas de dominio

### Reservas y facturación

- Booking y Payment/Invoice son conceptos separados.
- Completar una reserva no significa cobrarla.
- Reservas no crea ni gestiona pagos.
- No se eliminan físicamente reservas; se usa ciclo de estados.
- La base PostgreSQL impide solapamientos operativos concurrentes para un mismo profesional y excluye `CANCELLED`.

### Profesionales y servicios

- Professional usa `ACTIVE`, `INACTIVE`, `ARCHIVED`; archivar no es hard-delete.
- Operaciones que ocupan agenda y archivo comparten un bloqueo PostgreSQL tenant-scoped.
- Cualquier profesional activo puede realizar cualquier servicio activo de su organización en esta fase.
- `ProfessionalService` no bloquea reservas; queda reservado para capacidades futuras.
- No implementar imágenes/Cloudinary ni páginas individuales sin autorización.

### Disponibilidad individual

- `Organization.timeZone` es la zona IANA autoritativa; el valor inicial actual es `America/Santo_Domingo`.
- Disponibilidad efectiva = horario global ∩ horario individual − bloqueos activos − reservas operativas.
- Cero turnos individuales significa heredar el horario global.
- Bloqueos usan timestamps con `Z` u offset explícito, estado `ACTIVE/CANCELLED` y nota interna.
- Cambios que afectarían reservas futuras abiertas devuelven `409`.
- La disponibilidad pública nunca expone notas o motivos internos.
- IANA, UTC, offsets y conversiones son detalles internos. La UI debe presentar fechas y horas naturales en el contexto del negocio.

### Autenticación

- La web interna usa la sesión Clerk y no persiste JWT propio en `localStorage`. NestJS conserva temporalmente JWT legacy como rollback backend y revalida Membership en cada request.
- `POST /organizations` es privado (OWNER) tras A0.3-H. El registro de barberías nuevas es atómico en `/auth/register` usando `organizationName` y `organizationSlug`.
- El frontend Clerk ya ofrece recuperación, verificación y revocación de sesión. MFA productivo continúa sujeto al gate de plan y configuración; los límites de operaciones sensibles de NestJS siguen locales al proceso y deben ser distribuidos antes de producción horizontal.
- Decisión aprobada: Clerk gestionará identidad, login, registro, recuperación y sesiones. NestJS verificará la sesión y resolverá `User` + Membership local en cada petición.
- `Organization`, Membership y rol nunca se derivarán de Clerk Organizations, metadata cliente ni un `organizationId` libre. El onboarding local crea Organization + primera Membership OWNER de forma atómica e idempotente.
- La base A0.2 usa `authenticateRequest()` con session tokens, origins autorizados (`CLERK_AUTHORIZED_PARTIES`, variable independiente de `CORS_ALLOWED_ORIGINS`) y audiencia cuando el token/configuración la define; valida el issuer de la instancia y consulta en Clerk que la sesión siga `active`. Config y cliente Clerk se crean en la primera petición al guard, no al arrancar; si la config no está, el guard falla cerrado con 401 genérico y log interno seguro. Un selector de tenant aportado por el cliente solo elige contexto: la Membership compuesta local debe existir y su rol es el único aceptado.
- `ClerkAuthGuard` participa en las rutas B2B a través de `B2bAuthGuard`; ningún flujo enlaza usuarios por correo. La evidencia histórica de A0.1 registró 19 Users sin enlace; la instancia PostgreSQL nativa inspeccionada el 2026-08-20 contiene 0 Users, 0 Organizations y 0 Memberships, sin que este saneamiento eliminara filas.
- Login, registro, recuperación y logout de la web ya pasan por Clerk. Retirar JWT/password y endpoints legacy del backend ocurrirá solo tras auditoría, aprobación y ventana de rollback.
- El inventario histórico encontró 19 Users: 7 coincidían con cuentas QA documentadas localmente y 12 no tenían clasificación comprobable. No deben importarse, fusionarse ni eliminarse por inferencia. La instancia nativa actual está vacía; no se asume que sea la misma fuente histórica.

### Persistencia administrada

- Decisión aprobada: Prisma usará PostgreSQL de Supabase; Supabase Auth no se usará.
- La migración conservará schema, extensiones, constraints y `_prisma_migrations`, con ensayo `pg_dump`/restore, reconciliación de datos y rollback probado.
- La migración de PostgreSQL no se mezclará con la migración de identidad Clerk.
- Los planes Free se limitan a desarrollo, QA y ensayo. Clerk Pro y Supabase Pro son gate obligatorio antes del primer tenant externo o de pago en producción.

### Clientes y privacidad

- Clientes inactivos se excluyen por defecto; reservas internas no pueden usarlos.
- Una reserva pública válida puede reactivar al cliente dentro de la misma transacción.
- A0.6-A incorpora el vínculo backend explícito `Client.userId` sin Membership CUSTOMER. La entrada desde el flujo público y el autoservicio B2C siguen pendientes de A0.6-B/C/D.
- Respuestas públicas y proyecciones BARBER minimizan PII y nunca exponen notas internas.

## 6. Proceso vigente

El orden obligatorio es:

```text
Producto y UX → contrato/arquitectura → Backend → aprobación Backend
→ Frontend → QA funcional/visual → auditoría → aprobación explícita
```

Cada módulo comienza con auditoría. No avanzar por el mero hecho de que exista un push. Los checkpoints remotos son evidencia revisable, no aprobación.

## 7. Riesgos y límites conocidos

- El JWT propio en `localStorage` y la falta de recuperación/verificación/revocación en la web quedaron resueltos por A0.5. Permanecen como riesgos: MFA productivo sujeto al gate de plan y configuración, rate limiting no distribuido y endpoints JWT/password legacy conservados temporalmente para rollback backend.
- Doce Users del inventario histórico no están clasificados como QA o reales; no pueden importarse, fusionarse ni eliminarse por inferencia.
- El 2026-08-20 se encontró que las cuatro reglas TCP locales de `pg_hba.conf` usaban `trust` y que `barberflow` era superusuario. Se creó la copia `pg_hba.conf.backup-20260819-234953`, se restauraron solo esas reglas `host` a `scram-sha-256`, el servicio quedó en inicio manual y se verificó conexión con contraseña SCRAM. `barberflow` conserva login, herencia y propiedad de su base/objetos, pero ya no tiene `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION` ni `BYPASSRLS`.
- Clerk/Supabase Free no satisfacen el gate operativo de producción real: Clerk Hobby no ofrece MFA productivo y Supabase Free carece de backups automáticos, puede pausarse y limita la base a 500 MB.
- Frontend general y A2 de Profesionales siguen pendientes de aprobación; el módulo no puede cerrar todavía.
- `Organization.timeZone` existe en persistencia/contratos de disponibilidad, pero todavía no hay UI/endpoint autorizado de configuración general.
- El vínculo backend B2C de A0.6-A está aprobado; todavía no existe el recorrido público posterior a reserva ni el historial/autoservicio del cliente.
- Servicios, imágenes y Cloudinary requieren auditoría y decisiones propias; no adelantar.
- Configuración productiva de CORS, URLs y secretos depende del entorno y debe validarse antes de despliegue.
- El guard Clerk consulta el estado autoritativo de sesión en Clerk por petición; latencia, disponibilidad, cuotas y política de fallo cerrado deben medirse antes de aplicarlo masivamente.
- El historial contiene decisiones revocadas válidas en su fecha; nunca debe usarse como estado actual sin contrastar este documento y el código.

## 8. Próximo paso autorizado

1. Security A0.5 completo (A, B, C y D) está **CERRADO / APROBADO** por decisión explícita del propietario.
2. Security A0.6-A está **CERRADO / APROBADO** por decisión explícita del propietario.
3. Preparar únicamente el análisis y plan de Security A0.6-B; su implementación permanece **PENDIENTE DE AUTORIZACIÓN**.
4. A0.6-C, A0.6-D, Supabase y cualquier otro alcance permanecen bloqueados hasta autorización explícita.
5. Mantener login/JWT/register/password y `/auth/invite` legacy del backend como rollback; la web no debe volver a consumirlos ni persistir su JWT.
6. Nunca enlazar usuarios por coincidencia de correo y mantener Frontend A2 de Profesionales en revisión.

## 9. Política de lenguaje y evidencia

- La UI habla de tareas y consecuencias, no de Prisma, SQL, constraints o códigos internos.
- La UI nunca muestra identificadores IANA, UTC, offsets o detalles de conversión; usa fechas, horas y explicaciones naturales.
- Los errores esperados del API se traducen a mensajes útiles y seguros.
- Toda afirmación de QA indica entorno, rol, acción y resultado real.
- TypeScript, lint, tests y build son necesarios cuando aplican, pero no sustituyen revisión funcional/visual.
