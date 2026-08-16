# PROJECT_MASTER.md — Verdad vigente de Kortek Booking

Actualizado: 2026-08-15. Este documento describe el producto y el estado actual. El historial completo anterior a G0 se preserva en [`docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md`](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md).

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
- La implementación que ejecuta hoy sigue usando JWT + Passport + bcryptjs; el login recibe email y contraseña, no `organizationId`.
- La arquitectura aprobada migrará identidad y sesiones a Clerk. El UUID de `User` seguirá siendo la identidad local estable y se enlazará de forma única a la identidad Clerk.
- `Organization`, `Membership` y roles continúan como autoridad local; Clerk Organizations no se usará para autorización.
- Security A0.1 añade `User.clerkUserId` nullable y único. Los 19 usuarios existentes conservan UUID, password y datos; todos permanecen sin enlace.
- Security A0.2 instala el SDK backend oficial de Clerk y añade una capa todavía no aplicada a rutas: verifica session tokens y estado remoto, resuelve `sub` por `User.clerkUserId` y vuelve a consultar la `Membership` local en cada petición.

### Seguridad

- Todo dato de negocio debe aislarse por `organizationId` en la consulta autoritativa.
- Guards y roles backend son el límite real; la UI solo representa permisos.
- Recurso ajeno e inexistente comparten respuesta cuando revelar existencia sería un riesgo.
- AuditLog es fail-open en los flujos donde ya se adoptó y no debe guardar PII.
- La autenticación efectiva de todos los endpoints sigue siendo propia y conserva un riesgo crítico confirmado; el guard Clerk A0.2 permanece desacoplado hasta una entrega posterior autorizada.
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

Security A0.2: **IMPLEMENTADO / EN REVISIÓN** (correctivo aplicado). Añade verificación backend, resolución local aislada, inicialización diferida (el proceso arranca sin claves Clerk), `CLERK_AUTHORIZED_PARTIES` separado de `CORS_ALLOWED_ORIGINS` y fallo cerrado en el guard; no protege todavía ningún endpoint ni reemplaza JWT/login/register.

Security A0.3-H: **CERRADO / APROBADO** por el propietario tras validación de 8 tests E2E reales en PostgreSQL aislado y QA de navegador. Hardening legacy y web con los siguientes atributos:
    *   **Registro Atómico Estricto:** La creación de usuario (`User`), inquilino (`Organization`) y el vínculo de propiedad (`Membership` con rol `OWNER`) ocurre en una **transacción PostgreSQL con aislamiento `Serializable`** (`Prisma.TransactionIsolationLevel.Serializable`), previniendo escalamiento y cuentas fantasma por concurrencia. Se incluyen reintentos (max 3) para lidiar con fallas de serialización (`P2034`).
    *   **Inquilinos Aislados:** `POST /organizations` ya no es un endpoint público. Solo un usuario con rol `OWNER` puede crear nuevos tenants adicionales.
    *   **Correo de Organización:** La barbería recibe su propio correo electrónico, disociado del correo personal del propietario, exigido como `organizationEmail` durante el registro inicial.
    *   **Tolerancia a contraseñas nulas:** Las cuentas sin contraseña local (preparación para usuarios autenticados vía Clerk) reciben el mismo rechazo neutro "Credenciales inválidas" en el login legacy en lugar de errores internos de servidor (500). La actualización de contraseñas protege contra bcrypt(null).

Security A0.3-A: **IMPLEMENTADO / EN REVISIÓN** (No aprobado. Entrega estrictamente backend). Onboarding de propietarios con Clerk con los siguientes atributos:
    *   **Endpoint Seguro:** `POST /auth/clerk/onboarding` protegido por `ClerkOnboardingGuard`, verificando sesión activa en Clerk sin requerir inquilino ni usuario previo en PostgreSQL.
    *   **Reutilización Lazy:** Amplía `ClerkClientFactory` con `users.getUser` y reutiliza el cliente ya instanciado en `ClerkSessionVerifierService`.
    *   **Perfil Autoritativo:** Nombre obligatorio resuelto estrictamente desde `firstName`/`lastName` o `username` (400 si falta; prohibido body o metadata). Correo principal verificado obligatorio (403 si no está verificado). Falla externa de Clerk responde 503 sin tocar base de datos.
    *   **Anti-Enlace Neutro:** Rechazo 409 completamente neutro si el correo verificado coincide con un usuario local no enlazado, sin revelar existencia de cuentas.
    *   **Transacción Atómica e Idempotente:** Alta atómica en transacción `SERIALIZABLE` de `User(password: null, clerkUserId, lastOrganizationId: org.id)`, `Organization` (`name`, `slug` normalizado, `email` normalizado) y `Membership(OWNER)` con `AuditLog` sin PII. Reintento acotado a 3 para `P2034`.
    *   **Códigos Dinámicos:** Retorna `201 Created` en alta nueva y `200 OK` en reintento idempotente.
    *   **Control de Estado Parcial:** Si `clerkUserId` existe sin exactamente 1 membresía OWNER, responde 409 y nunca crea una segunda organización.
    *   **Validación:** 250 pruebas unitarias y 18 pruebas E2E contra PostgreSQL en esquema aislado `test` con dobles controlados de Clerk (cero secretos y cero llamadas de red en tests). No incluye frontend ni QA de navegador.

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

