# Medios/Promociones — C0 auditoría y decisiones propuestas

Fecha: 2026-09-22. Estado histórico de entrega: **C0 DOCUMENTAL ENTREGADO**. Actualización 2026-09-23: el propietario aprobó C0, fijó D1–D8 con D5b y la excepción de avatar BARBER, y autorizó C1 backend; ver [decisiones y contrato C1 en construcción](MEDIOS_PROMOCIONES_C1_CONTRATO.md). Las opciones y recomendaciones de este documento son históricas y no sustituyen esa selección. Rama `ai/antigravity-qa`; base inspeccionada `44b0e506d1ca66747aa832a95a63a6824e3c5bf9`. Este C0 por sí mismo no aprobó cambios de interfaz, integración de archivos ni despliegue.

## 1. Encargo, usuario y frontera

OWNER y ADMIN necesitan preparar contenido visual y anuncios públicos veraces para el mini-sitio; la persona visitante debe ver solo contenido aprobado y vigente. El resultado buscado es una propuesta que permita decidir alcance, custodia, publicación, permisos y retiro antes de construir nada. BARBER, RECEPTIONIST y CUSTOMER no obtienen nuevas facultades.

Este C0 comprende **medios públicos y promociones editoriales**. Una promoción editorial informa sobre el negocio o una campaña, sin crear condiciones que el sistema deba aplicar a reservas o cobros. Quedan fuera descuentos, cupones, precios prometidos, cupos, elegibilidad comercial, prioridad, restricciones de horario, modificación de disponibilidad y cualquier cambio en `Service.price`, Booking, Invoice o Payment. También quedan fuera comprobantes, banca, métodos de pago, campañas de notificación y mensajes automáticos. Configuración/CMS C1–C3, H5/fechas, WhatsApp C1–C3 y Notificaciones C1–C3 permanecen cerrados/aprobados; este C0 no modifica su código ni reabre sus contratos.

### Base comprobada

- [Prisma](../../apps/api/prisma/schema.prisma) tiene `GalleryImage` con `id`, `organizationId`, `url`, `caption`, `order` y `createdAt`; la relación con Organization usa `onDelete: Cascade`. No registra identificador de proveedor, dueño de un archivo, alt text, estado editorial ni derivados. `Organization.heroImageUrl` es un escalar legacy sin contrato de medios vigente. `Service` carece de imagen y no hay modelo de promoción. `Professional.avatar` es una URL nullable, no una carga administrada.
- La [proyección CMS](../../apps/api/src/cms/cms.projection.ts) limita borrador y snapshot público a cinco campos: `publicName`, `description`, `phone`, `address` y `googleMapsUrl`. La [API CMS aprobada](CONFIGURACION_CMS_C1_CONTRATO.md) usa OWNER/ADMIN para guardar y preview, solo OWNER para publicar/retirar, versión optimista y snapshot separado. Que `draft` sea JSON no habilita nuevas claves por sí mismo.
- [`GET /public/:slug/booking-data`](../../apps/api/src/public-booking/public-booking.service.ts) entrega la organización publicada y catálogo activo; cada servicio expone `id`, `name`, `description`, `duration`, `price` y ningún medio. Los profesionales públicos exponen el avatar existente. La [proyección C3](CONFIGURACION_CMS_C3_BACKEND.md) es allowlist; no publica galería ni promociones. Las rutas públicas usan `404` neutro cuando el negocio no está publicado/activo o fue retirado.
- [H5/fechas](RESERVA_PUBLICA_H5_FECHAS.md) ya usa `Organization.timeZone` en servidor y envía instantes ISO UTC autoritativos para slots. La utilidad [zonedLocalDateTimeToUtc](../../apps/api/src/professionals/professional-availability.util.ts) valida calendario y conversión; su tratamiento de horas locales ambiguas necesitaría criterio explícito antes de reutilizarla para inicio/fin editorial.
- El [roadmap posterior a CMS](ROADMAP_POST_CMS_AUDITORIA.md) distingue medios, anuncios editoriales y descuentos ejecutables. La [visión](CONFIGURACION_CMS_PAGOS_VISION.md) no seleccionó proveedor ni contrato de archivos. La [auditoría CMS histórica](CONFIGURACION_CMS_C0_AUDITORIA.md) reconoce que el avatar propio de BARBER y la galería del negocio son ámbitos distintos.

