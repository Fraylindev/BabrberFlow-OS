# Configuración/CMS C3 — mini-sitio público

Entrega: 2026-09-13. Estado: **CERRADO / APROBADO** por decisión explícita del propietario («Apruebo Frontend C3») el 2026-09-13 sobre `425641574b2504fd34967b9a4558218d74b7c11f`. El propietario había aprobado el backend C3 sobre `51a248833d5cf4aff77ca8b4f9a2be72ac9b8745` y confirmado expresamente la activación visible antes de iniciar este frontend. Rama `ai/antigravity-qa`. No hay despliegue productivo.

Nota posterior: H5 y la fecha malformada registrados en este cierre histórico fueron corregidos el 2026-09-13 en un checkpoint separado, sin reabrir C3. Ver [`RESERVA_PUBLICA_H5_FECHAS.md`](RESERVA_PUBLICA_H5_FECHAS.md).

## Resultado y criterios

La persona visitante abre `/{slug}` y recibe la identidad publicada del negocio antes de iniciar la reserva. La página consume exclusivamente `GET /public/:slug/booking-data`, cuya proyección C3 fue aprobada, y muestra:

- nombre público y descripción opcional;
- teléfono público como enlace `tel:`;
- dirección y enlace HTTPS de Google Maps cuando existen;
- CTA de reserva solo cuando hay servicios y profesionales públicos disponibles;
- el asistente de reserva existente, sin cambiar su contrato ni su secuencia.

No se transportan ni renderizan UUID de Organization, correo privado, nombre operativo, borrador, estado editorial, horario, zona, datos bancarios o contenido fuera del snapshot. Slug continúa como localizador público de solo lectura. OWNER/ADMIN conservan C2; BARBER/RECEPTIONIST no reciben acceso CMS nuevo.

Estados observables: skeleton durante carga; perfil publicado con opcionales omitidos limpiamente; perfil publicado sin catálogo reservable con explicación; error de red recuperable con reintento; y presentación neutra común para slug inexistente, tenant inactivo/borrado, sin publicar o retirado. Un `404` durante la confirmación reemplaza también todo contenido previo por la presentación neutra.

## Implementación y seguridad

`PublicMiniSite` compone el perfil y monta el asistente únicamente después del CTA. React Query vuelve a consultar la proyección al recuperar foco y el CTA ejecuta otra relectura autoritativa antes de abrir la reserva. Esto reduce la ventana visual de una retirada; la creación continúa protegida por el bloqueo y la política C1 del backend.

La página usa el cliente HTTP y las query keys existentes. Los enlaces opcionales proceden del snapshot ya validado por C1; Maps abre con `noopener noreferrer`. Los fallos no muestran mensajes Prisma ni detalles del API. El flujo mueve el foco al título de reserva, expone un `progressbar` con valor accesible, admite teclado y no genera desbordamiento horizontal en 375 px.

No cambian Prisma, endpoints, DTOs de escritura, roles, caché backend, catálogo, disponibilidad, claims B2C, Facturación ni perfil propio BARBER. La conversión local de `page.tsx`/`DateTimeStep` registrada como H5 se conserva expresamente sin corregir. Tampoco se añaden medios, promociones, banca, notificaciones ni ampliaciones de Pagos o WhatsApp.

Rollback frontend: restaurar el anterior consumidor de `/{slug}` y los tipos C1 elimina la presentación del mini-sitio sin tocar snapshot, publicación, reservas ni persistencia. El contrato backend C3 es aditivo y puede permanecer desplegado mientras consumidores anteriores ignoran sus claves nuevas.

## Pruebas automáticas

| Comando | Resultado |
| --- | --- |
| `pnpm --filter web test` | exit 0; 74 pruebas de lógica y 22 de componente |
| `pnpm --filter web lint` | exit 0 |
| `pnpm --filter web type-check:clean` | exit 0 |
| `pnpm --filter web build` | exit 0; `/{slug}` dinámica |

Las siete regresiones nuevas cubren perfil/enlaces publicados, allowlist visible, relectura al recuperar foco y antes del CTA, retirada durante esa relectura, fallo 503 recuperable, catálogo no reservable y campos opcionales vacíos. Una primera ejecución focalizada detectó que el foco se intentaba mover antes de montar el asistente; se corrigió con un efecto posterior al montaje y el conjunto final pasó completo.

Se conserva además la evidencia backend aprobada: 512 unitarias y 181 E2E PostgreSQL aisladas. Esas E2E cubren allowlist exacta, catálogo, disponibilidad, creación/reprogramación, retirada/inactividad/deletedAt, bootstrap, Facturación, claims B2C y correctivo BARBER A1 + teléfono privado.

## QA real — 2026-09-13

Entorno: build local de producción Next en `http://localhost:3001`, API en `http://localhost:3000`, PostgreSQL habitual declarado de prueba y Clerk Development. Tenant controlado `c2-qa-norte-20260913`; sesión OWNER. El tenant estaba publicado al comenzar esta verificación y fue restaurado a publicado al terminar.

| Escenario | Resultado observado |
| --- | --- |
| Perfil público | Nombre, descripción, teléfono, dirección y Maps proceden de la publicación. CTA visible; sin UUID de tenant, correo, datos bancarios ni borrador. |
| Reserva completa | Servicio y profesional reales del fixture, disponibilidad del 2026-09-14, datos sintéticos, resumen y confirmación exitosa. La reserva quedó visible en Agenda interna como pendiente. |
| Retiro | OWNER retiró con confirmación. `booking-data`, `availability` y `bookings` respondieron `404`; `/{slug}` mostró solo “Esta página no está disponible”. |
| Conservación interna | La reserva confirmada antes del retiro permaneció visible en Agenda con cliente, servicio, profesional y horario. |
| Republicación | OWNER revisó el preview y republicó la misma revisión; el perfil público volvió a estar disponible. |
| Móvil y teclado | 375×812, `innerWidth` 375 y `scrollWidth` = `clientWidth` 360: sin overflow horizontal. Tab enfocó “Reservar cita”; Enter abrió el asistente y el foco pasó a su título. |
| Consola | Cero errores de aplicación durante la inspección móvil final. |

El selector de fecha nativo del navegador de automatización necesitó entrada por segmentos; una pestaña del instrumento se recuperó abriendo otra sin afectar API, web ni datos. No se atribuye ese fallo al producto. El tenant de QA queda publicado y contiene la reserva sintética usada para comprobar la conservación exigida por D3.

Hallazgo fuera de D6, reportado antes de la aprobación y no corregido en C3: una manipulación malformada de fecha durante la automatización provocó que el API registrara `RangeError: Invalid time value` en `professional-availability.util.ts`. El recorrido con fecha válida y la reserva pública completaron correctamente. Su endurecimiento requiere alcance propio; H5 continúa igualmente sin cambios.

## Gate

El propietario aprobó explícitamente este checkpoint frontend sobre `425641574b2504fd34967b9a4558218d74b7c11f`. Configuración/CMS C3 queda **CERRADO / APROBADO**. La aprobación no equivale a despliegue productivo y no autoriza medios, promociones, banca, notificaciones, Pagos, H5 ni otra entrega posterior.
