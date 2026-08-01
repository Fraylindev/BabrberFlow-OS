# CHANGELOG

Todas las entradas están en español, siguiendo el idioma del resto del proyecto. Formato libre, orientado a decisiones y cambios reales — no es un changelog de versión semántica de paquete.

## 2026-07-29 — `MAESTRO.md` evoluciona a `PROJECT_MASTER.md`

- **Renombrado, no reescrito:** todo el contenido histórico de `MAESTRO.md` (secciones 1-34) se preservó intacto, con su numeración original — ninguna referencia cruzada existente se rompió.
- **6 secciones nuevas** (§35-40): Estado global del proyecto, Historial de evolución, Intentos fallidos, Lecciones aprendidas, RFC/Decisiones pendientes, Onboarding para nuevos desarrolladores.
- **Nuevo:** índice de navegación completo al inicio del documento, con separadores de "Parte" (I-V) para ubicar rápidamente cualquier sección sin tocar el contenido existente.
- Detalle completo de cada sección nueva en el propio `PROJECT_MASTER.md`.

## 2026-07-28 — Auditoría Enterprise, Fase 5: Testing (cierre del plan)

- **Nuevo:** 22 pruebas unitarias reales (0 existían antes de esta fase, solo boilerplate) cubriendo exactamente lo priorizado: conflictos de reservas, aislamiento multi-tenant, autenticación (incluyendo bloqueo real por fuerza bruta), y permisos por rol.
- **Validación rigurosa:** las pruebas se ejecutaron de verdad (no solo se tipa-verificaron) mediante un stub temporal del cliente de Prisma que demuestra que los 9 fallos iniciales eran 100% el bloqueo de red conocido — 23/23 pruebas pasan cuando el cliente está generado, como pasará en tu máquina. Detalle completo en `PROJECT_MASTER.md` §34.
- Con esto se cierran las 5 fases de la auditoría Enterprise (Infraestructura, Seguridad, Observabilidad, Calidad, Testing).

## 2026-07-27 — Auditoría Enterprise, Fase 4: Calidad

- **Deduplicado:** `findOwnedByOrgOrThrow` (verificación multi-tenant + 404) estaba copiado idéntico en Profesionales, Servicios y Clientes — ahora es un helper genérico compartido (`common/find-owned-or-throw.util.ts`).
- **DTOs consistentes:** `UpdateProfessionalDto` ahora usa `PartialType`, igual que `UpdateServiceDto`/`UpdateClientDto`. `CreateProfessionalDto` gana `avatar`/`specialty`/`experienceYears` (existían en el modelo, faltaban en el DTO de creación).
- **SRP:** `TeamService` extraído de `AuthService` — la lógica de invitar equipo era una responsabilidad distinta de autenticarse a uno mismo. `AuthService` bajó de 398 a 260 líneas. **Contrato de `/auth/invite` sin ningún cambio.**
- **Auditado y sin hallazgos:** N+1 queries (ninguna en todo el proyecto), código muerto (ningún `console.log`/`TODO` suelto, cero imports sin usar).

## 2026-07-26 — Auditoría Enterprise, Fase 3: Observabilidad

- **Nuevo:** `AuditModule`/`AuditService` — el modelo `AuditLog` existía en el schema desde hace mucho pero no tenía absolutamente ningún código. Ahora registra `UPDATE`/`DELETE` en Profesionales, Servicios y Clientes, `INVITE` en `/auth/invite`, y `UPDATE` en `/auth/update-password` — siempre con `organizationId` y `userId`.
- **Cambiado (schema):** `AuditLog` suma `userId` (sin FK a propósito — un log de auditoría no debe depender del ciclo de vida de `User`).
- **Principio de diseño:** un fallo al escribir el log de auditoría nunca tumba la operación real que se estaba auditando.
- **Evaluado y descartado (con justificación):** correlación de requests (ID de trazabilidad) y logger de terceros (`winston`/`pino`) — el `Logger` nativo de Nest ya cubre lo que esta fase pedía. Detalle completo en `PROJECT_MASTER.md` §32.

## 2026-07-25 — Parche: protección de fuerza bruta en todo el flujo de auth

- **Nuevo:** bloqueo por cuenta (`AttemptLimiter`, en el `CACHE_MANAGER` ya instalado, sin dependencias nuevas) en `login` (8 fallos/10min por email) y `update-password` (5 fallos/10min por userId) — complementa el límite por IP, protege contra ataques distribuidos con rotación de IP contra una cuenta específica.
- **Nuevo:** límite por IP extendido a `register` (10/min) e `invite` (20/min) — antes solo existía en `login`.
- **Mejora incidental:** `login()` unifica la verificación de "usuario no existe" y "contraseña incorrecta" en un solo camino, evitando una diferencia de tratamiento entre ambos casos frente al contador de intentos. Comportamiento externo sin cambios.

## 2026-07-25 — Auditoría Enterprise, Fase 2: Seguridad

