# Checkpoint de consistencia — retiro B2C C0/C1

Fecha: 2026-10-07. Rama `ai/antigravity-qa`; HEAD `c4625ef23a3766c5be5172dde0aea4b1cb57d7ac`. **C0 aprobado. C1 implementado y validado parcialmente en local, en revisión. C2 pendiente. C3 pendiente. Sin commit, push, despliegue ni cambios QA.** Esta tarea corrige únicamente informe/documentación y genera evidencia de lectura/pruebas; no cambia código, tests, helpers, pipeline, Prisma ni Clerk. P4b y su auditoría intactos.

## 1. Resultado de consistencia

**PASA:** ninguna ruta backend B2C/claim registrada en AppModule/AuthModule actuales; se comprobaron los imports, controllers/providers e inexistencia de sus clases en src productivo. La prueba HTTP existente de AppModule actual pasó **22/22, exit 0**, con 404 para los siete métodos/rutas B2C con/sin bearer, 400 para campos de cuenta y reserva invitada 201/PENDING. Persistencia/proveedor/ThrottlerGuard controlados: no acredita PostgreSQL ni Clerk reales.

**NO PASA:** no es verdad que ninguna prueba activa espere un claim exitoso. `apps/web/components/customer/Customer.test.tsx:92` y `:101` siguen activos en Vitest; ambos usan `api.post` mockResolvedValue `{ claimed:true }`. El primero exige que la reserva aparezca en Mis reservas después del claim; el segundo presupone claim exitoso seguido de cuarentena/404. `vitest.config.ts` incluye componentes/**/*.test.tsx; `pnpm --filter web test` los selecciona y quality.yml ejecuta ese comando. No se ejecutó Vitest en esta auditoría: la actividad/expectativa se demuestra por código y configuración actuales, no por un resultado supuesto.

**C2 es bloqueante para integración:** CustomerClaim, registro/login/recuperación, CustomerProvider, enlaces, perfil, Mis reservas y repetición siguen en la web actual y consumen APIs retiradas. Un mock positivo puede pasar sin que el backend exista. No declarar integrado, candidato publicable ni listo para QA.

Las instrucciones 4/6 (ausencia/retirada de positivos) y 10 (no modificar código) no se pueden satisfacer simultáneamente ante estos hallazgos. Se respeta la prohibición de modificar código; **no se eliminaron ni desactivaron tests/helpers, y el punto 6 queda pendiente de un correctivo autorizado antes de C2**. Clasificarlos en este informe no los convierte físicamente en evidencia histórica.

## 2. Búsqueda del árbol y clasificación de hallazgos

Se censaron **845 archivos de texto existentes** del índice Git y no ignorados, incluidos archivos nuevos; la búsqueda inicial encontró 111 archivos y la ampliación dirigida de dependencias web llega a 116. Son coincidencias textuales, no 116 componentes B2C: D4 también identifica decisiones de otros módulos. Se separaron archivos eliminados mediante existencia física, no mediante contenido de patch. Se inspeccionaron además helpers/copias ignorados en .tmp. Se excluyeron dependencias, .git, .next y mapas/archivos binarios; no se leen secretos/env. Los build artefacts no se usan como verdad de fuente.

Inventario por archivo y línea, términos y clasificación: [consistencia-referencias.json](../quality/evidence/reserva-invitado-c1/consistencia-referencias.json). Incluye los seis grupos solicitados; añade documentación vigente para no llamar historia a los avisos actuales de alcance.

| Grupo | Hallazgo y tratamiento |
| --- | --- |
| Código productivo actual | Backend: únicamente campos deprecated constantes y persistencia de compatibilidad. Frontend: portal B2C y CustomerClaim **todavía activos**; provider del layout del slug, rutas cuenta/mis-reservas/mi-perfil, API /customer y post claims. No se trata como historia. |
| Prueba activa actual | Guest-retirement comprueba ausencia, no éxito de claim. Pruebas de booking/WhatsApp/calendario conservan fixtures del contrato deprecated. Customer.test conserva los dos positivos de claim; F0A/account y customer-ui conservan comportamiento del producto anterior. No todos los tests B2C se han retirado. |
| Fixture/helper activo | rate-limit-http-drill usa dist/main.js actual y espera claim 401/429: obsoleto tras 404, requiere reescritura. Los helpers de rollback/compatibilidad cargan explícitamente APIs históricas, véase tabla siguiente. Fixtures web f0a/f0e conservan campos de salida deprecated, no crean cuentas reales. |
| Documentación histórica | Contrato/cierres M2, ADR de autenticación, auditorías y entradas anteriores de controles describen el producto en sus fechas. No registran rutas. No se modifica la auditoría P4b ni otros informes históricos. |
| Evidencia histórica | JSON D4 antes/después, ejecutores .py.txt y JSON de P2/P3, patch del checkpoint anterior y snapshots .tmp: conservan reclamaciones antiguas. Código dentro de evidencia/diff no es código productivo actual. |
| Referencia eliminada | 14 archivos customer/claims/source/tests están ausentes físicamente aunque figuren como D en Git o dentro del patch: módulo/controller/service/guards/DTO/crypto y suites backend exclusivas. No confundirlos con archivos existentes. |
| Documentación vigente | Avisos de revocación y contratos deprecated actuales; los historiales inferiores tienen vigencia histórica, no autorización de reactivar M2. |

