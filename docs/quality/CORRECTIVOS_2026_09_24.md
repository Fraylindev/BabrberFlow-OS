# Seguimiento autorizado de la auditoría integral — 2026-09-24

Estado: **IMPLEMENTADO / EN REVISIÓN DEL PROPIETARIO**. Medios/Promociones C3 quedó **CERRADO / APROBADO** por decisión expresa del propietario antes de este objetivo. Este seguimiento cubre únicamente el smoke Chrome, la provisión/verificación de roles PostgreSQL y H4. No activa producción ni inicia otro módulo.

## Alcance y criterios

- Visitante anónimo: el mini-sitio debe cargar también su proyección de medios controlada; el menú de la portada debe exponer realmente sus enlaces en 375 px y permitir foco de teclado. El smoke completo debe terminar exit `0` manteniendo las aserciones de consola, errores y permisos.
- Operador de base: sobre un esquema vacío migrado, el runtime no privilegiado debe tener solo los grants documentados; el migrador debe conservar ownership sin atributos globales elevados. La prueba no modifica la base de desarrollo.
- Reserva pública: un fallo secundario de creación de cuenta debe conservar la reserva y registrar una señal útil sin incluir mensajes, stack traces ni PII del error.

## Chrome y menú móvil

El [smoke inicial de la auditoría](AUDITORIA_INTEGRAL_2026_09_24.md) terminó exit `1` (18 aprobados, 1 omitido, 3 fallidos). `whatsapp-c2.spec.ts` abortaba una petición nueva a `/public/qa-whatsapp-a/media`, generando `net::ERR_FAILED`. El fixture ahora responde `200` con el contrato público vacío (`hero: null`, listas vacías). Se conserva la prueba separada de error `503` del catálogo y la aserción de consola sin ignorar errores de red.

La aserción original del menú no era solo un matcher mal calibrado. Bajo carga, Chrome mostró el botón `aria-expanded=true` y el enlace en el árbol accesible, pero el contenedor medía **375 × 0 px**, `grid-template-rows: 0px` y el enlace tenía `viewport ratio 0` durante más de cinco segundos. La animación de altura podía dejar el acceso visualmente recortado. Se sustituyó por apertura/cierre directo; la prueba exige contenedor y enlace visibles, enlace dentro del viewport y foco por teclado. Con cuatro workers, el caso móvil repetido diez veces junto al caso general terminó **20/20 exit `0`**. Una comprobación visual adicional en Chrome local a 375 × 812 midió el menú abierto en **375 × 213 px**, el enlace en **343 × 20 px**, sin overflow (`scrollWidth=375`), sin errores de página/consola y con `aria-expanded=true`; [captura revisada](evidence/correctivos-20260924/mobile-menu-open.png).

En el primer smoke completo posterior aparecieron dos límites de tiempo adicionales bajo seis workers. El trace de WhatsApp mostró que el primer popup abrió y se validó; el timeout global de 30 s interrumpió el segundo clic. Solo ese recorrido dispone ahora de 60 s, manteniendo las dos aperturas y todas sus aserciones. Una comprobación de overflow de la portada desktop agotó sus 5 s bajo carga; al capturar el fallo, `scrollWidth` ya era **1280** en un viewport de **1280**. Se amplió a 15 s esa espera, sin cambiar la condición ni ocultar elementos. El smoke completo final `pnpm --filter web test:browser` terminó **exit `0`: 21 aprobados, 1 omitido intencionalmente** (caso exclusivo de móvil en el proyecto desktop), 22 escenarios en total.

La build web, `type-check:clean` y lint terminaron cada uno con exit `0`. El smoke usa Next de producción y Chrome real en desktop y 375 px, con HTTP controlado para los fixtures públicos y navegación externa interceptada.

## SQL históricos y grants efectivos

