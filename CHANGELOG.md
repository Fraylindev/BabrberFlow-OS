# CHANGELOG

Todas las entradas están en español, siguiendo el idioma del resto del proyecto. Formato libre, orientado a decisiones y cambios reales — no es un changelog de versión semántica de paquete.

> Cada entrada es una fotografía histórica de su fecha. Para estado vigente usar [`PROJECT_MASTER.md`](PROJECT_MASTER.md). Las referencias antiguas a secciones numeradas de PROJECT_MASTER apuntan al snapshot preservado en [`docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md`](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md).

## 2026-09-03 — Correctivo de throttling de Equipo A Backend

- `PATCH /organizations/mine/team-members/role` y `POST /organizations/mine/team-members/revoke` incorporan un límite específico de 10 solicitudes por minuto mediante el guard existente, coherente con las mutaciones de invitaciones.
- Se añaden regresiones sobre metadata y composición de guards. No cambian contratos, DTOs, persistencia, permisos, invitaciones, Clerk/Auth legacy ni otros módulos.
- TypeScript, lint y build pasaron; 404 unitarias aprobaron/11 quedaron omitidas y 3/3 E2E de miembros aprobaron tras aplicar las 19 migraciones en PostgreSQL temporal aislado.
- Equipo A permanece **IMPLEMENTADO / EN REVISIÓN** hasta la aprobación explícita del propietario; no se inicia frontend.

## 2026-09-03 — Equipo Entrega A Backend

- Se publica un directorio de miembros paginado y mínimo para OWNER/ADMIN, separado de la proyección legacy que Profesionales todavía necesita. Expone solo nombre, correo, rol, acceso y nombre/estado del Professional vinculado.
- OWNER/ADMIN pueden cambiar roles asignables y revocar Membership. ADMIN no opera OWNER; el último OWNER queda protegido con bloqueo tenant-scoped y transacción `SERIALIZABLE`. Repeticiones no duplican cambios ni auditoría y un correo ajeno no revela otra organización.
- Revocar acceso conserva User, Professional e historial. El vínculo profesional es solo informativo y este módulo no crea, enlaza, edita ni desvincula perfiles.
- Invitaciones conservan los contratos Clerk aprobados: OWNER no es invitable, la creación equivalente abierta se reutiliza y crear/reenviar/revocar recibe throttling específico. AuditLog de mutaciones no contiene PII.
- Prisma validate/generate, TypeScript, lint y build pasaron; 402 unitarias aprobaron/11 quedaron omitidas, 14/14 E2E dirigidas y 121/121 E2E completas aprobaron con las 19 migraciones sobre PostgreSQL temporal aislado.
- No hay cambio Prisma ni migración, frontend, Auth legacy, Reservas, Facturación, Profesionales u otro módulo. Estado: **IMPLEMENTADO / EN REVISIÓN**; el frontend requiere aprobación explícita posterior.

## 2026-09-02 — Cierre oficial de Servicios

- El propietario aprobó oficialmente Servicios — Entrega B Frontend tras su QA manual sobre `79706ffdc16e9225e6e6528845c9e445a7829ff0`.
- Backend A/A.1, Frontend B y el módulo completo de Servicios quedan **CERRADOS / APROBADOS**; se conservan contratos, permisos, aislamiento, validaciones y evidencia previamente publicados.
- El cierre es exclusivamente documental y no cambia código, endpoints, Prisma, migraciones ni otros módulos. El siguiente alcance se limita a auditar Equipo, sin implementación.

## 2026-09-02 — Servicios Entrega B: orden y experiencia del formulario

- El propietario aprobó Servicios A.1 Backend sobre `9752842dfc8a3a53cdcb6bc06e61a185bc79a385`; su contrato de ordenamiento queda **CERRADO / APROBADO** y se consume sin ampliaciones.
- Estado y orden son dos selectores independientes. El orden se ejecuta en backend y ofrece Nombre A–Z, más/menos reservas registradas, más recientes/antiguos y precio en ambos sentidos; “Limpiar filtros” restablece ambos controles sin recargar datos de otro alcance.
- Se corrige la pérdida de foco al escribir en alta/edición manteniendo estable el callback de cierre del modal. Precio usa entrada decimal DOP estricta sin exponentes, signos ni más de dos decimales; duración usa minutos enteros, equivalencia natural y accesos rápidos de 15 a 120 minutos.
- Listado y formulario reservan un slot visual no interactivo para la futura imagen del servicio. No existe carga, URL nueva, dato ficticio ni integración con Cloudinary/media.
- Se añadieron regresiones para dinero y duración. Web TypeScript, lint, 35/35 pruebas y build de producción finalizaron con exit `0`.
- QA real con Clerk Development y PostgreSQL desechable cubrió OWNER → BARBER → OWNER, datos y acciones distintos por tenant, combinación de estado/orden, alta y edición sin pérdida de foco, error terminal sin conservar datos, recuperación con “Reintentar”, desktop y 375 px sin overflow. No hubo errores de aplicación en consola; solo el aviso esperado de claves Development de Clerk.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No cambia backend, Prisma, Reservas, Facturación, página pública, `ProfessionalService`, Cloudinary/media ni otro módulo.

## 2026-09-01 — Servicios A.1 Backend: ordenamiento del catálogo

- `GET /services` incorpora un `sort` opcional para nombre, mayor/menor número de reservas registradas, fecha de creación y precio en ambos sentidos. El orden predeterminado por nombre permanece compatible.
- “Reservas registradas” cuenta reservas no canceladas del servicio dentro del tenant. El conteo solo ordena: no se expone en la respuesta ni altera la proyección mínima.
- Los desempates son estables y la proyección se construye explícitamente para impedir que conteos o metadatos internos se filtren por accidente.
- No cambia Prisma, migraciones, roles, mutaciones, catálogo público ni otros módulos. El propietario aprobó explícitamente este contrato sobre `9752842dfc8a3a53cdcb6bc06e61a185bc79a385` antes de su consumo frontend.
- Pasaron 56 pruebas unitarias dirigidas, 15/15 E2E aisladas de Servicios con 19 migraciones desde cero, 392 unitarias API (11 omitidas), TypeScript, lint, build y Prisma validate/generate. Estado vigente: **CERRADO / APROBADO**.

