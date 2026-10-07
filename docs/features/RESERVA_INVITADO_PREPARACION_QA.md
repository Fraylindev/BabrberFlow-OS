# Reserva invitada — preparación del candidato para QA

2026-10-07. **REVISIÓN PREPARATORIA COMPLETADA / PLAN EN REVISIÓN.** Sólo lectura local y documentación. No staging, commit, fetch, push, PR, P4b formal, despliegue, POST, datos, servicios o consultas a QA/producción/Clerk/Vercel/GitHub en esta preparación. C3 funcional sigue bloqueado; no se declara aprobado. Las versiones vivas del preflight anterior son antecedentes fechados, no se reconsultaron proveedores ahora.

## 1. Estado verificado y límites del candidato

- Rama `ai/antigravity-qa`; HEAD/base `c4625ef23a3766c5be5172dde0aea4b1cb57d7ac`; índice vacío. No existe commit del candidato C0/C1/C2.
- Referencia **local** `origin/ai/antigravity-qa`: `9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4`. No prueba el SHA remoto actual. Entre esa referencia y HEAD existen **20 commits / 231 rutas en el diff neto**. Un push del futuro candidato también publicaría esa historia; exige P4b y autorización del rango completo, sin force-push, cherry-pick o reescritura.
- Revisión acumulada de 46 M + 41 D + 196 A antes de añadir esta preparación, 4.711.974 bytes existentes: fuentes/contratos/guards/tests/helpers, documentación, archivos históricos y evidencia de reserva invitada. Inventario por ruta, estado y SHA en [review.json](../quality/evidence/reserva-invitado-preparacion/review.json). Lista final para revisar/staging posterior en [candidate-paths.txt](../quality/evidence/reserva-invitado-preparacion/candidate-paths.txt); incluye suplementos C3 y esta preparación, separados por categoría en el inventario final.
- Se examinaron modificaciones backend/web/documentación, fuentes nuevas, retirada de módulos/rutas/UI exclusivos y originales archivados. 24 archivos C2 coinciden con su manifiesto; 23 coinciden con HEAD normalizando EOL. Customer.test archivado tras el correctivo difiere sólo por retirar el import y dos positivos de claim; también se conserva su original completo anterior. Cinco archivos del correctivo previo verificados por SHA, incluido probe sintético que era ignorado. Las eliminaciones están delimitadas por el inventario funcional C0/C1/C2 y su historia permanece en Git/textos; no se elimina persistencia.
- Cero rutas de schema/migraciones/SQL, backups/dumps, `.env`, claves/certificados privados, infraestructura, dependencias, pipeline o auditoría anterior modificadas en este candidato. No se modifican P4b ni el checklist P4 Clerk. Las menciones históricas a backups/migraciones/P4b son referencias/documentación, no archivos de respaldo ni cambios operativos. Los logs migrate-deploy son resultados del clúster sintético ya eliminado, no nuevas migraciones ni datos QA.
- Escaneo de todo el contenido candidato: cero hallazgos de claves privadas, Clerk live, tokens GitHub/AWS/Stripe live o JWT literales; 47 JSON válidos y cero patrones de credenciales que requieran revisión adicional en el escaneo complementario. Literales de JWT/rate-limit/DB son fixtures declaradas, sin capacidad sobre proveedores, y passwords aleatorios de PG fueron redactados por el runner. Evidencia/screenshot procede de fixtures locales o metadatos sanitizados del preflight, no filas privadas. Esto es revisión preparatoria, **no sustituye P4b** ni demuestra ausencia absoluta de secretos por regex. [content-scan.json](../quality/evidence/reserva-invitado-preparacion/content-scan.json).
- No se repitieron 871/288 pruebas ni builds: sus resultados originales se preservan. No se afirma QA integrada a partir de ellos. Corrección de expectativa H5 de zona y asserts CUSTOMER 401 están dentro de las regresiones autorizadas del retiro; no cambian horario/facturación/analytics productivos. Helpers nuevos sólo crean/eliminan su PG aislado y transporte sintético; nunca ejecutarlos contra QA compartido. El helper PG requiere Windows/PG18 instalado; no es un comando de despliegue ni reemplaza CI.

## 2. Pareja compatible y secuencia

**API y web del mismo SHA final deben entregarse como una pareja.** API retira alta/claim/rutas y DTO B2C y responde sólo `{booking}`; web retira cuenta/portal y todas sus lecturas/fixtures. Datos, Client operativo, schema, ledger y Clerk interno se conservan. El frontend antiguo no debe quedar sobre el API reducido como estado publicado aceptado.

No existe activación atómica entre OCI y Vercel. Preparar ambos artefactos primero; acordar ventana sin uso de QA y prohibir C3/fixtures durante la transición. Preferir activar web invitada y a continuación API invitada: el nuevo web sólo utiliza el payload común de invitado y `booking`, aunque el API anterior conserve campos adicionales. Esto es una transición acotada a comprobar previamente, **no una pareja final aprobada**. Si la compatibilidad transitoria no se prueba, detenerse y acordar mecanismo separado de acceso/ventana; no cambiar flags, Caddy o Clerk por inferencia.

