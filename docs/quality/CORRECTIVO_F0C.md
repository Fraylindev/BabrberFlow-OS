# Correctivo F0-C — Operación sin espera y controles legibles

Estado: **BACKEND APROBADO / IMPLEMENTADO, EN REVISIÓN / COMMIT, PUSH Y DESPLIEGUE QA AUTORIZADOS**. Base `eab0e194e04e184bbbde04ae9e99668669bf9c6c`, rama `ai/antigravity-qa`, 2026-09-30. El propietario aprobó explícitamente «el backend F0-C y su integración frontend» después de recibir los resultados de 764 pruebas unitarias y 25 pruebas HTTP/PostgreSQL. Posteriormente autorizó expresamente commit/push y despliegue QA de F0-C; el resultado operativo se verificará desde el commit, sin declarar cierre integrado ni aprobación final.

## Solicitud y producto

El propietario reporta que las validaciones indicadas de F0-B pasan, excepto la necesidad de esperar al fin programado para emitir/cobrar, y pide corregir zoom de campos y dos defectos desktop con capturas. Esto acredita exclusivamente sus recorridos indicados; no equivale al cierre global de F0-A/F0-B ni a aprobar escenarios no ejecutados.

Usuarios: personal con permiso actual para operar reservas/facturas y administrar los módulos implicados. Resultado: CONFIRMED → COMPLETED → emisión → cobro completo en cualquier momento, incluso antes de startTime/endTime, con una factura y un pago únicos. La finalización es una decisión operativa del personal; el reloj programado no limita esta secuencia. No se factura una reserva aún no completada, ni se crean efectos financieros automáticamente al completar.

UI autorizada, independiente del cambio financiero: crear reserva sin zoom al enfocar cualquier entrada; biografía, notas internas y descripción sin zoom; Desde/Hasta mantienen sus etiquetas y el formato nativo dentro del control, eliminando ambos ejemplos inferiores; controles de Facturación alineados; acciones Cambiar rol/Revocar acceso legibles en una línea desktop. Teclado, foco, validación y zoom manual se conservan.

No-alcance funcional: nuevos roles/permisos, registro B2C/Clerk, autenticación, correos de finalización anticipados, reembolsos/parciales, importes editables, dependencias, configuración funcional, secretos, migraciones y producción. La autorización posterior comprende dos commits separados (informe F0-A primero, F0-C después), actualización exclusiva de los selectores operativos de imagen/release QA, API/worker QA antes del push y Preview web por integración Git.

## Contrato y arquitectura

El código ya permite completar anticipadamente. InvoicesService conservaba dos llamadas a assertServiceEnded: emitir y cobrar. Se retiraron exclusivamente ambas restricciones temporales y la selección de endTime ya innecesaria. No cambia el HTTP, DTO, proyección o campo de respuesta. Roles/tenant/ownership, COMPLETED al emitir, snapshot de precio, pago único, método conflictivo, transacciones SERIALIZABLE, locks y auditoría transaccional siguen vigentes. PaidAt/createdAt siguen siendo instantes reales del servidor. El mensaje frontend de conflicto al emitir solicita reserva completada/precio válido, sin exigir que el servicio haya terminado.

No se encontró constraint/trigger temporal permanente: la migración histórica de 2026-08-26 revisa filas futuras solo durante su aplicación. Esa migración aplicada no se modifica ni se repite contra datos de QA. Rollback de código restablecería la espera en operaciones posteriores; no elimina facturas/pagos ya registrados. Probar PostgreSQL aislado, concurrencia e IDOR antes de presentar backend candidato.

Gate 3 validado y Gate 4 aprobado explícitamente durante la implementación. Los ajustes visuales consumen contratos previamente aprobados y se verifican independientemente. Publicación Git y despliegue QA cuentan ahora con autorización expresa separada; producción y aprobación final siguen cerradas.

## Criterios de aceptación