## 2026-08-31 — Servicios Entrega B Frontend

- El propietario aprobó oficialmente Servicios Entrega A Backend sobre `f7088a4abb14e61721f08f7eeb85adbd8e6650d6`; el contrato backend queda **CERRADO / APROBADO** sin cambios adicionales.
- Servicios incorpora listado responsive, filtro backend por estado, alta, edición, desactivación y reactivación. OWNER/ADMIN gestionan; BARBER/RECEPTIONIST consultan sin controles de mutación.
- La pantalla cubre loading, vacío, error/reintento, pending y confirmación de éxito. Usa tabla en desktop y tarjetas sin overflow en móvil; formularios y mensajes reflejan los límites y la proyección mínima publicados.
- Consulta, modales y efectos de mutaciones se aíslan por usuario, organización y rol. El cambio de contexto desmonta inmediatamente la pantalla y la identidad de visita evita efectos tardíos también en A → B → A.
- Web TypeScript, lint, 33/33 pruebas y build de producción finalizaron con exit `0`. QA real con Clerk Development y PostgreSQL desechable verificó OWNER → BARBER → OWNER, datos distintos por tenant, alta, edición, validación monetaria, desactivación, filtro, permisos, éxito, desktop y 375 px sin overflow. Reactivación visual, error/reintento y cambio con modal abierto quedan para la revisión del candidato porque la sesión de automatización se interrumpió después de la desactivación; los contratos, estados y regresiones de aislamiento correspondientes sí quedan implementados.
- Estado de Entrega B: **IMPLEMENTADO / EN REVISIÓN**. No cambia backend, Prisma, Reservas, Facturación, página pública, `ProfessionalService`, Cloudinary/media ni otro módulo.

## 2026-08-31 — Servicios Entrega A Backend

- Servicios deja de borrar registros: `DELETE /services/:id` desactiva de forma idempotente y `PATCH /services/:id/reactivate` ofrece la transición inversa explícita. La edición general ya no admite `isActive`.
- `GET /services` conserva el arreglo compatible y añade `isActive=true|false`; `GET /services/:id` exige UUID. Lecturas cubren todos los roles B2B y mutaciones solo OWNER/ADMIN, siempre con tenant autenticado y `404` neutro frente a IDOR.
- Las respuestas mínimas omiten `organizationId`, timestamps y relaciones. Los DTOs recortan textos, exigen campos de creación, limitan nombre/descripción y restringen duración; el precio conserva la invariante DOP positiva de dos decimales.
- AuditLog cubre `CREATE`, `UPDATE`, `DEACTIVATE` y `REACTIVATE` sin PII. Cada mutación real invalida la caché pública para que una baja no permanezca visible; Booking, Invoice y su snapshot histórico se conservan, mientras nuevas reservas y catálogo público siguen exigiendo servicio activo.
- No hay cambio de schema ni migración. Prisma validate/generate y migrate status, TypeScript, lint y build terminaron en exit `0`; pasaron 375 unitarias backend (11 integraciones opt-in omitidas), incluidas 39/39 dirigidas, y 14/14 E2E PostgreSQL aisladas sobre 19 migraciones.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No inicia frontend de Servicios ni modifica Reservas, Facturación, página pública, `ProfessionalService`, Cloudinary/media u otro módulo.

## 2026-08-30 — Cierre oficial de Profesionales y Facturación-B Frontend

- El propietario aprueba oficialmente **Profesionales** (Frontend general, disponibilidad A2 y correctivo de perfil propio/aislamiento) y **Facturación-B Frontend**. Ambos quedan **CERRADO / APROBADO** sobre el estado funcional `bc3d1524d5ca185d46e963c086296895407f9cce`.
- Profesionales conserva sus contratos, permisos por rol, teléfono propio privado, disponibilidad y aislamiento usuario/tenant/rol, incluido A → B → A. Facturación-B conserva emisión interna, cobro completo único, ownership BARBER y filtro backend por fecha local de emisión/estado; no se corrige ni amplía su alcance.
- “Usar otra cuenta” en `apps/web/app/auth/continue/page.tsx` se conserva como cambio de acceso independiente aceptado por el propietario. Compartió el checkpoint anterior, pero no es una funcionalidad de Profesionales. Su código permanece intacto.
- Este cierre registra la decisión explícita del propietario y conserva la evidencia previa con sus límites; no afirma que se hayan ejecutado nuevas pruebas ni completado automáticamente el QA que figuraba pendiente en el candidato.
- Entrega exclusivamente documental: sin cambios funcionales, contratos, configuración, Prisma ni migraciones. No inicia otro módulo, no reconcilia la base legacy y no incluye visión futura, fixtures, respaldo ni cambios locales ajenos.

## 2026-08-30 — Correctivo de Profesionales: contexto y gestión del perfil propio

