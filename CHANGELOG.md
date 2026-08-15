# CHANGELOG

Todas las entradas están en español, siguiendo el idioma del resto del proyecto. Formato libre, orientado a decisiones y cambios reales — no es un changelog de versión semántica de paquete.

> Cada entrada es una fotografía histórica de su fecha. Para estado vigente usar [`PROJECT_MASTER.md`](PROJECT_MASTER.md). Las referencias antiguas a secciones numeradas de PROJECT_MASTER apuntan al snapshot preservado en [`docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md`](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md).

## 2026-08-15 — Security A0.1: correctivo de prueba reutilizable

- La integración deja de exigir exactamente 19 usuarios o que el dataset real permanezca íntegramente sin enlace.
- Cada caso crea un schema PostgreSQL temporal con una tabla `User` pre-A0.1, siembra identidades aisladas y aplica el archivo de migración versionado.
- La suite comprueba preservación de los usuarios sembrados, múltiples valores `NULL` y rechazo de un `clerkUserId` no nulo duplicado; no consulta ni modifica cuentas reales.
- Los 19 usuarios y su huella permanecen documentados únicamente como evidencia del entorno auditado. La migración funcional y el estado candidato de A0.1 no cambian; A0.2 continúa bloqueado.

## 2026-08-14 — Security A0.1: base de enlace Clerk candidata

- La aprobación del diagnóstico Security A0-D autorizó únicamente la base de enlace. `User` suma `clerkUserId` nullable y único, conservando UUID, password y login actuales.
- La migración es aditiva: columna `TEXT NULL` e índice único, sin backfill, sin enlace por correo, sin clasificación, fusión, eliminación ni modificación de cuentas existentes.
- PostgreSQL real confirmó los mismos 19 IDs antes/después, 19 usuarios sin enlace y 0 enlazados. La integración pasó 3/3 casos: preservación, múltiples `NULL` y rechazo de un ID Clerk duplicado.
- No se instalaron Clerk/dependencias ni se modificaron variables, Guards, endpoints, DTOs, frontend, Supabase, Profesionales A2 o Servicios.
- Estado: Security A0.1 **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría; Security A0.2 no está autorizado.

## 2026-08-14 — Security A0-D: decisión Clerk + Supabase y diseño diagnóstico

- El propietario aprobó Clerk para identidad, login, registro, recuperación y sesiones; NestJS continúa como autoridad del negocio y PostgreSQL conserva Organization, Membership y roles. Clerk Organizations no será fuente de autorización y Supabase Auth no se usará.
- La auditoría confirmó que la implementación sigue en JWT propio/localStorage y mantiene abierto el escalamiento OWNER del registro público. La base inspeccionada es local: 7 de 19 Users coinciden con el inventario QA y 12 quedan sin clasificación, por lo que deben preservarse hasta decisión del propietario.
- ADR-001 define enlace único `User.clerkUserId`, onboarding Organization + OWNER atómico, verificación de sesión Clerk en NestJS, invitaciones locales, revocación, CUSTOMER posterior al booking y retiro gradual del legado con rollback.
- Prisma continuará sobre PostgreSQL de Supabase. El diseño separa conexión SSL/pooling, ensayo `pg_dump`/restore, reconciliación, cutover y rollback de cualquier checkpoint Clerk.
- Los planes Free se limitan a desarrollo/QA. Clerk Pro y Supabase Pro son gate obligatorio antes del primer tenant externo o de pago en producción; capacidad, MFA, backups o soporte pueden adelantarlo.
- Security A0-D es documentación **CANDIDATA A AUDITORÍA**. No implementa Clerk/Supabase, no modifica Profesionales A2, no cierra Profesionales y no inicia Servicios.

## 2026-08-13 — G0.1: fuentes de gobierno y riesgo de autenticación

