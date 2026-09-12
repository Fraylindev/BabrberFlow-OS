# Configuración/CMS C1 — contrato y evidencia backend

Fecha: 2026-09-12. Estado: **IMPLEMENTADO / EN REVISIÓN**. Base: `5cbe35a`, rama `ai/antigravity-qa`. El propietario fijó D1–D6 y autorizó ejecutar C1 completo y detenerse. C2/C3, medios, promociones, banca, notificaciones, Pagos y hallazgos fuera de D6 siguen sin autorización. No se modifica frontend ni los modelos Booking, Invoice, Payment o Professional.

Este contrato concreta las secciones 4–8, 10 y 11 del [brief C0](CONFIGURACION_CMS_C0_AUDITORIA.md). Sus propuestas D1–D6 quedan sustituidas por las decisiones expresas del propietario y este contrato; C0 conserva su evidencia histórica.

## 1. Producto, permisos y datos

OWNER y ADMIN preparan y revisan la identidad pública del negocio. Guardar no altera la publicación vigente ni el nombre operativo. Solo OWNER publica/retira. BARBER, RECEPTIONIST y CUSTOMER no reciben acceso CMS. Los endpoints no reciben tenant, actor, rol ni identificadores de página: el contexto procede de B2bAuthGuard y Membership local. Cada lectura revalida el rol; las mutaciones lo revalidan después del bloqueo PostgreSQL que comparten con cambios de rol/revocación de Equipo.

Los cinco campos editoriales son:

| Campo | Validación y normalización |
| --- | --- |
| `publicName` | String, trim, 2–100 caracteres; no vacío/null. Independiente de `Organization.name` |
| `description` | Texto plano, trim, máximo 2000; blanco/null elimina |
| `phone` | Contacto público del negocio; blanco/null elimina; admite separadores de presentación y conserva solo 7–15 dígitos y `+` inicial opcional; letras, extensiones y signos en posiciones distintas se rechazan |
| `address` | Texto plano, trim, máximo 300; blanco/null elimina |
| `googleMapsUrl` | Trim, máximo 2048, HTTPS; blanco/null elimina. Sin credenciales, puerto no estándar, whitespace interno o backslash |

Hosts de mapa: `google.com` y `www.google.com` solo bajo `/maps` o `/maps/…`; `maps.google.com`; `maps.app.goo.gl` con un único segmento alfanumérico, guion o guion bajo. No se siguen redirects, expanden enlaces cortos, descargan URLs, insertan iframes ni realizan llamadas al proveedor. Hostnames con sufijos ajenos se rechazan. Los consumidores deben representar texto escapado, sin interpretar HTML ni Markdown; la API rechaza etiquetas y controles de texto (excepto tabulación y saltos de línea).

Slug, `businessHours`, `timeZone`, nombre operativo, correo, estado operativo, medios, redes, IDs y metadatos no son editables. `Organization.email` nunca se copia al agregado ni a público/preview. No se copia `Professional.phone`, ni se cambian perfiles o disponibilidad individual.

## 2. Persistencia y revisión

La [migración aditiva](../../apps/api/prisma/migrations/20260912120000_cms_editorial/migration.sql) añade:

- `CmsPage`, una fila por `organizationId` con FK restrictiva a Organization: `draft`, `version`, `draftRevision`, `publishedSnapshot`, `publishedRevision`, `isPublished`.
- `CmsOperation`, recibo con PK `(organizationId, actorUserId, key)` y FK a CmsPage: operación, SHA-256 de la solicitud normalizada, versión/estado resultantes. No guarda contenido, correo, teléfono, token ni cuerpo de solicitud.

`version` empieza en 0 y aumenta en cada cambio efectivo de borrador/publicación/retiro. `draftRevision` aumenta al guardar; `publishedRevision` identifica qué borrador se copió. Publicar la misma revisión ya visible o retirar una página ya retirada no cambia la versión ni duplica auditoría; aun así exige versión actual si la clave es nueva. El snapshot anterior se conserva al retirar. No existe endpoint para borrar páginas, recibos o auditoría. No se promete un historial completo de borradores: se conserva el borrador actual, último snapshot y recibos de operaciones.

PostgreSQL exige versiones no negativas, `publishedRevision <= draftRevision <= version`, pareja snapshot/revisión nula o presente y snapshot obligatorio al estar publicado. Las relaciones impiden un recibo sin página/tenant. La aplicación proyecta los cinco campos por allowlist y falla con 503 ante contenido estructuralmente corrupto.

## 3. API privada

Base: `/organizations/mine/cms`. B2bAuthGuard, RolesGuard y ThrottlerGuard; límite de 30 solicitudes/minuto/IP por handler (memoria local, sin garantía distribuida). Todas las respuestas CMS exitosas usan `Cache-Control: private, no-store`.

