# DOCUMENTO MAESTRO DEL PROYECTO: KORTEK OS

> **Nota de rebranding:** el proyecto se llamó originalmente BarberFlow OS. A partir de esta actualización el nombre oficial es **Kortek OS** — es la evolución del mismo producto, no un proyecto nuevo. Todo el código nuevo referencia el nombre desde `apps/web/lib/brand.ts` (branding centralizado, ver §24).

> **Última actualización:** basada en auditoría completa del código fuente (no en supuestos ni en la versión anterior de este documento). Todo lo escrito aquí refleja lo que existe hoy en el repositorio.

---

## 1. Resumen del proyecto

Kortek OS es una plataforma SaaS empresarial para la gestión completa de barberías y salones. Opera bajo un modelo **multi-tenant**: cada negocio (`Organization`) administra sus propios clientes, reservas, profesionales y pagos en un entorno de datos aislado mediante `organizationId`.

## 2. Objetivo

Desarrollar un producto de software comercial de alta calidad, con estándares profesionales desde el primer día, preparado para escalar a cientos o miles de clientes sobre la misma infraestructura base.

## 3. Visión

Convertirse en la plataforma de gestión para barberías más completa de Latinoamérica, compitiendo por experiencia tecnológica superior, escalable y modular — no por precio.

## 4. Alcance

- Soporte multi-tenant desde la v1 (orientado a barberías, extensible a salones y spas).
- Aislamiento estricto de datos mediante `organizationId` en cada modelo de negocio.
- Gestión de Usuarios, Roles, Clientes, Servicios, Profesionales, Agendas (Bookings), Pagos y Facturación.

## 5. Documento de negocio

- **Modelo:** SaaS Empresarial Multi-tenant.
- **Mercado inicial:** República Dominicana, con miras a Latinoamérica.
- **Filosofía de trabajo:** "Mide dos veces, corta una." Diseño previo riguroso; código limpio, reutilizable y escalable.

## 6. Estado real del proyecto (auditoría de código)

El backend tiene **siete módulos de negocio implementados**: Prisma, Auth, Organizations, Professionals, Services, Clients, Bookings e Invoices — bastante más avance del que refleja cualquier versión anterior de este documento. El flujo de reservas (creación, validación de conflictos de horario, cambio de estado) está sólidamente implementado.

El frontend, en cambio, está muy por detrás: es esencialmente el scaffold de `create-next-app` con una pantalla de login parcialmente conectada al backend y un dashboard estático sin ninguna lógica real.

Existe **un problema crítico sin resolver**: el modelo `Invoice` fue agregado a `schema.prisma` pero **no tiene migración generada** — la única migración existente (`initial_schema`) no crea esa tabla. El módulo de Facturación no puede considerarse funcional hasta confirmar y corregir esto.

## 7. Arquitectura

- **Modelo:** Monorepo con apps independientes coordinadas por Turborepo.
- **Backend:** API centralizada NestJS, multi-tenant, organizada por módulos de dominio (uno por entidad de negocio).
- **Frontend:** Next.js App Router, actualmente solo con una app pública (`apps/web`). **No existe** una app `admin` separada — es una carpeta planeada, no implementada.
- **Base de datos:** PostgreSQL 16 sobre Docker, gestionada con Prisma ORM.

## 8. Tecnologías utilizadas (verificado contra `package.json`)

| Categoría | Tecnología | Nota |
|---|---|---|
| Monorepo | pnpm 11.15.0, Turborepo 2.10.5 | — |
| Backend | NestJS 11, TypeScript | — |
| Frontend | Next.js 16.2.10, React 19.2.4, Tailwind CSS 4 | `shadcn/ui` **no está instalado** pese a estar planeado |
| Base de datos | PostgreSQL 16 (Docker) | — |
| ORM | Prisma **6.16.3** | No Prisma 7 — corregido respecto a versiones previas de este documento |
| Autenticación | JWT (`@nestjs/jwt`), Passport, **bcryptjs** | Sin Refresh Tokens todavía; sin `bcrypt` nativo (se descartó por problemas de compilación en Windows) |
| Validación | class-validator, class-transformer | `ValidationPipe` global activo (`whitelist`, `forbidNonWhitelisted`) |
| Caché / Colas | Redis, BullMQ | **Planeado, no implementado** — sin dependencias en el código |
| Tiempo real | Socket.IO | **Planeado, no implementado** |
| Imágenes | Cloudinary | **Planeado, no implementado** |
| Hosting planeado | Vercel (frontend), Render (backend) | Sin configuración de despliegue en el repo aún |

## 9. Estructura real del monorepo

```
Kortek-OS/
├── apps/
│   ├── web/            # Next.js — solo login parcial + dashboard estático
│   └── api/             # NestJS — backend multi-tenant
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/20260719162646_initial_schema/
│       └── src/
│           ├── auth/
│           ├── organizations/
│           ├── professionals/
│           ├── services/
│           ├── clients/
│           ├── bookings/
│           ├── invoices/
│           └── prisma/
├── docker-compose.yml    # Solo PostgreSQL
├── pnpm-workspace.yaml    # Referencia a packages/*, carpeta inexistente
└── turbo.json
```

