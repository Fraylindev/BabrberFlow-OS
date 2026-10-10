# P10c-B1 — Adaptaciones productivas nuevas y pruebas sin instalar

Fecha local: 2026-10-09, Santo Domingo. **IMPLEMENTADO / VALIDADO LOCALMENTE CON FIXTURES / EN REVISIÓN. B2 NO EJECUTADO.** Base exacta y rama: ai/reserva-invitado-ci en `3368787e12ad4e8c0008b9feca13b5fb882c5825`; referencia de aplicación `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`. [P10c-A y captura instalada](WORKER_PRODUCCION_P10C_A.md) es la fuente del wrapper API P7; no hubo relectura operativa de servicios/env ni uso de credenciales reales. La única excepción en VM fue verificar la unidad en temporal 0700 y eliminarlo, autorizada en el punto 2 de B1.

## Archivos nuevos y contrato

Todos los archivos operativos nuevos están en `ops/oci-api/production/`. **Ninguna plantilla existente de API/QA/ops/oci-free-backup fue modificada.** [README con destinos, pruebas, instalación y rollback](../../ops/oci-api/production/README.md).

| Archivo | SHA256 de bytes LF |
| --- | --- |
| `ops/oci-api/production/api-run.sh` | `0a28312626216cdee50901541e374cca07b8da2e505d40a4b6954dae1cae5944` |
| `ops/oci-api/production/kortek-email-worker.service` | `e23c8c2a01ddf75373bf8427ee6fb172863f87daf05dce9d268911c5072993a0` |
| `ops/oci-api/production/README.md` | `f35853099a38a861ae402d3b121ac02d6241a5bc24ccdac6bf1da8126441b9ae` |
| `ops/oci-api/production/test-production-wrappers.py` | `195f7fd76f6175fda139a6d1ac4938d6f9a81ef83185095f80d8b962ab836792` |
| `ops/oci-api/production/worker-run.sh` | `280ff5a101abee4bdd692735a3a97fecb041b8a6a0972ac02f04808431d91c84` |

- `api-run.sh`: captura instalada hash `7bfe37be39267b8015a288ac9b5cc83724590ca30ef3f01ce0317b01cc442f6f` más **cinco líneas -e NOMBRE**, una por NOTIFICATIONS_EMAIL_FROM, NOTIFICATIONS_EMAIL_REPLY_TO, NOTIFICATIONS_ABUSE_SECRET, RESEND_API_KEY y RESEND_WEBHOOK_SECRET. Selector P7, fallback, flags, CA, límites y argumentos previos íntegros.
- `kortek-email-worker.service`: conserva database-url; añade LoadCredential runtime-env:/etc/kortek-api/runtime-env y fija KORTEK_WORKER_IMAGE_OVERRIDE=`sha256:bf343354991622b55de47655d749a558c19397ff940badc0831f15774a3da23f`, KORTEK_WORKER_RELEASE_OVERRIDE=`8e1501e89a132e1b01d3633b1b3f896a8cbe5800`. Supervisión/usuario/ExecStart/Stop y timeouts conservados; descripción productiva ya no afirma canal deshabilitado permanentemente.
- `worker-run.sh`: captura overrides antes del source, exige el par exacto y lo aplica después. DATABASE_URL sobrescrita desde database-url propia, no runtime-env; reenvía NODE_ENV/DEPLOY_ENV/APP_RELEASE/DATABASE_URL, dos flags y cinco nombres mediante -e NOMBRE. Sin secretos en argv. Exige entorno production, ambos orígenes productivos exactos y DB propia no vacía; rechaza QA con códigos fijos, sin valores. No exige true: permite arranque false de fase 1. Mantiene red/CA/filesystem/argumentos del worker C1; toma CMD worker declarado por la imagen nueva.
- `test-production-wrappers.py`: prueba real de wrappers con entorno limpio, credenciales **sintéticas**, Podman falso y limpieza; no ejecuta imágenes ni conecta DB/proveedor. README y script no se instalan.