1. OWNER/ADMIN/RECEPTIONIST y Profesional propio pueden completar/emitir/cobrar una reserva futura; roles ajenos, otro tenant y CUSTOMER mantienen sus rechazos.
2. Repetir emisión/cobro conserva un Invoice/Payment y una auditoría por efecto; método distinto sigue en conflicto y auditoría fallida revierte la operación.
3. Campos de los formularios reportados tienen fuente calculada >=16 px en pantalla táctil, incluidos móvil horizontal y overrides de componentes. No se desactiva pinch zoom ni se impone maximum-scale.
4. Filtros Desde/Hasta/Estado y limpiar comparten altura/borde inferior en desktop; rango/filtro/reset siguen funcionando sin ejemplos redundantes.
5. Equipo desktop conserva ambas acciones en una línea sin cortes ni overflow; tablet/móvil mantienen presentación de cards cuando no caben las columnas.

## Evidencia y Git

Estado inicial de implementación: únicamente `docs/quality/CORRECTIVO_F0A.md` modificado, sin staging. Ese informe previo se conservó; no se editó durante F0-C. Al finalizar la implementación, todos los cambios F0-C seguían locales y sin staging sobre `eab0e194e04e184bbbde04ae9e99668669bf9c6c`.

Estado al finalizar la implementación: 19 archivos existentes modificados por F0-C y un nuevo informe F0-C; adicionalmente permanecía el informe F0-A previamente modificado. Total del árbol: 20 modificados + 1 nuevo, índice vacío. Sin cambios en .env, dependencias, configuración, Prisma/migraciones ni HEAD. PostgreSQL temporal detenido correctamente (`pg_ctl stop`, exit 0). La publicación posterior incorpora la nota exacta al final de DECISIONES_PROPIETARIO_2026_09_29.md, conservando íntegro su contenido anterior.

Comandos y resultados (todos los resultados aceptados terminaron con exit 0):

- API `pnpm --filter api exec tsc --noEmit` y `pnpm --filter api lint`: pasan.
- API `pnpm --filter api exec jest --runInBand`: 60 suites/764 pruebas pasan; 3 suites/37 pruebas omitidas por su configuración, sin contarlas como ejecutadas.
- `pnpm --filter api exec jest --config test/jest-e2e.json --runInBand test/invoices.e2e-spec.ts`: 25 pruebas HTTP/PostgreSQL pasan. Cluster temporal en loopback, puerto 55449, base nueva de pruebas, rol propietario sin superusuario/CREATEDB/CREATEROLE/BYPASSRLS y 27 migraciones aplicadas únicamente a esa base vacía. Acredita las operaciones futuras para cuatro roles, lectura de factura ISSUED/PAID desde GET /bookings tras cada efecto, unicidad bajo concurrencia, IDOR, método conflictivo, precio del servidor y rollback por fallo intencional de auditoría. No accede a bases de desarrollo compartidas, QA ni producción. Los errores forzados de auditoría son parte de la prueba de rollback. El primer ensayo detectó que las cuatro nuevas facturas alteraban un conteo histórico; se acotó la prueba de paginación al rango explícito de sus fixtures y la suite posterior terminó 0. El cluster temporal se detiene al terminar.
- Web `pnpm --filter web exec tsc --noEmit`, `pnpm --filter web type-check:clean`, `pnpm --filter web lint`: pasan.
- `pnpm --filter web test`: 146 pruebas de utilidades + 89 de componentes = 235 pasan. Después del ajuste aprobado del mensaje, `pnpm --filter web test:invoices`: 7 pasan.
- `pnpm --filter web build`: pasa con Next.js 16.3.3. Marcadores de proceso de validación, sin cambiar .env/configuración. Helper de red limitado a fuentes Google; no hubo solicitudes externas (`F0A_FONT_PROXY []`).
- Chrome local real con componentes, hooks y CSS del producto; transporte y sesión sintéticos explícitos, sin servicios remotos. `.tmp/f0c/browser.mjs` termina 0. Anchos 320/375/390/844/1024/1280/1913 px; 844 px reproduce táctil horizontal con altura 390 px. Fuente calculada mínima de todos los campos editables reportados: 16 px en 320/375/390/844; incluye búsqueda de cliente, profesional, servicio, fecha, hora, correo opcional y los tres textareas. Los cuatro controles de Facturación miden 44 px y coinciden verticalmente en desktop; ambos filtros envían rangos/estado y limpiar restaura el rango semanal de Reservas y vacía Facturación. Equipo mantiene texto de acciones en una línea y abre/cierra su modal; sin overflow global ni errores/warnings de consola en los siete anchos. Capturas y métricas en `.tmp/f0c`, ignorado por Git.
- Revisión visual de capturas 1913 px Facturación, 1280 px Equipo y 375 px Biografía: controles alineados, acciones legibles y textarea/foco sin recortes. El breadcrumb fijo de este harness es un sustituto local de Next navigation, no evidencia sobre navegación real.
- `git diff --check`: pasa. No se versionan temporales, .next, tsbuildinfo, .env ni credenciales.

