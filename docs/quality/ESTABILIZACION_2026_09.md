# Estabilización secuencial — septiembre 2026

Base auditada: `944fdc86104b105bc44cf883cf4ca60f6d88139e`.

El propietario autoriza ejecutar los puntos en orden estricto. No se inicia el siguiente hasta verificar y estabilizar el actual. No es autorización para implementar Configuración/CMS; el último punto solo prepara su plan.

| Punto | Objetivo | Estado |
| --- | --- | --- |
| 1 | Dependencias vulnerables y exposición de red | VERIFICADO |
| 2 | Reconciliación PostgreSQL y privilegios mínimos | VERIFICADO |
| 3 | Acceso e invitaciones ante fallos | VERIFICADO |
| 4 | Proyecciones mínimas y lecturas consistentes | VERIFICADO |
| 5 | Gates reproducibles, integración y CI | VERIFICADO |
| 6 | Documentación coherente y plan Configuración/CMS | VERIFICADO |

## Punto 1 — alcance y criterio de salida

- Mantener UI, roles, contratos e identidad actuales; corregir dependencias vulnerables sin migrar Nest a otra versión mayor.
- Next y eslint-config-next: `16.2.11 → 16.3.3` (avisos GHSA-p293-qw3h-jr36 y GHSA-2xp9-vwfh-vxw4).
- Override sharp: `0.35.0 → 0.35.4` (GHSA-rgj7-g3m4-5g8c).
- Overrides transitivos dentro de su major: multer `2.3.0` y qs `6.16.0`. Cubren los avisos de DoS/límites identificados por `pnpm audit --prod` el 2026-09-09.
- Web local enlazada a loopback; API usa `HOST=127.0.0.1` por defecto. Un despliegue externo requiere configurar deliberadamente la interfaz de escucha y su perímetro. No se cambian listeners ni datos PostgreSQL en este punto.
- El gate requiere instalación y lockfile reproducibles, audit de producción sin avisos, peers compatibles, TypeScript/lint/tests/build API y web, Prisma validate/generate, E2E con PostgreSQL aislado y QA de navegación/auth/UI aplicable. No se atribuye a este cambio la resolución de los hallazgos de puntos posteriores.

## Evidencia del punto 1 y continuación

Validaciones terminadas correctamente antes de la interrupción del entorno (exit code 0):

- Instalación del lockfile y posterior `pnpm install --frozen-lockfile --ignore-scripts`: reproducible, sin cambios pendientes de resolución.
- `pnpm audit --prod`: sin vulnerabilidades conocidas; `pnpm peers check`: sin incompatibilidades.
- API: TypeScript, lint, build y unitarias: 406 aprobadas, 11 omitidas (44 suites aprobadas y 2 omitidas).
- Web: build, TypeScript, lint y 55 pruebas aprobadas.
- Prisma validate/generate: correctos. E2E en PostgreSQL 18 aislado, con las 19 migraciones desde cero: 11 suites y 121 pruebas aprobadas. No demuestran reconciliación de la instancia habitual.

Los artefactos Next previos tenían declaraciones generadas corruptas; se conservaron fuera del árbol fuente web en un directorio local ignorado, sin eliminarlos. Una compilación nueva pasó sin esos errores. El diagnóstico reproducible completo corresponde al punto 5.

El hostname web se mantiene en `localhost` (loopback) para coincidir con las URLs locales de Clerk; enlazar únicamente a `127.0.0.1` produjo un fallo de proxy interno con ese hostname. La navegación autenticada llegó al dashboard antes de la interrupción, pero no se considera completado el QA desktop/móvil.

Al retomar el 2026-09-09, PostgreSQL no respondía y la API devolvió `P1001`. El servicio Windows estaba detenido y su arranque fue rechazado por permisos. Posteriormente Docker volvió a escuchar en `5432`; el servicio Windows no era la instancia habitual activa. La API arrancó correctamente contra la conexión local autorizada, sin migraciones ni modificaciones de datos.