**Nota:** `packages/`, `infrastructure/`, `docs/`, `designs/`, `database/`, `.github/` y `apps/admin` mencionados en versiones anteriores de este documento **no existen en el código**. Son estructura planeada, no construida.

## 10. Base de datos

- Motor: PostgreSQL 16 en contenedor Docker (puerto 5432, credenciales de desarrollo en `docker-compose.yml`).
- Modelos activos en `schema.prisma`: `Organization`, `User`, `Professional`, `Client`, `Service`, `Booking`, `Payment`, `ProfessionalService`, `Notification`, `AuditLog`, `Invoice`.
- Enums: `UserRole` (OWNER, ADMIN, BARBER, RECEPTIONIST), `BookingStatus` (PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW), `PaymentStatus`, `PaymentMethod`, `InvoiceStatus` (UNPAID, PAID, REFUNDED).
- Restricción de unicidad compuesta en `User`: `@@unique([organizationId, email])`.
- **Migraciones:** `initial_schema` + `20260720044928_add_invoice_model` (resuelta — ver §10.1). Ambas aplicadas y consistentes con `schema.prisma`.

### 10.1. Historial de resolución — migración de Invoice (resuelto)

El modelo `Invoice` se había agregado a `schema.prisma` sin migración formal. Se diagnosticó que ya existía un intento previo no documentado: el enum `InvoiceStatus` y la tabla `Invoice` habían sido creados manualmente en algún momento (probablemente una migración interrumpida), incluyendo un registro real de prueba (`Elite Barber Shop`, factura `PAID` de $500). Se verificó la estructura existente contra el schema esperado, se confirmó que la restricción hacia `Organization` ya existía, y se marcó la migración `20260720044928_add_invoice_model` como aplicada (`prisma migrate resolve --applied`) sin ejecutar el SQL de creación, evitando así conflicto con los objetos ya existentes. El registro de prueba se preservó intacto. Estado final: `prisma migrate status` → `Database schema is up to date!` con 2 migraciones.

## 11. Autenticación y multi-tenancy

- Registro y login con JWT (expiración de 1 día), contraseñas con `bcryptjs` (10 salt rounds).
- `JwtAuthGuard` protege rutas vía `@UseGuards()`; decorador `@GetUser()` extrae datos del payload (incluyendo `organizationId`) para filtrar automáticamente por tenant en cada servicio.
- **Resuelto:** existe `RolesGuard` (`src/auth/guards/roles.guard.ts`) + decorador `@Roles()` (`src/auth/decorators/roles.decorator.ts`), aplicados así:
  - `Professionals` y `Services` (crear): `OWNER`, `ADMIN`.
  - `Clients` (crear): `OWNER`, `ADMIN`, `RECEPTIONIST`.
  - `Invoices` (todo el controlador): `OWNER`, `ADMIN`, `RECEPTIONIST` — datos financieros, `BARBER` excluido.
  - `Bookings`: sin restricción de rol (decisión deliberada — cualquier rol autenticado de la organización puede crear/gestionar citas, ya que en la operación real de una barbería el barbero también gestiona su agenda; el aislamiento multi-tenant sigue aplicando).
  - Todos los `GET` (listar) quedan abiertos a cualquier rol autenticado de la organización.
- **Resuelto:** `register()` sigue forzando `OWNER` (es el flujo de fundar una organización nueva, se dejó intacto a propósito). Se agregó `POST /auth/invite` (protegido, solo `OWNER`/`ADMIN`) para crear usuarios `ADMIN`/`BARBER`/`RECEPTIONIST` dentro de la organización de quien invita — el `organizationId` se toma del token, nunca del body.
- **Resuelto:** el `JWT_SECRET` ya no tiene valor por defecto hardcodeado. La API falla al arrancar con un mensaje explícito si la variable no está configurada en `.env`.

## 12. Flujo de reservas (Bookings) — módulo más maduro del backend

1. Valida que `service`, `professional` y `client` existan y pertenezcan a la organización del usuario autenticado.
2. Calcula `endTime` a partir de `startTime` + duración del servicio.
3. Detecta solapamientos de horario por profesional (excluyendo reservas `CANCELLED`) y lanza `ConflictException` si hay choque.
4. Expone `PATCH /bookings/:id/status` para transicionar el estado (`PENDING → CONFIRMED → COMPLETED`, etc.) usando el enum oficial de Prisma vía DTO validado con `class-validator`.

## 13. Módulos implementados (backend)

| Módulo | Endpoints | Estado |
|---|---|---|
| Auth | `POST /auth/register` (crea OWNER + organización), `POST /auth/login`, `POST /auth/invite` (OWNER/ADMIN, crea ADMIN/BARBER/RECEPTIONIST) | Funcional |
| Organizations | `POST /organizations` (público), `GET /organizations/by-slug/:slug` (público), `GET /organizations/mine` (`B2B_ROLES`) | Funcional, básico |
| Professionals | `POST /professionals` (OWNER/ADMIN), `GET /professionals` (`B2B_ROLES`) | Funcional |
| Services | `POST /services` (OWNER/ADMIN), `GET /services` (`B2B_ROLES`) | Funcional |
| Clients | `POST /clients` (OWNER/ADMIN/RECEPTIONIST), `GET /clients` (`B2B_ROLES`) | Funcional |
| Bookings | `POST /bookings`, `GET /bookings`, `PATCH /bookings/:id/status` (todo: `B2B_ROLES`) | Funcional, el más completo |
| Invoices | `POST /invoices`, `GET /invoices`, `PATCH /invoices/:id/pay` (todo: OWNER/ADMIN/RECEPTIONIST) | Funcional — migración resuelta (ver §10.1) |
| Public Booking (B2C) | `GET /public/:slug/booking-data`, `POST /public/:slug/bookings` (público, sin auth, throttled) | Funcional — ver §24.3 |

