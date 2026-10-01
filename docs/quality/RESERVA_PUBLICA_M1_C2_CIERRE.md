# Reserva pública M1 — entrega C2 frontend

Fecha: 2026-10-01. **C2 FRONTEND CERRADO / APROBADO EXPLÍCITAMENTE POR EL PROPIETARIO; COMMIT/PUSH AUTORIZADOS SIN DESPLIEGUE.** La aprobación comprende la implementación y evidencia local descritas, con sus límites documentados. C3/QA física y producción mantienen autorización independiente.

## Aprobación posterior y autorización de publicación Git

El 2026-10-01 el propietario aprobó expresamente el frontend C2 y autorizó commit/push exclusivamente a `origin/ai/antigravity-qa`, nunca a `main`, sin despliegue. Ante la referencia inicial a un paso 2 ausente, aclaró expresamente: «No hay condiciones, sigue adelante». Esa instrucción elimina la condición y desbloquea la publicación Git; la aprobación procede del propietario, no del commit o push. C3 y producción conservan sus gates separados. Las prohibiciones de publicación y el estado de Git consignados más abajo describen la entrega original anterior a esta autorización.

Preparación de publicación: rama y HEAD base verificados, índice vacío; auditoría de las 42 rutas, enlaces y JSON de evidencia sin material privado detectado, exit `0`. Se repitieron `pnpm --filter web exec tsc --noEmit`, `pnpm --filter web lint`, `pnpm --filter web test:unit` (152 aprobadas) y `pnpm --filter web test:components` (18 archivos / 110 aprobadas), todos con exit `0`. Se revisaron diff y archivos nuevos; no se modificó código ni se repitieron build, QA de navegador o pruebas con base de datos en esta preparación. HEAD y remoto se comprobaron iguales a `d9b508f8317bf128fb409c0a22098895f24ea5fb` antes de publicar. Este checkpoint sincroniza la aprobación en PROJECT_MASTER, README, CHANGELOG, APP_FLOWS y este cierre. La publicación requiere staging por las 42 rutas explícitas, revisión del diff staged, un commit coherente y push solo a la rama indicada; SHA definitivo, igualdad local/remoto y árbol final se reportan tras ejecutar y verificar Git. Sin despliegue, cambios operativos ni acceso a bases reales.

## Autorización, base y fuentes

El propietario autorizó expresamente C2 sobre C0/C1 aprobados y fijó D6-B. Base exacta: `d9b508f8317bf128fb409c0a22098895f24ea5fb`, rama `ai/antigravity-qa`; `git status --short` inicial vacío. La tarea prohíbe commit, push, despliegue, dependencias nuevas y acceso a bases reales. Se respetó ese alcance.

Fuentes: [decisiones vinculantes](DECISIONES_PROPIETARIO_2026_09_29.md), [C0](RESERVA_PUBLICA_M1_C0.md), [C1 aprobado](RESERVA_PUBLICA_M1_C1_CIERRE.md), [auditoría de hallazgos](AUDITORIA_HALLAZGOS_ROADMAP_MVP_2026_09_29.md), [auditoría UX](AUDITORIA_DISENO_UX_MARKETING_2026_09_29.md), [visión CMS/pagos](../features/CONFIGURACION_CMS_PAGOS_VISION.md), estándares/gates y código real. Se aplicaron kortek-delivery, kortek-product-ui y las skills de diseño/copy solicitadas. Las dos capturas adjuntas se revisaron: motivan sustituir el selector nativo de fecha con horas extensas por el calendario inline y el control compacto.

La propuesta histórica D6-A de C0 queda sustituida por la selección expresa D6-B; la indicación histórica de que C2 requería autorización queda satisfecha por esta tarea. No se encontró el informe separado `reporte_de_testing_y_hallazgos_t_cnicos_cto.md` en `docs/` ni en los adjuntos disponibles; se usaron los hallazgos verificables de las auditorías anteriores y las capturas, sin inventar el contenido de ese informe. No se identificó un conflicto vinculante que exigiera ampliar contrato o módulo.

## Resultado implementado