- La implementación actual usa JWT propio de un día en `localStorage` y revalida Membership en cada request.
- `POST /organizations` es privado (OWNER) tras A0.3-H. El registro de barberías nuevas es atómico en `/auth/register` usando `organizationName` y `organizationSlug`.
- Recuperación, verificación de correo, MFA, refresh rotativo y revocación general de sesiones no existen; los límites actuales son locales al proceso, no distribuidos.
- Decisión aprobada: Clerk gestionará identidad, login, registro, recuperación y sesiones. NestJS verificará la sesión y resolverá `User` + Membership local en cada petición.
- `Organization`, Membership y rol nunca se derivarán de Clerk Organizations, metadata cliente ni un `organizationId` libre. El onboarding local crea Organization + primera Membership OWNER de forma atómica e idempotente.
- La base A0.2 usa `authenticateRequest()` con session tokens, origins autorizados (`CLERK_AUTHORIZED_PARTIES`, variable independiente de `CORS_ALLOWED_ORIGINS`) y audiencia cuando el token/configuración la define; valida el issuer de la instancia y consulta en Clerk que la sesión siga `active`. Config y cliente Clerk se crean en la primera petición al guard, no al arrancar; si la config no está, el guard falla cerrado con 401 genérico y log interno seguro. Un selector de tenant aportado por el cliente solo elige contexto: la Membership compuesta local debe existir y su rol es el único aceptado.
- `ClerkAuthGuard` no está aplicado a rutas. Los 19 Users siguen sin enlace y ningún flujo los busca por correo.
- Los cambios de contraseña, verificación, MFA, logout y revocación pasarán a Clerk; retirar JWT/password local ocurrirá solo tras QA y ventana de rollback.
- El inventario local encontró 19 Users: 7 coinciden con cuentas QA documentadas localmente y 12 no tienen clasificación comprobable. No hay evidencia de producción, pero esos 12 se preservan hasta clasificación del propietario.

### Persistencia administrada

- Decisión aprobada: Prisma usará PostgreSQL de Supabase; Supabase Auth no se usará.
- La migración conservará schema, extensiones, constraints y `_prisma_migrations`, con ensayo `pg_dump`/restore, reconciliación de datos y rollback probado.
- La migración de PostgreSQL no se mezclará con la migración de identidad Clerk.
- Los planes Free se limitan a desarrollo, QA y ensayo. Clerk Pro y Supabase Pro son gate obligatorio antes del primer tenant externo o de pago en producción.

### Clientes y privacidad

- Clientes inactivos se excluyen por defecto; reservas internas no pueden usarlos.
- Una reserva pública válida puede reactivar al cliente dentro de la misma transacción.
- No existe todavía vínculo `Client ↔ User CUSTOMER`; sigue pendiente para historial/autoservicio B2C.
- Respuestas públicas y proyecciones BARBER minimizan PII y nunca exponen notas internas.

## 6. Proceso vigente

El orden obligatorio es:

```text
Producto y UX → contrato/arquitectura → Backend → aprobación Backend
→ Frontend → QA funcional/visual → auditoría → aprobación explícita
```

Cada módulo comienza con auditoría. No avanzar por el mero hecho de que exista un push. Los checkpoints remotos son evidencia revisable, no aprobación.

## 7. Riesgos y límites conocidos

- JWT en `localStorage`, falta de recuperación/verificación/MFA/revocación general y rate limiting no distribuido amplían el riesgo de cuenta y sesión.
- Doce Users locales no están clasificados como QA o reales; no pueden importarse, fusionarse ni eliminarse por inferencia.
- Clerk/Supabase Free no satisfacen el gate operativo de producción real: Clerk Hobby no ofrece MFA productivo y Supabase Free carece de backups automáticos, puede pausarse y limita la base a 500 MB.
- Frontend general y A2 de Profesionales siguen pendientes de aprobación; el módulo no puede cerrar todavía.
- `Organization.timeZone` existe en persistencia/contratos de disponibilidad, pero todavía no hay UI/endpoint autorizado de configuración general.
- El vínculo B2C `Client ↔ User CUSTOMER` no está implementado.
- Servicios, imágenes y Cloudinary requieren auditoría y decisiones propias; no adelantar.
- Configuración productiva de CORS, URLs y secretos depende del entorno y debe validarse antes de despliegue.
- El guard Clerk consulta el estado autoritativo de sesión en Clerk por petición; latencia, disponibilidad, cuotas y política de fallo cerrado deben medirse antes de aplicarlo masivamente.
- El historial contiene decisiones revocadas válidas en su fecha; nunca debe usarse como estado actual sin contrastar este documento y el código.

## 8. Próximo paso autorizado

1. Security A0.3-A (Onboarding con Clerk Backend): **IMPLEMENTADO / EN REVISIÓN** (No aprobado. Implementado endpoint atómico e idempotente `POST /auth/clerk/onboarding` bajo `ClerkOnboardingGuard`, resolución autoritativa de perfil Clerk con nombre obligatorio y correo verificado 403, anti-enlace 409 neutro, transacción `SERIALIZABLE` con reintento acotado para P2034, 201 inicial y 200 idempotente, y control de estado parcial. 250 unit tests y 18 E2E tests pasando contra PostgreSQL en esquema aislado `test` con dobles de Clerk. No incluye frontend ni QA web).
2. Queda pendiente auditar y cerrar formalmente Security A0.3-A antes de avanzar a la etapa de frontend o a A0.3-B (`GET /auth/clerk/me`).
3. Mantener login/JWT/register/password actuales y los 19 usuarios sin enlace.
4. Mantener Frontend A2 de Profesionales en revisión.

## 9. Política de lenguaje y evidencia

- La UI habla de tareas y consecuencias, no de Prisma, SQL, constraints o códigos internos.
- La UI nunca muestra identificadores IANA, UTC, offsets o detalles de conversión; usa fechas, horas y explicaciones naturales.
- Los errores esperados del API se traducen a mensajes útiles y seguros.
- Toda afirmación de QA indica entorno, rol, acción y resultado real.
- TypeScript, lint, tests y build son necesarios cuando aplican, pero no sustituyen revisión funcional/visual.
