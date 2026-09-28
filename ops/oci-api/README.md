# API productiva en Oracle Always Free

Alcance autorizado el 2026-09-27: API en `kortek-free-services`, con Supabase
Free productivo y HTTPS en `api.booking.kortek.cloud`. La URL de Vercel confirmada
por el propietario es `https://booking.kortek.cloud`; es el único origen CORS y
Clerk autorizado. EMAIL sigue pausado y la reserva pública conserva su cierre.

## Diseño operativo

- VM Ampere A1: 2 OCPU/12 GB. Cuota regional de prueba observada 16/96;
  el beneficio Always Free vigente limita A1 a 1500 OCPU-h/9000 GB-h por mes.
  En 31 días completos, 2/12 consume 1488/8928, dentro del tope.
- API Podman rootless bajo `opc`, misma supervisión systemd que el worker.
  Imagen identificada por revisión Git e ID inmutable. FS read-only, sin
  capacidades, 1,5 CPU, 2 GiB y 128 procesos; heap Node máximo 1536 MiB.
- `HOST=127.0.0.1`, `PORT=3000`, `NODE_ENV=production`,
  `DEPLOY_ENV=production`. Caddy es el único listener público, TCP 80/443.
  Su contenedor rootful tiene solo NET_BIND_SERVICE, 0,25 CPU y 256 MiB.
- Caddy usa Let's Encrypt y persistencia de certificados bajo
  `/var/lib/kortek-caddy`; admin API y logs de acceso desactivados.
  DNS A directo a `150.136.7.19`, sin proxy Cloudflare ni puertos Node abiertos.
- Nest confía solo en peers loopback para resolver `req.ip`. Caddy reemplaza
  `X-Forwarded-For` y elimina `Forwarded`; un header externo no elige su bucket.
- Secretos: `/etc/kortek-api/runtime-env`, root:root/0600, mediante
  `LoadCredential`. Nunca incorporar el contenido al build, Git, logs o comandos.
  La conexión usa `kortek_runtime` en el pooler de sesión productivo, TLS strict,
  CA Supabase y pool de cuatro conexiones; el worker conserva su pool de dos.

## Construcción y comprobación

Crear un contexto mínimo con los manifests raíz y los archivos API declarados
en `api.Containerfile`; excluir dotenv, secretos, dumps y node_modules. Construir
en el VM Arm con:

```bash
podman build --network host --cpu-period 100000 --cpu-quota 150000 \
  --memory 3g -f ops/oci-api/api.Containerfile -t localhost/kortek-api:<SHA> .
```

La instalación congelada pertenece al build reproducible de la imagen; no cambia
dependencias ni lockfile del repositorio.

Para límites rootless CPU/memoria, instalar `rootless-delegation.conf` en
`/etc/systemd/system/user@1000.service.d/kortek-delegation.conf`, ejecutar
daemon-reload y reiniciar `user@1000` en una ventana acotada con worker/monitor
detenidos y recuperados después. Comprobar `DelegateControllers` y los cgroups
reales. `.gitattributes` fija LF en archivos operativos; no instalar scripts CRLF.

Antes de iniciar: ejecutar en esa imagen `node ops/production-startup-drill.cjs`;
los 23 negativos deben rechazarse antes de Nest. Instalar la CA y wrapper en
`/home/opc/kortek-api/` y `/usr/local/libexec/`; instalar unidades en
`/etc/systemd/system/`. Validar Bash y `systemd-analyze verify` antes de habilitar.
Configurar `KORTEK_API_IMAGE` con ID inmutable en la credencial y
`KORTEK_CADDY_IMAGE` con ID inmutable oficial en `/etc/kortek-caddy/image.conf`.

Verificar servicios y consumo con `systemctl` y `podman stats`. Desde un equipo
externo, sin `--insecure` ni override DNS: HTTPS raíz debe entregar 404 JSON y
X-Request-Id UUID; ruta privada sin token 401; preflight productivo autoriza solo
el origen exacto. Localhost, wildcard y otro dominio deben carecer de ACAO.
Comprobar redirección HTTP a HTTPS, cadena/nombre/vigencia TLS y puertos 3000/2019
cerrados desde fuera. Root 404 acredita transporte; no reemplaza la comprobación
READ ONLY de DB ni un login funcional.

`external-smoke.py` automatiza ese smoke con Python estándar desde un equipo
externo. No usa túnel, proxy, credenciales, override DNS ni TLS inseguro.
La conexión API→pooler exige CA/hostname; `pg_stat_ssl` observa el salto interno
pooler→PostgreSQL y no demuestra ni refuta el TLS del cliente hacia el pooler.
El runtime no tiene SELECT sobre `_prisma_migrations`; no concederlo para un smoke.

## Rollback

Ante fallo inicial, detener/deshabilitar `kortek-caddy` y `kortek-api`, conservar
certificados y secretos protegidos, y dejar worker/timers activos. Retirar solo
las reglas TCP 80/443 y el registro A añadidos en esta entrega si se abandona la
publicación. No revertir Supabase ni sus migraciones. Tras un redeploy, conservar
el ID de imagen anterior; reinstalarlo en la credencial, reiniciar API y repetir
smoke externo. Cambios de datos posteriores exigen el protocolo de conciliación
de C1; no restaurar sobre producción como parte de un rollback de contenedor.

Estado/evidencia real: [despliegue API](../../docs/quality/API_OCI_DESPLIEGUE.md).

## API de staging en la misma VM

Staging usa el commit C1 `b0357af6`, imagen Podman inmutable y servicio
`kortek-api-staging` separado de `kortek-api`. El wrapper
[`api-staging-run.sh`](api-staging-run.sh) exige Cutover QA, Clerk de prueba,
`WEB_PUBLIC_ORIGIN=https://qa.booking.kortek.cloud`, CORS/authorized parties
exactos, correo desactivado y listener `127.0.0.1:3001`. La unidad
[`kortek-api-staging.service`](kortek-api-staging.service) recibe
`/etc/kortek-api-staging/runtime-env` root:root/0600 mediante LoadCredential.
No reutilizar el archivo de producción; no incluir secretos en el build.

Caddy atiende `api.staging.booking.kortek.cloud` hacia el puerto 3001 y
`api.booking.kortek.cloud` hacia 3000. Validar un Caddyfile candidato antes
de reemplazarlo y comprobar el smoke externo productivo antes y después de
reiniciar el proxy. Para staging, comprobar DNS/TLS público, 404 de raíz,
401 privada, ACAO exclusivo de `https://qa.booking.kortek.cloud`, DB QA y
puertos privados cerrados. `systemctl status kortek-api-staging` y
`podman inspect kortek-api-staging` acreditan servicio y límites; root 404 no
acredita un flujo autenticado. Ante fallo de staging, detener solo su unidad
y restaurar su wrapper/env protegidos; conservar API/Caddy productivos.

[Alcance, ejecución y pendientes de Preview](../../docs/quality/STAGING_QA_2026-09-28.md).
