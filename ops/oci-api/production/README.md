# Adaptaciones productivas P10c-B1

**IMPLEMENTADO / VALIDADO CON FIXTURES / EN REVISIÓN. SIN INSTALACIÓN.**
Estas plantillas nuevas no reemplazan las de QA ni `ops/oci-free-backup`.
La instalación y activación requieren la orden P10c-B2 del propietario.

## Contrato y destinos de instalación

| Archivo de esta carpeta | Destino futuro | Modo / propietario |
| --- | --- | --- |
| `api-run.sh` | `/usr/local/libexec/kortek-api-run.sh` | 0755 / root:root |
| `worker-run.sh` | `/usr/local/libexec/kortek-worker-run.sh` | 0755 / root:root |
| `kortek-email-worker.service` | `/etc/systemd/system/kortek-email-worker.service` | 0644 / root:root |
| `test-production-wrappers.py`, este README | Solo repositorio/equipo de prueba | No instalar |

La unidad API instalada se conserva: contiene el selector P7 del API P5.
El wrapper API es la captura P10c-A `7bfe37be…` más exactamente cinco líneas
`-e NOMBRE` de correo; no procede de sustituirlo por la plantilla histórica.
La credencial API sigue siendo `/etc/kortek-api/runtime-env` root:root/0600.
El worker recibe esa credencial como `runtime-env` y conserva
`/etc/kortek-worker/database-url` root:root/0600 como `database-url`.
Su DATABASE_URL se carga de la segunda después de source, preservando el pool
del worker. No crear otro runtime-env ni sustituir su URL por la del API.

La unidad fija `KORTEK_WORKER_IMAGE_OVERRIDE` al ID inmutable
`sha256:bf343354991622b55de47655d749a558c19397ff940badc0831f15774a3da23f`
y `KORTEK_WORKER_RELEASE_OVERRIDE` a
`8e1501e89a132e1b01d3633b1b3f896a8cbe5800`. El wrapper captura ambos antes
de source, exige el par exacto y lo aplica después. No usa KORTEK_API_IMAGE
del archivo compartido. La imagen declara CMD del worker; no hace falta
sobrescribirlo ni ejecutar otra imagen.

El worker exige NODE_ENV y DEPLOY_ENV production, origen web
`https://booking.kortek.cloud`, origen API `https://api.booking.kortek.cloud`
y credencial DB propia no vacía. Rechaza QA y configuración incompleta antes
de Podman con un código fijo, sin imprimir valores. Acepta flags false y true.
Reenvía NODE_ENV, DEPLOY_ENV, APP_RELEASE, DATABASE_URL, los dos flags y las
cinco variables mediante `-e NOMBRE`; no construye argumentos con secretos.
Preserva argumentos de red, filesystem, CA y supervisión del worker histórico.

## Pruebas reproducibles, sin servicios reales

Desde la raíz del repositorio, con Python 3 y Bash (Git Bash en Windows):

```bash
python ops/oci-api/production/test-production-wrappers.py
# Opcionales: --bash /ruta/a/bash --output /ruta/a/resultados.json
bash -n ops/oci-api/production/api-run.sh
bash -n ops/oci-api/production/worker-run.sh
```

El script usa entorno limpio, directorio temporal, credenciales sintéticas
y un podman falso en PATH. Captura argv y entorno efectivo solo en ese temporal,
los inspecciona y los elimina. No invoca Podman real, CLI worker, DB ni correo.
El JSON opcional contiene únicamente resultados e identificadores/hashes públicos.
Compara bytes completos del API menos las cinco líneas con la evidencia P10c-A
y verifica el hash de la captura. Prueba P7 (fallback, par aprobado y rechazos),
flags false/true, source con selectores contradictorios, los siete nombres sin
valores en argv, credencial DB propia, guardas QA y ausencia de fugas de valores.

