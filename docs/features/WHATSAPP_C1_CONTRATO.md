# WhatsApp manual — C1: contrato backend

Fecha: 2026-09-14. Estado: **C1 CERRADO / APROBADO**. El propietario aprobó explícitamente este contrato sobre `c7d43ad03a65a900a930a1a0d69dd258b8516a1e` y autorizó C2 según D1–D6. La implementación y evidencia posterior se registran en [WHATSAPP_C2_FRONTEND.md](WHATSAPP_C2_FRONTEND.md). El cuerpo conserva la frontera y evidencia originales de C1; sus referencias a aprobación pendiente describen aquella entrega, no una restricción vigente.

## 1. Base y alcance

Usuario: visitante que acaba de registrar una reserva. Resultado: poder contactar voluntariamente al negocio publicado correcto, sin transmitir datos del cliente ni confundir registro, confirmación, apertura y envío.

Fuentes: [C0](WHATSAPP_C0_AUDITORIA.md), decisión explícita del propietario, [servicio público](../../apps/api/src/public-booking/public-booking.service.ts), [controlador](../../apps/api/src/public-booking/public-booking.controller.ts), [DTO público](../../apps/api/src/public-booking/dto/public-booking-response.dto.ts) y [schema](../../apps/api/prisma/schema.prisma). HEAD base `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`, rama `ai/antigravity-qa`; base funcional aprobada `8fd7b1ff9f14ad82bde3d3936817941660983b2c`.

El C0 §4 propone conservar endpoints, campos y respuestas. El backend existente ya aporta el teléfono público y el resultado de creación necesarios. **C1 aclara y prueba ese contrato, sin añadir `whatsappAction`, endpoint, DTO, helper productivo ni campo nuevo.** La validación y composición del enlace son responsabilidad de la acción cliente que se implementará en C2 tras aprobación. La nueva evidencia automatizada usa el controlador, ValidationPipe y servicio reales con dobles de persistencia.

No-alcance: personal → cliente, teléfonos privados, plantillas, editor, envío automático, proveedores, webhooks, trazabilidad de envío, cobros y otros módulos. No hay cambios productivos en CMS, reserva/fechas H5, Booking, frontend, Prisma, dependencias ni configuración. No se ejecutan migraciones, consultas sobre la base habitual ni contactos externos.

## 2. Decisiones fijas y responsabilidades

| Decisión | Contrato fijado | Responsabilidad |
| --- | --- | --- |
| D1-A | Solo visitante → negocio; destinatario del snapshot publicado del slug actual | API entrega contacto público; C2 lo usa tras creación exitosa |
| D2-A | `+` explícito y 7–15 dígitos, sin inferencia de país; normalización controlada según §4 | C2 filtra elegibilidad de la acción; API conserva el teléfono de contacto existente |
| D3-A | Dominio fijo `https://wa.me/`; `whatsappBaseUrl` es legacy no usado por esta acción | C1 conserva el campo por compatibilidad; C2 no lo usa como destino |
| D4-A | «Hola. Acabo de registrar una reserva en su página y quisiera consultar con ustedes.» | Constante C2, sin interpolación de datos |
| D5-A | «Tu reserva quedó registrada» después de creación exitosa; `PENDING` permanece intacto | API conserva el estado; C2 cambia el texto de éxito |
| D6-A | Un enlace por clic, pestaña nueva, sin apertura automática; auxiliar exacto de C0 | C2 y QA de navegador posterior |

Texto auxiliar: **«Abrirás WhatsApp. Revisa y envía el mensaje allí; abrirlo no confirma tu reserva.»**

La elección A resuelve las opciones abiertas de C0. Los textos y criterios aquí fijados son requisitos del consumidor futuro; no se presentan como comportamiento visual ya implementado.

## 3. Contrato HTTP existente

### `GET /public/:slug/booking-data`

