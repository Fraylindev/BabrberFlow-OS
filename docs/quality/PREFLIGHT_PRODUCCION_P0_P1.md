# Preflight producción P0, respaldo P1 y ensayo P1b

Fecha: 2026-10-08, America/Santo_Domingo. **NO-GO / PAUSADO / INCOMPLETO. Parada en P0(a): login del migrador fallido en TLS.** Producción permanece cerrada por el alcance autorizado; no se cambiaron producción ni QA. El cierre efectivo de sus flags no se refrescó en esta ejecución.

## Alcance y base

Orden del propietario: ejecutar P0 → P1 → P1b; si una parte falla, detenerse en esa parte y reportar. Solo lecturas productivas, respaldo cifrado y escrituras en el clon aislado; un único commit documental y push a `origin/ai/reserva-invitado-ci`, sin force. Se aplica esa excepción expresa a la rama habitual de AGENTS.md. No se autorizaron cambios de proveedores, producción/QA, flags, builds, despliegues ni publicación a main/QA.

Base local y remota comprobada: `f043260c64e837242853518447d18d38098f9d3e`, rama `ai/reserva-invitado-ci`. Índice vacío. Único archivo ajeno sin versionar al entrar: `docs/Playbook Kortek Booking_ del 29 de septiembre al MVP.md`; preservado y excluido del commit. SHA-256: `3c3f2fe57e0888ccf3e814262bc9ab965f59d5ad60db74f0f2c5fefa71924090`.

Fuentes vigentes: [plan y criterios Go/No-Go](PLAN_PRODUCCION_RESERVA_INVITADA.md), [gates](DELIVERY_GATES.md), [seguridad](SECURITY_STANDARD.md), [Definition of Done](DEFINITION_OF_DONE.md), [estado maestro](../../PROJECT_MASTER.md) y [entrada documental](../README.md). Se leyeron las skills kortek-delivery/Supabase y el preflight SSH sanitizado existente; no se ejecutó SSH. La autorización actual prevalece sobre prohibiciones históricas del plan, pero no amplía los pasos posteriores al primer fallo.

## P0(a): evidencia actual de Supabase

Lecturas del conector, sin SQL ni cambios:

| Consulta | Resultado observado |
| --- | --- |
| `supabase_list_projects` y `supabase_get_project` | Proyecto productivo `ilaoolpcrlmqkftirjog`, Kortek Booking, organización `wjzvskpjlnsbwixejmua`, región `us-east-1`, `ACTIVE_HEALTHY` |
| Versión informada por gestión | `17.6.1.166`, engine `17`, canal `ga`; no sustituye `SELECT version()` del servidor |
| `supabase_list_organizations` y `supabase_get_organization` | Organización correspondiente, `plan=free`, `tier=tier_free` |
| Credencial local del migrador | Archivo DPAPI local presente; descifrado correcto en este contexto, valor no mostrado. No se buscó credencial remota ni en otro equipo |

