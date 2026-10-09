# Rotación de Clerk en API QA — 2026-10-08

Gate único, base documental `554a8211133f8b9c4fb469ea6448011304cce87b`, rama `ai/reserva-invitado-ci`, árbol inicial limpio. **CLERK_SECRET_KEY ACTUALIZADA EN API QA; VERIFICACIONES DE LECTURA APROBADAS.** La rotación previa en Clerk, local y variables Vercel fue declarada por el propietario; no se consultó el panel/API Clerk ni se modificó Vercel. El propietario autorizó posteriormente adaptar y ensayar el editor, al comprobarse que el de activación solo admitía selectores públicos por argv.

## Inventario y hashes, sin valores

| Entorno | Nombres relacionados con Clerk |
| --- | --- |
| Archivo local ignorado `apps/api/.env.clerk.qa` | `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_AUTHORIZED_PARTIES`, `CLERK_INVITATION_REDIRECT_URL` |
| Archivo local ignorado `apps/web/.env.local` | `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| Archivos locales ignorados `.env`, `apps/api/.env` | Ninguna variable Clerk encontrada |
| Runtime-env y entorno cargado del API QA | `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_AUTHORIZED_PARTIES`, `CLERK_INVITATION_REDIRECT_URL` |
| Entorno cargado del worker QA | Ninguna variable Clerk encontrada; sin edición ni reinicio |

Los hashes SHA-256 de valores corresponden al valor interpretado, sin comillas delimitadoras, nunca al texto secreto mostrado. La única diferencia entre claves locales y QA fue `CLERK_SECRET_KEY`. No se sustituyeron publishable key, authorized parties ni invitation redirect.

| Objeto | Antes | Después |
| --- | --- | --- |
| `CLERK_SECRET_KEY` | `ade023b57e65d5f3ced242708c9162b91f83d6051422203f0d74eae129638d16` | `44f741aa3eea29d9a2339bdb0cd7df0081fdef8828cd081b6c2c5367a78973c7` |
| `CLERK_PUBLISHABLE_KEY` | `98687bdeb8cd80b119d1f2a9974c126549325b3fcc55e751dcf56dfef007c119` | Igual; coincide con `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` local |
| Runtime-env completo, bytes | `57871bfebb3a5af777b8858d021a50c8486bd0f3d591e68e5fad4b98a7ee815b` | `d6a94be929feb44056e3c64020127f6543de3d356fdac09e275c0362c64a57f6` |
| Copia protegida previa retenida en el host | `57871bfebb3a5af777b8858d021a50c8486bd0f3d591e68e5fad4b98a7ee815b` | Sin cambio; root:root, 0600 |
| Bytes ajenos a la línea sustituida | `816f46086719004c0e83f62ceda4b717ce1eabc907a42539c02d36969c292cd4` | Igual, conservación byte por byte |

## Editor y ejecución

Editor adaptado del mecanismo de activación, restringido a `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY`, con valor nuevo recibido por stdin del canal SSH, sin secretos en argv, herramientas, logs, Git o documentación. Rechaza claves live, duplicadas, ausentes, hashes incompatibles, cambios concurrentes, symlinks y metadatos incorrectos. Conserva las líneas ajenas, finales LF/CRLF, prefijo export y ausencia de salto final; sustitución atómica con fsync, UID/GID 0 y modo 0600.

Ensayo en archivos sintéticos temporales del host: **8 positivos + 8 negativos, exit 0** (LF/CRLF, export, salto final, duplicado, ausencia, hash de archivo, hash anterior, variable prohibida, clave live sintética, modo y symlink). Archivos sintéticos retirados. Hash del editor ejecutado: `ff06d00b4ed308fe2a44744b15a3bc2accd80f88d9731f74f0f70e5443ee0a43`. Helpers locales y resultados auxiliares permanecen ignorados en `.tmp`; no se versiona código operativo.

Inventario, ensayo, copia y actualización/verificación terminaron con exit 0. La copia protegida precedió a la sustitución. Se reinició **solo `kortek-api-staging`**, con control de rollback si fallaba una verificación. No se modificaron imagen/selectores, worker, Caddy, migraciones, bases, dependencias, contratos ni producción. No POST, fixtures, sesiones reales o escrituras de negocio.

## Verificaciones del API y worker

| Comprobación | Resultado |
| --- | --- |
| API systemd | active/running, `NRestarts=0`; PID `1515975` → `1523015` |
| APP_RELEASE cargado y selector | `b318ca591d1ca6681269a6d25e29ca106d824df9`, sin cambio |
| Imagen cargada y selector | `sha256:8ba1b6c8a45391433998deeae1111d2d96c6cbf84932a7e9972cb6cf90e95eec`, sin cambio |
| Archivo final | UID/GID 0, 0600; hash nuevo verificado; hash de secret key coincide con local y contenedor |
| Worker | active/running, `NRestarts=0`, PID `1084553`, imagen y StartedAt idénticos antes/después; sin variables Clerk |
| GET raíz `/` | 404 |
| GET `/bookings`, sin sesión | 401 |
| GET `/public/m1-c3-norte/booking-data` | 200 |
| GET `/customer/businesses` | 404 |
| GET `/customer/m1-c3-norte/bookings` | 404 |
| GET `/customer/m1-c3-norte/bookings/00000000-0000-4000-8000-000000000001` | 404 |
| GET `/customer/m1-c3-norte/profile` | 404 |
| GET `/auth/clerk/customer/claims` | 404 |
| CORS de las ocho lecturas | `Access-Control-Allow-Origin` exacto `https://qa.booking.kortek.cloud` |
| Log del nuevo contenedor desde el reinicio hasta la lectura | 8 eventos HTTP_REQUEST, todos release b318ca5; **0 HTTP 5xx** |
| Conteo de líneas de error relacionadas con autenticación Clerk | **0**; patrón insensible a mayúsculas: Clerk combinado con error/fail/invalid/unauthoriz en cualquiera de los dos órdenes; ninguna línea expuesta |

El conteo está acotado a esa ventana y patrón; no afirma ausencia histórica/global de errores. No se probó login interno con sesión/token válido ni se certifica autenticación real por las lecturas anónimas.

## Web y rollback

`get_alias(qa.booking.kortek.cloud)` y `get_deployment(..., withGitRepoInfo=true)` confirman **`dpl_KEKT6X12exUWoReFRPtxxTXGuo9K`**, READY y commit `b318ca591d1ca6681269a6d25e29ca106d824df9`. **El alias continúa en el deployment anterior; no se confirmó un deployment NUEVO como destino web de rollback.** No se ejecutó assign_alias, redeploy ni modificación Vercel. Queda pendiente que el propietario confirme el redeploy y su asociación; no se atribuye al deployment anterior la clave nueva configurada después.

**Rollback de entorno no ejecutado**, porque las verificaciones pasaron. La copia protegida permanece en el host. Si se autoriza su restauración futura, devolverá la clave vieja revocada y el login interno seguirá fallando; únicamente devuelve el API al estado previo. Este rollback de entorno no cambia código ni imagen. Los artefactos previos B2C del [cierre C3](../features/RESERVA_INVITADO_C3_CIERRE_QA.md) conservan su advertencia independiente de reexposición B2C.

## Publicación documental

Un único commit documental y push autorizado solo a `origin/ai/reserva-invitado-ci`, sin force. Prohibidos `ai/antigravity-qa` y main: el nuevo SHA documental no sustituye la pareja API/web b318ca5. Diff/staged, enlaces y ausencia de valores secretos revisados; sin builds por tratarse de documentación. SHA y Git final se entregan en el relevo, sin inventar un hash antes de crear el commit.
