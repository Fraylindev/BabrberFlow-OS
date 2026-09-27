# Horario y zona del negocio — evidencia C1

> Actualización posterior: el propietario aprobó la lógica del backend C1 y autorizó integrarla en su proyecto local. Integración completada, [detalle](HORARIO_ZONA_C1_INTEGRACION_LOCAL.md), sin frontend ni aplicación de migraciones a bases. El informe siguiente conserva la evidencia y el estado histórico de la entrega aislada anterior a esa aprobación.

## Evidencia histórica del candidato aislado


2026-09-27. **IMPLEMENTADO AISLADO / EN REVISIÓN — NO APROBADO**. Pasos 2 y 4 terminados para revisión en el gate 5. D1–D15 A autorizadas por el propietario. Esta entrega no aprueba frontend, QA visual ni implantación.

## Destino, inventario y aislamiento

Baseline original: f357c9bfbda44aab3d5a086907f72070871fdb22, rama ai/antigravity-qa. Se conservó íntegramente el trabajo C0 preexistente. El worktree gestionado falló por alcance de referencia del chat sin proyecto; se preparó una copia aislada mediante archivo Git y se superpusieron únicamente los cuatro documentos C0 existentes. La copia tiene su propio repositorio local, baseline f6d4a69 y ninguna publicación remota. Dependencias instaladas se reutilizaron; cliente Prisma y cachés se generaron dentro de la copia. No se instaló ningún paquete.

PostgreSQL 18 local dedicado: 127.0.0.1:55437, clúster en work/postgres-c1. Bases c1_schedule_test, c1_upgrade_test, c1_restore_test y c1_restore_final_test; datos ficticios, sin conexión productiva o habitual. Separación kortek_migrator/kortek_runtime, ambos sin privilegios administrativos; comandos HTTP de C1 e integración usan runtime real. El proveedor de identidad HTTP devuelve identidades controladas, pero guards, Membership, DTOs, servicios y PostgreSQL son reales. El proveedor de correo es ficticio. No se envió correo real.

Inventario productivo comunicado por lectura directa del propietario, 27-09-2026 16:02:54 UTC: un tenant, businessHours SQL NULL, America/Santo_Domingo, cero reservas futuras/en curso. D4-A: **SIN CONFIRMAR / SQL_NULL**, propuesta técnica legacy 09:00–19:00 repetida siete días, nunca confirmación tácita. C1 no vuelve a consultar ni modifica producción. D9 necesita un inventario de todas las dependencias al cambiar zona; el conteo comunicado no demuestra ausencia de historia.

## Resultados ejecutados

| Comprobación | Resultado real |
| --- | --- |
| API unitarias completas | 763 aprobadas, 37 omitidas por gates de integración; 60 suites aprobadas. Exit 0. Las integraciones C1/Booking omitidas aquí se ejecutaron aparte. |
| Integración nueva C1 | 26/26 en PostgreSQL real: cambios atómicos, protección en curso/lejana, revisión, notas, cierres, zonas, carreras, fallos y corrupción del gate SQL. Exit 0. |
| Regresión concurrencia Booking/A2 | 9/9 en PostgreSQL real, alta interna/pública, reprogramación, reactivación, archivado y disponibilidad. Exit 0. |
| HTTP C1 | 5/5 con runtime real y guards: roles, dos tenants, DTO cerrado, revisión, impacto, publicación y timestamps. Exit 0. |
| HTTP CMS/H5, facturación, Resumen y claims | 70/70. Exit 0. |
| Productor/worker de correo | 26/26, proveedor ficticio, deduplicación, contactos, plantillas selladas, reintento, eventos terminales y presupuesto. Exit 0. |
| Tipos, lint, build API | Los tres exit 0. Sin build o código frontend. |
| Prisma validate / migrate status | Exit 0; esquema válido, 27 migraciones aplicadas. |
| Prisma diff DB → schema | Exit 0, No difference detected; map explícito de FK coincide con migración. |
| Integridad suplementaria | Constraints/checks/exclusiones/FKs, tres triggers diferidos habilitados y cuerpo exacto de función, con runtime. Exit 0. |
| Matriz runtime | Grants explícitos de 36 tablas incluyendo _prisma_migrations; ninguna capacidad DDL, administrativa o DML por defecto. Exit 0. |
| Migración vacía y actualización 26 → 27 | Ambas ejecutadas con Prisma migrate deploy en bases desechables. Las 30 tablas de aplicación anteriores no cambiaron su huella al actualizar. |
| Backfill | Cinco casos SQL_NULL/JSON_NULL/VALID/INVALID/inválido con 24:00; JSON original intacto y ningún tenant confirmado/publicado. Dos repeticiones adicionales no cambian huellas. |
| Negativos SQL | Ocho rechazos: semana confirmada incompleta, día inválido, minutos inválidos, FK tenant/día, overlap, sexta franja, cierre parcial multifecha y cancelación inconsistente. |
| Restore/rollback | pg_dump -Fc y pg_restore en base nueva; coincidencia de las 35 tablas de aplicación por conteo y SHA-256. Incluye 280 Booking, 23 Invoice, 15 Payment, 4 promociones, 1 intención con payload sellado, 77 cierres y 156 revisiones. El binario compatible leyó 310 tenants confirmados sintéticos. Sin aplanar ni borrar agregado. |

