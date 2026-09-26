# Auditoría y roadmap posterior a Configuración/CMS

Fecha: 2026-09-14. **AUDITORÍA ENTREGADA / SELECCIÓN DEL PROPIETARIO PENDIENTE**. Este informe compara candidatos; no es el C0 de ninguno, no aprueba contratos y no abre un checkpoint de implementación.

Actualización posterior: el propietario eligió WhatsApp manual, revisó [C0](WHATSAPP_C0_AUDITORIA.md), fijó D1–D6 A y aprobó [C1](WHATSAPP_C1_CONTRATO.md) sobre `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`. Autorizó [C2 frontend](WHATSAPP_C2_FRONTEND.md), con ejecución de vectores y QA real. C1 conserva endpoints/respuestas. Las referencias del cuerpo a selección pendiente describen la entrega original del roadmap y quedan sustituidas por esta actualización para el próximo paso.

Configuración/CMS C1–C3 y H5/fechas permanecen **CERRADOS / APROBADOS**. Base funcional: `8fd7b1ff9f14ad82bde3d3936817941660983b2c`. HEAD inspeccionado: `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`, que solo añade documentación de cierre. Rama `ai/antigravity-qa`, árbol inicialmente limpio. El propietario elegirá el módulo antes de autorizar su C0.

## 1. Método y límites

Lectura estática del código, schema, migraciones relevantes, contratos, consumidores y pruebas existentes. Sin acceso a bases, ejecución de aplicaciones, envíos, instalación, migraciones ni cambios funcionales. Las pruebas citadas son fuentes inspeccionadas, no nuevas ejecuciones ni QA visual. La comparación `8fd7b1f..HEAD` confirma que no hay cambios en `apps`.

Se aplican [gates](../quality/DELIVERY_GATES.md), [seguridad](../quality/SECURITY_STANDARD.md), [producto](../product/PRODUCT_STANDARD.md) y [estado vigente](../../PROJECT_MASTER.md). La [visión futura](CONFIGURACION_CMS_PAGOS_VISION.md) orienta los candidatos; las propuestas siguientes no conceden permisos ni definen nuevos endpoints, enums o campos.

Complejidad relativa: baja = cambio localizado sobre contratos existentes; media = ampliación de dominio/proyección y varias superficies; alta = nueva persistencia o integración con recuperación de fallos; muy alta = modificación de invariantes financieras y coordinación concurrente de agenda. Riesgo expresa el impacto potencial de un fallo. No son plazos ni presupuestos; el alcance elegido en C0 permitirá estimarlos.

## 2. Comparación de candidatos

| Candidato | Acoplamiento con CMS | Con disponibilidad/reservas | Con roles y privacidad | Complejidad / riesgo | Dependencia obligatoria |
| --- | --- | --- | --- | --- | --- |
| WhatsApp manual | Medio: nombre/teléfono publicados; futuro editor de plantillas separado del perfil | Bajo en cálculo de slots, medio en semántica de estados y fechas del mensaje | Medio: hoy visitante → negocio; futuro personal → cliente necesita permisos por reserva y PII mínima | Baja–media / medio, acotado a enlace manual | Ninguno de los otros candidatos; usa CMS y Reservas ya existentes |
| Pagos: local/transferencia, comprobantes y anticipos | Medio–alto: configuración de métodos/cuentas, con visibilidad distinta del contenido público | Muy alto si retiene horario: expiración, cancelación, reprogramación, verificación tardía y carreras | Alto: configurar cuentas, verificar evidencia y registrar cobro son facultades distintas | Muy alta / muy alto | Ampliación formal de Facturación y custodia privada de comprobantes; no exige completar galería ni WhatsApp |
| Notificaciones transaccionales | Medio: plantillas/configuración; no caben en la allowlist actual de cinco campos | Medio–alto: eventos confirmados, fechas del negocio, recordatorios y anulación de trabajos obsoletos | Alto: destinatarios, remitente, preferencias, acceso a historial y reintentos por tenant | Alta / alto | Eventos de Reservas para mensajes básicos; contrato de Pagos solo para mensajes financieros futuros |
| Medios/Promociones | Alto: publicación, preview, versión, retiro y proyección pública | Bajo en imágenes; medio en vigencia; alto si ofertas condicionan horario/cupo | Alto en ownership de archivos y publicación; adicional en reglas comerciales | Medios: media–alta / alto. Promoción editorial: media / medio. Descuento ejecutable: alta–muy alta / alto | Medios y anuncios editoriales no exigen Pagos; descuentos necesitan un contrato financiero compatible |

