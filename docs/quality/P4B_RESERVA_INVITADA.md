# P4b — Reserva invitada, historia completa y cierre local

Actualización documental 2026-10-07: las cinco cabeceras pendientes de §5 fueron incorporadas en el commit `2aa57e0`, sin alterar texto histórico. La [continuación de suites y suplemento P4b](DIAGNOSTICO_SUITES_RESERVA_INVITADA.md) conserva los resultados inferiores como checkpoints anteriores y precisa los cortes de objetos; no acredita cierre funcional ni publicación.

Fecha: 2026-10-07. Informe real de la auditoría local autorizada, que sustituye el informe de parada. **P4b ejecutado sobre el rango completo; sin filtración de secretos confirmada en la revisión. Candidato IMPLEMENTADO / EN REVISIÓN, cierre funcional INCOMPLETO por resultados de suites. SIN PUSH y sin aprobación final del propietario.** Auditorías anteriores intactas.

## 1. Base, enmienda, manifiesto y Git

- Base inicial: ai/antigravity-qa, HEAD c4625ef23a3766c5be5172dde0aea4b1cb57d7ac; índice vacío, 46 M/41 D/207 A del candidato, más el informe de parada no staged.
- Antes de modificar, las 294 rutas originales se revalidaron: 251 hashes SHA-256 y tamaños coincidentes, 41 eliminaciones ausentes; final-checks/final-inventory excluyen sus propios hashes para evitar ciclos. Cero diferencias. No se regeneró ante deriva.
- Enmienda vinculante al inicio de DECISIONES_PROPIETARIO_2026_09_29.md: decisiones 2/28 superadas y 13/29 parcialmente superadas, originales conservados. B2C fuera del MVP/Piloto 1; auth interna Clerk/legacy y roles OWNER/ADMIN/RECEPTIONIST/BARBER preservados. M2 C3/P4/P5 CANCELADOS, sin ejecutar activaciones ni borrar sus evidencias.
- Ampliación explícita: **295 rutas**, las 294 más ese documento. Lista/manifiesto/hashes regenerados tras la autorización; final-inventory.amendment conserva hash del manifiesto anterior (9737cdfc91cfa6edfd21e772fe518d3ea5da0ed22a74cf2b42a4a09c5a09720e) y hashes/tamaños anteriores de siete rutas modificadas. final-checks registra la revalidación. P4b reservado al commit 2, fuera de esas 295 rutas.
- Primer commit: **75618daa3bae83e10aa49e4f01d0b80d76cb1c1e**, «Retirar cuentas B2C y establecer reserva de invitado». Staging ruta por ruta con git --literal-pathspecs add -- <ruta>; 295 rutas comprobadas con diff --cached --no-renames --name-only. Git presenta 268 entradas cuando detecta 27 renombres de archivos históricos, no una omisión del inventario.
- Primer intento de staging: exit 1 por index.lock Permission denied; reintento autorizado con escritura Git: exit 0, sin eliminar locks. No hubo rechazo de auto-review ni reescritura de historia.
- git fetch origin ai/antigravity-qa: exit 0. FETCH_HEAD y origin coinciden en **9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4**, remoto real consultado. git merge-base --is-ancestor origin/ai/antigravity-qa HEAD: **exit 0, fast-forward**. Rango auditado: **9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4..75618daa3bae83e10aa49e4f01d0b80d76cb1c1e**, 21 commits antes del correctivo final. Ningún push.

## 2. Cobertura y metodología P4b

Primera pasada, hasta el commit 1: **624 objetos**: 21 commits, 177 árboles, **426 blobs** (394 rutas únicas, incluidas versiones intermedias), 20 binarios PNG. Se usaron git rev-list --reverse <rango>, git rev-list --objects <rango>, git cat-file --batch y git cat-file blob <OID>; no solo diff neto. Los mensajes de todos los commits y todos los blobs de texto entraron al barrido; los árboles aportaron el censo de rutas/modos. Los snapshots y blobs intermedios permanecen incluidos aunque no representen el producto final.

