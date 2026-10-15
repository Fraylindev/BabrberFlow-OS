# Correctivo CORS Retry-After — M3, gate propio

Fecha: 2026-10-13, America/Santo_Domingo. **IMPLEMENTADO LOCALMENTE / VALIDADO LOCALMENTE / EN REVISIÓN; SIN PUBLICACIÓN.** No cierra C3/M3 ni autoriza otro gate.

## 1. Base, autorización y aislamiento

- Worktree: `<workspace>`.
- Rama: `codex/m3-cors-retry-after-20261014`; HEAD inicial y final verificado: `2896d249942c13a11eb161ff481ba54f8f69eae0`.
- `git fetch origin ai/antigravity-qa` y `git ls-remote --heads origin ai/antigravity-qa`: exit 0, remoto exactamente en ese SHA antes de crear el worktree. El primer intento sandbox falló por FETCH_HEAD/red; el reintento autorizado fuera del sandbox pasó. No se cambió ninguna ACL.
- `git worktree add -b codex/m3-cors-retry-after-20261014 <ruta nueva> 2896d249942c13a11eb161ff481ba54f8f69eae0`: exit 0; rama/HEAD comprobados y `git status --short` vacío al comenzar. La autorización específica sustituye la rama habitual solo para este gate.
- Se preservan los otros dos checkouts. El principal comienza en ai/reserva-invitado-ci/de3a062 con únicamente el Playbook ajeno sin seguimiento. Ningún archivo del principal o del worktree M3 se escribe, limpia, elimina ni desplaza por esta tarea. El estado interno de M3 no se inspecciona después del Permission denied del precheck; no se afirma cotejo de su contenido. Las referencias compartidas pueden leerse sin abrirlo.
- No hay commit, staging, push, despliegue, migraciones, variables persistentes, flags, worker, Vercel, QA remoto, proveedores o bases reales. Producción queda intacta por ausencia de operaciones; su cierre es condición de la orden, sin verificación viva nueva.

Fuentes: [gates](DELIVERY_GATES.md), [decisiones](DECISIONES_PROPIETARIO_2026_09_29.md), [C0](M3_CALENDARIO_C0.md), [C1](M3_CALENDARIO_C1_CIERRE.md), [C2](M3_CALENDARIO_C2_CIERRE.md), [C3 local](M3_CALENDARIO_C3_GATE1_CIERRE.md), [gate4 publicado](M3_GATE4_CIERRE.md), AGENTS raíz/API/web, estándares de producto/UI/seguridad, estado y código real. Skills kortek-delivery y kortek-product-ui. La autorización posterior fija conservar los cinco headers expuestos y añadir exclusivamente Retry-After.

## 2. Auditoría de emisión, antes del cambio

`CalendarBudgetGuard` emite `Retry-After = timeToBlockExpire` antes del 429. `CalendarController` aplica ese guard a las cinco rutas: calendario/detalle usan read, días/slots availability y `PATCH /bookings/:id/reschedule` write. `PostgresThrottlerStorage` calcula el restante en segundos con el reloj SQL. Se verifica metadata de cada handler, presupuestos intactos y header 17 con almacenamiento sintético bloqueado; no se ejecuta SQL.

El código instalado y fijado por el lock de `@nestjs/throttler` 6.5.0 emite `Retry-After` para `default` cuando isBlocked, salvo setHeaders=false; los controladores no desactivan esa opción. Auth legacy, bootstrap/onboarding/invitaciones, reserva pública, CMS y medios usan ese guard con default. Una prueba HTTP ejecuta el guard estándar real con almacenamiento controlado y recibe 429/header17. La prueba valida el mecanismo común; no se fuerza individualmente cada ruta productiva.

**Excepción documentada antes de implementar:** `TeamInvitationsService` traduce el 429 externo de Clerk a HttpException con `retryAfterSeconds` en JSON, sin emitir Retry-After HTTP. Es un límite del proveedor distinto del guard local. Se conserva su compatibilidad JSON; no se cambia esa emisión ni se afirma que todos los 429 externos lleven el header. No se modifican límites, guardias o storage.

## 3. Causa raíz y resultado de producto

El API exponía X-Total-Count, X-Page, X-Limit, X-Total-Pages y X-Request-Id, pero omitía Retry-After en CORS. Un navegador cross-origin no podía leer su restante; M3 recurría a 60 s. El cliente ya analizaba el header, pero aceptaba decimales/fechas no HTTP y no limitaba la espera.