QA final del punto 1: Next en producción y API real; la sesión OWNER existente navegó desde login a Resumen y Equipo, con datos cargados y recarga autenticada sin reintentos. Modal de invitación abierto y cancelado sin enviar; presentación desktop y a 375 × 812, sin overflow (`body.scrollWidth = innerWidth = 375`), controles visibles y foco inicial en cierre. Consola del recorrido sin errores. No se alteraron invitaciones ni membresías; las autorizaciones de roles se cubrieron en la regresión E2E aislada, no con mutaciones de cuentas reales. Este smoke QA valida compatibilidad del punto 1, no cierra los hallazgos de acceso/concurrencia del punto 3.

El punto 1 queda verificado. Se inicia exclusivamente el punto 2 con inspección de metadatos, respaldo recuperable y restauración aislada previa a cualquier reconciliación. Los puntos 3–6 siguen sin iniciar; no hay commit ni push.

Los hashes SHA-256 del archivo protegido `auth/continue/page.tsx` y de `barberflow_backup.dump` siguen idénticos a los registrados al inicio.

## Punto 2 — diagnóstico y gate de respaldo

- Instancia local confirmada: contenedor `barberflow-postgres`, PostgreSQL 16.14, base `barberflow`. Consultas ejecutadas en transacción `READ ONLY`, limitadas a metadatos.
- Faltan `Invoice_amount_positive_check` e `Invoice_currency_dop_check`, definidos en la migración de Facturación-A. Los nueve checks/exclusiones restantes consultados están validados.
- El rol de conexión actual tiene superusuario, creación de bases/roles, replicación y bypass RLS. La exposición Docker de `5432` sigue en todas las interfaces; ambos hallazgos requieren corrección en este punto.
- La revisión automática rechazó **antes de ejecutarlo** el comando de respaldo completo local porque persiste una instrucción anterior de no copiar/exportar la base principal. No se creó un volcado ni se alteraron datos, privilegios o constraints.
- Para continuar se necesita autorización expresa que permita un respaldo recuperable de esta base y su restauración en una instancia local aislada, únicamente para verificar recuperación/integridad, con archivos ignorados y acceso restringido. No se usarán los datos copiados como fixture de QA funcional ni se mostrarán datos personales o secretos.
- Hasta resolver ese gate no se aplican cambios a la instancia habitual; no se avanza al punto 3.

### Preparación verificable sin copiar datos

Se añadió `apps/api/src/prisma/verify-integrity.cli.ts`, con evaluación y regresiones independientes. Consulta únicamente catálogos PostgreSQL en una transacción `READ ONLY`, con tiempos acotados y errores sin detalles de conexión. Comprueba los 11 checks/exclusiones publicados, cuatro FKs tenant críticas y cinco índices críticos, incluidas sus definiciones y estado validado/utilizable. No comprueba todos los objetos del esquema ni privilegios: complementa, no sustituye, `prisma migrate status`, `prisma migrate diff` y la auditoría de roles.

Comandos reproducibles desde la raíz, una vez compilada la API:

```powershell
pnpm --filter api build
node --env-file=apps/api/.env apps/api/dist/prisma/verify-integrity.cli.js
```

Para la instancia sintética aislada se proporciona `DATABASE_URL` de ese entorno en el proceso, sin usar la configuración habitual. El verificador pasó contra PostgreSQL 18 con las 19 migraciones publicadas. Las siete regresiones cubren checks ausentes/debilitados/no validados, tenant/deletion rules y predicado/disponibilidad de índices. TypeScript, lint, esas siete pruebas y build API terminaron con exit code 0.

La suite completa `pnpm --filter api test --runInBand` pasó posteriormente: 45 suites y 413 pruebas aprobadas; 2 suites/11 pruebas omitidas. No se confunden estas unitarias con la E2E del punto 1.

El intento posterior contra `barberflow` no se cuenta como validación: Docker estaba apagado, el puerto 5432 no respondió y el verificador informó indisponibilidad. El diagnóstico previo de los dos checks ausentes procede de la consulta real de metadatos ya registrada; no se afirma que se haya reparado nada.

### Reparación preparada y probada solo en aislamiento

Tras volver a estar disponible Docker, el CLI consultó la base habitual y salió con código 1 por exactamente los dos checks de Invoice ausentes; no detectó otras diferencias dentro de su alcance limitado. No hizo cambios.

