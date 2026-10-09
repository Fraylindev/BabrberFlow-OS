# Runtime privilege matrix gate — 2026-10-08

**Correctivo de preparación CI / validado localmente / en revisión.** Base de trabajo `9874a60e13db046904c011e936b2c61e5d23220a`, rama autorizada `ai/reserva-invitado-ci`, árbol inicial limpio. El propietario aporta el log de `b318ca591d1ca6681269a6d25e29ca106d824df9`; no se consultó el run remoto. Un commit y push solo a la rama temporal; sin merge ni publicación a antigravity-qa/main.

## Clasificación y causa exacta

**(a) para el error aportado:** preparación del CI incompatible con el propietario que exige la guardia. No es una regresión de bytes ni de SECURITY INVOKER en la migración 28. **(c) para un fallo histórico diferente del mismo paso:** `9f04dba` falla en la matriz de tablas, no en esta guardia de funciones. No confundir ambos exit 3.

El workflow original crea `kortek_ci_runner` sin privilegios administrativos y `kortek_ci_test OWNER kortek_ci_runner`. El `DATABASE_URL` del job conecta como ese runner; `prisma migrate deploy` aplica las 28 migraciones desde cero. El paso runtime crea `kortek_ci_grants_test TEMPLATE kortek_ci_test OWNER postgres`: clona la base migrada, conserva propietarios de objetos y cambia solamente el propietario de la base clonada.

`provision-database-roles.sql` crea `kortek_migrator` y `kortek_runtime`, cambia propietarios de base/schema, tablas/secuencias/vistas y tipos enum/domain. **No transfiere funciones.** Termina su transacción y llama `apply-runtime-grants.sql` mediante `\ir`. La segunda transacción aplica la matriz de tablas/default ACL y termina. El suplemento se incluye después como tercera transacción y aborta antes de los grants de CustomerOperation/funciones.

En `customer-stage-one-runtime-grants.sql`, líneas 1–28 (el archivo solo tiene 28):

- 4–15: BEGIN, lock timeout y DO; cuenta exactamente las dos funciones sin argumentos referenciadas por regprocedure, exige `NOT prosecdef`, retorno `trigger` y propietario `kortek_migrator`. Si no cuenta dos, lanza la excepción. `ON_ERROR_STOP=1` produce exit 3.
- 17–22: revoca privilegios previos y concede SID en CustomerOperation y EXECUTE en ambas funciones al runtime.
- 23–28: fija `search_path=pg_catalog, public, pg_temp` sin SECURITY DEFINER y confirma la transacción. Estas líneas no se alcanzan en el fallo original.

Censo reproducido después del clon/provisionador original:

| Función | Propietario | prosecdef | Retorno |
|---|---|---|---|
| `public.customer_access_relink()` | `kortek_ci_runner` | false | trigger |
| `public.customer_booking_revision()` | `kortek_ci_runner` | false | trigger |

Ambas incumplen **solo el propietario** de esa aserción. La migración crea las funciones sin SECURITY DEFINER ni ALTER OWNER; el rol que ejecuta la migración determina su propiedad. No hay evidencia de SECURITY DEFINER incorrecto en el ensayo. No se inspeccionó ninguna base real y no se extrapola su propiedad desde esta reproducción.

## Contraste histórico en worktree

Worktree temporal detached de `9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4`, bajo `.tmp/runtime-baseline-9f04dba`. Se usa su schema, migraciones, provisionador, grants y verificador originales. El arnés recrea roles/base entre escenarios, migra como `kortek_ci_runner`, clona mediante TEMPLATE y ejecuta el mismo encadenamiento de scripts y gate runtime. CLI Prisma ya instalado en el workspace, sin instalaciones ni dependencias nuevas; no se afirma ejecución del resto del workflow histórico.

La preparación/clone y `provision-database-roles.sql` de esa base pasan, **exit 0**. `verify-runtime-role.sql` como `kortek_runtime` falla, **exit 3**, con `Unreviewed public table: CustomerOperation`. Esa matriz todavía esperaba 36 tablas, aunque la migración 28 ya crea CustomerOperation. No existe `customer-stage-one-runtime-grants.sql` en `9f04dba`.

El defecto de preparación del propietario ya estaba latente allí (ambas funciones son del runner), pero el error textual aportado no existía: la guardia posterior lo hace observable. No se propone volver a la matriz histórica incompleta; conservar la matriz vigente de 37 tablas y corregir exclusivamente el rol de preparación del CI.

`git diff 9f04dba b318ca5 -- apps/api/prisma/migrations` y el diff del provisionador SQL son vacíos, exit 0. Blobs Git idénticos:

