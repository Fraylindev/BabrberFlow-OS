# Checkpoint de consistencia — retiro B2C C0/C1

## Validación posterior de integraciones — 2026-10-07

[Informe de cierre técnico C1](RESERVA_INVITADO_C1_CIERRE_TECNICO.md): las 37 integraciones inicialmente omitidas pasaron realmente, más dos casos HTTP claim sobre PostgreSQL 18.1 aislado/runtime; 0 omitidas, exit 0, 28 migraciones sin modificar. La tabla de §5 conserva los nombres/clasificación iniciales; su gate PostgreSQL está ahora cumplido para este árbol. El test H5 se alineó al contrato F0-D/2A aprobado; el fallo previo queda documentado. C1 candidato a cierre técnico/en revisión; no cierre/aprobación de propietario, commit ni C2 inferidos. Los comandos y pendientes inferiores describen el checkpoint previo. El diff anterior también se conserva como evidencia previa, no diff actualizado.

Fecha: 2026-10-07. Rama `ai/antigravity-qa`; HEAD `c4625ef23a3766c5be5172dde0aea4b1cb57d7ac`.

**C0 aprobado. C1 implementado y validado parcialmente en local, en revisión. C2 pendiente. C3 pendiente. Sin commit, push, despliegue ni cambios QA.** El propietario autorizó después del informe inicial modificar código o retirar pruebas/helpers según fuera pertinente. Esa autorización resuelve la restricción documental anterior únicamente para este correctivo; no abre C2/C3 ni publicación. [Informe inicial conservado](../history/reserva-invitado/CONSISTENCIA_ANTES_CORRECTIVO.md).

## 1. Resultado actual y criterios

- **Registro backend ausente:** AppModule/AuthModule no importan ni registran CustomerModule o ClerkCustomerClaimsController/Service. La suite HTTP del AppModule actual volvió a aprobar **22/22, exit 0**: ausencia 404 de las siete rutas/métodos B2C con/sin bearer, rechazo de campos de cuenta y reserva invitada 201/PENDING. Usa persistencia, proveedor y ThrottlerGuard controlados; no sustituye PostgreSQL o Clerk reales.
- **Pruebas positivas retiradas:** Customer.test.tsx conserva 15 casos, sin los dos casos que mockeaban `{ claimed:true }` ni import de CustomerClaim. No se agregaron skips. Búsqueda actual de claims/claimed sobre tests/specs/helpers de apps no encuentra expectativas de éxito; la única ruta claim en tests API es un caso negativo 404. Los mocks CustomerClaim→null de pruebas públicas omiten el componente y no simulan un claim exitoso; permanecen hasta C2.
- **Helpers positivos segregados:** el orquestador P1 y sus helpers dependientes de compatibilidad/rollback, más el probe .tmp D4, se conservan fuera de apps y con extensión .txt, no seleccionada por Jest/Vitest. Se preservaron cinco originales byte por byte, incluido el test web anterior. No se pierden garantías históricas ni datos; dejan de ser comandos del API vigente.
- **Frontend pendiente:** siguen CustomerProvider, CustomerAuth, CustomerClaim, Mis reservas, perfil, repetición y checkbox de cuenta, consumiendo APIs retiradas. El build también muestra esas páginas. C2 es bloqueante para integración/publicación aunque las pruebas locales pasen. No se tocó UI productiva, Clerk ni sus roles internos.

Usuario del correctivo: mantenedor/revisor. Problema: pruebas/helpers aprobaban una capacidad retirada. Resultado observable: ninguna suite activa ni helper operativo espera claim exitoso; originales históricos preservados; proyecto compila. No cambia roles, permisos, PII, estados de UI, responsive ni accesibilidad. No se ejecuta QA visual porque no hay cambio de interfaz y C3 no está autorizado.

## 2. Búsqueda actual y clasificación

[Inventario actualizado por archivo/línea](../quality/evidence/reserva-invitado-c1/correctivo-referencias.json): censo nuevo de archivos Git existentes y no ignorados después del correctivo; 100 archivos con coincidencias. Excluye JSON/patch para no confundir la evidencia nativa conservada con ejecutores actuales. Complementa el [inventario inicial](../quality/evidence/reserva-invitado-c1/consistencia-referencias.json), que conserva las coincidencias en evidencia histórica JSON/patch. Los 116 hallazgos iniciales y los dos positivos de ese inventario describen el árbol anterior; no son el estado actual. Términos: customer claims, portal B2C, Mis reservas, customer account/login, accountCreated/Error, /customer, ClerkCustomerClaims, claimnorth/claimf, D4; inspección adicional de selección Jest/Vitest, callers y .tmp.