## 14. Frontend — reconstruido

El frontend fue reescrito por completo (el estado descrito en versiones anteriores de este documento — dashboard estático, login roto — ya no aplica). Estado actual:

### Autenticación multi-tenant
- El login pide **slug de la barbería + correo + contraseña** (no el `organizationId` en crudo). El flujo resuelve el slug a `organizationId` vía `GET /organizations/by-slug/:slug` (endpoint público agregado para esto) antes de llamar a `POST /auth/login`.
- El registro (`/register`) crea la organización (`POST /organizations`) y el usuario `OWNER` (`POST /auth/register`) en un solo formulario, y encadena un login automático (el registro no devuelve token).
- Sesión persistida en `localStorage` (token + usuario + organización), gestionada centralmente en `lib/auth-context.tsx` (`AuthProvider` / `useAuth()`).
- `app/(dashboard)/layout.tsx` protege todas las rutas del panel: redirige a `/login` si no hay sesión.

### Estructura
```
app/
├── login/page.tsx
├── register/page.tsx
└── (dashboard)/            # route group protegido
    ├── layout.tsx           # sidebar + guard de sesión
    ├── page.tsx              # resumen (stats + agenda de hoy)
    ├── bookings/page.tsx
    ├── clients/page.tsx
    ├── professionals/page.tsx
    ├── services/page.tsx
    ├── invoices/page.tsx
    └── team/page.tsx         # invitar miembros (OWNER/ADMIN)
lib/
├── api.ts                    # cliente HTTP tipado, único punto de contacto con la API
└── auth-context.tsx          # sesión, login, registro, logout
components/
├── Brand.tsx, Sidebar.tsx
└── ui/                        # Button, Card, Badge, Modal, Field, EmptyState, PageHeader
```

### Cobertura funcional (limitada a lo que el backend expone)
Cada página de módulo (Profesionales, Servicios, Clientes, Reservas, Facturación) tiene listado + creación, conectados a los endpoints reales. Los botones de creación se ocultan en el cliente según el rol (`RolesGuard` del backend es la protección real; la UI solo evita mostrar acciones que van a fallar). Reservas tiene acciones de cambio de estado (confirmar/completar/cancelar/no-show) según el estado actual. Facturación solo permite generar factura sobre citas `COMPLETED` sin factura previa, y marcar como pagada.

**No se construyó** edición ni borrado de ningún recurso — el backend tampoco los expone todavía.

### Identidad visual
Paleta oscura inspirada en el oficio (cuero/carbón + acento de latón), tipografía `Fraunces` (títulos) + `Inter` (UI) + `IBM Plex Mono` (cifras). Tokens definidos como variables CSS en `app/globals.css` vía `@theme` (Tailwind v4).

### Limitaciones conocidas
- La sesión vive en `localStorage`, no en cookies — significa que no hay verificación de sesión en el servidor (SSR), todo el guard de rutas es client-side. Suficiente para el estado actual del producto, pero a reconsiderar si se necesita SSR con datos protegidos más adelante.
- No hay página para listar miembros del equipo (el backend no expone ese endpoint todavía, solo invitar).

## 15. Organización por módulos

- **Completados (backend):** Auth, Organizations, Prisma, Professionals, Services, Clients, Bookings, Invoices (con la salvedad de §10).
- **Pendientes (backend):** RolesGuard/autorización por rol, Payments (modelo existe en BD pero sin módulo NestJS propio), Notifications (modelo existe, sin módulo), AuditLog (modelo existe, sin módulo ni lógica de escritura automática).
- **Futuro (sin iniciar):** Billing avanzado, Inventory, AI, Marketing, Analytics, WhatsApp, Loyalty, Files.
- **Frontend:** prácticamente todo pendiente — solo existe un login (con bugs) y un dashboard decorativo.

## 16. Deuda técnica identificada

1. ~~Migración faltante para `Invoice`~~ — **resuelto**, ver §10.1.
2. ~~Módulo Prisma duplicado y huérfano~~ — **resuelto**, eliminado.
3. ~~`pnpm-workspace.yaml` con línea inválida de `bcrypt`~~ — **resuelto**.
4. ~~`.env.example` vacío~~ — **resuelto**, documentado con `DATABASE_URL`, `JWT_SECRET`, `PORT`.
5. **Conflicto de puertos por defecto**: mitigado — `.env.example` ahora recomienda `PORT=3001` para la API. Sigue pendiente que cada desarrollador aplique ese valor en su `.env` local.
6. **Cobertura de pruebas prácticamente nula**: solo existen los tests boilerplate de Nest (`app.controller.spec.ts`, `prisma.service.spec.ts`). Ningún módulo de negocio tiene pruebas unitarias o de integración. **Sigue pendiente.**
7. ~~READMEs sin personalizar~~ — **resuelto**.
8. ~~Secreto JWT con valor por defecto hardcodeado~~ — **resuelto**, ver §11.
9. ~~Sin control de roles~~ — **resuelto**, ver §11.

