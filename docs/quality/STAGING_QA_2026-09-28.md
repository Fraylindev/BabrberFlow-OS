# Cutover QA y API de staging — 2026-09-28

**C2 CERRADO / APROBADO EN PREVIEW QA** por confirmación explícita del propietario el 2026-09-29, limitado a Cutover QA y datos sintéticos. La aprobación inicial del editor fue el 2026-09-28; el cierre incorpora D9, A2, CMS y Facturación. No autoriza migrar ni confirmar horario en producción.
El propietario confirmó cada escritura real de esta preparación. El alcance
es Supabase Cutover QA `prirlabbnlcuvnzuaczp`, dos fixtures sintéticos y una
segunda API en la VM OCI existente. El 2026-09-28 se añadieron cuatro identidades
Clerk Development y sus accesos sintéticos para QA autenticado. El código
desplegado del API es el commit
publicado `b0357af6b237466f7e5e17c2eff0901e2336ded1` (C1). El frontend C2
se publicó después en Preview mediante el checkpoint `1dafcbe`, con
autorización expresa de push. El checkpoint por sí solo no supone aprobación
final; la aprobación funcional C2 indicada arriba fue una decisión expresa
posterior del propietario.

## Base aislada y fixtures

- Se vació transaccionalmente Cutover QA de los datos antiguos de `barberflow`
  antes de migrar. El proyecto productivo `ilaoolpcrlmqkftirjog` y sus filas
  de negocio no se copiaron a QA.
- Se aplicaron las migraciones faltantes, incluida
  `20260927170000_business_schedule`, mediante el SQL versionado y registro
  fiel en `_prisma_migrations`. Quedaron 27 migraciones aplicadas; la
  migración de horario tiene checksum
  `82890d487a40d0c25edfd77019df6454f101f6222aa5235b3ea6f8a958272d82`.
  El CLI Prisma local no arrancó por falta de `@prisma/debug`; se verificaron
  después el esquema, historial, permisos y la ausencia de filas de negocio
  previas a los fixtures.
- Se crearon únicamente `QA Horario Norte` y `QA Horario Sur`, slugs
  `qa-horario-norte` y `qa-horario-sur`, correos `.invalid`, activos en
  `America/Santo_Domingo`, con `businessHours` SQL NULL y horario
  `LEGACY_UNCONFIRMED`/`SQL_NULL`, revisión 0. Al crear los fixtures había cero
  User, Membership, reservas, turnos, cierres o dependencias. El trigger
  existente creó dos borradores CMS sin publicar. No se copiaron filas ni identificadores de
  Dental Ross o Prueba de oro.
- Después, con confirmación específica, se crearon cuatro cuentas nuevas en
  Clerk Development con correos reservados `+clerk_test@example.com`, sin
  contraseña y con email verificado. Se enlazaron por `clerkUserId` a cuatro
  `User` con password SQL NULL en Cutover QA, más cinco `Membership`: OWNER en
  Norte y Sur; ADMIN, BARBER y RECEPTIONIST solo en Norte. La transacción se
  ejecutó con `kortek_runtime.prirlabbnlcuvnzuaczp` desde el contenedor de
  staging, tras comprobar el destino; la conexión SQL del conector carecía de
  INSERT y su intento atómico dejó cero filas. La lectura posterior confirmó
  4 User, 5 Membership, 0 Professional, 0 Booking y ambos businessHours NULL.

## API en OCI

- La VM separada Always Free de 1 GB falló durante la instalación de Podman y
  se eliminó, junto con su volumen de arranque e IP, por autorización expresa.
  Staging corre de forma aislada en `kortek-free-services`, junto a producción.
- Imagen Podman inmutable `c9501c7ae3845f95081af884552b44cb5d1a5d8d52d5061ba24a87615c3e6cb9`
  construida en la VM desde el commit C1. Servicio
  `kortek-api-staging` enabled/active, sin reinicios observados, en
  `127.0.0.1:3001`, 0,5 CPU, 1 GiB y 96 procesos; FS de solo lectura y sin
  capacidades. Producción sigue en `127.0.0.1:3000`.
- Configuración root:root/0600 en `/etc/kortek-api-staging/runtime-env` vía
  `LoadCredential`; pooler de Cutover QA con `kortek_runtime`, CA pública,
  TLS estricto y límite de dos conexiones. Clerk `sk_test_`/`pk_test_`, cuenta
  Cloudinary QA de `apps/api/.env`, JWT/rate propios. Ocho valores sensibles
  comparados con producción: cero coincidencias. Correo desactivado y reserva
  pública cerrada.
- La VM productiva tenía por error las tres credenciales Cloudinary QA. Con
  autorización específica se sustituyeron solo por las de `apps/api/.env.prod`,
  se reinició solo `kortek-api` y pasó el smoke externo. No se muestran ni
  versionan valores. La cuenta QA respondió al ping autenticado; la productiva
  también. No se alteraron DB, Caddy ni worker en esa corrección.
