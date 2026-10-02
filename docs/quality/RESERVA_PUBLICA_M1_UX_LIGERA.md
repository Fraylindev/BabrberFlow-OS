# Reserva pública más ligera — implementación y evidencia

Fecha: 2026-10-01, America/Santo_Domingo. Estado: **DISEÑO APROBADO PARA PUBLICACIÓN QA / EN REVISIÓN; M1 SIN CIERRE, QA FÍSICA PENDIENTE**.

El propietario autorizó implementar el plan «Reserva pública más ligera» sobre C1 aprobado. Cambian presentación y estado local de `/{slug}/reservar`. La autorización original no incluía publicación. Posteriormente el propietario aprobó expresamente este correctivo para commit/push en `ai/antigravity-qa` y despliegue solo de la web Cutover QA, bajo las condiciones de esta publicación. M1 no queda cerrado: falta prueba en teléfono físico.

## Base y alcance

Rama `ai/antigravity-qa`, base `791569b110f9fd59cb10e6d248546bdae3996e14`. Antes de editar existían cambios C3 en CHANGELOG, PROJECT_MASTER, README, informe C3 y `evidence/m1-c3/`. Se preservan, junto al respaldo cifrado C3.

La autorización posterior reemplaza la presentación anterior D6-B por semana inicial, mes desplegable y horas visibles. Conserva contratos C1, fechas civiles e instantes autoritativos. WhatsApp conserva destinatario público, enlace, mensaje, explicación y clases.

No cambian API, Prisma, migraciones, dependencias, permisos, persistencia, `.env`, flags ni proveedores operativos. FlagCDN es el recurso externo autorizado: recibe códigos estáticos de país, sin referrer ni datos del visitante.

## Resultado implementado

- Encabezado reducido, progreso y contexto sin repetición. Servicios en filas con miniaturas de 64–80 px, duración/precio y selección visible. Descripción y biografía bajo detalles independientes del botón de selección.
- «Sin preferencia» conserva el candidato real antes del registro. Cambiar servicio/profesional invalida fecha/hora como antes.
- Semana de siete días desde el mínimo del negocio, flechas y desplazamiento horizontal limitado a esa fila. Mes desplegable sin marco exterior; elegir día cierra/alinea la semana. Abrir/cerrar conserva selección. El foco vuelve al día tras cargar el rango.
- Rangos reales de siete días o mes recortado, hasta 31 días. Días no disponibles deshabilitados; carga, vacío, error, reintento y espera por límite separados.
- Horas como botones. Con más de doce slots: Todos, Mañana, Tarde y Noche; franjas vacías omitidas. Filtro reiniciado por día y objeto slot íntegro.
- Teléfono compuesto con RD `+1` inicial, 27 países de la referencia de Kortek, búsqueda y «Otro prefijo». Máscara de diez dígitos para países `+1`; otros flexibles. Pegado `+`/`00`, prefijos compartidos y número completo desconocido conservados sin truncar ni duplicar.
- POST con el `clientPhone` internacional existente y límite contractual de 7–15 dígitos totales. Errores junto al campo, país/número al regresar, correo opcional, consentimiento y aviso QA conservados. Acción «Crear cuenta de prueba».
- Revisión y éxito sin marco exterior: fecha/hora destacadas, servicio/duración, profesional y dirección pública cuando existe. Edición y precio de catálogo conservados.
- Éxito y estado pendiente una vez, calendario con SVG/botón de marca, regreso como enlace y cierre aprobado. `.ics` mantiene TENTATIVE, instantes del servidor, escape/plegado UTF-8 y descripción breve.

Revalidación previa al POST/al regresar, doble envío, borradores recuperables, resultado incierto sin reenvío y retiro de datos por cambio de visita/identidad conservados. Sin almacenamiento de PII ni instrumentación.

## Validación ejecutada

Resultados finales con exit code `0`:

| Comando | Resultado |
| --- | --- |
| `pnpm --filter web exec tsc --noEmit` | Tipos válidos |
| `pnpm --filter web lint` | Sin errores ni advertencias |
| `pnpm --filter web test:unit` | 158 pasan, 0 fallan |
| `pnpm --filter web test:components -- --reporter=json --outputFile=../../.tmp/m1-ux/components-final.json` | 117 pasan, 0 fallan |
| `pnpm --filter web exec vitest run components/public/BookingLight.test.tsx` | 5 pasan tras el ajuste final exclusivo del test |
| `node .tmp/m1-ux/runtime.cjs build-web` → `pnpm --filter web build` | Build de producción Next 16.3.3 válida |
| `git diff --check` | Sin errores de whitespace |

