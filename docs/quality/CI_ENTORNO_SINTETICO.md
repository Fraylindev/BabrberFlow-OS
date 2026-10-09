# Entorno sintético del CI y lectura API — 2026-10-08

**VALIDADO LOCALMENTE / IMPLEMENTADO / EN REVISIÓN.** Base `f1d2b6c168bbb93f5861a6c3390292e571a814b0`, rama autorizada `ai/reserva-invitado-ci`, árbol inicial limpio. Alcance: variables del workflow, pruebas locales sin dotenv y lectura mínima del API expresamente confirmada por el propietario. Sin modificaciones de producto, contratos, migraciones, SQL, aserciones, fixtures, flags ni dependencias versionadas. No se abre otro gate de producto.

## Lectura autorizada del API

`systemctl show` limitado a MainPID/ActiveState/NRestarts; `podman inspect --format '{{.Image}}'` y una ejecución Node limitada a APP_RELEASE en el contenedor rootless documentado. Sin archivos de entorno, volcado de variables, reinicios, consultas a bases ni cambios remotos. La revisión automática rechazó inicialmente SSH por la prohibición del gate anterior; el propietario confirmó explícitamente esta lectura y la ejecución posterior fue autorizada.

| Metadato | Resultado vivo |
|---|---|
| MainPID | 1523015 |
| ActiveState | active |
| NRestarts | 0 |
| Imagen | sha256:8ba1b6c8a45391433998deeae1111d2d96c6cbf84932a7e9972cb6cf90e95eec |
| APP_RELEASE | b318ca591d1ca6681269a6d25e29ca106d824df9 |

Coincide con lo esperado. [Evidencia mínima](evidence/ci-synthetic-env/api-read.json). No acredita login ni funcionamiento de proveedores.

## Inventario por paso (nombres y alcance, sin valores)

La columna «necesidad» distingue requisitos del código de variables que se heredan sin ser necesarias para ese comando.

| Paso de quality.yml | Variables necesarias | Alcance/estado del workflow |
|---|---|---|
| Checkout, setup pnpm/Node | Ninguna variable de aplicación | Entorno intrínseco del runner |
| Install dependencies; Dependency and peer audit | Ninguna variable de aplicación | Registro/lockfile; entorno del runner |
| Create isolated PostgreSQL database and role | PGPASSWORD | Paso, existente; POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB pertenecen al servicio PostgreSQL |
| Prisma validate/generate/deploy/status/diff | DATABASE_URL | Job, existente |
| Runtime privilege matrix gate | PGPASSWORD, DATABASE_URL; KORTEK_CI_MIGRATOR_PASSWORD, KORTEK_CI_RUNTIME_PASSWORD | PGPASSWORD del paso; URL del migrator limitada al comando; contraseñas locales efímeras ya existentes |
| TypeScript and lint API/web | Ninguna credencial adicional; DEPLOY_ENV para la fase de generación de tipos web | Job, existente; sin arranque API |
| Unitarias API | JWT_SECRET; DATABASE_URL para integraciones que estén activas; NODE_ENV, DEPLOY_ENV definen modo | JWT_SECRET faltaba; generado/exportado solo en este paso. Resto existente en job |
| Unitarias web | Ninguna credencial externa obligatoria | Las pruebas construyen configuraciones sintéticas; entorno del job |
| Componentes web | Ninguna credencial externa obligatoria | Mocks y jsdom existentes; entorno del job |
| Build API | Ninguna credencial adicional | Compila sin arrancar AuthModule ni configuración de producción |
| Build web | DEPLOY_ENV, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY | Job, todas existentes; WEB_PUBLIC_ORIGIN solo obligatorio en staging/production |
| PostgreSQL integrity | DATABASE_URL | Job, existente; CLI consulta catálogo en transacción READ ONLY |
| E2E API | DATABASE_URL, E2E_PRIMARY_DATABASE_NAME, E2E_PRIMARY_DATABASE_USER, JWT_SECRET; NODE_ENV, DEPLOY_ENV definen modo | Primeras tres existentes en job; JWT_SECRET faltaba, generado/exportado solo en este paso |
| Browser smoke | Variables del build web al iniciar Next; CI | Job y CI intrínseco; fixtures de red sintéticos ya existentes, sin proveedor real |