Usuario: personal interno con permisos M3 vigentes. Resultado: contador y acción de reintento respetan el restante disponible, sin repetir automáticamente una escritura. No cambia rol, tenant, identidad, datos visibles, idioma, textos, selector ni presentación móvil/desktop. No añade PII o secretos a logs.

## 4. Cambios

1. Configuración CORS extraída a `apps/api/src/common/cors.config.ts` y utilizada por bootstrap, para probar exactamente el middleware de producción. Único cambio funcional: añadir Retry-After al final de los cinco headers existentes. La lista de orígenes, su fallback local, credentials=true y los defaults de métodos/headers de solicitud se conservan. No se usa wildcard ni se añade otra cabecera.
2. `apps/web/lib/api.ts`: segundos enteros no negativos o fecha HTTP válida (IMF-fixdate, RFC850 y asctime en GMT), redondeo hacia arriba del restante, fecha pasada → 0, tope 300 s para el header. Rechaza decimales, negativos, valores no finitos, fechas imposibles y día de semana incoherente. El tope protege el contador; no modifica el bloqueo del servidor. Un nuevo 429 sigue siendo autoritativo.
3. Se mantiene el fallback existente M3 `retryAfterSeconds ?? 60` en CalendarFailure/CalendarDetail, sin editar esos componentes. La compatibilidad anterior con el restante JSON de invitaciones se mantiene cuando no hay header válido; ese valor JSON no es el objeto de este tope. Header válido tiene prioridad, incluido cero.
4. Pruebas de middleware real, emisión M3/default, cliente y componente con transporte sintético. Se sincronizan entrada documental, PROJECT_MASTER, CHANGELOG y BACKEND_CHANGES con este informe.

## 5. Evidencia antes/después

Directorio: [evidence/cors-retry-after](evidence/cors-retry-after/).

- [api-before.log](evidence/cors-retry-after/api-before.log): comando `pnpm --config.verify-deps-before-run=false --filter api test -- --runInBand common/cors.config.spec.ts`, exit 1; falta Retry-After en Access-Control-Expose-Headers, 1 fallida/3 aprobadas. Las negativas de origen y preflight ya pasaban antes.
- [web-before.log](evidence/cors-retry-after/web-before.log): `node --test apps/web/lib/api.test.ts`, exit 1; 14 aprobadas/2 fallidas: 900 en lugar de 300 y un valor inválido interpretado como 0 en lugar de mantener fallback60. Los casos ausente y texto inválido previo permanecen cubiertos.
- [api-targeted.log](evidence/cors-retry-after/api-targeted.log): 10 aprobadas después: cinco casos CORS/guard estándar y cinco handlers M3 con presupuesto/header intactos. Origen ajeno sin Access-Control-Allow-Origin tanto en GET como OPTIONS; la presencia de otros headers CORS no le concede lectura al navegador.
- [web-after.log](evidence/cors-retry-after/web-after.log): 16 aprobadas; enteros, cero, tope, tres formatos HTTP, fecha pasada, negativos/decimales/fecha inválida/overflow, fallback y una sola escritura.
- [web-targeted.log](evidence/cors-retry-after/web-targeted.log): 6 aprobadas; componente CalendarFailure a través del cliente HTTP real, contador 17/300/60, botón deshabilitado y luego habilitado, sin reenvío automático. Textos aprobados intactos.
- [browser.json](evidence/cors-retry-after/browser.json): Chrome real headless, 6/6 escenarios localhost: cliente HTTP real empaquetado, función CORS de producción y respuestas429 sintéticas. Header17 legible, tope300, fallback60 y origen distinto bloqueado por navegador. Sin Clerk ni base; servidores y navegador cerrados. `node docs/quality/evidence/cors-retry-after/browser.cjs`: exit0.

Runner [validate.cjs](evidence/cors-retry-after/validate.cjs): entorno filtrado, valores exclusivamente sintéticos en procesos hijos, lectura .env bloqueada, sin credenciales reales ni conexión PostgreSQL. URL sintética de carga a loopback/puerto1, con integraciones opt-in deshabilitadas. No configura entornos persistentes ni despliega.

Se copiaron dependencias disponibles al worktree, sin instalación: package.json y pnpm-lock.yaml idénticos a la base. La copia inicial detectó enlaces relativos; se resolvieron dentro del worktree. Se verifican cero enlaces hacia fuera y se adaptan 84 lanzadores copiados con NODE_PATH absoluto. No se escriben dependencias del principal. Las comprobaciones finales se repiten tras ese ajuste. No se prueba instalación limpia/CI en este gate.

