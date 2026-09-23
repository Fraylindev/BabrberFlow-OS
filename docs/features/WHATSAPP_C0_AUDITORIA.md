# WhatsApp manual — C0: auditoría y propuesta de contrato

Nota posterior 2026-09-14: el propietario fijó D1–D6 en A, aprobó el [contrato C1](WHATSAPP_C1_CONTRATO.md) sobre `c7d43ad03a65a900a930a1a0d69dd258b8516a1e` y autorizó [C2 frontend](WHATSAPP_C2_FRONTEND.md). Las opciones abiertas y restricciones de autorización del cuerpo siguiente son históricas de C0. C1 conserva endpoints y respuestas; C2 tiene evidencia y estado propios, sin habilitar producción ni otro módulo.

Fecha: 2026-09-14. Estado: **C0 DOCUMENTADO / EN REVISIÓN DEL PROPIETARIO**. D1–D6 siguen abiertas. La autorización comprende auditoría y documentación; no aprueba opciones, contrato ni implementación.

## 1. Identificación, base y método

- Módulo: WhatsApp manual, conforme a la sección 3 del [roadmap posterior a CMS](ROADMAP_POST_CMS_AUDITORIA.md).
- Base funcional auditada: `8fd7b1ff9f14ad82bde3d3936817941660983b2c`. HEAD: `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`, cuyo cambio respecto a esa base es exclusivamente documental. Rama: `ai/antigravity-qa`.
- Propietario de las decisiones: propietario de Kortek Booking. Autoriza iniciar C0 y posteriormente guardar este documento; no ha elegido D1–D6.
- Método: lectura estática de código, schema, contratos, consumidores y pruebas existentes. Sin base de datos, aplicaciones, envíos, pruebas funcionales ni QA visual nuevos.
- Gobierno: [gates](../quality/DELIVERY_GATES.md), [seguridad](../quality/SECURITY_STANDARD.md), [plantilla de brief](FEATURE_BRIEF_TEMPLATE.md) y skills kortek-delivery/kortek-product-ui ya leídas en esta sesión.

Configuración/CMS C1–C3 y H5/fechas permanecen **CERRADOS / APROBADOS**. Esta entrega no toca su código, estados de Booking, Analytics, Resumen, Supabase ni otros módulos.

Al guardar el documento, el árbol contiene la documentación local de la auditoría anterior y cambios de backend preexistentes en `apps/api/src/public-booking/public-booking.service.ts`, `whatsapp-action.ts` y `whatsapp-action.spec.ts`. Se preservan y se aíslan de esta entrega. Los hallazgos siguientes corresponden a la base auditada; este documento no verifica ni aprueba esa implementación local posterior. Los enlaces al código indican las superficies examinadas y deben interpretarse con esa base, no como certificación del árbol modificado.

## 2. Usuario, problema y comportamiento comprobado

La capacidad existente es **visitante → negocio**. El resultado buscado es que quien acaba de registrar una reserva pueda abrir voluntariamente una conversación con el negocio correcto, sin confundir registro, confirmación, apertura y envío.

| Superficie | Comportamiento de la base auditada | Problema |
| --- | --- | --- |
| [PublicMiniSite](../../apps/web/components/public/PublicMiniSite.tsx) | Tras crear la reserva intenta `window.open` hacia el teléfono del negocio con nombre del cliente, servicio, fecha y hora | El mensaje está redactado como si el negocio hablara al cliente; apertura automática y datos personales en URL externa |
| [SuccessView](../../apps/web/app/%5Bslug%5D/_components/SuccessView.tsx) | Ofrece «Abrir WhatsApp» hacia el negocio con otro texto | Composición duplicada; muestra «cita confirmada» sin comprobar el estado recibido |
| [waLink](../../apps/web/app/%5Bslug%5D/_components/shared.tsx) | Elimina cualquier carácter no numérico y acepta el resultado si quedan dígitos; construye `https://wa.me/` fijo | No distingue teléfono nacional, internacional, extensión ni caracteres inválidos |
| [PublicBookingService](../../apps/api/src/public-booking/public-booking.service.ts) y [tipo público web](../../apps/web/lib/api.ts) | API entrega `whatsappBaseUrl`; tipo/helper web no lo consumen. Nombre/teléfono proceden del snapshot publicado | Fuente configurable sin efecto en el consumidor actual |
| [BookingsService](../../apps/api/src/bookings/bookings.service.ts) y [schema](../../apps/api/prisma/schema.prisma) | Creación sin estado explícito aplica default `PENDING`; respuesta incluye `booking.status` | «Confirmada» no describe el estado creado |

