# Reserva pública M1: elegir una cita y entender su estado

Fecha: 2026-10-01, hora del negocio de referencia en República Dominicana. **Estado: C0 DOCUMENTAL ENTREGADO / EN REVISIÓN; decisiones nuevas pendientes del propietario.** Este documento define el recorrido público separado, el calendario con hora compacta y el resultado de una reserva pendiente. No acredita implementación, QA nueva, aprobación de C0 ni autorización de C1/C2/C3.

## 1. Autorización, base y fuentes vinculantes

El único gate abierto de **M1** es C0. La secuencia del propietario es C0 → C1 backend y aprobación → C2 frontend y aprobación → C3 QA real y aprobación final; se aplica junto con los [gates del repositorio](DELIVERY_GATES.md). Los correctivos F0 conservan sus estados independientes; esta entrega no los cierra ni abre otro gate suyo.

Base exacta: `ad90bf52890ea2e2ba309ad5a87d1dcafcdde9f7`, rama `ai/antigravity-qa`, igual a la base mínima solicitada. Al empezar, `git status --short` no devolvió rutas y `git status` indicó árbol limpio y rama al día con `origin/ai/antigravity-qa`. No se hizo fetch ni comprobación remota nueva. Solo se editan este C0 y sus referencias de control en `PROJECT_MASTER.md`, `docs/README.md` y `CHANGELOG.md`. No hay staging, commit, push ni despliegue.

Se contrastaron estas fuentes con el código de esa base:

| Fuente | Aplicación en M1 |
| --- | --- |
| [Entrada documental](../README.md), [estado vigente](../../PROJECT_MASTER.md), [PRD](../product/PRD.md), [flujos](../product/APP_FLOWS.md) | Producto, módulos aprobados y continuidad B2C pendiente |
| [Decisiones del propietario del 29-sep y actualización del 30-sep](DECISIONES_PROPIETARIO_2026_09_29.md) | Vinculantes; prevalecen sobre las propuestas anteriores |
| [Auditoría técnica y roadmap](AUDITORIA_HALLAZGOS_ROADMAP_MVP_2026_09_29.md), §5 C0-A y C0-E | Recomendaciones adoptadas por decisión 13, dentro de su ámbito |
| [Auditoría de diseño, UX y conversión](AUDITORIA_DISENO_UX_MARKETING_2026_09_29.md) | Capturas, preferencia espacial, copy y fricciones; propuestas adicionales no se convierten automáticamente en decisiones |
| [H5 y fechas](../features/RESERVA_PUBLICA_H5_FECHAS.md), [F0-A](CORRECTIVO_F0A.md), [F0-B](CORRECTIVO_F0B.md), [F0-C](CORRECTIVO_F0C.md), [F0-D](CORRECTIVO_F0D.md) | Preservar mínimos de contraseña/campos, Profesional, tiempos autoritativos y relativos públicos |
| [CMS C1](../features/CONFIGURACION_CMS_C1_CONTRATO.md), [C3 backend](../features/CONFIGURACION_CMS_C3_BACKEND.md), [C3 frontend](../features/CONFIGURACION_CMS_C3_FRONTEND.md) | Snapshot publicado, slug, revalidación y retiro |
| [Medios C1](../features/MEDIOS_PROMOCIONES_C1_CONTRATO.md), [C2](../features/MEDIOS_PROMOCIONES_C2_FRONTEND.md), [C3](../features/MEDIOS_PROMOCIONES_C3_ACTIVACION.md) | Fotos moderadas/publicadas y localizadores revocables |
| [WhatsApp C1](../features/WHATSAPP_C1_CONTRATO.md), [C2](../features/WHATSAPP_C2_FRONTEND.md), [C3](../features/WHATSAPP_C3_ACTIVACION.md) | Visitante → negocio, mensaje genérico, apertura manual |
| [Horario y zona C1](../features/HORARIO_ZONA_C1_CONTRATO.md), [C2](../features/HORARIO_ZONA_C2_FRONTEND.md), [Notificaciones C1](../features/NOTIFICACIONES_C1_CONTRATO.md) | Disponibilidad efectiva, cadencia pública y opt-in existentes |
| [Contratos backend](../../BACKEND_CHANGES.md), [historial](../../CHANGELOG.md), [modelo](../architecture/DATA_MODEL.md), [arquitectura](../architecture/TRD.md) | Contexto; ante descripciones antiguas manda el código y la decisión vigente |
| [Producto](../product/PRODUCT_STANDARD.md), [frontend](../product/FRONTEND_STANDARD.md), [patrones](../product/UI_PATTERNS.md), [seguridad](SECURITY_STANDARD.md), [terminación](DEFINITION_OF_DONE.md) | Criterios observables, privacidad, estados y límites de aprobación |

**Capturas inspeccionadas:** `image-1.png` (209 × 394) e `image-2.png` (189 × 398), en el adjunto local `37a51f79-cf28-42ab-a748-172c3d9bd46c`. La primera extiende una cuadrícula de horas debajo del calendario. La segunda integra una fila Hora compacta dentro del selector nativo de reagendado. La hora visible 2:24 p. m. no prueba que sea un slot válido. Los recortes no permiten medir targets CSS, contraste, rendimiento ni comportamiento táctil. La referencia es la composición calendario + hora, no copiar el campo libre `datetime-local` ni rediseñar el panel.