- Migración 28: `a6c6f761dc0594afe385d3919a931c596eb6334a`.
- Provisionador: `aedc1e5b6081eb5ceb3771b9f35101df0564c63c`.

Los hashes crudos del worktree pueden diferir por CRLF/LF; no son prueba de cambio SQL. Los blobs anteriores comparan contenido versionado. El suplemento y la matriz vigente son posteriores a la base y permanecen intactos en este correctivo.

## Cambio aplicado y seguridad

Solo `.github/workflows/quality.yml`: sustituir el clon de la base E2E por una base independiente creada para `kortek_migrator`, crear ese rol sin superuser/createdb/createrole/inherit/replication/bypassrls y ejecutar `prisma migrate deploy` como él mediante DATABASE_URL exclusivo de ese comando. Clave efímera `openssl rand -hex 32`, máscara GitHub antes de uso y unset después. Se mantienen el provisionador administrativo, contraseña runtime efímera y verificador runtime originales.

La base `kortek_ci_test` y el DATABASE_URL global del runner E2E conservan su preparación. Las funciones del runner siguen con su propietario original. No se transfiere ownership artificialmente después de migrar ni se relaja la guardia. No se modifica SQL, migración, producto, flags, dependencias, triggers o contratos.

Riesgo acotado: el job aplica migraciones una segunda vez en su servicio PostgreSQL efímero. Si una migración futura exige privilegios incompatibles, el paso falla; no obtiene privilegios elevados por esta corrección. Rollback Git: revertir este cambio del workflow devuelve el fallo de preparación; no implica operación sobre bases/proveedores.

## Validación local y evidencia

PostgreSQL **18.1**, clúster UUID propio en loopback/puerto efímero, sin dotenv ni datos reales. [Arnés reproducible](evidence/runtime-privilege-gate/runner.cjs.txt), [comandos, resultados, censos y limpieza](evidence/runtime-privilege-gate/report.json).

| Escenario | Resultado |
|---|---|
| Candidato, migraciones como runner + clon original | migraciones exit 0; provisionador exit 3 con excepción exacta de ownership |
| `9f04dba`, mismo rol/preparación y scripts propios | migraciones/provisionador exit 0; runtime exit 3 por CustomerOperation no revisada |
| Candidato desde cero como migrator, scripts intactos | 28 migraciones completas / 0 fallidas; provisionador y gate runtime exit 0 |
| Bloque Bash corregido del workflow | exit 0; tres transacciones y verificación runtime originales pasan |
| Censos finales | ambas funciones migrator, SECURITY INVOKER, search_path seguro; funciones E2E siguen del runner |

El bloque Bash se extrae directamente de quality.yml y se ejecuta con comandos originales; adaptación local exclusivamente del puerto 5432 a uno efímero, PGPORT para psql y preload que bloquea dotenv. El primer ensayo tuvo conexión loopback denegada por sandbox; otro tuvo formato Windows incorrecto del preload; un ensayo de reinicio entre escenarios encontró dependencias de roles. Se corrigió el arnés y se repitió con permisos de ejecución local; estos intentos no cuentan como éxito. Clústeres propios detenidos/eliminados; no se descartó trabajo ajeno.

**PG16 no se puede probar aquí:** solo está instalado PG18.1. El servicio CI sigue siendo `postgres:16`, intacto. No se ejecutaron suites de producto/QA ni se afirma CI remoto verde; el push permite reejecutar el CI del PR existente. No se crearon/asignaron aliases ni se hizo redeploy. Producción permanece cerrada.

## Deployment web confirmado por lectura

`get_alias(qa.booking.kortek.cloud)` y `get_deployment(dpl_8iqUtQ6XMYgPv1wF3FcnpbczoaWe, withGitRepoInfo=true)` confirmaron:

- Actual: **`dpl_8iqUtQ6XMYgPv1wF3FcnpbczoaWe`**, estado **READY**.
- Commit: **`b318ca591d1ca6681269a6d25e29ca106d824df9`**, ref `ai/antigravity-qa`, source `redeploy`.
- Distinto de **`dpl_KEKT6X12exUWoReFRPtxxTXGuo9K`**; mismo commit comunicado por el registro anterior.
- Host del deployment: `kortek-booking-ot41fsaea-fraylindev.vercel.app`; alias consultado presente en la respuesta del deployment.

Esta observación sustituye únicamente el identificador web anterior como estado vigente. No confirma variables, clave Clerk, login real, funcionalidad ni despliegue API. No se contactaron QA por HTTP, OCI, SSH, Clerk, bases reales o producción.