No existe en la base auditada envío por servidor, confirmación de entrega, editor de plantillas ni acción operativa personal → cliente. El campo configurable conservado por `/auth/invite` legacy tampoco demuestra una integración operativa de Equipo.

**H8 reconciliado:** existe apertura pública legacy de WhatsApp. Sigue siendo futura la capacidad operativa con plantillas editables. El API configurable y el dominio fijo del consumidor son una divergencia técnica pendiente de decisión, no una integración ya unificada.

## 3. Decisiones abiertas para el propietario

Las recomendaciones son propuestas. Ninguna opción queda aprobada por este documento ni por la autorización de C0.

### D1. Alcance de la primera entrega

| Opción | Consecuencia |
| --- | --- |
| **A — Solo visitante → negocio. Recomendada.** | Unifica las acciones existentes con contacto publicado; no incorpora teléfonos de clientes ni permisos operativos |
| B — Añadir personal → cliente | Requiere matriz de operadores, autorización por reserva, alcance propio BARBER y tratamiento de teléfonos de clientes; aumenta contrato y QA |

No se encontró una necesidad de negocio documentada que justifique B ahora. OWNER/ADMIN editan CMS y solo OWNER publica; esos permisos no conceden por inferencia facultades de mensajería a clientes. Si se elige B, sus permisos deben resolverse antes de aprobar contrato.

### D2. Fuente y validez del teléfono

Fuente propuesta: únicamente `organization.phone` recibido desde el snapshot CMS publicado. Sin fallback al teléfono operativo, al de un profesional o al contacto comercial de Kortek.

| Opción | Consecuencia |
| --- | --- |
| **A — Exigir indicación internacional explícita mediante `+`. Recomendada.** | Tras normalización controlada, aceptar `+` seguido de 7–15 dígitos, comenzando por un dígito distinto de cero; números ambiguos no habilitan WhatsApp |
| B — Admitir también números sin `+` declarados internacionalmente completos | Conserva más teléfonos legacy, pero el dato actual no distingue un número internacional de uno nacional; requiere aceptar esa limitación o definir una declaración de formato posterior |

Para A, la normalización permitiría espacios, paréntesis, puntos y guiones; rechazaría letras, extensiones, varios signos `+` y otros caracteres. No inferiría país por idioma, navegador o zona del negocio, ni convertiría automáticamente prefijos `00`. Al construir la URL se retiraría el `+` y se usarían únicamente los dígitos validados.