- `/{slug}` conserva contenido/proyección y revalidación. «Reservar cita» es un enlace a `/{slug}/reservar`; funciona como acceso directo y tiene regreso claro al mismo negocio. La nueva visita relee los datos sin reutilizar el formulario anterior.
- Cinco pasos: servicio, profesional, fecha/hora, tus datos y revisión. Cuenta y avisos se integran en Datos. No hay pago. Un profesional único queda seleccionado y visible sin exigir una elección vacía; «Cualquiera disponible» omite el filtro en consultas y exige aceptar el candidato concreto del slot antes del POST.
- [AvailabilityPicker](../../apps/web/components/booking/AvailabilityPicker.tsx) es presentación controlada reutilizable: recibe mes, fecha mínima, días, slots, selección, estados y callbacks. El consumidor público consulta `availability-days` por mes, recortado desde la fecha mínima y siempre ≤31 días inclusivos; luego consulta el día. Números sin disponibilidad visibles/deshabilitados; hora en select nativo, sin entrada libre ni primera hora seleccionada automáticamente. Las flechas recorren fechas habilitadas. Con ancho útil <308 px se ofrece lista equivalente; a 320 px cabe el calendario con objetivos de 44 px.
- `startTime` y `professionalId` proceden del slot. Cambiar servicio/profesional/día limpia la selección dependiente; revalidación de catálogo, vuelta a revisión/foco y comprobación anterior al POST impiden sustituir silenciosamente al profesional. Si el candidato falta en el catálogo, se exige revisar profesional antes de avanzar. El cambio de día del negocio relee la fecha mínima y las consultas dependientes.
- Nombre/teléfono obligatorios; teléfono internacional con 7–15 dígitos y máximo de entrada 30, sin inferir país. Correo opcional, validación junto al campo antes de avanzar y foco al primer error. Cuenta desmarcada, aviso QA exacto, correo/contraseña ≥8 al optar; desmarcar borra contraseña y el POST invitado la omite. El consentimiento de correo sigue separado y cambiar correo lo desmarca; no se promete entrega. La opción de avisos sin correo conserva el comportamiento contractual de Notificaciones y no vuelve obligatorio el correo para invitado.
- D11 HTTP 400 vuelve a Datos y conserva nombre, teléfono, correo, contraseña, consentimiento y selección de esa visita. Muestra el texto neutro aprobado, sin revelar contacto/cuenta existente ni códigos internos. 409 exige otra selección; 429 conserva datos y permite editar. El POST y los controles de consulta afectados respetan el plazo del API, obtenido de cabecera o cuerpo; las queries afectadas suspenden su refresco de foco. No hay reintento automático de escritura.
- Timeout/5xx después de iniciar POST muestra incertidumbre y regreso al negocio, sin reenvío a ciegas. Se comprobó incluso cuando la reserva sí quedó creada y se retuvo la respuesta. Carga inicial tiene estructura estable y `aria-busy`; errores de lectura permiten recuperar la consulta; vacío de catálogo/mes/día, retirada y resultado son estados distintos.
- Éxito usa el resultado real y dice «Tu reserva quedó registrada» / «Pendiente de confirmación». Incluye fotos elegibles/respaldo, fecha natural mediante BusinessTime, duración autoritativa, profesional, negocio/ubicación publicada y próximos pasos. Título enfocado y anuncio de estado separado para evitar repetir el título. No repite contacto/contraseña del visitante ni promete cuenta utilizable o confirmación.
- Calendario local opcional `.ics`: instantes del resultado, título pendiente, `STATUS:TENTATIVE`, identificador local sin IDs operativos, escape y plegado UTF-8; no incluye contacto ni se actualiza automáticamente. Maps reutiliza el validador de CMS. WhatsApp conserva helper, aviso, dominio/mensaje genéricos y enlace manual aprobados; sus clics no crean, confirman ni envían la reserva.
- Fotos solo desde la proyección pública de Medios, emparejadas por IDs del catálogo y slug, sin optimizador ni avatar legacy. Ausencia/fallo tiene respaldo neutro; retirada 404 elimina el contenido anterior. Tras un alta ya recibida, retirada conserva únicamente reconocimiento de registro, sin afirmar cancelación.
- Borrador/resultado viven en memoria. Usuario, rol, organización y slug delimitan el montaje; se descartan efectos tardíos, incluida A → B → A y salida durante POST. Sin URL de recibo, localStorage/sessionStorage, analytics ni endpoint inventado. La interfaz sigue llamando «Profesional» al rol interno BARBER; no cambia permisos.