La [política oficial de respaldos](https://supabase.com/docs/guides/platform/backups), consultada en esta ejecución, ofrece backups diarios recuperables en Pro/Team/Enterprise (retención 7/14/hasta 30 días); para Free recomienda exportación periódica y copias externas. PITR es un complemento de los planes de pago y requiere al menos Small compute. **Free vigente no acredita backup recuperable ni PITR para este proyecto.** No se enumeraron objetos, copias, fechas ni recuperación del proyecto en el dashboard/API de backups. Los objetos de Storage no quedan cubiertos por un respaldo de base de datos. La consulta del índice `changelog.md` por web falló por tipo de contenido; no se implementó una función de Supabase.

### Login READ ONLY: fallo bloqueante

Se preparó un arnés local ignorado `.tmp/prod-p0-login.ps1`, sin cambios en código versionado. Cliente existente: `C:\Program Files\PostgreSQL\18\bin\psql.exe`. **Es la ruta del cliente local, no evidencia de la versión de producción ni de un clon.**

Destino exacto: `aws-0-us-east-1.pooler.supabase.com:5432/postgres`; usuario de conexión `kortek_migrator.ilaoolpcrlmqkftirjog`. Puerto de **sesión 5432**, nunca pooler transaccional. TLS `sslmode=verify-full` con CA local existente `.tmp/base-preprod-c1/supabase-ca.crt`, timeout de conexión 15 s. Contraseña DPAPI descifrada en memoria y transmitida solo al entorno del proceso hijo; fuera de argv, salida y archivos nuevos. No se usó ninguna clave de cifrado P1.

El arnés fija `default_transaction_read_only=on`, `statement_timeout=10000`, `psql -X -w -A -t -v ON_ERROR_STOP=1`. SQL preparado por stdin:

```sql
BEGIN READ ONLY;
SELECT json_build_object(
  'current_user', current_user, 'session_user', session_user,
  'read_only', current_setting('transaction_read_only'),
  'database', current_database(),
  'server_version', current_setting('server_version'));
SELECT json_agg(r) FROM (
  SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb,
         rolcanlogin, rolreplication, rolbypassrls, rolconnlimit,
         rolvaliduntil, rolconfig
  FROM pg_roles
  WHERE rolname IN ('kortek_migrator', 'kortek_runtime')
  ORDER BY rolname
) r;
COMMIT;
```

Resultado real de `& .tmp/prod-p0-login.ps1`:

```text
P0_LOGIN FAILED category=tls_failed exit=2; raw stderr suppressed
```

El proceso interno psql terminó con **2**; la herramienta de ejecución informó **1** para la invocación fallida. La categoría procede del filtro de errores TLS del arnés, que agrupa problemas de certificado raíz/verificación/SSL. No se conservó stderr crudo y no se atribuye una causa específica no demostrada. **No hay resultado de conexión autenticada, current_user, sesión READ ONLY, atributos, versión SQL ni ledger.** No se rebajó TLS, no se probó otra contraseña, no se usó postgres/SET ROLE y no se reintentó la conexión después del fallo.

## Parada y pendientes de las tres partes

| Paso autorizado | Estado / evidencia faltante |
| --- | --- |
| P0(a), plan y política | Plan/tier actual comprobado y política pública consultada; inventario recuperable específico no comprobado |
| P0(a), login real migrador y atributos | **FALLÓ / NO-GO**, TLS; no evidencia SQL |
| P0(b), Vercel | No ejecutado tras la parada: rama productiva, asignación automática de dominios y nombres/presencia de variables pendientes |
| P0(c), OCI | Preflight existente inspeccionado, sin SSH ejecutado; variables, flags, servicios, monitoreo y alertas actuales pendientes |
| P0(d), Clerk | Prefijos de claves productivas no comprobados; no se llamó a la API de Clerk |
| P1(e), respaldo AES256 en flujo | No iniciado. Destino autorizado `C:\KortekBackups\prod-pre-promocion`; **ningún artefacto de esta tarea**, tamaño y SHA-256 no disponibles |
| P1(f), restore aislado | No se creó contenedor ni se consultó/pull de imagen PG17.6; roles/ACL/extensiones/btree_gist, tablas, conteos, constraints, índices, funciones, triggers y ledger no cotejados |
| P1(g), copia externa | Pendiente; no se identificó destino externo ni existe artefacto nuevo listo para copiar |
| P1b(h), Prisma/checksum | No iniciado; no se creó worktree S ni se ejecutó migrate status/deploy/resolve. Hash ledger `3c1f4f53…` frente a blob `39f52217…` es antecedente del plan, **no cotejo nuevo** |
| P1b(i), posterior a migración | No medidos 28 activas/checksums 27–28, funciones/owner/ACL/search_path, grants, matriz de 37 tablas, verify-integrity, duración DDL ni bloqueos |
| P1b(j), código previo / invariantes | Pendiente: no existe clon restaurado donde ensayar Client/Booking |

Las cifras esperadas 30 filas/26 activas antes y 28 activas después, así como los hashes históricos, siguen siendo criterios del plan y de la orden. No se convierten aquí en lecturas productivas ni resultados del ensayo. No hubo dumps nuevos, SQL/ledger editado, grants, restore, fixtures ni escrituras de negocio.

## Veredicto por criterio del plan

**NO-GO global para continuar P1/P1b o promover producción.** No es rechazo del candidato ni prueba de una contraseña inválida: falta el login seguro exigido. Los criterios fuera de P0/P1/P1b no se ejecutan por inferencia.

| Criterio de §8 del plan | Veredicto en esta tarea |
| --- | --- |
| Origen congelado | Base documental exacta y heads remotos comprobados; auditoría integral, merge-tree y ensayo de checksum no repetidos. No-Go para promoción |
| Integración/despliegues | No-Go: control Vercel no consultado; M/integración fuera del alcance |
| CI exacto | Pendiente: éxito histórico de S no reconsultado; M inexistente según plan, sin CI nuevo |
| Respaldo | No-Go: sin copia fresca, hash/tamaño, restore ni custodia externa demostrados |
| Migraciones | No-Go: sin ensayo real de checksum ni ledger/checksums postmigración |
| Roles/triggers | No-Go: login TLS fallido, atributos/funciones/ACL/gate no validados |
| PG productivo | Gestión confirma rama 17.6; No-Go: falta clon PG17.6 restaurado y validado |
| Configuración | No-Go: inventarios Vercel/OCI/Clerk y flags actuales pendientes; decisión MFA no renovada en esta orden |
| Pareja nueva | No ejecutada, fuera del alcance; no satisface promoción |
| Smoke cerrado | No ejecutado, fuera del alcance; no satisface promoción |
| Observación | No-Go: monitoreo/alertas/ventana de 15 minutos no revalidados |
| QA/canales | No ejecutados, fuera del alcance; aceptación histórica no sustituye nueva evidencia |
| Horarios reales | P9b no ejecutado ni autorizado aquí |
| Piloto y puerta | Cierre/aprobación no acreditados por esta tarea |
| Apertura | No autorizada; no se activó ningún flag |
| Recuperación | No-Go: falta restore/rollback aislado y disponibilidad de artefactos demostrada |

## Git, comandos y preservación

Antes de editar: `git branch --show-current`, `git rev-parse HEAD`, `git status --short` e índice revisados; base exacta y trabajo ajeno aislable. Lecturas de skills, fuentes vigentes, scripts existentes y presencia DPAPI no provocaron cambios remotos.

`git ls-remote origin refs/heads/main refs/heads/ai/antigravity-qa refs/heads/ai/reserva-invitado-ci` falló inicialmente dentro del sandbox (`getaddrinfo() thread failed to start`); la misma lectura con permiso de red terminó exit **0**. Esto fue una limitación local de lectura Git, anterior al fallo bloqueante P0. Una búsqueda recursiva local de arneses recorrió enlaces rotos de node_modules y se interrumpió; no constituye validación y se sustituyó por lecturas puntuales.

| Referencia | Antes de la publicación documental |
| --- | --- |
| main remoto | `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6` |
| ai/antigravity-qa remoto | `523d993cfa0c797f356c224d5cc026d6c9ad4c7b` |
| ai/reserva-invitado-ci local/remoto | `f043260c64e837242853518447d18d38098f9d3e` |
| main local (atrasado, sin mover) | `01113ef0be7d8abcd74e3e7297f7989b359c76c0` |
| ai/antigravity-qa local (atrasada, sin mover) | `36061fc3c978758642b5a79ed6cb0e5ff25c003f` |

Único commit autorizado: este informe y entradas de control en docs/README.md, PROJECT_MASTER.md y CHANGELOG.md. Sin modificación de contratos/BACKEND_CHANGES, código, SQL ni workflow. Validar `git diff --check`, diff completo, enlaces locales, ausencia de secretos, staging explícito y diff cached completo antes del commit/push. La respuesta de entrega registrará SHA final, igualdad local/remoto y comparación final de main/QA, evitando otro commit solo para incluir el SHA propio.

**Producción/QA no recibieron cambios de esta tarea.** La evidencia viva se limita a metadatos de gestión Supabase y al intento TLS fallido; no hay comparación operativa antes/después de OCI/Vercel/flags/DB. Por tanto no se afirma haber probado ausencia de modificaciones concurrentes de terceros ni cierre vivo actual. No se invocaron herramientas de mutación de proveedores. El push se limita a documentación en la rama autorizada; builds/despliegues no se solicitaron y cualquier automatismo externo no se verificó.

## Relevo preciso

Detención estable antes de P1. Siguiente paso: revisar localmente la CA/cadena/hostname que exige el pooler de sesión y preparar un login con TLS estricto válido, sin tocar credenciales ni configuración productiva y sin imprimir secretos. Reanudar desde P0(a) tras resolver esa condición y recibir continuación del propietario; exigir exit 0, `current_user=session_user=kortek_migrator`, READ ONLY activo y atributos reales. Después completar P0(b–d); solo si P0 pasa, generar P1 completo y restaurarlo, y únicamente entonces ensayar P1b con S `523d993cfa0c797f356c224d5cc026d6c9ad4c7b`. Conservar los intentos históricos y parar ante cualquier diferencia. Este checkpoint documental no aprueba producción ni cierra los gates pendientes.
