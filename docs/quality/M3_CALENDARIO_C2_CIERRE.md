# M3 Calendario y reagendar — cierre C2 frontend

Fecha: 2026-10-11. **IMPLEMENTADO / VALIDADO LOCALMENTE / EN REVISIÓN.** C1 aprobado por el propietario sobre `da77c88a0234b640be8cab0ab11c0afd204f59e4`; C2 autorizado solo frontend. Checkpoint local autorizado, sin push. Este informe no declara aprobación del C2 ni ejecución del C3.

## 1. Resultado y alcance

Nueva `/dashboard/calendar`: agenda día/semana, fechas civiles del negocio, filtros de estado/profesional y paginación real por cursor. OWNER, ADMIN y RECEPTIONIST gestionan; BARBER consulta su agenda y detalle, sin catálogo de profesionales ni acción de reagendar. El backend mantiene la autorización y el aislamiento. El listado de Reservas conserva sus demás acciones y abre el mismo selector aprobado para reagendar citas PENDING/CONFIRMED; se elimina su formulario anterior de hora libre y reasignación.

Detalle mínimo: cliente por nombre, servicio, profesional, inicio/fin y estado. Sin contacto, notas ni información financiera. Selector de días disponibles dentro de 31 días inclusivos y slots cargados únicamente para la fecha elegida. Se muestran horas y fechas naturales con el módulo puro compartido del C1, tanto en agenda/detalle/selector como en BusinessTime de la lista. No se modifican plantillas de correo ni payloads sellados.

El comando envía exclusivamente `startTime`, `expectedUpdatedAt` y `expectedRevision`, copiando literalmente los valores recibidos del lector de slots. No reconstruye el instante ni deriva tokens. Detalle/días/slots con revisiones incompatibles bloquean confirmación y exigen revisión. El slot del mismo instante está deshabilitado; la garantía transaccional y el control de no evento/correo pertenecen al C1 aprobado.

## 2. Caché, carreras de interfaz y errores

Cada montaje crea una identidad de visita; las claves incluyen usuario, organización y rol. Al cambiar contexto o salir se abortan solicitudes y cancelan/eliminan las consultas de la visita. A→B→A obtiene una visita nueva. Las respuestas tardías de lectura o escritura no restauran datos, modales ni anuncios de éxito de la visita anterior.

Cambio de rango/filtros inicia la primera página sin conservar resultados del filtro anterior. Un 409 de cursor oculta todas las páginas anteriores; «Recargar agenda desde el inicio» borra la consulta y solicita sin cursor. No se mezclan snapshots. Al buscar otro catálogo de profesionales se reinicia la selección para mantener el filtro visible coherente.

Días y slots se reutilizan por cita/revisión/fecha durante la visita, sin refetch por foco ni reintentos automáticos. Volver a una fecha ya consultada no consume otro acceso al presupuesto de 30/min. 429 respeta Retry-After y deshabilita la acción hasta el vencimiento; el vencimiento no provoca una solicitud ni repite un PATCH. No se modifica ningún límite público. No hay persistencia de esta caché entre visitas.

400 explica que debe elegirse un horario disponible; 401 invita a volver a ingresar; 403 comunica falta de permiso; 404 indica recurso no disponible; 409 exige revisar los cambios; 429 presenta espera; 503 comunica indisponibilidad temporal. Los errores no muestran mensajes crudos, constraints o trazas. Ante conflicto o resultado incierto se borra la selección y se exige lectura manual antes de confirmar otra vez. Los estados de carga, vacío, vacío filtrado, guardado, error y éxito tienen mensajes visibles.

## 3. Validación automatizada

Runner: `node apps/web/scripts/m3-c2-validation.mjs`. Usa variables sintéticas y entorno acotado, sin cargar .env ni instalar dependencias. Registros íntegros y comandos/exit codes en [checks/run.json](evidence/m3-calendario-c2/checks/run.json).

| Gate web | Resultado |
|---|---|
| type-check:clean | exit 0 |
| lint | exit 0 |
| tests Node | 168 aprobadas, 0 fallidas, 0 omitidas |
| tests Vitest | 135 aprobadas en 22 archivos, 0 fallidas, 0 omitidas |
| build --webpack | exit 0 |

Nuevas pruebas: 9 vectores de contrato/errores/roles/fecha y 5 pruebas React de tokens exactos, caché por fecha, BARBER, divergencia de revisión, aislamiento A→B→A y reinicio de cursor. Las pruebas existentes permanecen activas. El build usa Webpack porque las dependencias locales enlazadas quedan fuera de la raíz admitida por Turbopack; no cambia dependencias ni configuración de producción.