Se preparó `20260909120000_restore_invoice_integrity_checks`: migración nueva, aditiva y transaccional. Restablece solo los checks ausentes, valida históricos y rechaza filas inválidas o definiciones preexistentes inesperadas. No modifica filas, no cambia el modelo Prisma y no reescribe migraciones ni ledger históricos. Permite una aplicación posterior explícita a QA; **no se aplicó a barberflow**.

En PostgreSQL sintético aislado se aplicaron las 20 migraciones y pasaron seis E2E de la reparación: repetibilidad, restauración de checks con factura válida intacta, importes cero/negativo, moneda ajena y check debilitado con nombre válido. Cada prueba de alteración temporal revierte su transacción. El primer intento fue rechazado por falta de contraseña E2E; se estableció una credencial aleatoria exclusivamente en el rol sintético y se repitió sin relajar la guarda.

La autorización ampliada permite trabajar sobre barberflow, exige cambios reutilizables en QA y limpieza final de temporales, y prohíbe acciones destructivas en QA principal sin confirmación. Aun así, la revisión automática volvió a rechazar el volcado completo; exige autorización expresa de **ese respaldo y restauración locales**. No se creó un respaldo nuevo ni se intentó otra vía de exportación. El respaldo preexistente protegido no se elimina. El punto 2 sigue incompleto hasta comprobar recuperación y aplicar/verificar constraints, roles mínimos y exposición local con seguridad.

## Punto 2 — respaldo autorizado y reparación aplicada

El propietario autorizó expresamente el volcado temporal completo de `barberflow`, su restauración aislada local y su eliminación al terminar. Se creó el respaldo en `apps/api/.tmp/reconciliation-20260909`, ignorado y con ACL restringida al usuario local y SYSTEM. Para comprobar compatibilidad se usó un volcado PostgreSQL 16; el primer archivo generado con el cliente 18 se conserva únicamente hasta la limpieza de esta operación.

La restauración terminó con `pg_restore --exit-on-error --single-transaction` en `kortek-recovery-20260909`, contenedor sin red y sin volumen persistente para la base. Los conteos y huellas agregadas de **todas las tablas públicas** coincidieron con la fuente. La migración se probó allí primero y conservó esas mismas huellas. No se mostraron filas ni PII y la copia no se conectó a la aplicación.

Después se confirmó que `20260909120000_restore_invoice_integrity_checks` era la única migración pendiente y se aplicó a `barberflow` mediante `prisma migrate deploy`. Las huellas y conteos de todas las tablas de negocio permanecieron idénticos; el ledger solo añadió la nueva migración. Validación real: CLI de checks/índices OK, `prisma migrate status` actualizado con 20 migraciones y `prisma migrate diff --exit-code` sin diferencias, todos exit code 0.

Esto prueba la recuperación del estado actual respaldado y la conservación de datos durante esta reparación; **no prueba recuperación de datos que pudieran haberse perdido antes de este trabajo**. No se reinterpretan las entradas históricas resueltas manualmente ni se reescribe su ledger.

### Cierre técnico del punto 2 — 2026-09-10

- Credenciales runtime/migrador separadas mediante `ops/provision-database-roles.sql`, probado dos veces en aislamiento y aplicado sin modificar filas. Runtime sin ownership/DDL/superusuario/creación de bases o roles/replicación/bypass RLS; migrador propietario del esquema y objetos de aplicación, sin privilegios globales. El administrador bootstrap `barberflow` fue conservado para recuperación y una auditoría posterior confirmó que mantiene sus atributos globales elevados; aislarlo o retirarlo y reducir los grants DML runtime son gates pendientes antes de producción. Las credenciales distintas viven exclusivamente en archivos locales ignorados y protegidos por ACL.
- `ops/verify-runtime-role.sql` pasó conectado realmente por TCP como runtime. Prisma status/diff pasaron usando exclusivamente el migrador. El CLI de integridad pasó usando runtime.
- Docker publica solo `127.0.0.1:5432` y conserva el volumen `barberflow-os_postgres_data`; no se creó una base vacía alternativa. El proyecto Compose queda explícito y desaparece la contraseña de ejemplo de la configuración versionada.
- Ledger: 20 migraciones activas coinciden con sus archivos; 11 requieren solo normalización CRLF/LF. Cero entradas pendientes fallidas. No se reescribió ningún historial.
- Regresión completa: 12 suites/127 E2E aisladas aprobadas con las 20 migraciones, más las 413 unitarias/11 omitidas, TypeScript/lint/build y Prisma validate ya registrados. Los errores forzados en pruebas no son fallos de ejecución de la suite.
- QA integrado con Next en producción y API usando runtime: sesión OWNER existente, Equipo y Resumen cargados, consola sin errores. No se enviaron ni modificaron invitaciones ni accesos reales.
- Se eliminaron el contenedor aislado `kortek-recovery-20260909` y los dos volcados temporales, junto con su script local auxiliar. La copia transitoria dentro del antiguo contenedor fuente desapareció al recrearlo conservando su volumen; se verificó su ausencia. No quedan copias de recuperación creadas por este punto. El respaldo preexistente del propietario y `auth/continue/page.tsx` conservan sus hashes originales.