### Helpers de claim: objetivo real

| Archivo actual | Selección/código que carga | Clasificación y pendiente |
| --- | --- | --- |
| `apps/web/components/customer/Customer.test.tsx:92,101` | Vitest vigente; mocks del cliente HTTP actual | **Pruebas activas positivas**. Retirar/reemplazar antes de C2; no ocultarlas mediante skip. |
| `apps/web/components/customer/CustomerClaim.tsx:29` | UI productiva; POST claims seguido de GET detalle /customer | **Código productivo actual** pendiente de C2. No hay backend que atienda el contrato. |
| `apps/api/ops/rate-limit-http-drill.cjs:89` | Arranca `dist/main.js` vigente; helper manual con destino QA impuesto | **Helper activo obsoleto**; expectativa claim 401/429 incompatible con 404. No ejecutarlo ahora; reescribir su alcance preservando las otras rutas. |
| `apps/api/test/customer-runtime-compat.cjs:123` | Carga P1_PREVIOUS_API; caller fija snapshot 791569b110f9fd59cb10e6d248546bdae3996e14 | **Helper ejecutable de compatibilidad histórica**, no positivo del AppModule actual ni suite Jest activa. Segregar/rotular como regresión del baseline histórico antes de C2; conservar prueba de compatibilidad de datos. |
| `apps/api/test/customer-code-rollback.cjs:30` | Carga .tmp/m2-c1/baseline/apps/api; baseline 61ec6677b448a2ebbab4c32298b9246347ec1a10 | **Helper ejecutable de rollback histórico**, no positivo actual. No borrarlo como supuesto endpoint vigente; segregarlo como histórico en correctivo autorizado. |
| `.tmp/m2-d4/probe.cjs:28` | Probe manual ignorado que importa fuentes root actuales, llama claim y registra statuses | **Helper manual conservado**, no seleccionado por CI/Jest; no tiene assertion de claim 200, pero no representa un caso funcional vigente. No ejecutado ni modificado. Marcar/segregar como probe histórico antes de C2. |
| `.tmp/m2-c3-p1/*/current/**` y `previous/**` | Copias de ensayos pasados | **Snapshots/evidencia histórica**. La palabra current dentro de esas copias no equivale al árbol raíz actual. |

No se localizaron los nombres literales claimnorth/claimf en fuentes raíz, evidencia preexistente ni búsqueda adicional .tmp. Sí hay otros helpers de claim arriba; la ausencia de esos dos nombres no acredita ausencia de claims. Las menciones nuevas de los nombres en este informe/patrón de búsqueda son metadatos de auditoría.

### D4 y falsos positivos

D4 no aparece exclusivamente en el patch: permanece en comentarios del schema conservado, documentación/evidencia y el caso activo de cuarentena de Customer.test, aunque ese test no use el literal D4. En .tmp también existe el probe. No se declara todo histórico. En cambio, las implementaciones eliminadas y sus expectativas recuperadas desde líneas '-' del patch son **referencias eliminadas/historia**, no pruebas activas.

Las claims de sesión JWT en ClerkSessionVerifierService son verificación interna compartida; claimed de workers es adquisición de trabajo y MIME claim es validación de medios. No son reclamaciones B2C. D4 en professional-availability/security-rate es otra decisión. El comentario auth.service.ts sobre CUSTOMER cambiando password quedó obsoleto frente al rechazo JwtStrategy: se registra para corregir después, sin alterar código ahora.

## 3. Registro backend y dependencias frontend

AppModule no importa ni registra CustomerModule. AuthModule no importa/registra ClerkCustomerClaimsController/Service y conserva onboarding, bootstrap, me, invitaciones y guards compartidos. Búsqueda de registros/clases retiradas en src productivo sin tests: cero coincidencias relevantes. La comprobación HTTP actual prueba GET businesses, GET/POST bookings, GET detalle, GET/PATCH profile y POST claims con 404; no usa una API histórica.