- Público, sin sesión ni rol B2B requerido. `:slug` es únicamente localizador de una organización pública; el servidor resuelve su ID y comprueba activo, no borrado y publicación vigente. Cabeceras o query parameters de tenant no sustituyen esa resolución.
- `Cache-Control: no-store`. Cada petición consulta la publicación; sin nueva caché de contacto.
- Respuesta `200` conserva exactamente las claves raíz `minimumBookingDate`, `organization`, `whatsappBaseUrl`, `services` y `professionals`.
- `organization` conserva `{ name, slug, phone, description, address, googleMapsUrl }`. `phone: string | null` viene de `CmsPage.publishedSnapshot.phone`, nunca del borrador, `Organization.phone`, un profesional, un cliente ni la landing de Kortek.
- El teléfono se devuelve como contacto publicado, sin conversión de país ni validación específica WhatsApp. `null`, vacío o un número sin `+` no habilitarán la acción C2. Tampoco provocan `400`, impiden reservar ni autorizan modificar el teléfono guardado.
- `whatsappBaseUrl: string` conserva `process.env.WHATSAPP_BASE_URL || 'https://wa.me/'`. Es un campo **legacy no usado por esta acción**, no una URL confiable para navegar. No se retira ni cambia la variable ni la compatibilidad de `/auth/invite`. No se pide a C2 añadirlo al tipo web para consumirlo.
- Servicios y profesionales conservan sus proyecciones mínimas y consultas por el ID resuelto. No se exponen UUID de Organization, correo privado, borrador, notas, datos del cliente, mensajes, estados de envío ni enlaces nuevos.

Ejemplo parcial del contacto (no reemplaza el resto de claves del payload):

```json
{
  "organization": {
    "name": "Negocio de prueba",
    "slug": "negocio-de-prueba",
    "phone": "+18095551234",
    "description": null,
    "address": null,
    "googleMapsUrl": null
  },
  "whatsappBaseUrl": "https://wa.me/"
}
```

### `POST /public/:slug/bookings`

Se conserva el [DTO de entrada](../../apps/api/src/public-booking/dto/create-public-booking.dto.ts): `serviceId`, `professionalId`, `startTime`, `clientName`, `clientPhone`, correo opcional y opciones legacy de cuenta. No se añaden destinatario, texto, base URL, tenant ni estado editables. ValidationPipe mantiene whitelist y rechazo de campos extra. D2 se refiere al teléfono **del negocio para WhatsApp**, no modifica la validación de `clientPhone`.

La respuesta `201` conserva:

```text
{
  booking: { id, serviceId, professionalId, startTime, endTime, status },
  accountCreated: boolean,
  accountCreationError: string | null
}
```

Los instantes siguen serializados como ISO; no se reconstruyen fechas para el mensaje. No se retorna Client, tenant, notas o mensaje. [BookingsService](../../apps/api/src/bookings/bookings.service.ts) crea sin sobreescribir el default `PENDING` del schema. C1 no cambia esa persistencia ni sus transiciones. La prueba HTTP comprueba que el estado recibido del servicio de reservas se preserva; no pretende demostrar el default PostgreSQL con un doble.

La lectura del contacto no crea otra reserva. Ninguna apertura de enlace autoriza modificar Booking, reintentar su POST, crear Payment, emitir notificaciones o registrar «enviado». Fallar una cuenta legacy secundaria conserva el resultado de reserva conforme al contrato existente.

### Errores y recuperación

| Condición | Respuesta / efecto |
| --- | --- |
| Tenant inexistente, inactivo, borrado, sin publicación/snapshot, retirado o cierre público operativo | `404`, «Información no disponible.», sin contacto ni fallback |
| Snapshot público malformado | `503`, «La información pública no está disponible. Intenta de nuevo.», sin valores privados |
| Teléfono ausente o no elegible para WhatsApp | `200` de catálogo con el dato publicado; C2 omite enlace y auxiliar, conserva el resultado de reserva |
| Entrada de reserva inválida / extra | `400` antes de escribir; C2 no muestra éxito |
| Conflicto al reservar | Conserva `409` del dominio; no hay acción posterior de éxito |
| Límite de peticiones | Conserva `429`; el guard actual es local al proceso |
| Error de red/servidor al obtener contacto | Sin inventar contacto ni rescatar datos de otro slug; reintento de lectura según flujo existente |
| WhatsApp no abre, no está instalado o no permite enviar | No cambia ni vuelve a crear la reserva; no se afirma detectar envío/entrega |

Los límites existentes permanecen: catálogo 100/minuto por IP, disponibilidad 30/minuto y creación 5/minuto. C1 no amplía disponibilidad, manejo de fechas, autenticación ni protección contra abuso.

## 4. Especificación del consumidor C2

### Validación y composición

