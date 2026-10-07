# Correctivo local de fixtures y diagnóstico Retry-After — 2026-10-07

Base verificada: `ai/antigravity-qa`, HEAD `c904148e5d65edad8b827c1b9d945016ff3b71ea`, índice y árbol limpios, 24 commits por delante de la referencia local `origin/ai/antigravity-qa` (`9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4`). Sin nuevo fetch ni push. La [enmienda vinculante](DECISIONES_PROPIETARIO_2026_09_29.md) mantiene reserva de invitado, B2C retirada y autenticación interna preservada.

Único gate abierto: correctivo local de pruebas/arnés y diagnóstico; estado **IMPLEMENTADO / EN REVISIÓN**, sin aprobación del producto ni habilitación de QA/producción. Usuario beneficiado: quien mantiene y revisa la reserva pública; resultado esperado: fixtures coherentes con los contratos vigentes, evidencia reproducible y fallos reales visibles. Se conservan roles, aislamiento por organización, privacidad, respuestas públicas, estados PENDING y todas las superficies/recursos del producto. Sin código de producto, contratos nuevos, dependencias, Prisma/migraciones, bases reales o contactos con proveedores.

## Fixtures y expectativa autorizada

- `services.e2e-spec.ts`: un `BusinessSchedule` anidado por cada organización A/B, `CONFIRMED`, `zoneConfirmed=true`, siete días y ventanas 09:00–19:00. Reutiliza el patrón de creación anidada de `public-booking-m1.e2e-spec.ts:organization`, compatible con `BusinessSchedulePolicy` y la precondición editorial de `CmsService`.
- `notifications-http.e2e-spec.ts`: mismo patrón por las dos organizaciones de cada caso; conserva las horas legacy como antecedente del fixture. La prueba de terminación anticipada antes creaba ambas reservas a las 15:00. COMPLETED también ocupa esa ventana: la segunda reserva del fixture ahora comienza a las 16:00, antes de simular su final pasado. Ninguna aserción de eventos o estados cambia.
- Medios M1: la suite aporta un valor sintético de firma local, guarda/restaura el entorno incluso en teardown y mantiene `MediaCloudinary` sustituido. Permite ejercitar firma/revocación reales en `MediaPublicService`; no es una credencial ni una prueba de Cloudinary.
- Al quitar el fallo compartido de preparación, Servicios alcanzó una expectativa antigua que excluía `invoice` de GET `/bookings`. [F0-B aprobado](CORRECTIVO_F0B.md#contrato-y-seguridad) añade `invoice: null | {id,state:'ISSUED'|'PAID'}` y el código actual lo proyecta. El propietario autorizó expresamente el ajuste posterior en esta conversación: se añade `invoice` a las claves exactas y se exige `{id:invoiceId,state:'ISSUED'}`. Se preservan verificaciones de tenant, datos privados, historial, relaciones y claves restantes; no se sustituye la comparación exacta por una parcial.

Primer ensayo completo con los nuevos horarios: API 262/2/1 (265 total), exit 1; browser 21/0/1, exit 0. Ambos fallos alcanzados fueron la ventana duplicada de Notificaciones y la expectativa obsoleta de Servicios; el ensayo se conserva en `.tmp/guest-suite-evidence/before/0fa61ad26cfb4e8796fb55cc60e83b10`. Son fallos antes ocultos por el beforeAll/fixture, no dos cambios de producto.

Ensayo final previo al commit, tras esos dos ajustes: **API 263/1/1**, exit 1; **browser 21/0/1**, exit 0. Las 37 pruebas originalmente clasificadas a pasan individualmente; solo falla Retry-After 61 frente a <=60. PG18.1 nuevo, 28 migraciones/gate runtime exit 0, stop exit 0 y cleanup=true. [Resultado y correspondencia de las 37 pruebas](evidence/reserva-invitado-fixtures/validacion-precommit.json); logs en `.tmp/guest-suite-evidence/before/afdbe5aa911246babfc58c5dc39d7e94`. Browser reutiliza el mismo build web verificado de c904148, pues no cambió código web; la repetición postcommit hará un build nuevo. Estos números no sustituyen esa repetición posterior.

## Retry-After: diagnóstico (a), producto intacto

Contrato aplicable: [M1 C1](RESERVA_PUBLICA_M1_C1_CIERRE.md#contrato-c1) fija 30 solicitudes/minuto por IP/handler, contador compartido y 429 con Retry-After; `PublicBookingController` usa `limit=30`, `ttl=60000`. `@nestjs/throttler` resuelve `blockDuration` a ttl cuando no se especifica otro y copia `timeToBlockExpire` al header.

En `PostgresThrottlerStorage.increment`, SQL crea `blockedUntil=NOW()+blockMs` al exceder el límite, conserva el bloqueo aún vigente y reinicia el contador únicamente si expiraron ventana y bloqueo. La ventana y el bloqueo se basan en PostgreSQL. Después, Node obtiene `Date.now()` y calcula `max(0,ceil((blockedUntil.getTime()-now)/1000))`; no existe cota superior. Mezclar ambos relojes permite superar la duración nominal incluso dentro de una misma máquina. No hay un reloj fijo ni carrera artificial introducida por el caso.

Diez repeticiones **en frío**, cada una con nuevo clúster PG18.1, base UUID `_test`, procesos Nest nuevos y cache de transformación desactivada. Comando local: `node .tmp/guest-retry-cold-ten.cjs`; adaptador utiliza Jest con `--config .tmp/guest-retry.config.json --no-cache --runInBand --runTestsByPath <public-booking-m1.e2e-spec.ts> --testNamePattern '30/min compartido' --json`. Seleccionar ese caso es exclusivamente diagnóstico; las suites completas se ejecutan aparte sin filtros. Los otros 16 casos de ese archivo no forman parte de N.

Observación temporal ignorada: transformador delega a ts-jest y añade exclusivamente logs numéricos después de capturar `now`, y después de recibir el header. No modifica SQL, filas, fórmula, Date.now, reloj ni aserciones. El bloque original completo del caso 30/min conserva su SHA-256; la instrumentación no entra en los commits. [Diez muestras y distribución](evidence/reserva-invitado-fixtures/retry-after-frio.json):

| Header | Muestras | Resultado del caso | Diferencia PostgreSQL−Node observada |
|---|---:|---|---|
| 60 | 7 | exit 0 | −1 ms en seis, 0 ms en una |
| 61 | 3 | exit 1 | +4, +6 y +3 ms |

Ejemplo medido: `blockMs=60000`, `remainingMs=60004`, `ceil(60004/1000)=61`. **Defecto de producto (a)**: el cálculo usa el reloj de PostgreSQL para el vencimiento y otro para el tiempo restante. No se arregla el test ni se amplía su límite; el cuerpo del caso original y todas sus aserciones quedan intactos. La tasa 3/10 describe estas muestras locales, no una frecuencia productiva. Los intentos de preparación previos no se cuentan: ocho fallaron por escape de ruta Windows en el adaptador y dos no tenían observación; todos quedaron detenidos/limpios y sus registros se conservan.

Propuesta para autorización separada: calcular el tiempo restante de expiración/bloqueo con el mismo reloj autoritativo PostgreSQL en la consulta atómica (por ejemplo, diferencia contra el mismo `NOW()`), convertir a segundos conservando redondeo y validar techo, expiración, contadores compartidos, concurrencia y diferencia de reloj entre procesos. Preservar 30/min y bloqueo de 60 s, fail-closed y privacidad. No adoptar simplemente `<=61`, un reloj falso o un reintento que esconda el defecto. **No hay commit (ii) de Retry-After**, pues solo estaba autorizado para diagnóstico (b).

## CI, Vercel y PG16: solo lectura local

`.github/workflows/quality.yml`: PR dirigidas a `main` o `ai/antigravity-qa`; push únicamente a `ai/antigravity-qa`. Push a main no dispara ese workflow según su YAML. Node 22, pnpm 11.18.0 y servicio PostgreSQL 16; incluye instalación/auditoría, Prisma, permisos, tipos/lint, unitarias, builds, integridad/E2E y browser. La invocación API literal sigue siendo `pnpm --filter api test:e2e -- --runInBand` (también separador adicional en unitarias): en pnpm 11 llega a Jest como patrón y da cero pruebas/exit 1. Forma local funcional: `pnpm --filter api test:e2e --runInBand`, con JSON de evidencia. Browser: `pnpm --filter web test:browser --config <config local>`; mismos specs y proyectos, cero reintentos. Workflow sin editar.

Ninguno de los dos workflows versionados despliega Vercel ni asigna alias. `supabase-free-backup.yml` tiene cron y workflow_dispatch, no trigger push/PR; no se ejecuta aquí. No existen `vercel.json` ni metadatos `.vercel` locales que acrediten la configuración viva de Git Integration. [Registro local de staging del 28-sep](STAGING_QA_2026-09-28.md#vercel-preview-y-deployment-probada) documenta rama `ai/antigravity-qa`, Preview automático tras push y alias `qa.booking.kortek.cloud` asociado a esa rama; [preparación del candidato](../features/RESERVA_INVITADO_PREPARACION_QA.md) advierte que push puede actualizar QA y exige revalidar la integración. El manifiesto `config/environments.yaml` identifica ese origen de staging, no el trigger ni la rama productiva de Vercel.

Por tanto: se acredita el comportamiento histórico QA y las ramas CI actuales del archivo; **no se puede certificar hoy qué otras ramas disparan Vercel, la Production Branch o el alias vivo** sin consultar el proveedor, prohibido. No se presupone que CI verde preceda o condicione el Preview/alias; el workflow no enlaza ambos mecanismos. Sin push ni llamadas Vercel/OCI/SSH/Clerk/GitHub, y sin modificar integración o alias.

Inventario local: solo `C:/Program Files/PostgreSQL/18`; no binarios PG16 encontrados allí/PATH. Docker CLI existe pero `docker image ls` da exit 1 por ausencia del daemon Linux. No se arranca Desktop ni se descarga/instala una imagen; no hay una forma local verificada de ejecutar PG16 con los recursos disponibles. PG16 y CI remoto quedan sin verificar.

## Whitespace: resultado pendiente de commit separado

Se aplican únicamente las dos reglas autorizadas `whitespace=-blank-at-eol,-blank-at-eof` para `docs/quality/evidence/**/*.patch` y `docs/quality/evidence/**/*.log`. Sin atributos `text/eol`, filtros, renormalización o cambios a `.git/info/attributes`. El hash SHA-256 de los 83 archivos actuales .patch/.log se mantiene byte a byte. No se alteran auditorías/evidencias previas.

Antes: `git diff --check origin/ai/antigravity-qa..HEAD` exit 2, **287** diagnósticos: los 280 conocidos en 18 .patch/.log y otros siete en tres .txt. Con las reglas en el árbol de trabajo: exit 2, **7** diagnósticos restantes; .txt no obtiene excepción. La comprobación final después del commit de atributos se entregará, sin afirmar que el rango completo pasa.

| Archivo histórico restante | Líneas | Diagnóstico |
|---|---|---|
| `m2-c3-p2/p2-iteracion-local-2-restore.sql.txt` | 2091 | línea vacía al EOF |
| `m2-c3-p2/p2-iteracion-local-2-schema.diff.txt` | 10, 11, 28, 29 | whitespace final |
| mismo schema.diff.txt | 28 | línea vacía al EOF |
| `m2-c3-p2/p2-iteracion-local-2-snapshot.sql.txt` | 2091 | línea vacía al EOF |

Todos bajo `docs/quality/evidence/`. No se amplía la regla a .txt ni se editan esos bytes. Evidencia local: `.tmp/guest-whitespace-before.json`, `.tmp/guest-whitespace-after.json` y manifiesto de hashes. Nuevo diff de esta tarea pasa `git diff --check`; esto no sustituye el fallo histórico del rango completo.

## Verificación y límites de entrega

Tipos API y lint de los tres archivos cambiados: exit 0. El diff completo de fixtures y expectativa F0-B fue revisado. Las siguientes verificaciones completas y el P4b suplementario de los commits nuevos se acreditarán con su resultado real en la entrega; ningún resultado se presume verde. Staging por rutas explícitas; commit (i) de pruebas/arnés/documentación y commit (iii) de atributos/documentación, separados. SHA se entregan después de crearlos, sin autorreferencia.

La API puede seguir roja por Retry-After aunque las 37 fallas de fixtures se resuelvan. Tampoco el check de whitespace global queda verde mientras existan los siete .txt. No verificado: PG16/CI remoto, recursos/proveedores reales, auth real, QA desplegada o dispositivos físicos. Producción cerrada; el resultado local no aprueba producto ni abre publicación.
