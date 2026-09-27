# Despliegue API — Oracle Always Free

Fecha: 2026-09-27. **IMPLEMENTADO / EN REVISIÓN**. El propietario autorizó
redimensionar la misma VM y publicar exclusivamente la API con TLS, CORS
productivo y Supabase Free. Esto sustituye la falta de autorización de API
pública registrada en C1; no aprueba el resultado final ni activa EMAIL.

## Criterios y límites

API productiva reiniciable bajo Podman/systemd, con evidencia HTTPS externa,
TLS público verificable, CORS exacto `https://booking.kortek.cloud` confirmado
por el propietario, startup fail-closed y conexión runtime al Supabase existente.
No cambiar planes, schema, DTOs, roles, usuarios ni la configuración Vercel.
EMAIL pausado, MFA conserva política Hobby y reserva pública cerrada.

## Capacidad comprobada antes de decidir

- Oracle muestra cuenta Free Tier en Free Trial; una sola instancia en root,
  `kortek-free-services`, A1/1 OCPU/6 GB, Ashburn AD-2.
- Cuota regional observada: 16 OCPU/96 GB, consumo 1/6. Ese límite de prueba no
  es el beneficio permanente. [Oracle Always Free vigente](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
  publica 1500 OCPU-h/9000 GB-h mensuales: 2 OCPU/12 GB continuos.
- RAM usada antes: 1173 MiB; disponible 4469 MiB; swap usado 0; load
  0,06/0,09/0,02. Worker 38,22 MB/0,01 % CPU, monitor observado 44,4 MB.
- Backup adicional real: `Result=success`, exit 0; máximo muestreado de su
  unidad 52,55 MB, CPU acumulada 7,68 s; pg_dump muestreado 3,87 MB/6,28 % CPU.
- Restore aislado adicional: `Result=success`, exit 0; unidad muestreada hasta
  47,47 MB, CPU 5,91 s; contenedor PG17 observado 36,16 MB/73,69 % CPU.
  Son muestras, no máximos garantizados bajo crecimiento.
- Redimensionamiento aplicado por OCI: 2 OCPU/12 GB; reinicio terminó Running.
  SSH posterior: nproc 2, MemTotal 10898 MiB, disponible 10210 MiB al arrancar,
  swap 0. Worker/monitor/backup/restore timers recuperados activos, exit 0.
- Supabase MCP confirmó `Kortek Booking` ACTIVE_HEALTHY, PostgreSQL 17.6 y
  organización `plan=free`, `tier=tier_free`. Sin compra ni cambios de plan.

## Implementación desplegada

[Archivos operativos](../../ops/oci-api/README.md): API rootless con recursos
limitados, Caddy con TLS automático/persistencia y secretos systemd. Corrección
de despliegue: confianza Express solo en proxy loopback; pruebas HTTP cubren
desarrollo, IP reenviada con hop forjado y rechazo de peers privados/remotos.
Sin cambio de contrato funcional. DNS A creado `api.booking` → `150.136.7.19`,
DNS only; web ya resuelve por CNAME a Vercel.

El propietario respondió a la confirmación de red «Toma la decision que
consideres mejor en todos los ambitos para este caso». Se añadieron únicamente
TCP 80/443 desde Internet a la security list y http/https en firewalld. Cloud
Shell cotejó JSON anterior/posterior: `NETWORK_RULES_PRESERVED_OK`; reglas de
ingress existentes y egress idénticas. No se abrió TCP 3000 ni el admin de Caddy.

| Componente | Identidad desplegada | Recursos |
| --- | --- | --- |
| API ARM, código/APP_RELEASE | `b5615869dcbec4bd174608f2373e73ff618fae26` | 1,5 CPU / 2 GiB / 128 procesos, heap 1536 MiB |
| API imagen inmutable | `8caacd8548a61d94807c0b865229a731df594f63f609ca9ab57df99283dceca2` | rootless opc, FS read-only, sin capacidades |
| Caddy oficial 2.11.4 | `8b20b62e1c76d212304053dc6484bd1f2186018e2baa217ce7a35cec0ded404c` | 0,25 CPU / 256 MiB / 64 procesos, NET_BIND_SERVICE |

API y Caddy están enabled/active bajo systemd. Credenciales API root:root/0600
en `/etc/kortek-api/runtime-env` vía LoadCredential; CA Supabase montada read-only.
Pool API 4, worker 2. Certificados Caddy persistidos bajo `/var/lib/kortek-caddy`.
No se imprimieron secretos ni se incorporaron al contexto mínimo de Git archive.

Muestra posterior: API 69,37 MB, Caddy 16,89 MB, worker 34,38 MB; host disponible
9862 MiB, swap usado 0; disco raíz 15/30 GB, 16 GB disponibles. Inspección real
API: Memory 2147483648, CpuQuota 150000/CpuPeriod 100000, OOMKilled false.
Los límites dejan 0,25 OCPU fuera de las cuotas API/Caddy; son techos compartidos,
no una reserva exclusiva. Backup/monitor/restore compiten bajo Linux y disponen
del margen RAM observado; estas muestras no acreditan carga máxima de usuarios.

## Validación real

- Tipos, lint, build y suite API completa: 724 aprobadas, 11 omitidas,
  59 suites aprobadas/2 omitidas, exit 0. Tres pruebas nuevas HTTP de confianza
  del proxy. No cambió el contrato, schema, privilegios ni las dependencias.
- Startup compilado local **y en la imagen ARM exacta**, red none: 23/23
  configuraciones inseguras rechazadas antes de Nest, exit 0. Incluye CORS
  ausente/localhost/wildcard, modos inconsistentes, Clerk development, secretos
  ausentes, rol migrador/admin y TLS inseguro. Arranque positivo posterior con
  NODE_ENV/DEPLOY_ENV production, claves live y orígenes HTTPS exactos.
- Bash, unidades systemd y configuración Caddy validados, exit 0.
- Prisma desde el contenedor API conectó al proyecto real `ilaoolpcrlmqkftirjog`:
  transacción READ ONLY, database postgres, current_user kortek_runtime,
  30 tablas visibles al rol, `PRODUCTION_RUNTIME_DB_OK` a 04:27:14 UTC. No se
  concedió SELECT sobre `_prisma_migrations` para el smoke: su lectura fue denegada.
- TLS API→pooler `aws-0-us-east-1.pooler.supabase.com:5432` verificado con la CA
  instalada, hostname y verify_return_error: TLS 1.3, `Verification: OK`.
  pg_stat_ssl dio false en el salto interno pooler→PostgreSQL; ese dato no mide
  la conexión cliente→pooler. Runtime usa sslmode=require/sslaccept=strict.
- SIGKILL a los lanzadores Podman de API y Caddy: cada unidad recuperó su
  contenedor automáticamente, NRestarts 1, ambos activos, certificado conservado.
  Worker y timers monitor/backup/restore-drill activos; `RECOVERY_OK_API_AND_CADDY`,
  exit 0. No se dejó un contenedor huérfano ni se restauró sobre producción.

## HTTPS desde fuera de la VM

[`external-smoke.py`](../../ops/oci-api/external-smoke.py) ejecutado en el equipo
Windows operador, sin túnel, proxy, --resolve ni --insecure. Pasó a 04:24:56 UTC
y de nuevo tras recuperación a **04:28:38 UTC**, exit 0.
[Resultado JSON real conservado](evidence/api-oci-2026-09-27.json).

| Comprobación externa | Resultado |
| --- | --- |
| DNS real | api.booking.kortek.cloud → 150.136.7.19 |
| Certificado y canal | Let's Encrypt YE2, SAN exacto, TLS 1.3, cadena/hostname validados |
| Vigencia observada | 2026-09-27 03:26:06 a 2026-12-26 03:26:05 UTC |
| GET HTTPS / | 404 JSON de Nest, X-Request-Id `89b5abc4-cb48-4edd-a18e-29dbf9a6ad85`, HSTS |
| GET /professionals sin token | 401 JSON |
| GET HTTP / | 308 → https://api.booking.kortek.cloud/ |
| Preflight Vercel real | 204, ACAO https://booking.kortek.cloud, credentials true |
| Localhost, dominio ajeno y * | sin ACAO, no CORS abierto |
| TCP 3000 / 2019 | inaccesibles desde fuera |

Raíz 404 y privada 401 son los contratos reales esperados; no se inventó un
health endpoint ni se presentó el 404 como readiness de negocio. DB se acreditó
separadamente. El login positivo navegador→API y QA del frontend conservan sus
gates de producto; no se modificó ni redeplegó Vercel. Sondas HTTP conjuntas
web/API permanecen false, con los monitores previos activos. EMAIL sigue false,
PUBLIC_BOOKING_CLOSED true y Supabase/Oracle conservan sus planes gratuitos.

## Seguimiento productivo informado por el propietario — 2026-09-27

- El propietario confirmó que recibió varias alarmas HTTP con `State=FIRING` y
  `State=OK`; queda cerrado el pendiente de confirmación de recepción y
  recuperación. La configuración desplegada de sondas públicas sigue en
  `KORTEK_PUBLIC_HTTP_ENABLED=false`; no se atribuye ese correo a las métricas
  `public_web_up`/`public_api_up` ni se declara activado C3 sin verificar la
  regla concreta y sus métricas de origen.
- El propietario informó un registro real satisfactorio con un correo nuevo.
  La consulta READ ONLY a Supabase confirma la última alta como `Dental Ross`,
  organización creada el `2026-09-27 05:12:40.239 UTC`, seguida por su usuario,
  membresía OWNER y auditoría `CREATE Organization` dentro de la misma
  transacción. Esa hora se usó como límite estricto: esa organización y
  cualquier dato creado desde entonces quedaron fuera de la limpieza.
- `ClerkOnboardingService` rechaza el onboarding con conflicto neutral cuando
  el correo verificado ya existe en `User` y pertenece a otro `clerkUserId`;
  el camino de índice único también registra el evento genérico. Esto concuerda
  con el 409 observado para identidades que colisionan con filas locales. No
  demuestra que todo 409 sea un conflicto de correo: slug y correo de
  Organization también pueden colisionar. Los eventos `CLERK_ONBOARDING_EMAIL_CONFLICT`
  guardan intencionalmente `userId`, `organizationId`, `entityId` y PII nulos,
  por lo que no se pueden atribuir a una dirección concreta.
- El botón «Ver página pública» muestra «Información no disponible» mientras
  `PUBLIC_BOOKING_CLOSED=true`, porque `PublicBookingService` devuelve 404 antes
  de resolver la organización. Para `Dental Ross`, Supabase además confirma CMS
  sin publicación/snapshot, cero servicios activos y cero profesionales
  públicos activos. Resolver la causa requiere una etapa posterior autorizada;
  no se cambia el switch en este checkpoint.
- El respaldo cifrado previo al corte y el restore drill están registrados en
  [la auditoría de inventario/limpieza](PRODUCCION_SUPABASE_LIMPIEZA_2026-09-27.md).
  Tras confirmación directa del propietario se eliminó de forma atómica el
  remanente anterior al corte (355 filas en 14 tenants); `Dental Ross` y todo
  dato desde el corte se conservaron. Backup/restauración y conteos posteriores
  están documentados en el informe enlazado.

## Incidencias resueltas y continuidad

Podman build no admite --cpus en esta versión: se usaron periodo/cuota CPU.
El primer build con cuotas detectó cgroup CPU no delegado; se instaló el drop-in
user@1000 y se recuperaron worker/monitor tras su reinicio acotado. El primer
arranque del wrapper detectó CRLF; se normalizó a LF y `.gitattributes` asegura
LF para posteriores instalaciones. Esos intentos fallidos no cuentan como checks
aprobados; las ejecuciones corregidas terminaron exit 0.

El procedimiento de redeploy y rollback está en el [runbook](../../ops/oci-api/README.md).
No hay migraciones ni cambios de plan en esta entrega. La imagen identifica el
commit de código; el commit posterior de evidencia/documentación y normalización
operativa no cambia el código ejecutado. La permanencia y renovación futura TLS
requieren la VM/DNS disponibles; el hosting Free conserva el riesgo de reclamación
por inactividad ya documentado en continuidad. Aprobación final del propietario
no inferida del despliegue autorizado.