- Cloudflare tiene A `api.staging.booking.kortek.cloud` → `150.136.7.19`, DNS
  only/TTL Auto. Caddy añadió solo ese host hacia `127.0.0.1:3001`; conservó
  el bloque productivo. La configuración propuesta y la instalada pasaron
  `caddy validate`. El primer intento se revirtió por un error final de
  diagnóstico en PowerShell; checksum original y servicios se comprobaron
  antes de repetir con exit 0.

## Validación observada

| Control | Resultado |
| --- | --- |
| Login de DB desde la imagen | `kortek_runtime` conectado a Cutover QA sobre TLS estricto; dos organizaciones sintéticas |
| HTTPS staging externo | Certificado público y hostname válidos, TLS 1.3, DNS real, HTTP 308, raíz 404 JSON esperada, privada 401 |
| CORS staging | Solo `https://qa.booking.kortek.cloud` recibe ACAO; los orígenes web anterior y productivo no |
| Red externa | 3001 y admin Caddy 2019 inaccesibles; servicio escucha en loopback |
| Producción | `external-smoke.py` exit 0 antes y después del cambio Caddy y tras ajustar el origen QA; DNS/TLS/CORS/HTTP sin regresión |
| Frontend local | Validación de despliegue: 17/17 pruebas, TypeScript/lint/build web exit 0 con variables staging explícitas |
| Identidades QA | Cuatro usuarios Clerk Development nuevos, email verificado y `password_enabled=false`; cuatro User y cinco Membership verificados en Cutover QA |

Los 404/401 acreditan transporte y protección de ruta, no un recorrido
autenticado de negocio. Ese recorrido se completó después con la sesión de
OWNER del navegador integrado; los resultados y alcance aprobado se registran
en la sección «QA autenticado C2» más abajo.

## Vercel Preview y deployment probada

El proyecto Vercel `kortek-booking` ya tenía `qa.booking.kortek.cloud` asignado
a la rama `ai/antigravity-qa`, con DNS/TLS válido y GET 200. No se creó un
segundo alias web. Preview tiene `DEPLOY_ENV=staging`,
`NEXT_PUBLIC_API_URL=https://api.staging.booking.kortek.cloud`, y la clave
pública Clerk QA (`pk_test_`) coincide por SHA-256 con la local. La variable
`WEB_PUBLIC_ORIGIN` se corrigió en Preview a
`https://qa.booking.kortek.cloud`; existe `CLERK_SECRET_KEY` tipo Secret, cuyo
valor Vercel no revela. No se modificaron variables de Production.

