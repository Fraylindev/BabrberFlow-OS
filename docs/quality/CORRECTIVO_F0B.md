# Correctivo F0-B — Reservas, facturación y recuperación de acceso

Estado: **IMPLEMENTADO / PUBLICACIÓN Y DESPLIEGUE QA AUTORIZADOS / EN REVISIÓN**. Base: `6752e95`, rama `ai/antigravity-qa`. Solicitud del propietario del 2026-09-30 tras su testing de F0-A. El propietario aprobó explícitamente el backend F0-B y su integración frontend, y posteriormente autorizó commit/push de F0-B y despliegue a QA. Gate 4 técnico y QA con transporte controlado pasan; Gate 5 integrado y aprobación final permanecen pendientes.

## Producto y aceptación

Usuarios: OWNER, ADMIN, RECEPTIONIST y Profesional, con sus permisos actuales. Una reserva completada sin factura ofrece «Emitir factura»; con factura muestra «Pendiente de cobro» o «Pagada», sin volver a ofrecer emisión. El estado financiero no cambia el estado operativo COMPLETED. Emitir/cobrar actualiza ambos módulos automáticamente y volver a Reservas consulta el estado autoritativo.

En móvil, cada reserva muestra como máximo una acción principal y un menú «Más acciones»: pendiente → Confirmar; confirmada → Completar; Reprogramar, Cancelar y No asistió quedan en el menú cuando el rol y estado los permiten. Objetivos táctiles de 44 px, teclado, Escape y retorno del foco. Desktop conserva su patrón actual.

Una renovación transitoria del acceso se recupera por detrás, conservando la pantalla y formularios del mismo usuario/negocio/rol. Las consultas reintentan fallos de red/servicio con límite y vuelven a consultar al recuperar conexión. Un token rechazado se renueva una vez. Una sesión revocada o permisos retirados no conservan acceso. Reservas, facturas y cobros no se repiten automáticamente ante un fallo de resultado incierto.

Alcance: estos tres fallos. No incluye registro B2C nuevo, cambio de permisos del Profesional, rediseño de fechas, validación de posesión de contactos, dependencias, configuración ni secretos.

## Contrato y seguridad

Diagnóstico verificado en código: GET /bookings no expone factura; BookingActions ofrece emitir por status COMPLETED únicamente; las mutaciones financieras invalidan solo invoices. El bootstrap usa retry:false/staleTime:0 y un error de refetch desmonta todo el dashboard aun teniendo datos previos.

Contrato backend candidato: GET /bookings conserva sus campos y añade `invoice: null | { id: string, state: 'ISSUED' | 'PAID' }`. PAID se deriva de la existencia de Payment, igual que en Facturación. Solo selección de ID de factura y existencia del pago; sin importes, métodos, PII ni objetos financieros internos. Sin nuevos endpoints, DTOs de entrada, migraciones ni cambios de transacciones. El filtro tenant y el filtro de agenda propia del Profesional permanecen autoritativos; la FK compuesta Invoice → Booking garantiza el mismo tenant.

Amenazas: reintentos duplicados de cobro/reserva, respuestas tardías del tenant anterior, permisos revocados ocultos por caché, exposición financiera innecesaria. Mitigaciones: no repetir escrituras ambiguas; cancelación por contexto y señal; refresco acotado; mantener rechazos definitivos y guards; proyección mínima. No almacenar ni registrar tokens. No ampliar la duración/revocación autoritativa de Clerk. Rollback: revertir este correctivo; campo aditivo compatible con frontend vigente.

El backend candidato pasó Gate 3 y el propietario aprobó explícitamente «el backend F0-B y su integración frontend». El consumidor ya usa ese campo; las correcciones de móvil y recuperación usan el resto del contrato vigente.

## Validación y continuación

Backend candidato validado: TypeScript y lint exit 0; Jest 60 suites, 764 pruebas aprobadas y 37 omitidas, exit 0. Incluye los tres estados financieros, ausencia del objeto Payment/ID de pago y filtros de organización/agenda propia. No se ejecutó integración PostgreSQL nueva; las invariantes de escritura y FK no cambian. Un primer comando con separador incorrecto no encontró pruebas (exit 1); se repitió correctamente con `pnpm --filter api exec jest --runInBand`.

## Implementación y evidencia

- Reservas consume `invoice`, muestra «Pendiente de cobro»/«Factura pagada» y ofrece «Ver facturación». Emitir solo aparece si GET /bookings confirmó `invoice: null`. Si un backend antiguo omite el campo, no se deduce ausencia de factura: se dirige a Facturación. Backend debe publicarse antes del nuevo frontend.
- Emisión y cobro actualizan inmediatamente ambas cachés con la respuesta confirmada y las invalidan solo dentro del usuario/negocio/rol de la operación. Las consultas conservan señal de cancelación y `no-store`. Un fallo financiero de resultado incierto provoca relectura, no otro POST.
- El HTTP central renueva mediante `getToken({skipCache:true})` tras un 401 y repite una sola vez. Los guards rechazan 401 antes del handler; esta respuesta definitiva es la única que permite repetir una escritura. Nunca se repite una escritura por 5xx, timeout o fallo de red. Rechazos finales 401/403 reconsultan el bootstrap; el contexto capturado y su señal cancelan respuestas tardías. Renovaciones simultáneas comparten una promesa por identidad.
- Bootstrap usa 30 s de frescura, reintentos acotados y recuperación periódica de lecturas fallidas cada 15 s mientras la pantalla está abierta, con pausa offline/reconexión de TanStack. Una caída temporal conserva el workspace y los borradores existentes. Revocación/rechazo definitivo retira autoridad, desmonta la pantalla y elimina caché de negocio. No se alargó una sesión ni se omitió revalidación backend.
- Las tarjetas móviles muestran una acción principal y un menú con objetivos de 44 px. Avisos por correo se integra en el menú; se mantienen permisos existentes. Escape devuelve foco sin mover la página; el scroll interno y eventos pendientes anteriores a la apertura no cierran el menú prematuramente.