- **⚠️ Requiere acción antes de desplegar:** CORS ahora restringido vía `CORS_ALLOWED_ORIGINS` (antes: cualquier origen, sin restricción). Configura esa variable con tu dominio real de producción o tu frontend quedará bloqueado.
- **Nuevo:** `Helmet` — cabeceras de seguridad HTTP estándar, no existían antes.
- **Nuevo:** límite estricto de 5 intentos/minuto en `POST /auth/login` contra fuerza bruta (única ruta con este mandato explícito).
- **Corregido:** `ThrottlerModule` pasa de estar registrado solo dentro de `PublicBookingModule` a ser un registro global real — sin cambiar el comportamiento de ningún endpoint existente (el guard sigue siendo opt-in por controlador).
- **Auditado y sin cambios (ya cumplía el estándar):** JWT, validaciones globales, manejo de errores, Guards existentes. Detalle completo en `PROJECT_MASTER.md` §30.

## 2026-07-25 — Auditoría Enterprise, Fase 1: Infraestructura

- **Nuevo:** capa de caché (`@nestjs/cache-manager`, en memoria, sin Redis), registrada globalmente, aplicada explícitamente solo en `GET /public/:slug/booking-data` (TTL 15s) — la única lectura pública de alto tráfico y baja frecuencia de cambio del sistema.
- **Corregido:** `app.enableShutdownHooks()` faltaba en `main.ts` — sin esto, el cierre limpio de conexiones de Prisma no estaba garantizado en un apagado real de contenedor.
- **Evaluado y descartado (con justificación):** ajustar el pool de conexiones de Prisma sin conocer el proveedor de Postgres real; migrar todo `process.env` a `ConfigService` inyectado (refactor invasivo, beneficio marginal); agregar `compression` (dependencia nueva no autorizada para esta fase). Detalle completo en `PROJECT_MASTER.md` §29.

## 2026-07-24 — Identidad global: User + Membership

- **RUPTURA DE CONTRATO:** `POST /auth/login` ya no acepta `organizationId` en el body — solo `email` + `password`. El frontend actual va a recibir 400 hasta que se actualice. Ver `BACKEND_CHANGES.md` para el detalle completo y los pasos que le tocan a frontend.
- **Nuevo modelo:** `Membership` (usuario × organización × rol), con `onDelete: Cascade` hacia ambos padres. `User` pasa a ser identidad global (`email` único global, sin `organizationId`/`role` propios) con `lastOrganizationId` para resolver el login de un solo paso.
- **Nuevo:** manejo elegante de colisiones P2002 — `register`, `invite`, `organizations`, `clients` y la reserva pública ya no crashean con 500 ante un duplicado; devuelven `409 Conflict` con mensaje claro (o, en el caso de la reserva pública, confirman la reserva y reportan el motivo sin abortarla).
- **Cambiado:** `Client` ahora es único por `(organizationId, email)` — permite walk-ins sin correo, bloquea duplicados dentro de la misma barbería.
- **Limitación conocida documentada:** `Professional.userId` no soporta que una misma persona tenga perfil público en más de una organización todavía — ver `BACKEND_CHANGES.md`.

## 2026-07-23 — Fundación Kortek OS (fase backend)

- **Nuevo:** `GET /analytics/dashboard` — métricas de ingresos, reservas y profesional destacado (ver `BACKEND_CHANGES.md` para el contrato completo).
- **Nuevo:** `PATCH /auth/update-password` — cualquier usuario autenticado cambia su propia contraseña.
- **Cambiado:** mínimo de contraseña de 6 a 8 caracteres en todos los formularios (`register`, `invite`, reserva pública). Centralizado en `apps/api/src/auth/auth.constants.ts`.
- **Cambiado:** `POST /auth/invite` y `GET /public/:slug/booking-data` ahora incluyen `whatsappBaseUrl`, configurable vía `WHATSAPP_BASE_URL` — el frontend deja de depender de un dominio hardcodeado.
- **Nuevo (modelo de datos):** campos de micro-sitio en `Organization` y `Professional`, y modelo `GalleryImage` — base de datos lista para el futuro micro-sitio público, sin API todavía sobre ella.
- **Nuevo (rendimiento):** índices compuestos `(organizationId, status, createdAt)` en `Booking` e `Invoice`.
- **Rebranding:** el proyecto pasó de BarberFlow OS a **Kortek OS**. Kortek es la plataforma matriz; BarberFlow es su primer producto SaaS. Ver `PROJECT_MASTER.md` §24 para el historial completo de decisiones de este rebranding y de toda la reconstrucción del frontend.
- **Bloqueado, pendiente de aprobación manual:** refactor `User` + `Membership` para soportar un usuario perteneciendo a varias organizaciones con una sola identidad. Requiere confirmar primero que no existan correos duplicados entre organizaciones en la base real — ver `PROJECT_MASTER.md` §24.14.

## Historial anterior

El detalle completo de las Fases 0 a 9 (rebranding, limpieza de backend, reconstrucción de frontend, rol `CUSTOMER`, flujo B2C, roles refinados, gestión de equipo) está documentado en `PROJECT_MASTER.md` §24 — no se duplica aquí para evitar que las dos fuentes se desincronicen. Este changelog empieza a llevar entradas propias a partir del ciclo "Fundación Kortek OS".