El punto 2 queda verificado para el estado actual, sin afirmar recuperación de pérdidas anteriores. Procedimiento reutilizable en [ops/README.md](../../apps/api/ops/README.md). Se inicia únicamente el punto 3; puntos 4–6 no iniciados. La instancia sintética E2E sigue temporalmente disponible para las próximas regresiones y se limpiará al terminar el objetivo.

## Punto 3 — contrato correctivo y criterios

- Usuario: identidad autenticada o invitada; resultado: acceso/aceptación con estado terminal o recuperación explícita, nunca espera indefinida ni efectos de otro contexto.
- Fallos reales de identidad, claims, sesión revocada o Membership ausente conservan rechazo cerrado. Fallos de configuración, red, Clerk o PostgreSQL no prueban sesión inválida: deben responder como indisponibilidad recuperable (`503`), sin PII. Límites reales de invitación conservan `429` y su tiempo de reintento cuando exista.
- Verificación de sesión con presupuesto total acotado; el SDK instalado no expone `AbortSignal` por operación en su cliente BAPI. Se descartarán resoluciones tardías y no se afirmará cancelación física de una petición que el SDK no permita cancelar.
- Aceptación/reenvío/revocación deben comprobar la misma generación de invitación verificada, impedir escrituras tardías y mantener compensación segura e idempotencia. No modificar invitaciones reales para las regresiones.
- Frontend: cancelar/ignorar por identidad, locator, intento y desmontaje; resolver sesión ausente, timeout y errores no JSON; conservar confirmaciones y toast temporal. Pruebas con datos sintéticos, más QA real aislado antes de dar por verificado el punto.
- No cambia Prisma, permisos de negocio, ownership profesional ni otros módulos. Los puntos 4–6 siguen sin iniciar.

### Avance verificado del punto 3 — 2026-09-11