Diagnóstico remoto **solo lectura**: se filtraron 2.088 líneas del contenedor QA, sin imprimir payloads, tokens o PII. El UUID reportado `a799bb0e-ab96-44e9-8fa8-5722f46997ff` corresponde a `/invoices`, `UnauthorizedException`, 2,92 ms, release `b0357af6b237466f7e5e17c2eff0901e2336ded1`. El agregado contiene 123 rechazos `authentication_state` y 401 en bootstrap, reservas, facturas y organización. Estos logs no distinguen token expirado de otras causas de rechazo: no se declara probado el motivo criptográfico exacto. Una primera lectura de journal no produjo registros; la lectura correcta fue del contenedor Podman.

| Validación final | Resultado |
| --- | --- |
| `pnpm --filter api exec tsc --noEmit` / `pnpm --filter api lint` | Exit 0 |
| `pnpm --filter api exec jest --runInBand` | Exit 0; 764 aprobadas, 37 omitidas; 60 suites |
| `pnpm --filter web type-check:clean` | Exit 0; tipos Next regenerados y TypeScript completo |
| `pnpm --filter web lint` | Exit 0; sin diagnósticos |
| `pnpm --filter web test` | Exit 0; 146 de lógica + 89 de componentes, 15 archivos de componentes |
| Build web final | Exit 0; 16 páginas estáticas, rutas dinámicas y proxy completos |
| Chrome local, transporte controlado | Exit 0; 320/375/390/1280 px |
| `git diff --check` | Exit 0 |

Tipos limpios y build usan exclusivamente marcadores locales de proceso: DEPLOY_ENV development, API loopback, claves ficticias de compilación y telemetría desactivada. Se reutilizó el helper temporal de F0-A con red restringida a Google Fonts; la build final usó caché de fuentes y registró cero conexiones externas. No se cambió `.env` ni configuración persistente. El primer intento de tipos limpios sin marcadores falló por DEPLOY_ENV y se repitió correctamente; no se contó como éxito. Lint detectó inicialmente una mutación local dentro de useMemo; se sustituyó por una referencia aislada por identidad, sin desactivar reglas.

Chrome ejecutó componentes, hooks, AuthProvider y cliente HTTP reales con Clerk y transporte sintéticos explícitos. En cada ancho: renovación tras 401, emisión → cobro → retorno a Reservas con factura pagada y sin botón de emitir, un POST de emisión/un POST de cobro, retención del borrador durante 503, eliminación de acceso tras revocación y ausencia de overflow. En móvil: dos botones visibles, menú, End/Escape, foco y objetivos de 44 px. En 375 px se esperó la recuperación periódica real sin clic de reintento. Cero errores JavaScript/advertencias inesperadas; seis mensajes HTTP de errores 401/503 deliberadamente simulados por ancho, registrados aparte. El ensayo inicial detectó cierre prematuro del menú por un scroll pendiente; se corrigió y el recorrido final pasó. También se corrigieron selectores de prueba que elegían una etiqueta de la presentación oculta de escritorio/móvil.

Evidencia local ignorada por Git: `.tmp/f0b/browser.mjs`, `browser-results.json`, `menu-{320,375,390}.png`, `pagada-{320,375,390,1280}.png`, `web-tests-final.log`. Las capturas se inspeccionaron; no son evidencia de Clerk remoto ni de datos reales en QA.

## Continuación y Git

Checkpoint previo a publicación: HEAD `6752e95e580b41670b6369adfc6bfb240f4c8509`, rama `ai/antigravity-qa`; 20 modificados y 5 nuevos, cero staged y cero rutas `.env`, `.next` o tsbuildinfo. F0-B corresponde a 19 modificados + 5 nuevos; el restante es el informe F0-A con su cambio documental previo, que se conserva sin commit por instrucción expresa. Enlaces locales de los controles comprobados sin rutas rotas; `git diff --check` exit 0. El propietario autorizó publicar exclusivamente F0-B y desplegarlo a QA. Orden: commit local → imagen API del commit → API QA → push → Preview web QA. Solo se sustituyen los selectores operativos de imagen/release QA; secretos, resto de configuración, base de datos, migraciones y producción se conservan.

Pendiente de ejecución: despliegue ordenado API QA → web QA; después repetir con Clerk real emitir/cobrar/volver a Reservas, inactividad/reactivación del navegador, red offline/online, cambio de negocio/rol y sesión revocada. Validar en Safari iPhone 11 y verificar código/header y ausencia de duplicados financieros. Gate 5 integrado y aprobación final del propietario siguen abiertos. No hay cambios en producción.