No se añade plantilla API systemd: la instalada P7 sigue siendo válida. No se crea runtime-env del worker ni se cambia database-url. La subcarpeta no hereda las reglas EOL históricas; B2 debe extraer bytes de git archive/blobs y comprobar hash/LF, no instalar un checkout convertido a CRLF. B1 preserva el archivo .gitattributes existente.

## Pruebas y evidencia

Comando reproducible (Python 3; en Windows el script selecciona Git Bash):

```bash
python ops/oci-api/production/test-production-wrappers.py --output .tmp/p10cb1/tests.json
```

**38 casos, todos pasan, exit 0.** [Resultados por caso](evidence/prod-p10cb1/tests.json). bash -n de ambos wrappers exit0 dentro del script. Cobertura comprobada:

- API sin las cinco líneas = bytes completos de captura instalada y hash 7bfe37be exactos; [diff de solo cinco líneas](evidence/prod-p10cb1/api-baseline.patch).
- Flags false y true para ambos wrappers; API prueba también fallback sin override. Los siete nombres aparecen una vez como pares -e/NOMBRE; ningún valor de correo, booleano ni URL DB sintética aparece en argv. Valores efectivos se comprueban en el entorno del Podman falso, únicamente en el temporal.
- API P7 prevalece sobre KORTEK_API_IMAGE/APP_RELEASE antiguos; todos sus argumentos previos se comparan contra ejecución de la captura original. Source con nombres de override contradictorios no altera el par capturado, tanto API como worker.
- Worker usa imagen/release nuevos y DATABASE_URL de database-url propia aunque runtime-env contenga una DB diferente. NODE_ENV/DEPLOY_ENV/APP_RELEASE/DATABASE_URL son nombres reenviados.
- Siete selecciones inválidas API y ocho worker: incompletas, vacías, imagen/release distintos, espacios y salto de línea, además de ausencia total para worker. Rechazan antes del Podman falso con código 64 y diagnóstico fijo.
- Ocho guardas QA/entorno inválido (staging, development, DEPLOY_ENV vacío, NODE_ENV incorrecto, cada origen QA y cada origen vacío), DB propia vacía/ausente y limpieza final. Credenciales sintéticas permanecen byte a byte durante cada caso; no se lee ningún dotenv/secreto real.

Primer intento Git Bash no escalado falló en lanzamiento Windows (3221225794). La ejecución con permisos locales llegó al test y detectó una aserción del **arnés** que prohibía la imagen pública de fallback como si fuera un valor de correo. Se corrigió para excluir de argv valores de correo/flags/DB/release, conservando y comprobando la imagen final exigida. No se cambió selector ni wrapper para hacer pasar la prueba. La ejecución completa final de 38 casos es la que cuenta; no se presenta ningún intento fallido como éxito.

### systemd-analyze verify, única excepción temporal

Docker local: daemon no disponible (exit1). WSL: única distribución docker-desktop, no contiene systemd-analyze (probe exit69). No se instaló herramienta ni dependencia. Por la excepción explícita B1, se transmitió solo la unidad pública por stdin SSH al lector/validador, ejecutado bajo opc:

```bash
systemd-analyze verify --man=no /tmp/kortek-p10cb1-verify-<aleatorio>/kortek-email-worker.service
```

**systemd 252, exit0, stdout/stderr vacíos, SSH exit0.** Temporal creado con tempfile.TemporaryDirectory, modo **0700**, una sola copia byte a byte de unidad hash `e23c8c2a01ddf75373bf8427ee6fb172863f87daf05dce9d268911c5072993a0`; eliminado por el context manager y ausencia comprobada después. [Resultado, disponibilidad local y limpieza](evidence/prod-p10cb1/unit-verification.json). No hubo instalación, sudo, systemctl, daemon-reload/reinicio, carga de secretos, inspección de servicios, ejecución de imagen ni lectura DB. El verificador comprueba sintaxis/directivas y disponibilidad de ejecutables; no arranca ni valida conexiones/LoadCredential efectivos. El wrapper candidato se valida por las pruebas sintéticas, no por el ejecutable histórico que encuentra verify en ExecStart.

