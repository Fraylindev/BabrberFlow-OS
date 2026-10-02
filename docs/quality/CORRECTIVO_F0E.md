# Reservas legibles y salida de la reserva pública

Fecha: 2026-10-02, hora de Santo Domingo. **PUBLICACIÓN WEB QA AUTORIZADA / EN REVISIÓN; DIRECCIONES D1-A, D2-A Y E-A APROBADAS PARA MÓDULOS POSTERIORES.** Este informe reúne los dos frentes y las decisiones de backend. No aprueba F0-E ni cierra M1.

## Alcance y brief

El personal necesita consultar Reservas y alcanzar sus acciones en escritorio. El visitante necesita leer el resumen público y elegir calendario, contacto, ubicación o salida. El propietario autorizó exclusivamente el frontend descrito en su tarea y la presentación conjunta de D/E.

La base exacta es `0b24b8895b7bd9e32dcc8c98ea78570e594b882e`, en `ai/antigravity-qa`. Git inicial: árbol limpio y rama igual a su referencia local `origin/ai/antigravity-qa`. Sin commit, push, staging ni despliegue.

Se preservan estas fronteras:

- OWNER/ADMIN/RECEPTIONIST mantienen su agenda; Profesional mantiene el alcance propio resuelto por backend
- Avisos por correo conserva OWNER/ADMIN/RECEPTIONIST; Profesional no recibe esa acción
- No cambia autenticación, tenant, roles, contratos, API, Prisma, dependencias, `.env`, flags funcionales ni bases reales
- Loading, vacío, filtros, error y mutación conservan mensajes útiles; éxito mantiene `PENDING` y fecha del negocio
- Móvil/tablet conserva tarjetas; escritorio requiere controles íntegros, teclado, foco y nombres completos consultables

Fuentes: [gates](DELIVERY_GATES.md), [decisiones vinculantes](DECISIONES_PROPIETARIO_2026_09_29.md), contratos F0-B/F0-C, [WhatsApp C1](../features/WHATSAPP_C1_CONTRATO.md) y [correctivo público previo](RESERVA_PUBLICA_M1_UX_CORRECTIVO_QA.md). Se aplicaron las skills solicitadas, Kortek Delivery y Kortek Product UI. La tarea nueva autoriza retirar el párrafo visible de WhatsApp; conserva destino, mensaje y aviso accesible de pestaña nueva.

## Frente 1: Reservas

El diagnóstico inicial se confirma en `DashboardLayout`, `BookingsPage` y `BookingActions`: límite `max-w-6xl`, tabla fija y contenedor que recorta, con estado financiero, Facturación y avisos compitiendo por Acciones.

Cambios locales:

- El estado financiero pasa a subtexto bajo Estado en la tabla
- Acciones ofrece como máximo Confirmar, Completar o Emitir factura, más el menú de secundarias
- Ver facturación y Avisos por correo quedan en ese menú, según estado y permiso existentes
- Nombres de cliente, profesional y servicio se truncan; el tooltip muestra el texto completo con mouse o foco, admite Escape y sale por portal
- Solo `/dashboard/bookings` amplía su límite de contenido a 1440 px; los demás módulos conservan 1152 px. En 1024 px también se necesita redistribuir columnas: ensanchar el límite por sí solo no resuelve ese tamaño
- Fechas inicialmente vacías; Por atender inicialmente muestra PENDING/CONFIRMED. Limpiar vacía ambas fechas y vuelve a Por atender
- Conteo sin fechas: «N reservas»; con cualquier extremo seleccionado: «N reservas en el rango seleccionado»
- Vacío inicial: «No hay reservas por atender»; vacío filtrado: «Sin reservas con estos filtros»

**Límite pendiente D:** Por atender usa una proyección local sobre el listado completo existente. No elige D1-A/B ni añade parámetros; no supone una garantía de rendimiento. El transporte sigue trayendo todo el historial sin fechas para esa vista y Todas. No se aplicó un tope silencioso. No activar paginación en el API sin sustituir después esa proyección por un filtro del servidor: filtrar una página en la web produciría omisiones y conteos incorrectos.

## Frente 2: revisión y éxito públicos

