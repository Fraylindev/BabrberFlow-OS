# CHANGELOG

Todas las entradas están en español, siguiendo el idioma del resto del proyecto. Formato libre, orientado a decisiones y cambios reales — no es un changelog de versión semántica de paquete.

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