- Se añadió `docs/README.md` como entrada universal y se separaron PRD, flujos, arquitectura, modelo de datos, seguridad, gates de entrega, plantilla de brief y ADR de autenticación.
- `DELIVERY_GATES.md` define Ready y gates de producto, arquitectura/seguridad, backend, frontend, QA, checkpoint, auditoría y relevo; enlaza el DoD existente.
- Se creó `$kortek-delivery` para cualquier entrega y se conservó `$kortek-product-ui`; las reglas esenciales siguen en Markdown neutral.
- La auditoría confirmó el riesgo de componer creación/resolución pública de Organization con `/auth/register` para conceder OWNER a un `organizationId` aportado por el cliente. También registra JWT en `localStorage`, carencias de recuperación/verificación/MFA/revocación y límites no distribuidos.
- ADR-001 compara autenticación propia, Clerk y Supabase; recomienda endurecer la propia en Security A0 sin cambiar autenticación durante G0.1.
- Los estándares prohíben mostrar identificadores IANA, UTC, offsets o detalles técnicos; las horas se presentan naturalmente y la conversión permanece interna.
- G0 y Profesionales continúan **EN REVISIÓN**. No se modificó A2, no se cerró Profesionales y no se inició Servicios.

## 2026-08-13 — G0: gobierno documental candidato

- `AGENTS.md` se redujo a reglas permanentes, flujo de aprobación, seguridad, validación, Git, relevo y rutas especializadas; se añadieron instrucciones locales para `apps/web` y `apps/api`.
- `PROJECT_MASTER.md` se reescribió como verdad vigente de visión, arquitectura, módulos, decisiones, riesgos y próximo paso. El contenido anterior se preservó íntegro en `docs/history/` junto con el AGENTS legado.
- Se crearon estándares separados de producto, frontend, patrones UI y Definition of Done. El proceso vigente comienza por definición de producto/UX y continúa por contrato, backend, frontend y QA.
- Se creó la skill repo-scoped `$kortek-product-ui`, obligatoria para todo trabajo frontend, con definición previa del usuario/objetivo, auditoría de reutilización, privacidad, roles, responsive, accesibilidad, estados completos y QA visual con evidencia.
- Quedó explícito que compilar no aprueba una interfaz y que los errores esperados del API deben traducirse a lenguaje útil, sin jerga técnica.
- G0 no modifica código funcional, contratos, Prisma, dependencias ni estado de módulos. Profesionales y Frontend A2 permanecen **EN REVISIÓN / NO CERRADOS**; Servicios no se inició.

## 2026-08-13 — Profesionales A2 Frontend: disponibilidad individual candidata

- La aprobación del checkpoint backend `ad633e9864e6e20869d0db248861f01b935d5a6f` cerró A2 Backend y autorizó exclusivamente su frontend.
- `/dashboard/professionals` integra los contratos reales de disponibilidad: OWNER/ADMIN gestionan cualquier Professional del tenant y BARBER únicamente su perfil vinculado; RECEPTIONIST no recibe acciones de modificación.
- La UI permite heredar el horario global o definir varios turnos por día, y crear/editar/cancelar/reactivar bloqueos temporales. Las fechas se presentan en `Organization.timeZone`, se convierten a ISO con `Z` al enviar y las notas permanecen identificadas como internas.
- Se añadieron loading, error/reintento, estado vacío y feedback de éxito/error; el diseño usa cards y formularios adaptables sin tabla ni overflow en móvil.
- Web TypeScript, lint y build finalizaron con exit 0. QA autenticado comprobó OWNER, ADMIN, BARBER y RECEPTIONIST, guardado semanal, turnos múltiples, lectura/edición/cancelación/reactivación de bloqueos, conversión `America/Santo_Domingo`, viewport 390×844 y consola sin errores ni advertencias.
- Estado: Frontend A2 **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría; no aprobado. Profesionales continúa abierto y no se inició ningún otro módulo.

## 2026-08-13 — Profesionales A2: correctivo de zona explícita

