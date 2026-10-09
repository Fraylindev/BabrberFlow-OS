# Reserva invitada — C3 QA: preflight y parada

## Estado posterior — 2026-10-08

C3 **ACEPTADO POR DECLARACIÓN DEL PROPIETARIO, sin evidencia capturada**, con reserva invitada activa en QA en la pareja `b318ca5`. [Cierre documental, límites, residuos, rollback y pendientes](RESERVA_INVITADO_C3_CIERRE_QA.md). El preflight y sus estados inferiores se conservan íntegros como evidencia histórica del 2026-10-07; no describen el estado vigente ni acreditan las pruebas manuales declaradas después. No se repitió el preflight en el cierre.

2026-10-07. C3 autorizado para validación integrada en QA, sin publicación. **PREFLIGHT EJECUTADO; VALIDACIÓN FUNCIONAL INCOMPLETA / DETENIDA POR VERSIONES.** No aprobado ni cerrado. Se detienen pruebas de escritura al constatar que hace falta un despliegue, expresamente prohibido. Ningún cambio de aplicación implementado en C3.

## Evidencia actual

| Comprobación | Resultado real |
| --- | --- |
| `git branch --show-current` | exit 0; `ai/antigravity-qa` |
| `git rev-parse HEAD` | exit 0; `c4625ef23a3766c5be5172dde0aea4b1cb57d7ac` |
| `git status --porcelain=v1` | exit 0; C0/C1/C2 siguen como modificaciones y archivos sin seguimiento locales |
| `git diff --cached --name-only` | exit 0; índice vacío |
| Commit candidato | No existe commit que contenga C0/C1/C2; HEAD es documental anterior. El patch C2 sigue siendo un candidato local sin publicación |
| Vercel `get_alias(qa.booking.kortek.cloud)` y `get_deployment(dpl_HtCcxYumevH6xD7qVhaTcGkKU3XD, withGitRepoInfo=true)` | Éxito; alias QA, READY, rama `ai/antigravity-qa`, web `9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4` |
| SSH `systemctl show kortek-api-staging kortek-email-worker-staging --property=Id,ActiveState,SubState,MainPID,NRestarts` | exit 0; ambos active/running, API PID 1092730, worker PID 1084553, NRestarts 0 |
| SSH `XDG_RUNTIME_DIR=/run/user/1000 podman inspect --format '{{.Name}} {{.Image}} {{.Config.Image}} {{.State.StartedAt}}' kortek-api-staging kortek-email-worker-staging` | exit 0; API imagen `807bcb442a69e74198b224d1e60c9ae8d678043a6c7d070e90ace80935d8a261`; worker `7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1` |
| SSH `podman exec -i --workdir /srv/kortek/apps/api kortek-api-staging node` con script de lectura selectiva | exit 0; APP_RELEASE `bc1d559e42928ca0deb60319b33cf98b3cd69291`, DEPLOY_ENV staging; dist conserva `accountCreated`, `accountCreationError`, `tryCreateCustomerAccount` y `CustomerModule` |
| GET `https://api.staging.booking.kortek.cloud/customer/businesses`, anónimo | HTTP 401; contradice el 404 requerido para retirada B2C |
| GET `https://qa.booking.kortek.cloud/`, sin seguir redirects | HTTP 200; prueba disponibilidad de raíz, no aceptación del flujo ni sesión |

SSH utilizó exclusivamente la clave/known-hosts existentes de QA, StrictHostKeyChecking=yes, BatchMode=yes y ConnectTimeout=15. No se imprimieron secretos ni entorno completo, logs o filas de base. La lectura del dist se limitó a presencia de cuatro símbolos; ninguna conexión DB. GET neutros, sin bearer, POST ni PII. Los resultados se conservan en [evidencia sanitizada](../quality/evidence/reserva-invitado-c3/preflight.json) y [estado Git inicial](../quality/evidence/reserva-invitado-c3/git-preflight.json).

## Consumidores y compatibilidad

Web QA es consumidor externo conocido respecto del API: deployment/commit exactos revalidados ahora. [Lectura de fuentes del commit desplegado](../quality/evidence/reserva-invitado-c3/known-web-consumer.json) conserva matches y hashes por archivo. [Búsqueda actual apps/ops](../quality/evidence/reserva-invitado-c3/consumer-search.txt) sin consumidores productivos locales del contrato retirado; sólo comprobaciones negativas de pruebas/helpers cuando corresponda. No hay inventario que acredite ausencia de clientes externos desconocidos; no se declara ausencia global por una búsqueda de repositorio.

La pareja desplegada no corresponde al contrato candidato C1/C2: API aún tiene rutas/capacidades B2C y los campos de respuesta anteriores, mientras el candidato exige su retirada. La web publicada tampoco contiene los cambios locales C2. No se certifica compatibilidad integrada del candidato, ni se atribuyen las 871/288 pruebas locales a QA. Aunque una lectura de `booking` pueda tolerar campos adicionales, eso no cumple retirada de cuenta/portal ni autoriza una publicación descoordinada.

## Matriz pendiente y escrituras

No se creó fixture ni reserva: **IDs sintéticos: ninguno**. No se emitió POST, no se verificó 201/{booking}/PENDING en QA, creación/reutilización de Client ni ausencia de User/Membership nuevos. Se acredita que esta sesión no ejecutó escrituras de negocio; no se certifica que otros actores de QA no hayan escrito, al no censar la base. No se leyeron datos privados.

Pendientes por versión: reserva invitada y estado, Client, ausencia de escritura B2C, rutas retiradas 404 completas, ausencia de registro/login/claim/Mis reservas, desktop/móvil y screenshots, panel interno, aislamiento entre negocios, sesiones/permisos, confirmaciones/recibos/notificaciones. No se sustituyen por mocks, pruebas locales antiguas ni smoke del despliegue anterior. No se continuó a navegador funcional tras el criterio de parada.

## Propuesta separada, sin ejecutar

1. Revisar y autorizar separadamente un commit candidato de C0/C1/C2, con inventario/diff y validaciones ya entregados. No mezclar P4b ni su auditoría.
2. Autorizar separadamente cómo entregar API/web candidatos a QA; esta autorización no permite commit/push/PR/despliegue. Plan coordinado con versiones exactas, control de consumidores conocidos/externos, configuración y rollback antes/después. Sin migraciones nuevas: conservar schema, ledger, compatibilidad y datos.
3. Definir autorización y limpieza de fixtures QA: reserva necesariamente persiste Client/Booking y puede activar AuditLog/outbox. La autorización actual pide datos sintéticos pero prohíbe datos persistentes; no asumir que permite borrado financiero, cambios de base, proveedores/notificaciones reales o crear identidades Clerk. Acordar el mecanismo con el propietario antes de POST.
4. Con candidato ya activo y fixtures autorizadas, repetir preflight, validar todos los criterios C3 con versiones/IDs sanitizados/evidencia real y comparar estado final. Detenerse ante cualquier cambio necesario, sin implementarlo dentro del ensayo.

Riesgos: validar el API anterior podría activar capacidades B2C y generar persistencia/notificaciones no aprobadas; publicar sólo una app podría dejar una pareja incompatible. No se realizaron esas acciones. Rollback de esta ejecución: ninguno necesario en QA, porque no se cambió release, servicio, schema, datos, Clerk, flags ni variables. La documentación/evidencia es únicamente local. Producción no consultada ni utilizada. C3 continúa incompleto y requiere un cambio de estado/autorización externa para completar su validación.