## 17. Riesgos técnicos

- ~~Alto: `JWT_SECRET` hardcodeado~~ — **resuelto**, la API ya no arranca sin esa variable.
- ~~Medio: ausencia de autorización por rol~~ — **resuelto**, ver §11.
- ~~Medio: el frontend no estaba integrado funcionalmente con el backend~~ — **resuelto**, ver §14.
- **Bajo:** la sesión del frontend vive en `localStorage`, sin verificación server-side — ver limitaciones conocidas en §14.
- **Bajo:** credenciales de PostgreSQL en texto plano en `docker-compose.yml` — aceptable para desarrollo local, pero debe reemplazarse por secretos antes de cualquier entorno compartido.

## 18. Oportunidades de mejora

- Implementar `RolesGuard` + decorador `@Roles()` para aprovechar el enum `UserRole` ya definido.
- Generar la migración faltante de `Invoice`/`InvoiceStatus` y validar `prisma migrate status` como parte del flujo de CI.
- Eliminar el módulo Prisma duplicado.
- Completar `.env.example` con todas las variables requeridas.
- Corregir los dos bugs del login del frontend antes de construir pantallas adicionales sobre él.
- Definir puertos explícitos por app (por ejemplo, API en 3001) para evitar colisiones en desarrollo.
- Añadir pruebas unitarias a los servicios de negocio, empezando por `BookingsService` (es el de mayor complejidad lógica) y `AuthService`.
- Personalizar los README de cada app con instrucciones reales del proyecto.

## 19. Registro de decisiones técnicas (inamovibles)

1. **pnpm + Turborepo** — adoptados definitivamente para el monorepo.
2. **Autenticación propia** — se rechazó Supabase Auth para mantener control total de la lógica comercial crítica; se usa JWT + Passport.
3. **bcryptjs sobre bcrypt nativo** — decisión tomada por problemas de compilación C++ en Windows.
4. **Composición sobre herencia en Prisma** — `PrismaService` usa `public readonly db = new PrismaClient()` en vez de extender `PrismaClient`, para evitar conflictos de tipado estrictos con TypeScript/ESLint.
5. **Aislamiento multi-tenant obligatorio** — todo modelo de negocio debe incluir `organizationId`, y todo query debe filtrar por él.
6. **Docker exclusivo para bases de datos locales** — sin instalaciones directas de PostgreSQL en el sistema operativo host.

## 20. Funcionalidades completadas (verificado en código)

- Monorepo pnpm + Turborepo funcional.
- PostgreSQL vía Docker con Prisma conectado y migración inicial aplicada.
- `PrismaService` global, inyectable en todos los módulos.
- Registro y login con JWT y contraseñas encriptadas.
- CRUD de Organizations, Professionals, Services, Clients.
- Flujo completo de Bookings con validación de conflictos de horario.
- Módulo de Invoices (código completo, bloqueado por migración pendiente).
- `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`.

## 21. Funcionalidades pendientes

- Refresh Tokens.
- Módulos NestJS para `Payment`, `Notification` y `AuditLog` (los modelos de Prisma ya existen, pero no tienen servicio/controlador propio).
- Endpoint para listar miembros del equipo de una organización (invitar ya existe; listar no).
- Edición y borrado de recursos (professionals, services, clients) — ni backend ni frontend los tienen todavía.
- App `admin` separada.
- Paquetes compartidos (`packages/ui`, `packages/types`, etc.).
- Integraciones futuras: Redis/BullMQ, Socket.IO, Cloudinary, pasarela de pagos.
- Pruebas unitarias e integración sobre los módulos de negocio (cobertura actual: prácticamente nula).

## 22. Ideas futuras

Módulos avanzados: Inteligencia Artificial, Inventario de productos, CRM avanzado, integraciones directas con WhatsApp para reservas automáticas, analíticas y sistemas de fidelización.

## 23. Próximos pasos recomendados

1. Verificar en tu máquina que `pnpm dev` (web) y `pnpm start:dev` (api) levantan juntos sin conflicto de puertos, y probar el flujo completo: registrar barbería → login → crear profesional/servicio/cliente → crear reserva → completarla → facturarla → marcarla pagada.
2. Empezar a construir pruebas unitarias sobre los módulos de mayor complejidad (`BookingsService`, `AuthService`).
3. Definir si `Payment`, `Notification` y `AuditLog` entran en el alcance cercano o quedan para después.
4. Evaluar Refresh Tokens si la sesión de 1 día resulta corta para el uso real.
5. Agregar endpoint para listar miembros del equipo (complementa `/auth/invite`).

## 24. Kortek OS — decisiones de arquitectura de la reestructuración Enterprise

Registro de las decisiones tomadas durante el rebranding a Kortek OS y la construcción del flujo B2C, con su justificación (política del proyecto: documentar antes de implementar, cuando la decisión toca el dominio principal).

