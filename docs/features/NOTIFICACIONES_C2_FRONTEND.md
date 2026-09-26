# Notificaciones — C2: frontend

**Actualización posterior del propietario (2026-09-16): C2 CERRADO / APROBADO sobre c7d43ad03a65a900a930a1a0d69dd258b8516a1e. C3 autorizado para activación temporal y QA real según [NOTIFICACIONES_C3_ACTIVACION.md](NOTIFICACIONES_C3_ACTIVACION.md). Las menciones inferiores a falta de aprobación/activación describen el cierre histórico C2 y quedan sustituidas por esta decisión.**

Actualizado: 2026-09-16. **IMPLEMENTADO / EN REVISIÓN DEL PROPIETARIO**. No implica aprobación de C2 ni activación C3.

## Autorización y brief

El propietario aprobó explícitamente C1 sobre la base `c7d43ad03a65a900a930a1a0d69dd258b8516a1e` y autorizó C2 conforme D1–D10 y [contrato C1](NOTIFICACIONES_C1_CONTRATO.md). C3 no está autorizado: no activar canal, worker ni envíos reales. CMS, H5/fechas y WhatsApp mantienen comportamiento y aprobaciones.

- Usuario y resultado: OWNER/ADMIN consultan historial global paginado y solicitan reintentos elegibles. OWNER/ADMIN/RECEPTIONIST consultan avisos y gestionan preferencia desde una reserva. BARBER no monta estas consultas ni acciones.
- Flujo: Reservas → Avisos por correo → historial y preferencia; Notificaciones → historial global → reserva. Preferencia versionada, retirada sin correo y habilitación con revisión explícita del correo del cliente. Alta pública e interna incorporan elección voluntaria desmarcada según C1; no depende de crear cuenta.
- Privacidad: historial mínimo, destinatario enmascarado, sin contenido, respuesta externa ni contacto completo. Correo de revisión solo en formulario y cuerpo autorizado, nunca URL, logs o almacenamiento persistente. Tenant/actor proceden del cliente HTTP autenticado existente.
- Estados: carga, vacío, error con recuperación, guardado/reintento pendientes y éxito sin afirmar entrega. Conflicto exige consultar el estado actual; no repetir escrituras automáticamente. Aceptado, entregado, incierto, omitido, fallido y obsoleto son distintos de Booking y de lectura.
- Arquitectura: React Query y `lib/api.ts`, claves por usuario/tenant/rol/recurso/visita; desmontaje y aborto para efectos tardíos, incluido A → B → A. Sin nuevas dependencias ni contratos backend.
- UI: componentes y variables existentes, tarjetas responsive, controles etiquetados, foco visible y anuncios de estado/error. Fecha de aviso en zona autoritativa del negocio.
- Aceptación: comprobar permisos, paginación, cinco eventos/nueve estados, elegibilidad autoritativa del reintento, opt-in explícito/retirada/conflicto/contacto cambiado, ausencia de fugas y aislamiento de visitas. Tipos/lint/build/tests y QA real desktop/375 px, teclado/consola; documentar evidencia real antes de declarar candidato.

## Implementación

