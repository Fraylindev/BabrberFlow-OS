# Cutover QA y API de staging — 2026-09-28

**API IMPLEMENTADA / EN REVISIÓN; WEB PREVIEW PENDIENTE DE NUEVA DEPLOYMENT.**
El propietario confirmó cada escritura real de esta preparación. El alcance
es Supabase Cutover QA `prirlabbnlcuvnzuaczp`, dos fixtures sintéticos y una
segunda API en la VM OCI existente. El código desplegado del API es el commit
publicado `b0357af6b237466f7e5e17c2eff0901e2336ded1` (C1); el frontend C2
local no se ha publicado. El commit local de este checkpoint no supone push ni
aprobación final.

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
  `LEGACY_UNCONFIRMED`/`SQL_NULL`, revisión 0. Cero User, Membership,
  reservas, turnos, cierres o dependencias. El trigger existente creó dos
  borradores CMS sin publicar. No se copiaron filas ni identificadores de
  Dental Ross o Prueba de oro.

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

Los 404/401 acreditan transporte y protección de ruta, no un recorrido
autenticado de negocio. Los fixtures no tienen Membership por decisión expresa;
por tanto, el QA de edición de horario mediante Preview aún no está acreditado.

## Vercel Preview y siguiente gate

El proyecto Vercel `kortek-booking` ya tenía `qa.booking.kortek.cloud` asignado
a la rama `ai/antigravity-qa`, con DNS/TLS válido y GET 200. No se creó un
segundo alias web. Preview tiene `DEPLOY_ENV=staging`,
`NEXT_PUBLIC_API_URL=https://api.staging.booking.kortek.cloud`, y la clave
pública Clerk QA (`pk_test_`) coincide por SHA-256 con la local. La variable
`WEB_PUBLIC_ORIGIN` se corrigió en Preview a
`https://qa.booking.kortek.cloud`; existe `CLERK_SECRET_KEY` tipo Secret, cuyo
valor Vercel no revela. No se modificaron variables de Production.

Vercel indica que se necesita una nueva deployment para aplicar variables.
No se redeplegó el commit remoto anterior: su validación web todavía exige
`staging.booking.kortek.cloud`, mientras el ajuste local aprobado exige el
alias QA. Tras el push expresamente autorizado, la rama podrá compilar el
ajuste y habrá que verificar artefacto, navegador, Clerk y flujo funcional.
La autorización de push sigue pendiente; ningún build o smoke sustituye el
QA frontend ni la aprobación final del propietario.
