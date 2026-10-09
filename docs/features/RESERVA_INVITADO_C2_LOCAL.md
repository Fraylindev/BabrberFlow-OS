# Reserva invitada — C2 local

Estado: C2 IMPLEMENTADO / VALIDADO LOCALMENTE / EN REVISIÓN. Autorizado únicamente en local por el archivo de objetivo recibido el 2026-10-07. C1 validado localmente; no commit/push/PR/despliegue. C3 NO EJECUTADO. No se infiere aprobación del propietario.

Usuario: visitante anónimo o personal interno que reserva públicamente. Resultado: seleccionar servicio/profesional/fecha/hora, aportar nombre/teléfono y correo opcional, revisar y registrar Booking PENDING con Client operativo. Ningún login/alta/claim/perfil/historial/contraseña/código de cliente final; estados de carga, retiro, validación, conflicto, espera 429 y resultado incierto existentes conservados. Confirmación, calendario, WhatsApp del negocio y consentimiento de correo separados permanecen.

Alcance: retirar archivos/rutas/hooks/estilos B2C exclusivos; conservar AuthProvider/ClerkProvider, clientes HTTP compartidos, panel, roles internos, privacidad, claves por visita y reinicio de borrador al cambiar sesión/tenant/rol. Teclado/foco, campos >=16px, móvil y desktop sin overflow deben verificarse localmente. Sin cambios en Prisma, migraciones, datos reales, QA, variables/proveedores ni P4b.

Consumidores deprecated antes de retirada: PublicBookingResult y fixtures/tests/helpers web; assertions del API, DTO/retorno y shape E2E. No se encontraron SDK/apps externas conocidas en el repositorio. Los artefactos anteriores y frontend previamente desplegado son históricos respecto al árbol local y no se modifican; el código web anterior lee result.booking, no lee accountCreated/Error para actuar. Los campos desaparecen coordinadamente del API/web local después de migrar todos los consumidores ejecutables conocidos. No se autoriza desplegar un frontend antiguo contra el contrato reducido; comprobar versiones y consumidores externos en el gate de publicación separado, sin consultar proveedores ahora.

Pruebas con menciones negativas de accountCreated/Error comprobarán su ausencia; no son consumidores. Referencias históricas y archivos .txt se conservan. [Autorización íntegra](../quality/evidence/reserva-invitado-c2/authorization.md) y [archivos exclusivos archivados](../quality/evidence/reserva-invitado-c2/retirados.json).

## Resultado y contrato

El visitante reserva sin registro/login/claim ni contraseña/código. La pantalla conserva cinco pasos: servicio, profesional, fecha/hora, datos y revisión. Un único profesional sigue saltando su selección vacía. Nombre/teléfono obligatorios, correo opcional y consentimiento de avisos independiente. Client tenant-scoped y Booking PENDING siguen siendo operativos; User/Membership no se crean. Los cambios de usuario, sesión, tenant o rol desmontan el borrador; las respuestas tardías se ignoran.

POST `/public/:slug/bookings` devuelve 201 y sólo `{booking:{id,serviceId,professionalId,startTime,endTime,status}}`. Ya no existen los campos deprecated de salida; `createAccount` y `password` siguen rechazándose con 400 whitelist, incluso `createAccount:false`. Disponibilidad, contacto neutro, transacción, rate-limit, calendario, WhatsApp del negocio y notificaciones existentes permanecen. No se ejecutó envío real de correo.

## Retirada demostrada

24 archivos exclusivos frontend archivados como texto no ejecutable, con originales y SHA en `retirados.json`: CustomerProvider/Auth/Claim/Shell/EntryLinks/Profile/Bookings/BookingDetail/RepeatBooking y estilos/pruebas; hooks/query keys; helpers de ruta/UI; AccountStep y StepRouter sin consumidores; layout del slug que sólo montaba CustomerProvider y CSS; helper histórico F0-A sin callers activos. Se conservan los providers compartidos de raíz y autenticación interna.