Lectura estática de repositorio, contratos y documentación. No se inspeccionó una cuenta de proveedor ni se ejecutaron API, navegador, migraciones, subidas o pruebas funcionales en este C0.

## 2. Propuesta de contrato, sujeta a D1–D8

### 2.1 Capacidad y datos candidatos

Separar la **identidad del archivo** de su **uso editorial**. Un registro de activo candidato quedaría ligado a `organizationId` obtenido del contexto autenticado y guardaría referencia opaca del proveedor, tipo, tamaño, dimensiones, checksum, estado de custodia, fechas y actor mínimo. La referencia nunca sería una URL libre aportada para publicar ni una credencial de proveedor. Una asignación editorial candidata enlazaría el activo tenant-scoped con galería y, solo si D1 lo autoriza por separado, servicio o avatar. Debe definir orden, texto alternativo, caption, revisión y estado borrador/publicado. Una promoción candidata guardaría título, texto plano, estado editorial y vigencia; **ningún campo de porcentaje, monto, código, límite de usos, cupo, precio efectivo o elegibilidad**. Son conceptos para C1, no tablas/campos existentes ni decisiones de migración aprobadas.

El ciclo privado candidato es solicitar subida → comprobar tamaño/tipo/contenido → guardar en custodia no pública → editar metadatos y preview privado → publicar revisión exacta → servir proyección mínima → retirar/expirar → revocar entrega y limpiar derivados. El servidor revalidaría tenant, Membership, rol y vínculo del activo en cada mutación; un ID ajeno se trataría como inexistente. La subida nunca bastaría para publicar. El preview no concedería enlace público permanente. Ante fallo del proveedor o de la purga, el activo permanecería **no publicable/retirado** y la operación requeriría reconciliación visible al editor, sin fingir éxito de revocación.

Una ampliación backend futura necesitaría operaciones privadas de alta/carga, lectura de estado, edición de metadatos, orden, preview, publicación, retiro y eliminación; además de una proyección pública por allowlist, idealmente aditiva a la lectura vigente solo para contenido visible. Rutas, DTOs, límites, esquema, respuesta y semántica transaccional se fijarán en C1 después de las elecciones. No se presume que `GalleryImage.url` sea seguro como localizador final ni que `CmsPage.draft` acepte listas sin cambiar DTO, proyección y frontend. La promoción puede viajar en la misma proyección pública o una ruta aparte; C1 deberá elegirlo con criterios de compatibilidad y caché, sin tocar reservas/Facturación.

La escritura de metadatos debe usar revisión esperada e idempotencia según el patrón CMS aprobado. Publicar debe validar de nuevo archivo, metadatos, vigencia y permiso bajo control de concurrencia; la referencia publicada debe apuntar a una versión inmutable del contenido, nunca a un archivo reemplazable bajo la misma URL. Los cambios de proveedor no forman parte de una transacción PostgreSQL: se requiere estado intermedio durable y reconciliación para subidas incompletas, fallos de borrado e invalidación. AuditLog guardaría IDs, actor y acción mínimos, sin texto promocional, URLs firmadas, metadatos EXIF ni PII.

### 2.2 Estados y experiencia candidata

El editor distinguiría vacío, archivo en revisión, error de subida, borrador, listo para publicar, publicado, retiro en curso, retirado y error de purga con siguiente acción clara. La promoción distinguiría borrador, programada, visible, vencida y retirada manualmente. El preview señalaría contenido sin publicar y el horario del negocio con lenguaje natural. En móvil y desktop conservaría orden, texto alternativo y controles accesibles por teclado, foco y anuncios de estado; el visitante vería solo contenido cargado/vigente y un estado vacío honesto, sin tarjetas de promoción ficticias. Estos son criterios para un futuro frontend, no una aprobación de diseño ni QA visual.

