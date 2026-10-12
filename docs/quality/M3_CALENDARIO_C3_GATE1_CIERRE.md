# M3 C3 — gate 1: integración local web C2 contra API C1 real

Fecha2026-10-11. **IMPLEMENTADO / VALIDADO LOCALMENTE / EN REVISIÓN DEL PROPIETARIO.** Autorización exclusiva del gate1 y de un SHA local. Base9225ce8; sin push, QA, producción, proveedores, bases reales ni gates2–6. No declara cierre de C3/M3.

## 1. Objetivo, privacidad y alcance

Probar que OWNER/ADMIN/RECEPTIONIST pueden consultar y reagendar con el contrato C1 desde los componentes C2; BARBER solo lee su agenda. Datos e identidades reservados y sintéticos en un PostgreSQL18.1 nuevo con UUID, bind127.0.0.1,28 migraciones intactas, migrator/runtime separados y gate de permisos. API completo: dist/main.js, bootstrap y AppModule reales, sin overrides de controllers, Guards, servicios, Prisma ni presupuestos. Build API fresco exit0 antes del ensayo final. Proveedores deshabilitados y bloqueados por el guard de red; dotenv prohibido.

Web: Chrome real headless, CalendarScreen/CalendarDetail, cliente HTTP, React Query y CSS entregados en C2. Bundle local standalone; solo se sustituye el contexto de identidad porque Clerk/proveedores están fuera de autorización. JWT local firmado y Membership/roles revalidados por B2bAuthGuard real. **No prueba el AuthProvider Clerk ni la ruta completa de Next en ejecución**; build Next sí pasó. No hay datos o estados HTTP fabricados para el API. Dos casos pausan una respuesta real obtenida mediante route.fetch(), sin alterar su cuerpo/status, para probar respuestas tardías. El resto continúa directamente al API.

Sesiones nunca se guardan crudas: solicitudes registran SHA-256 del JWT, tenant y revisión, y hash/longitud del cursor; updatedAt e instante ISO corresponden a fixtures. No se persisten Authorization headers completos, valores de claves, contacto, notas ni datos financieros. La respuesta mínima real se comprobó antes de proyectar la traza.

## 2. Ejecución y evidencia real

Runner reproducible: node apps/api/test/m3-c3-gate1-run.cjs. [Run final](evidence/m3-calendario-c3-gate1/postgres/0beee6446732469fb684f65d4dd34009/run.json), [resultados](evidence/m3-calendario-c3-gate1/postgres/0beee6446732469fb684f65d4dd34009/integration.json), [138 solicitudes reales y respuestas](evidence/m3-calendario-c3-gate1/postgres/0beee6446732469fb684f65d4dd34009/requests.json), [fuentes y build](evidence/m3-calendario-c3-gate1/source-manifest.json), [checks](evidence/m3-calendario-c3-gate1/checks/run.json).

**13 escenarios pasados,0 fallidos, exit0.** API/browser/servidor local cerrados; PostgreSQL detenido y directorio propio eliminado, cleanup:true. Se conserva únicamente el run final. [Resumen transparente de intentos previos](evidence/m3-calendario-c3-gate1/attempts-summary.json); logs de esos intentos archivados fuera del repo. No reintentos automáticos, omisiones ni aserciones relajadas.

| Escenario | Resultado real |
|---|---|
| Flujo375/1440 | Guardado HTTP200 persistido; mismo profesional/servicio/estado;1 evento por ganador |
| Tokens/slots/caché | expectedUpdatedAt/expectedRevision copiados literalmente de GET slots; instante ISO recibido;fechas2→3→2 con solo2 GET slots; mismo instante deshabilitado |
| ADMIN/RECEPTIONIST/BARBER | Operadores cargan días/slots; BARBER sin catálogo/selector y disponibilidad/comando HTTP403 |
| Cursor | Primera página100, segunda6,106 IDs únicos; cursor recibido devuelto literal |
| Cursor409 | Otro operador cambia una reserva por HTTP real; segunda página409, datos previos ocultos; recarga sin cursor |
| Comando409 | Otro operador gana; comando con revisión vieja409, origen ganador intacto,0 eventos del perdedor |
| Disponibilidad429 |30 lecturas HTTP200 y31.ª429 real; no-store/Retry-After; botón bloqueado,0 retries automáticos |
| A→B→A/404/401/400 | Solicitudes tenant distintas y nuevas visitas;404 ajeno=404 ausente; anónimo401; DTO incompleto400 sin evento |
| Día/semana/filtros | Rangos, estado y profesional enviados al API real; vacío y recuperación |
| Lectura/escritura tardía | Respuesta real A diferida; no restaura datos ni éxito en B; vueltaA inicia otra visita; escritura ya persistida no se presenta como cancelada |
|503 real | SELECT Booking revocado solo al runtime desechable; API503 y UI útil; GRANT restaurado en finally |

