# Medios/Promociones C3 — cierre documental y mantenimiento local

Fecha: 2026-09-24. Estado: **C3 CERRADO / APROBADO** por decisión expresa posterior del propietario («Apruebo Medios/Promociones C3»). El propietario había aprobado C2 y autorizado este cierre documental junto con el mantenimiento de la base de desarrollo. No hubo nueva prueba real con Cloudinary ni despliegue productivo. No se cambiaron contratos ni código; los permisos efectivos de Medios en desarrollo se ajustaron al contrato C1 aprobado, como se registra abajo.

## Cierre de C2 y cuota

[C2](MEDIOS_PROMOCIONES_C2_FRONTEND.md) ya cubrió el recorrido real de extremo a extremo con Cloudinary Free y Rekognition AI Moderation: carga y moderación aprobada, publicación, entrega de cinco imágenes reales en el mini-sitio, retiro/cuarentena y 404 tras restaurar CMS, en desktop y 375 px. También cubrió el agotamiento real: Cloudinary devolvió `420`; el upload posterior por la API devolvió `503`, explicó que la imagen no se publicó y conservó el archivo para reintento. El propietario aprobó C2 con esa evidencia.

**Saldo operativo de moderación: 0 hasta el próximo ciclo mensual.** La cuenta Free usada para QA rechazó nuevas moderaciones al agotarse la cuota; borrar activos no restituye ese cupo. C3 no volvió a consultar el proveedor ni atribuye una fecha exacta de renovación o un nuevo saldo medido en el panel. No se hicieron cargas adicionales para este cierre. Antes de reanudar cargas reales deberá comprobarse el nuevo ciclo y conservar el gate de costo/cuota global de [C1](MEDIOS_PROMOCIONES_C1_CONTRATO.md). No se activó producción.

## Respaldo y actualización de desarrollo

La rama inicial fue `ai/antigravity-qa` en `a05866b`, con árbol limpio. La base real de desarrollo `barberflow`, en el contenedor local `barberflow-postgres`, tenía 21 migraciones aplicadas y 18 tablas de negocio/sistema anteriores con 343 filas. La migración CMS `20260912120000_cms_editorial` ya estaba aplicada. H5/fechas y WhatsApp no requieren migraciones.

Antes de modificar desarrollo se creó `pg_dump -Fc` y se conservó fuera de Git en `.tmp/dev-migration-20260924/kortek-dev-before.dump` (188.339 bytes; SHA-256 `1121229FF77CCE18CA13610DD666A1EB6F92096465094436AFA65A1ADE02F8FC`). `pg_restore --list` terminó con exit `0`. El archivo se restauró en `kortek_dev_backup_verify_20260924`, una base temporal vacía, mediante `pg_restore --exit-on-error --single-transaction`; sus 18 tablas y 343 filas coincidieron en conteo y huella de contenido con el origen. El respaldo permanece local e ignorado por Git; su ACL se restringió a Fraylin, SYSTEM y Administrators y se volvió a comprobar tamaño/hash. No se incluyen credenciales en la documentación.

`prisma validate` terminó con exit `0`. El `migrate status` previo enumeró exactamente cuatro pendientes, con exit `1` esperado por ese estado. `prisma migrate deploy` aplicó, en orden y con exit `0`:

1. `20260914120000_booking_email_outbox`;
2. `20260914120100_email_channel_control`;
3. `20260915120000_email_template_version`;
4. `20260923100000_media_promotions`.

Después, `prisma migrate status` terminó con exit `0`: **25 de 25 migraciones al día** y ninguna fallida. `prisma migrate diff --from-schema-datasource ... --to-schema-datamodel ... --exit-code` terminó con exit `0` y «No difference detected». El verificador suplementario read-only de constraints e índices PostgreSQL terminó con exit `0`. Las 18 tablas anteriores conservan las 343 filas y las mismas huellas de contenido, calculadas sobre todas sus columnas preexistentes; esto incluye las columnas previas de `Client`, a la que Notificaciones añadió `emailRevision`. La comparación no detectó pérdida ni cambio de datos anteriores. Las nuevas tablas empiezan con sus valores iniciales según las migraciones.

## Limpieza posterior de QA

Solo después de confirmar migraciones, diff, constraints y huellas de datos se comprobaron cero sesiones activas en las bases QA y se eliminaron:

- `barberflow-postgres`: `kortek_corrective_qa_20260829` y la base temporal de restore `kortek_dev_backup_verify_20260924`;
- `kortek-media-c1-test`: `media_c1_grants_test`, `media_c1_qa`, `media_c1_real_test`, `media_c1_restore_test`, `media_c1_test`, `media_c2_test`;
- `kortek-notifications-c1-test`: `kortek_notifications_c2_test`, `kortek_notifications_c3_test`, `kortek_notifications_recovery_test`, `kortek_notifications_restore_test`, `kortek_notifications_test`, `kortek_notifications_upgrade_test`.

La enumeración posterior confirmó que en el contenedor principal permanecen únicamente `barberflow` y la base de mantenimiento `postgres`; en los contenedores QA solo quedaba `postgres`. El contenedor de Notificaciones volvió inicialmente a su estado detenido. El respaldo local se conservó.

Una revisión de grants posterior a la limpieza detectó que las ACL predeterminadas del rol migrador habían añadido DELETE a las tablas nuevas de Medios y UPDATE/DELETE a `MediaOperation`, por encima del contrato C1. Se revocaron solo esos privilegios sobrantes en desarrollo. El resultado efectivo quedó en SELECT/INSERT/UPDATE para `MediaAsset`, `MediaGalleryOrder`, `MediaPromotion` y `MediaPurgeJob`; SELECT/INSERT para `MediaOperation`. El cotejo de las 18 tablas anteriores siguió idéntico después. La política predeterminada amplia para futuras tablas y los grants históricos de otros módulos continúan como riesgo de endurecimiento previo a producción ya registrado en `PROJECT_MASTER.md`; C3 no los amplía ni los modifica.

En el mantenimiento posterior solicitado por el propietario se verificó que `kortek-media-c1-test` y `kortek-notifications-c1-test` estaban detenidos y tenían cada uno un único volumen anónimo; se eliminaron ambos contenedores con `docker rm -v`. La comprobación final confirmó ausencia de los dos contenedores y sus volúmenes. `barberflow-postgres` siguió accesible con 25 migraciones; el respaldo local conservó tamaño y SHA-256. No se tocaron `main`, otras bases de otros contenedores, proveedores ni entornos productivos.

## Gate de activación externa

El propietario aprobó C3 después de revisar la entrega. Un commit/push a `origin/ai/antigravity-qa` no constituye despliegue. Antes de cualquier activación externa siguen vigentes los controles operativos de cuota/costo, seguridad, configuración y aprobación explícita de esa activación.