1. Usar únicamente el teléfono del contenido público del negocio actual. `null`, `undefined` o vacío producen ausencia de enlace; jamás fallback a otra fuente.
2. Admitir como separadores visuales solo espacio ASCII, paréntesis, punto y guion; eliminarlos sin rescatar dígitos de texto libre. Rechazar antes letras, extensiones, tabuladores, saltos de línea, espacios invisibles, dígitos no ASCII, URLs y cualquier otro carácter.
3. Exigir un único `+` inicial, seguido de 7–15 dígitos ASCII, con primer dígito distinto de cero, conforme a D2-A del C0. No convertir `00`, completar prefijos ni usar idioma, navegador, ubicación o zona horaria para deducir país.
4. Retirar únicamente el `+` del resultado validado. Construir `https://wa.me/<dígitos>?text=<encodeURIComponent(texto fijo D4)>`. Solo un parámetro `text`, sin fragmento, IDs, nombre del negocio/cliente, teléfono del cliente, servicio, fecha, hora, correo, notas ni secretos. El número público del negocio es la única información de contacto que aparece en la URL.
5. No consultar un servicio para verificar cuenta, titularidad, país o entrega. La elegibilidad es sintáctica y no demuestra existencia del número o de WhatsApp.

Vectores obligatorios para las pruebas futuras C2:

| Entrada | Resultado esperado |
| --- | --- |
| `+1234567` / `+123456789012345` | Aceptar límites 7 y 15 |
| ` +1 (809) 555-1234 ` / `+34.912.345.678` | Aceptar separadores controlados, conservar dígitos |
| `null`, vacío, solo espacios | Sin enlace |
| `8095551234`, `18095551234`, `0018095551234` | Sin enlace; falta `+` explícito |
| `+01234567`, `+123456`, `+1234567890123456` | Sin enlace; prefijo o longitud inválidos |
| `++18095551234`, `1809+5551234`, extensión/letras | Sin enlace |
| URL, `?text=`, `&text=`, fragmento, CR/LF final, tabulador, NBSP, dígitos Unicode | Sin enlace; no sanearlos hasta volverlos aceptables |

Estos vectores fijan el contrato de C2. Su ejecución posterior sobre la implementación frontend, separada de las pruebas backend C1, se documenta en [C2](WHATSAPP_C2_FRONTEND.md).

### Presentación y efectos

- Solo tras creación exitosa: «Tu reserva quedó registrada». No cambiar `PENDING` ni mostrar «confirmada» por abrir WhatsApp.
- Con teléfono elegible, un único enlace accesible «Abrir WhatsApp», `target="_blank"`, `rel="noopener noreferrer"` y auxiliar exacto de §2. Sin botón anidado dentro del enlace y sin combinar enlace con un segundo `window.open`.
- No abrir desde efectos de montaje, callback de POST, recuperación de foco o carga de datos. Cada activación explícita navega una sola vez; una nueva activación no vuelve a reservar.
- Mensaje genérico único, editable por la persona dentro de WhatsApp antes de enviar; sin editor de plantillas Kortek.
- Retiro/inactividad conserva la barrera existente; no usar contacto alternativo. Una respuesta tardía o cambio de slug no puede mezclar destinatarios. Un enlace externo ya conocido no puede revocarse desde la API: no afirmar esa garantía.
- La integración C2 deberá verificar éxito/error, teléfono no elegible, recuperación, clic repetido, dos slugs, teclado/foco, desktop y 375 px. Una suite backend no aprueba esa interfaz.

## 5. Seguridad, persistencia y compatibilidad

| Amenaza | Garantía / límite |
| --- | --- |
| Acceso cruzado a datos privados | Solo proyección publicada por slug; no hay nueva autoridad B2B ni búsqueda de clientes. Pruebas de dos tenants y allowlist exacta |
| Inyección de destino o datos | C2 usará base y texto constantes; `whatsappBaseUrl` y valores libres no son autoridad. Parámetros GET no cambian tenant/contacto; POST rechaza campos extra |
| Fuga en mensajes, logs o auditoría | Sin mensaje backend, consultas de clientes para contacto ni nuevos logs/eventos; C2 no interpolará PII ni registrará la URL completa |
| Confundir navegación y persistencia | GET sin escritura; POST mantiene respuesta/estado y validación. No hay endpoint de envío o confirmación |
| Contacto obsoleto o retirado | Consulta autoritativa y `no-store`; no es posible purgar una URL que una persona ya conoce |

No se crean transacciones ni garantías concurrentes nuevas. Se preserva la transacción de Client/Booking y la revalidación de publicación bajo bloqueo existente; no se reensaya ni modifica su implementación como parte de C1. Roles internos OWNER/ADMIN/RECEPTIONIST/BARBER y privacidad de clientes siguen bajo sus contratos propios. Un visitante público no obtiene facultades operativas por abrir WhatsApp.

