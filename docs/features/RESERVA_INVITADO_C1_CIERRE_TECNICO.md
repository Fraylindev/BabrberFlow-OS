# Reserva invitada — informe de cierre técnico C1

Fecha: 2026-10-07. Rama ai/antigravity-qa; HEAD c4625ef23a3766c5be5172dde0aea4b1cb57d7ac, sin cambio.

**C0 aprobado. C1 implementado y validado localmente, candidato a cierre técnico / en revisión del propietario. C1 no declarado cerrado/aprobado y sin autorización de commit. C2 pendiente y detenido. C3 pendiente. Sin commit, push, despliegue ni cambios QA.** El correctivo de consistencia fue aceptado como trabajo local. Este informe entrega la validación exigida; no abre C2.

## Resultado final

| Suite | Ejecutadas | Aprobadas | Fallidas | Omitidas | Exit code |
| --- | --- | --- | --- | --- | --- |
| clerk-user-link.integration.spec.ts | 2 | 2 | 0 | 0 | 0 |
| business-schedule.integration.spec.ts | 26 | 26 | 0 | 0 | 0 |
| booking-concurrency.integration.spec.ts | 9 | 9 | 0 | 0 | 0 |
| **Integraciones exigidas** | **37** | **37** | **0** | **0** | **0** |
| guest-claim-retirement.integration.spec.ts, adicionales | 2 | 2 | 0 | 0 | 0 |
| **Ejecución final completa** | **39** | **39** | **0** | **0** | **0** |

[Manifiesto nativo del runner, comandos exactos y migraciones](../quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/run.json). Los cuatro JSON Jest y logs están en esa misma carpeta. No se habilitaron flags contra QA/bases habituales y ninguna suite final quedó pending. El runner verifica números de casos, numPendingTests=0 y exit code; continúa para recoger fallos de suites, pero falla globalmente si cualquiera falla. No hay skips nuevos.

## PostgreSQL, aislamiento y credenciales

PostgreSQL **18.1**, binarios existentes C:/Program Files/PostgreSQL/18/bin. Docker Desktop estaba detenido; no se arrancó ni se usó. Clúster nuevo con initdb; data dir exclusivo .tmp/guest-c1-pg-54e4c2049d35470da1dc299671c064e1/data, enlace **127.0.0.1:59252**, base exclusiva **guest_c1_54e4c2049d35470da1dc299671c064e1_test**, terminada en _test. Directorio exclusivo creado por este runner; no se reutilizó ninguna base, volumen, puerto fijo o helper histórico.

Roles creados **solamente en ese clúster**: guest_c1_admin para bootstrap, kortek_migrator no superusuario propietario de la base para migraciones/fixtures/probes, kortek_runtime sin privilegios administrativos para servicios de horario y API HTTP del claim. Contraseñas efímeras aleatorias en memoria; archivo temporal initdb eliminado inmediatamente; autenticación TCP SCRAM-SHA-256. URLs se inyectan en procesos; no se imprimen ni se versionan credenciales. Preload nuevo guest-postgres-no-dotenv.cjs bloquea acceso implícito a .env, también por Prisma.

Las suites de horario y claim verifican conexión/base/propietario sin privilegios ni acceso a la base primaria. El test HTTP comprueba además current_user=kortek_runtime y coincidencia de host/puerto/base entre fixture y runtime. Provision-runtime y verify-runtime-role.sql ejecutados intactos, exit 0; matriz de 37 tablas, permisos financieros/auditoría y funciones/triggers vigentes. No confundir esas **37 tablas** con las **37 pruebas**.

Tras la ejecución final: pg_ctl stop exit 0, directorio propio eliminado, cleanup=true. Verificación adicional CIM sin procesos guest-c1-pg y censo .tmp sin directorios de este runner. Ningún servicio PostgreSQL habitual fue detenido. Los intentos iniciales fallidos también se limpiaron; la evidencia permanece.

## Migraciones y comandos exactos

`node apps/api/test/guest-postgres-run.cjs` desde C:/Users/Fraylin/Desktop/Kortek-Booking, fuera del sandbox de procesos/red con revisión automática aprobada para este clúster propio. Runner final exit **0**.