El push puede disparar CI y Vercel automáticamente. Antes de autorizarlo, leer la integración actual, rama/alias y comportamiento de promoción; no modificarla ahora. Si actualiza QA automáticamente, la autorización del push debe incluir ese despliegue web y la ventana. No prometer “push sin despliegue” con automatización habilitada. Si no actualiza el alias, construir Preview exacto y asignar el alias sólo después de READY y verificación SHA/API destino.

Consumidor conocido: web QA `9f04dba`, deployment `dpl_HtCcxYumevH6xD7qVhaTcGkKU3XD`, examinado en preflight. No hay apps/SDK externos conocidos en apps/ops locales; inventario externo del propietario pendiente. No desplegar contrato reducido con un consumidor conocido sin migrar. Invalidar/reabrir pestañas antiguas de QA y comprobar que la pareja y assets corresponden al SHA final.

## 3. Autorizaciones necesarias

| Acción | Autorización actual | Autorización futura requerida / gate |
| --- | --- | --- |
| Revisar localmente/documentar este plan | Sí | Ninguna operación externa |
| Staging y un commit local por rutas aprobadas | No | Aprobación expresa del inventario final; índice/diff completo y validaciones |
| P4b del rango completo no publicado | Sólo plan | Autorización expresa de auditoría; informe nuevo de esa ejecución, conservar auditorías previas |
| Lectura/fetch remoto e integración CI/Vercel | No en esta preparación | Lectura autorizada antes de publicar; parar si el remoto/base difieren |
| Push `HEAD:ai/antigravity-qa` | No | Aprobar el rango completo hasta candidato, P4b pasado y efectos automáticos de CI/Vercel |
| Build de imagen QA en OCI | No | Recursos/ruta/imagen autorizados; no parar ni usar servicios productivos |
| Entregar API/web QA | No | Activación coordinada y ventana autorizadas, versión exacta y rollback |
| Sustituir KORTEK_API_IMAGE/APP_RELEASE y reiniciar sólo API staging | No | Excepción expresa sólo para estos dos selectores públicos de release; preservar todos los secretos/variables funcionales/flags/wrapper |
| Cambiar Clerk, schema, grants, Caddy, canal/flags globales, producción | No | Fuera del plan actual; si resulta necesario, propuesta propia y detener |
| C3 POST/fixtures/limpieza | No | Elegir alternativa y autorizar filas, custodias, identidades y limpieza; no inferir permiso del despliegue |
| Correo real / eventos de proveedor | No | Mailbox real del propietario y consentimiento/entrega autorizados; nunca `.invalid` ni cuentas B2B como destinatarios |
| Borrado financiero o restauración sobre QA compartido | No | No se incluye una restauración global; probar finanzas completas preferentemente en desechable |

## 4. Comandos posteriores: commit, P4b y push

Estos bloques son **plan, no ejecutados**. En PowerShell desde el repo. Manifiesto final debe congelarse, revalidarse contra hashes y revisarse si cambió cualquier archivo. Las rutas de evidencia son explícitas; no se añade `.tmp`, `.next`, `node_modules` o archivos ignorados. No `git add .`/`-A`, reset, clean, force-push ni merge a main.

```powershell
git branch --show-current
git rev-parse HEAD
git status --short
git diff --check
git diff --stat
git diff
# Revisar además todos los A del manifiesto (git diff no muestra untracked).
$taskCandidatePaths=Get-Content -LiteralPath 'docs/quality/evidence/reserva-invitado-preparacion/candidate-paths.txt'
foreach($taskCandidatePath in $taskCandidatePaths){ git add -- $taskCandidatePath; if($LASTEXITCODE -ne 0){throw 'Staging falló'} }
git diff --cached --check
git diff --cached --stat
git diff --cached
# Sólo tras aprobación separada:
git commit -m "Retirar cuentas B2C y establecer reserva de invitado"
$taskCandidateSha=(git rev-parse HEAD).Trim()
if($taskCandidateSha -notmatch '^[0-9a-f]{40}$'){throw 'SHA no valido'}
git status --short
```

Validaciones ya disponibles, repetir sólo cuando nueva modificación/deriva lo justifique: `pnpm --filter api exec node test/guest-retirement-run.cjs tsc --noEmit`; mismo wrapper `eslint "{src,apps,libs,test}/**/*.ts"` y `build build`; `$env:GUEST_RUN_FULL_API='1'; node apps/api/test/guest-postgres-run.cjs` exclusivamente nuevo PG local; `pnpm --filter web exec tsc --noEmit`, `pnpm --filter web lint`, `pnpm --filter web test`; build web con variables temporales de desarrollo **sólo local**, nunca como artefacto QA. C3 real posterior requiere configuración QA existente, no fixtures del helper Chrome.

Gate de CI adicional antes de publicar: la pipeline existente ejecuta también `pnpm --filter api test:e2e -- --runInBand` y `pnpm --filter web test:browser`, que no forman parte de las 871/288 ni los 9 escenarios C2. Deben ejecutarse después en destino desechable aprobado (no contra dotenv/base compartida). **Hallazgo estático B1:** `apps/web/e2e/whatsapp-c2.spec.ts` conserva expectativas antiguas: nombre “Abrir WhatsApp” y texto explicativo que SuccessView actual no entrega (dice “Contactar por WhatsApp”), y payload de teléfono sin +1 donde PublicBookingFlow normaliza el teléfono. Son expectativas previas a este candidato, además de las fixtures ya migradas; no se corrigieron dentro de esta preparación y no se afirma fallo ejecutado. Hace falta autorización separada para validar/corregir esa prueba y repetir sus dos proyectos desktop/mobile; no retirar ni saltar CI para publicar. La suite completa E2E API también está pendiente. Esto impide declarar listo para publicación el candidato sólo por los checks locales C2.

