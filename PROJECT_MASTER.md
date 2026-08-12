# PROJECT_MASTER.md — KORTEK OS

> **Nota de renombramiento:** este documento se llamaba `MAESTRO.md`. A partir de esta actualización pasa a llamarse **`PROJECT_MASTER.md`** — es una evolución del mismo documento, no uno nuevo. **No se eliminó ni se resumió ningún contenido histórico**; todo lo que existía en `MAESTRO.md` sigue aquí, con su numeración de sección original intacta (para que ninguna referencia cruzada existente — en código, commits o conversaciones previas — se rompa). Se agregaron seis secciones nuevas (§35 a §40) y un índice de navegación.

> **Nota de rebranding (histórica):** el proyecto se llamó originalmente BarberFlow OS. Desde la actualización de la Fase de Fundación Kortek, el nombre oficial pasó a ser **Kortek Booking**.

> **Nota de rebranding (Fase 0 de construcción de frontend):** **Kortek** (también "Kortek Studio") es el nombre de la **empresa** — tiene su propio landing corporativo en un repositorio aparte, fuera de este proyecto. Este producto — el SaaS que este repositorio construye — se llama **Kortek Booking**. `apps/web/lib/brand.ts` (branding centralizado, ver §24.1) ya refleja esta separación: `BRAND.name`/`BRAND.legalName` = "Kortek Booking", `BRAND.company` = "Kortek Studio" (solo para el crédito del footer).

> **Última actualización:** basada en auditoría completa del código fuente (no en supuestos ni en versiones anteriores de este documento). Todo lo escrito aquí refleja lo que existe hoy en el repositorio, más el historial completo de cómo se llegó ahí.

> **Estado vigente de módulos (2026-08-11):** Reservas Backend y Reservas Frontend están **CERRADOS / APROBADOS**; el módulo Reservas está **CERRADO oficialmente** sobre el checkpoint funcional `9a30f2abb37857dbbbf15e34df1cbaec576121b6`. La **Entrega A Backend de Clientes está implementada sobre `e9dacc348da4b9c507a248530af4782c0d757156`, pendiente de revisión y aprobación explícita del propietario**; no está autorizada todavía la Entrega B Frontend. Resumen continúa congelado hasta el final del orden de módulos. Ver §56–57.

---

## Índice

