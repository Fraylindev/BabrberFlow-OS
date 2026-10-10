# Procedimiento acotado de reanudación EMAIL — P10c-B3

La autorización ampliada del propietario en B3 permite concretar este procedimiento antes de ejecutarlo. Resuelve la ausencia del runbook detectada en el diagnóstico; no se atribuye retrospectivamente a 8e1501e. Fuente ejecutable documental: [resume-email.sql](evidence/prod-p10cb3/resume-email.sql).

Rol ejecutor: `kortek_migrator`, verificado en una sesión READ ONLY y dentro de la transacción. Conexión productiva previamente validada, TLS verify-full, contraseña DPAPI solo en memoria/entorno del proceso; SQL por stdin. No emplear runtime ni una cuenta elevada diferente.

Precondiciones: hashes/servicios/QA iguales a cierre B2, flags false, pausa manual C1 anterior a Fase1, cola exactamente cinco OMITTED y ningún otro estado. La transacción bloquea solo EMAIL y vuelve a exigir código/fecha de pausa y conteos exactos. Fallo de guardia, timeout o error revierte automáticamente al cerrar la conexión; no continuar a flags true.

Una única invocación, `BEGIN READ WRITE`, hace un solo UPDATE de EmailChannelControl.EMAIL: paused=false, reason=NULL, updatedAt=hora de transacción. No toca outbox ni otras tablas. Si ya está reanudado y reasonNULL, no actualiza: idempotencia de estado y fecha. Un resultado de transporte incierto se resuelve mediante READ ONLY; nunca reejecutar automáticamente.

Auditoría: **no hay AuditLog automático ni trigger**, y no se inserta uno. El contrato de AuditService reserva organizationIdNULL para el conflicto de seguridad pre-tenant y no define un evento global de canal; no se inventa tenant/actor/acción. La evidencia documental guarda SQL exacto y hash, rol/session_user, transaction_id, horas UTC/local, registro antes/después y exit0; una lectura posterior confirma commit durable. Es registro operativo documental, no auditoría transaccional en AuditLog. Esta distinción debe mantenerse en la entrega.

Los OMITTED son terminales: el claim en email-worker.ts de 8e1501e solo reclama PENDING/RETRY/UNCERTAIN con closedAtNULL. Reanudar no los reencola. No crear mensajes, reservar ni llamar al proveedor.

Tras commit durable y relectura sin deriva, ejecutar únicamente Fase2 B2: respaldo nuevo runtime-env0600 en directorio root0700, cambiar solo los dos flags false→true; reiniciar API una vez y verificar antes de reiniciar worker una vez. Tres GET públicos por pasada, máximo6; observar15min con estados/recursos/logs sanitizados y cola READ ONLY. Fallo: flagsfalse y un reinicio de cada servicio; canal reanudado no se revierte. No repetir instalación de Fase1.