| Método/ruta | Roles | Respuesta 200 |
| --- | --- | --- |
| `GET /organizations/mine/cms` | OWNER, ADMIN | `{ version, isPublished, publishedRevision, draftRevision, draft, publishedSnapshot, readOnly: { slug, businessHours, timeZone } }` |
| `GET /organizations/mine/cms/preview` | OWNER, ADMIN | `{ version, draftRevision, content, slug }`; `X-Robots-Tag: noindex, nofollow` |
| `PATCH /organizations/mine/cms/draft` | OWNER, ADMIN | Recibo `{ version, isPublished, publishedRevision }` |
| `POST /organizations/mine/cms/publish` | OWNER | Mismo recibo |
| `POST /organizations/mine/cms/unpublish` | OWNER | Mismo recibo |

Preview representa exactamente la revisión guardada, sin token compartible, catálogo, WhatsApp, reservas ni integraciones. No se añade ruta pública de preview ni de mini-sitio. El horario de `readOnly` es el valor operativo almacenado, incluido null/JSON legacy; no es un horario semanal editorial ni certifica el fallback como horario real.

Toda mutación exige `expectedVersion` (entero entre 0 y 2147483646) e `idempotencyKey` (UUID v4). PATCH exige además al menos uno de los cinco campos; un PATCH que contiene solo los dos controles es inválido. Publicar/retirar solo aceptan los dos controles. ValidationPipe mantiene whitelist y rechazo de campos extra.

Ejemplo de guardado:

```json
{
  "expectedVersion": 0,
  "idempotencyKey": "98b119f0-fd6d-466a-8e27-9a0438c501c2",
  "publicName": "Nombre público",
  "description": null,
  "phone": "+18095550100"
}
```

Publicar valida el contenido completo, incluido nombre válido. No exige teléfono, dirección, descripción o mapa. No normaliza silenciosamente al publicar: los valores legacy que requieren normalización deben guardarse antes, para que preview y snapshot coincidan exactamente. Negocio inactivo o con `deletedAt` no puede publicar; esto no borra ni reutiliza sus flags como estado editorial.

## 4. Concurrencia, idempotencia, auditoría y errores

Cada mutación usa transacción READ COMMITTED y `SELECT Organization … FOR UPDATE` por tenant; después consulta Membership, recibo y versión. Se mantiene el mismo orden de bloqueo que Equipo. Dos acciones nuevas desde N tienen un único ganador y un 409, sin sobrescritura silenciosa. El UPDATE también exige `organizationId + version`. Espera de transacción máxima 5 s; transacción máxima 10 s.

Una clave repetida por el mismo tenant/actor con la misma operación, versión esperada y contenido normalizado devuelve el recibo original sin ejecutar otra mutación ni duplicar auditoría. Misma clave con otro cuerpo/operación produce 409. Otro actor/tenant tiene otro espacio de claves. Antes de un replay se revalida el permiso vigente. Un recibo histórico no describe necesariamente el estado actual: tras un timeout/replay, C2 debe volver a leer el editor. Repetir una publicación antigua después de retirar nunca reactiva la página.

Publicar/retirar registran `PUBLISH`/`UNPUBLISH`, entidad `CmsPage`, tenant/actor/ID mínimo, dentro de la misma transacción. Un fallo de INSERT AuditLog revierte página, revisión y recibo. Guardar usa `SAVE_DRAFT` después del commit y fail-open: ni fallo PostgreSQL del log ni excepción del adaptador deshace el guardado. No se registran los valores editoriales.

| Estado HTTP | Significado |
| --- | --- |
| 400 | Campo inválido/extra, PATCH vacío o borrador que necesita revisión antes de publicar |
| 401 | Sesión inválida/revocada o selector tenant sin Membership; ajeno e inexistente indistinguibles |
| 403 | Rol sin permiso CMS o sin permiso de publicación |
| 404 | Página/contexto no disponible; respuesta pública neutra compartida |
| 409 | Versión obsoleta, clave reutilizada para otra solicitud o negocio no publicable |
| 429 | Presupuesto de solicitudes excedido |
| 503 | Dependencia/editor indisponible, fallo transaccional de auditoría o invalidación; consultar estado y reintentar la misma solicitud |

Los errores del nuevo servicio no exponen nombres Prisma, constraints, SQL, stack traces ni contenido privado. Un fallo de lectura nunca se transforma en un falso estado vacío/onboarding.

## 5. Público existente, H1/H2 y caché

H1: `GET /public/:slug/booking-data` devuelve Organization exactamente `{ name, slug, phone }`, tomada del snapshot publicado. El UUID de tenant desaparece. El slug ya era el localizador autoritativo en `/public/:slug/bookings` y `/availability`; no se inventa un segundo token. IDs de Service/Professional/Booking siguen siendo localizadores necesarios y se resuelven dentro del tenant. La reprogramación interna sigue usando `/bookings/:id` con contexto autenticado. El tipo web histórico que declaraba `organization.id` no se consume en runtime; su alineación de tipos corresponde al consumidor posterior a aprobación backend.