P4b no tiene un ejecutor de publicación identificado en las fuentes revisadas; el checklist P4 Clerk no sustituye P4b. No inventar `pnpm audit:p4b` ni ejecutar un helper histórico. Definir auditoría manual/herramienta aprobada para todos los commits/blobs, secretos/PII, binarios, base64/ejecutores incrustados en evidencias P2/P3, artefactos/dumps/credenciales y finales de línea. Revisar historia además de diff neto; los borrados del tip no purgan blobs anteriores. Conservar la auditoría previa sin cambios y producir un informe nuevo sobre endpoints del rango exactos. Si hay hallazgo, parar; no reescribir historia ni publicar mientras se decide reparación/rotación por separado.

```powershell
# Sólo con autorización de lectura remota:
git fetch origin ai/antigravity-qa
$taskRemoteBase=(git rev-parse refs/remotes/origin/ai/antigravity-qa).Trim()
git merge-base --is-ancestor $taskRemoteBase HEAD
if($LASTEXITCODE -ne 0){throw 'No fast-forward; detener'}
git log --reverse --format=fuller "$taskRemoteBase..HEAD"
git diff --name-status "$taskRemoteBase..HEAD"
git diff --check "$taskRemoteBase..HEAD"
git diff --binary "$taskRemoteBase..HEAD"
git rev-list --objects "$taskRemoteBase..HEAD"
# P4b debe inspeccionar también cada commit, sus blobs y contenidos decodificados.
# Sólo tras informe P4b sin bloqueantes y autorización del rango + automatización:
git push --dry-run origin HEAD:refs/heads/ai/antigravity-qa
git push origin HEAD:refs/heads/ai/antigravity-qa
git rev-parse HEAD
git ls-remote --heads origin refs/heads/ai/antigravity-qa
git status --short
```

Si el remoto actual no es `9f04dba`, recalcular rango y auditoría; no asumir que 20 commits sigue siendo el rango a publicar. Aprobación del commit nuevo no autoriza por sí sola publicar los 20 anteriores.

## 5. Comandos posteriores: artefactos, activación y rollback

Preflight vivo separado: revalidar API release/imagen/PID, web alias/deployment/SHA, runtime-env hash sin imprimir contenido, ledger READ ONLY y consumidores. No aplicar migraciones ni `prisma migrate deploy` en QA. Comparar 28 migraciones existentes y contrato con candidato antes de iniciar; cualquier diferencia exige detenerse.

API: construir del commit, no del árbol sucio. Empaquetado local seleccionado excluye documentos/backups/fixtures/secrets del contexto. No despliegue por modificar la unidad o wrapper.

```powershell
$taskCandidateSha=(git rev-parse HEAD).Trim()
if($taskCandidateSha -notmatch '^[0-9a-f]{40}$'){throw 'SHA no valido'}
if($taskCandidateSha -eq 'c4625ef23a3766c5be5172dde0aea4b1cb57d7ac'){throw 'Falta commit candidato'}
$taskArchive=Join-Path $env:TEMP "kortek-guest-$taskCandidateSha.tar"
git archive --format=tar --output=$taskArchive $taskCandidateSha package.json pnpm-lock.yaml pnpm-workspace.yaml apps/api ops/oci-api/api.Containerfile
$taskSshArgs=@('-i','.tmp/base-preprod-c1/oci-kortek-ed25519-user','-o','UserKnownHostsFile=.tmp/base-preprod-c1/oci-known-hosts','-o','StrictHostKeyChecking=yes','-o','BatchMode=yes','-o','ConnectTimeout=15')
ssh @taskSshArgs opc@150.136.7.19 "test ! -e /home/opc/kortek-guest-$taskCandidateSha && mkdir -m 700 /home/opc/kortek-guest-$taskCandidateSha"
scp -i .tmp/base-preprod-c1/oci-kortek-ed25519-user -o UserKnownHostsFile=.tmp/base-preprod-c1/oci-known-hosts -o StrictHostKeyChecking=yes $taskArchive "opc@150.136.7.19:/home/opc/kortek-guest-$taskCandidateSha/source.tar"
ssh @taskSshArgs opc@150.136.7.19 "tar -xf /home/opc/kortek-guest-$taskCandidateSha/source.tar -C /home/opc/kortek-guest-$taskCandidateSha"
ssh @taskSshArgs opc@150.136.7.19 "cd /home/opc/kortek-guest-$taskCandidateSha && XDG_RUNTIME_DIR=/run/user/1000 podman build --network host --cpu-period 100000 --cpu-quota 150000 --memory 1500m --label org.opencontainers.image.revision=$taskCandidateSha -f ops/oci-api/api.Containerfile -t localhost/kortek-guest:$taskCandidateSha ."
ssh @taskSshArgs opc@150.136.7.19 "XDG_RUNTIME_DIR=/run/user/1000 podman image inspect --format '{{.Id}} {{.Labels}}' localhost/kortek-guest:$taskCandidateSha"
```

