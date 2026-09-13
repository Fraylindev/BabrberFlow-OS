# Configuración/CMS C2 — editor y preview privado

Entrega: 2026-09-13. **IMPLEMENTADO / EN REVISIÓN**, autorizado expresamente por el propietario después de la aprobación C1 sobre `288a62d30e7005a849d9e6d107daed635f7a89b2`. Base C2: `a03742f955692a6735d5af5f4cde9738565505c6`, rama `ai/antigravity-qa`, árbol inicial limpio. Pendiente auditoría y aprobación del propietario; C3 no está autorizado.

## Brief y aceptación

OWNER/ADMIN necesitan preparar los cinco campos de identidad pública del [contrato aprobado C1](CONFIGURACION_CMS_C1_CONTRATO.md) sin alterar el nombre operativo. Solo OWNER publica/retira con confirmación de consecuencias. BARBER/RECEPTIONIST no montan editor ni consultas CMS. D1–D6 permanecen fijadas.

Ruta privada `/dashboard/settings`: editor → guardar → preview de la revisión guardada → confirmar publicación. Sin publicar, publicado y cambios sin publicar se derivan del contrato. El preview vive en un modal autenticado, sin URL compartible, enlaces activos, catálogo ni integraciones. Texto escapado, únicamente cinco campos; ningún correo de Organization. Slug, horario y zona se presentan en lectura con lenguaje natural, sin inventar horario ante null/JSON no reconocido.

Estados exigidos: carga, contenido opcional vacío/sin publicar, error recuperable sin falso vacío, guardando, éxito tras relectura, conflicto con texto local conservado y comparación explícita, respuesta incierta con la misma clave/cuerpo para reintento, pérdida de acceso. Publicar exige revisión guardada; retirar explica el bloqueo de nuevas reservas y conservación de operación y reservas existentes.

Una instancia por visita y claves por usuario/tenant/rol aíslan lecturas, formulario, preview y acciones; desmontaje inmediato y descarte de resultados tardíos también en A → B → A. No se persiste contenido en almacenamiento del navegador. Amenazas: respuestas tardías, caché de otro contexto, sobrescritura concurrente, replay histórico, texto/URL maliciosos y escalamiento de rol. Se usan controles optimistas C1, relectura tras mutaciones, allowlist de campos, `no-store`, `noindex` y autorización backend existente.

Se reutilizan Field, Button, Card, Modal, PageHeader, React Query y cliente HTTP central. QA exige escritorio/375 px, acciones alcanzables, teclado, foco y anuncios accesibles, cuatro roles, dos tenants, conflictos y respuestas tardías. TypeScript, lint y build deben terminar con exit 0; pruebas automáticas no sustituyen navegador autenticado.

Fuera de alcance: C3/rutas públicas nuevas, H5, medios, promociones, banca, notificaciones, Pagos y cambios de contrato. La autorización posterior del propietario permite aplicar C1 en la única base existente, identificada expresamente como datos de prueba, y crear los cuatro roles en dos negocios. No es un despliegue productivo ni aprobación de C2.

## Entorno autorizado (2026-09-13)

Respaldo `pg_dump -Fc` de la base `barberflow`; restauración `pg_restore --exit-on-error --single-transaction` en contenedor PostgreSQL 16 temporal sin red. Conteos y huellas de las 17 tablas previas idénticos. Contenedor eliminado; respaldo local retenido, ignorado por Git y protegido por ACL.

C1 era la única migración pendiente. `prisma migrate deploy` aplicó `20260912120000_cms_editorial`: 21 migraciones, 12 páginas de compatibilidad. Huellas de tablas operativas preservadas. `migrate status`, `migrate diff --exit-code` y CLI de restricciones/índices terminaron con exit 0. Una consulta como `kortek_runtime` comprobó SELECT/INSERT/UPDATE en CmsPage, SELECT/INSERT en CmsOperation e INSERT en AuditLog. No se modificaron roles, propietarios ni grants persistentes; se utilizaron los privilegios por defecto existentes.