La web actual monta CustomerProvider en apps/web/app/[slug]/layout.tsx, CustomerEntryLinks en PublicMiniSite, CustomerClaim al éxito en PublicBookingScreen y usa /customer desde CustomerBookings, CustomerProfile, CustomerBookingDetail y CustomerRepeatBooking. CustomerAuth usa registro/entrada Clerk desde el portal. proxy.ts mantiene matchers de cuenta/mis-reservas/mi-perfil. Ninguno se elimina en esta tarea.

## 4. Contrato deprecated temporal: condición exacta de retirada

accountCreated=false y accountCreationError=null permanecen solo como contrato deprecated, sin lógica de alta. PublicBookingResult sigue exigiendo ambos campos y existen fixtures/assertions actuales. No son indicadores de existencia/creación de identidad.

Se eliminarán **solo cuando se cumplan todas estas condiciones**:

1. C2 autorizado, implementado y aprobado: retirada de UI/consumidores B2C; PublicBookingResult, fixtures, scripts y pruebas web ya no dependen de los campos, ni existen positivos funcionales de claim en suites activas.
2. Nueva búsqueda del árbol (incluidos helpers seleccionados/manuales): las únicas referencias de estos campos son los dos miembros deprecated y el retorno API que se retirarán, más documentación/evidencia histórica. Consumidores externos, si existen, deben estar inventariados/migrados; no asumir su inexistencia por un rg local.
3. Checkpoint backend coordinado con autorización propia reduce PublicBookingResponseDto/POST a `{ booking }` y actualiza assertions activas del contrato. C2 no elimina implícitamente un contrato backend aprobado.
4. Tipos/lint/tests/build API y web pasan; integración POST confirma 201/PENDING, privacidad y ausencia de ambas propiedades, con respuesta de error útil y sin creación secundaria. Las pruebas PostgreSQL pendientes deben haber pasado en aislado antes del commit C1 candidato, y antes de QA si no hay evidencia vigente.
5. Activación API/web y publicación autorizadas separadamente con compatibilidad de versiones comprobada; no desplegar el frontend anterior contra el contrato reducido.

## 5. Las 37 pruebas omitidas, una por una

Recopiladas por Jest del árbol actual, con flags de integración desactivados y dotenv bloqueado: **37 pending, 0 ejecutadas, exit 0**. Exit 0 en esta recopilación no significa que hayan aprobado. [JSON nativo Jest](../quality/evidence/reserva-invitado-c1/consistencia-omitidas.json).

- **A** = apps/api/src/auth/clerk-user-link.integration.spec.ts (2), RUN_POSTGRES_INTEGRATION=1.
- **H** = apps/api/src/business-schedule/business-schedule.integration.spec.ts (26), RUN_BUSINESS_SCHEDULE_INTEGRATION=1.
- **R** = apps/api/src/bookings/booking-concurrency.integration.spec.ts (9), RUN_POSTGRES_INTEGRATION=1.

Todas aplican al MVP de invitado: aislamiento/concurrencia, horarios y preservación de la identidad interna Clerk. No requieren navegador ni una cuenta de cliente final. No se encontró una necesidad de reescribir estas 37 por retirar B2C; las pruebas activas de claim que sí deben retirarse son otras y no integran este conteo.

Clasificación de gates de este checkpoint: ejecutar las 37 con PostgreSQL desechable y rol adecuado **antes del commit C1 candidato** y contar con esa evidencia vigente antes de QA. No implica repetirlas sin nuevos cambios. Docker es un medio de disponer del clúster; no es requisito lógico si existe otro PostgreSQL realmente aislado. No habilitar flags contra bases habituales/QA ni usar el harness de mock (DATABASE_URL puerto 1) para simular integración. El workflow actual no fija estos dos flags; su pnpm test por sí solo puede volver a omitirlas.