Registrar imagen inmutable resultante, checksum del tar y SHA. Antes de usar SSH/SCP revisar quoting del shell real; las interpolaciones aquí sólo contienen SHA hex validado, nunca texto del usuario o secretos. Crear sólo directorio nuevo del SHA; no sobrescribir checkouts existentes. Arquitectura del host y recursos disponibles requieren gate; no ejecutar ahora. No borrar imágenes anteriores ni volúmenes existentes.

Web: operación existente Vercel read-only `get_alias(qa.booking.kortek.cloud)`; `get_deployment(idOrUrl=<deployment candidato>,withGitRepoInfo="true")`. Exigir READY, `meta.githubCommitSha == taskCandidateSha`, rama QA, proyecto correcto y build contra API staging. No usar build local DEPLOY_ENV=development como QA. Si requiere env/Clerk/flags distintos, parar y proponer separado. Verificar preview/cabeceras/rutas antes de alias; si la integración no asignó QA automáticamente, operación posterior explícita `assign_alias` con `id=<deployment candidato>`, `alias="qa.booking.kortek.cloud"` y scope exacto del proyecto obtenido del preflight. No inventar IDs. Permiso de push por sí solo no autoriza esa llamada.

Activación API necesita autorización separada para **dos selectores públicos** del archivo protegido `/etc/kortek-api-staging/runtime-env`: KORTEK_API_IMAGE = imagen inmutable candidata, APP_RELEASE = SHA candidato. Preservar byte por byte resto, owner/group y modo 0600. El editor propuesto a continuación forma parte del plan documental: debe revisarse/ensayarse sobre archivo sintético y aprobarse junto con ese cambio protegido; no se creó helper ejecutable ni se probó contra credenciales. **Gate pendiente, no acción autorizada hoy.**

Editor propuesto, transmitir por stdin de SSH a `sudo python3 - <new-image> <new-release> <expected-file-sha256> <old-image> <old-release>`. Todos los argumentos son identificadores públicos hex fijados en el preflight, ningún secreto. Su hash previo se obtendría con `sudo sha256sum /etc/kortek-api-staging/runtime-env` únicamente después de autorización de lectura. No se imprime contenido:

```python
import os, re, stat, sys, hashlib, tempfile, shlex
from pathlib import Path
image, release, expected, old_image, old_release = sys.argv[1:]
assert re.fullmatch(r'sha256:[0-9a-f]{64}', image)
assert re.fullmatch(r'sha256:[0-9a-f]{64}', old_image)
assert re.fullmatch(r'[0-9a-f]{40}', release)
assert re.fullmatch(r'[0-9a-f]{40}', old_release)
assert re.fullmatch(r'[0-9a-f]{64}', expected)
p = Path('/etc/kortek-api-staging/runtime-env')
st = p.lstat()
assert stat.S_ISREG(st.st_mode) and st.st_uid == 0
assert stat.S_IMODE(st.st_mode) == 0o600
original = p.read_bytes()
assert hashlib.sha256(original).hexdigest() == expected
lines = original.splitlines(keepends=True)
old = {'KORTEK_API_IMAGE': old_image, 'APP_RELEASE': old_release}
new = {'KORTEK_API_IMAGE': image, 'APP_RELEASE': release}
indexes = {}
for key in old:
    hits = [(i, line) for i, line in enumerate(lines)
            if re.match(rb'^(?:export )?' + key.encode() + rb'=', line)]
    assert len(hits) == 1
    i, line = hits[0]
    value = shlex.split(line.decode().split('=', 1)[1])
    assert value == [old[key]]
    indexes[key] = i
remainder = b''.join(line for i, line in enumerate(lines)
                     if i not in indexes.values())
for key, i in indexes.items():
    ending = b'\r\n' if lines[i].endswith(b'\r\n') else b'\n' if lines[i].endswith(b'\n') else b''
    prefix = b'export ' if lines[i].startswith(b'export ') else b''
    lines[i] = prefix + key.encode() + b'=' + new[key].encode() + ending
candidate = b''.join(lines)
assert b''.join(line for i, line in enumerate(lines)
               if i not in indexes.values()) == remainder
fd, tmp = tempfile.mkstemp(prefix='.guest-release-', dir=p.parent)
try:
    os.fchmod(fd, 0o600)
    os.fchown(fd, st.st_uid, st.st_gid)
    with os.fdopen(fd, 'wb') as f:
        f.write(candidate); f.flush(); os.fsync(f.fileno())
    assert p.read_bytes() == original  # abort if concurrent admin changed it
    os.replace(tmp, p)
    directory = os.open(p.parent, os.O_DIRECTORY)
    try: os.fsync(directory)
    finally: os.close(directory)
    assert p.read_bytes() == candidate
    print('QA release selectors replaced; all other bytes preserved')
finally:
    if os.path.exists(tmp): os.unlink(tmp)
```

