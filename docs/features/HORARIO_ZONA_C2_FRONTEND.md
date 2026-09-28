# Horario y zona — D14/C2

2026-09-27. **C2 IMPLEMENTADO / EN REVISIÓN LOCAL**, sobre backend aprobado `b0357af`, rama `ai/antigravity-qa`. El propietario autorizó D14-A: editor y coherencia de agenda interna, CMS, A2/H5, reportes, correo y promociones. QA funcional y visual realizado exclusivamente en un entorno local controlado. **No se ha cruzado el gate de QA frontend en producción real.** No implica aprobación de C2 ni cierre del módulo.

El inventario común de Dental Ross y Prueba de oro, al **2026-09-27T19:33:52.343696Z**, encontró `businessHours` SQL NULL / SQL_NULL y `America/Santo_Domingo` en ambas; cero citas de cualquier estado/fecha, bloqueos A2 activos/cancelados, promociones selladas/publicadas/retiradas e intenciones de correo totales o pendientes. Las cinco tablas C1 estaban ausentes: cierres fechados **no aplicable**, no un cero consultado. Había 26 migraciones completadas y ninguna fila de `20260927170000_business_schedule`. La consulta fue REPEATABLE READ READ ONLY, comprobó modo de lectura y terminó en ROLLBACK. Prueba de oro es un alta realizada personalmente por el propietario. Evidencia local ignorada por Git: `.tmp/d9-inventory-20260927-ambos/{inventario.md,consulta.sql,resultado.json}`. El corte no congela dependencias futuras.

## Brief y aceptación

OWNER confirma región; OWNER/ADMIN editan siete días, hasta cinco franjas diarias, revisan impacto y mantienen cierres completos/parciales con historia. RECEPTIONIST/BARBER leen horario y cierres activos, sin motivos ni diagnósticos privados; CUSTOMER no accede. Configuración operativa es independiente del borrador/publicación CMS.

El flujo lee el estado vigente, permite editar, revisa impacto informativo y guarda con expectedRevision. Un conflicto conserva la edición y exige revisar la versión vigente; cambiar la edición invalida el preview. Guardar revalida en backend. Región se elige por nombre natural; no se muestran IANA, offsets ni detalles de conversión. Motivos opcionales son privados. Cada visita usa un contexto único por usuario/organización/rol, también A → B → A; respuestas tardías no modifican la visita siguiente.

Estados: carga, sin confirmar, semana cerrada, sin cierres, error/reintento, solicitud pendiente, éxito, acceso cambiado, revisión obsoleta y citas afectadas. Siete tarjetas accesibles en móvil/escritorio, controles etiquetados, foco visible, teclado y anuncios de errores/resultados. Impacto y cierres usan paginación real; la validación al guardar no se limita a la página.

Agenda crea/reprograma, filtra y presenta en hora del negocio aunque el navegador esté en otra zona; horas inexistentes/repetidas se rechazan sin desplazarlas. Filtros respetan límites reales de días irregulares. A2 comparte ese conversor. CMS consume operationalSchedule, no presenta businessHours como horario confirmado. H5 conserva su instante autoritativo; reportes usan límites C1; correo y promociones sellados no se reconstruyen al guardar horario.

## Límites de operación

Se puede migrar/confirmar Dental Ross y Prueba de oro únicamente si resulta necesario para pruebas del flujo autorizado, con evidencia del resultado. No se infiere una semana elegida del fallback legacy. La estrategia inicial usa un entorno aislado con datos controlados; no necesita modificar producción.

No están autorizados despliegue, nueva apertura de reserva pública ni activación de correo. **QA visual/frontend en producción real requiere aprobación expresa posterior y no se ejecuta en C2 por inferencia.** QA local/controlado conserva sus requisitos. El propietario autorizó después un commit local del checkpoint C2/QA, pero no el push ni el cierre del módulo.

## Evidencia y continuación

### Implementación

Configuración ahora contiene Horario y zona para los cuatro roles internos; Página pública permanece disponible para OWNER/ADMIN. Consume exclusivamente `/organizations/mine/schedule` y sus rutas C1 aprobadas. Confirma región, revisa y guarda semana, crea cierres completos de fechas inclusivas o parciales de un día, consulta historia y cancela cierres. Los motivos no se proyectan a BARBER/RECEPTIONIST. El listado de impacto resuelve nombres mediante el directorio autorizado; no muestra UUID, IANA, offsets o diagnósticos.

