# Correctivo F0-A — primera tanda del QA del propietario

Fecha: 2026-09-30. Base de implementación: `389a169f97c6a95e174255bb2595c7a72c443357`, rama `ai/antigravity-qa`, árbol inicial limpio (`git status --short` sin salida). Ambas continuaciones recibieron los 34 archivos F0-A sin commit (28 modificados y seis nuevos). Estado vigente: **GATE 4 APROBADO POR EL PROPIETARIO / PUBLICADO EN GIT / DESPLEGADO EN QA / HEADER VERIFICADO**. Commit publicado: `6752e95e580b41670b6369adfc6bfb240f4c8509`. La actualización documental del despliegue permanece local, sin staging, commit ni push hasta nueva autorización. La evidencia de implementación inferior conserva su contexto histórico; QA integrado completo y aprobación de gates posteriores mantienen su alcance separado.

## Autorización y gates

La solicitud F0-A autoriza únicamente los seis correctivos de presentación/validación y su QA. Son vinculantes las decisiones del propietario del 29 de septiembre y los contratos C0–C3 aprobados. Las auditorías de roadmap/diseño aportan contexto; su rediseño de calendario, confirmación, cuenta y pagos queda fuera de esta tanda.

La segunda continuación autoriza expresamente descargar fuentes solo de `fonts.googleapis.com` y `fonts.gstatic.com`, con marcadores de compilación y telemetría desactivada solo en los procesos. Su punto 7 autoriza modificar el ítem 4: separar errores esperados/inesperados, presentar «Código de soporte» truncado en una línea, copiar el UUID y probarlo. Esta autorización específica permite los cambios de UX/pruebas dentro de las mismas 34 rutas; el resto del trabajo anterior permanece preservado. Backend, sesiones, permisos, contratos y configuración persistente quedan fuera.

Gate 1 revisado: visitante público que opta por cuenta; personal que guarda, consulta perfil o cambia estado; usuario móvil de formularios/filtros. Resultado: mínimo local de contraseña igual al API, campos legibles sin impedir zoom, errores accionables y reportables, fechas del negocio y etiqueta Profesional. Se mantienen loading, vacío, pending, éxito y recuperación actuales; se añade ayuda junto al campo y error de estado visible. Teclado, labels, descripción asociada, responsive 320/375/390 y desktop forman parte del QA.

Gate 2 revisado: DTO público exige ocho caracteres; Booking conserva su máquina de estados/roles y tenant autenticado; Organization aporta la zona; telemetría emite UUID `X-Request-Id`, expuesto por CORS. Sin persistencia, endpoint, permisos, estados, esquema o integración nueva. Amenaza breve: no mostrar cuerpos técnicos ni PII como código; aceptar solo UUID del servidor; no fabricar identificador cuando no hay respuesta; no alterar resolver de sesión, abort/caché o aislamiento. Backend existente: no se abre una implementación C1 nueva.

Las validaciones técnicas de frontend (Gate 4) terminan con exit code 0: tipos limpios, lint y build completo. El propietario aprobó explícitamente el Correctivo F0-A (Gate 4) tal como consta en este informe y autorizó su commit/push; posteriormente autorizó el despliegue a QA y la verificación del header. El navegador aislado no sustituye QA integrado ni declara cierre formal del Gate 5. Producción y gates posteriores conservan autorización independiente.

## Despliegue QA y verificación de X-Request-Id — 2026-09-30

Autorización expresa del propietario: «AUTORIZO DESPLIEGUE A QA. Actualiza docs/quality/CORRECTIVO_F0A.md con el resultado del despliegue y la verificación del header. Sin commit de ese cambio hasta que yo lo autorice».

El push previamente autorizado de `6752e95e580b41670b6369adfc6bfb240f4c8509` activó automáticamente la integración Git de Vercel. Al revisar el proyecto existente `fraylindev/kortek-booking`, la deployment de ese SHA ya estaba **Ready** en **Preview**, creada el 2026-09-30 a las **14:36:41, America/Santo_Domingo**, con duración de build **32 s**. No fue necesario repetir el despliegue ni modificar variables o configuración. Fuente visible: rama `ai/antigravity-qa` y mensaje exacto del commit F0-A.