Comando posterior PowerShell: `$taskSelectorScript | ssh @taskSshArgs opc@150.136.7.19 "sudo python3 - $taskNewImage $taskCandidateSha $taskExpectedCredentialHash $taskOldImage $taskOldRelease"`, donde taskSelectorScript es exactamente el bloque revisado arriba; exigir regex local de cada argumento antes del envío. No escribir ese script o credenciales a un archivo público. Si el archivo usa otra sintaxis, modo/propietario, comentarios inline o selectores duplicados, aborta y exige adaptar el plan por separado; no relajar assertions para desplegar. Para rollback usar el mismo bloque con old/new intercambiados y hash actual revalidado, nunca copiar una credencial productiva.

Una vez editados esos selectores por el mecanismo aprobado:

```powershell
ssh @taskSshArgs opc@150.136.7.19 'sudo systemctl restart kortek-api-staging'
ssh @taskSshArgs opc@150.136.7.19 'systemctl show kortek-api-staging kortek-email-worker-staging --property=Id,ActiveState,SubState,MainPID,NRestarts'
ssh @taskSshArgs opc@150.136.7.19 'XDG_RUNTIME_DIR=/run/user/1000 podman inspect --format "{{.Name}} {{.Image}} {{.State.Status}}" kortek-api-staging kortek-email-worker-staging'
```

Exigir wrapper fail-closed, APP_RELEASE e imagen exactas, worker sin cambios, raíz API 404/ruta interna 401/públicas 200 y B2C 404, CORS exacto QA, ningún 5xx. No POST hasta aprobar fixtures. Revalidar web SHA/alias y abrir sesión nueva QA; sólo entonces comienza C3 de la pareja. No reiniciar worker ni Caddy.

Rollback ambos componentes: antes de cutover registrar nuevamente valores vivos; antecedentes API imagen `sha256:807bcb442a69e74198b224d1e60c9ae8d678043a6c7d070e90ace80935d8a261`, release `bc1d559e42928ca0deb60319b33cf98b3cd69291`; web `dpl_HtCcxYumevH6xD7qVhaTcGkKU3XD` / `9f04dba`. No asumirlos vigentes. Detener ensayo/fixtures, devolver selectores API mediante el mismo mecanismo aprobado y reiniciar **sólo API QA**, después devolver alias a deployment web anterior. Repetir estados/versiones/GET, worker intacto. Operación `assign_alias` posterior explícita con `id=<deployment anterior revalidado>`, `alias="qa.booking.kortek.cloud"`; no rollback del proyecto productivo ni comando global `vercel rollback` ambiguo. Sin SQL inverso, restore global o migraciones. Git no se resetea/force-pushea; si hace falta revert, necesita autorización aparte.

La pareja anterior vuelve a exponer B2C: su restauración requiere aceptación explícita como contingencia; no declararla conforme al nuevo MVP. Si no se acepta ese riesgo, mantener QA sin ensayos y decidir una alternativa por separado. Rollback de código no limpia datos de fixtures ni revoca correos ya enviados.

## 6. Fixtures alternativa 1 — base desechable/schema clonada (recomendada)

Crear namespace/contenedor y volumen **nuevos y exclusivos** `kortek-c3-guest-<run>` / `kortek-c3-guest-<run>-pg`; ningún dato previo, backup real, rol o credencial QA. Replicar schema/ledger existentes de QA desde fuentes verificadas, sin nuevo DDL de producto ni ejecución en QA compartido. Si se quiere copiar datos de QA, autorización y anonimización/custodia propias; no es necesaria ni recomendada. API/web candidatas conectadas sólo a esta base; conservar QA compartido sin desvíos de tráfico por inferencia.

Seed: dos Organizations A/B con CmsPage publicado y BusinessSchedule CONFIRMED, days/windows, Service/Professional públicos; identidades internas de fixtures autorizadas con Membership OWNER/ADMIN/RECEPTIONIST/BARBER y vínculo Professional→BARBER sólo dentro del clone. Ningún User/Membership CUSTOMER. Recoger IDs generados en manifiesto local de ownership; slugs `c3-guest-<run>-a/b`, nombres “Fixture C3 invitado A/B”. Teléfono sintético sólo contacto, no enviar WhatsApp/SMS; correo nulo en caso inicial.

Flujos: crear reserva nueva A; segunda reserva A en slot distinto con mismo teléfono reutiliza exactamente Client A; reserva B mismo teléfono crea otro Client aislado. Con/sin sesión interna, tenant contrario 404/roles denegados según contrato, UI sin cuenta, cinco pasos, PENDING/{booking}, calendario, confirmación, panel filtrado al run. Confirmar/cancelar/reprogramar y notificaciones según contratos. Para emisión/recibo/pago utilizar reserva y service de prueba con precio positivo, duración mínima autorizada, esperar fin real y transiciones aprobadas; nunca alterar reloj/constraints o inventar un estado. Facturas y Payment sólo aquí si el propietario aprueba esa cobertura financiera.

Los GET/POST deben apuntar al endpoint **del namespace aprobado**, no a un URL inventado ni al staging compartido. Arranque de réplica API/web, origen HTTP, recursos y configuración sólo de réplica requieren autorización: mantener aislamiento/canal a sink en réplica y usar identidades Clerk de prueba existentes cuando se valide autenticación real. Si requiere origin/authorized-parties nuevos en Clerk, parar y proponer separado. Auth/verificador controlado sirve para pruebas técnicas, no certifica autenticación real C3; no confundir con los 9 escenarios C2. Un schema clone solo tampoco certifica disponibilidad de QA compartido: separar evidencia de ambas capas.