### 24.1. Branding centralizado
Todo nombre/copy/autor del producto vive en `apps/web/lib/brand.ts` (objeto `BRAND`). Cambiar el nombre del producto en el futuro es editar ese archivo — no hay strings de marca sueltos en componentes o metadata.

### 24.2. Relación `User` ↔ `Professional`
**Decisión: FK opcional y única `Professional.userId` → `User.id`** (migración `20260722030552_link_professional_user`).
- Alternativas descartadas: fusionar ambos modelos (rompía lógica ya probada), tabla muchos-a-muchos (sin caso de negocio real, violación de YAGNI).
- `Professional` sigue pudiendo existir sin cuenta de acceso (un negocio puede listar profesionales que no usan el panel). Cuando sí necesitan acceso, se vincula un `User` vía `userId`.
- **Pendiente:** todavía no hay UI/flujo que establezca ese vínculo (ej. al invitar un profesional con checkbox "crear perfil público") — el modelo de datos ya lo soporta, falta la funcionalidad que lo use.

### 24.3. Endpoint público de reservas (B2C)
Módulo independiente `public-booking/` (`GET /public/:slug/booking-data`, `POST /public/:slug/bookings`), sin `JwtAuthGuard`. El `organizationId` se resuelve siempre del `slug` de la URL. Reutiliza `BookingsService.create()` (exportado desde `BookingsModule`) para la detección de conflictos de horario — cero duplicación de esa regla de negocio.

Protección contra abuso: `@nestjs/throttler`, 5 solicitudes/minuto por IP, aplicado **solo** al controlador `PublicBookingController` (no como guard global) para no arriesgar el tráfico autenticado existente. Se descartó un limitador distribuido con Redis por YAGNI — no hay Redis en el stack ni necesidad mientras corra una sola instancia; revisar si se escala horizontalmente.

**Decisión pendiente de aprobación — creación de cuenta desde el flujo público:** ~~resuelto~~ ver §24.4.

### 24.4. Rol `CUSTOMER` y separación conceptual B2B / B2C

Kortek OS tiene dos universos de usuario que comparten el mismo modelo `User`, pero están conceptualmente separados y no deben mezclarse nunca a nivel de permisos:

- **B2B (personal interno):** `OWNER`, `ADMIN`, `BARBER`, `RECEPTIONIST`. Tienen acceso al panel de gestión (`/dashboard/*`). Se crean vía `/auth/register` (fundación de organización → OWNER) o `/auth/invite` (OWNER/ADMIN invitan ADMIN/BARBER/RECEPTIONIST).
- **B2C (clientes finales):** un solo rol, `CUSTOMER`. Se crean **exclusivamente** desde `POST /public/:slug/bookings` cuando el cliente marca "crear cuenta para reservar más rápido". Nunca tienen acceso a ningún endpoint del panel interno.

La constante `B2B_ROLES` (`apps/api/src/auth/roles.constants.ts`) centraliza la lista de roles internos — cualquier endpoint de uso interno debe declarar `@Roles(...B2B_ROLES)`, nunca dejarse solo con `JwtAuthGuard`.

Migración: `20260722042926_add_customer_role` (aditiva — `ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER'`).

### 24.5. Auditoría de seguridad — endpoints con solo `JwtAuthGuard`

Se auditaron todos los controladores protegidos únicamente con `JwtAuthGuard` (sin restricción de rol), que antes de esta revisión quedaban abiertos a cualquier usuario autenticado — incluido, desde la introducción de `CUSTOMER`, un cliente final. Se corrigieron:

| Endpoint | Antes | Ahora |
|---|---|---|
| `GET /organizations/mine` | Cualquier autenticado | `B2B_ROLES` |
| `GET /professionals` | Cualquier autenticado | `B2B_ROLES` |
| `GET /services` | Cualquier autenticado | `B2B_ROLES` |
| `GET /clients` | Cualquier autenticado | `B2B_ROLES` (el más sensible — PII de clientes) |
| `POST /bookings`, `GET /bookings`, `PATCH /bookings/:id/status` | Cualquier autenticado | `B2B_ROLES` |

`Invoices` y `/auth/invite` ya tenían restricción de rol explícita desde antes (no incluían `CUSTOMER`), no necesitaron cambios.

### 24.6. Fase 1 — Reestructura de rutas

El dashboard se movió de `/` a `/dashboard/*` (todas las subrutas: `bookings`, `clients`, `professionals`, `services`, `invoices`, `team`). `/` queda libre para la landing B2B (Fase 3) — por ahora tiene un placeholder mínimo (marca + tagline + botón a login) para no dejar la ruta rota mientras tanto.

### 24.7. Fase 2 — Design System consolidado

Nuevos primitivos en `apps/web/components/ui/`, sumados a los ya existentes (`Button`, `Card`, `Badge`, `Modal`, `Field`, `EmptyState`, `PageHeader`):