## 3. WhatsApp: reconciliación de H8 y candidato

### Lo comprobado

El [H8 del C0](CONFIGURACION_CMS_C0_AUDITORIA.md) contrastaba la visión de `wa.me` como futuro con una acción legacy ya existente. La revisión actual confirma:

- [PublicBookingService.getBookingData](../../apps/api/src/public-booking/public-booking.service.ts) devuelve `whatsappBaseUrl` desde `WHATSAPP_BASE_URL` o `https://wa.me/`. El nombre y teléfono públicos vienen ahora del snapshot CMS publicado, no del teléfono operativo de Organization.
- [PublicBookingData](../../apps/web/lib/api.ts) no declara `whatsappBaseUrl`. [waLink](../../apps/web/app/%5Bslug%5D/_components/shared.tsx) elimina caracteres no numéricos del teléfono y construye el dominio fijo `https://wa.me/`; solo descarta números sin dígitos. El contrato CMS acepta teléfono de contacto, no prueba que ese número tenga WhatsApp ni exige inequívocamente un código de país.
- Tras crear la reserva, [PublicMiniSite](../../apps/web/components/public/PublicMiniSite.tsx) intenta `window.open` con el teléfono del negocio y texto que incluye nombre del cliente, servicio, fecha y hora. El texto está redactado como si el negocio hablara al cliente, aunque el destino es el negocio. Es una salida externa iniciada por el código del navegador; no es un envío automático de mensajes desde el servidor.
- [SuccessView](../../apps/web/app/%5Bslug%5D/_components/SuccessView.tsx) ofrece además «Abrir WhatsApp» con otro texto, esta vez cliente → negocio. No hay editor de mensaje en Kortek ni confirmación de entrega. La apertura automática puede ser bloqueada por el navegador; no se comprobó su funcionamiento real en esta auditoría.
- [TeamService](../../apps/api/src/auth/team.service.ts) conserva el campo en `/auth/invite` legacy. Las invitaciones actuales de Equipo usan Clerk; esa compatibilidad no demuestra una integración actual de mensajería de Equipo. El contacto de la landing en [brand.ts](../../apps/web/lib/brand.ts) corresponde a Kortek, no al tenant.

**Resolución documental de H8:** existe una acción pública legacy de apertura de WhatsApp, con base fija en web y campo configurable no consumido. Sigue siendo futura la capacidad operativa personal → cliente, con plantillas administrables y mensaje editable. Resend y envío automático no están implementados. La discrepancia queda reconciliada en este informe y en las fuentes vigentes; la divergencia técnica API/helper sigue identificada para un alcance posterior, sin corrección de código ni retirada del campo por inferencia.

La entrada de CHANGELOG de 2026-07-23 que afirma que el frontend dejó de depender del dominio fijo no describe el consumidor actual. Se preserva como historia y se aclara mediante la entrada de esta auditoría, sin atribuir al código una compatibilidad que no usa.

### Alcance inicial recomendado, pendiente de elección

Unificar la acción manual y su semántica: quién escribe a quién, teléfono válido para el destino, fuente segura del enlace y texto consistente con la reserva real. Decidir en C0 si entra únicamente la acción pública existente o también la operativa del personal; esta última eleva el alcance a permisos y teléfonos de clientes. Las plantillas configurables pueden ser una ampliación posterior y no deben obligar a construir Notificaciones primero.

Riesgos concretos: PII en la URL externa, dirección incorrecta del mensaje, número no apto, popup bloqueado y confundir apertura con envío. El texto de éxito actual dice «confirmada», pero [BookingsService](../../apps/api/src/bookings/bookings.service.ts) crea sin sobreescribir el default `PENDING` de [Prisma](../../apps/api/prisma/schema.prisma). Es un punto de semántica que el C0 elegido deberá resolver; esta auditoría no cambia estados ni reabre la aprobación C3.

No se heredan permisos CMS para enviar a clientes: OWNER/ADMIN editan CMS y solo OWNER publica; los futuros operadores deberán quedar autorizados por el contrato de reservas, con BARBER limitado a sus recursos. Ninguno de los otros tres módulos es requisito para la acción manual.

## 4. Pagos

### Base real y brecha