| Nº | Suite | Nombre exacto del caso | No aplica | Reescritura | Docker/PostgreSQL | Navegador | Antes commit C1 | Antes QA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | A | preserves seeded users and allows multiple null links | No | No | Sí | No | Sí | Sí |
| 2 | A | rejects a duplicate non-null Clerk identity | No | No | Sí | No | Sí | Sí |
| 3 | H | detects a damaged trigger and rolls the isolated probe back | No | No | Sí | No | Sí | Sí |
| 4 | H | detects a damaged function and rolls the isolated probe back | No | No | Sí | No | Sí | Sí |
| 5 | H | SQL NULL legacy is unconfirmed with faithful fallback; new tenants are closed | No | No | Sí | No | Sí | Sí |
| 6 | H | normalizes adjacent global spans and supports midnight without crossing it | No | No | Sí | No | Sí | Sí |
| 7 | H | rejects a whole change for PENDING in progress and beyond 366 days | No | No | Sí | No | Sí | Sí |
| 8 | H | rejects a whole change for CONFIRMED in progress and beyond 366 days | No | No | Sí | No | Sí | Sí |
| 9 | H | A2 protects in-progress bookings and retains all shifts after global changes | No | No | Sí | No | Sí | Sí |
| 10 | H | cancelled does not protect while completed/no-show keep occupancy/history | No | No | Sí | No | Sí | Sí |
| 11 | H | overlapping closures form a union; cancellation does not cancel another or future hires | No | No | Sí | No | Sí | Sí |
| 12 | H | full multiday and partial closures reject impossible dates/ambiguous clocks | No | No | Sí | No | Sí | Sí |
| 13 | H | public slots preserve H5, privacy, cadence, custom intersection and eligibility | No | No | Sí | No | Sí | Sí |
| 14 | H | minimal staff projection omits closure reasons; managers/zone permissions and tenant IDs are enforced | No | No | Sí | No | Sí | Sí |
| 15 | H | D9 freezes zone with history even without future bookings | No | No | Sí | No | Sí | Sí |
| 16 | H | D9 freezes zone with block even without future bookings | No | No | Sí | No | Sí | Sí |
| 17 | H | D9 freezes zone with closure even without future bookings | No | No | Sí | No | Sí | Sí |
| 18 | H | D9 freezes zone with sealed-promotion even without future bookings | No | No | Sí | No | Sí | Sí |
| 19 | H | two editors cannot overwrite a revision | No | No | Sí | No | Sí | Sí |
| 20 | H | serializes narrowing against internal without impossible commitments | No | No | Sí | No | Sí | Sí |
| 21 | H | serializes narrowing against public without impossible commitments | No | No | Sí | No | Sí | Sí |
| 22 | H | serializes narrowing against reschedule without impossible commitments | No | No | Sí | No | Sí | Sí |
| 23 | H | serializes narrowing against reactivate without impossible commitments | No | No | Sí | No | Sí | Sí |
| 24 | H | serializes narrowing against individual without impossible commitments | No | No | Sí | No | Sí | Sí |
| 25 | H | serializes initial zone against first booking; all resulting instants remain unchanged | No | No | Sí | No | Sí | Sí |
| 26 | H | waiting on tenant A does not block writes to tenant B | No | No | Sí | No | Sí | Sí |
| 27 | H | a durable history failure rolls back every row; audit adapter failure is fail-open | No | No | Sí | No | Sí | Sí |
| 28 | H | burst writes to one tenant serialize and retain all eligible bookings | No | No | Sí | No | Sí | Sí |
| 29 | R | accepts only one of two overlapping concurrent inserts | No | No | Sí | No | Sí | Sí |
| 30 | R | serializes archive against internal creation | No | No | Sí | No | Sí | Sí |
| 31 | R | serializes archive against creation inside the public transaction | No | No | Sí | No | Sí | Sí |
| 32 | R | serializes archive against rescheduling into the future | No | No | Sí | No | Sí | Sí |
| 33 | R | serializes archive against reactivating a cancelled future booking | No | No | Sí | No | Sí | Sí |
| 34 | R | serializes weekly schedule replacement against booking creation | No | No | Sí | No | Sí | Sí |
| 35 | R | enforces tenant ownership for availability rows at PostgreSQL level | No | No | Sí | No | Sí | Sí |
| 36 | R | serializes an active block against rescheduling into its range | No | No | Sí | No | Sí | Sí |
| 37 | R | serializes an active block against reactivating a cancelled booking | No | No | Sí | No | Sí | Sí |

## 6. Comandos y resultados reales de esta tarea

