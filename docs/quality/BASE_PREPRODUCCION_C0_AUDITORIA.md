# Base previa a producción — C0 auditoría y decisiones propuestas

Fecha: 2026-09-24. Estado: **C0 DOCUMENTAL ENTREGADO / D1–D13 PENDIENTES DE ELECCIÓN DEL PROPIETARIO**. Rama `ai/antigravity-qa`; HEAD inspeccionado `6c3caa0fad0bd62b84e14a23c8946020f98a62df`. Este informe no aprueba implementación, cambio de plan, migración, activación del correo ni despliegue.

## 1. Encargo, frontera y evidencia

El operador de plataforma necesita recuperar el servicio y detectar fallos sin acceder rutinariamente a filas de negocio. OWNER, ADMIN, RECEPTIONIST, BARBER, CUSTOMER y visitantes deben conservar permisos, privacidad y flujos aprobados. El resultado de este C0 es una selección pendiente de arquitectura, operación y gates medibles antes del primer tenant externo. La base real local `barberflow` no se inspeccionó ni modificó en este C0; no se consultaron paneles ni cuentas reales de Clerk, Supabase o Resend. Toda observación de ACL efectiva o restore proviene de evidencia previa fechada, no de un ensayo nuevo.

Se contrastaron [`PROJECT_MASTER.md` §7](../../PROJECT_MASTER.md), [roadmap ítem 3](AUDITORIA_INTEGRAL_2026_09_24.md), [correctivos](CORRECTIVOS_2026_09_24.md), [gates](DELIVERY_GATES.md), [seguridad](SECURITY_STANDARD.md), [provisión de roles](../../apps/api/ops/provision-database-roles.sql), [verificación runtime](../../apps/api/ops/verify-runtime-role.sql), [configuración API](../../apps/api/src/app.module.ts), [arranque/CORS](../../apps/api/src/main.ts), [limitador por cuenta](../../apps/api/src/auth/attempt-limiter.ts), [worker](../../apps/api/src/notifications/email-worker.ts), [CLI del worker](../../apps/api/src/notifications/email-worker.cli.ts), [contrato de Notificaciones](../features/NOTIFICACIONES_C1_CONTRATO.md) y [activación C3](../features/NOTIFICACIONES_C3_ACTIVACION.md). No se ejecutaron tests ni comandos SQL: no serían evidencia nueva de operación productiva.

El ítem 2 del roadmap ya tiene [provisión y prueba aislada](CORRECTIVOS_2026_09_24.md): 25 migraciones desde cero, conexión como `kortek_runtime` y smoke Chrome final 21 aprobados/1 omitido. El correctivo está **IMPLEMENTADO / EN REVISIÓN** en su documento; este C0 no lo declara aprobado. H4 ya sustituyó el stack por un texto fijo, con prueba de privacidad. Medios C3 y Notificaciones C3 están cerrados/aprobados para sus alcances; el canal EMAIL continúa pausado y no hay producción. Esas evidencias no prueban los controles de este informe.

## 2. Hallazgos que condicionan las decisiones

