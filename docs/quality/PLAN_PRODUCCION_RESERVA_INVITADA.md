# Plan de promoción de reserva invitada a main y producción

Fecha: 2026-10-08, America/Santo_Domingo. **PLAN DOCUMENTAL / EN REVISIÓN. NO-GO PARA EJECUCIÓN. Producción permanece cerrada.**

## 1. Alcance y decisiones de entrada

Este gate compara Git, consulta únicamente mecanismos de lectura existentes y publica un único commit documental en `ai/reserva-invitado-ci`. No autoriza merge/push a main o a `ai/antigravity-qa`, builds remotos, migraciones, grants, despliegues, cambios de flags/proveedores, POST, fixtures ni escrituras de negocio en producción o QA. La excepción de rama del propietario prevalece sobre la rama habitual de AGENTS.md.

Objetivo posterior: ofrecer la reserva de invitado, conservando `Client` operativo, reservas, identidad global `User`, memberships internas y datos financieros. Tenant y actor siguen derivados del contexto autenticado; el invitado no obtiene una cuenta ni privilegios internos.

Decisiones del propietario, revisables: aplicar **28 `20261003120000_customer_stage_one` tal cual** por paridad con QA; no revertirla; promocionar web/API desde un mismo SHA de `ai/antigravity-qa`; aceptar rollback de código como contingencia. Estas decisiones orientan el plan y **no autorizan su ejecución**. La 27 también falta en producción y necesita autorización separada.

Fuentes: [estado maestro](../../PROJECT_MASTER.md), [gates](DELIVERY_GATES.md), [seguridad](SECURITY_STANDARD.md), [cierre C3 invitado](../features/RESERVA_INVITADO_C3_CIERRE_QA.md), [contratos](../../BACKEND_CHANGES.md), [operación OCI](../../ops/oci-api/README.md), [guardia CI](DIAGNOSTICO_RUNTIME_PRIVILEGE_GATE.md). Código inspeccionado: módulos/guards/DTO públicos, layout raíz, SQL 27/28, suplemento de privilegios y workflow de calidad. No se modificó código.

## 2. Comparación main frente al candidato

`git ls-remote origin` confirmó estos SHA en esta ejecución; los objetos ya existían localmente. No fue necesario fetch ni cambiar referencias.

| Referencia | SHA completo |
| --- | --- |
| main remoto | `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6` |
| ai/antigravity-qa remoto: candidato **S** | `523d993cfa0c797f356c224d5cc026d6c9ad4c7b` |
| ai/reserva-invitado-ci al entrar | `523d993cfa0c797f356c224d5cc026d6c9ad4c7b` |
| merge-base | `f357c9bfbda44aab3d5a086907f72070871fdb22` |
| main local, atrasado; no se usa como producción | `01113ef0be7d8abcd74e3e7297f7989b359c76c0` |
| ai/antigravity-qa local, atrasada; no se usa como candidato | `36061fc3c978758642b5a79ed6cb0e5ff25c003f` |

`git rev-list --left-right --count mainSHA...S`: **1 / 67**. El único exclusivo de main es `fe4b117`, merge del PR 2. Su árbol y el del merge-base son idénticos: `1fcdf005717afa9bb814fe97c2c4c09d1ab46364`. Por tanto **no es posible fast-forward** aunque main no aporte cambios de contenido exclusivos. No resetear ni reescribir main.

`git merge-tree --write-tree mainSHA S`: exit **0**, sin conflictos textuales; árbol calculado `8f8f73b6eb677848de7d62680a49976bdc8ee7cd`, idéntico al árbol de S. Solo creó objetos Git; no movió ramas, índice ni archivos. Esto no acredita compatibilidad operativa, migraciones ni ausencia de conflictos futuros si las ramas cambian.

**Estrategia recomendada:** PR/fusión normal que preserve ambos historiales, con nueva revisión y autorización explícita para main. Evitar squash/rebase: no aportan ventaja ante un commit de main sin diferencias y dificultan la trazabilidad. Congelar S y volver a comparar antes de integrar. El commit de merge futuro **M** todavía no existe: no puede darse su SHA hoy.

**SHA exacto propuesto para ambos artefactos: S `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`.** Es el origen remoto confirmado; el commit de este documento no será candidato de producto. Su código ejecutable/lockfile coincide con `b318ca591d1ca6681269a6d25e29ca106d824df9`, pareja registrada en QA; desde b318ca5 solo cambian documentación, workflow y dos suites E2E dentro de apps. No se atribuye a S una nueva aprobación C3 ni un CI remoto verde: deben verificarse.

### SHA de main y efecto de Vercel

Una fusión normal deja main en M, con árbol igual a S según la simulación. **M y S son SHA distintos.** Para cumplir literalmente ambos artefactos desde S, la promoción debe fijar explícitamente el origen S en web/API y registrar M solo como integración de main. Una web reconstruida automáticamente desde main quedaría en M y rompería esa igualdad si el API usa S.

Antes de integrar se requiere revisar la integración Git/Vercel y aprobar una forma de preparar el deployment productivo de S sin mover el alias antes del API y sin un autodeploy de M que lo sustituya. No se inspeccionó ni cambió esa configuración en este gate. Si la herramienta disponible obliga a desplegar main/M, el propietario debe revisar la decisión: congelar M como **nuevo candidato común**, probarlo y construir ambas superficies desde M. No mezclar S/M ni inventar un M futuro. No se propone publicar M en la rama QA por inferencia, porque dispararía otro deployment QA.

### Discrepancia de checksum histórica: bloqueo de preflight

Cotejo READ ONLY de las 26 migraciones activas frente a los blobs Git de S: **25 coinciden y una difiere**. `20260720044928_add_invoice_model`: ledger productivo SHA-256 `3c1f4f533f24f2b73159e1f9ddbe933684126a4b2ee6a5734c11158d3f88d62a`; blob S y main SHA-256 `39f522178c044b3ae135d6faaa9961c35f57ce83aa09632c390607f9e13f984b`. El blob tiene 909 bytes, 24 LF y cero CRLF; convertir **solo en memoria** esos LF a CRLF produce exactamente el hash del ledger. Esto demuestra correspondencia con esa variante de finales de línea, no una nueva diferencia de contenido introducida por esta promoción. No se cambiaron bytes ni ledger.

**No-Go de preflight hasta documentar la compatibilidad del comportamiento real de Prisma con ese antecedente**, ensayando el ledger restaurado y el candidato exacto en clon autorizado. No se afirma que migrate deploy vaya a fallar o pase: no se ejecutó. No corregir checksums, aplicar migrate resolve ni normalizar la migración histórica por inferencia. El diagnóstico/ensayo requiere una orden separada antes de P3; conservar ambos hashes y todos los intentos históricos.

### Rango de archivos y migraciones

Diff de mainSHA a S: **905 archivos, 457108 inserciones, 2691 eliminaciones; 7 archivos eliminados**. Distribución: API 97, web 111, ops 5, raíz/CI 9, documentos 84 y evidencia documental 599. No es un cambio reducido al formulario: incorpora horarios de negocio, disponibilidad, correcciones de reservas/facturación/medios/notificaciones, UI interna/pública, seguridad del limitador, dependencias y operación staging. Auditar y aprobar el rango entero, no solo el retiro B2C. El apéndice contiene el inventario completo reproducible, incluido el volumen de evidencia histórica.

| Nueva frente a main y pendiente según ledger vivo | SHA-256 de migration.sql en S | Impacto |
| --- | --- | --- |
| 27 `20260927170000_business_schedule` | `82890d487a40d0c25edfd77019df6454f101f6222aa5235b3ea6f8a958272d82` | Cinco tablas, enum, checks/exclusión GiST, función/triggers, clasificación/backfill legacy y grants condicionales; no confirma ni publica horarios |
| 28 `20261003120000_customer_stage_one` | `6e1d854f285f4a4a691377d6654d0a4df80f29ca5c3ad375b352ae96894d6dee` | Tres columnas de Client, índice Booking, CustomerOperation, dos funciones y triggers; aditiva, pero con efectos en escrituras Client/Booking |

La 28 no concede por sí sola todo el suplemento de privilegios. [customer-stage-one-runtime-grants.sql](../../apps/api/ops/customer-stage-one-runtime-grants.sql) fija ACL y search_path, exige propietario migrador y SECURITY INVOKER. Aplicarlo es otra escritura administrativa dentro de una orden explícita, nunca una lectura implícita. [verify-runtime-role.sql](../../apps/api/ops/verify-runtime-role.sql) es READ ONLY y comprueba la matriz vigente de 37 tablas. No ejecutar el rollback SQL desechable contra producción.

Retiro B2C: desaparecen controller/service/DTO de claims Clerk exclusivos y sus pruebas activas; el módulo Customer no se registra; se retiran rutas `/customer/*` y `/auth/clerk/customer/claims`, portal `/{slug}/cuenta/login`, `/{slug}/mi-perfil`, `/{slug}/mis-reservas`, proveedor/hooks/navegación exclusivos y checkbox de alta secundaria. Algunos existieron solo en commits intermedios de QA, por lo que su retiro no aparece como D neto frente a main. El DTO público no admite createAccount/password y la respuesta queda `{booking}`, sin accountCreated/accountCreationError. CUSTOMER histórico es rechazado por guards/login; Clerk interno y OWNER/ADMIN/RECEPTIONIST/BARBER permanecen. `User`, `Client.userId`, enum CUSTOMER, migraciones y datos se conservan.

## 3. Estado de producción observado y límites

Lecturas realizadas el 2026-10-08. Supabase: **13:45:21 America/Santo_Domingo (17:45:21 UTC)**, proyecto productivo documentado `ilaoolpcrlmqkftirjog`, herramienta execute_sql ya utilizada, **BEGIN READ ONLY / SELECT / COMMIT**, lector `postgres`. Ese lector no es el rol que ejecutará las migraciones. No se usaron secretos locales ni se ampliaron grants. Vercel: get_alias/get_deployment ya usados. OCI: reutilización de las funciones de preflight SSH existentes, solo `kortek-api`, inspección sanitizada y systemctl show; sin exec de aplicación, reinicios, logs crudos ni lectura QA.

| Elemento | Observado vivo | Límite |
| --- | --- | --- |
| Web y alias | `booking.kortek.cloud` → `dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm`, READY, target production, mainSHA `fe4b117…` | No prueba variables, login ni QA funcional |
| API | Release `b5615869dcbec4bd174608f2373e73ff618fae26`; imagen `sha256:8caacd8548a61d94807c0b865229a731df594f63f609ca9ab57df99283dceca2` | Imagen ejecutándose; export/copia de recuperación no verificados |
| Servicio API | active/running; PID contenedor 151158; MainPID 151141; NRestarts 0; DEPLOY_ENV production | No es medición de carga ni de tasa de errores |
| Flags API | PUBLIC_BOOKING_CLOSED=`true`; NOTIFICATIONS_EMAIL_ENABLED=`false`; RATE_LIMIT_SECRET presente según preflight | MFA, dominio de correo, flags web/worker y controles de monitoreo no revalidados |
| PostgreSQL | **17.6**, frente a **PG16 del CI** | PG18.1 local documentado tampoco sustituye ensayo PG17.6/CI remoto |
| Ledger | **30 filas: 26 completadas activas, 4 intentos históricos rolled back, 0 inconclusas**; última activa `20260925010000_security_rate_bucket` | No son 30 migraciones aplicadas; cotejo integral: 25/26 coinciden byte a byte; 1 diferencia LF/CRLF documentada abajo |
| Migración 27/28 | Ninguna figura aplicada | Se necesita 27 antes de 28; no ejecutar migrate deploy suponiendo que solo hay una pendiente |
| Funciones 28 | Censo por nombre/esquema devuelve **0** para customer_access_relink/customer_booking_revision | No hay propietario actual de funciones inexistentes; tras migrar deben ser kortek_migrator |
| Rol migrador | kortek_migrator existe; LOGIN=true, SUPERUSER=false, BYPASSRLS=false | Conexión efectiva, permisos DDL/ownership heredado y credencial válida no probados |
| Datos de aplicación | Booking=0; Client=0; User=2; Membership CUSTOMER=0; Client con userId=0 | Hay identidades persistidas; no se leen PII. No clasifica esos usuarios como B2C ni censa usuarios/sesiones en Clerk |