Revalidación previa a publicación: se detectó que el último ajuste de Equipo era posterior al build y navegador históricos, por lo que se repitieron `pnpm --filter web type-check:clean`, `pnpm --filter web lint`, `pnpm --filter web test` (146 + 89 = 235), build completo y `.tmp/f0c/browser.mjs` en los siete anchos; todos terminaron con exit 0. Build sin conexiones externas (`F0A_FONT_PROXY []`); navegador sin errores/warnings ni overflow. Código preservado byte por byte durante la publicación, comprobado mediante SHA256. La API conserva sus resultados previos; HTTP/PostgreSQL se ejecutó después de su último ajuste. Solo se modificó documentación en esta tarea.

El ensayo HTTP usa autenticación controlada de la suite E2E, no sesiones Clerk reales. Chrome valida estilos calculados y responsive; no acredita por sí solo el comportamiento de zoom de Safari en un iPhone físico. Este commit precede al despliegue F0-C; no declara cierre integrado/productivo.

## Validación del propietario después de publicar en QA

1. Crear una reserva para mañana, confirmar, completar inmediatamente y emitir. Reservas debe mostrar «Pendiente de cobro» sin «Emitir factura». Cobrar ahora en Facturación y volver: «Factura pagada», sin recargar; fecha de emisión/cobro de hoy, no de la cita. El mismo recorrido corresponde al Profesional sobre su propia agenda.
2. iPhone/Safari vertical y horizontal: tocar y escribir en todos los campos de Crear reserva, incluido el correo al activar avisos; Biografía, Notas internas y Descripción. Sin zoom al enfocar, sin recortes; el zoom manual permanece disponible.
3. Desktop: Desde/Hasta/Estado/Limpiar alineados en Facturación, sin las dos ayudas inferiores; rango y limpieza funcionan en ambas pantallas. El formato orientativo aparece dentro del control nativo según idioma del navegador.
4. Equipo desktop: «Cambiar rol» y «Revocar acceso» legibles en una línea. Abrir/cerrar Cambiar rol y comprobar foco/teclado; móvil/tablet mantienen las acciones en tarjetas.

Publicación autorizada: informe F0-A en commit separado `52e43a6c213856ac9af50f87b87740d854c0c323`, seguido del correctivo F0-C con sus 19 archivos existentes, este informe y la nota de decisiones. Orden operativo: imagen mínima desde el commit → 23 controles negativos de arranque → API/worker QA con reversión automática e imagen anterior conservada → push exclusivo a origin/ai/antigravity-qa → Preview Ready y dominio QA → controles HTTPS y comparación de producción. El resultado operativo se reporta con evidencia local ignorada por Git; no se anticipa como exitoso en este checkpoint.

Siguiente gate: después de verificar el despliegue, ejecutar las validaciones anteriores con Clerk/Safari reales y obtener aprobación final del propietario. La autorización de publicación no cierra F0-A/F0-B/F0-C ni el C0 de Pagos.
