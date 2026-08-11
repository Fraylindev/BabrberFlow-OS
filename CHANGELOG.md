# CHANGELOG

Todas las entradas están en español, siguiendo el idioma del resto del proyecto. Formato libre, orientado a decisiones y cambios reales — no es un changelog de versión semántica de paquete.

## 2026-08-11 — Reservas: affordance de Limpiar filtros

- `Limpiar filtros` conserva exactamente su ubicación, texto, condición `hasActiveFilters` y comportamiento, pero ahora se reconoce como acción mediante un tratamiento ghost discreto con fondo claro, borde sutil, sombra mínima, hover y foco visible.
- **Validación:** `pnpm --filter web exec tsc --noEmit`, `pnpm --filter web lint` y `pnpm --filter web build` finalizaron con exit 0; `/dashboard/bookings` fue generado correctamente.
- No se modificaron filtros, requests, estado, backend, otros módulos, dependencias ni lockfile. Reservas continúa pendiente de aprobación final; Clientes continúa no autorizado.

## 2026-08-11 — Reservas: corrección del menú contextual desktop

- **Causa raíz:** el portal de `BookingActions` se montaba en `document.body`, fuera de `.dashboard-shell`, por lo que perdía las variables visuales `--dash-*` y su superficie podía quedar transparente sobre otras filas. Además, la apertura arriba/abajo dependía de una altura estimada, no de las dimensiones renderizadas del menú.
- **Corrección quirúrgica:** el portal se monta dentro del shell del dashboard, mide el menú real antes de mostrarlo, prioriza abrir debajo y usa arriba cuando no cabe, limita ambos ejes al viewport y conserva cierre por scroll, resize, clic externo y `Escape`, con retorno de foco cuando corresponde. La superficie tiene fondo opaco, borde, sombra y `z-index` propios con fallback seguro.
- **Validación:** `pnpm --filter web exec tsc --noEmit`, `pnpm --filter web lint` y `pnpm --filter web build` finalizaron con exit 0; `/dashboard/bookings` fue generado correctamente.
- **Alcance:** solo rendering/positioning del menú desktop. Sin cambios en reglas de acciones, mobile, backend, contratos, otros módulos, dependencias ni lockfile. Reservas sigue pendiente de aprobación final; Clientes continúa no autorizado.

## 2026-08-11 — Reservas: correcciones finales de layout, acciones y Turbopack

- **Overflow resuelto en la causa:** cards hasta 768 px inclusive; tabla desde 1024 px con layout fijo, columnas proporcionadas y truncado accesible. Se elimina la combinación de tabla mínima de 640 px y cuatro botones que excedía el área útil del dashboard.
- **Sidebar largo:** en desktop conserva `h-screen` pero pasa a `sticky top-0 self-start`, evitando que el fondo grafito termine después del primer viewport sin rediseñar el shell.
- **Acciones compactas:** `BookingActions` mantiene la acción principal visible en desktop y agrupa secundarias en un menú contextual accesible renderizado en portal. Mobile conserva los botones grandes existentes y no cambian permisos, estados ni acciones.
- **Diagnóstico Turbopack:** el panic decía `Next.js package not found`, pero Next 16.2.10 estaba instalado y resolvía correctamente. La reproducción con el `.next` previo produjo 404; después de regenerar esa caché, `pnpm run dev` sirvió `/login` y `/dashboard/bookings` con HTTP 200 y sin nuevo panic. No se cambiaron scripts, configuración, versiones, dependencias ni lockfile.
- **Alcance:** frontend de Reservas y ajuste mínimo demostrado del Sidebar. Backend y `BACKEND_CHANGES.md` intactos. Correcciones finales implementadas; QA manual de cierre pendiente; Reservas no aprobada todavía; Clientes no autorizado todavía.

## 2026-08-11 — Reservas: implementación final candidata a QA manual