## 3. Decisiones para el propietario

Cada letra es una alternativa **pendiente**. La recomendación orienta la discusión y no constituye selección. D1 contiene elecciones separadas para no ampliar Servicios ni Profesionales por arrastre.

### D1 — Alcance exacto de medios

| Subdecisión | Opción A | Opción B | Recomendación |
| --- | --- | --- | --- |
| D1.1 Galería del negocio | Incluir galería pública, con activo y publicación controlados; `GalleryImage` requiere migración o sustitución contractual | Aplazar todos los medios y hacer solo promociones de texto | **A**, núcleo del módulo |
| D1.2 Fotos de servicios | No incluir; `Service` y catálogo público conservan contrato actual | Incluir; requiere vínculo por servicio tenant-scoped, reglas de baja/cambio y proyección del catálogo propia | **A** para primer C1; B es ampliación de Servicios separada |
| D1.3 Avatares adicionales | No incluir; `Professional.avatar` y edición propia A1 quedan como hoy | Incluir carga administrada para avatar; requiere contrato de Profesionales y resolver prioridad frente a URL propia | **A**; B es ampliación de Profesionales separada |
| D1.4 Hero legacy | Excluir `Organization.heroImageUrl` | Incorporarlo como ubicación editorial distinta de galería | **A**; B requiere contrato CMS propio |

La galería no se convierte automáticamente en foto de servicio, hero ni avatar. La elección de D1.2, D1.3 o D1.4 cambia persistencia, proyección pública, retiro y QA por separado. **La facultad BARBER de editar su `Professional.avatar` propio mediante `PATCH /professionals/me` no da acceso a galería, archivos ni publicación del negocio**, incluso si algún día se selecciona D1.3.

### D2 — Proveedor, control de acceso y URLs conocidas

| Opción | Custodia y entrega | Consecuencia |
| --- | --- | --- |
| **A. Cloudinary** | Originales y derivados bajo entrega `authenticated` o control equivalente verificado; transformaciones permitidas limitadas y referencias firmadas desde servidor. Borrado por identificador del activo con invalidación de CDN y verificación de derivados. | Menos infraestructura de imágenes, pero el modo/plan exacto y la revocación efectiva deben probarse. `private` por sí solo protege el original y puede dejar derivados públicos. |
| **B. Almacenamiento privado + CDN** | Bucket privado, acceso del CDN al origen controlado, conjunto fijo de variantes, URLs de entrega firmadas y de vida corta. Retiro elimina acceso de origen y solicita invalidación de objetos/variantes. | Más operación propia; da control explícito de origen, claves, variantes y plazo máximo de enlaces conocidos. |

**Recomendación: B** si el requisito es limitar temporalmente el acceso a URLs ya compartidas; C1 deberá fijar duración máxima de firma, latencia de invalidación aceptable y prueba real del proveedor antes de aprobar la custodia. A es aceptable solo tras demostrar que originales **y todos los derivados** dejan de servirse tras retiro. Ninguna opción autoriza subir con preset público sin firma, guardar secretos en navegador ni aceptar URLs arbitrarias. No se reutiliza esta política para comprobantes privados.

Retirar significa: (1) excluir inmediatamente el activo de la proyección pública; (2) impedir nuevas firmas/URLs; (3) revocar acceso al origen y purgar originales/derivados y cachés; (4) conservar un tombstone mínimo para no republicar por replay; (5) verificar con una URL previamente conocida y cada variante. No se puede borrar una copia que un visitante ya descargó. Las URLs firmadas existentes pueden ser utilizables hasta su vencimiento y la invalidación puede demorar; C1 debe establecer un límite medible y un mecanismo de emergencia. Si ese límite no es aceptable, no publicar hasta probar una modalidad de entrega que cumpla la expectativa.

