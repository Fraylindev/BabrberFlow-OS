# WhatsApp manual — C2 frontend

Fecha: 2026-09-14. Estado: **CERRADO / APROBADO** por decisión explícita del propietario sobre el árbol local con base `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`. Autoriza [C3: activación](WHATSAPP_C3_ACTIVACION.md), con prueba manual obligatoria en teléfono real para ambos negocios antes del cierre. El cuerpo conserva la evidencia y el estado históricos al entregar C2; las menciones a revisión pendiente no revocan esta aprobación. Sin commit, push ni despliegue.

## Autorización y brief

El propietario aprobó explícitamente C1 sobre `c7d43ad03a65a900a930a1a0d69dd258b8516a1e` y autorizó C2 según D1–D6 y [WHATSAPP_C1_CONTRATO.md](WHATSAPP_C1_CONTRATO.md). Exigió ejecutar todos los vectores de §4, QA real de popup bloqueado y accesibilidad, y eliminar la apertura automática de PublicMiniSite en favor del mismo patrón manual de SuccessView.

Usuario: visitante público que acaba de registrar su reserva. Resultado: contacto voluntario con el negocio del slug actual, sin confundir registro con confirmación o envío. No hay permiso B2B nuevo. Solo se usa el teléfono publicado; el mensaje no lleva datos del cliente, servicio ni fecha. No hay nuevas solicitudes, almacenamiento, logs, contratos ni dependencias.

Tras éxito se muestra «Tu reserva quedó registrada». Con teléfono elegible aparecen la explicación exacta C1 y un enlace nativo único por activación, accesible por teclado, con foco visible, nombre que anuncia pestaña nueva y sin controles interactivos anidados. Sin teléfono elegible se omiten enlace y auxiliar. Loading, error, pending, recuperación y retiro mantienen el flujo existente y no habilitan la acción antes del éxito. Desktop y 375 px son criterios de QA.

No-alcance: producción, CMS, H5/fechas, personal → cliente, plantillas, proveedores, envío, pagos y otros módulos. No se modifica la base de datos. Los cambios previos de documentación C0/C1 y la suite API C1 se preservan. Sin autorización de publicación Git ni despliegue.

## Implementación D1–D6

| Decisión | Implementación comprobable |
| --- | --- |
| D1 | `PublicMiniSite` pasa exclusivamente `data.organization.phone` a `SuccessView` después de un POST exitoso; se conserva el aislamiento de query keys por slug y el `key={slug}` de la página |
| D2 | [whatsapp-link.ts](../../apps/web/lib/whatsapp-link.ts) rechaza caracteres prohibidos antes de eliminar solo espacio ASCII, paréntesis, punto y guion; exige `+`, primer dígito 1–9 y 7–15 dígitos ASCII |
| D3 | Dominio constante `https://wa.me/`; no se consume `whatsappBaseUrl`. QA entrega deliberadamente una base no confiable y verifica el destino fijo |
| D4 | Mensaje exacto C1 constante, codificado una vez; único parámetro `text`, sin fragmento ni datos interpolados |
| D5 | `SuccessView` anuncia «Tu reserva quedó registrada» mediante `role="status"`; no escribe ni transforma Booking, que conserva el resultado `PENDING` |
| D6 | Un enlace nativo «Abrir WhatsApp», `target="_blank"`, `rel="noopener noreferrer"`, `aria-label="Abrir WhatsApp (se abre en una pestaña nueva)"`, explicación previa vinculada con `aria-describedby` y foco visible |

**La apertura automática de PublicMiniSite se eliminó**, junto con el mensaje que incluía nombre del cliente, negocio, servicio, fecha y hora. Su callback ahora solo guarda el resultado; no compone URLs ni abre ventanas. También se eliminó `waLink` de `shared.tsx`, que rescataba dígitos indiscriminadamente. No queda ningún consumidor de ese helper.