- **Cliente sin select gigante:** nuevo `ClientAutocomplete` filtra el catálogo real ya cargado por nombre/teléfono, limita la lista visible con scroll y permite teclado, `Enter`, `Escape`, limpieza y resumen de la selección. No se agregó ni simuló ningún endpoint.
- **Fecha → Hora → Confirmar definitivo:** `DateTimePicker` reemplaza los selects nativos de hora/minutos por slots visuales de 15 minutos, deshabilita horarios pasados y preserva exactamente minutos no estándar existentes durante reprogramación.
- **Crear y reprogramar:** modales claros, responsive y organizados por bloques; estados loading/error/retry/sin catálogos; resumen de la reserva actual; envío exclusivo de campos modificados al reprogramar.
- **Agenda operativa:** filtros compactos, fecha final inclusiva, orden cronológico, tabla desktop refinada, cards móviles deliberadas y acciones por rol/estado centralizadas en `BookingActions`.
- **Decisión de producto:** no se añadió resumen operativo porque el conjunto está limitado por rango/estado y sus conteos podían parecer métricas globales. No se adelantaron Analytics ni Resumen.
- **Alcance:** cero cambios de backend, contratos, dependencias, lockfile, Payment, `/[slug]` o módulos posteriores. `BACKEND_CHANGES.md` no requiere modificación.
- **Validación:** TypeScript exit 0; lint exit 0; build de producción exit 0. Implementación final candidata a cierre; QA manual final pendiente; Reservas todavía no aprobada oficialmente; Clientes continúa no autorizado.

## 2026-08-10 — Reservas: corrección ProfessionalService + DateTimePicker guiado y responsive

**Decisión de producto:** cualquier profesional activo puede ser reservado con cualquier servicio activo de la organización. `ProfessionalService` se conserva para precio/comisión individual y futuras restricciones opcionales, pero no bloquea reservas en esta fase. Se descarta input `datetime-local` nativo por experiencia pobre y se construye un `DateTimePicker` a medida sin dependencias.

- **`bookings.service.ts` (backend):** eliminadas las llamadas a `prisma.db.professionalService.findUnique()` en `create()` y `reschedule()`. Todas las demás validaciones permanecen: tenant, profesional pertenece a la org, servicio pertenece a la org, cliente pertenece a la org, startTime no en el pasado, sin conflicto de horario.
- **`bookings.service.spec.ts` (backend):** eliminado el mock de `professionalService` y el test "rechaza si el profesional no ofrece el servicio seleccionado". Tests: **38/38** (era 39 — el test 39 era precisamente el de esa validación eliminada). Comentario explícito documenta la decisión de producto.
- **`app/dashboard/bookings/page.tsx` (frontend):** 
  - Modales `CreateBookingModal` y `RescheduleBookingModal` migrados a tema claro (`--dash-*`). Selectores de servicio muestran todos los servicios activos de la organización, sin filtrar por profesional.
  - Se implementó vista responsive: listado en forma de Cards para móvil (`md:hidden`) y tabla original para desktop (`hidden md:block`), eliminando el scroll horizontal forzado en pantallas pequeñas.
- **`components/ui/DateTimePicker.tsx` (frontend):** el componente custom se corrigió después del blocker encontrado en QA. Reemplaza el popover absoluto apilado por un diálogo compacto contenido en el viewport y un flujo explícito `Fecha → Hora → Confirmar`; deshabilita días y horarios pasados, muestra la fecha elegida con `Cambiar fecha`, conserva minutos no estándar existentes y valida nuevamente contra la hora real al confirmar. `Cancelar`, clic fuera y `Escape` no publican la selección temporal; `Escape` no cierra accidentalmente el modal padre.
- **`components/ui/Modal.tsx` (frontend):** el tono claro gana separación visual de encabezado/superficie, contención por `100dvh`, bloqueo de scroll, foco inicial, retorno de foco y ciclo de `Tab`. El layout visual del tono oscuro se conserva para no alterar otros módulos.
- **`lib/api.ts` (frontend):** campo `isActive?: boolean` agregado al tipo `Service` — reflejaba un campo real del schema de Prisma que faltaba en el tipo del frontend.
- **Validación:** `tsc --noEmit` → exit 0, `lint` → exit 0 (0 errores, 0 warnings), `tests` backend previos → 38/38 passed, `build` → exit 0. QA visual de la corrección sigue pendiente: el navegador integrado no pudo iniciar por una restricción ambiental `EPERM`; debe repetirse manualmente con `next dev --webpack`. Reservas no se considera aprobada ni cerrada.

## 2026-08-09 — Reservas Entrega B: Frontend

