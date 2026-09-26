# Servicios gratuitos de continuidad — Kortek Booking

Estado C1: VM Oracle Always Free `kortek-free-services` en Ashburn (`150.136.7.19`), bucket privado `kortek-booking-encrypted-backups` en `idujavz2hijf`, proyecto Supabase Free productivo `ilaoolpcrlmqkftirjog`. No son un despliegue público de API/web. EMAIL permanece pausado.

Actualización 2026-09-26: **C1 CERRADO / APROBADO** por instrucción expresa del propietario, con excepción D2 del bootstrap local aceptada. Confirmó recepción de alarmas en `vps@kortek.cloud` y custodia de la frase GPG en gestor externo a VM/equipo. Portapapeles actual e historial local limpiados y terminales temporales cerradas, verificados sin leer el secreto. Las menciones inferiores a confirmaciones pendientes describen el ensayo anterior; quedan resueltas por esta declaración del propietario. La recuperación independiente y el restore manual están probados; transferencia nueva Cloud Shell → equipo, RTO integral y primera ejecución semanal por horario no se acreditan. Activación pública/EMAIL y C3 conservan sus gates. [Cierre y evidencia](../../docs/quality/BASE_PREPRODUCCION_C1_EVIDENCIA.md).

Riesgo del hosting gratuito: [Oracle puede reclamar instancias Always Free
inactivas](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).
La política contempla siete días con CPU p95, red y memoria A1 inferiores al
20 %. La actividad del monitor no garantiza evitarlo. La alarma de ausencia
detecta pérdida de métricas; recuperar servicios requiere acceso OCI independiente
y clave de backup fuera del VM. El VM usa 1 OCPU/6 GB, dentro del límite A1
publicado de 2 OCPU/12 GB. No se generan cargas artificiales ni upgrades.

Object Storage publica un límite gratuito de 50000 solicitudes/mes. Se sustituyó
el listado por minuto por una lectura horaria: unas 744 llamadas por página en
31 días, más backup/restore y reintentos. [object-inventory.py](object-inventory.py)
conserva solo bytes, timestamps y versión en estado local; no retiene nombres
de objetos. Edad de backup calculada cada minuto, cuota del bucket actualizada
cada hora. Cache faltante/corrupta/vencida fuerza inventario nuevo; fallo de
lectura no publica salud ficticia. Backup conserva listado fresco antes de cada
subida y tope preventivo de 8 GB. Cinco pruebas locales/VM y dos ciclos reales
demostraron reutilización de caché sin otro listado; monitor ingirió con éxito.

## Procesos y credenciales

| Unidad systemd | Periodicidad | Función |
| --- | --- | --- |
| `kortek-backup.service` / `.timer` | Diario 05:17 UTC, variación hasta 5 min | `pg_dump` PG17 por TLS verificado, cifrado GPG AES256 en flujo, TOC/SHA256, subida privada, comprobación de longitud. |
| `kortek-restore-drill.service` / `.timer` | Domingo 06:30 UTC | Descarga el último objeto cifrado, valida checksum, restaura en PG17 aislado y comprueba 31 tablas, migraciones y reservas. |
| `kortek-monitor.service` / `.timer` | Cada minuto | Publica métricas agregadas `kortek_booking` en OCI; no publica filas, correos, teléfonos ni secretos. |
| `kortek-email-worker.service` | Continuo, reinicio por fallo a los 15 s | Worker Nest/Prisma bajo `opc`, contenedor rootless con FS de solo lectura y sin puerto público. El envío sigue deshabilitado. |

`systemd LoadCredential` lee la contraseña de `kortek_backup`, la frase de cifrado y la URL runtime desde rutas root-only `/etc/kortek-backup/` y `/etc/kortek-worker/`. No copiarlas al repositorio ni a logs. La clave SSH local y los equivalentes DPAPI están en `.tmp/base-preprod-c1/` ignorada por Git. La frase GPG debe respaldarse también fuera del VM y laptop en un gestor de secretos del propietario; sin ella el objeto cifrado no se puede recuperar. La identidad de instancia tiene permiso de crear/listar/leer objetos del bucket designado, sin borrado, y publicar solo métricas `kortek_booking`.