## Plan B2, dos fases obligatorias

Destinos: wrapper API → /usr/local/libexec/kortek-api-run.sh root0755; wrapper worker → /usr/local/libexec/kortek-worker-run.sh root0755; unidad worker → /etc/systemd/system/kortek-email-worker.service root0644. No instalar README/tests ni sustituir unidad API P7. Guardar respaldos protegidos/hash de originales y runtime-env, conservar ambas imágenes, database-url/CA y comprobar preflight exacto. Valores reales solo mediante editor autorizado/stdin protegido, nunca argv/logs. B1 no instala ni copia secretos.

1. **Fase 1 — flags false.** Confirmar NOTIFICATIONS_EMAIL_ENABLED=false y NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED=false; mantenerlos false al preparar correo. Detener solo worker durante sustitución, instalar tres archivos exactos y daemon-reload por unidad worker. Reiniciar API primero; verificar par P7/P5, release, arranque/conexión de base, configuración y reserva pública preservada. Tras pasar, reiniciar/iniciar worker nuevo; verificar ID bf343354…, release8e1501e, entorno production, DB propia por hash, conexión/heartbeat y permisos/esquema/cola mediante lecturas autorizadas B2. Observar estabilidad con envío false y comparar QA. Un heartbeat SELECT1 no sustituye validación completa de outbox.
2. **Fase 2 — segunda pasada con flags true**, solo tras aceptar fase1. Revalidar cinco valores productivos/configuración y estado de pausa EMAIL; cambiar ambos flags a true en edición protegida. Reiniciar API primero y verificar; luego worker y verificar. Observación mínima15min y evidencia sin PII/secretos. Reserva/envío/webhook/recepción reales y consultas a proveedor/base requieren autorización explícita B2; no declararlas probadas por flags o heartbeat. No tocar QA/Caddy/timers, schema/migraciones, main ni selector API P7/P5.
3. **Rollback en cualquier fase:** detener worker, restaurar runtime-env previo (correo false) y wrapper API original, conservar unidad P7, reiniciar API/verificar P5/base/reserva. Restaurar unidad y wrapper worker históricos, daemon-reload, iniciar worker c1/correofalse y validar heartbeat. database-url/CA/base intactas; no borrar imágenes. Si se prefiere volver a false conservando nuevas plantillas en fase2, esa variante debe estar autorizada. Correos emitidos no se revierten: conciliar estado y no repetir POST incierto.

Los pasos operativos y su permiso pertenecen a B2. Esta entrega solo prueba adaptaciones/sintaxis; no prueba arranque real, acceso a base, configuración real de correo ni entrega. Sin aprobación implícita de B2 por commit/push.

## Integridad y Git

[Hashes](evidence/prod-p10cb1/file-hashes.json) y [preservación](evidence/prod-p10cb1/preservation.json): todos los archivos operativos existentes de ops/oci-api y ops/oci-free-backup equivalentes a los blobs de la base, sin diferencias Git; no se edita QA ni código/migraciones/dependencias. Playbook ajeno preservado/hash `3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090` y fuera del index. Documentación de control sincronizada con B1; historia A/P10c intacta. JSON/enlaces, LF/hashes, diff completo, diff --check y alcance/secreto-pattern scan revisados antes del único commit y push sin force.

Baseline remoto: main `8e1501e89a132e1b01d3633b1b3f896a8cbe5800`, QA `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`; locales main `01113ef0be7d8abcd74e3e7297f7989b359c76c0`, QA `36061fc3c978758642b5a79ed6cb0e5ff25c003f`. Solo push a ai/reserva-invitado-ci. SHA final/igualdad local-remoto/status y referencias protegidas se reportan después de publicar. No se hizo nueva comprobación del runtime QA/productivo; B1 no realizó acciones sobre él. La única escritura VM fue el temporal de verify, limpiado.