Revisión de contenido sin ejecutar ejecutores históricos: patrones de claves privadas y proveedor, JWT, URL con credencial, dumps/archivos comprimidos/privados, cadenas largas aleatorias y asignaciones test key/secret/password/phrase/token/clave/key; incluyó hexadecimales largos además de base64. Se revisaron manualmente contextos de candidatos, su uso en código y su procedencia, registros P2/P3, código retirado archivado, documentación y capturas. No se imprimieron valores de credenciales candidatas; se emitieron rutas/líneas/tamaño y clasificación. Los resultados completos de herramientas auxiliares quedan ignorados en .tmp/guest-p4b-*.json; no se convierten en auditoría aprobada por sí solos.

Conciliación posterior: al incluir el commit 2 `e15b687`, el rango remoto..HEAD contiene **633 objetos: 22 commits, 183 árboles y 428 blobs**, con los mismos 20 PNG. El incremento es un commit, seis árboles y dos blobs (B1 e informe); son dos cortes distintos, no un cambio de metodología. El suplemento de los commits 3/4 se registra en [DIAGNOSTICO_SUITES_RESERVA_INVITADA.md](DIAGNOSTICO_SUITES_RESERVA_INVITADA.md).

### Resultados

- Sin archivos dump/backup/cifrado/clave privada/dotenv nuevos en los objetos auditados, ni binarios ejecutables. Las referencias a custodia y hashes de respaldos no son respaldos. Se conservan ejecutores como texto y payloads base64 de fuentes de ensayos P2/P3: no se ejecutaron ni se confundieron con dumps.
- Se decodificaron **49 payloads base64** de JSON, incluidos P2/P3. Cero discrepancias frente a hashes o textForReview declarados en las entradas que los aportan. Se revisó el texto decodificado además del contenedor JSON. No se interpretó base64 como sanitización.
- 285 candidatos del primer barrido, 57 valores distintos/contextos agrupados. Los marcadores de claves privadas son patrones de validación/traceback, no bloques de clave; Clerk test en helpers es marcador sintético declarado, no credencial de proveedor; URLs DB se construyen con secretos efímeros y loopback. Las asignaciones largas encontradas son frases sintéticas legibles declaradas, hashes y fragmentos de construcción de publishable key sintética; no se confirmó una cadena aleatoria tipo test key pegada en goals/documentos. No se presume que un prefijo test pruebe inocuidad: se contrastó uso/procedencia. No se validó ninguna clave llamando a un proveedor.
- El chequeo adicional de hexadecimales detectó tablas de SHA, IDs de imagen/volumen, fingerprint de CA pública, hashes de archivos SQL/custodia y referencias Git, no passphrases literales confirmadas. Goals/sesiones se tratan como contenido si aparecen en blobs; no se abrieron sesiones privadas fuera del rango.
- Se inspeccionaron los 20 PNG nuevos/intermedios directamente desde sus blobs mediante una hoja local de inspección. Datos visibles de prueba identificables como sintéticos; no se confirmó PII de un usuario real. Correos en pruebas son fixtures y varias coincidencias son rutas de paquetes pnpm o sintaxis de PowerShell. No se consultaron filas privadas ni bases reales.
- Finales de línea: cero blobs de texto con CRLF o mezcla CRLF/LF en el rango Git. La comparación del commit 230bd7b con su padre sobre SQL/Prisma, ignorando EOL, no produce diff (exit 0); no hubo cambio semántico de migraciones por esa normalización. Hashes del manifiesto describen bytes del worktree: Git normaliza según atributos/autocrlf; no confundir esas identidades. No se altera ledger ni EOL para forzar coincidencias.

### Salvedad de whitespace de evidencia cruda

git diff --cached --check antes del commit 1 terminó **exit 2**: 280 diagnósticos confirmados sobre el commit creado en 18 archivos de evidencia .patch/.log (espacios de contexto de unified diff, salida migrate-deploy y blancos finales de logs). No se cuenta como chequeo global aprobado. Se conservaron bytes aprobados y hashes; no se sanitizaron silenciosamente evidencias para volver verde el comando. git diff --cached --check sobre las rutas que no son .patch/.log: **exit 0**. Un chequeo complementario de .patch con blank-at-eol excluido: exit 0; **no sustituye el fallo estándar**. Esta observación y las suites fallidas impiden presentar el candidato como cierre funcional aprobado/publicable.

### Los 21 commits auditados

