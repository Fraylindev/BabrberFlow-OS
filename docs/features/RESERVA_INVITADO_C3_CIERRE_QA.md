# Reserva invitada — cierre documental de C3 en QA

Seguimiento posterior del pendiente 1, 2026-10-08: [secret key actualizada en API QA, hashes y verificaciones](../quality/CLERK_ROTACION_API_QA_2026_10_08.md). Worker intacto; publishable key sin cambio. Alias web sigue en el deployment anterior READY/b318ca5; nuevo deployment de rollback no confirmado. La lista inferior conserva el estado y alcance del cierre documental original, sin ampliar su declaración C3.

Fecha: 2026-10-08. Gate único documental sobre `b318ca591d1ca6681269a6d25e29ca106d824df9`, con árbol inicial limpio en `ai/reserva-invitado-ci`.

## Declaración y alcance de la aceptación

**C3: ACEPTADO POR DECLARACIÓN DEL PROPIETARIO, sin evidencia capturada.** El propietario declara el 2026-10-08 que realizó en su iPhone las pruebas manuales de C3 sobre `qa.booking.kortek.cloud` con el candidato `b318ca5` y que el resultado fue satisfactorio. No hay capturas ni evidencia automática de esas pruebas. No aportó detalle adicional ni enumeración de casos: no se atribuyen casos, navegador, modelo de iPhone, versión, roles, mediciones ni resultados individuales.

No están verificados por este cierre: otros dispositivos/navegadores, correo real, WhatsApp real y concurrencia. Tampoco se convierte la declaración en evidencia automática, cobertura completa de la matriz C3 o nueva auditoría técnica. La aceptación documental procede exclusivamente de la decisión explícita del propietario.

Las reservas hechas en C3 quedan como filas residuales en QA, sin limpieza. La limpieza transaccional quedó fuera de alcance por decisión del propietario. No se inventan IDs, conteos ni relaciones afectadas; no se censó ni modificó la base en este gate.

## Estado vigente y pareja retenida

La reserva de invitado está **ACTIVA EN QA** con la pareja del candidato `b318ca5` indicada por el propietario:

| Componente | Artefacto registrado |
| --- | --- |
| API QA | Imagen `sha256:8ba1b6c8…` |
| Web QA | Deployment `dpl_KEKT6X12…`, sobre `qa.booking.kortek.cloud` |
| Código del candidato | `b318ca591d1ca6681269a6d25e29ca106d824df9` |

Los identificadores nuevos de imagen/deployment fueron aportados abreviados; no se completan ni se presentan como cotejados en vivo. El SHA completo del código se comprobó exclusivamente en Git local. No se consultó QA, OCI, Vercel, Clerk, bases ni producción.

**M2 (cuenta de cliente final) RETIRADA POR DECISIÓN DEL PROPIETARIO.** M2 C3/P4/P5 continúan cancelados; este C3 pertenece a la reserva invitada. Se preservan historia, `Client` operativo, reservas, datos financieros y autenticación interna. No se abre una etapa de producción.

**Rollback NO EJECUTADO.** Los artefactos anteriores quedan retenidos: API `sha256:807bcb442a69e74198b224d1e60c9ae8d678043a6c7d070e90ace80935d8a261` y web `dpl_HtCcxYumevH6xD7qVhaTcGkKU3XD`. El identificador completo anterior consta en el [preflight histórico](RESERVA_INVITADO_C3_PREFLIGHT.md); la retención se registra según la instrucción del propietario, sin revalidación de disponibilidad. **Restaurar esa pareja reexpone B2C** y exige decisión/autorización separada; no constituye un rollback conforme al MVP invitado por defecto.

Este registro posterior sustituye como estado vigente las menciones anteriores de C3 pendiente/detenido, candidato solo local y falta de activación QA. Los informes, evidencia y checkpoints fechados anteriores se conservan íntegros como historia; no prueban la ejecución manual declarada ahora.

## Pendientes ordenados por riesgo — sin ejecución autorizada

1. **Rotación de la clave de desarrollo de Clerk.** Planificar la rotación de la clave de desarrollo señalada por el propietario, identificar consumidores y coordinar sustitución y validación sin copiar valores secretos a Git ni documentación. Requiere autorización separada; este cierre no rota claves.
2. **Visibilidad pública del repositorio.** Revisar la exposición del historial y artefactos publicados y decidir la visibilidad apropiada. Cambiar la visibilidad no elimina copias ni sustituye la rotación de una clave expuesta. Sin auditoría nueva ni cambio de visibilidad en este gate.
3. **Plan para llevar el candidato a main y a producción.** Main conserva Next 16.3.3 y B2C según el estado indicado por el propietario; Next 16.3.3 también consta en la referencia local `origin/main` (`fe4b117`), que no se refrescó y no acredita el remoto actual. Preparar comparación del main vigente con `b318ca5`, retiro B2C, correcciones de dependencias, validaciones, aprobación, publicación coordinada API/web desde un mismo SHA, respaldo y rollback. Resolver explícitamente la migración 28 (`20261003120000_customer_stage_one`) en producción: aplicarla sin uso B2C conserva columnas/tabla/índices y triggers con efectos en escrituras de Client/Booking; revertirla requiere una migración compensatoria y ajuste coordinado de schema/código/grants/ledger, ensayo y protección de datos, nunca borrar la migración histórica. Verificar primero su estado real en producción bajo autorización independiente; no se asume aplicada. Ninguna alternativa se elige ni ejecuta aquí.
4. **Clerk cargado en el layout raíz de la reserva pública.** Evaluar aislar el proveedor al acceso interno para reducir carga y acoplamiento del flujo invitado, preservando sesión y permisos internos. `apps/web/app/layout.tsx` envuelve actualmente los hijos con `ClerkProvider`; no se modifica en este cierre.
5. **Auditoría periódica de dependencias.** El paso `pnpm audit --prod` fallará en cada aviso nuevo que reporte la auditoría; conviene una tarea periódica para revisar avisos, preparar correcciones y repetir validaciones. El verde anterior no garantiza ejecuciones futuras. No se ejecuta audit ni se crea una automatización aquí.
6. **Recuperar o ampliar el respaldo de lo que solo existe en el equipo local.** Inventariar artefactos, evidencia y respaldos no versionados/ignorados que solo existan localmente; definir custodia externa cifrada y prueba de restauración. No se afirma que Git respalde esos archivos ni se copian secretos, datos o respaldos en este gate.

## Control de publicación documental

La autorización de este gate permite un único commit local documental y push sin force exclusivamente a `origin/ai/reserva-invitado-ci`. Esta excepción expresa prevalece para esta tarea sobre la rama habitual de AGENTS.md y los gates. **Prohibido push a `ai/antigravity-qa`**: reconstruiría la web QA desde otro SHA que el del API. **Prohibido push/merge a main.** El nuevo SHA documental no sustituye `b318ca5` como pareja desplegada.

Validación aplicable: revisión completa del diff y staged, enlaces locales del alcance, consistencia de estados y `git diff --check`. Sin builds, pruebas funcionales, código, dependencias, SQL ni operaciones de proveedores. El SHA del commit documental, cotejo remoto y estado Git final se entregan en el relevo de esta tarea; no se inventa aquí el hash de un commit aún no creado.