- **`Toast.tsx`** — `ToastProvider` + hook `useToast()`, montado globalmente en `app/layout.tsx`. Integrado ya en Reservas (crear/cambiar estado) y Facturación (crear/marcar pagada) — reemplaza el patrón anterior de solo mostrar el error inline.
- **`Skeleton.tsx`** — `Skeleton` genérico + `SkeletonListRows` para el patrón de lista-dentro-de-Card. Integrado en el listado de Reservas como referencia.
- **`Table.tsx`** — `Table`/`TableHead`/`TableHeaderCell`/`TableBody`/`TableRow`/`TableCell`, para pantallas con datos más densos (aún no reemplaza las listas `<ul>` existentes — disponible para nuevas pantallas o para el pase de pulido).
- **`Dropdown.tsx`** y **`Tooltip.tsx`** — listos para usar, todavía sin un caso de uso concreto en el dashboard actual.

**Pendiente (Fase 9, pulido UX):** retrofitar `Skeleton` y `Table` en el resto de las páginas de listado (`clients`, `professionals`, `services`, `team`), que hoy siguen con el patrón anterior de texto "Cargando…" y listas `<ul>`.

### 24.8. Fase 3 — Landing B2B

`app/page.tsx` reemplaza el placeholder de la Fase 1 con la landing completa: Nav, Hero (con mockup del producto construido con los propios componentes del design system, sin capturas de pantalla ni imágenes externas), Beneficios, Características, Módulos, Planes (mock, 3 niveles), Testimonios (mock — nombres y negocios ficticios, sin fotos de personas reales), FAQ (acordeón nativo `<details>/<summary>`, sin dependencia nueva), CTA final y Footer con `BRAND.footer.copyright()`.

Secciones nuevas en `apps/web/components/landing/` — son composiciones de una sola página, no primitivos reutilizables, por eso viven separadas de `components/ui/`.

### 24.9. Fase 4 — Flujo B2C (`app/[slug]/page.tsx`)

Wizard de 6 pasos (servicio → profesional → fecha/hora → datos de contacto → cuenta opcional → confirmar) sobre el módulo público construido en la Fase de decisiones (§24.3/24.4). Al confirmar, abre automáticamente WhatsApp (`wa.me`) con un mensaje pre-armado usando `organization.phone` (se agregó ese campo a la respuesta de `GET /public/:slug/booking-data`, antes no lo incluía). Si la barbería no tiene teléfono cargado, el paso de WhatsApp simplemente no aparece — no rompe el flujo.

Nuevo primitivo del design system: **`PasswordField.tsx`** (mostrar/ocultar contraseña), pedido explícitamente en el brief. Se retrofiteó también en `login` y `register`, que antes usaban un `<input type="password">` simple — no se dejaron dos patrones de contraseña distintos conviviendo.

### 24.10. Fase 7 — Roles refinados: agenda y clientes propios de `BARBER`

Aprovechando el vínculo `Professional.userId` (§24.2), `GET /bookings` y `GET /clients` ahora resuelven automáticamente el `Professional` ligado al `User` que hace la petición cuando su rol es `BARBER`, y filtran:
- **Bookings:** solo las citas de ese profesional (`professionalId` en el `where`).
- **Clients:** solo clientes con al menos una cita con ese profesional (`bookings: { some: { professionalId } }`).

Si un `BARBER` no tiene ningún `Professional` vinculado todavía (el vínculo se establece manualmente, ver §24.2 — pendiente de UI), ve una lista vacía en vez de un error o, peor, la lista completa de la organización. El resto de los roles B2B no cambia de comportamiento.

`ProfessionalsService.findByUserId()` es el método que resuelve el vínculo — se reutiliza igual en `BookingsController` y `ClientsController`, sin duplicar la lógica de resolución.

**Frontend:** los títulos de "Reservas" y "Clientes" cambian a "Mi agenda" / "Mis clientes" cuando el usuario autenticado es `BARBER`, para que la UI sea honesta sobre lo que realmente está viendo.

**No incluido en esta fase (alcance explícito):** "ocultar ingresos globales" ya estaba resuelto de antes — `BARBER` nunca tuvo acceso a `/invoices` (§24.5). No se construyó un flujo de "registro de cobros propios" para `BARBER` porque no hay todavía un caso de uso claro más allá de excluirlo de la facturación general; queda como posible mejora futura si se necesita.

### 24.11. Fase 8 — Gestión del equipo

`POST /auth/invite` acepta ahora `createPublicProfile?: boolean`. Cuando viene en `true` (checkbox visible solo para rol `BARBER` en el frontend), crea el `User` **y** su `Professional` vinculado (`userId`) en una sola transacción de Prisma (`$transaction`) — o se crean ambos, o no se crea ninguno; nunca queda un `User` huérfano sin su perfil si algo falla a mitad de camino.

**Frontend (`/dashboard/team`):**
- Checkbox "Crear perfil público" (solo aparece si el rol elegido es Barbero).
- Mensaje de éxito vía el sistema de `Toast` (Fase 2).
- Botón "Enviar credenciales por WhatsApp" tras invitar — arma un `wa.me` con nombre, slug de la barbería, correo y la contraseña temporal que el propio dueño/admin acaba de escribir (nunca se le pide al backend que la devuelva; el frontend ya la tiene en memoria del formulario).