- `git branch --show-current`, `git rev-parse HEAD`, `git status --short`: rama/HEAD indicados; cambios C0/C1 anteriores presentes, sin staging ni nuevo commit.
- Búsqueda principal `rg -n -i 'claimnorth|claimf|customer.?claims|customer.?account|customer.?login|Mis reservas|/customer|accountCreated|accountCreationError|portal B2C|ClerkCustomerClaims|CustomerModule' apps .github` más inventario Git/Python: coincidencias clasificadas en JSON, archivos eliminados separados por existencia.
- `rg -n 'describe\.skip|it\.skip|test\.skip|xit\(|xdescribe\(' apps/api/src apps/api/test`: tres suites src condicionales; el grep también reconoce texto de exit en un helper, que no es test omitido. Otro e2e de Cloudinary depende de proveedor, pero no pertenece a estas 37 de src.
- `rg -n 'RUN_POSTGRES|RUN_BUSINESS' .github/workflows/quality.yml`: sin coincidencias, exit 1 normal de rg; no se cambió CI.
- `rg -n 'CustomerModule|ClerkCustomerClaims' apps/api/src/app.module.ts apps/api/src/auth/auth.module.ts` y búsqueda de controllers/clases retiradas en src: sin registro, exit 1 normal de rg. Relectura completa de arrays imports/controllers/providers efectuada.
- `rg --no-ignore --hidden ... .tmp` excluyendo node_modules/env/mapas: copias históricas y probe manual arriba; no se ejecutan. Literal claimnorth/claimf sin hallazgos preexistentes; no confundir un exit 1 de ausencia con fallo de auditoría.
- `pnpm --filter api exec node test/guest-retirement-run.cjs jest --runInBand --runTestsByPath src/bookings/booking-concurrency.integration.spec.ts src/business-schedule/business-schedule.integration.spec.ts src/auth/clerk-user-link.integration.spec.ts --json --outputFile=C:/Users/Fraylin/Desktop/Kortek-Booking/docs/quality/evidence/reserva-invitado-c1/consistencia-omitidas.json`: exit 0, 37 pending/0 ejecutadas, 1.790 s. RUN_POSTGRES_INTEGRATION=0; RUN_BUSINESS_SCHEDULE_INTEGRATION no activado. No beforeAll PostgreSQL ejecutado.
- `pnpm --filter api exec node test/guest-retirement-run.cjs jest --runInBand --runTestsByPath src/public-booking/guest-retirement.spec.ts --json --outputFile=C:/Users/Fraylin/Desktop/Kortek-Booking/docs/quality/evidence/reserva-invitado-c1/consistencia-rutas.json`: exit 0, 22 aprobadas, 3.221 s; ambos flags integración 0. [JSON nativo](../quality/evidence/reserva-invitado-c1/consistencia-rutas.json).
- Código/tests del checkpoint comparados por SHA-256 y ausencia física contra validacion.json anterior: 32 rutas sin cambio. Patch/validacion.json anteriores se conservan como evidencia histórica; no se regeneran ni son un diff actualizado de las correcciones documentales.

Las 830 aprobadas/37 omitidas y tipos/lint/build del checkpoint anterior siguen siendo **evidencia previa del mismo código**, no ejecuciones nuevas de esta auditoría. No se volvió a compilar ni se ejecutaron unitarias completas, Vitest, navegador, proveedor, PostgreSQL, scripts operativos o QA real. pnpm utilizó el acceso ya aprobado fuera del sandbox al caché local; no se instalaron dependencias.

## 7. Riesgos, pendientes y alcance del checkpoint

1. Consistencia global todavía bloqueada: dos positivos activos de claim en web, portal operativo local sin API y helper rate-limit obsoleto. Retirar/reformular esos tests/helpers en correctivo expresamente autorizado **antes de C2**; no introducir skips ni borrar garantías de compatibilidad de datos.
2. Segregar explícitamente los dos helpers de rollback/compatibilidad y el probe D4 como historial ejecutable para no usarlos como aprobación del MVP actual; requieren autorización porque cambiar archivos ejecutables está prohibido en esta tarea.
3. Las 37 integraciones siguen pendientes. No eliminarlas por retirar la cuenta final: las dos Clerk son del modelo de identidad interna, las demás de agenda/horario.
4. Los campos deprecated no justifican reabrir alta/login/claim. Su retiro exige las cinco condiciones de §4; no se eliminan ahora.
5. D4 histórico no acredita limpieza de fichas Client mezcladas; esa integridad y la paginación del panel mantienen revisión propia.
6. C0 aprobado, C1 parcialmente validado/en revisión; C2/C3 pendientes. Sin autorización de commit ni publicación; no modificar QA/Clerk/producción. Ninguna auditoría P4b modificada.

No hay rollback de código/DB/proveedor en esta auditoría: solo correcciones documentales y artefactos de lectura/pruebas. Revertir el C1 anterior reabriría B2C y no es una acción autorizada aquí. El informe entrega evidencia y pendientes; **no certifica el punto 4 ni da por realizado el punto 6** ante pruebas/helpers todavía existentes.
