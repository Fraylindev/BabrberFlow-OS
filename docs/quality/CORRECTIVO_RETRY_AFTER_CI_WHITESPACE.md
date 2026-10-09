# Retry-After, comandos CI y atributos de evidencia — 2026-10-07

Gate único local autorizado sobre `58f536f15fc49381513f327865ecaea0d7c5e121`, rama `ai/antigravity-qa`, árbol inicial limpio. Referencia remota exclusivamente local `9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4`; sin fetch ni push. **IMPLEMENTADO / EN REVISIÓN**, sin aprobación de cierre ni apertura de QA/producción.

Resultado buscado: el visitante recibe un tiempo de reintento coherente con el bloqueo compartido; el mantenedor ejecuta pruebas reales con pnpm 11, y conserva los bytes de evidencia histórica. Producto autorizado únicamente en `PostgresThrottlerStorage`. Sin dependencias, contratos, Prisma/migraciones, proveedores, flags persistentes ni bases reales modificados.

## Inventario previo e impacto

`AppModule` registra una sola instancia/configuración de storage en `ThrottlerModule.forRootAsync`. No hay guard global ni otros consumidores directos en código ejecutable. Se inspeccionaron controllers, guards y registros AuthModule/MediaModule antes de editar. **37 handlers** usan el storage mediante `ThrottlerGuard`; todos tienen ventana de 60 s y bloqueo heredado de 60 s. Los números de la tabla son límites por minuto por handler/tracker, no por negocio:

| Superficie | Handlers | Presupuesto |
|---|---|---|
| Reserva pública | GET `/public/:slug/availability-days`, GET `availability`, GET `booking-data`, POST `bookings` | 30, 30, 100, 5 |
| Auth legacy | POST `/auth/register`, POST `login`, POST `invite`, PATCH `update-password` | 10, 5, 20, 10 |
| Clerk interno | GET `/auth/clerk/bootstrap`, POST `onboarding` | 30, 10 |
| Invitaciones | POST `/auth/clerk/invitations`, POST `:id/resend`, POST `:id/revoke`, POST `:id/accept` | 10, 5, 10, 10 |
| Equipo | PATCH `/organizations/mine/team-members/role`, POST `revoke` | 10, 10 |
| CMS | GET `/organizations/mine/cms`, GET `preview`, PATCH `draft`, POST `publish`, POST `unpublish` | 30 cada uno |
| Medios | GET `/media`, POST `uploads`, PATCH `:id`, POST `:id/publish`, POST `:id/retire`, POST `:id/quarantine` | 30 salvo uploads=5 |
| Orden de galería | GET `/media/gallery-order`, PATCH misma ruta, POST `publish` | 30 cada uno |
| Promociones | GET `/media/promotions`, POST misma ruta, PATCH `:id`, POST `:id/publish`, POST `:id/retire` | 30 cada uno |
| Medios públicos | GET `/public/:slug/media`, GET `:token` | 60, 120 |

El impacto común es el cálculo de `timeToExpire`/`timeToBlockExpire`, que el guard copia a X-RateLimit-Reset/Retry-After. No cambian presupuestos, scopes por handler/tracker, HMAC, permisos, rutas ni cuerpos. Los módulos sin guard siguen sin adquirirlo. No hay storage B2C registrado tras el retiro de ese módulo. Los Retry-After de adaptadores de proveedor no consumen este storage y quedan fuera.

## Correctivo y garantías

La misma consulta `INSERT ... ON CONFLICT ... RETURNING` calcula segundos restantes desde timestamps PostgreSQL contra el mismo `NOW()` que crea/reinicia la ventana y el bloqueo. `GREATEST(0, ...)` conserva cero al vencer y `CEIL(.../1000)::integer` redondea hacia arriba, incluso con una fracción positiva de milisegundo. `LEAST(duración configurada, restante)` evita superar la duración cuando una transacción más antigua observa un bloqueo creado por otra más reciente mientras esperaba; no sustituye el reloj autoritativo por una cota aplicada a Node.

Contador/condiciones del upsert intactos: 30/min en disponibilidad, bloqueo de 60 s, incremento atómico compartido, bloqueo activo conservado, reset solamente tras vencer ventana y bloqueo. HMAC y limpieza existentes intactos. `Date.now()` continúa únicamente como reloj de programación/umbral de limpieza; no decide bloqueo ni headers. Dependencia ausente/fallida conserva 503 genérico fail-closed, sin exponer tracker, SQL o detalles privados. No hay migración; rollback del correctivo consiste en revertir exclusivamente su commit local, previa autorización si se necesitara.

Se añaden seis unitarias y ocho e2e PostgreSQL/HTTP: rangos de headers, redondeo positivo, expiración exacta, reset, ventana vencida con bloqueo activo, 80 peticiones concurrentes entre dos aplicaciones/clientes (30 éxitos y 50 rechazos), transacciones con NOW anterior y clocks Node simulados ±24 h. Un caso utiliza dos procesos Node hijos reales con relojes opuestos, aislamiento comprobado en cada hijo y el mismo contador. Su presupuesto de arranque es 20 s, con techo de 8 s por hijo; no reintenta ni altera aserciones. El controller auxiliar existe solo en el módulo de prueba.

**Archivo original `public-booking-m1.e2e-spec.ts` íntegro e intacto:** blob `847cce7a3ddf1687f118f4b26e9dce97a4c291b3`, igual a la base. El caso «30/min compartido» se ejecuta solo en cada muestra fría, con procesos nuevos y `--no-cache`. Instrumentación temporal añade únicamente observación numérica del header en memoria al transformador del test, sin editar su archivo, producto, SQL, relojes ni assertions. Los 16 casos no seleccionados no forman parte del denominador de estos ensayos; las suites completas se ejecutan aparte.

