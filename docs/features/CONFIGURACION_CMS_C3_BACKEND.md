# Configuración/CMS C3 — contrato público backend

Entrega: 2026-09-13. Estado: **IMPLEMENTADO / EN REVISIÓN**, pendiente de aprobación explícita del backend antes de iniciar el frontend de C3. Base: `e7425e7`, rama `ai/antigravity-qa`. C1 y C2 permanecen cerrados/aprobados; D1–D6 no cambian.

## Resultado y alcance

El visitante de `/{slug}` necesita que la misma lectura que entrega el catálogo exponga los cinco campos del snapshot editorial publicado. C3 amplía de forma aditiva `GET /public/:slug/booking-data`; no crea otra ruta pública ni otra fuente de estado.

`organization` devuelve exactamente:

```json
{
  "name": "Nombre público",
  "slug": "localizador-publico",
  "phone": "+18095551234",
  "description": "Descripción publicada",
  "address": "Dirección publicada",
  "googleMapsUrl": "https://www.google.com/maps/place/Test"
}
```

`name`, `phone`, `description`, `address` y `googleMapsUrl` proceden únicamente de `CmsPage.publishedSnapshot`. `slug` continúa como localizador público de solo lectura. Los opcionales son `string | null`. El endpoint no devuelve `organizationId`, UUID de tenant, `Organization.name`, correo, contenido de borrador, flags, horario, zona, timestamps, datos bancarios ni campos legacy de Organization. Servicios y profesionales conservan sus proyecciones C1.

No cambian Prisma, migraciones, endpoints de escritura, roles, auditoría, reservas, claims B2C, Facturación ni perfil propio BARBER. Medios, promociones, banca, notificaciones, Pagos, perfiles ampliados y H5 permanecen fuera.

## Seguridad, retiro y compatibilidad

La resolución pública C1 sigue siendo autoritativa en las tres rutas existentes: `booking-data`, `availability` y `bookings`. Tenant inexistente, inactivo, borrado, sin publicar o retirado obtiene el mismo `404` neutro. La creación vuelve a validar bajo el bloqueo de Organization compartido con retirar; no crea Client ni Booking después del retiro. Operación interna, reservas existentes, reprogramación autenticada y claims B2C no dependen del estado editorial.

Amenazas comprobadas: fuga de borrador o campos operativos, exposición del UUID H1, lectura de tenant inactivo/retirado y divergencia entre perfil y encabezado de reserva. La mitigación es una allowlist construida desde `projectContent(publishedSnapshot)`, slug como único localizador de Organization, `Cache-Control: no-store` y la política C1 común a todas las rutas públicas. La URL de mapa ya fue normalizada y validada al guardar/publicar; C3 no la consulta, expande ni embebe.

El cambio de respuesta es aditivo. Los snapshots de compatibilidad de tenants existentes contienen únicamente nombre/teléfono; los tres campos nuevos aparecen como `null`, sin copiar columnas legacy. Altas posteriores siguen sin publicar. Clientes C1 pueden ignorar las claves añadidas. Revertir este lector elimina solo las claves añadidas y no altera snapshot, borrador, estado editorial ni reservas.

## Activación controlada y gate

Este checkpoint no cambia todavía la interfaz pública ni despliega a producción. El futuro frontend de C3 sí modificará visiblemente `/{slug}` para tenants existentes publicados: añadirá estructura de mini-sitio y mostrará descripción, dirección y enlace de mapa cuando estén publicados. Conforme a la instrucción del propietario, ese cambio visible no se aplica hasta recibir, después de revisar este contrato backend, aprobación explícita del backend y confirmación de la activación.

Tras esa aprobación, el frontend deberá reconsultar `booking-data` al recuperar foco y antes de avanzar desde el perfil hacia la reserva, presentar un `404` neutro tras retiro/inactividad, mantener catálogo y asistente actuales, y consumir la allowlist sin propagar campos innecesarios. H5 queda reportado y no se corrige en C3.

## Evidencia

- `pnpm --filter api exec tsc --noEmit`: exit 0.
- `pnpm --filter api lint`: exit 0.
- `pnpm --filter api build`: exit 0.
- `pnpm --filter api test -- --runInBand`: 512 pruebas pasadas y 11 omisiones preexistentes, exit 0. La prueba focalizada incluye allowlist exacta y ausencia de UUID/campos operativos.
- `pnpm --filter api test:e2e -- --runInBand`: 181 pruebas pasadas en 15 suites, exit 0, sobre PostgreSQL 16 aislado creado desde las 21 migraciones y eliminado al terminar. Las 36 pruebas CMS comprueban snapshot A frente a borrador B, publicación exacta, privacidad, retiro/inactividad/deletedAt en las tres rutas, concurrencia y auditoría C1; el conjunto cubre bootstrap, Facturación, claims B2C y perfil propio BARBER.

La salida de error de AuditService durante la E2E es la inyección controlada que comprueba `SAVE_DRAFT` fail-open; el suite terminó satisfactoriamente. La primera invocación E2E sin variables de aislamiento terminó con exit 1 antes de conectar; se corrigió ejecutando sobre una base/rol temporales que el guard verificó como separados de `barberflow`/`barberflow_runtime`.