- Los timestamps de bloqueos temporales ahora exigen ISO-8601 con `Z` u offset `±HH:mm`; una fecha sin zona se rechaza con `400` en creación y actualización.
- La protección existe en DTO y servicio. Se añadieron pruebas de rechazo sin zona, aceptación UTC/offset y persistencia del instante UTC exacto.
- TypeScript, lint y suite API estándar finalizaron con exit 0: 180 pruebas aprobadas; Prisma y migraciones no cambiaron.
- A2 continúa **IMPLEMENTADO / EN REVISIÓN** como candidato; no se inició Frontend A2 ni otro módulo.

## 2026-08-13 — Profesionales A2 Backend: disponibilidad individual candidata

- Se añadió `Organization.timeZone` con valor inicial `America/Santo_Domingo`, horario semanal opcional con múltiples turnos diarios y bloqueos temporales `ACTIVE/CANCELLED` con nota interna.
- OWNER/ADMIN gestionan cualquier Professional del tenant; BARBER opera únicamente su perfil vinculado; RECEPTIONIST no modifica disponibilidad. Las consultas y FKs preservan aislamiento por `organizationId`.
- La disponibilidad efectiva combina horario global, horario individual, bloqueos y reservas. Creación interna/pública, reprogramación y reactivación futura validan dentro de transacción y comparten el bloqueo PostgreSQL A1 con las mutaciones de disponibilidad.
- Cambios que afectarían reservas futuras abiertas devuelven `409`. La disponibilidad pública filtra slots sin seleccionar ni exponer notas; AuditLog registra únicamente acciones e IDs.
- Se añadieron DTOs, proyecciones, checks/exclusión GiST, pruebas unitarias y carreras PostgreSQL reales. Frontend A2 no se inició.
- Prisma, TypeScript, lint y tests terminaron con exit 0: 173 pruebas estándar aprobadas y 9/9 integraciones PostgreSQL reales; la base local quedó al día con 12 migraciones.
- Estado: A2 Backend **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría; no aprobado. Profesionales no está cerrado y no se inició otro módulo.

## 2026-08-13 — Profesionales: búsqueda automática candidata

- La búsqueda del directorio ahora aplica el texto automáticamente con debounce de 300 ms y vuelve a la primera página, conservando el botón `Buscar` como alternativa inmediata.
- Se reutilizan la búsqueda backend, paginación y query keys tenant/rol existentes; no cambian API, contratos, Prisma, dependencias ni otros módulos.
- El filtro general quedó rotulado `Todos (sin archivados)`, aclarando el comportamiento vigente sin alterar filtros ni requests.
- Web TypeScript y lint pasaron con exit 0. QA autenticado desktop/móvil confirmó actualización tras la pausa, envío inmediato con el botón, ausencia de overflow y consola sin errores/advertencias.
- Estado: ajuste **IMPLEMENTADO / EN REVISIÓN** dentro de Entrega B. Profesionales continúa pendiente de QA/aprobación final y no está cerrado.

## 2026-08-12 — Profesionales Entrega B Frontend implementada / en revisión

- La auditoría técnica de `60919ee94eb27f628906c9b86ce7a43b2fa09237` cerró/aprobó A1 Backend y autorizó exclusivamente Frontend de Profesionales.
- `/dashboard/professionals` consume el contrato real completo: listado/búsqueda/filtros/paginación/detalle, crear/editar, estados, publicación, archivo/restauración y vínculo/desvínculo de Membership BARBER.
- OWNER/ADMIN gestionan; RECEPTIONIST tiene directorio mínimo de solo lectura; BARBER edita exclusivamente `/professionals/me` y nunca recibe teléfono interno, linkedUser ni controles administrativos.
- Se implementaron loading, empty, empty filtrado, error/reintento y success; tabla desktop y cards tablet/móvil sin overflow. Las query keys quedaron aisladas por tenant, vista y usuario para evitar reutilización de PII de gestión al cambiar de sesión/rol.
- QA real completado sobre organización local aislada: todos los flujos de gestión, paginación 20+3, roles, privacidad, error/reintento, consola limpia y viewports 1440/768/390. Web TypeScript, lint y build finalizaron con exit 0.
- Estado: Entrega B **IMPLEMENTADA / EN REVISIÓN**, candidata a auditoría; no aprobada. Profesionales no está cerrado y no se inició ningún módulo posterior.