Ya existe registro de cobro interno; no se empieza desde cero. [InvoicesController](../../apps/api/src/invoices/invoices.controller.ts), [InvoicesService](../../apps/api/src/invoices/invoices.service.ts) y [ADR-002](../decisions/ADR-002-facturacion-interna-inmutable.md) establecen Invoice única para Booking completada y terminada, snapshot del precio de Service al emitir y un Payment completo e inmutable. `CASH`, `CARD` y `TRANSFER` son etiquetas de método de registro; no acreditan pasarela, transferencia verificada ni procesamiento de tarjetas.

No hay cuentas bancarias, comprobantes, anticipo, propina ni ciclo de verificación en el schema. No existe un importe fijado en Booking: el momento actual del snapshot es la emisión de Invoice. Por eso incluso una oferta de precio que se promete al reservar necesita resolver cómo se conserva y cobra ese importe después.

### Acoplamiento y riesgo

- CMS aporta patrones editoriales y de aislamiento, pero cuentas bancarias, métodos y evidencia requieren contratos y permisos propios. No deben añadirse indiscriminadamente al snapshot público.
- El [bloqueo de agenda en PostgreSQL](../../apps/api/prisma/migrations/20260811180000_booking_schedule_exclusion/migration.sql) excluye solapamientos de reservas no canceladas. `PENDING` ya ocupa horario; no es un estado de pago pendiente. Retención y expiración exigen coordinar consulta de slots, creación, reprogramación, cancelación y verificación tardía con la [disponibilidad individual](../../apps/api/src/professionals/professional-availability.service.ts).
- OWNER/ADMIN/RECEPTIONIST y BARBER propio pueden registrar cobros en el contrato actual. Eso no les concede automáticamente configurar banca o aprobar comprobantes. La nueva matriz necesita decisión expresa.
- Anticipos y propina impactan Invoice/Payment y las lecturas de [Analytics](../../apps/api/src/analytics/analytics.service.ts), que hoy usan Payment.paidAt. La compatibilidad debe evitar ingreso duplicado y cambios retroactivos de importes históricos. Esto no autoriza abrir Analytics como módulo.

Es el candidato de mayor riesgo: dobles cobros, evidencia cruzada entre tenants, cobro sin agenda disponible y dinero recibido después de expirar una reserva. C0 tendrá que decidir precio autoritativo, vínculo anticipo–factura, custodia privada, revisión/rechazo, recuperación y tratamiento de cancelaciones. Si la solución necesita reembolsos u otro alcance hoy excluido, habrá que autorizarlo expresamente o acotar la primera entrega antes de aceptar anticipos.

### Dependencias y segmentación propuestas

Primero, decisiones financieras/arquitectónicas y compatibilidad con Facturación; después, configuración segura de métodos/cuentas y evidencia privada; finalmente, flujo completo de transferencia/verificación y agenda. Son cortes de planificación sujetos a C0, no etapas iniciadas. Pago en local podría ser un primer alcance pequeño porque no crea Payment, pero por sí solo no entrega el módulo de anticipos/transferencias.

La custodia privada es obligatoria para comprobantes. Puede implementarse dentro de Pagos con alcance propio; una galería pública no la satisface. Notificaciones es conveniente para informar de revisión o rechazo, pero no debe ser la autoridad que confirma cobro o libera agenda. WhatsApp, galería y promociones no son dependencias duras.

## 5. Notificaciones

### Base real y brecha

Existe el modelo legacy `Notification` con organizationId, userId opcional, title, message, read y createdAt. No define relaciones FK con Organization/User, eventos, canal, intentos, destinatario externo, deduplicación ni estado de entrega. La búsqueda en `apps/api/src`, `apps/web/app`, `apps/web/components` y `apps/web/lib`, contrastada con [AppModule](../../apps/api/src/app.module.ts) y [dependencias API](../../apps/api/package.json), no encontró un servicio/API/consumidor de Notification, integración Resend ni cola/outbox de notificaciones. El método `resend` de invitaciones es reenvío mediante Clerk, no el proveedor Resend.

La visión propone correo transaccional y plantillas. Una bandeja interna de notificaciones es otro alcance posible; no se deduce del modelo y no conviene incluirla automáticamente junto con correo.

### Acoplamiento y riesgo

Los eventos deben proceder de cambios reales y confirmados de Booking. Creación, confirmación y cancelación son conceptos distintos; no existe `IN_PROGRESS`. Los recordatorios deben recalcularse o invalidarse al reprogramar/cancelar, usar la hora del negocio y comprobar estado antes del envío. La entrega externa fallida no debería invalidar una reserva persistida: se recomienda una intención de envío durable y procesamiento recuperable, cuyo diseño se decidirá en contrato.