- `/dashboard/notifications`: historial global paginado OWNER/ADMIN. Menú restringido y comprobación de acceso antes de montar consultas.
- `/dashboard/bookings/[id]/notifications`: historial y preferencia para OWNER/ADMIN/RECEPTIONIST; enlaces desde las tarjetas y tabla de Reservas. UUID de ruta como localizador, autorización real C1.
- `components/notifications/NotificationsView.tsx`: consultas reales, paginación de 20, estados separados, confirmación de reintento, errores traducidos y recuperación con GET antes de otra escritura incierta/conflictiva. Nunca reintenta una mutación automáticamente. Respeta `canRetry` del servidor y excluye Recepción aunque una fila obsoleta indicara lo contrario.
- `notification-ui.ts`: tipos C1, cinco eventos, nueve estados, motivos seguros, versión/texto exactos y formateo con la zona obtenida de `/organizations/mine`. El historial no muestra correos completos ni cuerpo del aviso.
- Preferencia: `expectedVersion` de la lectura, opt-in y corroboración explícitos; retirada sin email. Guardar no reenvía historia. Cambio de versión/contacto o consulta manual reinicia la revisión. Una lectura de fondo sin cambios no borra el borrador.
- Alta interna: elección desmarcada y revisión de contacto para roles permitidos; BARBER omite toda la extensión. Cambiar cliente borra elección y corroboración. Modal desmontado por alcance; una finalización de su visita anterior no ejecuta el callback de éxito.
- Alta pública: elección desmarcada e independiente de cuenta. Cambiar email borra la elección anterior. Sin consentimiento se conserva el cuerpo legacy (extensión ausente = false); al elegirla se añade solo `{ optedIn: true, noticeVersion }`. No se muestra omisión ni contacto histórico en el éxito público.
- El cambio de `PublicMiniSite.tsx` se limita al estado y transporte del opt-in. Sin cambios a publicación CMS, selección/conversión de fecha o éxito/enlace WhatsApp. Los archivos previos ajenos conservan sus huellas.
- QA detectó que la limpieza de caché del proveedor de autenticación podía eliminar los nuevos observadores durante un cambio de negocio. `NotificationVisit` monta las consultas después del commit y su limpieza, con microtarea cancelable por visita; no modifica autenticación ni CMS. Regresión automatizada y cambio real Norte → Sur → Norte verificados. La limpieza del modal interno usa `useLayoutEffect` para invalidar inmediatamente sus callbacks al desmontar.
- §5 del contrato C1 corregido: el ensayo con datos de las 21 migraciones previas y restore ya está completado; referencia §10 y migración 24. C1 queda documentado como aprobado por decisión explícita; C3 sigue sin autorización.

## Pruebas ejecutadas

| Comprobación | Resultado real / alcance |
| --- | --- |
| `pnpm --filter web exec tsc --noEmit` | Exit 0 sobre implementación final y nuevas pruebas |
| `pnpm --filter web lint` | Exit 0 después de la corrección de montaje por visita |
| `pnpm --filter web build` | Exit 0; genera ambas rutas nuevas; build final usada para QA público y cambio de negocio |
| `pnpm --filter web test` | 109 pruebas de lógica y 47 de componente, exit 0; incluye 17 casos de componentes de Notificaciones |
| `pnpm --filter web exec vitest run components/notifications/InternalEmailOptIn.test.tsx` | 4 casos, exit 0: contacto explícito, cambio de cliente, BARBER y callback tardío |
| `pnpm --filter web exec vitest run components/notifications` | Verificación final: 17 casos en 3 archivos, exit 0 |
| `git diff --check` | Exit 0; advertencias de conversión LF/CRLF no implican errores del diff |
| Comparación SHA-256 contra `.tmp/notifications-c2/before.json` | Exit 0: archivos preexistentes fuera de rutas C2 declaradas conservados |

`NotificationsView.test.tsx`: denegación BARBER/CUSTOMER sin consultas, Recepción por reserva sin reintento, payload de preferencia con versión y sin autoridad cliente, retirada sin correo, conflicto seguro/recuperación sin repetir escritura, confirmación y doble clic de reintento, paginación real de consulta, ocultación de filas ante error, aborto de mutación A → B → A y cambio de rol/usuario. El test de error se corrigió para esperar la actualización asíncrona de React Query antes de afirmar el resultado.

`BookingEmailOptIn.test.tsx`: elección pública desmarcada/independiente de cuenta e instante autoritativo intacto; cambio de email revoca elección; elección sin correo conserva éxito sin exponer omisión. Son pruebas de componentes con frontera HTTP controlada, no acreditan integración PostgreSQL por sí solas.

`InternalEmailOptIn.test.tsx`: alta con payload exacto, validación de corroboración, revocación al cambiar cliente, ausencia total de extensión BARBER y descarte del callback de una visita anterior. El selector de fecha se sustituye por su frontera de valor; estas pruebas no vuelven a certificar H5. QA real usa el selector existente.

Durante validación se corrigieron errores de las pruebas nuevas (selector duplicado de Nueva reserva, evento `mousedown` del autocompletado y opción `exact` que no pertenece a Testing Library). Lint detectó el montaje síncrono en efecto; se sustituyó por microtarea cancelable, coherente con esperar la limpieza del proveedor. Todos esos fallos quedaron resueltos; no se desactivó ninguna regla ni prueba.