## 2026-08-12 — Profesionales Entrega A: Checkpoint A1 implementado / en revisión

- A0 `8964c981223ba3f4a1e780103cbc0d20e4c602eb` queda registrado como **CERRADO / APROBADO** después de auditoría técnica sin bloqueantes.
- Profesionales incorpora estados `ACTIVE/INACTIVE/ARCHIVED`, publicación independiente, archivo sin hard-delete, restauración a `INACTIVE`, bloqueo de archivo con reservas futuras abiertas y vínculo explícito a una Membership BARBER del mismo tenant.
- Se reemplazó la unicidad global Professional–User por `(organizationId, userId)` después de verificar 0 colisiones locales; la migración preserva los 5 perfiles existentes sin fusionar ni eliminar datos.
- Se completó el contrato backend con búsqueda, filtro de estado, paginación/orden estable, detalle, proyecciones por rol, perfil propio de BARBER, UUIDs, límites, trim y rechazo de PATCH vacío.
- Booking interno exige Professional `ACTIVE`; catálogo, disponibilidad y creación pública final exigen `ACTIVE + isPublic=true`. `ProfessionalService` continúa sin bloquear reservas.
- Se corrigió la carrera entre archivo y agenda: archivo, creación interna/pública, reprogramación y recuperación de canceladas futuras comparten un bloqueo de fila PostgreSQL tenant-scoped dentro de transacciones. Una reserva futura no puede quedar `PENDING`/`CONFIRMED` sobre un Professional `ARCHIVED`; la recuperación también rechaza `INACTIVE`.
- Se explicitó la matriz administrativa de estados y se hizo atómica la creación de Membership + Professional automático al invitar un User existente como BARBER, evitando Membership parcial si falla el perfil.
- AuditLog registra CREATE, UPDATE, STATUS_CHANGE, ARCHIVE, RESTORE, LINK y UNLINK sin valores de PII. `/auth/invite` solo honra `createPublicProfile` para BARBER.
- Se añadieron pruebas específicas de servicio/controlador/DTO/Equipo y regresiones de Reservas, booking público y aislamiento de Equipo. Frontend de Profesionales, Cloudinary, Servicios y otros módulos no fueron iniciados.
- Validación final de la corrección: API TypeScript, lint y suite estándar en exit 0 (151 tests aprobados; 5 pruebas PostgreSQL opt-in omitidas). La integración PostgreSQL real pasó 5/5 casos de exclusión y carreras archivo↔creación interna/pública, reprogramación y reactivación; Prisma reportó las 10 migraciones aplicadas y el schema local actualizado.
- Estado: A1 Backend **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría; no aprobado. Profesionales no está cerrado, Frontend no está autorizado y Resumen continúa congelado.

## 2026-08-11 — Profesionales Entrega A: Checkpoint A0 implementado / en revisión

- Se cerró la fuga cross-tenant de Professional en `GET /organizations/mine/members` mediante consulta por organización y proyección explícita sin IDs internos, teléfono ni timestamps del perfil.
- `BARBER` queda limitado a crear reservas para su propio perfil activo, cambiar estado solo en su agenda y con transiciones permitidas, y no puede reprogramar. Los roles administrativos conservan sus operaciones vigentes.
- Catálogo y disponibilidad públicos excluyen servicios inactivos.
- La migración `20260811180000_booking_schedule_exclusion` agrega una garantía PostgreSQL real contra solapamientos concurrentes y el backend traduce la colisión a `409`. La inspección previa encontró 0 solapamientos; la prueba concurrente real confirmó una inserción aceptada y una rechazada.
- Se añadieron regresiones de tenant, roles/agenda BARBER, servicio inactivo, traducción del conflicto y concurrencia PostgreSQL. No se modificó frontend ni se inició A1.
- Validación final: API TypeScript y lint en exit 0; suite estándar con 96 tests aprobados y la integración PostgreSQL ejecutada por separado con 1/1 aprobada, ambas en exit 0.
- Clientes Backend/Frontend y el módulo Clientes quedan registrados como cerrados/aprobados sobre `c0764e9a98e3876339152763bf9b0fc98fe43aae`; Resumen continúa congelado.
- Estado de Profesionales: A0 implementado / en revisión, no aprobado; A1 no iniciado; Frontend no autorizado.

