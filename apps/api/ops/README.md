# Operación PostgreSQL: integridad y roles separados

Este procedimiento no sustituye una autorización sobre el destino. Antes de operar otra QA, confirmar servidor, base, propietario, cambios pendientes y respaldo restaurable. No copiar datos reales como fixtures funcionales. No usar `db push --accept-data-loss` ni editar el ledger para ocultar drift.

## Configuración local

- Docker conserva el proyecto `barberflow-os` y el volumen `barberflow-os_postgres_data`, para no inicializar accidentalmente otra base vacía al renombrar el repositorio. Publica únicamente `127.0.0.1:5432`.
- `.env` raíz, ignorado: `POSTGRES_PASSWORD` administrativo de inicialización/recuperación. En un volumen existente cambiar esa variable **no rota** la contraseña almacenada en PostgreSQL; la rotación requiere una operación administrativa explícita.
- `apps/api/.env`, ignorado: `DATABASE_URL` con `kortek_runtime`, sin privilegios administrativos.
- `apps/api/.env.migrations.local`, ignorado: `DATABASE_URL` con `kortek_migrator`, secreto distinto; nunca iniciar la API con este archivo.
- Usar secretos aleatorios y permisos de archivo restringidos. No imprimir URLs completas, copiar secretos en tickets ni incluirlos en Git.

## Aplicación a un destino autorizado

1. Verificar un respaldo temporal mediante restauración aislada. Comparar conteos/huellas sin publicar filas; para una base activa usar un snapshot consistente. Una copia restaurada hoy no prueba recuperación de pérdidas anteriores.
2. Como administrador del destino, inspeccionar `prisma migrate status` y aplicar solamente las migraciones revisadas. `20260909120000_restore_invoice_integrity_checks` es aditiva, transaccional, repetible y fail-closed ante históricos inválidos o checks alterados; no convierte datos ni reescribe migraciones antiguas.
3. Después de aplicar las 26 migraciones vigentes, ejecutar `provision-database-roles.sql` con `psql -f` y una conexión administrativa a **esa base**. Transfiere únicamente objetos de su esquema público y propiedad de esa base al migrador; no utiliza `REASSIGN OWNED`. Mantiene al administrador para recuperación. Rechaza roles de aplicación preexistentes con privilegios elevados o memberships inesperadas. Incluye `apply-runtime-grants.sql` mediante `\ir`: matriz explícita de S/I/U/D por tabla; Invoice, Payment y registros/auditoría no reciben DELETE. No concede DML por defecto a tablas nuevas.
4. Asignar contraseñas distintas a los roles mediante el mecanismo seguro del operador (por ejemplo `\password` de psql, que evita escribirlas en el historial SQL), y configurar los dos archivos locales. En despliegues, inyectar cada credencial desde su gestor de secretos en su proceso correspondiente.
5. Conectar por TCP **como runtime** y ejecutar `verify-runtime-role.sql`. Debe carecer de ownership, DDL, TEMP, acceso al ledger y memberships. Comprueba los 31 objetos `public` contra la matriz exacta, incluyendo la tabla de rate limiting; falla ante un DELETE financiero/auditoría reaparecido, TRUNCATE/REFERENCES/TRIGGER en cualquier tabla, MAINTAIN en PostgreSQL 17+, una tabla nueva sin revisión o default ACL de tablas para runtime/PUBLIC. PostgreSQL 16 sigue siendo compatible. No es un control de tenant: la autorización y los filtros tenant de la API siguen siendo obligatorios.
6. Verificar integridad, arranque y lecturas autenticadas antes de retirar el respaldo temporal. No eliminar respaldos preexistentes ajenos. Eliminar solamente las copias/restauraciones creadas para esta operación cuando se haya comprobado su resultado.

## Comandos habituales (desde `apps/api`)

```powershell
# Generar y compilar usando la configuración normal; no cambia datos.
pnpm exec prisma validate
pnpm exec prisma generate
pnpm build

# Catálogos críticos: transacción READ ONLY, sin seleccionar filas de negocio.
node --env-file=.env dist/prisma/verify-integrity.cli.js

# Estado, migración y drift usando exclusivamente el migrador.
node --env-file=.env.migrations.local node_modules/prisma/build/index.js migrate status
node --env-file=.env.migrations.local node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.migrations.local node_modules/prisma/build/index.js migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
```

