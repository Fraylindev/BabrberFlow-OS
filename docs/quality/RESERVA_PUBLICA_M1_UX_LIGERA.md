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