## 2026-08-11 — Clientes Entrega B: candidato implementado y en revisión

- La auditoría del checkpoint `18a3605329ad0ce708a44ac8fcd5db1dd1665732` aprobó oficialmente la Entrega A Backend de Clientes.
- Se autoriza exclusivamente la Entrega B Frontend conectada a los contratos aprobados. El módulo Clientes todavía no está cerrado y Resumen continúa congelado.
- Se implementó la integración real de listado, búsqueda/filtro, paginación por headers, detalle, creación, edición, archivo/restauración, permisos y responsive. El fallback defensivo no inventa totales ni páginas cuando una respuesta inesperada carece de metadata.
- Se añadió únicamente `X-Total-Count`, `X-Page`, `X-Limit` y `X-Total-Pages` a `Access-Control-Expose-Headers` en la configuración CORS existente. No cambiaron orígenes, credenciales, métodos, contratos, Prisma, migraciones ni cuerpos de respuesta.
- QA autenticado completado para CRUD, normalización/duplicados, búsqueda, filtros, paginación real, archivo/restauración, alcance de `BARBER`, privacidad, desktop y móvil; consola sin errores ni advertencias. La regresión pública mantiene atomicidad y respuesta sin PII interna.
- Backend TypeScript/lint/tests (76/76) y web TypeScript/lint/build pasaron con exit 0. La Entrega B fue aprobada posteriormente por el propietario y el módulo Clientes quedó cerrado sobre `c0764e9a98e3876339152763bf9b0fc98fe43aae`.

## 2026-08-11 — Clientes Entrega A: Backend implementado y aprobado

- Se completó el contrato backend de Clientes: detalle, búsqueda, filtro activo/inactivo, paginación, orden estable, UUIDs, límites, rechazo de PATCH vacío y respuestas proyectadas; `DELETE` ahora archiva y se añadió reactivación explícita, sin hard-delete.
- Se reforzaron privacidad y multi-tenancy: BARBER solo accede a clientes de su agenda y nunca recibe notas; las mutaciones finales incluyen `organizationId`; Reservas usa una proyección segura de Cliente y rechaza inactivos en creación interna.
- `POST /public/:slug/bookings` deja de exponer `Client`/PII y crea o reactiva Cliente junto con Booking en una transacción. La cuenta CUSTOMER opcional sigue siendo secundaria/fail-open.
- Entradas de Cliente normalizadas, deduplicación operativa por correo/teléfono y auditoría `CREATE`/`UPDATE`/`ARCHIVE`/`RESTORE` sin valores PII. Sin migración, backfill, cambios de Prisma, dependencias o lockfile.
- Se añadieron pruebas de servicio/controlador/flujo público y regresiones de Reservas: backend TypeScript/lint en exit 0 y 76/76 tests; web TypeScript/lint/build en exit 0. Solo se sincronizó el tipo web `PublicBookingResult`; no se rediseñó Clientes Frontend en esa entrega. La auditoría posterior del checkpoint `18a3605329ad0ce708a44ac8fcd5db1dd1665732` aprobó la Entrega A.

## 2026-08-11 — Cierre oficial del módulo Reservas