Fallos intermedios conservados: [api-lint-initial.log](evidence/cors-retry-after/api-lint-initial.log), referencia de método no ligado en la prueba nueva, resuelta obteniendo metadata mediante descriptor sin alterar el handler; [api-test-initial.log](evidence/cors-retry-after/api-test-initial.log), carga de cliente Prisma de una suite omitida sin URL, resuelta en el runner con URL sintética. Una edición intermedia de la aserción nueva dejó una referencia sin importación: logs api-targeted-intermediate.log/api-type-check-intermediate.log/api-test-intermediate.log; se corrige a comprobar status429 y todas las validaciones API posteriores pasan. No se relajan aserciones, no se añaden retries/skips, ni se cambia código de las integraciones.

Comprobaciones finales, tras corregir pruebas y aislamiento: [checks.json](evidence/cors-retry-after/checks.json). Cada comando termina en exit 0.

| Comando | Exit |
| --- | --- |
| `pnpm --config.verify-deps-before-run=false --filter api test --runInBand common/cors.config.spec.ts bookings/calendar-budget.guard.spec.ts` | 0 |
| `pnpm --config.verify-deps-before-run=false --filter api type-check` | 0 |
| `pnpm --config.verify-deps-before-run=false --filter api lint` | 0 |
| `pnpm --config.verify-deps-before-run=false --filter api test --runInBand` | 0 |
| `pnpm --config.verify-deps-before-run=false --filter api build` | 0 |
| `pnpm --config.verify-deps-before-run=false --filter web exec vitest run components/calendar/CalendarFailure.test.tsx` | 0 |
| `pnpm --config.verify-deps-before-run=false --filter web type-check:clean` | 0 |
| `pnpm --config.verify-deps-before-run=false --filter web lint` | 0 |
| `pnpm --config.verify-deps-before-run=false --filter web test` | 0 |
| `pnpm --config.verify-deps-before-run=false --filter web build --webpack` | 0 |

API: 859 aprobadas, 0 fallidas, 71 omitidas preexistentes (7 suites PostgreSQL opt-in); web: 170 de lógica y 144 de componentes, 0 fallidas/omitidas. Build API Nest y build web Next con Webpack exit 0. Variante Turbopack e instalación limpia/CI no probadas. git diff --check, staging vacío y diff fuera del alcance (Prisma/ops/dependencias) exit 0. No se ejecutan migraciones para ampliar esta cobertura.

## 6. Riesgos y límites no verificados

- QA remota y dispositivos físicos no probados; imagen API QA 56e2e12 según orden y cierre publicado, sin inspección viva aquí. El correctivo todavía no está publicado ni instalado allí.
- Suite PostgreSQL opt-in y E2E de base no ejecutadas: 71 casos omitidos preexistentes en la suite estándar. No se crea base ni se ejecuta migración. Emisión de M3 probada con storage controlado; no sustituye los ensayos PostgreSQL históricos C1/C3.
- Chrome prueba CORS/cliente con transporte local controlado; no representa QA autenticado completo, responsive físico, correo, worker ni proveedores.
- La fecha HTTP depende del reloj del navegador; se redondea hacia arriba y limita a cinco minutos. El límite real siempre lo aplica el servidor. JSON de proveedor conserva su comportamiento anterior.
- CORS es un permiso de lectura del navegador, no sustituye autenticación/autorización. Se preservan todos los guardias/tenants. El único header recién legible es un restante sin datos personales.
- No hay aprobación final del propietario por pasar checks; estado implementado/validado localmente/en revisión al concluir.

## 7. Plan para un gate posterior de despliegue

**NO AUTORIZADO AQUÍ.** Requiere orden expresa con la frase literal **AUTORIZO DESPLIEGUE A QA**, aprobación del correctivo y autorización independiente para su publicación. Esa frase en este plan no concede permiso.