Aplicación: Node + preload vigente → prisma migrate deploy --schema apps/api/prisma/schema.prisma. Cwd de los procesos hijos: apps/api. Se aplicaron **28 migraciones existentes**, sin editar schema, SQL, ledger de otro entorno ni generar una migración nueva. El ledger final se comparó exactamente con el listado de directorios actuales y el manifiesto registra SHA-256 de cada SQL.

Flags explícitos en **cada** proceso Jest:

```text
RUN_POSTGRES_INTEGRATION=1
RUN_BUSINESS_SCHEDULE_INTEGRATION=1
DATABASE_URL=<URL efímera del migrador en la base aislada>
C1_RUNTIME_DATABASE_URL=<URL efímera del runtime en la MISMA base aislada>
NODE_OPTIONS=--require=<ruta absoluta guest-postgres-no-dotenv.cjs>
```

Los valores URL sensibles se omiten; host/puerto/base/roles quedan arriba. La lista command/args de run.json contiene cada invocación exacta Node, preload, Jest, --runInBand, --runTestsByPath, nombre de suite, --json y --outputFile, sin credenciales. Se ejecutan cuatro procesos seriales sobre la misma base exclusiva. No se usó guest-retirement-run.cjs para integrar: ese harness conserva URL mock puerto 1 y no sirve para estas integraciones.

Migraciones aplicadas, en orden:

- `20260719162646_initial_schema`
- `20260720044928_add_invoice_model`
- `20260722030552_link_professional_user`
- `20260722042926_add_customer_role`
- `20260723212248_microsite_and_indexes`
- `20260724023058_global_identity_membership`
- `20260725215619_service_client_is_active`
- `20260727010227_audit_log_user_id`
- `20260811180000_booking_schedule_exclusion`
- `20260812010000_professionals_backend_a1`
- `20260813193000_professional_individual_availability_a2`
- `20260813200000_professional_availability_tenant_fk`
- `20260814190000_add_user_clerk_link_a0_1`
- `20260815120000_password_nullable`
- `20260820220000_audit_log_pre_tenant_security_events`
- `20260821220000_team_invitations_a0_4`
- `20260822150000_client_user_b2c_link_a0_6_a`
- `20260825220000_facturacion_a_internal_invoices`
- `20260826210000_facturacion_a_completion_service_price_guards`
- `20260909120000_restore_invoice_integrity_checks`
- `20260912120000_cms_editorial`
- `20260914120000_booking_email_outbox`
- `20260914120100_email_channel_control`
- `20260915120000_email_template_version`
- `20260923100000_media_promotions`
- `20260925010000_security_rate_bucket`
- `20260927170000_business_schedule`
- `20261003120000_customer_stage_one`

## Fallo inicial y corrección verificable del contrato

La primera ejecución que alcanzó las suites aprobó Clerk 2/2 y horario 25/26; falló el caso public slots preserve H5... porque su assertion histórica prohibía America/ en toda booking-data. Evidencia conservada en postgres/4d6169ae7ddc489eab58e85799bf1eb3/business-schedule.json y .log; exit 1, sin cierre inferido.

Antes de corregir se contrastaron fuentes actuales: BACKEND_CHANGES.md, decisión F0-D/2A del 2026-10-01, recoge aprobación explícita del propietario para timeZone IANA **solo en la raíz**, sustituyendo únicamente la exclusión H5 de esa propiedad. PublicBookingService y sus pruebas de contrato implementan ese comportamiento; la web lo consume. Retirarlo del API rompería el contrato vigente.

Se actualizó una sola assertion obsoleta: ahora exige timeZone exactamente igual al de la organización resuelta y conserva la prohibición America/ en **todo el resto de la proyección**, además de la prohibición de UUID tenant, las validaciones de slots, privacidad, cadence e integridad anteriores. No se relajaron permisos, transacciones ni validaciones productivas; no se cambió el API, el fixture, flags o expectativas para aceptar un resultado arbitrario. El diff de esta prueba se entrega de forma explícita. El fallo inicial no se oculta ni se cuenta como éxito.