- Deployment: [`DAs3KE5FhozHXqLAdyseufvQkbSq`](https://vercel.com/fraylindev/kortek-booking/DAs3KE5FhozHXqLAdyseufvQkbSq).
- URL de QA asignada: [qa.booking.kortek.cloud](https://qa.booking.kortek.cloud/).
- URL inmutable de la Preview: [kortek-booking-lgdhi5trq-fraylindev.vercel.app](https://kortek-booking-lgdhi5trq-fraylindev.vercel.app/).
- Alias de rama también asignado: `kortek-booking-git-ai-antigravity-qa-fraylindev.vercel.app`.

Chrome abrió la landing en `https://qa.booking.kortek.cloud/`, con título «Kortek Booking», navegación y contenido renderizados. La sección de cuatro roles muestra «dueño, admin, recepción, profesional», coherente con F0-A. El panel Vercel mostró Ready, Preview, dominio QA y SHA correcto en una misma vista. Esta comprobación acredita el despliegue y la carga inicial; no acredita todos los recorridos autenticados, iPhone/Safari ni el QA integrado completo. No se completó una inspección de consola: Chrome bloqueó la automatización posterior por una interfaz de otra extensión abierta; no se atribuye por ello una consola limpia.

Se consultó por HTTPS exclusivamente `https://api.staging.booking.kortek.cloud`, con `Origin: https://qa.booking.kortek.cloud`. Peticiones GET/OPTIONS sin token, sin mostrar cuerpos de negocio ni ejecutar mutaciones. El primer intento en el sandbox fue bloqueado por permisos de socket; la repetición con acceso de red autorizado terminó con **exit code 0**. El API existente no se redeplegó: F0-A contiene únicamente cambios web, pruebas y documentación.

| Petición real | Fecha/hora de observación (Santo Domingo) | HTTP | `X-Request-Id` |
| --- | --- | --- | --- |
| `GET /professionals` sin autenticación | 2026-09-30 14:46:20 | 401 | `6252ad9e-6fda-47f5-91c6-df4daefcf9f5` |
| `GET /public/qa-horario-norte/booking-data` | 2026-09-30 14:46:21 | 200 | `f2046004-ba92-4353-ada0-9090ee225e92` |
| `OPTIONS /professionals`, método solicitado GET y headers `authorization,x-organization-id` | Misma ejecución | 204 | No se exige UUID en preflight |

Las tres respuestas incluyeron `Access-Control-Allow-Origin: https://qa.booking.kortek.cloud` y `Access-Control-Expose-Headers: X-Total-Count,X-Page,X-Limit,X-Total-Pages,X-Request-Id`. Los dos GET emitieron UUID v4 distintos y válidos. **Emisión real y exposición CORS del header en QA: verificadas**, incluida una respuesta de error 401. La prueba no provoca un 5xx ni demuestra copia del código en una sesión de producto; esa presentación conserva la evidencia aislada previa.

Git inicial: `ai/antigravity-qa`, HEAD `6752e95e580b41670b6369adfc6bfb240f4c8509`, sincronizado con `origin/ai/antigravity-qa`, árbol limpio. Esta tarea actualiza únicamente este informe y lo deja sin staging, commit ni push. No se editaron código, `.env`, configuración Vercel, API, worker, base de datos ni producción. Las referencias anteriores a falta de aprobación/publicación en otros documentos conservan el contexto previo; esta sección registra las autorizaciones y resultados posteriores dentro del único archivo solicitado.

## Inventario previo de etiquetas

| Superficie | Base (archivo/línea) | Tratamiento |
| --- | --- | --- |
| Rol en menú | `apps/web/components/dashboard/Sidebar.tsx:17` | Barbero → Profesional |
| Opciones, filtros, filas y mensajes de Equipo mediante mapas compartidos | `apps/web/lib/team-ui.ts:13,20` | Barbero → Profesional; value BARBER intacto |
| Texto de roles de portada | `apps/web/components/landing/Proof.tsx:44` | barbero → profesional |
| Vinculación, carga, invitación y desvinculación en Profesionales | `apps/web/app/dashboard/professionals/page.tsx:501,1005,1071,1073,1079,1087,1093,1173` | Cuenta de profesional y miembro profesional, sin cambiar Membership |
| Tipos, hooks, query keys, guards de UI, comentarios y fixtures | `apps/web/lib/api.ts:171`, componentes y pruebas | BARBER interno intacto; no es etiqueta |
| Barbería como sector y alt de fotografía, biografía de fixture | landing, `landing-photos.ts`, `PublicMiniSite.test.tsx` | No identifican un rol del sistema; no se sustituyen |
| Errores recibidos del backend que contienen BARBER | `apps/api/src/bookings/bookings.service.ts:468`, `apps/web/lib/api.ts:125` (base) | Sustitución de la palabra solo en el mensaje de presentación del cliente; respuesta, payload y backend intactos |
| Plantillas aprobadas | `apps/api/src/notifications/notification-templates.ts` | Cero coincidencias de BARBER/Barbero; archivo intacto |
| Contratos y entregas C0–C3 cerrados | Inventario siguiente | Coincidencias conservadas; no se editan |

Coincidencias de BARBER/Barbero preservadas en `docs/features/` (líneas del HEAD base): `CONFIGURACION_CMS_C0_AUDITORIA.md:96,110,129,135,208,250,259,283,287,297`; `CONFIGURACION_CMS_C1_CONTRATO.md:11,92,116`; `CONFIGURACION_CMS_C2_FRONTEND.md:7,25,62`; `CONFIGURACION_CMS_C3_BACKEND.md:24,46`; `CONFIGURACION_CMS_C3_FRONTEND.md:17,27,42`; `HORARIO_ZONA_C0_AUDITORIA.md:10,34,40,167,220,224`; `HORARIO_ZONA_C1_CONTRATO.md:9`; `HORARIO_ZONA_C2_FRONTEND.md:9,27,69,71,74`; `MEDIOS_PROMOCIONES_C0_AUDITORIA.md:3,7,17,50,110,125`; `MEDIOS_PROMOCIONES_C1_CONTRATO.md:15,18,31,32,81,82,83,84,94,104,113`; `MEDIOS_PROMOCIONES_C2_FRONTEND.md:7,13,19,53,55`; `NOTIFICACIONES_C0_AUDITORIA.md:27,31,38,40,46,70,142,144,212`; `NOTIFICACIONES_C1_CONTRATO.md:40,58,105,116,142`; `NOTIFICACIONES_C2_FRONTEND.md:11,26,40,45,49,59,70,79`; `WHATSAPP_C0_AUDITORIA.md:44`; `WHATSAPP_C1_CONTRATO.md:134`. Describen valores internos, permisos, contratos o evidencia histórica. Los documentos vigentes y los historiales también mantienen sus referencias internas a BARBER.

La búsqueda final en el código de producto web conserva únicamente «Barbero cortando el cabello…» en `apps/web/lib/landing-photos.ts:25` como descripción accesible de una fotografía; los otros usos de BARBER son valores internos, comprobaciones de rol, tipos o comentarios. Las filas/opciones de Equipo consumen los mapas compartidos (`team/page.tsx:430,652,710,877,967`), por lo que reciben Profesional sin modificar sus payloads.

## Correctivos y regresiones

Las líneas «base» corresponden al SHA inicial. Las referencias «actual» previas a esta continuación pueden haberse desplazado por el ajuste del ítem 4. El inventario anterior se realizó antes de sustituir etiquetas. La comparación roja/verde inicial usó el mismo guion contra HEAD y el árbol local; la segunda continuación amplía las comprobaciones de soporte y las ejecuta sobre el árbol final, sin atribuir su nueva cobertura a aquella comparación histórica.

| Ítem | Antes | Después | Por qué |
| --- | --- | --- | --- |
| 1. Contraseña | Aceptaba seis/siete caracteres | Bloquea menos de ocho y explica el mínimo junto al campo | Coincidir con validación existente del API |
| 2. Campos móviles | Inputs de 14 px; personalización podía bajar a 12 px | Inputs/select/password y filtros de fecha tienen al menos 16 px bajo 640 px | Evitar el disparador habitual del zoom automático conservando zoom manual |
| 3. Estado | Usaba un error de horario para cualquier fallo | Distingue transición, conflicto, permiso y sesión; alerta persistente con foco | La persona puede entender y corregir la causa |
| 4. Código | Descartaba X-Request-Id en errores | Conserva UUID v4 recibido; Código de soporte copiable solo en fallos inesperados, con elipsis | Reportar fallos sin distraer de una regla de negocio clara |
| 5. Fechas | Fecha ISO/hora 24 h y filtros sin ejemplo visible | Fecha larga/hora natural del negocio y ayuda Desde/Hasta | Evitar formato técnico y dependencia del placeholder nativo |
| 6. Rol | Barbero/BARBER aparecía como etiqueta | Profesional en menú, mapas, portada y mensajes | Lenguaje común sin cambiar rol ni permisos |

### 1. Contraseña de cuenta pública

- Causa raíz: `apps/web/app/[slug]/_components/AccountStep.tsx:47,56` (base) exigía seis tanto en `minLength` como en el bloqueo de Continuar. El API ya exige ocho (`apps/api/src/auth/auth.constants.ts:10`; `apps/api/src/public-booking/dto/create-public-booking.dto.ts:71`, validación existente).
- Corrección mínima: `AccountStep.tsx:48,49,58` (actual) exige ocho, asocia el error al campo con `aria-invalid`/`aria-describedby` y usa un id explícito. La casilla Crear cuenta conserva contenido y comportamiento. Si no se opta por cuenta, el mínimo no bloquea la reserva.
- Regresión: `components/booking/F0A.test.tsx` prueba seis/siete bloqueados, descripción accesible, ocho permitido y casilla visible. En base fallaban los casos seis/siete; después pasan. El navegador reproduce siete → ocho en cuatro anchos. La asociación de errores también cubre etiquetas con espacios sin generar listas de ids incorrectas.
- Riesgo: UX de validación inmediata; no sustituye la validación backend. Sin cambio en alta de cuenta ni política de credenciales.

### 2. Entradas móviles de 16 px

- Causa raíz: `components/ui/Field.tsx:39,41`, `PasswordField.tsx:24`, Reservas `page.tsx:248,265` y Facturación `page.tsx:169,187` (base) usaban `text-sm`. En Chrome móvil se midieron `[14,14,14,12,14]` px, incluida una clase personalizada pequeña.
- Corrección mínima: clases `text-base sm:text-sm`, refuerzo `max-sm:text-base` en componentes compartidos aun con `className` propia, y `min-w-0`. No cambia tipografía desktop por defecto. No se añaden restricciones de zoom al viewport.
- Regresión: guion de navegador, caso «campos compartidos >=16 px en móvil»: falla en la base para 320/375/390, pasa después; medición con `getComputedStyle`. Filtros medidos por separado, ayuda y foco comprobados. Sin desbordamiento horizontal en las superficies verificadas.
- Riesgo: texto mayor puede ocupar más espacio en formularios no recorridos. Chrome no demuestra comportamiento del teclado/zoom de Safari ni iPhone real; esos límites siguen pendientes.

### 3. Cambio de estado, incluido Completar

- Causa raíz: `app/dashboard/bookings/page.tsx:159` (base) enviaba todos los errores a `scheduleError`, cuya rama 400 explica ambigüedad de horario. Eso ocultaba el rechazo real de transición.
- Contrato comprobado, intacto: `apps/api/src/bookings/bookings.service.ts:51–72`. BARBER: PENDING → CONFIRMED; CONFIRMED → COMPLETED/NO_SHOW. Tabla administrativa: PENDING → CONFIRMED/CANCELLED; CONFIRMED → COMPLETED/NO_SHOW/CANCELLED; CANCELLED → PENDING/CONFIRMED. No hay salida de COMPLETED/NO_SHOW en estas tablas. **Pendiente no puede pasar directamente a Completada para ningún rol.** El rechazo está en líneas 461–469. Scope, Guards y permisos siguen en backend; las acciones existentes de UI no se ampliaron.
- Corrección mínima: `lib/booking-status-error.ts:4` interpreta status y mensajes de dominio inspeccionados; PENDING → COMPLETED rechazado pide «Primero confirma la reserva para poder completarla». 409 conserva conflicto real conocido; 401 pide iniciar sesión; 403 explica permiso; 404 no revela recursos; desconocido usa texto neutral. `bookings/page.tsx:167,232` muestra alerta persistente y mueve el foco para verla después de pulsar en una fila móvil.
- Regresión: prueba de componente de Completar falla en base y pasa después; pruebas de lógica cubren pendiente/completada, permiso, sesión, conflictos, inexistente y error técnico. En el árbol final, navegador: 400 de transición y 409/403 controlados sin código en cuatro anchos; 503 conserva código de soporte copiable. BARBER pendiente ofrece Confirmar y no Completar/Cancelar. No se modificó la transición CONFIRMED → COMPLETED ni su regla temporal vigente.
- Riesgo: nuevos mensajes de dominio backend desconocidos recibirán fallback seguro hasta inspeccionar su causa. No se afirma QA integrado contra un servidor real.

### 4. Código recibido del API

- Causa raíz: `lib/api.ts:17,125` (base) conservaba status/texto/reintento pero descartaba cabecera. El código backend inspeccionado genera UUID v4 con `randomUUID()` en `apps/api/src/common/http-telemetry.ts:45` y lo asigna a `X-Request-Id` en línea 48; CORS lo expone en `apps/api/src/main.ts:47`. Durante la implementación no se verificó su emisión real porque conectar con servicios externos estaba excluido. La autorización posterior permitió verificar el header en QA: ver la sección de despliegue. No hace falta añadir un contrato backend; cero cambios backend.
- Corrección vigente: `ApiError` conserva únicamente UUID v4 válido, incluso cuando decide no mostrarlo. `withRequestCode` añade «Código de soporte» solo para un error inesperado. Los textos, status y reintentos originales permanecen; ninguna modificación toca resolver de sesión, token, caché, señales de abort ni selección de organización. Ausencia de cabecera, UUID inválido, error de red o timeout sin respuesta no inventan código.
- Errores que lo muestran, si el API emitió un UUID válido: sesión no válida (401), fallos inesperados de carga del panel/perfil y 5xx, respuesta HTTP sin causa clara, y guardado cuyo API no aporta mensaje útil y recibe el fallback neutral. En cambio de estado, un 400 que no coincide con una transición conocida conserva soporte junto al fallback. Equipo/Facturación no consideran inesperado un 400 solo porque su formateador use texto neutro: con mensaje API claro se oculta; si la respuesta carece de mensaje útil, se conserva. Red/timeout solo pueden mostrarlo si existe un código recibido; actualmente el fallo anterior a una respuesta HTTP no lo tiene.
- Errores que no lo muestran: transición no permitida, contraseña corta y otras validaciones claras 400, falta de permiso 403, conflictos de disponibilidad/revisión 409 y recursos inexistentes 404; también validaciones claras 413/422 y espera por límite 429. El UUID puede estar presente en `ApiError` sin aparecer en pantalla. Los errores esperados mantienen explicación y acción siguiente.
- Presentación: `ErrorText.tsx` es cliente y reutiliza la representación en sesión/perfil/estado, Clientes, CMS, onboarding, confirmación pública y toasts. Línea secundaria de 12 px, color atenuado, `white-space: nowrap`, elipsis y UUID completo en `title`. Botón nativo «Copiar», nombre accesible «Copiar código de soporte», foco visible y activación por teclado; copia el UUID completo, nunca el texto truncado. «Copiado» se anuncia con `role="status"` y vuelve a «Copiar» tras dos segundos. Si falla el portapapeles se anuncia el fallo y se permite reintentar. La instancia se reemplaza al cambiar el código para no conservar la confirmación de otro UUID.
- Regresión: pruebas HTTP conservan UUID de validación y gateway, separan validación clara de fallback vacío; lógica cubre rechazo/transición/conflicto frente a fallos inesperados y UUID inválidos/ausentes. Componentes prueban ausencia en regla de negocio, presencia en 503 y copia exacta. Chrome verifica soporte en 401/503, ausencia en 400/403/409, elipsis de una línea, contraste calculado ≥4,5:1 sobre los fondos recorridos, foco y Enter para copiar. Portapapeles controlado en el fixture: no se lee ni sustituye el del propietario. El borrador del perfil se conserva tanto en rechazo 400 como en fallo 503.
- Riesgo: errores sin respuesta/cabecera no serán correlacionables en pantalla. Algunos guardados usan el toast existente de tres segundos; su duración no se amplía. No se añade logging ni persistencia de producto del identificador; la copia al portapapeles exige la acción explícita del usuario. La emisión HTTP real de QA, pendiente en la implementación, quedó verificada posteriormente según la sección de despliegue.

### 5. Fecha natural y ayuda de filtros

- Causa raíz: `app/[slug]/_components/SuccessView.tsx:31` (base) interpolaba `YYYY-MM-DD` y `HH:mm`. Filtros Reservas `page.tsx:243` y Facturación `page.tsx:164` no tenían ayuda visible. Los placeholders de fecha dependen del navegador.
- Corrección mínima: `SuccessView.tsx:33` reutiliza `formatCalendarDate(date, 'long')` y `clockLabel(time)`. `lib/business-time.ts:146` conserva el formato anterior por defecto para otros consumidores. La fecha/hora de disponibilidad pública **ya son valores locales del negocio**; se formatean sin convertirlos a la zona del dispositivo. UTC en el formateador representa únicamente la fecha de calendario, no una cita/instante. No se inventa un campo de zona en la proyección pública ni se reconstruye un instante distinto. Ayudas asociadas a Desde/Hasta aclaran rango incluido y muestran ejemplos (Reservas líneas actuales 258/277; Facturación 172/192).
- Regresión: fecha 2099-01-05 y 23:00 aparece «5 de enero de 2099 a las 11:00 p. m.» incluso con dispositivo en Asia/Tokyo. Base falla y después pasa en componente/navegador. Ambos pares de filtros tienen descripción accesible visible que falla antes y pasa después.
- Riesgo: depende de los valores locales autoritativos ya suministrados por disponibilidad; un contrato futuro distinto requerirá revisión. No cambia selección de fecha, conversión/validación DST, WhatsApp ni diseño de confirmación.

### 6. Profesional como etiqueta del rol

- Causa raíz: etiquetas literales y mapas del inventario anterior mezclaban Barbero, BARBER y Membership en texto visible.
- Corrección mínima: mapas y copy únicamente; `TEAM_ROLE_OPTIONS` sigue enviando `value: 'BARBER'`. La palabra BARBER en mensajes de error recibidos se sustituye solo para presentación en el cliente HTTP. Tipos, payload, Guards, modelos, contratos y plantillas intactos.
- Regresión: `F0A.test.tsx` verifica etiqueta/opción Profesional y valor BARBER conservado; falla en base y pasa después. Menú desktop real con rol sintético BARBER muestra Profesional después; las acciones del rol siguen limitadas. Búsqueda final e inventario de excepciones documentados arriba.
- Riesgo: no se sustituye contenido escrito por negocios/clientes ni la descripción de una fotografía. No se traduce el identificador en contratos internos.

## Comandos y resultados

Comandos ejecutados con pnpm desde la raíz, sin instalar dependencias. Los primeros intentos dentro del sandbox encontraron EPERM al leer la configuración de pnpm; las ejecuciones autorizadas fuera de ese límite terminaron con los resultados siguientes. Ese problema de acceso no se confundió con un resultado de pruebas. `type-check:clean`, `build`, `lint`, `test` y navegador sin `--baseline` se repitieron en la segunda continuación sobre el ajuste UX. Las filas API, `type-check` simple y navegador `--baseline` conservan evidencia histórica y no se presentan como nuevas ejecuciones.

| Comando | Exit code | Resultado |
| --- | --- | --- |
| `pnpm --filter api type-check` | 0 | TypeScript API |
| `pnpm --filter api lint` | 0 | Lint API |
| `pnpm --filter api test -- --runInBand` | 0 | 763 pruebas pasan, 37 omitidas; 60 suites pasan, 3 omitidas |
| `pnpm --filter api build` | 0 | Build API |
| `pnpm --filter web type-check` | 0 | Evidencia histórica de TypeScript de la implementación inicial; la continuación valida el árbol final con `type-check:clean` |
| `pnpm --filter web type-check:clean` | 0 | Limpieza de tipos generados, `next typegen` exitoso (`Types generated successfully`) y `tsc --noEmit` completado |
| `pnpm --filter web lint` | 0 | ESLint final, sin diagnósticos |
| `pnpm --filter web test` | 0 | 142 pruebas de lógica y 77 de componentes (13 archivos); total 219, cero fallos |
| `pnpm --filter web build` | 0 | Next 16.3.3/Turbopack: compila, pasa TypeScript, genera 16/16 páginas y finaliza optimización; fuentes reales, sin mocks |
| `pnpm --filter web exec node scripts/f0a-browser.mjs --baseline` | 1 | Rojo esperado contra HEAD: 43 fallos, 9 pasan |
| `pnpm --filter web exec node scripts/f0a-browser.mjs` | 0 | 60 comprobaciones pasan en 320/375/390/1280 px, incluida la UX de soporte |
| `git diff --check` | 0 | Sin errores de whitespace |

Regresión inicial específica de componentes: 7 fallaban/1 pasaba antes; ocho pasaron tras corregir. Se añadió el caso de asociación con etiqueta que contiene espacios: nueve casos F0-A pasaban en la primera entrega; en el árbol final son once, incluidos soporte y copia. La prueba HTTP de UUID también falló antes/pasó después. Los cuatro casos iniciales de lógica de estado/código y el caso adicional de clasificación esperado/inesperado pasan. Una ejecución intermedia inicial de navegador presentó cuatro falsos fallos por charset incompleto del servidor de prueba; se corrigió únicamente el fixture UTF-8 y se repitió la comparación completa, sin alterar la lógica de producto para esconderlos.

El bloqueo anterior `WEB_CONFIG_INVALID variable=DEPLOY_ENV` quedó resuelto mediante la autorización expresa del propietario: `DEPLOY_ENV=development`, `NEXT_PUBLIC_API_URL=http://localhost:3000` y los marcadores suministrados para `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`, definidos exclusivamente en el proceso PowerShell de cada comando y heredados por pnpm/Next. No se guardaron como configuración en disco ni se modificó `.env`, `.env.local`, configuración persistente, scripts de compilación, dependencias o validador; las claves reales del propietario no se usaron para estas validaciones. Next informa que carga `.env.local` automáticamente, pero las cuatro variables ya definidas en el proceso prevalecen. Los cuatro archivos `.env*` de raíz/web conservan exactamente sus hashes SHA256 anteriores a los comandos.

En la primera continuación, el intento de `type-check:clean` terminó con exit code 1 por `EPERM` al abrir la configuración de pnpm, antes del script; la repetición autorizada terminó con exit code 0. El build posterior terminó con exit code 1 por fuentes bloqueadas: `apps/web/app/layout.tsx:2` importa `next/font/google`, y las tres familias requieren recursos externos. Esos imports también están en HEAD; `layout.tsx`, `next.config.ts`, `web-deployment-config.ts` y `package.json` no tienen diff. No fue un defecto introducido por F0-A.

En la primera continuación se desactivó la telemetría (`NEXT_TELEMETRY_DISABLED=1`) y se apuntó el proxy a `127.0.0.1:9`, solo en procesos: el bloqueo de fuentes se reportó sin aprobarlo. La segunda autorización lo resolvió con un proxy CONNECT temporal en loopback que permite exclusivamente `fonts.googleapis.com:443` y `fonts.gstatic.com:443`; cualquier otro destino HTTP/CONNECT se rechaza. La guarda temporal de Node impide conexiones directas salvo al proxy y al puerto IPC exacto que Turbopack entrega a su propio worker local. Proxies, guarda y marcadores existen solo en el entorno del build; no se cambió configuración persistente.

El helper y la guarda están fuera del repositorio en `%TEMP%/kortek-f0a-build/`. Se invocó `node (Join-Path $env:TEMP 'kortek-f0a-build/font-only-build.cjs')` desde la raíz; el helper ejecuta exactamente `pnpm --filter web build`. La primera compilación exitosa registró solicitudes únicamente a los dos dominios autorizados y descargó las fuentes reales. Tras finalizar la confirmación «Copiado» y revisar los rechazos claros 400, se repitió el mismo build: exit code 0, compilación 4,3 s, TypeScript 6,3 s, 16/16 páginas en 1.211 ms y optimización final; las fuentes reales se reutilizaron desde caché generada. No se definió `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`, no se generó un archivo de fuentes simuladas y no fue necesario el fallback: es un build completo de compilación, sin equivaler a aprobación de interfaz o despliegue.

Los intentos intermedios del helper también quedaron investigados: uno terminó antes de Next por escape de la ruta de `NODE_OPTIONS`; otros builds terminaron con exit code 1 porque la guarda bloqueaba el IPC de PostCSS, y la caché de Turbopack conservaba ese resultado. Se corrigió únicamente el helper temporal, se admitió el puerto interno concreto y se limpió `apps/web/.next/cache/turbopack` tras comprobar que la ruta absoluta pertenecía a `.next`. No se alteró fuente de producto para ocultar esas causas. No se detectó otro defecto de build F0-A. No hubo conexión a API, Clerk, Supabase, una base de datos ni otro servicio real fuera de Google Fonts.

## QA de navegador aislado y límites

Guion reproducible: `apps/web/scripts/f0a-browser.mjs`. Chrome headless sobre Windows, altura 900 px, anchos 320/375/390/1280, zona del dispositivo Asia/Tokyo y negocio sintético America/Santo_Domingo. Componentes, estilos Tailwind, hooks, AuthProvider y cliente HTTP de producto reales; sustitutos solo en el fixture para Clerk/navigation/link y respuestas HTTP interceptadas. Todos los accesos ajenos al servidor de prueba y API interceptada se bloquean; cero solicitudes inesperadas y cero errores JavaScript en cada ancho. El guion no carga dotenv ni modifica configuración de producto. Las respuestas y la sesión de prueba son sintéticas.

Evidencia local no versionada: `.tmp/f0a/antes.json` conserva la comparación histórica contra HEAD; `despues.json` y capturas `despues-*` corresponden al guion final de 60 comprobaciones. Incluyen campos, cuenta válida/inválida, éxito, filtros, rechazos de estado, sesión y perfil. La revisión visual inicial recorrió cuenta 320, Facturación 375, estado 320 y guardado 390. La revisión visual de esta continuación inspeccionó `despues-estado-inesperado-320.png` y `despues-perfil-guardado-inesperado-390.png`: código atenuado truncado en una línea, «Copiado» y foco visibles, controles sin desbordamiento y borrador conservado. Las capturas `despues-estado-inesperado-*` y `despues-perfil-guardado-inesperado-*` registran los nuevos casos 503. Evidencia de teclado: ayuda vinculada, foco en filtros/error de estado, asociación de contraseña y copia mediante Enter. El guion final mantiene cero errores JavaScript y cero solicitudes inesperadas por ancho.

No verificado en esta tanda:

- iPhone físico/Safari, teclado y zoom automático real; Chrome prueba el tamaño computado y el layout, no el comportamiento iOS.
- Arranque local mediante `next start` e integración completa con Clerk/API: no se verificaron. La Preview QA se desplegó y su landing cargó después, por autorización separada registrada arriba; esa comprobación no equivale a QA integrado completo.
- Login Clerk real, recuperación de sesión móvil (excluida), acceso a DB reales y QA funcional desplegado completo. Las peticiones HTTPS de lectura a la API QA para verificar el header se registran por separado arriba.
- Prueba integrada de cada combinación de roles/tenants y todos los formularios. Se recorrieron OWNER y BARBER sintéticos y se conservaron las pruebas existentes de scopes/permisos; eso no aprueba los módulos.
- Envíos/entregas de correo, calendario, pagos, rediseño de confirmación o cambios a Crear cuenta; permanecen fuera de alcance.

Durante la implementación aislada no se abrió conexión a barberflow, Cutover QA ni producción. Backend, Prisma, dependencias, lockfile, configuración y contratos C0–C3 no tienen diff. En la implementación anterior se sincronizaron este informe, `docs/README.md`, `PROJECT_MASTER.md` y `CHANGELOG.md`; `BACKEND_CHANGES.md` permanece intacto porque no cambió el contrato. Las continuaciones preservan las referencias históricas al bloqueo anterior en los otros tres documentos, por instrucción de no modificarlos; el estado vigente de la validación, aprobación y despliegue está registrado aquí.

## Git al terminar la implementación — evidencia histórica

`git branch --show-current`: `ai/antigravity-qa`. `git rev-parse HEAD`: `389a169f97c6a95e174255bb2595c7a72c443357`. `git diff --cached --name-only`: sin salida. 28 archivos versionados modificados y seis nuevos, todos dentro de código web, pruebas y documentación F0-A. Ningún archivo staged. `git diff --stat`: 204 inserciones y 65 eliminaciones en los 28 archivos versionados; los seis nuevos no aparecen en ese conteo. `git diff --check`: exit code 0.

La comparación de rutas/estados con el inicio confirma exactamente los mismos 34 archivos. El informe ya pertenece a los seis nuevos, no es un archivo 35. Frente al inicio de la segunda continuación cambian únicamente este informe y las 11 rutas del ajuste autorizado: `apps/web/lib/api.ts`, `api.test.ts`, `booking-status-error.ts`, `booking-status-error.test.ts`; `apps/web/components/ui/ErrorText.tsx`, `components/booking/F0A.test.tsx`, `components/cms/CmsSettings.tsx`, `components/public/PublicMiniSite.tsx`; `apps/web/app/dashboard/clients/page.tsx`, `setup/page.tsx`; y `apps/web/scripts/f0a-browser.mjs`. Las otras 22 rutas conservan su contenido byte por byte. Los cuatro archivos `.env*` también conservan sus hashes.

`git status --short --untracked-files=all` no muestra artefactos. `git check-ignore -v` confirma `apps/web/.next` y sus tipos bajo `apps/web/.gitignore:19`, y `apps/web/tsconfig.tsbuildinfo` bajo `apps/web/.gitignore:43`; `git ls-files` no contiene `.next` ni `tsbuildinfo`. No se añadió staging, commit o push.

Salida final de `git status --short`:

```text
 M CHANGELOG.md
 M PROJECT_MASTER.md
 M apps/web/app/[slug]/_components/AccountStep.tsx
 M apps/web/app/[slug]/_components/SuccessView.tsx
 M apps/web/app/dashboard/bookings/page.tsx
 M apps/web/app/dashboard/clients/page.tsx
 M apps/web/app/dashboard/invoices/page.tsx
 M apps/web/app/dashboard/layout.tsx
 M apps/web/app/dashboard/professionals/page.tsx
 M apps/web/app/dashboard/setup/page.tsx
 M apps/web/components/cms/CmsSettings.tsx
 M apps/web/components/dashboard/Sidebar.tsx
 M apps/web/components/landing/Proof.tsx
 M apps/web/components/public/PublicMiniSite.tsx
 M apps/web/components/ui/Field.tsx
 M apps/web/components/ui/PasswordField.tsx
 M apps/web/components/ui/Toast.tsx
 M apps/web/lib/api.test.ts
 M apps/web/lib/api.ts
 M apps/web/lib/auth-context.tsx
 M apps/web/lib/business-schedule.ts
 M apps/web/lib/business-time.ts
 M apps/web/lib/invoice-ui.ts
 M apps/web/lib/media-ui.ts
 M apps/web/lib/notification-ui.ts
 M apps/web/lib/service-ui.ts
 M apps/web/lib/team-ui.ts
 M docs/README.md
?? apps/web/components/booking/F0A.test.tsx
?? apps/web/components/ui/ErrorText.tsx
?? apps/web/lib/booking-status-error.test.ts
?? apps/web/lib/booking-status-error.ts
?? apps/web/scripts/f0a-browser.mjs
?? docs/quality/CORRECTIVO_F0A.md
```

Al terminar la implementación, no se había publicado el correctivo y la revisión del propietario estaba pendiente. Los bloqueos de configuración y fuentes quedaron resueltos; tipos, build completo, tests, lint y QA aislado del ajuste UX pasaron. Posteriormente el propietario aprobó Gate 4, autorizó commit/push y despliegue QA; publicación, Preview Ready y comprobación HTTP de `X-Request-Id` constan en la sección superior. Siguen pendientes el QA integrado completo e iPhone/Safari; no aplicar migraciones ni avanzar otros gates por inferencia. El cambio documental de esta tarea requiere nueva autorización antes de commit/push.