Total: 275 pruebas web. Fallos iniciales de expectativas antiguas de horas, espera de consulta y tipos/lint del test de descarga se corrigieron y revalidaron. No se cuentan como aprobadas aquellas ejecuciones.

Regresiones nuevas: semana entre meses/años, mínimo/extremo, rango/selección mensual, foco, error/reintento, franjas 00:00/12:00/18:00, filtro/slot exacto, pegado/prefijos, fallback de bandera, Escape, 404/409 y exportación. Las existentes cubren 400/D11, 429 con borrador/espera, timeout/5xx incierto, doble envío, A → B → A, efectos tardíos, consentimiento y WhatsApp.

## QA de navegador aislado

Web compilada en loopback `3012`, API C1 compilada en `3043`, PostgreSQL 18 nuevo `m1_ux_test` en `55463`. Las 27 migraciones existentes se aplicaron solo allí, con runner sin privilegios administrativos. Dos negocios sintéticos: Norte/Santo Domingo y Sur/Tokio; sin acceso a bases operativas. Guards/Prisma reales; imágenes controladas exclusivamente en el harness local. Correo/eventos desactivados, sin cuentas externas ni mensajes enviados.

Chrome y navegador integrado probaron el recorrido invitado. Las capturas Chrome fallaron por timeout y la evidencia visual se guardó en el navegador integrado. Una escala previa de 90 % se compensó con viewport de prueba y medición de `innerWidth`, sin modificar la preferencia.

**35 mediciones**: servicios, profesionales, mes, fecha/hora, contacto, revisión y éxito en 320/375/390/768/1280 px. Ningún desbordamiento de página; controles medidos ≥44 × 44 px e inputs de 16 px. A 320 px el mes conserva el respaldo nativo de días existente para mantener objetivos táctiles; la semana sigue visible y desplazable. Esta adaptación queda para revisión del propietario.

Recorridos comprobados:

- Fotos/respaldo, descripción por Enter; profesional específico, sin preferencia y único.
- Abrir/cerrar mes, semana octubre/noviembre, navegación y foco por flechas/Enter. Explorar otro mes y cerrarlo conserva día/hora; [verificación final](evidence/m1-ux/regreso-desde-otro-mes.json).
- Treinta slots con filtros, seis sin filtros, cierre sin disponibilidad y mínimo en otra zona.
- Errores iniciales, pegado `0034`, Canadá/`+1`, Otro/`+81` manual, búsqueda `34`, Escape y edición conservando país/número.
- Tres altas sintéticas PENDING en Norte, una hasta medianoche. Colisión real 400 en Sur con mensaje neutro y borrador conservado; página inexistente 404 real.
- Éxito sin contactos del visitante, dirección/Maps y WhatsApp genérico intacto.
- Consola sin errores de aplicación en recorridos válidos; aviso esperado de Clerk Development en el navegador integrado. 404 produce error HTTP esperado.

La prueba de componentes verifica la acción de descarga, contenido del Blob y revocación de object URL. Se pulsó el botón en ambos navegadores, pero la herramienta no expuso una descarga guardada; no se acredita importación real.

Evidencia exclusivamente sintética y sin secretos: [mediciones](evidence/m1-ux/responsive.json), [servicios](evidence/m1-ux/servicios-375.png), [profesionales](evidence/m1-ux/profesionales-375.png), [mes](evidence/m1-ux/calendario-375.png), [horas](evidence/m1-ux/fecha-hora-375.png), [contacto vacío](evidence/m1-ux/contacto-vacio-375.png), [revisión](evidence/m1-ux/revision-375.png), [resultado](evidence/m1-ux/resultado-375.png) y [pocos horarios](evidence/m1-ux/horas-sin-filtros-375.png).

## Pendientes de cierre y relevo

1. Safari/iPhone y Chrome/Android físicos: teclado virtual, barras dinámicas, safe areas, selector, regreso y descarga/importación `.ics`.
2. Zoom real al 200 % y movimiento reducido en dispositivo. CSS/reflow y reglas de movimiento reducido revisados; la herramienta no logró cambiar el zoom real. No se acredita esa prueba.
3. Matriz de roles autenticados y 409/429/timeout en navegador si se exige para cierre. Aquí esos errores se cubrieron en componentes; no se presentan como fallos reales del API en navegador.
4. Auditoría independiente y aprobación explícita del propietario. La revisión del diff por el implementador no sustituye ese gate.
5. Publicación/despliegue web QA autorizados expresamente después del informe original; ejecución y hashes en la sección posterior. API, producción/main y respaldo cifrado C3 permanecen fuera del cambio operativo.