- **`app/dashboard/bookings/page.tsx` reconstruido** sobre los contratos reales aprobados en Entrega A: consume `GET /bookings?from=&to=&status=`, `POST /bookings`, `PATCH /bookings/:id` (reprogramar), `PATCH /bookings/:id/status`, y los selectores de Clientes/Profesionales/Servicios para los formularios.
- **Filtros de rango de fecha y estado:** por defecto muestra la semana actual. Botón "Limpiar filtros" solo cuando hay filtros activos.
- **Tabla responsive** (min-w-640px + overflow-x-auto): columnas Fecha/Hora, Cliente, Profesional, Servicio, Estado, Acciones. Hora de fin visible. Tema claro (`--dash-*`) coherente con el dashboard.
- **Acciones de estado con permisos por rol:** `BARBER` no puede cancelar (decisión administrativa). `COMPLETED`/`CANCELLED`/`NO_SHOW` son solo lectura. Botón "Reprogramar" oculto para `BARBER`.
- **Modal de reprogramación nuevo** — consume `PATCH /bookings/:id`. Solo envía al backend los campos que cambiaron; valida que hubo al menos un cambio antes de enviar.
- **Modal de creación extendido:** fecha mínima = ahora (anticipa el 400 del backend), reset de servicio al cambiar profesional, `useState` lazy init para `Date.now()`.
- **Estados de UI completos:** loading (Skeleton), empty (sin reservas), empty-filtered (sin resultados en rango), error (+ reintentar), success (tabla + contador).
- **`lib/api.ts`:** `api.get()` retrocompatiblemente extendido con `params?`; tipos nuevos `BookingFilters` y `RescheduleBookingInput`.
- **`lib/queries/bookings.ts`:** `useBookingsQuery(filters?)` con query key dinámica; `useRescheduleBooking()` nuevo.
- **`Payment` no implementado** — pertenece a Facturación. Sin mocks, sin endpoints inventados.
- **Validación real en sandbox:**
  - `pnpm --filter web exec tsc --noEmit` → exit 0, 0 errores
  - `pnpm --filter web lint` → exit 0, 0 errores, 0 warnings
  - `pnpm --filter web build` → exit 0, `/dashboard/bookings` generado como static

## 2026-08-09 — Reservas Entrega A: corrección de 2 problemas reales encontrados en validación

- **`TS2698` en `bookings.service.spec.ts`** — spread sobre `unknown` en el mock de `booking.update`. Corregido tipando el mock igual que `findFirst`/`create` (sin `as any`).
- **2 tests fallando en `auth.service.spec.ts`** — `mockValidUser()` no mockeaba `organization.findUnique`, que `AuthService.login()` sí llama en producción (código correcto, sin tocar). Agregado el mock y un test nuevo que verifica la respuesta completa (`user`+`accessToken`+`organization`).
- Ningún cambio de lógica de producción — ambos fixes son exclusivamente de tests.
- **Entrega A sigue sin cerrarse**: `pnpm --filter api exec tsc --noEmit`/`lint`/`test` no pueden correr limpios en este sandbox porque el cliente de Prisma no está generado (bloqueo de red conocido) — confirmado que el `TS2698` ya no aparece y que los 25/537 errores restantes son 100% la cascada de `@prisma/client` sin generar, no relacionados con esta entrega. Pendiente de que el usuario confirme los 5 comandos reales en su entorno. Detalle en `PROJECT_MASTER.md` §54.5.

## 2026-08-08 — Reservas, Entrega A (Backend) — nueva metodología por módulos

- **Cambio de estrategia:** de aquí en adelante cada módulo se entrega en dos partes (Backend primero, aprobado explícitamente; Frontend después). Resumen/Dashboard queda congelado hasta que los módulos que lo alimentan estén completos. Detalle en `PROJECT_MASTER.md` §53.
- **`POST /bookings`:** valida que el profesional ofrezca el servicio (`ProfessionalService`, existía sin usarse) y que la fecha no sea pasada.
- **`GET /bookings?from=&to=&status=`:** filtro de rango real en el backend, compatible hacia atrás.
- **`PATCH /bookings/:id` (nuevo):** reprogramar fecha/hora/profesional/servicio de una reserva existente, reutilizando la validación de choque de horario.
- Tests extendidos para las validaciones nuevas y `reschedule()`.
- **`Payment` sigue sin conectarse** — es de Facturación, no de Reservas. `DELETE /bookings/:id` no implementado, pendiente de tu confirmación de si hace falta.
- Contrato completo documentado en `BACKEND_CHANGES.md`.
- **Validación con limitación de entorno:** `prisma generate` sigue bloqueado en este sandbox (red) — verificado todo lo posible sin el cliente generado (`eslint` limpio salvo la cascada conocida, compilación aislada del código nuevo sin errores). `tsc`/`lint`/tests reales del backend pendientes de confirmarse en tu entorno.

## 2026-08-04 — Cierre end-to-end del módulo Resumen