- Profesionales desmonta toda su vista al cambiar usuario, organización o rol y usa ese alcance completo en la consulta; ningún modal, formulario, confirmación, selección de disponibilidad ni dato de listado del contexto anterior permanece visible, y una mutación tardía de ese alcance no puede emitir estado ni toast en el nuevo. La revisión final corrigió también A → B → A mediante una instancia única por visita e invalidación al salir; incluye regresión automática.
- La disponibilidad conserva `Organization.timeZone` solo para cálculo y formato internos; la interfaz usa “Hora del negocio” y deja de mostrar identificadores IANA, UTC, offsets o detalles de conversión.
- Tras la revisión visual del propietario, se restaura la edición pública propia A1 (`name`, `bio`, `avatar`, `specialty`, `experienceYears`) y se conserva la edición del teléfono privado. La restricción local intermedia a solo `phone` queda sustituida por esta decisión; `PATCH /professionals/me` sigue rechazando estado, publicación, vínculo, tenant, IDs y rol. Nombre vacío/`null` se rechaza; opcionales admiten `null`. Identidad y tenant derivan de autenticación y AuditLog no guarda PII.
- La ficha propia ofrece “Gestionar mi perfil”, que reúne el detalle, “Editar información” y “Mi disponibilidad” sin apilar modales. La edición reutiliza los campos del formulario existente; el teléfono se identifica como privado y sigue ausente del directorio y las rutas públicas. No se añade subida de fotos ni gestión administrativa BARBER.
- El menú pasa a “Facturación” para todos los roles autorizados; la pantalla BARBER conserva “Facturación de mis servicios”, permisos, ownership y comportamiento financiero sin cambios.
- No hay migración, cambio Prisma ni módulos nuevos. 71 pruebas dirigidas API y 22/22 E2E PostgreSQL aisladas cubren normalización, `null`, campos prohibidos/inválidos, cambio de tenant, colega intacto, auditoría y privacidad; web prueba el payload y el aislamiento.
- Validación final: TypeScript, lint y build API/web en exit `0`; 354 unitarias API pasadas/11 omitidas y 27/27 web. Diff del alcance sin errores de whitespace.
- Publicación autorizada por el propietario el 2026-08-30 en un único checkpoint sobre `27214da509e9a94358924e6a8be6c2eed8fd793f`, con estado **IMPLEMENTADO / EN REVISIÓN**. No cierra Profesionales ni Facturación-B. La revisión previa y las capturas del propietario no se presentan como ejecución nueva de toda la matriz visual; quedan pendientes OWNER → BARBER → OWNER, cambio de organización con modal abierto, perfil/disponibilidad, error/reintento, móvil, teclado y consola. El fixture QA se conserva, sin incluir credenciales ni artefactos.
- Por autorización adicional se incluye el cambio del propietario en `auth/continue/page.tsx`: “Usar otra cuenta” reutiliza logout existente, no envía onboarding y se deshabilita mientras se crea el negocio. Solo se limpia whitespace final. Cinco regresiones unitarias del componente verifican botón, disabled, contrato y redirecciones. Navegador local confirmó redirección sin sesión a login; logout Clerk autenticado pendiente. No se modifica backend ni configuración de identidad.

## 2026-08-29 — Auditoría integral desde `2ffd44d`

- Se alinearon código, contratos y documentación con Clerk, Facturación-B y el modelo vigente.
- Se retiraron las rutas Organization que creaban tenants huérfanos o exponían UUID por slug, sin consumidores web actuales.
- Reservas y Servicios rechazan IDs de ruta inválidos con `400`; Analytics corrige la ventana de 30 días.
- Se añadieron ejemplos de entorno sin secretos, un gate `test` de workspace y lint API no mutante; se retiraron lockfile, backup y transcript obsoletos.
- Se actualizaron Next a `16.2.11` y Prisma/Client a `6.19.3`, se alineó TypeScript `5.9.3`, se corrigieron peers y se fijaron transitivas vulnerables desde `pnpm-workspace.yaml`; `pnpm audit --prod` no reporta vulnerabilidades conocidas.
- La landing ya no presenta testimonios, precios, descuentos o métricas comerciales inventados; el flujo funcional no cambia.
- No se añadió ninguna migración ni cambió la estructura persistida. Prisma ahora mapea los nombres históricos reales de dos claves foráneas tenant-scoped de disponibilidad profesional; las 19 migraciones, la E2E completa y el chequeo de drift se validan en PostgreSQL temporal aislado.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No constituye aprobación ni cierre de Facturación-B.

## 2026-08-29 — Estabilidad del Resumen y filtro real de Facturación

- El Resumen deja de conservar `loading` tras un fallo de sus dependencias, no renderiza datos vacíos como si fueran autoritativos y ofrece reintento sin alterar la clave de alcance ni la protección contra respuestas tardías de otro tenant.
- Facturación reemplaza los botones de estado por una sección responsive de “Fecha de emisión” con `Desde`, `Hasta`, `Estado` y limpieza visible. Las filas muestran la fecha real de `Invoice.issuedAt` separada de Reserva y Cobro.
- `GET /invoices` acepta `from`/`to` locales inclusivos y filtra `Invoice.createdAt` en backend usando `Organization.timeZone`, combinado con tenant, ownership y estado antes de ordenar y paginar. Los extremos abiertos son válidos y el rango invertido recibe `400` antes de consultar organización o facturas.
- El diagnóstico real identificó `GET /analytics/dashboard` y `GET /invoices?page=1&limit=20` con `500` seguro porque el esquema financiero del PostgreSQL local seguía legacy aunque su ledger declaraba aplicadas las migraciones de Facturación-A. Para no operar esa base inconsistente, la validación continuó en una base local desechable creada desde cero con las 19 migraciones reales.
- API TypeScript/lint/build y Web TypeScript/lint/build finalizaron con exit `0`; pasaron 331 unitarias API, 18 pruebas web y 21/21 E2E de Facturación sobre PostgreSQL 16 temporal aislado. QA real OWNER/BARBER cubrió cambio de tenant, rangos, estado, error/reintento, 1440 px y 375 px sin overflow.
- Estado: correctivo candidato **IMPLEMENTADO / EN REVISIÓN**. Facturación-B no se cierra ni aprueba; no se modifica A0.6-B, Clerk, Supabase, Prisma, reembolsos, anulaciones, comisiones, Profesionales ni otro alcance.

## 2026-08-27 — Facturación-B Frontend implementado como candidato