- Reservas completó el QA manual final y fue aprobado oficialmente por el propietario; Backend y Frontend quedan cerrados como módulo sobre el checkpoint funcional `9a30f2abb37857dbbbf15e34df1cbaec576121b6`.
- No quedan blockers funcionales conocidos que impidan avanzar. Se autoriza iniciar Clientes únicamente en fase de Auditoría/Diagnóstico Backend; su implementación Backend y Frontend todavía no está autorizada.
- Este cierre es exclusivamente de gestión y documentación: no incorpora cambios funcionales, de backend, contratos, frontend, dependencias ni configuración. Resumen continúa congelado hasta el final del orden de módulos.

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
- **Entrega A sigue sin cerrarse**: `pnpm --filter api exec tsc --noEmit`/`lint`/`test` no pueden correr limpios en este sandbox porque el cliente de Prisma no está generado (bloqueo de red conocido) — confirmado que el `TS2698` ya no aparece y que los 25/537 errores restantes son 100% la cascada de `@prisma/client` sin generar, no relacionados con esta entrega. Pendiente de que el usuario confirme los 5 comandos reales en su entorno. Detalle en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §54.5.

## 2026-08-08 — Reservas, Entrega A (Backend) — nueva metodología por módulos

- **Cambio de estrategia:** de aquí en adelante cada módulo se entrega en dos partes (Backend primero, aprobado explícitamente; Frontend después). Resumen/Dashboard queda congelado hasta que los módulos que lo alimentan estén completos. Detalle en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §53.
- **`POST /bookings`:** valida que el profesional ofrezca el servicio (`ProfessionalService`, existía sin usarse) y que la fecha no sea pasada.
- **`GET /bookings?from=&to=&status=`:** filtro de rango real en el backend, compatible hacia atrás.
- **`PATCH /bookings/:id` (nuevo):** reprogramar fecha/hora/profesional/servicio de una reserva existente, reutilizando la validación de choque de horario.
- Tests extendidos para las validaciones nuevas y `reschedule()`.
- **`Payment` sigue sin conectarse** — es de Facturación, no de Reservas. `DELETE /bookings/:id` no implementado, pendiente de tu confirmación de si hace falta.
- Contrato completo documentado en `BACKEND_CHANGES.md`.
- **Validación con limitación de entorno:** `prisma generate` sigue bloqueado en este sandbox (red) — verificado todo lo posible sin el cliente generado (`eslint` limpio salvo la cascada conocida, compilación aislada del código nuevo sin errores). `tsc`/`lint`/tests reales del backend pendientes de confirmarse en tu entorno.

## 2026-08-04 — Cierre end-to-end del módulo Resumen

- **Auditoría de causa raíz:** no había ningún problema de propagación de contexto de tenant — `Topbar.tsx` simplemente no consumía `organization` del hook, que ya llegaba correcto desde el login. Detalle en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §52.0.
- **Menú de usuario completo y funcional:** Ver página pública, Copiar enlace, Cerrar sesión — sin duplicados en ningún otro punto del panel.
- **Hydration mismatch corregido de raíz** (`useSyncExternalStore`, reaplicado).
- **Sidebar:** la barbería es el elemento principal (monograma + nombre), "Powered by Kortek Booking" como crédito discreto al pie.
- **Marca centralizada de verdad:** `BRAND.legalName`/`footer.*` referencian `BRAND.name`/`BRAND.company`, cero literales duplicados en todo `apps/web`.
- **Responsive endurecido en código** para 320–1920px: `min-w-0`/`truncate`/`shrink-0` en Topbar, agenda y widgets; tamaño de fuente responsive en `TrendStat`; gaps de grilla ajustados en KPIs.
- ⚠️ **Limitación honesta:** cero errores de hidratación en consola y overflow visual no se pudieron verificar con un navegador real en este entorno — no hay backend disponible aquí para autenticarse. Confirmado a nivel de código/build; verificación en vivo pendiente del lado del usuario.
- Sin cambios de backend. Detalle completo en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §52.

## 2026-08-02 — Fase 2 (Panel Administrativo): módulo Resumen (Backoffice, tema claro)