El verificador complementario cubre checks/exclusiones, cuatro FKs tenant y cinco índices críticos; no pretende sustituir el diff completo, el ledger ni el control de privilegios. Sale con código 1 ante diferencias y 2 ante indisponibilidad; no imprime errores de conexión potencialmente sensibles. Una diferencia textual inesperada entre versiones PostgreSQL exige revisión, no aceptar automáticamente un check por su nombre.

## Recuperación ante fallos

Los servicios gratuitos productivos, timers, credenciales, alertas y restore
están documentados en [el runbook OCI](../../../ops/oci-free-backup/README.md).
Para comprobar D5, compilar y ejecutar `node ops/rate-limit-http-drill.cjs` desde
`apps/api` con la URL TLS runtime del proyecto Supabase QA designado en el entorno.
El script rechaza otros proyectos, usa solo loopback, limita solicitudes inválidas
y apaga sus procesos al terminar. No introducir la URL en argumentos ni logs.
`node ops/production-startup-drill.cjs` prueba el entrypoint compilado con CORS
ausente/local/wildcard, secretos ausentes, claves Clerk de desarrollo, roles de
migración/administración, TLS sin verificación estricta, opción duplicada,
override de socket, protocolo inválido, interruptores con espacios y NODE_ENV
incoherente con staging/producción. Debe terminar con exit `0` tras
comprobar que cada proceso hijo rechaza el arranque con exit `1` antes de Nest.

Staging/producción requiere `NODE_ENV=production`, incluso cuando esa variable
no esté declarada. Los cuatro interruptores `PUBLIC_BOOKING_CLOSED`,
`REQUIRE_INTERNAL_MFA`, `NOTIFICATIONS_EMAIL_ENABLED` y
`NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED` solo admiten los valores literales `true`
y `false`: no añadir espacios ni depender de trim. Sus consumidores comparan
el valor original y un espacio podría apagar un control si se aceptara.