- Se reemplazó el consumidor financiero incompatible por el contrato aprobado: listado mínimo y paginado, estados derivados `ISSUED`/`PAID`, importes DOP como strings decimales, emisión con solo `bookingId` y cobro completo con solo `method`.
- Reservas permite emitir desde una Booking completada; Facturación ofrece filtros, estados loading/empty/error/pending/success, confirmación de cobro, fechas en la zona del negocio, tabla desktop y tarjetas móviles. BARBER usa “Facturación de mis servicios” y no recibe lenguaje de ganancias ni columnas financieras de otros profesionales.
- Las consultas quedan aisladas por usuario, organización y rol. El cambio de contexto retira inmediatamente los datos anteriores, carga el tenant nuevo y descarta efectos visuales de mutaciones tardías; se conserva la limpieza global vigente de React Query.
- QA real sobre PostgreSQL temporal aislado y una identidad con organizaciones/roles OWNER y BARBER verificó cambio de tenant sin datos obsoletos, emisión y cobro BARBER, importe inmutable, método, fecha del servidor, actor y auditoría sin PII, filtros, diálogo, desktop, 375 px sin overflow y consola sin errores de aplicación.
- Web TypeScript, lint y build finalizaron con exit `0`; pasaron 6 pruebas de Facturación, 5 de aislamiento del Resumen y 5 de rutas de autenticación. Las E2E backend específicas aprobaron 20/20 sobre una base `_test` con 19 migraciones desde cero.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No está cerrado ni aprobado y no autoriza A0.6-B, Clerk, Supabase, reembolsos, anulaciones, comisiones ni otro alcance.

## 2026-08-26 — Facturación-A Backend cerrado y aprobado

- El propietario aprobó explícitamente el checkpoint correctivo `21761ac573b075ec627c0e91593d61a4279c2b8f` y cerró Facturación-A Backend.
- La aprobación conserva el contrato de Invoice/Payment, aislamiento tenant/ownership, concurrencia, auditoría sin PII, mínima exposición, Analytics por fecha real de pago y los correctivos temporal y monetario.
- La evidencia aprobada incluye Prisma, TypeScript, lint y build en exit `0`; 328 unitarias; 80/80 E2E PostgreSQL aisladas; 19 migraciones desde cero; y QA fail-closed con rollback atómico para datos históricos inválidos.
- Este cierre es exclusivamente documental. Facturación-B queda limitada a análisis y plan; no autoriza implementación frontend, A0.6-B, Clerk, Supabase, reembolsos, anulaciones, comisiones ni otro alcance.
- Estado: **CERRADO / APROBADO**.

## 2026-08-26 — Correctivo temporal y monetario de Facturación-A Backend

- Se impidió completar una Booking antes de `endTime` para todos los roles autorizados usando tiempo del servidor; Invoice y Payment repiten el control para datos históricos.
- `Service.price` quedó limitado a DOP positivo con máximo dos decimales en creación, edición, servicio, Prisma y PostgreSQL.
- La migración fail-closed bloquea precios históricos inválidos y Booking futura ya completada sin redondear ni alterar parcialmente las filas.
- Prisma, TypeScript, lint y build pasaron; 328 unitarias y 80/80 E2E PostgreSQL aisladas aprobaron. QA verificó `0`, `125.555`, constraint, OWNER/BARBER, emisión/cobro futuros y tres escenarios históricos de migración.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. La auditoría no aprueba ni cierra el checkpoint y no autoriza ningún alcance posterior.

## 2026-08-25 — Facturación-A Backend implementado como candidato

- Se implementó Invoice interna única para Booking completada, snapshot server-side del precio, Payment completo único con método/fecha/actor y respuestas mínimas paginadas.
- OWNER, ADMIN y RECEPTIONIST operan el tenant; BARBER queda limitado por tenant y `Professional.userId` a sus propias reservas. CUSTOMER no accede a Facturación o Analytics global.
- Emisión y cobro son serializables, idempotentes, resistentes a carreras y auditados de forma transaccional sin PII. Analytics usa `Payment.paidAt` y la zona del negocio.
- La migración fail-closed convierte solo Invoice legacy determinista y bloquea Payment o estados sin trazabilidad real. Se validaron ambos caminos en PostgreSQL temporal.
- Prisma, TypeScript, lint y build pasaron; 305 unitarias y 78/78 E2E PostgreSQL aisladas aprobaron. El QA backend integrado cubrió roles, dos tenants, IDOR, mínima exposición, concurrencia, constraints, auditoría y rollback.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No autoriza frontend, A0.6-B, Clerk, Supabase, reembolsos, anulaciones, comisiones ni otro alcance.

## 2026-08-25 — Contrato técnico de Facturación-A preparado

- Se registraron las decisiones del propietario para una factura interna no fiscal: solo Booking completada, snapshot server-side del precio, un Payment completo con método/fecha/actor, Analytics por fecha real de pago, respuestas mínimas/paginadas y auditoría sin PII.
- El plan define modelo/migración, invariantes, transiciones, endpoints, DTOs/proyecciones, permisos tenant/ownership para OWNER, ADMIN, RECEPTIONIST y BARBER, concurrencia, idempotencia, pruebas y QA.
- Estado: **PLAN TÉCNICO / PENDIENTE DE APROBACIÓN PARA IMPLEMENTAR**. No se modificaron código, frontend, A0.6, Clerk, Prisma, Supabase ni contratos ejecutables; `BACKEND_CHANGES.md` permanece intacto.

## 2026-08-25 — Correctivo de aislamiento del Resumen cerrado y aprobado

- El propietario aprobó y cerró explícitamente el checkpoint `3235501956050e284d84d9aa306b2653cc07003d` después de revisar el aislamiento por usuario, organización y rol, las pruebas de respuestas tardías y el QA real `OWNER → BARBER → OWNER` en escritorio y móvil.
- El cierre se limita al correctivo transversal. El módulo Resumen continúa congelado y no se aprueban ni modifican Facturación, A0.6, Clerk, backend, Prisma, contratos API, Supabase o ADR.
- El siguiente alcance queda limitado al análisis y plan de Facturación segura. Su implementación y Security A0.6-B permanecen pendientes de autorización explícita.

## 2026-08-24 — Correctivo de aislamiento del Resumen candidato

