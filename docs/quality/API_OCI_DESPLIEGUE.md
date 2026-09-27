# Despliegue API — Oracle Always Free

Fecha: 2026-09-27. **EN EJECUCIÓN / INCOMPLETO**. El propietario autorizó
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

## Implementación preparada

[Archivos operativos](../../ops/oci-api/README.md): API rootless con recursos
limitados, Caddy con TLS automático/persistencia y secretos systemd. Corrección
de despliegue: confianza Express solo en proxy loopback; pruebas HTTP cubren
desarrollo, IP reenviada con hop forjado y rechazo de peers privados/remotos.
Sin cambio de contrato funcional. DNS A creado `api.booking` → `150.136.7.19`,
DNS only; web ya resuelve por CNAME a Vercel.

Pendientes: finalizar validaciones, construir imagen Arm, instalar credenciales
protegidas, abrir únicamente TCP 80/443 en VCN/firewalld, iniciar API/Caddy y
comprobar HTTPS desde fuera. La política del navegador solicitó confirmación
en el momento de ampliar acceso de red; continúa el trabajo independiente.