No se afirma ausencia de todos los datos reales: el [seguimiento productivo](API_OCI_DESPLIEGUE.md) conserva un alta real declarada por el propietario y corroborada entonces. Los conteos de hoy acreditan ausencia de reservas/clientes/membresías CUSTOMER en las tablas consultadas, no ausencia de organizaciones, servicios, datos financieros o identidades del proveedor. No borrar ni desvincular nada.

QA es contexto documental: pareja b318ca5, API imagen `sha256:8ba1b6c8a45391433998deeae1111d2d96c6cbf84932a7e9972cb6cf90e95eec`; la observación posterior documentada de alias web es `dpl_8iqUtQ6XMYgPv1wF3FcnpbczoaWe`/b318ca5. No se contactó QA en este gate. C3 sigue **ACEPTADO POR DECLARACIÓN DEL PROPIETARIO, sin evidencia capturada**; correo, WhatsApp real, otros dispositivos y concurrencia no se convierten en pruebas aprobadas.

## 4. Prerrequisitos antes de autorizar ejecución

1. **Respaldo fresco productivo restaurable.** El propietario indica que los respaldos disponibles hoy son locales. Hay antecedentes de copia cifrada en OCI y restore en [C1](BASE_PREPRODUCCION_C1_EVIDENCIA.md) y [limpieza 2026-09-27](PRODUCCION_SUPABASE_LIMPIEZA_2026-09-27.md), pero no demuestran vigencia/disponibilidad/cobertura actual. Inventariar copias locales/externas, tamaño, SHA-256 y custodia; generar nueva copia antes del DDL, conservar el ledger completo y catálogo, restaurar en destino aislado de versión compatible y comparar todas las tablas/conteos/constraints/índices/funciones/triggers. Considerar extensiones como btree_gist y roles/grants que un dump de public no cubre. No usar Git como respaldo de archivos ignorados. Cifrado en flujo; clave fuera de chat/argv/env/logs. Descarga y recuperación independiente de VM/laptop, retención externa y RPO/RTO deben quedar probados o aceptados explícitamente.
2. **27 + 28 y privilegios.** Identificar destino productivo, resolver previamente el antecedente LF/CRLF de Invoice mediante ensayo documentado sin alterar historia; verificar ledger y checksums antes/después; iniciar DDL como **kortek_migrator efectivo**, no como postgres ni runtime. Validar permisos de la 27, extensión GiST y ownership. Para 28 exigir exactamente las dos funciones sin argumentos, retorno trigger, SECURITY INVOKER, owner kortek_migrator, ACL sin PUBLIC y search_path esperado. La existencia del rol no basta. El SQL de la 28 permanece byte a byte; cualquier cambio de roles/grants necesita alcance explícito y respaldo. No resolver un fallo relajando la guardia del CI.
3. **Compatibilidad PostgreSQL.** Repetir ensayo de las 28 migraciones y matriz en clon autorizado PG17.6, con los mismos atributos de roles, extensiones y objetos productivos; acreditar CI PG16 del candidato S con todos los jobs aplicables exitosos. Los ensayos PG18.1 históricos y merge-tree no satisfacen esto. Duración de DDL/locks, espacio y recursos deben caber en ventana; abortar ante discrepancia.
4. **Variables productivas, sin publicar valores.** Inventario sanitizado con nombres/presencia/tipo de instancia/hash: DATABASE_URL de kortek_runtime/TLS strict y CA; APP_RELEASE=S; NODE_ENV/DEPLOY_ENV production; HOST/PORT; JWT_SECRET y RATE_LIMIT_SECRET; WEB_PUBLIC_ORIGIN, API_PUBLIC_ORIGIN y CORS_ALLOWED_ORIGINS exactos productivos. CLERK_SECRET_KEY/CLERK_PUBLISHABLE_KEY deben corresponder a la misma instancia de producción y prefijos live, con authorized parties/redirect productivos; comprobar también NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY y NEXT_PUBLIC_API_URL en el build web. No copiar claves QA ni inferir que el deployment hereda una clave cambiada después. REQUIRE_INTERNAL_MFA requiere decisión vigente y validación. Los booleanos deben ser literalmente true/false según [validador de arranque](../../apps/api/src/common/production-config.ts).
5. **Cloudinary.** CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET, cloud/carpeta/preset y política de medios correctos para producción. Verificar firma, subida, lectura, reemplazo, borrado/limpieza autorizados y aislamiento en un ensayo separado con evidencia de ciclo real; hoy no automatizado ni probado aquí. No lanzar escrituras del proveedor para completar este plan.
6. **Correo/Resend.** Producción permanece NOTIFICATIONS_EMAIL_ENABLED=false. Antes de habilitar: NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED=true acreditado por proveedor/DNS, FROM/REPLY_TO, ABUSE_SECRET, RESEND_API_KEY/WEBHOOK_SECRET, webhook seguro, controles outbox y worker productivo. Separar habilitación de correo de apertura de reservas; no prometer entrega real si sigue pausado. Cualquier modificación/reinicio del worker exige orden propia, no está implícita en el API.
7. **WhatsApp.** Es contacto manual por enlace, no una integración automática inventada. Confirmar número público por negocio, consentimiento/alcance del mensaje y apertura en dispositivos reales con autorización separada; no asumir una clave de WhatsApp que el contrato no requiere. Los datos publicados y destino real no están verificados hoy.
8. **Monitoreo y ventana.** Capturar baseline de servicios, release, tasas HTTP y worker; verificar métricas/alertas y recepción real, no solo alarmas históricas. Las sondas públicas figuraban desactivadas en el seguimiento histórico: estado actual pendiente. Fijar operador, suplente, hora, canal de incidente, duración y criterio de rollback. Propuesta: ventana de 30 minutos, cierre público durante toda la sustitución y máximo 5 minutos de pareja transitoria. Acordar suspensión de operaciones internas/escrituras de negocio durante DDL/cutover sin inventar un flag de mantenimiento existente. Si se requiere implementarlo, es otro gate.

## 5. Secuencia propuesta: una orden explícita por etapa

Las siguientes son **plantillas de autorización futuras**, no comandos ejecutados ni permisos concedidos. Cada etapa debe presentar evidencia y esperar su orden; ninguna aprobación abre la siguiente. No incluir secretos en una orden. La integración Git puede disparar producción: resolver el control de autodeploy antes de mover main.

| Etapa | Orden distinta que deberá dar el propietario | Resultado y condición de parada |
| --- | --- | --- |
| P0: resolver controles | «Autorizo el preflight restante y la preparación del control de despliegue automático, con el mecanismo y cambios enumerados, sin promover aún.» | Accesos pendientes acotados, env/CI/monitoreo revisados; forma de deployment S y alias retenido verificable. Configuración de proveedor requiere su autorización concreta |
| P1: respaldo | «Autorizo el respaldo cifrado fresco de producción, su copia externa y restore en un clon aislado; no restaurar sobre producción.» | SHA/tamaño, cobertura, ledger y restore iguales; parada ante cualquier diferencia; RPO/RTO/custodia confirmados |
| P1b: checksum histórico | «Autorizo diagnosticar y ensayar en un clon aislado el ledger productivo restaurado frente a S para la diferencia LF/CRLF de add_invoice_model, sin modificar SQL histórico ni ledger productivo.» | Evidencia del comportamiento real de Prisma y criterio aprobado para reconocer ese antecedente; no inferir resolución del hash |
| P2: integrar main | «Autorizo integrar por merge normal el rango mainSHA→S revisado, sin force y con el autodeploy controlado según el plan aprobado.» | Revisar PR/rango, verificar M y árbol=S; ningún alias se mueve; si no se puede fijar S, volver a decisión del propietario |
| P3: migración 27 | «Autorizo únicamente la migración 27 intacta y sus permisos enumerados en producción como kortek_migrator, con respaldo P1 verificado.» | Ledger pasa 26→27 activas; checksums previos iguales, backfill legacy y GiST/ACL verificados; no confirmar/publicar horarios |
| P4: migración 28 | «Autorizo únicamente la migración 28 intacta, el suplemento customer-stage-one-runtime-grants.sql revisado y la verificación READ ONLY de ledger/matriz, como kortek_migrator.» | Ledger 28 activas/32 filas si no aparecen nuevos intentos; 0 inconclusas; checksum exacto, dos funciones owner migrator/INVOKER, 37 tablas pasan. No revertir DDL |
| P5: build API | «Autorizo construir y conservar la imagen ARM del API desde S, sin activarla, con recursos/contexto acotados.» | Imagen digest/revisión S; contexto sin dotenv/dumps; startup drill en aislamiento exit 0; guardar imagen productiva previa |
| P6: preparar web | «Autorizo construir el deployment web productivo desde S con variables productivas, sin sustituir todavía booking.kortek.cloud.» | READY/S, origen API productivo, claves productivas sanitizadas; retener deployment anterior. Si build reasigna automáticamente alias, detener: autorización no cubre activación web |
| P7: activar API | «Autorizo sustituir exclusivamente KORTEK_API_IMAGE y APP_RELEASE del API productivo por la imagen/S aprobados y reiniciar solo kortek-api, con rollback de código autorizado.» | API primero: active/running, release exacto, GET/CORS y cero 5xx iniciales; PUBLIC_BOOKING_CLOSED=true/correo=false preservados; worker/Caddy intactos |
| P8: activar web | «Autorizo promover/asociar el deployment READY/S aprobado a booking.kortek.cloud, con rollback de alias al deployment anterior.» | Web después del API, como orden operativo de QA; ambos artefactos S. Medir tiempo transitorio; si supera 5 minutos, rollback de código coordinado |
| P9: verificar cerrada | «Autorizo las verificaciones técnicas READ ONLY productivas enumeradas, sin POST, fixtures ni activar flags.» | Matriz técnica abajo; toda discrepancia produce No-Go. QA autenticado que cree sesiones/negocio o acciones de proveedor exige autorización adicional |
| P10: abrir público | «Autorizo PUBLIC_BOOKING_CLOSED=false en el API productivo y el reinicio estrictamente necesario, con recierre true como contingencia, tras aprobar P9 y los riesgos pendientes.» | Orden independiente, revisión explícita de UX/correo/WhatsApp; comprobación GET de datos/disponibilidad reales, monitoreo. No activa correo/MFA/worker ni publica tenants implícitamente |
| P11: validación manual de apertura | «Autorizo al propietario realizar la reserva manual real y los casos funcionales acordados, conservar esos datos y capturar evidencia, sin POST/fixtures de agentes.» | Separar evidencia capturada de declaración; confirmar PENDING y ausencia de cuentas secundarias, errores/concurrencia/canales según casos autorizados |

Orden de **activación**: respaldo → ensayo/diagnóstico del checksum histórico → integración controlada → 27 → 28/suplemento → imagen API → preparación web sin alias → **API primero** → **web después** → verificaciones cerradas → apertura de flag. Preparar web antes reduce la ventana; no significa ponerla en servicio antes del API. Los pasos P2/P6 solo son viables si se ha probado y autorizado controlar los automatismos de Vercel; hoy es pendiente bloqueante.