Las pruebas de primera ejecución dieron `BACKUP_OK` y `RESTORE_DRILL_OK` sobre el proyecto productivo. El supervisor reinició tras un `SIGKILL` y recobró heartbeat. El ensayo de matar el lanzador Podman detectó un contenedor huérfano que impedía reiniciar; `--replace` y `ExecStopPost=podman stop --ignore` corrigieron la recuperación. La repetición terminó exit `0` a las 06:38:47 UTC, con un reinicio y heartbeat. El rootless Podman usa red `host` para conectar al pooler Supabase porque `pasta` falló en el reinicio; el worker no abre listener. El firewall del VM no expone API/web.

`journald-kortek-retention.conf` está aplicado en este VM dedicado: almacenamiento persistente, máximo 100 MB en disco, 50 MB en memoria y edad máxima siete días. Son límites máximos, no retención mínima garantizada. No se exportan logs crudos a OCI. `collect-errors.py` consulta cinco minutos de las unidades Kortek y publica solo nueve agregados numéricos de códigos operativos permitidos y telemetría HTTP validada. Junto con las doce métricas originales y el indicador de activación HTTP hay 22 métricas actuales; el monitor verificó ingestión sin fallos. Cuatro pruebas del colector pasaron en el VM.

### Sondas públicas preparadas, desactivadas

[public-http-probe.py](public-http-probe.py) está instalado y llamado por el
monitor de cada minuto. `/etc/kortek-monitor/public-http-monitor.conf` conserva
`KORTEK_PUBLIC_HTTP_ENABLED=false`; mientras esté desactivado solo publica
`public_http_monitor_enabled=0`, sin consultar DNS/HTTP ni publicar disponibilidad.
Con el switch autorizado en true publicará cuatro métricas adicionales:
`public_web_up`, `public_api_up` y sus dos `duration_ms` (26 métricas totales).

Solo consulta dos destinos HTTPS fijos del manifiesto: web raíz, status 200;
API raíz, status 404 **y X-Request-Id UUID** generado por la aplicación. Este
último comprueba transporte/entrada Nest; no se presenta como readiness DB,
Clerk o del negocio. DB se comprueba por separado en el monitor existente;
latencia p95 de operaciones procede de telemetría HTTP, no de esta raíz 404.
Timeout de red tres segundos por operación; el supervisor conserva su límite
global de 180 s. TLS usa CA del sistema y valida hostname. No sigue redirecciones,
usa proxy ni cookies/credenciales, ni lee/imprime cuerpos o errores privados.

Ocho pruebas con servidor HTTPS loopback y CA efímera pasaron localmente y en
el VM: positivos 200/404 con cabecera, negativos TLS/hostname/redirección/status,
switch desactivado sin red y privacidad. Ejecutar `python3 -B
test-public-http-probe.py` desde esta carpeta. Los hashes de scripts desplegados
coinciden con la fuente normalizada LF y el monitor terminó Result success/exit 0.

Activación C3: primero aprobar y comprobar DNS/TLS/API/web; crear alarmas OCI
de las dos métricas `up < 1` sostenido tres minutos, con el destinatario operativo
ya confirmado, y ensayar disparo/recuperación. Después habilitar el switch y
comprobar muestras reales. El umbral sostenido exige caídas consecutivas; no
alertar por ausencia de estas métricas mientras el switch esté apagado. Mantener
la alarma existente de ausencia del monitor. Esta preparación no abre servicio,
no acredita uptime productivo público y no crea alarmas HTTP activas.

## Alertas y umbrales iniciales