No se redeplegó el commit remoto anterior: su validación web exigía
`staging.booking.kortek.cloud`, mientras el ajuste aprobado exige el alias QA.
El propietario autorizó el push del checkpoint `1dafcbe293db52acd2f8bf04334ba5e2bd63a348`;
Git confirmó SHA local = remoto. Vercel creó [la deployment Preview](https://vercel.com/fraylindev/kortek-booking/F5q6az3TSmBs6YsMe35zGRzXB9ep)
desde esa rama y ese commit: estado **Ready**, compilación de 31 s y dominios
`qa.booking.kortek.cloud` y el alias propio de Vercel. La landing cargó en
Chrome. Una petición HTTP sin sesión al dominio QA redirige al login de
protección Vercel; no equivale a un error de build. El API staging y el API
productivo siguieron respondiendo por HTTPS con certificado válido y 404
esperado en la raíz después del push.

La prueba inicial sin sesión redirigió al login de protección Vercel; no se
contó como error de autenticación. Más adelante el propietario inició sesión
como OWNER y realizó QA autenticado en la deployment Preview.

## QA autenticado C2 — 2026-09-28

Entorno: Preview `qa.booking.kortek.cloud` → API
`api.staging.booking.kortek.cloud` → Supabase Cutover QA
`prirlabbnlcuvnzuaczp`. Actor: OWNER de QA Horario Norte. Los registros creados
son sintéticos y permanecen en QA. El propietario confirmó consola limpia en
OWNER durante edición de semana, creación de cierre y reprogramación de cita.

| Flujo | Evidencia observada |
| --- | --- |
| Contexto y aislamiento | La organización Norte muestra su horario confirmado en `America/Santo_Domingo`. Al cambiar a QA Horario Sur se muestran sus datos sin confirmación (`LEGACY_UNCONFIRMED`/SQL NULL); no se guardó ningún cambio en Sur. Se regresó a Norte para las pruebas. |
| Semana | Se cambió temporalmente el inicio del domingo de 09:00 a 09:30; la vista previa evaluó 1 cita y reportó 0 afectadas. Se guardó y después se restauró a 09:00 con la misma evaluación. El horario final de Norte quedó 09:00–19:00 para el domingo. |
| Servicio, profesional y cliente | Se crearon `C2 QA - Servicio de prueba` (30 min, RD$500), `C2 QA - Profesional de prueba` (activo, sin contacto) y `C2 QA - Cliente de prueba` (solo nombre). |
| Reserva y reprogramación | Se creó una reserva interna sintética para el 3 de noviembre de 2026, 09:30–10:00, sin opt-in de correo; se reprogramó a 10:30–11:00. Se verificó la hora guardada después de cerrar y volver a consultar. Sin pago ni factura. |
| Cierre completo e historial | Se creó un cierre para el 1 de noviembre de 2026 con motivo privado `QA C2: cierre completo de prueba` y luego se canceló. No tenía citas asociadas; el registro cancelado quedó en el historial. |
| Cierre parcial e impacto | Para el 3 de noviembre se previsualizó primero 10:00–12:00: 1 cita afectada y guardar deshabilitado; no se guardó. La propuesta 12:00–14:00 reportó 1 cita evaluada y 0 afectadas; se guardó con motivo privado `QA C2: cierre parcial de prueba`. La reserva de 10:30 quedó intacta. |

Estado al 2026-09-28 de los datos sintéticos en QA Norte: 1 servicio, 1 profesional
activo sin contacto, 1 cliente, 1 reserva pendiente de 10:30 a 11:00, 1 cierre
parcial activo de 12:00 a 14:00 el 3 de noviembre y 1 cierre completo
cancelado con historial. La semana quedó restaurada. No se probó pago,
facturación, envío de correo ni reserva pública. Sur conserva su estado sin
confirmar; no se modificó.

El propietario confirmó consola limpia en OWNER durante las tres operaciones
indicadas y aprobó explícitamente C2 **a nivel funcional, sobre las condiciones
ya probadas (Cutover QA, datos sintéticos)**. El gate funcional de este
checkpoint queda **CERRADO / APROBADO** con ese alcance. La confirmación no
incluye datos o tenants productivos.

## Cierre de Horario y zona C2 en Preview — 2026-09-29

El propietario aceptó el cierre funcional del ítem 4 sobre Cutover QA y datos
sintéticos. Evidencia adicional a la tabla del QA inicial:

| Área | Resultado y alcance comprobado |
| --- | --- |
| D9 con dependencias | QA Horario Norte conserva reserva y cierres persistidos. En Preview OWNER, tras elegir otra región, `zoneChangeAllowed=false` mostró el aviso de dependencias y dejó deshabilitado «Confirmar región». Se añadió una prueba de componente para ese estado. El `409` por promoción sellada está cubierto por la integración C1; esta comprobación de Preview no se presenta como un `409` HTTP nuevo. |
| A2 por profesional | El profesional sintético de Norte recibió horario individual martes 08:00–12:00; el global abre a las 09:00 y la disponibilidad efectiva comprobada fue 09:00–12:00. La prueba no creó reservas públicas. |
| CMS / página pública | Se comprobó el horario confirmado de Norte: domingo, lunes y miércoles a sábado 09:00–19:00; martes 09:00–24:00. En la página pública de QA se comprobó la organización y el estado de reservas no disponibles. No se observó una lista visual de franjas en esa página mientras el profesional era privado; el propietario aceptó la evidencia de horario/proyección sin repetir una captura pública. Sur permaneció sin confirmar, sin exponer datos internos. |
| Facturación | Solo en Cutover QA, la reserva sintética se fechó al 2026-09-27 10:30–11:00 `America/Santo_Domingo` mediante `startTime`/`endTime`, sin cambiar su estado en SQL. OWNER la completó desde la interfaz y emitió la factura de prueba `14343eff-0b40-4e34-b651-f0e1c3f82abc` por RD$500, pendiente de pago. Su emisión `2026-09-29T03:39:26.181Z` corresponde al **día de negocio 2026-09-28** (23:39:26 en Santo Domingo); la fecha de la factura deriva de la emisión, no de la fecha de la cita. No se cambió la regla temporal de facturación. |
| Correo y promociones | El propietario acepta la integración C1 que verifica `409` ante una promoción sellada como dependencia y las pruebas end-to-end previas de Notificaciones y Medios/Promociones. No se activó aquí el worker ni se envió correo o promoción en Preview. |

Estado actual de los datos de Norte: semana restaurada, cierre parcial del 3 de
noviembre activo, cierre completo del 1 de noviembre cancelado con historial,
profesional sintético privado, reserva de prueba `COMPLETED` y factura de prueba
emitida sin pago. El API de staging conserva `PUBLIC_BOOKING_CLOSED=true` y el
correo apagado. QA Horario Sur y producción no recibieron estas operaciones.

Pendientes independientes que no bloquean C2: investigar «Gestionar perfil» en
la tarjeta responsive y conservar cerrados los grants efectivos de DML de
`anon`/`authenticated` en Cutover QA. La lectura de seguridad observó cero
tablas públicas con esos grants efectivos; el frontend no usa cliente Supabase
con clave `anon` para datos de negocio y los consulta mediante la API NestJS.

## Límites y decisiones pendientes

- El ítem 4 está listo para una decisión productiva separada: el propietario
  debe elegir el horario real de Dental Ross y Prueba de oro. **No autoriza
  todavía migración ni confirmación de horario en producción**. Antes de un
  cambio futuro autorizado se reevaluarán las dependencias D9 bajo lock.
- La aprobación C2 no autoriza despliegue web productivo, apertura de reservas
  públicas, activación de correo ni otros cambios de negocio.
- Cutover QA contiene solo los fixtures y registros de prueba descritos aquí;
  no se copiaron datos reales de tenants.