- El Resumen vincula su estado remoto a `usuario + organización + rol`, oculta los datos anteriores inmediatamente al cambiar el contexto y descarta respuestas tardías por alcance e identificador de solicitud. Se conserva la limpieza vigente de React Query.
- Se añadieron cinco pruebas de regresión para cambio de tenant/rol, respuesta tardía y ciclo `A → B → A`. Web TypeScript, lint, build, pruebas del correctivo y regresión de rutas de autenticación finalizaron con exit `0`.
- El QA real con una identidad de dos organizaciones y roles `OWNER`/`BARBER` pasó en escritorio y 390×844: cada cambio cargó el tenant nuevo sin métricas, reservas ni profesionales obsoletos y sin errores de aplicación en consola. La membresía adicional fue un fixture local autorizado y no forma parte de Git.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. El Resumen continúa congelado y no aprobado; no se modificaron Facturación, A0.6, Clerk, backend, Prisma, contratos API ni ADR.

## 2026-08-22 — Security A0.6-A cerrado y aprobado

- El propietario aprobó y cerró explícitamente el checkpoint backend A0.6-A después de revisar la migración, el contrato de reclamación, la atomicidad, la política anti-enlace, la privacidad tenant y la evidencia automatizada ya registrada.
- Se preserva la evidencia sin PII: Prisma, TypeScript, lint y build finalizaron con exit `0`; 286 unitarias y 5 E2E PostgreSQL aisladas pasaron, y el clúster temporal fue eliminado.
- Este cierre no modifica funcionalidad. A0.6-B queda limitado a análisis y planificación; A0.6-C/D y otros alcances permanecen bloqueados.

## 2026-08-22 — Security A0.6-A backend implementado como candidato

- Se añadió el vínculo B2C opcional `Client.userId`, separado de Membership y único por organización, sin backfill ni modificación de cuentas existentes.
- El nuevo endpoint Clerk permite reclamar de forma segura e idempotente el Client asociado a una reserva. La consulta autoritativa y los bloqueos de Booking/Client viven en una transacción PostgreSQL `SERIALIZABLE`; User opcional, vínculo y auditoría sin PII son atómicos.
- No existe enlace automático por correo. Cualquier User local ya ocupado —incluidos CUSTOMER legacy— provoca `409` neutro y rollback completo. No se crea Membership CUSTOMER.
- El contrato público legacy y el flujo de reserva/password permanecen intactos. Las pruebas unitarias y E2E PostgreSQL aisladas cubren idempotencia, carreras, tenant, colisiones y ausencia de filas parciales.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No aprueba ni cierra A0.6-A y no autoriza A0.6-B/C/D, Supabase u otro alcance.

## 2026-08-22 — Security A0.5 completo cerrado y aprobado

- El propietario aprobó y cerró explícitamente Security A0.5 completo, incluidos sus subalcances A, B, C y D.
- El cierre conserva la evidencia ya registrada: bootstrap y autorización local en NestJS, identidad Clerk en web sin JWT propio persistido, invitaciones seguras para cuentas nuevas y preexistentes, validaciones automatizadas y QA real.
- No se añadieron cambios funcionales ni nueva evidencia sensible. A0.6 queda limitado a análisis y plan hasta una autorización posterior de implementación.

## 2026-08-22 — Correctivo de invitaciones A0.5-B/A0.4 candidato

- La creación y el reenvío de invitaciones ahora anexan en backend el UUID local de `TeamInvitation` a la URL controlada por servidor. Se eliminó la dependencia de metadata pública Clerk para correlacionar la aceptación.
- El frontend conserva el UUID local entre rutas internas fijas y rechaza localizadores ausentes, inválidos o duplicados. No acepta redirects libres, tenant, rol, correo ni identificadores Clerk desde el navegador.
- Pruebas unitarias y E2E cubren creación, reenvío, URL controlada, ausencia de metadata y continuidad segura. API TypeScript, lint, build y 278 unitarias; Web 5 pruebas de rutas, TypeScript, lint y build; y 11 E2E de invitaciones sobre PostgreSQL temporal aislado finalizaron con exit `0`. El QA real nuevo con una cuenta Clerk preexistente confirmó `201`, repetición `200` y acceso al dashboard.
- Se revocaron con trazabilidad las dos invitaciones técnicas pendientes anteriores y se eliminaron exactamente dos identidades técnicas Clerk Development que no tenían User local. No se borraron filas históricas ni se conservaron PII, tokens, claves, cookies o identificadores sensibles.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No aprueba ni cierra A0.5-B y no autoriza A0.6, Supabase u otro módulo.

## 2026-08-22 — Security A0.5-B frontend implementado como candidato

- La web interna migró login, registro, recuperación y logout al SDK oficial de Clerk. El token de sesión se obtiene al hacer cada petición y ya no se guarda un JWT propio en `localStorage` ni se usa la cookie indicadora legacy.
- El contexto de negocio se resuelve mediante `GET /auth/clerk/bootstrap`; la organización activa solo puede elegirse entre Memberships locales autorizadas y el cambio de tenant purga la caché de negocio.
- Onboarding consume el contrato A0.3-A y Equipo consume las invitaciones A0.4 sin solicitar ni compartir contraseñas temporales. Los endpoints legacy backend permanecen sin cambios como rollback y la web deja de consumirlos.
- Exit `0`: Web TypeScript, lint y build. QA real con Clerk Development verificó login/logout OWNER, recuperación y registro visibles sin crear cuentas, gestión de Equipo sin contraseñas, BARBER restringido y responsive sin overflow en móvil pequeño y desktop; no hubo errores de aplicación en consola ni envíos de invitaciones.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. No aprueba A0.5-A ni A0.5-B y no autoriza A0.6, retiro legacy, Supabase u otro módulo.

## 2026-08-22 — Security A0.5-A implementado como candidato