- Verificador Clerk: presupuesto total de 8 segundos, fallos de infraestructura/configuración separados de sesión inválida, y descarte de resultados tardíos. Guards conservan `503`; bootstrap devuelve indisponibilidad si PostgreSQL falla en lugar de anunciar onboarding. Consulta de perfil de onboarding también acotada antes de cualquier alta local.
- Invitaciones: reserva y finalización comparan tenant, estado, identificador externo y `updatedAt` monotónico. La aceptación revalida dentro de la transacción la generación verificada fuera de ella. Un fallo externo incierto queda `FAILED`, sin anunciar que el enlace continúa válido. Una creación externa tardía intenta compensarse revocando exclusivamente ese resultado; el SDK no permite garantizar cancelación física y la compensación sigue siendo best-effort.
- Cliente HTTP: plazo total de 30 segundos para resolver sesión, solicitar y leer; aborta cuando cambia el resolver de contexto o el caller cancela. Mantiene HTTP/Retry-After/paginación ante errores no JSON y no expone el HTML de una pasarela. La limpieza tardía de un resolver no borra al actual.
- Finalización web de invitación: instancia por identidad y localizador, abandono/cambio cancela efectos, sesión ausente presenta login, carga Clerk acotada y guardado de nombre con plazo. Se conserva la limpieza de React Query y las confirmaciones/toasts de Equipo.
- Validaciones `exit 0`: API TypeScript, lint, build y **430 unitarias / 11 omitidas**; **132 E2E / 12 suites** sobre PostgreSQL sintético `55443`, con 20 migraciones. Web TypeScript, lint, build y **66 pruebas**. Primeros fallos de tipos/lint de las nuevas pruebas fueron corregidos y se repitieron las validaciones; no se contabilizan como pases.
- El clúster sintético se reinició con puerto predeterminado inicialmente; la comprobación de disponibilidad rechazó ejecutar E2E. Se detuvo por su directorio exacto y arrancó explícitamente con `-p 55443 -h 127.0.0.1`; no se consultó ni modificó la base habitual en ese intento.
- QA real completado sobre un fixture nuevo y aislado, sin copiar datos: una identidad OWNER en organización A y BARBER en B, más una identidad invitada. Verificó login directo al primer intento; OWNER A → BARBER B → OWNER A sin datos ni acciones cruzadas; crear, reenviar, cancelar/confirmar revocación, aceptar, cambiar rol y revocar acceso; invitado revocado en estado terminal; caída del API con error recuperable y reintento efectivo; escritorio y 375 × 812 sin overflow; consola sin errores de aplicación. Las respuestas observadas de aceptación, bootstrap, cambio de rol y revocaciones fueron exitosas y conservaron CORS al origen local permitido, sin registrar cuerpos, sesiones ni PII.
- La repetición de aceptación ya persistida se resuelve desde la relación local exacta del usuario aceptante, sin depender nuevamente del estado externo ni del perfil Clerk; una identidad distinta sigue sin poder adquirir esa Membership. Esta regresión cierra el caso en que la aceptación se confirmó y el bootstrap posterior estuvo temporalmente indisponible.
- Cierre técnico con `exit 0`: API TypeScript, lint, build, **430 unitarias / 11 omitidas** y **132 E2E / 12 suites** sobre PostgreSQL aislado con 20 migraciones; Web TypeScript, lint, build y **66 pruebas**. `git diff --check` limpio salvo avisos informativos de conversión LF/CRLF.
- Se eliminaron exactamente las dos identidades Clerk Development sintéticas, la base `stabilization_step3_qa_test`, su rol no privilegiado y el directorio/script temporal. El registro histórico externo de una invitación aceptada puede permanecer en Clerk Development sin usuario ni acceso activo; el proveedor no ofrece borrado de ese registro terminal. No se tocaron identidades, invitaciones ni datos habituales.
- El punto 3 queda **VERIFICADO**. Sin staging, commit ni push. `auth/continue/page.tsx` y el respaldo preexistente conservan los hashes de inicio. Se inicia exclusivamente el punto 4; puntos 5–6 continúan sin iniciar.

## Punto 4 — proyecciones y consistencia de lectura

### Lectura acotada del Resumen — contrato del correctivo

El plan autorizado incluye eliminar la descarga del historial, los conteos sobre solo 20 profesionales y la fecha dependiente del navegador. Se conserva el Resumen como agregador, sin nuevas métricas ni implementación del módulo Analytics.

- `GET /analytics/summary` recibe exclusivamente `agendaPage` y `workloadPage` opcionales, enteros de 1 a 1000000 (por defecto 1). Cada lista tiene 20 elementos como máximo, orden estable y metadatos `page`, `limit`, `total`, `totalPages` en el cuerpo. El filtro de día se aplica antes de paginar.
- El servidor fija `generatedAt` y obtiene `timeZone` de Organization. Agenda, completadas y carga usan `[inicio del día local, inicio del siguiente día)`. La UI solo formatea ese instante en esa zona.
- OWNER/ADMIN/RECEPTIONIST leen agenda del tenant y carga de profesionales ACTIVE. BARBER lee únicamente la agenda del Professional vinculado a su User en el tenant; sin vínculo recibe una agenda vacía, nunca el conjunto global. No recibe carga ni métricas financieras. CUSTOMER queda excluido.
- Proyección de agenda: ID operativo, inicio, fin, estado y nombres de cliente/servicio/profesional. Carga: ID operativo, nombre y cantidad de reservas de hoy. No incluye teléfonos, correo, notas, tenant ni vínculo de identidad. Totales y profesionales sin citas se cuentan sobre el conjunto completo, no sobre una página.
- Todas las lecturas de cada respuesta comparten snapshot `REPEATABLE READ`, espera de 2 s y ejecución de 8 s. Fallos de infraestructura tienen error seguro recuperable; nunca se sustituyen por ceros.
- La web consulta esta lectura y las métricas ya existentes de forma independiente: un fallo financiero no borra agenda/carga válidas y viceversa. Cada sección termina su carga, presenta error/reintento y descarta resultados del contexto anterior; cancelación al desmontar/cambiar usuario, tenant o rol.
- Paginación visible y accesible en desktop/móvil, fecha y horas del negocio sin jerga de zona. No cambia Reservas, facturación ni persistencia. Gate: unitarias, E2E aisladas de paginación/ownership/fechas/proyección y QA real de roles, contexto, fallo/reintento y móvil antes de pasar al punto 5.