Comandos propuestos de recursos, **no ejecutables hasta fijar imagen PG instalada/digest, namespace/origen y seed/harness revisado**:

```powershell
$taskRun=[guid]::NewGuid().ToString('N')
$taskPgName="kortek-c3-guest-$taskRun-pg"
$taskVolume="kortek-c3-guest-$taskRun-data"
# Registrar ausencia previa e IDs de recursos creados; credencial efímera sólo stdin seguro.
# El arranque/API/seed requieren harness nuevo revisado; no sustituirlo por el runner local C1.
# Al final, tras verificar labels, IDs y ownership del run:
podman stop $taskPgName
podman rm $taskPgName
podman volume inspect $taskVolume
podman volume rm $taskVolume
```

Seleccionar previamente engine/host exacto: bloque muestra Podman, no presupone su instalación Windows ni autoriza Docker Desktop. Añadir stop/rm de **cada** API/web/worker de réplica por ID exacto del manifiesto antes de retirar PG. Si se usa tmpfs no habrá volumen: no inventar un volumen para borrar. Probar ausencia final. No `prune`, comodines, eliminaciones de volúmenes ajenos ni restore en base existente. Si falla cleanup, conservar recursos aislados identificados y detener acceso/salida del namespace aprobado; reportar, no borrar a ciegas. No hay rollback de QA compartido porque nunca se redirigió.

## 7. Fixtures alternativa 2 — QA compartido

Viable sólo con autorización expresa de persistencia transitoria/limpieza y dos negocios **exclusivos del run**. Preferir nuevos negocios de fixture, nunca Client previo: reutilización se prueba contra Client creado durante este mismo run. No inferir creación de negocios/membresías de “autorizar una reserva”. Registrar cero coincidencias de slug/email/teléfono antes y capturar IDs/censo sin PII. Uso de sesiones internas existentes debe estar autorizado, sin crear/modificar Clerk.

| Tabla / recurso | Filas/efectos propuestos |
| --- | --- |
| Organization, CmsPage | A/B exclusivos; page creada por mecanismo existente; publicar sólo fixture |
| BusinessSchedule, BusinessScheduleDay/Window | 2 schedules CONFIRMED y ventanas revisadas; no tocar agenda previa |
| Service, Professional, vínculos autorizados | 1 servicio y profesional por tenant; vínculo BARBER y Membership internas necesarias, nunca CUSTOMER |
| Client | 2 nuevos A/B con userId null; A reutilizado por la segunda reserva; posible customerBookingRevision incrementado por trigger exclusivamente sobre estos Clients |
| Booking | 3 inicialmente (A nueva, A reutilizada, B aislada); IDs UUID devueltos, slots reales distintos; PENDING |
| BookingEmailPreference | 1 por booking aun sin correo/consentimiento |
| BookingEmailEvent, EmailOutbox | 1 por creación y más por cambios reales; sin opt-in outbox OMITTED/NO_CONSENT; opt-in válido puede quedar PENDING y enviar correo |
| AuditLog | CREATE de Client (fail-open puede dejar 0) y eventos internos que efectivamente se operen, ligados sólo a IDs de fixture |
| SecurityRateBucket / EmailAbuseBucket | Counters técnicos por ruta/IP/correo; pueden actualizar bucket previo. No borrar ni rebobinar contadores compartidos; TTL normal y evidencia separada |
| User, Membership CUSTOMER, CustomerOperation | 0 creados por reserva; baseline y after hashes/counts agregados server-side, no descargar PII |
| Notification legacy | No hay productor nuevo en POST invitado revisado; exigir delta 0 o investigar antes de cleanup |
| Invoice/Payment/InvoiceOperation | 0 en perfil compartido recomendado. Si se exige probar escritura de recibos financieros, elegir desechable o aprobar por separado persistencia/retención de estas filas; no prometer borrado financiero genérico |
| EmailWebhookReceipt, proveedor | 0 sin envío. Con entrega real pueden existir callbacks tardíos; exigir mailbox del propietario, autorización y estrategia de retención antes del test |

Identificadores: UUIDs nuevos offline para run/negocios si el seed lo permite; IDs generados por API se capturan y no se inventan. Slugs run A/B, nombre explícito fixture, números de ejemplo `+18095550101/102` sólo contacto (no SMS/WhatsApp). Correo omitido primero; opt-in real sólo a mailbox controlado por propietario, pendiente de especificar, jamás dominio inválido ni B2B real. Manifest privado de ownership registra IDs/timestamps/versiones y hashes de snapshots, no tokens ni PII en evidencia pública. No se generó ningún ID de fixture real ni POST ahora.

Limpieza propuesta: transacción administrativa con capacidad autorizada (no ampliar grants de runtime), verificación de manifiesto allowlist de IDs **creados** y tenant A/B exactos, locks Organization→Client→Booking según contrato; comprobar ausencia de Invoice/Payment/CustomerOperation ajenos, intents en PROCESSING/lease/proveedor/callbacks, o relaciones hacia datos previos. Abort/rollback completo si cualquiera existe. Capturar antes todo conjunto de filas ajenas mediante conteos/fingerprints agregados y consulta anti-join en servidor; no exportar filas privadas. Comparar antes/después **de limpieza**, no confundir cambios concurrentes de QA con resultados de fixture.