| Área | Estado comprobado y límite |
| --- | --- |
| Roles y ACL | `provision-database-roles.sql` crea runtime/migrador sin atributos globales elevados y transfiere propiedad de **esta base** y objetos `public` al migrador. No crea administrador bootstrap nuevo ni audita ownership en otras bases, schemas, objetos compartidos, extensiones o ACL/default ACL del rol `POSTGRES_USER`. Concede SELECT/INSERT/UPDATE/DELETE sobre todas las tablas, luego revoca casos de Medios y ledger. El ensayo aislado comprobó que `Invoice` aún permite DELETE; no demuestra la ACL actual de `barberflow`. |
| Límites | `ThrottlerModule` usa almacenamiento por proceso; guards solo donde se aplicaron. `AttemptLimiter` usa `CACHE_MANAGER` en memoria y su incremento lectura/escritura tampoco es atómico. La protección de abuso de correo sí usa `EmailAbuseBucket` PostgreSQL compartido; no sustituye los límites HTTP. |
| Identidad/planes | La web usa Clerk; JWT/password legacy sigue en API para rollback. MFA productivo no está acreditado por configuración ni por plan. `PROJECT_MASTER.md` exige Clerk Pro y Supabase Pro antes del primer tenant externo/de pago. No se ha verificado una instancia productiva ni sus claves. |
| Entorno | `main.ts` cae a orígenes localhost si falta `CORS_ALLOWED_ORIGINS`; `HOST` cae a `127.0.0.1`. Clerk usa allowlist separada `CLERK_AUTHORIZED_PARTIES`. La web usa localhost por defecto para `NEXT_PUBLIC_API_URL`, también en el rewrite de medios. Ningún fallback local sirve como evidencia de configuración externa. |
| Continuidad | Medios C3 ensayó `pg_dump -Fc`/restore local y cotejó 18 tablas/343 filas **antes** de aplicar cuatro migraciones adicionales. Notificaciones C1 ensayó restore aislado con intenciones despachadas y reconciliación controlada. No hay prueba de restauración desde backup automático de Supabase, objetivo RPO/RTO acordado ni rollback de cutover real. |
| Correo | `EmailOutbox` es cola durable PostgreSQL con `SKIP LOCKED`, lease de 30 s, hasta cinco intentos, plazo de 24 h, `UNCERTAIN`, recibos de webhook, pausa compartida y purga privada a 30 días. El CLI hace `tick()` cada segundo y emite códigos seguros ante fallos; C3 lo ejecutó manualmente y luego pausó el canal. No consta supervisor productivo, tablero, SLO ni alertas operativas. |

## 3. Decisiones pendientes para el propietario

Cada letra es alternativa **no seleccionada**. La recomendación no equivale a autorización. D1–D13 pueden contestarse por número y letra; donde hay umbrales, el propietario debe fijar valores antes de C1.

### D1 — Administrador bootstrap fuera de la aplicación

| Opción | Diseño | Consecuencia |
| --- | --- | --- |
| **A. Cuenta de emergencia separada** | Crear por operación de plataforma, fuera de Nest/Prisma y sin `DATABASE_URL` de API, un rol administrador `LOGIN` con secreto individual en gestor, MFA del plano de control, acceso de red restringido, uso auditado y credencial de recuperación probada. Runtime y migrador conservan secretos distintos. En Supabase se usará el rol/plano administrativo permitido por el servicio, sin presumir `SUPERUSER`. | Recuperación explícita; exige custodia, rotación y ensayo de acceso de emergencia. |
| **B. Administrador del proveedor solamente** | No crear rol bootstrap propio; usar exclusivamente acceso administrativo de Supabase o del host PostgreSQL. | Menos credenciales, pero la recuperación depende de la disponibilidad y permisos del proveedor; el procedimiento local y cloud difiere. |

**Recomendación: A** para PostgreSQL autogestionado y **B** si Supabase impide o vuelve redundante un rol equivalente. C1 debe probar recuperación sin arrancar la aplicación, registrar quién puede activar esa vía y mantener la credencial fuera de contenedores, CI de aplicación y repositorio. Nunca usar `kortek_runtime`, `kortek_migrator` o la cuenta legacy como bootstrap permanente.

### D2 — Retiro del rol legacy `POSTGRES_USER`

| Opción | Criterio | Consecuencia |
| --- | --- | --- |
| **A. Bloquear primero, eliminar después** | Inventariar en **todo el clúster** databases, schemas, tablas/particiones, secuencias, views, types, funciones, extensiones, tablespaces, memberships, grants y default ACL. Transferir cada ownership aprobado al dueño correspondiente; revisar dependencias externas/otras bases. Revocar accesos innecesarios, terminar sesiones autorizadamente, `NOLOGIN` y retirar atributos elevados; observar una ventana acordada. `DROP ROLE` solo tras inventario y prueba repetidos sin dependencias. | Reduce riesgo de borrar algo útil; conserva una fase reversible. |
| **B. Eliminar en una ventana** | Transferencia e inventario, luego `DROP ROLE` directamente. | Menos tiempo con legado, mayor riesgo de dependencia omitida y de pérdida de vía de recuperación. |