`notification-ui.test.ts`: cinco eventos/nueve estados, permisos, hora autoritativa y errores sin texto técnico/contacto del servidor. Una primera regresión pública falló por enviar false explícito donde el caso legacy esperaba ausencia; se preservó el contrato ausente=false sin modificar el test CMS/H5.

## QA real ejecutado — 15 y 16 de septiembre de 2026

Entorno: build Next de producción local `http://localhost:3001`, API Nest real `http://localhost:3000`, Clerk Development con sesión QA existente y PostgreSQL 16 exclusivo `kortek_notifications_c2_test`, en contenedor `kortek-notifications-c1-test`, loopback `127.0.0.1:55439`. Las 24 migraciones se aplicaron desde cero solo a esa base. Dos tenants nuevos, cuatro cuentas de prueba preexistentes vinculadas localmente y 21 historiales controlados; los estados de proveedor del fixture son simulados, no acreditan envíos físicos.

`NOTIFICATIONS_EMAIL_ENABLED=false`, dominio deshabilitado y `EmailChannelControl.EMAIL.paused=true`; no se inició worker ni se llamó a Resend. El proceso QA no recibe claves de Resend del launcher. La base habitual permanece intacta. No se cambiaron cuentas ni roles en Clerk; solo la Membership local del fixture pasó por OWNER, RECEPTIONIST, BARBER y ADMIN y se restauró a OWNER al terminar. Los prerrequisitos de publicación y profesional público se prepararon únicamente en esta base sintética para recorrer el alta pública; no hay publicación externa ni cambios al código/contrato CMS.

| Entorno/rol/acción | Observación |
| --- | --- |
| OWNER, escritorio 1280×720, historial real | Primera página con 20 filas y segunda con una; indicadores reales 1/2 y 2/2; estados diferenciados, contacto protegido |
| OWNER, reserva, retirada | Guarda sin correo; preferencia pasa a no autorizada y aviso pendiente a “Ya no corresponde” |
| OWNER, correo distinto al registrado | Backend rechaza; mensaje seguro de conflicto, nueva escritura deshabilitada; “Consultar estado actual” recupera preferencia persistida |
| OWNER, 375×812, habilitación | Email controlado correcto + corroboración explícita, Tab/Enter guarda; formulario y acciones alcanzables, ancho documento 360 dentro de viewport 375 |
| OWNER, móvil, reintento | Confirmación visible, controles pending; backend acepta solicitud y aparece “Reintento solicitado”. No se afirma entrega ni se ejecuta worker |
| RECEPTIONIST, URL global directa | No aparece menú Notificaciones ni historial global; mensaje de permiso |
| RECEPTIONIST, URL de reserva | Historial mínimo y preferencia presentes, sin botón de reintento; retirada guardada y aviso invalidado |
| BARBER, URLs global y por reserva | Denegación visible y menú sin Notificaciones; sin formulario ni historial privado |
| ADMIN, historial y alta interna | Historial autorizado. Aviso inicialmente desmarcado; enviar sin corroboración explícita muestra validación. Con correo coincidente y revisión guarda reserva y preferencia; historial nuevo Pendiente, cero intentos |
| Norte → Sur → Norte | Sur muestra vacío sin filas de Norte; reserva de Norte desde Sur muestra registro no disponible en ambas secciones; al regresar se relee preferencia y desaparece el borrador anterior. Build final repite cambio al vacío correctamente |
| API QA detenida durante actualización | Preferencia e historial anteriores se ocultan; error útil con Volver a consultar. Tras restaurar API, GET recupera datos sin repetir escritura |
| Público, 375×812 | Consentimiento desmarcado inicialmente, aviso legible, elección independiente de cuenta desmarcada; reserva guardada con éxito público habitual sin estado/motivo de correo. Ancho documento 360 ≤ viewport 375 |
| Lectura PostgreSQL de ambas altas | `STAFF` y `PUBLIC`, optedIn=true, noticeVersion=booking-email-v1, revisión de contacto 0; intenciones PENDING con attempts=0, firstDispatchedAt=null y providerId=null; canal EMAIL pausado |
| Consola de la visita OWNER | Solo advertencia conocida de Clerk Development; sin errores de aplicación en la captura consultada |
| Consola pública de la build final | Solo advertencia Clerk Development; sin errores. Los errores de conexión/404 durante los escenarios negativos anteriores son esperados |