Las [opciones de acceso de Cloudinary](https://cloudinary.com/documentation/control_access_to_media) distinguen `private` de `authenticated`; su [documentación de borrado](https://cloudinary.com/documentation/delete_assets) exige solicitar invalidación para copias en CDN. [AWS documenta origen privado y enlaces firmados de CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-overview.html). Son capacidades del proveedor, no integraciones verificadas en Kortek ni una garantía universal de borrado instantáneo.

### D3 — Ownership, validación y moderación de subidas

| Opción | Límites propuestos | Impacto |
| --- | --- | --- |
| **A. Conservadora** | Galería: máximo 12 activos publicados por tenant, archivo de hasta 5 MiB, JPEG/PNG/WebP estáticos, dimensión decodificada 640–6000 px por lado. Sin SVG/GIF/video. | Menor abuso y costo; cubre fotografía habitual. |
| **B. Ampliada** | Hasta 30 activos y 10 MiB, más formatos tras pruebas de decodificación/derivados. | Mayor costo, cuotas y superficie de abuso; necesita estimación y controles adicionales. |

**Recomendación: A** como punto de partida sujeto a prueba con archivos reales. En ambas opciones, el backend emite una intención limitada a tenant/actor/uso, comprueba MIME **y bytes decodificados**, tamaño y dimensiones, elimina EXIF/GPS/metadatos de cámara, re-encoda variantes aprobadas, limita tasa/almacenamiento y registra checksum para deduplicar o investigar. El ID de proveedor se liga a un único tenant; renombrar o referenciar un activo de otro negocio está prohibido. Los archivos en staging sin asignación publicada caducan y se purgan según plazo que C1 debe fijar; conteo de publicados y cuota de staging son límites distintos. La baja de Membership impide completar intenciones pendientes.

Alt text obligatorio y descriptivo para fotos informativas (propuesta: 10–160 caracteres); se permite alt vacío **solo** si el editor declara la imagen decorativa y la interfaz no pierde información. Caption opcional (propuesta: 200 caracteres), texto plano escapado. El editor avisa sobre rostros, derechos de uso, datos sensibles y metadatos; el servidor impide publicar texto vacío/inválido y marca contenido denunciado como no publicable. Contenido indebido debe poder ponerse en cuarentena y retirarse por OWNER y por un proceso operativo autorizado, con revisión humana cuando el clasificador no sea concluyente. La moderación automática, si se elige, no reemplaza ownership ni revisión de falsos positivos. C1 debe definir canal de denuncia y plazo de respuesta antes de abrir publicación real.

### D4 — Borrador, preview y publicación de medios

| Opción | Comportamiento | Impacto |
| --- | --- | --- |
| **A. Revisión editorial conjunta** | Galería/orden/metadatos se preparan en borrador privado y OWNER publica una revisión inmutable; el público sigue viendo el snapshot anterior hasta entonces. El archivo en staging nunca es público. | Reutiliza semántica CMS, pero amplía su contrato y exige inventario/referencias de activos fuera del JSON. |
| **B. Versionado por imagen** | Cada imagen tiene revisión, publicación y retiro independientes; ordenar la galería requiere una revisión de colección adicional. | Permite cambios aislados, pero introduce estados concurrentes y riesgo de combinación no revisada. |

**Recomendación: A** para la galería inicial, con ID inmutable de activo/version de archivo y colección editorial versionada. No se debe mutar en sitio el binario publicado. Retirar por contenido indebido exige una vía de emergencia que invalide el activo inmediatamente aunque el snapshot CMS anterior aún lo referencie; la lectura pública filtra activos revocados. C1 deberá diseñar atomicidad entre snapshot, activo y proyección, y rollback sin reactivar un enlace retirado. Si promociones se publican junto a galería o como colección independiente se resolverá en su contrato posterior; no se insertan a ciegas en los cinco campos CMS actuales.

### D5 — Límite verificable de promoción editorial

| Opción | Control | Riesgo |
| --- | --- | --- |
| **A. Campos editoriales acotados + doble control** | Título y texto plano con límites; aviso permanente al editor de que no se aplican beneficios automáticos; backend rechaza patrones claros de moneda, porcentaje, código/cupón, “cupos”, “plazas”, “quedan X”, promesa de precio/servicio gratis y condiciones de elegibilidad. OWNER revisa preview y confirma esa regla al publicar. | Reduce errores, aunque ningún filtro textual entiende todas las promesas implícitas; requiere revisión editorial y corrección tras denuncia. |
| **B. Aviso y revisión manual solamente** | Se permite texto libre y el editor/OWNER asumen revisión. | Mayor flexibilidad, mayor riesgo de prometer beneficios que reservas/cobro no cumplen. |

**Recomendación: A**. Como regla de producto, tampoco se publican textos que prometan por sinónimos o imágenes un precio, descuento, gratuidad, cupo o ventaja que el sistema no aplica. Ejemplo admisible: “Conoce los estilos de temporada”. Ejemplos no admisibles: “20 % menos al reservar”, “Corte por RD$ 500” o “Solo quedan tres turnos”. El filtro de backend es defensa parcial, no certificación semántica: revisión humana del OWNER, denuncia y retirada rápida son parte del control. Se rechazan HTML, Markdown activo, enlaces externos y datos de contacto salvo que una decisión posterior los autorice. La promoción no escribe ni modifica `Service.price`, agenda, slots, Booking, Invoice o Payment, ni agrega un mecanismo de aplicación en checkout.

### D6 — Vigencia autoritativa

| Opción | Entrada y autoridad | Impacto |
| --- | --- | --- |
| **A. Inicio/fin locales explícitos** | Editor introduce fecha y hora del negocio; servidor valida calendario/zona, convierte y persiste instantes UTC; publica solo si `startAtUtc <= nowUtc < endAtUtc` y el estado editorial está publicado. | Precisión; exige resolver horas locales inexistentes/ambiguas y `start < end`. |
| **B. Días completos del negocio** | Editor introduce fechas calendario; servidor convierte medianoche inicial y medianoche del día siguiente al final a instantes UTC. | UX más simple y menos errores; no permite campañas por hora. |

**Recomendación: B** para el primer contrato, salvo necesidad comercial comprobada de horas. En ambos casos `Organization.timeZone` del servidor es la autoridad, se captura la zona utilizada junto a la revisión de vigencia y se define qué ocurre si la zona cambia en el futuro (propuesta: no reinterpretar una promoción ya publicada; nueva publicación para cambiar vigencia). El servidor calcula visibilidad en cada lectura pública; el reloj del navegador solo presenta fechas en lenguaje natural. El patrón es el de [H5/Reservas](RESERVA_PUBLICA_H5_FECHAS.md): instante UTC emitido/calculado por servidor, sin inferir la zona del visitante ni exponer IANA/UTC en interfaz pública. Si se elige A, C1 debe rechazar una hora inexistente y pedir resolución explícita de una hora repetida antes de publicar; no puede aceptar silenciosamente una conversión arbitraria.

### D7 — Permisos

| Opción | Matriz | Impacto |
| --- | --- | --- |
| **A. Matriz CMS** | OWNER/ADMIN cargan, editan, ordenan y ven preview; solo OWNER publica, retira, aprueba contenido denunciado y decide borrado definitivo. | Coherente con CMS; sigue requiriendo guards y comprobación de Membership/tenant en cada operación de archivo. |
| **B. Matriz propia** | Definir permisos separados por carga, edición, moderación y publicación para otros roles. | Nuevo contrato de privilegios, QA de escalamiento y producto; no se infiere del rol actual. |

**Recomendación: A**. Un actor sin permiso no recibe URL de staging ni firma. BARBER conserva exclusivamente la edición de su perfil propia A1; esa ruta no autoriza editar o cargar galería, promoción, hero o foto de servicio. RECEPTIONIST/CUSTOMER no entran al editor. Público anónimo solo ve la proyección publicada/vigente sin `organizationId`, actor, estado de moderación ni URLs de staging. Un recurso ajeno y uno inexistente no revelan diferencias sensibles.

### D8 — Expiración, retiro y huérfanos

| Subdecisión | Opción A | Opción B | Recomendación |
| --- | --- | --- | --- |
| D8.1 Promoción vencida | Deja de mostrarse automáticamente por comparación UTC en servidor, sin depender de worker; queda historial privado para revisión/renovación | Sigue visible hasta retiro manual | **A**; B contradice vigencia |
| D8.2 Renovación | Exigir nueva revisión/publicación OWNER para nueva fecha o texto | Reactivar automáticamente una campaña anterior | **A**; evita contenido obsoleto |
| D8.3 Servicio eliminado/inactivo, si D1.2 se eligiera | Desvincular de proyección inmediatamente y pasar activo a cuarentena/purga tras verificar que no lo use otra ubicación | Conservar archivo indefinidamente aunque no sea visible | **A** con plazo de retención decidido en C1 |
| D8.4 Negocio inactivo/borrado | Cerrar entrega pública y firmas de inmediato, inventariar y purgar activos según retención y restricciones legales/operativas aprobadas | Conservar entrega de URLs por conveniencia | **A**; B no satisface retiro |

La FK `GalleryImage` con cascade solo borra la fila en PostgreSQL; **no borra el objeto del proveedor ni sus derivados**. C1 debe definir un proceso durable de reconciliación, verificación de referencias cruzadas, reintentos y alerta por objetos huérfanos. El borrado físico no debe depender únicamente de un callback después de una transacción fallida. Una promoción vencida no necesita mutación inmediata para dejar de verse, pero un trabajo de limpieza puede marcarla y auditar el retiro administrativo; el filtro público sigue siendo la autoridad. Si se retira el CMS entero, la proyección de medios/promociones también desaparece y la política D2 gobierna las URLs ya compartidas.

## 4. Amenazas, compatibilidad y aceptación futura

Amenazas principales: IDOR entre tenants con ID de activo/servicio, escalamiento BARBER→galería, URL pública conocida tras retiro, derivado omitido, carga con tipo falso o metadatos privados, XSS en alt/caption/promoción, contenido comercial engañoso, exposición de borrador, carreras publicación/retiro, reloj/zona divergentes, objeto externo huérfano y reactivación por replay. Las mitigaciones propuestas están en D1–D8 y deben convertirse en pruebas de C1. Los límites de tasa en memoria no bastan como control distribuido de carga o abuso público.

Compatibilidad: la lectura pública actual y sus campos aprobados no cambian en C0. Para C1, ampliaciones de respuesta deberán ser aditivas y con allowlist; una promoción o imagen ausente no altera catálogo, reserva, precio ni disponibilidad. Un rollback futuro deberá cerrar temporalmente entrega de medios antes de volver a un lector que ignore revocaciones, preservar tombstones/operaciones y no reabrir URLs por restaurar un snapshot anterior. Migración de `GalleryImage` legacy exige inventario de filas/URLs reales en entorno autorizado, sin suponer que son archivos propios del proveedor elegido ni republicarlas automáticamente.

Criterios observables para una implementación posterior: dos tenants no comparten activos ni URLs privadas; cuatro roles cumplen D7; preview y público muestran revisiones distintas hasta publish; original y derivados previamente conocidos dejan de entregarse dentro del límite D2 tras retiro; metadatos sensibles se eliminan; archivos falsos/sobredimensionados se rechazan; un servicio inactivo o negocio retirado no deja medios visibles; una promoción aparece/desaparece en el instante calculado por servidor, incluso con navegador en otra zona y en cruces de día; ninguna promoción cambia monto o slot; un fallo de proveedor deja estado recuperable sin publicación falsa. Backend y almacenamiento necesitarán pruebas integradas, concurrencia, recuperación de fallos y QA real móvil/desktop antes de un checkpoint candidato. Nada de ello se ejecutó aquí.

## 5. Selección requerida y siguiente gate

El propietario debe fijar **D1.1–D1.4 y D2–D8** (incluidas D8.1–D8.4). Las recomendaciones no reemplazan esa elección. Antes de C1 deben cerrarse también el plazo medible de revocación, TTL/firma de URL, cuota de staging, retención/purga, política de denuncia y el contrato de proyección pública. Solo entonces corresponde redactar y aprobar producto/UX y contrato/arquitectura precisos, después implementar backend y obtener su aprobación explícita antes de cualquier frontend. Este C0 no autoriza iniciar esas etapas.