Skills aplicadas: `kortek-delivery`, `kortek-product-ui`, `ui-ux-pro-max`, `web-design-guidelines`, `writing-guidelines`, `design:ux-copy`, `emil-design-eng`, `mobile-native`, `copywriting` y `cro`. Las guías web y de escritura se consultaron en sus fuentes oficiales de [interfaz](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) y [redacción](https://raw.githubusercontent.com/vercel-labs/writing-guidelines/main/command.md). Se aplican claridad, labels, foco, recuperación y movimiento reducido; las convenciones propias de Vercel no gobiernan Kortek. El buscador local de UI/UX se ejecutó con Python incluido, sin instalar ni persistir archivos: `appointment booking mobile compact --design-system` y `calendar keyboard focus --domain ux`, exit 0. El resultado general encaja en divulgación progresiva, pero su paleta/tipografía y embudo de tres pasos no encajan con la identidad/recorrido fijados; se descartan. La búsqueda de foco sí corresponde al selector. No se atribuyen porcentajes comerciales de las skills a Kortek.

## 2. Usuario, problema y resultado esperado

La persona visitante quiere reservar desde el teléfono en un negocio cuyo enlace ya conoce. Puede llegar desde un enlace compartido, búsqueda o red social; esas procedencias son hipótesis de diseño, no tráfico medido. No necesita sesión ni acceso al panel para reservar como invitada.

El asistente actual permanece debajo del contenido del mini-sitio, separa día y horas extendidas y agrega un paso de cuenta independiente. La revisión dice “Confirmar reserva” y el éxito no desarrolla próximos pasos, fotos ni estado pendiente. La opción de cuenta promete continuidad que la web B2C aún no ofrece.

El resultado esperado es elegir servicio, profesional y un horario realmente libre, aportar datos mínimos, revisar y registrar una reserva `PENDING`. La persona debe reconocer el negocio, regresar a su página, corregir elecciones sin repetir sus datos y comprender que falta confirmación del negocio. Precio y duración visibles proceden del catálogo real; no equivalen a pago ni a garantía de un precio sellado en Booking.

**Alcance:** ruta `/{slug}/reservar`, cinco pasos de entrada y una pantalla de éxito; composición de fotos públicas existentes; calendario de días disponibles y hora compacta; datos/opt-in existentes; propuesta de medición sin PII (información personal identificable); diagnóstico y contrato documental faltante.

**Fuera de alcance:** pago, tipo de pago, comprobantes, propinas; implementación de cuenta de cliente/A0.6-B/C/D o retiro legacy; calendario/reagendado del panel; editor público y carga de fotos; nuevos permisos, reglas de vinculación de servicios, estados Booking, edición de slug/zona/horarios, dependencias, instrumentación, bases de datos, configuración y producción. La elección de pago de Piloto 1 sigue en Pagos; M1 no revoca esa decisión por omitirla aquí.

## 3. Qué existe hoy y qué falta

La inspección del código distingue capacidad existente de propuesta nueva:

| Evidencia ejecutable | Hecho y consecuencia |
| --- | --- |
| [Página pública](../../apps/web/app/%5Bslug%5D/page.tsx), [PublicMiniSite](../../apps/web/components/public/PublicMiniSite.tsx) | `/{slug}` monta el asistente al pulsar el CTA. No existe `/{slug}/reservar`. Reconsulta antes del CTA y al recuperar foco; un 404 retira contenido anterior. |
| [Controlador público](../../apps/api/src/public-booking/public-booking.controller.ts), [servicio](../../apps/api/src/public-booking/public-booking.service.ts) | Rutas existentes: booking-data, availability y POST bookings. Tenant por slug resuelto en servidor; flag de cierre, negocio activo/no borrado, snapshot CMS y elegibilidad operativa. `no-store`. |
| [DTO de disponibilidad](../../apps/api/src/public-booking/dto/get-availability-query.dto.ts) | Recibe `serviceId`, `date` calendario ISO estricta y `professionalId` opcional. **Consulta un día**, no un mes/rango. |
| Servicio público, `getAvailability` | Calcula duración completa, candidatos del horario global, horario individual/intersección, cierres, bloqueos y choques; elimina comienzos pasados. Devuelve `{date, serviceId, slots:[{time, professionalId, startTime}]}`. |
| [Política de horario](../../apps/api/src/business-schedule/business-schedule.policy.ts), [disponibilidad individual](../../apps/api/src/professionals/professional-availability.service.ts) | Cadencia pública de 30 minutos anclada en cada apertura global; herencia sin turnos individuales y reglas de zona/ambigüedad aprobadas. Un horario abierto no garantiza que quepa el servicio o que quede un slot. |
| Servicio público, modo sin `professionalId` | Recorre profesionales ACTIVE + isPublic ordenados por nombre y devuelve el primer profesional libre por hora. No devuelve todos los candidatos de esa hora ni usa reparto equitativo. Empates de nombre carecen de desempate explícito. |
| [BookingsService](../../apps/api/src/bookings/bookings.service.ts), `findActiveBookingsInRange` | El lector usado por disponibilidad excluye **solo CANCELLED**; conserva choques de los demás estados. No reducirlo a PENDING/CONFIRMED al añadir el rango. |
| BookingsService y [schema](../../apps/api/prisma/schema.prisma) | ProfessionalService existe, pero **no restringe** servicios en esta fase. Cualquier profesional activo elegible puede realizar cualquier servicio activo del tenant. Booking nace PENDING; duración/fin se calculan en servidor. |
| `createBooking` público y BookingsService | Client/Booking comparten transacción; se relee publicación bajo lock Organization, se valida Professional público, servicio activo, hora y conflictos. Locks/exclusión PostgreSQL protegen la escritura. Un GET no retiene el slot. |
| [DTO de alta](../../apps/api/src/public-booking/dto/create-public-booking.dto.ts), [respuesta](../../apps/api/src/public-booking/dto/public-booking-response.dto.ts) | POST exige profesional concreto, serviceId, startTime y contacto; retorna Booking mínima y resultado secundario de cuenta. No hay endpoint público de consulta de reserva por ID ni recibo idempotente de esta alta. |
| [Proyección de medios](../../apps/api/src/media/media-public.service.ts), [controlador](../../apps/api/src/media/media-public.controller.ts) | `GET /public/:slug/media` ya entrega fotos SERVICE y PROFESSIONAL_AVATAR PUBLISHED de destinos activos/públicos. Localizadores firmados de 60 segundos y elegibilidad comprobada al servir imagen. Service no necesita nuevo campo de foto. |
| [ServiceStep](../../apps/web/app/%5Bslug%5D/_components/ServiceStep.tsx), [ProfessionalStep](../../apps/web/app/%5Bslug%5D/_components/ProfessionalStep.tsx) | Selecciones sin foto; `avatar` recibido no se representa en el paso. El mini-sitio ya compone medios para otras superficies. |
| [DateTimeStep](../../apps/web/app/%5Bslug%5D/_components/DateTimeStep.tsx), [queries](../../apps/web/lib/queries/public-booking.ts) | Fecha nativa + TimeSlotGrid. Disponibilidad aislada por slug/servicio/día/profesional, frescura 15 segundos; catálogo 60 segundos y reconsulta siempre al foco. No consulta días reservables. |
| [BusinessDateTimeField](../../apps/web/components/booking/BusinessDateTimeField.tsx), [DateTimePicker legacy](../../apps/web/components/ui/DateTimePicker.tsx) | El primero usa campo nativo; el legacy genera horas con reglas propias/dispositivo. Ninguno prueba el contrato público requerido. Reutilizar tokens, controles/foco, no sus generadores de horas. |
| [AccountStep](../../apps/web/app/%5Bslug%5D/_components/AccountStep.tsx), [SuccessView](../../apps/web/app/%5Bslug%5D/_components/SuccessView.tsx) | Mínimo 8 ya corregido. Alta secundaria crea User/password + Membership CUSTOMER legacy tras Booking, sin el recorrido Clerk B2C ni Client.userId. Éxito todavía promete iniciar sesión con correo. Esa identidad legacy no acredita “Mis reservas”. |
| [AppModule](../../apps/api/src/app.module.ts), [presupuesto PostgreSQL](../../apps/api/src/security/postgres-throttler.storage.ts) | Límite compartido entre procesos, claves HMAC sin IP cruda almacenada por el limitador. Catálogo 100/min, disponibilidad 30/min, altas 5/min por IP/ruta; medios 60/min y entrega 120/min. No afirmar que esos límites impiden spam distribuido. |

### Discrepancias y límites que no se resuelven por inferencia

1. H5 histórico excluía timeZone; F0-D/2A aprobado lo añade técnicamente. No hay contradicción vigente en ese punto: se conserva `timeZone` de booking-data y nunca se muestra su identificador al visitante.
2. TRD conserva frases “Supabase no implementado” y “rate limiting local”; DATA_MODEL conserva espera hasta endTime. Están desactualizadas respecto a PROJECT_MASTER, F0-C y el código actual. Este C0 registra la discrepancia y usa esas fuentes vigentes; no cambia arquitectura/pagos ni reescribe documentos ajenos al alcance.
3. Mantener la casilla no autoriza migrar autenticación ni prometer autoservicio. La recomendación Clerk + claim explícito de C0-A quedó FIJADA por decisión 13; su implementación corresponde al módulo de cuenta. La convivencia de QA se presenta en D8, sin escoger otra identidad.
4. El API legacy puede revelar `EMAIL_ALREADY_EXISTS` de identidad global y conflictos de contacto del tenant. Cambiar esas respuestas necesita revisión contractual explícita (D11). El copy puede neutralizarlas, pero eso solo no corrige enumeración en HTTP. No se amplía ni se elimina el contrato por este C0.
5. No hay tarifa snapshot de Booking ni reserva de precio al elegir servicio. M1 muestra el precio de catálogo consultado; no garantiza descuentos, cobro o precio inmutable. Si se exige fijarlo al reservar, detener esa ampliación y llevarla a Pagos con contrato propio.

No se encontró una contradicción que impida entregar **el documento**. Los puntos 3–5 detienen las acciones dependientes y ofrecen alternativas en §10; ninguna alternativa queda aplicada.

## 4. Roles, datos públicos y privacidad

El visitante accede a una proyección mínima del negocio publicado. OWNER/ADMIN mantienen gestión editorial y solo OWNER publica/retira CMS. Recepción y Profesional conservan sus permisos internos; M1 no les añade lectura de otras reservas ni edición pública. CUSTOMER no recibe dashboard. Estar autenticado con un rol interno no permite saltar elegibilidad pública por esta ruta.

| Dato | Uso permitido |
| --- | --- |
| Negocio | Nombre, descripción, teléfono, dirección y Maps del snapshot publicado del slug actual; opcionales ausentes se omiten |
| Servicio | ID operativo público ya necesario, nombre, descripción, duración y precio DOP de Service activo; foto elegible de media.services |
| Profesional | ID operativo público ya necesario, nombre, bio y foto pública elegible; sin teléfono privado, userId, notas, agenda ocupada ni motivos de bloqueos |
| Fecha/hora | Fechas civiles disponibles y slots para ese servicio/profesional; startTime autoritativo de transporte, timeZone técnico y fecha mínima del negocio |
| Contacto introducido | Nombre y teléfono obligatorios, correo opcional según DTO; revisión privada de esa visita y POST al negocio. No se convierte en directorio o dato público por escribirse en una ruta pública |
| Resultado | ID, serviceId, professionalId, startTime, endTime, status y resultados secundarios ya contratados, solo en respuesta de esa alta; ID no concede consulta/gestión pública |

Usar únicamente fotos de la proyección de Medios, emparejadas además con el catálogo actual del mismo slug. No rescatar URL arbitraria de avatar legacy cuando falte un medio publicado elegible. El campo legacy permanece en el contrato; este diseño adopta el respaldo textual conservador, sin retirarlo del API. Si el contrato exige representar una URL legacy concreta, resolver esa discrepancia con el propietario antes de implementarla.

No guardar formulario, contraseña, contacto ni resultado en URL, localStorage, sessionStorage, cookies de analítica, consola, AuditLog, eventos o capturas compartidas. El borrador vive en memoria durante la visita; navegar a otro slug, salir o cambiar identidad lo desmonta y descarta efectos tardíos, también A → B → A. Retroceder entre pasos de la misma visita conserva contacto; cambiar servicio/profesional invalida día/hora/profesional resuelto y fuerza disponibilidad nueva. Una foto retirada desaparece al revalidar: no almacenar una copia permanente ni usar el optimizador de Next para cachear el localizador.

El texto de finalidad no sustituye una política real del responsable: “El negocio usará estos datos para gestionar tu reserva y comunicarse contigo.” Solo añadir enlace de privacidad cuando exista uno aprobado; el contrato actual no trae `privacyUrl`. No inventarlo ni condicionar la reserva a consentimiento de marketing. Opt-in de avisos por correo mantiene aviso/versionado de Notificaciones, separado de crear cuenta y desmarcado por defecto. Cambiar correo requiere revisar de nuevo el opt-in. No afirmar que se enviará/recibirá correo a partir del checkbox.

## 5. Recorrido, composición y copy

Se proponen cinco pasos numerados y un resultado, sin una pantalla obligatoria adicional de cuenta. En móvil se muestra “Paso 3 de 5 · Fecha y hora”; éxito sale de la numeración. Revisión incluye acciones Editar que regresan al paso correspondiente sin reenviar la reserva.

| Paso | Contenido y microcopy propuesto | Acción principal |
| --- | --- | --- |
| Entrada | Desde `/{slug}`, enlace “Reservar cita” a `/{slug}/reservar`; encabezado con nombre publicado y enlace “Volver a la página del negocio” | Iniciar en servicio tras revalidar |
| 1. Servicio | **“Selecciona el servicio”**; foto real, nombre, descripción breve, “Duración: {minutos} min” y precio DOP real formateado para es-DO | “Elegir profesional” |
| 2. Profesional | “Elige un profesional”; nombres/fotos; opción “Cualquiera disponible”, ayuda “Te mostraremos horarios con un profesional disponible. Verás quién te atenderá antes de registrar la reserva.” | “Ver fechas y horas” |
| 3. Fecha y hora | “Elige fecha y hora”; calendario del mes del negocio; ayuda “Solo mostramos días y horas disponibles para tu selección.”; fila “Hora” con “Selecciona una hora” | “Continuar con tus datos” |
| 4. Tus datos | “Tus datos”; “Nombre”, “Teléfono”, “Correo (opcional)”; finalidad anterior; avisos por correo existentes; casilla visible “Crear cuenta para reservar más rápido” con advertencia de QA de §7 | “Revisar reserva” |
| 5. Revisar | “Revisa tu reserva”; servicio/foto, duración y precio de catálogo, profesional concreto/foto, fecha natural, contacto de la visita; “La reserva quedará pendiente de confirmación del negocio.” | **“Registrar reserva”**, pending “Registrando tu reserva…” |
| Éxito | **“Tu reserva quedó registrada”**; estado textual “Pendiente de confirmación”; resumen y próximos pasos de §6 | “Volver a la página del negocio” |

Ejemplos de fecha son ilustrativos: “Hoy, 11:00 p. m.” o “Mañana, 9:30 a. m.”. Reutilizar el formateador/BusinessTime de F0-D, con fecha absoluta completa accesible, año conforme a su regla e instante íntegro. No convertir HH:mm o fecha civil con la zona del navegador. Se conserva contraseña mínima 8 antes de avanzar; campos móviles ≥16 px y etiqueta Profesional ya resueltos, sin reabrir F0.

### Calendario y control compacto de hora

La propuesta muestra encabezado mes/año, controles Mes anterior/Mes siguiente y nombres de días de semana. Solo las fechas devueltas como disponibles muestran un día seleccionable. Las posiciones sin disponibilidad quedan vacías, sin botón ni número que sugiera opción; la leyenda explica “Los espacios vacíos no tienen horarios disponibles”. Una lista alternativa “Ver días disponibles” ofrece las mismas fechas para lectores de pantalla o preferencia de lista. Esta interpretación conservadora respeta literalmente “solo los días con disponibilidad real”; D6 compara su coste visual con un mes que muestre días deshabilitados.

Seleccionar un día consulta sus slots. La fila Hora permanece junto al calendario, con un select nativo de opciones cerradas de la respuesta; no tiene entrada libre. En escritorio cabe en la parte inferior del calendario; en móvil ocupa una fila dentro de la misma card, con área de toque ≥44 CSS px. La lista desplegada puede desplazarse sin expandir una cuadrícula a lo largo de la página. Mostrar hora natural; valor técnico conserva el slot completo, no una hora reconstruida. No elegir ni enviar automáticamente la primera hora.

Antes de recibir el rango, ningún día se presenta como disponible. Se conserva la estructura mientras carga, se anuncia el mes consultado y se evita sustituir datos del mes/profesional anterior por respuestas tardías. Al cambiar día, limpiar hora/profesional resuelto. Al volver del fondo o pasar la medianoche del negocio, reconsultar fecha mínima, rango y día; una selección desaparecida pide otra hora. Un fallo de red ofrece Reintentar la misma consulta, sin obligar a cambiar fecha ni representar vacío.

El calendario debe admitir teclado, foco visible, nombres completos de fecha, estado seleccionado y anuncio de horas actualizadas. Las flechas recorren fechas disponibles; Tab permite mes, días, hora y navegación. La lista alternativa evita depender del desplazamiento por espacios vacíos. Si se elige un popover en C2, Escape cancela cambios provisionales y devuelve foco; no anidar otro modal de pantalla completa. D6 recomienda calendario inline para evitar superposiciones.

En 320 px, siete columnas de 44 px necesitan al menos 308 px útiles: reducir el margen/padding del calendario, sin reducir targets ni forzar scroll horizontal. Al ampliar el texto o no disponer de ese ancho, usar la lista equivalente de días disponibles con la misma fila Hora; no esconder el acceso a ninguna fecha.

### “Cualquiera disponible” con asignación visible

D5 recomienda mantener la opción usando el contrato real. Omitir professionalId al consultar rango/día; cada slot devuelve el candidato libre concreto. Al seleccionar la hora, mostrar “Te atenderá {nombre}” con su foto elegible, y en revisión usar ese nombre. El POST envía ese `professionalId` y ese `startTime`; no envía “any”, no reserva sin profesional y no realiza sorteo cliente.

Si ese profesional deja de estar disponible antes del POST, conservar contacto y volver al selector con explicación. No sustituirlo silenciosamente por otro: reconsultar y pedir aceptar la nueva selección. No prometer “primera cita disponible”, igualdad de reparto, especialidad exclusiva ni relación servicio-profesional que no existe. Con un solo profesional, D5 recomienda preseleccionarlo y mostrar el paso como completado en el progreso sin exigir un clic vacío; seguir permitiendo revisar quién atiende.

### Dirección visual y adaptación

Conservar identidad negro/blanco/rojo, tokens y tipografías actuales. Pantalla de tarea con encabezado corto, contenido máximo aproximado de 640 px y navegación clara; sin repetir el hero/galería del mini-sitio encima de cada paso. Servicio usa imagen 4:3 en card seleccionable; profesional avatar cuadrado/circular y nombre. Sin foto: superficie neutra con símbolo decorativo y texto del recurso; nunca stock, iniciales de clientes o imagen que simule personal real. Las imágenes reservan proporción y dimensiones para evitar saltos; error de imagen no bloquea la reserva.

Una columna en móvil; resumen contextual breve, sin competir con CTA. El botón inferior no tapa campo, foco o teclado ni queda en la zona de gesto. Validar áreas seguras, viewport dinámico y orientación horizontal; permitir ampliar 200 % y pinch zoom. Estados seleccionados usan texto/semántica además de color. Objetivo de contraste: 4,5:1 texto normal y 3:1 texto grande/controles relevantes, medido en C3; aquí no se certifica. Movimiento opcional de 150–200 ms para continuidad visual, sin esperar animación para operar, sin confeti y con reducción de movimiento; cambios por teclado no requieren animación.

## 6. Pantalla de éxito completa y acciones condicionadas

El éxito ocupa la pantalla de tarea y permanece visible durante la visita. Se enfoca su encabezado y se anuncia una vez. Orden: título/estado → cita con fotos → negocio/ubicación elegible → próximos pasos → acciones. No basta sustituir el texto de la vista actual.

El resumen usa `booking.startTime`, `booking.endTime` y `booking.professionalId` del resultado real, con nombres del catálogo vigente del slug. Presenta servicio y profesional con sus fotos publicadas o respaldo limpio, fecha natural y duración. No repetir teléfono/correo del cliente ni contraseña en éxito. Si falta el catálogo para resolver un ID, mantener el resultado sin inventar nombre; no reemplazarlo por un servicio de otro slug.

Copy principal: “Tu reserva quedó registrada”. Estado: “Pendiente de confirmación”. Próximo paso: “El negocio debe confirmar tu cita. Si necesitas consultar su estado, comunícate con el negocio.” El contacto solo se propone con datos publicados elegibles. Sin contacto: “La cita sigue pendiente de confirmación. Puedes volver a la página del negocio.” No inventar plazo de respuesta, promesa de contacto, enlace Mis reservas o notificación entregada.

| Acción | Condición y comportamiento propuestos |
| --- | --- |
| “Volver a la página del negocio” | Enlace al mismo `/{slug}` con revalidación; no crea otra reserva |
| “Agregar al calendario” | Solo tras respuesta de alta con instantes válidos; archivo local de calendario, con título “Cita pendiente · {servicio}”, estado TENTATIVE y comienzo/fin autoritativos. No implica confirmación, cuenta ni integración con Google/Apple; sin contacto del cliente, IDs operativos o notas |
| “Cómo llegar” | Solo con googleMapsUrl publicado/validado del negocio actual; nueva pestaña, noopener/noreferrer. Dirección textual si existe; sin geolocalización, mapa incrustado o pin inventado |
| “Abrir WhatsApp” | Un único enlace manual si teléfono publicado cumple regla estricta existente; auxiliar y mensaje **exactos** del contrato cerrado |

La exportación de calendario usa `STATUS:TENTATIVE`, permitido para eventos por [RFC 5545, §3.8.1.11](https://www.rfc-editor.org/rfc/rfc5545#section-3.8.1.11). El título también dice pendiente porque la representación del estado depende de la aplicación importadora. Codificar los textos del catálogo como texto de calendario, sin permitir que saltos de línea inyecten propiedades; generar un identificador local sin IDs de negocio/reserva. Ayuda: “Guarda la cita como pendiente. El calendario no se actualiza automáticamente si el negocio cambia la reserva.” No incluye asistentes, correo del cliente o invitaciones externas.

WhatsApp conserva “Abrirás WhatsApp. Revisa y envía el mensaje allí; abrirlo no confirma tu reserva.” Mensaje: “Hola. Acabo de registrar una reserva en su página y quisiera consultar con ustedes.” Usar el [helper aprobado](../../apps/web/lib/whatsapp-link.ts), `https://wa.me/` fijo, `+` explícito y sin inferencia de país. Nunca teléfono privado del profesional, datos del cliente/cita, comprobante, popup automático ni afirmación de envío/entrega. La normalización más permisiva del teléfono del cliente no cambia esta elegibilidad.

Antes de enviar, un 404 elimina contenido editorial/medios y presenta estado neutro; no crea un resultado exitoso. Si el retiro se detecta después de una respuesta exitosa ya recibida, eliminar proyecciones públicas retiradas y acciones asociadas sin afirmar que la reserva fue cancelada: el retiro conserva reservas. Puede conservarse solo el reconocimiento de registro durante esa visita, sin reexponer el contenido retirado. Recargar o abrir un enlace no consulta el resultado por bookingId: hoy no existe ese contrato. D10 recomienda explicar esa limitación, sin persistir PII ni montar una ruta pública adivinable.

## 7. Casilla de cuenta mientras B2C no esté listo

**FIJADA: la casilla se mantiene visible; cuenta de cliente es requisito de Piloto 1.** No se propone ocultarla, eliminar el backend legacy o extender ese mecanismo como identidad futura. Nombre solicitado: “Crear cuenta para reservar más rápido”. La cuenta es voluntaria y la reserva invitada no exige correo/contraseña ni un paso adicional.

Propuesta conservadora D8 para **QA sintética solamente**: conservar el comportamiento secundario legacy existente, casilla desmarcada por defecto, con advertencia visible antes de marcarla: “Esta opción está en pruebas. Todavía no puedes consultar tus reservas ni reservar más rápido con una cuenta. Puedes continuar sin crearla.” Al marcar, correo requerido para cuenta y contraseña ≥8, validación antes de Revisar; desmarcar elimina contraseña y no envía password. Este texto reconoce la limitación; no presenta la cuenta como beneficio actual para un negocio real.

Después del alta, `accountCreated=true` solo permite “Se creó la cuenta de prueba. El acceso a tus reservas todavía no está disponible.” No decir “ya puedes iniciar sesión”, porque la web vigente usa Clerk y no acredita continuidad de esta identidad legacy. Si false/error: “Tu reserva quedó registrada. La cuenta no se creó; no necesitas repetir la reserva.” No mostrar EMAIL_ALREADY_EXISTS ni invitar a una ruta B2C inexistente. Fallo de reserva no muestra éxito de cuenta.

D8 ofrece mantener la operación QA actual o conservar casilla visible deshabilitada con explicación mientras se construye B2C; esta segunda opción necesita decisión expresa sobre su interacción y no se aplica aquí. La frontera comercial permanece cerrada en ambas: no aceptar credenciales reales para un beneficio que no puede usarse. No guardar una “intención de cuenta” o enviar createAccount=true sin los requisitos actuales; eso inventaría persistencia/contrato.

Antes de exponer la opción funcional a un negocio real deben estar listos y aprobados, en el módulo de cuenta:

1. Alta, entrada/salida, recuperación/verificación y revocación Clerk; migración/convivencia legacy definida, sin unión por coincidencia de correo.
2. Vínculo explícito Client.userId/claim por tenant y prueba de posesión; sin Membership CUSTOMER como autorización del historial ni acceso al panel.
3. Mis reservas, reservar otra vez y perfil funcionando; cancelación/reprogramación solo por sus etapas aprobadas, sin prometerlas antes.
4. Éxito de reserva separado de fallos de identidad/vínculo, sin duplicar Booking; continuidad de navegación y estados de recuperación reales.
5. QA de dos tenants, cambio de identidad, correo ya usado sin enumeración, revocación y móvil físico; copy y política de privacidad reales.
6. Gates/producto y autorización de apertura productiva independientes. Completar M1 no satisface ni autoriza esa apertura.

## 8. Estados y recuperación observables

El flujo distingue falta de capacidad, falta de disponibilidad, fallo de consulta y resultado incierto:

| Estado/trigger | Copy y recuperación | Regla observable |
| --- | --- | --- |
| Carga inicial/rango | “Cargando opciones…” / “Buscando días disponibles…” | Skeleton estable, aria-busy; no habilitar días ni CTA con datos de otra consulta |
| Sin catálogo | “Este negocio no tiene servicios disponibles para reservar en línea.” / “No hay profesionales disponibles por ahora.” | No inventar cards; regreso y contacto publicado si existe |
| Mes sin disponibilidad | “No hay horarios disponibles en este mes para tu selección.” | Cambiar mes/profesional/servicio; no prometer disponibilidad fuera del rango consultado |
| Día se agotó tras rango | “Ya no quedan horas para este día. Elige otro día.” | Limpiar hora, actualizar rango; seguir conservando contacto |
| Error GET/red/503 | “No pudimos cargar los horarios. Revisa tu conexión e inténtalo de nuevo.” | Reintentar misma consulta; no representarlo como ausencia de horarios |
| Fecha/contacto inválidos | “Revisa la fecha y la hora.” / “Escribe tu nombre.” / “Escribe un teléfono válido.” / “Revisa el correo.” | Error asociado al campo; foco al primer inválido; mantener datos |
| Slot ocupado, rechazo conocido | “Ese horario ya no está disponible. Elige otra hora.” | No etiquetar cualquier 409 como choque; reconsultar solo si causa corresponde a disponibilidad |
| Conflicto de contacto | “No pudimos registrar la reserva con esos datos. Revísalos o contacta al negocio.” | No revelar persona/correo existente; D11 debe neutralizar también HTTP antes de exposición real |
| Límite 429 | “Has hecho varios intentos. Espera un momento antes de continuar.” | No bucle de reintentos ni pérdida del formulario; respetar espera del servidor |
| Slug/página retirada/inactiva | “Esta página no está disponible. Revisa el enlace o comunícate directamente con el negocio.” | Mismo estado neutro, sin razones internas ni contenido previo; no formulario activo |
| Enviando | “Registrando tu reserva…” | Un POST por acción, CTA protegido; no nuevas selecciones durante esa escritura |
| Respuesta perdida/timeout/5xx tras POST | “No pudimos comprobar si la reserva se registró. Contacta al negocio antes de volver a intentarlo.” | No afirmar fracaso ni éxito, no repetir automáticamente; ver D10 |
| Creación PENDING exitosa | Título y estado de §6 | Solo después de respuesta real; el botón WhatsApp/calendario no cambia Booking |
| Foto ausente/error | Respaldo neutro con nombre | No bloquea servicio/profesional/éxito; 404 de proyección por retiro sí obliga revalidación |
| Cuenta secundaria fallida | Copy de §7 | Mantiene éxito de Booking, sin nuevo POST de reserva |

Errores inesperados pueden usar `ErrorText` y Código de soporte **solo si el API lo entregó**, conforme a F0-A. No registrar PII ni mostrar mensajes crudos/constraints. El reloj del dispositivo mal ajustado sigue como límite de F0-D: la zona correcta no lo corrige; no inventar reloj servidor nuevo en M1.

## 9. Contrato propuesto, arquitectura y abuso

### 9.1 Contratos existentes que se conservan

No cambia booking-data: minimumBookingDate y timeZone técnico de raíz; organización mínima del snapshot, catálogo activo y profesionales públicos. Tampoco media ni sus permisos/entrega. No se agregan foto en Service, teléfono profesional, organizationId, disponibilidad interna, correo privado o bancos a respuestas públicas.

Conservar `GET /public/:slug/availability?serviceId=…&date=…&professionalId=…`, omitiendo professionalId para cualquiera. Slots mantienen time, professionalId y startTime de H5. Consultar el día tras seleccionar fecha, y revalidarlo al regresar a revisión/foco; no fabricar slots por cadencia ni aceptar campo libre.

Conservar POST y respuesta vigente; no crear nuevos campos de pagos/estado/zona/tenant. Entrada: serviceId/professionalId UUID, startTime ISO con Z/offset, clientName obligatorio máximo 120, clientPhone obligatorio máximo 30 caracteres de entrada y normalizado a 7–15 dígitos, clientEmail opcional máximo 254, emailNotifications opcional con optedIn/noticeVersion aprobados, createAccount opcional y password condicional ≥8. Sin cuenta, omitir password. La UI actual restringe teléfono a dígitos y 11 caracteres; D9 recomienda aceptar la sintaxis internacional ya admitida por backend, sin inferir prefijo dominicano ni alterar normalización.

Respuesta existente: `booking:{id, serviceId, professionalId, startTime, endTime, status}`, `accountCreated`, `accountCreationError`. La foto/nombre se compone con proyecciones autorizadas, no se añade un objeto privado Booking/Client/User. El precio mostrado es catálogo vigente, no un campo retornado por POST. No enviar status ni endTime desde el visitante.

### 9.2 Nueva consulta de días: propuesta para C1, hoy inexistente

Nombre recomendado sujeto a aprobación D7: **`GET /public/:slug/availability-days`**. Es un endpoint nuevo propuesto, no un contrato aprobado ni ruta utilizable ahora. DTO propuesto:

| Campo de query | Regla propuesta |
| --- | --- |
| serviceId | UUID requerido, activo y del tenant resuelto por slug |
| professionalId | UUID opcional; si viene, ACTIVE/isPublic y del mismo tenant; omitir para cualquiera |
| from / to | Fechas reales YYYY-MM-DD, ambas requeridas, from ≤ to, rango inclusivo máximo 31 días civiles; no aceptar fecha anterior a minimumBookingDate. El frontend recorta el mes actual desde esa fecha |

Respuesta propuesta mínima: `{from: string, to: string, serviceId: string, availableDates: string[]}`. Fechas únicas/ascendentes y dentro del rango; `[]` significa ningún slot en ese rango, no indisponibilidad global. No devuelve cantidad de reservas, clientes, motivos, ventanas privadas, profesionales por día ni ocupación. `200` no mantiene huecos ni garantiza un POST posterior. `Cache-Control: no-store`.

Cálculo: resolver la misma organización/política pública, zona y catálogo; capturar un “ahora” para la consulta; convertir límites civiles con las utilidades aprobadas; leer contexto y reservas del rango con aislamiento tenant. Compartir la evaluación de slots del día y detener cada día al encontrar el primer slot válido. No invocar el endpoint HTTP 31 veces ni duplicar reglas de horario/DST/choques; no añadir un lector de horario semanal público como sustituto. Proponer una lectura coherente de contexto/reservas dentro de una transacción de lectura RepeatableRead; es requisito nuevo a probar en C1, no garantía afirmada del GET actual. El GET diario seguirá pudiendo observar cambios posteriores.

Debe coincidir `date ∈ availableDates` con `slots.length > 0` bajo el mismo estado/reloj: profesional específico o cualquiera, duración completa, horarios/cierres, bloques ACTIVE, choques no CANCELLED, cadencia, fecha mínima y reglas LEGACY_UNCONFIRMED/CONFIRMED vigentes. Con datos corruptos/dependencia caída, fallar de forma segura; no devolver [] como éxito. No cambiar elegibilidad ni reglas históricas para hacer cuadrar el calendario.

Límite propuesto del nuevo endpoint: 30 solicitudes/minuto por IP/ruta con el almacenamiento PostgreSQL compartido; un rango ≤31 días por llamada. La tarifa exacta y presupuesto de trabajo requieren prueba sintética C1: variar duración, cantidad de profesionales y bloques; consultar por rango en conjunto, no una consulta DB por cada slot. Sin carga acreditada no autorizar tráfico real. No truncar una lista a escondidas ni devolver disponibilidad incompleta como completa. Revisar proxy confiable/429/reinicio y dos réplicas en el ensayo autorizado; no modificar infraestructura aquí.

Errores propuestos: 400 para formato/rango/selección no válidos, sin revelar si un recurso pertenece a otro tenant; 404 neutro con las mismas condiciones de retiro/cierre; 429 con espera útil; 503 genérico para cálculo/dependencia. No introduce 409 para lectura. Fechas malformadas se rechazan antes de consultas operativas, manteniendo la frontera H5 tras resolver slug. Contratos de errores del POST existentes solo se neutralizan si D11 recibe aprobación; no confundir esa propuesta con un cambio ya vigente.

### 9.3 Persistencia, compatibilidad y límites de seguridad

La propuesta mínima de días no requiere modelo Prisma, migración, proveedor ni dependencia nuevos. Reutiliza BusinessSchedule, horarios individuales, bloqueos, Service, Professional y Booking. El calendario local se puede exportar desde el resultado sin persistencia/API nueva. Medición de §11 queda diseñada, sin tablas/SDK/endpoints de eventos implementados.

La ruta web es aditiva: `/{slug}` conserva slug/contenido y su CTA cambia de destino en C2 autorizado. Abrir directamente `/{slug}/reservar` obliga a consultar publicación, no confía en haber venido del mini-sitio. Revalidar al foco, antes de iniciar y antes de registrar; el POST sigue como autoridad bajo lock. Claves de rango incluirán slug/servicio/profesional/from/to; invalidar rango y día tras alta exitosa. Ignorar/cancelar respuestas de visitas anteriores y eliminar proyección al 404. No compartir estado con dashboard, añadir cache backend o usar catálogo persistente de otra visita.

Rollback futuro: retirar el consumidor nuevo y restablecer CTA/asistente conocido preservando H5/F0-D; la consulta de días aditiva puede quedar sin consumidores o retirarse después. No borrar reservas/CMS/medios/identidades ni migrar datos. D11 requiere actualizar contrato y consumidores si se cambia salida de errores. D10-B, si se eligiera, sí podría exigir modelo/retención para recibos; queda fuera de la propuesta mínima y no se asume autorizado.

| Amenaza | Evidencia, medida y riesgo residual |
| --- | --- |
| Reservas spam que llenan la agenda | POST 5/min compartido limita una IP; bots distribuidos pueden ocupar slots PENDING. No hay expiración automática/CAPTCHA/posesión del contacto garantizada en este recorrido. Mantener límites, alertas sin PII y pruebas; D12 ofrece endurecimiento separado. No crear auto-cancelación o bloqueo por contacto sin decisión |
| Enumeración de tenants/IDs/contactos | Slug publicado es localizador intencional; IDs de selección se validan tenant-scoped. Ausente/ajeno deben compartir respuesta; errores de contactos/identidad legacy son riesgo real D11. Nunca endpoint de historial por email, teléfono o bookingId público |
| Agotamiento con calendario mensual | Rango finito, rate limit compartido, carga de contexto en conjunto y cálculo acotado. Falta medir coste real; no hacer prefetch de todos los meses ni sondeo por día en C2 |
| Slot obsoleto/doble creación | Revalidación de GET reduce ventana; transacción/locks/exclusión protegen escritura. No es retención ni idempotencia de petición; fallo incierto requiere D10, no reintento automático |
| Cruce de tenant o contenido retirado | Resolver slug en servidor, validar todos los IDs, queries por slug/selección/visita, 404 retira proyecciones, imagen vuelve a verificar publicación. Probar A → B → A y respuestas tardías |
| Fuga de PII/credenciales | Borrador en memoria, respuestas mínimas, sin URL/logs/analítica. Cuenta legacy no verifica vínculo B2C ni debe usarse con clientes reales antes del módulo siguiente |
| Foto no aprobada/enlace peligroso | Solo proyección elegible/localizador del mismo origen; metadata publicada, no URL cruda legacy ni borrador. Maps desde snapshot validado, WhatsApp con dominio/texto fijos |
| Promesa de confirmación/pago/entrega | Estado PENDING leído del resultado; calendario TENTATIVE; correo/WhatsApp no acreditan entrega. Ningún Payment/Invoice por reservar |

## 10. Decisiones FIJADAS y decisiones abiertas

FIJADA significa elegida anteriormente por el propietario, no aprobación de esta entrega ni autorización de implementación. Las alternativas descartadas se registran para explicar consecuencias; no reabren la decisión. Para las abiertas, “Recomiendo” sigue siendo una propuesta.

| ID / estado | Opciones, pros y contras | Selección o recomendación y origen |
| --- | --- | --- |
| **D1 FIJADA**, ruta | A `/{slug}/reservar`: contexto claro; exige retorno, enlace directo y revalidación. B embebida: menos navegación; conserva la fricción reportada | **A**, C0-E/D1 técnico adoptado por decisión 13 y solicitud M1 |
| **D2 FIJADA**, estado/éxito | A rediseño total con PENDING/registrada: honesto y útil; necesita más composición. B decir confirmada/pagada: texto corto; representa estados falsos | **A**, decisiones 7 y 13/C0-E D3; sin nuevo estado Booking |
| **D3 FIJADA**, selector | A calendario + hora compacta con disponibilidad real: cumple preferencia; falta consulta de días. B cuadrícula extendida/hora libre: reutiliza UI; contradice decisión | **A**, decisión 6; el panel comparte intención de patrón, pero su implementación está fuera de M1 |
| **D4 FIJADA**, cuenta y privacidad | A mantener casilla y continuidad Clerk/claim explícito: respeta visión y seguridad; depende del siguiente módulo. B ocultar o extender identidad por email/password local: reduce trabajo inmediato; incumple decisiones/aislamiento | **A**, decisión 2 y 13/C0-A D1–D4. Mis reservas por Client vinculado/tenant, ver/repetir primero, autoservicio por etapas y sin unión por correo |
| **D5 ABIERTA**, cualquiera y profesional único | A mantener cualquiera con candidato del slot visible antes del POST, preselección explícita si solo hay uno: menos fricción, reutiliza contrato; sesgo al primer nombre, sin reparto justo. B elección nominal siempre: mayor control; fuerza elección a quien no tiene preferencia | Recomiendo **A**; no cambiar algoritmo, desempate, vínculos ProfessionalService ni sustituir profesional silenciosamente |
| **D6 ABIERTA**, composición de días | A calendario inline con solo fechas disponibles y espacios vacíos + lista equivalente: cumple literalidad y evita overlays; mes incompleto necesita leyenda. B mismo calendario con números no disponibles deshabilitados: mejor orientación; interpreta “solo” como solo seleccionables y necesita aceptación expresa | Recomiendo **A**. Hora select junto al calendario en ambas; ninguna opción admite campo libre o cuadrícula extensa |
| **D7 ABIERTA**, consulta por rango | A endpoint aditivo availability-days ≤31 días y slots del día existente: eficiente y mínimo; requiere C1. B 28–31 GET diarios desde web: reutiliza rutas; puede agotar 30/min y produce resultados parciales/carreras | Recomiendo **A**; probar presupuesto antes de fijar límite operativo; no inventar horizonte global de reservas que hoy no existe |
| **D8 ABIERTA**, interacción de cuenta en QA | A conservar casilla operativa legacy con advertencia y copy secundarios de §7: preserva recorrido sintético; aún crea identidad sin continuidad. B visible deshabilitada con explicación: evita captar credenciales sin utilidad; requiere decisión explícita sobre interacción | Recomiendo **A solo QA**, continuidad futura Clerk FIJADA. Ambas impiden ofrecer beneficio a un negocio real antes de M2 y apertura autorizada; no ocultar casilla |
| **D9 ABIERTA**, contacto en móvil | A campo tel que acepte formato internacional ya admitido por API (7–15 dígitos normalizados, máximo entrada 30): evita truncar extranjeros; requiere alinear validación cliente sin inferir país. B conservar 11 dígitos locales: menos cambio; no cubre todo el contrato actual | Recomiendo **A**, nombre/teléfono obligatorios y correo opcional; cuenta/avisos mantienen condiciones existentes |
| **D10 ABIERTA**, recibo y resultado incierto | A éxito en memoria + calendario local opcional y canal público para consultar incertidumbre: no amplía lectura pública/persistencia; recarga pierde detalle y no permite comprobar timeout automáticamente. B recibo opaco seguro/idempotencia y recuperación: mayor continuidad; nuevo contrato/modelo/retención/amenazas | Recomiendo **A para M1** y diseñar B en módulo propio si se requiere. Sin contacto publicado, informar incertidumbre y volver al mini-sitio; no ofrecer reintentar a ciegas |
| **D11 ABIERTA**, errores públicos de contactos | A neutralizar HTTP de colisiones con texto seguro, conservando semántica/resultado de reserva: reduce enumeración; requiere aprobación del cambio contractual y regresiones C1. B solo copy cliente: menos cambio; atacante sigue leyendo HTTP revelador | Recomiendo **A** para la frontera pública; la enumeración global legacy se resuelve junto a cuenta, sin reescribir identidad en M1. No autorizar producción con B como única mitigación |
| **D12 ABIERTA**, abuso adicional | A preservar controles compartidos, medir/alertar y condicionar exposición real a evaluación: conserva contratos; no detiene bots distribuidos. B reto adicional o verificación de contacto antes de alta: puede reducir spam; integra dependencia/PII, añade fricción y exige C0 específico | Recomiendo **A en QA**, definir criterio de apertura con datos del ensayo y módulo de cuenta; no afirmar defensa suficiente ni activar B por inferencia |
| **D13 ABIERTA**, medición | A aprobar diseño de embudo agregado, sin instrumentar en M1: minimiza datos; no entrega métricas todavía. B instrumentar eventos por sesión sin identidad: permite abandono por paso; necesita autorización, retención y custodia verificables | Recomiendo **A ahora** y B solo tras diseño de §11 aprobado; no números de conversión inventados |
| **D14 FIJADA**, límites cerrados | A conservar H5/F0, fotos elegibles, WhatsApp visitante→negocio y separar Pagos: preserva seguridad/contratos; requiere coordinación futura. B reabrir zona, teléfonos, fotos/arbitrar pagos al rediseñar: atajos aparentes; contradice cierres y alcance | **A**, solicitud M1, decisiones 3/5/10/14 y contratos aprobados. Contraseña ≥8, campos ≥16 px y Profesional ya resueltos |

No se decide por cuenta propia una ampliación contraria a contratos cerrados: precios sellados, recuperación pública/idempotencia, HTTP legacy de cuenta, política de spam y variante B de D6 quedan detenidos en su frontera. Se pueden revisar estas opciones sin autorizar implementación.

## 11. Conversión y medición sin datos personales

La conversión objetivo de M1 es **respuesta de reserva creada**, no confirmación operativa, cuenta creada, pago o mensaje enviado. Señales de confianza: identidad publicada del negocio, servicio con precio/duración reales, fotos elegibles, profesional concreto antes de enviar, fecha natural, ubicación/contacto si existen y explicación de pendiente. No inventar reseñas, demanda, “últimos cupos”, sellos de seguridad, tiempo de respuesta o tasas de mejora.

Evitar otro paso obligatorio para cuenta/pago y datos repetidos. Cuenta queda dentro de Tus datos; no exigir correo para reserva invitada ni afiliación al panel. Las elecciones tienen resumen y Editar; escoger cualquiera no añade luego un paso nominal. Hipótesis para evaluar: la composición compacta reduce errores al elegir horario; fotos/contexto y PENDING explícito reducen dudas. Son hipótesis, sin incremento numérico atribuido.

Diseño de eventos **propuesto, no existente**:

| Evento allowlist | Hecho medido |
| --- | --- |
| public_page_view / booking_start | Página disponible e inicio de visita de reserva |
| service_selected / professional_choice | Elección válida; profesional_choice solo tipo `specific`/`any`, sin nombre/ID personal |
| availability_range_loaded / slot_selected | Rango consultado con éxito y selección de un slot, sin fecha/hora concreta registrada |
| contact_step_completed / review_viewed | Validación local y revisión, sin contenido de campos |
| booking_submit / booking_created | Intento y respuesta exitosa real; status agregado PENDING, sin bookingId/clientId |
| booking_error / availability_error / retry_read | Clase segura `validation`, `conflict`, `rate_limit`, `network`, `unavailable`, `unexpected`; sin mensaje/body/request-id |

Para estimar embudo sin conservar PII, proponer conteos agregados por negocio y día, y por paso/dispositivo amplio móvil/escritorio. Si se necesita deduplicación/secuencia, un contador efímero de visita en memoria puede emitir una vez por etapa; no usar fingerprint ni identificador persistente de usuario. Aceptar que recarga y bloqueo producen conteos aproximados. Un ID de sesión seudónimo almacenado puede seguir siendo dato personal: **no llamarlo anónimo** ni usarlo en la opción A. La alternativa B de D13 debe justificarlo/autorizarlo aparte.

Allowlist de payload futura: código técnico del negocio resuelto en servidor, nombre de evento cerrado, día agregado, tipo amplio de dispositivo y clase de resultado. Excluir IP cruda, user-agent completo, referrer/URL/query, IDs de reserva/cliente/usuario/profesional, nombre, teléfono, correo, contraseña, notas, imágenes, tiempo exacto de cita o texto libre. Logs operativos/proxy pueden tener datos de red aunque el evento no los guarde: revisar custodia/retención antes de afirmar medición anónima de extremo a extremo. No mezclar claves HMAC del limitador con analítica.

Métricas propuestas: booking_created / booking_start; paso siguiente / paso anterior; conflictos / intentos; errores de disponibilidad / lecturas; reintentos recuperados / fallos de lectura. Contar reserva creada una sola vez ante render repetido; separar fallo de cuenta del fallo de Booking. Sin instrumentación y línea base no se calculan abandono ni objetivo porcentual. Propuesta de retención: solo agregados durante 30 días, acceso OWNER/ADMIN a su tenant cuando exista contrato, sin eventos individuales persistidos; retención/acceso siguen por aprobar en D13. No grabaciones, mapas de calor de formularios o envío a proveedor externo por defecto.

## 12. Criterios de aceptación y plan de QA futuro

Estos criterios son verificables después de implementación autorizada; no se marcan aprobados por esta entrega documental:

| ID | Criterio observable | Evidencia requerida |
| --- | --- | --- |
| A01 | CTA abre `/{slug}/reservar`; carga directa y regreso conservan negocio y revalidación; página retirada no deja asistente activo | Navegador + requests reales en dos slugs; retiro antes de inicio y durante revisión |
| A02 | Progreso muestra servicio/profesional/fecha-hora/datos/revisar; no aparece paso de pago ni cuenta obligatoria separada | Recorrido invitado y optado en desktop/móvil |
| A03 | Servicio y profesional muestran solo fotos publicadas elegibles; ausente/error usa respaldo limpio | Lectura de media/imagen real, estados publicado/retirado/cuarentena y catálogo inactivo/privado |
| A04 | Solo días con slots se ofrecen; hora compacta ofrece exactamente slots del día; no input libre/cuadrícula extensa | Comparación HTTP rango/día bajo fixtures controlados; captura del selector cerrado/abierto |
| A05 | Cualquiera resuelve profesional del slot y lo muestra antes del POST; específico nunca cambia a otro | Requests y revisión/resultado en dos profesionales, mismo horario y conflicto posterior |
| A06 | Horarios, duración/cierres/bloqueos/choques y fecha mínima coinciden con backend; POST conserva startTime recibido | Contrato, caso largo sin hueco, cambio de día/zona/DST y POST observado |
| A07 | Contraseña <8 bloquea antes de revisar solo si opta; campos ≥16 px en móvil; Profesional conserva código/permisos | Regresión F0 aplicable, tamaño calculado y Safari físico; sin reimplementar correctivos |
| A08 | Contacto mínimo, correo/avisos/cuenta voluntarios; errores preservan datos de la visita y no filtran existencia | Caso inválido/409/429/503, inspección de respuestas y payloads sin PII en evidencia compartida |
| A09 | POST exitoso genera PENDING; éxito tiene estado, fotos/respaldo, fecha natural y próximos pasos honestos | Registro sintético verificado por personal; captura con encabezado/foco y respuesta real |
| A10 | WhatsApp/calendario/Maps cumplen condiciones; clic no vuelve a crear ni confirmar/cobrar/enviar automáticamente | URL helper y apertura física WhatsApp; archivo local TENTATIVE, instantes, Maps publicado y ausencia cuando faltan datos |
| A11 | Cuenta secundaria fallida no oculta Booking creada ni propone nueva reserva; QA advierte falta de continuidad | Caso legado permitido/error controlado, solo identidades sintéticas; cero promesas de Mis reservas |
| A12 | Dos altas concurrentes al mismo slot no crean solapamiento; timeout no dispara reintento automático | PostgreSQL/HTTP aislados y navegador con respuesta retenida; estado incierto observable |
| A13 | Cambios de slug/selección/visita y A → B → A descartan resultados tardíos/PII; 404 retira contenido | Navegación y latencia controlada sobre consumidores reales |
| A14 | Foco/labels/lector de pantalla, teclado, zoom 200 %, errores/estados y responsive sin overflow/CTA tapado | Chrome/Firefox escritorio, VoiceOver Safari y TalkBack Chrome físicos; mediciones/capturas |
| A15 | No aparecen PII/secretos en URLs/logs/capturas de evidencia/eventos; no se altera tenant/roles/producción | Inspección de allowlists/red/consola/diff, controles backend y entorno QA explícito |

### Preparación segura y matriz funcional

Usar dos negocios **sintéticos nuevos o dedicados y autorizados** en QA, denominados aquí “M1 QA Norte” y “M1 QA Sur”; esos nombres son planificación, no filas creadas. No reutilizar ni limpiar los cambios gestionados por el propietario en los tenants de QA existentes. Preparar fixtures solo en C1/C3 autorizado con inventario y restauración acordada; ningún dato real ni escritura productiva.

Norte: semana confirmada, dos profesionales públicos, servicios de distinta duración, fotos publicadas y contacto/Maps elegibles. Sur: horario distinto, sin foto/contacto/mapa, profesional privado/inactivo además de uno público, día totalmente cerrado y un bloqueo con nota sintética privada. Ensayo aislado adicional con zona distinta al dispositivo y transiciones de reloj si hace falta; no cambiar zona de un tenant con dependencias operativas. Todos los contactos/usuarios son sintéticos o destinos de QA expresamente aportados para prueba física; no enviar mensajes externos sin autorización.

| Grupo | Casos que deben registrarse en C1/C3 |
| --- | --- |
| Contrato C1 | Rango 1/28/29/30/31 y >31 días, from>to, bisiesto/imposible, profesional/servicio ajeno e inexistente, campos extra, cierre flag/CMS/inactivo; cabeceras no-store y allowlist |
| Disponibilidad real | Día abierto sin hueco por duración, pausa, cierre total/parcial, herencia/turno propio, bloque ACTIVE/CANCELLED, Booking CANCELLED y demás estados; horario agotado hoy; concordancia rango/día sin cambios concurrentes |
| Carreras PostgreSQL | Dos APIs simultáneas, alta/retirada/cambio de horario, nuevo bloqueo, tiempo ocupado entre rango/día/POST; integridad Client/Booking/outbox y ausencia de efectos tras rollback |
| Abuso/privacidad | 429 compartido entre réplicas/reinicio/IP normalizada y fallo cerrado 503; colisiones de contactos e identidad, IDOR, notas/motivos/PII ausentes; coste del máximo rango con equipo/bloques sintéticos |
| Recorrido público | Entrada/enlace directo, específico/cualquiera, regresar/editar, éxito, recargar, ir al fondo/volver, medianoche, retirar/republicar, datos/fotos ausentes, error de medios y datos, conflicto de hora, cuenta secundaria y POST incierto |
| Personal, sin rediseñar panel | OWNER/ADMIN/RECEPTIONIST comprueban nueva reserva en el tenant correcto; Profesional ve solo propia; intento ajeno/CUSTOMER no concede panel. Usar contratos actuales, no añadir permisos |
| Dispositivos y accesibilidad | Desktop 1280/1440, emulación 320/375/390/768, teléfono real iPhone/Safari y Android/Chrome, vertical/horizontal; teclado abierto, barras del navegador, safe areas, pinch/200 %, foco/Escape/lista alternativa y lectores |
| Acciones de éxito | Archivo calendario importado muestra hora del negocio como instante correcto y pendiente; Maps con y sin URL; WhatsApp destinos sintéticos aprobados, mensaje exacto, popup bloqueado y reintento manual sin POST |

C1 futuro: tipos/lint/tests/build API con exit 0, HTTP y PostgreSQL aislados para concurrencia/aislamiento/rate limit; aprobación explícita del backend antes del consumidor. C2 futuro: tipos limpios/lint/tests pertinentes/build web con exit 0 y aprobación propia. C3: navegador con API/QA real, dos negocios y teléfonos físicos, aprobación final; emulación no acredita Safari físico ni recepción externa. No instalar dependencias si no cambian.

Cada evidencia indicará release/SHA web y API, entorno, slug sintético, rol, dispositivo/navegador, acción, respuesta segura y resultado. Mantener capturas/logs sin contacto/contraseña/token o razones privadas; fallos de red esperados se distinguen de errores de consola inesperados. Una compilación limpia no prueba disponibilidad, UX o autorización.

## 13. Validación documental y siguiente gate

Esta entrega solo hizo lecturas de Git/código/Markdown, inspección de dos imágenes y consulta de guías oficiales. `rg` no pudo iniciarse en este Windows; se usaron `Get-ChildItem` y `Select-String`. El buscador de UI/UX sí terminó con exit 0 usando el runtime incluido. No se ejecutaron API, web, pruebas de producto, SQL, migraciones, envíos ni accesos a QA/producción. El plan anterior permanece **pendiente**, sin atribuir resultados históricos de F0 a M1.

Revisión completada: enlaces locales y destino semántico, cobertura A01–A15/D1–D14, estados/contradicciones y diff completo de los tres controles; el archivo nuevo se leyó íntegro tras escribirlo. La inspección de Git limita los cambios exactamente a los cuatro Markdown autorizados. No se actualiza BACKEND_CHANGES porque el contrato nuevo permanece propuesto, no vigente.

| Comando/control documental | Resultado observado |
| --- | --- |
| `git branch --show-current`, `git rev-parse HEAD`, `git status` | Exit 0; ai/antigravity-qa y `ad90bf52890ea2e2ba309ad5a87d1dcafcdde9f7` conservados; tres controles modificados, C0 nuevo y cero staging |
| `git diff --check` | Exit 0, sin errores; aviso informativo LF→CRLF por política Git del checkout |
| `git diff --stat`, `git diff --numstat`, `git diff --cached --stat`, `git diff` de controles | Exit 0; nueve líneas añadidas a tres archivos, índice vacío, sin cambios fuera de documentación. El stat ordinario excluye el nuevo archivo no rastreado |
| Verificador Python de enlaces/cobertura/rutas/índice | Exit 0; 253 enlaces locales existentes sin rotos, D1–D14 y A01–A15 presentes, solo cuatro rutas esperadas e índice vacío |
| Verificador Python de espacios/salto final del C0 nuevo | Exit 0; ninguna línea con espacios finales y newline final presente |
| `git diff --no-index --check -- NUL docs/quality/RESERVA_PUBLICA_M1_C0.md` | Exit 1 de comparación con archivo vacío, sin diagnóstico de espacios; no se cuenta como validación aprobada. El archivo nuevo se valida por la lectura completa y el verificador Python anterior |
| Inspección de cabecera PNG | Exit 0; dimensiones de ambas capturas coinciden con las indicadas en §1 |

Estado final: `CHANGELOG.md`, `PROJECT_MASTER.md` y `docs/README.md` modificados; `docs/quality/RESERVA_PUBLICA_M1_C0.md` nuevo sin rastrear; todo sin staging, HEAD sin cambios. Sin publicación, no se verifica un SHA remoto nuevo ni el entorno productivo como si hubiera ocurrido un despliegue. Producción no fue accedida ni modificada y su cierre documentado sigue vigente.

**M1 necesita C1; no puede pasar directo a C2.** Falta availability-days y su contrato/seguridad/prueba de coherencia con slots reales. El siguiente paso es que el propietario revise C0 y resuelva D5–D13; después, autorizar C1 acotado. Si exige recuperar recibos o fijar precios, definir esa ampliación antes de backend. Con C1 validado y aprobado, C2 podrá consumir el contrato para ruta, fotos, selector, copy y éxito. Cuenta/Pagos/editor/calendario del panel conservan sus módulos; producción sigue cerrada y no hay autorización de publicación por esta entrega.