El primer backup producido por horario, 2026-09-26 05:21:39 UTC, se restauró
otra vez a las 06:02:08 UTC: 31 tablas, 30 entradas de migración, 25 reservas,
checksum válido y exit `0`. El ensayo acotado `alarm-drill.sh` detuvo el worker
con envío deshabilitado y lo recuperó automáticamente: OCI registró **Firing**
a las 06:01 UTC y **Ok** a las 06:05 UTC. Servicio/heartbeat comprobados activos;
la recepción del correo debe confirmarla el destinatario.

Tema OCI Notifications: `kortek-booking-operations`; suscripción `vps@kortek.cloud` confirmada como **Active** por OCI. Dueño: propietario/operador de Kortek Booking. Canal: email, 24/7. Verificar recepción y recuperación en ensayo controlado. Alarma de ausencia supervisa que la publicación de métricas siga viva incluso si cae el VM/monitor.

| Alarma activa | Condición | Acción inicial |
| --- | --- | --- |
| `kortek-prod-backup-stale` | `backup_age_hours > 30`, 5 min | Revisar `kortek-backup.service`, conexión, bucket y cuota; ejecutar backup y restore antes de abrir escrituras. |
| `kortek-prod-restore-stale` | `restore_age_hours > 192`, 5 min | Revisar `kortek-restore-drill.service`; restaurar último artefacto en aislado. |
| `kortek-prod-worker-down` | `worker_up < 1`, 5 min | Revisar supervisor, DB y heartbeat. Conservar EMAIL pausado. |
| `kortek-prod-database-down` | `database_up < 1`, 5 min | Comprobar Supabase/pooler, cerrar escrituras, conservar backup verificable. |
| `kortek-prod-database-capacity` | `database_bytes > 400000000`, 5 min | Evaluar cuota y continuidad; cualquier cambio de plan requiere autorización separada. |
| `kortek-prod-monitor-silent` | Ausencia de `worker_up` sostenida 15 min (`groupBy(instance)`, `absent(2h)`, delay 15 min) | Comprobar VM, `kortek-monitor.timer` y sus métricas. |
| `kortek-prod-backup-capacity` | `bucket_bytes > 7000000000`, 5 min | Revisar capacidad y retención antes del tope preventivo de 8 GB; no borrar automáticamente. |
| `kortek-prod-operational-errors` | `operational_errors_5m > 0`, 1 min | Revisar códigos seguros de backup/restore/worker y fallos del supervisor, recuperar servicio y comprobar heartbeat/último artefacto. |

La alarma de errores operativos registró **Firing 06:36 UTC → Ok 06:44 UTC** durante el ensayo de supervisor del 26 de septiembre. La cuota de backup tiene alarma activa; no se llenó el bucket para probarla. La recepción del correo sigue pendiente de confirmación del destinatario.

El API C1 produce `HTTP_REQUEST` con ID aleatorio propio, entorno, SHA Git (`APP_RELEASE` obligatorio en producción), plantilla de ruta, método, status, duración y clase de error permitida. Nunca incluye cuerpos, parámetros, query, tokens, cabeceras, mensajes crudos ni stack. Tres pruebas HTTP de privacidad pasaron. Una excepción inesperada devuelve un 500 genérico; el 400 de JSON malformado tampoco devuelve fragmentos privados. Los errores HTTP de negocio conservan su contrato. La versión de despliegue debe ser el commit que realmente produjo el artefacto, incluyendo C1 antes de publicarlo.

Los nuevos agregados son `worker_errors_5m`, `backup_errors_5m`, `restore_errors_5m`, `supervisor_errors_5m`, `http_requests_5m`, `http_5xx_5m`, `http_429_5m`, `http_p95_ms_5m`, `operational_errors_5m`. Un fallo puede producir más de un código: el total cuenta señales, no incidentes únicos. **Cero solicitudes HTTP actualmente indica API no desplegada**, no disponibilidad ni ausencia acreditada de errores de usuarios.