Migración: no aplica. Persistencia y teléfonos existentes: intactos. Compatibilidad: respuesta y consumidor actual intactos; D3 conserva la deuda legacy de forma explícita. Rollback de esta entrega consiste en retirar las pruebas/documentación C1 si se descarta el contrato; no necesita rollback de datos o binarios. Un futuro rollback C2 requerirá conservar privacidad y apertura manual, sin revertir CMS/H5.

## 6. Pruebas automáticas y evidencia

Nueva suite: [whatsapp-contract.spec.ts](../../apps/api/src/public-booking/whatsapp-contract.spec.ts). Ejecuta HTTP Nest/Supertest con controlador, servicio público, ValidationPipe y ThrottlerGuard reales; Prisma, BookingsService y dependencias de negocio son dobles controlados. No es E2E PostgreSQL, QA visual ni prueba de WhatsApp externo.

Cobertura: allowlist exacta y `no-store`; dos tenants A → B → A; intentos de sustituir tenant/contacto/texto; ausencia de fallback privado; preservación de teléfonos legacy sin inferir país; campo `whatsappBaseUrl` compatible incluso ante configuración no confiable; seis causas de 404 neutro; retiro entre peticiones; snapshot malformado; proyección `PENDING` sin PII y sin nueva reserva al leer; rechazo de cuatro campos extra antes de escritura.

Validaciones ejecutadas en Windows local el 2026-09-14:

| Comando / verificación | Resultado |
| --- | --- |
| `pnpm --filter api exec jest --runInBand whatsapp-contract.spec.ts` | Exit `0`, 23/23 pruebas de contrato HTTP |
| `pnpm --filter api exec jest --runInBand` | Exit `0`, 50 suites aprobadas y 2 omitidas; 549 pruebas aprobadas y 11 omisiones preexistentes, incluidas las 23 nuevas |
| `pnpm --filter api exec tsc --noEmit` | Exit `0` |
| `pnpm --filter api lint` | Exit `0`, sin advertencias |
| `git diff --check` | Exit `0` |
| Comprobación PowerShell de enlaces locales y archivos nuevos | Exit `0`, 163 enlaces en ocho documentos, cero destinos inexistentes/marcadores de conflicto; archivos nuevos sin espacios finales |
| `git diff --cached --exit-code` | Exit `0`, sin staging |
| `git diff --exit-code -- apps/api apps/web` + inventario de archivos nuevos | Exit `0` para archivos versionados; único archivo nuevo de aplicación: la suite C1, sin runtime ni frontend nuevos |

Un intento inicial mediante `pnpm --filter api test -- --runInBand whatsapp-contract.spec.ts` falló por acceso local a la configuración pnpm; se ejecutó Jest mediante `pnpm exec` con éxito. El primer lint detectó una asignación insegura en la aserción del test; se corrigió sin desactivar reglas y se repitieron tipos, lint y suite completa con exit `0`. Los mensajes de error simulados de pruebas existentes no fueron fallos de la suite.

La primera revisión de espacios de documentos completos señaló contenido histórico de CHANGELOG fuera del cambio. Se conservó; la validación final cubre los cambios con `git diff --check` y los archivos nuevos completos, además de enlaces y marcadores de conflicto en los ocho documentos.

No se ejecutaron builds, migraciones ni E2E PostgreSQL: el cambio final es contrato documental más pruebas, sin cambios productivos, de schema o dependencia. No se atribuye evidencia nueva de atomicidad PostgreSQL, cuenta WhatsApp, envío, apertura, interfaz, responsive o accesibilidad.

## 7. Estado histórico al entregar C1

C1 no cambia el comportamiento productivo y no declara el módulo cerrado. El frontend todavía conserva la apertura automática y copy legacy descritos por C0; su corrección espera **aprobación explícita del contrato C1**. No se ejecutó QA de navegador ni se abrió C2.

Se preserva el trabajo documental previo de roadmap/C0/CMS. Solo se sincronizan controles sobre el estado WhatsApp y se añade la suite de contrato. Sin staging, commit, push ni despliegue. La entrega queda local y revisable.

Áreas de esta entrega: este contrato, `whatsapp-contract.spec.ts`, nota histórica de C0 y referencias WhatsApp en `BACKEND_CHANGES.md`, `CHANGELOG.md`, `PROJECT_MASTER.md`, `docs/README.md`, roadmap y flujos. Los cambios previos en documentos CMS y PRD pertenecen a la auditoría anterior; no se amplían desde C1. HEAD sigue en `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`, rama `ai/antigravity-qa`, sin staging y con cambios documentales previos más esta entrega local. No hay publicación cuyo SHA remoto deba reconciliarse.