**Ambas superficies terminan usando el mismo patrón de un solo clic:** PublicMiniSite renderiza el mismo SuccessView probado aisladamente. Hay un único punto de composición y un único enlace; no existe una segunda acción paralela, `onClick` de apertura ni `window.open` productivo en estas superficies. El enlace no contiene botones ni está dentro de otro control interactivo.

Teléfono inelegible omite enlace y explicación, sin alterar el éxito. No se crean estados de envío, detección de app instalada ni comprobaciones externas de titularidad. Bloqueo o cierre de la pestaña externa deja el resultado y el enlace disponibles; otro clic no repite el POST. Se conservan errores/reintentos y barreras de retiro existentes.

## Vectores C1 §4 ejecutados

Suite: [whatsapp-link.test.ts](../../apps/web/lib/whatsapp-link.test.ts). **32/32 pasaron**: 31 entradas explícitas y una comprobación independiente del mensaje exacto. Cada entrada agrupada de la tabla C1 se ejecuta como test propio; no queda ninguna fila como especificación pendiente.

| Fila C1 | Entradas ejecutadas | Resultado real |
| --- | --- | --- |
| Límites | `+1234567`, `+123456789012345` | 2 aceptadas, destinatario exacto y solo `text` |
| Separadores | ` +1 (809) 555-1234 `, `+34.912.345.678` | 2 aceptadas, dígitos conservados |
| Ausencia | `null`, `undefined`, vacío y tres espacios ASCII | 4 sin enlace |
| Falta de `+` | `8095551234`, `18095551234`, `0018095551234` | 3 sin enlace |
| Prefijo/longitud | `+01234567`, `+123456`, `+1234567890123456` | 3 sin enlace |
| `+` incorrecto/letras | `++18095551234`, `1809+5551234`, `+18095551234 ext 2`, `+18095551234x2` | 4 sin enlace |
| Inyección/caracteres | URL `https://wa.me/…`, URI `tel:…`, sufijos `?text=hola`, `&text=hola`, `#fragment`, CR, LF y CRLF finales, tabulador interno, NBSP, espacio de ancho cero, dígitos árabes y de ancho completo | 13 sin enlace; no se sanea ninguno hasta hacerlo aceptable |

Las cuatro URLs válidas se comparan completas, con dominio, dígitos, codificación, ausencia de fragmento y exactamente un parámetro. El helper no recibe otros datos de reserva ni una base URL configurable.

## Pruebas y comandos

Windows local, rama `ai/antigravity-qa`, HEAD `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`.

| Comando | Resultado final |
| --- | --- |
| `pnpm --filter web exec node --test lib/whatsapp-link.test.ts` | Exit `0`, 32/32 |
| `pnpm --filter web exec node --test 'lib/*.test.ts'` | Exit `0`, 106/106, incluidos los 32 nuevos |
| `pnpm --filter web exec vitest run` | Exit `0`, 5 suites, 30/30; 7 pruebas C2 nuevas |
| `pnpm --filter web exec tsc --noEmit` | Exit `0` |
| `pnpm --filter web lint` | Exit `0`, sin advertencias |
| `pnpm --filter web build` | Exit `0`, compila, comprueba tipos y genera las páginas |
| `pnpm --filter web exec playwright test e2e/whatsapp-c2.spec.ts --workers=1 --reporter=json` | Exit `0`, 16/16, cero omisiones, fallos o reintentos; [informe original](evidence/whatsapp-c2/browser-results.json) |
| `git diff --check` y comprobación de archivos C2 nuevos | Exit `0`, sin errores de espacios ni marcadores de conflicto |
| Validación de enlaces locales en los diez documentos de estado/contrato/entrega | Exit `0`, 197 enlaces resueltos (incluida decodificación de rutas `%5Bslug%5D`) |
| `git diff --cached --exit-code` | Exit `0`, staging vacío |
| Diff de API, componentes CMS y queries públicas | Exit `0`, sin cambios versionados; la suite API C1 sin seguimiento es previa a C2 |