- Se añadió el bootstrap backend de sesión Clerk para distinguir onboarding, falta de acceso y Memberships B2B listas, con una proyección mínima que no expone correo, identificadores Clerk, CUSTOMER ni timestamps.
- Las rutas B2B aceptan temporalmente JWT legacy revalidado o sesión Clerk verificada con selector tenant único; la autorización continúa en Membership y rol locales. Los endpoints legacy de identidad y las rutas públicas no cambian.
- Las invitaciones Clerk reciben una redirección configurada y validada, sin convertir metadata o datos del navegador en autoridad.
- Exit `0`: API TypeScript, lint, build, 277 unitarias y 55 E2E. Las E2E usaron un PostgreSQL temporal estrictamente aislado, base `_test` y rol limitado; el clúster se eliminó al finalizar.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. Este checkpoint no aprueba A0.5-A ni autoriza A0.5-B, Supabase u otro módulo.

## 2026-08-21 — Security A0.4 cerrado y aprobado

- El propietario aprobó explícitamente Security A0.4 después de la auditoría y del QA integrado real ya registrado.
- Se preserva la evidencia: aceptación inicial `201`, repetición idempotente `200`, rechazo neutro `409` tras revocación y una sola Membership y un solo Professional en PostgreSQL, sin duplicados.
- Estado vigente: **CERRADO / APROBADO**. El siguiente alcance se limita al análisis y diseño de Security A0.5; no autoriza implementación, Supabase ni otro módulo.

## 2026-08-21 — QA integrado real de Security A0.4

- Se validó el flujo nuevo de invitaciones con sesiones reales de Clerk Development y una cuenta controlada, sin repetir QA de A0.1–A0.3.
- La primera aceptación devolvió `201`; repetirla con la misma identidad devolvió `200`. PostgreSQL confirmó exactamente una Membership y un Professional, sin duplicados.
- Una segunda invitación fue creada y revocada de forma controlada; intentar aceptarla después devolvió `409` con mensaje neutro y no concedió acceso adicional.
- La utilidad temporal estaba ignorada, se eliminó al terminar y no entró en Git. La evidencia no conserva PII, tokens, claves, cookies ni identificadores sensibles.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. El QA integrado no equivale a aprobación ni cierre; A0.4 queda pendiente de auditoría explícita.

## 2026-08-21 — Security A0.4 implementado como candidato

- Se añadió el ciclo tenant-scoped de invitaciones Clerk para Equipo: OWNER/ADMIN gestionan invitaciones de ADMIN, BARBER o RECEPTIONIST; nadie puede invitar como OWNER.
- La aceptación valida primero la identidad e invitación externas y persiste de forma `SERIALIZABLE` e idempotente User nuevo cuando corresponde, Membership, Professional BARBER opcional, estado y auditoría sin PII.
- Se aplicó la decisión de seguridad de no enlazar jamás por coincidencia de correo. Cualquier correo local ya ocupado —sin enlace o enlazado a otra identidad Clerk— devuelve `409` neutro sin filas parciales.
- Las llamadas a Clerk se coordinan mediante estados locales sin mantener transacciones de base abiertas durante la red. Migración, constraints y pruebas cubren aislamiento, roles, reenvío/revocación, expiración, fallos externos, rollback y concurrencia.
- Exit `0`: Prisma validate/generate, API TypeScript, lint y build; 3/3 unitarias y 11/11 E2E nuevas sobre PostgreSQL temporal aislado. No hubo cambios de frontend ni QA con invitaciones reales.
- Estado: **IMPLEMENTADO / EN REVISIÓN**. A0.4 no está aprobado y el siguiente paso es su auditoría.

## 2026-08-21 — Security A0.3-B cerrado y aprobado

- Se implementó el piloto backend `GET /auth/clerk/me` con `ClerkAuthGuard + RolesGuard + B2B_ROLES`, Membership/rol local y reutilización directa de `OrganizationsService.findMine()`; `GET /organizations/mine` y el flujo JWT legacy no cambiaron.
- `ClerkAuthGuard` ahora rechaza con `401` cualquier `x-organization-id` duplicado antes de Clerk o PostgreSQL, incluso si los valores son iguales, además de arreglos, valores combinados y selectores inválidos.
- La cobertura comprueba roles B2B, `CUSTOMER`, tenant ajeno, User no enlazado, Membership ausente/cambiada/eliminada, sesión revocada, duplicados físicos y paridad exacta con la respuesta legacy.
- Exit `0`: API TypeScript, lint y build; 262 unitarias (11 integraciones opt-in omitidas) y 36/36 E2E sobre PostgreSQL temporal aislado. Los clústeres temporales fueron apagados y eliminados sin tocar la base principal.
- El propietario confirmó el QA integrado real con la sesión Clerk ya validada: `GET /auth/clerk/me` respondió `200` y la organización coincidió con la autorizada. No se repitieron onboarding, conflictos, revocación ni pruebas de otros tenants.
- La evidencia no conserva PII, tokens, claves, cookies ni identificadores sensibles; la utilidad temporal ignorada fue eliminada y nunca entró en Git.
- Estado: **CERRADO / APROBADO** por decisión explícita del propietario.

## 2026-08-21 — Correctivo documental del plan Security A0.3-B

- Se sincronizó el estado vigente de Security A0.3-H como **CERRADO / APROBADO** por decisión explícita del propietario; las entradas históricas permanecen intactas como fotografía de su fecha.
- El diseño A0.3-B conserva `GET /auth/clerk/me`, `ClerkAuthGuard + RolesGuard + B2B_ROLES`, Membership/rol local, reutilización directa de `OrganizationsService.findMine()` y paridad con `GET /organizations/mine` sin modificar la ruta JWT legacy.
- Se añadió como requisito obligatorio que cualquier `x-organization-id` duplicado devuelva `401`, incluso con valores idénticos, con cobertura unitaria y E2E PostgreSQL aislada. La corrección puntual futura de `ClerkAuthGuard` queda dentro del alcance A0.3-B aprobado como diseño.
- Security A0.3-B permanece **PLANIFICADO / PENDIENTE DE AUTORIZACIÓN**; este checkpoint no contiene implementación funcional.