CMS proporciona patrones de editor y concurrencia, pero su contrato actual no admite plantillas. Deben acordarse remitente autorizado, variables permitidas, destinatarios, consentimiento/preferencias, tratamiento de contactos ausentes y permisos de configuración/reintento/lectura. `Client.email` y el `clientEmail` solicitado durante la reserva pública son opcionales: no se puede prometer correo a todas las reservas ni convertirlo en requisito sin decisión de producto. El destinatario cliente tampoco necesita una Membership CUSTOMER.

Riesgo alto por PII, mensajes al destinatario incorrecto, duplicados, mensajes atrasados y fallos externos. Resend documenta [claves de idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys) y [reintentos de webhooks](https://resend.com/docs/webhooks/retries-and-replays); esas capacidades apoyan el diseño, pero no sustituyen la deduplicación y autorización locales. Referencias oficiales consultadas el 2026-09-14; no se verificó ninguna cuenta ni se eligió un plan.

### Dependencias y primer alcance recomendado

Empezar por mensajes transaccionales de estados existentes, luego recordatorios y, solo tras aprobar Pagos, sus eventos financieros. Esto permite empezar sin Pagos y evita un ciclo de dependencias. WhatsApp manual puede compartir convenciones de lenguaje, pero no exige una infraestructura de envío común. Campañas promocionales, bandeja interna y autoservicio B2C quedan como decisiones separadas, no requisitos implícitos.

## 6. Medios/Promociones

### Base real y brecha

[Prisma](../../apps/api/prisma/schema.prisma) conserva `Organization.heroImageUrl`, `socialLinks`, `GalleryImage` y `Professional.avatar`. `GalleryImage` solo aporta URL, caption, orden y tenant; Service no tiene campo de imagen y no existe modelo de promoción. No se encontró gestión de cargas ni integración Cloudinary en las superficies de aplicación examinadas. El avatar URL existente no acredita ownership ni custodia de archivos.

El [CMS actual](../../apps/api/src/cms/cms.projection.ts) permite solo publicName, description, phone, address y googleMapsUrl. Que draft/snapshot sean JSON no autoriza añadir propiedades: [DTOs](../../apps/api/src/cms/cms.dto.ts), proyección, publicación, editor y mini-sitio necesitan contratos coordinados.

### Tres alcances con dependencias diferentes

| Subalcance propuesto | Acoplamiento y riesgo | Dependencia |
| --- | --- | --- |
| Medios públicos: galería/imagen del negocio; fotos de servicios si se incluyen | Publicación CMS, ownership por tenant, formatos/tamaños, contenido, metadatos, alt text, orden, borrador privado y eliminación sin romper snapshots. Riesgo alto de exposición y archivos indebidos | CMS existente; proveedor y ciclo de vida por definir. No depende de Pagos ni Notificaciones |
| Promociones editoriales | Contenido real con vigencia y condiciones, publicado y retirado. Tiempo autoritativo para inicio/fin. Si promete un precio que el sistema debe aplicar, deja de ser editorial | CMS; Medios solo si necesita imágenes. No cambia slots ni montos por sí misma |
| Promociones ejecutables: descuento/cupón/beneficio aplicable | Elegibilidad, precio autoritativo, vigencia, acumulación, cupos, concurrencia y snapshot comercial. Afecta Reservas/Facturación; disponibilidad si restringe franjas o capacidad | Contrato de precios/Facturación compatible, recomendado dentro de la planificación de Pagos antes de implementarlas. No requiere necesariamente pasarela ni transferencias completas |

Recomiendo separar Medios y promociones editoriales de descuentos ejecutables. No se usarán descripciones CMS como sustituto de reglas de descuento.

OWNER/ADMIN editan y solo OWNER publica en CMS vigente. Reutilizar esa matriz es una propuesta razonable para medios editoriales, sujeta a aprobación de alcance; no amplía automáticamente la edición propia de avatar BARBER a la galería del negocio. Evidencias financieras necesitan permisos y almacenamiento distintos de las fotos públicas.

El retiro CMS también deberá definir qué ocurre con URLs previamente conocidas y derivados de imágenes, no solo ocultarlas del mini-sitio. [Cloudinary documenta distintos controles de acceso](https://cloudinary.com/documentation/control_access_to_media); ello confirma que elegir proveedor y política de acceso es parte del diseño, no que exista una integración ni que una URL de galería sea apta para un comprobante. Referencia oficial consultada el 2026-09-14; proveedor aún no aprobado.

## 7. Dependencias y orden recomendado

| Relación | Tipo | Motivo |
| --- | --- | --- |
| CMS/Reservas existentes → WhatsApp manual | Base ya disponible | Contacto publicado y datos/estado de la reserva |
| Estados reales de Reservas → Notificaciones básicas | Obligatoria | No enviar confirmación de una transición inexistente o revertida |
| CMS → Medios/promociones editoriales | Base ya disponible; requiere ampliación aprobada | Publicar únicamente la revisión autorizada |
| Ampliación de Facturación + custodia privada → Pagos con comprobantes/anticipos | Obligatoria | Integridad monetaria y privacidad |
| Contrato de Pagos → notificaciones financieras | Obligatoria solo para esos mensajes | El evento debe representar una operación financiera real |
| Contrato financiero de precios → descuentos ejecutables | Obligatoria | Preservar el importe prometido y el registro de cobro |
| Medios públicos → comprobantes; WhatsApp → correo; Pagos → notificaciones básicas | No obligatoria | Son capacidades separables; evitar dependencias artificiales |

**Orden recomendado entre los cuatro candidatos: WhatsApp → Notificaciones → Medios/Promociones editoriales → Pagos.** Después de aprobar el contrato financiero compatible, abordar promociones ejecutables y añadir notificaciones de Pagos. Si «Medios/Promociones» debe incluir descuentos desde su primera entrega, ese bloque de descuentos se sitúa después del diseño financiero de Pagos; no se arrastra la galería a esa dependencia.

La razón del orden es reducir incertidumbre gradualmente: WhatsApp permite corregir una acción ya presente con alcance pequeño; Notificaciones resuelve comunicación sobre reservas actuales y prepara la recuperación de envíos; Medios extiende la publicación sin tocar dinero; Pagos queda al final por su impacto simultáneo en agenda, privacidad, cobros e historial. No es una cadena técnica obligatoria: el propietario puede priorizar Pagos primero si el objetivo comercial lo requiere, incluyendo entonces sus prerrequisitos financieros y de evidencia privada.

Antes del C0 elegido quedarán para decisión sus fronteras: WhatsApp público o también operativo; correo transaccional o bandeja; galería o también fotos/avatares; anuncio editorial o descuento; pago en local o también transferencia/anticipo. Este informe identifica esas decisiones y no las aprueba. No requiere iniciar Analytics, Resumen, A0.6-B/C/D ni la migración Supabase. Los gates de producción vigentes de PROJECT_MASTER son transversales al despliegue, no autorización para abrirlos desde este roadmap.

## 8. Evidencia y cierre de esta auditoría

Se revisaron contrato y comportamiento de CMS, Reserva pública, disponibilidad, Facturación y permisos; además, pruebas de DTO/proyección/CMS y de emisión/cobro/idempotencia, así como las migraciones y fuentes enlazadas. Los futuros C0 deberán convertir los riesgos en criterios observables; cuando se implemente, harán falta QA de dos tenants/cuatro roles, estados, errores, escritorio/móvil y concurrencia donde corresponda. Esto no atribuye QA nuevo a la base aprobada.

Entrega exclusivamente documental: informe, reconciliación H8 en fuentes vigentes, índice y registro de auditoría. Sin cambios a código, contratos ejecutables, dependencias o base de datos. Validación documental: enlaces locales, consistencia semántica, diff completo y `git diff --check`; sin builds por ser documentación. La publicación Git no forma parte de esta entrega: se conservan los archivos locales para revisión, sin commit ni push.

Resultado de validación: 206 enlaces locales comprobados en los ocho archivos del alcance, cero destinos inexistentes; comprobador y `git diff --check` con exit `0`. El informe nuevo se revisó completo y se comprobó adicionalmente con PowerShell por no estar versionado todavía. `rg` no pudo ejecutarse en Windows; las búsquedas se completaron con `Select-String`. Los intentos de lectura de rutas supuestas inexistentes se sustituyeron por inventario y lectura de las rutas reales; no se cuentan como verificaciones satisfactorias. `git diff --no-index --check` contra `NUL` devolvió `1` y tampoco se cuenta como gate aprobado.

No hay implementación ni checkpoint abierto. **El siguiente paso es la selección y autorización explícita del propietario antes de iniciar el C0 del módulo elegido.**