- Hallazgo reproducido: `GET /bookings` limitaba Client, pero usaba relaciones Prisma completas para Professional y Service; con ello exponía tenant, vínculo de identidad, teléfono y metadatos que Agenda/Resumen no consumen. Las mutaciones de Booking también devolvían la fila raíz completa con tenant y timestamps.
- Corrección: listado explícito `{ id, clientId, professionalId, serviceId, startTime, endTime, status, client: { id, name, email, phone }, professional: { id, name }, service: { id, name, duration } }`. Crear, reprogramar y cambiar estado devuelven solo los siete campos raíz anteriores. No cambia endpoint, DTO, rol, filtro ni persistencia.
- Hallazgo reproducido: Analytics calculaba correctamente los límites con `Organization.timeZone`, pero organización, siete agregados y Professional destacado se leían fuera de una instantánea común y sin presupuesto transaccional. El lookup final tampoco repetía `organizationId`.
- Corrección: `GET /analytics/dashboard` conserva exactamente su respuesta y reglas, pero ejecuta todas las lecturas en una transacción `REPEATABLE READ`, con espera máxima de 2 segundos y ejecución máxima de 8 segundos. La zona y `now` quedan fijados para toda la respuesta, y Professional se resuelve por `id + organizationId` dentro del mismo snapshot.
- Regresiones iniciales: 48 unitarias dirigidas y 37 E2E dirigidas aprobadas sobre PostgreSQL aislado con las 20 migraciones. La E2E comprueba las claves exactas de Booking y sus relaciones. Falta el gate completo antes de marcar este punto verificado.

### Cierre técnico del punto 4 — 2026-09-11

- `GET /analytics/summary` sustituyó las dos lecturas sin límite del Resumen. Agenda y carga filtran el día del negocio antes de paginar, devuelven 20 elementos con orden estable y acompañan totales completos. BARBER se limita a su Professional vinculado; sin vínculo obtiene agenda vacía y nunca amplía alcance. Las proyecciones no incluyen tenant, teléfono, correo, notas ni vínculo de identidad.
- La fecha, saludo y horas visibles derivan de `generatedAt + Organization.timeZone`. Las pruebas cubren un día de 23 horas por cambio estacional. La carga cuenta todo Professional ACTIVE y el total sin citas no se infiere de una página.
- La web obtiene operación y métricas en paralelo con resultados independientes. Cada fallo termina con texto seguro y reintento; datos válidos de la otra fuente continúan visibles. Desmontaje y `AbortSignal` conservan el aislamiento por usuario/tenant/rol, incluida la ida y vuelta A → B → A.
- Validaciones con exit 0: API TypeScript, lint y build; 437 unitarias aprobadas/11 omitidas; 138 E2E sobre PostgreSQL sintético con 20 migraciones. Web TypeScript, lint, build y 71 pruebas. `git diff --check` sin errores.
- QA real de solo lectura sobre la base habitual autorizada: OWNER cargó métricas, agenda y carga; BARBER no recibió finanzas ni carga global; OWNER → BARBER → OWNER desmontó el contenido anterior; caída de API terminó con error y reintento recuperó la agenda; 375 × 812 sin overflow y consola sin errores de aplicación. No se modificaron datos.

El punto 4 queda **VERIFICADO**. Se inicia exclusivamente el diagnóstico reproducible del punto 5; el punto 6 continúa sin iniciar.

## Punto 5 — gates reproducibles, componentes, navegador y CI