Cada visita y caché del editor/agenda se identifica por usuario, organización, rol e instancia. AbortSignal y guardas de vida descartan respuestas tardías. El montaje de consultas nuevas espera la limpieza de AuthProvider: el QA detectó y corrigió una carga permanente después de cambiar organización. Una escritura fallida o un recibo seguido de fallo de lectura bloquea otras acciones hasta reconciliar expresamente; conserva el borrador y requiere una nueva revisión. Confirmar región y crear/cancelar cierres tampoco descartan una edición independiente de semana.

Agenda comparte un conversor estricto con A2: interpreta fechas/hora en la zona del negocio y rechaza horas inexistentes o repetidas. Filtra por inicio real del día y límite exclusivo del siguiente, incluso días irregulares. La reprogramación no reconvierte un instante si su campo no cambió; A2 también conserva segundos/milisegundos existentes. El backend sigue revalidando: conservar el payload no concede editar un bloqueo activo ambiguo en un horario confirmado.

CMS lee `readOnly.operationalSchedule`, derivado del agregado vigente, y distingue el horario sin confirmar; no convierte el JSON legacy en una confirmación. H5 conserva el `startTime` autoritativo recibido. Facturación/Resumen ya consumen la zona y límites aprobados en C1. Correo y promociones conservan sus contratos, fechas, estados y payloads sellados: el editor no ejecuta mutaciones de esos contenidos ni los reconstruye al guardar horario.

### Entorno y cambios de datos

PostgreSQL 18 dedicado en `127.0.0.1:55447`, clúster `.tmp/schedule-c2/pgdata`. Bases independientes `schedule_c2_test` para navegador y `schedule_c2_regression_test` para integración; 27 migraciones aplicadas desde cero **solo allí**, incluida C1. El runner de integración no es superusuario ni hereda roles privilegiados. La API usa `kortek_runtime` y la matriz de grants versionada.

API compilada en localhost:3000; build Next en localhost:3001; Clerk Development con cuatro identidades de prueba. Dos organizaciones sintéticas, QA Horario Norte y QA Horario Sur, sin reutilizar datos productivos. OWNER confirmó mediante UI Norte (Santo Domingo, siete días 09–19) y Sur (Nueva York, siete días 00–24). Son horarios de fixture, no elecciones para Dental Ross o Prueba de oro. El QA creó reservas internas, cierres activos/cancelados, un bloqueo A2 y una factura de control. Ninguna base habitual/productiva recibió migraciones, confirmaciones o escrituras de C2. No se aplicó C1 a los dos tenants productivos porque no fue necesario para estas pruebas.

Correo desactivado, credenciales Resend excluidas, sin workers y reserva pública cerrada. No se publicaron páginas ni promociones. Credenciales, sesiones Clerk y temporales quedan únicamente en `.tmp/`, ignorada; no se incorporan a documentación versionada.

### Validación automatizada

Todos los resultados de esta tabla finalizaron con exit code **0**:

| Comando / alcance | Resultado |
| --- | --- |
| `pnpm --filter web exec tsc --noEmit` | Tipos correctos después del build final |
| `pnpm --filter web lint` | Sin errores |
| `pnpm --filter web test:unit` | 135 aprobadas |
| `pnpm --filter web test:components` | 65 aprobadas, 12 archivos |
| `pnpm --filter web build`, con configuración local de prueba validada | Build completo y generación de rutas correctos |
| `pnpm --filter api build` | Backend C1 compilado para QA local |
| Suite `business-schedule.integration.spec.ts`, flag explícito y URLs de la base de regresión aislada | 26 aprobadas |
| API `notification-policy`, `media-policy`, `dashboard-summary.service`, `invoices.service`, mediante `--runTestsByPath` | 110 aprobadas, cuatro suites |
| `pnpm --filter web test:browser`, build local y HTTP controlado | 21 aprobadas / una omisión prevista (caso móvil en proyecto desktop), exit 0 |

Las regresiones web cubren días de 23/25 y 23,5/24,5 horas, medianoche desplazada, día omitido, fechas estrictas, franjas/solapamientos, roles, preview exacto, revisión obsoleta, reconciliación, conservación de borradores y respuestas tardías A → B → A. Las integraciones C1 ejercen persistencia real, disponibilidad H5/A2, legado, cierres, concurrencia y congelación D9 con promociones selladas. Las suites de consumidores cubren sus límites temporales y políticas sin activar canales externos. El smoke público usa respuestas HTTP controladas; conserva H5/WhatsApp y retiro de contenido, sin abrir una página real ni acreditar producción. Las omisiones o ejecuciones preliminares fallidas no se suman a los aprobados. Advertencias del runner sobre NO_COLOR/FORCE_COLOR y MockTimers experimental no son errores de producto.

### QA real local