**Recomendación: A.** El script actual deliberadamente no usa `REASSIGN OWNED` porque [PostgreSQL](https://www.postgresql.org/docs/current/sql-reassign-owned.html) advierte que también alcanza objetos compartidos y no limpia default ACL. [`DROP OWNED`](https://www.postgresql.org/docs/current/role-removal.html) puede eliminar objetos: no usarlo a ciegas. Verificación de salida: cero ownership/dependencias pendientes del rol en el clúster, ninguna conexión/configuración lo usa, API y migraciones operan con sus cuentas, restore y acceso de emergencia funcionan. Si el nombre legacy es la cuenta de inicialización del contenedor, comprobar la mecánica real del volumen antes de bloquearla; cambiar `POSTGRES_USER` en `.env` no rota ni renombra el rol existente.

### D3 — Grants runtime de tablas existentes

| Opción | Política | Consecuencia |
| --- | --- | --- |
| **A. Matriz por tabla y operación** | Revocar `DELETE` de `Invoice` y otras tablas financieras/auditoría sin hard-delete aprobado; conceder únicamente operaciones observadas por rutas/worker y pruebas. Separar permisos técnicos de purga cuando sea necesario. Verificador SQL falla si reaparece `DELETE` prohibido. | Mayor revisión, privilegios compatibles con dominio; cambios futuros deben declarar grants. |
| **B. Mantener DML histórico con excepciones** | Revocar solo `DELETE` de `Invoice` ahora. | Menor esfuerzo inmediato, deja exposición amplia en otras tablas. |

**Recomendación: A.** El código de producción inspeccionado no llama `invoice.delete`/`deleteMany`; Invoice y Payment son inmutables por contrato. Eso sustenta **proponer** la revocación, no aplicarla sin E2E y verificación del destino. C1 debe distinguir borrados funcionales existentes (`Membership`, horarios) y purga técnica (`EmailAbuseBucket`) de tablas inmutables. Probar arranque, facturación, cobro, worker, recuperación y una conexión real `kortek_runtime`; documentar `has_table_privilege`/ACL y fallos esperados de DELETE. La ACL no reemplaza autorización tenant de backend.

### D4 — ACL predeterminada de tablas futuras

| Opción | Política | Consecuencia |
| --- | --- | --- |
| **A. Sin DML por defecto** | Revocar la regla `ALTER DEFAULT PRIVILEGES FOR ROLE kortek_migrator ... GRANT SELECT, INSERT, UPDATE, DELETE`; cada migración concede su matriz explícita y el gate falla por tabla sin declaración/verificación. Separar política de secuencias y tipos según uso real. | Fail closed; despliegues requieren coordinación de schema, grants y binario. |
| **B. Lectura por defecto** | Solo SELECT para tablas nuevas; escrituras explícitas. | Menos fricción, pero datos privados nuevos se vuelven legibles por runtime aunque no exista contrato. |
| **C. DML amplio actual** | Mantener y revocar después de cada migración. | Riesgo de ventana de privilegio y olvido, ya demostrado en Medios. |

**Recomendación: A.** Los default privileges son del **rol que crea el objeto**, no se heredan automáticamente de sus memberships; una revocación a nivel de schema puede no anular un grant global previo. Inventariar `pg_default_acl` por rol/schema y verificar un objeto futuro de prueba en base aislada como migrador. [PostgreSQL: ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html).

### D5 — Rate limiting distribuido

| Opción | Componente y semántica | Trade-off |
| --- | --- | --- |
| **A. Redis administrado** | Almacén compartido de contadores atómicos y TTL para throttler HTTP y bloqueo por cuenta; claves minimizadas/HMAC, límites por endpoint/actor/IP confiable, observación de 429, disponibilidad y política de fallo. | Buen rendimiento y TTL nativo; añade servicio, coste, secretos y operación. |
| **B. PostgreSQL transaccional** | Tabla/buckets con `INSERT ... ON CONFLICT` y lock/actualización atómica, limpieza y partición por ventana; puede reutilizar patrón de abuso de correo **sin** mezclar sus presupuestos. | Menos servicios; tráfico abusivo compite con la base de negocio y exige capacidad/retención cuidadas. |
| **C. Gateway/WAF administrado + aplicación** | Límite global en el edge para IP/ruta, con contador compartido separado para identidad/cuenta. | Absorbe tráfico temprano; no cubre por sí solo cuentas detrás de IP compartida ni llamadas internas. |

**Recomendación: A + C** para exposición horizontal; **B** es opción viable de escala inicial con prueba de carga y aislamiento. Definir antes de implementar qué rutas cubre cada capa (onboarding, claims, invitaciones, CMS/medios, reserva pública, JWT legacy), clave, ventana, umbral, proxy/IP confiable y respuesta 429. Ensayar dos réplicas concurrentes, rotación de IP, IPv6/NAT, falla del almacén y reinicio; escoger fail closed para mutaciones sensibles o degradación acotada explícita por ruta. No inferir protección global del `ThrottlerModule` registrado: solo actúan los guards aplicados.

### D6 — Clerk MFA productivo

| Opción | Requisito | Consecuencia |
| --- | --- | --- |
| **A. Pro + MFA obligatorio para acceso interno** | Instancia **Production** con dominio y claves live, plan con MFA, estrategias elegidas (preferir TOTP y códigos de recuperación), ajuste de obligatoriedad compatible con SDK, enrolamiento y recuperación ensayados para OWNER/ADMIN/RECEPTIONIST/BARBER; revisar efecto en CUSTOMER cuando se active B2C. | Gate verificable para cuentas privilegiadas; exige política de recuperación y QA de sesión. |
| **B. Pro + MFA optativo** | Habilitar método pero permitir que operadores lo omitan. | Cumple disponibilidad técnica de MFA, deja cuentas privilegiadas sin segundo factor. |

**Recomendación: A**, sujeto a la granularidad real de Clerk: el ajuste documentado de **Require MFA** es de instancia, no una garantía de obligatoriedad solo por rol local. Si se requiere únicamente para roles internos con CUSTOMER exento, C1 debe diseñar y probar enforcement propio seguro o separar instancias sin confiar en metadata cliente. Hobby no incluye MFA en la [tabla de planes de Clerk](https://clerk.com/pricing); las instancias Development pueden mostrar funciones pagas que requieren Pro en Production [según Clerk](https://clerk.com/docs/guides/development/managing-environments). La [tarea de configuración MFA](https://clerk.com/docs/guides/configure/session-tasks) puede dejar sesión `Pending` hasta completar enrolamiento: probar que API no admite esa sesión. No se afirma que activar Pro por sí solo configure MFA.

### D7 — Supabase productivo y objetivo de recuperación

| Opción | Garantía | Consecuencia |
| --- | --- | --- |
| **A. Pro con backup diario + exportación independiente** | Organización Pro, verificar primer backup automático visible y restore real; conservar copia lógica cifrada fuera del proyecto bajo retención definida. Acordar RPO/RTO compatibles con hasta un día de pérdida entre backups diarios. | Menor coste; para datos de reservas/finanzas puede ser insuficiente. |
| **B. Pro + PITR/computación requerida + exportación independiente** | Restauración a punto temporal, retención y compute del add-on confirmados en cotización; mismo ensayo de restore. | Menor pérdida potencial; coste y procedimiento más complejos. |

**Recomendación: B** si el propietario exige RPO inferior a 24 h; de lo contrario A con aceptación expresa del RPO/RTO. Supabase documenta [backups diarios Pro con 7 días de acceso, PITR como add-on y necesidad de al menos Small compute](https://supabase.com/docs/guides/platform/backups). La [facturación es por organización](https://supabase.com/docs/guides/platform/billing-on-supabase): Pro evita la pausa por inactividad y cambia la cuota de base de 500 MB Free a 8 GB incluidos por proyecto, con excedentes cobrables. [La pausa Free](https://supabase.com/docs/guides/platform/free-project-pausing) puede ocurrir tras baja actividad. Confirmar límites y precio en el panel al contratar; ni plan ni backup recuperan objetos externos Cloudinary o entregas Resend.

### D8 — Configuración por entorno, CORS y secretos

| Opción | Política | Consecuencia |
| --- | --- | --- |
| **A. Manifiesto por entorno y arranque fail closed** | Inventario versionado **sin valores secretos**, dominios y origen exacto para dev/staging/prod; gestor de secretos con permisos por proceso, rotación y checklist de redirecciones/webhooks. Una variable productiva ausente o `localhost` bloquea el despliegue. | Evita fallback accidental; requiere validación automatizada y operación. |
| **B. Configuración manual de despliegue** | Checklist humano sin validación de arranque. | Más rápida al inicio, propensa a desalinear API/web/worker. |

**Recomendación: A.** Inventario mínimo a fijar y comprobar:

| Superficie | Valores y prueba antes de exposición |
| --- | --- |
| API/red | `HOST`, `PORT`, TLS/ingress, proxies confiables, URL pública; `CORS_ALLOWED_ORIGINS` exactos HTTPS, sin comodín/localhost, preflight y credentials desde el dominio real. |
| Web/Clerk | `NEXT_PUBLIC_API_URL` (incluye rewrite `/media-proxy`), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` web, claves API `CLERK_SECRET_KEY`/`CLERK_PUBLISHABLE_KEY`, `CLERK_AUTHORIZED_PARTIES` independiente de CORS, `CLERK_JWT_AUDIENCE` cuando corresponda, `CLERK_INVITATION_REDIRECT_URL`, dominio/redirects de instancia Production. Claves live emparejadas y prueba de login/invitación/revocación. |
| PostgreSQL | `DATABASE_URL` runtime para API/worker y credencial distinta del migrador solo en job de migración; CA/TLS, host/pooler/mode, red e IP permitidas, privilegios y rotación. `POSTGRES_PASSWORD` local no es secreto de API. |
| Legacy y flujos | `JWT_SECRET` mientras persistan rutas legacy; `PUBLIC_BOOKING_CLOSED` y cierre en ingress para binarios anteriores; `WHATSAPP_BASE_URL` legacy conservada sin confiar en ella para destino público. |
| Medios/correo | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` solo servidor; cuota y moderación verificadas. `NOTIFICATIONS_EMAIL_ENABLED`, `NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED`, `NOTIFICATIONS_EMAIL_FROM`, `NOTIFICATIONS_EMAIL_REPLY_TO`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `NOTIFICATIONS_ABUSE_SECRET` y webhook HTTPS firmado. C3 dejó EMAIL apagado; credenciales presentes no lo activan. |

No introducir valores reales en el informe, logs, CI general ni ejemplos `.env`. Revisar que los `NEXT_PUBLIC_*` son públicos en el bundle y no admiten secretos. `CORS_ALLOWED_ORIGINS` ausente hoy cae a localhost; el gate futuro debe rechazarlo explícitamente en producción.

### D9 — Observabilidad mínima sin acceso directo a filas

| Opción | Diseño | Consecuencia |
| --- | --- | --- |
| **A. Métricas/logs estructurados y alertas externas** | Plataforma recibe salud API/web/worker, disponibilidad y latencia DB/Clerk/Redis/Cloudinary/Resend, tasa 4xx/5xx/429, errores de migración, capacidad y conexiones, backups/edad/restore, cola por estado y antigüedad, leases vencidos, reintentos, purga y webhook. Dashboards agregados por entorno/tenant ID opaco; paging por caída, backlog o pérdida de backup. | Operable sin SQL rutinario; requiere colector, retención, responsables y simulacros. |
| **B. Logs de aplicación y paneles de proveedores** | Revisiones manuales y alertas solo del hosting/proveedores. | Menor coste, poca detección temprana y correlación difícil. |

**Recomendación: A.** Umbrales iniciales propuestos para que el propietario los fije: disponibilidad y p95 API, errores 5xx/429, cero ciclos de worker durante N minutos con canal activo, edad máxima PENDING/RETRY, UNCERTAIN/FAILED nuevos, webhook sin recibo, backup más viejo que N horas, tamaño/conexiones cerca de cuota, cuota Cloudinary y fallos de purga. Cada alerta debe tener dueño, canal, horario, runbook y prueba de disparo/recuperación. Logs con request/correlation ID, versión, entorno, ruta normalizada, clase/código seguro y duración; excluir cuerpos, email, teléfono, tokens, URL firmadas, notas, payload y errores crudos. AuditLog no es monitoreo. La prueba de privacidad de H4 debe conservarse como regresión.

### D10 — Respaldo y restore real

| Opción | Ensayo | Consecuencia |
| --- | --- | --- |
| **A. Restore periódico a proyecto/base aislada** | Backup automático de Supabase **y** copia lógica independiente; restaurar en destino vacío, migraciones/ledger, constraints/extensiones, roles/grants/secretos reconfigurados, conteos/huellas de snapshot, flujos mínimos como runtime y RTO medido. Ensayo inicial antes de producción y calendario recurrente. | Demuestra recuperabilidad; coste de destino aislado y manejo de datos privados. |
| **B. Solo verificar que existe backup/listado** | Archivo y estado de proveedor comprobados. | No demuestra que arranque ni que preserve ACL/integridad. |

**Recomendación: A.** Registrar fecha, backup, origen/destino, versión, checksum, comandos exit `0`, duración, RPO/RTO medidos y resultado sin publicar filas. Usar snapshot consistente; la huella de una fuente activa tomada después no equivale a la del dump. Tratar la copia como dato real cifrado y restringido, no fixture QA. Backups Supabase pueden [omitir contraseñas de roles personalizados; Storage externo no se restaura con la base](https://supabase.com/docs/guides/platform/backups). Verificar Cloudinary y Resend por reconciliación de referencias/efectos, nunca suponiendo que `pg_restore` revierte envíos.

### D11 — Cutover Free → plan productivo y punto de no retorno

| Opción | Secuencia | Consecuencia |
| --- | --- | --- |
| **A. Proyecto destino nuevo en organización Pro** | Preparar proyecto/plan, red, extensiones, roles, ACL, secretos y restore ensayado; congelar escrituras en origen, detener worker/webhook o dejarlos en pausa, backup final, migrar, cotejar, cambiar conexiones/ingress, smoke, abrir escrituras y monitorear. | Aislamiento claro y rollback por origen congelado; ventana de mantenimiento y doble coste. |
| **B. Elevar a Pro el mismo proyecto Free** | Upgrade de organización, verificar cuotas, backup y ajustes sin mover datos; ejecutar gate de roles/restore/operación antes de exponerlo. | Menos traslado; no crea copia independiente ni demuestra cutover de datos. |

**Recomendación: A** para la migración desde `barberflow` local hacia Supabase si aún no hay proyecto con datos; **B** si ya existe un Free con datos canónicos y los controles se prueban allí. No se verificó cuál escenario existe en la cuenta. La [migración PostgreSQL de Supabase](https://supabase.com/docs/guides/platform/migrating-to-supabase/postgres) advierte que roles/grants no se trasladan automáticamente y que su entorno administrado exige adaptar ownership/ACL; no ejecutar sin ensayo del script de roles. La [subida de plan de organización es inmediata](https://supabase.com/docs/guides/platform/manage-your-subscription), pero **no es por sí sola un cutover de datos**.

Punto de no retorno operativo: **la primera escritura externa aceptada en el nuevo origen canónico** (reserva, factura, opt-in, etc.) o el primer despacho de efecto externo después de abrirlo. Desde entonces, volver al origen congelado sin reconciliar esas escrituras perdería datos o duplicaría efectos. Antes de ese punto puede revertirse tráfico/configuración al origen intacto tras smoke; después se necesita replay/forward recovery o restore a punto elegido y conciliación aprobada. Definir ventana, responsable y criterio de abortar antes de iniciar.

### D12 — Rollback ensayado

| Opción | Prueba | Consecuencia |
| --- | --- | --- |
| **A. Ensayo integral de fallo y regreso** | En entorno aislado con datos controlados, simular fallo antes de abrir escrituras, revertir binario/configuración/tráfico, comprobar no pérdida; repetir fallo después de escrituras y demostrar reconciliación o forward recovery, no simple cambio de URL. Incluir reservas, Invoice/Payment, media, EMAIL pausado/leases/UNCERTAIN/webhook y migraciones aditivas. | Revela el verdadero límite de reversibilidad. |
| **B. Plan escrito y smoke de despliegue** | Documentar comandos y hacer prueba superficial. | No prueba recuperación de datos/efectos externos. |

**Recomendación: A.** Mantener migraciones y outbox al volver a binario anterior; no borrar tablas ni invertir migraciones destructivamente. La estrategia de [Notificaciones C1 §7](../features/NOTIFICACIONES_C1_CONTRATO.md) exige cerrar canal y reconciliar antes de reactivarlo, pues un backup puede revivir trabajo ya enviado. La bandera `PUBLIC_BOOKING_CLOSED` solo cierra rutas de reserva del binario actual; para un binario viejo se requiere cierre en ingress. Registrar tiempos reales, comandos/resultados, pruebas de identidad/tenant, reservas/facturación y criterio de abandonar rollback para recuperación hacia delante.

### D13 — Operación del worker de notificaciones

| Opción | Control | Consecuencia |
| --- | --- | --- |
| **A. Servicio supervisado y alertado** | Desplegar worker independiente con restart/backoff y apagado gradual; configurar réplica/capacidad desde la cola PostgreSQL existente, no crear una cola Redis paralela. Medir heartbeat, PENDING/RETRY vencidos, PROCESSING/leases expirados, UNCERTAIN, FAILED, OMITTED/ABUSE_LIMIT, ACCEPTED sin DELIVERED según ventana, webhook 401/503/reintentos, purga y canal `paused`. Alertas a operador con runbook de pausa/reconciliación/reanudación. | Hace operable el diseño C1 sin cambiar semántica del outbox; necesita guardias, dashboards y límites de carga. |
| **B. Ejecución programada `--once`** | Scheduler invoca un ciclo con frecuencia y alertas de exit code; controlar superposición y capacidad. | Menos infraestructura permanente, peor latencia y riesgo de backlog si un ciclo procesa una intención. |

**Recomendación: A** para correo activo. `SKIP LOCKED` y lease permiten concurrencia, pero C1/C3 no prueban un supervisor ni alertas productivas. Antes de despausar: dominio/From/Reply-To y webhook HTTPS firmados, configuración de secreto y URL, prueba de `401` sin firma y de recibo firmado durable, prueba de caída/reinicio/lease, proveedor 429/5xx, resultado incierto, retención 30 días y recuperación desde backup. Fijar umbrales de backlog, demora máxima y quién puede reanudar; ninguna ruta tenant debe controlar `EmailChannelControl`. C3 validó cinco entregas temporales, no este gate.

## 4. Secuencia y salida exigible de C1 futuro

1. El propietario selecciona D1–D13 y fija RPO/RTO, umbrales de alertas, ventana de observación del rol legacy y alcance de MFA. Se aprueba por separado cualquier coste/contratación o operación sobre una base real.
2. C1 prepara threat model breve, matriz de roles/ACL y secretos, runbooks y scripts revisados. Ensaya cambios SQL, límites entre réplicas, configuración productiva y supervisor en PostgreSQL/servicios **aislados**, con fallos inyectados.
3. Se ejecutan restore y rollback completos en destino aislado; se documentan tiempos, conteos/huellas, drift, privilegios y efectos externos. El ensayo previo local de Medios/Notificaciones es antecedente, no sustituto.
4. Antes de exponer un tenant: Clerk Production con MFA efectivamente exigido, Supabase Pro con backup verificado y restore probado, grants exactos, legacy controlado, límites distribuidos, CORS/secretos de dominio real, observabilidad y alertas probadas. El correo permanece pausado hasta su gate operativo propio del ítem 6; Medios requiere también su ítem 5.
5. Cutover requiere autorización expresa del destino, mantenimiento, responsable y punto de aborto; después, QA funcional/seguridad y aprobación explícita del propietario. Este C0 no adelanta ninguno de esos gates.

## 5. Fuentes externas verificadas para decisiones temporales

- [Clerk: planes y MFA](https://clerk.com/pricing), [Development frente a Production](https://clerk.com/docs/guides/development/managing-environments), [tarea Require MFA](https://clerk.com/docs/guides/configure/session-tasks).
- [Supabase: facturación/cuotas por organización](https://supabase.com/docs/guides/platform/billing-on-supabase), [pausa Free](https://supabase.com/docs/guides/platform/free-project-pausing), [backups/PITR/restore](https://supabase.com/docs/guides/platform/backups), [migración PostgreSQL](https://supabase.com/docs/guides/platform/migrating-to-supabase/postgres), [cambio de plan](https://supabase.com/docs/guides/platform/manage-your-subscription).
- [PostgreSQL: default privileges](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html), [REASSIGN OWNED](https://www.postgresql.org/docs/current/sql-reassign-owned.html) y [retiro de roles](https://www.postgresql.org/docs/current/role-removal.html).

Las capacidades, límites y costes externos pueden cambiar. Revalidarlos en documentación y panel del proveedor al ejecutar C1/cutover; este informe no compra ni activa planes.