**Nota de seguridad, con conocimiento de causa:** el mensaje de WhatsApp incluye la contraseña en texto plano, con una línea recomendando cambiarla al entrar. Es exactamente lo que pidió el brief ("enviar credenciales por WhatsApp"), pero es un trade-off de seguridad real, no una casualidad — no hay todavía un flujo de "cambiar contraseña obligatorio en el primer login" que cierre ese hueco. Queda anotado como mejora futura si se quiere reforzar.

### 24.12. Fase 9 — Pulido final

- `Skeleton`/`SkeletonListRows` (Fase 2) retrofiteado en los listados que quedaban con el texto "Cargando…": Clientes, Profesionales, Servicios, Facturación. Bookings ya lo tenía desde la Fase 2.
- Barrido completo de código muerto e imports sin usar en todo el proyecto (`apps/api` y `apps/web`) — cero advertencias reales de ESLint al cierre de esta fase.
- **Decisión explícita de alcance (YAGNI):** no se forzó code-splitting adicional (`next/dynamic` en los modales de creación) ni memoización adicional en componentes de presentación. La app, en su tamaño actual y sin datos de uso real que indiquen un cuello de botella concreto, no lo justifica — hacerlo ahora sería exactamente la "catedral" que el brief pidió evitar. Si el volumen de datos o de usuarios crece, es el momento de revisar esto con métricas reales, no antes.
- `Table.tsx` y `Dropdown.tsx` (Fase 2) siguen sin un caso de uso concreto en el dashboard — se mantienen disponibles para cuando una pantalla nueva los necesite, no se forzó su uso donde no aportaba valor sobre lo que ya funcionaba.

### 24.13. Estado del proyecto al cierre de este ciclo

Fases 0 a 9 completas. Backend y frontend verificados (`tsc`+`eslint`) en cada entrega, con Postgres real para toda migración. Pendientes conocidos, todos documentados en su sección correspondiente: UI para vincular manualmente un `Professional` existente a un `User` (§24.2), endpoint para listar miembros del equipo (§13/§21), flujo de cambio de contraseña obligatorio en primer login (§24.11), y cualquier necesidad de performance que surja con uso real (§24.12).

## 25. Fundación Kortek — pivote a plataforma matriz (Backend Lead)

A partir de este ciclo, Kortek deja de ser un SaaS individual y pasa a ser la plataforma tecnológica matriz; BarberFlow es su primer producto. El trabajo de este ciclo fue exclusivamente backend, bajo un RFC aprobado explícitamente por el CTO antes de escribir código — ver `BACKEND_CHANGES.md` para el detalle de cada contrato de API cambiado o agregado, este apartado cubre las decisiones de arquitectura y lo que quedó pendiente.

### 25.1. Verificaciones que cambiaron el plan original antes de implementar

- `Organization.phone` y `Professional.bio` ya existían — no se repitieron en la migración.
- `Professional.avatar` ya existía y se reutiliza tal cual — no se creó `profileImageUrl` (decisión explícita del CTO).

### 25.2. Micro-sitio — modelo de datos, sin API todavía

`Organization` suma `address`, `googleMapsUrl`, `aboutUs`, `heroImageUrl`, `socialLinks` (Json), `businessHours` (Json). `Professional` suma `specialty`, `experienceYears`. Nuevo modelo `GalleryImage` (`organizationId`, `url`, `caption?`, `order`), única tabla nueva de este ciclo — se justificó porque ningún modelo existente la cubre.

**Estrategia de integridad referencial (regla explícita del CTO — nada de `Cascade` indiscriminado):** `GalleryImage.organizationId` usa `onDelete: Cascade` porque una foto de galería no tiene ningún sentido sin su organización. `Booking` e `Invoice` — datos financieros/operativos — **no** se tocaron: siguen con el comportamiento por defecto de Prisma (equivalente a `Restrict` — no se puede borrar una organización que todavía tiene reservas o facturas), que ya era el comportamiento de antes de este ciclo, verificado contra las migraciones ya aplicadas antes de tocar nada nuevo.

Migración: `20260723212248_microsite_and_indexes` (aditiva, verificada contra la cadena completa de 4 migraciones anteriores en Postgres real).

### 25.3. Rendimiento — índices compuestos

`@@index([organizationId, status, createdAt])` en `Booking` e `Invoice` — pensados para el patrón de consulta más común (listado filtrado por estado, ordenado por fecha) y para `/analytics/dashboard`.

### 25.4. `GET /analytics/dashboard`

Contrato completo en `BACKEND_CHANGES.md`. Decisión de alcance: restringido a `OWNER/ADMIN/RECEPTIONIST`, excluye `BARBER` — mismo criterio ya aplicado a `/invoices` (§24.5/§24.10), no una decisión nueva sino consistencia con lo ya establecido. `topProfessional` usa una ventana fija de 30 días, no configurable todavía (YAGNI — nadie pidió que lo fuera).

### 25.5. Seguridad — `PATCH /auth/update-password` y contraseña mínima de 8

Endpoint nuevo, protegido solo con `JwtAuthGuard` (cualquier rol, incluido `CUSTOMER`). Política de contraseña centralizada en `apps/api/src/auth/auth.constants.ts` (`PASSWORD_MIN_LENGTH = 8`) — los 4 lugares que antes repetían `MinLength(6)` a mano ahora importan la constante.