Páginas retiradas: `/:slug/cuenta/:action`, `/:slug/mi-perfil`, `/:slug/mis-reservas`, `/:slug/mis-reservas/:id`, `/:slug/mis-reservas/:id/repetir`. Retirados únicamente sus matchers de proxy y headers exclusivos. [Mapa generado por el build real](../quality/evidence/reserva-invitado-c2/web-routes.json) sin esas rutas. Conservadas `/:slug`, `/:slug/reservar`, panel `/dashboard/*`, login/register/continuación/invitaciones internos. Las rutas API retiradas en C1 conservan 404: GET `/customer/businesses`; GET/POST `/customer/:slug/bookings`; GET `/customer/:slug/bookings/:id`; GET/PATCH `/customer/:slug/profile`; POST `/auth/clerk/customer/claims`. POST público, lecturas públicas y rutas internas se conservan.

[Búsqueda final](../quality/evidence/reserva-invitado-c2/consumer-search.txt): sólo pruebas negativas y el helper local que verifica ausencia de enlaces/payload; cero import/consumer activo de CustomerProvider/Auth/Claim, cuenta o endpoints retirados. Tipos PublicBookingResult, fixtures web, helpers F0-E, DTO/retorno/assertions API y shape E2E migrados. No se detectaron integraciones externas conocidas en el repositorio; esta búsqueda no demuestra ausencia de consumidores externos desconocidos. C3/publicación debe verificar versiones y coordinar API/web, sin desplegar frontend antiguo contra el contrato reducido.

## Pruebas ejecutadas y resultados reales

Todos los resultados finales siguientes terminaron con exit 0:

| Comando | Resultado |
| --- | --- |
| `pnpm --filter api exec node test/guest-retirement-run.cjs tsc --noEmit` | API TypeScript aprobado |
| `pnpm --filter api exec node test/guest-retirement-run.cjs eslint "{src,apps,libs,test}/**/*.ts"` | API lint aprobado, sin autofix |
| `$env:GUEST_RUN_FULL_API='1'; node apps/api/test/guest-postgres-run.cjs` | 37 integraciones anteriores (Clerk 2, horarios 26, concurrencia 9) + HTTP 4; suite completa API 871, 0 fallidas/omitidas |
| `pnpm --filter api exec node test/guest-retirement-run.cjs build build` | API build aprobado |
| `pnpm --filter web type-check:clean` con DEPLOY_ENV=development y NEXT_PUBLIC_API_URL loopback sólo en el proceso | Tipos Next regenerados; TypeScript aprobado |
| `pnpm --filter web exec tsc --noEmit` | TypeScript final aprobado |
| `pnpm --filter web lint` | Web lint aprobado |
| `pnpm --filter web test` | 158 Node + 130 Vitest = 288; 0 omitidas |
| `pnpm --filter web build --webpack` con las mismas variables temporales | Build aprobado; mapa de rutas real sin B2C |
| `node apps/web/scripts/guest-c2-browser.mjs` | Chrome 9/9: invitado 320/375/390/768/1280 y roles OWNER/ADMIN/RECEPTIONIST/BARBER a 1280; 0 fallos |
| `git diff --check` | Aprobado; índice vacío, sin commit |

PG18.1 nuevo y desechable: migraciones existentes 28 verificadas contra ledger/checksums; provision/gate runtime aprobados. HTTP usa Prisma real como `kortek_runtime`: claim 404 con/sin bearer sin User/Membership/Client/AuditLog; invitado 201/PENDING con/sin bearer interno, sólo nueva ficha Client con userId null, ningún User/Membership añadido ni verificador Clerk llamado. [Run y suite completa](../quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/run.json). Clúster propio detenido y eliminado; ninguna conexión a base existente/QA. Estas 41 pruebas están incluidas en las 871 de la repetición completa, no se suman otra vez.