Durante la implementación se corrigieron errores de tipos/imports, reglas de pureza React y enlaces internos Next, además de la integración del refresco con el proveedor de consulta existente del listado. No se relajaron aserciones ni se añadieron omisiones para conseguir los resultados. Los logs de checks muestran la última ejecución; no son un historial de intentos.

## 4. Navegador real y evidencia

Runner reproducible: `node apps/web/scripts/m3-c2-browser.mjs`. **Chrome real headless**, componentes de producción, CSS real, React Query y cliente HTTP real. Se usa un harness de autenticación y transporte local con respuestas controladas del contrato C1 exclusivamente en el runner; no existen mocks en el flujo entregado. Solo localhost, sin API QA, Clerk, proveedor o base real. Navegador en Asia/Tokyo frente a negocio America/Santo_Domingo para comprobar el formato independiente del dispositivo.

[Resultados y solicitudes observadas](evidence/m3-calendario-c2/browser/results.json): **18 escenarios aprobados, 0 fallidos; navegador y servidor cerrados**. Anchos 320, 375, 768 y 1440 px. Capturas PNG en el mismo directorio.

| Escenarios observados | Evidencia |
|---|---|
| Flujo completo en cuatro anchos, detalle, días, selección, guardado y anuncio | flow-320/375/768/1440 y selector-320/375/768/1440 |
| Tres selecciones fecha13→fecha14→fecha13 | exactamente dos GET de slots; PATCH único con ISO y ambos tokens literales |
| ADMIN, RECEPTIONIST y BARBER | gestión solo operadores; BARBER sin catálogo/selector; teclado Tab dentro del modal y Escape |
| Segunda página con 409 | datos anteriores ocultos; nueva lectura sin cursor |
| Día, estado, profesional y vacío filtrado | parámetros HTTP reales y estado vacío |
| 400/401/403/404/409/429/503 | mensajes útiles y bloqueo/revisión; espera429 sin refetch automático |
| A→B→A y PATCH tardío; lectura tardía | visita nueva, ausencia de datos/caché/éxito ajenos |

Inspección visual de las capturas: agenda vertical móvil y siete columnas en escritorio; selector de dos columnas móvil, relojes sin saltos de línea, sin overflow horizontal. En 320 px el modal permite scroll para alcanzar confirmación. Se reutiliza Modal con trampa de foco y Escape. La prueba inicial detectó labels ambiguos y un Retry-After no expuesto por el CORS del harness: se corrigieron labels del producto y exposición del header en el runner, respectivamente. [Resultado inicial conservado](evidence/m3-calendario-c2/browser/initial-results.json) distingue esos fallos de la ejecución final. Otro intento tras incorporar Link falló porque el bundle standalone del runner carecía de process.env; se añadió la definición de entorno al runner y se repitió con 18/18. [Diagnóstico conservado](evidence/m3-calendario-c2/browser/link-harness-failure.json). No se sustituyó Link ni se relajaron pruebas.

## 5. Integridad y Git

Rama autorizada `ai/antigravity-qa` en el worktree M3. Base C1 `da77c88a0234b640be8cab0ab11c0afd204f59e4`. Checkpoint solo local; SHA entregado en el relevo final. [Inventario exacto del checkpoint](evidence/m3-calendario-c2/checkpoint-files.txt) y [manifiesto de fuentes](evidence/m3-calendario-c2/source-manifest.json).

Ningún archivo de `apps/api`, Prisma, migraciones, notification-templates, payloads sellados, dependencias o rutas públicas modificado. El módulo API de fechas se importa como dependencia de lectura. BusinessTime cambia al formateador puro de paridad aprobado; pruebas existentes de fechas y público permanecen activas. No se ejecutan checks API porque no hay cambios backend. El checkout principal y su trabajo ajeno se preservan. `git diff --check` y revisión staged completos pasan. No push, despliegue, base real, QA ni producción.

## 6. Riesgos residuales y C3

La evidencia prueba interfaz y solicitudes del contrato en Chrome real con transporte controlado. No prueba integración contra Next desplegado, Clerk real, persistencia QA, Safari, dispositivos físicos ni entrega de correo. Esos límites no se presentan como QA funcional desplegada. El backend C1 aporta su evidencia independiente de transacciones, roles y aislamiento.

QA todavía no dispone del API C1: publicar esta rama desplegaría solo web y rompería la compatibilidad. No publicar hasta una autorización de despliegue coordinado API→web conforme al C1, preservando la dependencia `Booking_customer_revision` de migración28.

C3 debe incluir navegación real móvil/escritorio con identidades y negocios QA, paginación/roles/conflictos, un reagendado real persistido y el worker consumiendo el evento, con evidencia separada del envío/entrega según el alcance autorizado. C3 y cualquier cambio de QA/proveedor requieren autorización propia. C2 queda para revisión del propietario con checkpoint local.