**Parte I — Visión y negocio**
[§1 Resumen](#1-resumen-del-proyecto) · [§2 Objetivo](#2-objetivo) · [§3 Visión](#3-visión) · [§4 Alcance](#4-alcance) · [§5 Documento de negocio](#5-documento-de-negocio)

**Parte II — Estado y arquitectura actuales**
[§6 Estado real](#6-estado-real-del-proyecto-auditoría-de-código) · [§7 Arquitectura](#7-arquitectura) · [§8 Tecnologías](#8-tecnologías-utilizadas-verificado-contra-packagejson) · [§9 Estructura del monorepo](#9-estructura-real-del-monorepo) · [§10 Base de datos](#10-base-de-datos) · [§11 Autenticación y multi-tenancy](#11-autenticación-y-multi-tenancy) · [§12 Flujo de reservas](#12-flujo-de-reservas-bookings--módulo-más-maduro-del-backend) · [§13 Módulos backend](#13-módulos-implementados-backend) · [§14 Frontend](#14-frontend--reconstruido) · [§15 Organización por módulos](#15-organización-por-módulos)

**Parte III — Gestión del proyecto**
[§16 Deuda técnica](#16-deuda-técnica-identificada) · [§17 Riesgos técnicos](#17-riesgos-técnicos) · [§18 Oportunidades de mejora](#18-oportunidades-de-mejora) · [§19 Decisiones inamovibles](#19-registro-de-decisiones-técnicas-inamovibles) · [§20 Funcionalidades completadas](#20-funcionalidades-completadas-verificado-en-código) · [§21 Funcionalidades pendientes](#21-funcionalidades-pendientes) · [§22 Ideas futuras](#22-ideas-futuras) · [§23 Próximos pasos](#23-próximos-pasos-recomendados)

**Parte IV — Historial técnico completo (decisiones y auditorías, en orden cronológico)**
[§24 Reestructuración Enterprise / rebranding Kortek](#24-kortek-os--decisiones-de-arquitectura-de-la-reestructuración-enterprise) · [§25 Fundación Kortek — pivote a plataforma matriz](#25-fundación-kortek--pivote-a-plataforma-matriz-backend-lead) · [§26 Identidad global](#26-identidad-global--implementación-completa-2026-07-24) · [§27 CRUD Profesionales/Servicios/Clientes](#27-crud-completo--profesionales-servicios-clientes-2026-07-25) · [§28 Listar equipo](#28-get-organizationsminemembers--listar-el-equipo-2026-07-25) · [§29 Auditoría Fase 1 — Infraestructura](#29-auditoría-enterprise--fase-1-infraestructura-2026-07-25) · [§30 Auditoría Fase 2 — Seguridad](#30-auditoría-enterprise--fase-2-seguridad-2026-07-25) · [§31 Parche fuerza bruta](#31-parche--protección-de-fuerza-bruta-en-todo-el-flujo-de-autenticación-2026-07-25) · [§32 Auditoría Fase 3 — Observabilidad](#32-auditoría-enterprise--fase-3-observabilidad-2026-07-26) · [§33 Auditoría Fase 4 — Calidad](#33-auditoría-enterprise--fase-4-calidad-2026-07-27) · [§34 Auditoría Fase 5 — Testing](#34-auditoría-enterprise--fase-5-testing-2026-07-28)

**Parte V — Memoria técnica permanente (nuevo en esta actualización)**
[§35 Estado global del proyecto](#35-estado-global-del-proyecto) · [§36 Historial de evolución](#36-historial-de-evolución) · [§37 Intentos fallidos](#37-intentos-fallidos) · [§38 Lecciones aprendidas](#38-lecciones-aprendidas) · [§39 RFC / Decisiones pendientes](#39-rfc--decisiones-pendientes) · [§40 Onboarding para nuevos desarrolladores](#40-onboarding-para-nuevos-desarrolladores)

**Parte VI — Fase 0/1: Landing pública (histórico, cronológico)**
[§41 Fase 0 — Fundamentos de diseño](#41-fase-0--fundamentos-de-diseño-2026-07-31) · [§42 Fase 1 — Landing](#42-fase-1--landing-de-kortek-booking-2026-07-31) · [§43 Fase 1 — Reconstrucción total](#43-fase-1--reconstrucción-total-2026-08-01) · [§44 Fase 1 — Identidad negro/blanco/rojo](#44-fase-1--identidad-negroblancorojo--carrusel-de-testimonios--precios-definitivos-2026-08-01) · [§45 Fase 1 — Pulido final](#45-fase-1--pulido-final-acordeón-de-faq--reveal-de-scroll-2026-08-01--cierre-de-fase)

**Parte VII — Fase 2: Panel administrativo (en curso)**
[§46 Nota de reconciliación](#46-nota-de-reconciliación-2026-08-02) · [§47 Arquitectura de temas](#47-arquitectura-de-temas-dashboard-clarografito-vs-marketing-oscuro-2026-08-02) · [§48 Deuda de tooling resuelta](#48-deuda-de-tooling-resuelta-2026-08-02) · [§49 Validación](#49-validación-2026-08-02)

**Parte VIII — Visión ampliada del producto (nuevo en esta actualización)**
[§50 Kortek Booking como mini-sitio comercial por barbería](#50-visión-ampliada-del-sitio-público--de-página-de-reservas-a-mini-sitio-comercial-2026-08-02)

---

# PARTE I — VISIÓN Y NEGOCIO

## 1. Resumen del proyecto

Kortek Booking es una plataforma SaaS empresarial para la gestión completa de barberías y salones. Opera bajo un modelo **multi-tenant**: cada negocio (`Organization`) administra sus propios clientes, reservas, profesionales y pagos en un entorno de datos aislado mediante `organizationId`.

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


# PARTE II — ESTADO Y ARQUITECTURA ACTUALES

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
Kortek-Booking/
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


# PARTE III — GESTIÓN DEL PROYECTO

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
- **(Agregado 2026-08-02, ver §50 para el detalle completo)** Foto por servicio (`Service.imageUrl` — no existe todavía en el schema), subida de imágenes desde dispositivo o cámara con compresión/optimización responsive, módulo de Promociones (nuevo modelo `Promotion`), módulo de métodos de pago con cuentas bancarias configurables (nuevo modelo `BankAccount`, máximo 3 por organización) y selección de método de pago (local vs. transferencia + comprobante) en el flujo de confirmación de reserva, integración con Google Calendar por profesional.

## 22. Ideas futuras

Módulos avanzados: Inteligencia Artificial, Inventario de productos, CRM avanzado, integraciones directas con WhatsApp para reservas automáticas, analíticas y sistemas de fidelización.

**(Agregado 2026-08-02)** La visión de `/[slug]` se amplió de "página de reservas" a "mini-sitio comercial por barbería" (CMS + Booking Engine + CRM + Payments + Marketing) — ver §50 para el desglose completo y el roadmap de fases (Dashboard → CMS del negocio → Pagos → Integraciones) acordado para no implementar todo de golpe.

## 23. Próximos pasos recomendados

1. Verificar en tu máquina que `pnpm dev` (web) y `pnpm start:dev` (api) levantan juntos sin conflicto de puertos, y probar el flujo completo: registrar barbería → login → crear profesional/servicio/cliente → crear reserva → completarla → facturarla → marcarla pagada.
2. Empezar a construir pruebas unitarias sobre los módulos de mayor complejidad (`BookingsService`, `AuthService`).
3. Definir si `Payment`, `Notification` y `AuditLog` entran en el alcance cercano o quedan para después.
4. Evaluar Refresh Tokens si la sesión de 1 día resulta corta para el uso real.
5. Agregar endpoint para listar miembros del equipo (complementa `/auth/invite`).


# PARTE IV — HISTORIAL TÉCNICO COMPLETO (orden cronológico)

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

## 27. CRUD completo — Profesionales, Servicios, Clientes (2026-07-25)

Se completó Update (`PATCH :id`) y Delete (`DELETE :id`) para los tres módulos de catálogo. Mismo patrón en los tres, sin excepciones:

- **Aislamiento multi-tenant:** `findFirst({ where: { id, organizationId } })` antes de cualquier mutación — si el registro existe pero es de otra organización, responde `404` exactamente igual que si no existiera. Nunca revela que un `id` pertenece a otra barbería.
- **Roles:** Profesionales y Servicios → `OWNER`/`ADMIN`. Clientes → `OWNER`/`ADMIN`/`RECEPTIONIST` (mismo criterio que su endpoint de creación).
- **Integridad referencial (P2003):** ninguno de los tres tiene `onDelete: Cascade` hacia `Booking` (a propósito, mismo principio que `Invoice`) — borrar un registro con historial asociado ahora devuelve `409 Conflict` sugiriendo desactivarlo (`isActive: false`) en vez de un 500 crudo de Postgres. Helper compartido: `isForeignKeyConstraintError` en `common/prisma-error.util.ts`, hermano de `isUniqueConstraintError`.
- **`isActive`:** no existía en `Service` ni en `Client` — se agregó vía migración `20260725215619_service_client_is_active` (aditiva, verificada contra la cadena completa de 7 migraciones). `Professional` ya lo tenía desde antes.
- **DTOs de actualización:** `UpdateProfessionalDto` se escribió a mano (todos los campos opcionales); `UpdateServiceDto`/`UpdateClientDto` usan `PartialType` de `@nestjs/mapped-types` (dependencia nueva, agregada a `package.json`) sobre sus DTOs de creación, extendidos con `isActive`.
- **Nota de alcance:** este ciclo fue explícitamente solo backend — no se tocó ningún archivo de `apps/web`. El frontend de Reservas/Profesionales/Servicios/Clientes sigue sin UI para editar ni borrar (solo crear y listar) — es un pendiente frontend, no de este ciclo.

## 28. `GET /organizations/mine/members` — listar el equipo (2026-07-25)

Se agregó a `OrganizationsController` (no se creó un módulo `Team` aparte — es una sola consulta de lectura sobre `Membership`, un módulo dedicado hubiera sido abstracción sin necesidad real, YAGNI). Consulta `Membership` filtrado por `organizationId` (nunca `User` directamente — desde la identidad global, `User` no tiene `organizationId` propio), con `select` explícito en la relación `user` (nunca spread del objeto completo) para excluir `password` **por construcción**, no por un `omit` que alguien podría olvidar mantener si `User` gana campos sensibles más adelante. Incluye el `Professional` vinculado si existe (vía la relación `User.professional`).

**Restricción de rol — decisión tomada, ajustable:** `OWNER`/`ADMIN` únicamente (más estricto que `B2B_ROLES`), mismo criterio que `/auth/invite`, que ya tenía esa restricción. Ver a quién más nombre/correo pertenece es información de gestión de staff — si se necesita que `RECEPTIONIST`/`BARBER` también lo vean, es cambiar el decorador `@Roles(...)`, no un rediseño.

Respuesta: `[{ membershipId, role, memberSince, user: { id, name, email, professional } }]`.

## 29. Auditoría Enterprise — Fase 1: Infraestructura (2026-07-25)

### 29.1. Qué se encontró

- **`app.enableShutdownHooks()` nunca se llamaba.** Sin esto, Nest no reenvía `SIGTERM`/`SIGINT` a los hooks de ciclo de vida — `PrismaService.onModuleDestroy()` (que llama `$disconnect()`) no tenía garantía de ejecutarse en un apagado real de contenedor/orquestador. Conexiones podían quedar colgadas en cada redeploy.
- **Caché:** no existía ninguna capa de caché en el proyecto (confirmado — `Redis`/`BullMQ` figuran en `PROJECT_MASTER.md` §8 como "planeado, no implementado", y seguían sin ninguna dependencia real en `package.json`).
- **Pool de conexiones de Prisma:** sin configuración explícita — usa el comportamiento implícito por defecto (basado en CPUs detectadas). **No se tocó** (ver §29.3).
- **`ConfigService` instalado pero no usado:** `@nestjs/config` está registrado globalmente, pero todo el código lee `process.env.X` directamente en vez de inyectar `ConfigService`. **No se tocó** (ver §29.3).

### 29.2. Qué se mejoró, y por qué

1. **`main.ts`: `app.enableShutdownHooks()`** — una línea, cero riesgo, cierre limpio de conexiones garantizado en cada apagado del proceso.
2. **Capa de caché (`@nestjs/cache-manager` + `cache-manager` + `keyv`, en memoria — sin Redis, mismo criterio ya aplicado al rate limiting de la reserva pública: no hay Redis en el stack, no se justifica agregarlo solo para esto).** Registrada **globalmente** en `AppModule` (`CacheModule.register({ isGlobal: true, ttl: 30000 })`) tal como se exigió, pero **aplicada explícitamente solo en un lugar**: `GET /public/:slug/booking-data` (TTL 15s). Es la única lectura del sistema que es simultáneamente pública, de alto tráfico repetido (cualquier visitante de la página de reservas la llama) y de baja frecuencia de cambio real (el catálogo de servicios/profesionales no cambia minuto a minuto). `CacheInterceptor` usa la URL completa como clave por defecto, y el `:slug` ya es parte de la URL — cada organización cachea por separado, sin riesgo de mezclar datos entre tenants. **No se aplicó a ningún endpoint autenticado ni de escritura** — cachear datos por-organización con mutación frecuente (reservas, clientes) sin una estrategia de invalidación es exactamente el tipo de "optimización porque sí" que se pidió evitar.

### 29.3. Qué se decidió NO tocar, y por qué

- **Pool de conexiones de Prisma:** cambiar el `connection_limit` en `DATABASE_URL` sin saber el proveedor de Postgres real de producción (managed, con su propio límite de `max_connections`) es adivinar un número sin base. Queda documentado como punto a decidir junto con la infraestructura de despliegue, no como código a cambiar ahora.
- **Migrar todo `process.env.X` a `ConfigService` inyectado:** es el patrón "correcto" de NestJS, pero es un refactor invasivo (toca casi todos los módulos) para un beneficio marginal — el proyecto ya tiene una verificación de fallo rápido para `JWT_SECRET` (§11). Se registra como mejora de menor prioridad, no se ejecuta en esta fase para no introducir riesgo de regresión sobre código que ya funciona.
- **`compression` middleware u otro paquete nuevo de rendimiento:** hubiera sido una dependencia nueva no cubierta por la única excepción explícita de esta fase (`@nestjs/cache-manager`). Se deja como recomendación, no como cambio.

### 29.4. Riesgos

- Ninguno de los cambios de esta fase toca lógica de negocio ni contratos de API existentes. El único cambio de comportamiento observable es que `GET /public/:slug/booking-data` puede devolver una respuesta de hasta 15 segundos de antigüedad bajo tráfico alto — aceptable para datos de catálogo público.
- `npm audit` reporta 27 vulnerabilidades "high" — **todas preexistentes**, en la cadena de herramientas de desarrollo (`eslint`/`jest`/`@nestjs/cli`, vía `brace-expansion`), no relacionadas con las dependencias nuevas de esta fase. No se tocaron por estar fuera de alcance y requerir cambios disruptivos (`--force`) en versiones de herramientas de build/test.

### 29.5. Validación

`tsc --noEmit` y `npx nest build` completos ejecutados — únicamente los errores ya conocidos y documentados de `@prisma/client` sin generar en el entorno de verificación (no en el tuyo, donde `prisma generate` corre normal). `eslint` limpio sobre todos los archivos tocados. `npm test` y `prisma generate` reales requieren tu máquina — instrucciones abajo.

## 30. Auditoría Enterprise — Fase 2: Seguridad (2026-07-25)

### 30.1. Qué se encontró

- **CORS completamente abierto:** `app.enableCors()` sin argumentos aceptaba peticiones de **cualquier origen**, sin restricción. Ningún dominio permitido explícito.
- **Sin `Helmet`:** ninguna cabecera de seguridad HTTP estándar (`X-Content-Type-Options`, `X-Frame-Options`, HSTS, etc.) estaba configurada.
- **Rate limiting real más limitado de lo que la directiva presuponía:** no existía ningún límite global — el único límite en todo el sistema era el de la reserva pública (5/min, registrado *dentro* de `PublicBookingModule`, no globalmente). `POST /auth/login` no tenía ningún límite — abierto a fuerza bruta sin restricción.
- **JWT:** ya auditado y resuelto en ciclos anteriores — `JwtStrategy.validate()` re-verifica contra `Membership` en cada request (revocación inmediata, no espera a que expire el token), `JWT_SECRET` sin default inseguro, expiración de 1 día. **No se tocó**, ya cumple el estándar.
- **Validaciones (`ValidationPipe`):** `whitelist` + `forbidNonWhitelisted` ya activos globalmente. **No se tocó**.
- **Errores:** NestJS no filtra excepciones no capturadas hacia el cliente con stack trace por defecto (comportamiento nativo, ya seguro). **No se tocó**.
- **Guards/Interceptors/Pipes:** `JwtAuthGuard` + `RolesGuard` aplicados de forma consistente en todos los endpoints internos (auditado exhaustivamente en ciclos anteriores — §24.5, §26, §27). **No se tocó**.

### 30.2. Qué se mejoró, y por qué

1. **`Helmet`** — `app.use(helmet())` con configuración por defecto (suficiente para una API REST que no sirve HTML propio).
2. **CORS restringido** — `CORS_ALLOWED_ORIGINS` en `.env` (lista separada por coma). Sin configurar, cae a `localhost:3000`/`localhost:3001` (desarrollo local) — **nunca más abierto a cualquier origen por defecto**.
3. **`ThrottlerModule` pasa a ser un registro global real** (antes vivía solo dentro de `PublicBookingModule`) — límite base genérico de 100 req/min/IP. El **guard** sigue sin aplicarse a ningún endpoint por defecto — cada controlador lo activa explícitamente, exactamente como ya funcionaba. Este cambio por sí solo no altera el comportamiento de ningún endpoint existente.
4. **Límite estricto en `POST /auth/login`** (regla obligatoria de esta fase): `@Throttle({ default: { limit: 5, ttl: 60000 } })` — 5 intentos/minuto por IP contra fuerza bruta. Explícitamente **solo en login**, no en `register`/`invite`/`update-password` — se puede replicar donde se decida que hace falta, no se expandió por cuenta propia.
5. **Reserva pública preservada exactamente igual** — el límite de 5/min que ya tenía se mantiene idéntico, ahora como *override* explícito sobre el nuevo default global de 100/min (antes era, por coincidencia, el único límite que existía). Verificado que el comportamiento no cambió.

### 30.3. Qué se decidió NO tocar, y por qué

- **`register()` sin rate limit propio:** el mandato fue específicamente sobre login. Se deja anotado como candidato al mismo tratamiento si se decide más adelante, no se implementa por cuenta propia.
- **JWT, validaciones, manejo de errores, Guards existentes:** auditados y ya en buen estado — tocar código que funciona correctamente sin una razón concreta hubiera sido exactamente el tipo de cambio no justificado que se pidió evitar.

### 30.4. Riesgos — uno de ellos requiere tu atención antes de desplegar

- **⚠️ CORS puede romper tu frontend de producción si no configuras `CORS_ALLOWED_ORIGINS`.** Si tu frontend real corre en un dominio que no sea `localhost:3000`/`localhost:3001` (ej. Vercel, tu dominio propio) y esa variable no está seteada, el navegador va a bloquear las peticiones desde ahí — mismo patrón de advertencia que ya tuvimos con el cambio de login. **Configura esa variable con tu dominio real antes de desplegar a cualquier ambiente que no sea tu máquina local.**
- El resto de los cambios de esta fase son aditivos y no alteran ningún contrato de API existente.

### 30.5. Validación

`tsc --noEmit` y `npx nest build` completos — mismo conteo de errores que en la Fase 1 (24), todos ya documentados como el artefacto conocido de `@prisma/client` sin generar en mi entorno de verificación. `eslint` limpio sobre todos los archivos tocados y sobre el proyecto completo. `npm test` y `prisma generate` reales requieren tu máquina.

## 31. Parche — protección de fuerza bruta en todo el flujo de autenticación (2026-07-25)

Pedido explícito antes de la Fase 3: extender la protección de `login` a todo el flujo (`register`, `invite`, `update-password`).

### 31.1. Decisión de arquitectura

**Dos capas independientes**, cada una cubriendo lo que la otra no:

1. **Por IP** (`@nestjs/throttler`, ya existía solo en login) — extendido a `register` (10/min), `invite` (20/min, más holgado porque ya requiere sesión de OWNER/ADMIN) y `update-password` (10/min).
2. **Por cuenta** (nuevo — `AttemptLimiter`, `apps/api/src/auth/attempt-limiter.ts`) — contador de fallos guardado en el `CACHE_MANAGER` ya instalado en la Fase 1 (reutilizado, cero dependencias nuevas). Solo cuenta intentos con **credencial incorrecta** (nunca cada request), se resetea en éxito. Aplicado a `login` (8 fallos/10min por email) y `update-password` (5 fallos/10min por `userId`) — los dos únicos endpoints donde hay un secreto existente que alguien podría intentar adivinar.

**Por qué no un lockout persistido en `User` (`lockedUntil`):** descartado — introduce un vector de ataque nuevo (bloquear la cuenta de otra persona a propósito fallando su login) y requiere migración de schema para algo que el caché en memoria ya resuelve sin persistir nada.

**Por qué `register`/`invite` no llevan la capa por-cuenta:** no hay una contraseña existente que adivinar en esos flujos — el riesgo ahí es spam/flooding, que el límite por IP ya cubre.

### 31.2. Mejora incidental encontrada al implementar esto

`AuthService.login()` verificaba `!user` y contraseña incorrecta por separado, con las mismas 401 pero en dos pasos — se unificó en una sola verificación (`!user || !isPasswordValid`) antes de registrar el fallo. Esto evita además una diferencia de comportamiento entre "el correo no existe" y "el correo existe pero la contraseña está mal" que, sin la unificación, el contador de intentos habría tratado de forma distinta. Cambio mínimo, mismo comportamiento externo (sigue devolviendo "Credenciales inválidas" en ambos casos, como ya hacía).

### 31.3. Riesgos

Ninguno de los límites por-IP nuevos debería afectar uso legítimo — 10-20 solicitudes/minuto es generoso para cualquier flujo humano real. El bloqueo por cuenta en login (8 fallos/10min) es razonable incluso para alguien que se equivoca varias veces de verdad; se resetea automáticamente pasada la ventana, no requiere intervención manual.

### 31.4. Validación

`tsc --noEmit` y `npx nest build` — mismo conteo de errores ya documentado (24, todos la cascada de Prisma sin generar). `auth.service.ts` y `attempt-limiter.ts` compilan sin ningún error, ni siquiera el de la cascada — confirmado explícitamente, no solo por inferencia. `eslint` limpio.

## 32. Auditoría Enterprise — Fase 3: Observabilidad (2026-07-26)

### 32.1. Qué se encontró

- **`AuditLog` existía como modelo Prisma, pero sin absolutamente ningún código.** Cero servicio, cero módulo, cero escritura. El modelo tampoco tenía `userId` — sin eso, un log de auditoría no dice quién hizo la acción, solo qué pasó y cuándo.
- **Sin logs estructurados**: el proyecto no usa el `Logger` de Nest de forma consistente en ningún lado (solo `console.error` puntual en `main.ts`).
- **Sin correlación de requests** (ID de trazabilidad propagado entre logs de una misma petición).

### 32.2. Qué se mejoró, y por qué

1. **`AuditLog.userId`** agregado (migración `20260727010227_audit_log_user_id`, aditiva) — **sin FK/relación a propósito**: un registro de auditoría debe sobrevivir aunque el usuario que hizo la acción sea borrado más adelante; nunca debe depender del ciclo de vida de `User` ni bloquear su eliminación.
2. **`AuditModule`/`AuditService`** (`apps/api/src/audit/`) — un método, `log()`, usado en todos los puntos de mutación relevantes. **Principio de diseño no negociable**: un fallo al escribir el log de auditoría **nunca** tumba la operación real que se estaba auditando — el error se atrapa adentro del propio servicio y se registra con el `Logger` nativo de Nest (formato consistente, sin dependencia nueva), nunca se propaga.
3. **Eventos registrados**, exactamente los que pediste — edición, eliminación, cambios administrativos, siempre con `organizationId` (aislamiento multi-tenant, nunca opcional) y `userId` (quién):
   - `Professional`: `UPDATE`, `DELETE`.
   - `Service`: `UPDATE`, `DELETE`.
   - `Client`: `UPDATE`, `DELETE` (dato sensible — información de contacto de una persona real).
   - `Membership` (vía `/auth/invite`): `INVITE` — cambio administrativo por excelencia, alguien nuevo obtiene acceso a la organización. `userId` = quien invitó, `entityId` = a quién.
   - `User` (vía `/auth/update-password`): `UPDATE` — acción sensible de seguridad, vale la pena tener rastro de cuándo cambió cada quien su contraseña.
4. **Logs estructurados**: se adoptó el `Logger` nativo de `@nestjs/common` en `AuditService` en vez de `console.log`/`console.error` sueltos — consistente, con contexto (`AuditService`) y timestamp automático, sin agregar una librería nueva (`winston`/`pino`) que no se justificaba para el alcance de esta fase.

### 32.3. Qué se decidió NO tocar, y por qué

- **`Booking`/`Invoice` sin auditoría de edición/borrado:** por directiva tuya explícita, esas entidades no tienen hard-delete ni edición general — su ciclo de vida es por cambio de estado (`PATCH`), que ya existía antes de esta fase. Agregar auditoría ahí sería un cambio de alcance distinto, no pedido en esta fase.
- **Correlación de requests (ID de trazabilidad):** es una mejora real de observabilidad, pero requiere un middleware nuevo y tocar la firma de cada llamada a logger en todo el proyecto — una adición arquitectónica más grande de lo que "completar el `AuditLog`" pedía. Queda como recomendación para un ciclo futuro, no implementada ahora.
- **`winston`/`pino` u otro logger de terceros:** el `Logger` nativo de Nest ya cubre lo que esta fase necesitaba (contexto + timestamp consistente) sin una dependencia nueva no autorizada explícitamente para esta fase.

### 32.4. Riesgos

Ninguno de los cambios de esta fase altera comportamiento observable para el usuario final — los endpoints `PATCH`/`DELETE` de Profesionales, Servicios y Clientes, e `invite`/`update-password`, siguen respondiendo exactamente igual; solo escriben una fila adicional en `AuditLog` de forma asíncrona y a prueba de fallos.

### 32.5. Validación

`tsc --noEmit` y `npx nest build` — mismo conteo de errores ya documentado (24, la cascada de Prisma sin generar). **Confirmado explícitamente**: `audit.service.ts`, `audit.module.ts`, `professionals.service.ts`, `services.service.ts`, `clients.service.ts` y `auth.service.ts` no aparecen en la lista de archivos con error — compilan limpios sin ninguna excepción, ni siquiera la cascada conocida. `eslint` limpio sobre todo el proyecto.

## 33. Auditoría Enterprise — Fase 4: Calidad (2026-07-27)

### 33.1. Qué se encontró

- **Duplicación real:** el patrón `findFirst({ where: { id, organizationId } }) → 404 si no existe` estaba copiado tal cual, tres veces, en `ProfessionalsService`, `ServicesService` y `ClientsService` — mismo código, solo cambiaba el modelo y el mensaje.
- **DTOs inconsistentes:** `UpdateProfessionalDto` estaba escrito a mano, mientras `UpdateServiceDto`/`UpdateClientDto` ya usaban `PartialType`. Además, `CreateProfessionalDto` no tenía `avatar`/`specialty`/`experienceYears` — campos que sí existen en el modelo desde hace varias fases, así que no se podían asignar al crear, solo al editar.
- **`auth.service.ts` con 398 líneas, mezclando cuatro responsabilidades**: fundar cuenta, invitar equipo, iniciar sesión, cambiar contraseña. La lógica de invitación (`inviteUser` + su helper privado) es una responsabilidad genuinamente distinta de "autenticarse a uno mismo" — violación de SRP real, no cosmética.
- **N+1 queries:** ninguna encontrada — no hay ningún `for`/`forEach`/`.map(async...)` con llamadas a Prisma adentro en todo el proyecto. `AnalyticsService` (el candidato más obvio por la cantidad de consultas) ya usaba `Promise.all` correctamente desde que se construyó.
- **Código muerto:** ningún `console.log` suelto, `TODO`/`FIXME` olvidado, ni import sin usar — confirmado con `eslint` en todo el proyecto, no solo revisado a ojo.

### 33.2. Qué se mejoró, y por qué

1. **`common/find-owned-or-throw.util.ts`** — la verificación multi-tenant + 404 unificada en un solo lugar genérico, usado ahora por los tres servicios. Mismo comportamiento exacto, sin la triplicación.
2. **`CreateProfessionalDto`** completo con `avatar`/`specialty`/`experienceYears`. **`UpdateProfessionalDto`** ahora usa `PartialType(CreateProfessionalDto)` + `isActive`, igual que sus dos hermanos — los tres DTOs de actualización siguen exactamente el mismo patrón.
3. **`TeamService` extraído de `AuthService`** (`apps/api/src/auth/team.service.ts`) — `inviteUser` y su helper privado se movieron ahí completos, sin cambiar una sola línea de su lógica interna. `AuthService` bajó de 398 a 260 líneas; `TeamService` quedó en 167. **El contrato HTTP de `/auth/invite` no cambió ni un carácter** — es una reorganización interna, el controlador ahora inyecta `TeamService` además de `AuthService`.

### 33.3. Qué se decidió NO tocar, y por qué

- **No se dividió `AuthService` más allá de eso.** `register`, `login` y `updatePassword` comparten el mismo `AttemptLimiter` y la misma responsabilidad conceptual ("autenticación de la propia cuenta") — separarlos más hubiera sido fragmentación sin beneficio real, exactamente el tipo de sobre-ingeniería que se pidió evitar.
- **No se tocó `Bookings`/`Invoices`/`Analytics`** — se auditaron y no se encontró duplicación, DTOs inconsistentes, ni violaciones de SOLID que ameritaran cambios.

### 33.4. Riesgos

Cero cambios de contrato de API. La extracción de `TeamService` y la deduplicación de `findOwnedByOrgOrThrow` son reorganizaciones internas — mismo comportamiento externo, verificado explícitamente en la validación.

### 33.5. Validación

`tsc --noEmit` y `npx nest build` — mismo conteo de errores ya documentado (24, la cascada de Prisma). **Confirmado explícitamente, archivo por archivo**: `team.service.ts`, `find-owned-or-throw.util.ts`, `auth.service.ts`, `professionals.service.ts`, `services.service.ts`, `clients.service.ts`, `create-professional.dto.ts` y `update-professional.dto.ts` — ninguno aparece en la lista de archivos con error, ni siquiera el de la cascada conocida. `eslint` limpio en todo el proyecto, incluyendo el archivo nuevo (`find-owned-or-throw.util.ts`) sin ninguna advertencia.

## 34. Auditoría Enterprise — Fase 5: Testing (2026-07-28)

### 34.1. Qué se encontró

Cobertura real: **cero.** Solo existían dos archivos boilerplate del CLI de Nest (`app.controller.spec.ts` probando "Hello World", `prisma.service.spec.ts` trivial) y el e2e boilerplate (`test/app.e2e-spec.ts`). Ninguna prueba tocaba lógica de negocio real.

### 34.2. Qué se escribió, priorizando exactamente lo que pediste

- **Conflictos de reservas** (`bookings/bookings.service.spec.ts`, 7 pruebas): crea sin choque, rechaza con choque, ignora explícitamente las `CANCELLED` al buscar choques (si alguien quita ese filtro sin querer, esta prueba lo detecta), calcula `endTime` desde la duración real del servicio, y valida que servicio/profesional/cliente de otra organización se rechacen.
- **Aislamiento multi-tenant** (`common/find-owned-or-throw.util.ts.spec.ts`, 3 pruebas): al centralizarse en la Fase 4, una sola prueba sólida aquí cubre la protección multi-tenant de Profesionales, Servicios y Clientes a la vez — confirma que `organizationId` va en la misma consulta, nunca verificado aparte, y que un registro ajeno da 404, nunca el registro ni una pista de que existe en otra organización.
- **Autenticación** (`auth/auth.service.spec.ts`, 7 pruebas): login exitoso, contraseña incorrecta, correo inexistente (mismo mensaje que contraseña incorrecta, para no permitir enumeración de correos), **bloqueo real por fuerza bruta tras 8 intentos** (ejecuta el `AttemptLimiter` de verdad, con una caché en memoria falsa pero funcional, no un mock del mecanismo), reseteo del contador tras un login exitoso, y rechazo de registro con correo duplicado.
- **Permisos** (`auth/guards/roles.guard.spec.ts`, 5 pruebas): sin `@Roles()` declarado deja pasar, permite el rol correcto, **rechaza explícitamente a `BARBER` de un endpoint restringido a `OWNER`/`ADMIN`**, rechaza si no hay usuario en la request (debe correr después de `JwtAuthGuard`), y rechaza a `CUSTOMER` de cualquier endpoint B2B.

### 34.3. Validación — con una demostración rigurosa, no solo una afirmación

`ts-jest` **sí ejecuta** las pruebas (a diferencia de `tsc`, que solo tipa) — así que pude correrlas de verdad en mi sandbox. Los 9 fallos que salieron al principio tenían **una sola causa**: los enums `UserRole`/`BookingStatus` de `@prisma/client` son `undefined` en runtime porque el cliente no está generado aquí (el mismo bloqueo de red de siempre). Para no quedarme en la afirmación, lo demostré: armé un stub mínimo del cliente de Prisma con los enums reales, lo puse en el lugar exacto donde Prisma los resuelve (`node_modules/.prisma/client/default.js`), y volví a correr — **las 23 pruebas pasaron, 6 de 6 suites, cero fallos**. En tu máquina, donde `prisma generate` corre normal y genera el cliente real, esto pasa igual de limpio sin necesitar ningún stub.

`eslint` limpio en las 4 pruebas nuevas — corregí dos problemas reales de `prettier` que encontré (formato, no lógica) antes de dar esto por bueno.

### 34.4. Qué se decidió NO escribir, y por qué

- **Pruebas e2e nuevas:** el `test/app.e2e-spec.ts` boilerplate ya existente no se tocó — escribir e2e reales (levantando la app completa contra una base de prueba) es un esfuerzo de infraestructura de pruebas distinto (Testcontainers o similar), fuera del alcance de "cobertura sólida de lógica crítica" que se pidió priorizar.
- **Pruebas de `AnalyticsService`/`InvoicesService`/`OrganizationsService`:** no tienen la misma criticidad de seguridad/aislamiento que las cuatro áreas priorizadas explícitamente — quedan como candidatas para un ciclo futuro si se decide ampliar cobertura más allá de lo crítico.
- **Mockear `AttemptLimiter` en vez de correrlo de verdad:** se decidió usar una caché en memoria real (no mockear cada llamada) precisamente para que la prueba de bloqueo por fuerza bruta valide el mecanismo real, no una simulación de él — es la diferencia entre probar que "se llamó a una función" y probar que "el bloqueo realmente bloquea".

---

# PARTE V — MEMORIA TÉCNICA PERMANENTE


## 35. Estado global del proyecto

Estimaciones basadas en lo verificado contra el código y la documentación existente en este documento — no son una medición automatizada, son la evaluación honesta de quien acaba de auditar cada área.

| Área | % | Estado | Notas |
|---|---|---|---|
| **Backend** | 85% | 🟢 Sólido | CRUD completo en catálogo, auth con identidad global, multi-tenant estricto en todos lados. Faltan módulos `Payment`/`Notification` (modelo existe, sin código — §21), y la limitación de `Professional.userId` (§39.1). |
| **Frontend** | 60% | 🟡 Desactualizado respecto al backend | Dashboard, landing B2B y flujo B2C completos (§14), pero el login todavía no se actualizó al flujo de un solo paso sin slug (el usuario indicó que lo resolvió por su cuenta, no verificado por auditoría — ver §37.4). Sin UI para editar/borrar catálogo, sin listado de equipo, sin adoptar `whatsappBaseUrl`. |
| **Testing** | 30% | 🟡 Cobertura crítica, no total | 22 pruebas unitarias reales cubriendo conflictos de reservas, aislamiento multi-tenant, autenticación y permisos (§34). Sin e2e, sin cobertura de `AnalyticsService`/`InvoicesService`/`OrganizationsService`, sin ninguna prueba de frontend. |
| **DevOps** | 20% | 🔴 Manual | `docker-compose.yml` solo para Postgres local. Sin pipeline de CI/CD, sin definición de entornos de staging/producción, sin despliegue automatizado. Todo el *Definition of Done* de cada fase se corre a mano. |
| **Infraestructura** | 55% | 🟡 Parcial | Caché en memoria, cierre limpio de conexiones, índices compuestos (§29) — resueltos. Pool de conexiones de Prisma sin configurar y `ConfigService` sin adoptar, ambos pendientes de decisión (§39.2, §39.3). |
| **CI/CD** | 5% | 🔴 Inexistente | No hay ningún pipeline automatizado — ni lint, ni test, ni build, ni deploy corren solos en ningún punto del flujo. |
| **Documentación** | 90% | 🟢 Muy sólida | Este documento, `CHANGELOG.md` y `BACKEND_CHANGES.md` cubren cada decisión de arquitectura y cambio de contrato desde el origen del proyecto. |
| **IA** | 0% | ⚪ No iniciado | Solo mencionado como idea futura (§22) — ninguna funcionalidad de IA implementada todavía. |
| **Seguridad** | 80% | 🟢 Sólido | JWT re-verificado contra `Membership` en cada request, `RolesGuard` consistente, bloqueo de fuerza bruta por cuenta e IP, `Helmet`, CORS restringido, `AuditLog` activo (§30-32). Pendientes: adopción de `ConfigService`, límite de forzado de contraseña en primer login post-invitación. |
| **Observabilidad** | 45% | 🟡 Parcial | `AuditLog` completo para ediciones/borrados/cambios administrativos, `Logger` estructurado nativo de Nest. Sin correlación de requests (trazabilidad end-to-end) — pendiente (§39.4). |
| **Escalabilidad** | 50% | 🟡 Vertical, no horizontal todavía | Aislamiento multi-tenant sólido, índices en las consultas más comunes. Caché y rate limiting son **en memoria, de una sola instancia** — no soportan múltiples instancias del backend corriendo a la vez sin migrar a Redis (decisión consciente de YAGNI, no un descuido — ver §39.5). |

---

## 36. Historial de evolución

Línea de tiempo de cambios importantes, construida a partir de las fechas ya documentadas en cada sección de la Parte IV.

| Fecha | Qué cambió | Por qué | Impacto / Arquitectura afectada | Documentación actualizada |
|---|---|---|---|---|
| 2026-07-19 | Migración inicial del schema (`initial_schema`) | Arranque del proyecto | Base de datos completa: Organization, User, Professional, Client, Service, Booking, Payment, ProfessionalService, Notification, AuditLog | — |
| 2026-07-20 | Resolución de migración faltante de `Invoice`; limpieza de backend (RolesGuard, módulo Prisma duplicado, JWT_SECRET sin default) | `Invoice` existía en el schema sin migración aplicada — riesgo de romper facturación en cualquier entorno | Backend: seguridad y consistencia de base de datos | §10.1, §24 |
| 2026-07-20/22 | Rebranding completo BarberFlow OS → Kortek OS; branding centralizado (`lib/brand.ts`) | Decisión de negocio: Kortek pasa a ser la plataforma matriz, BarberFlow su primer producto | Frontend: identidad visual centralizada, sin strings de marca sueltos | §24 |
| 2026-07-22 | Vínculo `Professional.userId` ↔ `User` (FK opcional 1:1); rol `CUSTOMER` agregado; endpoint público de reservas B2C | Habilitar que un `BARBER` tenga cuenta de acceso, y que clientes finales reserven sin ser parte del staff | Modelo de datos + nuevo módulo `public-booking` con rate limiting | §24 |
| 2026-07-23 | Fundación Kortek (P0/P1): campos de micro-sitio en `Organization`/`Professional`, `GalleryImage`, `GET /analytics/dashboard`, `PATCH /auth/update-password`, política de contraseñas centralizada, `whatsappBaseUrl` | Pivote oficial: Kortek como plataforma multi-producto, no solo BarberFlow | Modelo de datos ampliado, primera API de métricas | §25 |
| 2026-07-24 | Identidad global: `User` + `Membership` — un login, varias organizaciones | Necesidad real de negocio: una persona puede tener acceso a más de una barbería | **Cambio de contrato:** `POST /auth/login` deja de pedir `organizationId` — rompe el frontend hasta que se actualice | §26 |
| 2026-07-25 | CRUD completo (`PATCH`/`DELETE`) en Profesionales, Servicios, Clientes; endpoint para listar equipo; Auditoría Enterprise Fase 1 (Infraestructura) y Fase 2 (Seguridad); parche de protección de fuerza bruta en todo el flujo de auth | Backend "100% completo y robusto" antes de tocar frontend, por directiva explícita | Backend: gestión completa de catálogo, caché, Helmet, CORS restringido, rate limiting extendido | §27, §28, §29, §30, §31 |
| 2026-07-26 | Auditoría Enterprise Fase 3 (Observabilidad): `AuditModule` completo | El modelo `AuditLog` existía desde el origen del proyecto sin ningún código que lo usara | Backend: trazabilidad de ediciones/borrados/cambios administrativos | §32 |
| 2026-07-27 | Auditoría Enterprise Fase 4 (Calidad): deduplicación (`findOwnedByOrgOrThrow`), DTOs consistentes, `TeamService` extraído de `AuthService` (SRP) | Reducir deuda técnica antes de seguir escalando funcionalidad | Backend: `AuthService` 398→260 líneas, sin cambios de contrato | §33 |
| 2026-07-28 | Auditoría Enterprise Fase 5 (Testing): 22 pruebas unitarias nuevas | Cobertura real era cero — priorizado lo crítico: reservas, multi-tenant, auth, permisos | Backend: confianza para seguir iterando sin regresiones silenciosas | §34 |

---

## 37. Intentos fallidos

Memoria técnica permanente — cada entrada documenta qué se intentó, por qué, qué salió mal, cómo se resolvió, y qué no debe volver a intentarse.

### 37.1. Migración de `Invoice` — tabla parcialmente creada por un intento anterior no documentado

- **Qué se intentó:** aplicar `prisma migrate deploy` asumiendo que la tabla `Invoice` simplemente no existía todavía (el modelo estaba en `schema.prisma` sin migración correspondiente).
- **Por qué se intentó:** el modelo se había agregado al schema en algún momento sin generar su migración — comportamiento típico cuando se edita el schema a mano sin correr `prisma migrate dev` de inmediato.
- **Qué salió mal:** la migración falló con `type "InvoiceStatus" already exists` — resultó que un intento previo (no documentado, el propio usuario no recordaba haberlo hecho) ya había creado el enum a medias antes de interrumpirse.
- **Cómo se resolvió:** diagnóstico manual con `psql` dentro del contenedor Docker (`SELECT typname FROM pg_type...`, `SELECT * FROM "_prisma_migrations"`), confirmación de que la tabla `Invoice` sí existía completa con un registro real de prueba, y resolución con `prisma migrate resolve --applied` en vez de reintentar el SQL de creación.
- **Qué se decidió finalmente:** marcar la migración como aplicada sin ejecutar su contenido, preservando el dato de prueba existente.
- **Qué NO debe volver a intentarse:** correr `migrate deploy`/`migrate dev` sobre un estado de base de datos sin verificar primero con `migrate status` (y, si hay sospecha de drift, con una consulta directa a `_prisma_migrations` y a las tablas involucradas) que la base realmente está en el estado que la herramienta cree que está.

### 37.2. Entrega de cambios como parches de Git (`.patch` + `git apply`)

- **Qué se intentó:** entregar cada tanda de cambios como un archivo `.patch` para que el usuario corriera `git apply` sobre su copia local.
- **Por qué se intentó:** parecía más preciso que copiar archivos completos, y permitía ver exactamente qué líneas cambiaban.
- **Qué salió mal:** el primer patch se generó como un diff completo desde el commit inicial del repositorio, no desde el estado real en el que ya estaba el proyecto del usuario (que ya tenía una ronda de cambios previa aplicada) — `git apply` rechazó todo por conflictos. Un segundo intento, ya corregido en el cálculo del diff, siguió fallando por diferencias de manejo de saltos de línea entre el entorno del asistente (Linux) y el del usuario (Windows).
- **Cómo se resolvió:** se abandonó el enfoque de parches por completo y se pasó a entregar `.zip` con los archivos finales completos, listos para extraer y reemplazar directamente — sin ninguna dependencia de `git apply` ni de líneas de contexto que coincidan carácter por carácter.
- **Qué se decidió finalmente:** todos los entregables de código desde ese punto en adelante son `.zip` con archivos completos, nunca diffs.
- **Qué NO debe volver a intentarse:** generar un `.patch` para que alguien lo aplique con `git apply` cuando no se tiene certeza absoluta de que el estado base coincide byte a byte con el remoto real, especialmente entre entornos Linux/Windows.

### 37.3. `npx prisma migrate deploy` — conflicto con `devEngines` forzando `pnpm`

- **Qué se intentó:** correr los comandos de verificación tal como se habían indicado en un *Definition of Done*, usando `npx`.
- **Por qué se intentó:** `npx` es el comando genérico más común para ejecutar binarios de paquetes sin instalarlos globalmente.
- **Qué salió mal:** el `package.json` del proyecto declara `devEngines.packageManager` forzando `pnpm` — `npx` intenta resolver con `npm` y falla con `EBADDEVENGINES`.
- **Cómo se resolvió:** reemplazar `npx` por `pnpm exec` (o el script equivalente vía `pnpm prisma ...`) en todos los comandos de verificación.
- **Qué se decidió finalmente:** toda instrucción de comando entregada al usuario a partir de ese punto usa `pnpm exec`/`pnpm <script>`, nunca `npx`, para este proyecto específico.
- **Qué NO debe volver a intentarse:** asumir `npx` como comando genérico seguro en un proyecto sin revisar primero si tiene `devEngines`/`packageManager` forzado en su `package.json`.

### 37.4. Auto-resolución del usuario del login de un solo paso — no verificada por auditoría

- **Qué se intentó:** el propio usuario reportó haber corregido `auth-context.tsx`/`login/page.tsx` para dejar de enviar `organizationId` tras el cambio de contrato del login (§26.2), sin que el asistente revisara el código resultante.
- **Por qué se intentó:** el rol del asistente en ese momento del proyecto era explícitamente "Backend Lead, no tocar frontend" — la corrección quedó fuera de su alcance de trabajo directo.
- **Qué salió mal:** nada confirmado — pero tampoco nada verificado. Es un punto ciego real de este documento.
- **Cómo se resolvió:** no se resolvió con auditoría propia, se aceptó la palabra del usuario.
- **Qué se decidió finalmente:** queda anotado en §35 (Frontend, 60%) y en §39.6 como pendiente de verificación, no como hecho confirmado.
- **Qué NO debe volver a intentarse:** dar por buena una corrección de frontend reportada por el usuario sin, al menos, pedir confirmación explícita del comportamiento observado (¿el login funciona de punta a punta hoy?) antes de declarar el riesgo cerrado en la documentación.

---

## 38. Lecciones aprendidas

- **`bcrypt` nativo falla en Windows** — se usa `bcryptjs` (puro JavaScript) en todo el proyecto desde el origen, decisión inamovible (§19.3).
- **Prisma no genera un cliente real sin acceso de red a `binaries.prisma.sh`** — en cualquier entorno restringido de red (sandboxes de CI, contenedores sin salida a internet completa), `prisma generate`/`migrate dev` fallan. La forma de trabajar alrededor de esto que funcionó bien: escribir el SQL de la migración a mano siguiendo exactamente la convención de nombres que Prisma genera, y verificarlo contra un Postgres real antes de entregarlo — nunca asumir que compila solo porque el código "se ve bien".
- **Los errores P2002 (violación de restricción única) y P2003 (violación de llave foránea) de Prisma no se atrapan solos** — sin manejo explícito, cualquier duplicado o intento de borrar un registro con dependencias termina en un `500` crudo. Centralizar la detección en un helper compartido (`isUniqueConstraintError`/`isForeignKeyConstraintError`) ahorró tiempo real al reutilizarse en cinco módulos distintos sin reescribir la lógica cada vez.
- **CORS y rate limiting no vienen seguros por defecto en NestJS** — `enableCors()` sin argumentos permite cualquier origen; sin registrar `ThrottlerModule` no hay ningún límite de solicitudes. Hay que configurarlos explícitamente, nunca asumir que "ya viene protegido".
- **Cambiar el contrato de un endpoint de autenticación (`/auth/login`) rompe el frontend hasta que se actualiza en paralelo** — este tipo de cambio necesita coordinación explícita de despliegue entre backend y frontend, no puede tratarse como "solo un cambio de backend".
- **Diseñar pensando en multi-tenancy desde el principio evita relaciones únicas globales que después chocan** — el caso de `Professional.userId` (único globalmente, diseñado antes de que existiera el concepto de identidad multi-organización) es el ejemplo concreto: una restricción que tenía sentido en su momento se convirtió en una limitación real varias fases después (§39.1).
- **Reutilizar infraestructura ya instalada evita deuda técnica nueva** — el `CACHE_MANAGER` instalado para cachear la reserva pública terminó resolviendo también el bloqueo de fuerza bruta por cuenta, sin agregar ninguna dependencia nueva para eso.
- **Extraer un patrón duplicado a un helper genérico en cuanto aparece la tercera copia** (no antes, no después) — `findOwnedByOrgOrThrow` se dejó duplicado mientras solo existía en dos servicios; en cuanto apareció la tercera copia idéntica (Fase 4), se consolidó. Extraerlo antes de tiempo hubiera sido abstracción prematura sobre un patrón que todavía podía cambiar de forma.
- **Verificar antes de migrar, siempre** — la regla explícita del proyecto de "si hay correos duplicados entre organizaciones, detente y reporta, no resuelvas automáticamente" evitó corromper datos reales durante el refactor de identidad global (§26). Es una disciplina que vale la pena mantener para cualquier migración estructural futura, no solo esa vez.
- **Un log de auditoría no debe depender del ciclo de vida de las entidades que audita** — `AuditLog.userId` se diseñó explícitamente sin relación de llave foránea hacia `User`, para que el registro sobreviva aunque la cuenta que hizo la acción sea borrada más adelante.

---

## 39. RFC / Decisiones pendientes

Decisiones que todavía no están cerradas — a diferencia de la Parte IV, que documenta decisiones ya tomadas e implementadas.

### 39.1. `Professional.userId` — ¿único global o único compuesto por organización?

- **Contexto:** hoy `Professional.userId` es único globalmente (`@unique`). Esto impide que una misma persona tenga un perfil `Professional` (con página pública, agenda propia) en más de una organización — un caso de uso real desde que existe la identidad global multi-organización (§26).
- **Opciones:**
  1. Mantener único global (estado actual).
  2. Cambiar a restricción compuesta `@@unique([userId, organizationId])`.
- **Ventajas de la opción 2:** habilita que un `BARBER` con acceso a varias barberías tenga perfil público en cada una, de forma coherente con el resto del modelo de identidad global.
- **Desventajas de la opción 2:** requiere migración de datos existentes (revisar si hay `Professional` con `userId` repetido, aunque hoy es imposible por la restricción actual, así que la migración en sí sería de bajo riesgo); toca un modelo ya usado en varios módulos (`ProfessionalsService.findByUserId`, `BookingsController`/`ClientsController` para "mi agenda"/"mis clientes" de un `BARBER`).
- **Estado actual:** limitación documentada y aceptada (§26.5, §31.1), no resuelta. `TeamService.inviteUser()` maneja el caso de colisión de forma controlada (no crashea, reporta `professionalCreated: false`).
- **Recomendación:** cambiar a restricción compuesta cuando haya evidencia real de que alguien lo necesita (un `BARBER` real pidiendo perfil público en una segunda organización) — no antes, para no gastar el cambio en una necesidad todavía hipotética.
- **Impacto arquitectónico:** medio — migración de schema aditiva/de bajo riesgo, pero exige revisar cada lugar que hoy asume "un `Professional` por `User`".

### 39.2. Migrar `process.env.X` a `ConfigService` inyectado

- **Contexto:** `@nestjs/config` está instalado y registrado globalmente, pero ningún servicio lo inyecta — todo el código lee `process.env` directamente.
- **Opciones:** (1) dejarlo como está; (2) migrar todo a `ConfigService`, opcionalmente con un schema de validación (`Joi`/`zod`) al arrancar.
- **Ventajas de migrar:** variables de entorno validadas y tipadas al arrancar, más fácil de testear (se puede inyectar un `ConfigService` falso en pruebas).
- **Desventajas de migrar:** refactor invasivo que toca casi todos los módulos, para un beneficio marginal dado que ya existe una verificación de fallo rápido para `JWT_SECRET`.
- **Estado actual:** no iniciado, evaluado y descartado explícitamente en la Fase 1 de auditoría (§29.3) por la relación costo/beneficio.
- **Recomendación:** revisar de nuevo si el proyecto crece a un punto donde la cantidad de variables de entorno y la necesidad de testear configuración se vuelva un problema real.
- **Impacto arquitectónico:** bajo por variable individual, pero el esfuerzo total de migrarlo todo de una vez es alto.

### 39.3. Pool de conexiones de Prisma

- **Contexto:** sin configuración explícita — usa el comportamiento implícito por defecto de Prisma (basado en CPUs detectadas), que puede comportarse de forma impredecible en entornos contenedorizados con visibilidad de CPU limitada.
- **Opciones:** dejar el default; o fijar `connection_limit`/`pool_timeout` explícitos en `DATABASE_URL`.
- **Estado actual:** no decidido — depende del proveedor real de Postgres en producción (managed, con su propio límite de `max_connections`), que todavía no está definido.
- **Recomendación:** decidir junto con la elección de infraestructura de despliegue real, no en abstracto.
- **Impacto arquitectónico:** bajo — es un parámetro de conexión, no un cambio de código.

### 39.4. Correlación de requests (trazabilidad end-to-end)

- **Contexto:** no existe ningún ID de correlación propagado entre los logs de una misma petición HTTP.
- **Opciones:** agregar un middleware que genere/propague un `X-Request-Id`, incorporado en cada llamada al `Logger`.
- **Estado actual:** evaluado en la Fase 3 de auditoría (§32.3) y descartado por ahora — requiere tocar la firma de logging en todo el proyecto, alcance mayor al de "completar `AuditLog`".
- **Recomendación:** implementar cuando se decida centralizar logs en una herramienta externa (Datadog, Grafana Loki, etc.) — sin esa pieza, la trazabilidad por sí sola aporta menos valor.
- **Impacto arquitectónico:** medio — un middleware nuevo + tocar cada punto de logging existente.

### 39.5. Migrar caché/rate limiting a Redis para escalabilidad horizontal

- **Contexto:** tanto el caché (`@nestjs/cache-manager`) como el rate limiting (`@nestjs/throttler`) y el bloqueo de fuerza bruta por cuenta (`AttemptLimiter`) usan almacenamiento **en memoria**, válido solo mientras el backend corre en una sola instancia.
- **Opciones:** mantener en memoria (estado actual); o migrar a un backend compartido (Redis) cuando se despliegue en más de una instancia.
- **Estado actual:** decisión consciente de YAGNI — no hay Redis en el stack porque no hay necesidad real de escalar horizontalmente todavía.
- **Recomendación:** revisar en cuanto se planee correr más de una instancia del backend en producción — sin un almacenamiento compartido, cada instancia tendría su propio caché/límite independiente, debilitando la protección real.
- **Impacto arquitectónico:** medio — agregar Redis como dependencia de infraestructura nueva, y adaptar los tres mecanismos (caché, throttler, `AttemptLimiter`) a un store compartido.

### 39.6. Verificar el login del frontend de un solo paso

- **Contexto:** el usuario reportó haber corregido el frontend para el nuevo contrato de login (§37.4), sin que el asistente lo haya podido revisar directamente.
- **Estado actual:** no verificado.
- **Recomendación:** confirmar explícitamente (con una prueba real de login de punta a punta, o revisando el código de `apps/web/lib/auth-context.tsx`/`app/login/page.tsx`) antes de asumir que este riesgo está cerrado.
- **Impacto arquitectónico:** ninguno si ya está resuelto — pero es información desactualizada en este documento si no lo está.

---

## 40. Onboarding para nuevos desarrolladores

### Qué leer primero

1. Este documento completo — es la única fuente de verdad. Presta especial atención a la Parte IV (Historial técnico completo) para entender *por qué* el código es como es, no solo qué hace.
2. `CHANGELOG.md` — cambios importantes en orden cronológico inverso, más rápido de escanear que este documento para "qué pasó últimamente".
3. `BACKEND_CHANGES.md` — específicamente los contratos de API que cambiaron, con el detalle de request/response.

### Cómo levantar el proyecto

```bash
# 1. Base de datos local
docker compose up -d

# 2. Variables de entorno
cp .env.example apps/api/.env       # completar JWT_SECRET, WHATSAPP_BASE_URL, CORS_ALLOWED_ORIGINS
cp apps/web/.env.example apps/web/.env.local

# 3. Instalar dependencias (el proyecto exige pnpm — ver §37.3, nunca npx)
pnpm install

# 4. Base de datos
cd apps/api
pnpm exec prisma generate
pnpm exec prisma migrate deploy

# 5. Levantar ambas apps
pnpm start:dev     # apps/api — puerto definido por PORT en .env (recomendado 3001)
pnpm dev           # apps/web — puerto 3000
```

### Cómo entender la arquitectura

- Monorepo `pnpm` + Turborepo — `apps/api` (NestJS) y `apps/web` (Next.js), sin paquetes compartidos todavía (`packages/*` es aspiracional, ver §9).
- Backend: un módulo NestJS por dominio de negocio (`auth`, `organizations`, `professionals`, `services`, `clients`, `bookings`, `invoices`, `public-booking`, `analytics`, `audit`). Cada uno sigue controller → service → Prisma.
- Identidad: `User` es la cuenta global (un solo login); `Membership` conecta un `User` a una `Organization` con un rol específico (§26). No asumas que `User` tiene `organizationId`/`role` directos — ya no los tiene.
- Multi-tenant: **todo** query de negocio filtra por `organizationId` en el mismo `where` que busca el registro — nunca como una verificación aparte después (ver `findOwnedByOrgOrThrow`, §33/§39).

### Dónde empezar a desarrollar

Antes de escribir código nuevo, revisa si el patrón que necesitas ya existe:
- ¿Necesitas verificar que un registro pertenece a la organización antes de editarlo/borrarlo? → `common/find-owned-or-throw.util.ts`.
- ¿Necesitas atrapar un error de Prisma (duplicado o violación de llave foránea)? → `common/prisma-error.util.ts` (`isUniqueConstraintError`/`isForeignKeyConstraintError`).
- ¿Necesitas registrar una acción administrativa? → `AuditService.log()` (nunca dejes que un fallo de auditoría tumbe la operación real — ver el patrón en `audit/audit.service.ts`).
- ¿Necesitas restringir un endpoint por rol? → `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`, o `B2B_ROLES` si aplica a cualquier rol interno.

### Errores comunes

- Usar `npx` en vez de `pnpm exec` — el proyecto tiene `devEngines` forzando `pnpm`, `npx` falla con `EBADDEVENGINES` (§37.3).
- Olvidar filtrar por `organizationId` en un query nuevo — es la regla más repetida de todo este documento porque es la más fácil de olvidar y la más grave si se olvida.
- Asumir que una migración se puede generar sin verificar el estado real de la base primero (§37.1).
- Dejar un endpoint de uso interno solo con `JwtAuthGuard` sin `@Roles(...)` — queda abierto a cualquier usuario autenticado, incluido un `CUSTOMER` (§30).

### Buenas prácticas ya establecidas en el proyecto

- Nunca cascadear el borrado en datos financieros/operativos (`Booking`, `Invoice`) — su ciclo de vida es por cambio de estado, nunca hard-delete.
- Todo P2002/P2003 de Prisma se atrapa explícitamente y se traduce a un `409 Conflict` con mensaje claro — nunca se deja crashear como `500`.
- Todo cambio de contrato de API se documenta en `BACKEND_CHANGES.md` con el impacto exacto en frontend, incluso si el frontend no se toca en el mismo ciclo.
- Antes de escribir una migración estructural (no solo aditiva), verificarla con datos de prueba representativos, no solo contra un schema vacío (§26.1 es el ejemplo de referencia).

---

# PARTE VI — CONSTRUCCIÓN DEL FRONTEND (Kortek Booking)

## 41. Fase 0 — Fundamentos de diseño (2026-07-31)

Primera fase del plan de construcción del frontend acordado: Fundamentos → Landing → Panel administrativo → Sitio público de cada barbería. El panel administrativo se prioriza antes que el sitio público de la barbería porque el sitio público muestra contenido (galería, promociones, bios) que solo el panel puede producir — construirlo antes significaría maquetarlo contra datos mock que luego habría que rehacer.

### 41.1. Qué se hizo

- **Branding corregido:** `apps/web/lib/brand.ts` — `BRAND.name`/`legalName` pasan de "Kortek OS" a **"Kortek Booking"** (el producto), `BRAND.company` pasa a **"Kortek Studio"** (la empresa, con landing propio en otro repositorio). Footer actualizado al copy exacto pedido: `© {año} Kortek Booking · Una creación de Kortek Studio. Todos los derechos reservados.`
- **Tokens de motion y elevación** (`app/globals.css`, `@theme`): `--ease-out`, `--duration-fast/base/slow` (un solo ritmo de animación para todo el producto, no improvisado por componente); `--shadow-card`/`--shadow-raised` con tinte de tinta (no gris genérico), coherentes con la paleta cuero/latón ya existente.
- **Firma visual del producto** (`.leather-grain`): textura de grano sutil (SVG de ruido inline, sin petición de red ni imagen externa), pensada para reutilizarse detrás de héroes y secciones oscuras en los 3 productos — es el "elemento memorable" de la dirección visual, no decoración repetida sin criterio. Complementada con `.brass-sheen-hover`, un barrido de brillo sobre latón solo en hover de CTAs primarios.
- **4 primitivos nuevos** en `components/ui/`, siguiendo exactamente las convenciones ya establecidas (`var(--color-*)`, `rounded-sm`, sin librería de iconos/animación nueva):
  - `Reveal.tsx` — scroll-reveal (fundido + desplazamiento) vía `IntersectionObserver`, sin dependencia nueva. `prefers-reduced-motion` ya se maneja globalmente, así que no necesita lógica propia para respetarlo.
  - `Container.tsx` — ancho máximo consistente (`narrow`/`default`/`wide`), reemplaza el patrón repetido a mano en cada sección del landing.
  - `Avatar.tsx` — imagen o iniciales de respaldo sobre fondo de latón apagado, para profesionales/equipo/perfil.
  - `Stat.tsx` — cifra destacada + etiqueta, para hero del landing y resúmenes del panel.

### 41.2. Qué se decidió NO tocar en esta fase

- La paleta cuero/latón y la pareja tipográfica (Fraunces/Inter/IBM Plex Mono) ya existentes se mantienen intactas — ya cumplían el criterio de identidad propia (no son la paleta/tipografía por defecto de un frontend genérico de IA), así que esta fase construye sobre ellas en vez de reemplazarlas.
- No se instaló ninguna librería de animación (Framer Motion, GSAP) — `Reveal.tsx` cubre el caso de uso real con `IntersectionObserver` nativo. Se revisará si aparece una necesidad de coreografía más compleja (parallax, timelines) en una fase posterior.

### 41.3. Huecos de backend detectados y pendientes de esta ronda (ver también §21)

Confirmados contra el código en esta auditoría, quedan para proponerse uno por uno según se necesiten en la Fase 2 (decisión del usuario — construir en paralelo con el frontend de esa fase):
- Galería: `GalleryImage` existe en `schema.prisma`, cero módulo/controlador/servicio.
- Promociones: no existe ni el modelo.
- `Organization`: no hay ningún endpoint `PATCH` para editar `aboutUs`/`heroImageUrl`/`socialLinks`/`businessHours`/`address`/`googleMapsUrl` (los campos ya existen en el modelo).
- Subida de archivos: decidido implementar Cloudinary (estaba planeado, no implementado — ver §8/§22) para avatar, galería y hero de la barbería.
- Horario individual por profesional (turnos/días libres) no existe como modelo — solo `Organization.businessHours` a nivel de negocio completo.

### 41.4. Validación

`tsc --noEmit` y `eslint .` sobre `apps/web` — limpios, sin errores ni advertencias. `next build` no se pudo completar en el entorno de esta sesión porque no tiene salida de red hacia `fonts.googleapis.com` (usado por `next/font/google` para Fraunces/Inter/IBM Plex Mono) — no es un error de código; se debe confirmar con un build local real antes de dar la fase por cerrada.

### 41.5. Nota aparte — bug de tooling detectado (no corregido, pendiente de tu aprobación)

Al intentar `pnpm install` en este entorno con `pnpm@11.15.0` exacto (la misma versión que exige `devEngines.packageManager` en el `package.json` raíz), la instalación falla con `Invalid package manager specification in package.json (pnpm@^11.15.0); expected a semver version` — pnpm 11.15.0 no acepta un rango (`^11.15.0`) en ese campo, solo una versión exacta. Esto bloquearía `pnpm install` para cualquier desarrollador nuevo que siga el onboarding de §40 al pie de la letra. No se corrigió en esta sesión (es un archivo de configuración raíz, no parte del alcance de esta fase) — queda anotado para que decidas si cambiarlo a `"11.15.0"` exacto.

## 42. Fase 1 — Landing de Kortek Booking (2026-07-31)

### 42.1. Reglas de diseño de todo el proyecto (dadas antes de esta fase)

Antes de esta fase el usuario fijó 8 reglas válidas para las 3 fases de frontend que quedan (Landing, Panel, Sitio público): consistencia visual entre productos, cada pantalla debe responder a un objetivo de negocio explícito, diseño editorial (evitar apilar tarjetas uniformes, alternar composición), microinteracciones en todo componente importante, accesibilidad estricta, rendimiento (sin animación pesada, sin imágenes innecesarias), convertir en componente reutilizable cualquier patrón que se repita 2+ veces, y no dar una pantalla por terminada si no alcanza nivel excepcional. Se aplican explícitamente en esta fase y quedan como criterio de aceptación para las siguientes.

### 42.2. Qué se hizo

- **Sección nueva `Story.tsx`:** contraste editorial "antes/después" (caos de WhatsApp/cuaderno vs. agenda única), con el objetivo de negocio explícito de generar empatía con el dolor real del dueño antes de pedirle que se registre.
- **Rediseño editorial de las secciones existentes**, todas ahora sobre `Container`/`Reveal`: `Hero` (cifras reales del producto, no métricas de uso inventadas — evita falso social proof para un producto que aún no lanza), `Benefits`/`Modules` (bento asimétrico, con un elemento destacado más grande en vez de una grilla uniforme), `Features` (dos columnas editoriales en vez de checklist centrado), `Testimonials` (una cita destacada + dos secundarias, en vez de 3 tarjetas idénticas), `Pricing` (2 planes, el superior destacado — se retiró el tercer plan "Business" como tarjeta, queda como enlace de contacto debajo, según la instrucción explícita de "dos planes de suscripción"), `FAQ`/`CTASection` (mismo contenido, con motion y la textura de firma visual).
- **Microinteracciones:** `Button` (barrido de latón en hover del CTA primario, compresión leve al presionar), `Card` (prop `interactive` — eleva y resalta borde en hover/foco, opt-in para no cambiar el resto de la app que ya usa `Card`), `LandingNav` (sombra al hacer scroll, menú móvil animado con `grid-template-rows` en vez de aparecer/desaparecer instantáneo).
- **Sin imágenes externas:** se evaluó usar fotografía de stock (Unsplash) como sugería el brief original, pero las búsquedas disponibles solo devolvían resultados de sitios como Pinterest sin licencia clara de uso — se decidió no arriesgar derechos de autor en un producto comercial y mantener la convención ya establecida en el proyecto (§24.8) de construir todo con tipografía, gradientes y composición propia. Ver §42.4.

### 42.3. Qué se decidió NO tocar en esta fase

- No se agregó ninguna librería de animación ni de iconos — mismo criterio YAGNI de siempre en este proyecto; `Reveal.tsx` (Fase 0) cubre el scroll-reveal, y los iconos siguen siendo tipográficos (✓/✕/+) o formas simples, consistente con el resto del producto.
- El acordeón de `FAQ` se mantiene sobre `<details>` nativo (accesible por teclado sin JS adicional) en vez de un componente propio — cambiar a un patrón animado con `max-height` en JS hubiera sido una dependencia de complejidad nueva sin beneficio real sobre lo que Tailwind + `<details>` ya resuelven.

### 42.4. Pendiente real — fotografía de marca

La landing sigue sin fotografía real (mockups y composición tipográfica únicamente). Cuando haya fotografía propia de Kortek Booking (o del estudio) lista para usar, se puede incorporar directamente — `Avatar.tsx` (Fase 0) ya acepta una URL de imagen real como reemplazo de las iniciales.

### 42.5. Validación

`tsc --noEmit` y `eslint .` sobre `apps/web` — limpios. `next build` se confirmó exitoso en este entorno **quitando temporalmente `next/font/google`** como diagnóstico (el entorno de esta sesión no tiene salida de red hacia `fonts.googleapis.com`, ver §41.4) — se revirtió ese cambio de diagnóstico antes de entregar, no forma parte del código entregado. Se debe correr `pnpm build` real, con las fuentes de Google, en tu máquina antes de dar la fase por cerrada.

> **Nota:** esta primera versión de la Fase 1 fue rechazada por el usuario y reemplazada por completo — ver §43.

## 43. Fase 1 — Reconstrucción total (2026-08-01)

La primera entrega de la Fase 1 (§42) fue rechazada: era un rediseño incremental sobre la estructura visual existente, y el usuario pidió explícitamente una landing construida desde cero, sin obligación de conservar nada de lo anterior. Esta sección reemplaza §42 como la versión vigente de la landing.

### 43.1. Qué cambió respecto a la versión anterior

- **Fotografía real.** Se abandonó la restricción de "sin imágenes externas" (§24.8) para esta landing por instrucción explícita del usuario. Se usaron 3 fotos de Unsplash (licencia libre, uso comercial permitido), centralizadas en `lib/landing-photos.ts` con crédito al fotógrafo: interior de barbería (hero, a sangre completa), interior con reflejo de vitrina (sección `Story` y fondo del `CTASection` final), y un barbero cortando cabello con máquina (celda fotográfica dentro de `Benefits`). `next.config.ts` ahora permite `images.unsplash.com` vía `remotePatterns`.
- **Hero rehecho por completo:** de un split copy/mockup sobre fondo plano, a una sección a sangre completa (foto + degradado + grano de cuero) con la tarjeta del producto flotando superpuesta y rotada sobre el borde de la imagen, no como panel lateral.
- **2 secciones nuevas** que no existían: `Marquee.tsx` (cinta de texto en movimiento continuo, CSS puro, quiebra el ritmo justo después del hero) y `Proof.tsx` (banda de cifras con la textura de firma visual, antes de los testimonios).
- **`Modules` cambió de tipo de layout completo:** de bento de tarjetas (parecido a `Benefits`) a un índice editorial numerado tipo revista — deliberado para que dos secciones consecutivas nunca se sientan iguales.
- **`Benefits`** ahora incluye una celda fotográfica dentro del bento, no son puras tarjetas de texto.
- **`Pricing`** ahora tiene un toggle mensual/anual funcional (microinteracción real, no decorativa) — 2 planes de suscripción como pide el brief, con el superior destacado.
- **`CTASection` y `FAQ`** rehechos: el CTA final pasó de tarjeta centrada a banda fotográfica a sangre completa; el FAQ pasó de columna centrada a dos columnas asimétricas.
- **`Features.tsx` se eliminó por completo** — su contenido (checklist de funcionalidades) quedó redundante y contradecía la instrucción de "contar una historia, no listar funciones"; lo que tenía de único se repartió entre `Story` y `Modules`.
- **Arco narrativo explícito de principio a fin:** Hero (atención) → Marquee (energía) → Story (problema/frustración) → Benefits (solución) → Modules (detalle de lo que se obtiene) → Proof (resultado/confianza en cifras) → Testimonials (confianza social) → Pricing (planes) → FAQ (última objeción) → CTA (llamado a la acción).

### 43.2. Qué se decidió NO tocar

- Los tokens de marca (paleta cuero/latón, tipografía Fraunces/Inter/IBM Plex Mono) y los primitivos de la Fase 0 (`Reveal`, `Container`, `Stat`, `Avatar`) siguen siendo la base — la reconstrucción es de la **composición y el contenido visual** de la landing, no de la identidad de marca que ya se había aprobado.
- `Testimonials.tsx` se mantiene sin fotos de personas: los testimonios son ficticios (ver nota en el propio archivo) y poner una fotografía de stock de una persona real junto a un nombre y una cita inventada sería presentar a alguien como cliente real sin serlo — ahí sí se sostiene la restricción de no usar fotografía, por ser un tema de honestidad hacia el visitante, no de licencia.

### 43.3. Sobre las capturas de pantalla pedidas

No pude generarlas: este entorno no tiene navegador ni forma de instalar uno (la descarga de Chromium/Playwright requiere dominios fuera de la lista permitida de red del sandbox). Lo que sí pude validar con certeza es que el código compila, tipa y construye correctamente — la revisión visual real solo la puedo confiarte con un `pnpm dev` local. Avísame qué ves y ajusto sobre eso.

### 43.4. Validación

`tsc --noEmit` y `eslint .` sobre `apps/web` — limpios. `next build` confirmado exitoso con el mismo diagnóstico temporal de fuentes que en §42.5 (revertido antes de entregar). Falta tu build real local con fuentes de Google y tu revisión visual — ninguna de las dos se puede hacer desde este entorno.

> **Nota:** esta versión también fue reemplazada — ver §44.

## 44. Fase 1 — Identidad negro/blanco/rojo + carrusel de testimonios + precios definitivos (2026-08-01)

Reconstrucción sobre la base de §43, con tres cambios de fondo pedidos explícitamente por el usuario, más una serie de mejoras puntuales por sección.

### 44.1. Cambio de identidad de marca — afecta TODO el producto, no solo la landing

El usuario confirmó explícitamente que negro/blanco/rojo es la nueva identidad de **todo** Kortek Booking (landing, panel, sitio público), no solo de esta pantalla. Se cambió en `app/globals.css`, que es compartido por las 3 fases:

- `--color-ink/surface/border` pasaron de negro cálido con tinte cuero a negro neutro real (`#0a0a0a`).
- `--color-paper/muted/faint` pasaron de blanco cálido (cream) a blanco/gris neutro.
- `--color-brass` (el acento principal) pasó de latón (`#c89b4a`) a rojo (`#e11d2e`). **Se conservó el nombre de la variable** — `--color-brass`, `--color-brass-hover`, `--color-brass-dim` — para no tener que tocar cada archivo que ya la consume fuera de la landing (`Sidebar.tsx`, `app/login`, `app/register`, `app/dashboard/*`, todos preexistentes a estas fases). Es deuda cosmética menor (el nombre ya no describe el color), documentada aquí para quien lea el código más adelante.
- `--color-danger` se separó deliberadamente del nuevo rojo de marca (tono más anaranjado) para que un estado de error/cancelado nunca se confunda visualmente con un botón o acento de marca.
- `.leather-grain` → renombrado `.film-grain` (mismo mecanismo, sin relación temática con cuero). `.brass-sheen-hover` → `.cta-sheen-hover`. Ambos renombrados de forma segura: solo se usaban dentro de los archivos de landing que ya controla esta fase.
- Nueva utilidad `.cinematic-grade` (blanco y negro parcial + contraste) aplicada a **toda** la fotografía de la landing, para que fotos de fuentes distintas se sientan gradadas bajo una sola dirección de arte en vez de un collage de stock a color crudo.
- Nueva utilidad `.barber-pole` — barber pole animado en CSS puro (gradiente diagonal en bucle), usado una sola vez en `Proof.tsx`.

### 44.2. Hero sin mockup

Se eliminó por completo la tarjeta flotante "Agenda de hoy". El Hero ahora es 100% fotografía a sangre completa (nueva foto, más cinematográfica) + tipografía a mayor escala + CTA primario más fuerte y un enlace de texto en vez de un segundo botón secundario.

### 44.3. Testimonios — carrusel con fotos

`Testimonials.tsx` se reescribió como carrusel con autoplay (6s), pausa al pasar el mouse/foco, navegación por puntos, `aria-live` para lectores de pantalla. Se usaron 3 retratos de archivo (Unsplash, licencia libre) como avatar. **Nota de honestidad, sin cambios respecto a §43.2:** son fotos de archivo genéricas, no de las personas reales detrás de cada nombre ficticio — el usuario pidió explícitamente fotografía aquí, así que se incluyó, pero sigue siendo contenido de marcador de posición que debe reemplazarse por clientes reales antes de un lanzamiento real.

### 44.4. Precios definitivos y CTA de WhatsApp

`Pricing.tsx`: Estándar US$29/mes, Pro US$59/mes (el Pro ahora dice explícitamente "Todo lo del plan Estándar, más..."). El toggle se cambió de switch a dos botones ("Mensual" / "Anual"). El enlace "Hablemos" se convirtió en un CTA con ícono de WhatsApp, apuntando a `BRAND.contact.whatsapp` (`wa.me/XXXXXXXXXX` — placeholder, pendiente de que el usuario coloque el número real).

### 44.5. Footer completo

`LandingFooter.tsx` ahora incluye iconos de Facebook, Instagram, TikTok y WhatsApp (SVG inline, sin librería de iconos — mismo criterio del proyecto), apuntando a `BRAND.social.*`/`BRAND.contact.whatsapp` — todos placeholders pendientes de los enlaces reales del usuario.

### 44.6. Capturas de pantalla — ahora sí

A diferencia de §43.3, esta vez sí se consiguieron capturas reales: se instaló temporalmente `puppeteer-core` + `@sparticuz/chromium` (paquete de Chromium empaquetado como tarball de npm, no requiere descarga desde un CDN fuera de la lista permitida de red del sandbox), se levantó `next start` localmente y se navegó con el navegador headless a 4 anchos (1920, 1440, 768, 390px). Ambas dependencias se instalaron con `--no-save` y se eliminaron después de generar las capturas — no forman parte del código entregado ni tocaron `package.json`/`pnpm-lock.yaml`. Limitación real de esas capturas: se generaron con las fuentes de Google deshabilitadas (mismo motivo de red de siempre), así que la tipografía Fraunces/IBM Plex Mono no aparece — el resto (color, composición, fotografía, spacing) sí es fiel al código entregado.

### 44.7. Validación

`tsc --noEmit` y `eslint .` — limpios. `next build` confirmado exitoso (mismo diagnóstico temporal de fuentes, revertido antes de entregar). Capturas de pantalla generadas y adjuntas — ver §44.6 sobre su única limitación conocida.

## 45. Fase 1 — Pulido final: acordeón de FAQ + reveal de scroll (2026-08-01) — CIERRE DE FASE

- **`FAQ.tsx`** pasó de `<details>` nativo (cada pregunta independiente) a un acordeón controlado por estado de React: solo un índice abierto a la vez, la anterior se cierra automáticamente al abrir otra. La animación de alto usa la misma técnica `grid-template-rows` (`0fr` → `1fr`) que ya usaba el menú móvil de `LandingNav` — reutilizada, no reinventada.
- **`Reveal.tsx`** (Fase 0) ahora acepta y reenvía props adicionales de `div` (`onMouseEnter`, `onFocus`, etc.) — mejora genérica del primitivo, necesaria para poder envolver el carrusel de `Testimonials.tsx` en `Reveal` sin perder su lógica de pausa al pasar el mouse/foco.
- **Auditoría de scroll-reveal:** `Testimonials.tsx` era la única sección del landing sin `Reveal` (encabezado y carrusel aparecían de golpe). Ya queda cubierta — las 9 secciones del landing (`Hero`, `Story`, `Benefits`, `Modules`, `Proof`, `Testimonials`, `Pricing`, `FAQ`, `CTASection`) tienen entrada progresiva.

**Con esto se da por cerrada la Fase 1 (Landing de Kortek Booking).** Sigue la Fase 2: Panel administrativo.

### 45.1. Validación

`tsc --noEmit` y `eslint .` — limpios. `next build` confirmado exitoso (mismo diagnóstico temporal de fuentes). Se verificó visualmente con capturas que el acordeón abre una pregunta y cierra la anterior correctamente.

### 45.2. Convención de entrega — vigente desde esta fase en adelante

El usuario pidió que, de aquí en adelante, cada entrega sea un `.zip` **sin carpeta contenedora** — el contenido empieza directo en la raíz del repo (`apps/`, `PROJECT_MASTER.md`, etc.), listo para extraer y reemplazar sobre la copia local sin mover nada a mano. Todo archivo nuevo (imágenes, iconos, SVG) debe ubicarse en su carpeta definitiva del proyecto, nunca suelto.

---

# PARTE VII — FASE 2: PANEL ADMINISTRATIVO

## 46. Nota de reconciliación (2026-08-02)

Antes de continuar, una aclaración honesta necesaria: en sesiones previas de este mismo proyecto se diseñaron y entregaron en `.zip` un módulo de Resumen (sobre `GET /analytics/dashboard`) y una primera versión del shell (`Sidebar`/`Topbar`) con tema oscuro. **Ninguno de los dos llegó a aplicarse a este repositorio** — al auditar el código real antes de esta tarea, `app/dashboard/page.tsx` seguía siendo la versión simple original y `components/Sidebar.tsx` seguía siendo el componente plano original, sin agrupar y sin versión móvil. Lo que sí se aplicó y está confirmado en el código: el rebranding de la landing a "Kortek Booking" y una implementación considerable del sitio público de reserva (`app/[slug]/`, con `@tanstack/react-query`) construida por fuera de este hilo de trabajo. A partir de aquí, todo lo documentado en esta parte del documento refleja únicamente lo que existe verificado en el repositorio.

## 47. Arquitectura de temas: Dashboard claro/grafito vs. Marketing oscuro (2026-08-02)

### 47.1. El problema

Se pidió que el Dashboard tenga fondo claro, sidebar grafito y rojo únicamente como acento — pero `app/globals.css` define `--color-ink` (negro) directamente en `body`, global a toda la aplicación, por decisión explícita de una fase anterior ("negro/blanco/rojo es la identidad de TODO Kortek Booking"). La landing y el futuro sitio público (`app/[slug]`) deben conservar esa identidad sin cambios.

### 47.2. La solución — scope de tema aislado, sin tocar nada existente

Se agregó un bloque completo de variables nuevas en `app/globals.css`, con prefijo `--dash-*`, dentro de un selector `.dashboard-shell`. Ningún `--color-*` existente se renombró, eliminó ni sobrescribió — son dos namespaces completamente separados que conviven en el mismo archivo. `--dash-accent` no duplica el hex del rojo de marca: lo referencia con `var(--color-brass)`, así que ambos temas comparten la misma fuente de verdad para el color de marca.

`app/dashboard/layout.tsx` envuelve todo el árbol del panel en `<div className="dashboard-shell">` — solo los elementos dentro de ese contenedor resuelven las variables `--dash-*`. La landing (`app/page.tsx`) y `app/[slug]` nunca entran en ese scope, así que siguen resolviendo exactamente las mismas variables `--color-*` de siempre, con los mismos valores.

### 47.3. Qué se reconstruyó dentro del nuevo scope

- **`components/dashboard/Sidebar.tsx`** (nuevo — reemplaza `components/Sidebar.tsx`, eliminado): navegación agrupada por función (General / Operación diaria / Negocio / Organización), fondo grafito (`--dash-sidebar-bg`, no `--color-ink`), colapsable a solo íconos con `Tooltip`, drawer real en móvil (fondo oscuro, cierra al navegar), menú de usuario con `Dropdown`.
- **`components/dashboard/Topbar.tsx`** (nuevo): fondo claro, migaja de pan con la sección actual, botón de menú y acceso al usuario en móvil.
- **`components/dashboard/NavIcons.tsx`** y **`nav-items.ts`** (nuevos): set de íconos propio (SVG inline, sin librería) y la única fuente de verdad de qué existe en la navegación — igual que se había planteado en el intento anterior, ahora sí aplicado.
- **`components/ui/Dropdown.tsx`** y **`components/ui/Tooltip.tsx`**: extendidos de forma aditiva (`placement`, `fullWidth`, `panelClassName`, `itemClassName` en `Dropdown`; `side` en `Tooltip`) — el comportamiento y estilo por defecto de ambos se mantiene idéntico al original para no arriesgar ningún consumidor futuro que no pase esas props nuevas. Ninguno de los dos tenía consumidores existentes en el repositorio al momento de extenderlos.

### 47.4. Qué se decidió NO tocar

- Ninguna página de módulo (`bookings`, `clients`, `professionals`, `services`, `invoices`, `team`) — siguen usando `--color-*` (oscuro) hasta que les toque su propio módulo de rediseño. Es un estado transicional esperado: el shell ya es claro/grafito, el contenido interior de cada módulo todavía no.
- `components/ui/Card.tsx`, `Button.tsx`, `Avatar.tsx`, `Badge.tsx` — no forman parte del "shell", quedan para cuando se rediseñen los módulos de contenido.
- `app/[slug]/**`, `components/booking/*`, `lib/queries/*` — congelados por instrucción explícita, sin ningún cambio.

## 48. Deuda de tooling resuelta (2026-08-02)

- **`packageManager` en el `package.json` raíz**: `"pnpm@^11.15.0"` (un rango, inválido para el campo `devEngines.packageManager.version` de pnpm 11.x, que exige versión exacta) → `"11.18.0"` exacto, coincidiendo con la versión real que usa el usuario en su máquina (confirmada en su propia terminal).
- **`type-check` sin efecto**: `turbo.json` ya definía la tarea, pero ni `apps/web/package.json` ni `apps/api/package.json` declaraban el script — Turbo corría 0 tareas en silencio. Se agregó `"type-check": "tsc --noEmit"` a ambos.

## 49. Validación (2026-08-02)

- `pnpm --filter web lint` → **limpio**.
- `pnpm --filter web type-check` (`tsc --noEmit`) → **limpio**.
- `pnpm --filter web build` → **exitoso** (mismo diagnóstico temporal de fuentes de Google de siempre en este entorno, revertido antes de entregar).
- `pnpm lint` / `pnpm type-check` / `pnpm build` a nivel raíz → **fallan, pero exclusivamente por `api#*`**, no por nada de esta tarea ni por `web`. Causa demostrada con evidencia dura: `apps/api` no tiene el cliente de Prisma generado en este entorno porque la descarga del motor de Prisma está bloqueada por la política de red del sandbox —

  ```
  Error: Failed to fetch the engine file at
  https://binaries.prisma.sh/... - 403 Forbidden
  ```

  `binaries.prisma.sh` no está en la lista de dominios permitidos de este entorno. Sin cliente generado, `@prisma/client` no exporta ningún tipo (`UserRole`, `PrismaClient`, etc.), y esos ~24-456 errores (según el comando) son *todos* sombra de esa única causa — ninguno es un error de código real, y no se tocó una sola línea de `apps/api` en esta tarea. En la máquina del usuario, donde `prisma generate` sí tiene salida de red, este bloqueo no existe.

## 49.1. Pulido del shell — jerarquía y contenedor de contenido (2026-08-02)

Continuación directa de §47, dentro del mismo alcance (solo shell, ningún módulo interno tocado):

- **`app/dashboard/layout.tsx`**: `<main>` ahora envuelve `{children}` en un contenedor `max-w-6xl mx-auto`. Ninguna página de módulo definía su propio ancho (verificado antes de tocar nada) — todas dependían 100% del shell, así que las 6 heredan el límite sin necesidad de modificarlas una por una.
- **`components/dashboard/Topbar.tsx`**: el nombre de la sección actual pasa de texto plano a tipografía de título (`font-display`, `text-lg font-semibold`) — se lee como el título real de la página, no como una migaja de pan más.
- **`components/dashboard/Sidebar.tsx`**: se agregó una barra vertical roja de 2px sobre el ítem de navegación activo — refuerzo de "dónde estoy" más allá del tinte de fondo, que por sí solo es sutil sobre el grafito. Confirmadas las duraciones de transición: 150ms en hover/color de ítems, 200ms en el drawer móvil y en el giro del ícono de colapsar — dentro del rango pedido (150-200ms) de forma consistente en todo el shell.

### Validación

`pnpm --filter web lint` → limpio. `pnpm --filter web exec tsc --noEmit` → limpio. `pnpm --filter web build` → exitoso (mismo diagnóstico temporal de fuentes, revertido antes de entregar). Mismo bloqueo de `apps/api` en este entorno que en §49, sin relación con este cambio — no se tocó backend.
---

# PARTE VIII — VISIÓN AMPLIADA DEL PRODUCTO

## 50. Visión ampliada del sitio público — de página de reservas a mini-sitio comercial (2026-08-02)

> **Naturaleza de esta sección:** a diferencia de la mayoría del documento, esto **no** es una auditoría de código — es visión de producto, capturada en una sesión de conversación previa a la implementación. Se documenta aquí, íntegra, porque cambia decisiones de modelado de base de datos que conviene anticipar aunque no se construyan todavía (galería, fotos por servicio, promociones, pagos). Nada de lo descrito en esta sección debe asumirse como implementado hasta que aparezca verificado en una sección posterior con fecha y auditoría de código, siguiendo la misma convención que el resto de este documento.

### 50.1. Redefinición de `/[slug]`

`/[slug]` deja de pensarse como una simple página de reservas y pasa a ser **un mini-sitio comercial personalizado por barbería, generado dinámicamente desde el dashboard**:

```
                    KORTEK BOOKING
                         |
        ---------------------------------
        |                               |
        ↓                               ↓
   Dashboard Admin                Página Pública /[slug]
   Dueño configura                 Cliente visualiza
   el negocio                      y reserva

- Fotos                         - Galería
- Servicios                     - Catálogo
- Profesionales                 - Profesionales
- Promociones                   - Promociones
- Horarios                      - Reservas
- Pagos                         - Pagos
- Información                   - Contacto
```

Todo lo configurado en el dashboard debe ser **parametrizable** (nada hardcodeado) y toda subida de imagen (desde archivo o desde cámara del dispositivo) debe resolverse de forma responsive — el sitio público nunca debe perder formato sin importar la relación de aspecto de lo que suba el barbero.

### 50.2. Hero del negocio

Configurado desde el dashboard: imagen principal, logo, nombre, descripción, ubicación, botón de reservar. Los campos `Organization.heroImageUrl` y `Organization.aboutUs` ya existen en el schema desde la Fundación Kortek (§25.2) — este punto es en gran parte modelado de datos ya resuelto; falta la superficie de dashboard para editarlos y el consumo real en `/[slug]`.

### 50.3. Galería de trabajos realizados

El administrador sube fotos de cortes, barbas, dreadlocks, trenzas y otros estilos realizados; se muestran en una cuadrícula pública ("Nuestros trabajos"). El modelo `GalleryImage` (`organizationId`, `url`, `caption?`, `order`) ya existe desde §25.2 con `onDelete: Cascade` sobre `Organization` — este punto es principalmente de **API + frontend** (subida, no modelo de datos nuevo).

**Arquitectura de subida de imágenes (aplica también a §50.4 y a fotos de perfil de profesionales):** las imágenes **no** se guardan en PostgreSQL. El flujo es:

```
Usuario sube imagen (archivo o cámara)
        ↓
Storage externo (Cloudinary / AWS S3 / similar)
        ↓
Base de datos guarda solo la URL + metadata
        ↓
Frontend renderiza optimizado y responsive
```

Esto ya estaba anticipado como integración pendiente en §21 ("Cloudinary"); esta sección solo detalla el flujo de datos concreto. Requisitos funcionales: subida desde archivo del dispositivo, captura directa desde cámara (móvil), compresión/optimización automática antes o después de subir, y renderizado responsive en el sitio público.

### 50.4. Catálogo de servicios con foto — requiere extender `Service`

El catálogo público (Corte clásico, Barba, Dreadlocks, Trenzas, Otros) debe mostrar, por cada servicio: imagen, nombre, descripción, duración y precio — no solo nombre y precio como hoy. El modelo `Service` actual **no tiene** campo de imagen — se necesita agregar `imageUrl` (mismo patrón de storage externo de §50.3) más un estado `activo/inactivo` para poder ocultar servicios del catálogo público sin borrarlos. El barbero debe poder subir la foto del servicio desde el mismo formulario de creación/edición en el dashboard.

### 50.5. Profesionales — foto, especialidad, bio corta

`Professional.avatar`, `specialty` y `experienceYears` ya existen (§25.1, §25.2); `bio` también existe como campo previo a la Fundación Kortek. Lo que falta es exponer estos campos en la ficha pública del profesional (foto, nombre, especialidad, bio corta) y, opcionalmente, la relación de qué servicios realiza cada profesional — no confirmada todavía en el schema actual, pendiente de auditoría antes de asumir que existe.

### 50.6. Promociones / ofertas — módulo nuevo

No existe modelo hoy. Se necesitaría un nuevo modelo `Promotion` (nombre tentativo), con: `organizationId`, `title`, `imageUrl`, `description`, `startDate`, `endDate`, `active`. Aparecerían públicamente en `/[slug]` mientras estén dentro de su rango de fechas y `active = true`. Administradas desde Dashboard → Promociones.

### 50.7. Información del negocio — mayormente ya modelado

Dirección, teléfono, WhatsApp, redes sociales y horarios: `Organization.address`, `Organization.phone` (ya existía antes de la Fundación Kortek, §25.1), `Organization.socialLinks` (Json) y `Organization.businessHours` (Json) ya existen desde §25.2. `whatsappBaseUrl` como configuración global de la plataforma ya existe (§25.6), pero el **número de WhatsApp propio de cada barbería** para el botón de contacto público no está confirmado como campo separado — verificar contra schema real antes de asumir que falta o que ya está cubierto por `Organization.phone`.

### 50.8. Métodos de pago — módulo nuevo (bancos + selección en el flujo de reserva)

Idea central: el barbero configura desde el dashboard sus cuentas bancarias, y el cliente elige el método de pago al confirmar una reserva.

**Configuración (dashboard):**
- Activar/desactivar "Pago en local".
- Activar/desactivar "Transferencia bancaria".
- Hasta **3 cuentas bancarias** por organización, cada una con: banco, número de cuenta, titular, cédula, y prioridad/orden de aparición.

**Modelo de datos propuesto:** nuevo `BankAccount` (`organizationId`, `bankName`, `accountNumber`, `accountHolderName`, `idNumber`, `order`, `active`), más un flag de configuración en `Organization` (o modelo de configuración de pagos aparte) para los dos toggles de método. Este módulo debe integrarse con el modelo `Payment` que **ya existe en Prisma pero sin servicio/controlador propio** (§21) — evitar crear un módulo paralelo duplicado; extender `Payment` (o el flujo de `Booking`) en lugar de reinventar.

**Flujo en la reserva del cliente:**
1. Cliente confirma reserva → elige método: "Pagar en local" o "Transferencia bancaria".
2. Si elige transferencia: se le muestran los bancos configurados por el barbero (banco, cuenta, titular) y puede subir un comprobante de pago (imagen — mismo flujo de storage externo de §50.3; requiere un campo tipo `proofOfPaymentUrl` en `Booking` o `Payment`).

### 50.9. Google Calendar — integración por profesional (fase posterior, no inmediata)

Cada profesional podría conectar su propio Google Calendar. Flujo previsto:

```
Reserva creada → Booking confirmado → Google Calendar API → Evento creado
```

Requeriría almacenar credenciales/tokens OAuth por profesional (campo nuevo, ej. en `Professional` o tabla aparte) — sin diseñar el detalle todavía, solo se deja registrada la intención para no cerrar el modelo de datos de `Professional` de forma que lo bloquee después.

### 50.10. Roadmap de fases acordado

Para no intentar construir todo esto de golpe, se acordó el siguiente orden — coherente con el estado real del proyecto (Parte VII está en la Fase Dashboard/Panel administrativo ahora mismo):

1. **Fase Dashboard** (en curso — Parte VII): reservas, servicios, profesionales, clientes.
2. **Fase CMS del negocio**: galería (§50.3), fotos de servicios (§50.4), promociones (§50.6), configuración pública del negocio (§50.7), branding por barbería.
3. **Fase Pagos**: cuentas bancarias, selección de método de pago, comprobantes (§50.8).
4. **Fase Integraciones**: Google Calendar (§50.9), WhatsApp, notificaciones.

### 50.11. Por qué se documenta ahora aunque no se implemente todavía

Aunque la implementación sigue el roadmap de §50.10, el diseño de base de datos debe anticipar estos módulos desde ya para no forzar migraciones destructivas después. En síntesis, lo que falta modelar (más allá de lo que §25.2 ya resolvió con `GalleryImage` y los campos de `Organization`/`Professional`) es: `Service.imageUrl` + estado activo/inactivo, el modelo `Promotion`, el modelo `BankAccount` + configuración de métodos de pago, la extensión de `Payment`/`Booking` para comprobante de transferencia, y espacio para credenciales de Google Calendar por profesional. Con esto, Kortek Booking deja de pensarse solo como motor de reservas y pasa a diseñarse como plataforma **CMS + Booking Engine + CRM + Payments + Marketing** para barberías — consistente con la Visión ya declarada en §3, ahora con el detalle concreto de qué implica a nivel de producto y de datos.

---

# PARTE IX — MÓDULO RESUMEN (BACKOFFICE, TEMA CLARO)

## 51. Resumen rediseñado como producto, no como CRUD (2026-08-02)

### 51.1. Contexto de reconciliación

Al auditar el código antes de esta tarea, `app/dashboard/page.tsx` seguía siendo la versión mínima original (4 stats genéricas + agenda), sin `AnalyticsDashboard` en `lib/api.ts` ni `TrendStat`/`format.ts` — ninguna entrega previa de ese módulo específico había llegado a aplicarse (mismo patrón de §46). Esta sección documenta lo que sí quedó implementado y verificado.

### 51.2. Propuesta UX/UI aprobada (resumen)

Antes de programar se presentó y aprobó una propuesta de arquitectura de información, con 6 ajustes del usuario incorporados: acciones rápidas por rol, widget de "Profesional del mes" (sin cifra de ingresos — el endpoint no la expone, se mantuvo honesto en vez de inventarla), "Copiar enlace" junto a "Ver página pública", estados vacíos diferenciados (agenda vacía vs. negocio recién creado sin profesionales ni citas), comportamiento responsive explícito, y "Canceladas hoy" movido de KPI a Alertas.

### 51.3. Qué se implementó

- **KPIs (4, solo roles con visión de negocio):** Ingresos hoy (con variación % vs. ayer), Ingresos 7 días, Reservas hoy, Pendientes por confirmar. "Canceladas hoy" ya no es KPI — vive en Alertas.
- **Acciones rápidas filtradas por rol real:** "Nueva reserva" (todos los roles — `@Roles(...B2B_ROLES)` en el backend incluye a `BARBER`), "Nuevo cliente" (no `BARBER`), "Nuevo servicio"/"Nuevo profesional" (solo `OWNER`/`ADMIN`, igual que el backend). Enlazan al módulo correspondiente — no abren su modal de creación directamente, porque eso requeriría tocar los módulos internos, fuera de alcance hoy.
- **Alertas de hoy:** reservas canceladas, pendientes por confirmar, profesionales activos sin ninguna cita hoy — las tres derivadas de datos reales (`/analytics/dashboard` + `/professionals` + `/bookings`), ninguna inventada.
- **Agenda de hoy:** la próxima cita (por hora, calculada una sola vez al cargar los datos) se resalta con un borde de acento.
- **"Carga de hoy" (nuevo widget):** cuenta de citas por profesional activo, calculada cruzando `/professionals` con `/bookings` — permite ver quién tiene el día lleno y quién no, sin fingir un estado de presencia en vivo que no existe.
- **"Profesional del mes":** consume `topProfessional` de `/analytics/dashboard` tal cual — nombre y citas completadas, sin cifra de ingresos (el endpoint no la devuelve).
- **Estado "negocio recién creado":** si no hay profesionales ni citas, la pantalla reemplaza la agenda/widgets por un bloque de onboarding con 3 CTAs (agregar profesional, agregar servicio, compartir la página pública) en vez de mostrar paneles vacíos sin guía.
- **"Ver página pública" + "Copiar enlace":** en el encabezado, usando `organization.slug` del contexto de auth — `/${organization.slug}` en pestaña nueva, y `navigator.clipboard` para copiar la URL completa con feedback por `Toast`.
- **"Cerrar sesión"**: ya existía en el menú del `Sidebar`/`Topbar` (§47) — no requería cambios.

### 51.4. Tema claro — extensión aditiva de componentes compartidos, no un rediseño global

Como el shell (§47) ya envuelve todo `/dashboard` en `.dashboard-shell`, pero los componentes compartidos (`Card`, `Button`, `Badge`, `PageHeader`, `EmptyState`, `Skeleton`) seguían coloreados exclusivamente para el tema oscuro, usarlos tal cual en esta página los habría vuelto ilegibles (ej. texto casi blanco sobre fondo casi blanco). Se extendió cada uno con una prop `tone?: "dark" | "light"` (por defecto `"dark"` — cero cambio de comportamiento para los módulos que aún no migran), con las clases completas y literales por combinación variante+tono en vez de compuestas en runtime (Tailwind necesita verlas enteras en el código fuente para generarlas). `TrendStat` es la única excepción: no tenía consumidores en el tema oscuro, así que se construyó nativa en `--dash-*` sin variante `"dark"`.

### 51.5. Qué se decidió NO tocar

- Ninguna página de módulo (Reservas, Clientes, Profesionales, Servicios, Facturación, Equipo) — siguen en tema oscuro, sin cambios, tal como se acordó.
- `Avatar.tsx` — su combinación actual de colores (borde oscuro sutil + fondo rojo apagado al 25%) se mantiene legible sobre fondo claro sin necesitar una variante `tone` propia; se dejó así para no ampliar el alcance sin necesidad real.

### 51.6. Validación

`pnpm --filter web lint` → limpio (se corrigieron en el camino dos errores reales de las reglas de pureza de `react-hooks`: una llamada a `Date.now()` durante el render, y un `setState` síncrono dentro de un efecto reaccionando a otro estado — ambos resueltos calculando `nextBookingId` dentro del mismo efecto que ya carga los datos, no en un efecto derivado aparte). `pnpm --filter web exec tsc --noEmit` → limpio. `pnpm --filter web build` → exitoso (mismo diagnóstico temporal de fuentes de Google, revertido antes de entregar). Sin cambios de backend.

## 52. Cierre end-to-end del módulo Resumen (2026-08-04)

### 52.0. Auditoría (Fase 1) — causa raíz real

Se rastreó el flujo completo `Backend → Endpoint → DTO → API → Context → Hooks → Topbar → Dropdown → Render` contra el commit real (`2b6857b`, sin cambios desde la entrega anterior — ninguna ronda previa de correcciones había llegado a aplicarse todavía). Hallazgo: **no hay ningún problema de propagación de contexto.** `POST /auth/login` ya devuelve `organization`, `lib/auth-context.tsx` ya la expone vía `useAuth()`. La causa exacta era que `components/dashboard/Topbar.tsx`, en el código real, nunca desestructuraba `organization` del hook — el dato viajaba correctamente hasta ahí y simplemente no se usaba en ese archivo. Sin bloqueo arquitectónico → se procedió directo a la implementación.

### 52.1. Contexto & Tenant

Sin cambios de arquitectura — el contexto ya era correcto de punta a punta. Se reaplicó el fix de hidratación (`useSyncExternalStore` en `auth-context.tsx`, mismo mecanismo documentado en la ronda anterior) y se conectó `organization` en `Topbar.tsx`.

### 52.2. Menú de usuario

`Ver página pública ↗`, `Copiar enlace`, `Cerrar sesión` — los tres funcionales, en ese orden, en el `Dropdown` del avatar del `Topbar`. Verificado que las tres acciones no aparecen duplicadas en ningún otro punto del panel.

### 52.3. Sidebar — branding del negocio

El encabezado del sidebar muestra un monograma con las iniciales de `organization.name` + el nombre completo del negocio como elemento principal (no hay campo de logo en el backend todavía — iniciales es la solución honesta con los datos reales). "Powered by Kortek Booking" es un crédito de 10px al pie, oculto cuando el sidebar está colapsado.

### 52.4. Marca centralizada

`BRAND.legalName` (getter) y `footer.copyright`/`footer.credit` ya no duplican el literal — referencian `BRAND.name`/`BRAND.company`. Se corrigieron además 3 referencias de texto hardcodeadas en la landing (`Benefits.tsx`, `FoundersManifesto.tsx`, `Story.tsx`) — cambio de texto puro vía interpolación, sin tocar diseño ni estructura de la landing congelada.

### 52.5. Responsive mobile-first — 320 a 1920px

Auditado y endurecido a nivel de código (sin backend disponible en este entorno para levantar una sesión real y capturar pantallas — ver limitación en §52.7):
- `Topbar`: `min-w-0`/`truncate` en la migaja de pan, `shrink-0` en el botón de menú y el trigger del avatar — evita que el título de sección empuje al menú de usuario fuera de pantalla en 320-360px.
- `TrendStat`: tamaño de fuente responsive (`text-xl` → `sm:text-2xl` → `md:text-3xl`) con `break-all` de respaldo — un monto largo (`RD$50,000.00`) ya no arriesga desbordar su columna en una grilla de 2 columnas a 320px.
- KPIs: `gap-x-4` en móvil (antes `gap-8` fijo, demasiado ancho para 2 columnas en pantallas angostas), `sm:gap-x-8` desde tablet.
- Fila de agenda y widget de carga: `min-w-0`/`truncate` en los textos, `shrink-0` en badges/cifras — mismo patrón en toda la pantalla para que ningún texto largo (nombre de cliente, de servicio, de profesional) fuerce scroll horizontal.
- `app/dashboard/layout.tsx`: `min-w-0` en la columna flexible principal — sin esto, un hijo con contenido más ancho que el espacio disponible puede forzar overflow incluso con `flex-1`, por el `min-width: auto` que los elementos flex tienen por defecto.

### 52.6. UX/UI — sin cambios más allá de lo ya documentado en §51 (ronda anterior, reaplicada)

Sombra sutil por defecto en `Card` claro, entrada progresiva con `Reveal` (KPIs/acciones/alertas/agenda/widgets, retrasos escalonados), hover con desplazamiento sutil en agenda/alertas. No se agregó nada decorativo nuevo en esta ronda — el pedido era reaplicar y verificar, no ampliar.

### 52.7. Definición de terminado (Fase 3)

1. ✅ `pnpm --filter web build` exitoso, cero errores TypeScript/ESLint (`pnpm --filter web lint` y `pnpm --filter web exec tsc --noEmit`, ambos limpios).
2. ⚠️ **Cero errores de hidratación — corregido de raíz, pero no verificado en un navegador real desde este entorno.** El fix (`useSyncExternalStore`) es la solución canónica de React para exactamente esta clase de bug, y ya se verificó antes que resuelve el problema conceptual — pero confirmar "cero errores de consola" en tiempo de ejecución requiere el backend real (autenticación) corriendo, que este sandbox no tiene.
3. ✅ "Ver página pública", "Copiar enlace" y "Cerrar sesión" — código verificado, lógica correcta (URL desde `organization.slug`, `navigator.clipboard`, limpieza de sesión real vía `useSyncExternalStore`).
4. ⚠️ **Responsive endurecido y auditado a nivel de código en los 9 anchos pedidos, no verificado con capturas reales** — mismo motivo que el punto 2: no hay backend disponible aquí para autenticarse y renderizar el panel con datos reales.

**Limitación honesta, no maquillada:** los puntos 2 y 4 del DoD piden evidencia visual/de consola en tiempo de ejecución que este entorno no puede producir para pantallas autenticadas (a diferencia de la landing, que sí pudo capturarse por ser pública). Recomendación: correr `pnpm dev` localmente, iniciar sesión, y confirmar ambos puntos — si aparece cualquier desbordamiento o error de hidratación real, es información nueva que no pude anticipar desde aquí y debe reportarse para corregirse en la siguiente ronda.

---

# PARTE XI — METODOLOGÍA POR MÓDULOS (backend primero, frontend después)

## 53. Cambio de estrategia (2026-08-08)

A partir de esta fecha el proyecto se trabaja módulo por módulo, en dos entregas separadas por módulo: **Entrega A (Backend)** primero, aprobada explícitamente, y solo entonces **Entrega B (Frontend)** consumiendo ese contrato ya cerrado. El módulo Resumen/Dashboard queda **congelado** hasta que todos los módulos que lo alimentan (Reservas, Clientes, Profesionales, Servicios, Facturación, Equipo, Configuración, Analytics) estén completos — no se le agregan KPIs, widgets, gráficos ni datos nuevos mientras tanto. Orden de trabajo acordado: Reservas → Clientes → Profesionales → Servicios → Facturación → Equipo → Configuración/negocio → Analytics (si aplica como módulo propio) → Resumen al final.

## 54. Reservas — Entrega A (Backend) (2026-08-08)

### 54.1. Diagnóstico previo (resumen — ver la conversación para el detalle completo)

Backend real antes de esta entrega: `POST /bookings`, `GET /bookings`, `PATCH /bookings/:id/status` — nada más. Dos modelos del schema completamente sin usar y directamente relevantes a Reservas: `ProfessionalService` (qué servicio ofrece cada profesional, con precio/comisión propios) y `Payment` (método y estado de pago) — este segundo se deja intencionalmente fuera de esta entrega, es responsabilidad de Facturación (próximo módulo tras Reservas en el orden acordado, no el inmediato siguiente pero sí antes que Resumen).

### 54.2. Qué se implementó

- **`POST /bookings` — validaciones nuevas:**
  - ~~Rechaza si el profesional no ofrece el servicio solicitado.~~ **(Revocado 2026-08-10):** Decisión de producto: cualquier profesional activo puede ser reservado con cualquier servicio activo de la misma organización. `ProfessionalService` se conserva para precio/comisión específica, pero ya no bloquea reservas.
  - Rechaza si `startTime` ya pasó.
- **`GET /bookings?from=&to=&status=`** — filtro de rango real en el backend (`QueryBookingsDto`), compatible hacia atrás (sin parámetros, mismo comportamiento de siempre). Resuelve el gap que el propio frontend ya había autodocumentado (`lib/queries/bookings.ts`).
- **`PATCH /bookings/:id` (nuevo) — reprogramar:** cambia fecha/hora y, opcionalmente, profesional y/o servicio de una reserva existente (`RescheduleBookingDto`, todos los campos opcionales). Reutiliza la misma lógica de choque de horario que `create()` (se extrajo a un método privado `assertNoConflict`, ahora compartido, excluyendo la propia reserva de la comprobación al reprogramar). Rechaza reprogramar una reserva `CANCELLED` o inexistente en la organización.
- **Tests extendidos** (`bookings.service.spec.ts`): cobertura nueva para las dos validaciones de `create()` y los 4 casos de `reschedule()` (éxito, reserva inexistente, reserva cancelada, choque de horario).

### 54.3. Qué se decidió NO tocar en esta entrega

- **`Payment`** — sigue sin conectarse al flujo de reservas. Corresponde a Facturación, no a Reservas.
- **`DELETE /bookings/:id`** — se preguntó explícitamente si hace falta o si "cancelada" ya cubre el caso de negocio; sin respuesta todavía, no se implementó para no asumir.

### 54.4. Validación

**Limitación de entorno, no del código:** `pnpm --filter api exec tsc --noEmit`/`eslint` no pueden correr limpios en este sandbox porque `prisma generate` sigue bloqueado por la política de red (mismo bloqueo documentado en rondas anteriores, evidencia: `binaries.prisma.sh` responde 403). Se validó lo que sí es posible sin el cliente generado:
- `eslint src/bookings/` → limpio de errores reales; los únicos que aparecen son la cascada conocida de "Unsafe ..." (por no tener el cliente de Prisma generado, no un error de código) — confirmado explícitamente filtrando cualquier error que no sea de esa categoría ni de formato (cero encontrados).
- Compilación aislada de los 4 archivos tocados con `tsc` fuera del proyecto (sin tipos de Prisma) → cero errores en el código nuevo.
- Revisión manual línea por línea de las validaciones nuevas y de `reschedule()`.

Pendiente de tu confirmación real: `pnpm --filter api exec tsc --noEmit`, `pnpm --filter api lint` y los tests (`pnpm --filter api test`) en tu entorno, donde `prisma generate` sí funciona.

### 54.5. Correcciones a partir de tu validación real (2026-08-09)

Corriste los 5 comandos en tu entorno (donde `prisma generate` sí funciona) y encontraste 2 problemas reales, ninguno relacionado con Prisma sin generar:

1. **`TS2698` en `bookings.service.spec.ts:203`** — `Promise.resolve({ id: EXISTING_BOOKING.id, ...args.data })` con `args.data` tipado como `unknown` (spread inválido sobre `unknown`). Corregido tipando `booking.update` en el mock de Prisma con el mismo patrón que ya usaban `findFirst`/`create` (`jest.fn<Respuesta, Args>()`), en vez de una función anónima con un tipo inline débil. Sin `as any`, sin degradar el tipado de producción — el error estaba únicamente en el test.
2. **2 tests fallando en `auth.service.spec.ts` → `AuthService.login()`** — causa raíz: `login()` en producción ya hace `organization.findUnique(...)` y lanza `UnauthorizedException` si no existe (código correcto, sin tocar), pero `mockValidUser()` en el test nunca mockeaba esa llamada — Jest la resolvía `undefined` por defecto, y `login()` fallaba exactamente como se esperaría en ese escenario. Corregido agregando el mock de `organization.findUnique` dentro de `mockValidUser()` (afecta a los 5 tests de `login` que la usan, todos con la organización mockeada correctamente ahora) y se agregó un test nuevo que verifica explícitamente la forma completa de la respuesta (`user` + `accessToken` + `organization { id, name, slug }`), tal como se pidió.

**Evidencia real de los 5 comandos, corridos en este entorno (con las limitaciones ya documentadas de `prisma generate` bloqueado por red):**

- `pnpm --filter api exec tsc --noEmit` → 25 errores, **el `TS2698` ya no aparece** (confirmado explícitamente); los 25 restantes son 100% `TS2305: Module "@prisma/client" has no exported member 'UserRole'/'BookingStatus'/'PrismaClient'/...` — el cliente de Prisma no está generado en este sandbox, no existe como módulo en disco.
- `pnpm --filter api lint` → 537 problemas, todos `no-unsafe-*` sobre valores que "no se pueden resolver" — mismo origen (tipos de Prisma ausentes), repartidos por *todo* `apps/api`, no concentrados en los archivos de esta entrega.
- `pnpm --filter api test` → `Cannot find module '.prisma/client/default'` en 4 de 7 suites (las que importan algo de `@prisma/client`, directa o transitivamente) — el cliente generado no existe físicamente en `node_modules` aquí. Las 3 suites que no dependen de él (`availability.util.spec.ts`, `find-owned-or-throw.util.spec.ts`, `app.controller.spec.ts`) sí corrieron: **13/13 tests pasaron**. Los tests de `bookings.service.spec.ts`/`auth.service.spec.ts` no pudieron ejecutarse aquí por esta misma razón — no puedo mostrarte "36 passed, 0 failed" con evidencia real desde este entorno.
- `pnpm lint` (raíz) → `web:lint` exitoso; `api:lint` falla, mismo motivo.
- `pnpm build` (raíz) → `api:build` falla primero (`Found 25 error(s)`, mismos `TS2305`) y aborta el pipeline antes de llegar a `web:build`. Verificado aparte: `pnpm --filter web build` en aislado — **exitoso**.

**No puedo entregarte los 5 comandos en verde desde aquí** — la causa es 100% que este sandbox no puede descargar el motor de Prisma (`binaries.prisma.sh` bloqueado por política de red, mismo bloqueo de siempre). Necesito que corras tú los 5 comandos reales en tu entorno y me confirmes el resultado antes de dar la Entrega A por cerrada.

---

*Este documento reemplaza integralmente las versiones anteriores, incluyendo `MAESTRO.md`. Toda la información aquí fue verificada directamente contra el código fuente del repositorio y contra el historial real de este proyecto — nada se asumió ni se inventó al escribirlo. La única excepción es la Parte VIII (§50), marcada explícitamente como visión de producto pendiente de implementación y auditoría.*

---

## §55. Reservas — Entrega B: Frontend (2026-08-09)

### 55.1. Alcance implementado

Reconstrucción del módulo de Reservas (`app/dashboard/bookings/page.tsx`) sobre los contratos reales aprobados en la Entrega A. Sin mocks, sin datos inventados.

**Endpoints consumidos (todos aprobados en Entrega A):**
- `GET /bookings?from=&to=&status=` — listado con filtros de rango y estado
- `POST /bookings` — creación de reserva (sin cambios de contrato)
- `PATCH /bookings/:id` — reprogramar reserva (nuevo en Entrega A)
- `PATCH /bookings/:id/status` — cambio de estado (existente)
- `GET /clients`, `GET /professionals`, `GET /services` — selectores de formulario

### 55.2. Archivos modificados / creados

| Archivo | Operación | Cambio |
|---|---|---|
| `lib/api.ts` | Modificado | `api.get()` acepta `params?: Record<string, string>` (retrocompatible); tipos nuevos `BookingFilters`, `RescheduleBookingInput`; campo `notes?` en `Booking` |
| `lib/queries/bookings.ts` | Modificado | `useBookingsQuery(filters?)` con query key dinámica; `useRescheduleBooking()` nuevo; `useCreateBooking`/`useUpdateBookingStatus` sin cambios |
| `app/dashboard/bookings/page.tsx` | Reconstruido | Ver §55.3 |

### 55.3. Funcionalidades de la página de Reservas

> Fotografía de la Entrega B inicial del 2026-08-09. La implementación vigente incorpora y sustituye estos detalles con las correcciones de §55.8 y §55.9.

- **Barra de filtros:** rango `desde/hasta` (por defecto: semana actual) + selector de estado. Botón "Limpiar filtros" solo cuando hay filtros no-default activos.
- **Tabla de reservas:** columnas Fecha/Hora, Cliente, Profesional, Servicio, Estado, Acciones. Responsive: `min-w-[640px]` + `overflow-x-auto`. Hora de fin visible. `tone="light"` coherente con el dashboard.
- **Acciones de estado por estado actual y rol:**
  - `OWNER`/`ADMIN`/`RECEPTIONIST`: PENDING → confirmar / cancelar; CONFIRMED → completar / no-show / cancelar
  - `BARBER`: PENDING → confirmar; CONFIRMED → completar / no-show (sin cancelar — decisión administrativa)
  - `COMPLETED`/`CANCELLED`/`NO_SHOW` → solo lectura
- **Botón "Reprogramar":** visible para OWNER/ADMIN/RECEPTIONIST en reservas PENDING y CONFIRMED. Oculto para BARBER (no es su responsabilidad logística).
- **Modal de creación:** extendido con `min` en datetime-local (backend rechaza startTime pasado). Reset del servicio al cambiar profesional. `useState` lazy init para `nowLocal`.
- **Modal de reprogramación:** formulario con profesional, servicio y nueva fecha/hora. Solo envía al backend los campos que cambiaron respecto al valor original. Valida que hubo al menos un cambio antes de enviar.
- **Estados de UI:** loading (Skeleton 5 filas), empty (sin reservas en absoluto → CTA crear), empty-filtered (sin resultados en el rango → CTA limpiar filtros), error (mensaje + botón reintentar), success (tabla + contador de resultados).
- **Contador de resultados** al pie de la tabla: "N reserva(s) en este rango / en total".

### 55.4. Decisiones técnicas

- La tabla se construyó con HTML semántico inline (no con el componente `Table` de la UI) para tener control total sobre el tema claro (`--dash-*`) sin tener que extender `Table` con `tone="light"` en este ciclo — eso queda para cuando se migre al tema claro en todos los módulos simultáneamente.
- `Date.now()` movido a `useState(() => ...)` (lazy initializer) en vez de calcularlo en cada render — elimina el error `react-hooks/purity` del lint de Next.js 16.
- `useBookingsQuery` acepta `filters?` opcionales. La query key incluye los filtros (`[...queryKeys.bookings.all, filters ?? {}]`) para que React Query cachee y re-fetch correctamente por cada combinación de filtros, sin invalidar todo.
- La invalidación de cache tras mutaciones usa `queryKeys.bookings.all` (sin los filtros), lo que invalida todas las queries de bookings activas — comportamiento correcto: después de crear/reprogramar/cambiar estado, todas las vistas deben refrescarse.

### 55.5. Límites respetados

- **`Payment` no implementado** — pertenece a Facturación, módulo posterior.
- **No se inventaron endpoints** — todo consume contratos ya aprobados.
- **No se adelantaron módulos** — los selectores de Clientes/Profesionales/Servicios son solo selectores, no CRUD completo.

### 55.6. Estado de QA (2026-08-10)

> Estado histórico previo a las correcciones de §55.8 y §55.9; los blockers descritos a continuación ya fueron implementados, pero su QA manual final continúa pendiente.

- **Reservas Frontend continúa en QA manual.**
- **QA no aprobado.**
- El componente `DateTimePicker` actual presenta un blocker funcional y de UX: el contenido se extiende hacia abajo fuera del área visible, lo que impide acceder cómodamente al selector de hora.
- No existe un flujo claro Fecha → Hora → Confirmar; este flujo requiere corrección antes de repetir QA.
- La experiencia visual del modal/picker carece de jerarquía (superficies, inputs y fondos son muy similares y la experiencia se percibe plana); se requiere mejor separación visual manteniendo el tema claro.
- Turbopack entra repetidamente en panic (`FATAL: An unexpected Turbopack error occurred`) durante el desarrollo local.
- `next dev --webpack` permite ejecutar correctamente el frontend y continuar el diagnóstico.
- **Módulo Reservas no cerrado.**
- **Módulo Clientes continúa no autorizado.**
- No se debe presentar todavía el nuevo `DateTimePicker` ni las cards responsive como una entrega funcional aprobada.

### 55.7. Evidencia de validación

Corrida desde el sandbox (sin limitación de Prisma en el frontend):

- `pnpm --filter web exec tsc --noEmit` → **exit 0, 0 errores**
- `pnpm --filter web lint` → **exit 0, 0 errores, 0 warnings**
- `pnpm --filter web build` → **exit 0**, Turbopack compila limpio. Ruta `/dashboard/bookings` generada como static (`○`).

Los 3 comandos del backend siguen pasando en tu entorno (39/39 tests OK, confirmado antes de iniciar esta entrega).

### 55.8. Corrección del blocker de fecha/hora implementada (2026-08-10)

Se corrigió el blocker detectado en QA sin cambiar contratos ni código backend:

- `DateTimePicker` dejó de ser un popover absoluto que crecía hacia abajo desde el formulario. Ahora abre una capa compacta, centrada y contenida por el viewport, compatible con móvil y desktop.
- El flujo quedó dividido en dos vistas excluyentes y explícitas: **Fecha → Hora → Confirmar**. Elegir una fecha válida avanza a Hora; la segunda vista muestra la fecha completa y ofrece `Cambiar fecha`.
- Los días pasados están deshabilitados. Para hoy, las horas/minutos ya transcurridos se deshabilitan y la confirmación vuelve a comparar contra un `new Date()` creado en el instante real del clic; el backend conserva su validación autoritativa.
- `Cancelar`, clic en el fondo y `Escape` descartan la selección temporal. El manejo de `Escape` del picker detiene el evento para no cerrar también el modal de reserva.
- La fecha/hora solo se publica al formulario con `Confirmar fecha y hora`; el CTA final del formulario continúa siendo `Reservar`.
- Se preservan minutos no estándar de reservas existentes al reprogramar (por ejemplo, `10:10`) para no introducir cambios silenciosos.
- `Modal` incorporó contención de viewport, bloqueo de scroll del documento, foco inicial, retorno de foco, ciclo de `Tab` y una jerarquía visual más clara para `tone="light"`. El layout visual oscuro existente se conservó para los otros módulos.
- No se agregaron dependencias y no se modificaron `api.ts`, `bookings.ts`, `BACKEND_CHANGES.md`, backend ni lockfile.

**Validación técnica de esta corrección:**

- `pnpm --filter web exec tsc --noEmit` → exit 0.
- `pnpm --filter web lint` → exit 0, 0 errores y 0 warnings.
- `pnpm --filter web build` → exit 0; `/dashboard/bookings` generado correctamente.

**QA pendiente:** el intento de QA automatizado en el navegador integrado quedó bloqueado antes de abrir la app por una restricción ambiental de permisos (`EPERM` al acceder a la configuración local). Debe repetirse QA manual real con `next dev --webpack`, incluyendo 320/360/390 px, tablet, desktop, teclado, `Escape`, cancelación, creación, reprogramación, conflictos, consola y Network.

**Estado:** corrección implementada y validaciones técnicas en verde; Reservas sigue en QA manual, no está aprobada ni cerrada. Clientes continúa no autorizado.

### 55.9. Implementación final candidata a cierre (2026-08-11)

Se completó la última ronda de implementación frontend de Reservas sobre los contratos reales ya aprobados, sin modificar backend, `api.ts`, queries, dependencias ni lockfile:

- **Cliente:** el selector masivo fue reemplazado por `ClientAutocomplete`, un combobox que filtra en memoria el listado real de `GET /clients` por nombre o teléfono. Incluye máximo visual de 20 coincidencias con scroll interno, estado sin resultados, selección resumida, limpieza, `ArrowUp`/`ArrowDown`, `Enter`, `Escape`, foco visible y semántica combobox/listbox. No se inventó un endpoint de búsqueda ni se abrió el módulo Clientes.
- **Nueva reserva:** el modal se organizó en tres bloques operativos —Cliente, Profesional y servicio, Fecha y hora— con jerarquía, superficies secundarias, validaciones, estados loading/error/retry/sin catálogos y CTA responsive. Se mantienen únicamente profesionales y servicios activos; `ProfessionalService` no filtra ni bloquea.
- **Fecha y hora:** el paso Hora dejó de usar selects nativos y muestra slots visuales cada 15 minutos. Los horarios pasados de hoy están deshabilitados y el dato existente con minutos no estándar se agrega como opción exacta al reprogramar para evitar normalización silenciosa. El backend sigue siendo la autoridad para conflictos y fechas pasadas.
- **Reprogramación:** muestra un resumen explícito de la reserva actual y reutiliza el mismo `DateTimePicker`. Solo habilita Guardar cuando existe un cambio y solo envía los campos modificados. Los catálogos inactivos o no disponibles se presentan honestamente.
- **Pantalla principal:** toolbar compacta de rango/estado, límites de fecha coherentes, orden cronológico ascendente, rango final inclusivo hasta las 23:59:59.999 locales, tabla desktop con mejor jerarquía y cards móviles deliberadas sin tabla comprimida. Las reglas de acciones se centralizaron en `BookingActions` para evitar divergencias entre desktop y móvil.
- **Estados:** loading, error/retry, vacío del rango, vacío filtrado, success, errores reales de mutación y catálogos faltantes se distinguen sin datos simulados. `NO_SHOW` tiene tratamiento visual distinto de `CANCELLED`.
- **Resumen operativo:** no se implementó. Los conteos del conjunto ya filtrado podían confundirse con métricas globales y no justificaban una petición adicional ni adelantar Analytics/Resumen.
- **Responsive y accesibilidad:** header/CTA adaptables, modal ancho contenido por viewport, cards móviles, slots con scroll interno, labels reales, botones nativos, focus visible, `aria-pressed`, combobox/listbox, ciclo de `Tab`, `Escape` y retorno de foco.

**Contratos y alcance:** se conservan `GET /bookings?from=&to=&status=`, `POST /bookings`, `PATCH /bookings/:id`, `PATCH /bookings/:id/status` y los catálogos existentes. No se tocó backend, `BACKEND_CHANGES.md`, Payment, `/[slug]`, Resumen ni ningún módulo posterior.

**Validación técnica:**

- `pnpm --filter web exec tsc --noEmit` → exit 0.
- `pnpm --filter web lint` → exit 0, 0 errores y 0 warnings.
- `pnpm --filter web build` → exit 0; compilación de producción correcta y `/dashboard/bookings` generada.

**Estado vigente:** Implementación final candidata a cierre. QA manual final pendiente. Reservas aún NO aprobada oficialmente. Clientes continúa NO autorizado. El panic conocido de `next dev` con Turbopack permanece separado; no se cambiaron bundler, configuración ni dependencias para ocultarlo.

### 55.10. Correcciones finales de layout, acciones y tooling (2026-08-11)

Intervención quirúrgica posterior a la candidata de §55.9, sin cambios de contratos ni backend:

- **Overflow horizontal:** la tabla se activaba desde `md` con `min-w-[640px]`, cuando a 768 px el área útil restante después del sidebar y padding del `main` era inferior a ese mínimo. Además, cuatro botones simultáneos elevaban el ancho intrínseco de la columna Acciones. La vista de cards ahora se conserva hasta 768 px y la tabla empieza en `lg` (1024 px); en desktop usa `table-layout: fixed`, anchos explícitos de columna y truncado con `title` para conservar acceso al texto completo. Ya no depende de un scroll horizontal interno para los breakpoints desktop previstos.
- **Sidebar en páginas largas:** el `aside` combinaba `h-screen` con posición `static` desde desktop. El documento crecía, pero el fondo grafito quedaba limitado al primer viewport. En desktop ahora es `sticky`, anclado a `top: 0`, con `h-screen` y `self-start`; conserva el drawer `fixed` móvil, la navegación, el colapsado y la estructura existentes.
- **Acciones desktop:** `BookingActions` sigue siendo la única fuente de reglas. En tabla mantiene visible la acción primaria (`Confirmar` o `Completar`) y mueve las secundarias reales a un menú contextual `…`: `Reprogramar`, `No asistió` y/o `Cancelar` según estado y rol. El menú vive en un portal para no ser recortado por la tabla, distingue Cancelar como destructiva, soporta clic externo, `Escape`, flechas, Home/End, scroll/resize y retorno de foco. Mobile conserva botones grandes y visibles.
- **Turbopack:** el panic local `next-panic-1a663ccf71da5e5ba0e741b1025dc4cd.log` reportaba repetidamente `Failed to write app endpoint /login/page` causado por `Next.js package not found`. La instalación real era válida: Next 16.2.10 resolvía mediante el junction de pnpm y `next info` lo detectaba. Con el estado `.next` existente, `pnpm run dev` arrancaba pero `/login` y `/dashboard/bookings` devolvían 404. Al apartar la caché regenerable `.next` y ejecutar exactamente el mismo script, Turbopack inició correctamente y ambas rutas respondieron HTTP 200 sin un nuevo panic. No se encontró incompatibilidad en `next.config.ts` ni en código de aplicación: la causa reproducida fue una caché `.next` corrupta/inconsistente.
- **Decisión de tooling:** `"dev": "next dev"` permanece intacto. No se cambió Next, Webpack, Turbopack, configuración, dependencias ni lockfile. El procedimiento seguro ante la misma firma es detener el servidor, regenerar `.next` y volver a ejecutar `pnpm run dev`; `next dev --webpack` permanece como alternativa diagnóstica, no como script oficial.

**Estado:** Correcciones finales implementadas. QA manual de cierre pendiente. Reservas NO aprobada todavía. Clientes NO autorizado todavía. La inspección autenticada de los viewports y flujos continúa pendiente porque el navegador de QA disponible no tenía una sesión iniciada ni existían credenciales de prueba autorizadas.

### 55.11. Corrección del menú contextual desktop (2026-08-11)

El último defecto visual observado durante QA estaba aislado al menú `…` de `BookingActions` en la tabla desktop:

- **Causa raíz:** aunque el portal evitaba el recorte por el `overflow` de la tabla, se renderizaba en `document.body`, fuera de `.dashboard-shell`. El menú dejaba de heredar `--dash-surface`, `--dash-border-strong`, `--dash-shadow-raised` y los demás tokens claros, de modo que su superficie podía resultar transparente y mezclarse visualmente con acciones de filas posteriores. El posicionamiento también calculaba una altura teórica antes del render en lugar de medir el elemento real.
- **Solución:** el portal ahora se monta dentro de `.dashboard-shell` y conserva coordenadas `fixed`; el menú se renderiza inicialmente oculto, se mide con `getBoundingClientRect()` y solo entonces se muestra. Abre debajo cuando cabe, encima cuando no, y restringe `top`/`left` a un margen seguro del viewport. Tiene fondo blanco opaco, borde, sombra y `z-index` alto con fallbacks explícitos.
- **Interacción:** se mantienen clic externo, `Escape`, navegación por teclado y cierre en scroll/resize; el foco se mueve al primer item después de posicionar y vuelve al trigger cuando corresponde.
- **Alcance:** no cambiaron reglas de acciones, vista mobile, backend, contratos, dependencias, lockfile ni otros módulos.

**Validación técnica:** `pnpm --filter web exec tsc --noEmit`, `pnpm --filter web lint` y `pnpm --filter web build` finalizaron con exit 0. El build de Next.js 16.2.10 compiló y generó `/dashboard/bookings` correctamente.

**Estado vigente:** corrección implementada; QA manual final y aprobación explícita siguen pendientes. Reservas NO está cerrada. Clientes continúa NO autorizado.

### 55.12. Affordance de Limpiar filtros (2026-08-11)

El control `Limpiar filtros` ya utilizaba `Button`, permanecía debajo de los campos y solo se renderizaba con `hasActiveFilters`. Sin alterar esa estructura ni su llamada a `clearFilters`, se reforzó exclusivamente su reconocimiento visual con superficie blanca, borde neutro, sombra mínima, hover gris claro, contraste de texto y anillo de foco. Se mantiene como acción ghost discreta para no competir con `+ Nueva reserva`.

**Validación técnica:** `pnpm --filter web exec tsc --noEmit`, `pnpm --filter web lint` y `pnpm --filter web build` finalizaron con exit 0. Next.js generó `/dashboard/bookings` correctamente.

**Alcance:** sin cambios de comportamiento, filtros, requests, estado, backend, otros módulos, dependencias ni lockfile. Reservas sigue pendiente de QA manual final y aprobación explícita; NO está cerrada. Clientes continúa NO autorizado.

## 56. Cierre oficial del módulo Reservas (2026-08-11)

Esta sección registra el estado vigente y **supersede exclusivamente los estados transitorios de QA pendiente** documentados en §55.6 y §55.8–§55.12. Esas secciones se conservan como historial cronológico de implementación y diagnóstico.

- **Reservas Backend:** **CERRADO / APROBADO**.
- **Reservas Frontend:** **CERRADO / APROBADO**.
- **Módulo Reservas:** **CERRADO oficialmente**.
- **QA manual final:** **APROBADO por el propietario**.
- **Checkpoint funcional aprobado:** `9a30f2abb37857dbbbf15e34df1cbaec576121b6`.
- **Blockers:** no quedan blockers funcionales conocidos que impidan avanzar al siguiente módulo.
- **Tooling local:** `pnpm run dev` vuelve a funcionar después de regenerar `.next`. Se mantiene el diagnóstico documentado en §55.10: la firma reproducida correspondía a una caché `.next` corrupta/inconsistente; no se cambiaron scripts, configuración, Turbopack, versiones ni dependencias.
- **Siguiente módulo autorizado:** **Clientes**, únicamente en fase de **Auditoría/Diagnóstico Backend**.
- **Alcance todavía no autorizado en Clientes:** no iniciar implementación Backend ni Frontend hasta una autorización posterior explícita.
- **Resumen/Dashboard:** continúa congelado hasta el final del orden de módulos; no se autorizan KPIs, gráficos, métricas, widgets ni nuevas agregaciones durante las fases intermedias.

Este checkpoint es únicamente documental: no modifica código, contratos, Prisma, dependencias ni configuración. El cierre oficial no implica adelantar trabajo de Clientes más allá de su próxima auditoría backend.

## 57. Clientes — Entrega A Backend (2026-08-11)

Implementación realizada sobre el checkpoint autorizado `e9dacc348da4b9c507a248530af4782c0d757156`, después de completar la Auditoría/Diagnóstico Backend. Esta sección describe comportamiento implementado; **Clientes Backend todavía no está aprobado** y la Entrega B Frontend continúa no autorizada.

### 57.1. Contrato de Clientes

- `POST /clients`: `OWNER`, `ADMIN` y `RECEPTIONIST`; normaliza nombre/notas con `trim`, correo con `trim + lowercase` y teléfono a una representación canónica. Rechaza duplicados operativos por correo o teléfono dentro de la organización y devuelve una proyección explícita sin `organizationId`.
- `GET /clients`: todos los roles B2B. Excluye inactivos por defecto; acepta `search`, `isActive=true|false`, `page` y `limit` (20 por defecto, máximo 100), con orden estable por `name` e `id`. Conserva un arreglo como cuerpo para compatibilidad con el frontend actual y expone paginación en `X-Total-Count`, `X-Page`, `X-Limit` y `X-Total-Pages`.
- `GET /clients/:id`: nuevo detalle con UUID validado y consulta final aislada por `organizationId`. Un recurso inexistente, ajeno o fuera de la agenda autorizada del `BARBER` produce el mismo `404`.
- `PATCH /clients/:id`: `OWNER`, `ADMIN` y `RECEPTIONIST`; rechaza bodies vacíos, normaliza campos, mantiene `organizationId` en la mutación final y registra `UPDATE`.
- `DELETE /clients/:id`: ya no elimina filas; archiva mediante `isActive=false`, con mutación final multi-tenant y evento `ARCHIVE`.
- `PATCH /clients/:id/restore`: nuevo endpoint para reactivar, limitado a `OWNER`, `ADMIN` y `RECEPTIONIST`, con evento `RESTORE`.
- Límites vigentes: nombre 120, correo 254, teléfono de entrada 30 caracteres y 7–15 dígitos normalizados, notas 2000, búsqueda 120; IDs de ruta y de reserva validados como UUID.

### 57.2. Privacidad, roles y multi-tenancy

- `BARBER` continúa limitado a clientes con reservas en su propia agenda y organización. Su respuesta contiene únicamente `id`, `name`, `email`, `phone` e `isActive`; nunca `notes`, `organizationId` ni timestamps.
- Los roles de gestión reciben una proyección explícita de Cliente; ningún endpoint de Clientes devuelve directamente el objeto Prisma completo ni expone `organizationId`.
- Las respuestas de `GET /bookings` sustituyen `client: true` por una proyección segura de contacto (`id`, `name`, `email`, `phone`), excluyendo notas, tenant y timestamps sin cambiar las funciones aprobadas de Reservas.
- Las reservas internas rechazan clientes inactivos en la consulta autoritativa que incluye `id + organizationId + isActive=true`.
- La resolución `User → Professional` para agenda/clientes de `BARBER` queda además acotada por `organizationId`.

### 57.3. Reserva pública y atomicidad

- `POST /public/:slug/bookings` ya no devuelve `Client`, `clientId`, `organizationId`, notas ni timestamps. La respuesta pública explícita contiene solo un resumen de reserva (`id`, `serviceId`, `professionalId`, `startTime`, `endTime`, `status`) y el resultado no sensible de la creación opcional de cuenta.
- La búsqueda/creación/reactivación de `Client` y la creación de `Booking` ocurren dentro de la misma transacción Prisma. Si falla la reserva, la operación de Cliente no se confirma.
- Un Cliente inactivo que regresa con una reserva pública válida se reactiva dentro de esa transacción. Un conflicto donde teléfono y correo identifican registros diferentes devuelve `409` y no asocia datos ambiguos.
- La creación opcional de la cuenta `CUSTOMER` sigue siendo secundaria y fail-open: se ejecuta después de confirmar la transacción principal y su fallo no invalida la reserva.

### 57.4. Auditoría y datos

- `AuditLog` registra `CREATE`, `UPDATE`, `ARCHIVE` y `RESTORE` de Cliente con `organizationId`, actor cuando existe, entidad e ID; no persiste nombres, correos, teléfonos ni notas. Conserva el comportamiento fail-open de `AuditService`.
- No se añadió migración ni backfill: el schema vigente ya soportaba `isActive` y el alcance aprobado no requiere fusionar o eliminar registros. Los datos históricos no fueron modificados. La normalización se aplica a todas las nuevas entradas y actualizaciones gestionadas por estos contratos.
- El vínculo `Client ↔ User CUSTOMER` continúa **no implementado**. Es requisito futuro para historial/autoservicio B2C y necesita una decisión de producto y modelo propia.

### 57.5. Estado de entrega

- No se rediseñó Clientes Frontend. El único cambio web es la sincronización del tipo `PublicBookingResult` con la respuesta pública segura.
- No se modificaron Prisma, migraciones, dependencias, configuración ni lockfile.
- Validación técnica: backend TypeScript exit 0, lint exit 0 y 76/76 tests; web TypeScript exit 0, lint exit 0 y build de producción exit 0 por la sincronización mínima de `PublicBookingResult`.
- La Entrega A Backend queda **implementada y técnicamente validada, pendiente de revisión y aprobación explícita del propietario**. No iniciar frontend ni declarar Clientes aprobado.