Las 36 pruebas puras de política incluyen años 0001/0099/9999, siete días, cinco franjas, herencia individual, cierres superpuestos, anclaje público, minutos reales y cambios de reloj de Nueva York/Madrid/Lord Howe, medianoche de São Paulo y fecha omitida de Samoa. Las seis regiones admitidas se verifican contra Intl. Los nuevos consumidores de límites diarios cubren medianoche omitida y DST; un cambio de runtime/ICU/tzdata requiere repetir este gate antes de ofrecer sus regiones.

Carreras repetidas: cierre global frente a alta interna/pública, reprogramación, reactivación y A2; primera Booking frente a cambio de zona; dos editores con misma revisión. Un tenant bloqueado no impide al otro. Carga sintética final: ocho escrituras concurrentes en 452 ms, sin duplicados/inconsistencias. Es una observación local, no SLA ni dimensionamiento productivo.

## Fallos encontrados y corregidos

El restore conservó todos los registros. Su gate estructural detectó dos CHECK con paréntesis reagrupados por pg_restore: se admitieron exclusivamente las dos formas exactas observadas, con regresión que rechaza sustituir AND por OR. La base nueva conservaba TEMP para PUBLIC a nivel de base (un dump sin CREATE no incluye esa ACL); se retiró explícitamente y se otorgó solo CONNECT a migrador/runtime antes de verificar grants, exit 0. El runbook exige repetir UTC/ACL de base y los gates SQL después del restore.

Las primeras ejecuciones localizaron fixtures incompatibles con el nuevo agregado, orden Booking→Client en claims, falta del map de FK en Prisma y consumidores que exigían medianoche inequívoca. Se ajustaron fixtures y se corrigieron esas rutas; todas sus verificaciones posteriores pasaron. La regresión de correo inicialmente no despachó: el servidor desechable heredó la zona de Windows y su lease SQL quedaba cuatro horas atrás frente al instante JS. Se fijó UTC exclusivamente en las tres bases de ensayo y las 26 regresiones pasaron sin cambiar el contrato del worker. Los errores sintéticos de auditoría/proveedor son parte de pruebas de rollback, no incidentes reales.

## Contrato, alcance y siguientes gates

Contrato: [HORARIO_ZONA_C1_CONTRATO.md](HORARIO_ZONA_C1_CONTRATO.md). Backend aislado: agregado relacional, comandos privados, revisión durable, normalización, impacto completo y paginado solo para lectura, cierres con motivos privados, confirmación de zona restringida y coordinación Organization→Client→Booking→Professional. D6 protege PENDING/CONFIRMED con endTime > un reloj de evaluación. Guardar no cancela/reprograma ni modifica cobros o comunicaciones.

D14 backend incorpora cálculo coherente A2/H5, proyección CMS y límites diarios de consumidores. Su editor, agenda interna en hora del negocio, lectura visual CMS y QA de navegador distinto siguen pendientes en C2. D15 conserva un lector legacy por tenant hasta transición expresa, falla cerrado en confirmados corruptos y exige configuración para nueva apertura CMS. No se retiró el lector ni se activó producción.

Rollback permitido en esta prueba: ningún servidor aplicativo C1/worker quedó ejecutándose; restore íntegro a base nueva y uso de un binario compatible. Un binario anterior que ignora cierres no puede servir nuevas escrituras después de confirmar C1. Antes de rollback real se requiere mantenimiento aprobado, detener API/worker y restaurar el agregado completo; PUBLIC_BOOKING_CLOSED por sí solo no cierra escrituras internas. No se autoriza down migration destructiva.

**Detención en gate 5:** revisar/aprobar backend expresamente. Frontend/QA (paso 6) y cualquier implantación/apertura requieren autorización posterior propia. Este informe se entrega como implementado/en revisión; no aprobado ni desplegado. No hubo commit/push de C1 ni cambios en el checkout original.