- **`/dashboard` (Resumen) reconstruido como producto**, no como CRUD: KPIs (ingresos hoy/7 días, reservas hoy/pendientes), acciones rápidas filtradas por rol real del backend, alertas de hoy (canceladas, pendientes, profesionales sin citas), "Carga de hoy" (nuevo widget, cruza `/professionals` con `/bookings`), "Profesional del mes" (`topProfessional` de `/analytics/dashboard`), "Copiar enlace" + "Ver página pública" (`organization.slug`), y un estado de onboarding para negocios recién creados sin profesionales ni citas.
- **`Card`, `Button`, `Badge`, `PageHeader`, `EmptyState`, `Skeleton` ganaron una prop `tone` ("dark"/"light")** — extensión aditiva, cero cambio de comportamiento por defecto para los módulos que aún no migran al tema claro. `TrendStat` (nuevo) es nativo del tema claro, sin consumidores en oscuro.
- Sin cambios de backend. Detalle completo, incluyendo la propuesta UX/UI aprobada, en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §51.

## 2026-08-02 — Fase 2 (Panel Administrativo): pulido del shell

- **Contenedor de contenido a nivel de shell** (`app/dashboard/layout.tsx`, `max-w-6xl`) — todos los módulos lo heredan automáticamente, ninguno definía su propio ancho.
- **`Topbar`**: el título de sección actual pasa a tipografía de página real (`font-display`, más peso), no solo breadcrumb plano.
- **`Sidebar`**: barra vertical roja de 2px en el ítem activo, refuerzo de jerarquía. Confirmadas todas las microinteracciones del shell en 150-200ms.
- Sin cambios de backend ni de ningún módulo interno (Reservas, Clientes, etc.). Detalle en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §49.1.

## 2026-08-02 — Fase 2 (Panel Administrativo): arquitectura de temas + deuda de tooling

- **Nuevo scope de tema para el Dashboard** — `app/globals.css` gana un bloque de variables `--dash-*` (fondo claro, sidebar grafito, rojo solo como acento), activo únicamente dentro de `.dashboard-shell` (`app/dashboard/layout.tsx`). Cero variables `--color-*` existentes tocadas — landing y `app/[slug]` siguen exactamente igual.
- **Shell del Dashboard reconstruido:** `components/dashboard/Sidebar.tsx` (nuevo, reemplaza `components/Sidebar.tsx`) con navegación agrupada, colapsable, drawer móvil real; `components/dashboard/Topbar.tsx` (nuevo) con breadcrumb de sección actual. `Dropdown` y `Tooltip` extendidos de forma aditiva (sin cambiar su comportamiento por defecto).
- **`app/[slug]` queda intacto** — congelado por instrucción explícita, cero archivos tocados ahí.
- **Deuda de tooling resuelta:** `packageManager` del root fijado a versión exacta (`11.18.0`); agregado el script `type-check` a `apps/web` y `apps/api` (antes `pnpm type-check` corría 0 tareas).
- Sin cambios de backend. Detalle completo en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §47-49, incluyendo la nota de reconciliación en §46 sobre entregas previas que nunca llegaron a aplicarse al repositorio.

## 2026-07-29 — `MAESTRO.md` evoluciona a `PROJECT_MASTER.md`

- **Renombrado, no reescrito:** todo el contenido histórico de `MAESTRO.md` (secciones 1-34) se preservó intacto, con su numeración original — ninguna referencia cruzada existente se rompió.
- **6 secciones nuevas** (§35-40): Estado global del proyecto, Historial de evolución, Intentos fallidos, Lecciones aprendidas, RFC/Decisiones pendientes, Onboarding para nuevos desarrolladores.
- **Nuevo:** índice de navegación completo al inicio del documento, con separadores de "Parte" (I-V) para ubicar rápidamente cualquier sección sin tocar el contenido existente.
- Detalle completo de cada sección nueva en el propio `PROJECT_MASTER.md`.

## 2026-07-28 — Auditoría Enterprise, Fase 5: Testing (cierre del plan)

- **Nuevo:** 22 pruebas unitarias reales (0 existían antes de esta fase, solo boilerplate) cubriendo exactamente lo priorizado: conflictos de reservas, aislamiento multi-tenant, autenticación (incluyendo bloqueo real por fuerza bruta), y permisos por rol.
- **Validación rigurosa:** las pruebas se ejecutaron de verdad (no solo se tipa-verificaron) mediante un stub temporal del cliente de Prisma que demuestra que los 9 fallos iniciales eran 100% el bloqueo de red conocido — 23/23 pruebas pasan cuando el cliente está generado, como pasará en tu máquina. Detalle completo en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §34.
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
- **Evaluado y descartado (con justificación):** correlación de requests (ID de trazabilidad) y logger de terceros (`winston`/`pino`) — el `Logger` nativo de Nest ya cubre lo que esta fase pedía. Detalle completo en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §32.