## 2026-08-20 — Security A0.3-A cerrado y aprobado

- El propietario cerró y aprobó explícitamente Security A0.3-A después de QA integrado real con sesiones Clerk Development.
- La evidencia confirmó alta inicial `201`, reintento idempotente `200` sobre la misma organización, conflicto `409` para una segunda identidad sobre el mismo slug y rechazo `401` de una sesión revocada, sin documentar PII, tokens, claves, cookies ni identificadores sensibles.
- Se eliminó la utilidad temporal local usada para QA; permaneció ignorada y nunca entró en Git.
- Security A0.3-B queda únicamente **PLANIFICADO / PENDIENTE DE AUTORIZACIÓN**. No se implementó el piloto ni se modificaron login/registro JWT, Prisma, Supabase, frontend productivo u otros módulos.

## 2026-08-20 — Correctivo bloqueante de Security A0.3-A

- El conflicto entre un correo verificado de Clerk y un `User` local no enlazado registra `CLERK_ONBOARDING_EMAIL_CONFLICT` sin PII ni identificadores. Como todavía no existe un tenant autoritativo, `AuditLog.organizationId` admite `NULL` solo para ese evento pre-tenant; un `CHECK` PostgreSQL exige además `userId` y `entityId` nulos y evita inventar una organización.
- La respuesta al cliente permanece en `409` genérico y no expone correo, `clerkUserId` ni IDs internos. La misma política se aplica si la colisión de correo se materializa durante la transacción.
- PostgreSQL aislado comprobó dos identidades Clerk distintas compitiendo por el mismo slug: exactamente una respuesta `201`, una `409`, una sola Organization y solo las filas User/Membership/AuditLog del ganador. Otra E2E comprobó que un fallo de `Clerk.users.getUser()` devuelve `503` genérico sin escrituras.
- Validación final en exit 0: API TypeScript, lint, build, Prisma validate/generate y 258 unitarias aprobadas (11 integraciones opt-in omitidas); E2E 23/23 en `kortek_e2e_test`; web TypeScript, lint y build como regresión. La base E2E usa una credencial separada de la principal.
- El archivo vacío no rastreado `apps/web/pnpm` fue revisado y eliminado; no era fuente ni dependencia del proyecto.
- Estado: Security A0.3-A **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría. No está aprobado ni cerrado y no autoriza A0.3-B, frontend Clerk, Supabase u otro módulo.

## 2026-08-20 — Recuperación de Security A0.3-H y saneamiento local

- Se auditó el código y el historial desde Security A0.2 hasta `baff8627efca7838e83061a2a1fd20d52f2d0e3d`. Security A0.3-H y A0.3-A quedan **IMPLEMENTADOS / EN REVISIÓN**; se retiraron las afirmaciones no verificables de cierre/aprobación de A0.3-H y A0.3-A no se amplió.
- El guard E2E deja de aceptar `schema=test` dentro de la base principal. Exige base `_test`, usuario distinto y comprobación PostgreSQL real de propiedad limitada, ausencia de privilegios globales/heredados y falta de acceso a la base principal. `global-setup.ts` ya no crea schemas con SQL dinámico.
- La concurrencia del registro legacy comprueba en la base real que persiste exactamente un `User`, una `Organization`, una `Membership OWNER` y un `AuditLog`. La proyección de Equipo eliminó supresiones ESLint y conserva el password fuera de la respuesta mediante tipos explícitos.
- 21/21 E2E pasaron en un clúster PostgreSQL temporal separado, base `kortek_e2e_test` y rol limitado `kortek_e2e_runner`; no se usaron credenciales ni schema de la base principal.
- API TypeScript/lint/build/Prisma, 257 unit tests y Web TypeScript/lint/build terminaron en exit 0. Un smoke HTTP real confirmó registro y login, CORS, rechazo de `organizationId`, protección de `POST /organizations` y atomicidad `1|1|1|1`.
- El propietario completó QA manual en navegador: registro, cierre de sesión e inicio con credenciales válidas funcionan; credenciales inválidas muestran el mensaje genérico correcto.
- Saneamiento local: se creó `pg_hba.conf.backup-20260819-234953`, se cambiaron únicamente las cuatro reglas TCP locales afectadas de `trust` a `scram-sha-256`, se verificó conexión con contraseña y se retiraron de `barberflow` `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION` y `BYPASSRLS` sin borrar roles, objetos ni datos. La instancia nativa inspeccionada contiene 0 Users, 0 Organizations y 0 Memberships; el inventario de 19 Users permanece como evidencia histórica de otro estado/entorno.
- Estado: checkpoint candidato de recuperación **IMPLEMENTADO / EN REVISIÓN**. El QA habilita publicación para auditoría, no aprueba A0.3-H ni A0.3-A y no autoriza A0.3-B.

## 2026-08-15 — Security A0.3-A: Onboarding backend con Clerk