Cuatro identidades nuevas Clerk Development enlazadas por `clerkUserId` explícito, ocho Memberships: los cuatro roles en QA C2 Norte y QA C2 Sur. Dos Professional BARBER y dos Service de prueba permiten comprobar el flujo existente. Altas nuevas comprobadas sin publicar/version 0. Ninguna identidad previa fue enlazada por correo, modificada ni eliminada. Credenciales aleatorias en `.tmp/c2-access/.env`, ignorado por Git y protegido por ACL; no versionar su contenido.

El primer intento operativo fue rechazado por revisión automática por una interpretación de privilegios; la inspección del script/SQL demostró que CREATE ROLE solo apuntaba al contenedor temporal. El siguiente intento fue rechazado por límite temporal de uso. Tras habilitarse la ejecución, el script final terminó con exit 0. Los rechazos sucedieron antes de ejecutar el script.

## Implementación

- `/dashboard/settings` dinámico, metadata y cabecera `noindex, nofollow`; lecturas/mutaciones con `cache: no-store` y cabeceras privadas de C1. Preview sin token/URL compartible, enlaces activos ni correo privado.
- `CmsSettings.tsx` usa Field, Button, Card y Modal existentes. El estado local vive en una visita única; usuario/organización/rol cambian su clave, abortan solicitudes y desmontan el editor. Queries sin persistencia, `gcTime: 0`, sin retries automáticos y relectura al recuperar foco.
- Guardar envía solo los cinco campos y los dos controles contractuales. Publicar/retirar envía solo `expectedVersion`/`idempotencyKey`. Conflictos conservan texto y exigen comparación/rebase explícitos. Respuesta incierta conserva exactamente cuerpo/clave; un recibo histórico siempre se sigue de GET actual.
- Publicar exige preview de la versión guardada y confirmación OWNER. Retirar exige confirmación y no descarta un formulario sucio. Ambas acciones eliminan explícitamente la caché React Query pública local del slug, además de la invalidación autoritativa C1.
- Tipos web Organization y PublicBookingData alineados con H1/H2; se conservan los campos usados por bootstrap y Facturación. No hay cambio de contrato, dependencias ni código backend.

## Validaciones técnicas

| Comando | Resultado |
| --- | --- |
| `pnpm --filter web exec tsc --noEmit` | exit 0 |
| `pnpm --filter web lint` | exit 0, sin advertencias |
| `pnpm --filter web test` | exit 0; 74 pruebas de lógica y 15 de componente |
| `pnpm --filter web build` | exit 0; `/dashboard/settings` dinámica |
| `pnpm --filter api build` | exit 0; arranque local del C1 aprobado |

Las 12 pruebas de componente CMS cubren roles, lectura privada, carga/error/reintento, campos, ADMIN, preview/publicación OWNER, preview obsoleto, conflicto, replay histórico, mutación tardía A → B → A, cambio de usuario/rol durante preview y retirada de datos ante 403. Las tres pruebas de lógica CMS cubren validación/normalización, allowlist Maps y horarios. Dobles de prueba solo en tests; aplicación y QA usan API real.

## QA real — 2026-09-13

Entorno: Next en build de producción local `http://localhost:3001`, API C1 `http://localhost:3000`, PostgreSQL 16 habitual migrado y Clerk Development. Navegador in-app Chromium. Dos negocios de prueba: QA C2 Norte / QA C2 Sur. Sesiones nuevas verificadas para los cuatro roles. Evidencia observada en árbol accesible, DOM, capturas y respuestas reales durante esta tarea:

| Rol / escenario | Acción y resultado observado |
| --- | --- |
| OWNER, Norte | Carga → sin publicar; opcionales vacíos, nombre operativo conservado. Nombre en blanco muestra error asociado y enfoca el campo. Guarda cinco campos, muestra pending/deshabilitado y éxito tras GET. Preview muestra revisión y cinco campos escapados, sin enlaces activos. |
| OWNER, publicación | Preview → confirmación → Publicado. Booking-data anónimo 200 devuelve exactamente `name, slug, phone` en Organization; sin UUID/email/campos nuevos. Otro borrador produce Cambios sin publicar sin cambiar el snapshot vigente. |
| OWNER, retiro | Confirmación → Sin publicar. GET público y POST de nueva reserva válidos reciben 404; conteo de reservas sin cambios, nombre operativo y snapshot conservados. No se prueba ni modifica H5. |
| OWNER, A → B → A | Texto local pendiente en Norte desaparece al cambiar a Sur. Sur carga nombre/estado propios y horario vacío honesto. Al regresar a Norte aparece el borrador guardado, sin texto local anterior. |
| OWNER, dos pestañas | Una guarda mientras la otra tiene texto local. Segunda escritura obtiene 409, conserva su texto y bloquea guardado. Recarga/compara revisión, confirma conservar texto y guarda sobre la versión nueva. |
| OWNER, fallo de red | Se detiene exclusivamente el proceso API de QA durante guardar: aparece Resultado por confirmar, conserva texto y bloquea edición. Se reinicia API, consulta estado y reintenta la misma acción; guardado confirmado. |
| ADMIN, Norte | Guarda una descripción distinta y abre preview de esa revisión. No recibe controles de publicar/retirar en editor ni preview. OWNER vuelve a entrar y ve el borrador preparado por ADMIN. |
| BARBER y RECEPTIONIST, Norte/Sur | Login real, sin navegación Configuración. URL directa presenta “No tienes acceso…” sin campos CMS; cambio al segundo negocio conserva la restricción. Logout desmonta el estado inmediatamente. |
| Responsive | Escritorio 1440×1000: formulario y lectura operativa en columnas. 375×812: una columna, cinco campos y acciones alcanzables con scroll; ancho de documento 360 px con scrollbar, sin overflow horizontal. Preview móvil inspeccionado completo y con acción OWNER accesible. |
| Teclado/lectores | Cinco labels y ayudas enlazadas por `aria-describedby`; error con `aria-invalid`, primer inválido recibe foco. Dialog etiquetado, foco inicial en Cerrar, Tab/Shift+Tab contenidos en modal; Escape cierra y devuelve foco a Vista previa. Estado polite y errores alert comprobados en DOM/árbol accesible. No se atribuye prueba de un lector nativo no ejecutado. |
| Privacidad/consola | Metadata `noindex, nofollow` comprobada en DOM; preview sin correo ni links. Recorridos satisfactorios sin errores de aplicación; aviso esperado de claves Clerk Development. 409 y desconexión generan errores de red esperados solo en los casos provocados. |

Un intento auxiliar de obtener un token por SDK para repetir checks HTTP recibió 401; no se cuenta como prueba de permisos satisfactoria ni se modificó autenticación. Los permisos backend y auditoría transaccional conservan las pruebas C1 aprobadas; C2 añade la verificación UI autenticada descrita.

## Entrega y límites

URL de revisión local: `http://localhost:3001/dashboard/settings`. API y web se dejan como procesos locales ocultos; no es URL remota/productiva. Las cuatro cuentas pertenecen a ambos negocios y permiten cambiar mediante el menú de cuenta. Credenciales entregadas al propietario fuera de Git; respaldo, credenciales y scripts operativos permanecen ignorados bajo `.tmp/`.

Norte queda sin publicar y con borrador preparado por ADMIN; Sur queda sin publicar con opcionales iniciales vacíos. Publicar es una acción explícita del OWNER. La página pública vigente solo consume nombre/teléfono; mini-sitio C3 no activado. Cachés ya descargadas en otros navegadores no se pueden retirar físicamente: se conserva la limitación C1 y la revalidación autoritativa de nuevas reservas. Revalidación de la experiencia pública corresponde a C3. H5 y los hallazgos fuera de D6 siguen reportados en C0, sin cambios.

Siguiente paso: auditoría/aprobación del propietario sobre este candidato. No iniciar C3 ni entregas posteriores por inferencia.