Chrome valida mini-sitio y cinco pasos reales, no cuenta ni password/código, POST único sin atributos de identidad, foco en títulos y primer error, Enter/Escape/prefijo, campos >=16px, sin overflow en cinco estados y consola limpia. Confirmación PENDING, calendario, WhatsApp y salida conservados. [Resultados/requests/mediciones](../quality/evidence/reserva-invitado-c2/browser/results.json), [móvil datos](../quality/evidence/reserva-invitado-c2/browser/contact-320.png), [desktop confirmación](../quality/evidence/reserva-invitado-c2/browser/success-1280.png), inspeccionadas visualmente. Transporte/Clerk son controlados sólo dentro del helper de prueba, fuentes tipográficas fallback; no son evidencia de sesión real, proveedor, Next publicado, Safari o dispositivo físico. La preservación del panel se sustenta en no modificar sus fuentes y en sus regresiones API/web; no se afirma login real de cada rol.

## Fallos iniciales corregidos y límites

- TypeScript web encontró tipos `.next` obsoletos de rutas retiradas. Se verificaron destinos absolutos bajo `apps/web/.next` antes de usar el script oficial de limpieza; regenerados sin tocar fuentes.
- Dos HTTP nuevos dieron 404 por usar organizationId como slug en la fixture; corregida a organization.slug, nueva repetición completa aprobada. [Fallo original PG](../quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/run.json), conservado con cleanup.
- Primer lint API se invocó como `lint` en un helper que acepta `eslint`: exit 1 antes de lint; corregido el comando, exit 0.
- La prueba añadida de sesión tenía referencia circular en su inicializador, detectada por TypeScript/build y Vitest; fixture corregida y test/build final aprobados.
- Primer navegador 0/9 por esperar URL WhatsApp sin su mensaje existente. [Fallo inicial](../quality/evidence/reserva-invitado-c2/browser/initial-failure.json), sin errores de consola; corregida la expectativa al contrato existente, producto intacto, repetición 9/9.

No se ejecutaron C3, QA/prod remotos, pruebas físicas/Safari, proveedores reales, correos reales, suites E2E genéricas de `test/*.e2e-spec.ts` ni Playwright publicado. No eran parte del ensayo local de este checkpoint; las pruebas HTTP nuevas usan AppModule/guards/Prisma reales y cubren el contrato cambiado. No se afirma cerrar esas validaciones posteriores ni disponibilidad global de consumidores externos. Sin nuevas dependencias/instalaciones; sin migración propuesta ni ejecutada en base existente; esquemas/SQL/tablas/índices/triggers/compatibilidad histórica intactos. Sin cambios de P4b/auditorías previas.

## Inventario, diff, riesgo y rollback

[Inventario final y resultados](../quality/evidence/reserva-invitado-c2/validation.json), [diff acumulado C0/C1/C2](../quality/evidence/reserva-invitado-c2/full.patch). La lista separa archivos M/D/A y evidencia; el patch incluye fuentes/documentación/archivos históricos archivados, con evidencia enlazada aparte para evitar recursión del propio diff. HEAD base `c4625ef23a3766c5be5172dde0aea4b1cb57d7ac`, rama `ai/antigravity-qa`; índice vacío. Las modificaciones C0/C1 anteriores se preservan dentro del acumulado.

Riesgo principal: cliente externo desconocido o despliegue descoordinado usando entrada/contrato B2C antiguos. Antes de publicar comprobar inventario externo/versiones y desplegar API/web coordinadamente bajo autorización separada. No activar portal, cuentas o escritura secundaria como rollback funcional.

Rollback seguro del C2 local: revisar/revertir únicamente sus hunks y archivos exclusivos usando los originales archivados o el diff, conservando C0/C1 y cambios ajenos. Si se precisa compatibilidad de salida, restaurar sólo los dos campos neutrales deprecated mientras se migra el consumidor concreto; no restaurar alta/claim/portal sin decisión explícita. Ningún rollback de schema, SQL, datos o migración necesario. No ejecutar un reset/clean ni aplicar el diff acumulado inverso indiscriminadamente. C3 queda detenido a la espera de autorización separada; commit/publicación también requieren autorización separada.