- d222115f7d624b5698b67a24e22486625fec22b2 Implementar C2 de cuenta de cliente y corregir su revisión visual
- 2bb43ff2e297662c72e0a07f3ad5e4aba9beb891 Consolidar documentación de M1 y aprobación C1 sin publicación
- 339ae92ff142bb47708a54b7333e20da66f3f203 Corregir permisos runtime de M2 C3 P1 y registrar aprobación C2
- 827e635939b23d1131f5c6e57c2066c1823a1b33 docs(m2): registrar parada previa de P2 sin congelar QA
- 03537c2b0647734f22c601fc25baf208df957603 docs(m2): registrar revalidación P2 y fallo de preparación
- 1690a1eae692064c4058358bca2f38aa541c9bba docs(m2): diagnosticar parada condicionada de P2
- c0d9fd5d30a4acd984c4a92b0d198ce23de55822 docs(m2): corregir preparación local Docker de P2
- a19fdedfca5cda1f327e7182bbd037ecaedcdd54 docs(m2): registrar parada P2 antes de congelar QA
- 25fbdd3241b926925a3af435d8ecb5c4ddd99fad docs(m2): registrar parada del arnes local P2
- 768d898e27685216b40b699cf5ad9e3f7c1cfd76 docs(m2): documentar arnes P2 sin congelamiento detenido
- 3a154df5bc606ea0a31f4a47e92b7eb8fbf50aff docs(m2): registrar diagnostico GPG y parada local de A
- 5340f97bfd4a3fbc67b491bc50ff4b34bf1f6fef docs(m2): registrar iteraciones locales de A y diferencias de esquema
- 0dd4ba7c0e42ac18617029a7e0f3f990cf38995c docs(m2): completar respaldo P2 y recuperacion verificada
- bc1d559e42928ca0deb60319b33cf98b3cd69291 docs(m2): registrar continuidad QA final de P2
- 8fd74477f027fba4c2c3c28d8a73eb9dcffaec3f docs: registrar P3 incompleto y rollback seguro de QA
- 75955bb44eb2ba86da7d2c5f30ec947373e5099e docs: conciliar hash canonico del manifiesto P3
- adb36cb02330e9f00c84ecce7d0e2d119af9731a docs: registrar ensayo local y parada R1 de P3
- 3507117d52f2abf4e8ac138e7ad0d63a9b80f861 docs: cerrar P3 QA tras cotejo y gate runtime real
- 230bd7b3753df815effd8593623d68b3114daebe chore: fijar LF para migraciones y SQL operativo
- c4625ef23a3766c5be5172dde0aea4b1cb57d7ac docs(m2): preparar checklist P4 de Clerk Development
- 75618daa3bae83e10aa49e4f01d0b80d76cb1c1e Retirar cuentas B2C y establecer reserva de invitado

## 3. Correctivo B1

Solo apps/web/e2e/whatsapp-c2.spec.ts: nombre accesible «Contactar por WhatsApp (se abre en una pestaña nueva)», descripción accesible vacía conforme al SuccessView actual y ausencia del disclaimer retirado, teléfono esperado +18095554321 conforme al prefijo +1. La selección de hora se hace por el botón visible en Horas disponibles, conservando 201/PENDING, ausencia de apertura automática, destino/mensaje fijos, teclado, protección opener, recuperación, aislamiento por slug y negativa de popup. No se modifica SuccessView ni contratos o autenticación de producto. QA del correctivo no se presume por la revisión estática.

## 4. Suites y aislamiento

Se reutilizó en memoria el helper comprometido guest-postgres-run.cjs con un wrapper ignorado .tmp/guest-closure-run.cjs; no se cambió el helper versionado. Cada intento crea UUID/directorio/puerto/base _test nuevos, PG18.1 en 127.0.0.1, roles no elevados para migrador/runtime y passwords aleatorios solo en memoria. initdb usa archivo temporal exclusivo eliminado; outputs omiten passwords/URLs/JWT. guest-postgres-no-dotenv.cjs bloquea lecturas de .env. Migraciones existentes, provision y gate runtime: exit 0 en el intento que alcanzó suites. Ninguna conexión a barberflow/QA/producción; esa identificación se pasa como expectativa para rechazar coincidencias, no como destino.

Los fixtures/HTTP requeridos por las suites se limitan a sus dobles o filas sintéticas del clúster desechable. No se autorizaron ni efectuaron POST/fixtures/correo en QA o proveedores. Nunca se usaron cuentas reales ni secretos de Clerk.