Siguiente paso: revisar capturas/adaptación mensual de 320 px, completar QA física/zoom/importación y registrar evidencia/aprobación. Publicar solo bajo autorización propia y [gates](DELIVERY_GATES.md).

Áreas afectadas: pasos/éxito, AvailabilityPicker, pantalla/fotos/CSS públicos, nuevo campo/helpers de teléfono, helpers de calendario/franjas, regresiones de reserva/opt-in y documentos de control. El trabajo C3 preexistente sigue sin staging.

Al terminar se detuvieron web/API locales y PostgreSQL desechable (`pg_ctl stop`, exit `0`). Harness y fixture permanecen en `.tmp/m1-ux/`, ignorados por Git; no se publican sus credenciales efímeras. Git conserva el HEAD base, 18 rutas modificadas y los nuevos archivos/evidencia de esta revisión, además del trabajo C3 previo. Índice vacío, sin commit/push. [Resumen de validación](evidence/m1-ux/validacion.json).

Guías consultadas: [interfaz](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), [redacción](https://raw.githubusercontent.com/vercel-labs/writing-guidelines/main/command.md), skills solicitadas y [Definition of Done](DEFINITION_OF_DONE.md).

## Publicación QA autorizada — 1 de octubre de 2026

El propietario aprueba el diseño «Reserva pública más ligera» para QA con las condiciones de esta tarea. **M1 NO CERRADO: prueba física pendiente**. Gate único: publicación y comprobaciones de web QA sobre C1 aprobado; no se implementa backend ni otro módulo.

Inicio: HEAD `791569b110f9fd59cb10e6d248546bdae3996e14`, `ai/antigravity-qa`, índice vacío. A: 19 rutas web (15 modificadas, cuatro nuevas), informe UX y `evidence/m1-ux`; B: informe C3 y `evidence/m1-c3`; C: CHANGELOG, PROJECT_MASTER y README, que mezclan C3/UX y se incluyen completos en el segundo commit junto a las enmiendas 16–21. Se conserva todo el trabajo previo. No hay cambio en API/Prisma/dependencias/contratos.

`git check-ignore .tmp/m1-c3/qa-before.dump.gpg`: ignorado, exit `0`. Índice inicial vacío; `git ls-files --cached` no contiene respaldo, `.tmp`, dumps, builds ni credenciales. Los únicos `.env` rastreados son tres plantillas `.env.example`, sin secretos. El respaldo cifrado permanece en este equipo hasta aprobación M1; no se copia, descifra ni elimina aquí.

### Inspección antes del staging

Doce JSON recorridos completos y quince capturas abiertas completas. Scan de JWT, cookies, Authorization/Bearer, `sk_`/`pk_`, passwords, secretos, IDs de sesión, correos no sintéticos y credenciales en URI; inspección de metadata de imágenes. Cero archivos sensibles. Los contactos/nombres de la captura de revisión corresponden al ensayo local sintético; no se publican contactos reales. Se registran archivo/campo sin imprimir valores sensibles. [Hashes, inspección y validación](evidence/m1-ux/inspeccion-publicacion.json).

| Archivo | Resultado |
| --- | --- |
| `m1-ux/calendario-375.png` | Limpio |
| `m1-ux/contacto-vacio-375.png` | Limpio |
| `m1-ux/fecha-hora-1280.png` | Limpio |
| `m1-ux/fecha-hora-320.png` | Limpio |
| `m1-ux/fecha-hora-375.png` | Limpio |
| `m1-ux/fecha-hora-390.png` | Limpio |
| `m1-ux/fecha-hora-768.png` | Limpio |
| `m1-ux/horas-sin-filtros-375.png` | Limpio |
| `m1-ux/profesionales-375.png` | Limpio |
| `m1-ux/regreso-desde-otro-mes.json` | Limpio |
| `m1-ux/responsive.json` | Limpio |
| `m1-ux/resultado-375.png` | Limpio |
| `m1-ux/revision-375.png` | Limpio |
| `m1-ux/semana-entre-meses-375.png` | Limpio |
| `m1-ux/servicios-375.png` | Limpio |
| `m1-ux/validacion.json` | Limpio |
| `m1-c3/activacion-api.json` | Limpio |
| `m1-c3/backup-verificado.json` | Limpio |
| `m1-c3/calendario-qa.jpg` | Limpio |
| `m1-c3/controles-http.json` | Limpio |
| `m1-c3/exito-qa.jpg` | Limpio |
| `m1-c3/inspeccion-previa.json` | Limpio |
| `m1-c3/navegador-qa.json` | Limpio |
| `m1-c3/produccion-comparacion.json` | Limpio |
| `m1-c3/validacion-entrega.json` | Limpio |
| `m1-c3/verificacion-final.json` | Limpio |
| `m1-c3/web-qa.json` | Limpio |

### Validaciones de esta publicación

`pnpm --filter web exec tsc --noEmit`, `pnpm --filter web lint`, `pnpm --filter web test`: exit `0`; 158 unitarias y 117 componentes, cero fallos. `node .tmp/m1-ux/runtime.cjs build-web` ejecuta `pnpm --filter web build`: exit `0`, Next 16.3.3. Primer intento en sandbox: exit `1`, acceso a configuración local denegado antes de compilar; ejecución autorizada posterior completa. No conecta a ninguna base. La repetición fue conservadora: no se reutilizó la evidencia anterior como sustituto de estos comandos. Código sin cambios después de validarlos; solo documentación/evidencia preparatoria.

Antes de cada commit se revisan rutas, `git diff --check`, `--stat`, diff completo y staged. El commit documental reutiliza estos resultados porque el código web no cambia; ningún comando fallido cuenta como gate aprobado. El resultado de Git, API, web QA y CSP se añadirá tras la publicación; esta sección aún no afirma despliegue ejecutado.

### Ejecución: Git y despliegue solo web QA

**PUBLICADO / DESPLEGADO SOLO WEB QA / EN REVISIÓN. M1 NO CERRADO; QA FÍSICA PENDIENTE.**

- Commit A: `dc82a4f91294011def8b9d805622ae2f82ce2906`, mensaje exacto solicitado; 37 rutas de código/tests UX e informe/evidencia auditada.
- Commit B+C+enmiendas: `9d2eb47e32f01a504b33174a8aa735ca55c87604`, mensaje exacto solicitado; 16 rutas documentales. Los tres controles mezclados entraron completos aquí.
- `git push origin HEAD:refs/heads/ai/antigravity-qa`: exit `0`. `git rev-parse HEAD` y `git ls-remote origin refs/heads/ai/antigravity-qa`: exit `0`, mismo SHA `9d2eb47…`. Árbol limpio tras esos commits. El repositorio es público; revisión automática pidió confirmar ese destino y el propietario autorizó explícitamente publicar esos commits. No se subieron secretos ni respaldos.
- Antes de asociar web QA: `booking-data` y `availability-days` sintéticos devuelven `200`; rango de siete días, cinco fechas disponibles, `no-store`. Teléfono deliberadamente inválido devuelve `400` con el cuerpo genérico D11 exacto, antes de la transacción. No se envió una reserva válida ni se consultó directamente ninguna base. Colisión real y rollback quedan acreditados por la evidencia C3 anterior, sin atribuirles una nueva ejecución.
- Preview Git **READY**, SHA `9d2eb47…`, deployment `dpl_7aT949HTDztsYaxZRRHWfniqAuPa`. Alias [web QA](https://qa.booking.kortek.cloud/m1-c3-norte/reservar) verificado/reasociado después del prerrequisito API a las 23:28:51 del 1 de octubre (Santo Domingo). Solo web; API QA mantiene `791569b110f9fd59cb10e6d248546bdae3996e14`.
- Comparación posterior de solo lectura: ocho comprobaciones verdaderas, exit `0`. `main` mantiene `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6`; web productiva `dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm`; API productiva imagen `8caacd8548a61d94807c0b865229a731df594f63f609ca9ab57df99283dceca2`, PID `151158`. Contenedores/unidades/archivos protegidos, variables y configuración Vercel, SSO y workers idénticos. Sin despliegue API, cambio de flags/proveedores, migración ni acceso DB directo. Respaldo cifrado retenido e ignorado.

Este tercer commit registra el resultado operativo y la guía sin cambios de código. Se reutilizan los gates web anteriores porque el árbol `apps/web` permanece igual al commit A. Su hash final y la igualdad con remoto se reportan en la entrega; el alias QA se conservará en el Preview validado `9d2eb47…` una vez termine la integración del commit documental.

### Bandera, CSP y navegador QA

Navegador con acceso existente: servicios compactos, semana real con el 4 de octubre deshabilitado, dos horas disponibles y contacto vacío con selector de países. **28 imágenes FlagCDN cargadas**, todas completas con ancho natural `40`, `referrerPolicy=no-referrer`; cero errores, cero bloqueos CSP y un aviso esperado de Clerk Development. Inputs de nombre/teléfono/búsqueda/correo a `16px`. No se envió el formulario. [Captura completa sintética limpia](evidence/m1-ux/banderas-qa.jpg) y [verificaciones operativas](evidence/m1-ux/publicacion-qa.json).

Headers observados sin sesión: web QA `302`, destino Vercel `/sso-api`, `X-Frame-Options: DENY`; sin CSP ni CSP-Report-Only en esa respuesta. FlagCDN HEAD `200`, `Content-Type: image/png`, sin Cross-Origin-Resource-Policy. TLS verificado. El documento autenticado no presenta meta CSP y carga las banderas, por lo que la política efectiva no las bloqueó en este recorrido. **No se acredita la cabecera CSP del documento autenticado**: la API del navegador no expone headers de red y la petición externa conserva SSO. El `200`/CSP obtenido inicialmente tras seguir la redirección correspondía al login Vercel y se excluye de las evidencias del producto. No se creó bypass ni se relajó ninguna protección. Para cerrar esa comprobación, el propietario puede inspeccionar Network del documento en su sesión autorizada y consignar solo los headers, sin cookies ni tokens.

La configuración real usa `<img>` nativo para banderas `https://flagcdn.com/w40/...`, con alternativa al fallar. `next.config.ts` permite Unsplash en el optimizador Next; FlagCDN no utiliza ese optimizador y no requiere ampliar `remotePatterns`. La documentación de [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication) confirma el acceso autenticado; el procedimiento preserva su configuración existente.

### Guía corta de QA en iPhone — pendiente

Abrir Safari en [QA Norte](https://qa.booking.kortek.cloud/m1-c3-norte/reservar), con la sesión Vercel autorizada existente. Usar solo datos sintéticos C3. Registrar modelo/iOS, ancho, resultado y captura sin contactos reales; no desactivar SSO. Si aparece «Sesión no válida», detener ese caso y registrar cuándo sucede.

1. **Servicios:** comprobar filas compactas, foto/alternativa y ver cuatro sin scroll. El fixture QA actual tiene dos: ese criterio necesita un fixture sintético autorizado con cuatro, sin modificar aquí datos operativos.
2. **Fecha/hora:** siete días visibles, abrir/cerrar mes, conservar selección y no poder elegir un día sin cupo (4 de octubre en Norte). Horas como botones. Con más de doce, probar Todos/Mañana/Tarde/Noche y ausencia de franjas vacías. El día/profesional observado aquí solo tenía dos horas; el escenario de más de doce queda pendiente de fixture aprobado.
3. **Teléfono/correo:** RD `+1`, máscara, bandera; buscar país/prefijo, seleccionar y pegar número internacional con prefijo. Correo mal escrito debe impedir avanzar desde datos. Enfocar cada campo sin zoom automático y comprobar zoom manual con dos dedos.
4. **D11:** usar teléfono del cliente sintético C3 A y correo del B. Debe mostrar mensaje genérico, conservar borrador y no registrar reserva. No usar contactos reales. Esta publicación verificó solo rechazo previo con teléfono inválido; la colisión real requiere el ensayo físico indicado y conserva su evidencia C3 previa.
5. **Éxito:** con combinación sintética válida y bajo la prueba física autorizada, verificar «Pendiente de confirmación», Agregar al calendario abriendo el diálogo Calendario del iPhone, evento tentativo/fecha/hora correctos y enlace de regreso. Comprobar regreso entre pasos y sesión sin «Sesión no válida». La importación real y el teclado/zoom de iPhone no se acreditan con emulación.

M1 permanece abierto para QA física, verificaciones no cubiertas, auditoría y aprobación explícita final. El respaldo C3 se conserva hasta esa aprobación.

Inspección del tercer commit: `publicacion-qa.json` → **limpio**, JSON completo revisado; el campo de consentimiento describe permiso humano, sin credencial. `banderas-qa.jpg` → **limpio**, captura completa y metadata revisadas. El formato original de la captura es JPEG y se conserva con esa extensión.