La telemetría del API registra139 solicitudes:138 de la traza más el401 de readiness; los estados coinciden al excluir ese probe. [Contraste servidor/traza](evidence/m3-calendario-c3-gate1/verification.json). Estados observados: HTTP200=128,400=1,401=1,403=2,404=2,409=2,429=1,503=1. No screenshots de datos reales. Capturas revisadas: [selector móvil375](evidence/m3-calendario-c3-gate1/postgres/0beee6446732469fb684f65d4dd34009/browser/selector-375.png), [agenda escritorio1440](evidence/m3-calendario-c3-gate1/postgres/0beee6446732469fb684f65d4dd34009/browser/flow-1440.png). Ambos sin overflow horizontal; el modal móvil se desplaza para llegar a confirmar. Consola sin errores/warnings de producto; errores HTTP esperados se registran por separado.

## 3. Checks y límites

Runner node apps/web/scripts/m3-c3-gate1-validation.mjs, entorno sintético acotado sin dotenv y bloqueo de red externa. API tipos/lint/build y13 unitarias del contrato; web type-check:clean/lint/test/build--webpack: todos exit0. Web conserva168 unitarias Node+135 componentes; no se instala ni cambia dependencia. Fuentes productivas API/web idénticas a9225ce8; solo arneses, documentación, evidencia y gate de exclusión. La suite completa API920 pertenece al correctivo anterior: no se vuelve a contabilizar como ejecución nueva.

**Hallazgo de integración:** el API real envía Retry-After pero su CORS no lo incluye en exposedHeaders. El cliente no puede leerlo y usa fallback conservador60s, sin retries automáticos. Backend preservado por el alcance exclusivo del gate1. Antes de publicar, decidir/autorización propia para el correctivo mínimo de CORS y probar lectura del header en navegador. No se afirma que el header fue consumido por la web.

Clerk real, MFA/sesiones de proveedor, Next servido con su AuthProvider, QA, Safari/dispositivo físico, varios hosts y worker/envío/entrega no están probados ni autorizados. Tipografía del layout Next no se valida con el bundle standalone. Los gates2–6 requieren permisos propios.

## 4. Exclusión de las15 imágenes OCR

Se retiraron15 archivos del árbol candidato; se marcaron referencias históricas como evidencia excluida. Los blobs/paths prohibidos están en [manifiesto](M3_OCR_PUBLICACION_EXCLUSIONES.json). Gate portátil: node apps/api/test/m3-ocr-publication-gate.cjs REF; obligatorio antes de publicar cualquier ref. Detecta ruta y contenido renombrado. El workflow quality existente lo exige para sus candidatos. [Positivo y negativo](evidence/m3-calendario-c3-gate1/ocr-exclusion-gate.json): worktree sin coincidencias exit0; da77c88 con15 coincidencias rechazado exit1 esperado. Después del checkpoint se comprobará HEAD.

No se eliminan ni reescriben SHAs previos ni el historial remoto ya publicado. No confundir exclusión del árbol publicable con borrado histórico. Toda rama futura debe pasar el gate; una rama antigua que conserve esas imágenes no es publicable. Archivo privado de recuperación fuera del repo, excluido de los paquetes subibles. Los47 candidatos continúan clasificados;15 mantienen naturaleza no determinada y quedan excluidos.

## 5. Líneas892/896 de BACKEND_CHANGES.md

Fuente da77c88, numeración del informe. [Metadatos sin valores](evidence/m3-calendario-c3-gate1/contract-example-lines.json).

```text
892: { "email": "[longitud6; letras ASCII a-z minúsculas]", "password": "[longitud6; letras ASCII a-z minúsculas]", "organizationId": "[longitud4; letras ASCII a-z minúsculas]" }
896: { "email": "[longitud6; letras ASCII a-z minúsculas]", "password": "[longitud6; letras ASCII a-z minúsculas]" }
```

Todos son marcadores de tipo de ejemplos register/login, no valores operativos ni credenciales de entorno. Historial remoto exacto ya contrastado en el correctivo; no se accedió a QA/producción para este gate.

## 6. Checkpoint y siguientes gates

Un checkpoint local autorizado sobre9225ce8, SHA en entrega. Sin push, main, historial reescrito, cambios de entorno remoto o bases reales. Gate1 queda para revisión, no aprobación automática. No iniciar gate2/preflight QA ni providers por inferencia; resolver el hallazgo CORS bajo autorización propia y validar integración Next/AuthProvider en un gate compatible con las restricciones del propietario.