Revisión y éxito usan ambos avatares compactos de 64 × 64 px con esquinas redondeadas, incluso para iniciales. Duración y precio aparecen juntos bajo el servicio. El selector de servicios conserva miniatura redondeada; el selector separado de profesionales todavía usa círculo. Es la otra diferencia localizada en este flujo y se reporta sin ampliar su alcance.

La salida conserva un botón principal y este orden:

1. Agregar al calendario, con descarga pendiente existente
2. Contactar por WhatsApp, si el teléfono publicado del negocio es válido
3. Dirección y Cómo llegar con SVG de mapa
4. Nota breve existente
5. Listo, con el mismo regreso al mini-sitio

WhatsApp y mapa comparten estilo secundario transparente, borde neutro, texto/icono blanco y alto mínimo de 52 px. Sus nombres accesibles anuncian pestaña nueva. Se elimina el número visible y la explicación larga; se preserva `wa.me`, la validación estricta y el mensaje genérico actual. No se muestra ni se usa el teléfono privado del profesional.

El contenedor incorpora `6rem + env(safe-area-inset-bottom, 0px)` de relleno inferior exclusivamente en revisión y éxito, incluida la marca final. Los otros pasos conservan su relleno anterior. Es una corrección de espacio; no acredita comportamiento de la barra flotante en Safari físico.

## Evidencia y validación

Tipos, lint y pruebas web terminaron con exit `0`: **158 unitarias y 125 de componentes, 283 en total**. El build local de producción también terminó con exit `0`. Comandos ejecutados:

```powershell
pnpm --filter web type-check
pnpm --filter web lint
pnpm --filter web test
node apps/web/scripts/f0e-build.mjs
node apps/web/scripts/f0e-browser.mjs
```

El build directo `pnpm --filter web build` falló inicialmente por `DEPLOY_ENV` ausente. El wrapper ejecuta ese mismo comando con entorno de compilación development y URL de API loopback, sin modificar `.env` ni flags funcionales ni iniciar servicios. Los primeros intentos sandbox de pnpm fallaron por acceso a su configuración local; se repitieron con permiso automático y finalizaron correctamente. Los fallos iniciales no se cuentan como gates aprobados.

El [harness reproducible](../../apps/web/scripts/f0e-browser.mjs) renderiza componentes, hooks, AuthProvider y cliente HTTP reales en Chrome local headless. Sustituye únicamente Clerk, navegación Next y transporte externo por respuestas sintéticas; bloquea conexiones externas. Las imágenes y banderas también son fixtures controladas. No ejecuta backend, base de datos ni proveedores reales. Comprueba negocio Santo Domingo desde dispositivo Tokio y movimiento reducido.

La [matriz de navegador](evidence/f0e/browser.json) registra 95 resultados, sin fallos:

| Superficie | Anchos CSS comprobados | Resultado |
| --- | --- | --- |
| Reservas escritorio | 1024 / 1280 / 1440 / 1920 | Sin overflow de página o celda de acciones; controles dentro de sus límites; como máximo principal y menú |
| Reservas tarjetas | 320 / 375 / 390 / 768 | Sin overflow; presentación y acciones móviles conservadas |
| Reservas, filtros y roles | Los ocho anchos | Fechas vacías, Por atender, Todas y cinco estados, conteos, Limpiar, vacío, error de lectura y transición; OWNER/ADMIN/RECEPTIONIST/BARBER |
| Menú/tooltip escritorio | Los cuatro anchos | Nombre completo con hover→foco/Escape; Enter, flechas, Inicio/Fin, retorno de foco con Escape; Facturación y avisos conservan destinos |
| Revisión/éxito | 320 / 375 / 390, con y sin teléfono de negocio | Fotos/fallback iguales; «2 h · RD$ 500»; orden/teclado, salida correcta, PENDING, un POST controlado por recorrido |
| WhatsApp | 320 / 375 / 390 | Destino/mensaje actuales, pestaña nueva, ausencia sin teléfono; texto blanco con contraste 18,97:1, borde superior a 3:1, altura de 52 px |

Capturas: [Reservas 1024](evidence/f0e/reservas-todas-1024.png), [Reservas 1920](evidence/f0e/reservas-todas-1920.png), [tarjetas 320](evidence/f0e/reservas-todas-320.png), [revisión 375](evidence/f0e/revision-business-375.png), [éxito con WhatsApp](evidence/f0e/exito-business-375.png) y [éxito sin WhatsApp](evidence/f0e/exito-none-320.png). Se inspeccionaron visualmente las capturas junto a las mediciones. Consola: cero errores de aplicación; los 403/409 deliberados generan solo los avisos de recurso esperados, registrados por separado.

