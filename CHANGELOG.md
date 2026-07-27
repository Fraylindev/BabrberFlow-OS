# CHANGELOG

Todas las entradas están en español, siguiendo el idioma del resto del proyecto. Formato libre, orientado a decisiones y cambios reales — no es un changelog de versión semántica de paquete.

## 2026-07-25 — Parche: protección de fuerza bruta en todo el flujo de auth

- **Nuevo:** bloqueo por cuenta (`AttemptLimiter`, en el `CACHE_MANAGER` ya instalado, sin dependencias nuevas) en `login` (8 fallos/10min por email) y `update-password` (5 fallos/10min por userId) — complementa el límite por IP, protege contra ataques distribuidos con rotación de IP contra una cuenta específica.
- **Nuevo:** límite por IP extendido a `register` (10/min) e `invite` (20/min) — antes solo existía en `login`.
- **Mejora incidental:** `login()` unifica la verificación de "usuario no existe" y "contraseña incorrecta" en un solo camino, evitando una diferencia de tratamiento entre ambos casos frente al contador de intentos. Comportamiento externo sin cambios.

## 2026-07-25 — Auditoría Enterprise, Fase 2: Seguridad

- **⚠️ Requiere acción antes de desplegar:** CORS ahora restringido vía `CORS_ALLOWED_ORIGINS` (antes: cualquier origen, sin restricción). Configura esa variable con tu dominio real de producción o tu frontend quedará bloqueado.
- **Nuevo:** `Helmet` — cabeceras de seguridad HTTP estándar, no existían antes.
- **Nuevo:** límite estricto de 5 intentos/minuto en `POST /auth/login` contra fuerza bruta (única ruta con este mandato explícito).
- **Corregido:** `ThrottlerModule` pasa de estar registrado solo dentro de `PublicBookingModule` a ser un registro global real — sin cambiar el comportamiento de ningún endpoint existente (el guard sigue siendo opt-in por controlador).
- **Auditado y sin cambios (ya cumplía el estándar):** JWT, validaciones globales, manejo de errores, Guards existentes. Detalle completo en `MAESTRO.md` §30.

## 2026-07-25 — Auditoría Enterprise, Fase 1: Infraestructura

- **Nuevo:** capa de caché (`@nestjs/cache-manager`, en memoria, sin Redis), registrada globalmente, aplicada explícitamente solo en `GET /public/:slug/booking-data` (TTL 15s) — la única lectura pública de alto tráfico y baja frecuencia de cambio del sistema.
- **Corregido:** `app.enableShutdownHooks()` faltaba en `main.ts` — sin esto, el cierre limpio de conexiones de Prisma no estaba garantizado en un apagado real de contenedor.
- **Evaluado y descartado (con justificación):** ajustar el pool de conexiones de Prisma sin conocer el proveedor de Postgres real; migrar todo `process.env` a `ConfigService` inyectado (refactor invasivo, beneficio marginal); agregar `compression` (dependencia nueva no autorizada para esta fase). Detalle completo en `MAESTRO.md` §29.

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
- **Rebranding:** el proyecto pasó de BarberFlow OS a **Kortek OS**. Kortek es la plataforma matriz; BarberFlow es su primer producto SaaS. Ver `MAESTRO.md` §24 para el historial completo de decisiones de este rebranding y de toda la reconstrucción del frontend.
- **Bloqueado, pendiente de aprobación manual:** refactor `User` + `Membership` para soportar un usuario perteneciendo a varias organizaciones con una sola identidad. Requiere confirmar primero que no existan correos duplicados entre organizaciones en la base real — ver `MAESTRO.md` §24.14.

## Historial anterior

El detalle completo de las Fases 0 a 9 (rebranding, limpieza de backend, reconstrucción de frontend, rol `CUSTOMER`, flujo B2C, roles refinados, gestión de equipo) está documentado en `MAESTRO.md` §24 — no se duplica aquí para evitar que las dos fuentes se desincronicen. Este changelog empieza a llevar entradas propias a partir del ciclo "Fundación Kortek OS".
