# M2 Cuenta de cliente — C2 etapa 1

2026-10-03, República Dominicana. **IMPLEMENTADO LOCALMENTE / EN REVISIÓN.** Único gate abierto: C2 frontend etapa 1, autorizado por el objetivo de esta tarea sobre C1 aprobado `9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4`. Implementación y ensayos locales terminados; falta aprobación explícita del propietario. C3, etapa 2 y producción no están autorizados por esta entrega.

Revisión posterior del propietario — 2026-10-03: correctivo visual/teclado y **un único commit local de C2 autorizados**, sin incluir las siete rutas preexistentes. **Push y despliegue expresamente prohibidos**: la rama dispara web QA en Vercel y el API QA aún no tiene la migración 28. Las secciones originales siguientes conservan el checkpoint sin commit; el [correctivo posterior](#correctivo-de-revisión-c2--2026-10-03) registra la entrega actual.

## Brief y criterios antes del código

La persona que reserva necesita volver a sus citas del negocio y registrar otra con sus datos propios. Cuenta Clerk, vínculo explícito y reserva tienen resultados independientes. La sesión no concede permisos B2B ni acceso por coincidencia de correo. El backend aprobado resuelve identidad, tenant y Client; personal de cualquiera de los cinco roles necesita igualmente su vínculo propio.

Se implementarán entradas secundarias de cuenta en el mini-sitio, alta/entrada/recuperación con código por correo y nombre, salida confirmada, claim desde el éxito en memoria, Próximas/Historial paginadas, detalle, perfil y repetición con el catálogo/horario vigente. Se reutilizarán `api.ts`, React Query, controles M1, formateador temporal y sistema visual existente. Sin cancelación, reprogramación, política, backend, dependencias nuevas o recuperación automática por contacto.

Cada pantalla cubrirá carga, vacío, errores neutros, recuperación, límite con espera y éxito autorizado. El claim solo anunciará visibilidad después de leer la reserva; el 404 de cuarentena ofrecerá asistencia sin revelar su causa. El alta invitada omitirá `password` y `createAccount`; los indicadores D8 `false/null` no decidirán el estado de cuenta.

PII solo en memoria de la visita, sin persistencia, queries privadas `no-store`, limpieza/abortado y descarte de efectos tardíos al cambiar identidad, sesión, negocio o rol, A → B → A, salir o perder permisos. Retornos relativos permitidos, sin contactos ni referencias de claim en parámetros de URL; el detalle usa su UUID técnico según contrato C1. Riesgos: retorno malicioso, caché de otra identidad, reenvío tras resultado incierto y deduplicación D4. Se mitigarán con allowlist, instancia por visita, ownership backend y mismo comando/clave dentro de 24 h; después de ese plazo se exige revisar el resultado.

Criterios observables: recorridos contra API C1/PostgreSQL desechable en dos negocios sintéticos; cinco roles sin vínculo rechazados; aislamiento y retorno, paginación/cursor obsoleto, PATCH y POST idempotentes, claim y recuperación separadas. Verificación web de tipos/lint/tests/build con exit 0, componentes y navegador en 320/375/390/768/1024/1280+, teclado/foco/resumen accesible, zoom 200 % y reduced motion.

## Base y preservación

Rama `ai/antigravity-qa`, HEAD `9f04dba`. Al iniciar: seis documentos modificados (`CHANGELOG.md`, `PROJECT_MASTER.md`, `docs/README.md`, `M2_C1_CIERRE.md`, confirmación UX y cierre M1 C3), más JSON M1 sin seguimiento. Se guardaron SHA-256 de esas siete rutas en `.tmp/m2-c2/initial-hashes.json`; permanecen fuera del alcance. El estado M2 se registra aquí sin editar controles ajenos. Sin staging, commit, push ni despliegue.

## Resultado y contrato consumido

El mini-sitio mantiene «Reservar cita» como acción principal y añade enlaces secundarios de cuenta. `/{slug}/cuenta/crear`, `/entrar` y `/recuperar` usan el SDK Clerk instalado, sin contraseña legacy ni autenticación propia. El alta recoge nombre y correo; entrada/recuperación usan código por correo. Los errores del proveedor se traducen a mensajes neutros, con resumen enlazado a campos, foco, espera local de reenvío y retorno relativo restringido al negocio. No se consulta el API para averiguar si existe un correo. La salida oculta primero información privada y espera a Clerk; si falla, mantiene el estado oculto y permite reintentar.

Después del POST invitado, la reserva conserva su resultado real `PENDING`. La intención de crear cuenta no se envía al backend: no hay `password` ni `createAccount` en ese cuerpo. Un error de cuenta/claim no repite el alta de Booking. Se retienen solo ID de reserva y slug en memoria para continuar a cuenta y pedir consentimiento explícito. No hay claim automático. Perder la referencia ofrece asistencia, sin buscar reservas por correo/teléfono.

| Contrato C1 existente | Consumo frontend |
| --- | --- |
| `POST /auth/clerk/customer/claims` `{bookingId,organizationSlug}` | Acción explícita; GET autorizado del detalle antes de anunciar visibilidad. Claim exitoso seguido de 404 conserva la reserva y ofrece asistencia, sin revelar cuarentena. |
| `GET /customer/businesses` `{businesses:[{slug,name,canBook}]}` | Negocios vinculados propios, selector mínimo; el rol interno por sí solo no concede acceso. |
| `GET /customer/:slug/bookings` | Próximas/Historial, límite 20, cursor opaco, estado mínimo, fecha del negocio. 400/409 de cursor descarta páginas y reinicia sin cursor. |
| `GET /customer/:slug/bookings/:id` | Detalle propio, contactos públicos permitidos y `canBookAgain`; sin precio histórico inventado ni acciones de etapa 2. |
| `GET/PATCH /customer/:slug/profile` | Nombre/teléfono del Client propio del negocio, correo de solo lectura, `canEditContact`. PATCH usa `Idempotency-Key` UUID opaco. |
| `POST /customer/:slug/bookings` | Nueva selección sobre catálogo/disponibilidad vigentes, sin contactos/identidad/tenant enviados en el body; `Idempotency-Key` UUID opaco. |

La repetición preselecciona únicamente recursos que siguen en el catálogo. `canBookAgain=false` por recurso retirado no equivale a prohibir toda cita nueva: si el permiso global `business.canBook` permite reservar, el detalle ofrece «Elegir otra cita», exige opciones vigentes y muestra su precio actual. El negocio retirado conserva lectura permitida de citas previas y bloquea nuevas reservas. El POST sigue sujeto a toda validación C1. Opt-in de avisos permanece independiente de crear cuenta y desmarcado inicialmente.

Tras timeout/5xx de POST/PATCH, la visita conserva cuerpo, clave y fecha originales, bloquea cambios incompatibles y permite comprobar el mismo envío dentro de 24 h. No se genera una nueva clave para ese reintento. El límite es estricto: vencido, se pide revisar el resultado/contactar al negocio. Comandos y contactos no sobreviven a salir de la visita o recargar. Los errores deterministas y 429 no se presentan como éxito; 409 de reserva obliga a revisar y elegir de nuevo. No hay reenvío automático tras timeout/5xx. El cliente HTTP existente conserva un único refresh/reenvío después de 401 definitivo previo al handler, con el mismo cuerpo/clave y contexto abortable; C2 no amplía ese comportamiento.

## Privacidad y áreas afectadas

`CustomerProvider` crea una instancia y QueryClient privado por negocio/ruta/identidad/sesión/rol/organización. Aborta, limpia caché y desmonta formularios al cambiar contexto, salir o recibir rechazo de permisos; las respuestas de una visita antigua no actualizan la nueva, incluido A → B → A. La referencia de claim cruza únicamente el alta anónima a su primera sesión y se descarta al cambiar identidad/negocio o salir. Los tokens se obtienen de Clerk en memoria; C2 no manda `x-organization-id`, IDs de User/Client ni selectores libres de identidad.

Las consultas usan el cliente HTTP común con `no-store`; páginas privadas/cuenta emiten `Cache-Control` privado/no-store y `X-Robots-Tag: noindex, nofollow`. No hay persistencia de contactos, comandos ni referencias en localStorage/sessionStorage, cookies propias, URLs o logs nuevos. Foco/visibilidad/pageshow revalidan permiso y datos; un 429 suspende las reconsultas durante la espera. Cambiar sesión Clerk no usa la caché B2B como fuente de permisos B2C.

Archivos nuevos: layout de slug, cinco páginas de cuenta/reservas/perfil/repetición, `components/customer/`, `lib/customer-routes.ts`, `lib/customer-ui.ts`, `lib/queries/customer.ts` y pruebas C2. Integraciones: mini-sitio, ContactStep, SuccessView, PublicBookingScreen, tipos/validación del POST invitado, matcher Clerk y cabeceras Next. Pruebas M1 adaptadas a la intención de cuenta sin contraseña. [APP_FLOWS §5](../product/APP_FLOWS.md#5-reserva-pública-y-continuidad-b2c) se reconcilia dentro de M2. No se modificaron backend, Prisma, contratos, dependencias, `.env` ni las siete rutas iniciales protegidas.

Se aplicaron las skills de entrega/producto y las referencias de UI, copy, móvil y accesibilidad requeridas. Se conservaron tokens, controles y calendario M1 existentes: inputs legibles, controles de al menos 44 px en las pantallas medidas, teclado/foco, errores asociados, wrapping, safe area y reduced motion. Las pautas consultadas de [interfaz](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) y [escritura](https://raw.githubusercontent.com/vercel-labs/writing-guidelines/main/command.md) se aplicaron con el lenguaje RD y las decisiones C0 como autoridad.

## Validación local y evidencia

[Manifest sanitizado](evidence/m2-c2/validation.json): comandos, exit codes, hashes de logs/fuentes/harness/capturas, siete hashes preservados, rama/HEAD, cabeceras, conteos y resultados de navegador. Los logs completos y scripts de reproducción local quedan en `.tmp/m2-c2`, ignorados por Git; no se versionan cuerpos, claves de idempotencia ni sesiones.

| Comprobación final | Resultado |
| --- | --- |
| `pnpm --filter web type-check:clean` | exit 0; tipos Next regenerados, TypeScript limpio |
| `pnpm --filter web lint` | exit 0; sin avisos |
| `pnpm --filter web test` | exit 0; 161 pruebas Node + 147 de componente = **308**, 22 archivos de componente; incluye 3 pruebas de lógica y 15 de componente C2 |
| `pnpm --filter web build --webpack` | exit 0; fuentes reales y SDK Clerk instalado, sin alias de ensayo en producto |
| Chrome local + API C1/PostgreSQL | exit 0; **14 escenarios y 22 medidas**, dos negocios sintéticos y cinco roles sin vínculo |
| `git diff --check` | exit 0; avisos normales de conversión LF/CRLF, sin errores de whitespace |

El navegador cubrió listas, paginación, Historial/detalle, aislamiento Norte/Sur, PATCH propio, cursor obsoleto real, cinco roles sin vínculo con 404 neutro, cuarentena, cambio de identidad y salida fallida/confirmada al volver atrás, POST/PATCH con commit real y respuesta perdida, mismo cuerpo/clave y una sola operación, 429 real/Retry-After, invitado → alta por SDK → claim explícito → lectura autorizada, recurso/negocio retirado, revocación real del Client y detalle de otro tenant. También verificó código inválido, recuperación por código, retorno restringido, resumen enfocado y teclado. No hubo excepciones de página; los dos errores de consola del ensayo principal corresponden exactamente a los timeouts inyectados de POST/PATCH. Los 4xx esperados son escenarios deliberados de la matriz, no fallos ocultados.

Lista, perfil y alta se midieron en 320/375/390/768/1024/1280/1440 px sin overflow horizontal. Lista/perfil verificaron targets y preferencia reduced motion; alta verificó resumen/teclado. Reflujo equivalente a 200 % (viewport reducido y fuente ampliada) pasó; no acredita el gesto de zoom físico ni la combinación navegador/dispositivo real. Fechas se mostraron en la zona RD del negocio mientras Chrome simulaba America/Los_Angeles. Inspección visual de capturas sintéticas: [perfil](evidence/m2-c2/profile-390.png), [errores de alta](evidence/m2-c2/account-errors-390.png), [claim](evidence/m2-c2/claim-success-390.png), [nueva reserva](evidence/m2-c2/repeat-success-390.png), [errores de perfil](evidence/m2-c2/profile-errors-390.png) y [reflujo](evidence/m2-c2/zoom-reflow-200.png).

Entorno exclusivo: PostgreSQL 16 nuevo `kortek-m2-c2-disposable`, `--rm`, sin bind mount ni volumen nombrado del usuario, loopback 55443, base `_test`, rol runtime no privilegiado. La imagen creó su volumen anónimo automático; se retiró junto con el contenedor. Se aplicaron **28 migraciones existentes**, sin crear ni alterar migraciones. API C1 real en 3046 y copia de fuentes web en 3016. Solo el SDK/verificador de identidad Clerk fueron controlados; Guards, DTOs, controladores, servicios, transacciones y PostgreSQL fueron reales. El worker de medios y el envío de correo quedaron desactivados solo en el proceso de ensayo. La copia QA sustituye el middleware Clerk y sus módulos por el SDK controlado; por ello este navegador no verifica el proveedor ni el middleware real. La compilación del producto sí usa los módulos y matcher reales. La base habitual y producción no se usaron.

## Riesgos, C3 pendiente y revisión

- Clerk de desarrollo no estaba configurado en variables del proceso. Alta/entrada/código/correo entregado, configuración del nombre/email_code, captcha, mensajes/límites del proveedor y revocación real de sesión requieren ensayo C3 con su instancia aislada. El SDK controlado acredita integración/estados de la UI, no operación del proveedor.
- Safari iPhone, Android físico, VoiceOver/TalkBack, zoom real 200 %, teclado virtual y cambios de app con proveedor real quedan pendientes. No se declara auditoría WCAG completa ni aprobación de UX por una compilación.
- D4 detecta únicamente ambigüedad entre Clients distintos con igual teléfono; fue aceptado para QA con alcance explícito. Sigue **bloqueando Paso 8/producción** conforme a [C1 aprobado](M2_C1_CIERRE.md). Este frontend conserva el 404 neutro y no realiza backfill, rehabilitación ni deduplicación.
- Recarga/cierre pierde el comando incierto y la referencia técnica por diseño de privacidad. Revisar Mis reservas/perfil o solicitar asistencia antes de repetir una operación cuyo resultado se desconoce; no prometer recuperación automática.
- La lectura permite reconocer recursos retirados en una cita antigua; crear otra exige catálogo, disponibilidad y permisos vigentes. No existe precio histórico sellado ni cancelación/reprogramación/política de etapa 2 en C2.

Siguiente paso: revisión explícita del propietario de esta implementación y evidencia. Solo tras aprobación independiente, preparar C3 con API QA y Clerk de desarrollo del proyecto, probar los recorridos reales/QA física y actualizar los documentos de control protegidos en una revisión autorizada. No se abrió C3 ni se publicó C2.

## Git final y retiro del ensayo

Rama inicial/final `ai/antigravity-qa`; HEAD inicial/final **`9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4`**. Índice vacío; cambios C2 únicamente en working tree junto a las siete rutas preexistentes preservadas byte por byte. Inventario exacto en el manifest. Sin staging, commit, push, merge, reescritura ni despliegue; no se consultó SHA remoto porque no hubo publicación.

API/web de ensayo detenidos. Contenedor desechable y volumen anónimo retirados; sin listeners de ensayo en 3016/3046/55443. Comprobación final en el manifest. El contenedor habitual `barberflow-postgres` se conserva.

## Correctivo de revisión C2 — 2026-10-03

Brief del correctivo: la persona necesita distinguir selección, leer las acciones también al esperar y recorrer los formularios con teclado. Alcance autorizado: contraste de botones principales en normal/hover/foco/pulsado/deshabilitado/pendiente, semántica y teclado de Próximas/Historial, eliminación de enlaces a la pantalla actual y espaciado uniforme. Sin cambio de permisos, datos, contratos, backend o dependencias. Criterios: todos los contrastes calculados ≥4,5:1, selección distinguible sin depender del color, foco correcto tras activar pestañas, cuatro capturas completas de reflujo equivalente 200 %, gates web y navegador C1/PostgreSQL con exit 0, siete hashes intactos y un único commit local de rutas C2.

Correctivo terminado localmente. Sus resultados se añaden a [validation.json](evidence/m2-c2/validation.json) bajo `review20261003`; se conservan las seis capturas y los resultados del checkpoint original. Tipos, lint, **310 pruebas** (161 Node + 149 de componente, 22 archivos; 17 de componente C2 y 3 de lógica C2), build de web y los tres scripts de navegador terminan con **exit 0**. Navegador: **19 escenarios**, 22 medidas funcionales y **145 mediciones de contraste**, sin excepciones de página. Los dos errores de consola corresponden a los timeouts deliberados de POST/PATCH; no hay otros errores de consola en el ensayo funcional. C1 y PostgreSQL son reales y desechables; Clerk sigue controlado, sin comprobar proveedor ni correo reales.

Contraste calculado por Chrome mediante luminancia relativa sRGB, sobre colores opacos sin filtros. Se verificaron normal, hover, foco, pulsado, deshabilitado, pendiente y las combinaciones hover/foco y hover/pulsado. Los pseudoestados se forzaron mediante CDP y los atributos mediante DOM en botones reales; además se retuvo una respuesta PATCH real para verificar el pendiente efectivo. El mínimo de toda la matriz es **4,5553:1**. No se cambian los estilos B2B: el atributo compartido `data-variant` permite limitar las reglas a la cuenta, claim y flujo de reserva.

| Crear cuenta con errores | Contraste calculado |
| --- | --- |
| Normal / foco | 5,5681:1 |
| Hover / pendiente / hover con foco | 8,7902:1 |
| Pulsado / hover con pulsado | 11,3101:1 |
| Deshabilitado | 11,2341:1 |

Próximas/Historial usan `tablist`, `tab`, `tabpanel`, `aria-selected` y asociación por IDs. La selección tiene subrayado de 3 px y peso 700. Flechas/Home/End mueven el foco sin activar; Enter/Espacio activan y conservan el foco en la pestaña nueva al navegar. Se mantiene el cursor independiente de cada vista. Se retiraron los enlaces a la pantalla de acceso actual y «Ver Mis reservas» del aviso dentro de esa lista, conservando los destinos útiles y el enlace desde el éxito público. La separación introductorio → resumen de errores es 24 px y resumen → primera etiqueta 20 px en crear, entrar, recuperar y perfil.

Cuatro capturas **de página completa**, con documento de 640 px y sin scroll horizontal ni contenido recortado: [crear cuenta, 640 × 1862](evidence/m2-c2/review-crear-reflow-200.png), [entrar, 640 × 1244](evidence/m2-c2/review-entrar-reflow-200.png), [Mis reservas, 640 × 10001](evidence/m2-c2/review-mis-reservas-reflow-200.png) y [Mi perfil, 640 × 1972](evidence/m2-c2/review-mi-perfil-reflow-200.png). Se esperó a fuentes/layout estables y se comparó la altura PNG con el último contenido visible. **Emulación de reflujo equivalente a 200 %**: viewport 1280 → 640 CSS px y fuente raíz al 200 %. **No acredita zoom real**, QA física ni auditoría WCAG completa. Capturas inspeccionadas; datos exclusivamente sintéticos.

Rama `ai/antigravity-qa`, HEAD base `9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4`. Las siete rutas preexistentes conservan sus SHA-256; las aprobaciones M1 y C1 del 2026-10-03 permanecen una vez cada una en `PROJECT_MASTER.md`. Backend, Prisma, dependencias y `.env` no cambian. El único commit local autorizado contiene las rutas frontend C2, `APP_FLOWS.md`, este cierre y su evidencia, mediante staging explícito; el hash del commit que contiene este registro y el `git status` posterior se entregan en la tarea. C2 continúa **IMPLEMENTADO / EN REVISIÓN**, sin aprobación final inferida. **Sin push, sin despliegue y sin consulta/publicación remota**.

API/web de ensayo detenidos; contenedor y volumen anónimo desechables retirados. Sin listeners de ensayo en 3016/3046/55443; contenedor habitual `barberflow-postgres` preservado. El retiro de esta revisión se añade al manifest, sin sustituir el registro anterior.

### Requisitos de C3 y orden seguro

La instancia de **desarrollo de Clerk debe estar aislada del entorno productivo**, identificada y compatible con el verificador C1. Claves públicas/secretas de web/API y emisor deben pertenecer a esa misma instancia; no mezclar dos instancias ni enlazar Users por correo. C2 no cambia panel Clerk, claves, `.env`, B2B ni flags. C3 debe verificar en el proveedor la configuración y el flujo que hoy solo se ensayan de forma controlada.

En esa instancia QA: habilitar alta/entrada por email, exigir correo y verificación de alta mediante **código por correo**, y habilitar **email_code** como factor de entrada. Habilitar la recepción de **firstName**, campo al que C2 envía el nombre; no exigir lastName ni otros campos que este flujo no recoge. El alta B2C debe poder completar sin contraseña obligatoria. Antes de aplicar ajustes de instancia, comprobar compatibilidad con los flujos B2B existentes y sus identidades; no desactivar globalmente métodos internos sin alcance/decisión propios. Comprobar captcha, entrega del código, errores neutros, reenvío/expiración, `missing_requirements`, sesión y revocación real. La UI mantiene su espera local de 60 s; no acredita límites ni entrega del proveedor. Referencias oficiales: [opciones de autenticación](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options) y [flujo OTP legacy usado por C2](https://clerk.com/docs/guides/development/custom-flows/authentication/legacy/email-sms-otp).

Orden de operación futura en C3, con su autorización independiente:

1. Identificar API/base/instancia Clerk de QA y preparar **respaldo previo** de la base QA, protegido, con hash y prueba de restauración aislada; registrar rollback. No usar producción ni confundir backup con una migración aplicada.
2. **Primero API QA:** desplegar el backend C1 aprobado, aplicar la **migración 28** existente en QA mediante su rol migrador y validar ledger/constraints, runtime no privilegiado, D4/D8, rutas C1, permisos y datos propios. Verificar compatibilidad con la web QA anterior antes de continuar.
3. Confirmar Clerk de desarrollo y pruebas de acceso C1 con identidades sintéticas de esa instancia. Si falla API/migración/auth, detenerse antes de publicar la web y mantener el checkpoint C2 local.
4. **Después web QA:** solo cuando API/contrato/Clerk estén listos, publicar C2 junto con C3 a la rama QA bajo autorización expresa. El push desencadena Vercel; comprobar SHA/artefacto/configuración y realizar QA funcional/visual real, iPhone/Safari, Android, VoiceOver/TalkBack y zoom real. No se ejecuta este paso en el correctivo.

### Siete rutas y consolidación posterior

La consolidación futura incluye **siete rutas**, preservadas byte por byte y excluidas de este commit C2:

- `CHANGELOG.md`.
- `PROJECT_MASTER.md`.
- `docs/README.md`.
- `docs/quality/M2_C1_CIERRE.md`.
- `docs/quality/RESERVA_PUBLICA_CONFIRMACION_UX.md`.
- `docs/quality/RESERVA_PUBLICA_M1_C3_CIERRE.md`.
- `docs/quality/evidence/m1-c3/aprobacion-cierre-20261003.json`.

`M2_C1_CIERRE.md` forma parte de esa consolidación: contiene la aprobación C1 sobre `9f04dba` y el riesgo D4 aceptado únicamente para QA, **bloqueante para Paso 8/producción**. `PROJECT_MASTER.md` ya contiene una entrada fechada de aprobación M1 y una de C1; se conservan ambas, sin duplicarlas ni revocar sus alcances. Registrar el estado C2/C3 en los controles durante la consolidación autorizada, mediante entradas nuevas; no reescribir checkpoints históricos ni atribuir al commit frontend cambios documentales excluidos.