| Intento PG18 exclusivo | Versión | API literal | API pnpm11 equivalente | Build web offline | Browser | Limpieza |
| --- | --- | --- | --- | --- | --- | --- |
| 0de4c81e2f7747caac081a15a1c7addb | 18.1 | 1 | no ejecutado | no ejecutado | 1 | detenido y eliminado |
| 1f52d7dad18e4830a3ec984534cd9034 | postgres (PostgreSQL) 18.1 | no ejecutado | no ejecutado | no ejecutado | no ejecutado | detenido y eliminado |
| 6729cc79777d415dadf3f34945de5ca1 | 18.1 | 1 | 1 | 0 | 1 | detenido y eliminado |
| 7727bc08917943fabc65e22b39cbb937 | 18.1 | no ejecutado | no ejecutado | 0 | 1 | detenido y eliminado |
| b48710014e2c427da4ca060990f3cd7a | 18.1 | no ejecutado | no ejecutado | no ejecutado | 1 | detenido y eliminado |

- Comando solicitado exacto: **pnpm --filter api test:e2e -- --runInBand**, exit 1. Con pnpm 11.18.0, Jest recibe el separador literal y trata --runInBand como patrón: cero tests ejecutados. No se maquilló con passWithNoTests.
- Comando suplementario semánticamente equivalente: **pnpm --filter api test:e2e --runInBand**, exit 1: **15 suites pasan, 4 fallan, 1 omitida; 223 pruebas pasan, 41 fallan, 1 omitida (265 total)**. Fallos en invoices (CUSTOMER 401 frente a 403), public-booking-m1 (media 404 frente a 200), notifications-http (conflictos de disponibilidad y rutas públicas 404), services (409 frente a 200 al publicar; causa precisada posteriormente: fixture sin horario confirmado, documentada en el diagnóstico de suites). No se atribuyen todos al retiro sin investigación; no se cambian otros módulos/tests fuera de B1.
- **pnpm --filter web test:browser**: intento literal exit 1 antes de pruebas por BUILD_ENVIRONMENT; artefacto anterior no corresponde al entorno sintético. Intento posterior de config temporal falló por __dirname en ESM; se corrigió únicamente el wrapper ignorado y se conserva el fallo.
- Build posterior: **pnpm --filter web build --webpack**, exit 0, dotenv bloqueado, configuración pública sintética/loopback y fuentes offline mediante soporte de mocks de Next; tipografía de fallback, no prueba del render con fuentes finales. No se instala nada. No se publica el build.
- Repetición browser: **pnpm --filter web test:browser --config <.tmp/guest-playwright.config.ts>**, mismas tres suites y proyectos desktop-chrome/mobile-chrome del config original, dos workers, cero retries y sin reutilizar un servidor ajeno. Node bloquea conexiones no loopback; Chrome resuelve destinos externos a loopback para impedir contacto de proveedor. Las intercepciones HTTP propias de los tests siguen activas. La configuración de aislamiento no amplía autenticación de producto ni representa Clerk real.
- Resultado registrado en el JSON local: {"startTime":"2026-10-07T19:18:12.331Z","duration":79052.59300000001,"expected":19,"skipped":1,"unexpected":2,"flaky":0}.

## 5. Contradicciones/documentos pendientes fuera del manifiesto

Se listaron sin editar: M2_CUENTA_CLIENTE_C0.md (cuenta requerida para Piloto 1/decisión 2 FIJADA), RESERVA_PUBLICA_M1_C0.md (casilla/requisito) y AUDITORIA_HALLAZGOS_ROADMAP_MVP_2026_09_29.md (mantener cuenta/roadmap M2). M2_C3_PREFLIGHT.md y M2_C3_P4_CLERK_CHECKLIST.md conservan planes antiguos de C3/P4/P5. Propuesta documental: cabecera fechada de enmienda/cancelación y enlace al documento vinculante, conservando todo el texto histórico. No se añaden al inventario ni se modifican sin autorización. ROADMAP_POST_CMS_AUDITORIA.md es planificación histórica, no requisito vigente. PROJECT_MASTER, PRD, APP_FLOWS y docs/README ya estaban en el manifiesto y registran ahora la enmienda y cancelaciones; sus registros anteriores siguen como historia.