Orden bajo FK RESTRICT: receipts (sólo si autorizados y seguros) → outbox → email events → email preference → bookings → clients → vínculos/profesionales/servicios → horarios/windows/days/closures si creados → CMS/business schedules → Membership del run → Organizations. AuditLog sólo IDs exactos del run y con aprobación específica de custodia; si debe sobrevivir según política, conservarlo sanitizado y no afirmar “0 filas”. No borrar User global o identidades Clerk existentes. Incluir revisiones/CMS operations/invitation operations si el seed las creó: censo real de FKs/todas las tablas obligatorio, no asumir que lista fija basta. Triggers de Booking incrementan sólo Clients de fixture que luego se eliminan. Nunca usar DELETE por nombre/LIKE/teléfono, CASCADE amplio, TRUNCATE, desactivar triggers, constraints, RLS, hard-delete financiero o restore global.

Prueba de no afectar previos: cada DELETE exige join a allowlist+tenant, `RETURNING id` contra conjunto esperado; 0 IDs anteriores; hashes/conteos de filas previas iguales dentro de la transacción con ventana autorizada y sin concurrencia que invalide la prueba; al final anti-join confirma sólo la ausencia de ownership del run. Los contadores técnicos compartidos no se limpian: documentar esta persistencia residual, sin afirmar igualdad total de base. Ejecutar primero el mismo cleanup sobre un clone equivalente con fila centinela previa, rollback por fallo intencional y re-ejecución idempotente. Esta prueba **no está ejecutada**; hasta aprobarla no hacer POST compartido.

Comando futuro de cleanup, parametrizado y fail-closed: `psql -X -v ON_ERROR_STOP=1 --file <cleanup-revisado-del-run.sql>` mediante conexión administrativa QA custodiada, sin credencial/URL en argv/log. El archivo SQL/harness debe implementarse y revisarse bajo autorización distinta; no existe hoy ni se anuncia como disponible. Sin autorización administrativa o cleanup probado, esta alternativa no está Ready. Si falla dentro de transacción: ROLLBACK automático, ninguna eliminación parcial. Si aparecen callbacks tras un envío real: conservar/aislar fixtures e informe, autorizar retención/corrección específica; no recrear ni sobrescribir datos previos y no restaurar snapshot global. Correos enviados no se pueden deshacer.

### Comandos HTTP propuestos para ambas alternativas

Sólo después de los gates de entorno, pareja y ownership, con `$taskApiBase` fijado al endpoint autorizado y rechazando cualquier URL productiva, slugs/UUIDs de manifiesto y slots reales del GET. PowerShell no imprime sesión ni headers; taskToken sólo en memoria de una sesión sintética interna existente y autorizada, nunca en argv/env/archivo/log. No se necesita token para el primer POST.

```powershell
$taskApiUri=[Uri]$taskApiBase
if($taskApiUri.Host -eq 'api.booking.kortek.cloud'){throw 'Producción prohibida'}
if($taskApiBase -ne $taskApprovedFixtureApiBase){throw 'Destino no autorizado'}
$taskData=Invoke-RestMethod -Method Get -Uri "$taskApiBase/public/$taskSlugA/booking-data"
$taskSlotUri="$taskApiBase/public/$taskSlugA/availability?date=$taskApprovedDate&serviceId=$taskServiceA&professionalId=$taskProfessionalA"
$taskSlots=Invoke-RestMethod -Method Get -Uri $taskSlotUri
# Elegir explícitamente un slot vigente del resultado, nunca hora inventada.
$taskBookingJson=@{serviceId=$taskServiceA;professionalId=$taskProfessionalA;startTime=$taskApprovedSlot.startTime;clientName="Fixture C3 invitado $taskRun";clientPhone='+18095550101'} | ConvertTo-Json -Compress
$taskResponse=Invoke-WebRequest -Method Post -Uri "$taskApiBase/public/$taskSlugA/bookings" -ContentType 'application/json' -Body $taskBookingJson
if($taskResponse.StatusCode -ne 201){throw 'No es 201'}
$taskBody=$taskResponse.Content | ConvertFrom-Json
if(($taskBody.PSObject.Properties.Name -join ',') -ne 'booking'){throw 'Contrato incorrecto'}
if($taskBody.booking.status -ne 'PENDING'){throw 'Estado incorrecto'}
# Registrar sólo id/estado/ruta/status/X-Request-Id sanitizados en ownership.
$taskHeaders=@{Authorization="Bearer $taskToken";'X-Organization-Id'=$taskOrganizationA}
# Segundo POST: mismo contacto + slot distinto confirmado por disponibilidad.
# Usar taskHeaders para el caso con sesión, sin añadir userId/organizationId al body.
$taskBookingRows=Invoke-RestMethod -Method Get -Uri "$taskApiBase/bookings?from=$taskApprovedDate&to=$taskApprovedDate" -Headers $taskHeaders
# Aislamiento: GET interno autorizado A no expone fixture B; IDOR donde exista ruta.
# Rutas retiradas: GET/PATCH/POST del inventario C1 deben ser router 404 con/sin bearer.
```