## 2026-07-25 — Parche: protección de fuerza bruta en todo el flujo de auth

- **Nuevo:** bloqueo por cuenta (`AttemptLimiter`, en el `CACHE_MANAGER` ya instalado, sin dependencias nuevas) en `login` (8 fallos/10min por email) y `update-password` (5 fallos/10min por userId) — complementa el límite por IP, protege contra ataques distribuidos con rotación de IP contra una cuenta específica.
- **Nuevo:** límite por IP extendido a `register` (10/min) e `invite` (20/min) — antes solo existía en `login`.
- **Mejora incidental:** `login()` unifica la verificación de "usuario no existe" y "contraseña incorrecta" en un solo camino, evitando una diferencia de tratamiento entre ambos casos frente al contador de intentos. Comportamiento externo sin cambios.

## 2026-07-25 — Auditoría Enterprise, Fase 2: Seguridad

- **⚠️ Requiere acción antes de desplegar:** CORS ahora restringido vía `CORS_ALLOWED_ORIGINS` (antes: cualquier origen, sin restricción). Configura esa variable con tu dominio real de producción o tu frontend quedará bloqueado.
- **Nuevo:** `Helmet` — cabeceras de seguridad HTTP estándar, no existían antes.
- **Nuevo:** límite estricto de 5 intentos/minuto en `POST /auth/login` contra fuerza bruta (única ruta con este mandato explícito).
- **Corregido:** `ThrottlerModule` pasa de estar registrado solo dentro de `PublicBookingModule` a ser un registro global real — sin cambiar el comportamiento de ningún endpoint existente (el guard sigue siendo opt-in por controlador).
- **Auditado y sin cambios (ya cumplía el estándar):** JWT, validaciones globales, manejo de errores, Guards existentes. Detalle completo en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §30.

## 2026-07-25 — Auditoría Enterprise, Fase 1: Infraestructura

- **Nuevo:** capa de caché (`@nestjs/cache-manager`, en memoria, sin Redis), registrada globalmente, aplicada explícitamente solo en `GET /public/:slug/booking-data` (TTL 15s) — la única lectura pública de alto tráfico y baja frecuencia de cambio del sistema.
- **Corregido:** `app.enableShutdownHooks()` faltaba en `main.ts` — sin esto, el cierre limpio de conexiones de Prisma no estaba garantizado en un apagado real de contenedor.
- **Evaluado y descartado (con justificación):** ajustar el pool de conexiones de Prisma sin conocer el proveedor de Postgres real; migrar todo `process.env` a `ConfigService` inyectado (refactor invasivo, beneficio marginal); agregar `compression` (dependencia nueva no autorizada para esta fase). Detalle completo en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §29.

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
- **Rebranding:** el proyecto pasó de BarberFlow OS a **Kortek OS**. Kortek es la plataforma matriz; BarberFlow es su primer producto SaaS. Ver el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §24 para las decisiones registradas entonces sobre rebranding y reconstrucción frontend.
- **Bloqueado en la fecha de esta entrada:** el refactor `User` + `Membership` requería confirmar primero que no existieran correos duplicados entre organizaciones. La verificación y resolución posterior están preservadas en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §26; no es un bloqueo vigente.

## Historial anterior

El detalle completo de las Fases 0 a 9 (rebranding, limpieza de backend, reconstrucción de frontend, rol `CUSTOMER`, flujo B2C, roles refinados, gestión de equipo) está preservado en el [`PROJECT_MASTER` histórico](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md) §24. Ese snapshot conserva el contexto de su fecha; el estado actual vive en [`PROJECT_MASTER.md`](PROJECT_MASTER.md).