No se modificaron API, Prisma, contratos, paquetes ni lockfile. BACKEND_CHANGES conserva C1. Se sincronizan PROJECT_MASTER, README, CHANGELOG y APP_FLOWS. Las pruebas del asistente anterior se migraron al nuevo consumidor: fecha/instante, avisos y efecto tardío de WhatsApp mantienen cobertura; el archivo antiguo WhatsAppScope queda sustituido por M1C2. Los componentes legacy que no se usan en la ruta no se refactorizan fuera de alcance.

## Entorno aislado y evidencia real

PostgreSQL 18 propio en loopback `127.0.0.1:55462`, base nueva `m1_c2_test`, runner separado sin SUPERUSER/CREATEDB/CREATEROLE/BYPASSRLS. Antes de sembrar se verificaron `current_database`, usuario y privilegios. Se aplicaron las 27 migraciones existentes solo aquí. No se conectó ni modificó barberflow, bases de QA o producción.

API local `3042`: módulos Nest/Prisma, ValidationPipe, Guards, Membership, motor, limitadores y transacciones reales. El proveedor de bytes de imágenes se controló con ilustraciones sintéticas; no se hicieron cargas/moderaciones nuevas en Cloudinary/Rekognition. Web compilada y servida en `3011`. La configuración necesaria para el ensayo se pasó únicamente a estos procesos desechables; ningún `.env`, flag, secreto o proceso operativo se editó. Correo y eventos permanecieron desactivados en el ensayo. El arranque de prueba no sustituye los gates operativos de C3.

Dos negocios exclusivamente sintéticos: M1 QA Norte, zona Santo Domingo, dos profesionales públicos y fotos publicadas; M1 QA Sur, zona Tokio, uno público y sin fotos/contacto/Maps. Ambos tienen cierre completo, catálogo de 30/240 minutos y perfiles privados/inactivos excluidos. Dispositivo simulado en Los Ángeles. El servicio largo no cabe en la ventana de tres horas: el mes queda vacío de forma real. Los contadores de abuso se reiniciaron **solo en esta base** entre escenarios para separar casos; no se desactivó el limitador ni se atribuye a este ensayo una garantía contra bots distribuidos.

Chrome real `154.0.8037.58`, Playwright, movimiento reducido, 320/375/390/1280 CSS px y zoom CSS 200 %. [Resumen del recorrido](evidence/m1-c2/recorrido.json), [errores](evidence/m1-c2/errores.json), [roles](evidence/m1-c2/roles.json) y [mediciones accesibles](evidence/m1-c2/accesibilidad.json). Estos archivos contienen resultados/mediciones, no contactos, IDs de reservas, tokens ni cuerpos de POST.

| Grupo | Resultado observado |
| --- | --- |
| Cuatro anchos | Acceso directo, calendario, datos, revisión, Editar/regreso, cero overflow; campos ≥16 px y controles habilitados ≥44 px |
| Invitado Norte y Sur | POST real 201/PENDING; instante y profesional iguales al slot; pertenencia de Booking verificada en DB; resumen sin contacto; recarga pierde detalle |
| Cualquiera/específico/único | Candidato visible y enviado; disponibilidad ocupada puede asignar otro candidato explícito; específico no se sustituye; único omite clic vacío |
| Fotos | Proyección real y entrega propia; solo fotos elegibles; respaldo en Sur y ninguna URL legacy/perfil privado/inactivo/motivo de cierre |
| D11 | Colisión real de dos contactos devuelve 400, sin Booking nueva; formulario y selección conservados, sin revelar causa interna |
| Cuenta QA | Cuenta secundaria creada en el caso nuevo; fallo secundario con identidad existente conserva Booking/PENDING y no ofrece repetirla |
| Lectura 503/429 | Transporte controlado sobre el consumidor real: mensaje seguro, recuperación y plazo contractual; foco no dispara otra consulta durante espera |
| Retirada | CMS real retirado durante revisión: estado neutro, sin formulario/contacto visible ni POST; fixture restaurada solo aquí |
| Carrera | Un alta ocupa el slot entre comprobación y POST: visitante recibe 409 y vuelve al selector, una sola reserva en DB y un POST del visitante |
| Timeout | POST real crea Booking; respuesta retenida >30 s: incertidumbre, ausencia de reenvío, un POST y una reserva real |
| Teclado/accesibilidad | Flechas/Enter, foco visible, error asociado, foco al primer inválido y al éxito; etiquetas de checkboxes ≥44 px; sin bloqueo del zoom |
| WhatsApp | Regresiones Chrome: destino interceptado, enlace nativo/teclado, doble activación sin nuevo POST, bloqueo real por sandbox, teléfonos inelegibles y A → B → A |

