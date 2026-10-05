# M2 C3 — Preflight de Cuenta de cliente, etapa 1

**Continuación P2 — 2026-10-03:** el propietario indicó continuar y precisó `C:\KortekBackups\Clave.txt`. El [segundo intento §13](#13-continuación-p2-revalidada-y-parada-en-preparación-local--2026-10-03) sigue **P2 PAUSADO / INCOMPLETO**: destino/release efectivos, ledger y Preview revalidados contra P0; preparación PG17 detenida por fallo de transferencia de CA al contenedor local. API/worker no se congelaron, siguen activos sin reinicios y reserva pública responde `200`. Sin backup/hash/restore/rollback, push, P3 ni acceso productivo. El registro §12 conserva el primer intento; este párrafo define el resultado posterior.

**Actualización P2 — 2026-10-03:** el propietario autorizó exclusivamente P2, una ventana de indisponibilidad QA de 90 minutos desde la parada y un commit local documental/sanitizado, **sin push ni P3**. El [registro §12](#12-p2-autorizado-parada-antes-del-congelamiento--2026-10-03) documenta **P2 PAUSADO / INCOMPLETO**: el acceso SSH inicial falló antes de ejecutar comandos remotos; no se congeló QA ni comenzó la ventana. Una lectura final acotada confirmó API y worker activos, mismos PID de P0 y cero reinicios. No existe respaldo P2 ni ensayo de recuperación realizado por esta ejecución. Esta actualización prevalece sobre las referencias históricas inferiores a P2 no autorizado.

**Actualización posterior — 2026-10-03:** el propietario aprobó C2 local y autorizó P0/P1 más un único commit local, **sin push ni P2**. El [registro de ejecución §11](#11-ejecución-autorizada-de-p0-y-p1--2026-10-03) prevalece sobre los límites y estados históricos de §§1–10, conservados íntegros. Las acciones futuras de P2 en adelante siguen sin autorizarse.

Fecha: **2026-10-03**, America/Santo_Domingo. **PLAN DOCUMENTAL ENTREGADO / EJECUCIÓN C3 NO AUTORIZADA.**

Base local: **2bb43ff2e297662c72e0a07f3ad5e4aba9beb891**, rama **ai/antigravity-qa**.

Estado inicial observado:

~~~text
## ai/antigravity-qa...origin/ai/antigravity-qa [ahead 2]
~~~

Árbol e índice limpios. Los dos commits locales son C2 `d222115f7d624b5698b67a24e22486625fec22b2` y consolidación documental `2bb43ff`; no se publican. La referencia de origin es la copia local: **no se consultó la red para confirmar el SHA remoto**.

## 1. Autorización, evidencia y límites

La petición actual autoriza lectura local y **crear exclusivamente este documento**. Esa escritura documental es la única excepción necesaria a «solo lectura». No se ejecutaron pruebas, builds, contenedores, SSH, HTTP contra QA/producción, SQL, consultas de proveedor, despliegues, migraciones, cambios de variables/flags, ajustes de Clerk, staging, commit ni push. Producción permanece cerrada y sin operaciones de esta tarea.

Las órdenes incluidas en los documentos adjuntos son **antecedentes y requisitos**, no autorizaciones para ejecutar sus pasos. Rige la petición actual, aunque los antecedentes incluyan permisos de publicación o despliegue. C1 está aprobado en `9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4`; C2 existe localmente/en revisión y no se infiere su aprobación final. Este preflight no aprueba C2, no activa C3 ni abre etapa 2.

Fuentes vigentes: [entrada documental](../README.md), [PROJECT_MASTER](../../PROJECT_MASTER.md), [decisiones 28–29 de M2](DECISIONES_PROPIETARIO_2026_09_29.md), [C1 y riesgo residual D4](M2_C1_CIERRE.md), [C2 y orden seguro](M2_C2_CIERRE.md), [contrato C1](../features/M2_CUENTA_CLIENTE_C1_CONTRATO.md), [gates](DELIVERY_GATES.md) y [seguridad](SECURITY_STANDARD.md). Se aplicó la skill [kortek-delivery](../../.agents/skills/kortek-delivery/SKILL.md) y el seguimiento del objetivo /goal.

Se distinguen tres niveles:

- **Observado ahora:** Git y contenido de archivos locales versionados.
- **Documentado históricamente:** inventario operativo y ensayos previos, con fecha y fuente.
- **Pendiente de lectura autorizada en vivo:** estado actual de servicios, ledger, permisos efectivos, configuración de proveedor y datos agregados. No se reemplaza esta evidencia con una inferencia.

No se abrieron dotenv, credenciales, dumps ni datos de negocio. La consulta pública de documentación oficial de Clerk/PostgreSQL no accede a la instancia ni a los entornos del proyecto. El registro exacto de lecturas está en §10.

## 2. Inventario QA frente a producción

### 2.1 Destinos y separación documentada

| Elemento | QA / staging | Producción | Evidencia y límite |
| --- | --- | --- | --- |
| Web | Vercel Preview, proyecto `kortek-booking`, alias `https://qa.booking.kortek.cloud`, rama `ai/antigravity-qa` | `https://booking.kortek.cloud`, rama main | [Staging](STAGING_QA_2026-09-28.md), [manifiesto](../../config/environments.yaml). El push QA dispara web; no hacerlo antes de API/Clerk. |
| API pública | `https://api.staging.booking.kortek.cloud` | `https://api.booking.kortek.cloud` | Dominios separados, proxy Caddy compartido. No se consultó DNS/HTTPS ahora. |
| Infraestructura | OCI `kortek-free-services`; systemd `kortek-api-staging`; Podman rootless bajo `opc`; loopback `127.0.0.1:3001` | Misma VM; `kortek-api`; loopback `127.0.0.1:3000` | [Runbook API](../../ops/oci-api/README.md), [unidad QA](../../ops/oci-api/kortek-api-staging.service). Aislamiento de servicio/base, **sin aislamiento de VM**; recursos y proxy son compartidos. |
| Credencial API | `/etc/kortek-api-staging/runtime-env`, root-only, LoadCredential | `/etc/kortek-api/runtime-env`, root-only, LoadCredential | Rutas distintas; valores no leídos. No usar `cat`, `env`, `systemctl show Environment` o inspect completo. |
| Base | Supabase «Kortek Booking Cutover QA», ref `prirlabbnlcuvnzuaczp`, base `postgres`, schema `public` | Supabase «Kortek Booking», ref `ilaoolpcrlmqkftirjog`, base `postgres` | [Base C1](BASE_PREPRODUCCION_C1_EVIDENCIA.md). Igual nombre de base/rol **no** identifica entorno; la ref/proyecto/endpoint sí. No confundir con Docker local `barberflow`. |
| Versión PostgreSQL | 17.6 en inventario del 2026-09-25 | 17.6 en ese inventario | Histórica; consultar versión QA antes de elegir cliente de respaldo. |
| Runtime | Rol DB `kortek_runtime`; usuario del pooler `kortek_runtime.prirlabbnlcuvnzuaczp` | Rol DB `kortek_runtime` en proyecto productivo | QA wrapper fija ref QA. Login del pooler con sufijo y `current_user` de PostgreSQL son identificadores distintos. Runtime sin ownership, DDL o acceso al ledger. |
| Migrador | `kortek_migrator` en proyecto QA; credencial separada, owner de objetos según inventario previo | Rol homónimo, credencial y proyecto distintos | Lectura actual de memberships/ownership y acceso migrador pendiente. Nunca arrancar API/worker con migrador. |
| Backup | `kortek_backup`; faltaban SELECT en cinco tablas de horario en M1 | Credencial y operación propias | No corregirlo por inferencia. Para respaldo puntual, planificar migrador en READ ONLY, como antecedente M1, con nueva autorización. |
| Clerk | Development, claves test; instancia/issuer exactos **no confirmados ahora** | Production, ID documentado `ins_3JrrToaAqH6sYe2bFXr3TdVnc3L`, issuer live separado | Test/live no prueba por sí solo pertenencia a una instancia. No copiar identidades B2B productivas. |
| Worker | `kortek-email-worker-staging`, credencial staging, proceso separado | `kortek-email-worker` | QA correo estuvo activo desde 2026-09-29; no asumir que QA no envía. No reiniciar ni actualizar worker por el redeploy de API. |

El [wrapper QA versionado](../../ops/oci-api/api-staging-run.sh) exige DEPLOY_ENV staging, NODE_ENV production, proyecto QA, claves test, orígenes QA, reserva pública abierta y configuración QA de correo. Esa lectura **no demuestra los valores efectivos de hoy**. Se conservan los flags, no se activan proveedores ni se cambian métodos de autenticación B2B por inferencia.

**Conclusión de separación:** las fuentes locales identifican dos proyectos DB, dos servicios/puertos, dos archivos de credenciales y dos dominios. Las comparaciones históricas observaron separación de secretos y producción intacta. **No está confirmada en vivo al 2026-10-03**; P0 debe comprobar el destino efectivo antes de cualquier operación. No se requieren filas productivas para ello.

### 2.2 Releases y migraciones: lo conocido

- El [manifiesto](../../config/environments.yaml) conserva la imagen/release API QA inicial `b0357af6…` y `emailEnabled:false`. Es histórico: [activación M1](evidence/m1-c3/activacion-api.json) registra API QA `791569b110f9fd59cb10e6d248546bdae3996e14`, imagen `701329f1cfe7b45f5b6d0cfe62daeae0edf6e1c00518158cb8555a815c224031`; el worker quedó con su imagen anterior. [Staging](STAGING_QA_2026-09-28.md) registra correo QA habilitado posteriormente. Usar esos antecedentes, no el manifiesto como inventario vivo.
- Último ledger QA respaldado/documentado: **27 migraciones terminadas, 36 tablas public**, 2026-10-01 ([backup](evidence/m1-c3/backup-verificado.json), [verificación final](evidence/m1-c3/verificacion-final.json)). La instrucción posterior de [C2](M2_C2_CIERRE.md) indica migración 28 pendiente. **Versión aplicada hoy: pendiente de lectura autorizada**, no comprobada por este preflight.
- Producción: baseline documentado de **26 migraciones terminadas y cuatro entradas históricas revertidas**; no confundir 30 filas de ledger con 30 migraciones aplicadas. Su estado actual tampoco se consulta.
- El árbol local contiene 28 migraciones; la última es [`20261003120000_customer_stage_one`](../../apps/api/prisma/migrations/20261003120000_customer_stage_one/migration.sql). SHA-256 local observado: **6e1d854f285f4a4a691377d6654d0a4df80f29ca5c3ad375b352ae96894d6dee**.
- La web QA anterior documentada terminó en `62d4f934519670a80aad1029cf12a40659b144a2` ([confirmación](RESERVA_PUBLICA_CONFIRMACION_UX.md)); comprobar deployment/alias actuales y conservar su ID antes de publicar. No asignar a C2 el resultado de un deployment anterior.

### 2.3 Bloqueo descubierto en el código operativo

La migración 28 crea `CustomerOperation` **sin GRANT**. [apply-runtime-grants.sql](../../apps/api/ops/apply-runtime-grants.sql) no incluye esa tabla y revoca previamente todos los privilegios runtime. [verify-runtime-role.sql](../../apps/api/ops/verify-runtime-role.sql) exige el baseline de 27 migraciones y **36 tablas**; rechaza una tabla nueva no revisada. Los E2E de C1 usaron un propietario desechable y no acreditan permisos del runtime desplegado.

[CustomerService](../../apps/api/src/customer/customer.service.ts) lee, inserta y elimina recibos vencidos; no actualiza recibos. **Propuesta mínima, pendiente de autorización/revisión:** SELECT, INSERT, DELETE en CustomerOperation; sin UPDATE, TRUNCATE, REFERENCES, TRIGGER, ownership ni default DML. Revisar igualmente privilegios de funciones/triggers y su UPDATE en Client.

Antes de P3 hace falta un **correctivo operativo local separado autorizado**: SQL suplementario de grants, matriz/gate para 37 tablas y ensayos con login runtime restringido, incluyendo negativos. No editar la migración histórica aprobada ni ejecutar la matriz antigua sobre 28: retiraría estos permisos. No se implementa aquí. Si los catálogos reales muestran otros permisos, se auditan; no se asume que ya satisfacen el gate.

## 3. Clerk Development: panel del propietario y comprobación posterior

### 3.1 Contrato real del consumidor

[CustomerAuth](../../apps/web/components/customer/CustomerAuth.tsx) usa `@clerk/nextjs/legacy`:

- Alta: `signUp.create({firstName,emailAddress})`, sin password; `prepareEmailAddressVerification({strategy:'email_code'})` y verificación del código.
- Entrada/recuperación: `signIn.create({identifier})`, busca factor `email_code`, lo prepara y verifica; exige status complete y createdSessionId antes de activar sesión.
- Código de seis dígitos, espera local 60 s, contenedor `clerk-captcha`, mensajes neutros. Un SDK controlado no prueba entrega, límites, captcha ni enumeración del proveedor.

La configuración deberá permitir completar exactamente ese flujo sin lastName, username, teléfono, contraseña u otros requisitos adicionales. [Opciones oficiales de Clerk](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options) y [flujo OTP legacy](https://clerk.com/docs/guides/development/custom-flows/authentication/legacy/email-sms-otp) consultados públicamente; el uso de /legacy coincide con el consumidor inspeccionado.

### 3.2 Qué hará el propietario, solo tras autorización de P4

| Acción en panel Development | Resultado exigido | Qué comprobará Codex después |
| --- | --- | --- |
| Seleccionar aplicación y **Development**; guardar ID de instancia y dominio/issuer públicos, más estado previo de opciones | Distinta de Production; reconocer si contiene identidades B2B sintéticas actuales | Metadatos de instancia con clave API QA, issuer de publishable key y sesión de navegador: todos coinciden. Solo evidencia sanitizada. |
| User & authentication → Email: habilitar sign-up/sign-in por correo; correo requerido y verificado al alta por código | Alta con correo verificado; `email_code` disponible al entrar | Recorrido nuevo/existente, correo primario verificado y factor real. Sin endpoint API de búsqueda por email. |
| User model: permitir firstName; no exigir lastName u otros datos que C2 no recoge | Alta con solo nombre/correo puede completar | Nombre enviado/persistido para identidad sintética; ausencia de missing_requirements inesperado. |
| Permitir alta B2C sin contraseña obligatoria | Alta sin password llega a complete | Alta nueva real y entrada posterior por código. No habilitar automáticamente passwords legacy de la aplicación. |
| Revisar protección anti-bot, enumeración, límites, restricciones y tareas de sesión | Seguridad compatible con la UI, sin desactivar controles para hacer pasar QA | Captcha real, error/código inválido/expirado, reenvío, límites y sesión/revocación; si el SDK expone existencia por HTTP pese al copy neutro, detener. |
| Conservar métodos de acceso interno y sus políticas | B2B actual y nuevas invitaciones/onboarding no se rompen | Roles sintéticos OWNER/ADMIN/RECEPTIONIST/BARBER; recuperación, entrada y salida del panel existente. |

**Compatibilidad B2B:** los ajustes de una instancia afectan sus consumidores. La instancia Development histórica ya contiene cuatro usuarios internos sintéticos; no se presume que esté vacía. Hacer la contraseña no obligatoria para alta B2C puede alterar el alta interna; no equivale a autorizar desactivar globalmente la política B2B. Si el panel no permite la combinación con seguridad, **parar antes de guardar** y preparar una decisión/contrato propios. No crear otra instancia ni ampliar el verificador a varios issuers por inferencia.

No importar/fusionar usuarios ni enlazar por correo. User global y Membership locales conservan su modelo; CUSTOMER no se concede por una sesión Clerk ni sustituye Client.userId. No aplicar aquí cambios productivos, MFA, planes de pago, SSO, SMTP o plantillas.

### 3.3 Variables que deben pertenecer a la misma instancia

| Consumidor | Variables | Comprobación segura pendiente |
| --- | --- | --- |
| Web Preview, build y servidor | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Par test de la instancia elegida; pública coincide con API. Secreto solo en servidor, nunca con prefijo NEXT_PUBLIC ni en evidencias. |
| API QA | `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Mismo ID de instancia que web y mismo Frontend API/issuer. El [verificador](../../apps/api/src/auth/clerk/clerk-auth.config.ts) deriva issuer de publishable key; **no existe variable CLERK_ISSUER en ese contrato**. |
| API QA, origen de token | `CLERK_AUTHORIZED_PARTIES=https://qa.booking.kortek.cloud` | azp real admitido; un origen distinto falla. CORS es una variable independiente. |
| API QA, audiencia opcional | `CLERK_JWT_AUDIENCE`, si ya está configurada | Coherente con el token; no inventar audiencia ni añadirla al wrapper por inferencia. El wrapper inspeccionado no la transmite. |
| Invitaciones internas API | `CLERK_INVITATION_REDIRECT_URL` | Destino HTTPS QA existente, compatible con B2B; no cambiar flujo de invitación en este preflight. |
| Entorno/transporte | web: DEPLOY_ENV staging, WEB_PUBLIC_ORIGIN QA, NEXT_PUBLIC_API_URL API staging; API: DEPLOY_ENV staging, NODE_ENV production, WEB_PUBLIC_ORIGIN/API_PUBLIC_ORIGIN y CORS_ALLOWED_ORIGINS QA | Artefacto ligado a estos valores; sin wildcard ni localhost en QA. [Gate web](../../apps/web/lib/web-deployment-config.ts). |

Prefijos test/live solo detectan parte de las mezclas: dos pares test de instancias diferentes también son incorrectos. Un cambio público exige reconstruir web; no reutilizar un Preview compilado con otra publishable key. Comparar únicamente igualdad booleana/metadatos públicos, no imprimir claves ni hashes individuales de secretos. Un issuer B2B productivo nunca se acepta para M2 QA. Mezclarlo arriesga sesiones inválidas, pérdida de acceso interno o uso de identidades reales. No hay autorización para cambiar variables: si no coinciden, preparar un cambio mínimo aparte y volver a validar antes de P5/P6.

Correos de prueba con códigos reservados acreditan mecánica de OTP, **no entrega de correo**. Para entrega real se requiere un buzón dedicado de pruebas, sin datos de personas, controlado por el propietario; no usar cuentas B2B reales ni direcciones .invalid.

## 4. Datos afectados y comprobación D4

### 4.1 Qué existe según antecedentes; qué no sabemos hoy

| Fuente/fecha | Datos sintéticos documentados | Límite |
| --- | --- | --- |
| [Staging, 2026-09-28/29](STAGING_QA_2026-09-28.md) | Dos negocios QA Horario, cuatro Users Clerk test y cinco Membership; posteriormente Client/Booking de ensayo y una factura, sin pago | El propietario autorizó editar QA durante días. Conteos y estados actuales desconocidos; preservar su trabajo. |
| [M1 C3, 2026-10-01](RESERVA_PUBLICA_M1_C3_CIERRE.md) y [verificación](evidence/m1-c3/verificacion-final.json) | Dos negocios dedicados M1; tres reservas PENDING de aquel ensayo, cero opt-in/dispatch en ese conjunto | No sumar esos tres a un total actual ni suponer que QA completa carece de correo/finanzas. |
| [C1/C2 M2](M2_C1_CIERRE.md), [C2](M2_C2_CIERRE.md) | Datos M2 en contenedores desechables eliminados | No acredita Clients, claims, recibos ni nuevas identidades M2 existentes hoy en Cutover QA. |
| Vínculos A0.6-A | El modelo Client.userId existe desde migración 17 | Cantidad, coherencia y distribución actual pendientes. Ninguna lectura local permite afirmar cero vínculos. |

Migración 28 añade a **todos** los Clients existentes/nuevos:
`customerAccessBlocked=true`, `customerHistoryAmbiguous=false`, `customerBookingRevision=0`; CHECK de revisión, índice paginado, CustomerOperation con FKs/CHECKs/índices y dos triggers. No hace backfill de identidad, fusión o clasificación de históricos ni modifica reservas/Users/Memberships/Client.userId.

La adición de columnas/índice y los locks pueden afectar una tabla grande. Medir tamaño/tiempo en restauración y fijar una ventana acotada; no normalizar datos para evitar fallos. Un vínculo anterior **no habilita automáticamente historial** al migrar: necesita claim válido posterior.

### 4.2 Inventario agregado previsto, sin ejecutarlo

P0 usará conexión QA validada, READ ONLY, timeout y salida agregada. Los nombres de servicio PostgreSQL siguientes son **alias propuestos, no existentes/verificados**: el operador debe crearlos/revisarlos fuera de Git, con CA y passfile 0600, pooler de sesión del proyecto QA y roles distintos. No pasar URLs/contraseñas en argumentos. No volcar errores crudos de conexión.

~~~sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '30s';
SELECT
  (SELECT count(*) FROM public."Client") AS clientes,
  (SELECT count(*) FROM public."Booking") AS reservas,
  (SELECT count(*) FROM public."Client" WHERE "userId" IS NOT NULL) AS clientes_vinculados,
  (SELECT count(*) FROM public."Client" c WHERE EXISTS
    (SELECT 1 FROM public."Booking" b
     WHERE b."clientId"=c."id" AND b."organizationId"=c."organizationId")) AS clientes_con_reservas,
  (SELECT count(*) FROM public."Client" c
   JOIN public."User" u ON u."id"=c."userId"
   WHERE u."clerkUserId" IS NULL) AS vinculos_sin_clerk;
WITH candidatos AS (
  SELECT c."id", c."organizationId", c."phone"
  FROM public."Client" c
  WHERE c."phone" IS NOT NULL AND c."phone" <> ''
    AND EXISTS (SELECT 1 FROM public."Booking" b
      WHERE b."clientId"=c."id" AND b."organizationId"=c."organizationId")
), grupos AS (
  SELECT "organizationId", "phone", count(*) AS fichas
  FROM candidatos GROUP BY "organizationId", "phone" HAVING count(*) > 1
)
SELECT count(*) AS grupos_con_contacto_compartido,
       coalesce(sum(fichas),0) AS fichas_en_esos_grupos FROM grupos;
COMMIT;
~~~

No salen nombres, contactos, UUID, slugs privados ni filas. Agrupa por teléfono exacto almacenado como la señal D4; no introduce normalización ni convierte un grupo en una identidad. Antes/después se cotejarán **privadamente** huellas de todos los campos anteriores de User/Client/Booking y relaciones A0.6-A. Para Client después de migrar, excluir solo las tres columnas nuevas del JSON canónico; antes no existían. Orden por id COLLATE "C", nombres de columnas ordenados y digest en memoria protegida. Evidencia versionada: conteos, igualdad booleana y hash de artefacto cifrado; no huellas de contactos, filas o claves de vínculo.

Comprobar también inválidos tenant/Client/User/FK por conteos agregados y si hay datos sin clasificación sintética. Si hay desconocidos, conservarlos, no usarlos como fixtures y parar la creación de pruebas hasta acotar negocios dedicados. Ningún censo retrospectivo prueba que una sola ficha represente una sola persona.

### 4.3 Matriz D4 prevista, sobre fixtures nuevos autorizados

Tras migración, todos los Clients preexistentes deben seguir vinculados igual y bloqueados; CustomerOperation vacía al aplicar, sin cuarentena automática retroactiva. **Ambiguous=false inicial no significa historial seguro.**

| Caso controlado | Resultado exigido |
| --- | --- |
| Invitado con ficha inequívoca → claim válido nuevo | Booking PENDING conservada; claim 201, Client vinculado y blocked=false/ambiguous=false; lectura propia 200. |
| Replay mismo vínculo habilitado | Claim 200; sin otro User, vínculo o Booking ni auditoría duplicada. |
| Otra ficha del mismo tenant, igual teléfono, con reservas | Claim puede ser exitoso, pero ficha reclamada ambiguous=true y blocked=true; lista/detalle/perfil 404 neutro; no prometer que se marca también la otra ficha. |
| Quitar síntoma en fixture y repetir claim | Cuarentena persiste; no se libera por eliminar duplicado/cambiar teléfono. |
| Teléfono igual en otro tenant; otra ficha sin reservas | No activa por sí solo la señal automática; no cruza tenants. |
| Mezcla confirmada dentro de una ficha, marcada bajo autorización asistida | ambiguous=true y blocked=true; claim no permite historial. Sin endpoint administrativo nuevo. |
| Intentar solo blocked=false estando ambiguous=true | Trigger conserva bloqueo; consulta exige además ambiguous=false. Ensayo SQL solo en clon/fixture autorizado. |
| Cambiar/anular Client.userId, incluso intentando desbloquear a la vez | Trigger bloquea; ambas identidades carecen de lectura hasta claim válido autorizado; identidad ajena no puede reasignar. |
| Correo no verificado/no coherente o vínculo ajeno | Claim falla con rechazo existente, no libera ni fusiona; Booking invitada permanece. |
| Una ficha con reservas de varias personas, sin señal registrada | **Limitación reproducida:** el detector no puede distinguirlas. Caso demuestra el bloqueo de Paso 8, no aprobación de D4 integral. |

Fail injection de auditoría/transacción y cambios de vínculos se ensayan en clon desechable; no instalar triggers de fallo ni modificar fichas existentes en QA. No ejecutar los harness locales contra Supabase: [customer-db-invariants.cjs](../../apps/api/test/customer-db-invariants.cjs) exige loopback/rol/base desechables y escribe evidencia previa; extraer consultas de catálogo revisadas a un procedimiento nuevo autorizado, sin sobreescribir evidencia C1.

## 5. Respaldo, restore aislado y rollback

### 5.1 Condiciones y custodia

El backup M1 anterior consta como eliminado ([cierre](RESERVA_PUBLICA_M1_C3_CIERRE.md)); su hash histórico no sirve de respaldo nuevo. **No migrar sin exportación nueva y restore comprobado.**

Propuesta P2: copia local cifrada `.tmp/m2-c3/qa-before.dump.gpg`, ignorada y acceso restringido, hash SHA-256 y manifest sanitizado. Nunca Git, Vercel, OCI ni otro almacenamiento sin autorización propia. Frase/clave desde custodia segura del propietario, nunca argumentos, logs o Markdown; comprobar que puede recuperarla fuera del proceso de ejecución. Retener cifrado hasta aprobación expresa C3 y decisión separada de limpieza. Sin plano persistente: pipes binarios Bash, no pipelines nativos PowerShell que puedan transformar bytes. Exportación/cifrado se ejecutarán desde el equipo del propietario con cliente PG17/Bash disponible y acceso TLS a QA; el dump no pasa por la VM OCI. Si esas herramientas no están disponibles, preparar una alternativa revisada antes de P2, sin instalar ahora.

QA histórica es PG17. Cliente/destino PG17 de imagen oficial **fijada por digest y validada en P0**; si la versión viva difiere, parar y revisar compatibilidad. El dump public no incluye todos los esquemas de Supabase ni globals: conservar inventario protegido de extensiones, ownership, roles/ACL y reconstrucción autorizada. No presentar restore sin owner/ACL como prueba de restauración de permisos. No exportar hashes de passwords con pg_dumpall.

### 5.2 Secuencia de respaldo prevista

**Regla vigente posterior para P2:** la autorizacion del propietario registrada en §17 reemplaza exclusivamente el congelamiento de P2. P2 usa snapshot REPEATABLE READ READ ONLY con servicios en marcha, sin stop/start/restart ni watchdog ni ventana de 90 minutos. El corte bajo congelamiento, con dump nuevo, hash, censo y restore verificado, es requisito obligatorio de P3b inmediatamente antes de migrar; requiere su autorizacion separada. Las secuencias originales y los intentos anteriores se conservan como historia, no como permiso para detener servicios en P2.

1. Ventana del propietario sin edición de QA. Capturar imagen/configuración API anterior e ID de Preview actual. Congelar escritores QA: API y worker staging; ninguna unidad productiva ni Caddy. Inventariar sesiones y transacciones con salida agregada, sin query/cuerpos; no matar sesiones automáticamente.
2. Migrador QA con TLS verify-full/CA y transacción **REPEATABLE READ READ ONLY** abierta exporta `pg_export_snapshot()`. Mantenerla viva durante el dump y el censo completo. Tokens de snapshot y archivos internos no se versionan.
3. Misma snapshot para pg_dump y comparación; no comparar un origen cambiante con un snapshot diferente como si fuera el del backup. Ensayo previo acota duración, memoria y espacio; no ignorar tablas ni errores.
4. Cifrar el flujo y comprobar todos los exit codes; SHA del cifrado; comprobar lectura del archivo cifrado y restore completo aislado.
5. Contenedor sin red/puertos/mounts del usuario, datos tmpfs y sin proveedores. Crear btree_gist fuera de public como antecedente M1, más las extensiones realmente necesarias verificadas. Comparar todas las tablas public, ledger completo/checksums, columnas/constraints/índices/triggers, conteos y huellas de snapshot. Verificar también roles/grants mediante un ensayo separado en clon con credenciales sintéticas y SQL revisado.
6. Ensayar 27→28, permisos, D4 y rollback de código en ese clon, conservando baseline. El backup restaurado es fuente protegida de recuperación; **QA funcional usa únicamente fixtures sintéticos**.
7. Retirar solo contenedores propios y plano temporal si lo hubo; verificar ausencia de volúmenes/puertos y hash cifrado conservado. Si falla una comparación, parar, conservar cifrado y no migrar.

Plantillas de comandos **NO ejecutadas** (Bash; variables/servicios deben estar validados y sin secretos en stdout):

~~~bash
# Sesión fuente A, mantener abierta hasta completar dump/censo:
psql -X -v ON_ERROR_STOP=1 "service=kortek_qa_migrator"
# Dentro: BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
# SET LOCAL statement_timeout='120s'; SELECT pg_export_snapshot();
# El censo de tablas usa esa transacción. COMMIT únicamente al finalizar.

# Sesión B; SNAPSHOT_QA solo en memoria. CRED_FD_GPG es un descriptor seguro.
set -o pipefail
PGOPTIONS='-c default_transaction_read_only=on' \
pg_dump --dbname="service=kortek_qa_migrator" --schema=public \
  --format=custom --no-owner --no-privileges --snapshot="$SNAPSHOT_QA" \
| gpg --batch --pinentry-mode loopback --passphrase-fd "$CRED_FD_GPG" \
  --symmetric --cipher-algo AES256 --output "$BACKUP_QA_GPG"
sha256sum "$BACKUP_QA_GPG"

# Host de restore aislado; nombre exclusivo no existente, digest PG17 aprobado:
docker run --detach --rm --name kortek-m2-c3-restore \
  --network none --read-only \
  --tmpfs /var/lib/postgresql/data:rw --tmpfs /var/run/postgresql:rw \
  --tmpfs /tmp:rw --env POSTGRES_HOST_AUTH_METHOD=trust \
  "$PG17_IMAGE_ID"
docker exec kortek-m2-c3-restore pg_isready -U postgres
# Solo contenedor nuevo vacío: retirar public para que lo recree el dump.
# EXT_SCHEMA_QA debe ser el namespace fuente verificado, distinto de public.
docker exec -i kortek-m2-c3-restore psql -X -v ON_ERROR_STOP=1 -U postgres \
  -d postgres -v extension_schema="$EXT_SCHEMA_QA" <<'SQL'
DROP SCHEMA public;
CREATE SCHEMA IF NOT EXISTS :"extension_schema";
CREATE EXTENSION btree_gist SCHEMA :"extension_schema";
SQL
gpg --batch --pinentry-mode loopback --passphrase-fd "$CRED_FD_GPG" \
  --decrypt "$BACKUP_QA_GPG" \
| docker exec -i kortek-m2-c3-restore pg_restore -U postgres \
  -d postgres --single-transaction --exit-on-error --no-owner --no-privileges
# Cotejo SQL por stdin, solo conteos/igualdad; no filas.
docker stop kortek-m2-c3-restore
docker ps -a --filter name=kortek-m2-c3-restore --format '{{.Names}}'
~~~

Trust es exclusivamente del contenedor sin red; nunca en QA. Cada invocación GPG recibe descriptor **nuevo/reabierto**; no reutilizar uno consumido. Si btree_gist fuente reside en public, preparar una TOC de restore revisada que resuelva esa dependencia sin doble CREATE SCHEMA; no ejecutar la plantilla anterior. El digest de imagen, herramientas, censo de snapshot y permisos tmpfs deben ensayarse antes de dar por ejecutable la recuperación; no descargar/instalar ahora. El script versionado [verify-backup-snapshot.sql](../../apps/api/ops/verify-backup-snapshot.sql) abre su propia transacción y no importa snapshot: no ejecutarlo sin adaptación revisada. El censo debe inyectarse en sesión A o importar el mismo snapshot, usar orden COLLATE "C" y mantener huellas privadas.

### 5.3 Rollback por tipo de fallo

| Fallo | Respuesta propuesta, con autorización propia | Prueba y límite |
| --- | --- | --- |
| Backup/restore/censo fallan antes de migrar | No tocar schema; reanudar solamente servicios QA congelados con imagen/configuración anterior | Salida del baseline; backup fallido no se acepta. |
| Migración aborta por lock/constraint/drift | Mantener escritores QA detenidos; leer ledger y catálogos, conservar evidencia; no migrate resolve ni edición manual de ledger | El SQL tiene BEGIN/COMMIT, pero un fallo Prisma puede dejar registro fallido. Un fallo no autoriza reintento o reparación automática. |
| API nueva falla con schema 28 íntegro | Reponer exclusivamente KORTEK_API_IMAGE y APP_RELEASE QA previos mediante gestor protegido; reiniciar solo API staging; **conservar schema/recibos/vínculos** | Ensayar imagen anterior real contra clon migrado, lectura/alta pública y claims; las columnas extra no garantizan compatibilidad del código anterior. |
| Web C2 falla | Reasociar alias QA al deployment previo ya capturado y compatible, mantener API/schema aprobados; no push inverso ni force-push | Artefacto/configuración/sesión correcta y recorrido anterior. Un auto-deploy de rama puede volver a mover alias: coordinar por Vercel sin alterar producción. |
| Clerk Development incompatible | Propietario repone exactamente opciones previas documentadas; detener pruebas M2 y volver al Preview anterior si procede | Login/recovery B2B sintéticos y sesión API; cambiar opciones no elimina Users/sesiones ya creados. Revocación/limpieza sintética exige autorización específica. |
| Corrupción de datos/schema requiere restore | Parar API/worker QA y todos sus escritores; tomar copia cifrada del estado fallido; conciliar deltas posteriores; restore en destino QA nuevo/aislado probado | Restaurar sobre QA real o cambiar destino requiere aprobación separada, roles/ACL correctos, no descartar trabajo posterior ni copiar a producción. |

La [inversa desechable](../../apps/api/prisma/rollback/customer-stage-one.disposable.sql) elimina recibos, columnas y controles. **No usarla en QA operativo**; el ledger quedaría incompatible. Rollback preferido es de código. Volver al backend anterior reintroduce límites/posible señal legacy D8: mantener C2 retirado y limitar exposición durante la incidencia; no declarar esa reversión equivalente a la seguridad nueva.

Si entre P2 y P3 se reanudan escritores QA, el backup anterior deja de representar el nuevo corte: repetir exportación/cifrado/cotejo con snapshot actual o conciliar deltas bajo autorización antes de migrar. Si se mantienen congelados esperando la autorización siguiente, registrar explícitamente la indisponibilidad QA y el plazo de la ventana; no prolongarla por inferencia.

RPO propuesto: cero respecto al corte previo si se conservan congeladas escrituras; tras reabrir, no hay RPO cero garantizado sin conciliación. RTO se medirá en ensayo; no inventar minutos. La revisión local C1 de inversa no prueba rollback del contenedor realmente desplegado ni restore operativo de permisos.

## 6. Orden de operación y autorizaciones separadas

**Regla vigente posterior para P2:** la autorizacion del propietario registrada en §17 reemplaza exclusivamente el congelamiento de P2. P2 usa snapshot REPEATABLE READ READ ONLY con servicios en marcha, sin stop/start/restart ni watchdog ni ventana de 90 minutos. El corte bajo congelamiento, con dump nuevo, hash, censo y restore verificado, es requisito obligatorio de P3b inmediatamente antes de migrar; requiere su autorizacion separada. Las secuencias originales y los intentos anteriores se conservan como historia, no como permiso para detener servicios en P2.

**Todos los comandos de esta sección son previstos, no usados en el preflight.** Las autorizaciones son unitarias: completar y presentar la evidencia de un punto no autoriza el siguiente. No ejecutar una secuencia completa por aprobar el documento. Si un placeholder no está resuelto/verificado, el comando está detenido.

| Punto | Alcance a autorizar por separado | Comando/acción prevista | Qué demuestra y punto de parada | Reversión |
| --- | --- | --- | --- | --- |
| P0 | Lectura viva QA y metadatos de infraestructura; aprobación explícita C2 antes de activación | Comandos §6.1; inventario agregado §4.2; propietario aporta baseline productivo protegido o autoriza aparte su lectura de metadatos | Destino QA efectivo, 27 migraciones esperadas/no drift, roles, estado de servicios, versión, tabla/datos actuales y Preview previo. **Parar** si ref distinta, configuración mezclada, ledger fallido, registros desconocidos, límites de ventana o C2 sin aprobar | No hay mutación de negocio; cerrar conexiones. No inferir permiso de cambios. |
| P1 | Correctivo operativo local de grants/matriz/gate y ensayo desechable | Cambios mínimos §2.3; pnpm API; migración 27→28 y login runtime en clon aislado | SELECT/INSERT/DELETE mínimos de recibos, negativos, triggers y 37 tablas; API anterior compatible. **Parar** si requiere superusuario runtime, permisos amplios o cambio de contrato | Preservar trabajo ajeno; retirar solo el ensayo propio; conservar diff para revisión, sin publicar. |
| P2 | Congelar QA, exportar/cifrar backup, restore y ensayo de rollback aislado | §5.2; `sudo systemctl stop kortek-api-staging kortek-email-worker-staging` | Fuente estable, hash nuevo, restore completo y custodia recuperable. **Parar** si cualquier error, desigualdad o escritor no controlado; no migrar | Reanudar unidades QA previas en orden validado; conservar copias protegidas fallidas. |
| P3a | Construir artefacto API QA revisado, sin activarlo ni publicar web | `git archive` de SHA aprobado; build ARM §6.2 | Imagen inmutable con API C1 y correctivo operativo revisado, sin dotenv/datos. **Parar** por build/drill fallido o release distinto | Conservar imagen actual; no tocar servicios. |
| P3b | Aplicar migración 28 **solo QA**, SQL mínimo de permisos revisado y validación DB | §6.2 migrate deploy con migrador; GRANT suplementario; SQL/catálogos/runtime gate | Ledger 28/checksum, 37 tablas, invariantes y datos antiguos iguales; runtime mínimo. **Parar** en primer fallo; no arrancar API nueva | §5.3; no inversa/resolve automáticos. Una base migrada puede quedar estable con servicios QA detenidos hasta decisión. |
| P3c | Activar **solo API QA** y verificar compatibilidad web previa | Cambiar solo image/release QA con gestor protegido; `sudo systemctl restart kortek-api-staging`; HTTP §6.3 | Servicio/release/rol correctos; contrato público anterior y D8; web anterior operable. **Parar** por 5xx, grant ausente, contrato incompatible o configuración distinta | Imagen/config QA anterior con schema aditivo, ya ensayada; no tocar worker/Caddy/producción. |
| P4 | Propietario ajusta Development y aprueba identidades sintéticas de prueba | Panel §3; Codex solo lectura y pruebas autorizadas posteriores | Configuración real y métodos compatibles B2B. **Parar** ante impacto global, otra instancia, falta de acceso/custodia o requerimientos extra | Propietario restaura opciones anteriores; no borrar cuentas ajenas. |
| P5 | Sesiones/códigos reales y pruebas API C1/D4/D8 con datos exclusivamente sintéticos dedicados | Requests §6.3 y matriz §4.3; SDK real desde superficie de prueba aislada autorizada | Sesión/issuer/azp/revocación reales; ownership, 404, cuarentena y operaciones atómicas. **Parar** por exposición, duplicación, enumeración o regresión interna | Conservar reservas de resultados inciertos, no repetir POST; retirar solo procesos de ensayo, imagen API anterior si corresponde; limpieza de fixtures separada. |
| P6a | Último: preparar publicación web QA, revisar commit(s) y variables Preview | Gates web §6.4; revisar diff y SHA exacto del candidato | API/Clerk validados y aprobados para seguir; C2 aprobado, evidence sanitizada, entorno público correcto. **Parar** si artefacto/alias/config no corresponde | Conservar C2 local; no push. |
| P6b | Push exclusivamente QA y deployment automático Vercel | `git push origin HEAD:refs/heads/ai/antigravity-qa` solo tras autorización expresa de este punto | Vercel Preview Ready, SHA fuente exacto, alias QA y config correctos; confirmar SHA local=remoto con consulta autorizada | Preview anterior por alias; nunca main, force-push ni reescritura. |
| P7 | QA funcional/visual física y accesible; auditoría y decisión de cierre C3 | Matriz §7, sin ejecutar producción | Cada caso con dispositivo/versión/resultado; propietario aprueba expresamente o queda en revisión | Regresar web al Preview anterior si hay bloqueantes; mantener datos/backup y documentar pendientes. |

P2 congela **también el worker QA** porque escribe DB y puede enviar. Su reinicio posterior será una subautorización específica, después de comprobar cola, destinatarios exclusivamente sintéticos y compatibilidad de su imagen anterior con schema 28. No actualizarlo junto con el API. Si necesita cambio de image/configuración o hay destinatarios desconocidos, parar. Las pruebas M2 mantienen opt-in desmarcado; el correo de códigos Clerk es independiente de Resend. La reserva pública QA estaba abierta: detener API implica indisponibilidad temporal QA, que el propietario debe incluir en la ventana.

### 6.1 P0: lecturas vivas previstas

Desde consola OCI autorizada, sin exportar Environment, comandos ni inspect completos:

~~~bash
systemctl show kortek-api-staging kortek-email-worker-staging \
  --property=ActiveState,SubState,MainPID,NRestarts
sudo -u opc env XDG_RUNTIME_DIR=/run/user/1000 \
  podman inspect --format '{{.Name}} {{.Image}} {{.State.Status}}' kortek-api-staging
sudo sha256sum /etc/kortek-api-staging/runtime-env \
  /usr/local/libexec/kortek-api-staging-run.sh \
  /etc/systemd/system/kortek-api-staging.service
~~~

Hash del archivo protegido es evidencia de igualdad, no su contenido. APP_RELEASE, usuario/ref DB, DEPLOY_ENV, issuer, orígenes y flags deben verificarse **dentro de un helper de allowlist revisado previamente**, que compare en memoria credencial/entorno efectivo y devuelva booleanos/metadatos seguros. No existe todavía un helper específico M2 C3: preparar su texto en P1 para revisión; no usar `podman inspect` completo ni imprimir DATABASE_URL. Lectura de metadatos productivos en VM compartida únicamente con autorización específica; sin conexión a la DB productiva ni proveedor productivo. Sin esa autorización, contraste con baseline firmado/fechado del propietario y registrar el límite.

Con migrador QA validado y TLS/passfile protegidos:

~~~bash
psql -X -v ON_ERROR_STOP=1 "service=kortek_qa_migrator"
~~~

SQL previsto dentro de transacción READ ONLY:

~~~sql
BEGIN READ ONLY;
SET LOCAL statement_timeout='30s';
SELECT current_database(), current_user, current_setting('server_version');
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
FROM pg_roles WHERE rolname IN ('kortek_migrator','kortek_runtime');
SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS aplicadas,
       count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS no_terminadas,
       count(*) FILTER (WHERE rolled_back_at IS NOT NULL) AS revertidas
FROM public."_prisma_migrations";
SELECT migration_name, checksum, finished_at IS NOT NULL AS terminada,
       rolled_back_at IS NOT NULL AS revertida
FROM public."_prisma_migrations" ORDER BY migration_name;
COMMIT;
~~~

No seleccionar columna `logs` del ledger. Inventariar ownership/memberships y privilegios efectivos, default ACL, extensiones, tamaños agregados, constraint/index definitions y triggers sin filas de negocio. Ledger lo lee migrador, nunca conceder SELECT al runtime. P0 verifica que migración 28 falta y anteriores coinciden con código: si ya figura aplicada o cambió checksum, **detener y reconciliar**, no duplicar aplicación ni reparar por inferencia.

El siguiente CLI desde `apps/api` es una plantilla futura: **QA_MIGRATOR_ENV** significa ruta protegida preparada por el operador, DATABASE_URL migrador solo en ese proceso; no usar .env local/habitual:

~~~bash
node --env-file="$QA_MIGRATOR_ENV" node_modules/prisma/build/index.js migrate status
node --env-file="$QA_MIGRATOR_ENV" node_modules/prisma/build/index.js migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --exit-code
~~~

Antes de 28 el status informa pendiente y el diff respecto a schema 28 debe mostrar **solo el delta esperado**; pueden terminar distintos de 0 por ese delta. Registrarlos como diagnóstico esperado, **no como validación pasada**. Después de 28 status/diff deben terminar 0, sin pendientes ni drift. Sin CLI disponible, parar y preparar solución local revisable; nunca editar ledger como alternativa rápida.

### 6.2 P3: build, migración, grants y activación previstos

Contexto mínimo desde SHA aprobado (base actual más correctivo operativo autorizado, si procede), sin publicar la rama:

~~~bash
git archive --format=tar --output="$CONTEXTO_API_QA_TAR" "$SHA_API_APROBADO" \
  package.json pnpm-lock.yaml pnpm-workspace.yaml \
  apps/api/package.json apps/api/prisma apps/api/src \
  apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/nest-cli.json \
  ops/oci-api/api.Containerfile apps/api/ops/production-startup-drill.cjs
sha256sum "$CONTEXTO_API_QA_TAR"
# Transferir únicamente código aprobado y extraer en directorio exclusivo revisado.
podman build --network host --cpu-period 100000 --cpu-quota 150000 \
  --memory 3g -f ops/oci-api/api.Containerfile \
  -t "localhost/kortek-api:$SHA_API_APROBADO" .
podman image inspect --format '{{.Id}}' "localhost/kortek-api:$SHA_API_APROBADO"
podman run --rm --network none --read-only --tmpfs /tmp:rw \
  --entrypoint node "$IMAGEN_API_QA_NUEVA" ops/production-startup-drill.cjs
~~~

OCI compartida exige ventana y presupuesto de CPU/memoria para no afectar producción; el límite de build no demuestra ausencia de impacto. No modificar Caddy, unidades productivas ni delegación systemd en este alcance. El Containerfile usa lockfile e instalación congelada dentro de la imagen; no instalar dependencias en el checkout ni cambiar versiones. No copiar secret files al contexto.

Con escritores congelados, backup restaurado y candidato aprobado, en proceso migrador separado:

~~~bash
# Revalidar ref/rol y hash 28 antes, sin imprimir URL.
# PGOPTIONS read-only del respaldo no se hereda en la sesión de migración.
node --env-file="$QA_MIGRATOR_ENV" node_modules/prisma/build/index.js migrate deploy
~~~

Solo se espera **27→28**. Timeout/ventana de locks se fijarán según ensayo del clon antes de autorizar ejecución; si el ensayo no cabe en la ventana, parar. El nuevo runtime no se activa antes de schema/grants; la imagen puede construirse previamente sin iniciarla.

SQL suplementario propuesto, a revisar y aplicar como owner migrador de QA:

~~~sql
BEGIN;
SET LOCAL lock_timeout='5s';
GRANT SELECT, INSERT, DELETE ON TABLE public."CustomerOperation" TO kortek_runtime;
COMMIT;
~~~

Nada de GRANT ALL, default DML o rol administrador en la API. La matriz completa/gate deben incluir CustomerOperation=SID y 37 tablas, preserve Invoice/Payment/AuditLog sin DELETE y comprobar funciones/triggers con runtime real. El comando siguiente **solo** tras correctivo revisado, con servicio runtime QA:

~~~bash
psql -X -v ON_ERROR_STOP=1 "service=kortek_qa_runtime" \
  -f apps/api/ops/verify-runtime-role.sql
~~~

Controles adicionales de catálogo: ledger 28/checksum local exacto; Client_customer_revision_check; CustomerOperation_valid_check; PK/unicidad CustomerOperation_context_key y FKs tenant Client/Booking más User/Organization; índices CustomerOperation_expiresAt_idx y Booking_customer_page_idx; triggers Client_customer_access_relink y Booking_customer_revision habilitados con definición correcta; defaults/columnas según migración; todos los conteos/huellas de campos anteriores iguales. Nombres solos no bastan: revisar definiciones/validación/owner. UPDATE de Booking en fixture debe incrementar revisión e invalidar cursor. Recibos vencidos se purgan acotadamente sin borrar Bookings.

Tras aprobación DB, operador cambia solo dos valores QA image/release sin imprimir el archivo, conserva copia root-only previa y ejecuta:

~~~bash
sudo systemctl restart kortek-api-staging
systemctl show kortek-api-staging --property=ActiveState,SubState,MainPID,NRestarts
~~~

Validar imagen inmutable, APP_RELEASE del artefacto, DB runtime QA, configuración restante igual y web anterior compatible. No aceptar “active” como prueba de rutas/DB. El worker se mantiene congelado hasta su subautorización. Publicar/reasociar web antes de este punto está prohibido.

### 6.3 P3c/P5: contratos y pruebas API previstas

Requests desde cliente de ensayo revisado, con sesiones/keys únicamente en memoria. No guardar HAR, Authorization, cookies, bodies ni OTP. Requests de GET autenticado consumen contadores: son operaciones de QA futura, **no lecturas ejecutadas ahora**. El helper debe registrar solo método/ruta sin IDs/contactos, status, igualdad y conteos agregados; no ejecutar E2E originales contra una DB existente.

| Request/caso | Resultado exigido |
| --- | --- |
| GET `/public/<slug_sintetico>/booking-data`, disponibilidad M1 y OPTIONS desde origen QA | 200/datos elegibles y 204/CORS exacto, RequestId, no-store; web anterior consume sin regresión. |
| GET `/customer/businesses` sin sesión; token inválido/issuer ajeno/revocado | 401; indisponibilidad proveedor/DB 503 recuperable. No retirar azp/issuer para lograr éxito. |
| GET `/customer/businesses`, `/customer/<slug>/bookings?view=upcoming&limit=20`, history, detalle y profile | Solo vínculo explícito habilitado; lista por defecto 20/máximo 50, cursor opaco; perfil sin notas/identidad/finanzas; Cache-Control private,no-store. |
| Claim `POST /auth/clerk/customer/claims` con bookingId y organizationSlug en memoria | Matriz D4 §4.3 y A0.6-A; vínculo no otorga Membership. |
| ID ajeno/no existente, slug sin vínculo, Client bloqueado; cinco roles sin Client propio | Mismo 404 privado, o lista de negocios sin ese vínculo; rol interno no habilita B2C. Personal enlazado solo puede ver su Client propio. |
| GET con cursor manipulado/vencido, de otro contexto, tras revisión cambiada | 400/404/409 según contrato; páginas descartadas, sin mezclar historias. |
| PATCH `/customer/<slug>/profile`, Idempotency-Key UUID | Nombre/teléfono propios, correo solo lectura; mismo comando/key 200 sin otra auditoría, distinta entrada 409; rollback íntegro si falla recibo/auditoría en clon. |
| POST `/customer/<slug>/bookings`, body DTO real serviceId/professionalId/startTime, key opaca | PENDING, catálogo/agenda/precios vigentes; no aceptar User/Client/organizationId libres, estado ni precio. Misma key concurrente una Booking/recibo/evento, replay 200; conflicto de slot 409 sin parcial. |
| Timeout/respuesta perdida de POST/PATCH | Comprobar mismo body/key dentro de 24 h, no duplicar; fuera del TTL revisar resultado/asistencia, nunca reenvío automático. |
| D8 legacy secundario, nuevo/existente/fallo | accountCreated=false y accountCreationError=null con reserva persistida; comparar esquema/status sin cuerpos. Alta invitada C2 omite password/createAccount. No registrar contraseñas sintéticas. |
| Límites compartidos y revocación | 429 con Retry-After; sin reset de buckets, sin exceder ventana/fixtures autorizados; sesión revocada rechazada, aislamiento al cambiar contexto. |

D8 nuevo/existente necesita slots distintos y cuerpos idénticos salvo la identidad sintética de prueba; no comparar Bookings completas. Fallos reales inyectados/concurrencia destructiva se ensayan en clon, y solo vectores acotados autorizados en QA. Latencia se mide con muestras declaradas; no afirmar tiempo constante. La revisión Clerk debe cubrir respuestas/red del proveedor para correo existente/inexistente: neutralidad del texto por sí sola no acredita D1.

P5 precede web QA. Usar navegador de ensayo aislado con SDK/middleware reales y sesiones Development, con origen ya autorizado; si hace falta un nuevo origen, Preview temporal o variable, requiere subplan y autorización propia. No ampliar authorized parties ni reutilizar la web QA anterior como si tuviera C2. Si no existe esa superficie, parar y preparar una antes de P5/P6.

### 6.4 P6: validaciones web y publicación previstas

Con configuración staging coherente, sin conexión a datos reales desde tests y sin instalar paquetes:

~~~powershell
pnpm --filter web type-check:clean
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build --webpack
git status
git diff --check
git diff --stat
git diff
~~~

P1 validaciones backend previstas en entorno aislado: `pnpm --filter api type-check`, `pnpm --filter api lint`, `pnpm --filter api test --runInBand`, `pnpm --filter api build` y E2E de customer/regresiones con guards del entorno desechable, nunca DATABASE_URL habitual. Solo exit 0 satisface gates; omitidas no cuentan como cobertura.

El candidato web final se fijará por SHA tras aprobaciones, no se inventa en este plan. Índice por rutas explícitas solo si se autoriza commit, revisar diff staged/check/stat completo; mostrar exactamente qué commits locales enviaría el push. La prohibición actual permanece: **no crear commit ni push de este preflight**.

Tras autorización P6b únicamente, push QA dispara Vercel. Registrar deployment ID, branch, source SHA, Ready, build con API/Clerk QA, alias, cabeceras privadas/noindex y error/console sanitizados. Si protección Preview impide acceso desde móvil, detener y pedir al propietario acceso mediante el mecanismo existente; no desactivar SSO ni rebajar protección. QA física requiere el artefacto final desde alias QA, no una copia local con SDK controlado.

## 7. Plan de QA real y aprobación

### 7.1 Equipos y evidencia

Mínimo físico: **iPhone con Safari y VoiceOver**, **Android con Chrome y TalkBack**, además de escritorio con teclado y zoom de navegador real 200 %. Registrar modelo, versión SO/navegador/lector, tamaño, fecha, deployment SHA, rol/tenant sintéticos y resultado por caso. Rotación, teclado virtual, cambio a correo y retorno desde otra app, cerrar/reabrir, back/forward y páginas restauradas de memoria deben comprobarse.

Zoom físico: Safari Page Zoom 200 % y gesto de ampliación; Android zoom de página/texto/accesibilidad y gesto disponible, documentando cómo se alcanza 200 % real. Si un dispositivo no ofrece 200 % mediante ese control, registrar limitación y probar otra combinación física; no sustituirlo con viewport reducido o CSS. Escritorio Ctrl/Cmd + '+' a 200 % acredita otra combinación, no cubre el móvil faltante.

Evidencia solo con datos sintéticos y sin código de correo, email visible, sesión, cookies, notas privadas o tokens. Capturas recortadas/sanitizadas, inspeccionadas antes de Git; no HAR completo. Consola mediante Web Inspector/depuración Android cuando esté disponible; si no puede inspeccionarse, ese punto queda pendiente y no se inventa “consola limpia”.

### 7.2 Casos mínimos por ambas plataformas

| Caso | Acción mínima | Criterio de aprobación |
| --- | --- | --- |
| Reserva invitada → cuenta → claim | Reservar, crear con nombre/correo sin contraseña, ir al correo y volver, verificar, consentir claim, leer detalle | Una Booking PENDING; resultado primario conservado incluso si falla cuenta/claim; no claim automático ni POST duplicado. |
| Entrada/recuperación/salida | Cuenta existente, código correcto/incorrecto/expirado, reenvío tras espera; logout correcto/fallido; atrás y retorno | Estado honesto, errores neutros y foco/announcements útiles; salida oculta datos antes y reintento si falla; sesión revocada rechazada por API. |
| Pérdida de referencia y return malicioso | Recargar/cerrar en éxito/acceso; retorno externo o de otro negocio | Asistencia sin búsqueda por contacto, sin identidad inferida; destino restringido, sin PII/claim en URL. |
| Lista y detalle | Vacío, >20 reservas sintéticas paginadas, Próximas/Historial, carga/error/cursor obsoleto | Sin duplicados/omisiones, partición/orden C1; descarta cursor al cambiar datos; tabs no activan con solo foco, selección perceptible y leída. |
| Perfil | Editar nombre/teléfono, null válido, nombre vacío, colisión y resultado incierto | Correo solo lectura; errores asociados; mismo body/key si reintenta; datos solo del Client/negocio propio. |
| Otra cita | Repetición con servicio/profesional vigente, retirado y negocio retirado; slot ocupado | Opciones/precio actuales; acción alternativa cuando corresponde; recurso retirado no se copia, 409 útil, PENDING y una sola reserva. |
| Privacidad/cuarentena | Dos identidades/dos negocios A→B→A, respuestas tardías, cambio rol/organización, pérdida vínculo y sesión, D4 ambiguo | Sin flashes/caché/contactos ajenos; 404 neutro y asistencia; claim exitoso no anuncia historial antes del GET autorizado. |
| Permisos internos | OWNER/ADMIN/RECEPTIONIST/BARBER y CUSTOMER con/sin vínculo | B2B sigue operable; cada sesión B2C solo ve su Client; ocultar UI no sustituye negativa backend. |
| Límite y offline | 429/Retry-After, offline/timeout, volver desde correo o segundo plano | Espera real sin bucle; sin éxito falso ni reenvío automático incierto, foco e instrucciones comprensibles. |
| Accesibilidad | VoiceOver/TalkBack con exploración y navegación, teclado externo/escritorio, reduced motion y zoom real | Labels/estado/tab seleccionado anunciados, orden lógico, errores enlazados y foco resumen, sin trampas; captcha también usable. |
| Presentación móvil | Teclado abierto, landscape/portrait, scroll, safe area y zoom | Sin recorte/overflow horizontal del flujo, controles y mensajes alcanzables; texto legible, targets ≥44 px en controles del flujo, sin selección solo por color. |
| Seguridad y transporte | Headers privados, noindex, error network esperado/inesperado, storage/caché al cambiar contexto | No-store y limpieza; ninguna PII propia persistida en URL/localStorage/sessionStorage ni log nuevo; sin excepciones o errores inesperados de consola. |

Contraste de texto/acciones ≥4,5:1 en estados pertinentes y foco visible; revisar que el correctivo C2 siga efectivo con SDK/captcha reales. No llamar auditoría WCAG completa a esta matriz.

**Salida de P7:** todos los casos obligatorios pasan con evidencia por dispositivo y sin hallazgos de privacidad/permisos/atomicidad/compatibilidad. Casos fallidos/omitidos o acceso físico ausente dejan C3 **EN REVISIÓN / INCOMPLETO**. El propietario revisa resultados y aprueba C3 expresamente; el build o los 310 tests históricos de C2 no la sustituyen. Esa aprobación solo sería QA M2 etapa 1; no abre producción, cancelación/reprogramación ni módulos nuevos.

## 8. Qué continúa bloqueando Paso 8

1. **D4: mezcla dentro de una misma ficha.** Un claim acredita Client/vínculo según contrato, no titularidad de cada Booking del historial. El detector cubre otra ficha con teléfono igual, no familias/personas acumuladas en un solo Client. Riesgo aceptado **solo para QA**, bloqueante para producción incluso si todos los casos C3 pasan. Vías autorizables según [C1](M2_C1_CIERRE.md): medición segura del riesgo real sin PII con revisión del propietario, D4-B con contrato/implementación propios, o acceso por Booking con prueba de titularidad individual. Ninguna se ejecuta aquí; no hay backfill/reparación masiva autorizada.
2. **Paginación del panel en el cliente.** [GET /bookings](../../apps/api/src/bookings/bookings.service.ts) → [query web](../../apps/web/lib/queries/bookings.ts) descarga sin take/skip/tope; [Por atender/Todas](../../apps/web/lib/booking-list.ts) filtran/ordenan localmente. Confirmado en el código actual. Antes de volumen real requiere contrato de filtrado/paginación servidor, estados/orden/prioridades, aislamiento por rol/tenant y pruebas de carga/estabilidad con volumen sintético. **No confundir con Mis reservas de M2**, que sí pagina mediante cursor/20–50 e índice. Aprobar su QA no salda la deuda del panel.

Otros pendientes operativos C3: inventario vivo, C2 aprobado, grants/matriz de 28, lock/ventana, backup nuevo/restore/roles y custodia, instancia Clerk exacta/compatibilidad B2B, entrega de códigos real, anti-enumeración proveedor, superficie de ensayo P5 y hardware. No están cubiertos por esta lectura. Cinco SELECT faltantes del backup rutinario y retención/recuperación operativa conservan su revisión propia. Legacy auth global, canal temporal D8, capacidad/costos proveedor, carga sostenida, tolerancia a fallos y 37 pruebas opt-in omitidas de C1 tampoco se declaran cubiertos. Etapa 2 permanece fuera de alcance.

## 9. Resultado y siguiente punto de decisión

Preflight entrega el inventario local/histórico, comandos futuros condicionados, evidencia requerida, paradas/rollback y matriz física. **No está Ready para ejecutar C3**: primero P0 y aprobación C2, luego P1/P2; API/schema/permisos antes de ajustes/pruebas Clerk, y **web QA al final**.

Ante ambigüedad: conservar datos/identidades/configuración, detener solo el paso dependiente y documentar; no adivinar estado ni ampliar permisos. El propietario podrá autorizar **P0** como siguiente unidad concreta; esta entrega no solicita ni consume esa autorización.

Estado final esperado de este trabajo documental: mismo HEAD/rama, índice vacío y solo `docs/quality/M2_C3_PREFLIGHT.md` sin seguimiento. Validación documental/Git y estado final observados se registran al completar §10. Ningún documento de control/historial se cambia: no ha cambiado estado de producto ni se ha ejecutado operación.

## 10. Registro exacto de lecturas de este preflight

Directorio de trabajo de todos los comandos: `C:\Users\Fraylin\Desktop\Kortek-Booking`; shell PowerShell. Cada bloque reproduce literalmente una invocación de lectura. Los `;` en algunas invocaciones separaron lecturas de archivos; no encadenaron mutaciones. No se ejecutaron los comandos previstos de §§4–6.

Códigos de salida: **0 excepto 5 y 19, que terminaron en 1**. El 5 no pudo iniciar rg.exe en Windows; se sustituyó por Select-String (7). El 19 leyó dos fuentes pero el nombre CustomerAuthScreen.tsx no existía; el inventario 20 permitió leer CustomerAuth.tsx en 21. Ninguno se cuenta como comprobación pasada. Algunas salidas largas fueron truncadas: se releyeron C2 y extractos aplicables; no se afirma revisión íntegra de todas las evidencias históricas ni de imágenes.

### 10.1 Comandos locales de lectura usados

**1.**

~~~powershell
git branch --show-current
~~~

**2.**

~~~powershell
git rev-parse HEAD
~~~

**3.**

~~~powershell
git status --short --branch
~~~

**4.**

~~~powershell
Get-Content -LiteralPath '.agents/skills/kortek-delivery/SKILL.md'
~~~

**5.**

~~~powershell
rg -n -C 3 'M2|C0|Clerk|A0.6|D4|migraci|QA' 'C:/Users/Fraylin/.codex/memories/MEMORY.md'
~~~

**6.**

~~~powershell
Get-Content -LiteralPath 'docs/README.md'; Get-Content -LiteralPath 'PROJECT_MASTER.md'
~~~

**7.**

~~~powershell
Select-String -LiteralPath 'C:/Users/Fraylin/.codex/memories/MEMORY.md' -Pattern 'M2|C0|Clerk|A0.6|D4|migraci|QA' -Context 2,2
~~~

**8.**

~~~powershell
Get-Content -LiteralPath 'PROJECT_MASTER.md' -TotalCount 130
~~~

**9.**

~~~powershell
Get-Content -LiteralPath 'docs/quality/M2_C2_CIERRE.md'
~~~

**10.**

~~~powershell
Get-Content -LiteralPath 'docs/quality/DELIVERY_GATES.md'; Get-Content -LiteralPath 'docs/quality/SECURITY_STANDARD.md'; Get-Content -LiteralPath 'docs/quality/DEFINITION_OF_DONE.md'
~~~

**11.**

~~~powershell
git ls-files '*AGENTS.md' '*M2*' '*deploy*' '*cutover*' '*Cutover*' '*ops*' '*migration*' '*docker*' '*Docker*' '*clerk*' '*Clerk*' '*backup*' '*BACKUP*' '*vercel*' '*package.json' '*.github*'
~~~

**12.**

~~~powershell
Get-Content -LiteralPath 'docs/quality/M2_C2_CIERRE.md'
~~~

**13.**

~~~powershell
Get-Content -LiteralPath 'docs/quality/DECISIONES_PROPIETARIO_2026_09_29.md'
~~~

**14.**

~~~powershell
Get-Content -LiteralPath 'ops/oci-api/README.md'; Get-Content -LiteralPath 'ops/oci-api/api-staging-run.sh'; Get-Content -LiteralPath 'ops/oci-api/kortek-api-staging.service'; Get-Content -LiteralPath 'ops/oci-api/Caddyfile'
~~~

**15.**

~~~powershell
Get-Content -LiteralPath 'docs/quality/M2_C1_CIERRE.md'; Get-Content -LiteralPath 'apps/api/prisma/migrations/20261003120000_customer_stage_one/migration.sql'
~~~

**16.**

~~~powershell
Select-String -LiteralPath 'docs/quality/STAGING_QA_2026-09-28.md','docs/quality/API_OCI_DESPLIEGUE.md','docs/quality/BASE_PREPRODUCCION_C1_EVIDENCIA.md','docs/quality/RESERVA_PUBLICA_M1_C3_CIERRE.md','CHANGELOG.md','BACKEND_CHANGES.md' -Pattern '^#|prirl|proyecto|migraci|kortek_migrator|kortek_runtime|Cliente|Client|D4|cuarentena' | Select-Object -First 150
~~~

**17.**

~~~powershell
Get-Content -LiteralPath 'apps/api/AGENTS.md'; Get-Content -LiteralPath 'apps/web/AGENTS.md'; Get-Content -LiteralPath 'apps/api/ops/README.md'
~~~

**18.**

~~~powershell
Get-Content -LiteralPath 'docs/quality/STAGING_QA_2026-09-28.md'; Get-Content -LiteralPath 'config/environments.yaml'; Get-Content -LiteralPath 'docs/quality/evidence/m1-c3/backup-verificado.json'
~~~

**19.**

~~~powershell
Get-Content -LiteralPath 'apps/api/src/auth/clerk-customer-claims.service.ts'; Get-Content -LiteralPath 'apps/api/src/auth/clerk/clerk-auth.config.ts'; Get-Content -LiteralPath 'apps/web/components/customer/CustomerAuthScreen.tsx' -ErrorAction SilentlyContinue
~~~

**20.**

~~~powershell
git ls-files 'apps/web/components/customer/*' 'apps/api/src/customer/*' 'apps/api/prisma/rollback/*' 'docs/quality/evidence/m2*' 'docs/quality/evidence/m1-c3/*'; Get-Content -LiteralPath 'apps/api/package.json'; Get-Content -LiteralPath 'apps/api/ops/apply-runtime-grants.sql'; Select-String -LiteralPath 'apps/api/ops/verify-runtime-role.sql' -Pattern 'Customer|31|VALUES|Schedule|Booking|Client' -Context 2,2
~~~

**21.**

~~~powershell
Get-Content -LiteralPath 'apps/api/ops/verify-runtime-role.sql'; Get-Content -LiteralPath 'apps/api/src/customer/customer.service.ts' | Select-String -Pattern 'customerOperation|deleteMany|findMany|customerHistoryAmbiguous|customerAccessBlocked' -Context 3,5; Get-Content -LiteralPath 'apps/web/components/customer/CustomerAuth.tsx' | Select-String -Pattern 'signUp|signIn|email_code|firstName|password|captcha|missing_requirements' -Context 4,6
~~~

**22.**

~~~powershell
Get-Content -LiteralPath 'docs/quality/evidence/m1-c3/inspeccion-previa.json'; Get-Content -LiteralPath 'docs/quality/evidence/m1-c3/activacion-api.json'; Get-Content -LiteralPath 'docs/quality/evidence/m1-c3/produccion-comparacion.json'; Get-Content -LiteralPath 'docs/quality/evidence/m1-c3/verificacion-final.json'; Get-Content -LiteralPath 'docs/quality/evidence/m1-c3/cierre-documental-20261003.json'
~~~

**23.**

~~~powershell
Get-Content -LiteralPath 'docs/features/M2_CUENTA_CLIENTE_C1_CONTRATO.md'
~~~

**24.**

~~~powershell
Get-Content -LiteralPath 'docs/quality/evidence/m1-c3/activacion-api.json'; Get-Content -LiteralPath 'docs/quality/evidence/m1-c3/verificacion-final.json'; Get-Content -LiteralPath 'docs/quality/CORRECTIVO_F0E_AJUSTE.md' -TotalCount 45; Select-String -LiteralPath 'docs/quality/BASE_PREPRODUCCION_C1_EVIDENCIA.md' -Pattern 'kortek_migrator|Cutover|26 migraciones|27 migraciones|PostgreSQL 17|pooler' -Context 1,1
~~~

**25.**

~~~powershell
Select-String -LiteralPath 'apps/api/src/bookings/bookings.service.ts' -Pattern 'async findAll' -Context 0,45; Get-Content -LiteralPath 'apps/web/lib/queries/bookings.ts' -TotalCount 75; Get-Content -LiteralPath 'apps/web/lib/booking-list.ts' -TotalCount 130; Get-Content -LiteralPath 'apps/api/test/customer-db-invariants.cjs' -TotalCount 110; Get-Content -LiteralPath 'apps/api/ops/verify-backup-snapshot.sql'
~~~

**26.**

~~~powershell
git log -5 --format='%H %s'; Get-FileHash -LiteralPath 'apps/api/prisma/migrations/20261003120000_customer_stage_one/migration.sql' -Algorithm SHA256; Get-Content -LiteralPath 'ops/oci-api/api.Containerfile'; Get-Content -LiteralPath 'apps/web/lib/web-deployment-config.ts' -TotalCount 165
~~~

**27.**

~~~powershell
Get-Content -LiteralPath 'docs/quality/RESERVA_PUBLICA_M1_C3_CIERRE.md' | Select-Object -Skip 14 -First 100; Get-Content -LiteralPath 'docs/quality/BASE_PREPRODUCCION_C1_EVIDENCIA.md' | Select-Object -Skip 40 -First 13; Get-Content -LiteralPath 'apps/api/src/customer/customer.controller.ts'; Get-Content -LiteralPath 'apps/api/src/customer/customer.dto.ts'
~~~

**28.**

~~~powershell
Get-Content -LiteralPath 'BACKEND_CHANGES.md' -TotalCount 75; Get-Content -LiteralPath 'CHANGELOG.md' -TotalCount 50; Get-Content -LiteralPath 'apps/api/src/customer/customer.service.ts' | Select-Object -Skip 105 -First 82; Get-Content -LiteralPath 'docs/README.md' | Select-Object -Skip 140 -First 170
~~~

**29.**

~~~powershell
git ls-files 'docs/quality/AGENTS.md' 'docs/AGENTS.md'; Get-Content -LiteralPath 'apps/web/package.json' -TotalCount 42; Select-String -LiteralPath 'apps/api/src/customer/customer.dto.ts' -Pattern 'view|limit|startTime|serviceId|professionalId|emailNotifications' -Context 1,3; Get-Content -LiteralPath 'apps/api/prisma/schema.prisma' | Select-String -Pattern '^model Client|^model Booking|^model User|customerAccessBlocked|customerHistoryAmbiguous|customerBookingRevision' -Context 0,32
~~~

**30.**

~~~powershell
Get-Content -LiteralPath 'C:/Users/Fraylin/.agents/skills/goal/SKILL.md'
~~~

### 10.2 Lectura pública de documentación oficial

Una invocación de web.open con las cuatro URLs siguientes, sin login ni cookies del proyecto:

- [Opciones Clerk](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options).
- [OTP legacy Clerk](https://clerk.com/docs/guides/development/custom-flows/authentication/legacy/email-sms-otp).
- [pg_dump PostgreSQL 17](https://www.postgresql.org/docs/17/app-pgdump.html).
- [pg_restore PostgreSQL 17](https://www.postgresql.org/docs/17/app-pgrestore.html).

Parámetros exactos: open de esas cuatro URLs en ese orden, response_length="long". Sin searches adicionales, panel ni proveedor del proyecto.

### 10.3 Comprobación documental final

Comprobación final de enlaces locales (existencia de destinos), secciones, fences, whitespace y alcance Git; no valida contenido de URLs externas ni ejecución futura. La primera comprobación (31) terminó 1 por contar la línea de git status como cabecera: corregida en 35, exit 0. El 36 detectó una línea vacía extra al final: retirada antes de la comprobación definitiva. No se ocultan esos intentos.

**31.**

~~~powershell
$preflightPath = 'docs/quality/M2_C3_PREFLIGHT.md'
$preflightText = Get-Content -LiteralPath $preflightPath -Raw
$baseDir = Split-Path -Parent (Resolve-Path -LiteralPath $preflightPath)
$linkIssues = @()
foreach ($match in [regex]::Matches($preflightText, '\[[^\]]+\]\(([^)]+)\)')) {
  $target = $match.Groups[1].Value
  if ($target -match '^[a-zA-Z][a-zA-Z0-9+.-]*:') { continue }
  $fileTarget = ($target -split '#', 2)[0]
  if (-not $fileTarget) { continue }
  $resolvedTarget = Join-Path $baseDir $fileTarget
  if (-not (Test-Path -LiteralPath $resolvedTarget -PathType Leaf)) { $linkIssues += $target }
}
$allLines = Get-Content -LiteralPath $preflightPath
$whitespaceIssues = @($allLines | Where-Object { $_ -match '[ \t]+
 })
$headingCount = @($allLines | Where-Object { $_ -match '^## ' }).Count
$fenceCount = @($allLines | Where-Object { $_ -match '^~~~' }).Count
$checks = [ordered]@{
  LocalLinksMissing = $linkIssues
  TrailingWhitespaceCount = $whitespaceIssues.Count
  Sections = $headingCount
  FencesBalanced = ($fenceCount % 2 -eq 0)
  BaseHeadPresent = $preflightText.Contains('2bb43ff2e297662c72e0a07f3ad5e4aba9beb891')
  MigrationHashPresent = $preflightText.Contains('6e1d854f285f4a4a691377d6654d0a4df80f29ca5c3ad375b352ae96894d6dee')
  NoGrantMigration28 = -not ((Get-Content -LiteralPath 'apps/api/prisma/migrations/20261003120000_customer_stage_one/migration.sql' -Raw) -match '\bGRANT\b')
  RuntimeGateHas36 = (Get-Content -LiteralPath 'apps/api/ops/verify-runtime-role.sql' -Raw).Contains('<> 36')
  RuntimeGateMissingCustomerOperation = -not ((Get-Content -LiteralPath 'apps/api/ops/verify-runtime-role.sql' -Raw).Contains('CustomerOperation'))
}
$checks | ConvertTo-Json -Depth 4
if ($linkIssues.Count -gt 0 -or $whitespaceIssues.Count -gt 0 -or $headingCount -ne 10 -or $fenceCount % 2 -ne 0) { exit 1 }
~~~

**32.**

~~~powershell
git diff --check
~~~

**33.**

~~~powershell
git diff --stat; git diff --cached --stat; git status --short --branch; git rev-parse HEAD
~~~

**34.**

~~~powershell
Get-Content -LiteralPath 'docs/quality/M2_C3_PREFLIGHT.md' | Select-Object -Skip 210 -First 60
~~~

**35.**

~~~powershell
$preflightPath = 'docs/quality/M2_C3_PREFLIGHT.md'
$preflightText = Get-Content -LiteralPath $preflightPath -Raw
$baseDir = Split-Path -Parent (Resolve-Path -LiteralPath $preflightPath)
$linkIssues = @()
foreach ($match in [regex]::Matches($preflightText, '\[[^\]]+\]\(([^)]+)\)')) {
  $target = $match.Groups[1].Value
  if ($target -match '^[a-zA-Z][a-zA-Z0-9+.-]*:') { continue }
  $fileTarget = ($target -split '#', 2)[0]
  if (-not $fileTarget) { continue }
  $resolvedTarget = Join-Path $baseDir $fileTarget
  if (-not (Test-Path -LiteralPath $resolvedTarget -PathType Leaf)) { $linkIssues += $target }
}
$allLines = Get-Content -LiteralPath $preflightPath
$whitespaceIssues = @($allLines | Where-Object { $_ -match '[ \t]+
 })
$headingCount = @($allLines | Where-Object { $_ -match '^## [0-9]+\.' }).Count
$fenceCount = @($allLines | Where-Object { $_ -match '^~~~' }).Count
$checks = [ordered]@{
  LocalLinksMissing = $linkIssues
  TrailingWhitespaceCount = $whitespaceIssues.Count
  Sections = $headingCount
  FencesBalanced = ($fenceCount % 2 -eq 0)
  BaseHeadPresent = $preflightText.Contains('2bb43ff2e297662c72e0a07f3ad5e4aba9beb891')
  MigrationHashPresent = $preflightText.Contains('6e1d854f285f4a4a691377d6654d0a4df80f29ca5c3ad375b352ae96894d6dee')
  NoGrantMigration28 = -not ((Get-Content -LiteralPath 'apps/api/prisma/migrations/20261003120000_customer_stage_one/migration.sql' -Raw) -match '\bGRANT\b')
  RuntimeGateHas36 = (Get-Content -LiteralPath 'apps/api/ops/verify-runtime-role.sql' -Raw).Contains('<> 36')
  RuntimeGateMissingCustomerOperation = -not ((Get-Content -LiteralPath 'apps/api/ops/verify-runtime-role.sql' -Raw).Contains('CustomerOperation'))
}
$checks | ConvertTo-Json -Depth 4
if ($linkIssues.Count -gt 0 -or $whitespaceIssues.Count -gt 0 -or $headingCount -ne 10 -or $fenceCount % 2 -ne 0) { exit 1 }
~~~

**36.**

~~~powershell
git diff --no-index --check -- NUL docs/quality/M2_C3_PREFLIGHT.md
~~~

**37.**

~~~powershell
$preflightPath = 'docs/quality/M2_C3_PREFLIGHT.md'
$preflightText = Get-Content -LiteralPath $preflightPath -Raw
$preflightLines = Get-Content -LiteralPath $preflightPath
$baseDir = Split-Path -Parent (Resolve-Path -LiteralPath $preflightPath)
$issues = @()
foreach ($match in [regex]::Matches($preflightText, '\[[^\]]+\]\(([^)]+)\)')) {
  $target = $match.Groups[1].Value
  if ($target -match '^[a-zA-Z][a-zA-Z0-9+.-]*:') { continue }
  $targetFile = ($target -split '#', 2)[0]
  if ($targetFile -and -not (Test-Path -LiteralPath (Join-Path $baseDir $targetFile) -PathType Leaf)) { $issues += 'MissingLocalLink' }
}
if (@($preflightLines | Where-Object { $_ -match '[ \t]+
 }).Count -gt 0) { $issues += 'TrailingWhitespace' }
if (@($preflightLines | Where-Object { $_ -match '^## [0-9]+\.' }).Count -ne 10) { $issues += 'SectionCount' }
if (@($preflightLines | Where-Object { $_ -match '^~~~' }).Count % 2 -ne 0) { $issues += 'UnbalancedFences' }
if ($preflightText -match '(\r?\n){2}
) { $issues += 'BlankLineAtEOF' }
$diffCheck = @(& git diff --no-index --check -- NUL $preflightPath 2>&1)
$diffExit = $LASTEXITCODE
$diffMessages = @($diffCheck | Where-Object { "$_" -notmatch 'LF will be replaced by CRLF' })
if ($diffExit -gt 1 -or $diffMessages.Count -gt 0) { $issues += 'DiffWhitespaceCheck' }
git diff --check
if ($LASTEXITCODE -ne 0) { $issues += 'TrackedDiffCheck' }
$branch = git branch --show-current
$head = git rev-parse HEAD
$indexPaths = @(git diff --cached --name-only)
$trackedPaths = @(git diff --name-only)
$untrackedPaths = @(git ls-files --others --exclude-standard)
if ($branch -ne 'ai/antigravity-qa' -or $head -ne '2bb43ff2e297662c72e0a07f3ad5e4aba9beb891') { $issues += 'ChangedBase' }
if ($indexPaths.Count -ne 0 -or $trackedPaths.Count -ne 0 -or $untrackedPaths.Count -ne 1 -or $untrackedPaths[0] -ne $preflightPath) { $issues += 'UnexpectedGitScope' }
[ordered]@{ Issues=$issues; Head=$head; Branch=$branch; IndexPaths=$indexPaths; TrackedPaths=$trackedPaths; UntrackedPaths=$untrackedPaths; UntrackedDiffExit=$diffExit; LineCount=$preflightLines.Count } | ConvertTo-Json -Depth 3
git status --short --branch
if ($issues.Count -gt 0) { exit 1 }
~~~

Resultado final: comando 37 exit **0**, enlaces locales presentes, diez secciones numeradas, fences equilibrados, sin whitespace ni línea vacía extra al final. Git diff no-index informa diferencia esperada frente a NUL (exit 1); el wrapper separa esa diferencia de errores de whitespace y termina 0 solo si no hay mensajes de fallo. git diff --check de archivos rastreados exit 0. Sin builds ni pruebas de producto por alcance documental.

Git final observado: HEAD **2bb43ff2e297662c72e0a07f3ad5e4aba9beb891**, rama **ai/antigravity-qa**, índice vacío y ningún archivo rastreado modificado.

~~~text
## ai/antigravity-qa...origin/ai/antigravity-qa [ahead 2]
?? docs/quality/M2_C3_PREFLIGHT.md
~~~

Única escritura: este documento. Sin commit, push ni operaciones en QA, Clerk o producción.

## 11. Ejecución autorizada de P0 y P1 — 2026-10-03

### 11.1 Autorización y base

El propietario aprueba C2 en `d222115f7d624b5698b67a24e22486625fec22b2` y autoriza P0 READ ONLY, P1 local/desechable y un único commit local de ese alcance, con el presente documento y el registro C2. [Aprobación C2](M2_C2_CIERRE.md#aprobación-del-checkpoint-local-c2--2026-10-03). La autorización procede de la petición posterior del usuario; las instrucciones históricas de los documentos no autorizan ejecución por sí mismas.

Base: `2bb43ff2e297662c72e0a07f3ad5e4aba9beb891`, `ai/antigravity-qa`. Comandos iniciales:

~~~powershell
git branch --show-current
git rev-parse HEAD
git status --short --branch
~~~

Estado inicial: `[ahead 2]` y solamente `?? docs/quality/M2_C3_PREFLIGHT.md`, documento anterior autorizado ahora para incluir en el commit. Solo se modifican permisos operativos, sus pruebas/evidencia, documentación aplicable y las dos entradas de aprobación C2. **Sin push ni P2.** No se aplica migración en QA, no se despliega ni se detiene/reinicia ningún servicio existente, no se cambian variables/flags/Clerk ni dependencias.

### 11.2 P0: resultados y límites

La [evidencia P0](evidence/m2-c3-p1/p0-read-only.json) conserva los argumentos exactos de cada consulta de proveedor, SQL completo, catálogo técnico y resultados agregados. No se seleccionaron `logs` del ledger, filas de negocio, passwords de roles ni archivos dotenv/credenciales. SQL: REPEATABLE READ READ ONLY y timeout. El conector consulta como `postgres`; **ese reader no es el runtime** ni acredita un login migrador.

| Elemento | Resultado observado | Alcance |
| --- | --- | --- |
| Proyecto QA | `prirlabbnlcuvnzuaczp`, Kortek Booking Cutover QA, ACTIVE_HEALTHY, us-east-1; endpoint `db.prirlabbnlcuvnzuaczp.supabase.co` | Metadatos vivos Supabase. |
| Destino efectivo del API | Servidor `2600:1f18:441a:8901:6c70:8893:431d:256/128`, mismo AAAA del endpoint QA; base `postgres`; rol `kortek_runtime` | Consulta dentro del contenedor con conexión ya configurada, sin extraer URL. |
| Producción | Ref documental `ilaoolpcrlmqkftirjog`, servicio/puerto y dominio separados | **No consultada en vivo**. QA efectiva coincide con su propio proyecto y es distinta del baseline productivo aportado. No se certifica el estado actual de producción, flags ni secretos. |
| API QA | active/running, MainPID 673295, NRestarts 0; imagen `701329f1cfe7b45f5b6d0cfe62daeae0edf6e1c00518158cb8555a815c224031`; release `791569b110f9fd59cb10e6d248546bdae3996e14` | systemctl/podman y allowlist APP_RELEASE. Despliegue OCI según runbook histórico, sin ejecutarlo. |
| Worker QA | active/running, MainPID 575989, NRestarts 0 | Conservado; no se actualizó ni disparó correo. No afirmar que QA tiene correo desactivado. |
| PostgreSQL | 17.6; versión proveedor 17.6.1.166 | Catálogo y metadata coinciden. |
| Ledger | 27 terminadas activas, 0 activas fallidas, 4 rolled_back históricas; migración 28 ausente; 36 tablas public | 27/27 nombres/checksums coinciden con archivo original o variante LF. Los intentos revertidos tienen checksum de su entrada terminada. No se repara el ledger; no sustituye un diff completo del schema. |
| Roles | runtime/migrador LOGIN, NOINHERIT, sin atributos elevados | Ninguno es miembro de otro rol. `postgres` es miembro de ambos en sentido inverso; no eleva al runtime. |
| Ownership/permisos | 36 tablas public de `kortek_migrator`; base Supabase de `postgres`; runtime Client UPDATE, sin SELECT del ledger, CREATE DB/schema ni default DML | Migrador previsto/owner comprobados; no se ensayó login migrador ni migración real en QA. |
| Censo | 20 clientes, 28 reservas; 16 clientes con reservas; todas las reservas tienen Client; 0 Client.userId; 0 vínculos sin Clerk; 0 grupos de fichas con teléfono igual y reservas | A0.6-A no tiene vínculos existentes en el snapshot. No prueba ausencia de mezcla dentro de una sola ficha. |
| Integridad/clasificación | 0 Client huérfanos, 0 reservas con Client de otro tenant, 0 organizaciones fuera de los cuatro tenants sintéticos documentados | Sin contactos ni certificación de cada fila como sintética. P5 usará fixtures nuevos dedicados. |
| Preview | `dpl_HtCcxYumevH6xD7qVhaTcGkKU3XD`, READY, target null; SHA `9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4`, rama QA | Alias `qa.booking.kortek.cloud` y `kortek-booking-git-ai-antigravity-qa-fraylindev.vercel.app`. C2 permanece local. Sin variables ni build logs. |

No aparecieron las condiciones de parada P0: destino equivocado, mezcla de proyectos DB, 28 ya aplicada, ledger activo fallido/checksum ajena, tenants no clasificados o C2 pendiente de aprobación. Son snapshots separados, **no una ventana congelada**. Antes de P2/P3, revalidar destino, escritores, ledger y baseline productivo autorizado. Clerk Development/issuer/coherencia de claves siguen pendientes de su paso específico; no se consultó Clerk.

Dos consultas SQL fueron rechazadas por revisión automática porque no aceptó el objetivo activo como confirmación humana directa. Tras «Autorizado», pasó la misma consulta READ ONLY. Vercel con team slug devolvió 403; tras «Si», el ID de ámbito permitió obtener deployment/alias. SSH falló en el sandbox y pasó en la lectura acotada aprobada. Ninguna incidencia autorizó mutaciones.

### 11.3 Lecturas exactas adicionales P0

Cwd del repositorio, PowerShell. Los comandos iniciales figuran arriba y **todas las consultas de proveedor y su SQL literal**, incluidas rechazadas, en `providerReadCalls` del JSON. El conector multisentencia devolvió solo su último SELECT; se repitió el catálogo en un SELECT JSON para conservar todo.

SSH inicial, exit 1 sin conexión; no llegó a ejecutar el inventario remoto:

~~~powershell
ssh -i .tmp/base-preprod-c1/oci-kortek-ed25519-user -o UserKnownHostsFile=.tmp/base-preprod-c1/oci-known-hosts -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=15 opc@150.136.7.19 'systemctl show kortek-api-staging kortek-email-worker-staging --property=Id,ActiveState,SubState,MainPID,NRestarts; podman ps --format "{{.Names}} {{.Image}} {{.Status}} {{.Ports}}"'
~~~

Lectura acotada, exit 0:

~~~powershell
ssh -i .tmp/base-preprod-c1/oci-kortek-ed25519-user -o UserKnownHostsFile=.tmp/base-preprod-c1/oci-known-hosts -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=15 opc@150.136.7.19 'systemctl show kortek-api-staging kortek-email-worker-staging --property=Id,ActiveState,SubState,MainPID,NRestarts; XDG_RUNTIME_DIR=/run/user/1000 podman inspect --format "{{.Name}} {{.Image}} {{.State.Status}}" kortek-api-staging'
~~~

DNS y WorkingDir, exit 0:

~~~powershell
Resolve-DnsName db.prirlabbnlcuvnzuaczp.supabase.co -Type AAAA
ssh -i .tmp/base-preprod-c1/oci-kortek-ed25519-user -o UserKnownHostsFile=.tmp/base-preprod-c1/oci-known-hosts -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=15 opc@150.136.7.19 'XDG_RUNTIME_DIR=/run/user/1000 podman inspect --format "{{.Config.WorkingDir}}" kortek-api-staging'
~~~

Helper revisado en la invocación, stdin sin archivo remoto, exit 0. Prisma utiliza la conexión heredada; no se extraen credenciales ni se lee dotenv explícitamente:

~~~powershell
$p0Reader = @'
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient({log:[]});
(async()=>{try {const result=await db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');await tx.$executeRawUnsafe("SET LOCAL statement_timeout='10s'");return tx.$queryRawUnsafe('SELECT current_user AS role,current_database() AS database,inet_server_addr()::text AS server,current_setting(\'server_version\') AS version,(SELECT count(*)::int FROM public."Client") AS clients,(SELECT count(*)::int FROM public."Booking") AS bookings');});const release=process.env.APP_RELEASE;console.log(JSON.stringify({release: /^[0-9a-f]{40}$/.test(release||'') ? release : null,result}));}catch(error){console.log(JSON.stringify({errorClass:error.constructor.name,code:error.code||null}));process.exitCode=1;}finally{await db.$disconnect();}})();
'@
$p0Reader | ssh -i .tmp/base-preprod-c1/oci-kortek-ed25519-user -o UserKnownHostsFile=.tmp/base-preprod-c1/oci-known-hosts -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=15 opc@150.136.7.19 'XDG_RUNTIME_DIR=/run/user/1000 podman exec -i --workdir /srv/kortek/apps/api kortek-api-staging node'
~~~

Contraste de hashes, exit 0; no altera archivos ni ledger:

~~~powershell
Get-ChildItem -LiteralPath apps/api/prisma/migrations -Directory | ForEach-Object { [pscustomobject]@{name=$_.Name;hash=(Get-FileHash -LiteralPath (Join-Path $_.FullName 'migration.sql') -Algorithm SHA256).Hash.ToLowerInvariant()} } | ConvertTo-Json -Compress
Get-ChildItem -LiteralPath apps/api/prisma/migrations -Directory | ForEach-Object { $sqlText=[IO.File]::ReadAllText((Join-Path $_.FullName 'migration.sql')).Replace("`r`n","`n"); $digest=[Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($sqlText)); [pscustomobject]@{name=$_.Name;lfHash=([BitConverter]::ToString($digest)).Replace('-','').ToLowerInvariant()} } | ConvertTo-Json -Compress
~~~

No se ejecutaron migrate status con archivos protegidos, inspect/Environment completos ni hashes de runtime-env: elección conservadora sin abrir archivos de credenciales. Endpoint/rol efectivos quedaron probados por DNS y consulta del contenedor. El cliente SSH usó la clave únicamente para autenticación; no se abrió ni imprimió su contenido.

### 11.4 P1: correctivo, pruebas y resultado

El [suplemento](../../apps/api/ops/customer-stage-one-runtime-grants.sql) no cambia la migración aprobada. CustomerOperation recibe **SELECT, INSERT, DELETE**, sin UPDATE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN, ownership ni default DML. Revoca ACL previas de PUBLIC/runtime. Mantiene Client UPDATE para los triggers **SECURITY INVOKER**; sin ese permiso, una escritura Booking debe fallar y revertirse entera.

Las funciones conservan owner migrador e invoker; se revoca EXECUTE de PUBLIC, se concede al runtime y se fija `search_path=pg_catalog, public, pg_temp` para resolver Client en el schema revisado. No se concede TRIGGER al runtime ni se crea SECURITY DEFINER. El gate exige firmas, owner/configuración/ACL y los dos triggers habilitados con eventos exactos. [PostgreSQL CREATE TRIGGER](https://www.postgresql.org/docs/17/sql-createtrigger.html), [CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html).

[Matriz](../../apps/api/ops/apply-runtime-grants.sql) y [gate](../../apps/api/ops/verify-runtime-role.sql): **28 migraciones / 37 tablas**. La matriz incluye el suplemento después de su primera transacción: ambas deben terminar y el gate pasar antes de activar API. No interpretar su primer COMMIT como éxito completo. [Procedimiento actualizado](../../apps/api/ops/README.md).

El [drill reproducible](../../apps/api/test/customer-runtime-grants-drill.cjs) usa copias sin dotenv y dependencias instaladas, credenciales sintéticas en memoria, contenedor aleatorio propio, tmpfs, loopback 55447 y SCRAM. No usa volúmenes/servicios existentes. El [preload](../../apps/api/test/customer-no-dotenv.cjs) bloquea dotenv en los procesos Node hijos, incluida la ruta original del Prisma generado compartido. No instala dependencias ni genera Prisma.

Imagen disponible fijada por ID: `sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f`, **PG17.11**; QA viva **17.6**. Acredita PostgreSQL 17 local, no ejecución QA ni equivalencia absoluta entre minors/Supabase. Restore de backup QA y ACL permanecen en P2.

Comando desde la raíz, **exit 0 definitivo**, contenedor propio retirado:

~~~powershell
node apps/api/test/customer-runtime-grants-drill.cjs
~~~

Cinco comandos internos, todos **exit 0**, en copia aislada y con configuración sintética exclusiva del proceso. [verifyDepsBeforeRun](https://pnpm.io/settings/build#verifydepsbeforerun) desactiva autoinstalación por invocación, sin editar configuración:

~~~powershell
pnpm --config.verify-deps-before-run=false --config.pm-on-fail=ignore --filter api type-check
pnpm --config.verify-deps-before-run=false --config.pm-on-fail=ignore --filter api lint
pnpm --config.verify-deps-before-run=false --config.pm-on-fail=ignore --filter api test --runInBand
pnpm --config.verify-deps-before-run=false --config.pm-on-fail=ignore --filter api build
pnpm --config.verify-deps-before-run=false --config.pm-on-fail=ignore --filter api exec prisma validate
~~~

[Resultado definitivo](evidence/m2-c3-p1/p1-validation.json): 62 suites/812 pruebas API pasan; 3 suites/37 pruebas de integración opcionales omitidas por sus interruptores. El drill P1 ejecuta integración SQL/HTTP propia con runtime restringido; no afirma haber repetido toda la integración opcional de C1.

| Ensayo definitivo | Prueba observada |
| --- | --- |
| Baseline y upgrade | Gate previo 27/36 pasa con runtime; 27→28 como migrador; huella interna de User/Client/Booking preexistentes y vínculo igual; Client inicial bloqueado, ambiguous=false, revision=0; gate nuevo falla sin suplemento y pasa después. |
| SID mínimo | INSERT, SELECT y DELETE de recibo reales con runtime; UPDATE/TRUNCATE, ownership/DDL, ledger SELECT, CREATE schema/TEMP, DELETE Invoice/Payment/AuditLog y CREATE TRIGGER denegados SQLSTATE 42501; REFERENCES/TRIGGER/MAINTAIN efectivos falsos. |
| Login/repetibilidad | Runtime TCP correcto; contraseña incorrecta rechazada. Suplemento repetido y reaplicación de matriz completa conservan gate verde. Tabla futura no hereda SELECT y hace fallar gate. |
| Triggers/Client UPDATE | Sin Client UPDATE: gate falla, Booking INSERT denegado y no queda reserva parcial. Con permiso: INSERT/UPDATE/reasignación/DELETE administrativo incrementan revisiones esperadas; relink bloquea, ambiguous=true mantiene cuarentena aun solicitando unblock. |
| Regresiones del gate | Detecta CustomerOperation UPDATE extra, Invoice DELETE, PUBLIC EXECUTE, SECURITY DEFINER, search_path retirado, trigger deshabilitado y default SELECT futuro. Se reparan solo dentro del desechable y gate final pasa. |
| API anterior | Código exacto `791569b`, [hijo de compatibilidad](../../apps/api/test/customer-runtime-compat.cjs), SDK controlado y worker de medios sustituido: GET público 200, claim repetido 200, reserva pública 201/PENDING; recibos, vínculo y Booking posterior al upgrade conservados; ruta M2 ausente 404; código anterior no desbloquea Client. |
| Aislamiento | Preload y censo de bloqueos en procesos hijos; resultados sanitizados, sin tokens/URLs/filas. Solo su contenedor fue retirado; datos de prueba vivieron en tmpfs. Copias/logs sanitizados quedan ignorados en .tmp. |

La migración 28 conserva SHA-256 `6e1d854f285f4a4a691377d6654d0a4df80f29ca5c3ad375b352ae96894d6dee` antes y después; no existe diff de esa ruta.

Intentos fallidos conservados: fixture CMS inicial duplicaba el registro creado por trigger de Organization (P2002), corregida solo en el ensayo; Docker resolvía ID PG17 pero no tag en dos intentos, luego se fijó contexto/ID y se verificó versión; pnpm abortó autoinstalación implícita por falta de TTY, luego se desactivó por comando (sin permitir instalación ni activar CI). Un type-check aislado sufrió EPERM de configuración pnpm y pasó con aprobación del mismo comando. El ensayo anterior con cinco checks verdes no bloqueaba el cargador dotenv implícito: **no se usa como evidencia completa de aislamiento**. El ensayo definitivo agrega preload y censo, y vuelve a pasar completo.

### 11.5 Alcance del cierre local

**P0 documentado y P1 IMPLEMENTADO / VALIDADO LOCALMENTE; en revisión del propietario.** La aprobación registrada es la de C2; los resultados de P1 no aprueban C3 ni activación. P2 no iniciado/autorizado. Sin backup nuevo, restore de QA, migración/despliegue real, cambios Clerk ni publicación web. La compatibilidad usa SDK controlado: sesiones/códigos reales, iPhone/Safari, Android, VoiceOver/TalkBack y zoom real siguen pendientes. **D4 dentro de una ficha y paginación del panel siguen bloqueando Paso 8.**

Se prepara un único commit local con rutas explícitas. Las comprobaciones finales incluyen diff completo, whitespace, índice limitado al alcance, migración intacta, evidencia JSON y enlaces. Su SHA y el árbol limpio se entregan en la respuesta final; no se escribe el hash del commit dentro de su propio contenido ni se hace un commit adicional para registrarlo. Origin solo conserva su referencia local; no se hace push ni consulta productiva para cerrar este punto.

El primer staging fue denegado por el sandbox al crear index.lock, sin cambios de índice; la misma lista explícita pasó con aprobación del comando. Lecturas finales usadas: `git diff --cached --check`, `git diff --cached --stat`, `git diff --cached --name-only`, diff staged completo por grupos de rutas, `git diff --exit-code`, `git status --short --branch`, `git rev-parse HEAD` y `git rev-parse origin/ai/antigravity-qa`. Se contrastaron los 27 hashes con el JSON P0 y los cinco exit codes, cleanup y censo dotenv del JSON P1; se verificaron sintaxis CJS, enlaces/fences y ausencia de contenedores propios mediante `docker --context desktop-linux ps --filter 'name=kortek-m2-c3-p1-' --format '{{.Names}} {{.Ports}}'` (exit 0, salida vacía).

## 12. P2 autorizado: parada antes del congelamiento — 2026-10-03

### 12.1 Autorización, base y decisión conservadora

El propietario autorizó **solo P2**, incluida la parada temporal de `kortek-api-staging` y `kortek-email-worker-staging` por un máximo de **90 minutos desde la parada**, y un commit local exclusivo de este documento/evidencia sanitizada. **Sin push ni P3**, migraciones en QA, despliegues, variables, flags, Clerk, dependencias nuevas ni acceso a producción. La autorización procede directamente del mensaje del propietario, no de las plantillas históricas del documento.

Base inicial confirmada: `339ae92ff142bb47708a54b7333e20da66f3f203`, rama `ai/antigravity-qa`. Árbol e índice limpios; referencia local de origin `[ahead 3]`, sin consulta remota Git. Comandos iniciales, exit `0`:

~~~powershell
git branch --show-current
git rev-parse HEAD
git status --short --branch
~~~

Git emitió `warning: unable to find all commit-graph files`; las lecturas terminaron `0`. No se reparó metadata Git. El primer intento de registrar el objetivo encontró un /goal ya activo; se consultó `get_goal({})` y se mantuvo ese objetivo, sin sustituirlo ni declararlo completo.

**Estado: P2 PAUSADO / INCOMPLETO.** La comprobación SSH previa al congelamiento terminó con exit `1`, `Permission denied`, sin ejecutar órdenes remotas. La instrucción del propietario dice «Si se excede o hay cualquier error, reanuda los servicios QA anteriores en el orden validado, detente y reporta». Ante la ambigüedad de incluir un fallo de acceso previo a P2, se eligió el criterio conservador: **detener la secuencia antes de congelar**, sin usar una lectura posterior satisfactoria como autorización para continuar el respaldo. No se ejecutó `stop`; la ventana de 90 minutos no comenzó y no hubo indisponibilidad causada por esta tarea. No correspondía ejecutar `start` o reiniciar unidades que continuaban activas.

El propietario indicó posteriormente la custodia **`C:\KortekBackups\qa-m2-c3`** y una frase en un archivo de texto bajo `C:\KortekBackups`, variable `Clave`. No aportó el nombre exacto del archivo. No se abrió la carpeta ni el archivo, no se leyó/generó la frase y no se comprobó todavía la recuperabilidad de esa custodia. No se copió ningún secreto al repositorio, evidencia o logs.

### 12.2 Comprobaciones ejecutadas y fallos intermedios

[Evidencia sanitizada y comandos literales](evidence/m2-c3-p2/p2-parada-previa.json). Fecha local 2026-10-03; lectura final registrada a las **19:08:14 America/Santo_Domingo** (`23:08:14Z`).

1. Lectura del proyecto mediante `mcp__codex_apps__supabase_get_project({"id":"prirlabbnlcuvnzuaczp"})`: Kortek Booking Cutover QA, `ACTIVE_HEALTHY`, endpoint `db.prirlabbnlcuvnzuaczp.supabase.co`, versión proveedor `17.6.1.166`; iguales a P0. No se consultó ninguna DB ni proyecto productivo. **Estos metadatos no acreditan el endpoint DB efectivo de los procesos.**
2. Comprobación SSH en el sandbox por defecto, exit `1`: `ssh: connect to host 150.136.7.19 port 22: Permission denied`. No llegó a ejecutar el inventario remoto. Fue el punto de parada conservador; no se afirma que el servidor SSH o la credencial fueran inválidos.
3. La misma lectura con `sandbox_permissions=require_escalated`, admitida y exit `0`, se limitó a comprobar el estado seguro final de las dos unidades QA. No continuó el congelamiento ni operó producción. **No hubo rechazo de revisión automática en esa lectura.**

Comando exacto de los dos intentos SSH, desde la raíz del repositorio; la diferencia fue exclusivamente el permiso de ejecución local:

~~~powershell
ssh -i .tmp/base-preprod-c1/oci-kortek-ed25519-user -o UserKnownHostsFile=.tmp/base-preprod-c1/oci-known-hosts -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=15 opc@150.136.7.19 'systemctl show kortek-api-staging kortek-email-worker-staging --property=Id,ActiveState,SubState,MainPID,NRestarts; XDG_RUNTIME_DIR=/run/user/1000 podman inspect --format "{{.Name}} {{.Image}} {{.State.Status}}" kortek-api-staging kortek-email-worker-staging'
~~~

| Comprobación final | Resultado | Relación con P0 |
| --- | --- | --- |
| API staging | `active/running`, MainPID `673295`, NRestarts `0` | Mismo PID y contador P0. Imagen `701329f1cfe7b45f5b6d0cfe62daeae0edf6e1c00518158cb8555a815c224031`, igual a P0. |
| Worker staging | `active/running`, MainPID `575989`, NRestarts `0` | Mismo PID y contador P0. Imagen observada `7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1`; P0 no registra su imagen, por lo que no se afirma esa igualdad. |
| APP_RELEASE | No releído | El release `791569b` es antecedente P0; no se presenta como validación viva P2. |

Fallo local de orientación: `rg` no pudo ejecutarse por asociación del ejecutable de WinGet; se sustituyó por `Select-String`, `Get-Content` y `git ls-files`. Las lecturas locales no abrieron dotenv, credenciales ni dumps; SSH utilizó su clave solo para autenticación. Se inspeccionó código local de los helpers históricos de backup/restore y las unidades staging, **sin ejecutarlos**; esos helpers usan PG18/archivo plano y no se adoptaron como implementación de §5.2. No se creó un helper P2 ni se descargaron herramientas.

### 12.3 Lo pendiente y límites de recuperación

**No ejecutado/no verificado en P2:** ledger/checksums vivos y 28 ausente; endpoint/rol/release efectivos del API; escritores/sesiones/transacciones y cola; Preview/HTTP de reserva pública; login migrador; cliente/imagen PG17 y aislamiento; orden validado de reanudación; snapshot/dump/cifrado/hash/censo; restauración, cotejo de las 36 tablas/ledger/constraints/triggers/roles/ACL; upgrade desechable y ensayo de rollback. El censo P0 de 20 clientes/28 reservas es histórico y **no acredita el estado actual ni un respaldo P2**. No hay hash nuevo que pueda habilitar P3b.

§5.3 sigue siendo el procedimiento previsto: antes de migrar, un fallo de backup/restore exige reanudar las unidades anteriores congeladas; fallo de migración exige conservar escritores detenidos y conciliar ledger/catálogos; fallo de API con schema 28 íntegro exige revertir solo código conservando schema/recibos/vínculos; fallo web exige volver al Preview previo; incompatibilidad Clerk corresponde al propietario; corrupción requiere copia del estado fallido y restore autorizado en destino nuevo. **Ninguna de estas reversiones fue ensayada en esta ejecución**; la inversa desechable no está autorizada en QA operativo. No se extrapolan pruebas P1 a recuperación P2.

No se crearon contenedores ni archivos temporales de ensayo P2: no hay limpieza ni respaldo cifrado que conservar en esta ejecución. Los artefactos anteriores no se eliminaron. No se detuvo/reanudó API o worker, no se actualizó ni migró nada y no se hizo push. Producción no fue consultada ni operada; no se certifica su estado actual mediante lecturas prohibidas.

**Siguiente paso preciso:** tras la indicación del propietario de continuar después de la parada por error, resolver el nombre exacto del archivo de frase, comprobar ruta y custodia fuera de Git y preparar herramientas/recuperación antes de detener QA. Repetir la revalidación completa de P2 frente a P0 (metadatos y destino efectivo, ledger, escritores, release), con todas las condiciones de parada vigentes. Contar 90 minutos desde el primer `stop`, disponer de reanudación API → worker previamente validada, y reanudar ambas al terminar o fallar. El respaldo y el censo deben pertenecer a la misma snapshot; al reabrir escritores, cualquier escritura posterior exige respaldo nuevo antes de P3b. **Esta continuación no autoriza P3.**

### 12.4 Alcance del commit local

Únicas rutas autorizadas para staging/commit:

- `docs/quality/M2_C3_PREFLIGHT.md`.
- `docs/quality/evidence/m2-c3-p2/p2-parada-previa.json`.

Se verifican JSON, enlace local, fences, diff completo, `git diff --check` y el índice explícito. Sin tipos/lint/build: solo se incorporan documentación y evidencia de una parada previa, no implementación. El SHA final se entrega en la respuesta, sin insertarlo en su propio commit. La rama quedará un commit local más adelantada; no se consulta ni publica origin.

Validación local observada, exit `0`: JSON parseable; base correcta y respaldo/congelamiento falsos; evidencia enlazada existente; fences pares; sin patrones de URL PostgreSQL, clave privada, claves Clerk o JWT en la sección/evidencia nuevas; `git diff --check` sin errores. Staging explícito con permiso local ampliado, exit `0`, sin rechazo previo de index.lock. Advertencias LF→CRLF de Git: no son fallo de whitespace ni cambios de contenido histórico.

Comandos del checkpoint local, con revisión completa del índice antes del commit:

~~~powershell
git add -- docs/quality/M2_C3_PREFLIGHT.md docs/quality/evidence/m2-c3-p2/p2-parada-previa.json
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
git diff --cached
git diff --exit-code
git commit -m "docs(m2): registrar parada previa de P2 sin congelar QA"
git rev-parse HEAD
git status --short --branch
git show --stat --oneline HEAD
~~~

## 13. Continuación P2 revalidada y parada en preparación local — 2026-10-03

### 13.1 Reanudación de la tarea y base

El propietario indicó continuar desde la parada anterior y confirmó **`C:\KortekBackups\Clave.txt`**, con formato de variable `Clave`. Su contenido nunca se incluye aquí. La custodia sigue siendo **`C:\KortekBackups\qa-m2-c3`**. Se comprobó existencia de archivo/carpeta, no su contenido ni recuperabilidad. Continúan todos los límites de P2: 90 minutos desde `stop`, sin push/P3, producción, migraciones QA, despliegues, variables/flags/Clerk ni dependencias nuevas.

Base observada al retomar: **`827e635939b23d1131f5c6e57c2066c1823a1b33`**, `ai/antigravity-qa`, árbol/índice limpios, `[ahead 4]`. Es el commit documental de §12; frente a `339ae92`, únicamente cambian el preflight y su evidencia anterior. `git diff --exit-code 339ae92ff142bb47708a54b7333e20da66f3f203 HEAD -- apps ops package.json pnpm-lock.yaml` terminó `0`. Sin cambios de implementación ni consulta a origin.

Se conserva [evidencia del segundo intento](evidence/m2-c3-p2/p2-segundo-intento.json), con SQL exacto, catálogo técnico agregado, ledger, comandos Docker y resultados. Se archivan como texto, exclusivamente para auditoría del ensayo interrumpido, los helpers temporales realmente preparados: [Python](evidence/m2-c3-p2/p2-preparacion.py.txt), [flujo binario/cifrado Bash](evidence/m2-c3-p2/p2-crypto.sh.txt) y [wrapper de credencial QA](evidence/m2-c3-p2/p2-wrapper.ps1.txt). **Solo se alcanzó preparación; estos archivos no constituyen un ejecutor completo de P2 ni una recuperación validada.**

### 13.2 Revalidación viva realizada antes del congelamiento

| Elemento | Evidencia observada | Límite |
| --- | --- | --- |
| Proyecto y destino efectivo | Proyecto QA `prirlabbnlcuvnzuaczp`, ACTIVE_HEALTHY, endpoint QA, PG17.6; conexión dentro del API como runtime a postgres, sufijo QA correcto, servidor coincide con DNS AAAA QA | Comparaciones en memoria/booleanos; no se extrajo/imprimió URL de conexión. |
| Release y servicios | Release API `791569b110f9fd59cb10e6d248546bdae3996e14`, imagen `701329f1…4031`, PID API `673295`, worker `575989`, NRestarts `0` | Coinciden release/imagen API y PID con P0. Imagen worker `7eafd5c9…6fa1` capturada como baseline de este intento; P0 no registraba esa imagen. |
| Ledger y censo puntual | Ledger completo de 31 entradas igual a P0; 27 terminadas activas, cuatro revertidas históricas, cero activas fallidas y cero entradas 28; 36 tablas; 20 clientes, 28 reservas, cero vínculos | No es censo de un snapshot de backup: no se exportó snapshot ni dump. |
| Escritores puntuales | Cuatro sesiones runtime idle, sin transacción; resto de sesiones proveedor idle; cero transacciones activas de clientes y cero preparadas. Sin pg_cron | No demuestra ausencia permanente de escrituras o edición futura del propietario/proveedor. Ninguna sesión fue terminada ni deshabilitada. |
| Roles de acceso | Runtime/migrador sin atributos elevados ni membresías que los eleven. anon/authenticated/authenticator/service_role/pgbouncer con cero tablas public de escritura efectiva | Controles administradores del proveedor no se deshabilitaron. Solo se inventarió catálogo QA, sin passwords. |
| Preview | `dpl_HtCcxYumevH6xD7qVhaTcGkKU3XD`, READY, SHA `9f04dbaf`, alias QA y rama autorizada iguales a P0 | Sin logs de build, claves ni cambios en Vercel. |
| Extensiones | btree_gist 1.7 reside en **public** | Requiere la alternativa TOC de §5.2; no usar la plantilla que instala btree_gist fuera de public como si reprodujera esta fuente. |
| Herramientas | Imagen PG17 local fija `sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f`, amd64; Bash/GPG/Python existentes. Cliente nativo instalado PG18 | No se descargó/instaló nada. La preparación prevista usa herramientas PG17 del contenedor; su login/TLS todavía no se ensayó. |

El helper de destino fue el mismo patrón READ ONLY de §11.3, con timeout 10 s, ampliado a comprobaciones booleanas de usuario/host QA, DNS efectivo, rol/base/versión, release P0, DEPLOY_ENV staging y reserva pública abierta. Exit `0`; no cambió entorno efectivo. Consultas Supabase READ ONLY, timeout 30 s; SQL completo y resultados sin filas de negocio en el JSON.

### 13.3 Fallo local, parada y estado seguro

Comandos de preparación de sintaxis, ambos exit `0`:

~~~powershell
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m py_compile .tmp/m2-c3-p2/p2.py
& 'C:/Program Files/Git/bin/bash.exe' -n .tmp/m2-c3-p2/crypto.sh
& ./.tmp/m2-c3-p2/run.ps1 prepare
~~~

El wrapper recibió la credencial **QA migrador** DPAPI ya existente, solo en memoria/env del proceso; se comprobó previamente su formato SecureString y se liberó el BSTR y PGPASSWORD al salir. No se leyó ninguna credencial productiva. La frase de cifrado **no llegó a leerse**, porque el fallo precedió toda invocación de Bash/GPG.

El último comando terminó **exit `1`**. Secuencia interna exacta, argumentos completos en el JSON:

~~~text
docker --context desktop-linux run --detach --rm --name kortek-m2-c3-p2-client-d15070d4fd9f --network bridge --read-only --cpus 1 --memory 768m --pids-limit 128 --tmpfs /tmp:rw,size=64m --tmpfs /var/run/postgresql:rw,size=16m --entrypoint sleep sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f infinity
docker --context desktop-linux cp C:\Users\Fraylin\Desktop\Kortek-Booking\ops\oci-free-backup\prod-ca-2021.crt kortek-m2-c3-p2-client-d15070d4fd9f:/tmp/qa-ca.crt
docker --context desktop-linux stop --time 15 kortek-m2-c3-p2-client-d15070d4fd9f
~~~

Exit codes: **0 / 1 / 0**. La CA pública fuente existe. La copia falló en el cliente de raíz read-only; stderr crudo omitido/no persistido. No se certifica una causa detallada del daemon porque ese diagnóstico se descartó. **Punto de parada:** ningún `stop` QA ni login del cliente PG17 había ocurrido; se aplicó la regla del propietario ante cualquier error. Contenedor local propio eliminado por `stop` + `--rm`; consulta `docker --context desktop-linux ps -a --filter 'name=kortek-m2-c3-p2-' --format '{{.Names}} {{.Status}} {{.Ports}}'`, exit `0`, salida vacía. No hubo volúmenes, puertos publicados ni dump plano. Se retiraron solo los temporales propios del ensayo tras conservar las fuentes sanitizadas.

Incidencias adicionales documentales: la primera extracción local del resultado Supabase tomó texto introductorio, produjo SyntaxError y no modificó evidencia; el parser se corrigió para la etiqueta efectiva, procesando el resultado ya obtenido sin repetir SQL. Un patch Delete+Add sobre la misma ruta fue rechazado sin cambios y se sustituyó por Update. No alteraron la parada operativa ni produjeron conexiones nuevas.

La revisión staged detectó ocho textos con codificación alterada al reimportar stdout y un escape duplicado del regex del helper archivado. Se corrigieron antes del commit; JSON final con escapes Unicode, helper Node sintácticamente válido (`node --check`, exit `0`), sin cambios de SQL/resultados medidos ni nuevas operaciones QA.

Lectura final a **19:29:48 America/Santo_Domingo** (`23:29:48Z`), SSH exit `0`: API/worker `active/running`, mismos PID P0, cero reinicios, imágenes iguales a las del inicio de este intento. Hashes iguales antes/después de runtime-env QA, ambos wrappers y ambas unidades; valores en JSON, contenido protegido no leído. No se necesitó `start`/reinicio: nunca se detuvieron. La ventana de 90 minutos **no comenzó**, indisponibilidad causada cero.

HTTP final, exit `0`, GET público **`200`**, respuesta no vacía y cuerpo no impreso:

~~~powershell
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -c 'import json,urllib.request; r=urllib.request.urlopen("https://api.staging.booking.kortek.cloud/public/qa-horario-norte/booking-data",timeout=20); b=r.read(); print(json.dumps({"publicBookingGetStatus":r.status,"bodyNotPrinted":True,"responseNonEmpty":bool(b)}))'
~~~

Ese GET puede consumir buckets compartidos: no se declara toda la base inmutable desde las lecturas anteriores. Esta tarea no emitió solicitudes de creación de reservas ni acciones de envío de correo. Producción permanece sin lecturas/acciones de esta tarea.

### 13.4 Pendientes, continuación y commit local

**P2 continúa incompleto.** No hay respaldo cifrado/hash, censo de snapshot, prueba de recuperabilidad de la frase, restore completo con cotejo de roles/ACL ni ensayo de rollback §5.3. No se importó la imagen API anterior ni se ejecutó el upgrade desechable previsto. La cola/destinatarios y el orden de reanudación no fueron ensayados. Los tipos de reversión de §5.3 conservan estado **previsto**, sin atribuirles pruebas realizadas. El censo/ledger vivo de este intento no sustituye el respaldo que P3b exige.

Corrección mínima **propuesta, no ejecutada en este intento**, para la próxima preparación: sustituir `docker cp` por `docker exec -i <cliente_propio> sh -c 'cat > /tmp/qa-ca.crt'`, enviando los bytes de la CA pública por stdin binario desde Python. Así se usa el tmpfs sin relajar read-only ni montar archivos del usuario. Mantener todo secreto únicamente en memoria/env/descriptor; comprobar cifrado sintético, restore/TOC btree_gist public y artefacto anterior aislados antes de congelar. Tras indicación de continuar, repetir todas las precondiciones P2; cualquier escritura entre respaldo/reapertura y P3b exige respaldo nuevo. **Sin P3.**

El nuevo commit local se limita al presente documento y los cuatro archivos de evidencia nuevos referidos arriba, por rutas explícitas. Se valida JSON, igualdad ledger completo P0, enlaces/fences, ausencia de patrones sensibles, diff completo/whitespace e índice aislado. No hay tipos/lint/build ni cambios de código de producto. El objetivo no se declara logrado por documentar esta parada; su resultado sigue pendiente.

Validaciones documentales observadas, exit `0`: JSON, ledger P0 completo igual, cleanup coherente, enlaces existentes, fences pares y revisión de patrones sensibles. Temporales eliminados únicamente bajo `.tmp/m2-c3-p2`, con ruta absoluta comprobada, rechazo de reparse point y lista permitida de archivos propios; fuente sanitizada retenida en evidencia, custodia externa intacta.

Comandos del checkpoint local:

~~~powershell
git add -- docs/quality/M2_C3_PREFLIGHT.md docs/quality/evidence/m2-c3-p2/p2-segundo-intento.json docs/quality/evidence/m2-c3-p2/p2-preparacion.py.txt docs/quality/evidence/m2-c3-p2/p2-crypto.sh.txt docs/quality/evidence/m2-c3-p2/p2-wrapper.ps1.txt
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
git diff --cached
git diff --exit-code
git commit -m "docs(m2): registrar revalidación P2 y fallo de preparación"
git rev-parse HEAD
git status --short --branch
git show --stat --oneline HEAD
~~~

## 14. Reanudación condicionada P2: diagnóstico documental y parada — 2026-10-03

### 14.1 Informe previo y auditoría de commits

El propietario exige informar **antes de ejecutar nada nuevo en QA**, permite un único reintento únicamente para causas (ii), (iii) o (iv) anteriores al congelamiento y ordena detenerse para causa (v) o no clara. En esta reanudación se ejecutaron solo lecturas Git/evidencia local y este checkpoint documental: **cero comandos nuevos QA, SSH, SQL, HTTP, Docker o cifrado**. Producción no se leyó ni operó; sin push ni P3.

Base al retomar: `03537c2b0647734f22c601fc25baf208df957603`, rama `ai/antigravity-qa`, árbol e índice limpios, `[ahead 5]` respecto a la referencia local de origin. La advertencia `unable to find all commit-graph files` reapareció; las comprobaciones terminaron `0`, sin reparar metadata. [Evidencia de esta revisión](evidence/m2-c3-p2/p2-diagnostico-reanudacion.json).

Comandos Git exactos, desde la raíz, todos exit `0`:

~~~powershell
git branch --show-current
git rev-parse HEAD
git status --short --branch
git log --oneline 339ae92..HEAD
git show --stat --oneline 827e635
git show --stat --oneline 03537c2
git diff --name-status 339ae92..HEAD
git diff --exit-code 339ae92..HEAD -- apps ops package.json pnpm-lock.yaml
~~~

| Commit anterior | Archivos y estadística observada |
| --- | --- |
| `827e635 docs(m2): registrar parada previa de P2 sin congelar QA` | `docs/quality/M2_C3_PREFLIGHT.md` (+80), `docs/quality/evidence/m2-c3-p2/p2-parada-previa.json` (+106): 2 archivos, 186 inserciones. |
| `03537c2 docs(m2): registrar revalidación P2 y fallo de preparación` | `docs/quality/M2_C3_PREFLIGHT.md` (+88), `docs/quality/evidence/m2-c3-p2/p2-crypto.sh.txt` (+42), `p2-preparacion.py.txt` (+169), `p2-segundo-intento.json` (+546), `p2-wrapper.ps1.txt` (+17), estos cuatro últimos en el mismo directorio de evidencia: 5 archivos, 862 inserciones. |

La unión de rutas contiene únicamente el documento y cinco archivos de evidencia bajo `docs/quality/evidence/m2-c3-p2`. Los tres `.txt` contienen fuentes de helpers archivadas para auditoría; no son cambios de implementación de producto. Los dos commits documentan P2 y sus límites frente a P3; **ninguno modifica código de producto, grants o migración 28**. La revisión de patrones sensibles no halló valores de conexión PostgreSQL, claves privadas, claves Clerk ni JWT. La auditoría de rutas y el diff vacío de `apps`/`ops` confirman el alcance; no se ejecuta ninguna fuente archivada.

### 14.2 Error conservado, paso y clasificación

El comando externo fue `& ./.tmp/m2-c3-p2/run.ps1 prepare`, exit `1`. El fallo interno exacto fue:

~~~text
docker --context desktop-linux cp C:\Users\Fraylin\Desktop\Kortek-Booking\ops\oci-free-backup\prod-ca-2021.crt kortek-m2-c3-p2-client-d15070d4fd9f:/tmp/qa-ca.crt
~~~

Exit `1` en 0,219 s. Registro sanitizado realmente conservado: `{"stage":"prepare-client","errorClass":"RuntimeError","rawErrorOmitted":true}`. **El texto del error del daemon se descartó; no se puede reproducir ni certificar aquí su mensaje exacto.** Esta pérdida de diagnóstico limita la clasificación y no se sustituye por una causa supuesta. El `docker run` anterior terminó `0`; la retirada del contenedor propio mediante `docker stop --time 15` terminó `0` (§13.3).

Ocurrió en la **preparación previa a completar el paso 1 de §5.2**, tras las lecturas de baseline y antes del congelamiento. No se alcanzaron el login del cliente PG17, la transacción del paso 2, snapshot, pg_dump ni cifrado. El comando fallido fue exclusivamente local; no tocó QA. **Nunca se detuvieron API/worker QA; la ventana de 90 minutos no comenzó.** No corresponde iniciar o reiniciar servicios que esta tarea no detuvo.

Clasificación: **(v), fallo local al copiar una CA pública a un contenedor; causa detallada no clara**. Que el contenedor tuviera raíz read-only y `/tmp` en tmpfs no prueba el motivo del fallo. No se reclasifica como conectividad/SSH/sandbox sin diagnóstico conservado. El fallo SSH previo de §12 fue distinto, categoría (iii), y su lectura posterior sí terminó `0`.

No hay evidencia de que este error sea (i) permisos de `kortek_backup`: no se llegó a conectar ese cliente ni a probar SELECT para el dump. Tampoco acredita (ii) incompatibilidad pg_dump/17.6 o (iv) cifrado/prompt. Por ello **no se consume ni se ejecuta el reintento condicionado** y no se aplica la excepción de credencial migrador ni se conceden permisos.

Sobre «no se escribió nada»: se confirman cero migraciones, grants, cambios de roles/configuración y solicitudes de creación de reservas de esta tarea. **No se puede certificar cero escrituras globales durante el intento anterior**: los escritores siguieron activos y el GET final de §13.3 puede consumir buckets compartidos de límites de solicitudes. El censo previo no demuestra inmutabilidad posterior. La última comprobación histórica de servicios fue a `2026-10-03T23:29:48Z`: ambos activos, mismos PID y cero reinicios; no se presenta como una lectura actual.

### 14.3 Solución pendiente, opciones y custodia vigente

**P2 DETENIDO / INCOMPLETO por el punto 4 de la reanudación del propietario.** No hay solución aplicada ni nuevo intento. La alternativa de §13.4 con stdin sigue siendo una propuesta, no una corrección validada ni autorización para ejecutarla.

Opciones concretas para resolver la causa antes de otra decisión P2:

- Autorización expresa para un diagnóstico exclusivamente local con contenedor propio y CA pública, sin conexiones QA, credenciales ni frase; conservar mensaje sanitizado y exit code del daemon, verificar tmpfs/copia y retirar solo el contenedor propio.
- El propietario aporta el mensaje del daemon sanitizado si lo conserva, sin secretos ni datos de negocio; contrastarlo con este comando antes de proponer una corrección.

La instrucción nueva **sustituye la lectura de `Clave.txt` por una frase que el propietario introducirá en un prompt local**. No se vuelve a leer ningún archivo de credenciales o frase en esta reanudación. El wrapper histórico sí recibió un archivo DPAPI QA en §13.3; esa ejecución pasada no se reinterpreta ni se reutiliza como autorización vigente. Si un futuro diagnóstico acredita causa (i), primero debe acordarse con el propietario un canal fuera del chat sin lectura de archivos de credenciales ni exposición; solo entonces se valorará la excepción READ ONLY, snapshot consistente y statement_timeout, exclusiva del backup y nunca para API/worker.

Custodia prevista intacta: `C:\KortekBackups\qa-m2-c3`. No hay respaldo nuevo, hash o censo de snapshot que conservar o comparar antes de P3b. **No verificado en esta reanudación:** destino/escritores/ledger/release vivos; estado actual de servicios o reserva pública; causa del daemon; permisos de respaldo; versión ejecutada de pg_dump; prompt/cifrado; snapshot/dump; restore PG17, igualdad de tablas/ledger/censo/constraints/triggers/roles; rollback §5.3; orden de reanudación. No se crearon contenedores ni temporales nuevos que retirar.

### 14.4 Checkpoint documental local

Únicas rutas de este commit: el preflight y `docs/quality/evidence/m2-c3-p2/p2-diagnostico-reanudacion.json`. Validación local: JSON parseable y referencias de evidencia existentes; comparación de los commits/rutas frente a `339ae92`; patrones sensibles sin hallazgos en el diff documental; fences pares; revisión completa del diff e índice explícito. Sin pruebas API, build o llamadas QA: no hay cambio de implementación.

Incidencias documentales de esta revisión: el primer patch insertó §14 antes de §13; se corrigió el orden y el diff final conserva íntegro el texto anterior. Un patch posterior para supuestos escapes dobles fue rechazado por `Failed to find expected lines`, sin cambios: eran escapes de presentación de la salida. Se comprobó el JSON parseado contra las rutas y el comando literales, exit `0`, ambos correctos. Ninguna incidencia ejecutó operaciones QA.

Comandos del checkpoint, con revisión del índice antes de commit:

~~~powershell
git diff --check
git diff --stat
git diff
git add -- docs/quality/M2_C3_PREFLIGHT.md docs/quality/evidence/m2-c3-p2/p2-diagnostico-reanudacion.json
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
git diff --cached
git diff --exit-code
git commit -m "docs(m2): diagnosticar parada condicionada de P2"
git rev-parse HEAD
git status --short --branch
git show --stat --oneline HEAD
~~~

El SHA y estado final se entregan en la respuesta; no se insertan en su propio commit. Este checkpoint conserva la parada y no cumple el objetivo operativo P2, ni autoriza P3 o push.

### 14.5 Autorización posterior: diagnóstico solo local

El propietario autorizó reproducir Docker local, probar el bind mount de **solo la CA pública**, comprobar preparación/prompt con frase falsa, corregir el wrapper y hacer un commit local. **Detenerse al terminar:** no ejecutar P2 real ni congelar QA hasta «Autorizo ejecutar P2 ahora». No se abrió ningún archivo de credenciales/frase, conexión QA/productiva, SQL, SSH, HTTP ni servicio remoto; sin variables/flags/Clerk, migraciones, instalaciones o push.

Base inicial: **1690a1eae692064c4058358bca2f38aa541c9bba**, ai/antigravity-qa, árbol/índice limpios, ahead 6 respecto a origin local. Los comandos branch/rev-parse/status habituales terminaron 0; misma advertencia de commit-graph, sin reparación. Se aplicó kortek-delivery; la autorización vigente limita el trabajo a este diagnóstico.

El contenedor fallido original ya no existía. La [reproducción](evidence/m2-c3-p2/p2-docker-reproduccion.json) creó uno propio con **la misma configuración** anterior: imagen fija sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f, usuario por defecto, bridge, read-only, CPU 1, 768 MiB, pids 128, tmpfs /tmp:rw,size=64m y /var/run/postgresql:rw,size=16m, entrypoint sleep infinity, --rm, sin puertos publicados ni mounts del usuario. La imagen hereda un volumen anónimo en /var/lib/postgresql/data; no arrancó PostgreSQL y se verificó su retirada.

Comando exacto reproducido, exit **1 esperado**, conservado:

~~~text
docker --context desktop-linux cp C:\Users\Fraylin\Desktop\Kortek-Booking\ops\oci-free-backup\prod-ca-2021.crt kortek-m2-c3-p2-diag-b90cf13ef341:/tmp/qa-ca.crt
~~~

Mensaje real: **Error response from daemon: container rootfs is marked read-only**. El contenedor estaba running, uid=0(root) gid=0(root) groups=0(root). La escritura de una sonda por docker exec en /tmp pasó, exit 0; la CA no apareció tras cp. **Causa acreditada: el daemon rechaza docker cp por rootfs read-only aun cuando el proceso puede escribir en tmpfs.** Categoría (v), ahora diagnosticada; esta autorización local no abre P2 real.

CA: 1390 bytes, legible e igual al archivo de HEAD tras normalizar CRLF/LF. SHA-256 de los bytes reales **1dcaafbf6fda7f21e34ff35825c1a1354408ea11e5839157e690af851c73453a**, igual dentro del cliente corregido y al finalizar. La ruta Windows y desktop-linux funcionaron con bind mount: no explican el rechazo read-only de cp.

Solo inspect --format de running, ReadonlyRootfs, Tmpfs, NetworkMode, User y Mounts; imagen únicamente Id/User/Os/Architecture. Nunca inspect completo, Config.Env ni Environment. Los JSON conservan todos los argumentos literales y exit codes.

### 14.6 Corrección acotada de preparación y wrapper

Se preserva sin editar la evidencia histórica de §13. El [wrapper corregido](evidence/m2-c3-p2/p2-wrapper-corregido.ps1) y su [helper local](evidence/m2-c3-p2/p2-cliente-local.py.txt) sustituyen la preparación anterior para este ensayo: no cargan DPAPI/credenciales PG, no conectan a QA y no retienen cliente al finalizar. Solo admiten diagnostico y ensayo-local; **no son un ejecutor completo de P2 real**. La captura de stderr Docker se limita al cp de la CA pública.

Corrección ensayada: declarar al crear el cliente un único bind de archivo:

~~~text
--mount type=bind,source=C:\Users\Fraylin\Desktop\Kortek-Booking\ops\oci-free-backup\prod-ca-2021.crt,target=/tmp/qa-ca.crt,readonly
~~~

Imagen, usuario, read-only, límites y tmpfs se mantienen; el ensayo usa **network none**, pues no necesita QA. Un solo bind, CA RW=false, legible y no escribible; sin mounts de directorios, dotenv, claves o frases. El volumen anónimo heredado se eliminó con --rm, comprobado por nombre exacto.

Read-Host -AsSecureString recibe **solo frase falsa**. El wrapper la pasa al helper por stdin anónimo, y este a GPG mediante --passphrase-fd 0. No se guarda en argv, environment, archivos o informes; BSTR liberado y SecureString dispuesto al salir. No se leyó Clave.txt ni se pidió/usó la frase del propietario.

### 14.7 Ensayo en seco completo e incidencias

Comandos reales desde la raíz; exit externos **0 / 1 / 1 / 0**:

~~~powershell
& docs/quality/evidence/m2-c3-p2/p2-wrapper-corregido.ps1 -Modo diagnostico -Informe docs/quality/evidence/m2-c3-p2/p2-docker-reproduccion.json
& docs/quality/evidence/m2-c3-p2/p2-wrapper-corregido.ps1 -Modo ensayo-local -Informe docs/quality/evidence/m2-c3-p2/p2-cliente-ensayo-local.json
Move-Item -LiteralPath docs/quality/evidence/m2-c3-p2/p2-cliente-ensayo-local.json -Destination docs/quality/evidence/m2-c3-p2/p2-cliente-ensayo-local-fallo1.json
& docs/quality/evidence/m2-c3-p2/p2-wrapper-corregido.ps1 -Modo ensayo-local -Informe docs/quality/evidence/m2-c3-p2/p2-cliente-ensayo-local-fallo2.json
& docs/quality/evidence/m2-c3-p2/p2-wrapper-corregido.ps1 -Modo ensayo-local -Informe docs/quality/evidence/m2-c3-p2/p2-cliente-ensayo-local.json
~~~

Move-Item adicional terminó 0 y preservó el primer fallo antes de reutilizar la ruta. Incidencias locales, ninguna QA:

- Sandbox por defecto: Docker nativo exit 1, acceso a metadatos del contexto/config local denegado, Access is denied. El bloque PowerShell terminó 0 por comandos posteriores: **no se cuenta como éxito Docker**. Lectura local con permiso ampliado pasó; sin rechazo automático ni lectura explícita de archivos de credenciales.
- Primera consulta de imagen con {{json .Config.User}}: exit 1, template parsing error: template: :1:27: executing "" at <.Config.User>: map has no entry for key "User". Se corrigió a {{json (index .Config "User")}}; imagen null, contenedor vacío, efectivo root.
- [Primer fallo de cifrado](evidence/m2-c3-p2/p2-cliente-ensayo-local-fallo1.json): GPG exit 2, stderr no retenido. Se añadió captura sanitizada exclusivamente para GPG local y se [repitió](evidence/m2-c3-p2/p2-cliente-ensayo-local-fallo2.json): gpg: error running '/usr/bin/gpg-agent': exit status 2; failed to start gpg-agent ... General error; No agent running. Bind, PG17, hash, custodia y prompt ya pasaban; contenedores/temporales retirados.
- Normalizar argumentos GPG de rutas Windows con backslash a **/c/...** (homedir, plano, cifrado, descifrado y gpgconf) resolvió el arranque del agente y el round trip. GPG de Git usa MSYS; no se cambió configuración global ni homedir del propietario.
- Un intento de patch documental sufrió SyntaxError: missing ) after argument list antes de invocar apply_patch; sin cambios. Se corrigió el delimitado del texto, sin ejecutar comandos operativos.

[Ensayo definitivo](evidence/m2-c3-p2/p2-cliente-ensayo-local.json), exit **0**:

| Comprobación | Resultado real |
| --- | --- |
| Cliente | Linux amd64, imagen fijada; pg_dump (PostgreSQL) 17.11 (Debian 17.11-1.pgdg13+2), sin login SQL. |
| CA | Hash igual, bind único read-only, test -r y test ! -w pasan. |
| Custodia | C:\KortekBackups\qa-m2-c3 existente; sonda propia con modo xb creada, releída y retirada. No se inspeccionaron otros backups. |
| Prompt | Terminal local real: Read-Host -AsSecureString mostró solo asteriscos; entrada sintética desechable, no se reproduce en documentación. |
| Cifrado | GnuPG 2.4.5, AES256, archivo trivial sin datos de negocio; encrypt/decrypt exit 0 y bytes idénticos. Frase por stdin, sin argv/env/archivo. |
| Limpieza | gpgconf --homedir <homedir-propio-MSYS> --kill gpg-agent exit 0, solo agente propio; plano/cifrado/descifrado/homedir temporal retirados. |

El cifrado trivial **no es un respaldo P2 ni aporta hash/censo habilitante de P3b**.

### 14.8 Limpieza y límites de entrega

[Limpieza final](evidence/m2-c3-p2/p2-limpieza-local.json): cuatro contenedores y cuatro volúmenes anónimos propios ausentes. Consultas con sus nombres exactos mediante docker --context desktop-linux ps -a --filter name=<nombre-propio> --format '{{.Names}}' y docker --context desktop-linux volume ls --filter name=<volumen-propio> --format '{{.Name}}': exit 0, salida vacía. Sin prune ni objetos ajenos retirados. Temporales y sondas propias eliminados; CA original intacta. Se conservan solo fuentes corregidas y evidencia sanitizada.

**DIAGNÓSTICO LOCAL COMPLETADO / EN REVISIÓN; P2 REAL DETENIDO / INCOMPLETO.** No verificado: destino/DNS/TLS/login QA, permisos SELECT, escritores, ledger 27/28, release/servicios/Preview, reserva pública, snapshot/backup/hash/censo, restore real/roles/ACL, rollback §5.3 y orden de reanudación. PG17.11 local no demuestra restore de Supabase 17.6. Ningún servicio QA detenido/reiniciado, ventana de 90 minutos no iniciada; estado actual no certificado mediante lecturas prohibidas.

Esperar **«Autorizo ejecutar P2 ahora»**. Después, repetir desde §5.2 paso 1 las precondiciones frente a P0 e integrar la preparación local validada sin cargar credenciales por inferencia. La frase en prompt del propietario y los 90 minutos deben estar disponibles antes del congelamiento. No continuar P2 ni abrir P3 desde esta entrega.

### 14.9 Checkpoint local

Rutas: preflight, wrapper corregido, helper local como evidencia y cinco JSON nuevos. Validación local de JSON, sintaxis Python/PowerShell, enlaces/fences, patrones sensibles, diff/índice completo y áreas protegidas intactas. Sin tipos/lint/build de producto.

~~~powershell
git diff --check
git diff --stat
git diff
git add -- docs/quality/M2_C3_PREFLIGHT.md docs/quality/evidence/m2-c3-p2/p2-wrapper-corregido.ps1 docs/quality/evidence/m2-c3-p2/p2-cliente-local.py.txt docs/quality/evidence/m2-c3-p2/p2-docker-reproduccion.json docs/quality/evidence/m2-c3-p2/p2-cliente-ensayo-local-fallo1.json docs/quality/evidence/m2-c3-p2/p2-cliente-ensayo-local-fallo2.json docs/quality/evidence/m2-c3-p2/p2-cliente-ensayo-local.json docs/quality/evidence/m2-c3-p2/p2-limpieza-local.json
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
git diff --cached
git diff --exit-code
git commit -m "docs(m2): corregir preparación local Docker de P2"
git rev-parse HEAD
git status --short --branch
git show --stat --oneline HEAD
git diff --exit-code 1690a1e..HEAD -- apps ops package.json pnpm-lock.yaml
~~~

SHA/estado final en la respuesta, sin escribir el SHA del commit dentro de sí mismo. Sin push ni ejecución P2 real.

## 15. P2 autorizado: parada en paso 0, antes de congelar — 2026-10-04 UTC

### 15.1 Base y alcance

Autorización del propietario: «Autorizo ejecutar P2 ahora», sobre HEAD local **c0d9fd5d30a4acd984c4a92b0d198ce23de55822**, rama **ai/antigravity-qa**. Estado inicial limpio, ahead 7 respecto de la referencia remota local; no se consultó el remoto ni se hizo push. Se aplicó kortek-delivery y se leyeron las fuentes de gobierno. Producción cerrada e intacta; únicamente metadatos/lecturas QA y preparación local de P2. Ninguna migración, despliegue, modificación de roles/grants, variables, flags o Clerk.

La excepción acotada permitió usar el DPAPI existente del migrador QA en memoria, solo para sesiones de respaldo READ ONLY. El supervisor convirtió el valor protegido a SecureString y lo transmitió por stdin anónimo; liberó BSTR/SecureString. El hijo mantuvo la credencial únicamente en su entorno de procesos de cliente PG y la eliminó al salir; no se pasó a servicios API/worker, argumentos, informes ni archivos nuevos. No se leyó Clave.txt ni una credencial productiva. **No llegó a solicitarse ni recibirse la frase del propietario.**

Fuentes sanitizadas del intento: [ejecutor real, versión ejecutada](evidence/m2-c3-p2/p2-real-ejecutor-intento.py.txt), SHA256 269f624aac7f08d757af98352b280085f8834241ee3ebc138e56c0f8fd7d8e21, y [supervisor de prompt](evidence/m2-c3-p2/p2-real-supervisor.ps1.txt), SHA256 c0bf2d9b504ba55dd52fdb01cee9a1955add9d42275f9955e34cff88d6217213. Son evidencia, no una orden de ejecución futura. Las ramas de congelamiento, restore y rollback del ejecutor **no fueron ejecutadas ni se declaran validadas**.

### 15.2 Preparación y comandos realmente ejecutados

Se preparó el ejecutor temporal con: CA pública en bind único read-only, PG17 por ID, rutas GPG MSYS, stdin anónimo, doble confirmación de frase para cifrar y una entrada independiente para descifrar; revalidación antes de stop; parada worker → API; recuperación API → worker en finally y watchdog a 85 minutos. La ventana máxima autorizada seguía siendo 90 minutos. Se corrigió localmente que la recuperación intentase ambas unidades aunque fallase la primera y que un fallo previo al congelamiento no hiciera GET público. Nada de esto acredita ejecución de las ramas posteriores.

Validación local: sintaxis Python y AST PowerShell, exit 0. Una prueba trivial con frase aleatoria desechable cifró AES256 y descifró bytes idénticos, mediante stdin de GPG, exit 0; sin datos de negocio y sin la frase del propietario. Se retiró el cifrado trivial. Test-Path confirmó las rutas de custodia y DPAPI; no enumeró ni leyó otros respaldos.

Comandos de lanzamiento, desde la raíz; Start-Process terminó 0, que **no es el resultado de P2**:

~~~powershell
git branch --show-current
git rev-parse HEAD
git status --short --branch
$p2Errors = $null; $p2Tokens = $null
[void][Management.Automation.Language.Parser]::ParseFile((Join-Path (Get-Location) '.tmp/m2-c3-p2-real/prompt.ps1'), [ref]$p2Tokens, [ref]$p2Errors)
& 'C:\Users\Fraylin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -c "import ast,pathlib; ast.parse(pathlib.Path('.tmp/m2-c3-p2-real/run.py').read_text()); print('Ejecutor completo: sintaxis valida')"
$p2Window = Start-Process -FilePath 'C:\Users\Fraylin\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -ArgumentList @('-NoProfile','-File','C:\Users\Fraylin\Desktop\Kortek-Booking\.tmp\m2-c3-p2-real\prompt.ps1') -WindowStyle Normal -PassThru
~~~

El wrapper obtuvo la credencial QA del archivo DPAPI autorizado, sin mostrarla. El proceso P2 inició a **2026-10-04T01:27:25.451614Z** y terminó a **01:27:33.708459Z**; resultado false, salida del ejecutor **1**. Las consultas y argumentos exactos observados están en [parada paso 0](evidence/m2-c3-p2/p2-real-parada-paso0.json) y [lecturas de proveedores previas](evidence/m2-c3-p2/p2-real-paso0-proveedores.json). Los campos de entorno en los argumentos Docker son **nombres**, sin valores de credenciales. El SQL del intento está íntegro en la fuente sanitizada.

Sesión fuente, psql por stdin dentro del cliente propio:

~~~sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='120s';
SELECT json_build_object('role',current_user='kortek_migrator','database',current_database()='postgres',
  'readonly',current_setting('transaction_read_only')='on','repeatableRead',current_setting('transaction_isolation')='repeatable read',
  'version',current_setting('server_version')='17.6',
  'allSelect',NOT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public'
    AND NOT has_table_privilege(current_user,format('%I.%I',schemaname,tablename),'SELECT')));
SELECT json_agg(json_build_object('name',migration_name,'checksum',checksum,
  'finished',finished_at IS NOT NULL,'rolledBack',rolled_back_at IS NOT NULL) ORDER BY migration_name)
FROM public._prisma_migrations;
COMMIT;
~~~

El login y todos esos booleanos pasaron según la secuencia del ejecutor, que solo alcanzaba la comparación del ledger si todos eran true. Ese resultado intermedio no fue persistido por separado: se distingue de los resultados JSON retenidos. TLS verify-full y CA esperada fueron efectivos en el cliente; PGOPTIONS también exigió default_transaction_read_only y timeout. **No se ejecutó pg_dump --schema-only**, porque el ledger se comparó antes.

### 15.3 Resultado y error exacto

| Comprobación | Resultado y límite |
| --- | --- |
| Proyecto QA | Kortek Booking Cutover QA, ref prirlabbnlcuvnzuaczp, ACTIVE_HEALTHY; versión proveedor 17.6.1.166. Solo el proyecto QA. |
| Destino efectivo API | Rol/base/usuario QA/endpoint/DNS/release/deploy staging/reserva abierta: booleanos true, iguales al comienzo y al cierre. No URL de conexión registrada. |
| Servicios | API PID 673295, worker PID 575989, ambos active/running y NRestarts 0 al inicio y final; mismos PID e imágenes. |
| Release e imágenes | API release 791569b110f9fd59cb10e6d248546bdae3996e14 e imagen 701329f1cfe7b45f5b6d0cfe62daeae0edf6e1c00518158cb8555a815c224031; worker imagen 7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1. APP_RELEASE interno del worker no se consultó por separado. |
| Archivos protegidos QA | Hashes de runtime-env, dos wrappers y dos unidades iguales al baseline del segundo intento y al finalizar; sin contenido impreso. |
| Escritores previos | Runtime 4 idle, authenticator 1 idle, pgbouncer 2 idle, supabase_admin 2 idle; cero transacciones observadas, prepared 0, pg_cron ausente. Lectura puntual, sin congelamiento. |
| Cola | Abiertas 0, destinatarios abiertos no sintéticos 0, leases activos 0. Solo conteos. |
| Ledger agregado proveedor | 27 terminadas activas, 0 sin terminar activas, 28 ausente, 36 tablas. No demuestra igualdad de todos los checksums. |
| Migrador | Verificación de permisos SELECT sobre todas las tablas public, incluidas las cinco de horarios, y login READ ONLY con verify-full pasaron. Sin GRANT ni cambios de roles. El dump de prueba efectivo quedó pendiente. |
| Preview | dpl_HtCcxYumevH6xD7qVhaTcGkKU3XD, READY, SHA 9f04dbaf9a9727a5bbd9481296acbaa1ca7628a4, aliases QA y rama iguales a P0. Sin cambios Vercel. |
| Cliente/CA | pg_dump PostgreSQL 17.11, imagen d74eeac9…46f fija; CA hash 1dcaafbf6fda7f21e34ff35825c1a1354408ea11e5839157e690af851c73453a. |

**Error real del ejecutor:** RuntimeError, mensaje **ledger-difiere-P0**, en paso 0 antes de congelar, al ejecutar:

~~~python
ledger = SOURCE.json(LEDGER_SQL)
if ledger != prior['precheck']['ledger']:
    raise RuntimeError('ledger-difiere-P0')
~~~

No fue un mensaje de PostgreSQL, Docker o GPG: fue la condición local de comparación. Clasificación **(v), comparación del ledger / posible diferencia real sin resolver**. No se atribuye a permisos, cliente PG17, conectividad/TLS ni cifrado. La comparación de arrays fue demasiado sensible al orden; el ledger técnico leído no se retuvo, así que **no es posible confirmar retrospectivamente si la causa fue solo el orden o una diferencia real**. No hubo otro fallo externo en este intento.

Se obedeció la parada: **ningún stop, start, restart o escritura de negocio/DDL/grants QA fue ejecutado**. La transacción READ ONLY se cerró y el proceso liberó la credencial. No se exportó snapshot ni respaldo; la ventana de 90 minutos no comenzó. No se solicitó la frase. No se reintentó P2.

### 15.4 Diagnóstico y corrección exclusivamente locales

El baseline contiene 31 entradas técnicas: 27 terminadas activas y cuatro revertidas históricas. Tres nombres tienen varias entradas: team_invitations_a0_4 (3), client_user_b2c_link_a0_6_a (2) y facturacion_a_internal_invoices (2). ORDER BY migration_name no resuelve esos empates. Comparar listas así puede rechazar un ledger idéntico con distinto orden histórico.

Se ensayó una corrección local, conservando el multiconjunto completo de tuplas name/checksum/finished/rolledBack y su multiplicidad, sin omitir entradas revertidas ni desactivar controles. SQL con orden total y COLLATE "C"; guardar metadatos del ledger y booleanos de login antes de comparar. [Patch posterior al intento](evidence/m2-c3-p2/p2-real-correccion-ledger.diff.txt) y [pruebas locales](evidence/m2-c3-p2/p2-real-prueba-comparador-local.json).

Resultados, exit 0: una permutación del mismo ledger se acepta; checksum cambiado, entrada ausente, duplicado adicional y estado cambiado se rechazan. Sintaxis válida. **No se volvió a conectar a QA para probar esa corrección ni se confirmó la causa real.** Los metadatos son solamente del baseline guardado; no una nueva lectura del ledger.

### 15.5 Limpieza, límites y próximo punto de parada

[Limpieza](evidence/m2-c3-p2/p2-real-limpieza-paso0.json): docker rm --force --volumes del único cliente propio terminó 0; consulta posterior por su nombre exacto terminó 0 y vacía. PG data era tmpfs, sin volumen anónimo nuevo. Agente GPG de homedir propio retirado con gpgconf; fuentes/resultados sanitizados conservados como evidencia y temporales bajo la ruta absoluta .tmp/m2-c3-p2-real retirados después de comprobar destino y ausencia de reparse points. No prune ni eliminación de objetos ajenos. El supervisor ya había salido en la comprobación local de limpieza.

~~~powershell
docker --context desktop-linux ps -a --filter 'name=kortek-m2-c3-p2-client-real-429cba5c86ee' --format '{{.Names}}'
# Destino absoluto previamente validado dentro del workspace, sin reparse points:
Remove-Item -LiteralPath 'C:\Users\Fraylin\Desktop\Kortek-Booking\.tmp\m2-c3-p2-real' -Recurse -Force
~~~

**P2 DETENIDO / INCOMPLETO.** Pendiente/no verificado: igualdad completa del ledger vivo; dump schema-only efectivo; censo vivo de clientes/reservas (20/28 es antecedente P0, no resultado de este intento); revalidación inmediatamente anterior al stop; desaparición de escritores congelados; snapshot/dump/cifrado con la frase del propietario; hash/censo de respaldo; restore PG17/TOC public-btree_gist; igualdad de datos, constraints, triggers, roles/ACL; recuperación y ensayos de §5.3; medición de RTO; HTTP de reserva pública. Reserva abierta por flag no demuestra HTTP 200. No se necesitó reanudar servicios porque nunca se detuvieron; la recuperación prevista no quedó ensayada en vivo.

**No hay respaldo P2 nuevo, hash habilitante ni censo de snapshot que permita comprobar P3b.** La custodia C:\KortekBackups\qa-m2-c3 permaneció intacta y no se inspeccionaron otros archivos. La regla sigue siendo: cualquier escritura posterior al futuro respaldo exige uno nuevo antes de P3b. Producción intacta; P3 cerrado.

Siguiente acción tras nueva orden del propietario: revisar/aplicar la corrección local del comparador y repetir desde paso 0. Capturar solamente ledger técnico y diferencias sanitizadas antes de decidir si coincide realmente con P0. Ante cualquier diferencia, parar; no editar ledger ni conceder permisos. Esta entrega **no ejecuta un segundo intento**.

### 15.6 Checkpoint local

Solo este documento y siete archivos nuevos de evidencia sanitizada; fuentes del intento archivadas como texto, sin código de producto modificado. Validaciones: JSON/sintaxis, patch local, enlaces/fences, ausencia de patrones sensibles, diff e índice explícitos, áreas apps/ops/dependencias sin cambios.

Incidencia documental local después de la parada: primer validador exit 1, UnicodeDecodeError de cp1252 al leer documentación UTF-8; el patch ya había sido reconstruido y validado solo en memoria. Se repitió exclusivamente esa validación local con encoding utf-8 explícito, exit 0. No ejecutó el cliente, credenciales, red ni SQL. Sin fallos intermedios adicionales QA.

La revisión automática rechazó un staging posterior que añadía host DB e ID del proyecto en campos nuevos, por considerarlos metadatos de conexión. No modificó el índice ni ejecutó QA. Se retiraron esos campos nuevos: el identificador de las consultas de proveedor se representa como referencia QA de P0 y el destino como booleano de igualdad. Se conserva el SQL exacto; no se interpreta el rechazo como permiso para ampliar acceso ni repetir P2.

~~~powershell
git diff --check
git diff --stat
git diff
git add -- docs/quality/M2_C3_PREFLIGHT.md docs/quality/evidence/m2-c3-p2/p2-real-paso0-proveedores.json docs/quality/evidence/m2-c3-p2/p2-real-ejecutor-intento.py.txt docs/quality/evidence/m2-c3-p2/p2-real-supervisor.ps1.txt docs/quality/evidence/m2-c3-p2/p2-real-parada-paso0.json docs/quality/evidence/m2-c3-p2/p2-real-correccion-ledger.diff.txt docs/quality/evidence/m2-c3-p2/p2-real-prueba-comparador-local.json docs/quality/evidence/m2-c3-p2/p2-real-limpieza-paso0.json
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
git diff --cached
git diff --exit-code
git commit -m "docs(m2): registrar parada P2 antes de congelar QA"
git rev-parse HEAD
git status --short --branch
git show --stat --oneline HEAD
git diff --exit-code c0d9fd5..HEAD -- apps ops package.json pnpm-lock.yaml
~~~

SHA y estado final en la respuesta. Sin push; sin P3; sin aprobación de P2.

## 16. Segundo intento condicionado: arnés local detenido — 2026-10-04 UTC

### 16.1 Autorización, base y separación de pasos

El propietario autorizó reintentar P2 sobre **a19fdedfca5cda1f327e7182bbd037ecaedcdd54**, únicamente si primero pasaba un arnés local completo. Rama **ai/antigravity-qa**, árbol inicialmente limpio, ahead 8 respecto de la referencia remota local. Sin consulta del remoto ni push. Se aplicó kortek-delivery y se leyeron gobierno, gates, instrucciones API, preflight y código aplicable.

La orden era condicional: paso A local → paso B READ ONLY QA sin congelar → paso C P2 completo. **El paso A falló: B y C no se iniciaron.** Cero conexiones QA/productivas, lecturas DPAPI/Clave.txt, uso de frase real, comandos de servicios QA, migraciones/DDL/grants QA, despliegues o cambios de variables/flags/Clerk. El archivo de credencial seguía autorizado para B, pero no fue abierto. No se inició la ventana de 90 minutos.

### 16.2 Preparación local del ejecutor y el arnés

Se reconstruyó temporalmente la fuente de §15 y se aplicó la corrección del multiconjunto. Cada entrada conserva name/checksum/finished/rolledBack; orden total con COLLATE "C", multiplicidad íntegra y diferencia Counter missing/extra. El ejecutor ahora persiste, antes de decidir igualdad, ledger técnico leído, baseline y diferencia, sin columna logs ni filas de negocio. Esto se alcanzó **solo con el ledger sintético**, no con QA.

Se añadieron entradas falsas duplicadas de frase al ejecutor, manteniendo la comparación SecureString del supervisor y verificando también ambas entradas en Python. Para B, el prompt quedaría antes de la revalidación y de cualquier stop. Se separó la fuente local de la QA mediante adaptadores del arnés: PG17 propio sin red externa; PGHOST loopback dentro del contenedor; PGSSLMODE disable solo para esa fuente local trust; ningún DPAPI; servicios/infra/release como stubs; HTTP de respuesta sintética loopback; artefacto anterior previsto desde Git local en A, conservando la rama de imagen QA para una eventual ejecución autorizada posterior.

El código de recuperación intenta API → worker aunque falle el primer comando y verifica después ambas unidades: un error de respuesta SSH no se acepta como recuperación por inferencia. El arnés preveía probar ese caso con un fallo de respuesta después de cambiar el estado del stub, y el watchdog con reloj adelantado 5.100 segundos. **Estas ramas no fueron ejecutadas y no se certifican.**

Fuentes efectivamente usadas, archivadas solo como evidencia:

| Fuente | SHA256 del archivo archivado |
| --- | --- |
| [Ejecutor](evidence/m2-c3-p2/p2-reintento-ejecutor.py.txt) | d60f9b7601fa6de2408540b3c9d474874ce4df71774cdb5ef531be8406635ec6 |
| [Arnés](evidence/m2-c3-p2/p2-reintento-arnes.py.txt) | 172c37de211e3f5f38742da3925676a13e8015495402fea147c673e0bf465b0b |
| [Supervisor](evidence/m2-c3-p2/p2-reintento-supervisor.ps1.txt) | 5fc0d28d19277b767a34746ee4da033dfa51a064084ba271008a1b93ed71fdc5 |

No son ejecutores aprobados para QA. Los adaptadores sustituyen destinos/servicios para A; no prueban TLS real, infraestructura ni el artefacto desplegado.

### 16.3 Comandos y resultados reales del paso A

Desde la raíz, una única ejecución formal del arnés:

~~~powershell
git branch --show-current
git rev-parse HEAD
git status --short --branch
New-Item -ItemType Directory -Path '.tmp/m2-c3-p2-reintento' -Force
Copy-Item -LiteralPath 'docs/quality/evidence/m2-c3-p2/p2-real-ejecutor-intento.py.txt' -Destination '.tmp/m2-c3-p2-reintento/run.py'
Copy-Item -LiteralPath 'docs/quality/evidence/m2-c3-p2/p2-real-supervisor.ps1.txt' -Destination '.tmp/m2-c3-p2-reintento/prompt.ps1'
& 'C:\Users\Fraylin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -u '.tmp/m2-c3-p2-reintento/harness.py'
~~~

La reconstrucción aplicó localmente el diff sin contexto de §15; después se prepararon las adaptaciones que constan en las fuentes anteriores. Copias/preparación terminaron 0. El comando del arnés terminó **1** en 9,14 s; no se cuenta como éxito. El recorrido local registró inicio **02:09:51.677074Z** y fin **02:09:58.046741Z**. [Resultado del arnés](evidence/m2-c3-p2/p2-reintento-arnes.json), [42 comandos y resultado del recorrido](evidence/m2-c3-p2/p2-reintento-recorrido-local.json), [diagnóstico estático](evidence/m2-c3-p2/p2-reintento-diagnostico-local.json).

El arnés inicializó una base vacía propia a partir de las 27 definiciones SQL del commit local 791569b, con seed exclusivamente sintético. Este DDL fue preparación de la fuente desechable de A, nunca una migración de QA. El fixture previsto tenía 20 clientes/28 reservas, sin vínculos ni cola abierta; ese seed terminó 0, pero **no se alcanzó el censo de snapshot**. El ledger sintético contenía 27 terminadas y cuatro revertidas, con tres nombres repetidos. Se verificó btree_gist en public, antes de proceder. Las entradas técnicas están conservadas sin logs ni filas de negocio.

| Comprobación realmente alcanzada | Resultado |
| --- | --- |
| Sintaxis Python | Fuente analizada y cargada por el arnés. |
| Comparador local | Permutación aceptada; entradas faltantes/adicionales, checksum y estado alterados rechazados; multiplicidad conservada. |
| Helper SecureString | Misma frase falsa aceptada y repetición de longitud distinta rechazada; sin DPAPI ni frase real. No acredita todavía el escenario completo de rechazo antes de stop. |
| Fuente | Contenedor propio PG17 fijado por ID, read-only, tmpfs, network none, CA pública en bind único read-only. |
| Cliente/CA | pg_dump PostgreSQL 17.11, SHA CA 1dcaafbf6fda7f21e34ff35825c1a1354408ea11e5839157e690af851c73453a. |
| Login local | Rol/base/READ ONLY/REPEATABLE READ/versión/SELECT: todos true. Es conexión local trust; no TLS QA. |
| Ledger local leído | 31 entradas, 27 activas terminadas, cuatro revertidas; baseline conservado; equal=true, missing=[], extra=[]. |
| Catálogo y recorrido posterior | JSONDecodeError en paso0 al leer agregados; recorrido completo interrumpido. |
| Stubs de servicios | Ningún stop ni start llamado. Estado final informado por stubs, no por QA. |

Los argumentos binarios/SQL exactos se reconstruyen desde las fuentes y las arrays de comandos; los valores de frases/contraseñas sintéticas se generaron solo en memoria y no se registran. No se creó archivo de dump/cifrado, fuente de restore ni imagen anterior nueva.

### 16.4 Fallos y límite del diagnóstico

**Primer fallo observado:** JSONDecodeError del ejecutor, fase paso0, después de guardar el ledger local idéntico al baseline. El mensaje y el payload no se persistieron; label quedó detalle-omitido. La siguiente secuencia del código era:

~~~python
catalog = SOURCE.json(CATALOG_SQL)
roles = SOURCE.json(ROLE_SQL)
counts = SOURCE.json(COUNTS_SQL)
~~~

Reader.json usa json.loads(self.q(sql)[0]): procesa solo la primera línea. Un resultado JSON agregado puede contener saltos de línea válidos, y entonces esa selección es insuficiente. **Hallazgo estático / causa posible; sin payload retenido no se afirma cuál de los tres agregados falló ni se reconstruye un mensaje JSON que no se guardó.** La corrección propuesta es analizar el resultado completo de una sola columna y registrar la etiqueta de la consulta fallida, sin payload ni filas.

**Segundo fallo observado:** TypeError propagado al arnés al comunicar la primera excepción. El código llama emit('parada', **REPORT['failure']); failure ya contiene stage y emit tiene un parámetro stage. Hay colisión de argumentos. El mensaje reconstruible por esa firma es emit() got multiple values for argument 'stage', pero el arnés no conservó el mensaje original: se distingue de las clases registradas. La corrección propuesta es separar evento y fase del fallo, preservando ambos.

Se obedeció la condición de parada: **no se corrigió ni se volvió a ejecutar el arnés después del fallo**; no se lanzaron las cuatro pruebas posteriores ni B/C. El finally sí cerró el reader, descartó las entradas falsas de memoria y retiró el contenedor local; ninguna unidad QA requirió recuperación.

Otro punto estático para la próxima preparación: Reader abre streams text=True sin encoding explícito, mientras el restore local decodifica UTF-8. Debe fijarse una codificación coherente antes de cotejar definiciones no ASCII. No se atribuye a este punto el fallo observado ni se ejecutó una prueba posterior para confirmarlo.

### 16.5 Limpieza y no verificado

[Limpieza local](evidence/m2-c3-p2/p2-reintento-limpieza-local.json): docker rm --force --volumes del único contenedor propio exit 0; consulta por su nombre exacto exit 0, vacía. PG data era tmpfs. La raíz absoluta propia se comprobó dentro del workspace y sin reparse points antes de eliminarla. Se conservaron únicamente documento/evidencia sanitizados. Sin prune ni eliminación de objetos ajenos; custodia C:\KortekBackups\qa-m2-c3 sin acceso.

~~~powershell
docker --context desktop-linux ps -a --filter 'name=kortek-m2-c3-p2-client-real-6d7e1178b4c0' --format '{{.Names}}'
# Solo después de comprobar ruta absoluta y ausencia de reparse points:
Remove-Item -LiteralPath 'C:\Users\Fraylin\Desktop\Kortek-Booking\.tmp\m2-c3-p2-reintento' -Recurse -Force
~~~

**PASO A DETENIDO / INCOMPLETO; P2 INCOMPLETO.** No verificado: snapshot/dump/cifrado/descifrado de fuente local; restore en segundo contenedor y alternativa TOC public; igualdad de conteos/constraints/triggers/roles; rollback aislado completo; fallo precongelamiento como caso inyectado; recuperación API/worker ante primer start fallido; activación real del callback watchdog mediante reloj controlado; frase mal repetida como escenario completo. Las pruebas unitarias parciales no habilitan B.

**QA no fue leído ni tocado en este intento.** No hay comprobación viva de destino/escritores/ledger/release/imágenes/HTTP, frase real, dump schema-only, congelamiento, respaldo AES256 nuevo, hash/censo de snapshot ni restore habilitante. Los estados anteriores de §15 son históricos y no se renuevan con stubs. Sin RTO/RPO acreditados, sin P3 ni producción.

Siguiente paso solo tras nueva orden del propietario: corregir lectura JSON y colisión de eventos, mejorar retención sanitizada de errores, y repetir A completo desde cero. No solicitar DPAPI/frase real ni conectar a QA antes de un A íntegramente pasado. Si vuelve a fallar, detener; ninguna diferencia o fallo autoriza editar ledger/grants.

### 16.6 Checkpoint local

Commit exclusivamente del preflight y siete evidencias nuevas, por rutas explícitas. Validación documental de JSON, sintaxis de fuentes como texto, enlaces/fences, patrones sensibles, diff/índice y áreas protegidas; no ejecución adicional del arnés ni tests de producto.

~~~powershell
git diff --check
git diff --stat
git diff
git add -- docs/quality/M2_C3_PREFLIGHT.md docs/quality/evidence/m2-c3-p2/p2-reintento-ejecutor.py.txt docs/quality/evidence/m2-c3-p2/p2-reintento-arnes.py.txt docs/quality/evidence/m2-c3-p2/p2-reintento-supervisor.ps1.txt docs/quality/evidence/m2-c3-p2/p2-reintento-arnes.json docs/quality/evidence/m2-c3-p2/p2-reintento-recorrido-local.json docs/quality/evidence/m2-c3-p2/p2-reintento-diagnostico-local.json docs/quality/evidence/m2-c3-p2/p2-reintento-limpieza-local.json
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
git diff --cached
git diff --exit-code
git commit -m "docs(m2): registrar parada del arnes local P2"
git rev-parse HEAD
git status --short --branch
git show --stat --oneline HEAD
git diff --exit-code a19fded..HEAD -- apps ops package.json pnpm-lock.yaml
~~~

SHA/estado final en la respuesta. Sin push, P3, QA real ni aprobación de P2.

## 17. Correcciones y P2 sin congelamiento: arnés local detenido — 2026-10-03

### 17.1 Base, autorización y regla operativa vigente

Base inicial **25fbdd3241b926925a3af435d8ecb5c4ddd99fad**, rama **ai/antigravity-qa**, árbol limpio, ahead 9 respecto de la referencia local origin. No se consultó el remoto. El propietario autorizó correcciones y simplificación, con A local completo como condición indispensable para B READ ONLY QA y C. **A falló; B y C no se iniciaron.**

P2 queda **sin congelamiento**: servicios QA en marcha, ningún stop/start/restart, recuperación ni watchdog; sin ventana de 90 minutos. Snapshot exportado en transacción REPEATABLE READ READ ONLY del migrador con statement_timeout; dump y censo del mismo corte aunque el origen siga recibiendo escrituras. No comparar el restore con un origen posterior como si fuera el snapshot.

**P3b exige siempre un respaldo nuevo bajo congelamiento inmediatamente antes de migrar: dump, hash, censo del corte y restore verificado.** El eventual respaldo de P2 no sustituye ese corte, aunque parezca no haber nuevas escrituras. No se autorizó ni ejecutó P3. El control de servicios y watchdog anteriores se conservan únicamente como material histórico para revisar antes de P3b: [ejecutor de §16](evidence/m2-c3-p2/p2-reintento-ejecutor.py.txt); no se incluyeron sus funciones en el ejecutor nuevo ni se llamaron.

Producción cerrada e intacta. Sin conexiones QA/productivas, lectura DPAPI/Clave.txt, frase real, servicios remotos, migraciones/roles/grants/configuración QA, despliegues, dependencias nuevas o push. La credencial y frase reales siguen reservadas para B/C: ningún prompt real se abrió en A. La ruta custodiada C:\KortekBackups\qa-m2-c3 no se leyó ni escribió.

### 17.2 Correcciones preparadas antes de A

- Reader.json analiza todas las líneas de una sola columna JSON mediante json.loads('\n'.join(...)); cada consulta se etiqueta (login, ledger, catálogo, roles, conteos y censo por tabla). El error JSON no incluye el payload.
- Se separaron event y phase. La excepción conserva exceptionClass, messageSanitized, queryLabel y tracebackSanitized; los frames guardan archivo/línea/función, nunca código, argumentos o locales. El error original y el del emisor se guardan por separado, sin colisión de stage.
- UTF-8 explícito en streams text de psql, codecs de SQL/JSON y supervisor; PGCLIENTENCODING=UTF8 y pg_dump --encoding=UTF8. Dump/restore y GPG permanecen binarios para no transformar el respaldo.
- Escritura atómica result.json.tmp → result.json; fallback de persistencia separado. Se redactan valores privados conocidos, literales entre comillas y direcciones. Stderr externo se drena en memoria para evitar bloqueos; **su selección de diagnóstico resultó insuficiente para GPG**, según §17.4.
- Doble frase antes de operaciones y de leer DPAPI en la rama real; segunda introducción independiente para descifrar. Supervisor y ejecutor reciben frase por stdin anónimo, sin argv, entorno ni archivo. Estas ramas reales no se ejecutaron. Solo se probaron frases sintéticas generadas en memoria.
- Se retiró de P2 todo control de servicios, gates de congelamiento, recuperación y watchdog. El arnés prohíbe SSH; sustituye infraestructura/escritores/release por stubs y HTTP por loopback sintético. La fuente y destinos locales son PG17 fijado por ID, sin red, read-only/tmpfs; CA pública en bind único read-only.

Las fuentes ejecutadas se archivan como evidencia; **no se declaran listas para QA**:

| Fuente | SHA256 |
| --- | --- |
| [p2-sin-congelar-ejecutor.py.txt](evidence/m2-c3-p2/p2-sin-congelar-ejecutor.py.txt) | 4ab88dacbb9adf3d939951a438d157a244dc59a40c5a1640ab65b400e4480eb0 |
| [p2-sin-congelar-arnes.py.txt](evidence/m2-c3-p2/p2-sin-congelar-arnes.py.txt) | 79554f6143d31c52557e8202d57c47a199fb9ee628b36520e8a4705748ef1a94 |
| [p2-sin-congelar-supervisor.ps1.txt](evidence/m2-c3-p2/p2-sin-congelar-supervisor.ps1.txt) | a2f44ce1814a0c13fb4ba3d2db86bdad174976aa8a2e212970f27083bf069cf0 |

No se modificó código de producto ni SQL operativo versionado. El DDL/roles/grants/seed de A construyen únicamente una fuente nueva sintética desechable con las 27 definiciones de Git local 791569b; no son migraciones de QA. El ensayo de rollback previsto reutiliza SQL desechable existente solo en clones; **no se alcanzó**.

### 17.3 Comandos y resultados reales

~~~powershell
git branch --show-current
git rev-parse HEAD
git status --short --branch
New-Item -ItemType Directory -Path '.tmp/m2-c3-p2-sin-congelar' -Force
Copy-Item -LiteralPath 'docs/quality/evidence/m2-c3-p2/p2-reintento-ejecutor.py.txt' -Destination '.tmp/m2-c3-p2-sin-congelar/run.py'
Copy-Item -LiteralPath 'docs/quality/evidence/m2-c3-p2/p2-reintento-supervisor.ps1.txt' -Destination '.tmp/m2-c3-p2-sin-congelar/prompt.ps1'
Copy-Item -LiteralPath 'docs/quality/evidence/m2-c3-p2/p2-reintento-arnes.py.txt' -Destination '.tmp/m2-c3-p2-sin-congelar/harness.py'
# Preparación y revisión estática; no ejecutan el arnés ni QA:
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' '.tmp/m2-c3-p2-sin-congelar/preparar.py'
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' '.tmp/m2-c3-p2-sin-congelar/preparar_arnes.py'
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' '.tmp/m2-c3-p2-sin-congelar/preparar_supervisor.py'
# Una única ejecución formal de A:
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -u '.tmp/m2-c3-p2-sin-congelar/harness.py'
~~~

Preparación inicial: exit 1 por SyntaxError en el generador, comillas de un patrón regex; corrigió el generador antes de escribir/ejecutar el ejecutor preparado. Segunda preparación y AST Python/PowerShell: exit 0. Fue una incidencia estática previa a A, conservada en [diagnóstico](evidence/m2-c3-p2/p2-sin-congelar-diagnostico-local.json); no un reintento del arnés. No hubo preparación posterior al fallo formal.

**Arnés formal: exit 1.** [Resultado del arnés](evidence/m2-c3-p2/p2-sin-congelar-arnes.json); [49 comandos y recorrido local](evidence/m2-c3-p2/p2-sin-congelar-recorrido-local.json). Las arrays conservan argumentos exactos, con token de snapshot sustituido por marcador; SQL/entrada binaria se reconstruyen de las fuentes, sin claves. El emisor solicitar-credencial-DPAPI-QA se alcanzó como evento del ejecutor adaptado, pero el arnés alimentó una contraseña falsa y destino loopback; **no ejecutó el lector DPAPI del supervisor**.

| Comprobación alcanzada | Resultado real |
| --- | --- |
| SecureString local | Misma frase falsa aceptada y otra repetición rechazada; sin DPAPI. |
| Comparador | Permutación aceptada; falta, duplicado adicional y checksum alterado rechazados; multiplicidad preservada. |
| JSON multilínea / UTF-8 | Agregado de una columna con saltos de línea y áéíóú analizado completo. |
| Regla nueva: error y manejador inyectados | ValueError original y TypeError del emisor persistidos con fase/evento/mensaje/traceback; valor falso redactado. |
| Fallo inyectado de save | Fallback conservó también OSError de persistencia. Es prueba unitaria con save sustituido, no un disco realmente inaccesible. |
| Fuente | PG17.11; imagen sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f; btree_gist en public. |
| CA | Bind read-only, hash 1dcaafbf6fda7f21e34ff35825c1a1354408ea11e5839157e690af851c73453a. |
| Login local | RR/READ ONLY, timeout 120 s, SELECT de todas las tablas incluidas horarios; conexión trust local, no TLS QA. |
| Ledger local | 31 entradas: 27 terminadas y cuatro revertidas, nombres repetidos; observado/baseline/diferencia conservados en paso0 y snapshot; igualdad, sin logs. |
| Censo previo / schema-only | 36 tablas, 20 clientes, 28 reservas, cero vinculados/cola/leases; schema-only exit 0 y archivo tmpfs descartado. |
| Snapshot y concurrencia local | Transacción RR/RO abierta y snapshot exportado; escritura sintética posterior confirmada elevó fuente a 21 clientes; dump usó el snapshot y terminó 0. Restore no alcanzado: aislamiento extremo a extremo no acreditado. |
| Cifrado del dump | GPG exit 2; archivo .partial retirado, custodia local vacía; ningún respaldo aceptado ni hash/censo cifrado disponible. |
| Servicios / red | Cero llamadas SSH/control de servicios; solo stubs y contenedor local sin red. |

[Errores unitarios](evidence/m2-c3-p2/p2-sin-congelar-unidades.json) y [fallback](evidence/m2-c3-p2/p2-sin-congelar-fallback.json) acreditan la conservación de ambas causas y los frames sanitizados.

### 17.4 Fallo formal, causa conservada y límite

Fase **snapshot-censo-dump-cifrado**, evento **parada**, clase **RuntimeError**, mensaje sanitizado realmente guardado:

~~~text
gpg-cifrar-dump; exit=2; gpg: keybox [literal omitido] created
~~~

Cadena de frames: run.py:698 main → harness.py:167 stream_encrypt → run.py:464 stream_encrypt → run.py:99 command_failure. El arnés guardó además su RuntimeError de recorrido-local-completo-fallo. No hubo colisión secundaria, JSONDecodeError ni parada sin clase/fase/traceback.

queryLabel=censo-roles identifica la última consulta procesada; no atribuye el fallo de GPG a una consulta SQL. No se registró un fallo JSON en este recorrido.

Comando exacto que devolvió 2 (rutas MSYS normalizadas; la frase no figura en argv):

~~~text
C:/Program Files/Git/usr/bin/gpg.exe --no-options --homedir /c/Users/Fraylin/Desktop/Kortek-Booking/.tmp/m2-c3-p2-sin-congelar/case-recorrido-completo/gpg-home --no-symkey-cache --batch --pinentry-mode loopback --passphrase-fd 0 --symmetric --cipher-algo AES256 --output /c/Users/Fraylin/Desktop/Kortek-Booking/.tmp/m2-c3-p2-sin-congelar/case-recorrido-completo/custody/qa-m2-c3-p2-20261004T034618Z-9f7122e5b645.dump.gpg.partial
~~~

**Causa específica de GPG no determinada.** safe_stderr eligió la primera línea que contiene gpg:, que era información de creación del keybox, y no conservó el resto del stderr causal. El proceso ya terminó y no se reconstruye un mensaje inexistente en la evidencia. La clase, exit code, evento, fase y traceback sí están conservados; la regla nueva **no se acredita completamente para fallos externos**, porque este selector aún puede perder su explicación causal. No atribuir a frase, TLS, permisos QA, ruta o sockets sin diagnóstico real. No hubo lectura de datos reales que pudiera justificar ocultar por completo la causa.

**Se detuvo al primer fallo formal; no se corrigió ni reintentó después, no se ejecutó B/C.** Próxima preparación solo tras nueva orden: conservar los diagnósticos causales GPG sanitizados, priorizando errores frente a información; diagnosticar localmente el cifrado sin QA/frase real; comprobar la persistencia de errores externos además de excepciones Python y repetir A completo. No se infiere autorización para continuar desde este documento.

### 17.5 Limpieza, límites y checkpoint

finally cerró el reader/transacción, descartó claves falsas del ejecutor, eliminó el .partial, retiró el único contenedor propio con sus volúmenes y terminó el agente GPG de su homedir propio. Ambos comandos de limpieza exit 0. PG data/tmp eran tmpfs, sin puertos ni volumen de datos persistente. La consulta posterior por el nombre exacto del contenedor terminó 0 y vacía. [Limpieza](evidence/m2-c3-p2/p2-sin-congelar-limpieza-local.json).

~~~powershell
docker --context desktop-linux rm --force --volumes kortek-m2-c3-p2-client-real-9f7122e5b645
& 'C:/Program Files/Git/usr/bin/gpgconf.exe' --homedir /c/Users/Fraylin/Desktop/Kortek-Booking/.tmp/m2-c3-p2-sin-congelar/case-recorrido-completo/gpg-home --kill gpg-agent
docker --context desktop-linux ps -a --filter 'name=kortek-m2-c3-p2-client-real-9f7122e5b645' --format '{{.Names}}'
# Tras archivar y comprobar ruta absoluta propia y ausencia de reparse points:
Remove-Item -LiteralPath 'C:\Users\Fraylin\Desktop\Kortek-Booking\.tmp\m2-c3-p2-sin-congelar' -Recurse -Force
~~~

**A DETENIDO / INCOMPLETO; P2 INCOMPLETO.** No verificado: descifrado independiente; segundo contenedor y alternativa TOC; igualdad completa restaurada de tablas/conteos/constraints/triggers/roles; rollback §5.3; cuatro escenarios de fallo del ejecutor (los unitarios de persistencia sí pasaron, sin sustituir esos escenarios). No se creó hash o censo de respaldo aceptado. Causa GPG pendiente, sin retry.

**QA no leído ni tocado:** sin revalidación viva de destino/escritores/ledger/release, TLS verify-full, permisos reales, imagen/PID/reinicios API/worker ni HTTP real de reserva pública. Los stubs y resultados locales no renuevan P0. Sin preparación/migración/despliegue productivos, sin P3 ni push.

Commit local limitado a este documento y evidencia sanitizada, por rutas explícitas. Validaciones documentales/AST/JSON/alcance, revisión completa del índice y patrones sensibles. No builds ni pruebas de producto ni nuevas ejecuciones funcionales tras la parada. SHA y git status finales en el relevo.

~~~powershell
git diff --check
git diff --stat
git diff
git add -- docs/quality/M2_C3_PREFLIGHT.md docs/quality/evidence/m2-c3-p2/p2-sin-congelar-ejecutor.py.txt docs/quality/evidence/m2-c3-p2/p2-sin-congelar-arnes.py.txt docs/quality/evidence/m2-c3-p2/p2-sin-congelar-supervisor.ps1.txt docs/quality/evidence/m2-c3-p2/p2-sin-congelar-arnes.json docs/quality/evidence/m2-c3-p2/p2-sin-congelar-recorrido-local.json docs/quality/evidence/m2-c3-p2/p2-sin-congelar-unidades.json docs/quality/evidence/m2-c3-p2/p2-sin-congelar-fallback.json docs/quality/evidence/m2-c3-p2/p2-sin-congelar-diagnostico-local.json docs/quality/evidence/m2-c3-p2/p2-sin-congelar-limpieza-local.json
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
git diff --cached
git diff --exit-code
git diff --cached --exit-code -- apps ops package.json pnpm-lock.yaml
git commit -m "docs(m2): documentar arnes P2 sin congelamiento detenido"
git rev-parse HEAD
git status --short --branch
git show --stat --oneline HEAD
git diff --exit-code 25fbdd3..HEAD -- apps ops package.json pnpm-lock.yaml
~~~


## 18. Diagnóstico GPG local y nueva ejecución de A detenida — 2026-10-04

### 18.1 Autorización, base y alcance

HEAD inicial **768d898e27685216b40b699cf5ad9e3f7c1cfd76**, rama **ai/antigravity-qa**, árbol limpio; ahead 10 frente a la referencia local origin, sin lectura del remoto. Se aplicó kortek-delivery y el gobierno documental pertinente. Solo diagnóstico local de GPG y una nueva ejecución completa de A; **ninguna autorización B/C**. Las secciones anteriores se conservan sin edición.

Producción cerrada e intacta; QA no se leyó ni tocó. Sin DPAPI, Clave.txt, frase real, control de servicios remotos, migraciones/roles/grants/configuración QA, despliegues, dependencias nuevas, push ni P3. El helper SecureString se ejecutó únicamente con -PruebaLocal, que retorna antes de leer DPAPI; no se abrió prompt real. Todas las frases y entradas falsas se generaron solo en memoria.

### 18.2 Reproducción exacta y diagnóstico del agente

[Diagnóstico largo](evidence/m2-c3-p2/p2-gpg-diagnostico.json), [script ejecutado](evidence/m2-c3-p2/p2-gpg-diagnostico.py.txt). Se recreó únicamente la raíz temporal propia anterior, comprobada ausente. Misma array GPG de §17, mismos homedir/output y flags; stdin contenía una frase falsa nueva y un archivo trivial, sin datos reales. La clave no consta en argv, entorno, archivo ni evidencia.

~~~text
C:/Program Files/Git/usr/bin/gpg.exe --no-options --homedir /c/Users/Fraylin/Desktop/Kortek-Booking/.tmp/m2-c3-p2-sin-congelar/case-recorrido-completo/gpg-home --no-symkey-cache --batch --pinentry-mode loopback --passphrase-fd 0 --symmetric --cipher-algo AES256 --output /c/Users/Fraylin/Desktop/Kortek-Booking/.tmp/m2-c3-p2-sin-congelar/case-recorrido-completo/custody/qa-m2-c3-p2-20261004T034618Z-9f7122e5b645.dump.gpg.partial
~~~

Exit **2** reproducido. Stderr completo, redactado, sin escoger líneas y por debajo de 8 KB:

~~~text
gpg: keybox [literal omitido] created
gpg: error running [literal omitido]: exit status 2
gpg: failed to start gpg-agent [literal omitido]: General error
gpg: can't connect to the gpg-agent: General error
gpg: problem with the agent: No agent running
~~~

Comprobaciones adicionales exactas:

~~~powershell
& 'C:/Program Files/Git/usr/bin/gpgconf.exe' --homedir /c/Users/Fraylin/Desktop/Kortek-Booking/.tmp/m2-c3-p2-sin-congelar/case-recorrido-completo/gpg-home --launch gpg-agent
& 'C:/Program Files/Git/usr/bin/gpg-connect-agent.exe' --homedir /c/Users/Fraylin/Desktop/Kortek-Booking/.tmp/m2-c3-p2-sin-congelar/case-recorrido-completo/gpg-home --no-autostart /bye
~~~

Launch devolvió **1**, stderr completo:

~~~text
gpgconf: error running [literal omitido]: exit status 1
gpgconf: error running [literal omitido]: General error
~~~

La consulta de estado devolvió **0** pero informó que no había agente, sin arrancarlo automáticamente:

~~~text
gpg-connect-agent: can't connect to the gpg-agent: File name too long
gpg-connect-agent: no gpg-agent running in this session
~~~

**Hipótesis confirmada por la medición y el diagnóstico real:** homedir MSYS de **99** caracteres, socket S.gpg-agent de **111**, frente al límite de 108 planteado por el propietario; el agente no pudo conectarse por File name too long. La prueba con homedir corto pasó conservando GPG y sus flags de cifrado.

Incidencia del registrador del diagnóstico: esperaba exit 1/2 para el estado ausente y rechazó el exit 0, por lo que su wrapper terminó **1** con RuntimeError; mensaje completo/fase/traceback conservados. **El comando de estado no se repitió.** Se interpretó su stderr real de ausencia, no el exit 0 como prueba de agente activo. Esta incidencia previa a A no se ocultó ni se reejecutó el diagnóstico largo; se completó la validación corta explícitamente autorizada con un script separado. El home largo y su raíz propia se retiraron.

### 18.3 Corrección conservadora del homedir y retención externa

[Validación corta](evidence/m2-c3-p2/p2-gpg-home-corto.json), [script](evidence/m2-c3-p2/p2-gpg-home-corto.py.txt): carpeta propia **.tmp/kh-7ce24c** dentro del workspace, socket de **66 caracteres**, inferior al máximo exigido de 90. Se eligió una ruta corta dentro del workspace en vez de crear C:\kgh; no se toca configuración global ni homedir del propietario.

Launch, cifrado AES256, descifrado trivial idéntico y consulta no-autostart: **exit 0**. Stderr de la consulta corta vacío; conexión al agente válida. GPGconf --kill del homedir propio exit 0 y carpeta retirada. GPG no se sustituyó. El ejecutor ahora genera .tmp/kh-<seis caracteres aleatorios> por ejecución, valida longitud/collision/ruta propia y elimina solo ese homedir después de terminar su agente.

La preparación modifica solo fuentes temporales. Se archiva el código exactamente ejecutado como evidencia, **sin aprobarlo para QA**:

| Fuente | SHA256 |
| --- | --- |
| [p2-gpg-diagnostico.py.txt](evidence/m2-c3-p2/p2-gpg-diagnostico.py.txt) | 9697566530f448b081762d3264b0cc18422ef1073e290a9a4cf43fbc43895d7d |
| [p2-gpg-home-corto.py.txt](evidence/m2-c3-p2/p2-gpg-home-corto.py.txt) | 44a6a2f34844fcdc3dce54032cbd446bc077c7ee075acd0eabec9ce2443e73dc |
| [p2-gpg-ejecutor.py.txt](evidence/m2-c3-p2/p2-gpg-ejecutor.py.txt) | 4a431d1d8800ceecc22e9ee769093d6d8711a0c06e7e67e68b75219f74aeed31 |
| [p2-gpg-arnes.py.txt](evidence/m2-c3-p2/p2-gpg-arnes.py.txt) | 21628159d8123480e40f64749da6890690667826a733db600d2c2b7679cadebd |

Para cada comando del ejecutor se guardan args/commandSanitized, exitCode real, phase, stderrCompleteRedacted, stderrTruncated y límite **8192 bytes**. El stderr completo se drena en memoria y se redacta **antes** de recortar: valores privados conocidos, literales entre comillas, direcciones y valores de filas/keys en mensajes SQL. No se seleccionan líneas. Los comandos exitosos también conservan stderr, aunque sea vacío. Los fallidos añaden clase y frames sanitizados, sin código/argumentos/locales. Un fallo de creación de proceso registra exitCode=null (no se inventa un exit de un proceso que no arrancó).

Las conexiones psql persistentes registran su exit y stderr al cerrar/matar la sesión. Pipes pg_dump/GPG/pg_restore registran cada proceso por separado incluso en finally. La espera pg_isready registra también los estados transitorios de no disponibilidad; no se cuentan como pruebas aprobadas ni se confunden con un fallo inesperado del arnés.

**Prueba externa falsa pasada:** intérprete local devolvió **7**, escribiendo cuatro líneas; las cuatro quedaron conservadas, con clave falsa, literal y dirección redactados. Se verificaron comando, fase, clase y traceback. Otra prueba unitaria verificó el recorte a 8192 bytes UTF-8 después de redactar; su registro está marcado syntheticRecordOnly y no se presenta como un proceso ejecutado. ValueError interno + fallo TypeError del emisor y OSError del fallback también conservaron causas/frames. [Unidades](evidence/m2-c3-p2/p2-gpg-unidades.json), [fallback](evidence/m2-c3-p2/p2-gpg-fallback.json).

### 18.4 Única nueva ejecución formal de A y parada

~~~powershell
git branch --show-current
git rev-parse HEAD
git status --short --branch
New-Item -ItemType Directory -Path '.tmp/p2-a' -Force
Copy-Item -LiteralPath 'docs/quality/evidence/m2-c3-p2/p2-sin-congelar-ejecutor.py.txt' -Destination '.tmp/p2-a/run.py'
Copy-Item -LiteralPath 'docs/quality/evidence/m2-c3-p2/p2-sin-congelar-arnes.py.txt' -Destination '.tmp/p2-a/harness.py'
Copy-Item -LiteralPath 'docs/quality/evidence/m2-c3-p2/p2-sin-congelar-supervisor.ps1.txt' -Destination '.tmp/p2-a/prompt.ps1'
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -u '.tmp/p2-a/diagnosticar.py'
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -u '.tmp/p2-a/comprobar_corto.py'
# Tras preparar las correcciones y revisar AST, una única ejecución formal de A:
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -u '.tmp/p2-a/harness.py'
~~~

El último comando terminó **1**. [Arnés](evidence/m2-c3-p2/p2-gpg-arnes.json), [108 comandos del recorrido](evidence/m2-c3-p2/p2-gpg-recorrido-local.json), [comando del helper previo](evidence/m2-c3-p2/p2-gpg-preparacion-local.json), [diagnóstico de la parada](evidence/m2-c3-p2/p2-gpg-diagnostico-restauracion.json). Hora local del recorrido: **00:21:45.632570 a 00:22:10.051044, America/Santo_Domingo**, 2026-10-04. Solo fuentes/catálogos/filas sintéticas locales; no se imprimieron filas de negocio.

PG17.11 fijado por ID **sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f**, contenedores sin red/puertos, read-only/tmpfs, CA pública en bind único read-only. El source desechable se inicializó con las 27 definiciones SQL de Git local 791569b y fixtures sintéticos: 20 clientes, 28 reservas, ledger de 31 entradas con cuatro revertidas y nombres repetidos. btree_gist residía en public. Ese DDL es preparación desechable, nunca migración QA.

| Comprobación alcanzada | Resultado real |
| --- | --- |
| JSON multilínea/UTF-8, multiconjunto y doble frase falsa | Unitarios pasan, con redacción/persistencia interna y externa. |
| Schema-only local | exit 0; permiso SELECT/RR/RO/timeout 120 s, archivo descartado. No demuestra TLS QA. |
| Ledger source y snapshot | 31 entradas técnicas, 27 terminadas y cuatro revertidas, observado/baseline/diferencia iguales con multiplicidad; sin logs. |
| Snapshot | Exportado desde RR/RO; dump y censo tomados del mismo corte. |
| Concurrencia | Escritura sintética confirmada después del corte: source pasa a 21 clientes; restore reproduce los **20 del snapshot**. |
| Dump/AES256/censo cifrado | Cada proceso exit 0; dump de 21422 bytes. |
| Segunda introducción falsa | Se descartó la frase de cifrado y se suministró la entrada de descifrado por separado; manifest descifrado idéntico al baseline en memoria. |
| Restore TOC | Segundo contenedor PG17 propio; btree_gist precreado en public; TOC excluyó dos entradas de bootstrap, ninguna TABLE DATA; pg_restore exit 0. |
| Tablas / ledger / conteos / roles | Igualdad **true** en los cuatro cotejos; 36 tablas y huellas privadas iguales. |
| Catálogo completo | Igualdad **false**: se activó la parada. No se certifican constraints/triggers completos ni una subclave específica. |
| Servicios / QA | Cero SSH/servicios reales, mocks de infraestructura/escritores/release; no renuevan evidencia P0. |

Hashes **exclusivamente sintéticos, sin validez como respaldo QA**, retirados con los temporales:

- Dump AES256: **7477f699bda650a4b21f613f1d66d973b47479dd5be2e9535087aad01c129855**.
- Censo cifrado: **b920161f16fe7ef803c2a1b91010d57279e42b589f79ab91400df8c5f0805409**.

El censo agregado por las 36 tablas consta en el resultado local; los hashes privados de filas solo estuvieron en memoria/manifest cifrado y no se versionaron. Ninguno de estos artefactos habilita P3b.

Fallo formal exacto preservado:

~~~text
event: parada
phase: restore-cotejo-rollback
exceptionClass: RuntimeError
messageSanitized: restore-desigualdad:catalog
tracebackSanitized: run.py:780 main -> run.py:574 restore_cipher
~~~

Es un fallo del comparador interno; pg_dump, GPG y pg_restore terminaron 0. No hubo error externo nuevo de cifrado. queryLabel=censo-roles identifica la última consulta, no una consulta SQL fallida. El error del arnés recorrido-local-completo-fallo se conservó por separado. La desigualdad global del catálogo se registró, pero **las subclaves/diferencias concretas no se persistieron**; no se inventa causa de ownership/search_path/constraints/triggers sin ese cotejo. Tampoco se declara corrupción de filas: sus huellas/conteos sí coincidieron.

**Se detuvo al primer fallo inesperado de A, sin corregir ni reintentar después.** No se alcanzaron rollback §5.3 ni los cuatro escenarios inyectados del ejecutor. Los unitarios internos/externos previos sí pasaron; no sustituyen esos escenarios completos. B/C permanecen cerrados hasta otra orden del propietario, incluso si se autorizara otra A.

### 18.5 Limpieza, límites y checkpoint

finally cerró la transacción/reader, retiró ambos contenedores propios con --force --volumes, terminó el agente .tmp/kh-c51e8a y borró su carpeta. Todos los comandos de retirada exit 0. Las consultas posteriores por cada nombre exacto devolvieron 0 y ninguna fila. Datos/tmp PG eran tmpfs, sin puertos ni volúmenes persistentes. Se retiraron también cifrados/triviales/frases falsas y la raíz temporal propia después de archivar la evidencia; sin prune ni objetos ajenos. [Limpieza](evidence/m2-c3-p2/p2-gpg-limpieza-local.json).

~~~powershell
docker --context desktop-linux ps -a --filter 'name=kortek-m2-c3-p2-client-real-c51e8a798d6d' --format '{{.Names}}'
docker --context desktop-linux ps -a --filter 'name=kortek-m2-c3-p2-restore-c51e8a798d6d' --format '{{.Names}}'
# Tras validar ruta absoluta propia dentro del workspace y ausencia de reparse points:
Remove-Item -LiteralPath 'C:\Users\Fraylin\Desktop\Kortek-Booking\.tmp\p2-a' -Recurse -Force
~~~

**GPG diagnosticado y corrección local validada; A DETENIDO / INCOMPLETO.** Pendientes: explicar la desigualdad del catálogo con diferencias sanitizadas de subclaves; catálogo completo, rollback y cuatro escenarios del ejecutor; readiness íntegra para B. Próxima acción solo con nueva orden: mejorar el registro de diferencias del catálogo antes de fallar y diagnosticar/restaurar exclusivamente en local, sin reanudar desde este restore retirado.

No verificado ni ejecutado: QA, DPAPI/frase real, TLS QA, censo/hash de respaldo QA, PID/imagen/release/HTTP reales, B/C/P3, migraciones/despliegues/configuración productivos. P3b sigue requiriendo autorización propia y dump nuevo bajo congelamiento, hash, censo y restore íntegramente verificado inmediatamente antes de migrar.

Commit local solo de esta sección y evidencia sanitizada, rutas explícitas; revisión AST/JSON/redacción/hashes/enlaces/alcance y diff/índice. Sin builds/pruebas de producto ni nuevas ejecuciones funcionales después de la parada. SHA/status final se entrega en la respuesta.

~~~powershell
git diff --check
git diff --stat
git diff
git add -- docs/quality/M2_C3_PREFLIGHT.md docs/quality/evidence/m2-c3-p2/p2-gpg-diagnostico.py.txt docs/quality/evidence/m2-c3-p2/p2-gpg-home-corto.py.txt docs/quality/evidence/m2-c3-p2/p2-gpg-ejecutor.py.txt docs/quality/evidence/m2-c3-p2/p2-gpg-arnes.py.txt docs/quality/evidence/m2-c3-p2/p2-gpg-diagnostico.json docs/quality/evidence/m2-c3-p2/p2-gpg-home-corto.json docs/quality/evidence/m2-c3-p2/p2-gpg-preparacion-local.json docs/quality/evidence/m2-c3-p2/p2-gpg-arnes.json docs/quality/evidence/m2-c3-p2/p2-gpg-recorrido-local.json docs/quality/evidence/m2-c3-p2/p2-gpg-unidades.json docs/quality/evidence/m2-c3-p2/p2-gpg-fallback.json docs/quality/evidence/m2-c3-p2/p2-gpg-diagnostico-restauracion.json docs/quality/evidence/m2-c3-p2/p2-gpg-limpieza-local.json
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
git diff --cached
git diff --exit-code
git diff --cached --exit-code -- apps ops package.json pnpm-lock.yaml
git commit -m "docs(m2): registrar diagnostico GPG y parada local de A"
git rev-parse HEAD
git status --short --branch
git show --stat --oneline HEAD
git diff --exit-code 768d898..HEAD -- apps ops package.json pnpm-lock.yaml
~~~


## 19. Iteración local acotada de A: diagnóstico de catálogo y parada por CHECK — 2026-10-04

**PAUSADO / INCOMPLETO.** Autorización exclusiva para diagnóstico/arnés local, máximo seis iteraciones. Se realizaron **dos**: reproducción original y comparación nueva mediante volcados de esquema. No se agotó el cupo: se detuvo al encontrar diferencias fuera de las excepciones expresamente permitidas; no se normalizaron ni aceptaron por inferencia. **B, C, P2 real, QA, producción, DPAPI, frase del propietario, push y P3 no se ejecutaron.** No se instalaron dependencias ni se alteraron configuración global de GPG, roles/grants, variables, flags, Clerk ni servicios reales. Los roles/grants y SQL de inicialización pertenecen únicamente a fuentes/clones sintéticos desechables.

### Base, alcance y trazabilidad

Inicio comprobado:

```powershell
git branch --show-current
git rev-parse HEAD
git status --short --branch
git diff -- docs/quality/M2_C3_PREFLIGHT.md
git hash-object --path=docs/quality/M2_C3_PREFLIGHT.md docs/quality/M2_C3_PREFLIGHT.md
git rev-parse HEAD:docs/quality/M2_C3_PREFLIGHT.md
```

Rama `ai/antigravity-qa`; HEAD `3a154df5bc606ea0a31f4a47e92b7eb8fbf50aff`; referencia local origin: ahead 11, sin consulta remota. Git marcó `M2_C3_PREFLIGHT.md` como modificado, pero el diff de contenido/numstat estaba vacío y ambos blobs filtrados eran `68e32f8eeaf1921f5685eab41b37830d99c075b1`; se preservó su contenido versionado y solo se añadió esta sección. No había otros cambios iniciales. Skill `kortek-delivery` y fuentes documentales aplicables leídas; ninguna capacidad de producto se abre.

Registro único: [p2-iteracion-local-registro.json](evidence/m2-c3-p2/p2-iteracion-local-registro.json). Cada fallo quedó persistido en `.tmp/p2-iteraciones.json` **antes** de preparar cambios para la siguiente iteración. El registro conserva clase, fase, mensaje/traceback sanitizados, comandos y stderr completo redactado hasta 8192 bytes, ambos catálogos, diff por subclave, ambos esquemas normalizados, diff completo, categorías, conteos/huellas de ambos lados y resultado de limpieza. No contiene filas, logs del ledger, passwords ni frases. Los comandos de dump ocultan únicamente el identificador efímero del snapshot en memoria. La falta de exit de un comando asociado a una desigualdad interna no se inventa: los comandos externos reales tienen sus propios exit codes; la desigualdad es `RuntimeError` y el arnés termina con exit `1`.

Preparación: copia de los ejecutores/arneses de §18 a `.tmp/p2-it1` y `.tmp/p2-it2`. Los archivos `.py.txt` inferiores son las fuentes exactas ejecutadas archivadas como evidencia, sin modificar ejecutores QA. Se agregó protección `MODE != 'local'` antes de cualquier operación del ejecutor local. El arnés sustituye login/infra/HTTP/escritores por mecanismos locales; SSH queda prohibido. La etiqueta heredada `solicitar-credencial-DPAPI-QA` de iteración 1 es solo un evento: recibió una cadena aleatoria sintética de memoria, nunca DPAPI; en iteración 2 se renombró `entrada-credencial-sintetica-local` para evitar ambigüedad.

Comandos de entrada exactos (ejecutados una vez cada uno):

```powershell
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -u .tmp/p2-it1/harness.py
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -u .tmp/p2-it2/harness.py
```

Ambos terminaron con exit `1`, cuya causa se conserva. Los 109 y 111 comandos externos de cada recorrido están completos en el registro; los exits transitorios `2` de `pg_isready` pertenecen a la espera normal de arranque local, no a reintentos de un dump/restore fallido. En el punto de parada, dump, cifrado, descifrado, TOC y restore habían terminado con exit `0`.

### Iteración 1: comparación original sin cambios

Fuente PG17.11 sintética inicializada desde 27 SQL del commit **local** `791569b110f9fd59cb10e6d248546bdae3996e14`, sin consultar despliegues. Imagen fijada por ID `sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f`; contenedores nuevos sin red ni puertos, read-only, datos/tmp en tmpfs. CA pública montada como único archivo read-only; hash validado `1dcaafbf6fda7f21e34ff35825c1a1354408ea11e5839157e690af851c73453a`. Ledger sintético: 31 entradas, 27 terminadas y cuatro revertidas, con multiplicidad. `btree_gist` reside en `public`. No se abrieron archivos de credenciales ni `Clave.txt`.

Snapshot exportado dentro de transacción `REPEATABLE READ READ ONLY`, `statement_timeout=120s`, censo en la misma sesión/snapshot. La fuente recibe después una escritura sintética independiente: 21 clientes vivos frente a 20 en el snapshot; el restore coteja contra **20**, nunca contra el origen posterior. Hay 28 reservas en el corte. GPG usa homedir propio `.tmp/kh-3e09e8`, socket de 66 caracteres, AES256, frase falsa por stdin anónimo, doble confirmación inicial y segunda introducción independiente al descifrar. Restauración en segundo contenedor con alternativa TOC, excluyendo solo entradas bootstrap de public/btree_gist, ninguna TABLE DATA.

Fallo: clase `RuntimeError`, fase `restore-cotejo-rollback`, mensaje `restore-desigualdad:catalog`; traceback `run.py:783 main -> run.py:576 restore_cipher`. El arnés conserva además `RuntimeError: recorrido-local-completo-fallo`, fase `arnes-A-reproduccion`, `harness.py:265 main -> harness.py:232 scenario`. Todos los lados y el diff original se conservaron antes de cambiar el ejecutor.

**Causa demostrada del fallo original: criterio del comparador.** Solo difiere `columns.position` (22 columnas en Invoice, Payment, Professional y User). `position` se obtenía de `pg_attribute.attnum`: el origen conserva huecos internos después de DROP COLUMN; el dump/restore recrea las columnas vivas y compacta esos números físicos. El orden relativo, nombres, tipos, defaults, nullabilidad, identity/generated y restantes atributos son iguales. Las otras ocho subclaves del catálogo son iguales. El diagnóstico enumera las 22 posiciones de ambos lados. No hay diferencia de datos: 36/36 conteos y huellas, ledger multiconjunto, censo y roles de interés coincidieron.

### Iteración 2: reemplazo por esquema normalizado y diferencia nueva

Misma imagen/versión en fuente y restore: `pg_dump (PostgreSQL) 17.11 (Debian 17.11-1.pgdg13+2)`. Snapshot/censo nuevos; fuente sintética y restore nuevos desde cero; homedir propio `.tmp/kh-4bc495`, socket de 66 caracteres, retirado al salir. Se mantiene doble confirmación y reintroducción independiente de frase falsa. El manifest cifrado se descifró y coincidió con el censo original.

Se reemplazó la aceptación global de `CATALOG_SQL` por **igualdad textual completa de volcados de esquema normalizados**, conservando el catálogo anterior solo como diagnóstico. El volcado fuente se realizó con `--snapshot` importando exactamente el snapshot exportado para el censo/dump de datos, mientras la transacción exportadora permanecía abierta. Restore aislado sin escritores. No se usó un volcado de la fuente posterior.

Comandos precisos con valores efímeros documentados en `commands` del registro:

```text
docker --context desktop-linux exec -e PGPASSWORD -e PGHOST -e PGPORT -e PGUSER -e PGDATABASE -e PGSSLMODE -e PGSSLROOTCERT -e PGOPTIONS -e PGAPPNAME -e PGCLIENTENCODING kortek-m2-c3-p2-client-real-4bc495d4bdd9 pg_dump --schema=public --format=custom --no-owner --no-privileges --encoding=UTF8 --snapshot=<snapshot-en-memoria> --schema-only --format=plain
docker --context desktop-linux exec -e PGCLIENTENCODING=UTF8 kortek-m2-c3-p2-restore-4bc495d4bdd9 pg_dump -U postgres -d postgres --schema=public --schema-only --no-owner --no-privileges --encoding=UTF8 --format=plain
```

La última opción `--format=plain` determina el formato de ambos volcados. La normalización solo convierte CRLF a LF, retira espacios finales y los comandos de encuadre `\restrict`/`\unrestrict` con nonce aleatorio de pg_dump. No elimina objetos, SQL, defaults, CHECK, comentarios SQL de objetos, configuración de funciones, tipos, secuencias ni extensiones. Los tokens de encuadre no pertenecen al schema ni constituyen una excepción estructural.

Se conservaron [snapshot completo](evidence/m2-c3-p2/p2-iteracion-local-2-snapshot.sql.txt), [restore completo](evidence/m2-c3-p2/p2-iteracion-local-2-restore.sql.txt) y [diff completo](evidence/m2-c3-p2/p2-iteracion-local-2-schema.diff.txt). El registro conserva adicionalmente ambos lados de cada categoría: tablas/columnas, constraints, índices, triggers, funciones y configuración, secuencias, extensiones, tipos y contenido restante. La consulta local de inicialización comprobó `btree_gist` en public y el restore lo creó explícitamente allí. **Límite adicional del dump parcial:** `--schema=public` omite el DDL de extensiones; la categoría extensions de ambos volcados está vacía, por lo que su igualdad no prueba DDL/schema de la extensión mediante dump. Esta cobertura exigida sigue pendiente y no se cambió el ejecutor tras la parada. **Límite del agrupador auxiliar:** clasifica por tipo de bloque del dump; los CHECK inline aparecen dentro de bloques TABLE, no en los bloques CONSTRAINT separados. El cotejo autoritativo usa el dump entero y detectó los tres; no se debe interpretar `constraints.equal=true` del agrupador como igualdad de los CHECK inline. No se ocultó ni corrigió ese límite después de la parada.

**Fallo nuevo real del cotejo textual:** tres diferencias de agrupación de paréntesis en CHECK inline:

- `BusinessScheduleWindow_minutes_check`;
- `EmailOutbox_budget_check`;
- `ProfessionalWeeklySchedule_minutes_check`.

El origen contiene agrupación AND anidada y el volcado del restore muestra parte de esa agrupación aplanada. El catálogo previo con `pg_get_constraintdef(..., true)` no distinguía esos paréntesis; el dump sí los distingue. No se ha probado de forma independiente la equivalencia semántica y **no se admite como excepción**. No se eliminaron paréntesis ni se reescribieron constraints, ni se cambió el criterio para aceptar el restore. El diff de los tres bloques es completo, sin seleccionar o borrar diferencias.

Resultado: catálogo/esquema **false**; tablas/datos (36 conteos y huellas), ledger, censo y roles **true**. Clase `RuntimeError`, fase `restore-cotejo-rollback`, mensaje `restore-desigualdad:catalog`; traceback `run.py:836 main -> run.py:624 restore_cipher`. Fallo envolvente: `RuntimeError: recorrido-local-completo-fallo`, fase `arnes-A`, `harness.py:271 main -> harness.py:232 scenario`. Detención en iteración **2/6**, sin tercera ejecución ni reparación posterior. Aceptar esta diferencia requeriría ampliar la normalización/criterios autorizados; no se hace por inferencia.

### Excepciones permitidas: lista cerrada

1. **Dueños:** `--no-owner`; la identidad del propietario no forma parte de este cotejo estructural autorizado.
2. **ACL:** `--no-privileges`; el dump sin ACL no prueba recuperación general de permisos QA.
3. **Default ACL:** la misma exclusión expresa; no prueba recuperación general de privilegios por defecto QA.
4. **Roles que existan solo en el origen:** roles globales adicionales no incluidos por pg_dump. No autoriza diferencias en atributos/membresías/privilegios de roles de interés, que en ambos recorridos sí coincidieron tras reconstrucción exclusivamente local.

No se admiten diferencias en tablas, columnas/tipos/defaults, constraints, índices, triggers, funciones/configuración, secuencias, extensiones/schema ni datos. Esta lista no permite aceptar los tres CHECK distintos. Los roles/dueños de interés fueron reconstruidos e iguales; no hubo que aplicar una excepción adicional para aceptar una desigualdad.

### Pruebas completadas y lo no verificado

La iteración 2 pasó las unidades del ledger multiconjunto (orden y multiplicidad/checksum), lectura JSON multilinea UTF-8, persistencia de error interno y fallo del manejador, fallback ante fallo de persistencia, redacción de valores privados, comando falso exit `7` con sus **cuatro líneas completas** de stderr y recorte a 8192 bytes después de redactar. Cada comando externo conserva exit, argv sanitizado, stderr redactado completo hasta ese límite, clase/fase/traceback para los fallos. UTF-8 en lector y restore se mantiene. El registro sintético de recorte se distingue explícitamente de un comando realmente ejecutado.

**Incidente en validación documental posterior:** el script offline salió `1` con `AssertionError` (`stdin:31`) al exigir DDL de extensión que el dump parcial no contiene; el wrapper PowerShell devolvió `0` porque después ejecutó Git. No se cuenta como una tercera iteración del arnés ni como validación pasada. Se conservan comando, ambos exits y stderr completo redactado en [p2-iteracion-local-validacion.json](evidence/m2-c3-p2/p2-iteracion-local-validacion.json). La revisión offline siguiente reconoce y deja pendiente esa cobertura, sin cambiar el ejecutor, schema o criterios.

**Pendientes:** DDL de extensiones mediante el cotejo nuevo; el recorrido completo no pasó, por tanto no se alcanzaron los cuatro escenarios completos (fallo antes de dump sin residuo; frase repetida mal antes de cualquier dump; alteración de datos del restore; persistencia integrada de errores internos/externos) ni `rollback_drills` de §5.3. Las unidades parciales no sustituyen esos escenarios. No se ejecutó SQL de la migración 28/inversa en estos dos recorridos porque el gate de restore falló antes. Tampoco se probó rollback de imagen/HTTP real de API, web ni Clerk; el HTTP del arnés es un stub local y no equivale a reserva pública QA. Ninguna prueba de TLS/DPAPI/credenciales/servicios/release de QA se ejecutó. Los backups y hashes fueron únicamente sintéticos/locales y **no sirven para QA ni P3b**.

### Limpieza, evidencia y commit local

Los cuatro contenedores propios se retiraron con `docker --context desktop-linux rm --force --volumes <nombre-propio>` en finally (exit `0`). Agentes GPG propios: `gpgconf --homedir <home-propio-MSYS> --kill gpg-agent` (exit `0`), homes retirados. Verificación posterior individual con `docker --context desktop-linux ps -a --filter name=^/<nombre-propio>$ --format {{.Names}}`: exit `0`, salida vacía para los cuatro. Ningún inspect completo, prune, contenedor/volumen ajeno ni servicio QA se tocó.

Tras archivar evidencia se verificaron rutas absolutas y ausencia de symlinks/reparse points, y se eliminaron exclusivamente `.tmp/p2-it1`, `.tmp/p2-it2` y `.tmp/p2-iteraciones.json`, mediante `Remove-Item -LiteralPath` de esas rutas explícitas. Se retiraron cifrados/manifests falsos, caches y temporales; los datos PostgreSQL estaban en tmpfs. [Registro de limpieza](evidence/m2-c3-p2/p2-iteracion-local-limpieza.json). Nunca se accedió a `C:\KortekBackups\qa-m2-c3`.

Rutas explícitas para commit: únicamente este documento y los archivos nuevos de la tabla. Fuentes `.py.txt` incluidas solo como evidencia exacta del arnés/ejecutor **local**, no código desplegable ni cambios a aplicaciones/ops. Incidente Git: `git diff --cached --check` devolvió `2` por líneas vacías finales de ambos volcados y los espacios de prefijo del diff completo; salida conservada en el registro de validación. No se recortó ni alteró la evidencia. El chequeo estándar se aplica a documento/fuentes/JSON y, solo para esos tres artefactos exactos, se usa por invocación `git -c core.whitespace=-blank-at-eof,-blank-at-eol diff --cached --check`, sin tocar configuración global ni criterios del cotejo. Validación local de JSON/AST, hashes, prefijo documental sin reescritura, comandos y límites de redacción; `git diff --check`, revisión del diff y staged por estas rutas. **Sin push, B/C ni P3.** El SHA final del commit y estado Git se informan en el relevo; no se edita esta sección para incluir su propio hash.

| Evidencia sanitizada | SHA-256 |
| --- | --- |
| [p2-iteracion-local-1-arnes.py.txt](evidence/m2-c3-p2/p2-iteracion-local-1-arnes.py.txt) | `9d7fb4607738356833fc51becc6e22ab196a56934402a335fc4fb29c2bafec84` |
| [p2-iteracion-local-1-ejecutor.py.txt](evidence/m2-c3-p2/p2-iteracion-local-1-ejecutor.py.txt) | `c8de8cb965fce18e788a21d02ef42a5fa89c866c452fc298abd991e867baba40` |
| [p2-iteracion-local-2-arnes.py.txt](evidence/m2-c3-p2/p2-iteracion-local-2-arnes.py.txt) | `ea399d0915e810c6b7994a9fc65544b78d8fdb30ffe7069a8026b7dc4398964c` |
| [p2-iteracion-local-2-ejecutor.py.txt](evidence/m2-c3-p2/p2-iteracion-local-2-ejecutor.py.txt) | `55d263550cfabf901b7d948110af60bf70864a13cdc19ded373b272458b3948c` |
| [p2-iteracion-local-2-fallback.json](evidence/m2-c3-p2/p2-iteracion-local-2-fallback.json) | `74a3dcdf3cafdb745248c9a02ad4f2d9b818c52a0fa22361ac11f96f7b5d269f` |
| [p2-iteracion-local-2-restore.sql.txt](evidence/m2-c3-p2/p2-iteracion-local-2-restore.sql.txt) | `60430158df9e2591f2fc438e8be5b015c702270d4dfb5f837056f9add62f13be` |
| [p2-iteracion-local-2-schema.diff.txt](evidence/m2-c3-p2/p2-iteracion-local-2-schema.diff.txt) | `bd4e257edb10863e156955539c45a5b557c40f02e3048427a3e0cf21e80095c8` |
| [p2-iteracion-local-2-snapshot.sql.txt](evidence/m2-c3-p2/p2-iteracion-local-2-snapshot.sql.txt) | `6ed4d4694e04ffb412fc9179704342dc1f510bbcc0c210c5874864493d10de69` |
| [p2-iteracion-local-2-unidades.json](evidence/m2-c3-p2/p2-iteracion-local-2-unidades.json) | `9957c857432324710e22641ccff903f658161f873654048b06763874d4995c60` |
| [p2-iteracion-local-diagnostico.json](evidence/m2-c3-p2/p2-iteracion-local-diagnostico.json) | `adfcd15d96969008256a5772e3920ed80016c487d315fa70f11dc7ca2572d16c` |
| [p2-iteracion-local-limpieza.json](evidence/m2-c3-p2/p2-iteracion-local-limpieza.json) | `084eefd4dd9eeca76f8b3165f3bbc1979fff05384015080d94489791f22ac7b4` |
| [p2-iteracion-local-registro.json](evidence/m2-c3-p2/p2-iteracion-local-registro.json) | `9ba48aa8351114c10015597dccebb6faf52d592b86d7c7b2afa5cd0d8c46b506` |
| [p2-iteracion-local-validacion.json](evidence/m2-c3-p2/p2-iteracion-local-validacion.json) | `0359c3f97ad1e15532c47149f59bac281cfca7a79875be3880ceb85339e3c86e` |


## 20. P2 completado: respaldo consistente, recuperación y rollback — 2026-10-04

### 20.1 Estado y criterios de cumplimiento

**OBJETIVO CUMPLIDO — P2 solamente.** Autorización vigente: objetivo del propietario en `goal-objective.md`, leído antes de ejecutar; sustituye las paradas condicionadas históricas de §§14–19. Base local **5340f97bfd4a3fbc67b491bc50ff4b34bf1f6fef**, rama **ai/antigravity-qa**, árbol inicialmente limpio. Se aplicó kortek-delivery. Las secciones anteriores se conservan byte por byte; únicamente se añade esta sección y evidencia sanitizada. El cierre incluye el commit local autorizado, cuyo SHA se entrega fuera de su propio contenido. **Sin push ni P3; producción no consultada ni modificada.**

| Criterio del objetivo | Resultado y evidencia autoritativa |
| --- | --- |
| 1. Respaldo real AES256, ruta, SHA-256 y censo del corte | Archivo real de QA de 47745 bytes, hash validado nuevamente al final; manifiesto del mismo snapshot también cifrado. [bc-first.json](evidence/m2-c3-p2/p2-goal-20261004/bc-first.json), [c-verified.json](evidence/m2-c3-p2/p2-goal-20261004/c-verified.json), [final-audit.json](evidence/m2-c3-p2/p2-goal-20261004/final-audit.json). |
| 2. Snapshot exportado, RR/READ ONLY, migrador, TLS verify-full, QA en marcha | Login efectivo `kortek_migrator`, PG17.6, timeout 120 s; `PGSSLMODE=verify-full` y CA bind read-only con hash verificado. `pg_export_snapshot`, censo y dump dentro del mismo corte; dump binario por pipes directamente a GPG AES256. Ambos procesos exit 0. Servicios QA nunca detenidos. [bc-first.json](evidence/m2-c3-p2/p2-goal-20261004/bc-first.json), [executed-sources.json](evidence/m2-c3-p2/p2-goal-20261004/executed-sources.json). |
| 3. Restore PG17 nuevo, TOC btree_gist public y cotejo completo | Dos restores nuevos contra el manifiesto del snapshot: 36/36 conteos y huellas, ledger multiconjunto con multiplicidad, censo, roles de interés, constraints/índices/triggers/funciones/tipos/extensiones iguales. TOC excluye únicamente bootstrap public/btree_gist/comentarios asociados; ningún TABLE DATA excluido. PG17.11 leído en el restore. [c-verified.json](evidence/m2-c3-p2/p2-goal-20261004/c-verified.json), [restore-version.json](evidence/m2-c3-p2/p2-goal-20261004/restore-version.json). |
| 4. Segunda introducción y descifrado independiente | Propietario introdujo dos veces la frase mediante `Read-Host -AsSecureString`, antes de cualquier operación QA. Segunda entrada independiente usada por nuevos procesos GPG con `--no-symkey-cache`; manifiesto descifrado igual y dump restaurado completo. Frases únicamente en memoria/stdin anónimo; SecureString/BSTR dispuestos al terminar. [controller-final.json](evidence/m2-c3-p2/p2-goal-20261004/controller-final.json), [controller.ps1.txt](evidence/m2-c3-p2/p2-goal-20261004/controller.ps1.txt), [bc-first.json](evidence/m2-c3-p2/p2-goal-20261004/bc-first.json), [c-verified.json](evidence/m2-c3-p2/p2-goal-20261004/c-verified.json). |
| 5. Rollback §5.3 aislado | Clon real del backup: upgrade SQL 27→28 e inversa desechable, datos/ledger preservados; fallo transaccional por constraint; corrupción de trigger detectada y recuperación en contenedor nuevo. Código exacto 791569b sobre clon real responde 200/200/201 y preserva recibos/vínculos/reservas. Además, **imagen original QA exacta** ejecutada donde ya estaba instalada sobre PostgreSQL sintético 27→28, red namespace sin exterior/puertos/mounts; mismo 200/200/201 y preservación. [c-verified.json](evidence/m2-c3-p2/p2-goal-20261004/c-verified.json), [image-rollback.json](evidence/m2-c3-p2/p2-goal-20261004/image-rollback.json), [image-drill.py.txt](evidence/m2-c3-p2/p2-goal-20261004/image-drill.py.txt). |
| 6. Continuidad QA y HTTP real | API MainPID **673295**, worker **575989**, ambos active/running y NRestarts **0**, imágenes exactas de P0; API release **791569b110f9fd59cb10e6d248546bdae3996e14**. Hashes de runtime-env, wrappers y unidades QA iguales al baseline. GET real de `public/m1-c3-norte/booking-data`: **200**, cuerpo no vacío y no impreso. Auditoría final repetida tras el cierre documental vuelve a coincidir; su hora UTC está en el informe. [final-audit.json](evidence/m2-c3-p2/p2-goal-20261004/final-audit.json). |
| 7. Documento, evidencia y commit local acotado | Esta sección, JSON parseables, fuentes sanitizadas, inventario SHA-256 y validación documental; staging por cada ruta explícita, revisión completa del índice y commit local. Evidencia de validación y limpieza añadida antes del commit; SHA/estado finales en el relevo. Ninguna aplicación, ops, dependencia o migración versionada modificada. |

### 20.2 Trabajo realizado, comandos y resultados

**A — local y sintético, sin QA:** inicialización PG17.11 con las 27 definiciones Git de 791569b, 36 tablas y ledger sintético de 31 entradas (27 terminadas y cuatro revertidas). Fuente 20 clientes/28 reservas; escritura sintética posterior elevó la fuente a 21 clientes, mientras ambos restores conservaron 20 del snapshot. Pasaron recorrido completo, fallo antes del dump, doble frase distinta, alteración de datos y persistencia integrada de error externo/manejador. Cuatro casos finales se validaron juntos; el quinto se repitió aisladamente tras corregir exclusivamente CRLF/LF en su aserción, con el ejecutor sin cambios. No se presenta la ejecución intermedia detenida como pasada: el gate agregado identifica los cinco informes. [a-gate.json](evidence/m2-c3-p2/p2-goal-20261004/a-gate.json), [a-complete.json](evidence/m2-c3-p2/p2-goal-20261004/a-complete.json), [a-before-dump.json](evidence/m2-c3-p2/p2-goal-20261004/a-before-dump.json), [a-wrong-phrase.json](evidence/m2-c3-p2/p2-goal-20261004/a-wrong-phrase.json), [a-corruption.json](evidence/m2-c3-p2/p2-goal-20261004/a-corruption.json), [a-errors.json](evidence/m2-c3-p2/p2-goal-20261004/a-errors.json), [a-targeted.json](evidence/m2-c3-p2/p2-goal-20261004/a-targeted.json).

Ledger: permutación aceptada; falta, duplicado adicional y checksum cambiado rechazados. JSON multilínea/UTF-8, stderr completo redactado hasta 8192 bytes y fallos de emisor/persistencia probados. E5 aplana exclusivamente AND, preservando orden y textos de los términos: 64 combinaciones con límites/NULL en cada CHECK de horarios y 84 en EmailOutbox_budget_check, cero diferencias. Un CHECK real cambiado de `<` a `<=` fue rechazado por el comparador y produjo tres diferencias en PostgreSQL. Los SQL exactos, ambos lados y tablas de verdad están en [a-complete.json](evidence/m2-c3-p2/p2-goal-20261004/a-complete.json); el control de corrupción conserva ambas huellas en [a-corruption.json](evidence/m2-c3-p2/p2-goal-20261004/a-corruption.json).

**B — revalidación QA READ ONLY:** completada después de recibir ambas frases. Destino efectivo proyecto `prirlabbnlcuvnzuaczp`, Kortek Booking Cutover QA, base postgres; runtime existente y migrador de respaldo separados. P0 vigente: release/imagen/PID/hashes iguales; ledger igual al multiconjunto histórico, 27 activas y 28 ausente; 36 tablas, 20 clientes, 28 reservas, cero vínculos/cola abierta/leases. Credencial DPAPI migrador usada exclusivamente en memoria del cliente de respaldo y con READ ONLY; no se usó para API/worker ni se abrió Clave.txt. [bc-first.json](evidence/m2-c3-p2/p2-goal-20261004/bc-first.json).

**C — backup y recuperación:** dump real y manifiesto cifrados a las 16:41 UTC del 2026-10-04. El primer restore detectó el rol incorporado pg_database_owner; se corrigió únicamente la preparación aislada, se probó localmente y se continuó **con los mismos archivos cifrados y hashes**, sin tomar otro corte del origen. El segundo descifrado, todos los cotejos y rollback terminaron exit 0. [local-probes.json](evidence/m2-c3-p2/p2-goal-20261004/local-probes.json), [c-verified.json](evidence/m2-c3-p2/p2-goal-20261004/c-verified.json).

La imagen original ARM64 QA no se trasladó al equipo. Se usaron las imágenes ya instaladas en el host, con `--pull=never`: PostgreSQL nuevo en tmpfs/network none y API nueva compartiendo exclusivamente ese namespace. Se alimentaron solo SQL/versionado y fixtures sintéticos, sin variables o credenciales QA; Clerk sustituido localmente y correo deshabilitado. La imagen mantuvo su ID original, ambos contenedores propios se retiraron y se verificó su ausencia. Los argv completos, exits y stderr están en [image-rollback.json](evidence/m2-c3-p2/p2-goal-20261004/image-rollback.json).

Comandos de entrada efectivamente usados, desde la raíz; auxiliares temporales archivados como evidencia, no como producto desplegable:

~~~powershell
git branch --show-current
git rev-parse HEAD
git status --short
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -u '.tmp/p2-goal/harness.py'
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -u -c "import sys;sys.path.insert(0,'.tmp/p2-goal');import harness as h;h.units();h.scenario('persistencia-error');h.REPORT['targetedOnly']=True;h.REPORT['targetedPassed']=True;h.save();print('targeted persistence scenario passed')"
& '.tmp/p2-goal/controller.ps1' -PruebaLocal
Start-Process -FilePath (Get-Command pwsh).Source -ArgumentList @('-NoProfile','-File','C:\Users\Fraylin\Desktop\Kortek-Booking\.tmp\p2-goal\controller.ps1') -WindowStyle Normal
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -u '.tmp/p2-goal/probe-owner.py'
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -u '.tmp/p2-goal/real-image-drill.py'
& 'C:/Users/Fraylin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -u '.tmp/p2-goal/final-audit.py'
~~~

El controller ejecutó B/C y la continuación C sin nuevos prompts, conservando las dos entradas solo en memoria hasta éxito. Sus dos ejecuciones, ambas fuentes de datos del censo, arrays exactas de procesos, códigos de salida y stderr se conservan en bc-first/c-verified. El arnés acumulado y el ensayo de imagen originales contienen únicamente inputs sintéticos. Los JSON de comandos son la bitácora detallada; no se reemplazan por esta lista de entradas.

Verificación final de Git: `git diff --check`, `git diff --stat`, `git diff`; staging por las rutas del documento y cada archivo del directorio de esta evidencia; `git diff --cached --check`, `git diff --cached --stat` y lectura completa del diff staged y sus blobs. Commit local: `git commit -m "docs(m2): completar respaldo P2 y recuperacion verificada"`. Se verificó después el árbol limpio y el alcance del commit. Los hashes del manifiesto se calculan sobre bytes LF de evidencia; las fuentes ejecutadas preservan sus bytes originales dentro de base64.

### 20.3 Impedimentos, causas, soluciones y evidencia

| Impedimento | Causa comprobada, corrección y prueba |
| --- | --- |
| rg / comando python no disponibles como se invocaron | rg.exe no pudo iniciarse por asociación Windows; python no estaba en PATH. Se usaron búsquedas PowerShell dirigidas y el Python bundled ya instalado. Sin instalación. [session-notes.json](evidence/m2-c3-p2/p2-goal-20261004/session-notes.json). |
| Docker denegado en sandbox | Acceso a config/context metadata denegado; exit 1 conservado. Ejecución local acotada con permiso ampliado pasó. a-impediments.json. |
| Gate runtime de clon falla | CREATE DATABASE recuperó TEMP de PUBLIC; se revocó únicamente en el clon. Gate original sin cambios pasó. a-impediments.json y a-complete.json. |
| Aserción de dump previo / firma api_access | El detector confundía pg_dump --version con dump de datos; se limitó a --format=custom sin --schema-only. Un cambio del ejecutor mientras el arnés aún cargaba módulos dejó una firma vieja; se serializaron las siguientes modificaciones/ejecuciones. Todos los casos finales pasan. a-impediments.json. |
| Puerto ausente en red --internal | Docker no publicó el puerto de esa red. Se cambió el clon local a red dedicada sin NAT saliente, publicación solo 127.0.0.1 y SCRAM para TCP; la sonda pasó y se retiró. local-probes.json. |
| Motor Docker no disponible tras continuidad | Pipe dockerDesktopLinuxEngine ausente y servicio/proceso detenido. Se inició Docker Desktop instalado, oculto; servidor 29.6.1 y sonda posterior pasan. local-probes.json y registro auxiliar de sesión. |
| ERR_REQUIRE_ESM en copia del API | Faltaba apps/api/package.json en git archive; Node heredaba el type del root. Se incluyó el package.json original del release; HTTP 200/200/201 pasa. a-impediments.json y a-complete.json. |
| Alteración sintética después del RR de cotejo | El snapshot local ya estaba fijado; la alteración se detectó demasiado tarde en el upgrade. Se movió la inyección antes de abrir el reader local: restore-desigualdad:tables, ambos mapas completos retenidos. El fallo intermedio no conservó ambos mapas y se declara evidencia insuficiente; no se usa para probar el gate. a-impediments.json y a-corruption.json. |
| Aserción del error externo espera LF | El proceso Windows produjo CRLF. Se normalizó solo el fin de línea para la aserción; se preservan las tres líneas crudas, exit 7, error RuntimeError y fallo TypeError del emisor. Quinto caso targeted exit 0. a-targeted.json y a-errors.json. |
| pg_database_owner reservado en restore real | El rol ya es incorporado en PG17. Se verificó su existencia y se reutilizó únicamente en el contenedor nuevo. Sonda local y restore/cotejo completo pasan. bc-first.json, local-probes.json, c-verified.json. |
| Imagen original ausente localmente / exportación rechazada | Inspect local exit 1: no imagen. La revisión automática rechazó exportar el payload completo por SSH por autorización de traslado insuficiente. **No se ejecutó la exportación ni se buscó otro canal de traslado.** Alternativa aprobada y ejecutada: imagen donde ya estaba instalada, dos contenedores nuevos sin exterior y datos sintéticos; prueba exacta y limpieza pasan. image-rollback.json y registro auxiliar de sesión. |
| Archivado de fuente original no reproduce su SHA | El archivo fue corregido durante C y tenía finales de línea mixtos. Tres candidatos no coincidieron; se abandonó reconstruirlo como original. Se conservan su SHA registrado, evidencia operativa y bytes exactos del ejecutor C/otros auxiliares disponibles en executed-sources.json (base64 + SHA). Las fuentes .txt son vistas normalizadas. No se atribuye a A/B una copia reconstruida ni se relaja ningún cotejo de base. archive-map.json y registro auxiliar de sesión. |

La primera validación documental confundió sus propios literales PEM con material de clave. Se corrigió la detección a cabeceras en líneas completas, sin omitir archivos ni aceptar claves. [validation-impediment.json](evidence/m2-c3-p2/p2-goal-20261004/validation-impediment.json) conserva comando, exit 1, stderr completo y ambos lados; una segunda aserción documental exigió erróneamente diff crudo vacío pese a la excepción E5 ya probada. Se corrigió para recomputar igualdad del SQL completo con únicamente los mismos términos AND y las tablas de verdad PostgreSQL; los errores y lados están conservados. Un tercer control detectó que los dos registros auxiliares nuevos usaban `class` en vez de `exceptionClass`; se añadió el campo uniforme, sin relajar el control ni modificar los registros operativos. La validación corregida pasó.

Los registros externos conservan clase/fase, comando sanitizado, exit code y stderr completo redactado hasta 8 KB. Los fallos deliberados están diferenciados de impedimentos. Los errores de herramientas sin proceso tienen exit nulo; no se inventa un exit ni stderr separado cuando la herramienta solo devolvió salida combinada. El registro auxiliar recuperó los outputs originales de los 15 errores de herramientas desde la transcripción de esta misma tarea; conserva salida combinada completa hasta 8 KB, diferenciándola del stderr. La consulta final de SSH denegada por el sandbox quedó registrada en [final-audit-sandbox-failure.json](evidence/m2-c3-p2/p2-goal-20261004/final-audit-sandbox-failure.json); su repetición autorizada en solo lectura pasó. La metadata `base` heredada de algunos reportes del arnés es histórica; la base Git observada es la de 20.1 y a-gate.json.

### 20.4 Datos clave y censo exacto del snapshot

- Dump AES256: `C:\KortekBackups\qa-m2-c3\qa-m2-c3-p2-20261004T164109Z-56f10a6cd5fa.dump.gpg`.
- SHA-256: `17f6e1191b15f828b444ee8db593e781dd707ed3c4b80f940a02ff16d0605063`.
- Manifiesto cifrado: `C:\KortekBackups\qa-m2-c3\qa-m2-c3-p2-20261004T164109Z-56f10a6cd5fa.censo.gpg`.
- SHA-256 del manifiesto: `10ee43953b675bcf50970256484ddcb535101e8664bcc1be39e328c0e4696084`.
- PostgreSQL origen: **17.6** (`server_version_num=170006`); cliente pg_dump y restore local: **17.11 (Debian 17.11-1.pgdg13+2)**. Imagen local PG17 fija `sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f`.
- Imagen API original probada: `701329f1cfe7b45f5b6d0cfe62daeae0edf6e1c00518158cb8555a815c224031`, Linux ARM64. PG17 del ensayo remoto: imagen `97432f980da100ebd3e419711efee84e1e97a966d62c035286a07f239ddb4d9c`; versión exacta en image-rollback.json.
- Extensión relevante: **btree_gist 1.7 en public**, iguales origen/restore. Schema public de pg_database_owner; tablas de kortek_migrator reconstruidas y cotejadas. Ledger técnico: **31 entradas**, **27 terminadas activas**, **4 revertidas históricas**, migración 28 ausente; multiplicidad conservada.

| Tabla public | Filas en el corte |
| --- | ---: |
| `AuditLog` | 98 |
| `Booking` | 28 |
| `BookingEmailEvent` | 64 |
| `BookingEmailPreference` | 28 |
| `BusinessClosure` | 4 |
| `BusinessSchedule` | 4 |
| `BusinessScheduleDay` | 21 |
| `BusinessScheduleRevision` | 14 |
| `BusinessScheduleWindow` | 21 |
| `Client` | 20 |
| `CmsOperation` | 5 |
| `CmsPage` | 4 |
| `EmailAbuseBucket` | 0 |
| `EmailChannelControl` | 1 |
| `EmailOutbox` | 50 |
| `EmailWebhookReceipt` | 12 |
| `GalleryImage` | 0 |
| `Invoice` | 16 |
| `MediaAsset` | 4 |
| `MediaGalleryOrder` | 0 |
| `MediaOperation` | 5 |
| `MediaPromotion` | 1 |
| `MediaPurgeJob` | 1 |
| `Membership` | 9 |
| `Notification` | 0 |
| `Organization` | 4 |
| `Payment` | 16 |
| `Professional` | 5 |
| `ProfessionalAvailabilityBlock` | 1 |
| `ProfessionalService` | 0 |
| `ProfessionalWeeklySchedule` | 0 |
| `SecurityRateBucket` | 10 |
| `Service` | 5 |
| `TeamInvitation` | 1 |
| `User` | 8 |
| `_prisma_migrations` | 31 |

El manifiesto cifra el catálogo y las huellas completas del corte. La evidencia técnica contiene los conteos/huellas y comparaciones; no contiene filas de negocio, URL/contraseña real, frase, logs del ledger ni hashes de passwords. Ambos hashes de archivos se comprobaron otra vez al finalizar. Censo de clientes 20, reservas 28, vinculados 0, outbox abierto 0 y leases activos 0. **Este es el snapshot del backup, no un censo actual posterior.**

### 20.5 Lo no verificado y riesgos restantes

P2 conserva escritores activos: no garantiza RPO cero sobre escrituras posteriores al snapshot. **P3b exige un respaldo NUEVO bajo congelamiento, con hash/censo/restore verificados; este archivo P2 no lo sustituye.** No se ejecutó P3, no se aplicó la migración 28 a QA, ni se modificaron ledger, roles/grants, variables, flags, Clerk o servicios QA existentes. El DDL/migración 28/inversa de los ensayos solo existió en clones desechables.

El respaldo y cotejo son del **schema public de la aplicación**, como §§5.1–5.2: no constituyen backup integral de schemas internos/globales del proveedor Supabase. E1–E4 siguen siendo exclusiones cerradas (dueños, ACL, default ACL y roles solo en origen); los roles de interés y sus privilegios seleccionados se reconstruyeron y compararon. E5 requiere textos AND idénticos y prueba SQL con límites/NULL, ambas satisfechas. Cabeceras informativas de versiones, tokens aleatorios restrict/unrestrict, CRLF/LF y espacios finales no son cambios SQL; versiones reales quedan registradas por separado. No se aceptó ningún cambio adicional de datos o lógica.

Rollback §5.3: se probó recuperación de datos/schema, fallo transaccional y compatibilidad del código e imagen anteriores con schema aditivo y fixtures. No se alteraron alias web, opciones/sesiones Clerk, ni se simuló corrupción/restore operativo sobre QA real. Esas respuestas externas se conservan como procedimientos que requieren su autorización propia. El ensayo de imagen usa datos sintéticos y stub Clerk, y no sustituye QA autenticado/físico, correo ni cutover. D4 y demás bloqueos de producción continúan vigentes. La imagen anterior reintroduce el límite legacy documentado; mantener C2 retirado en una reversión. No se inventa RTO operativo ni disponibilidad futura.

Límite de trazabilidad: no se conservaron bytes del ejecutor anterior a la corrección C; su SHA sí quedó sellado. Ninguna reconstrucción discordante se incluye como fuente original. Fuentes C/imagen/controller exactas están codificadas con su hash, más vistas legibles. Este límite no se usa para sustituir los restores reales ni sus cotejos independientes.

Limpieza: auditoría local encontró ausentes **33 contenedores propios** y **8 redes propias** acumulados; ensayo de imagen verificó ausencia de sus dos contenedores remotos. Agentes/homes GPG propios retirados y controller terminado exit 0. Se retiró únicamente `.tmp/p2-goal`, tras archivar y validar ruta y ausencia de reparse points. [cleanup.json](evidence/m2-c3-p2/p2-goal-20261004/cleanup.json) registra la limpieza; [validation.json](evidence/m2-c3-p2/p2-goal-20261004/validation.json) y [manifest.json](evidence/m2-c3-p2/p2-goal-20261004/manifest.json) sellan la revisión documental y el inventario de evidencia. Se retienen exclusivamente el dump y manifiesto cifrados reales en custodia, documento y evidencia sanitizada.

### 20.6 Acción del propietario

Guardar la frase de forma segura y separada de los archivos cifrados, manteniendo su custodia. Revisar esta evidencia y decidir por separado si autoriza P3; P2 cumplido no aprueba C3 ni abre producción. Antes de migrar en P3b, generar y verificar el nuevo respaldo bajo congelamiento del corte que realmente se va a modificar. El commit de esta entrega permanece local; no autoriza push ni despliegue.


## 21. Confirmación adicional de continuidad QA tras el commit P2 — 2026-10-04

### 21.1 Estado

**OBJETIVO CUMPLIDO — P2.** Los siete criterios y sus cotejos de §20 siguen vigentes. El primer commit local fue **0dd4ba7c0e42ac18617029a7e0f3f990cf38995c**. Este anexo conserva todas las secciones anteriores y registra una comprobación adicional; no reescribe ese commit. [post-commit-audit.json](evidence/m2-c3-p2/p2-goal-20261004-postcommit/post-commit-audit.json).

### 21.2 Trabajo y resultado

Consulta de metadata QA en solo lectura, sin conexión a la base: `systemctl show`, `podman inspect` y `sha256sum` con los argumentos originales de la función infra archivada. Fuente exacta y argv en [post-commit-audit.py.txt](evidence/m2-c3-p2/p2-goal-20261004-postcommit/post-commit-audit.py.txt). Comando de entrada: `bundled-python docs/quality/evidence/m2-c3-p2/p2-goal-20261004-postcommit/post-commit-audit.py.txt`; **exit 0** a las **22:14:24 UTC**. HTTP público real **200**, cuerpo no vacío ni impreso. Se verifican prefijo documental preservado, alcance Git y manifiesto del anexo en [validation.json](evidence/m2-c3-p2/p2-goal-20261004-postcommit/validation.json) y [manifest.json](evidence/m2-c3-p2/p2-goal-20261004-postcommit/manifest.json).

### 21.3 Impedimento y corrección

La primera sonda adicional reutilizó argv sanitizados: el formato Go de podman estaba sustituido por marcadores y la igualdad de salida falló. **No hubo un cambio de imágenes ni un reinicio.** PID y hashes ya coincidían. Se extrajo solo la constante original por AST de la fuente conservada, sin importar ni ejecutar el resto del ejecutor. El JSON conserva clase/fase, comando sanitizado, exit 1, stderr completo y ambos lados; la consulta corregida devuelve metadata idéntica y HTTP 200. No se modificaron QA ni los comparadores del restore.

### 21.4 Datos clave

API PID **673295**, worker **575989**, active/running, NRestarts **0**; mismas imágenes y hashes protegidos del baseline y §20. El respaldo cifrado, su SHA-256 y censo siguen siendo los de §20.4. El anexo contiene solo metadata técnica sanitizada; el SHA del commit final se entrega en el relevo.

### 21.5 Límites

No es un nuevo snapshot ni un respaldo bajo congelamiento. Se mantienen todos los límites de §20.5 y la necesidad del respaldo nuevo de P3b. Sin push, sin P3 y sin acceso a producción. La carpeta temporal propia ya retirada no se recreó; el anexo se escribió directamente como evidencia documental.

### 21.6 Propietario

Conservar la frase separada del respaldo; revisar la evidencia y decidir P3 por separado, como §20.6. Ambos commits permanecen locales y no aprueban C3 ni producción.


## 22. P3 ejecutado con parada obligatoria y rollback de código — 2026-10-04

### 22.1 Estado y criterios

**OBJETIVO NO CUMPLIDO / PAUSADO POR PUNTO DE PARADA 2.** El propietario autorizó P3 sobre `ai/antigravity-qa`, base **bc1d559e42928ca0deb60319b33cf98b3cd69291**, árbol inicial limpio, sin push. Después del ensayo real, catálogo e imagen, confirmó el congelamiento con dos entradas iguales en un prompt local sin eco. La autorización y las dos aclaraciones previas están en [authorization.json](evidence/m2-c3-p3/p3-goal-20261004/authorization.json).

Los tres pasos SQL y el registro soportado de Prisma terminaron con **exit 0**. QA quedó en **28 migraciones terminadas activas, 0 fallidas y 37 tablas**. El gate runtime real falló **antes de abrir la conexión DB** por CRLF en el script Bash. Conforme al punto de parada 2, no se reintentó el gate ni se activó el API nuevo: se reanudaron las imágenes anteriores sobre el schema aditivo. No se restauró la base ni se aplicó la inversa. La corrección posterior es exclusivamente local.

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| 1. Ensayo sobre respaldo REAL P2, owners, SQL/grants, runtime restringido y API nuevo/anterior | CUMPLIDO | [rehearsal-attempt-2.json](evidence/m2-c3-p3/p3-goal-20261004/rehearsal-attempt-2.json): restore/cotejo completo; todos los dueños public de relaciones, tipos y funciones reproducidos; login SCRAM; 37 tablas; ledger 28; booking-data real del clon y fixtures 200, reservas sintéticas 201/PENDING, seis rutas customer 401; código 791569b sobre schema 28 con M1 y claim 200, customer 404. Sin red exterior ni ensayos en el host QA. |
| 2. Catálogo QA READ ONLY antes de congelar | CUMPLIDO | [catalog-result.json](evidence/m2-c3-p3/p3-goal-20261004/catalog-result.json) y relectura previa al freeze en [freeze--result.json](evidence/m2-c3-p3/p3-goal-20261004/freeze--result.json): TLS verify-full, RR/RO, sin filas de negocio; Migrator dueño de objetos tocados, BusinessScheduleState, Client y Booking, CREATE public; inventario completo de privilegios y defaults. |
| 3. Artefacto ARM64 del SHA base, APP_RELEASE exacto y rollback disponible | CUMPLIDO | [artifact-build-result.json](evidence/m2-c3-p3/p3-goal-20261004/artifact-build-result.json), [startup-verification.json](evidence/m2-c3-p3/p3-goal-20261004/startup-verification.json), [image-stage-verified--result.json](evidence/m2-c3-p3/p3-goal-20261004/image-stage-verified--result.json): 23 casos de arranque, ID/config y 19 capas cotejados, imagen nueva cargada inactiva, anteriores disponibles. |
| 4. Respaldo NUEVO congelado, AES256, snapshot y restore antes de migrar | CUMPLIDO | [freeze--result.json](evidence/m2-c3-p3/p3-goal-20261004/freeze--result.json): dump/censo del mismo snapshot exportado RR/RO; descifrado con segunda entrada; TOC btree_gist/public, censo/huellas/ledger con multiplicidad/catálogos/roles/extensions completos, E1–E5 cerradas; restore antes del primer SQL real. |
| 5. Migración/grants separados, login/gate runtime real y revocaciones nuevas | PARCIAL / NO CUMPLIDO | SQL 28, matriz sin `\ir` y suplemento: tres `psql -v ON_ERROR_STOP=1`, cada uno exit 0 y verificación entre pasos; revocaciones solo sobre objetos nuevos; ledger 28 y ACL 36 previas iguales. El gate real termina **exit 2 antes del login**. |
| 6. API nuevo y worker con imagen actual, unidades/orden QA | NO CUMPLIDO | API nuevo no activado. Rollback verificado: API 701329f1…, release 791569b; worker 7eafd5c9…; referencia fija del worker explícitamente autorizada. [rollback-final--result.json](evidence/m2-c3-p3/p3-goal-20261004/rollback-final--result.json). |
| 7. Validación completa posterior del API nuevo, runtime, datos y catálogo | PARCIAL / NO CUMPLIDO | Ledger 28/0 fallidas, 37 tablas, defaults bloqueados, CustomerOperation vacío, funciones invoker/search_path, externos/PUBLIC sin grants nuevos, ACL semántica 36 tablas y huellas preexistentes verificadas antes del gate. Falta gate real y API nuevo/customer 401 en QA. HTTP 200 y servicios anteriores sí verificados tras rollback. |
| 8. Nueva sección y commit local solo documental/sanitizado | DOCUMENTADO / EN REVISIÓN | Esta sección y [manifest.json](evidence/m2-c3-p3/p3-goal-20261004/manifest.json); commit local por rutas explícitas, SHA entregado en el relevo. No es aprobación ni cierre de P3. |

### 22.2 Trabajo realizado, comandos y resultados

Fuentes exactas y SHA de ejecutores, incluidas las versiones Bash que fallaron y las corregidas localmente: [executed-and-corrected-sources.json](evidence/m2-c3-p3/p3-goal-20261004/executed-and-corrected-sources.json). Cada reporte conserva argv sanitizados, exit y stderr redactado hasta 8 KB. Los supervisores usaron el Python ya instalado y SecureString/BSTR privado por stdin: frase/credencial nunca en argv, entorno de frase, archivos, logs ni chat. La DPAPI QA del migrador se usó solo en memoria de procesos separados, nunca en servicios API/worker. No se adquirió otra credencial; el gate previsto usa el contexto runtime existente vía LoadCredential.

1. `git branch --show-current`, `git status --short`, `git archive --format=tar` del SHA base con contexto mínimo §6.2; build local `docker --context desktop-linux buildx build --platform linux/arm64 --load --tag kortek-api-p3:<SHA> --file release.Containerfile --progress plain <contexto>`, **exit 0**. Se añadió solo APP_RELEASE/revision al Containerfile temporal; código del checkout intacto, instalación congelada exclusivamente dentro de imagen con lockfile existente.
2. Catálogo: supervisor DPAPI → cliente PG17 local → `psql -X -qAt -v ON_ERROR_STOP=1`, TLS verify-full y transacción RR READ ONLY. 36 tablas propiedad Migrator, 10 enums incluido BusinessScheduleState; sin secuencias public; ningún permiso de tabla efectivo para anon/authenticated/service_role. Se conservaron PUBLIC EXECUTE histórico de siete funciones trigger **SECURITY INVOKER**, USAGE de tipos y defaults de postgres/supabase_admin. Son defaults ya presentes en el baseline, no nuevos grants ni permisos de tabla; no se revocaron objetos anteriores. La creación por Migrator no hereda los defaults de postgres/supabase_admin.
3. Prompt previo autorizado solo para ensayo: restore REAL P2 SHA `17f6e119…`, owners completos reproducidos, SQL separado y API nuevo/old ejecutados únicamente en clones locales. El ensayo demostró que un GET público modifica SecurityRateBucket (10→2 por incremento/limpieza); el propietario autorizó cotejo completo antes de activar y diferencias técnicas explícitas después del HTTP.
4. `docker save` exportó **solo la imagen nueva local**, compresión gzip existente, SCP y `podman load` en directorio propio QA. No se exportó ninguna imagen QA/producción ni se ensayaron contenedores en ese host. ID/config y las 19 capas se verificaron; no se activó la imagen. Dos entradas iguales en prompt de congelamiento confirmadas a las **23:13:56 UTC**; la ventana no empezó hasta la parada efectiva prevista.
5. Vigilancia prevista de 120 minutos con unidad temporal propia; `sudo -n systemctl stop kortek-api-staging`, luego `sudo -n systemctl stop kortek-email-worker-staging`, **exit 0** ambos. Estado inactive/dead, PID 0. Migrator RR/RO verificó cero escritores no controlados/invisibles, prepared transactions y otras transacciones activas; snapshot nuevo, stream `pg_dump`→GPG AES256, censo cifrado y restore local aislado completo, **exit 0** antes de migrar.
6. Tres comandos `docker exec -i … psql -X -qAt -v ON_ERROR_STOP=1` con migrador QA/TLS; por stdin, separados: `20261003120000_customer_stage_one/migration.sql`, `apply-runtime-grants.sql` retirando únicamente su `\ir` para evitar repetir el suplemento, `customer-stage-one-runtime-grants.sql`. Cada paso **exit 0** y catálogo verificado antes del siguiente. Una transacción posterior revocó tabla CustomerOperation y EXECUTE de las dos funciones nuevas de anon/authenticated/service_role/PUBLIC, **exit 0**, sin añadir grants sobre objetos antiguos.
7. Después de todo SQL exitoso: `node node_modules/prisma/build/index.js migrate resolve --applied 20261003120000_customer_stage_one` desde herramienta local aislada de migración con credencial Migrator en memoria, **exit 0**. Es el registro soportado del SQL ya aplicado, no un resolve de migración fallida ni una edición manual del ledger. Checksum registrado **af7d78386c24d3ba31fe4c58de783b6d5c6e1fba018674e7989c1bdc560c592c**, bytes CRLF del SQL versionado en la imagen; SQL working tree LF SHA **6e1d854f…**. Ambos contenidos son idénticos normalizando solo CRLF, evidencia explícita. Ledger anterior conserva todas sus filas y huellas; únicamente se añade la entrada 28.
8. Gate real previsto mediante `sudo -n systemd-run --unit=kortek-p3-runtime-gate-bc1d559 --wait --pipe --collect … runtime-gate.sh`, **exit 2**, por `set: pipefail\r: invalid option name`. **No alcanzó source del contexto runtime, podman ni conexión DB**. Parada obligatoria: gestor protegido `qa-manager.py rollback`; restableció archivo runtime original y fijó únicamente el argumento de imagen del worker autorizado; start API anterior y después worker anterior, **exit 0**. Release/DB QA booleana correctos, HTTP público **200**, active/running, NRestarts 0.
9. Verificación de retiro: timer **LoadState=not-found, ActiveState=inactive, SubState=dead**. Contenedores PG/restore/CLI locales y agente GPG retirados. Temporales remotos de código/archivo y copia protegida de rollback eliminados; las imágenes necesarias quedan disponibles. Corrección Bash LF y comprobación `bash -n`/ejecución real de `set -Eeuo pipefail` en contenedor local sin red, **exit 0**; no se repitió el gate QA ni se cambió su estado tras rollback.

### 22.3 Impedimentos, causa, solución y límites de captura

- Tres rutas locales inicialmente supuestas incorrectas (Containerfile, controlador público y wrapper) y ruta de storage: discovery por `git ls-files`/lectura exacta resolvió las rutas. No hubo cambios de producto. Registro original y limitación de capturas en [impediments.json](evidence/m2-c3-p3/p3-goal-20261004/impediments.json); las salidas completas restantes permanecen en la conversación de herramientas.
- Primer supervisor previo terminó sin ejecutar Python; su catch inicial omitió la excepción subyacente, por lo que **no se afirma conservar ese stderr ni conocer su causa**. Se conservó estado/exit 1, se añadió captura redactada y el siguiente prompt/ensayo completó con exit 0.
- Primer cotejo de owners del ensayo falló: objetos btree_gist quedaron postgres frente a supabase_admin en QA. Se conservan ambos lados en attempt-1. Se reprodujo el dueño de todos los tipos/funciones de extensión en el clon, sin copiar credenciales/atributos elevados del rol fuente. Comparación completa posterior idéntica, attempt-2 **exit 0**; no se amplió E1–E5.
- Drill de arranque ARM64: 20 casos pasaron; el caso socket-override agotó 15 s bajo emulación/CPU concurrente y devolvió null. Tres casos restantes pasaron con el mismo código/verificaciones y timeout 90 s. La imagen no cambió. El core de la excepción está archivado y el stderr completo inicial en la conversación; no se presenta la captura parcial del artefacto como completa.
- Generación del ejecutor de traslado: SyntaxError por comilla final omitida y referencia inicial a helper inexistente, detectados/corregidos antes de ejecutar; AST válido. Sin freeze durante esta preparación.
- `podman load` terminó de cargar el artefacto, pero la inspección siguiente falló exit 125 al usar el ID de manifest de Docker 29 como ID de configuración Podman. Se conservó stderr completo y archivo exacto; se calculó el digest del config transferido y se cotejaron configuración/revision/ARM64 y las 19 capas, sin reconstruir ni cambiar bytes.
- **Fallo decisivo real:** CRLF del script Bash introducido por escritura Windows. Gate **exit 2**, sin conexión runtime. Se ejecutó rollback y se detuvo P3. El script de vigilancia compartía esos saltos: no se ejerció su ejecución al vencimiento y **no se afirma que hubiese funcionado**. El rollback inmediato se ejecutó por Python y fue verificado. La versión LF se corrigió y probó únicamente localmente; [crlf-correction-local-only.json](evidence/m2-c3-p3/p3-goal-20261004/crlf-correction-local-only.json).
- El retiro conjunto de timer/service devolvió **exit 5** porque el service ya no estaba cargado, aunque el timer sí se retiró. Lectura final independiente confirmó timer not-found/inactive/dead, sin rollback futuro armado. No se escondió ese exit 5.
- La primera comprobación local Bash omitió `docker run -i` y recibió stdin vacío; exit 0 **rechazado como prueba**, archivado. Con `-i` y exigencia de ambos marcadores de ejecución, comprobación **exit 0 válida**. Las esperas iniciales pg_isready con exit 2 son readiness transitoria conservada; los contenedores posteriores sí respondieron y fueron retirados.

### 22.4 Datos clave, custodia y estado final

- Respaldo **NUEVO bajo congelamiento, antes de migrar**: `C:\KortekBackups\qa-m2-c3\qa-m2-c3-p3-frozen-20261004T232627Z-efe04b28cc60.dump.gpg`; **47380 bytes**, SHA-256 **76866b817efecb0bf2a2025fe89197ad4aaa8ec4938166af3e65abe8f64dc430**.
- Censo cifrado: `C:\KortekBackups\qa-m2-c3\qa-m2-c3-p3-frozen-20261004T232627Z-efe04b28cc60.censo.gpg`; SHA-256 **815921b4ad04ffd6fea16748bf6e6d09b82df9d39cee0aec28c60b3bce3395ce**. Frase conservada exclusivamente por el propietario; memoria de procesos y agente GPG liberados. No se versionan dump, censo cifrado ni secretos.
- Fuente PostgreSQL **17.6**; restore/cliente **17.11**, imagen local PG `d74eeac9…`. Snapshot con **36 tablas**, ledger **27 terminadas activas + 4 revertidas = 31 filas**. Comparación posterior conserva esas 31 filas y agrega una: ledger **28 activas + 4 revertidas = 32**, 0 fallidas. CustomerOperation vacío; 20 Clients bloqueados, no ambiguos y revisión 0 tras DDL.
- Imagen nueva, **INACTIVA**: Podman config **807bcb442a69e74198b224d1e60c9ae8d678043a6c7d070e90ace80935d8a261**; manifest Docker local **bd294744d685f962f634ca24f8b66c124f1b37d8fc91a8128e42854a73e2ca14**; `APP_RELEASE=bc1d559e42928ca0deb60319b33cf98b3cd69291`. Artefacto de transferencia SHA en el reporte de traslado, config/19 capas cotejados en [image-identity.json](evidence/m2-c3-p3/p3-goal-20261004/image-identity.json).
- Parada/ventana: **2026-10-04T23:26:11.241419+00:00**; rollback confirmado y fin de ventana de esta ejecución **2026-10-04T23:27:37.126269+00:00**: **85.885 segundos**, inferior a 120 minutos. El segundo timestamp es fin de verificación del rollback, no medición exacta al milisegundo de indisponibilidad HTTP.
- API final: release **791569b110f9fd59cb10e6d248546bdae3996e14**, imagen **701329f1cfe7b45f5b6d0cfe62daeae0edf6e1c00518158cb8555a815c224031**, PID **1084550**. Worker: imagen **7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1**, PID **1084553**. Ambos active/running, NRestarts **0**; los PID cambiaron por la parada/reanudación autorizada, no se confunden con PID P0.
- Archivo runtime final idéntico al original SHA **c507c632a022a74e85b9480f234fd3ea89f50985e940b8b2a89652c779fb9fa4**; APP_RELEASE/image del API no cambiaron finalmente. Único cambio persistente fuera de DB: argumento de imagen del worker en `/usr/local/libexec/kortek-worker-staging-run.sh`, SHA final **919d73ca08e6485f34a456d88a01e2406537c2c34ac7722e3564f84c06f99ad6**, autorizado y verificado como sustitución de una referencia. No se modificaron flags, credenciales ni unidades QA existentes.

Censo exacto del snapshot congelado (conteos, no filas):

| Tabla | Filas |
| --- | ---: |
| AuditLog | 98 |
| Booking | 28 |
| BookingEmailEvent | 64 |
| BookingEmailPreference | 28 |
| BusinessClosure | 4 |
| BusinessSchedule | 4 |
| BusinessScheduleDay | 21 |
| BusinessScheduleRevision | 14 |
| BusinessScheduleWindow | 21 |
| Client | 20 |
| CmsOperation | 5 |
| CmsPage | 4 |
| EmailAbuseBucket | 0 |
| EmailChannelControl | 1 |
| EmailOutbox | 50 |
| EmailWebhookReceipt | 12 |
| GalleryImage | 0 |
| Invoice | 16 |
| MediaAsset | 4 |
| MediaGalleryOrder | 0 |
| MediaOperation | 5 |
| MediaPromotion | 1 |
| MediaPurgeJob | 1 |
| Membership | 9 |
| Notification | 0 |
| Organization | 4 |
| Payment | 16 |
| Professional | 5 |
| ProfessionalAvailabilityBlock | 1 |
| ProfessionalService | 0 |
| ProfessionalWeeklySchedule | 0 |
| SecurityRateBucket | 2 |
| Service | 5 |
| TeamInvitation | 1 |
| User | 8 |
| _prisma_migrations | 31 |

### 22.5 Lo no verificado y riesgos pendientes

**No pasó el gate mediante login runtime real de QA**: falló antes de conectarse. El SQL sí está aplicado y registrado, pero eso no aprueba runtime ni API nuevo. No hubo activación nueva, customer 401 en QA ni validación posterior completa del nuevo release. La preservación completa de campos anteriores se verificó **antes del gate/activación**; después del rollback/HTTP público pueden cambiar contadores técnicos, y no se afirma un nuevo cotejo completo posterior al rollback. No se crearon reservas ni otras escrituras de negocio en QA por el agente. El worker y API previos volvieron a su funcionamiento normal.

El rollback conserva schema 28; **no es un rollback de datos/schema**. El código anterior conserva los límites legacy D8 y C2/web permanece sin desplegar. El ensayo de código anterior usó sus fuentes Git exactas con dependencias de la imagen nueva; no se exportó ni ejecutó su imagen QA en un host de ensayo. El rollback real sí verificó la imagen antigua con lectura pública sobre schema 28, sin probar mutaciones de negocio QA. El vencimiento de vigilancia no se ensayó y su versión original CRLF no se declara funcional.

Sin Clerk, web, proveedor de identidades/correo ni QA física nuevos. Producción permanece fuera de toda operación de esta tarea; no se consultó su estado ni se infiere una auditoría productiva. Sin push, main, force-push ni reescritura. No hay aprobación/terminación de P3 ni de C3.

### 22.6 Decisión necesaria del propietario

Guardar la frase del respaldo nuevo separada de los cifrados y revisar el resultado **NO CUMPLIDO**. QA está estable con imágenes anteriores y schema 28. **No volver a ejecutar el SQL 28, no resolver otra vez su ledger ni restaurar sobre QA por inferencia.**

Para continuar hace falta autorización explícita posterior a esta parada: revalidar schema/ledger/grants en solo lectura; corregir y validar en aislamiento el gate y vigilancia LF; preparar un nuevo corte/respaldo verificado que refleje el estado reabierto; confirmar un nuevo congelamiento en prompt local; ejecutar el gate runtime real sin repetir migración/grants; solo si pasa, cambiar APP_RELEASE/referencia del API, mantener el worker fijado a su imagen y completar criterio 7 con la regla de cotejo autorizada. Si falla cualquier verificación, conservar el punto de parada y rollback. El respaldo pre-28 de esta sección sigue siendo custodia del corte original, no se reemplaza ni se restaura sobre QA automáticamente.

La configuración Git anuncia conversión LF→CRLF en archivos de texto. Para una continuación, **no copiar directamente los `.sh.txt` como ejecutables**: materializar los bytes LF desde `base64ExactBytes` de las entradas corregidas `runtime-gate.sh` y `qa-rollback.sh`, verificar sus SHA y ausencia de `\r`, y repetir la prueba local de Bash. Los textos `.sh.txt` son solo para revisión.

El commit de esta entrega contiene exclusivamente esta nueva sección y evidencia sanitizada. Los apartados anteriores se conservan byte por byte. No autoriza por sí mismo una continuación ni publicación.

Auditoría posterior al commit local `8fd74477f027fba4c2c3c28d8a73eb9dcffaec3f`: el manifiesto esperaba los bytes CRLF del diff de propuesta del worker, mientras Git conserva su representación LF. Se corrigió solo esa entrada al SHA del blob versionado, reteniendo ambos lados y el hash original; las fuentes ejecutadas exactas siguen en base64 sin cambios. El [registro de auditoría](evidence/m2-c3-p3/p3-goal-20261004/postcommit-manifest-audit.json) conserva exit 1, stderr y causa. Corrección en commit local adicional, sin reescribir el anterior, sin QA ni push. Temporales propios retirados.

## 23. Corrección del gate runtime: ensayo local posterior al rollback — 2026-10-04

### 23.1 Estado y criterios

**OBJETIVO NO CUMPLIDO.** Base local `75955bb44eb2ba86da7d2c5f30ec947373e5099e`, rama `ai/antigravity-qa`, árbol inicialmente limpio. Este ensayo añade evidencia local tras la parada de §22; no autoriza ni ejecuta una continuación en QA. Las autorizaciones anteriores para ensayo, cotejo de contadores y fijación de imagen del worker ya están incorporadas en §22 y no sustituyen una decisión posterior al fallo.

| Criterio P3 | Estado vigente | Evidencia / límite |
| --- | --- | --- |
| 1. Ensayo sobre respaldo REAL P2 | CUMPLIDO previamente | §22.1; el nuevo ensayo usa exclusivamente una base local sintética, sin sustituir el ensayo REAL. |
| 2. Catálogo QA antes del primer congelamiento | CUMPLIDO previamente | §22.1; no se releyó QA en este checkpoint. |
| 3. Artefacto ARM64 | CUMPLIDO previamente | §22.1; se utiliza la misma imagen, sin reconstrucción. |
| 4. Respaldo nuevo congelado y restore | CUMPLIDO previamente | §22.4; este checkpoint no lee ni crea un respaldo real. |
| 5. Gate con login runtime REAL QA | PARCIAL / NO CUMPLIDO | Gate local restringido positivo y negativos verificados; login QA pendiente. |
| 6. Activación del API nuevo | NO CUMPLIDO | Ninguna operación QA posterior al rollback en esta sección. |
| 7. Validación completa del API nuevo en QA | PARCIAL / NO CUMPLIDO | El ensayo local no demuestra servicios, HTTP ni catálogo actuales de QA. |
| 8. Documentación y commit local sanitizado | DOCUMENTADO / EN REVISIÓN | Esta sección y evidencia nueva; commit local por rutas explícitas, sin push. |

### 23.2 Trabajo realizado, comandos y resultados

[Reporte completo](evidence/m2-c3-p3/local-gate-correction-20261004/result.json), [bytes exactos de fuentes](evidence/m2-c3-p3/local-gate-correction-20261004/executed-sources.json) y [manifiesto](evidence/m2-c3-p3/local-gate-correction-20261004/manifest.json). El supervisor `.tmp/p3-local-gate/local-gate-drill.py` terminó **exit 0**, a las **2026-10-04T23:50:08.533265+00:00**. Los argv exactos sanitizados, exit y stderr de sus 28 comandos están en el reporte.

PostgreSQL 17.11 local en tmpfs, `docker --context desktop-linux run --network none`, sin puertos publicados; herramientas ARM64 comparten solo su namespace mediante `--network container:<PG propio>`. Roles Migrator y runtime sintéticos, contraseñas aleatorias privadas, TCP loopback con SCRAM. No SSH, DPAPI, frase real, filas del respaldo ni conexión QA/producción. El rol postgres de inicialización es exclusivamente local/sintético, sin adquirir otra credencial real.

Desde la imagen ya construida: `node node_modules/prisma/build/index.js migrate deploy` aplicó las 28 migraciones exclusivamente a esa base nueva, **exit 0**, ledger 28 activas / 0 fallidas. Matriz y suplemento, por separado con `psql -X -qAt -v ON_ERROR_STOP=1`, **exit 0**; se retiró solo `\ir` de la matriz para evitar doble ejecución. Gate SQL existente mediante login runtime restringido: **exit 0**.

El mismo `runtime-gate.cjs` SHA **957676d3dbb296623899c56e300c21c5be917bd974de6459183c8351796737c0**, sin alterar las verificaciones, ejecutó SQL real mediante Prisma en transacción READ ONLY:

| Caso local | Resultado exigido y observado |
| --- | --- |
| Login SCRAM runtime restringido | exit 0; `runtimeGate37=true`, `tables=37`, `readonly=on`, rol `kortek_runtime`. |
| UPDATE extra sobre CustomerOperation, solo base sintética | exit 1, rechazo del gate. |
| Retirada del permiso extra, solo base sintética | exit 0 y mismo resultado positivo. |
| Contraseña runtime incorrecta, solo base sintética | exit 1, rechazo de autenticación. |

La versión LF exacta de `qa-rollback.sh`, SHA **7c437ba44e45f81a086b12c66fbf64d21a3b71102a2ee7912041207cf8fa48ce**, se ejecutó por Bash en contenedor local `--network none`. Un comando sustituto sintético verificó ruta del gestor y argumento `rollback`; marcador `SYNTHETIC_MANAGER_RECEIVED_ROLLBACK`, **exit 0**. Esto prueba el despacho del script LF, **no el vencimiento systemd ni un rollback real QA**. Los cuatro contenedores persistentes propios se retiraron con exit 0; el de despacho usó `--rm`. Los temporales propios se retiran al finalizar el checkpoint, después de archivar fuentes/reportes.

### 23.3 Impedimentos y evidencia

[Registro](evidence/m2-c3-p3/local-gate-correction-20261004/impediments.json): primera readiness de PG exit 2, seguida de exit 0; ruta de test supuesta inexistente resuelta mediante discovery del archivo real, con límite explícito de captura del stderr original; lectura de reporte a consola cp1252 falló con UnicodeEncodeError exit 1, resuelta usando `ensure_ascii=True`, exit 0, sin alterar el reporte. Los dos exit 1 del gate son negativos esperados que satisfacen sus aserciones, no resultados positivos ni fallos ocultos.

### 23.4 Datos clave

No cambian las identidades de §22.4: imagen local ARM64 **bd294744d685f962f634ca24f8b66c124f1b37d8fc91a8128e42854a73e2ca14**, APP_RELEASE **bc1d559e42928ca0deb60319b33cf98b3cd69291**; respaldo original congelado `C:\KortekBackups\qa-m2-c3\qa-m2-c3-p3-frozen-20261004T232627Z-efe04b28cc60.dump.gpg`, SHA **76866b817efecb0bf2a2025fe89197ad4aaa8ec4938166af3e65abe8f64dc430**. Ledger QA 28 y servicios anteriores son el último estado verificado en §22, no una revalidación actual. No hubo nueva ventana de congelamiento. El ledger local 28 de este ensayo no es evidencia adicional del ledger QA.

### 23.5 Lo no verificado y riesgos pendientes

Pendientes el gate runtime REAL QA, activación y validación posterior completa. No se ejerció deadline systemd; el gestor del watchdog fue sintético. No se afirma probar de extremo a extremo LoadCredential, wrapper Podman ni unidades QA con este ensayo Node/local. Las fuentes ejecutables deben materializarse desde base64 exacto y verificarse como LF; Git puede convertir los textos para revisión. La prueba corrige la incertidumbre local del gate, sin revocar la parada obligatoria después de migrar.

### 23.6 Acción del propietario

Sigue pendiente la autorización de continuación de §22.6 ya solicitada. Si se autoriza, revalidar en READ ONLY el estado 28, preparar nuevo corte/respaldo verificado y obtener nueva confirmación local de congelamiento antes del gate real y eventual activación. **No repetir migración, grants ni registro del ledger por inferencia.** Producción, Clerk y web fuera de alcance; sin push ni cierre/aprobación de P3.

## 24. Continuación P3 autorizada desde 75955bb: parada obligatoria en R1 — 2026-10-05 UTC

### 24.1 Estado y tabla de criterios

**OBJETIVO NO CUMPLIDO / CONTINUACIÓN DETENIDA EN R1.** El propietario autorizó R1–R6 desde `75955bb44eb2ba86da7d2c5f30ec947373e5099e`, sin repetir migración, restaurar QA ni tomar respaldo nuevo. Esta autorización posterior sustituye la espera de §22.6/§23.6, pero exige detenerse ante cualquier CR o diferencia de R1. Al empezar: rama `ai/antigravity-qa`; HEAD exacto anterior; cambios propios sin commit de §23/evidencia local, aislables. Sin push.

| Requisito | Resultado | Evidencia / límite |
| --- | --- | --- |
| R1. SQL LF idéntico, catálogo y checksum repo | **NO CUMPLIDO** | Migración/suplemento enviados LF y hashes iguales; matriz enviada con **30 CR**, blob Git distinto; checksum ledger **af7d783…**, repo LF **6e1d854…**. Sin CR en prosrc/constraints/defaults actuales. Comparación directa con definiciones post-upgrade históricas del ensayo no verificable por falta de captura. |
| R2. Gate real dentro del API actual | **NO EJECUTADO** | Parada R1. Guard LF corregido y probado localmente; no se extraen credenciales runtime ni se ejecuta gate QA. |
| R3. Catálogo adicional | **CUMPLIDO por lectura READ ONLY** | Ningún privilegio externo/PUBLIC sobre CustomerOperation ni EXECUTE nuevo; ACL 36 anteriores idénticas, ambas funciones invoker/search_path fijado, ambos triggers presentes y enabled O. |
| R4. Activar API nuevo y validar | **NO EJECUTADO** | R1 impide activar. API y worker anteriores active/running, NRestarts 0, mismos PID al iniciar/finalizar lecturas. Ninguna ventana de parada. |

R5 no se requiere: no se detuvo ni activó ningún servicio; no se restauró QA. R6: nueva sección, evidencia sanitizada y commit local documental por rutas explícitas; no aprueba P3. [Resultado completo](evidence/m2-c3-p3/r1-continuation-stop-20261005/result.json), [evaluación](evidence/m2-c3-p3/r1-continuation-stop-20261005/assessment.json), [manifiesto](evidence/m2-c3-p3/r1-continuation-stop-20261005/manifest.json).

### 24.2 Trabajo, comandos y resultados

`git rev-parse HEAD`, `git status --short`; comparación `git show HEAD:<SQL>` con archivos de trabajo y hashes/ejecutor históricos de §22. SHA migración LF working/Git/enviado **6e1d854f285f4a4a691377d6654d0a4df80f29ca5c3ad375b352ae96894d6dee**, 3392 bytes, CR 0. Suplemento working/Git/enviado **293e73419caaa9d5b9e0f95b8027414ae20b903ffdf4c80fcd437ea1dbd71cdc**, CR 0.

Matriz: Git LF **8916ca378c88b4ed1d1d8c357f0e1a117a17df792d229c11a6a412f9a24037ea**; working histórico **52453d4c0939ea9449f0cb4d318a62a781e788f69f0248a48cee88b5598ea614**; enviado tras retirar solo la línea `\ir` **1bd1a0a02bccadba93a581838fe44bbeaa34f26f9041b380b80c2896cf20ee76**, **30 CR**. La reconstrucción coincide exactamente con el hash de transmisión registrado y con el ejecutor de stdin binario. Los contenidos working/Git coinciden al normalizar CRLF, pero **eso no satisface el requisito literal de bytes LF enviados**. No se amplía la excepción ni se vuelve a ejecutar el SQL.

Supervisor local `catalog-supervisor.ps1` → Python `catalog.py`, DPAPI Migrator privada en memoria/BSTR/stdin, sin frase. Cliente PostgreSQL 17.11 local con CA existente verificada; `docker --context desktop-linux exec -i … psql -X -qAt -v ON_ERROR_STOP=1`. Conexión QA TLS **verify-full**, `PGOPTIONS default_transaction_read_only=on`; **BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY**. SELECT de pg_catalog y ledger técnico únicamente, sin filas de negocio. Payload UTF-8 enviado por stdin **binario**, CRLF normalizados a LF, bare CR rechazado antes de envío, SHA **f21cdd13a993a98a5e7c958b235003505c7b5698297a5e664ab15416275dc133**, 7319 bytes, CR 0; guard positivo/negativo probado localmente antes de ejecución. Lectura final **exit 0 significa lectura completa, no R1 aprobado**.

Se conservaron pg_get_functiondef/prosrc de customer_access_relink y customer_booking_revision, pg_get_constraintdef de ambos CHECK nuevos, los tres índices CustomerOperation, triggers y ACL. Scan de CR en todo prosrc public, constraints public y defaults public: **tres listas vacías**. R3 se evaluó offline sobre ese mismo catálogo, sin consulta/operación adicional tras el hallazgo.

Estado QA: **28 activas / 0 fallidas / 37 tablas**. Fila 28 finished=true, rolledBack=false, applied_steps_count=0, checksum **af7d78386c24d3ba31fe4c58de783b6d5c6e1fba018674e7989c1bdc560c592c**, **distinto del SHA LF del repositorio**. Se registró anteriormente con **Prisma migrate resolve --applied 20261003120000_customer_stage_one** tras tres SQL exitosos, usando la migración CRLF de la imagen ARM64; ese checksum coincide con el artefacto. Nunca se editó el ledger a mano, y no se modifica ahora.

`systemctl show` y `podman inspect` exclusivamente de las dos unidades QA, antes/después: imágenes anteriores/PID iguales, servicios activos, cero reinicios. Release y destino se comprobaron por booleanos dentro del API existente, sin leer env files ni imprimir/extractar secretos. No se ejecutó HTTP nuevo en esta continuación; el 200 de §22 es histórico. Cliente local propio retirado **exit 0**; temporales propios archivados y retirados al concluir.

### 24.3 Impedimentos, causa y solución

[Intento local fallido](evidence/m2-c3-p3/r1-continuation-stop-20261005/attempt-1.json), [registro de impedimentos](evidence/m2-c3-p3/r1-continuation-stop-20261005/impediments.json), [fuentes ejecutadas](evidence/m2-c3-p3/r1-continuation-stop-20261005/executed-sources.json). Regex generado para retirar include produjo `bad escape \i`, exit 1, antes del acceso DB; se sustituyó por comparación binaria exacta del prefijo de línea. La prueba local posterior rechazó correctamente CR en la matriz (AssertionError, stderr completo conservado); se registró como hallazgo R1, sin modificar el archivo. El segundo ejecutor completó lecturas exit 0 y marcó expresamente R1=false/mandatoryStop=true.

Fallo material 1: matriz histórica enviada con CR; no es evidencia de CR persistente en prosrc, y el scan actual es negativo, pero incumple R1(a). Fallo material 2: checksum ledger de la imagen CRLF difiere del archivo LF, incumple R1(c). **Solución aplicada: parada obligatoria, sin reparación ni activación.** La documentación anterior reconoce checksum del artefacto; esa explicación no convierte la diferencia en aceptación del propietario.

### 24.4 Datos clave

Lectura QA final: timestamp en `result.json.finishedUtc`, PostgreSQL origen **17.6**, cliente **17.11**. API actual imagen **701329f1cfe7b45f5b6d0cfe62daeae0edf6e1c00518158cb8555a815c224031**, release **791569b110f9fd59cb10e6d248546bdae3996e14**, PID **1084550**. Worker **7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1**, PID **1084553**. Imagen nueva no activa. No hay nueva ventana de 30 min ni nuevo respaldo; el respaldo congelado/SHA de §22.4 permanece como referencia histórica, sin descifrar ni restaurar en esta continuación.

### 24.5 Lo no verificado

No pasó R1 ni se ejecutó el gate runtime REAL R2. No hay activación/HTTP nuevo/customer 401 ni cotejo de conteos actuales con el respaldo en esta continuación. El ensayo general histórico conservó owners, conteos y resultados, pero **no sus pg_get_functiondef/constraintdef/index completos posteriores al upgrade**: no puede afirmarse un cotejo directo retrospectivo con esa captura inexistente. Se conserva íntegro el catálogo actual; no se sustituye por una comparación inferida. El camino de escritura con triggers en QA real **no se probó** y queda para fixtures de **P5**; no se crearon reservas ni escrituras de negocio.

### 24.6 Decisión del propietario

Revisar las dos diferencias de bytes/checksum y el límite de captura del ensayo. La autorización de continuación exigía parar ante cualquiera de ellas, por lo que **R2–R4 requieren una decisión explícita nueva** sobre estos hallazgos. No alterar ledger, reejecutar migración/matriz ni restaurar QA por inferencia. Una eventual aceptación de diferencias debe ser expresa y conservar sus hashes/causas; esta entrega no la presume. Producción, Clerk y web intactos dentro del alcance de esta tarea, sin consultas de producción ni push.

## 25. P3 completado tras decisión del propietario sobre R1 — 2026-10-04 America/Santo_Domingo

### 25.1 Estado, autorización y criterios

**OBJETIVO P3 CUMPLIDO / QA EN REVISIÓN**, bajo las dos desviaciones benignas de bytes aceptadas explícitamente por el propietario. No significa aprobación de C3 completo ni autorización de Clerk/web/producción. Base **adb36cb02330e9f00c84ecce7d0e2d119af9731a**, rama `ai/antigravity-qa`, `git status --short` inicial vacío, **SIN PUSH**. La decisión posterior acepta checksum CRLF y matriz con 30 CR, mantiene el ledger intacto y exige un nuevo cotejo REAL P2 como referencia antes de R2–R4. El prompt de frase adicional fue autorizado expresamente solo para descifrar P2 localmente, sin congelamiento QA.

| Criterio original P3 | Evidencia de cumplimiento |
| --- | --- |
| 1. Ensayo general REAL P2, migración/grants, runtime y API nuevo/old | §22: ensayo completo con reserva sintética PENDING y compatibilidad 791569b. Nuevo [clon REAL de referencia](evidence/m2-c3-p3/owner-decision-complete-20261004/r1-real-p2-reference.json), owners reproducidos, SQL Git LF, siete categorías iguales. |
| 2. Catálogo READ ONLY antes del primer congelamiento | §22 y catálogo original; [relectura actual](evidence/m2-c3-p3/owner-decision-complete-20261004/r1-live-readonly.json): Migrator, RR/RO, TLS verify-full, sin filas de negocio. |
| 3. Imagen ARM64 del SHA construido, APP_RELEASE exacto, rollback retenido | Imagen de §22, release `bc1d559…`; identidad exacta y dos imágenes disponibles en [activación](evidence/m2-c3-p3/owner-decision-complete-20261004/r4-activation.json) y [auditoría final](evidence/m2-c3-p3/owner-decision-complete-20261004/final-audit.json). |
| 4. Respaldo congelado AES256 y restore anterior al SQL | §22, respaldo original conservado; hash dump/censo revalidado en auditoría final. Esta continuación no toma otro respaldo ni congela DB. |
| 5. Tres SQL reales separados y gate runtime real | §22 conserva SQL separados exit 0. Checksum/matriz aceptados; [R2 completo](evidence/m2-c3-p3/owner-decision-complete-20261004/r2-runtime-gate.json) desde API actual con login runtime, 37 tablas, READ ONLY, exit 0; gate posterior también pasa. Sin nuevos grants ni registro del ledger. |
| 6. Activación API nuevo, worker imagen actual | API nuevo active/running, PID 1092730, NRestarts 0. Worker imagen/PID 1084553 intactos, NRestarts 0; mismas unidades QA, sin detenerlo/reiniciarlo. |
| 7. Validación posterior, datos y catálogo | 28 activas/0 fallidas, 37 tablas; 200 booking-data; seis customer 401; negocio íntegro; ACL anteriores iguales, externos/PUBLIC bloqueados, triggers/search_path correctos. R3, activación y auditoría final. |
| 8. Nueva sección, evidencia sanitizada, commit local explícito | Esta sección y [manifiesto](evidence/m2-c3-p3/owner-decision-complete-20261004/manifest.json); commit documental por rutas explícitas, SHA entregado en el relevo. |

| Continuación | Resultado |
| --- | --- |
| R1 | **CERRADO**: equivalencia LF/CRLF recalculada, precedente P0 confirmado, clon REAL restaurado y definiciones iguales. Ninguna excepción E1–E5 necesaria en el cotejo de referencia. |
| R2 | **CUMPLIDO**: verificación completa dentro del API anterior, conexión ya configurada; sin extraer credenciales ni leer env files. |
| R3 | **CUMPLIDO**: catálogo externo/PUBLIC, ACL 36, invoker/search_path y triggers comprobados antes y después. |
| R4 | **CUMPLIDO**: nueva imagen/release y HTTP/gate/datos/servicios verificados en ventana inferior a 30 min. |
| R5 | Rollback automático preparado; **no fue necesario ejecutarlo** en esta continuación. La imagen antigua sigue disponible. |
| R6 | Documentación/evidencia y commit local; tarea eol=lf posterior en un commit separado. |

### 25.2 Trabajo realizado, comandos y resultados

**Equivalencia y precedente.** `git show HEAD:apps/api/prisma/migrations/20261003120000_customer_stage_one/migration.sql`: 3392 bytes, CR 0, SHA **6e1d854f285f4a4a691377d6654d0a4df80f29ca5c3ad375b352ae96894d6dee**. Variante que reemplaza cada LF por CRLF: **60 CR**, SHA **af7d78386c24d3ba31fe4c58de783b6d5c6e1fba018674e7989c1bdc560c592c**, idéntico a la fila 28 revalidada READ ONLY. Normalizar esa variante devuelve exactamente los bytes versionados. [Cálculo](evidence/m2-c3-p3/owner-decision-complete-20261004/checksum-equivalence.json). La fila permanece intacta; su registro anterior por Prisma resolve soportado se explica en §§22/24.

P0 §11.2, línea 868, y p0-read-only.json documentan **27/27** filas activas iguales al archivo original o variante LF. [Recomprobación independiente](evidence/m2-c3-p3/owner-decision-complete-20261004/p0-checksum-precedent.json): 26 coinciden con LF; add_invoice_model coincide con el original working CRLF, hash 3c1f4f53…, mientras Git LF tiene 39f52217…. No es una nueva excepción inventada: está comprendido en «original o variante LF» de P0. Las 31 filas anteriores, incluidas cuatro revertidas y multiplicidad, siguen iguales a P0, dejando aparte solo la entrada 28.

**CR de SQL realmente transmitido.** Los hashes originales de §22 y su fuente ejecutada binaria permiten reconstruir exactamente los bytes enviados; no se afirma capturar paquetes de red.

| SQL / fase | CR transmitidos | Resultado |
| --- | ---: | --- |
| Migración 28 real original | 0 | SHA enviado igual a Git LF 6e1d854f…; exit 0. |
| Matriz real original, retirando solo include | **30** | SHA 1bd1a0a0…; aceptada como benigna por el propietario. Su efecto pasa R2/R3. |
| Suplemento real original | 0 | SHA 293e7341…; exit 0. |
| Gate original fallido de §22 | **No se transmitió SQL** | Bash falló antes del login; no atribuir CR al SQL no enviado. |
| Gate real R2 y posterior R4 | 0 | DO exacto del archivo versionado, sin omitir verificaciones, en transacción Prisma READ ONLY. |
| Tres SQL del nuevo clon de referencia | 0 en cada uno | Archivo Git LF; include retirado solo de matriz para pasos separados; todos exit 0. |

**Referencia REAL.** Dos entradas protegidas de frase P2, exclusivamente locales, liberadas al terminar. Dump cifrado REAL P2 SHA **17f6e1191b15f828b444ee8db593e781dd707ed3c4b80f940a02ff16d0605063**, censo cifrado cotejado, restore PG17.11/TOC btree_gist public íntegro contra su snapshot, owners reproducidos. `psql -X -qAt -v ON_ERROR_STOP=1`, rol Migrator sintético, tres pasos LF separados solo en el clon. Comparación con lectura QA Migrator RR/RO/TLS verify-full: pg_get_functiondef con config, todos los constraints CHECK/UNIQUE/FK de CustomerOperation y constraints de Client/Booking, pg_get_indexdef de sus índices, ambos pg_get_triggerdef, columnas/tipos/defaults y tipos/secuencias public. **Funciones, constraints, índices, triggers, columnas/defaults, tipos y secuencias iguales**, sin retirar texto/config ni ampliar E1–E5. Secuencias public vacías en ambos lados. Todos los contenedores del clon retirados.

**Gate real.** El DO del `verify-runtime-role.sql` versionado es byte por byte el mismo del adaptador previamente probado con positivos/negativos locales. [Identidad](evidence/m2-c3-p3/owner-decision-complete-20261004/gate-source-identity.json): SQL completo SHA **2f0b87a2147ce1f0fe4f25c7fd4b4c08b6ec97c061814fe1b5fad61c37f5456d**, DO SHA **eebe1b9730e85c618ce8b73f038a343f0085581cf4335df7ac11bc135b19bcfc**. `XDG_RUNTIME_DIR=/run/user/1000 podman exec -i --workdir /srv/kortek/apps/api kortek-api-staging node -`, cliente Prisma de la propia imagen y conexión existente. Prisma aporta BEGIN/COMMIT READ ONLY, y ejecuta íntegro el DO; guard rechaza cualquier CR antes de enviarlo. **Exit 0**, `{runtimeGate37:true,role:kortek_runtime,tables:37,readonly:on}`. No se repararon grants ni se extrajo URL/contraseña. Se repitió sobre el API nuevo dentro de la validación posterior, también exit 0.

**Activación y controles.** Transferencia exacta LF de gestor/watchdog propios, SHA cotejados; comprobación de despacho Bash en contenedor local sin red con gestor sintético, exit 0. No se ensayó un contenedor en QA. Gestor protegido creó copia temporal 0600 del runtime-env existente, conservada solo para rollback. Detuvo **solo** kortek-api-staging; timer de 30 min armado y observado activo. Sustituyó exclusivamente `APP_RELEASE=bc1d559e42928ca0deb60319b33cf98b3cd69291` y `KORTEK_API_IMAGE=sha256:807bcb442a69e74198b224d1e60c9ae8d678043a6c7d070e90ace80935d8a261`. El hash de todas las otras líneas fue idéntico antes/después. No cambió flags, credenciales, wrappers ni unidades; worker ya fijado a 7eafd5c9… continuó con el mismo proceso.

Tras start y readiness loopback 3001: API/worker active/running, cero reinicios. GET público **200**. Las seis rutas customer (cuatro GET, PATCH perfil y POST reservas) sin Authorization devolvieron **401**; los dos métodos de escritura recibieron solo `{}` y no causaron escrituras ni recibos. API anterior tenía GET customer/businesses **404** antes del cambio. Ledger 28 activas, 0 fallidas, 37 tablas, CustomerOperation **0**; Client/Booking y todas las demás tablas de negocio conservan conteos y huellas de columnas previas del corte. No se crean fixtures/reservas QA.

**Diferencias explícitas posteriores.** Todas las tablas preexistentes tienen el mismo conteo, excepto ledger **31→32**, por la entrada 28. SecurityRateBucket sigue en **2 filas**, pero su huella cambia por incremento/limpieza legítimos del limitador público tras HTTP. Ninguna diferencia de negocio ni otra diferencia de huellas; Client se coteja por sus columnas preexistentes, no confundiendo defaults aditivos con mutaciones anteriores. Ambos lados completos en R3/R4. La autorización anterior para contadores técnicos se conserva; no se desactiva el limitador ni se oculta la diferencia.

### 25.3 Impedimentos, causa, solución y evidencia

[Registro](evidence/m2-c3-p3/owner-decision-complete-20261004/impediments.json), fuentes exactas/base64 y SHA en [executed-sources.json](evidence/m2-c3-p3/owner-decision-complete-20261004/executed-sources.json), argv/exit/stderr redactado hasta 8 KB en cada reporte.

- Ruta umbrella de evidencia supuesta inexistente: discovery encontró m2-c3-p1/p0-read-only.json; sin acción QA por ese error.
- Primer audit local de P0 confundió «original» con blob Git y aceptó solo LF: AssertionError, 26/27. Se conservaron ambos lados; al incluir el original working CRLF, como documenta P0, las 27 coincidieron. No se cambió ledger ni ningún SQL.
- Frase P2 ya no estaba en memoria: el propietario autorizó el prompt local exclusivamente de descifrado, sin congelamiento. Restore/cotejo nuevo exit 0; frase, BSTR y agente GPG liberados, no guardados en argv, entorno, archivos ni logs.
- Cancelar el service propio del watchdog devolvió **exit 5** porque nunca se disparó y ya estaba unloaded. El timer sí se detuvo **exit 0**; lectura independiente confirmó **not-found/inactive/dead**, también en auditoría final. Se registra el exit 5; no se interpreta como un fallo de activación ni se deja un rollback futuro armado.

### 25.4 Datos clave y estado final

- Imagen API activa/config Podman: **807bcb442a69e74198b224d1e60c9ae8d678043a6c7d070e90ace80935d8a261**; manifest Docker local **bd294744d685f962f634ca24f8b66c124f1b37d8fc91a8128e42854a73e2ca14**. Release **bc1d559e42928ca0deb60319b33cf98b3cd69291**, el SHA con el que se construyó, no el SHA documental posterior. API PID **1092730**, NRestarts **0**.
- Worker imagen **7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1**, PID **1084553**, NRestarts **0**; sin parada/reinicio en esta continuación.
- API anterior **701329f1cfe7b45f5b6d0cfe62daeae0edf6e1c00518158cb8555a815c224031**, release 791569b, disponible para rollback sobre schema 28. Sin restore QA ni inversa de schema.
- Inicio comando stop: **2026-10-05T00:33:12.804294Z** (**2026-10-04 20:33:12 America/Santo_Domingo**); stop confirmado **00:33:13.081921Z**; validación completa fin **00:33:33.511048Z**. Ventana desde inicio del comando **20.707 s**, conservadora respecto del límite de 30 min. No es una medición exacta de indisponibilidad HTTP. Timer programado para **01:03:12 UTC**, cancelado antes de vencer.
- DB **28 terminadas activas + 4 revertidas = 32 filas**, 0 fallidas; **37 tablas**, origen PG **17.6**, restore/cliente **17.11**.
- Respaldo congelado original de §22: `C:\KortekBackups\qa-m2-c3\qa-m2-c3-p3-frozen-20261004T232627Z-efe04b28cc60.dump.gpg`, **47380 bytes**, SHA **76866b817efecb0bf2a2025fe89197ad4aaa8ec4938166af3e65abe8f64dc430**. Censo cifrado SHA **815921b4ad04ffd6fea16748bf6e6d09b82df9d39cee0aec28c60b3bce3395ce**, **28939 bytes**. Ambos hashes revalidados, sin descifrar ni sobrescribir en esta continuación.
- Copia protegida temporal de rollback y fuentes remotas propias retiradas. Imágenes nueva/anterior retenidas. Contenedores/agent GPG locales propios retirados; fuentes/reportes sanitizados archivados. Temporales locales propios se retiran al concluir ambos commits.

### 25.5 Lo no verificado y límites

El camino autenticado de escritura con triggers **sobre QA real sigue sin probarse**; queda para fixtures de **P5**, con su autorización específica. Las pruebas de escritura anteriores son locales/aisladas y los 401 QA solo prueban protección sin sesión. No hubo alta/edición de negocio real, fixture nuevo ni envío de correo inducido. El worker existente siguió su funcionamiento habitual.

El vencimiento real del watchdog y un nuevo rollback operativo **no se ejercieron**, porque R4 pasó en ~21 s; se verificaron LF/dispatch local, armado real y cancelación final. El rollback preferido real de §22 sigue como antecedente. No se repitió un backup congelado ni se presenta el cotejo actual como otro snapshot congelado. SecurityRateBucket puede cambiar después del reporte por tráfico legítimo, sin invalidar el corte de la evidencia.

Sin Clerk Development/Production, web QA, publicación Git ni producción. Producción no se leyó ni se certifica su estado actual. No hay aprobación del propietario del conjunto C3 ni apertura de etapas posteriores por el commit.

### 25.6 Acción del propietario

Conservar por separado las frases de P2 y del respaldo congelado; revisar el checkpoint técnico P3 cumplido y decidir por separado las etapas restantes de C3 y los fixtures P5. Ninguna acción adicional de Clerk/web/producción está autorizada. El ajuste preventivo eol=lf pedido se entrega después en **otro commit local**, con comprobación de que no cambia ningún SHA SQL versionado.

## 26. Prevención CRLF en SQL — tarea separada tras P3, 2026-10-04

P3 quedó documentado primero en el commit local **3507117d52f2abf4e8ac138e7ad0d63a9b80f861**. Esta tarea posterior y separada añade únicamente dos reglas a `.gitattributes`, preservando las cuatro reglas existentes:

```gitattributes
apps/api/prisma/migrations/**/migration.sql text eol=lf
apps/api/ops/*.sql text eol=lf
```

Se inventariaron **44 archivos SQL versionados** por esas dos rutas mediante `git ls-files`. Todos los blobs previos tenían CR 0. Antes de normalizar la copia de trabajo se comprobó, archivo por archivo, que reemplazar CRLF por LF producía exactamente el blob original; no había cambios SQL ajenos. Se normalizaron únicamente los finales de línea de esas copias. Luego se ejecutó `git add -- .gitattributes` y `git add --renormalize -- 'apps/api/prisma/migrations/**/migration.sql' 'apps/api/ops/*.sql'`, exclusivamente sobre las rutas solicitadas, exit 0.

**Diff SQL staged y working vacío; todos los SHA-256 y object IDs SQL idénticos antes/después.** `git check-attr text eol` confirma text=set/eol=lf para cada archivo; `git ls-files --eol` confirma i/lf, w/lf y las reglas aplicadas. No se incluye ningún archivo SQL en el commit; su contenido versionado permanece idéntico. [Verificación completa por archivo](evidence/m2-c3-p3/sql-eol-lf-20261004/verification.json) y [manifiesto](evidence/m2-c3-p3/sql-eol-lf-20261004/manifest.json).

El primer staging documental P3 falló con `index.lock: Permission denied` bajo el sandbox, exit 1; el reintento de escritura Git por rutas explícitas con la escalación revisada terminó exit 0. No fue rechazo de aprobación automática ni impedimento de QA. Se conserva este registro sin editar las secciones previas.

Validación final del alcance: `.gitattributes`, esta sección nueva y dos JSON sanitizados; `git diff --check`, diff staged y hashes verificados. Commit local separado, **SIN PUSH**. No se ejecutó SQL ni se tocó QA, ledger, imágenes, flags, dependencias o código en esta tarea. Siguen los límites de §25: escritura con triggers sobre QA real pendiente de P5; Clerk/web/producción cerrados. Los temporales locales propios se retiran después de ambos commits y se comprueba Git limpio en el relevo.
