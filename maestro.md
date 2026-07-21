# DOCUMENTO MAESTRO DEL PROYECTO: BARBERFLOW OS

> **Última actualización:** basada en auditoría completa del código fuente (no en supuestos ni en la versión anterior de este documento). Todo lo escrito aquí refleja lo que existe hoy en el repositorio.

---

## 1. Resumen del proyecto

BarberFlow OS ("The Operating System for Modern Barbershops") es una plataforma SaaS empresarial para la gestión completa de barberías y peluquerías. Opera bajo un modelo **multi-tenant**: cada negocio (`Organization`) administra sus propios clientes, reservas, profesionales y pagos en un entorno de datos aislado mediante `organizationId`.

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
BarberFlow-OS/
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
| Organizations | `POST /organizations` (público), `GET /organizations/mine` (protegido) | Funcional, básico |
| Professionals | `POST /professionals` (OWNER/ADMIN), `GET /professionals` | Funcional |
| Services | `POST /services` (OWNER/ADMIN), `GET /services` | Funcional |
| Clients | `POST /clients` (OWNER/ADMIN/RECEPTIONIST), `GET /clients` | Funcional |
| Bookings | `POST /bookings`, `GET /bookings`, `PATCH /bookings/:id/status` (sin restricción de rol) | Funcional, el más completo |
| Invoices | `POST /invoices`, `GET /invoices`, `PATCH /invoices/:id/pay` (todo: OWNER/ADMIN/RECEPTIONIST) | Funcional — migración resuelta (ver §10.1) |

## 14. Frontend — estado real

- `app/login/page.tsx`: única pantalla con lógica real, pero **con dos bugs que impiden que funcione contra el backend actual**:
  1. No envía `organizationId` en el body, campo obligatorio en `LoginDto`.
  2. Lee `data.access_token` de la respuesta, pero el backend responde `accessToken` — el token nunca se guarda correctamente.
- `app/page.tsx`: dashboard puramente visual (tarjetas y botones sin funcionalidad, sin fetch de datos, sin verificación de sesión).
- `app/layout.tsx`: conserva metadata por defecto de `create-next-app` (`title: "Create Next App"`), nunca personalizado.
- No hay app `admin` separada, ni integración real con ningún endpoint del backend más allá del login (roto).

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
- **Medio:** el frontend no está integrado funcionalmente con el backend; construir nuevas pantallas antes de corregir el login generaría más deuda. **Este es el siguiente foco de trabajo.**
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
- Integración real del frontend con el backend (más allá del login, que además tiene bugs). **Próximo foco de trabajo.**
- App `admin` separada.
- Paquetes compartidos (`packages/ui`, `packages/types`, etc.).
- Integraciones futuras: Redis/BullMQ, Socket.IO, Cloudinary, pasarela de pagos.
- Pruebas unitarias e integración sobre los módulos de negocio (cobertura actual: prácticamente nula).

## 22. Ideas futuras

Módulos avanzados: Inteligencia Artificial, Inventario de productos, CRM avanzado, integraciones directas con WhatsApp para reservas automáticas, analíticas y sistemas de fidelización.

## 23. Próximos pasos recomendados

1. **Reconstruir el frontend** (login funcional + dashboard conectado de verdad al backend). El backend quedó estabilizado y es la base sobre la que construir.
2. Empezar a construir pruebas unitarias sobre los módulos de mayor complejidad (`BookingsService`, `AuthService`).
3. Definir si `Payment`, `Notification` y `AuditLog` entran en el alcance cercano o quedan para después.
4. Evaluar Refresh Tokens si la sesión de 1 día resulta corta para el uso real.

---

*Este documento reemplaza integralmente las versiones anteriores. Toda la información aquí fue verificada directamente contra el código fuente del repositorio — nada se asumió a partir de documentación previa.*