[WhatsAppSuccess.test.tsx](../../apps/web/components/public/WhatsAppSuccess.test.tsx) prueba la vista aislada, semántica, descripción, ausencia de controles anidados, URL sin datos privados, ausencia de apertura JavaScript y cambio/ausencia del destinatario. [WhatsAppScope.test.tsx](../../apps/web/components/public/WhatsAppScope.test.tsx) ejecuta un POST pendiente, desmonta A → B → A con la clave real de la página y resuelve la respuesta vieja: no aparece éxito/enlace de aquella visita ni se abre ventana. No se modifican las pruebas H5 existentes.

El primer build detectó que el estado del fixture se había inferido como `string`; se tipó como `PublicBookingResult` y el build final pasó. Los primeros ensayos de navegador detectaron una carrera al observar loading y que el entorno automatizado mantiene las pestañas como visibles. El test final usa una barrera explícita de respuesta para loading y señala `visibilitychange` sobre `window`, donde React Query escucha; no se presenta como cambio de pestaña del sistema operativo. Un sondeo opcional del bloqueador ordinario mediante CDP no reprodujo denegación y se retiró: **no se atribuye evidencia a ese sondeo**. La denegación reproducible del enlace real proviene de la política sandbox descrita abajo.

Dos intentos de exportar directamente desde una orden PowerShell compuesta/redirigida fallaron por acceso a la configuración local de pnpm. La ejecución final directa terminó con exit `0`; se guardó su JSON y se extrajeron sus adjuntos sin volver a ejecutar pruebas ni cambiar la aplicación. El aviso experimental de MockTimers pertenece a pruebas de lógica previas.

## QA real de navegador

[Suite reproducible](../../apps/web/e2e/whatsapp-c2.spec.ts), Chrome **152.0.7977.83**, build Next local en `http://127.0.0.1:3011`, visitante anónimo, escritorio **1280×720** y móvil **375×812**. Se ejecutan ocho escenarios en cada tamaño, **16/16 aprobados**. No se requieren ni se amplían roles B2B para esta acción pública; los permisos internos no fueron modificados ni se les atribuye QA nuevo.

El navegador ejecuta la página y los componentes reales, el cliente HTTP real y React Query. La frontera HTTP devuelve respuestas controladas conformes a C1 para dos negocios de QA; no es una integración nueva con Nest/PostgreSQL ni una modificación de CMS. `wa.me` se intercepta únicamente en la suite, antes de contactar la red externa; se comprueba navegación/destino, no existencia de WhatsApp, envío ni entrega. La aplicación productiva no contiene fixtures ni interceptores.

| Escenario, ejecutado en ambos tamaños | Acción y observación |
| --- | --- |
| Flujo completo | Loading sin enlace; pasos reales servicio → profesional → fecha/hora → contacto → cuenta opcional → revisión; pending deshabilitado sin enlace; resultado registrado con una sola acción y cero pestañas externas antes de activarla |
| Accesibilidad y clic repetido | Desde el encabezado se avanza con Tab hasta el enlace; foco CSS visible, Enter abre una pestaña, clic posterior abre otra única pestaña; `window.opener === null`, descripción y `aria-label` exactos, ningún control interactivo ancestro/descendiente |
| Privacidad y persistencia | Ambas activaciones llevan solo el teléfono publicado y mensaje fijo; base legacy no confiable ignorada; un único POST con el cuerpo original, sin estado ni campo WhatsApp añadido; resultado `PENDING` intacto |
| Teléfono inelegible | Tres casos independientes: `null`, número sin `+`, LF final; éxito visible, enlace y explicación ausentes, un POST por caso y ninguna ventana |
| Conflicto y revalidación | POST `409` no muestra éxito/enlace; reintento explícito `201` sí; al recibir `404` en la lectura disparada por `visibilitychange`, se retiran éxito y contacto anteriores sin otro POST |
| Dos slugs | Recorridos completos A → B → A: respectivamente `18095551234`, `34912345678`, `18095551234`; ningún enlace antes del éxito de cada recorrido |
| Error de catálogo y retiro al crear | Lectura `503` muestra recuperación sin contacto alternativo; reintento explícito recupera la página; POST `404` muestra indisponibilidad sin éxito/WhatsApp |
| Popup realmente bloqueado | La página real se carga en un iframe de prueba sin `allow-popups`; Chrome bloquea el enlace nativo tanto por clic como por Enter y emite dos mensajes de denegación. Cero pestañas nuevas, cero solicitudes al destino y un solo POST; éxito y enlace permanecen disponibles |