El `Invoke-RestMethod` de listado debe capturarse en variable y filtrar/sanitizar sólo IDs de fixture antes de reportar; no copiar su salida privada. Baselines User/Membership/Client/Booking, outbox y ownership se verifican con Prisma/SQL agregado server-side dentro del destino aprobado, no a través de endpoints inventados. Tres POST iniciales están bajo presupuesto 5/minuto/IP; errores/409/429 no se reenvían a ciegas. Las rutas inexistentes con body vacío cuentan también como prueba negativa, no fixture B2C.

Finanzas sólo en alternativa desechable aprobada: `PATCH /bookings/:id/status` con `{status:'CONFIRMED'}` y después `{status:'COMPLETED'}` sólo tras su fin real; `POST /invoices` con `{bookingId}`; `POST /invoices/:id/payments` con `{method:'CASH'}` según DTOs existentes y permisos del rol. Usar los IDs devueltos/tenant autenticado, nunca amounts/state inventados. Las lecturas `GET /invoices` y `GET /bookings/:id/notifications` (ruta del controller vigente) requieren sesión y sanitización. Guardar evidencia de recibo/idempotencia/transacciones, sin afirmar capacidad nueva. La prueba browser se hará en la pareja real, datos de fixture únicamente, desktop 1280 y móvil 320/375/390, foco/teclado/inputs/overflow/consola y estados; capturas sin datos ajenos.

## 8. Evidencia final y aceptación preparatoria

Inventario final por archivo/estado/hash: [final-inventory.json](../quality/evidence/reserva-invitado-preparacion/final-inventory.json). Lista legible: [candidate-files.md](../quality/evidence/reserva-invitado-preparacion/candidate-files.md). Diff acumulado de fuentes, contratos y originales archivados: [full.patch](../quality/evidence/reserva-invitado-preparacion/full.patch); evidencia binaria/logs se entrega por separado en el inventario, evitando incluir patches recursivos. Validaciones finales locales: [final-checks.json](../quality/evidence/reserva-invitado-preparacion/final-checks.json).

## 9. Riesgos pendientes

Preparación completa: inventario/hash/diff revisado, no rutas prohibidas detectadas, pareja y gates definidos, dos alternativas con persistencia/notificaciones/cleanup/rollback identificados. Riesgos que bloquean ejecución: remoto vivo desconocido hoy; P4b de historia pendiente (20 commits según ref local); B1/CI E2E pendiente; automatización Vercel; recurso build OCI compartido; mecanismo administrativo de selectores pendiente; consumo externo desconocido; sesiones/origins de clone; fixtures/cleanup/custodia y correo real sin autorización. No se rebaja C3 ni se afirma que la propuesta ya probó limpieza.

Parar ahora y esperar autorización explícita. Siguiente decisión: aprobar inventario para commit local y auditoría P4b, luego aprobar rango/push/activación coordinada y seleccionar fixtures. Aprobar una etapa no abre las demás. QA conserva el estado del último preflight y no se hizo ninguna consulta nueva ni cambio externo en esta preparación.

## Ampliación explícita del manifiesto — 2026-10-07

El propietario autorizó añadir DECISIONES_PROPIETARIO_2026_09_29.md y enmendar 2/13 parcial/28/29 parcial sin borrar originales. Antes de editar se revalidaron las 294 rutas originales: 251 SHA-256 y tamaños iguales, 41 eliminaciones ausentes y dos exclusiones autocíclicas declaradas, cero diferencias. Manifiesto ampliado a **295 rutas**, sin P4B_RESERVA_INVITADA.md (reservado al segundo commit).

Cambios autorizados posteriores: documento de decisiones añadido; PROJECT_MASTER, docs/README, PRD y APP_FLOWS registran la enmienda y cancelan M2 C3/P4/P5; este informe, candidate-files, candidate-paths y final-checks explican la ampliación; final-inventory recalcula hashes y conserva los hashes previos de cada ruta cambiada. full.patch, review.json y las demás evidencias preparatorias son snapshots históricos intactos, no el nuevo diff.

Documentos vivos fuera del manifiesto que conservan afirmaciones anteriores: docs/quality/M2_CUENTA_CLIENTE_C0.md (cuenta requerida para Piloto 1 y decisión 2 FIJADA), docs/quality/RESERVA_PUBLICA_M1_C0.md (casilla visible/requisito) y docs/quality/AUDITORIA_HALLAZGOS_ROADMAP_MVP_2026_09_29.md (roadmap M2). Propuesta: añadir cabecera fechada que remita a la enmienda, marque M2 retirado y conserve todo su texto histórico. No se modifican en este cierre. M2_C3_PREFLIGHT.md y M2_C3_P4_CLERK_CHECKLIST.md también conservan planes anteriores: proponer aviso de cancelación C3/P4/P5 en cabecera, sin ejecutar sus comandos. PROJECT_MASTER, PRD, APP_FLOWS y docs/README ya excluían B2C; sus párrafos inferiores se conservan como historia y ahora remiten además a la enmienda. ROADMAP_POST_CMS_AUDITORIA.md es planificación histórica; no fija cuenta como requisito vigente.

Autorización actual: dos commits locales, fetch de lectura y P4b de historia completa, B1 y suites aisladas PG18; SIN PUSH, bases reales, QA, proveedores o correo. La enmienda resuelve la parada anterior. M2 C3/P4/P5 CANCELADOS, no aprobados ni ejecutados.