Evidencias: [preferencia móvil](evidence/notifications-c2/preference-mobile.png), [confirmación de reintento móvil](evidence/notifications-c2/retry-mobile.png), [Recepción móvil](evidence/notifications-c2/reception-mobile.png), [BARBER restringido](evidence/notifications-c2/barber-denied.png), [tenant vacío](evidence/notifications-c2/tenant-empty.png), [reserva ajena](evidence/notifications-c2/foreign-reservation.png), [alta interna](evidence/notifications-c2/internal-consent.png), [error de lectura](evidence/notifications-c2/read-error.png), [opt-in público móvil](evidence/notifications-c2/public-consent-mobile.png), [éxito público móvil](evidence/notifications-c2/public-success-mobile.png). Contienen solo datos controlados de QA.

## Auditoría de alcance y siguiente gate

| Decisiones / requisito | Evidencia C2 |
| --- | --- |
| D1/D2: correo y cinco eventos | Catálogo tipado de cinco eventos/nueve estados; pruebas de etiquetas; historial real separado de Booking y lectura |
| D3: WhatsApp segunda entrega | Ninguna capacidad nueva; archivos previos preservados y regresiones existentes pasan |
| D4/D5: remitente central y textos fijos | Sin configuración de remitente/editor; C2 consume únicamente proyección C1, no crea mensajes |
| D6/D7: destinatario y opt-in | Payloads allowlist, texto/version exactos, default false, revisión interna y retirada; pruebas de cambio de contacto/cliente y QA PostgreSQL de alta pública/interna |
| D8: roles y privacidad | Guards C1 vigentes; UI restringida antes de consultas; cuatro roles observados, tenant ajeno sin datos, caché/visita y efectos tardíos probados |
| D9/D10: reintento, vigencia y retención | `canRetry` autoritativo, confirmación, no reenvío automático tras error, UNCERTAIN sin acción y destinatario ausente/protegido. Políticas de envío/retención siguen exclusivamente en C1 |
| §5 C1 y documentación | Ensayo 21 → 23 → 24/restore referenciado correctamente; controles sincronizados y evidencia enlazada |
| Compatibilidad | Sin dependencias, schema, migraciones ni backend cambiados por C2; diff de alta pública limitado a elección/transporte. Tests CMS/H5/WhatsApp conservados y aprobados |

**C2 IMPLEMENTADO / EN REVISIÓN DEL PROPIETARIO.** Implementación, pruebas y QA entregados. Siguiente gate: auditoría/aprobación explícita del propietario. No se declara C2 aprobado ni se inicia C3. Esta evidencia no acredita envío físico, dominio, remitente ni operación productiva.

Incidencias de entorno resueltas: rechazo temporal por límite de uso al cambiar rol QA (posterior ejecución autorizada y verificada); procesos/contenedor detenidos entre continuaciones; servidor web recuperado con escucha IPv4/IPv6. El calendario nativo del navegador integrado cerró una pestaña; el recorrido público se completó en otra con teclado, sin modificar fechas ni controles. No quedan bloqueos de estas incidencias.

Scripts locales: `.tmp/notifications-c2/setup.cjs` (base exclusiva y semillas, ya ejecutado), `api.cjs` (launcher con correo apagado), `context.cjs` (solo rol de Membership QA), `public-fixture.cjs` (prerrequisitos sintéticos), `verify.cjs` (lectura de metadatos y canal pausado), `fixture-public.json` (IDs controlados). `.tmp/notifications-c2/.env` contiene datos privados del fixture y no debe imprimirse, copiarse a evidencia ni versionarse. No repetir setup ni crear otro fixture por inferencia.

Para repetir QA: verificar contenedor `kortek-notifications-c1-test`, usar launcher `api.cjs` y `pnpm --filter web exec next start -H :: -p 3001` con la build validada. No reconstruir `.next` mientras ese servidor usa la build. Revalidar procesos/pestañas antes de reutilizarlos; los handles no son persistentes entre continuaciones.

Git: rama `ai/antigravity-qa`, HEAD base `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`, trabajo C1/WhatsApp anterior sin staging coexistiendo con C2. Sin staging, commit, push ni despliegue. No existe nuevo SHA remoto que verificar. `rg` no inicia por acceso denegado; búsquedas con PowerShell. Comparación SHA-256 de archivos preexistentes ajenos a C2: conservados. Evidencia final registrada arriba.
