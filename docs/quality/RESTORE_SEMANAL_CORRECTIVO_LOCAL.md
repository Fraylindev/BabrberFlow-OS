# Restore semanal: correctivo local — 2026-10-15

**IMPLEMENTADO / VALIDADO LOCALMENTE / EN REVISIÓN. Sin instalación ni cierre operativo.**

## Alcance y aceptación

Operador de continuidad: permitir restaurar una copia válida sin reservas y un esquema público ampliado, rechazar archivos/restores incompletos y conservar un diagnóstico seguro. No cambia producto, API, permisos, Prisma, backup diario, monitor, timers, alarmas ni infraestructura. Todo ensayo usa datos sintéticos y recursos desechables. No autoriza ejecutar el job instalado ni consultar bases de producción/QA.

Skill aplicada: [kortek-delivery](../../.agents/skills/kortek-delivery/SKILL.md); gates y seguridad del repositorio. Este correctivo operativo no abre frontend ni un gate de producto posterior.

## Evidencia histórica y reciente

`PREFLIGHT_PRODUCCION_P0_P1.md` (fuente histórica del checkout Desktop, preservada en `de3a062aba70157da5fbf1b569a73aecb0d04087`; consultar con `git show de3a062aba70157da5fbf1b569a73aecb0d04087:docs/quality/PREFLIGHT_PRODUCCION_P0_P1.md`), apartados «OCI restore semanal: logs propios, persistencia y salidas 1» y «diagnóstico de restore semanal»: servicio failed/exit 1 el **2026-10-04 06:32:08 UTC**, journal sin entradas y stderr propios eliminados. El conteo anterior 31/30/25 no prueba el contenido del objeto usado en ese fallo. Booking=0 en otra referencia no demuestra Booking=0 en aquel backup.

Lectura acotada de correos OCI mediante Gmail, sin consola OCI, SSH ni base de datos:

| Aviso | Momento del evento UTC | Valor comunicado | Evidencia |
| --- | --- | --- | --- |
| Restore OK_TO_FIRING | 2026-10-16 02:28 | restore_age_hours=451.89, umbral >192 | [Correo](https://mail.google.com/mail/u/0/#all/1a1428cbb7919735) |
| Backup OK_TO_FIRING | 2026-10-16 02:28 | backup_age_hours=165.13, umbral >30 | [Correo](https://mail.google.com/mail/u/0/#all/1a1428cd27d5009a) |
| Restore FIRING_TO_OK | 2026-10-16 02:32 | 0 series sobre umbral; dimensiones y valores vacíos | [Correo](https://mail.google.com/mail/u/0/#all/1a1429069a54f359) |
| Backup FIRING_TO_OK | 2026-10-16 02:32 | 0 series sobre umbral; dimensiones y valores vacíos | [Correo](https://mail.google.com/mail/u/0/#all/1a142905e32baf28) |

Son **15 de octubre, 22:28 y 22:32 en Santo Domingo**. La búsqueda también mostró transiciones anteriores a las 02:22/02:24 UTC. Los avisos OK no contienen una muestra fresca de edad ni acreditan BACKUP_OK/RESTORE_DRILL_OK. No prueban recuperación, ni explican las oscilaciones. No se guardan MIME, cabeceras, tokens de suscripción ni datos privados en Git.

## Causa reproducible y atribución limitada

El script original de la base `2896d24` tiene SHA-256 LF **cfdf9313235a52fbbc7d705dee1ee4eaa353dba5d76a3b91c8683c1c663cb90c**, idéntico al hash versionado documentado en el preflight. Se ejecutó completo con dobles locales obligatorios de OCI/GPG/Podman:

| Fixture | Salida original | Resultado corregido |
| --- | --- | --- |
| 31 tablas, ledger 26, Booking=0 | exit 1, stage=verification | éxito |
| 37 tablas, ledger 26, Booking=1 | exit 1, stage=verification | éxito |

Los fallos son independientes: `Booking >= 1` rechaza una base válidamente vacía; `tables == 31` rechaza el esquema ampliado incluso con reservas. La eliminación de todos los logs temporales impide diagnosticar después una salida genérica. **Se demuestran defectos del código; no la causa del incidente del 4 de octubre ni del backup vencido reciente.**

Faltan para atribuir el incidente: objeto exacto, hash/contenido de aquel backup, versión instalada en ese momento, etapa y estados de sus procesos, stderr o diagnóstico saneado del intento. Para el backup vencido faltan sus resultados/journal, inventario vigente y procedencia de las muestras. Obtenerlos requeriría otra autorización; esta entrega no los consulta.

El monitor versionado obtiene la edad del backup del timestamp del inventario y la del restore del mtime de `latest-restore-counts.txt`. No se cambió el cálculo ni se actualizó un marcador real. Corregir el restore no demuestra que vuelva a funcionar el backup diario.

## Corrección

[restore-drill.sh](../../ops/oci-free-backup/restore-drill.sh):

- Compara el conjunto exacto de tablas restauradas con entradas TABLE del TOC; distingue TABLE DATA. Rechaza duplicados, nombres no soportados, diferencias y ausencia de cualquiera de las 31 tablas mínimas de la base histórica. Admite tablas adicionales presentes en el mismo archivo.
- Consulta el ledger restaurado: exige al menos 26 migraciones terminadas/no revertidas y ninguna pendiente fallida sin rollback. Mantiene las filas históricas revertidas; no modifica el ledger.
- Cuenta Booking como evidencia numérica; cero es válido. No siembra reservas para satisfacer el gate.
- Mantiene SHA-256, descifrado en flujo, red none de Podman, transacción única, exit-on-error y no-owner/no-acl.
- Separa etapas checksum, archive_listing, archive_schema, restore, verification y record_success. Conserva en STATE_DIRECTORY `latest-restore-result.txt`, modo 0600, únicamente timestamp UTC, etapa, status y código fijo. stderr sensibles siguen siendo temporales y se eliminan; no se copian al journal ni al resultado.
- Publica el marcador de éxito por reemplazo atómico solo tras validar todo. Un fallo conserva contenido y mtime anteriores; el diagnóstico separado no rejuvenece la métrica del monitor.
- Regla LF limitada al script corregido en `.gitattributes`; no normaliza otros scripts/unidades.

La comprobación de TOC y ledger **no compara filas con la fuente ni acredita identidad/checksum de todas las migraciones**. Sigue siendo restore del schema public sin roles/owners/ACL y sin prueba de schemas gestionados. No es el respaldo ampliado P1 ni un cierre de sus límites históricos.

## Validación reproducible

Desde la raíz del worktree autorizado:

```powershell
& 'C:/Program Files/Git/bin/bash.exe' -n ops/oci-free-backup/restore-drill.sh
python -B ops/oci-free-backup/test-restore-drill.py --pg-bin 'C:/Program Files/PostgreSQL/18/bin' -v
git diff --check
```

El arnés verifica antes de ejecutar que OCI/Podman/GPG/python3 resuelvan exclusivamente a sus dobles efímeros; establece PATH dentro de Bash sin perfiles, excluyendo el OCI real. Nunca ejecuta servicios Podman, ni carga .env/credenciales operativas. GPG se simula; las llamadas OCI de la suite definitiva se simulan. Usa frase ficticia sin datos reales.

Fixtures de 31/37 tablas y Booking=0/25, errores de listado/descarga/descifrado/TOC/restore/SQL/checksum, tablas faltantes incluso con TOC coincidente, duplicados, conteos inválidos, ledger insuficiente/incompleto/malformado y fallo al escribir el marcador. Verifica ausencia de salida de éxito ante fallo, conservación de mtime/contenido y ausencia del sentinel privado en salida/diagnóstico; elimina workdir.

La integración real crea un clúster **PostgreSQL 18.1** con puerto efímero en **127.0.0.1**, schemas sintéticos de 31 y 37 tablas, ledger terminado y Booking=0; ejecuta pg_dump custom, pg_restore TOC y transacción única, consultas de conteo/ledger y el validador del script completo. El doble Podman redirige únicamente a ese clúster; se detiene y elimina al finalizar. Las tablas son simplificadas: no ensaya todas las migraciones/constraints de Kortek.

Resultado final: **12 pruebas aprobadas, 0 omitidas, 62.213 s, exit 0**. Bash `-n`: exit 0; `git diff --check`: exit 0. Bash 5.2.37 y pg_restore 18.1. La integración real cubre ambos tamaños.

No se ejecutaron suites API/web ni builds: no cambian sus fuentes/contratos. Docker local no dispone de servidor; PostgreSQL 17/Podman Linux reales, GPG real, descarga OCI, imagen instalada, ownership/ACL Linux y programación semanal quedan sin verificar.

## Incidencias del arnés y límites de acceso

Los primeros intentos se bloquearon por resolución de comandos en Windows. **Antes de fijar PATH y añadir la comprobación obligatoria, Bash invocó el OCI real del equipo con `os object list --auth instance_principal`.** Esos procesos se detuvieron sin salida de resultado consumida ni evidencia de operación completada. No se puede afirmar ausencia de intentos de conexión ni demostrar cero lecturas remotas en esos intentos. No se ejecutaron escrituras OCI, descargas remotas, restore remoto, consultas de base de producción/QA, SSH, cambios de infraestructura ni timers/alarmas. Este desvío se comunica explícitamente; los intentos no cuentan como evidencia de OCI ni como pruebas aprobadas.

También se corrigieron problemas del arnés: checksum fixture CRLF, alias python3/UUID de Linux, herencia de pipes al iniciar PostgreSQL Windows y distinción TABLE/TABLE DATA del validador nuevo. Solo cuentan las ejecuciones terminadas exit 0; los intentos fallidos no se convierten en aprobación.

## Git, revisión y siguiente paso

El checkout inicial Desktop permanece en ai/reserva-invitado-ci/de3a062, con el Playbook ajeno intacto. `git switch ai/antigravity-qa` falló porque ya estaba ocupada. Se continuó en su worktree existente, **<WORKTREE_M3>**, base **2896d249942c13a11eb161ff481ba54f8f69eae0**; acceso local ampliado para esa ruta. Archivo ajeno sin seguimiento `ops/oci-api/oci.env` preservado, sin leerlo ni incorporarlo.

Estado inicial del 15 de octubre: script, prueba, regla LF, este informe, README operativo y controles docs/README.md, PROJECT_MASTER.md y CHANGELOG.md sin staging/commit/push/fetch. El seguimiento del 16 de octubre que sigue sustituye exclusivamente ese estado local; no se verifica SHA remoto en vivo al no existir publicación.

Pendiente de auditoría/aprobación del propietario; **sin despliegue ni recuperación operativa acreditada**. Una autorización futura deberá revisar el diff, probar en PostgreSQL 17/Podman desechables y definir instalación/observación de jobs como alcance separado. No ejecutar la receta operativa del README por inferencia.

## Seguimiento 2026-10-16: checkpoint local y custodia

El propietario autoriza actuar con prudencia sobre las observaciones de trabajo pendiente y credenciales. Se conserva el correctivo mediante **checkpoint local independiente, IMPLEMENTADO / EN REVISIÓN**, sin push, despliegue ni cierre operativo. No se descarta ni se mezcla con el correctivo M3/CORS u otros commits pendientes. La integración posterior debe preservar ambas entradas documentales; las coincidencias de archivos implican posibles conflictos, no un conflicto demostrado por una integración ejecutada.

Se revisan el diff completo, las rutas explícitas, los archivos nuevos y el índice antes del commit. Se repite la suite en PostgreSQL 18.1 desechable, con aislamiento adicional de PGPASSFILE/PGSERVICEFILE y de variables RESTORE_TEST heredadas. Resultado de esta repetición: **12 pruebas aprobadas, 0 omitidas, 95.107 s, exit 0**; Bash -n y git diff --check exit 0. Se mantienen las limitaciones PG17/Podman/GPG y la causa histórica no atribuida. La rama local autorizada ai/antigravity-qa avanzará únicamente por este checkpoint; main, las otras ramas y los remotos no se modifican.

### Clasificación y protección local

- `ops/oci-api/oci.env` no estaba versionado ni ignorado en este worktree. Contenía una única cadena opaca de 64 bytes; no se identificó como configuración ni se confirmó su vigencia o tipo de credencial. No se imprime ni incorpora su valor, ni se prueba contra OCI.
- Se guarda cifrado con **DPAPI CurrentUser** en `<CUSTODIA_LOCAL>/oci.env.dpapi`. Se verifica descifrado idéntico en memoria antes de retirar el archivo original del worktree. No se destruye su contenido: queda recuperable en la custodia local.
- Se añade `/ops/oci-api/oci.env` al `info/exclude` común de este repositorio, verificado con `git check-ignore -v`. Esto protege los worktrees de este clon sin esperar integración. No sustituye la regla versionada de `38be55a` para otros clones; ese commit no se integra en este gate.
- La identidad SSH histórica de `.tmp/base-preprod-c1/oci-kortek-ed25519-user` se confirma OpenSSH **sin passphrase**. Se traslada sin modificar sus bytes a `<IDENTIDADES_SSH>/oci-ed25519`, con pública correspondiente y copia DPAPI adicional `oci-ssh-key.dpapi` en la misma custodia. Hash origen/destino y correspondencia privada/pública comprobados. Se retira únicamente el archivo privado original después de esas verificaciones.
- Carpetas y archivos de custodia permiten acceso solo al usuario actual y SYSTEM; ACL comprobadas. La llave trasladada **sigue sin passphrase**; el cambio protege ubicación/permisos y no acredita una rotación ni elimina todo riesgo local.
- La clave API OCI de `<CONFIG_OCI_LOCAL>/oci_api_key.pem` ya estaba fuera del repo y su PEM está cifrado. No se descifra ni divulga su secreto, no se prueba vigencia y no se modifica. SSH y API son identidades distintas.
- No se ejecutan OCI, SSH, conexiones productivas/QA ni revocación remota durante este seguimiento. No hay evidencia suficiente para declarar compromiso o credenciales vigentes. La retirada de una clave remota exige sustitución y recuperación verificadas en un gate operativo; no se improvisa desde este cierre local.

### Continuidad y límites de recuperación

La ruta privada antigua ya no existe. Diez helpers históricos ignorados del checkout Desktop la referencian: ci-env-api-read.py, m3-gate4-precondition.py, m3-gate4-provider-read.py, m3-gate4-snapshot.py, plan-production-read.py, prod-p0-alarms.py, prod-p0-oci.py, prod-p1-oci-diagnose.py, prod-p1-oci-logs-generated.py y prod-p1c-oci.py. **No se modifican ni ejecutan esos helpers históricos. Antes de una operación autorizada, adaptar su referencia explícitamente a la nueva ruta y revisar su alcance.** No se introduce fallback ni symlink bajo el repo hacia una clave privada.

DPAPI es custodia ligada al perfil Windows de este equipo, no un respaldo independiente ni un gestor externo. El manifiesto de rutas permanece junto a los cifrados, fuera de Git; la custodia externa y la estrategia de passphrase/rotación SSH siguen pendientes de un gate de credenciales. No se valida acceso remoto para preservar el límite de esta intervención. No se afirma borrado seguro de sectores ni ausencia de copias históricas de la llave.

Después del checkpoint deben quedar índice y árbol M3 limpios. El checkout Desktop conserva únicamente su Playbook ajeno sin seguimiento, sin cambios en su HEAD. Los cinco pendientes operativos del restore siguen abiertos en lo que este checkpoint local no cubre; continuar M3 no autoriza ejecución productiva del restore ni del backup.

Referencia de integración observada sin fetch: `origin/ai/antigravity-qa` apunta localmente a `38be55a`, con cuatro commits posteriores a la base: `32f3b36` (CORS/Retry-After), `4cab71f` (cierre despliegue QA), `4740ad4` (runner CI) y `38be55a` (gitignore). **No se integran aquí**: pertenecen a otros gates y su rango incluye API/web, workflows y evidencia. Después de este checkpoint local, la rama de trabajo tendrá una divergencia conocida respecto de esa referencia. No intentar push directo, force ni rebase por inferencia; conciliar ambos alcances en la integración M3, conservando el checkpoint y resolviendo documentación. No se acredita el HEAD remoto vivo mediante esta lectura local.

## Continuación autónoma 2026-10-16: integración y cifrado SSH

Nueva autorización del propietario: completar autónomamente lo pendiente que sea prudente. Se realiza integración **solo local**, conservando el checkpoint `e058eaa` y los cuatro commits conocidos hasta `38be55a`; sin rebase, descarte, fetch, push ni despliegue. Los conflictos reales se limitan a CHANGELOG.md, PROJECT_MASTER.md y docs/README.md: se conservan completas las entradas de ambos lados y se añade esta actualización de estado. El código, los workflows y la evidencia importados se cotejan byte a byte con `38be55a`; script y pruebas del restore se cotejan con `e058eaa`. La referencia remota no se consulta en vivo.

La regla versionada `/ops/oci-api/oci.env` ya queda integrada localmente, además de la exclusión local común. El archivo sigue fuera del repo en su custodia DPAPI. La afirmación anterior de integración pendiente corresponde al checkpoint inicial y queda sustituida por esta continuación; el cierre operativo del restore y la causa histórica siguen pendientes.

### Llave SSH cifrada y recuperación offline

Se ensaya primero con una identidad sintética el cifrado OpenSSH mediante AskPass y recuperación de la misma pública. Los runtimes Python existentes no incluían bcrypt para serializar OpenSSH cifrado; no se instala ni actualiza ningún paquete. Se utiliza Git OpenSSH ya instalado. Un intento sintético inicial en el sandbox falló por permisos temporales; la repetición autorizada fuera de ese sandbox terminó exit 0, sin conexión remota.

La identidad real de `<IDENTIDADES_SSH>/oci-ed25519` **ya tiene passphrase**. La frase se genera con RNG criptográfico, se custodia como `oci-ed25519.passphrase.dpapi` con CurrentUser y se entrega exclusivamente por AskPass entre procesos locales: no se imprime, no pasa en argv/env ni se guarda en texto plano. La candidata cifrada se descifra offline y se compara con la pública antes de reemplazar atómicamente el archivo activo. El helper `verify-identity.py` repite esa verificación offline con exit 0. **No se rota la identidad ni se cambia authorized_keys remoto**: la clave pública permanece igual, sin evidencia actual de compromiso que justifique revocarla a ciegas.

Se conservan en la custodia restringida copias verificadas del OpenSSH cifrado y del passphrase DPAPI, además del original previamente sellado con DPAPI; el manifiesto externo se actualiza. Todos los archivos permanecen fuera de Git y con ACL de usuario/SYSTEM. El cifrado y la recuperación del secreto quedan ligados al perfil Windows: la copia independiente externa continúa sin acreditar.

Herramientas locales externas al repo, sin secretos dentro de su código:

- `<IDENTIDADES_SSH>/verify-identity.py`: verificación offline con Git ssh-keygen y AskPass. Ejecutado exit 0, pública coincidente.
- `<IDENTIDADES_SSH>/askpass.sh` y `askpass.ps1`: adaptador local restringido para DPAPI; no ejecutarlo manualmente, pues su stdout está destinado al proceso OpenSSH solicitante.
- `<IDENTIDADES_SSH>/Load-OciSshIdentity.ps1`: preparado para cargar la copia DPAPI en memoria hacia un agente Windows ya disponible, sin escribir una privada plana ni arrancar servicios. Solo se valida sintaxis; **no se ejecuta ni se acredita carga del agente**. No autentica ni conecta a ningún host.

Los diez helpers históricos citados arriba conservan la ruta antigua y deben adaptarse deliberadamente antes de un uso operativo autorizado; no se ejecutan ni reescriben como parte de esta integración. La estrategia local de cifrado y recuperación queda implementada. La comprobación de acceso remoto, una eventual rotación y la custodia independiente requieren otro alcance y/o un destino externo autorizado; no son condiciones que se puedan dar por satisfechas con una copia en este mismo equipo.

### Validación de integración

Entorno sintético sin dotenv, con DATABASE_URL loopback inaccesible y claves efímeras, usando pnpm ya instalado: API CORS/guard **10/10**, componente CalendarFailure **6/6**, cliente HTTP **16/16**, las tres ejecuciones exit 0 y ninguna omitida. Resumen/logs adicionales en `.tmp/restore-integration-20261016/`, ignorado, sin sobrescribir la evidencia original importada. El código importado coincide con el gate ya documentado: no se repiten builds, suites completas o QA visual sin cambios nuevos de producto; no se presenta esta integración como nueva aprobación de UI/QA.

La suite de restore en el árbol integrado con PostgreSQL 18.1 desechable termina con **12/12, 0 omitidas, 90.503 s, exit 0**. Sumadas a las tres suites dirigidas: **44 pruebas aprobadas, 0 omitidas**. Bash -n, diff/check, enlaces locales nuevos y ausencia de conflictos se verifican antes de finalizar. No cambian dependencias, bases reales, timers, alarmas, proveedores ni configuración de runtime. Sin OCI/SSH remoto durante esta continuación.

Límite de cierre: integración y custodia **locales** completadas y en revisión; push/despliegue, PG17/Podman/GPG real, backup fresco, restore operativo y primera ejecución semanal por horario continúan pendientes. No se declara recuperación de las alarmas.

## Auditoría de publicación: privacidad

Las ubicaciones personales se sustituyen por raíces lógicas: WORKTREE_M3 (checkout de trabajo), CUSTODIA_LOCAL (custodia cifrada restringida), IDENTIDADES_SSH (identidades fuera del repositorio) y CONFIG_OCI_LOCAL (configuración OCI externa). El manifiesto local conserva las ubicaciones operativas y no se incorpora al repositorio. No se abren credenciales para esta auditoría.

El candidato inicial 64f04f5 no debe publicarse: sus commits locales anteriores contenían rutas personales. Sanear únicamente el árbol final no elimina esa información de los commits que viajarían en el push. Se prepara un árbol saneado y se valida antes de decidir una publicación que excluya ese historial privado, conservando los commits originales localmente. No se presume autorización para reescribir historial por el solo resultado de pruebas.

### Resultado de auditoría previa al nuevo candidato

Remoto observado mediante ls-remote: 38be55a3db596c39302705fd2765c23835d2f89f. El candidato inicial 64f04f58e570d549f7d6ad1ea60c4bd77475a2b6 admite fast-forward desde ese remoto, pero no es publicable por las ubicaciones personales de sus commits pendientes. La excepción del propietario permite la regla exacta de restore-drill.sh: un único archivo coincide, text=set/eol=lf; ambos blobs tienen 0 CR; numstat normal y con ignore-cr-at-eol coincide en 82 inserciones/16 eliminaciones. No se modifican otras reglas de normalización.

Inspección SSH limitada a existencia y hashes, sin abrir contenidos: `<CHECKOUT_PRINCIPAL>/.tmp/base-preprod-c1/oci-kortek-ed25519-user` ya no existe; `<IDENTIDADES_SSH>/oci-ed25519` coincide por SHA-256 con la copia cifrada anteriormente verificada; el temporal `<IDENTIDADES_SSH>/oci-ed25519.encrypting` ya no existe. No se afirma borrado seguro ni ausencia de copias desconocidas. No se borra ni abre ninguna llave, DPAPI o archivo de entorno en esta auditoría.

Las comprobaciones de Git de los otros checkouts son de lectura con optional-locks desactivados: principal sin cambios tracked y un archivo ajeno sin seguimiento; ci-runner-pin, gitignore-oci-env y m3-cors-retry-after limpios. El worktree M3 solo tiene este saneamiento documental pendiente. No se modifican los otros checkouts.

Validación sintética pre-push: las 44 pruebas solicitadas terminan aprobadas, sin omisiones; la suite de restore dura 105.839 s. Type-check, lint y build de API y web terminan todos con exit 0; build web usa webpack. Las nueve ejecuciones del arnés finalizan sin errores. Los logs de esta repetición están en `.tmp/restore-prepush-privacy/`, ignorados. No se ejecutan contra QA, VM o producción. Los valores de prueba se generan en memoria y dotenv está bloqueado.

La publicación aún no está realizada. Se prepara un candidato de un solo commit hijo del remoto, con el árbol saneado, sin mover refs existentes. Eso permite auditar el rango público sin incluir los commits originales. Cambiar después el historial de la rama local no publicada requiere autorización explícita según AGENTS.md; no se infiere de las pruebas y no se hace push de los commits que contienen ubicaciones personales.