1. Revisar diff y evidencia final, aprobar backend y consumidor web, definir un SHA publicado exacto y verificar el remoto. Este worktree local con cambios no puede usarse como release sin revisión/publicación separada.
2. Comprobar en lectura el API QA actualmente atribuido a 56e2e12 y la web correspondiente; capturar pareja e imágenes/artefactos de rollback. Delimitar despliegue solo API/web QA, sin worker, migraciones, flags, variables, límites o producción.
3. Construir artefactos API/web del mismo SHA aprobado. Actualizar API QA primero; consumidor anterior sigue funcionando con los headers preexistentes. Promover web después solo conforme al alcance literal del gate futuro.
4. Desde el origen QA permitido, comprobar CORS/preflight y un 429 controlado autorizado de reprogramación/lectura: Retry-After recibido y legible, cuenta regresiva correspondiente, ausencia/valor inválido→fallback60 mediante ensayo controlado. Verificar origen ajeno sin ACAO y navegador bloqueado; paginación/códigos de soporte intactos. No provocar límites en negocios reales por inferencia.
5. Observar errores y aislamiento QA/producción, registrar imagen/SHA y git status. Revertir únicamente artefactos QA si falla el gate; restaurar pareja anterior según plan aprobado, sin cambios de datos ni worker. No cerrar M3/C3 sin aprobación propia.

## 8. Estado final de Git

Rama/HEAD indicados verificados; staging vacío. Status final (7 rutas modificadas, 6 entradas sin seguimiento):

```text
 M BACKEND_CHANGES.md
 M CHANGELOG.md
 M PROJECT_MASTER.md
 M apps/api/src/main.ts
 M apps/web/lib/api.test.ts
 M apps/web/lib/api.ts
 M docs/README.md
?? apps/api/src/bookings/calendar-budget.guard.spec.ts
?? apps/api/src/common/cors.config.spec.ts
?? apps/api/src/common/cors.config.ts
?? apps/web/components/calendar/CalendarFailure.test.tsx
?? docs/quality/CORRECTIVO_CORS_RETRY_AFTER.md
?? docs/quality/evidence/cors-retry-after/
```

Principal: ai/reserva-invitado-ci/de3a062aba70157da5fbf1b569a73aecb0d04087, únicamente Playbook ajeno sin seguimiento, igual al inicio. Ref ai/antigravity-qa del worktree M3: 2896d249942c13a11eb161ff481ba54f8f69eae0 intacta. Ambos checkouts preservados por esta tarea; no se certifica el contenido inaccesible de M3. Git compartido solo recibió fetch y alta del nuevo worktree/rama autorizados. Todos los cambios de este correctivo permanecen locales, sin staging ni commit, sobre el HEAD indicado. Playbook ajeno fuera de este árbol y preservado.

## 9. Publicación autorizada — 2026-10-14

El propietario aprueba explícitamente backend y web para un commit en codex/m3-cors-retry-after-20261014 y push fast-forward únicamente a ai/antigravity-qa. Autoriza solo el despliegue automático web QA causado por ese push; no concede despliegue API ni cambios de runtime, configuración, worker, flags, variables, migraciones o producción. No se prueba 429 remoto: API QA sigue atribuido a 56e2e12. Esta orden sustituye solo las prohibiciones de commit/push/web automático del gate local descrito arriba; los demás límites permanecen.

Prechecks: exactamente las 13 entradas del cierre; CORS conserva orígenes, credentials=true y defaults, añadiendo únicamente Retry-After. Saneamiento de 12 archivos: rutas personales en informe/logs y dos correos históricos en CHANGELOG reemplazados por marcadores. Runner usa valores sintéticos efímeros generados en memoria y sanea rutas al guardar logs; no conserva valores de claves. Auditoría posterior sin coincidencias en documentos/evidencia. No se modifica producto ni evidencia de resultados para aparentar éxito.

Rollback web previo verificado por API Vercel antes del push: dpl_9TaR7KkHSkuP8mFygNRtpXSwfPzP, READY, SHA 2896d249942c13a11eb161ff481ba54f8f69eae0, URL kortek-booking-9utvt65pk-fraylindev.vercel.app, alias qa.booking.kortek.cloud. Si hiciera falta, un gate autorizado reasignaría únicamente ese alias QA a ese deployment existente y verificaría TLS y GET / y /login. No promover a producción, no reconstruir ni alterar variables/API.

Resultados del push, Quality y nuevo deployment se informarán después de publicar; no son verificables desde el propio commit antes de su ejecución. Los apartados de estado Git/local anteriores son evidencia fechada previa al commit, no estado posterior a la publicación.

Comprobación previa al commit autorizada para el informe de cada checkout: git status sin locks opcionales confirma M3 limpio en 2896d24; principal con únicamente Playbook sin seguimiento. La comprobación anterior de M3 no verificado queda superada por esta lectura, sin cambiar ningún archivo allí. Prueba CORS del runner saneado: 10/10, exit0. Archivos de producto iguales a la entrega aprobada.
