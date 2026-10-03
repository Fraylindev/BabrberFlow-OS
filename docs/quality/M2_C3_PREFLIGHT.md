# M2 C3 — Preflight de Cuenta de cliente, etapa 1

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