Umbrales propuestos para servicios aún sin activar, con el mismo propietario, canal email 24/7 y ensayo obligatorio en su activación:

| Señal | Umbral inicial propuesto | Respuesta |
| --- | --- | --- |
| Uptime API/web | Tres sondas HTTPS consecutivas fallidas, intervalo 1 min | Confirmar DNS/TLS/hosting y rollback; crear sondas gratuitas al existir endpoints públicos aprobados. |
| Latencia API | p95 >1500 ms durante 5 min, con al menos 20 solicitudes por ventana | Revisar DB, conexiones y dependencias; sin muestra suficiente no concluir latencia saludable. |
| 5xx | >5 % por 10 min, con al menos 20 solicitudes por ventana | Correlacionar ID/versión/ruta segura; cerrar escrituras si afecta integridad. |
| 429 | >20 % durante 10 min, con al menos 20 solicitudes por ventana | Revisar abuso, NAT, proxy confiable y cuota de proveedor; no subir límites automáticamente. |
| Worker con EMAIL activo | Heartbeat ausente 5 min o lease PROCESSING vencido >60 s | Pausar canal, revisar supervisor/DB y lease; no reenviar a ciegas. |
| Cola | PENDING/RETRY >10 min, cualquier UNCERTAIN abierto o FAILED nuevo | Revisar destinatario/proveedor sin copiar datos privados; reconciliar antes de reintentar. |
| Webhook | Cualquier 503 o ACCEPTED sin recibo >15 min | Revisar endpoint/firma/proveedor, conservar UNCERTAIN hasta conciliación. |
| Purga/medios | Fallo de purga reciente o cuota de moderación agotada | Mantener contenido retirado y pausar nuevas cargas/moderación; no publicar sin aprobación. |
| Conexiones DB | >80 % del límite realmente observado durante 5 min | Revisar pools y carga; no presuponer el límite ni comprar capacidad. |

API/web, webhook, purga y EMAIL activo conservan sus gates de activación. Redis y planes pagos no están autorizados.

## Comprobación y respuesta

En el VM, `sudo systemctl status kortek-backup.timer kortek-restore-drill.timer kortek-monitor.timer kortek-email-worker.service` comprueba programación/supervisor. `journalctl -u kortek-backup.service -u kortek-restore-drill.service -u kortek-monitor.service -u kortek-email-worker.service --since today --no-pager` muestra eventos seguros (`BACKUP_OK`, `RESTORE_DRILL_OK`, `MONITOR_OK`, heartbeat). Para forzar un respaldo o restore, usar `sudo systemctl start kortek-backup.service` o `sudo systemctl start kortek-restore-drill.service`; verificar exit `0` y consultar el último objeto/checksum en OCI. No usar la base productiva como destino de restore.

Si una restauración falla: mantener API/escrituras externas cerradas, identificar el último objeto válido, revisar SHA/TOC y probar en PostgreSQL 17 aislado. Para un rollback posterior a escrituras, congelar ambos lados, pausar EMAIL y recuperar reservas, facturas, pagos, medios, preferencias, eventos y outbox antes del cambio; no revivir `DELIVERED`/`UNCERTAIN` sin conciliación de proveedor. No revertir migraciones destruyendo tablas. `apps/api/ops/rollback-http-drill.cjs` ensayó dos APIs/proxy en loopback: caída 502 antes/después de escrituras HTTP, congelamiento 503, restauración en clon nuevo y cotejo de 31/31 huellas de contenido. Media y estados externos son fixtures SQL explícitas; no acredita envío/revocación reales de Cloudinary/Resend.