El menú existente falló en navegador al intentar enfocar contenido durante una transición de visibilidad. Se conserva su geometría por portal y se desactiva la transición de colocación/visibilidad, con foco después de la activación nativa. La regresión de teclado y el recorrido final pasan; no se añade animación de apertura.

**Facturación:** no reproduce el conjunto de controles recortados de Reservas. Con los nombres largos sintéticos, en 1280 px su tabla mide 963,11 px dentro de 958 px: requiere unos 5 px de scroll interno; en 1440/1920 cabe. Usa `overflow-x-auto`, por lo que ese exceso es desplazable. Es un defecto de ajuste de escritorio menor, [capturado](evidence/f0e/facturacion-1280.png), y no se modificó. A 1024 conserva tarjetas.

Revisión según las skills solicitadas:

| Antes | Después | Motivo |
| --- | --- | --- |
| Estado financiero y varias acciones juntas | Estado bajo su columna; una principal y menú | Todas las acciones caben y conservan contexto |
| Nombre recortado con `title` | Tooltip por hover/foco, Escape y portal | El texto completo es consultable con teclado |
| Fotos compactas con geometrías distintas | Dos cuadrados redondeados iguales | El resumen mantiene alineación |
| Precio separado al margen | Duración y precio bajo el servicio | Una sola lectura en móvil |
| WhatsApp después de salida y explicación extensa | Secundaria junto a calendario/ubicación; Listo al final | Jerarquía y salida previsibles |