## 6. Límites, gate y continuación

Solo cierre local del candidato en revisión. P4b no equivale a aprobación de producto ni prueba ausencia absoluta de secretos por regex. No se acredita QA integrada, Clerk/correo real, navegador contra una API desplegada, iPhone/Safari físico, producción o proveedor. Producción cerrada e intacta; sin push/PR/Vercel/OCI/SSH/Clerk/flags persistentes/QA/dependencias nuevas/bases reales. No se reescribe historia ni se corrigen hallazgos del rango borrando commits. Las cancelaciones de M2 no borran tablas/datos/identidades.

El commit 2 incluye exclusivamente B1 y este informe real, con resultados y límites finales antes de staging. Las suites conservan fallos: **PAUSADO / INCOMPLETO**, no candidato final aprobado; los correctivos fuera de B1 necesitan autorización propia. SHA del segundo commit se entrega mediante evidencia Git posterior, sin hash autorreferente dentro del archivo comprometido.

## 7. Resultado final de B1 y browser

Último intento: `b48710014e2c427da4ca060990f3cd7a`, PG18.1 nuevo, migraciones/provision/gate exit 0; stop exit 0 y cleanup true. Se reutilizó el build offline anterior porque solo cambió el spec, no fuentes/configuración de producto; el guard de BUILD_ENVIRONMENT comprobó la configuración coincidente al arrancar. Ningún servidor ajeno reutilizado. `pnpm --filter web test:browser --config <config temporal>`: **exit 1, 19 aprobadas, 2 fallidas, 1 omitida, 79,1 s**.

| Proyecto | Aprobadas | Fallidas | Omitidas |
| --- | --- | --- | --- |
| desktop-chrome | 9 | 1 | 1 |
| mobile-chrome | 10 | 1 | 0 |

Las dos fallidas son el flujo completo de WhatsApp: desktop registra un pageerror por SDK Clerk bloqueado; mobile registra errores de recursos externos rechazados. Los asertos previos de la reserva PENDING, payload con +1, enlace manual, destinatario/mensaje, accesibilidad, teclado y popup llegaron a ejecutarse, pero **no se acredita consola limpia ni suite verde**. Se conservan las comprobaciones de errores, sin filtrarlos para aprobar el test.

En el intento previo (17 aprobadas/4 fallidas/1 omitida), los otros dos fallos provenían de exigir cero enlaces con el nombre accesible actual antes de reservar, aunque el mini-sitio ya ofrece el contacto genérico. Dentro del mismo spec autorizado se sustituyó esa expectativa por ausencia de la pantalla de éxito. Tras la corrección, los dos escenarios A → B → A pasan y siguen verificando el destinatario propio tras cada reserva. No se modifica el mini-sitio ni se elimina su WhatsApp.

Validaciones finales: `pnpm --filter web exec tsc --noEmit`: **exit 0**; `pnpm --filter web exec eslint e2e/whatsapp-c2.spec.ts`: **exit 0**, sin autofix; `git diff --check` del correctivo: **exit 0**. Los comandos de Node/pnpm heredan preload contra dotenv y bloqueo de red externa. Los JSON/logs locales de los cinco intentos quedan ignorados en `.tmp/guest-closure-evidence`; los resultados se registran arriba y no sustituyen QA del proveedor ni autorizan publicación.

Suplemento de P4b del commit 2: revisión del diff B1 completo y del informe nuevo, ambos texto LF, sin payload binario/base64/credencial/PII nueva. Se inspeccionan las dos rutas explícitas en el índice antes de comprometerlas; el rango final incorpora este segundo commit como el número 22, conservando los 21 anteriores. Se verifica otra vez el rango completo desde el SHA remoto después del commit; ninguna reescritura ni push.

Estado previsto tras el segundo commit: índice/árbol de archivos versionables limpios; evidencias auxiliares ignoradas conservadas. El cierre **funcional** permanece incompleto por 41 fallos/una omisión API y dos fallos/una omisión browser, además del chequeo estándar de whitespace de evidencia cruda registrado. Siguiente paso: autorización específica para investigar/corregir las cuatro suites API afectadas y decidir cómo validar consola web con autenticación aislada, sin llamar a Clerk ni degradar assertions; no se abre esa etapa por este commit.