Una web antigua frente al API nuevo puede enviar campos B2C retirados o esperar accountCreated; una web nueva frente al API viejo puede consumir disponibilidad/contrato ausentes. El cierre público reduce esa exposición, pero no prueba compatibilidad interna: mantener el corte acotado, suspender operaciones según procedimiento autorizado y verificar panel/roles antes de reanudarlas. No trasladar la validación positiva de reserva al gate de lecturas cerradas: el flag devuelve 404 antes de resolver el negocio.

## 6. Cuentas B2C y conservación de datos

No hay Client/Booking/CUSTOMER en el censo aplicativo de hoy; hay dos User y no se censó Clerk. No borrar usuarios ni sesiones, no retirar enlaces Client.userId, no cambiar memberships ni tocar registros financieros. Si el censo previo al corte cambia, congelar y presentar agregados de identidades exclusivamente CUSTOMER frente a internas/mixtas, vínculos y dependencias sin PII.

La promoción retira acceso y alta B2C por código. Las filas históricas, operaciones/columnas B2C y perfiles del proveedor que pudieran existir quedan sin autoservicio; documentar su retención/privacidad y posible condición huérfana, sin inferir que son basura. Una identidad global que también tenga rol interno conserva ese rol; no bloquearla o eliminarla por haber sido CUSTOMER. Revocación de sesiones, comunicación a titulares, desvinculación o limpieza futura requieren plan y autorización separados. La cuenta B2C no regresa al MVP por conservar su schema.

## 7. Rollback por etapa y puntos sin retorno

Baseline productivo **real, distinto del rollback QA**: web `dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm`/fe4b117; API imagen `sha256:8caacd8548a61d94807c0b865229a731df594f63f609ca9ab57df99283dceca2`/b5615869dcbec4bd174608f2373e73ff618fae26. La pareja previa ya tiene SHA diferentes: restaurarla recupera el estado anterior conocido, no satisface la igualdad de la nueva promoción. Revalidar disponibilidad y compatibilidad con schema 28 en clon antes de activar. No usar los artefactos anteriores de QA como rollback productivo.

| Punto | Contingencia propuesta, requiere alcance explícito en su orden |
| --- | --- |
| Antes de DDL | Cancelar; conservar respaldo/evidencia. Si main fue integrado, no reset/force: un revert Git sería una entrega separada; controlar que no despliegue automáticamente |
| Migración 27 | Si falla, inspeccionar ledger/esquema/efectos antes de reintentar. No asumir reversión íntegra ni ejecutar migrate resolve automáticamente. Si completó, conservarla; cualquier compensación sería otra migración autorizada |
| Migración 28 | Su transacción limita efectos de fallo SQL; corroborar ledger y catálogo. **Tras COMMIT no se revierte**, por decisión del propietario. Conservar columnas/tabla/índice/triggers y suplemento; investigar errores sin retirar seguridad ni borrar historial |
| Build API/web preparados | No activar; conservar pareja anterior y corregir en otro gate. No modificar alias para probar un build fallido |
| API activado, web previa | Restaurar imagen/selectores anteriores con copia protegida, reiniciar solo API y repetir lecturas; mantener cierre público. Schema 27/28 permanece; comprobar triggers/Client UPDATE/invariantes con código anterior en el ensayo previo |
| Ambos activados | Mantener o restablecer cierre y coordinar rollback **de ambas superficies** a baseline, repetir release/GET/CORS y comparar worker/protegidos; no reiniciar worker/Caddy por inferencia |
| Público abierto | Primero recerrar PUBLIC_BOOKING_CLOSED=true bajo la contingencia aprobada; luego rollback de código/alias si corresponde. Conservar reservas reales nuevas, outbox, clientes e identidades; conciliar con versiones, nunca restaurar un backup antiguo sobre producción como rollback de contenedor |
| Correo/Cloudinary/WhatsApp reales | Envíos, contacto y borrados externos no se deshacen con código. No iniciarlos sin su orden; compensación y comunicación separadas |

Rollback a código previo puede reexponer capacidades B2C antiguas y deja de cumplir el MVP invitado: el propietario acepta contingencia de código, pero debe aprobar duración/controles concretos en la orden de activación. Mantener público cerrado; verificar acceso interno y no dar por bloqueadas rutas B2C solo por el flag público. Si no puede contenerse la exposición, detener y acordar indisponibilidad acotada antes de restaurar código. El punto sin retorno del DDL y los datos creados después impiden tratar respaldo como un botón de deshacer.

## 8. Lista Go / No-Go medible

**Hoy: No-Go para ejecutar o abrir.** Este documento completo no es una aprobación de producción.

| Criterio para avanzar | Evidencia exigida | Estado hoy |
| --- | --- | --- |
| Origen congelado | S local/remoto exacto; main comparado; nueva simulación sin conflicto; diff entero auditado | SHA/comparación/simulación verificados; aprobación integral y preflight de checksum histórico pendientes |
| Integración y despliegues | Estrategia aprobada; M/árbol registrado; automatismos controlados; web/API desde S, sin mezcla de SHA | Solo propuesta; M inexistente, control de autodeploy no verificado |
| CI exacto | Todos los jobs requeridos PG16 del SHA escogido en success, sin ocultar fallos/omitir nuevas pruebas | No consultado aquí; informes anteriores no sustituyen el run actual |
| Respaldo | Copia fresca anterior a DDL, cifrado/SHA iguales, todas las tablas restauradas/ledger/catalogo iguales, custodia externa y recuperación independiente probadas | No verificado hoy; locales declarados y antecedentes históricos |
| Migraciones | 28 activas; 0 intentos inconclusos; checksums 27/28 exactos; antecedente LF/CRLF resuelto por ensayo/decisión explícita sin alterar historia; demás checksums iguales; duración dentro de ventana | Hoy 26 activas, 30 filas/4 rollback históricos; faltan 27/28; cotejo 25/26 exactos y 1 diferencia LF/CRLF con ensayo pendiente |
| Roles/triggers | DDL como kortek_migrator; 2 funciones INVOKER/trigger/owner migrador, ACL/search_path correctos; gate 37 tablas exit 0 | Rol existe; funciones ausentes; permisos/ensayo pendientes |
| PG productivo | Ensayo aislado PG17.6 exitoso y CI PG16 exitoso; catálogo/extensiones/grants revisados | Versión 17.6 viva; ensayos pendientes |
| Configuración | Variables productivas presentes/válidas, orígenes exactos, Clerk live coherente, sin secretos QA; flags cerrados antes del corte | Solo cierre/correo del API y presencia de rate secret verificados |
| Pareja nueva | API image/release=S y READY web git SHA=S; alias correcto; active/running; 0 reinicios inesperados | No construida ni activada |
| Smoke cerrado | GET API raíz 404, privado sin token 401, rutas B2C retiradas 404 anónimo/bearer inválido, páginas B2C 404; web raíz 200; CORS exacto y orígenes ajenos sin ACAO | No ejecutado en este gate; a realizar en P9 sin POST |
| Observación | 15 minutos después de cada activación, 0 HTTP 5xx nuevos y 0 errores críticos de auth/DB; worker y archivos fuera de alcance sin cambio; alertas recibidas | No medido; propuesta de umbral por aprobar |
| QA/canales | Responsive/roles/errores evidenciados; correo y WhatsApp reales probados o desactivación/límites aprobados; Cloudinary con ciclo real documentado | C3 QA solo declaración iPhone; canales y ciclo pendientes |
| Apertura | Orden P10 expresa; GET booking-data/disponibilidad de un negocio real elegible 200 y proyección mínima; ninguna cuenta secundaria en reserva manual P11 | Flag true; no se abrió ni se creó negocio/fixture |
| Recuperación | Artefactos previos disponibles, rollback probado en clon con schema28, recierre autorizado, conservación de datos posteriores | Valores previos vivos conocidos; ensayo/export/recuperación pendientes |

Si un criterio falla, detener en el punto estable; no declarar aprobación por build, push, READY o declaración sin evidencia. Cualquier excepción residual debe quedar descrita y aceptada por el propietario antes de avanzar; ninguna excepción permite migrar sin respaldo ni relajar tenant/privilegios.

## 9. Deudas explícitas

- **Migración 28 sin uso B2C:** mantener por paridad; triggers siguen afectando escrituras. Retiro futuro exige migración compensatoria, schema/grants/ledger coordinados, ensayo y autorización; fuera de esta promoción.
- **Clerk en layout raíz:** ClerkProvider sigue envolviendo el flujo invitado; evaluar aislarlo al acceso interno sin degradar sesión/roles. Sin correctivo en este gate.
- **Auditoría periódica de dependencias:** automatizar solo con autorización; un audit verde histórico no garantiza el actual. Revisar avisos y CI del candidato antes de promoción.
- **Respaldo externo cifrado:** inventario/custodia/recuperación independiente de lo local, cobertura completa y continuidad de restores; la existencia de objetos históricos no acredita el respaldo de hoy.
- **Ciclo real Cloudinary no automatizado y evidencia de canales/monitoreo:** mantener pendientes visibles; requieren gates específicos y no se cierran mediante este plan.

## 10. Validación y publicación de este gate

Árbol inicial limpio en ai/reserva-invitado-ci/523d993. Git remoto leído; main local y rama QA local preservados. Merge-base/conteos/árboles, diff e inventario obtenidos de SHA exactos; no hubo merge real. `merge-tree` inicial falló por permiso de objetos y se repitió autorizado con exit 0; `ls-remote` y SSH iniciales fallaron por restricciones de entorno y sus repeticiones autorizadas pasaron. No se usan esos intentos fallidos como validación. Advertencia local de commit-graph incompleto conservada, sin reparar metadata ajena.

Lecturas vivas: Vercel alias/deployment; Supabase catálogo/ledger/conteos READ ONLY; SSH preflight productivo sanitizado. No se consultó Clerk/Cloudinary/Resend ni QA, no se ejecutaron fixtures/POST, migraciones, builds/despliegues o cambios productivos. No se devuelve PII ni valores de secretos.

Validación documental: enlaces locales, estados, decisiones frente a código, inventario completo, diff y staged completos, git diff --check/cached --check. No corresponden builds/tests de producto en este gate. Índice limitado al plan y entradas de control en docs/README.md, PROJECT_MASTER.md y CHANGELOG.md; BACKEND_CHANGES.md permanece intacto porque no cambia contrato. Único commit/push autorizado a origin/ai/reserva-invitado-ci, sin force. El SHA documental y cotejo remoto se entregan fuera de este archivo para evitar un hash autorreferencial. La publicación no activa la promoción.

## Apéndice: inventario completo mainSHA → S

A = añadido, M = modificado, D = eliminado. Inventario generado mediante `git diff --name-status fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6 523d993cfa0c797f356c224d5cc026d6c9ad4c7b`; no incluye el futuro commit de este plan.

<details>
<summary>905 archivos del rango completo</summary>