Los casos 400/409, retiro, invitados, cuentas y timeout usan API/DB reales. 503/429 de lectura y las regresiones de WhatsApp usan respuestas HTTP controladas claramente separadas. Hay cero errores JavaScript de página en los reportes; las regresiones registran consola y admiten la advertencia existente de Clerk de desarrollo. No se afirma ausencia de los mensajes de red esperados de las pruebas negativas.

Sesiones Clerk **reales de prueba**, cuatro identidades sintéticas existentes y ocho Memberships nuevas solo en la base desechable. OWNER, ADMIN, RECEPTIONIST y BARBER completaron una reserva PENDING en cada negocio: **ocho recorridos**. Desde el navegador se leyeron `/bookings` con cada sesión y contexto tenant; IDs contrastados con DB confirman aislamiento. Profesional solo recibe su agenda vinculada. CUSTOMER obtuvo 403 usando JWT legacy controlado y Membership local; no se acredita continuidad Clerk/Mis reservas B2C.

Limitación de entrada: `/login` local no llegó a devolver documento en tres intentos de 30 s. Clerk público/BAPI devolvieron 200 en sondas acotadas; el SDK local devolvió `signed-out/dev-browser-missing`. No se atribuye la causa a un fallo concreto. Para el QA autenticado se inició sesión por el SDK Clerk real desde la página pública, completando Device Trust de prueba y esperando bootstrap 200 antes de cada recorrido. No se desactivó la verificación ni se cambió middleware/autenticación. Esa evidencia prueba sesión/rol/alta/lectura; **no acredita la pantalla `/login` ni el recorrido visual del panel privado** en este entorno.

Capturas públicas sintéticas: [320](evidence/m1-c2/calendario-320.png), [375](evidence/m1-c2/calendario-375.png), [390](evidence/m1-c2/calendario-390.png), [1280](evidence/m1-c2/calendario-1280.png), [éxito Norte](evidence/m1-c2/exito-norte.png), [éxito Sur](evidence/m1-c2/exito-sur.png) y [zoom 200 %](evidence/m1-c2/zoom-200.png). No hay capturas de formulario poblado, login o datos privados.

## Comandos y resultados

Todos los resultados finales siguientes terminaron con exit **0**; los servidores son procesos de prueba cuya disponibilidad se verificó por HTTP, no comandos de validación terminados.

| Comando | Evidencia |
| --- | --- |
| `git branch --show-current`, `git rev-parse HEAD`, `git status --short` | Rama/base anteriores; árbol inicial limpio |
| `pnpm --filter web exec tsc --noEmit` | Tipos finales limpios |
| `pnpm --filter web lint` | Lint final sin errores ni advertencias |
| `pnpm --filter web test:unit` | 152 aprobadas, cero omitidas/fallidas |
| `pnpm --filter web test:components` | 18 archivos, 110 aprobadas, cero omitidas/fallidas |
| `pnpm --filter web exec vitest run components/public/M1C2.test.tsx components/notifications/BookingEmailOptIn.test.tsx` | 12 aprobadas en la ejecución dirigida anterior; la suite final incorpora también 429/candidato desconocido |
| `node .tmp/m1-c2/runtime.cjs init`, `migrate`, `seed`, `fixture-cms` | Cluster/base aislados, 27 migraciones y fixture sintética válidos |
| `node .tmp/m1-c2/runtime.cjs build-api` | `pnpm --filter api build`; API fuente intacta |
| `node .tmp/m1-c2/runtime.cjs build-web` | `pnpm --filter web build` con configuración temporal; nueva ruta incluida |
| `node .tmp/m1-c2/runtime.cjs browser-regressions` | `pnpm --filter web test:browser`: 21 aprobadas y una omisión prevista del caso exclusivo móvil en el proyecto desktop |
| `node .tmp/m1-c2/browser.cjs` | Siete grupos: responsive, invitados, D11 y cuenta; API/DB reales |
| `node .tmp/m1-c2/advanced.cjs` | Seis grupos: fotos, vacío/teclado/zoom, errores GET, retirada, carrera y timeout |
| `node .tmp/m1-c2/authenticated.cjs` | Ocho altas Clerk por rol/tenant y CUSTOMER 403; nueve comprobaciones |
| `node .tmp/m1-c2/accessibility.cjs` | Contraste calculado de texto/hover ≥4,5:1, borde de campo ≥3:1 y etiquetas táctiles ≥44 px |
| `git ls-remote origin refs/heads/ai/antigravity-qa` | Remoto = HEAD base `d9b508f8317bf128fb409c0a22098895f24ea5fb`; consulta sin push |
| `git diff --check` | Sin errores de whitespace en la revisión final; avisos LF/CRLF propios de la configuración existente |
| `node .tmp/m1-c2/delivery-audit.cjs` | Rama/SHA e índice, 42 rutas dentro del alcance, enlaces/evidencia válidos, sin material privado en la entrega |
| Limpieza de procesos C2 y `pg_ctl -D .tmp/m1-c2/postgres -m fast -w stop` | Web/API/cluster detenidos, puertos 3011/3042/55462 sin listeners; archivo privado efímero retirado |

