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
3. Después de aplicar las 25 migraciones vigentes, ejecutar `provision-database-roles.sql` con una conexión administrativa a **esa base**. Transfiere únicamente objetos de su esquema público y propiedad de esa base al migrador; no utiliza `REASSIGN OWNED`. Mantiene al administrador para recuperación. Rechaza roles de aplicación preexistentes con privilegios elevados o memberships inesperadas. Concede DML histórico amplio a tablas anteriores, excluye el ledger y ajusta las cinco tablas de Medios y sus enums al contrato C1/C3.
4. Asignar contraseñas distintas a los roles mediante el mecanismo seguro del operador (por ejemplo `\password` de psql, que evita escribirlas en el historial SQL), y configurar los dos archivos locales. En despliegues, inyectar cada credencial desde su gestor de secretos en su proceso correspondiente.
5. Conectar por TCP **como runtime** y ejecutar `verify-runtime-role.sql`. Debe carecer de ownership, DDL, TEMP, TRUNCATE, acceso al ledger y pertenencia al migrador. Conserva DML de aplicación y uso/lectura de secuencias; Medios exige SELECT/INSERT/UPDATE sin DELETE en cuatro tablas, SELECT/INSERT sin UPDATE/DELETE en `MediaOperation` y USAGE de tres enums. No es un control de tenant: la autorización y los filtros tenant de la API siguen siendo obligatorios.
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

- Un fallo de validación de históricos no autoriza normalizar, borrar ni inventar datos. Detenerse y acordar la resolución.
- Si falla el arranque con runtime, verificar permisos con el administrador; no ampliar la API a superusuario como solución permanente.
- Una nueva migración crea objetos como migrador. Sus privilegios por defecto conceden DML al runtime; los objetos internos que no necesite la API deben revocarlo explícitamente.
- Si no puede demostrarse la restauración o conservación de datos, conservar temporalmente la evidencia protegida y detener cualquier paso irreversible.