- **Endpoint de Onboarding:** Se implementó `POST /auth/clerk/onboarding` bajo `ClerkOnboardingGuard`, permitiendo crear una barbería inicial y asociar al propietario autenticado en Clerk sin requerir pertenencia previa a un tenant.
- **Helper Compartido:** Se extrajo el helper `toWebRequest` (`apps/api/src/auth/clerk/to-web-request.ts`) para unificar la conversión de peticiones Express a Request de Web Fetch API en `ClerkAuthGuard` y `ClerkOnboardingGuard`.
- **Validación Estricta de Perfil y Verificación de ID:** Consulta autoritativa a `users.getUser` mediante el cliente instanciado lazy en `ClerkSessionVerifierService`. Se verifica estrictamente que `clerkUser.id === clerkUserId` (401 seguro antes de tocar base de datos si difiere). Nombre obligatorio resuelto de `firstName`/`lastName` o `username` (400 si falta; prohibido body o metadata). Correo principal verificado obligatorio (403 si `status !== 'verified'`). Falla de Clerk API responde 503 controlado sin tocar base de datos.
- **Política Anti-Enlace:** Rechazo 409 completamente neutro (*"No es posible completar el registro con los datos proporcionados"*) si el correo verificado coincide con un usuario local no enlazado.
- **Alta Atómica `SERIALIZABLE`:** Creación transaccional de `User(password: null, clerkUserId, lastOrganizationId: org.id)`, `Organization` y `Membership(OWNER)` con `AuditLog` sin PII. Rollback total si falla `logTransactional`. Reintento acotado a 3 intentos para `P2034`.
- **Manejo de Concurrencia e Idempotencia `Promise.all`:** Ráfagas simultáneas con el mismo `clerkUserId` se resuelven de forma idempotente retornando `200 OK` y garantizando exactamente 1 User, 1 Organization, 1 Membership OWNER y 1 AuditLog en PostgreSQL real. Si el estado es parcial/inconsistente, responde 409 y nunca crea una segunda organización.
- **Pruebas históricas:** 253 unit tests y 21 tests E2E se reportaron con dobles de Clerk (cero secretos y cero llamadas de red, validando rechazo 401 sin header Authorization). El aislamiento por schema usado entonces fue sustituido el 2026-08-20 por una base y credencial separadas.
- **Estado:** Security A0.3-A **IMPLEMENTADO / EN REVISIÓN** (No aprobado. Alcance estrictamente backend).

## 2026-08-15 — Security A0.3-H: Hardening legacy

- **Registro atómico:** El endpoint `POST /auth/register` ya no acepta `organizationId`. Ahora exige `organizationName`, `organizationSlug` y `organizationEmail`, y crea atómicamente el `User`, `Organization` y `Membership OWNER`. Esto ocurre en una transacción PostgreSQL estricta (aislamiento `Serializable`) con reintentos acotados (hasta 3) exclusivamente para `P2034` y fallos inmediatos por colisiones (`P2002`). Se normalizan explícitamente a minúsculas `organizationSlug`, `email` y `organizationEmail`.
- **Protección de organizaciones:** `POST /organizations` (`OrganizationsController`) ahora está protegido por `JwtAuthGuard` y `RolesGuard(OWNER)`, dejando de ser un flujo público para el alta inicial de barberías.
- **Cuentas sin contraseña:** `User.password` ahora es `String?`. El endpoint `/auth/login` se modificó de manera retrocompatible para manejar cuentas sin contraseña (como futuras cuentas creadas por Clerk) retornando un genérico `401 Credenciales inválidas` para prevenir fugas de información o errores internos. La actualización de contraseña (`/auth/update-password`) verifica y bloquea operaciones en cuentas sin contraseña local antes de verificar hashes.
- **Auditoría:** La transacción atómica escribe en el `AuditLog` un evento `CREATE` sin incluir información sensible (PII) vía `AuditService.logTransactional()`, provocando rollback atómico si la auditoría falla.
- **Frontend web:** Se actualizó `apps/web/lib/auth-context.tsx` para enviar el nuevo payload unificado a `/auth/register` incluyendo `organizationEmail`.
- **Aislamiento E2E histórico:** `global-setup.ts` aceptaba bases `_test` o schemas `test`/`_test`; la recuperación del 2026-08-20 determinó que la segunda opción no era aislamiento estricto y la sustituyó por base y credencial separadas.
- **Estado corregido:** Security A0.3-H **IMPLEMENTADO / EN REVISIÓN**. La afirmación anterior de cierre/aprobación no cuenta con autorización verificable y queda revocada.

## 2026-08-15 — Security A0.2: correctivo de inicialización diferida y separación de variables Clerk

- Corregido el hallazgo de auditoría: `ClerkAuthGuard` no debe exigir claves al arrancar el proceso. Los providers pasan a devolver funciones tipadas (`ClerkConfigLoader`, `ClerkClientFactory`); la evaluación de secretos y la creación del cliente Clerk ocurren solo en la primera petición que alcanza el guard.
- `CLERK_AUTHORIZED_PARTIES` reemplaza el uso incorrecto de `CORS_ALLOWED_ORIGINS` para derivar los orígenes autorizados de Clerk. La nueva variable acepta únicamente orígenes exactos `http`/`https` con o sin puerto explícito. `CORS_ALLOWED_ORIGINS` conserva su función en `main.ts`.
- Fallo cerrado: si el loader o el factory fallan al invocarse, el guard y el verifier devuelven `401` genérico y registran internamente solo el nombre de clase del error (sin secretos ni tokens).
- Pruebas añadidas: arranque sin variables Clerk, fallo cerrado del verifier con loader inválido, fallo cerrado del guard con dependencia que lanza, reutilización del cliente ya inicializado. El spec del verifier adopta el patrón loader+factory.
- 206 tests, 22 suites, exit 0. No se aplica el guard a endpoints; no cambian login, JWT, register, password, frontend, Prisma, Supabase ni los 19 usuarios.
- Estado: Security A0.2 correctivo **IMPLEMENTADO / EN REVISIÓN**, candidato a auditoría; no autoriza A0.3.

## 2026-08-15 — Security A0.2: base de verificación backend Clerk

- Se instaló el SDK backend oficial de Clerk y se implementó una capa aislada para verificar session tokens, issuer/orígenes autorizados, audiencia configurada y estado autoritativo `active`.
- El `sub` verificado se resuelve solo por `User.clerkUserId`; PostgreSQL vuelve a determinar Membership, organización y rol en cada petición. Usuario no enlazado, Membership ausente, rol cambiado o baja local no se sustituyen con claims del navegador.
- El guard todavía no protege endpoints existentes. Login, register, JWT, password, frontend, Prisma, migraciones, Supabase y los 19 usuarios locales permanecen intactos y no hubo enlace por correo.
- Se añadieron pruebas aisladas de sesiones válidas/inválidas, estado remoto, issuer, User/Membership y cambio o baja de rol local. Los secretos siguen fuera de Git.
- Estado histórico (fotografía): Security A0.2 original implementado; corregido por la entrada anterior de esta misma fecha.

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