Fuentes: [workflow](../../.github/workflows/quality.yml), [AuthModule](../../apps/api/src/auth/auth.module.ts), [JwtStrategy](../../apps/api/src/auth/strategies/jwt.strategy.ts), [setup E2E](../../apps/api/test/global-setup.ts), [configuración web](../../apps/web/lib/web-deployment-config.ts), [Next config](../../apps/web/next.config.ts), [Playwright](../../apps/web/playwright.config.ts), [CLI integridad](../../apps/api/src/prisma/verify-integrity.cli.ts).

### Comparación con el arnés anterior

El arnés `apps/api/test/guest-postgres-run.cjs` inyectaba JWT_SECRET, RATE_LIMIT_SECRET, NOTIFICATIONS_EMAIL_ENABLED y NODE_OPTIONS para impedir dotenv. Para integraciones añadía C1_RUNTIME_DATABASE_URL, RUN_POSTGRES_INTEGRATION y RUN_BUSINESS_SCHEDULE_INTEGRATION. GUEST_PG_BIN/GUEST_RUN_FULL_API controlaban el arnés, no el producto.

Solo JWT_SECRET es obligatorio y estaba ausente: AuthModule lanza al importarse y JwtStrategy necesita la clave. RATE_LIMIT_SECRET tiene fallback a JWT_SECRET en AppModule/AuthService; la nueva clave efímera cumple la longitud requerida. El correo exige NOTIFICATIONS_EMAIL_FROM, NOTIFICATIONS_EMAIL_REPLY_TO, RESEND_API_KEY, RESEND_WEBHOOK_SECRET y NOTIFICATIONS_ABUSE_SECRET únicamente al activarse NOTIFICATIONS_EMAIL_ENABLED junto a NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED. No se activan esos flags. Los providers Clerk son lazy; CLERK_PUBLISHABLE_KEY, CLERK_AUTHORIZED_PARTIES y CLERK_INVITATION_REDIRECT_URL no se requieren para arrancar las suites con mocks. MEDIA_CLOUDINARY_QA activa expresamente la suite real y permanece sin definir. No se añaden estas variables ni se cambian las omisiones previstas del workflow.

Las variables de configuración remota APP_RELEASE, HOST, PORT, RATE_LIMIT_SECRET, WEB_PUBLIC_ORIGIN, API_PUBLIC_ORIGIN, CORS_ALLOWED_ORIGINS, CLERK_PUBLISHABLE_KEY, CLERK_AUTHORIZED_PARTIES, CLERK_INVITATION_REDIRECT_URL, PUBLIC_BOOKING_CLOSED, REQUIRE_INTERNAL_MFA, NOTIFICATIONS_EMAIL_ENABLED, NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED y CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET solo son exigidas por validateProductionConfig al arrancar API en producción/staging. El CI compila y prueba API en su modo sintético; las pruebas de esa función construyen entornos explícitos propios.

El arnés web anterior también usaba respuestas locales para Google Fonts y webpack. No se inyectan NEXT_FONT_GOOGLE_MOCKED_RESPONSES, NODE_OPTIONS ni configuraciones alternativas en este ensayo: se conserva el build original y las configuraciones Vitest/Playwright del repositorio.

## Cambio y validación

Solo se genera JWT_SECRET con `openssl rand -hex 32`, se enmascara antes de exportarlo y se elimina al terminar los pasos Unit and component tests y PostgreSQL integrity and isolated E2E. Las claves son independientes entre pasos; no hay valor persistente ni GitHub Secret nuevo.