La validación de la unidad es un comando separado: en Linux con systemd y los
ejecutables de ExecStart/ExecStop presentes, ejecutar
`systemd-analyze verify --man=no ops/oci-api/production/kortek-email-worker.service`.
No sustituye pruebas de wrappers ni inicia la unidad. Si el equipo carece de
systemd, la excepción B1 permite verificar únicamente una copia exacta de esa
unidad en un temporal 0700 de la VM, sin instalar y limpiándolo. En B1 se usó
esa excepción: [resultado y limpieza](../../../docs/quality/evidence/prod-p10cb1/unit-verification.json).
No ejecutar este fallback remoto sin autorización específica en futuras órdenes.

## Instalación propuesta para B2: dos fases

Este procedimiento es un plan; B1 no ejecuta ninguno de los siguientes pasos.

1. Revalidar rama/SHA autorizados, hashes instalados/capturados, cuatro servicios,
   imagen nueva/label/release, credenciales protegidas y aislamiento QA. Parar
   por deriva. Respaldar wrappers/unidad worker y runtime-env con hashes en
   custodia root protegida; conservar unidad API y database-url intactas.
2. Extraer candidatos desde blobs/git archive del commit aprobado para conservar
   LF (las reglas EOL históricas no cubren esta subcarpeta). Validar Bash/unidad
   y hashes de candidatos exactos; preparar las
   copias de los tres archivos de la tabla. Las cinco variables de correo deben
   incorporarse mediante editor protegido por stdin, sin valores por argv/logs,
   preservando bytes ajenos. No aplicar aún correo true.
3. **Fase 1, ambos flags false:** mantenerlos explícitamente false y detener
   solo el worker productivo durante la sustitución. Instalar los tres archivos
   con los modos de la tabla; daemon-reload únicamente por la unidad worker.
   Reiniciar API una vez, verificar su par P7/P5 y arranque/conexión a base,
   PUBLIC_BOOKING_CLOSED preservado, correo false y nombres/hash efectivos.
   Solo tras pasar, iniciar/reiniciar worker una vez con imagen nueva/release
   exactos, verificar DB propia (comparación protegida/hash, nunca imprimir URL),
   heartbeat y arranque. Mantener false; observar servicios/recursos/códigos
   seguros y comparar QA. Un heartbeat SELECT 1 no acredita todos los permisos
   de outbox; B2 debe autorizar la comprobación read-only de cola/esquema/pausa.
4. **Fase 2, segunda pasada:** solo después de aprobar la fase 1, validar cinco
   valores/configuración de correo, consentimiento, pausa EMAIL y declaración
   de dominio/webhook/buzón. Cambiar ambos flags a true con edición protegida;
   reiniciar API primero, verificarlo, luego worker y verificarlo. Observar
   al menos 15 minutos. Prueba real de reserva/envío/webhook/recepción y lecturas
   de DB/proveedor necesitan autorización expresa B2; no inferirla de este plan.
   Sin prueba real, reportar arranque/configuración, no entrega de correo.
5. QA, Caddy, timers, plantillas antiguas, proveedores y schema/migraciones
   quedan fuera de instalación. No mover main/QA ni reconstruir/activar API
   distinto de P5. No modificar database-url ni CA. Las paradas del worker
   pueden disparar monitor existente: prever ventana acotada en B2.

## Rollback propuesto

Si falla cualquiera de las fases, detener primero el worker. Restaurar
runtime-env del respaldo inicial (flags false) y wrapper API instalado original,
conservar unidad API P7, reiniciar API y verificar reserva pública/P5/base.
Restaurar unidad y wrapper worker originales, daemon-reload, iniciar worker
histórico c1 con correo false y comprobar heartbeat. Conservar database-url,
CA e imágenes anterior/nueva; no restaurar ni modificar la base.
En la fase 2 se puede volver a false conservando las adaptaciones nuevas si
esa variante está expresamente autorizada, repitiendo API primero/worker después.
Los correos ya enviados no se deshacen: conciliar estados y evitar POST/reenvíos
duplicados ante resultados inciertos. Registrar qué fase falló y evidencia.

[Informe B1, hashes y límites](../../../docs/quality/WORKER_PRODUCCION_P10C_B1.md).