Se revisaron foco, semántica, permisos, datos públicos, copy español y documentación. [Guías web consultadas](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) y [guías de redacción](https://raw.githubusercontent.com/vercel-labs/writing-guidelines/main/command.md); las reglas de Kortek y la tarea determinan el alcance.

**No verificado:** Safari/iPhone físico y su barra flotante, safe-area positiva de un dispositivo real, importación de calendario o apertura externa de WhatsApp/Maps, Clerk real, integración contra API/DB y Preview desplegado. La captura de iPhone mencionada no estaba disponible entre los adjuntos accesibles. Chrome mide 96 px de relleno inferior con inset cero; el CSS suma el inset real. No se afirma cierre del QA físico ni aprobación de M1/F0-E.

## D: decidir consulta y volumen de Reservas

El código confirma que `QueryBookingsDto` admite un `status`; `BookingsService.findAll` devuelve un array sin `take` ni paginación, ordenado por `startTime asc`. El backend aplica tenant y agenda propia antes de consultar. Facturación usa array y cabeceras `X-Total-Count`, `X-Page`, `X-Limit`, `X-Total-Pages`, con `page/limit` y máximo 100.

### D1: varios estados para Por atender

| Opción | Ventajas | Costes y compatibilidad |
| --- | --- | --- |
| A: lista aditiva en el API | Una consulta; filtros, total y páginas coherentes en servidor; menos datos enviados | Nuevo DTO y consulta `status in`; conservar `status` singular. Proponer `statuses=PENDING,CONFIRMED`; rechazar combinación singular/lista ambigua, valores inválidos y lista vacía. API anterior y clientes actuales siguen funcionando |
| B: dos consultas en web | No cambia backend ni migración; cada consulta usa un estado vigente | Dos peticiones y fallos parciales; deduplicación por ID y orden estable. No hay snapshot entre consultas: un cambio PENDING→CONFIRMED puede duplicar u omitir una reserva. Con paginación independiente no hay un total/orden global coherente |

**Recomendación D1-A**, junto a D2-A. B es viable como solución sin backend con error global si falla una consulta, pero no resuelve el volumen ni garantiza una vista simultánea. La proyección local actual es un puente autorizado de frontend, con sus límites expresos arriba.

Pruebas propuestas: singular anterior intacto, lista exacta PENDING/CONFIRMED, lista de todos los estados, duplicados, inválidos y combinación ambigua; fechas sin extremos y con un extremo; cuatro roles, dos tenants, profesional propio/ajeno, sin vínculo; transición con invalidación de caché; cancelación, errores y ausencia de mezcla A→B→A. B requiere probar además fallo de cualquiera de las consultas, deduplicación y carreras; no prometer snapshot.

### D2: Todas sin rango

| Opción | Ventajas | Costes y clientes existentes |
| --- | --- | --- |
| A: paginación como Facturación | Todas las reservas siguen alcanzables; payload acotado y total explícito; patrón conocido | Añadir `page/limit` optativos, cabeceras y CORS cuando falte exposición. Web usa páginas y reinicia a 1 al cambiar filtros. Mantener array evita romper su forma |
| B: tope duro, por ejemplo 200 | Implementación y consumo menores; payload acotado | No permite llegar al resto sin filtrar. Necesita `hasMore` o metadata y aviso honesto; si se aplica globalmente rompe la expectativa actual de historial completo. Un corte ascendente puede excluir reservas recientes |
| C: cursor o cargar más | Mejor escalabilidad para historial grande; evita offsets profundos | Contrato y navegación distintos de Facturación; cursor compuesto y orden estable; total exacto puede seguir siendo caro. Mayor implementación y QA |

**Recomendación D2-A optativa**, con `limit=20` por página y máximo 100, orden `startTime asc, id asc`. Cuando se solicita paginación, incluir metadata real; sin parámetros mantener el comportamiento legacy para evitar una ruptura silenciosa. La web nueva debe solicitar página incluso con fechas y en Por atender. El endpoint legacy seguirá sin límite: un límite global por defecto exige decidir transición/versionado y revisar todos los consumidores.

Pruebas propuestas: 0/1/20/21/200+ reservas, extremos y página fuera de rango, límites inválidos, conteos por estado/tenant/rol, fechas y empates, cambios de estado entre páginas, acceso a la última página y cabeceras CORS. Usar snapshot coherente para count/list en cada respuesta; eso no congela cambios entre páginas. Medir query/plan en base desechable antes de proponer índices o migración. No sustituir `from/to` actuales por semántica de solapamiento sin decisión aparte.

D1/D2 no necesitan una migración por definición; un índice futuro necesitaría revisión y autorización. Rollback propuesto: devolver web al consumidor previo, conservar soporte aditivo mientras existan consumidores nuevos y retirar después los parámetros únicamente tras verificar dependencias. No ocultar resultados durante el rollback. No se implementó ninguna opción.

## E: decidir WhatsApp al profesional

Las decisiones vinculantes **10 y 20** y WhatsApp C1–C3 prohíben exponer el teléfono privado del profesional y conservan contacto genérico al negocio. E pide cambiar destinatario y personalizar el mensaje: necesita una enmienda explícita y aprobación de contrato antes de implementar. El checkpoint inicial no alteró `DECISIONES_PROPIETARIO`; la enmienda 24 posterior aprueba la dirección E-A para un módulo propio después de cerrar M1, sin abrir su implementación ahora.

| Opción | Ventajas | Privacidad, migración e impacto |
| --- | --- | --- |
| A: WhatsApp para clientes separado | Distingue contacto profesional publicado de teléfono privado; puede ser número de trabajo; evita reutilización accidental | Nuevo campo opcional nulo por defecto y permiso específico. Migración aditiva sin copiar teléfonos existentes; DTO de edición y respuesta de alta pública con contacto mínimo. El profesional debe conocer que sus clientes reciben el número |
| B: Mostrar mi WhatsApp a mis clientes | Reutiliza el número existente; elección expresa apagada por defecto | Nuevo booleano false por defecto y reglas de consentimiento. Reutiliza PII privada; cambiar ese teléfono cambiaría el destino público. Recomendar revocar opt-in cuando se cambie el número y exigir nueva elección |
| C: teléfono privado sin consentimiento | No exige un campo nuevo | Contradice directamente las decisiones vigentes. Divulga PII sin elección, mezcla uso privado y comercial y el número ya entregado no puede recuperarse. No se recomienda ni se implementa |
| D: solo negocio | Respeta el contrato aprobado, sin migración ni nueva exposición | No satisface prioridad al profesional. Si además se pide mensaje personalizado al negocio, requiere enmendar el acuerdo genérico; mantener D puede conservar exactamente el mensaje actual |

**Recomendación de ampliación: A**, si decides reemplazar 10/20 y abrir este contrato. Hasta esa decisión, **D con mensaje genérico vigente**. A permite elegir un número distinto y reduce el acoplamiento con el teléfono privado. B exige comprender que se publica precisamente ese contacto y no ofrece esa separación.

### Condiciones propuestas para A y B

La ampliación debe cumplir estas condiciones antes de aprobarse:

- El número del profesional solo viaja en la respuesta de la reserva recién creada y solo del finalmente asignado. Nunca en booking-data, disponibilidad, catálogo/media, CMS público, enlaces de otras reservas ni directorios. El teléfono publicado del negocio conserva su contrato existente
- Respuesta aditiva propuesta: contacto mínimo `{recipient: 'PROFESSIONAL' | 'BUSINESS', phone: string}` opcional, sin objeto Professional privado ni datos de otros profesionales. Es una propuesta, no un campo implementado. El fallback del negocio debe ser el publicado elegible
- Resolver tenant por slug y profesional desde la reserva creada, no desde un ID o teléfono aportado libremente por el cliente. Comprobar vínculo/estado/elegibilidad y configuración actual en la misma transacción o snapshot autoritativo
- «Cualquiera disponible»: usar exclusivamente el asignado por servidor después de validar disponibilidad. Si cambia el candidato o está ocupado, la creación falla o sigue la política existente; no usar un número de la selección anterior
- Sin número elegible del asignado: fallback al negocio; sin ambos: omitir botón. Validación internacional estricta sin inferir país
- A: Profesional edita solo su campo propio, OWNER/ADMIN gestionan el campo del perfil de su negocio con finalidad clara; RECEPTIONIST/CUSTOMER no editan. Registrar actor/cambio sin número en AuditLog. Si se exige consentimiento personal, OWNER/ADMIN pueden proponer o retirar el contacto, y el profesional habilita la exposición
- B: solo el Profesional activa su opt-in. OWNER/ADMIN pueden desactivarlo; no pueden consentir en su nombre. Sin usuario vinculado no se permite activación por delegación. No ampliar quién lee o edita el teléfono privado actual
- Salida del negocio, desvinculación, inactividad o retirada pública: no devolver el número en nuevas altas; B revoca opt-in. A retira el contacto público de ese perfil. No transferirlo automáticamente a otra organización o profesional
- Revocar no borra números o mensajes ya entregados al navegador, contactos o WhatsApp. No ofrecer revocación retroactiva. No añadir por inferencia un endpoint público de consulta posterior para éxito/historial
- Mantener `Cache-Control: no-store`; no persistir contacto/cliente en localStorage, URL del negocio, analítica, logs ni AuditLog. El número/mensaje viaja a WhatsApp solo mediante acción manual del visitante
- Conservar el limitador compartido actual: POST público **5/min por IP/handler**, disponibilidad/rango **30/min**. No agregar un endpoint de teléfono; creación con 429 no revela contacto. La cuota por IP limita abuso, no demuestra que el visitante sea propietario legítimo del teléfono de cliente
- Se requerirá medir abuso con peticiones sintéticas y decidir controles adicionales si el alta pública permite recolectar contactos. Nuevos límites por perfil/tenant requieren decisión, pues pueden bloquear reservas legítimas

La respuesta no debe divulgar número ante 400/404/409/429/503 ni una transacción revertida. La entrega de contacto no cambia `PENDING`, no envía mensajes ni acredita recepción.

### Mensajes y fecha propuestos

Recomiendo construir el texto **en la web**, según tu preferencia. El nombre del cliente ya está en el borrador de esa visita; el backend debe decidir únicamente el contacto autorizado. Limpiar saltos/espacios y usar longitud acotada; `encodeURIComponent` codifica el texto y el dominio continúa fijo `https://wa.me/`. No registrar ese enlace completo en telemetría.

Usar servicio/profesional del resultado vigente y la fecha/hora del instante autoritativo en zona del negocio. Si no se puede resolver la selección, mantener un mensaje genérico seguro. Añadir la fecha reduce ambigüedad:

- Profesional: «Hola, soy [Cliente]. Reservé [Servicio] contigo el 5 oct a las 9:00 a. m. Cualquier novedad, favor notificarme.»
- Negocio: «Hola, soy [Cliente]. Reservé [Servicio] con [Profesional] el 5 oct a las 9:00 a. m. Cualquier novedad, favor notificarme.»

En fechas de otro año, incluirlo. El servidor podría componer un texto uniforme con sus nombres autoritativos, pero ampliaría respuesta y tratamiento de PII y acoplaría idioma/copy al API. Si la web lo arma, no debe volver a consultar un catálogo que pudo cambiar ni exponer datos del cliente en el DOM del resumen por ese motivo.

### Pruebas, migración y rollback de E

Probar consentimiento apagado/activado/revocado, número inválido/cambiado, sin vínculo, cuatro roles y dos tenants; IDOR en edición; profesional ajeno/inactivo/retirado; selección explícita y cualquiera; fallback válido y ausencia de ambos. Verificar con comparación de JSON que no aparece contacto en catálogo/slots/media ni en errores. Ensayar carrera entre retiro/revocación y creación, ausencia de dato tras rollback, cache `no-store`, 429 compartido con réplicas y ninguna consulta de teléfono adicional.

Web: destinatario correcto, dos textos, fecha y año/zona, nombres con acentos/caracteres especiales, mensaje acotado, sin cliente/contacto en logs, ausencia de apertura automática, pestaña nueva, teclado, contraste y ocultación cuando falta contacto. QA física debe comprobar WhatsApp con el propietario, sin enviar mensajes durante pruebas automáticas.

A/B requieren migración aditiva, DTOs y política de edición/exposición aprobados. Ensayar backup→migración→restore en base desechable. **Aplicar cualquier migración a QA requiere autorización y respaldo verificado aparte; producción permanece cerrada.** No copiar números privados ni activar consentimiento durante backfill.

Rollback: web regresa al negocio y mensaje genérico; backend omite el contacto profesional y conserva columnas aditivas mientras se comprueba compatibilidad. Deshabilitar la exposición con una operación específica autorizada; no borrar datos ni hacer una migración destructiva automática. Los números ya compartidos no son recuperables. No se añadieron columnas, flags, endpoints ni consentimientos.

## Checkpoint local previo a la autorización de publicación

La instrucción inicial proponía separar los frentes. La autorización posterior establece dos commits: código/pruebas de ambos frentes y documentación/evidencia/enmiendas. Frente 1 comprende `bookings/page.tsx`, `dashboard/layout.tsx`, `BookingActions.tsx`, `BookingName.tsx` y su regresión. Frente 2 comprende `ConfirmStep.tsx`, `SuccessView.tsx`, `BookingPhoto.tsx`, `PublicBookingScreen.tsx`, `booking.css` y sus regresiones. Harness, evidencia e informe son compartidos y pueden repartirse explícitamente al publicar.

Git final: rama `ai/antigravity-qa`; `HEAD` y la referencia local `origin/ai/antigravity-qa` siguen en `0b24b8895b7bd9e32dcc8c98ea78570e594b882e`. No se consultó ni publicó el remoto. No hay staging, commit, push ni despliegue. Solo hay cambios locales del alcance autorizado y controles documentales. `BACKEND_CHANGES.md` y `DECISIONES_PROPIETARIO` permanecen intactos.

Salida de `git status --short`:

```text
 M CHANGELOG.md
 M PROJECT_MASTER.md
 M apps/web/app/[slug]/_components/ConfirmStep.tsx
 M apps/web/app/[slug]/_components/SuccessView.tsx
 M apps/web/app/dashboard/bookings/page.tsx
 M apps/web/app/dashboard/layout.tsx
 M apps/web/components/booking/BookingActions.tsx
 M apps/web/components/booking/F0B.test.tsx
 M apps/web/components/public/BookingPhoto.tsx
 M apps/web/components/public/BookingPolish.test.tsx
 M apps/web/components/public/PublicBookingScreen.tsx
 M apps/web/components/public/WhatsAppSuccess.test.tsx
 M apps/web/components/public/booking.css
 M docs/README.md
?? apps/web/components/booking/BookingName.tsx
?? apps/web/scripts/f0e-browser.mjs
?? apps/web/scripts/f0e-build.mjs
?? docs/quality/CORRECTIVO_F0E.md
?? docs/quality/evidence/f0e/
```

`git diff --check` termina con exit `0`; se revisaron el diff y su estadística. `git diff --cached --stat` está vacío. Las advertencias LF→CRLF corresponden a la configuración de Git y no son errores del chequeo. Los archivos nuevos y las capturas permanecen sin seguimiento hasta una publicación autorizada.

**Este fue el punto de espera previo; la nueva autorización fija D1-A/D2-A/E-A como dirección futura, sin implementar backend ahora.** Recomendación: D1-A, D2-A optativa y E-A como futura ampliación; hasta aprobarla, E-D genérica. Si se aprueba E, el siguiente gate añadirá una nota fechada de decisión y propondrá el contrato antes de código backend. Elegir opciones no implica autorizar migración QA, despliegue o producción.


## Publicación autorizada del 2 de octubre de 2026

La autorización expresa permite commit/push solo a `ai/antigravity-qa` y despliegue exclusivamente web a Cutover QA. No abre API, migraciones, flags, variables ni producción. Las enmiendas 22–24 se añadieron al final del documento vinculante, sin alterar lo anterior. D1-A y D2-A requieren C1 propio antes de la Puerta de producción; E-A corresponde a un módulo posterior al cierre de M1 y solo su futuro campo separado reemplazará 10/20. Hoy permanece el WhatsApp genérico del negocio.

Clasificación inicial: nueve archivos de código/componentes web, tres archivos de pruebas, dos harnesses web, 37 archivos de evidencia, un informe y cuatro documentos de control contando decisiones. No había trabajo ajeno. `.tmp`, archivos de entorno reales, credenciales, dumps/backups binarios y build permanecen ignorados y fuera del índice. Los `.env.example` y scripts/documentos de respaldo previamente versionados son material de configuración/operación, no secretos ni respaldos de datos; no se modifican.

### Auditoría de evidencia

Se revisó el JSON recursivamente para JWT, claves sk_/pk_, Bearer, cookies, contraseñas, sesión, credenciales en URI y correos no sintéticos. Los PNG solo contienen chunks de imagen; no contienen metadata textual/EXIF. Se inspeccionaron sus píxeles en láminas de las 36 capturas y se contrastó la fixture del harness. Los nombres/contactos visibles de revisión son sintéticos del harness; no hay correos reales, sesiones, credenciales ni PII real. Una coincidencia inicial de correo en bytes IDAT comprimidos de `reservas-inicial-375.png` era un falso positivo; se descartó tras separar datos binarios de metadata y comprobar la imagen. No se excluyó evidencia sensible porque no se encontró.

| Archivo | Resultado |
| --- | --- |
| `browser.json` | limpio |
| `exito-business-320.png` | limpio |
| `exito-business-375.png` | limpio |
| `exito-business-390.png` | limpio |
| `exito-none-320.png` | limpio |
| `exito-none-375.png` | limpio |
| `exito-none-390.png` | limpio |
| `facturacion-1024.png` | limpio |
| `facturacion-1280.png` | limpio |
| `facturacion-1440.png` | limpio |
| `facturacion-1920.png` | limpio |
| `facturacion-320.png` | limpio |
| `facturacion-375.png` | limpio |
| `facturacion-390.png` | limpio |
| `facturacion-768.png` | limpio |
| `reservas-inicial-1024.png` | limpio |
| `reservas-inicial-1280.png` | limpio |
| `reservas-inicial-1440.png` | limpio |
| `reservas-inicial-1920.png` | limpio |
| `reservas-inicial-320.png` | limpio |
| `reservas-inicial-375.png` | limpio |
| `reservas-inicial-390.png` | limpio |
| `reservas-inicial-768.png` | limpio |
| `reservas-todas-1024.png` | limpio |
| `reservas-todas-1280.png` | limpio |
| `reservas-todas-1440.png` | limpio |
| `reservas-todas-1920.png` | limpio |
| `reservas-todas-320.png` | limpio |
| `reservas-todas-375.png` | limpio |
| `reservas-todas-390.png` | limpio |
| `reservas-todas-768.png` | limpio |
| `revision-business-320.png` | limpio |
| `revision-business-375.png` | limpio |
| `revision-business-390.png` | limpio |
| `revision-none-320.png` | limpio |
| `revision-none-375.png` | limpio |
| `revision-none-390.png` | limpio |

### Validación y Git de publicación

Se repitieron las validaciones del árbol web candidato el 2 de octubre: `pnpm --filter web type-check:clean`, `pnpm --filter web lint`, `pnpm --filter web test` y `node apps/web/scripts/f0e-build.mjs`, todos exit `0`; 158 unitarias y 125 componentes. Type-check limpio falló primero por DEPLOY_ENV ausente; se regeneró con DEPLOY_ENV=development y API loopback únicamente en el proceso de compilación, sin editar `.env` ni configuración remota. La matriz de 95 registros se reutiliza porque el código/harness web no cambió desde su último recorrido completo. `git diff --cached --check` pasa y se revisaron los diffs por rutas explícitas.

Primer commit de código/pruebas: `26cfc42d103304481329ef5df3f9e0a8c026b030`. El segundo commit recoge esta documentación, evidencia limpia y enmiendas. Después se verificará SHA local/remoto con `git rev-parse HEAD` y `git ls-remote origin refs/heads/ai/antigravity-qa`. El resultado posterior del despliegue se actualizará localmente en este informe y controles, sin un tercer commit no solicitado ni reescribir los dos commits publicados.

Línea base: `main` y web producción en `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6`; despliegue productivo `dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm`. API productiva imagen `8caacd8548a61d94807c0b865229a731df594f63f609ca9ab57df99283dceca2`, PID `151158`; OCI se inventarió por SSH de solo lectura. El dominio QA está configurado para `ai/antigravity-qa`. Las credenciales CLI existentes de Vercel devuelven 403/forbidden; el navegador tiene una sesión válida y permite inspeccionar el proyecto. No se crean credenciales ni se cambia SSO.

API C1, despliegue exacto, teléfono público de negocios sintéticos y comparación final: pendientes de ejecutar tras el push. No se declara desplegado ni aprobado en este checkpoint.

### Guía breve de QA del propietario

Abrir [Reservas QA](https://qa.booking.kortek.cloud/dashboard/bookings) con una cuenta de pruebas y [reserva sintética Norte](https://qa.booking.kortek.cloud/m1-c3-norte/reservar). Mantener todos los datos de prueba sintéticos.

1. En escritorio de 1280 px, entrar de nuevo a Reservas: Desde/Hasta vacíos, estado Por atender visible y solo pendientes/confirmadas. Comprobar tabla sin cortes; nombres completos con foco/hover; una acción principal y menú por fila; factura bajo Estado. Abrir menú con Enter, recorrer con flechas y cerrar con Escape sin perder el foco. Elegir Todas y Completadas; verificar sus resultados y después Limpiar.
2. En teléfono, comprobar las mismas fechas/estado inicial, tarjetas sin cortes y acciones alcanzables. El filtro visible explica la vista. No confirmar, completar, facturar ni cambiar reservas durante una inspección de solo lectura.
3. En el flujo público, elegir servicio, profesional, fecha/hora. Deslizar la semana con el dedo: cambia el rango sin confundir swipe con tap y conserva la selección; también debe permitir scroll vertical. Abrir/cerrar mes y comprobar retorno al día elegido.
4. En contacto, usar un número sintético: prefijo +1 y grupos dominicanos 3-3-4 con guiones en el resumen. Una duración de 90 minutos se lee «1 h 30 min». Sin foto, las iniciales sustituyen la imagen sin cambiar su tamaño. Activar la cuenta opcional y comprobar el ojito y su anuncio sin introducir credenciales reales.
5. En revisión, comprobar cascada Fecha/hora → Servicio → Profesional → Tus datos, Editar alineado con cada título, fotos iguales y duración/precio juntos. Editar vuelve a su paso y conserva el resto. No pulsar Registrar reserva durante QA de solo lectura; el propietario puede comprobar éxito mediante una reserva sintética cuando autorice esa acción de datos.
6. En éxito de una reserva sintética, comprobar Pendiente de confirmación → calendario → WhatsApp si existe teléfono publicado válido → ubicación → nota → Listo. WhatsApp mantiene contacto genérico del negocio; calendario/Maps/WhatsApp requieren gesto manual. Listo vuelve al mini-sitio. En Safari físico, verificar que la marca inferior permanece visible con teclado y barras, importar el calendario y comprobar gesto táctil, zoom y movimiento reducido. Las pruebas de escritorio no acreditan estos puntos físicos.

El teléfono del negocio se configura por OWNER/ADMIN en Configuración del negocio, en el campo público vigente; si falta, registrar la necesidad sin modificar datos. La tabla por negocio se incorporará después de consultar el catálogo público QA en modo lectura.