El nuevo arnés obtiene literalmente los bloques run/env del YAML en un checkout Git temporal sin dotenv. Hereda únicamente variables del sistema operativo necesarias para ejecutar herramientas, el env del job/paso y CI intrínseco. Usa PG18.1 recién inicializado, loopback, puerto efímero, los mismos roles y bases del workflow. Adaptaciones locales: puerto, contraseña administrativa del clúster propio y PATH Windows para psql. No añade variables de aplicación del arnés anterior.

Se reutilizan las versiones instaladas. Un primer intento con enlaces de node_modules disparó la reconciliación automática de pnpm y falló en resolución del CLI Prisma; no cuenta como validación. Se repararon los enlaces hacia los mismos paquetes instalados y se desactivó esa reconciliación solo mediante `.npmrc` del checkout temporal. El primer build fue rechazado por Turbopack porque el enlace a Next cruzaba la raíz del checkout: fallo local, no falta de una variable. Se materializaron los mismos paquetes dentro de la raíz mediante hardlinks/copia, con enlaces y cachés propios; el build original pasó después. También se restauraron wrappers/metadatos del workspace principal. No se modifican lockfile, manifests ni versiones. PG16 y el runner Linux de GitHub no se pueden reproducir aquí.

| Comando/paso original | Resultado local |
|---|---|
| Prisma validate/generate/deploy/status/diff | Exit 0; 28 migraciones, sin diferencias |
| Runtime privilege matrix gate | Exit 0, sin relajar guardia ni matriz |
| TypeScript y lint API/web | Exit 0 |
| Unit and component tests | Exit 0; API 836 aprobadas/41 omitidas; web 158 unitarias + 130 componentes aprobadas |
| Production builds | Exit 0 API/web; Next/Turbopack original, sin mock de Google Fonts ni webpack alternativo |
| PostgreSQL integrity and isolated E2E | Exit 0; catálogo OK, API 272 aprobadas/1 omitida |
| Browser smoke tests | Exit 0; 21 aprobadas/1 omitida, configuraciones y fixtures originales |

Omisiones preexistentes por condiciones ya presentes en las suites: no se cambian flags ni selección de pruebas. Esta ejecución limpia no equivale a los ensayos anteriores que activaban integraciones opt-in. Los dos pasos afectados por JWT_SECRET pasan; también pasan los pasos posteriores del workflow. No faltó otra variable. No se ejecutaron por separado los pasos Install dependencies y Dependency and peer audit: este gate no modifica dependencias y esa validación ya estaba verde en Quality #56. La reconciliación automática de pnpm de los ensayos iniciales se conserva en sus logs; reutilizó el lockfile sin versiones nuevas.

Evidencia: [primer ensayo, resolución de dependencias](evidence/ci-synthetic-env/local-a961fc6b-b76c-4938-aa2e-28b11fa36f72/report.json), [unitarias/tipos/runtime y fallo local de enlaces en build](evidence/ci-synthetic-env/local-b4479c04-0636-41bd-9934-622d2fb77da7/report.json), [repetición build/integridad/E2E/browser](evidence/ci-synthetic-env/local-d8696080-661f-4f0d-ad3a-5c19e5692b3b/report.json), [arnés exacto](evidence/ci-synthetic-env/runner.cjs.txt). Todos los clústeres propios se detuvieron y eliminaron; logs con contraseñas efímeras, JWT y URLs de conexión omitidos.

## Publicación autorizada

Un commit y push sin force únicamente a `ai/reserva-invitado-ci`. Base remota QA antes del push: `f1d2b6c168bbb93f5861a6c3390292e571a814b0`; main: `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6`. El árbol de apps sigue idéntico a b318ca5 (`5374774fb9f0f9a088c15f3ab6c069342835beb3`); no se publica código de producto ni se toca infraestructura remota.

[Comparación para abrir un PR nuevo, base ai/antigravity-qa](https://github.com/Fraylindev/BabrberFlow-OS/compare/ai%2Fantigravity-qa...ai%2Freserva-invitado-ci?expand=1). No se crea el PR ni se presupone su CI aprobado. El workflow no se dispara por push a esta rama temporal sin PR abierto; el nuevo PR permitirá la ejecución posterior del runner/PG16.