Chrome con sesiones Clerk reales de prueba, API C1 y PostgreSQL; escritorio 1440 px y móvil 375 px. Navegadores en Los Ángeles y Tokio frente a negocios en Santo Domingo/Nueva York. Scripts y resultados están en `.tmp/schedule-c2/`; las pruebas versionadas son reproducibles sin esas sesiones.

| Evidencia | Rol / acción / resultado |
| --- | --- |
| `editor-final.cjs` / `editor-final.json` | OWNER: semana revisada/guardada y CMS actualizado; región/semana de segundo tenant confirmadas; cierre completo inclusivo, cancelación e historia; borrador independiente conservado; 409 real y reconciliación; A → B → A reinicia visita. Escritorio/375 px sin overflow. Foco inicial y ciclo de teclado en confirmación. Cero pageErrors. |
| `scope-qa.cjs` | Reproducción y corrección de carga bloqueada por limpieza de caché al cambiar contexto; recorrido posterior completo exit 0. |
| `roles-qa.cjs` / `roles-qa.json` | ADMIN gestiona semana/cierres y ve motivo privado; no confirma región (403). BARBER/RECEPTIONIST leen horario/cierres activos sin motivos o proyección management; escritura 403, sin CMS. Tres roles a 375 px, sin overflow o pageErrors. |
| `agenda-qa.cjs` / `agenda-qa.json` | OWNER: filtro del 1 de noviembre de Nueva York abarca 25 horas; rechaza 01:30 repetida; crea 06:00 y reprograma 06:17 fuera de cadencia pública, con instantes correctos y reloj del negocio. Rango invertido bloqueado. Correo pausado y promociones con lenguaje calendario natural. Cero pageErrors. |
| `final-edge-qa.cjs` / `final-edge-qa.json` | OWNER: cierre que afectaría citas muestra profesional por nombre, impide guardar y conserva revisión. BARBER: A2 rechaza hora repetida sin HTTP de escritura; actualizar solo nota de intervalo válido conserva segundos/milisegundos; Facturación carga tras transición de zona. Cero pageErrors y errores de consola. |
| `report-qa.cjs` / `report-qa.json` | OWNER: factura 26-09 01:00 Nueva York incluida en fecha 26 aunque Los Ángeles aún es día 25; Resumen consume zona C1 y muestra fecha natural. Cero pageErrors y errores de consola. |

Capturas revisadas: `owner-final-desktop.png`, `owner-final-mobile-week.png`, `barber-mobile.png`, `a2-mobile.png` e `invoice-business-mobile.png`; se conservan también capturas de ADMIN, RECEPTIONIST, agenda e impacto. Se comprobaron controles etiquetados, navegación, lectura sin motivos y ausencia de jerga técnica. No equivale a una auditoría exhaustiva de accesibilidad.

Los primeros recorridos incluyeron errores de selectores de automatización y un intento de crear un bloqueo ambiguo que C1 rechazó correctamente con 400. Se corrigieron los selectores, se separó rechazo ambiguo de conservación de precisión en un intervalo válido y se repitieron los scripts hasta exit 0. No se atribuye éxito a esas ejecuciones iniciales. El 403 de roles y el 409 concurrente fueron resultados esperados con recuperación verificada.

### Estado de entrega y siguiente gate

Al cierre del QA local inicial, los cambios estaban sin staging, commit o push y HEAD conservaba `b0357af6b237466f7e5e17c2eff0901e2336ded1`. Después se autorizó un commit local del checkpoint conjunto C2/QA; el push sigue pendiente. Sin cambios API/Prisma/dependencias. C2 queda implementado/en revisión local, no aprobado. El próximo paso es revisión del propietario y **autorización expresa antes de cualquier QA visual/frontend en producción real**; no se inicia por esta evidencia. Despliegue, nueva apertura pública y activación de correo siguen sin autorización. Cualquier implantación posterior deberá elegir horario expresamente y reevaluar D9 bajo lock, sin usar el fallback como decisión del dueño.

Al terminar se detuvieron API, Next y el clúster PostgreSQL temporal identificado por ruta/PID; las bases y evidencia se conservaron. `git diff --check` pasó y la revisión de los 25 archivos modificados/nuevos comprobó enlaces documentales, ausencia de patrones de credenciales en contenido añadido, rama/HEAD y staging vacío. La revisión local no sustituye auditoría/aprobación del propietario.

Fuentes: [contrato C1](HORARIO_ZONA_C1_CONTRATO.md), [D14-A](HORARIO_ZONA_C0_AUDITORIA.md), [gates](../quality/DELIVERY_GATES.md) y [Definition of Done](../quality/DEFINITION_OF_DONE.md).