Hubo dos intentos previos del runner sin migraciones/pruebas: uno atrapado por aislamiento de procesos/red del sandbox y captura de salida de pg_ctl; el siguiente falló por stdout=null al ignorar salida. Se corrigió únicamente el harness; ambos exit 1 y limpiados. Evidencia en c030b848012a4f27af97e3c4c2842e47 e interrupted.json, y 65deab5f99a54b84bf25fe1d7f783ee4/run.json + cleanup.json. La ejecución bdeb165b559b43efbbda355eedf51804 pasó 39/39 y se repitió porque se reforzó el test HTTP para el runtime real; la ejecución final citada arriba es la válida para el árbol actual. No se ocultan intentos ni reescriben sus resultados.

## Claim retirado: HTTP y ausencia de escrituras reales

Dos casos nuevos sobre AppModule actual y PostgreSQL real:

- Sin Authorization: 404 de router, message Cannot POST /auth/clerk/customer/claims.
- Con JWT interno válido firmado por JwtService del AppModule y Membership OWNER sintética preexistente: el mismo 404 de router.

En ambos casos se comparan conteos y huellas de **todas las filas** User, Membership, Client y AuditLog antes/después de la petición. No hay alta de User/Membership, modificación de Client ni escritura AuditLog. Se comprueba además que no se invocaron create/createMany/upsert de User/Membership, update/updateMany/upsert de Client, create/createMany de AuditLog ni AuditService.log. ClerkSessionVerifier.verify no fue llamado. Las huellas evitan imprimir filas/PII.

El API usa Prisma real sobre kortek_runtime, guards y auditoría reales; solo se desactiva MediaPurgeWorker en el módulo de prueba para evitar tareas concurrentes ajenas. No se conecta al proveedor Clerk, no se simula un guard permisivo ni un datastore en memoria. La creación de una identidad OWNER, Membership y Client **antes** de las peticiones es fixture sintética de esta base exclusiva, no un efecto del endpoint. La variante bearer sintáctico de la suite HTTP anterior queda como evidencia complementaria; no acredita Clerk real.

## Archivos, invariantes, riesgos y rollback

Archivos incrementales de validación:

- apps/api/src/business-schedule/business-schedule.integration.spec.ts: alineación de la assertion al contrato aprobado F0-D/2A.
- apps/api/src/public-booking/guest-claim-retirement.integration.spec.ts: dos casos de persistencia real.
- apps/api/test/guest-postgres-run.cjs: runner vigente de clúster exclusivo, flags, migraciones, roles, conteo y cleanup.
- apps/api/test/guest-postgres-no-dotenv.cjs: bloqueo de lecturas .env para hijos del runner.
- Informe/control documental y evidencia postgres. Sin UI ni cambios de contratos productivos en esta tarea.