H2: `/organizations/mine` y `/auth/clerk/me` usan una allowlist explícita para OWNER, ADMIN, BARBER y RECEPTIONIST: `{ id, name, slug, timeZone }`. CUSTOMER no obtiene proyección. No hay borrador, correo, teléfono, dirección, estado, timestamps ni relaciones. Bootstrap conserva su select `{ id, name, slug }`; Facturación conserva `timeZone`.

Las tres rutas públicas existentes exigen Organization activa, no borrada y CmsPage publicada con snapshot. Inexistente/inactiva/borrada/sin publicar/retirada reciben el mismo 404 neutro. La creación pública vuelve a consultar ese estado dentro de la transacción y después del mismo bloqueo Organization que usa retirar. Una reserva que se confirmó antes del retiro se conserva; una que esperaba el bloqueo del retiro no crea ni Client ni Booking. La operación interna, las reservas existentes y claims B2C conservan sus contratos.

Se retira CacheInterceptor de booking-data y se usa `Cache-Control: no-store` en las tres rutas. Publicar/retirar ejecutan explícitamente `cache.clear()` antes del commit, con presupuesto de 2 s; fallo/timeout revierte la operación. Todas las réplicas C1 consultan PostgreSQL en cada petición, por lo que ninguna depende de un clear local o TTL para revocar. Un clear tardío solo puede vaciar caché, no publicar datos. No hay ETag/304 editorial.

Una respuesta o contenido ya descargado en el navegador no se puede retirar físicamente. El frontend existente tiene React Query con staleTime y puede seguir mostrando texto previo; un nuevo POST se revalida y queda bloqueado. C2/C3 deben volver a consultar al recuperar foco o iniciar reserva y representar retiro/conflicto. No se afirma invalidación activa de memoria de navegadores ni QA visual C3.

C1 mantiene el asistente existente y su catálogo/slots; no expone los nuevos campos description/address/mapa en booking-data ni activa mini-sitio. H5 (conversión de hora) y el resto de hallazgos ajenos a D6 se reportan sin corregir. Slug, horario y zona siguen sin editor en C1/C2/C3.

## 6. Migración, despliegue y rollback

1. Inventario autorizado de solo lectura de la base habitual: **12 Organizations; 0 inactivas; 0 deletedAt; 12 teléfonos null; 0 contenido interno legacy; 12 horarios null; 0 otros formatos; 0 coincidencias con la lista de rutas reservadas inspeccionada**. Solo conteos, sin PII. No se aplicó C1 a esa base. No se infiere que los defaults sean horarios confirmados.
2. Conservar las 20 migraciones anteriores. La migración 21 bloquea altas concurrentes con `SHARE ROW EXCLUSIVE` sobre Organization, crea tablas y ejecuta el bloque `BEGIN COMPATIBILITY BACKFILL` antes de instalar el trigger. Copia exactamente name/phone; description/address/mapa nacen null. Inactivas/borradas conservan los flags y el guard impide acceso. No normaliza ni sobrescribe datos legacy inválidos.
3. `Organization_initialize_cms` crea el agregado sin publicar en toda alta posterior, incluso legacy/Clerk. Es SECURITY INVOKER: runtime necesita INSERT en CmsPage además de los grants de sus operaciones; no requiere DDL/ownership. Un fallo del trigger revierte el alta. Antes de desplegar, comprobar los grants DML del nuevo agregado y recibos con el migrador/rol runtime del entorno.
4. El backfill es `INSERT … ON CONFLICT DO NOTHING`: ejecutarlo nuevamente conserva borradores, revisiones, recibos, altas nuevas creadas por el trigger y retiradas. Solo usarlo en la secuencia de migración/ensayo documentada, nunca como reparación ciega de agregados borrados/corruptos. No hay db push, drop de tablas operativas ni data-loss flags.
5. Ensayo PostgreSQL 18.1 aislado, propietario no privilegiado: migraciones desde cero y desde las 20 previas con tres tenants sintéticos (activo, inactivo, deletedAt), valores legacy inválidos, una reserva completada, Invoice y Payment. Comparación exacta de Organization/User/Membership/Service/Professional/Client/Booking/Invoice/Payment antes/después; doble backfill sin reactivar retirada. `pg_dump -Fc` y `pg_restore --exit-on-error` a otra base `_test` conservaron datos y retirada.
6. Despliegue futuro: cerrar tráfico público en ingress mientras conviven binarios previos/C1; respaldar y verificar restauración aislada; aplicar con migrador; verificar status/diff, constraints y trigger; comprobar grants runtime; retirar todas las réplicas viejas y purgar caches HTTP/CDN existentes antes de reabrir. Nunca mezclar lectores legacy cacheados con estado editorial nuevo. No se añadió ni activó un CDN. Este checkpoint Git no ejecuta despliegue habitual/productivo.
7. Rollback sin pérdida: conservar CmsPage, CmsOperation, AuditLog y columnas legacy. C1 permite `PUBLIC_BOOKING_CLOSED=true` para cerrar solo las rutas públicas y mantener operación interna/editor. Si se vuelve a un binario anterior que ignora ese flag/CMS, el bloqueo debe mantenerse en ingress; no reabrir su fallback legacy. Recuperar un lector que respete las retiradas antes de reabrir. No borrar tablas ni restaurar un respaldo antiguo sobre escrituras posteriores. El ensayo de restore prueba preservación del estado respaldado, no recuperación automática de escrituras posteriores al backup.

