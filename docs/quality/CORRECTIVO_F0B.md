# Correctivo F0-B — Reservas, facturación y recuperación de acceso

Estado: **PUBLICADO Y DESPLEGADO EN QA / IMPLEMENTADO, EN REVISIÓN**. Implementación: `33de07a828c95f2087cd67b92bfb331a1a22e922`, rama `ai/antigravity-qa`. Solicitud del propietario del 2026-09-30 tras su testing de F0-A. El propietario aprobó explícitamente el backend F0-B y su integración frontend, y posteriormente autorizó commit/push de F0-B y despliegue a QA. Gate 4 técnico y QA con transporte controlado pasan; Gate 5 integrado y aprobación final permanecen pendientes.

## Producto y aceptación

Testing comunicado por el propietario, 2026-09-30: pasan exclusivamente las validaciones que se le indicaron, excepto el criterio de esperar al fin programado para emitir/cobrar. Aclara que ese límite no responde a su solicitud y reporta zoom en formularios y controles desktop desalineados/con texto partido. Se aborda en [F0-C](CORRECTIVO_F0C.md), implementado y con publicación/despliegue QA autorizados; no se extrapola a escenarios no ejecutados ni se declara cierre global de F0-B.

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

## Publicación y despliegue QA — 2026-09-30

- Commit de implementación: `33de07a828c95f2087cd67b92bfb331a1a22e922`, mensaje `fix(booking): correctivo F0-B - facturacion sincronizada, recuperacion de sesion y acciones moviles`. Staging por 24 rutas explícitas, 19 modificados y 5 nuevos; revisión completa y `git diff --cached --check` exit 0. Push exclusivo a `origin/ai/antigravity-qa`, exit 0; `git rev-parse HEAD` y `git ls-remote origin refs/heads/ai/antigravity-qa` devolvieron ese mismo SHA. Informe F0-A excluido y conservado sin commit.
- API publicada primero desde un contexto mínimo extraído del commit, sin dotenv, secretos, node_modules ni dumps. SHA256 del contexto `74a69e065295b8a407cd41b858edbca922ec2002975015e0409348e0658bfec6`. Build ARM Podman exit 0 y 23 controles negativos de arranque pasan. Imagen inmutable `24e38719c51109dd50ceb8e056628bf81469a7d32a13fd2f35b96662f69701bd`.
- `kortek-api-staging` y `kortek-email-worker-staging` activos con la nueva imagen; API `APP_RELEASE=33de07a828c95f2087cd67b92bfb331a1a22e922`. El worker no expone APP_RELEASE: se verifica por ID de imagen. Una primera ejecución revirtió automáticamente al exigirle erróneamente esa variable; la comprobación se corrigió y la segunda ejecución terminó exit 0 con todos los controles verdaderos. Imagen anterior conservada: `c9501c7ae3845f95081af884552b44cb5d1a5d8d52d5061ba24a87615c3e6cb9`.
- Solo cambian los selectores de imagen/release QA. Comparación confirma resto de credencial y secretos del runtime sin cambios, wrappers/unidades/Caddy idénticos; producción conserva imagen, contenedor, PID y estados de servicios. Sin cambios locales `.env`, configuración versionada, dependencias, base de datos o migraciones.
- Push posterior activó Vercel **Preview Ready**, ID `ZNjEMFhEsHBGaH5TJA1q2famBCzg`, fuente `33de07a`, duración 41 s, 2026-09-30 17:42:42 GMT-4. Dominio [QA](https://qa.booking.kortek.cloud/), [Preview inmutable](https://kortek-booking-oarm7g20r-fraylindev.vercel.app/), [detalle](https://vercel.com/fraylindev/kortek-booking/ZNjEMFhEsHBGaH5TJA1q2famBCzg). Producción web permanece en `fe4b117`, deployment `2KmQn7pSAaHc4EbuAu37WrnVuYvm`.
- Smoke HTTPS externo API exit 0: raíz 404; GET /bookings sin token 401; GET /public/qa-horario-norte/booking-data 200; OPTIONS 204. ACAO exacto `https://qa.booking.kortek.cloud`; origen ajeno sin ACAO. UUID del GET privado `c0ecb9d0-4f1b-435d-823c-a1506850af08`, público `6d300e60-6a43-44f3-a8e1-592a6cfc9860`; exposición `X-Total-Count,X-Page,X-Limit,X-Total-Pages,X-Request-Id`. Navegador abrió el dominio QA y mostró la landing. Chrome bloqueó la interacción posterior de esa pestaña porque otra extensión tenía su UI abierta; no se acredita un flujo autenticado remoto.
- Evidencia operativa sin secretos: `.tmp/f0b/external-smoke.json`, scripts de build/despliegue y `/home/opc/kortek-api-staging/f0b-deployment.json`. Este resultado y los controles se publican en un commit documental posterior dentro de la autorización F0-B; no cambia el código de la imagen/Preview verificados. El único cambio local que se conserva deliberadamente es `docs/quality/CORRECTIVO_F0A.md`.

## Validación pendiente del propietario en QA

1. Con una reserva cuyo fin programado ya pasó: confirmar → completar → emitir factura. Volver a Reservas mediante navegación normal: debe decir «Pendiente de cobro», ofrecer «Ver facturación» y retirar «Emitir factura», sin recargar. Completar antes del fin sigue permitido, pero emisión/cobro conservan su guard temporal vigente.
2. Cobrar esa factura una sola vez en Facturación y volver a Reservas: «Factura pagada», sin nueva emisión. La reserva conserva COMPLETED. Verificar una sola factura y un solo pago; incluir una reserva/factura anterior que ya estaba pagada.
3. Dejar el panel abierto, pasar a otra pestaña y regresar después de varios minutos. Abrir Reservas/Facturación: no debe pedir restablecer acceso ni recargar por una renovación ordinaria. Abrir un formulario sin enviar, desconectar brevemente la red y reconectar: debe conservar el borrador y recuperar lecturas automáticamente. Ante resultado incierto de emisión/cobro, comprobar primero el registro recuperado; no duplicar la operación.
4. En Safari iPhone 11: pendiente muestra Confirmar + tres puntos; confirmada muestra Completar + tres puntos. Acciones secundarias disponibles según permisos, menú desplazable/usable sin saturación ni cortes. En escritorio comprobar Tab, flechas, End y Escape/retorno de foco.
5. Cambiar de negocio/cuenta/rol: no arrastrar reservas, facturas ni borradores del contexto anterior. Profesional ve únicamente su agenda/facturas actuales; F0-B no añade cancelar/reprogramar ni permisos nuevos. Una sesión realmente revocada debe retirar acceso, sin bucle infinito de renovación.

Gate 5 integrado con Clerk real/Safari y aprobación final del propietario siguen abiertos. F0-B no declara resueltos el zoom móvil de F0-A, el selector/formato/restablecer de fechas, la validación/posesión de contactos, el registro B2C con Clerk ni la ampliación de permisos propuesta; requieren su alcance separado.