Prisma/schema/migraciones/SQL, Clerk, roles de producto, datos reales, proveedores, dependencias, P4b y su auditoría intactos. Ninguna ruta adicional eliminada: las rutas retiradas por C1 anterior siguen ausentes. accountCreated=false/accountCreationError=null permanecen deprecated hasta [condiciones de retirada tras C2](RESERVA_INVITADO_CONSISTENCIA_C0_C1.md#4-contrato-deprecated-temporal-condición-exacta-de-retirada).

TypeScript y lint API del árbol final: exit 0. Build/unitarias generales y validaciones web previas siguen como evidencia anterior del mismo código productivo, no ejecuciones nuevas. Las 37 integraciones requeridas sí se ejecutaron aquí de verdad. No se ejecutó navegador ni QA real ni se afirma aprobación de interfaz/proveedor.

Límite material: PostgreSQL probado **18.1**; no presentar este resultado como prueba PG17 del entorno QA. SQL gate y funciones de compatibilidad sí pasaron en esta versión. El runner puede elegir GUEST_PG_BIN para una instalación alternativa en un ensayo futuro autorizado. No se instaló PostgreSQL ni dependencias.

Rollback de esta tarea: no hay DB persistente que revertir; clústeres propios retirados. Para revertir archivos, revisar solo los cuatro paths de validación y controles documentales; nunca resetear el árbol ni restaurar helpers B2C históricos. El C1 productivo anterior se preservó. No commit/push/despliegue ni índice staged.

C2 sigue bloqueando la integración porque la web mantiene UI/calls a rutas retiradas. La aceptación del cierre técnico C1 y cualquier commit necesitan autorización separada; **detenerse aquí y esperar autorización explícita de C2**, sin iniciarlo por el resultado verde.

## Casos ejecutados del árbol final, uno por uno

| Nº | Suite | Caso exacto | Resultado |
| --- | --- | --- | --- |
| 1 | clerk-user-link | preserves seeded users and allows multiple null links | PASSED |
| 2 | clerk-user-link | rejects a duplicate non-null Clerk identity | PASSED |
| 3 | business-schedule | detects a damaged trigger and rolls the isolated probe back | PASSED |
| 4 | business-schedule | detects a damaged function and rolls the isolated probe back | PASSED |
| 5 | business-schedule | SQL NULL legacy is unconfirmed with faithful fallback; new tenants are closed | PASSED |
| 6 | business-schedule | normalizes adjacent global spans and supports midnight without crossing it | PASSED |
| 7 | business-schedule | rejects a whole change for PENDING in progress and beyond 366 days | PASSED |
| 8 | business-schedule | rejects a whole change for CONFIRMED in progress and beyond 366 days | PASSED |
| 9 | business-schedule | A2 protects in-progress bookings and retains all shifts after global changes | PASSED |
| 10 | business-schedule | cancelled does not protect while completed/no-show keep occupancy/history | PASSED |
| 11 | business-schedule | overlapping closures form a union; cancellation does not cancel another or future hires | PASSED |
| 12 | business-schedule | full multiday and partial closures reject impossible dates/ambiguous clocks | PASSED |
| 13 | business-schedule | public slots preserve H5, privacy, cadence, custom intersection and eligibility | PASSED |
| 14 | business-schedule | minimal staff projection omits closure reasons; managers/zone permissions and tenant IDs are enforced | PASSED |
| 15 | business-schedule | D9 freezes zone with history even without future bookings | PASSED |
| 16 | business-schedule | D9 freezes zone with block even without future bookings | PASSED |
| 17 | business-schedule | D9 freezes zone with closure even without future bookings | PASSED |
| 18 | business-schedule | D9 freezes zone with sealed-promotion even without future bookings | PASSED |
| 19 | business-schedule | two editors cannot overwrite a revision | PASSED |
| 20 | business-schedule | serializes narrowing against internal without impossible commitments | PASSED |
| 21 | business-schedule | serializes narrowing against public without impossible commitments | PASSED |
| 22 | business-schedule | serializes narrowing against reschedule without impossible commitments | PASSED |
| 23 | business-schedule | serializes narrowing against reactivate without impossible commitments | PASSED |
| 24 | business-schedule | serializes narrowing against individual without impossible commitments | PASSED |
| 25 | business-schedule | serializes initial zone against first booking; all resulting instants remain unchanged | PASSED |
| 26 | business-schedule | waiting on tenant A does not block writes to tenant B | PASSED |
| 27 | business-schedule | a durable history failure rolls back every row; audit adapter failure is fail-open | PASSED |
| 28 | business-schedule | burst writes to one tenant serialize and retain all eligible bookings | PASSED |
| 29 | booking-concurrency | accepts only one of two overlapping concurrent inserts | PASSED |
| 30 | booking-concurrency | serializes archive against internal creation | PASSED |
| 31 | booking-concurrency | serializes archive against creation inside the public transaction | PASSED |
| 32 | booking-concurrency | serializes archive against rescheduling into the future | PASSED |
| 33 | booking-concurrency | serializes archive against reactivating a cancelled future booking | PASSED |
| 34 | booking-concurrency | serializes weekly schedule replacement against booking creation | PASSED |
| 35 | booking-concurrency | enforces tenant ownership for availability rows at PostgreSQL level | PASSED |
| 36 | booking-concurrency | serializes an active block against rescheduling into its range | PASSED |
| 37 | booking-concurrency | serializes an active block against reactivating a cancelled booking | PASSED |
| 38 | guest-claim-retirement | claim is router 404, no User/Membership/Client/AuditLog writes; bearer=false | PASSED |
| 39 | guest-claim-retirement | claim is router 404, no User/Membership/Client/AuditLog writes; bearer=true | PASSED |