Los primeros intentos terminaron en 1 por expectativas del asistente anterior, etiqueta del calendario, asignación dinámica, foco programático frente a modalidad teclado y reutilización de la cuenta sintética. Se corrigieron las pruebas conservando los comportamientos y se repitieron con los resultados anteriores. Un error de expectativa del anuncio `status` se adaptó al título enfocado más estado pendiente; no se eliminaron validaciones de instante/privacidad. La preparación CMS inicial falló por restricciones de revisiones; se reinició únicamente la fixture incompleta en `m1_c2_test`, después se sembró transaccionalmente con revisiones válidas. `pnpm` dentro del sandbox dio EPERM al leer su configuración; las ejecuciones autorizadas posteriores usaron las dependencias existentes y no instalaron paquetes. Ninguno de esos intentos fallidos cuenta como validación aprobada.

## Embudo D13-A: diseño, sin instrumentación

Resultado objetivo: respuesta real de reserva creada, separado de confirmación, cuenta, pago o WhatsApp. El diseño conserva la allowlist de C0: inicio, selección de servicio/tipo de profesional, disponibilidad/slot, datos validados, revisión, intento, reserva creada y clase segura de error/recuperación. Una implementación futura podría contar por negocio/día y dispositivo amplio, con deduplicación efímera en memoria por etapa; recargas/abandono producirían aproximación.

No se emitieron eventos ni se añadió proveedor, ID persistente, fingerprint, grabación o métrica. Excluir contacto, contraseña, IDs personales/operativos, fecha/hora concreta, query/referrer, mensajes/cuerpos, IP cruda y claves del limitador. La retención/acceso de agregados de C0 siguen siendo propuesta para una etapa autorizada; esta entrega no crea almacenamiento, dashboard ni porcentajes de conversión.

## Límites y siguiente gate

No se verificaron teléfono físico, Safari/iOS, Chrome Android, VoiceOver/TalkBack, teclado virtual/barra móvil, retorno desde apps instaladas ni importación en calendario Apple/Google. Zoom CSS y viewport Chrome no sustituyen esas pruebas. Las aperturas de WhatsApp se interceptaron; no se enviaron mensajes. No se ejecutó Firefox/Edge ni ensayo con usuarios reales. No se probaron endpoints/despliegues QA remotos, worker/correo operativo, moderación nueva o CI remoto.

**C3 debe desplegar primero el API QA de C1**, porque `availability-days` aún no está desplegado allí según la instrucción del propietario. Después, con autorización independiente y datos sintéticos, desplegar/verificar web, acceso normal, recorrido invitado/autenticado, responsive físico, teclado/lectores, WhatsApp/calendario y rollback. Ni la aprobación de C1 ni esta implementación autoriza esa operación. Cuenta B2C/M2, pagos/M4 y apertura productiva mantienen sus gates y riesgos legacy; M1 no promete protección suficiente frente a bots distribuidos.