- Diagnóstico de `.next`: el archivo archivado `dev/types/routes.d.ts` terminaba con el fragmento `utes> = ParamMap[Route]` y `dev/types/validator.ts` empezaba una entrada con `pt-invitation/...`; ambos fueron escritos parcialmente y explican los errores sintácticos de TypeScript. Las fuentes y los tipos de producción eran válidos. No hay evidencia suficiente para atribuir la interrupción a un proceso concreto.
- `type-check:clean` elimina solo `.next/types` y `.next/dev/types`, ejecuta `next typegen` y después `tsc --noEmit`. El gate pasó y el archivo generado corrupto dejó de ser una dependencia accidental. El archivo temporal archivado, ignorado y sin fuentes, se eliminó después de registrar la evidencia.
- La paginación del Resumen se extrajo a un componente y tres pruebas jsdom comprueban ausencia en página única, navegación accesible, límites y callbacks. Las 71 pruebas de lógica web continúan pasando.
- Playwright ejecuta la landing real con Chrome en desktop y 375 × 812: encabezado/CTA, ausencia de overflow y menú móvil por teclado. Resultado local: 3 aprobadas y 1 omisión intencional del caso exclusivamente móvil en el proyecto desktop.
- Hallazgo adicional del smoke: el matcher global de Clerk hacía pasar `/` por el middleware y podía dejarlo esperando con una configuración no disponible. Se limitó a dashboard y rutas de autenticación; las rutas protegidas conservan verificación, mientras `/` y `/[slug]` públicos ya no atraviesan el middleware. El `ClerkProvider` raíz todavía requiere configuración. Build y smoke con placeholders CI sin capacidad probaron el recorrido público.
- `.github/workflows/quality.yml` crea base `_test` y propietario sin privilegios ni acceso a la base principal, aplica migraciones, verifica status/diff e integridad suplementaria y ejecuta instalación/auditoría, tipos, lint, unitarias/componentes, builds, E2E y navegador. No despliega y no sustituye QA autenticado.
- Evidencia local con exit 0: instalación congelada con peers estrictos; auditoría de producción sin vulnerabilidades; web clean type-check/lint/build, 71 unitarias, 3 de componente y smoke Chrome; API 437 unitarias/11 omitidas y 138 E2E aisladas ya verificadas en el punto 4, sin cambios API posteriores. `git diff --check` limpio.

El punto 5 queda **VERIFICADO**. Se inicia exclusivamente la reconciliación documental y planificación sin código del punto 6.

## Punto 6 — documentación y siguiente plan

- Se corrigieron fuentes vigentes que aún hablaban de 19 migraciones, puertos invertidos, ausencia de CI o módulos ya aprobados como “en revisión”. Las entradas cronológicas permanecen históricas y `PROJECT_MASTER.md` deja explícito que la reparación autoritativa actual es la migración aditiva del punto 2, sin afirmar recuperación de pérdidas previas.
- README raíz/API/web, PRD, TRD, flujos, ADR de autenticación, gates, mapa documental y documentos de control quedan alineados con 20 migraciones, roles separados, middleware público acotado, Resumen paginado y gates automatizados.
- [`CONFIGURACION_CMS_PLAN.md`](../features/CONFIGURACION_CMS_PLAN.md) prepara C0–C3 y separa medios, promociones, banca, notificaciones y Pagos en entregas posteriores. No define endpoints, campos ni migración y permanece **PENDIENTE DE APROBACIÓN**.
- No se implementó Configuración/CMS ni se reabrió un módulo aprobado. La verificación documental incluye enlaces/estados, formato, `git diff --check`, diff completo y hashes protegidos.

El punto 6 queda **VERIFICADO**. Los seis puntos terminaron en orden. El siguiente paso posible es aprobar o ajustar C0 de Configuración/CMS; no se inicia por inferencia.

## Límites aplicables a todos los puntos

- No alterar invitaciones ni datos existentes para las regresiones.
- No usar `db push --accept-data-loss`, reset, force-push ni descartar cambios ajenos.
- `auth/continue/page.tsx` y el respaldo existente no forman parte de los cambios del punto 1.
- Solo registrar evidencia segura; no incluir credenciales, tickets, sesiones ni PII.
- El cierre funcional de un punto exige resultados reales; instalar paquetes no basta.
