# Concurrencia HTTP del E2E en CI — 2026-10-08

**IMPLEMENTADO / VALIDADO LOCALMENTE / EN REVISIÓN.** Base ad03216a3b5e0c9aad377972fa1ee42239c61aa8, rama ai/reserva-invitado-ci. Gate exclusivo de infraestructura de pruebas y CI. [PR 4](https://github.com/Fraylindev/BabrberFlow-OS/pull/4), [run fallido 57](https://github.com/Fraylindev/BabrberFlow-OS/actions/runs/37738551891). Sin cambios de producto, contratos, migraciones, guardia SQL, matriz de privilegios, flags o dependencias. No se realizó acceso remoto en este gate.

## Causa y certeza

Las aplicaciones originales solo hacían app.init(). Supertest 7.2.2 (lib/test.js, serverAddress/end) encuentra un servidor sin escuchar y el primer objeto Test ejecuta listen(0), guarda ese servidor como propio y lo cierra al completar su respuesta. Las solicitudes siguientes del mismo lote comparten el puerto ya abierto; no se abre un puerto por cada solicitud concurrente. El cierre puede ocurrir mientras otras solicitudes siguen pendientes. Las solicitudes secuenciales vuelven a abrir y cerrar servidores.

Superagent 10.3.0 (lib/node/index.js) inicializa _agent=false y lo pasa a http.request. Las solicitudes originales evitan el agente global de Node. Por ello, la hipótesis de conexiones keep-alive antiguas del agente global no queda respaldada. Forzar keep-alive en la sonda tampoco produjo resets en Windows.

El defecto de ciclo de vida es comprobado por código y sonda: 80 escenarios de 35/80 solicitudes, dos servidores, agentes por defecto/keep-alive y respuestas con demoras distintas produjeron 80 cierres antes de terminar todos los hermanos en las variantes automáticas, cero en las preescuchadas y cero errores de transporte. La causa del ECONNRESET remoto es **probable, certeza media**, no una reproducción nativa. [Node 22.23.3](https://github.com/nodejs/node/blob/v22.23.3/lib/_http_server.js) cierra conexiones inactivas y deja de aceptar conexiones al cerrar el servidor. La aceptación y planificación pueden variar entre Windows/Node 22.22.3 y Ubuntu 24.04.5/Node 22.23.3 del runner. No existe traza remota de sockets para atribuir cada reset.

El beforeEach original ya borraba SecurityRateBucket. El problema es que Promise.all rechaza al primer error sin esperar las solicitudes hermanas: sus escrituras pueden llegar después de la limpieza y reconstruir el presupuesto de la prueba anterior. El 429 sucede antes de alterar Date.now en la prueba de relojes; el presupuesto utiliza NOW de PostgreSQL. La contaminación es una explicación de **certeza alta**, aunque el log remoto no captura las escrituras pendientes.

Una sonda con PostgreSQL real, dos aplicaciones y un reset deliberadamente inyectado demuestra el mecanismo: Promise.all + limpieza temprana deja 79 consumos y la siguiente solicitud devuelve 429; esperar allSettled antes de limpiar deja cero registros y devuelve 200. Esto valida la cascada, **no reproduce espontáneamente el reset del runner**.

## Cambio aplicado

- Las dos suites abren cada instancia una sola vez con app.listen(0, '127.0.0.1'): puerto asignado por el sistema y estable durante la vida de esa instancia. Agente explícito keepAlive=false/maxSockets=Infinity para las rutas concurrentes.
- Los lotes de 35 y 80 usan allSettled, esperan todos los hermanos y después propagan el error original. Se añade limpieza afterEach en finally; beforeEach permanece. Cierre de agentes, aplicaciones y clientes al terminar.
- Todas las aserciones expect originales permanecen idénticas: 30 admitidas, 5/50 bloqueadas y Retry-After entre 1 y 60. Sin reintentos, timeouts ni omisiones nuevos en las pruebas.
- Browser smoke prepara Chrome y sus bibliotecas con playwright install --with-deps chrome antes de ejecutar las pruebas. Ambos proyectos existentes seleccionan channel: chrome. El comando usa la versión instalada y no modifica manifiestos ni lockfile.

## Revisión de pasos posteriores

Después del E2E queda Browser smoke; solo siguen los hooks de limpieza de Actions. No hay otro paso funcional oculto.

| Aspecto | Evidencia y resultado |
|---|---|
| Navegador y bibliotecas | No existía preparación explícita; dependía de Chrome del runner. No se afirma que faltara en la imagen fallida. Se hace explícita mediante el [CLI oficial de Playwright](https://playwright.dev/docs/browsers#google-chrome--microsoft-edge). La instalación con dependencias requiere permisos del runner Ubuntu; solo dry-run local. |
| Rutas y mayúsculas | Imports inspeccionados de specs y fixture coinciden; forceConsistentCasingInFileNames está activo. Builds y tipos del run fallido ya pasaban. Sin problema encontrado en esta revisión estática. |
| Shell y finales de línea | quality.yml utiliza Bash/comandos pnpm compatibles con Linux; no invoca PowerShell ni rutas Windows para browser. La preparación SQL anterior pasó en el run fallido. |
| Fuentes | El build original con fuentes había pasado. Browser consume los assets de ese build; no se añaden mocks ni flags de fuentes. |
| Permisos | Scripts se ejecutan mediante Node/pnpm; artefactos se escriben en el checkout. Sin dependencia nueva de chmod. |
| Puertos | Web escucha en loopback 3011, sin reutilizar servidor externo en CI. API asigna un puerto distinto por instancia y lo mantiene hasta el cierre. Sin conflicto identificado con PostgreSQL. |

## Validación local y límites

Entorno Windows, Node 22.22.3, PostgreSQL 18.1. Cuatro clústeres propios nuevos en loopback, rol kortek_ci_runner con permisos del CI y migraciones aplicadas por el global setup existente. Variables de workflow y JWT efímera enmascarada; ninguna variable de aplicación heredada. El preloader existente impide leer dotenv del checkout. Todas las bases/clústeres propios se detuvieron y eliminaron.

| Ejecución | Resultado |
|---|---|
| Baseline original, suites afectadas | 2 suites, 25 pasan, exit 0; ECONNRESET no reproducido |
| Correctivo, suites afectadas, cinco repeticiones | 125 pruebas pasan, cero fallas/omisiones, cinco exits 0 |
| API E2E completo | 20 suites pasan, 1 omitida; 272 pruebas pasan, 1 omitida preexistente, cero fallas; exit 0 |
| Tipos y lint API | Exit 0 |
| Chrome install --with-deps chrome --dry-run | Exit 0; no instala navegador ni bibliotecas locales |
| Sonda de transporte | 80 escenarios, cero resets, 80 cierres tempranos en variantes originales; exit 0 |
| Sonda de contaminación con reset inyectado | 79/429 frente a vacío/200; exit 0 |
| Aserciones y opciones de solicitudes | Comparación con ad03216: expect idénticos, sin retry/timeout nuevos |

El comando local del arnés ejecuta el paso E2E del workflow con la selección indicada; omite el CLI de integridad, que ya pasó en el run remoto y no se modifica aquí. No se reivindica repetir todas las etapas previas del pipeline.

No se puede probar aquí Linux, el runner GitHub ni PG16. Tampoco se ejecutó Browser smoke local en este gate: la validación nueva es del comando dry-run y la revisión estática. La confirmación efectiva del CI corresponde a la nueva ejecución del PR tras el push autorizado. No acredita QA funcional, login, proveedores ni producción.

## Evidencia y publicación

[Evidencia revisable](evidence/ci-http-concurrency/): extracto remoto limitado, logs locales con secretos y rutas del operador omitidos, reportes de exits/cleanup, sonda HTTP y contaminación, y fuentes del arnés como texto. Los timeouts de la sonda diagnóstica no se incorporaron a las suites.

Publicación autorizada: un commit y push exclusivo a ai/reserva-invitado-ci, sin force; PR 4 existente. Las ramas ai/antigravity-qa y main se verifican sin cambio antes/después. El SHA final y el estado remoto se entregan al propietario; no se infiere aprobación funcional.