La auditoría buscó `ops/` en la raíz por las referencias históricas, pero los dos archivos **ya estaban versionados** en [`apps/api/ops/`](../../apps/api/ops/README.md) desde el commit `22a27c4`. No se reconstruyeron por conjetura. Los originales se ejecutaron primero en PostgreSQL 18 aislado sobre las **25 migraciones aplicadas desde cero**: ambos terminaron exit `0` conectando el verificador por TCP como `kortek_runtime`. El cotejo mostró una diferencia con el contrato vigente de Medios: el provisionador histórico concedía DELETE a las cinco tablas nuevas y UPDATE a `MediaOperation` al correr después de las migraciones. También omitía el GRANT explícito de USAGE de tres enums si el runtime aún no existía cuando se aplicó la migración 25.

Se ajustó el provisionador original solo en esos grants y se amplió el verificador para fallar ante esa regresión. Luego se eliminó **solo la base y los dos roles del clúster temporal**, tras comprobar que `data_directory` era `apps/api/.tmp/role-smoke-20260924`; se creó de nuevo la base vacía, se aplicaron las 25 migraciones y se ejecutaron los SQL ajustados. Provisión y verificación conectada como runtime terminaron exit `0`. Prisma `migrate status` como `kortek_migrator` informó 25 migraciones al día y `migrate diff --exit-code` terminó `0`, sin diferencias.

Matriz observada como `kortek_runtime` en esa base aislada:

| Recurso | SELECT | INSERT | UPDATE | DELETE | TRUNCATE |
| --- | --- | --- | --- | --- | --- |
| `MediaAsset`, `MediaGalleryOrder`, `MediaPromotion`, `MediaPurgeJob` | sí | sí | sí | no | no |
| `MediaOperation` | sí | sí | no | no | no |
| `_prisma_migrations` | no | no | no | no | no |
| `Invoice` | sí | sí | sí | sí | no |

Los enums `MediaAssetPurpose`, `MediaAssetStatus` y `MediaModerationStatus` admiten USAGE. El runtime tiene CONNECT y USAGE de `public`, sin CREATE de base/esquema, TEMP, membership al migrador ni atributos `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION` o `BYPASSRLS`. La base y el esquema pertenecen al migrador. Intentos reales de `CREATE TABLE`, `CREATE TEMP TABLE`, SELECT del ledger y DELETE de `MediaOperation` terminaron exit `1` con permiso denegado; el wrapper de prueba comprobó esos rechazos y terminó exit `0`. No hay secuencias de aplicación en el esquema actual, por lo que sus grants futuros no se demostraron con una operación real.

**Límite vigente:** el script conserva grants DML históricos amplios fuera de Medios (`Invoice` admite DELETE), igual que la política predeterminada de futuras tablas. Es un gate de endurecimiento previo a producción, no una autorización para ejecutar esta provisión sobre desarrollo o producción sin respaldo, inventario de ACL y revisión del destino. La base habitual `barberflow` y sus grants C3 no se modificaron. El clúster QA escuchó solo en `127.0.0.1:55432` y fue detenido y eliminado después de verificar su ruta de datos.

## H4: log de creación de cuenta secundaria

`PublicBookingService` conserva `ACCOUNT_CREATION_FAILED` y la reserva válida cuando falla la creación secundaria de cuenta. Su log ahora contiene solo un texto fijo, sin `error.stack`, `String(error)` ni datos aportados por el visitante. Una prueba inyectó un error cuyo mensaje incluía `ana@example.com` y un detalle privado; verificó la respuesta y que el logger se llamó únicamente con el texto fijo. Pasaron las 14 pruebas del servicio y el conjunto API completo: **682 aprobadas, 11 omitidas, 55 suites aprobadas y 2 omitidas**, exit `0`; TypeScript y lint API también terminaron exit `0`.

No cambiaron DTO, endpoint, Prisma, dependencias ni contrato público. El código queda implementado para revisión; solo el propietario puede aprobar este correctivo como checkpoint final.