Con `DEPLOY_ENV=production`, Clerk exige prefijos `sk_live_` y `pk_live_`.
Es una comprobación de configuración; no verifica por sí sola que la clave
exista ni que pertenezca a la instancia correcta. Staging puede usar su instancia
de desarrollo aislada. API staging/producción exige un usuario `kortek_runtime`
o `kortek_runtime.<project-ref>`, TLS remoto y `sslaccept=strict` explícito;
rechaza `host` y opciones `sslmode`/`sslaccept` duplicadas. El gate SQL sigue
verificando los privilegios efectivos del rol. En Prisma 6, `sslmode=require`
por sí solo no fija una verificación estricta: [documentación del conector](https://www.prisma.io/docs/orm/v6/overview/databases/postgresql).

Después de compilar, `node ops/verify-clerk-production.cjs` comprueba la clave
inyectada mediante `CLERK_SECRET_KEY` y `CLERK_PUBLISHABLE_KEY`. Verifica primero
la instancia productiva `ins_3JrrToaAqH6sYe2bFXr3TdVnc3L`, luego el dominio
`booking.kortek.cloud` y su issuer. Solo imprime metadatos públicos y conteo de
usuarios; no revela claves, identidades ni errores crudos. Usa el SDK instalado
(`client.instance.get()`) y plazo máximo de 45 segundos. Es una consulta de
proveedor: no prueba una sesión, no asigna roles y no inicia la aplicación.
Inyectar la clave desde el gestor seguro; nunca pasarla en argumentos o logs.

`node ops/clerk-production-session-smoke.cjs`, con `C1_CLERK_SESSION_SMOKE=true`,
exige la única identidad de prueba y una sesión activa propia, sin impersonación,
en Clerk Production; admite varias sesiones legítimas de esa misma identidad.
Inyectar claves live, `APP_RELEASE` y URL runtime de Supabase productivo con CA
estricta; necesita API compilada y `.env` local para la configuración de medios.
Verifica correo/sesión, bootstrap del servicio en transacción READ ONLY y arranque
productivo de la API solo en loopback 3341, con EMAIL/reserva cerrados. Comprueba
401 para token inválido y token BAPI sin azp, ausencia de acceso tenant y CORS sin
localhost. No crea usuarios, sesiones ni Membership. Token BAPI y logs quedan en
memoria; salida solo agregada. Plazo máximo 90 s y procesos retirados al terminar.
Este resultado **no prueba** una petición autenticada positiva navegador → API:
el token BAPI observado no tiene azp y debe ser rechazado. No retirar la allowlist
ni inventar azp para lograr un 200. Ese smoke positivo sigue pendiente del frontend
autorizado. Durante C1, el portal redirige registro/login al perfil HTTPS de Clerk;
los destinos onboarding/dashboard de la web se configurarán al activar el servicio.

`APP_RELEASE` debe ser el SHA Git del artefacto desplegado; producción rechaza
su ausencia o un valor no hexadecimal. La telemetría HTTP no acepta un ID
proporcionado por el cliente ni registra cuerpos/errores crudos.

### Configuración web D8

Next valida `next build` y `next start` mediante
[`web-deployment-config.ts`](../../web/lib/web-deployment-config.ts).
Ambos exigen `DEPLOY_ENV` explícito. Para build/arranque local y CI, declarar
`development`, API local y el par Clerk test; `next dev` conserva su uso local.
Staging/producción exigen `WEB_PUBLIC_ORIGIN`, `NEXT_PUBLIC_API_URL` y ambas
claves Clerk del entorno, con los dominios HTTPS exactos del
[manifiesto](../../../config/environments.yaml). La clave privada solo se
inyecta al servidor; nunca usar un nombre NEXT_PUBLIC para ella.

Los valores públicos quedan incorporados al build. BUILD_ID contiene un hash
de DEPLOY_ENV, origen web, URL API y clave publicable; start rechaza si cambian.
Recompilar cuando cambien esos valores. La clave privada queda fuera del hash,
por lo que puede rotarse dentro de la misma instancia sin reconstruir.
Artefactos anteriores a este control deben reconstruirse antes de arrancar.
El cliente HTTP no usa localhost por defecto en artefactos optimizados.

`pnpm --filter web exec node scripts/web-startup-drill.mjs` prueba 16 rechazos
reales de CLI con fixtures sin secretos. Tras build productivo, `--positive`
con `C1_WEB_CONFIG_SMOKE=true` y las mismas variables inyectadas comprueba dos
mezclas rechazadas, rewrite productivo y portada 200 solo en loopback 3342;
retira el proceso al terminar. Estos comandos no despliegan ni prueban login.

`node ops/rollback-http-drill.cjs` realiza D12 después de compilar. Lee la URL
runtime de `.env` y exige que sea local, puerto 5432, usuario `kortek_runtime`.
Inyectar `ROLLBACK_ADMIN_PASSWORD` del administrador de emergencia solo en el
proceso del ensayo; el script la elimina del entorno de las APIs/worker hijos.
Crea dos clones nuevos desde `kortek_c1_rollback_source` y recupera en un tercer
clon nuevo; preserva las bases anteriores. Usa puertos loopback 3331–3334 y los
cierra en finally. El resultado debe incluir caída HTTP, congelamiento, cobros
concurrentes, IDOR, 31 huellas iguales y worker disabled `--once` exit `0`.
Los dumps y evidencia local se conservan en `.tmp/base-preprod-c1/` ignorada.

- Un fallo de validación de históricos no autoriza normalizar, borrar ni inventar datos. Detenerse y acordar la resolución.
- Si falla el arranque con runtime, verificar permisos con el administrador; no ampliar la API a superusuario como solución permanente.
- Una nueva migración crea objetos como migrador **sin DML por defecto** para runtime. Debe declarar sus GRANT explícitos y actualizar `verify-runtime-role.sql` antes del deploy; el gate falla ante objetos no revisados.
- El rol de inicialización del clúster Docker es bootstrap y PostgreSQL no permite quitarle `SUPERUSER`. En C1 quedó `NOLOGIN NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 0`; conserva solo el atributo elevado `SUPERUSER` del bootstrap y sus dependencias compartidas; nunca borrarlo ni ejecutar `REASSIGN OWNED`/`DROP OWNED` globales sin reconstrucción y ensayo aprobados.
- Ejecutar `inventory-legacy-role.sql` en **cada base conectable** del clúster como administrador, con `ON_ERROR_STOP=1`. El censo READ ONLY enumera owner OID en todos los catálogos, incluidos esquemas del sistema: `pg_shdepend` no registra todas las dependencias de un rol bootstrap fijado. Solo selecciona direcciones de objetos, nunca filas completas de catálogos como suscripciones que pueden contener credenciales. Distinguir memberships recibidas/otorgadas al rol de registros donde únicamente figura como grantor. Guardar la metadata completa en almacenamiento local protegido, fuera de Git.
- Si no puede demostrarse la restauración o conservación de datos, conservar temporalmente la evidencia protegida y detener cualquier paso irreversible.