| Clasificación | Estado actual |
| --- | --- |
| Código productivo actual | Portal web B2C y claim todavía existentes, pendientes de C2; backend solo conserva contrato deprecated y compatibilidad. Claims JWT compartidas y claimed de workers no son B2C. |
| Prueba activa actual | Guest-retirement exige 404; Customer.test conserva otros 15 casos del portal hasta C2. Ninguna prueba espera claim exitoso. Pruebas públicas con stub nulo no simulan alta/claim. |
| Fixture/helper activo | Rate-limit-http-drill exige claim 404 y conserva todos los budgets de rutas restantes; no se ejecutó contra QA. customer-no-dotenv y harness local siguen activos por seguridad de las pruebas. Fixtures de los campos deprecated permanecen. |
| Documentación histórica | M2, cierres, ADR y auditorías mantienen sus hechos/autorizaciones fechados, sin revocar el alcance actual. P4b intacto. |
| Evidencia histórica | D4/claim JSON, patches, snapshots .tmp y los originales segregados .txt; expectativas positivas solo en historia. El nombre current en un snapshot antiguo no equivale al AppModule raíz vigente. |
| Referencia eliminada | Las 14 fuentes/suites backend ya retiradas más los tres helpers ejecutables de test y el probe ignorado ausente; sus originales se conservan como .txt. No contar líneas eliminadas de diff como tests activos. |

D4 **no es exclusivamente historia**: quedan comentarios del schema, mensajes/test de customer-ui y deuda sobre fichas Client; no prueban un claim activo. El caso positivo de cuarentena sí se retiró. D4 en profesional-availability/security-rate corresponde a otras decisiones. claimnorth/claimf no identificaron helpers preexistentes; sus menciones en informes/patrón son metadatos.

## 3. Archivos, rutas, compatibilidad y rollback

Cambio incremental de este correctivo:

- Modificados: apps/web/components/customer/Customer.test.tsx (retira dos casos y un import); apps/api/ops/rate-limit-http-drill.cjs (401/429 del claim → assertion 404); apps/api/src/auth/auth.service.ts (solo comentario de password interno, sin cambiar comportamiento); apps/api/ops/README.md y controles documentales.
- Retirados como ejecutores: apps/api/test/customer-runtime-grants-drill.cjs, customer-runtime-compat.cjs y customer-code-rollback.cjs; .tmp/m2-d4/probe.cjs ignorado. El orquestador se archiva junto con su hijo para evitar dejar un comando dependiente roto. No hay consumidores en package.json/CI; se corrigió el único comando vigente de ops/README.
- Historial nuevo: docs/history/reserva-invitado/README.md, Customer.test.tsx.txt y helpers/*.cjs.txt. [Ubicaciones y SHA-256 originales](../quality/evidence/reserva-invitado-c1/correctivo-helpers-archivo.json). Preservación byte por byte verificada en cinco archivos. La copia de informe anterior también queda conservada.
- Rutas backend retiradas por C1 previo: GET /customer/businesses; GET/POST /customer/:slug/bookings; GET /customer/:slug/bookings/:id; GET/PATCH /customer/:slug/profile; POST /auth/clerk/customer/claims.
- Conservadas: POST /public/:slug/bookings, disponibilidad y booking-data públicos, panel interno tenant-scoped, bootstrap/onboarding/invitaciones y autenticación B2B. Este correctivo no altera registros ni contratos backend adicionales.
- **Migraciones evitadas: todas. Propuestas: ninguna.** Client/User/Membership, tablas/columnas/índices/triggers, reservas/facturas/pagos, migraciones, grants y estructuras de compatibilidad intactos. No modifica dependencias, flags funcionales, QA ni configuración Clerk.

Rollback incremental: restaurar solamente los archivos concretos desde los .txt originales en sus paths originales, revisar dependencias y el diff del correctivo. No ejecutar los históricos ni usar git reset/checkout general: borraría trabajo C0/C1 previo. Reintroducir positivos/claim no es el estado aprobado; la restauración sería únicamente un rollback técnico autorizado. No hay rollback de DB/proveedor porque no se tocaron.

## 4. Contrato deprecated temporal: condición exacta de retirada

accountCreated=false y accountCreationError=null permanecen solo como contrato deprecated, sin lógica de alta. PublicBookingResult sigue exigiendo ambos campos y existen fixtures/assertions actuales. No son indicadores de existencia/creación de identidad.

Se eliminarán **solo cuando se cumplan todas estas condiciones**:

1. C2 autorizado, implementado y aprobado: retirada de UI/consumidores B2C; PublicBookingResult, fixtures, scripts y pruebas web ya no dependen de los campos, ni existen positivos funcionales de claim en suites activas.
2. Nueva búsqueda del árbol (incluidos helpers seleccionados/manuales): las únicas referencias de estos campos son los dos miembros deprecated y el retorno API que se retirarán, más documentación/evidencia histórica. Consumidores externos, si existen, deben estar inventariados/migrados; no asumir su inexistencia por un rg local.
3. Checkpoint backend coordinado con autorización propia reduce PublicBookingResponseDto/POST a `{ booking }` y actualiza assertions activas del contrato. C2 no elimina implícitamente un contrato backend aprobado.
4. Tipos/lint/tests/build API y web pasan; integración POST confirma 201/PENDING, privacidad y ausencia de ambas propiedades, con respuesta de error útil y sin creación secundaria. Las pruebas PostgreSQL pendientes deben haber pasado en aislado antes del commit C1 candidato, y antes de QA si no hay evidencia vigente.
5. Activación API/web y publicación autorizadas separadamente con compatibilidad de versiones comprobada; no desplegar el frontend anterior contra el contrato reducido.

## 5. Antecedente: las 37 pruebas inicialmente omitidas, una por una

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

## 6. Comandos ejecutados y resultados reales

- Nueva búsqueda Git/Python + rg de claims/claimed en apps, callers en apps/.github/package.json y relectura de módulos/config Vitest: sin positivos activos ni consumidores ejecutables de helpers archivados. JSON nuevo por línea y manifiesto SHA-256 disponibles arriba. No se inspeccionaron secretos ni se ejecutaron archivos históricos.
- `pnpm --filter web test`: exit 0; **161 unitarias Node + 147 componentes Vitest = 308 aprobadas**, 22 archivos Vitest. Customer.test: 15 aprobadas, dos casos retirados, cero skips nuevos.
- `pnpm --filter web exec tsc --noEmit`: exit 0.
- `pnpm --filter web lint`: exit 0.
- `pnpm --filter web build --webpack`: primer intento exit 1 por DEPLOY_ENV inválido/ausente. Repetido con DEPLOY_ENV=development y NEXT_PUBLIC_API_URL=http://localhost:3000 solo en el proceso: **exit 0**, compila, tipos y 16 páginas estáticas. No se editaron .env ni variables remotas. Build con webpack explícito; no acredita Turbopack ni QA visual.
- `pnpm --filter api exec node test/guest-retirement-run.cjs jest --runInBand --runTestsByPath src/public-booking/guest-retirement.spec.ts --json --outputFile=C:/Users/Fraylin/Desktop/Kortek-Booking/docs/quality/evidence/reserva-invitado-c1/correctivo-rutas.json`: **exit 0, 22 aprobadas**, 3.256 s, ambos flags integración 0. [JSON Jest nuevo](../quality/evidence/reserva-invitado-c1/correctivo-rutas.json).
- `node --check apps/api/ops/rate-limit-http-drill.cjs`: exit 0; validación de sintaxis solamente, no ejecución de presupuestos contra DB.
- `git diff --check`: exit 0; avisos de conversión LF/CRLF, sin errores whitespace. Rama y HEAD intactos; índice vacío. No commit/push/despliegue.

Las 830 aprobadas/37 omitidas, tipos/lint/build API del C1 anterior permanecen como evidencia previa, no se presentan como ejecuciones nuevas. Las 37 de §5 siguen pendientes en PostgreSQL aislado. No se ejecutó Docker/PostgreSQL, navegador, proveedor, QA ni scripts operativos. pnpm usó acceso aprobado al caché; no se instalaron dependencias.

[Diff completo actual C0/C1 más correctivo](../quality/evidence/reserva-invitado-c1/c0-c1-con-correctivo.patch) · [Inventario de archivos y resultados](../quality/evidence/reserva-invitado-c1/correctivo-validacion.json). El patch excluye su propia evidencia para evitar recursión. `git apply --reverse --check` pasó; no se aplicó ningún rollback.

## 7. Riesgos y siguiente gate

Los puntos 4/6 del checkpoint quedan resueltos para pruebas/helpers: positivos retirados del árbol ejecutable y archivados. La UI productiva B2C conserva sus llamadas retiradas y no debe publicarse integrada antes de C2. Las otras pruebas de portal siguen siendo mocks de UI anterior; un resultado verde no demuestra backend B2C. C2 deberá retirar esos consumidores, pruebas y stubs según alcance aprobado.

El gate de ejecución de estas 37 integraciones fue resuelto por el ensayo posterior superior; sus evidencias son previas a cualquier commit/QA y no autorizan esas acciones. La segregación suspende el comando P1 antiguo: adaptar un harness para API invitado es trabajo separado, conservando gates SQL intactos. El ensayo operativo de rate limit no se ejecutó; su assertion 404 está cubierta por HTTP con dependencias controladas, no por un drill real de presupuestos persistentes.

Contrato deprecated permanece hasta las condiciones de §4. Integridad de fichas Client mezcladas y paginación del panel mantienen sus gates. C1 no se declara aprobado: validación local parcial/en revisión. C2/C3 pendientes; P4b y su auditoría intactos; producción cerrada.