Objetivo operativo inicial propuesto: RPO ≤24 h por backup diario y RTO ≤4 h para un dump pequeño probado. Son objetivos, no SLA acreditado: aún faltan varias ejecuciones programadas y una medición cronometrada de recuperación completa. Supabase Free no ofrece backup automático, puede pausarse y limita DB a 500 MB. Evaluar Supabase Pro al acercarse a ~400 MB o cuando perder hasta 24 h de datos resulte inaceptable; cualquier contratación exige autorización separada. El bucket tiene tope preventivo de 8 GB. La revisión automática rechazó borrar objetos antiguos irreversiblemente por lifecycle, por lo que no hay purga automática: vigilar `bucket_bytes`, revisar retención manualmente con aprobación aplicable antes de llenar la cuota. Un VM, una cuenta OCI y una frase GPG siguen siendo puntos únicos de fallo; verificar copia de la frase en gestor externo.

## Recuperación con la copia de clave fuera del VM

[`local-recovery-drill.py`](local-recovery-drill.py) consume un objeto cifrado,
su SHA-256 y los conteos de referencia del restore verificado. Requiere GPG y
Docker locales. El operador inyecta `BACKUP_RECOVERY_PASSPHRASE` desde su gestor
seguro, sin escribirla en argumentos; el proceso la retira del entorno antes de
crear hijos. GPG recibe la clave por stdin y conecta el dump binario directamente
a pg_restore, sin dump plano en disco. PostgreSQL 17 usa red `none`, datos en
tmpfs y eliminación del contenedor al terminar. Solo emite stage de fallo,
checksum, conteos y duración; no muestra filas ni errores privados.

El 2026-09-26 se descargó el objeto de las 05:21:39 UTC desde OCI y se copió
cifrado al equipo local. La recuperación usando únicamente la copia DPAPI local
`oci-backup-encryption.dpapi` pasó: **31/31 conteos**, 26 migraciones completadas,
SHA-256 `6de2b4f6bb0b5e2ede3ffae1499e2eef68d8e05eec6e854ab105ef6f9091d114`,
4,7 segundos de restauración/verificación. Una clave incorrecta fue rechazada;
el contenedor se eliminó en éxito y fallo. El primer SSH perdió la conexión,
pero la inspección posterior confirmó que la descarga ya había terminado; no se
reinició ni duplicó ese trabajo.

Esto acredita descifrado y restore fuera del VM con una copia independiente de
la clave. La descarga se hizo mediante la identidad del VM aún disponible:
**no acredita acceso independiente al bucket, recuperación de la cuenta OCI ni
RTO completo**. DPAPI depende del perfil Windows de este equipo. Conservar la
frase en un gestor del propietario externo a VM/laptop sigue pendiente de
verificación; no introducir una copia sin cifrar en Git ni en la evidencia.

Seguimiento 2026-09-26: el propietario recuperó su sesión OCI mediante MFA;
la consola mostró el bucket privado y el backup programado/checksum sin usar
el VM. Cloud Shell descargó ambos objetos con la CLI integrada, bajo el usuario
existente de la consola y sin crear credenciales/permisos. `sha256sum -c` pasó;
SHA anterior y tamaño 43453 bytes coincidieron con la copia local. Esta copia
idéntica se restauró otra vez: 31/31 conteos, 26 migraciones, 6,5 s, exit `0`
y cero contenedores remanentes. Acceso/descarga independientes comprobados.
Download de Cloud Shell marcó Completed, pero todavía no hay ruta local nueva
verificable: no acredita transferencia nueva al equipo ni RTO completo. La
copia de clave en gestor externo y recepción de alertas siguen sin confirmarse.

Para recuperar si falta el VM: iniciar sesión OCI/MFA como propietario, abrir
Developer tools → Cloud Shell y usar `oci os object get` para el objeto `.dump.gpg`
y su `.sha256` del bucket arriba indicado. Guardarlos en una carpeta propia con
modo 700/archivos 600 y ejecutar `sha256sum -c` antes de descifrar. Transferirlos
al operador con el Download oficial de Cloud Shell; comprobar existencia/tamaño
locales y repetir SHA. Inyectar la frase desde el gestor seguro y ejecutar el
drill local anterior. No generar acceso público al bucket ni claves nuevas para
resolver una transferencia que no se haya verificado.