```text
M	.gitattributes
M	.github/workflows/quality.yml
M	.gitignore
M	BACKEND_CHANGES.md
M	CHANGELOG.md
M	PROJECT_MASTER.md
M	apps/api/.gitignore
M	apps/api/ops/README.md
M	apps/api/ops/apply-runtime-grants.sql
A	apps/api/ops/business-schedule-backfill.sql
A	apps/api/ops/customer-stage-one-runtime-grants.sql
M	apps/api/ops/rate-limit-http-drill.cjs
M	apps/api/ops/verify-runtime-role.sql
M	apps/api/package.json
A	apps/api/prisma/migrations/20260927170000_business_schedule/migration.sql
A	apps/api/prisma/migrations/20261003120000_customer_stage_one/migration.sql
A	apps/api/prisma/rollback/customer-stage-one.disposable.sql
M	apps/api/prisma/schema.prisma
M	apps/api/src/analytics/analytics.service.ts
M	apps/api/src/analytics/dashboard-summary.service.spec.ts
M	apps/api/src/analytics/dashboard-summary.service.ts
M	apps/api/src/app.module.ts
M	apps/api/src/auth/auth.module.ts
M	apps/api/src/auth/auth.service.spec.ts
M	apps/api/src/auth/auth.service.ts
D	apps/api/src/auth/clerk-customer-claims.controller.spec.ts
D	apps/api/src/auth/clerk-customer-claims.controller.ts
D	apps/api/src/auth/clerk-customer-claims.service.spec.ts
D	apps/api/src/auth/clerk-customer-claims.service.ts
M	apps/api/src/auth/clerk-onboarding.service.ts
D	apps/api/src/auth/dto/clerk-customer-claim.dto.ts
M	apps/api/src/auth/dto/create-team-invitation.dto.ts
M	apps/api/src/auth/guards/b2b-auth.guard.spec.ts
M	apps/api/src/auth/guards/b2b-auth.guard.ts
M	apps/api/src/auth/roles.constants.ts
A	apps/api/src/auth/strategies/jwt.strategy.spec.ts
M	apps/api/src/auth/strategies/jwt.strategy.ts
M	apps/api/src/auth/team-invitations.service.spec.ts
M	apps/api/src/auth/team-invitations.service.ts
M	apps/api/src/bookings/booking-concurrency.integration.spec.ts
M	apps/api/src/bookings/bookings.service.spec.ts
M	apps/api/src/bookings/bookings.service.ts
M	apps/api/src/bookings/dto/create-booking.dto.ts
M	apps/api/src/bookings/dto/reschedule-booking.dto.ts
A	apps/api/src/business-schedule/business-schedule.controller.ts
A	apps/api/src/business-schedule/business-schedule.dto.ts
A	apps/api/src/business-schedule/business-schedule.impact.ts
A	apps/api/src/business-schedule/business-schedule.integration.spec.ts
A	apps/api/src/business-schedule/business-schedule.module.ts
A	apps/api/src/business-schedule/business-schedule.policy.spec.ts
A	apps/api/src/business-schedule/business-schedule.policy.ts
A	apps/api/src/business-schedule/business-schedule.service.ts
M	apps/api/src/cms/cms.service.spec.ts
M	apps/api/src/cms/cms.service.ts
A	apps/api/src/common/organization-schedule-lock.ts
M	apps/api/src/common/professional-booking-lock.ts
M	apps/api/src/invoices/invoices.service.spec.ts
M	apps/api/src/invoices/invoices.service.ts
M	apps/api/src/media/media-policy.spec.ts
M	apps/api/src/media/media-policy.ts
M	apps/api/src/notifications/notification-producer.ts
A	apps/api/src/prisma/business-schedule-integrity.ts
M	apps/api/src/prisma/database-integrity.spec.ts
M	apps/api/src/prisma/database-integrity.ts
M	apps/api/src/prisma/verify-integrity.cli.ts
M	apps/api/src/professionals/dto/professional-availability.dto.ts
M	apps/api/src/professionals/professional-availability.service.spec.ts
M	apps/api/src/professionals/professional-availability.service.ts
M	apps/api/src/professionals/professional-availability.util.ts
M	apps/api/src/public-booking/availability.util.ts
M	apps/api/src/public-booking/dto/create-public-booking.dto.ts
A	apps/api/src/public-booking/dto/get-availability-days-query.dto.ts
M	apps/api/src/public-booking/dto/public-booking-response.dto.ts
A	apps/api/src/public-booking/guest-claim-retirement.integration.spec.ts
A	apps/api/src/public-booking/guest-retirement.spec.ts
A	apps/api/src/public-booking/public-booking-days.spec.ts
M	apps/api/src/public-booking/public-booking.controller.ts
M	apps/api/src/public-booking/public-booking.service.spec.ts
M	apps/api/src/public-booking/public-booking.service.ts
M	apps/api/src/public-booking/whatsapp-contract.spec.ts
A	apps/api/src/security/postgres-throttler.storage.spec.ts
M	apps/api/src/security/postgres-throttler.storage.ts
A	apps/api/test/business-schedule.e2e-spec.ts
D	apps/api/test/clerk-customer-claims.e2e-spec.ts
M	apps/api/test/cms.e2e-spec.ts
A	apps/api/test/customer-db-invariants.cjs
A	apps/api/test/customer-migration-fixture.cjs
A	apps/api/test/customer-no-dotenv.cjs
A	apps/api/test/customer-process.ts
A	apps/api/test/customer-query-plan.cjs
M	apps/api/test/dashboard-summary.e2e-spec.ts
A	apps/api/test/guest-network-guard.cjs
A	apps/api/test/guest-postgres-no-dotenv.cjs
A	apps/api/test/guest-postgres-run.cjs
A	apps/api/test/guest-retirement-run.cjs
A	apps/api/test/guest-suites-run.cjs
M	apps/api/test/invoices.e2e-spec.ts
M	apps/api/test/notifications-http.e2e-spec.ts
A	apps/api/test/postgres-throttler-retry.e2e-spec.ts
M	apps/api/test/professionals.e2e-spec.ts
A	apps/api/test/public-booking-m1.e2e-spec.ts
A	apps/api/test/retry-clock-child.cjs
M	apps/api/test/services.e2e-spec.ts
M	apps/web/app/[slug]/_components/ConfirmStep.tsx
M	apps/web/app/[slug]/_components/ContactStep.tsx
M	apps/web/app/[slug]/_components/DateTimeStep.tsx
M	apps/web/app/[slug]/_components/ProfessionalStep.tsx
M	apps/web/app/[slug]/_components/ServiceStep.tsx
M	apps/web/app/[slug]/_components/SuccessView.tsx
M	apps/web/app/[slug]/_components/shared.tsx
A	apps/web/app/[slug]/reservar/page.tsx
M	apps/web/app/dashboard/bookings/page.tsx
M	apps/web/app/dashboard/clients/page.tsx
M	apps/web/app/dashboard/invoices/page.tsx
M	apps/web/app/dashboard/layout.tsx
M	apps/web/app/dashboard/page.tsx
M	apps/web/app/dashboard/professionals/ProfessionalAvailabilityModal.tsx
M	apps/web/app/dashboard/professionals/page.tsx
M	apps/web/app/dashboard/settings/page.tsx
M	apps/web/app/dashboard/setup/page.tsx
M	apps/web/app/dashboard/team/page.tsx
M	apps/web/app/globals.css
A	apps/web/components/booking/AuthRecovery.test.tsx
A	apps/web/components/booking/AvailabilityPicker.tsx
M	apps/web/components/booking/BookingActions.tsx
A	apps/web/components/booking/BookingList.test.tsx
A	apps/web/components/booking/BookingName.tsx
A	apps/web/components/booking/BusinessDateTimeField.tsx
A	apps/web/components/booking/F0A.test.tsx
A	apps/web/components/booking/F0B.test.tsx
M	apps/web/components/booking/TimeSlotGrid.tsx
A	apps/web/components/booking/WeekCarousel.tsx
M	apps/web/components/cms/CmsSettings.test.tsx
M	apps/web/components/cms/CmsSettings.tsx
M	apps/web/components/dashboard/Sidebar.tsx
M	apps/web/components/dashboard/nav-items.ts
M	apps/web/components/landing/Proof.tsx
M	apps/web/components/notifications/BookingEmailOptIn.test.tsx
M	apps/web/components/notifications/InternalEmailOptIn.test.tsx
M	apps/web/components/notifications/NotificationsView.tsx
A	apps/web/components/public/BookingLight.test.tsx
A	apps/web/components/public/BookingPhoto.tsx
A	apps/web/components/public/BookingPolish.test.tsx
A	apps/web/components/public/M1C2.test.tsx
A	apps/web/components/public/PhoneField.tsx
A	apps/web/components/public/PublicBookingFooter.tsx
A	apps/web/components/public/PublicBookingScreen.tsx
A	apps/web/components/public/PublicDates.test.tsx
M	apps/web/components/public/PublicMiniSite.test.tsx
M	apps/web/components/public/PublicMiniSite.tsx
A	apps/web/components/public/WhatsAppIcon.tsx
D	apps/web/components/public/WhatsAppScope.test.tsx
M	apps/web/components/public/WhatsAppSuccess.test.tsx
A	apps/web/components/public/booking.css
A	apps/web/components/schedule/BusinessScheduleSettings.test.tsx
A	apps/web/components/schedule/BusinessScheduleSettings.tsx
A	apps/web/components/schedule/ProfessionalAvailabilityModal.test.tsx
A	apps/web/components/schedule/SettingsScreen.test.tsx
A	apps/web/components/schedule/SettingsScreen.tsx
A	apps/web/components/team/InvitationDates.test.tsx
A	apps/web/components/ui/BusinessTime.test.tsx
A	apps/web/components/ui/BusinessTime.tsx
M	apps/web/components/ui/Button.tsx
A	apps/web/components/ui/ErrorText.tsx
M	apps/web/components/ui/Field.tsx
M	apps/web/components/ui/PageHeader.tsx
M	apps/web/components/ui/PasswordField.tsx
M	apps/web/components/ui/Toast.tsx
A	apps/web/e2e/fixtures/offline-fonts.cjs
A	apps/web/e2e/fixtures/public-browser.ts
M	apps/web/e2e/media-c2.spec.ts
M	apps/web/e2e/public-landing.spec.ts
M	apps/web/e2e/whatsapp-c2.spec.ts
M	apps/web/lib/api.test.ts
M	apps/web/lib/api.ts
M	apps/web/lib/auth-bootstrap.test.ts
M	apps/web/lib/auth-context.tsx
A	apps/web/lib/booking-list.ts
A	apps/web/lib/booking-status-error.test.ts
A	apps/web/lib/booking-status-error.ts
A	apps/web/lib/business-schedule.ts
A	apps/web/lib/business-time-format.test.ts
A	apps/web/lib/business-time.test.ts
A	apps/web/lib/business-time.ts
M	apps/web/lib/cms-ui.ts
M	apps/web/lib/dashboard-summary-load.ts
M	apps/web/lib/invoice-ui.test.ts
M	apps/web/lib/invoice-ui.ts
M	apps/web/lib/media-ui.ts
M	apps/web/lib/notification-ui.ts
A	apps/web/lib/public-booking-ui.test.ts
A	apps/web/lib/public-booking-ui.ts
A	apps/web/lib/public-phone.test.ts
A	apps/web/lib/public-phone.ts
M	apps/web/lib/queries/bookings.ts
A	apps/web/lib/queries/business-schedule.ts
A	apps/web/lib/queries/invoice-cache.ts
M	apps/web/lib/queries/invoices.ts
M	apps/web/lib/queries/keys.ts
M	apps/web/lib/queries/media.ts
M	apps/web/lib/queries/public-booking.ts
M	apps/web/lib/query-client.ts
A	apps/web/lib/query-recovery.ts
M	apps/web/lib/service-ui.ts
M	apps/web/lib/team-ui.ts
A	apps/web/lib/use-public-read-wait.ts
M	apps/web/lib/web-deployment-config.test.ts
M	apps/web/lib/web-deployment-config.ts
M	apps/web/lib/whatsapp-link.ts
M	apps/web/package.json
A	apps/web/scripts/f0e-ajuste-browser.mjs
A	apps/web/scripts/f0e-browser.mjs
A	apps/web/scripts/f0e-build.mjs
A	apps/web/scripts/guest-c2-browser.mjs
M	config/environments.yaml
M	docs/README.md
M	docs/architecture/DATA_MODEL.md
M	docs/architecture/TRD.md
M	docs/decisions/ADR-002-facturacion-interna-inmutable.md
M	docs/features/FACTURACION_A_CONTRATO_TECNICO.md
A	docs/features/HORARIO_ZONA_C0_AUDITORIA.md
A	docs/features/HORARIO_ZONA_C1_CONTRATO.md
A	docs/features/HORARIO_ZONA_C1_EVIDENCIA.md
A	docs/features/HORARIO_ZONA_C1_INTEGRACION_LOCAL.md
A	docs/features/HORARIO_ZONA_C2_FRONTEND.md
A	docs/features/M2_CUENTA_CLIENTE_C1_CONTRATO.md
M	docs/features/NOTIFICACIONES_C1_CONTRATO.md
A	docs/features/RESERVA_INVITADO_C0_C1.md
A	docs/features/RESERVA_INVITADO_C1_CIERRE_TECNICO.md
A	docs/features/RESERVA_INVITADO_C2_LOCAL.md
A	docs/features/RESERVA_INVITADO_C3_CIERRE_QA.md
A	docs/features/RESERVA_INVITADO_C3_PREFLIGHT.md
A	docs/features/RESERVA_INVITADO_CONSISTENCIA_C0_C1.md
A	docs/features/RESERVA_INVITADO_PREPARACION_QA.md
M	docs/features/RESERVA_PUBLICA_H5_FECHAS.md
A	docs/history/reserva-invitado/CONSISTENCIA_ANTES_CORRECTIVO.md
A	docs/history/reserva-invitado/Customer.test.tsx.txt
A	docs/history/reserva-invitado/README.md
R089	apps/web/app/[slug]/_components/AccountStep.tsx	docs/history/reserva-invitado/c2/apps__web__app__[slug]___components__AccountStep.tsx.txt
R097	apps/web/app/[slug]/_components/StepRouter.tsx	docs/history/reserva-invitado/c2/apps__web__app__[slug]___components__StepRouter.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__app__[slug]__cuenta__[action]__page.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__app__[slug]__layout.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__app__[slug]__mi-perfil__page.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__app__[slug]__mis-reservas__[id]__page.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__app__[slug]__mis-reservas__[id]__repetir__page.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__app__[slug]__mis-reservas__page.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__components__customer__Customer.test.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__components__customer__CustomerAuth.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__components__customer__CustomerBookingDetail.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__components__customer__CustomerBookings.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__components__customer__CustomerClaim.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__components__customer__CustomerEntryLinks.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__components__customer__CustomerProfile.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__components__customer__CustomerProvider.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__components__customer__CustomerRepeatBooking.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__components__customer__CustomerShell.tsx.txt
A	docs/history/reserva-invitado/c2/apps__web__components__customer__customer.css.txt
A	docs/history/reserva-invitado/c2/apps__web__lib__customer-routes.ts.txt
A	docs/history/reserva-invitado/c2/apps__web__lib__customer-ui.test.ts.txt
A	docs/history/reserva-invitado/c2/apps__web__lib__customer-ui.ts.txt
A	docs/history/reserva-invitado/c2/apps__web__lib__queries__customer.ts.txt
A	docs/history/reserva-invitado/c2/apps__web__scripts__f0a-browser.mjs.txt
A	docs/history/reserva-invitado/helpers/customer-code-rollback.cjs.txt
A	docs/history/reserva-invitado/helpers/customer-runtime-compat.cjs.txt
A	docs/history/reserva-invitado/helpers/customer-runtime-grants-drill.cjs.txt
A	docs/history/reserva-invitado/helpers/m2-d4-probe.cjs.txt
M	docs/product/APP_FLOWS.md
M	docs/product/PRD.md
A	docs/quality/AUDITORIA_DISENO_UX_MARKETING_2026_09_29.md
A	docs/quality/AUDITORIA_HALLAZGOS_ROADMAP_MVP_2026_09_29.md
A	docs/quality/CI_CONCURRENCIA_HTTP.md
A	docs/quality/CI_ENTORNO_SINTETICO.md
A	docs/quality/CLERK_ROTACION_API_QA_2026_10_08.md
A	docs/quality/CORRECTIVO_CI_DEPENDENCY_PEER_AUDIT.md
A	docs/quality/CORRECTIVO_F0A.md
A	docs/quality/CORRECTIVO_F0B.md
A	docs/quality/CORRECTIVO_F0C.md
A	docs/quality/CORRECTIVO_F0D.md
A	docs/quality/CORRECTIVO_F0E.md
A	docs/quality/CORRECTIVO_F0E_AJUSTE.md
A	docs/quality/CORRECTIVO_FIXTURES_RETRY_RESERVA_INVITADA.md
A	docs/quality/CORRECTIVO_RETRY_AFTER_CI_WHITESPACE.md
A	docs/quality/DECISIONES_PROPIETARIO_2026_09_29.md
A	docs/quality/DIAGNOSTICO_RUNTIME_PRIVILEGE_GATE.md
A	docs/quality/DIAGNOSTICO_SUITES_RESERVA_INVITADA.md
A	docs/quality/M2_C1_CIERRE.md
A	docs/quality/M2_C2_CIERRE.md
A	docs/quality/M2_C3_P4_CLERK_CHECKLIST.md
A	docs/quality/M2_C3_PREFLIGHT.md
A	docs/quality/M2_CUENTA_CLIENTE_C0.md
A	docs/quality/P4B_RESERVA_INVITADA.md
A	docs/quality/RESERVA_PUBLICA_CONFIRMACION_UX.md
A	docs/quality/RESERVA_PUBLICA_M1_C0.md
A	docs/quality/RESERVA_PUBLICA_M1_C1_CIERRE.md
A	docs/quality/RESERVA_PUBLICA_M1_C2_CIERRE.md
A	docs/quality/RESERVA_PUBLICA_M1_C3_CIERRE.md
A	docs/quality/RESERVA_PUBLICA_M1_UX_CORRECTIVO_QA.md
A	docs/quality/RESERVA_PUBLICA_M1_UX_LIGERA.md
A	docs/quality/STAGING_QA_2026-09-28.md
A	docs/quality/evidence/ci-dependency-peer-audit/browser.json
A	docs/quality/evidence/ci-dependency-peer-audit/checks-runner.cjs.txt
A	docs/quality/evidence/ci-dependency-peer-audit/checks.json
A	docs/quality/evidence/ci-dependency-peer-audit/pg18-runner.cjs.txt
A	docs/quality/evidence/ci-dependency-peer-audit/pg18.json
A	docs/quality/evidence/ci-dependency-peer-audit/retry-web-types.json
A	docs/quality/evidence/ci-http-concurrency/baseline-5f215fce-5062-4320-a5c9-199584a30111/bootstrap.log
A	docs/quality/evidence/ci-http-concurrency/baseline-5f215fce-5062-4320-a5c9-199584a30111/e2e-1.log
A	docs/quality/evidence/ci-http-concurrency/baseline-5f215fce-5062-4320-a5c9-199584a30111/initdb.log
A	docs/quality/evidence/ci-http-concurrency/baseline-5f215fce-5062-4320-a5c9-199584a30111/report.json
A	docs/quality/evidence/ci-http-concurrency/baseline-5f215fce-5062-4320-a5c9-199584a30111/start.log
A	docs/quality/evidence/ci-http-concurrency/baseline-5f215fce-5062-4320-a5c9-199584a30111/version.log
A	docs/quality/evidence/ci-http-concurrency/cascade-87c8a80f-4071-4ccc-81e2-59c7e50edcca/bootstrap.log
A	docs/quality/evidence/ci-http-concurrency/cascade-87c8a80f-4071-4ccc-81e2-59c7e50edcca/cascade.log
A	docs/quality/evidence/ci-http-concurrency/cascade-87c8a80f-4071-4ccc-81e2-59c7e50edcca/initdb.log
A	docs/quality/evidence/ci-http-concurrency/cascade-87c8a80f-4071-4ccc-81e2-59c7e50edcca/migrations.log
A	docs/quality/evidence/ci-http-concurrency/cascade-87c8a80f-4071-4ccc-81e2-59c7e50edcca/report.json
A	docs/quality/evidence/ci-http-concurrency/cascade-87c8a80f-4071-4ccc-81e2-59c7e50edcca/start.log
A	docs/quality/evidence/ci-http-concurrency/cascade-87c8a80f-4071-4ccc-81e2-59c7e50edcca/version.log
A	docs/quality/evidence/ci-http-concurrency/cascade.cjs.txt
A	docs/quality/evidence/ci-http-concurrency/chrome-dry-run.log
A	docs/quality/evidence/ci-http-concurrency/ci-run57-excerpt.log
A	docs/quality/evidence/ci-http-concurrency/fixed-ae6ce45e-e82f-498b-8eaa-9b392f810309/bootstrap.log
A	docs/quality/evidence/ci-http-concurrency/fixed-ae6ce45e-e82f-498b-8eaa-9b392f810309/e2e-1.log
A	docs/quality/evidence/ci-http-concurrency/fixed-ae6ce45e-e82f-498b-8eaa-9b392f810309/e2e-2.log
A	docs/quality/evidence/ci-http-concurrency/fixed-ae6ce45e-e82f-498b-8eaa-9b392f810309/e2e-3.log
A	docs/quality/evidence/ci-http-concurrency/fixed-ae6ce45e-e82f-498b-8eaa-9b392f810309/e2e-4.log
A	docs/quality/evidence/ci-http-concurrency/fixed-ae6ce45e-e82f-498b-8eaa-9b392f810309/e2e-5.log
A	docs/quality/evidence/ci-http-concurrency/fixed-ae6ce45e-e82f-498b-8eaa-9b392f810309/initdb.log
A	docs/quality/evidence/ci-http-concurrency/fixed-ae6ce45e-e82f-498b-8eaa-9b392f810309/report.json
A	docs/quality/evidence/ci-http-concurrency/fixed-ae6ce45e-e82f-498b-8eaa-9b392f810309/start.log
A	docs/quality/evidence/ci-http-concurrency/fixed-ae6ce45e-e82f-498b-8eaa-9b392f810309/version.log
A	docs/quality/evidence/ci-http-concurrency/full-4234caea-8491-495c-9d77-752546a06fe9/bootstrap.log
A	docs/quality/evidence/ci-http-concurrency/full-4234caea-8491-495c-9d77-752546a06fe9/e2e-1.log
A	docs/quality/evidence/ci-http-concurrency/full-4234caea-8491-495c-9d77-752546a06fe9/initdb.log
A	docs/quality/evidence/ci-http-concurrency/full-4234caea-8491-495c-9d77-752546a06fe9/report.json
A	docs/quality/evidence/ci-http-concurrency/full-4234caea-8491-495c-9d77-752546a06fe9/start.log
A	docs/quality/evidence/ci-http-concurrency/full-4234caea-8491-495c-9d77-752546a06fe9/version.log
A	docs/quality/evidence/ci-http-concurrency/http-probe.cjs.txt
A	docs/quality/evidence/ci-http-concurrency/http-probe.json
A	docs/quality/evidence/ci-http-concurrency/lint.log
A	docs/quality/evidence/ci-http-concurrency/pg-harness.cjs.txt
A	docs/quality/evidence/ci-http-concurrency/types.log
A	docs/quality/evidence/ci-http-concurrency/verification.json
A	docs/quality/evidence/ci-synthetic-env/api-read.json
A	docs/quality/evidence/ci-synthetic-env/local-a961fc6b-b76c-4938-aa2e-28b11fa36f72/Prisma-contract-and-generated-client.log
A	docs/quality/evidence/ci-synthetic-env/local-a961fc6b-b76c-4938-aa2e-28b11fa36f72/bootstrap.log
A	docs/quality/evidence/ci-synthetic-env/local-a961fc6b-b76c-4938-aa2e-28b11fa36f72/initdb.log
A	docs/quality/evidence/ci-synthetic-env/local-a961fc6b-b76c-4938-aa2e-28b11fa36f72/report.json
A	docs/quality/evidence/ci-synthetic-env/local-a961fc6b-b76c-4938-aa2e-28b11fa36f72/start.log
A	docs/quality/evidence/ci-synthetic-env/local-a961fc6b-b76c-4938-aa2e-28b11fa36f72/version.log
A	docs/quality/evidence/ci-synthetic-env/local-b4479c04-0636-41bd-9934-622d2fb77da7/Prisma-contract-and-generated-client.log
A	docs/quality/evidence/ci-synthetic-env/local-b4479c04-0636-41bd-9934-622d2fb77da7/Production-builds.log
A	docs/quality/evidence/ci-synthetic-env/local-b4479c04-0636-41bd-9934-622d2fb77da7/Runtime-privilege-matrix-gate.log
A	docs/quality/evidence/ci-synthetic-env/local-b4479c04-0636-41bd-9934-622d2fb77da7/TypeScript-and-lint.log
A	docs/quality/evidence/ci-synthetic-env/local-b4479c04-0636-41bd-9934-622d2fb77da7/Unit-and-component-tests.log
A	docs/quality/evidence/ci-synthetic-env/local-b4479c04-0636-41bd-9934-622d2fb77da7/bootstrap.log
A	docs/quality/evidence/ci-synthetic-env/local-b4479c04-0636-41bd-9934-622d2fb77da7/initdb.log
A	docs/quality/evidence/ci-synthetic-env/local-b4479c04-0636-41bd-9934-622d2fb77da7/report.json
A	docs/quality/evidence/ci-synthetic-env/local-b4479c04-0636-41bd-9934-622d2fb77da7/start.log
A	docs/quality/evidence/ci-synthetic-env/local-b4479c04-0636-41bd-9934-622d2fb77da7/version.log
A	docs/quality/evidence/ci-synthetic-env/local-d8696080-661f-4f0d-ad3a-5c19e5692b3b/Browser-smoke-tests.log
A	docs/quality/evidence/ci-synthetic-env/local-d8696080-661f-4f0d-ad3a-5c19e5692b3b/PostgreSQL-integrity-and-isolated-E2E.log
A	docs/quality/evidence/ci-synthetic-env/local-d8696080-661f-4f0d-ad3a-5c19e5692b3b/Prisma-contract-and-generated-client.log
A	docs/quality/evidence/ci-synthetic-env/local-d8696080-661f-4f0d-ad3a-5c19e5692b3b/Production-builds.log
A	docs/quality/evidence/ci-synthetic-env/local-d8696080-661f-4f0d-ad3a-5c19e5692b3b/bootstrap.log
A	docs/quality/evidence/ci-synthetic-env/local-d8696080-661f-4f0d-ad3a-5c19e5692b3b/initdb.log
A	docs/quality/evidence/ci-synthetic-env/local-d8696080-661f-4f0d-ad3a-5c19e5692b3b/report.json
A	docs/quality/evidence/ci-synthetic-env/local-d8696080-661f-4f0d-ad3a-5c19e5692b3b/start.log
A	docs/quality/evidence/ci-synthetic-env/local-d8696080-661f-4f0d-ad3a-5c19e5692b3b/version.log
A	docs/quality/evidence/ci-synthetic-env/materialize.cjs.txt
A	docs/quality/evidence/ci-synthetic-env/restore-wrappers.cjs.txt
A	docs/quality/evidence/ci-synthetic-env/runner.cjs.txt
A	docs/quality/evidence/f0e-ajuste/browser.json
A	docs/quality/evidence/f0e-ajuste/exito-business-320.png
A	docs/quality/evidence/f0e-ajuste/exito-business-375.png
A	docs/quality/evidence/f0e-ajuste/exito-business-390.png
A	docs/quality/evidence/f0e-ajuste/exito-none-320.png
A	docs/quality/evidence/f0e-ajuste/exito-none-375.png
A	docs/quality/evidence/f0e-ajuste/exito-none-390.png
A	docs/quality/evidence/f0e-ajuste/facturacion-1024.png
A	docs/quality/evidence/f0e-ajuste/facturacion-1280.png
A	docs/quality/evidence/f0e-ajuste/facturacion-1440.png
A	docs/quality/evidence/f0e-ajuste/facturacion-1920.png
A	docs/quality/evidence/f0e-ajuste/facturacion-320.png
A	docs/quality/evidence/f0e-ajuste/facturacion-375.png
A	docs/quality/evidence/f0e-ajuste/facturacion-390.png
A	docs/quality/evidence/f0e-ajuste/facturacion-768.png
A	docs/quality/evidence/f0e-ajuste/mini-sitio-business-320.png
A	docs/quality/evidence/f0e-ajuste/mini-sitio-business-375.png
A	docs/quality/evidence/f0e-ajuste/mini-sitio-business-390.png
A	docs/quality/evidence/f0e-ajuste/mini-sitio-none-320.png
A	docs/quality/evidence/f0e-ajuste/mini-sitio-none-375.png
A	docs/quality/evidence/f0e-ajuste/mini-sitio-none-390.png
A	docs/quality/evidence/f0e-ajuste/reservas-inicial-1024.png
A	docs/quality/evidence/f0e-ajuste/reservas-inicial-1280.png
A	docs/quality/evidence/f0e-ajuste/reservas-inicial-1440.png
A	docs/quality/evidence/f0e-ajuste/reservas-inicial-1920.png
A	docs/quality/evidence/f0e-ajuste/reservas-inicial-320.png
A	docs/quality/evidence/f0e-ajuste/reservas-inicial-375.png
A	docs/quality/evidence/f0e-ajuste/reservas-inicial-390.png
A	docs/quality/evidence/f0e-ajuste/reservas-inicial-768.png
A	docs/quality/evidence/f0e-ajuste/reservas-todas-1024.png
A	docs/quality/evidence/f0e-ajuste/reservas-todas-1280.png
A	docs/quality/evidence/f0e-ajuste/reservas-todas-1440.png
A	docs/quality/evidence/f0e-ajuste/reservas-todas-1920.png
A	docs/quality/evidence/f0e-ajuste/reservas-todas-320.png
A	docs/quality/evidence/f0e-ajuste/reservas-todas-375.png
A	docs/quality/evidence/f0e-ajuste/reservas-todas-390.png
A	docs/quality/evidence/f0e-ajuste/reservas-todas-768.png
A	docs/quality/evidence/f0e-ajuste/revision-business-320.png
A	docs/quality/evidence/f0e-ajuste/revision-business-375.png
A	docs/quality/evidence/f0e-ajuste/revision-business-390.png
A	docs/quality/evidence/f0e-ajuste/revision-none-320.png
A	docs/quality/evidence/f0e-ajuste/revision-none-375.png
A	docs/quality/evidence/f0e-ajuste/revision-none-390.png
A	docs/quality/evidence/f0e/browser.json
A	docs/quality/evidence/f0e/exito-business-320.png
A	docs/quality/evidence/f0e/exito-business-375.png
A	docs/quality/evidence/f0e/exito-business-390.png
A	docs/quality/evidence/f0e/exito-none-320.png
A	docs/quality/evidence/f0e/exito-none-375.png
A	docs/quality/evidence/f0e/exito-none-390.png
A	docs/quality/evidence/f0e/facturacion-1024.png
A	docs/quality/evidence/f0e/facturacion-1280.png
A	docs/quality/evidence/f0e/facturacion-1440.png
A	docs/quality/evidence/f0e/facturacion-1920.png
A	docs/quality/evidence/f0e/facturacion-320.png
A	docs/quality/evidence/f0e/facturacion-375.png
A	docs/quality/evidence/f0e/facturacion-390.png
A	docs/quality/evidence/f0e/facturacion-768.png
A	docs/quality/evidence/f0e/reservas-inicial-1024.png
A	docs/quality/evidence/f0e/reservas-inicial-1280.png
A	docs/quality/evidence/f0e/reservas-inicial-1440.png
A	docs/quality/evidence/f0e/reservas-inicial-1920.png
A	docs/quality/evidence/f0e/reservas-inicial-320.png
A	docs/quality/evidence/f0e/reservas-inicial-375.png
A	docs/quality/evidence/f0e/reservas-inicial-390.png
A	docs/quality/evidence/f0e/reservas-inicial-768.png
A	docs/quality/evidence/f0e/reservas-todas-1024.png
A	docs/quality/evidence/f0e/reservas-todas-1280.png
A	docs/quality/evidence/f0e/reservas-todas-1440.png
A	docs/quality/evidence/f0e/reservas-todas-1920.png
A	docs/quality/evidence/f0e/reservas-todas-320.png
A	docs/quality/evidence/f0e/reservas-todas-375.png
A	docs/quality/evidence/f0e/reservas-todas-390.png
A	docs/quality/evidence/f0e/reservas-todas-768.png
A	docs/quality/evidence/f0e/revision-business-320.png
A	docs/quality/evidence/f0e/revision-business-375.png
A	docs/quality/evidence/f0e/revision-business-390.png
A	docs/quality/evidence/f0e/revision-none-320.png
A	docs/quality/evidence/f0e/revision-none-375.png
A	docs/quality/evidence/f0e/revision-none-390.png
A	docs/quality/evidence/m1-c2/accesibilidad.json
A	docs/quality/evidence/m1-c2/calendario-1280.png
A	docs/quality/evidence/m1-c2/calendario-320.png
A	docs/quality/evidence/m1-c2/calendario-375.png
A	docs/quality/evidence/m1-c2/calendario-390.png
A	docs/quality/evidence/m1-c2/errores.json
A	docs/quality/evidence/m1-c2/exito-norte.png
A	docs/quality/evidence/m1-c2/exito-sur.png
A	docs/quality/evidence/m1-c2/recorrido.json
A	docs/quality/evidence/m1-c2/roles.json
A	docs/quality/evidence/m1-c2/zoom-200.png
A	docs/quality/evidence/m1-c3/activacion-api.json
A	docs/quality/evidence/m1-c3/aprobacion-cierre-20261003.json
A	docs/quality/evidence/m1-c3/backup-verificado.json
A	docs/quality/evidence/m1-c3/calendario-qa.jpg
A	docs/quality/evidence/m1-c3/cierre-documental-20261003.json
A	docs/quality/evidence/m1-c3/controles-http.json
A	docs/quality/evidence/m1-c3/exito-qa.jpg
A	docs/quality/evidence/m1-c3/inspeccion-previa.json
A	docs/quality/evidence/m1-c3/navegador-qa.json
A	docs/quality/evidence/m1-c3/produccion-comparacion.json
A	docs/quality/evidence/m1-c3/validacion-entrega.json
A	docs/quality/evidence/m1-c3/verificacion-final.json
A	docs/quality/evidence/m1-c3/web-qa.json
A	docs/quality/evidence/m1-polish/carrusel-375.png
A	docs/quality/evidence/m1-polish/contacto-password-375.png
A	docs/quality/evidence/m1-polish/deployed-qa.json
A	docs/quality/evidence/m1-polish/exito-375.png
A	docs/quality/evidence/m1-polish/fecha-hora-375.png
A	docs/quality/evidence/m1-polish/functional.json
A	docs/quality/evidence/m1-polish/mes-375.png
A	docs/quality/evidence/m1-polish/operational-audit.json
A	docs/quality/evidence/m1-polish/profesionales-375.png
A	docs/quality/evidence/m1-polish/qa-revision-375.png
A	docs/quality/evidence/m1-polish/responsive.json
A	docs/quality/evidence/m1-polish/revision-375.png
A	docs/quality/evidence/m1-polish/servicios-375.png
A	docs/quality/evidence/m1-polish/web-deployment.json
A	docs/quality/evidence/m1-ux/banderas-qa.jpg
A	docs/quality/evidence/m1-ux/calendario-375.png
A	docs/quality/evidence/m1-ux/contacto-vacio-375.png
A	docs/quality/evidence/m1-ux/fecha-hora-1280.png
A	docs/quality/evidence/m1-ux/fecha-hora-320.png
A	docs/quality/evidence/m1-ux/fecha-hora-375.png
A	docs/quality/evidence/m1-ux/fecha-hora-390.png
A	docs/quality/evidence/m1-ux/fecha-hora-768.png
A	docs/quality/evidence/m1-ux/horas-sin-filtros-375.png
A	docs/quality/evidence/m1-ux/inspeccion-publicacion.json
A	docs/quality/evidence/m1-ux/profesionales-375.png
A	docs/quality/evidence/m1-ux/publicacion-qa.json
A	docs/quality/evidence/m1-ux/regreso-desde-otro-mes.json
A	docs/quality/evidence/m1-ux/responsive.json
A	docs/quality/evidence/m1-ux/resultado-375.png
A	docs/quality/evidence/m1-ux/revision-375.png
A	docs/quality/evidence/m1-ux/semana-entre-meses-375.png
A	docs/quality/evidence/m1-ux/servicios-375.png
A	docs/quality/evidence/m1-ux/validacion.json
A	docs/quality/evidence/m2-c1/d4-http-antes-despues.json
A	docs/quality/evidence/m2-c1/d4-validation.json
A	docs/quality/evidence/m2-c1/database-invariants.json
A	docs/quality/evidence/m2-c1/query-plans.json
A	docs/quality/evidence/m2-c1/validation.json
A	docs/quality/evidence/m2-c2/account-errors-390.png
A	docs/quality/evidence/m2-c2/claim-success-390.png
A	docs/quality/evidence/m2-c2/profile-390.png
A	docs/quality/evidence/m2-c2/profile-errors-390.png
A	docs/quality/evidence/m2-c2/repeat-success-390.png
A	docs/quality/evidence/m2-c2/review-crear-reflow-200.png
A	docs/quality/evidence/m2-c2/review-entrar-reflow-200.png
A	docs/quality/evidence/m2-c2/review-mi-perfil-reflow-200.png
A	docs/quality/evidence/m2-c2/review-mis-reservas-reflow-200.png
A	docs/quality/evidence/m2-c2/validation.json
A	docs/quality/evidence/m2-c2/zoom-reflow-200.png
A	docs/quality/evidence/m2-c3-p1/p0-read-only.json
A	docs/quality/evidence/m2-c3-p1/p1-validation.json
A	docs/quality/evidence/m2-c3-p2/p2-cliente-ensayo-local-fallo1.json
A	docs/quality/evidence/m2-c3-p2/p2-cliente-ensayo-local-fallo2.json
A	docs/quality/evidence/m2-c3-p2/p2-cliente-ensayo-local.json
A	docs/quality/evidence/m2-c3-p2/p2-cliente-local.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-crypto.sh.txt
A	docs/quality/evidence/m2-c3-p2/p2-diagnostico-reanudacion.json
A	docs/quality/evidence/m2-c3-p2/p2-docker-reproduccion.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004-postcommit/manifest.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004-postcommit/post-commit-audit.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004-postcommit/post-commit-audit.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004-postcommit/validation.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/a-before-dump.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/a-complete.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/a-corruption.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/a-errors.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/a-fallback.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/a-gate.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/a-impediments.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/a-targeted.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/a-units.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/a-wrong-phrase.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/archive-map.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/bc-first.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/c-verified.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/cleanup.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/controller-final.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/controller.ps1.txt
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/document-prefix.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/executed-sources.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/executor.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/final-audit-earlier.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/final-audit-sandbox-failure.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/final-audit.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/final-audit.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/harness.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/image-drill.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/image-driver.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/image-rollback.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/local-probes.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/manifest.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/restore-version.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/session-notes.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/validate.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/validation-impediment.json
A	docs/quality/evidence/m2-c3-p2/p2-goal-20261004/validation.json
A	docs/quality/evidence/m2-c3-p2/p2-gpg-arnes.json
A	docs/quality/evidence/m2-c3-p2/p2-gpg-arnes.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-gpg-diagnostico-restauracion.json
A	docs/quality/evidence/m2-c3-p2/p2-gpg-diagnostico.json
A	docs/quality/evidence/m2-c3-p2/p2-gpg-diagnostico.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-gpg-ejecutor.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-gpg-fallback.json
A	docs/quality/evidence/m2-c3-p2/p2-gpg-home-corto.json
A	docs/quality/evidence/m2-c3-p2/p2-gpg-home-corto.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-gpg-limpieza-local.json
A	docs/quality/evidence/m2-c3-p2/p2-gpg-preparacion-local.json
A	docs/quality/evidence/m2-c3-p2/p2-gpg-recorrido-local.json
A	docs/quality/evidence/m2-c3-p2/p2-gpg-unidades.json
A	docs/quality/evidence/m2-c3-p2/p2-iteracion-local-1-arnes.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-iteracion-local-1-ejecutor.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-iteracion-local-2-arnes.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-iteracion-local-2-ejecutor.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-iteracion-local-2-fallback.json
A	docs/quality/evidence/m2-c3-p2/p2-iteracion-local-2-restore.sql.txt
A	docs/quality/evidence/m2-c3-p2/p2-iteracion-local-2-schema.diff.txt
A	docs/quality/evidence/m2-c3-p2/p2-iteracion-local-2-snapshot.sql.txt
A	docs/quality/evidence/m2-c3-p2/p2-iteracion-local-2-unidades.json
A	docs/quality/evidence/m2-c3-p2/p2-iteracion-local-diagnostico.json
A	docs/quality/evidence/m2-c3-p2/p2-iteracion-local-limpieza.json
A	docs/quality/evidence/m2-c3-p2/p2-iteracion-local-registro.json
A	docs/quality/evidence/m2-c3-p2/p2-iteracion-local-validacion.json
A	docs/quality/evidence/m2-c3-p2/p2-limpieza-local.json
A	docs/quality/evidence/m2-c3-p2/p2-parada-previa.json
A	docs/quality/evidence/m2-c3-p2/p2-preparacion.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-real-correccion-ledger.diff.txt
A	docs/quality/evidence/m2-c3-p2/p2-real-ejecutor-intento.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-real-limpieza-paso0.json
A	docs/quality/evidence/m2-c3-p2/p2-real-parada-paso0.json
A	docs/quality/evidence/m2-c3-p2/p2-real-paso0-proveedores.json
A	docs/quality/evidence/m2-c3-p2/p2-real-prueba-comparador-local.json
A	docs/quality/evidence/m2-c3-p2/p2-real-supervisor.ps1.txt
A	docs/quality/evidence/m2-c3-p2/p2-reintento-arnes.json
A	docs/quality/evidence/m2-c3-p2/p2-reintento-arnes.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-reintento-diagnostico-local.json
A	docs/quality/evidence/m2-c3-p2/p2-reintento-ejecutor.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-reintento-limpieza-local.json
A	docs/quality/evidence/m2-c3-p2/p2-reintento-recorrido-local.json
A	docs/quality/evidence/m2-c3-p2/p2-reintento-supervisor.ps1.txt
A	docs/quality/evidence/m2-c3-p2/p2-segundo-intento.json
A	docs/quality/evidence/m2-c3-p2/p2-sin-congelar-arnes.json
A	docs/quality/evidence/m2-c3-p2/p2-sin-congelar-arnes.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-sin-congelar-diagnostico-local.json
A	docs/quality/evidence/m2-c3-p2/p2-sin-congelar-ejecutor.py.txt
A	docs/quality/evidence/m2-c3-p2/p2-sin-congelar-fallback.json
A	docs/quality/evidence/m2-c3-p2/p2-sin-congelar-limpieza-local.json
A	docs/quality/evidence/m2-c3-p2/p2-sin-congelar-recorrido-local.json
A	docs/quality/evidence/m2-c3-p2/p2-sin-congelar-supervisor.ps1.txt
A	docs/quality/evidence/m2-c3-p2/p2-sin-congelar-unidades.json
A	docs/quality/evidence/m2-c3-p2/p2-wrapper-corregido.ps1
A	docs/quality/evidence/m2-c3-p2/p2-wrapper.ps1.txt
A	docs/quality/evidence/m2-c3-p3/local-gate-correction-20261004/executed-sources.json
A	docs/quality/evidence/m2-c3-p3/local-gate-correction-20261004/impediments.json
A	docs/quality/evidence/m2-c3-p3/local-gate-correction-20261004/manifest.json
A	docs/quality/evidence/m2-c3-p3/local-gate-correction-20261004/result.json
A	docs/quality/evidence/m2-c3-p3/local-gate-correction-20261004/verification.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/authorization.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/checksum-equivalence.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/completion-audit.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/executed-sources.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/final-audit.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/gate-source-identity.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/impediments.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/manifest.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/p0-checksum-precedent.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/r1-live-readonly.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/r1-real-p2-reference.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/r2-runtime-gate.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/r3-preactivation.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/r4-activation.json
A	docs/quality/evidence/m2-c3-p3/owner-decision-complete-20261004/watchdog-local-verification.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/api-test-preparation.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/artifact-build-result.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/artifact-preparation.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/authorization.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/catalog-result.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/clarifications.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/crlf-correction-local-only.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/document-prefix.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/executed-and-corrected-sources.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/executor-static-review.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/freeze--result.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/freeze-controller-state.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/image-identity.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/image-stage-attempt-1.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/image-stage-verified--result.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/impediments.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/initial-state.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/local-bash-correction--result.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/local-bash-correction-attempt-1.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/manifest.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/postcommit-manifest-audit.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/rehearsal-attempt-1.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/rehearsal-attempt-2.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/rollback-final--result.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/runtime-gate-adaptation.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/runtime-gate-corrected.sh.txt
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/startup-drill-attempt-1.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/startup-retry--result.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/startup-verification.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/status.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/validation.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/watchdog-corrected.sh.txt
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/worker-image-decision.json
A	docs/quality/evidence/m2-c3-p3/p3-goal-20261004/worker-image-proposal.diff
A	docs/quality/evidence/m2-c3-p3/r1-continuation-stop-20261005/assessment.json
A	docs/quality/evidence/m2-c3-p3/r1-continuation-stop-20261005/attempt-1.json
A	docs/quality/evidence/m2-c3-p3/r1-continuation-stop-20261005/authorization.json
A	docs/quality/evidence/m2-c3-p3/r1-continuation-stop-20261005/executed-sources.json
A	docs/quality/evidence/m2-c3-p3/r1-continuation-stop-20261005/impediments.json
A	docs/quality/evidence/m2-c3-p3/r1-continuation-stop-20261005/manifest.json
A	docs/quality/evidence/m2-c3-p3/r1-continuation-stop-20261005/result.json
A	docs/quality/evidence/m2-c3-p3/sql-eol-lf-20261004/manifest.json
A	docs/quality/evidence/m2-c3-p3/sql-eol-lf-20261004/verification.json
A	docs/quality/evidence/reserva-invitado-c1/c0-c1-con-correctivo.patch
A	docs/quality/evidence/reserva-invitado-c1/c0-c1.patch
A	docs/quality/evidence/reserva-invitado-c1/consistencia-omitidas.json
A	docs/quality/evidence/reserva-invitado-c1/consistencia-referencias.json
A	docs/quality/evidence/reserva-invitado-c1/consistencia-rutas.json
A	docs/quality/evidence/reserva-invitado-c1/correctivo-helpers-archivo.json
A	docs/quality/evidence/reserva-invitado-c1/correctivo-referencias.json
A	docs/quality/evidence/reserva-invitado-c1/correctivo-rutas.json
A	docs/quality/evidence/reserva-invitado-c1/correctivo-validacion.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/bootstrap.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/business-schedule.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/business-schedule.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/clerk-user-link.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/clerk-user-link.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/initdb.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/migrate-deploy.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/migration-ledger.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/postgres-version.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/provision-runtime.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/run.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/runtime-gate.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/server-version.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/start.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/4d6169ae7ddc489eab58e85799bf1eb3/stop.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/booking-concurrency.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/booking-concurrency.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/bootstrap.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/business-schedule.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/business-schedule.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/clerk-user-link.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/clerk-user-link.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/guest-claim-retirement.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/guest-claim-retirement.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/initdb.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/migrate-deploy.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/migration-ledger.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/postgres-version.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/provision-runtime.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/run.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/runtime-gate.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/server-version.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/start.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/54e4c2049d35470da1dc299671c064e1/stop.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/65deab5f99a54b84bf25fe1d7f783ee4/cleanup.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/65deab5f99a54b84bf25fe1d7f783ee4/initdb.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/65deab5f99a54b84bf25fe1d7f783ee4/postgres-version.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/65deab5f99a54b84bf25fe1d7f783ee4/run.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/65deab5f99a54b84bf25fe1d7f783ee4/start.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/65deab5f99a54b84bf25fe1d7f783ee4/stop.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/booking-concurrency.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/booking-concurrency.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/bootstrap.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/business-schedule.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/business-schedule.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/clerk-user-link.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/clerk-user-link.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/guest-claim-retirement.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/guest-claim-retirement.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/initdb.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/migrate-deploy.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/migration-ledger.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/postgres-version.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/provision-runtime.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/run.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/runtime-gate.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/server-version.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/start.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/84dca0f1d6664f56a51d1b31b5e25474/stop.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/booking-concurrency.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/booking-concurrency.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/bootstrap.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/business-schedule.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/business-schedule.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/clerk-user-link.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/clerk-user-link.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/guest-claim-retirement.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/guest-claim-retirement.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/initdb.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/migrate-deploy.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/migration-ledger.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/postgres-version.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/provision-runtime.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/run.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/runtime-gate.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/server-version.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/start.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/bdeb165b559b43efbbda355eedf51804/stop.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/c030b848012a4f27af97e3c4c2842e47/initdb.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/c030b848012a4f27af97e3c4c2842e47/interrupted.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/c030b848012a4f27af97e3c4c2842e47/postgres-version.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/c030b848012a4f27af97e3c4c2842e47/startup.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/c1-validado.patch
A	docs/quality/evidence/reserva-invitado-c1/postgres/cierre-c1.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/booking-concurrency.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/booking-concurrency.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/bootstrap.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/business-schedule.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/business-schedule.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/clerk-user-link.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/clerk-user-link.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/full-api.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/full-api.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/guest-claim-retirement.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/guest-claim-retirement.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/initdb.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/migrate-deploy.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/migration-ledger.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/postgres-version.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/provision-runtime.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/run.json
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/runtime-gate.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/server-version.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/start.log
A	docs/quality/evidence/reserva-invitado-c1/postgres/e6f8eed515574078ae501d662ba742f0/stop.log
A	docs/quality/evidence/reserva-invitado-c1/validacion.json
A	docs/quality/evidence/reserva-invitado-c2/authorization.md
A	docs/quality/evidence/reserva-invitado-c2/browser/contact-1280.png
A	docs/quality/evidence/reserva-invitado-c2/browser/contact-320.png
A	docs/quality/evidence/reserva-invitado-c2/browser/contact-375.png
A	docs/quality/evidence/reserva-invitado-c2/browser/contact-390.png
A	docs/quality/evidence/reserva-invitado-c2/browser/contact-768.png
A	docs/quality/evidence/reserva-invitado-c2/browser/failure-1280-ADMIN.png
A	docs/quality/evidence/reserva-invitado-c2/browser/failure-1280-BARBER.png
A	docs/quality/evidence/reserva-invitado-c2/browser/failure-1280-OWNER.png
A	docs/quality/evidence/reserva-invitado-c2/browser/failure-1280-RECEPTIONIST.png
A	docs/quality/evidence/reserva-invitado-c2/browser/failure-1280-guest.png
A	docs/quality/evidence/reserva-invitado-c2/browser/failure-320-guest.png
A	docs/quality/evidence/reserva-invitado-c2/browser/failure-375-guest.png
A	docs/quality/evidence/reserva-invitado-c2/browser/failure-390-guest.png
A	docs/quality/evidence/reserva-invitado-c2/browser/failure-768-guest.png
A	docs/quality/evidence/reserva-invitado-c2/browser/initial-failure.json
A	docs/quality/evidence/reserva-invitado-c2/browser/results.json
A	docs/quality/evidence/reserva-invitado-c2/browser/success-1280.png
A	docs/quality/evidence/reserva-invitado-c2/browser/success-320.png
A	docs/quality/evidence/reserva-invitado-c2/browser/success-375.png
A	docs/quality/evidence/reserva-invitado-c2/browser/success-390.png
A	docs/quality/evidence/reserva-invitado-c2/browser/success-768.png
A	docs/quality/evidence/reserva-invitado-c2/consumer-search.txt
A	docs/quality/evidence/reserva-invitado-c2/diff-validation.json
A	docs/quality/evidence/reserva-invitado-c2/final-git-status.txt
A	docs/quality/evidence/reserva-invitado-c2/full.patch
A	docs/quality/evidence/reserva-invitado-c2/retirados.json
A	docs/quality/evidence/reserva-invitado-c2/validation.json
A	docs/quality/evidence/reserva-invitado-c2/web-routes.json
A	docs/quality/evidence/reserva-invitado-c2/web-tests.log
A	docs/quality/evidence/reserva-invitado-c2/web-types.log
A	docs/quality/evidence/reserva-invitado-c3/consumer-search.txt
A	docs/quality/evidence/reserva-invitado-c3/final-git-status.txt
A	docs/quality/evidence/reserva-invitado-c3/git-preflight.json
A	docs/quality/evidence/reserva-invitado-c3/known-web-consumer.json
A	docs/quality/evidence/reserva-invitado-c3/preflight.json
A	docs/quality/evidence/reserva-invitado-c3/recheck-2.json
A	docs/quality/evidence/reserva-invitado-c3/recheck-3.json
A	docs/quality/evidence/reserva-invitado-fixtures/retry-after-frio.json
A	docs/quality/evidence/reserva-invitado-fixtures/validacion-precommit.json
A	docs/quality/evidence/reserva-invitado-preparacion/candidate-files.md
A	docs/quality/evidence/reserva-invitado-preparacion/candidate-paths.txt
A	docs/quality/evidence/reserva-invitado-preparacion/content-scan.json
A	docs/quality/evidence/reserva-invitado-preparacion/final-checks.json
A	docs/quality/evidence/reserva-invitado-preparacion/final-inventory.json
A	docs/quality/evidence/reserva-invitado-preparacion/full.patch
A	docs/quality/evidence/reserva-invitado-preparacion/git-status.txt
A	docs/quality/evidence/reserva-invitado-preparacion/review.json
A	docs/quality/evidence/reserva-invitado-preparacion/unchanged-source-proof.json
A	docs/quality/evidence/reserva-invitado-preparacion/unpublished-range-paths.txt
A	docs/quality/evidence/reserva-invitado-suites/clasificacion.json
A	docs/quality/evidence/reserva-invitado-suites/ensayos.json
A	docs/quality/evidence/reserva-invitado-suites/validaciones.json
A	docs/quality/evidence/retry-after-ci-whitespace/frio-20.json
A	docs/quality/evidence/retry-after-ci-whitespace/txt-hashes.json
A	docs/quality/evidence/retry-after-ci-whitespace/validacion.json
A	docs/quality/evidence/runtime-privilege-gate/baseline-clone-census.log
A	docs/quality/evidence/runtime-privilege-gate/baseline-clone.log
A	docs/quality/evidence/runtime-privilege-gate/baseline-create.log
A	docs/quality/evidence/runtime-privilege-gate/baseline-migrate.log
A	docs/quality/evidence/runtime-privilege-gate/baseline-provision.log
A	docs/quality/evidence/runtime-privilege-gate/baseline-runtime-gate.log
A	docs/quality/evidence/runtime-privilege-gate/baseline-runtime-password.log
A	docs/quality/evidence/runtime-privilege-gate/baseline-source-census.log
A	docs/quality/evidence/runtime-privilege-gate/bootstrap.log
A	docs/quality/evidence/runtime-privilege-gate/candidate-clone-census.log
A	docs/quality/evidence/runtime-privilege-gate/candidate-clone.log
A	docs/quality/evidence/runtime-privilege-gate/candidate-migrate.log
A	docs/quality/evidence/runtime-privilege-gate/candidate-provision.log
A	docs/quality/evidence/runtime-privilege-gate/candidate-source-census.log
A	docs/quality/evidence/runtime-privilege-gate/deployment.json
A	docs/quality/evidence/runtime-privilege-gate/drop-candidate-clone.log
A	docs/quality/evidence/runtime-privilege-gate/drop-candidate-source.log
A	docs/quality/evidence/runtime-privilege-gate/experiment-census-after.log
A	docs/quality/evidence/runtime-privilege-gate/experiment-census-before.log
A	docs/quality/evidence/runtime-privilege-gate/experiment-create.log
A	docs/quality/evidence/runtime-privilege-gate/experiment-drop-clone.log
A	docs/quality/evidence/runtime-privilege-gate/experiment-ledger.log
A	docs/quality/evidence/runtime-privilege-gate/experiment-migrate.log
A	docs/quality/evidence/runtime-privilege-gate/experiment-provision.log
A	docs/quality/evidence/runtime-privilege-gate/experiment-runner-unchanged.log
A	docs/quality/evidence/runtime-privilege-gate/experiment-runtime-gate.log
A	docs/quality/evidence/runtime-privilege-gate/experiment-runtime-password.log
A	docs/quality/evidence/runtime-privilege-gate/initdb.log
A	docs/quality/evidence/runtime-privilege-gate/report.json
A	docs/quality/evidence/runtime-privilege-gate/runner.cjs.txt
A	docs/quality/evidence/runtime-privilege-gate/start.log
A	docs/quality/evidence/runtime-privilege-gate/version.log
A	docs/quality/evidence/runtime-privilege-gate/workflow-census.log
A	docs/quality/evidence/runtime-privilege-gate/workflow-exact.log
A	docs/quality/evidence/runtime-privilege-gate/workflow-reset.log
A	docs/quality/evidence/runtime-privilege-gate/workflow-runner-migrate.log
A	docs/quality/evidence/runtime-privilege-gate/workflow-runner-unchanged.log
M	ops/oci-api/README.md
A	ops/oci-api/api-staging-run.sh
A	ops/oci-api/kortek-api-staging.service
A	ops/oci-api/kortek-email-worker-staging.service
A	ops/oci-api/kortek-worker-staging-run.sh
M	pnpm-lock.yaml
M	pnpm-workspace.yaml
```

</details>
