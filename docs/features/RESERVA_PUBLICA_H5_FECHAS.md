# Reserva pública — correctivos H5 y validación de fechas

Entrega: 2026-09-13. Estado: **IMPLEMENTADO / EN REVISIÓN**. El propietario cerró Configuración/CMS C1–C3 y autorizó expresamente corregir H5 y endurecer las fechas antes de abrir otro módulo. Rama `ai/antigravity-qa`. Sin despliegue productivo.

## Resultado y alcance

La persona elige una fecha y una hora como valores locales del negocio. El servidor convierte ese horario con `Organization.timeZone` y devuelve el instante UTC autoritativo; el navegador lo reenvía sin reinterpretarlo según su propia zona. La fecha mínima del selector también procede del día calendario actual del negocio.

El correctivo conserva el asistente, la creación de reservas y la presentación local de la hora. No habilita edición de `timeZone`, no expone la zona ni el UUID de Organization y no cambia roles, CMS, Prisma, migraciones, datos, medios, promociones, banca, notificaciones o Pagos.

## Contrato aditivo

- `GET /public/:slug/booking-data` añade en la raíz `minimumBookingDate: string` con formato `YYYY-MM-DD`, calculada en la zona autoritativa del negocio. Conserva `Cache-Control: no-store`.
- Cada elemento de `GET /public/:slug/availability` añade `startTime: string`, un instante ISO UTC que corresponde exactamente a `date + time` en la zona del negocio. Conserva `time` para presentación y compatibilidad.
- `POST /public/:slug/bookings` no cambia. El frontend envía como `startTime` el valor recibido en el slot elegido.
- `date` en disponibilidad y `from`/`to` en Facturación requieren una fecha calendario ISO real `YYYY-MM-DD`; formatos parciales, años de otra longitud y fechas imposibles responden `400` antes de consultas de negocio.

Los campos son aditivos para consumidores anteriores. `booking-data` no devuelve `timeZone`, `organizationId`, correo, borrador ni datos privados. Los slots conservan el localizador público de Professional que ya necesita la reserva, sin introducir un UUID de tenant.

## Seguridad y rutas de entrada verificadas

El hallazgo de C3 no estaba limitado al instrumento de QA: cualquier cliente anónimo podía construir directamente `availability?date=...`. El regex anterior aceptaba fechas imposibles como `2026-02-30`, y la utilidad compartida podía lanzar `RangeError` al convertir valores extremos o inválidos.

La misma utilidad también participa en filtros de fecha de Facturación. Ese borde autenticado validaba forma, pero no calendario real, y el servicio hacía una normalización que podía lanzar antes de producir un error controlado. Ambos DTO ahora validan ISO estricto y la utilidad común falla de forma segura con `null`; sus consumidores convierten ese resultado en `400` natural. Analytics y Resumen generan internamente sus fechas, pero manejan igualmente el retorno seguro.

La validación de disponibilidad se ejecuta inmediatamente después de resolver el tenant público y antes de consultar servicio, profesionales, reservas o disponibilidad. Se mantienen los límites existentes de 30 consultas de disponibilidad por minuto e inexistente/inactivo/borrado/retirado como `404` neutro. Una zona almacenada inválida produce un `503` controlado sin exponer su valor al cliente.

## Compatibilidad y rollback

No hay cambio de persistencia ni dependencia. Clientes anteriores pueden ignorar los campos nuevos. Para revertir, se restaura el cálculo anterior del consumidor y se retiran los dos campos aditivos en una sola publicación coordinada; ninguna reserva existente ni dato editorial requiere migración o reparación.

## Pruebas automáticas

| Gate | Resultado |
| --- | --- |
| API unitarias | exit 0; 49 suites aprobadas, 2 omitidas; 526 pruebas aprobadas y 11 omitidas |
| API E2E PostgreSQL 16 aislado | exit 0; 15 suites y 182 pruebas aprobadas, 21 migraciones desde cero |
| API lint, TypeScript y build | exit 0 |
| Web lógica y componentes | exit 0; 74 pruebas de lógica y 23 de componente |
| Web lint, `type-check:clean` y build | exit 0; `/{slug}` dinámica |

Las regresiones cubren conversión independiente de la zona del navegador, cruce de fecha UTC/local, día bisiesto, año fuera de rango, hora/zona inválida, fechas imposibles y formatos como `14/mm/92026`. El servicio público prueba que `minimumBookingDate` usa el día del negocio y que cada slot porta el UTC exacto. Las E2E confirman `400` público y en Facturación, sin consultar datos después de una fecha inválida. El componente completo verifica que el POST reenvía exactamente `startTime` del slot.

## QA real

Entorno: build local de producción Next en `http://localhost:3001`, API compilada en `http://localhost:3000`, tenant publicado de QA `c2-qa-norte-20260913`.

| Escenario | Resultado observado |
| --- | --- |
| Contrato público | `minimumBookingDate=2026-09-13`; la respuesta no contiene `timeZone` ni `organizationId`. |
| Conversión H5 | Para `2026-10-14 09:00` en Santo Domingo, el slot devuelve `2026-10-14T13:00:00.000Z`. |
| Fechas hostiles | `2026-02-30`, `2026-13-01` y `14/mm/92026` responden `400`; el API no registra `RangeError`. |
| Recorrido UI | Servicio → profesional → fecha/hora → datos sintéticos → cuenta → resumen; fecha y hora se conservan. Se detuvo antes de “Confirmar reserva”, sin crear otro registro. |
| Móvil y accesibilidad | 375×812; `innerWidth=375`, ancho de documento/cuerpo 360, sin overflow. Progreso y controles conservan semántica accesible. |
| Consola | Cero errores de aplicación; solo aviso esperado de claves Clerk Development. |

## Gate

El checkpoint permanece **IMPLEMENTADO / EN REVISIÓN** hasta la aprobación explícita del propietario. Configuración/CMS C1–C3 continúa **CERRADO / APROBADO** y este correctivo no abre otro módulo ni autoriza despliegue productivo.
