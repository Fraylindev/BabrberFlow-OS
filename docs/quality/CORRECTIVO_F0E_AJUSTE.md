# Reservas que aún necesitan atención y contacto público

Fecha: 2026-10-02. **IMPLEMENTADO / VALIDADO LOCALMENTE / PUBLICACIÓN WEB QA EN PREPARACIÓN.** El propietario autorizó este ajuste, commit, push y despliegue web en QA.

## Producto y criterios de aceptación

El equipo del negocio necesita conservar en «Por atender» las reservas pendientes, confirmadas y completadas sin factura. La ausencia de factura debe estar confirmada por el API (`invoice: null`); un campo omitido no permite inferirla. Al emitir factura, la reserva sale de este filtro. «Todas» prioriza ese mismo grupo y ordena cada grupo por fecha de cita descendente; los demás filtros conservan su orden vigente. Las fechas siguen vacías inicialmente.

Desktop ofrece hasta dos acciones visibles según estado y permisos, con las restantes en el menú. Móvil mantiene su presentación. No se inventan acciones para completar un número de botones. Nombres largos, teclado, foco y ausencia de recortes se verifican desde 1024 px.

El visitante ve fotos cuadradas redondeadas en selección, revisión y éxito. «Listo» se convierte en una salida legible; WhatsApp y «Cómo llegar» comparten un estilo secundario más visible. Calendario conserva su jerarquía. El ajuste de encuadre/recorte de fotos queda diferido por el propietario.

El mini-sitio sustituye la llamada junto a «Reservar cita» por WhatsApp al teléfono **publicado** del negocio. El mensaje previo a reservar es genérico y distinto del mensaje posterior a registrar la reserva. No incluye nombre, teléfono, servicio ni otro dato del visitante. Un teléfono ausente o inválido omite el enlace. No se expone el teléfono privado del profesional ni se implementa E-A.

## Contrato, permisos y estados

El contrato aprobado ya entrega estado y factura para el panel, y teléfono publicado para el mini-sitio. Este cambio es una proyección local y enlaces web; no requiere backend, migración ni datos nuevos. Caché, aislamiento y permisos permanecen en sus rutas vigentes. Se conservan loading, vacío, error, mutación pendiente y éxito. La instrucción posterior del propietario modifica la decisión 22 y la presentación F0-E anterior; se registra como enmienda, sin reescribir la historia.

Base: `ea912d996567cc9b8e8f0abf147e1c4ca52e2138`, rama `ai/antigravity-qa`. Había cuatro documentos locales con resultados del despliegue F0-E anterior, preservados. QA física y aprobación final de M1 continúan pendientes.

## Validación y publicación

TypeScript con tipos regenerados, lint, 290 pruebas (158 unitarias y 132 de componentes) y build final terminaron con exit `0`. Comandos: `pnpm --filter web type-check:clean`, `pnpm --filter web lint`, `pnpm --filter web test`, `node apps/web/scripts/f0e-build.mjs`. La validación usa variables solo en el proceso local; no modifica archivos `.env` ni configuración remota.

`node apps/web/scripts/f0e-ajuste-browser.mjs` terminó con exit `0`: **123 registros, cero fallos**, en Chrome local con componentes reales y transporte HTTP sintético aislado. Anchos 320/375/390/768/1024/1280/1440/1920, cuatro roles, filtros y limpieza, teclado/tooltip/menú, errores y estados vacíos. Se completó una cita y permaneció en «Por atender»; al emitir factura desapareció. «Todas» prioriza atención incluso frente a una cita facturada más reciente; sin atención muestra las cuatro del historial. No hubo overflow ni recorte de acciones en Reservas. En 1024 las acciones pueden ocupar dos líneas; desde 1440 las dos acciones y menú caben juntos. Facturación solo se observa, conserva el diagnóstico previo.

Selección de profesional entre dos candidatos, revisión y éxito pasan con fotos y respaldos. Mini-sitio, WhatsApp y éxito se prueban con y sin teléfono de negocio. «Listo» tiene altura mínima 52 px; ambos enlaces secundarios superan 44 px y conservan aviso de pestaña nueva. Contrastes, geometría y evidencia están en [browser.json](evidence/f0e-ajuste/browser.json). Capturas exclusivamente sintéticas, sin metadatos sensibles; auditoría local de secretos y contactos limpia. Los primeros intentos del escenario de selección fallaron por una espera prematura y por usar una fixture de un solo profesional, cuyo paso se omite correctamente; se corrigió el escenario y no se cuentan como aprobados.

GET de catálogo público y días disponibles del API QA: `200/200`, exit `0`, sin POST ni despliegue API. Línea base productiva Vercel `dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm`, `main` en `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6`. API, workers, archivos protegidos y servicios se inventariaron por lectura antes de publicar.

Chrome bloquea el panel autenticado desplegado por una interfaz de otra extensión abierta; no se modifican sesión ni protección para sortearlo. El flujo público desplegado se verificará tras publicar. No se registran reservas ni se editan contactos en bases reales. Los dos negocios sintéticos QA del C3 no tienen teléfono publicado, por lo que el enlace con número solo se prueba localmente. Safari/iPhone físico, apertura externa/importación del calendario y aprobación final siguen pendientes. **No se declara cerrado M1.**

Los resultados documentales locales del despliegue F0-E anterior se incluyen en esta publicación autorizada. El historial original se conserva, y este documento fija las reglas posteriores.