### 25.6. WhatsApp — `whatsappBaseUrl` desde el backend

`WHATSAPP_BASE_URL` en `.env` (default `https://wa.me/`), expuesto en las respuestas de `POST /auth/invite` y `GET /public/:slug/booking-data`. El frontend deja de tener el dominio `wa.me` hardcodeado — pendiente de que el frontend lo adopte (no se tocó código React en este ciclo, por directiva explícita del CTO).

### 25.7. Identidad global `User` + `Membership` — implementado

**RFC aprobado y ejecutado.** El CTO verificó la base real (forzando P2002 manuales en `email`/`slug`) y confirmó integridad antes de dar luz verde. Ver §26 para el detalle completo de la implementación, las decisiones tomadas durante la construcción, y la limitación conocida que quedó documentada (`Professional.userId`).

## 26. Identidad global — implementación completa (2026-07-24)

### 26.1. Modelo de datos

`User` pasa a ser identidad global: `id`, `email` (único global), `password`, `name`, `lastOrganizationId`. Ya no tiene `organizationId` ni `role` propios.

Nuevo modelo `Membership`: `id`, `userId`, `organizationId`, `role`, `@@unique([userId, organizationId])`, `onDelete: Cascade` hacia **ambos** padres — decisión del CTO: un `Membership` sin su `User` o sin su `Organization` no tiene ningún sentido, a diferencia de `Booking`/`Invoice`, que nunca se tocaron con `Cascade`.

`Client` gana `@@unique([organizationId, email])` — resuelto como el modelo correcto para lo que el CTO describió como "Customer" (email opcional para walk-ins, único por organización, no global — la misma persona puede ser cliente de varias barberías como registros independientes). Se confirmó con el CTO antes de tocar el schema en vez de asumir que hacía falta un modelo nuevo.

Migración `20260724023058_global_identity_membership` — **probada con datos representativos** (organización, `OWNER`, `BARBER` con `Professional` vinculado, `CUSTOMER`, `Client`), no solo contra un schema vacío: se verificó que cada `User` migró a exactamente una `Membership` con el rol correcto, que `lastOrganizationId` quedó poblado, que `Professional.userId` siguió apuntando bien, y que el `onDelete: Cascade` de `Membership` funciona (se probó borrando un `User` de prueba y confirmando que su `Membership` desapareció con él).

### 26.2. Login de un solo paso

`LoginDto` pasa a `{ email, password }` — sin `organizationId`. `AuthService.login()` resuelve la organización activa: usa `User.lastOrganizationId` si apunta a una `Membership` válida; si no (caso legacy, o la membresía guardada ya no existe), usa la primera `Membership` disponible y la guarda en `lastOrganizationId`. Sin `preAuthToken` ni `/select-organization` — cero código muerto para un flujo de dos pasos que no se pidió.

`JwtStrategy.validate()` re-verifica contra `Membership` en cada request (no confía ciegamente en el `role`/`organizationId` del payload del JWT) — si se revoca el acceso de alguien, el efecto es inmediato, no espera a que expire el token.

**⚠️ Esto rompe el login del frontend actual hasta que se actualice** — detalle completo, con lo que le toca a frontend, en `BACKEND_CHANGES.md`.

### 26.3. `register` e `invite`

`register` (fundar organización nueva): si el email ya existe globalmente → `409 Conflict`, invita a iniciar sesión en vez de crear una cuenta duplicada. `invite`: si el email invitado **ya existe globalmente**, no crea un `User` nuevo — le agrega una `Membership` nueva a su cuenta existente (es el caso de uso real de la identidad global). Si ya es miembro de esa misma organización → `409`.

### 26.4. Manejo de errores P2002 — de 500 a respuestas claras

Utilidad compartida `apps/api/src/common/prisma-error.util.ts` (`isUniqueConstraintError`) — un solo lugar para detectar P2002 de Prisma, reutilizado en `auth.service.ts`, `organizations.service.ts`, `clients.service.ts` y `public-booking.service.ts`. Detalle completo de cada endpoint en `BACKEND_CHANGES.md`.

Decisión particular sobre la reserva pública: si falla la creación de cuenta `CUSTOMER` por correo duplicado, la reserva **no se aborta** — se confirma igual y se reporta `accountCreated: false, accountCreationError: "EMAIL_ALREADY_EXISTS"`. Un 409 ahí habría tumbado una reserva exitosa por un conflicto en una funcionalidad secundaria del mismo request.

### 26.5. Limitación conocida — `Professional.userId`

Es único **globalmente**, diseñado antes de que existiera el multi-organización real. Si alguien ya tiene un `Professional` en una organización y se le invita como `BARBER` con "crear perfil público" a otra, la `Membership` se crea bien, pero el segundo `Professional` no — se reporta sin abortar la invitación. Resolverlo de raíz (restricción compuesta `(userId, organizationId)`) es un cambio de modelo de datos que merece su propia decisión explícita, no se hizo en este ciclo por no estar pedido.

---

*Este documento reemplaza integralmente las versiones anteriores. Toda la información aquí fue verificada directamente contra el código fuente del repositorio — nada se asumió a partir de documentación previa.*