- **Auditoría de causa raíz:** no había ningún problema de propagación de contexto de tenant — `Topbar.tsx` simplemente no consumía `organization` del hook, que ya llegaba correcto desde el login. Detalle en `PROJECT_MASTER.md` §52.0.
- **Menú de usuario completo y funcional:** Ver página pública, Copiar enlace, Cerrar sesión — sin duplicados en ningún otro punto del panel.
- **Hydration mismatch corregido de raíz** (`useSyncExternalStore`, reaplicado).
- **Sidebar:** la barbería es el elemento principal (monograma + nombre), "Powered by Kortek Booking" como crédito discreto al pie.
- **Marca centralizada de verdad:** `BRAND.legalName`/`footer.*` referencian `BRAND.name`/`BRAND.company`, cero literales duplicados en todo `apps/web`.
- **Responsive endurecido en código** para 320–1920px: `min-w-0`/`truncate`/`shrink-0` en Topbar, agenda y widgets; tamaño de fuente responsive en `TrendStat`; gaps de grilla ajustados en KPIs.
- ⚠️ **Limitación honesta:** cero errores de hidratación en consola y overflow visual no se pudieron verificar con un navegador real en este entorno — no hay backend disponible aquí para autenticarse. Confirmado a nivel de código/build; verificación en vivo pendiente del lado del usuario.
- Sin cambios de backend. Detalle completo en `PROJECT_MASTER.md` §52.

## 2026-08-02 — Fase 2 (Panel Administrativo): módulo Resumen (Backoffice, tema claro)

- **`/dashboard` (Resumen) reconstruido como producto**, no como CRUD: KPIs (ingresos hoy/7 días, reservas hoy/pendientes), acciones rápidas filtradas por rol real del backend, alertas de hoy (canceladas, pendientes, profesionales sin citas), "Carga de hoy" (nuevo widget, cruza `/professionals` con `/bookings`), "Profesional del mes" (`topProfessional` de `/analytics/dashboard`), "Copiar enlace" + "Ver página pública" (`organization.slug`), y un estado de onboarding para negocios recién creados sin profesionales ni citas.
- **`Card`, `Button`, `Badge`, `PageHeader`, `EmptyState`, `Skeleton` ganaron una prop `tone` ("dark"/"light")** — extensión aditiva, cero cambio de comportamiento por defecto para los módulos que aún no migran al tema claro. `TrendStat` (nuevo) es nativo del tema claro, sin consumidores en oscuro.
- Sin cambios de backend. Detalle completo, incluyendo la propuesta UX/UI aprobada, en `PROJECT_MASTER.md` §51.

## 2026-08-02 — Fase 2 (Panel Administrativo): pulido del shell

- **Contenedor de contenido a nivel de shell** (`app/dashboard/layout.tsx`, `max-w-6xl`) — todos los módulos lo heredan automáticamente, ninguno definía su propio ancho.
- **`Topbar`**: el título de sección actual pasa a tipografía de página real (`font-display`, más peso), no solo breadcrumb plano.
- **`Sidebar`**: barra vertical roja de 2px en el ítem activo, refuerzo de jerarquía. Confirmadas todas las microinteracciones del shell en 150-200ms.
- Sin cambios de backend ni de ningún módulo interno (Reservas, Clientes, etc.). Detalle en `PROJECT_MASTER.md` §49.1.

## 2026-08-02 — Fase 2 (Panel Administrativo): arquitectura de temas + deuda de tooling

- **Nuevo scope de tema para el Dashboard** — `app/globals.css` gana un bloque de variables `--dash-*` (fondo claro, sidebar grafito, rojo solo como acento), activo únicamente dentro de `.dashboard-shell` (`app/dashboard/layout.tsx`). Cero variables `--color-*` existentes tocadas — landing y `app/[slug]` siguen exactamente igual.
- **Shell del Dashboard reconstruido:** `components/dashboard/Sidebar.tsx` (nuevo, reemplaza `components/Sidebar.tsx`) con navegación agrupada, colapsable, drawer móvil real; `components/dashboard/Topbar.tsx` (nuevo) con breadcrumb de sección actual. `Dropdown` y `Tooltip` extendidos de forma aditiva (sin cambiar su comportamiento por defecto).
- **`app/[slug]` queda intacto** — congelado por instrucción explícita, cero archivos tocados ahí.
- **Deuda de tooling resuelta:** `packageManager` del root fijado a versión exacta (`11.18.0`); agregado el script `type-check` a `apps/web` y `apps/api` (antes `pnpm type-check` corría 0 tareas).
- Sin cambios de backend. Detalle completo en `PROJECT_MASTER.md` §47-49, incluyendo la nota de reconciliación en §46 sobre entregas previas que nunca llegaron a aplicarse al repositorio.

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