## Evidencia de ejecución

PG18.1 exclusivamente loopback, UUID/directorio/puerto/base `_test` propios por intento, migrador/runtime no elevados, 28 migraciones intactas y gate runtime. Preload impide dotenv; el arnés final bloquea red externa en Node y resolución externa en Chrome. Ningún proveedor contactado. Credenciales efímeras del clúster permanecen fuera de evidencia, argumentos y commits; outputs saneados. No se instala ninguna dependencia.

Línea base actual: unitarias **871/0/0**, e2e **263/1/1**; único fallo e2e, Retry-After=61 frente a <=60. Browser base exit 0 sobre los mismos 22 casos/proyectos. La línea base unitaria carga el storage exacto de `58f536f` mediante transformador temporal y excluye únicamente el nuevo archivo unitario, sin revertir el worktree.

Resultado posterior final: **unitarias 877/0/0, e2e 272/0/1 (273 total), browser 21/0/1 (22 total)**. Todos los comandos correspondientes terminan exit 0; ninguna falla local vigente. pnpm 11.18.0 ejecuta las seis unitarias nuevas y los ocho e2e nuevos. Tipos, lint completo y build API: exit 0. Web: lógica 158/158, componentes 130/130, build offline exit 0. El browser final reutiliza ese build recién validado, con configuración coincidente y ninguna fuente web modificada. ID PG18 final `0d91b1d5cb344c2e9c289afd517cba80`, 28 migraciones/gate runtime exit 0, stop exit 0, cleanup=true. Browser final: cero flaky y cero retries. Las omisiones exactas están en los límites inferiores.

**20/20 ensayos fríos pasan:** distribución `{60:20}`, mínimo=máximo=60, ninguno >60 ni <1. Veinte IDs distintos, veinte clústeres nuevos detenidos y eliminados; exit 0 del caso original en cada intento. [Muestras](evidence/retry-after-ci-whitespace/frio-20.json).

Se conservan las iteraciones fallidas: dos preparaciones bloqueadas por permisos de loopback del sandbox; adaptador unitario con marcador incorrecto antes de crear clúster; dos ensayos unitarios con ruta relativa inválida; primer e2e posterior 270/1/1 por `pg_sleep` de tipo void en helper; segundo 271/1/1 por techo Jest de 5 s en el nuevo caso de dos procesos. El helper devuelve ahora un entero y el caso tiene presupuesto explícito para dos arranques. Una ejecución web adicional pasó lógica pero Vitest se detuvo por dotenv bloqueado; config temporal `envDir=false` permitió luego componentes completos. Nada se descarta del registro ni se cuenta como éxito; no son reintentos para ocultar el fallo original. [Resultados, comandos y límites](evidence/retry-after-ci-whitespace/validacion.json).

## Workflow y whitespace

Diff de `.github/workflows/quality.yml` limitado a quitar dos separadores: `pnpm --filter api test --runInBand` y `pnpm --filter api test:e2e --runInBand`. No hay otras invocaciones Jest afectadas en los workflows. pnpm **11.18.0** confirmado localmente; los comandos ejecutan 877 unitarias (integraciones activadas en este ensayo) y descubren 273 e2e, en lugar de cero. JSON/reporter como argumentos adicionales de observación. PG16/CI remoto no se ejecutan ni se afirman verificados; el workflow conserva su servicio PG16 y todos los demás pasos.

Única línea nueva en `.gitattributes`: `docs/quality/evidence/**/*.txt whitespace=-blank-at-eol,-blank-at-eof`. Sin text/eol, normalización, filtros o edición de evidencias previas. **40 hashes SHA-256 de .txt existentes idénticos**; [manifiesto](evidence/retry-after-ci-whitespace/txt-hashes.json). Antes de la regla, rango `origin/ai/antigravity-qa..HEAD`: exit 2, siete diagnósticos .txt históricos. Con la regla: **exit 0**, sin diagnósticos restantes. El cotejo posterior a los tres commits se entrega mediante Git, sin fetch.

## P4b suplementario y separación

Revisión del diff nuevo completo, pruebas, helpers, estado/documentación y JSON; staging por rutas explícitas y tres commits separados: (i) storage/pruebas/documentación/evidencia, (ii) dos líneas de workflow, (iii) atributo .txt. Sin código de producto adicional, refactors, contratos o pruebas anteriores cambiados. Firmas de credenciales y payloads binarios nuevos: cero confirmadas; strings de secreto de pruebas son fixtures sintéticos explícitos. HMAC, fail-closed, permisos y privacidad preservados; el desfase de reloj no influye en los headers. Evidencias históricas permanecen intactas.

El P4b completo previo sobre `origin..58f536f` contenía 26 commits, 693 objetos, 459 blobs y 20 PNG. El chequeo suplementario compara los nuevos blobs con ese corte, inspecciona firmas, texto, candidatos codificados y referencias históricas sin reescribir la auditoría previa. El escaneo final del rango actualizado, incluyendo objetos intermedios de los tres nuevos commits, se entrega con métricas y cotejo de los mismos PNG en el relevo local; no se presume por un escaneo solo del diff neto.

Limitaciones: Cloudinary real queda omitido por diseño/prohibición de proveedor; navegador móvil de teclado se omite solo en el proyecto desktop. No acreditan fallos, tampoco evidencia externa. Sin PG16, CI remoto, Clerk/Cloudinary reales, QA desplegada, fuentes finales o dispositivos físicos verificados. Browser usa fixtures anónimos locales y fuentes offline; preserva assertions de consola y cero retries. Producción cerrada, sin push/Vercel/OCI/Clerk/GitHub/QA/flags ni bases reales. La validación local no aprueba ni cierra el producto.