**El bloqueo no usa el doble de `window.open` de H5:** no se reemplaza ninguna función de apertura ni se cancela el clic. Lo impone Chrome sobre el enlace real por la política sandbox del contenedor de prueba. La consola confirma literalmente la ausencia del permiso `allow-popups`. La navegación permitida fuera del sandbox está probada separadamente en el flujo completo. No se afirma detectar o sortear bloqueos del navegador desde la aplicación.

Evidencia persistente revisada:

- Éxito y foco: [escritorio](evidence/whatsapp-c2/desktop-success-focus.png) y [375 px](evidence/whatsapp-c2/mobile-success-focus.png). Texto completo, auxiliar antes de la acción, foco visible y medición `scrollWidth <= innerWidth`; sin overflow en la página normal.
- Resultado después del bloqueo: [escritorio](evidence/whatsapp-c2/desktop-popup-blocked.png) y [móvil](evidence/whatsapp-c2/mobile-popup-blocked.png). Captura del componente de éxito real dentro del iframe de QA, incluyendo explicación y acción.
- Denegación emitida por Chrome: [escritorio](evidence/whatsapp-c2/desktop-chrome-browser-popup-denial.txt) y [móvil](evidence/whatsapp-c2/mobile-chrome-browser-popup-denial.txt).
- Entorno: [desktop](evidence/whatsapp-c2/desktop-chrome-environment.json), [móvil](evidence/whatsapp-c2/mobile-chrome-environment.json). Consola del flujo exitoso: [desktop](evidence/whatsapp-c2/desktop-chrome-console.json), [móvil](evidence/whatsapp-c2/mobile-chrome-console.json): cero errores de aplicación; único aviso preexistente de Clerk por claves de desarrollo. Los errores HTTP y la denegación sandbox son provocados expresamente en sus escenarios.

## Seguridad, alcance y entrega

Amenazas verificadas: rescate de dígitos de texto libre, inyección de destino/parámetro, filtración de datos en el mensaje, mezcla de destinatarios por slug/respuesta tardía y confusión entre navegación y mutación. Se resuelven con validación estricta previa, constantes, props mínimas, aislamiento ya existente y navegación nativa sin efectos. El frontend no sustituye la publicación ni autorización backend y no puede revocar un enlace externo ya conocido.

No cambian endpoints, DTOs, Prisma, migraciones, dependencias, variables de entorno, CMS, H5/fechas ni otros módulos. No se tocó la base de prueba ni producción. Rollback, si se pide, deberá retirar coherentemente C2 manteniendo apertura manual y privacidad; no se debe restaurar la apertura automática con datos del cliente.

Archivos productivos: `PublicMiniSite.tsx`, `SuccessView.tsx`, eliminación del helper legacy en `shared.tsx` y nuevo `lib/whatsapp-link.ts`. Pruebas: cuatro archivos C2 nuevos. Documentación: este informe/evidencia, aprobación C1 y referencias de estado/flujo WhatsApp. Se preservan los cambios previos de roadmap/C0/C1, suite API C1 y documentos CMS sin ampliarlos desde C2.

Entrega local revisable sobre HEAD `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`, rama `ai/antigravity-qa`. Sin staging, commit, push ni despliegue; no hay SHA publicado por esta entrega que reconciliar. La aprobación de C1 no se presenta como aprobación de C2. Siguiente gate: revisión y decisión explícita del propietario sobre este frontend.