El intervalo de 7–15 dígitos es un filtro sintáctico propuesto, compatible en longitud con el contrato CMS; no es una validación completa de planes nacionales. **No verifica que el código de país, número o cuenta WhatsApp existan.** WhatsApp requiere un teléfono completo en formato internacional para el enlace: [documentación oficial](https://faq.whatsapp.com/5913398998672934/?locale=es_LA), consultada durante esta auditoría el 2026-09-14. No se proponen consultas ni envíos automáticos para comprobar cuentas.

La validación se aplicaría a la acción WhatsApp, sin cambiar el [contrato de guardado CMS](../../apps/api/src/cms/cms.dto.ts), los datos existentes ni el enlace de llamada. Un teléfono válido para contacto podría seguir sin ser apto para esta acción. Los teléfonos sin `+` quedarían sin botón bajo A: esa reducción de elegibilidad es una consecuencia explícita que debe aceptar el propietario, no una migración automática.

### D3. Dominio fijo o configurable

| Opción | Consecuencia |
| --- | --- |
| **A — Fijar `https://wa.me/` como destino de esta acción. Recomendada.** | Reduce destinos externos posibles; documenta `whatsappBaseUrl` como campo legacy no utilizado por esta acción, sin modificar backend |
| B — Consumir `whatsappBaseUrl` | Requiere incorporarlo al tipo web y aprobar una lista explícita de destinos permitidos; configuración inválida deshabilita la acción, sin navegar a una URL arbitraria |

Con A no se eliminarían todavía el campo API ni la variable: también existen en compatibilidad legacy. Su retirada exige inventario de consumidores y autorización de cambio contractual. A resuelve qué fuente manda en esta acción, aunque conserva temporalmente esa deuda de compatibilidad. Si se elige B, los destinos permitidos y su validación deben quedar fijados antes del contrato final; configurar una URL no la convierte en confiable.

### D4. Dirección y contenido del mensaje

Ambas entradas deben representar al **visitante escribiendo al negocio**.

| Opción | Texto y consecuencia |
| --- | --- |
| **A — Mensaje genérico sin datos de la reserva. Recomendada.** | «Hola. Acabo de registrar una reserva en su página y quisiera consultar con ustedes.» Evita nombre, servicio, fecha, teléfono del cliente e identificadores |
| B — Añadir servicio, fecha y hora | Facilita identificar la cita, pero transmite detalles de reserva mediante URL externa; necesita mostrar el texto antes de abrir y una elección explícita del visitante |

En ambas opciones: sin notas, correo, contraseñas, UUID ni afirmaciones de envío. La primera entrega no incluiría plantillas administrables. La persona completaría o editaría el mensaje en WhatsApp antes de enviarlo. B necesita aprobar el texto exacto y su presentación antes de implementación; no puede usar la zona del navegador para reconstruir la hora de la reserva.

### D5. Lenguaje y estado real

| Opción | Consecuencia |
| --- | --- |
| **A — «Tu reserva quedó registrada». Recomendada.** | Describe creación exitosa sin afirmar confirmación operativa; conserva `PENDING` |
| B — Texto según `booking.status` | `PENDING`: «Reserva registrada, pendiente de confirmación». `CONFIRMED`: «Reserva confirmada». Requiere definir mensajes para los demás estados y valores inesperados |

A evita introducir una promesa sobre cómo o cuándo confirmará el negocio. Ninguna opción modifica transiciones ni convierte WhatsApp en confirmación. Cambiar el estado real necesita una decisión expresa distinta del propietario y permanece fuera de este contrato propuesto.

### D6. Apertura y recuperación

| Opción | Consecuencia |
| --- | --- |
| **A — Un único enlace por clic, en pestaña nueva. Recomendada.** | Elimina el intento automático después de la petición; conserva visible el resultado de reserva |
| B — Un único enlace por clic, en la misma pestaña | Simplifica navegación, pero el visitante abandona la pantalla del resultado |

Se desaconseja mantener la apertura automática: depende del navegador y lleva datos fuera de Kortek sin una acción específica de contacto. Texto auxiliar propuesto: «Abrirás WhatsApp. Revisa y envía el mensaje allí; abrirlo no confirma tu reserva.»

Para A se propone un enlace con `target="_blank"` y `rel="noopener noreferrer"`, nombre accesible «Abrir WhatsApp» y sin controles interactivos anidados. No se promete detectar si se abrió una aplicación, existe una cuenta o se entregó un mensaje. Si la navegación falla, la reserva permanece registrada; nunca se reintenta crearla como recuperación del enlace.

## 4. Propuesta de contrato condicionada a D1–D6

La combinación recomendada es **D1-A, D2-A, D3-A, D4-A, D5-A, D6-A**. El contrato siguiente describe esa combinación; no afirma aprobación ni cubre automáticamente las alternativas B.

| Elemento | Contrato propuesto |
| --- | --- |
| Usuario | Visitante que acaba de registrar una reserva |
| Destinatario | Teléfono publicado del negocio actual, validado para esta acción |
| Entradas | Teléfono público y resultado exitoso de creación; mensaje genérico constante |
| Salida | Enlace HTTPS a `wa.me` con teléfono internacional sin `+` y texto codificado, o ausencia de enlace si no cumple validación |
| Efectos | Navegación externa exclusivamente por clic; ninguna escritura, envío, cambio de estado o confirmación de entrega |
| API y tipos públicos | Sin nuevos endpoints, campos ni cambios de respuesta; campo legacy compatible |
| Persistencia | Sin schema, migración, almacenamiento de mensajes ni registro de «enviado» |
| Permisos | Sin nuevas facultades B2B ni consultas a teléfonos de clientes |
| Error externo | No revierte la reserva ni provoca repetir su creación |
| Teléfono ausente/no apto | Sin enlace WhatsApp; resultado de reserva y alternativas de contacto existentes permanecen disponibles |

Loading y errores de reserva conservan el flujo existente; la acción posterior solo aparece tras una creación exitosa y con teléfono apto. La apertura no crea un estado «enviando» ni «enviado». Se mantienen el aislamiento por slug, la proyección publicada y las barreras existentes de retiro/inactividad. No se consulta una fuente alternativa para recuperar contenido retirado.

La implementación futura tendría que autorizar expresamente cambios limitados en las acciones WhatsApp y su texto de éxito: comparten componentes con el mini-sitio aprobado. C0 no los modifica ni autoriza rediseñar CMS, reserva o H5. No hay dependencia dura de Pagos, Notificaciones, Medios, Analytics, Resumen ni Supabase para la combinación recomendada.

Compatibilidad propuesta: conservar payloads y estados actuales, no modificar teléfonos persistidos y mantener el campo legacy. Una vuelta atrás futura se limitaría al cambio autorizado de WhatsApp; no revertiría cierres CMS/H5 ni reintroduciría silenciosamente apertura automática con PII.

## 5. Riesgos y criterios de aceptación futuros

| Riesgo | Mitigación propuesta y comprobación |
| --- | --- |
| PII en URL externa | Mensaje genérico; comprobar ausencia de datos del cliente, cita y secretos. No registrar enlace completo en logs/auditoría. El teléfono público destinatario sigue formando parte necesaria de la URL |
| Dirección incorrecta | Mensaje único visitante → negocio y destinatario del contenido publicado del tenant actual |
| Número no apto | Validación controlada; sin inferencia de país ni afirmación de cuenta verificada |
| Popup bloqueado | Apertura por clic; si no abre, resultado de reserva conservado, sin repetir creación |
| Apertura confundida con envío | Sin «enviado», «entregado» ni mutación de Booking; explicación visible antes de salir |
| Destino manipulado | Dominio fijo; para B, lista aprobada y validación estricta |
| Mezcla entre negocios | Dos slugs con teléfonos distintos; conservar barreras de publicación/retiro |

Pruebas propuestas, solo cuando se autorice implementación:

1. Teléfono vacío, nacional ambiguo, internacional explícito, letras, extensiones, caracteres inesperados y longitud fuera de límites; sin modificar valores almacenados.
2. Creación exitosa con `PENDING`: texto «registrada», sin apertura automática ni cambios de estado.
3. Error al reservar: sin acción posterior de éxito ni afirmación falsa de registro.
4. Clic repetido/apertura fallida: ninguna petición adicional de creación; no inferir envío.
5. Página retirada: sin contacto obtenido de otra fuente. Dos tenants: no mezclar destinatarios ni mensajes.
6. Desktop y móvil de 375 px, teclado, foco, nombre accesible, texto auxiliar y enlace sin interactividad anidada.
7. Regresión de publicación, disponibilidad e instantes H5 sin alterar sus contratos. Si se elige D1-B, añadir QA específico de roles, ownership, IDOR y teléfonos de clientes antes de aprobación.

Las [pruebas existentes del mini-sitio](../../apps/web/components/public/PublicMiniSite.test.tsx) cubren publicación y fechas; el caso H5 simula `window.open` devolviendo `null`. Eso no acredita funcionamiento real de WhatsApp. No se ejecutaron suites ni QA de navegador en C0. Para una entrega frontend posterior aplicar tipos, lint, pruebas pertinentes, build y QA real según los gates; cualquier cambio backend elegido necesita su propia aprobación antes del frontend.

## 6. Entrega documental y próximo paso

Este archivo registra el contenido presentado al propietario durante el modo Plan y ahora solicitado en disco. Se actualizan índice, estado vigente, referencia del roadmap y flujos para distinguir la auditoría comparativa previa del C0 autorizado. CHANGELOG conserva ambas etapas. No se cambia BACKEND_CHANGES porque no se modifica el contrato vigente.

Validación aplicable: enlaces locales, consistencia de estado/opciones, diff documental completo y `git diff --check` por rutas documentales. Sin builds por ser documentación. Los cambios locales de backend encontrados al iniciar se preservan y no cuentan como trabajo, evidencia o aprobación de C0. Sin staging, commit ni push en esta entrega.

Evidencia documental: comprobados 136 enlaces locales en los seis archivos de esta entrega, sin destinos inexistentes; comprobador y diff-check documental con exit `0`. Los documentos nuevos/no versionados se revisaron completos y se comprobaron por espacios finales y marcadores de conflicto. Los hashes SHA-256 de los tres archivos backend preexistentes coinciden antes y después de la documentación.

**Pendiente del propietario:** elegir D1–D6 o pedir ajustes. La elección fijará el contrato propuesto; la implementación requerirá autorización posterior. No declarar WhatsApp cerrado/aprobado ni avanzar por la mera existencia de este documento.