## 7. Validación y límite de entrega

Pruebas nuevas: [DTO](../../apps/api/src/cms/cms.dto.spec.ts), [proyección](../../apps/api/src/cms/cms.projection.spec.ts), [servicio](../../apps/api/src/cms/cms.service.spec.ts), [E2E CMS](../../apps/api/test/cms.e2e-spec.ts) y [migración/backfill](../../apps/api/test/cms-migration.e2e-spec.ts). Guards/Membership y PostgreSQL son reales en E2E; se sustituye la dependencia externa Clerk por sesiones controladas. Las carreras observan la espera de bloqueo en PostgreSQL. Se fuerza también un fallo real de INSERT AuditLog mediante un trigger temporal de prueba, retirado en finally.

Las regresiones de Servicios y Profesionales crean un OWNER de fixture o usan el existente para publicar explícitamente antes de comprobar el catálogo. No se eleva BARBER ni se elimina la aserción de privacidad. El suite completo conserva pruebas de bootstrap, onboarding, claims, Equipo, Facturación y perfil propio.

Gates finales, todos con exit code **0**:

| Comando / prueba | Resultado |
| --- | --- |
| `pnpm --filter api exec tsc --noEmit` | Tipos API y tests válidos |
| `pnpm --filter api lint` | Sin errores |
| `pnpm --filter api test -- --runInBand` | 511 pasadas; 11 omitidas preexistentes; 49 suites pasadas |
| `pnpm --filter api build` | Build Nest válida |
| `pnpm --filter api test:e2e -- --runInBand` | 181 pasadas; 15 suites; PostgreSQL aislado |
| `pnpm --filter api exec prisma validate` / `generate` | Schema válido y cliente 6.19.3 generado |
| `pnpm --filter api exec prisma migrate deploy` / `status` | 21 migraciones desde cero; sin pendientes; ensayo incremental 20→21 válido |
| `pnpm --filter api exec prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code` | Sin diferencias |
| `node apps/api/dist/prisma/verify-integrity.cli.js` | Constraints/índices suplementarios válidos en la base migrada |
| Ensayo incremental, doble backfill, comparación de filas y `pg_dump` / `pg_restore` | Sin pérdida de datos; retirada preservada en otra base |

Entorno: PostgreSQL 18.1 temporal en loopback, bases separadas `_test`, propietario `cms_c1_runner` sin SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS; aislamiento verificado por el global-setup existente. Ningún fixture se ejecutó en la base habitual. Los errores impresos por pruebas de fallo son inyecciones controladas, no errores de gates satisfactorios.

Incidencias resueltas antes del resultado final: sandbox impidió initdb y resolución de enlaces/configuración pnpm; ejecución autorizada con acceso normal resolvió el entorno sin instalar/cambiar dependencias. Un rechazo automático temporal por límite de cuenta impidió el primer arranque; después se autorizó y verificó el proceso. Se corrigieron tipos/formatos del alcance y dos fixtures públicos antiguos que debían publicar explícitamente bajo D3.

Incidencia de inspección del restore, fuera de C1: el verificador textual existente devolvió exit 1 por `ProfessionalWeeklySchedule_minutes_check`; pg_dump/restore elimina un par de paréntesis redundantes de una conjunción. Las desigualdades y límites son idénticos por asociatividad de AND. La comprobación SQL independiente de todas las combinaciones de borde y rango (start −1…1441, end −1…1442) confirma cero diferencias; constraints validados e índices válidos. No se modificó ese modelo, constraint, verificador ni hallazgo fuera de D6. Esta incidencia no se cuenta como un pase del verificador textual sobre el restore.

Sin aprobación del backend ni autorización de C2/C3. **C1 completo para revisión; detenerse aquí.** El SHA local/remoto y la limpieza final se reportan en la entrega Git; commit/push no equivalen a despliegue o aprobación.