Siguiente paso inmediato: auditoría del propietario sobre diff, evidencia y esta entrega C2. Publicación requerirá instrucción expresa posterior; no se solicita ni ejecuta por inferencia.

## Git y relevo

HEAD permanece en `d9b508f8317bf128fb409c0a22098895f24ea5fb`, igual al remoto consultado; índice vacío. Solo frontend/pruebas M1, cuatro documentos de control, este cierre y evidencia pública sintética cambian. Ningún cambio ajeno estaba presente al comenzar; no se descartó trabajo ajeno. Sin commit/push/despliegue.

Revisión final de `git diff`, `git diff --stat`, `git diff --check`, rutas nuevas y evidencia. Estado: **20 archivos modificados, uno eliminado y 21 nuevos sin seguimiento** (42 rutas afectadas); ninguna ruta en staging. Los nuevos incluyen nueve archivos frontend/pruebas, este cierre y once evidencias (siete PNG/cuatro JSON). El archivo eliminado `WhatsAppScope.test.tsx` está cubierto por el caso equivalente de M1C2, adaptado a la ruta nueva. Backend, contratos, dependencias, lockfile y archivos de entorno operativos no cambian.

Los harnesses, fixture sintética, cluster y builds temporales permanecen en rutas ignoradas; **web, API y PostgreSQL de C2 están apagados**. Se retiró el archivo privado efímero del runtime. Para repetir localmente, reconstruir una configuración privada de prueba y renovar exclusivamente la contraseña del runner de este cluster aislado antes de arrancar el harness; `init` original no debe reutilizarse a ciegas con la base ya existente. Volver a comprobar destino y privilegios; nunca sustituir DATABASE_URL por una base real. La evidencia versionable basta para revisar la entrega sin arrancar servicios.

Estado final de Git (git status --short --untracked-files=all):

```text
 M CHANGELOG.md
 M PROJECT_MASTER.md
 M apps/web/app/[slug]/_components/ConfirmStep.tsx
 M apps/web/app/[slug]/_components/ContactStep.tsx
 M apps/web/app/[slug]/_components/DateTimeStep.tsx
 M apps/web/app/[slug]/_components/ProfessionalStep.tsx
 M apps/web/app/[slug]/_components/ServiceStep.tsx
 M apps/web/app/[slug]/_components/SuccessView.tsx
 M apps/web/app/[slug]/_components/shared.tsx
 M apps/web/components/booking/F0A.test.tsx
 M apps/web/components/notifications/BookingEmailOptIn.test.tsx
 M apps/web/components/public/PublicDates.test.tsx
 M apps/web/components/public/PublicMiniSite.test.tsx
 M apps/web/components/public/PublicMiniSite.tsx
 D apps/web/components/public/WhatsAppScope.test.tsx
 M apps/web/components/public/WhatsAppSuccess.test.tsx
 M apps/web/e2e/whatsapp-c2.spec.ts
 M apps/web/lib/queries/media.ts
 M apps/web/lib/queries/public-booking.ts
 M docs/README.md
 M docs/product/APP_FLOWS.md
?? apps/web/app/[slug]/reservar/page.tsx
?? apps/web/components/booking/AvailabilityPicker.tsx
?? apps/web/components/public/BookingPhoto.tsx
?? apps/web/components/public/M1C2.test.tsx
?? apps/web/components/public/PublicBookingScreen.tsx
?? apps/web/components/public/booking.css
?? apps/web/lib/public-booking-ui.test.ts
?? apps/web/lib/public-booking-ui.ts
?? apps/web/lib/use-public-read-wait.ts
?? docs/quality/RESERVA_PUBLICA_M1_C2_CIERRE.md
?? docs/quality/evidence/m1-c2/accesibilidad.json
?? docs/quality/evidence/m1-c2/calendario-1280.png
?? docs/quality/evidence/m1-c2/calendario-320.png
?? docs/quality/evidence/m1-c2/calendario-375.png
?? docs/quality/evidence/m1-c2/calendario-390.png
?? docs/quality/evidence/m1-c2/errores.json
?? docs/quality/evidence/m1-c2/exito-norte.png
?? docs/quality/evidence/m1-c2/exito-sur.png
?? docs/quality/evidence/m1-c2/recorrido.json
?? docs/quality/evidence/m1-c2/roles.json
?? docs/quality/evidence/m1-c2/zoom-200.png
```
