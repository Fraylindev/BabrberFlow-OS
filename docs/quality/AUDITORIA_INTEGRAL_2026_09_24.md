# Auditoría integral y roadmap — 2026-09-24

Estado: **AUDITORÍA DOCUMENTAL ENTREGADA / EN REVISIÓN DEL PROPIETARIO**. Base Git `0e4d30fd895037cb5279bab39d3ebf6969ec2e4c`, rama `ai/antigravity-qa`, árbol limpio al iniciar. Este informe no aprueba Medios/Promociones C3, no autoriza otro módulo y no equivale a un despliegue.

**Seguimiento posterior:** el propietario aprobó Medios/Promociones C3 y autorizó los candidatos 1–2 más H4. [Evidencia del correctivo](CORRECTIVOS_2026_09_24.md). H2 se debió a buscar `ops/` en la raíz: los archivos originales ya estaban versionados en `apps/api/ops/` desde `22a27c4`. Los resultados del smoke y el gate C3 descritos abajo son la fotografía anterior a esa decisión y al correctivo.

## 1. Alcance y método

Se contrastaron [estado y decisiones vigentes](../../PROJECT_MASTER.md), [gates](DELIVERY_GATES.md), producto, arquitectura, contratos, Prisma, migraciones, controladores, servicios, pantallas, pruebas y [workflow de CI](../../.github/workflows/quality.yml). El código demuestra qué existe; las entradas fechadas antiguas se conservan como historia. El roadmap anterior a Medios y Notificaciones es [histórico](../features/ROADMAP_POST_CMS_AUDITORIA.md) y no se reutiliza como lista de pendientes actuales.

La auditoría ejecutó validaciones locales sin cambiar código, contratos ni datos. No creó una base PostgreSQL aislada, no repitió E2E de base de datos, QA autenticado de roles/tenants ni ciclos reales con Clerk, Cloudinary o Resend. Tampoco consultó el estado remoto del workflow CI. La evidencia previa de esos recorridos permanece en los documentos de cada entrega; no se atribuye a esta auditoría.

## 2. Estado comprobado

- El árbol tiene **25 migraciones Prisma** y [`quality.yml`](../../.github/workflows/quality.yml) ejecuta instalación, auditoría, Prisma, tipos, lint, pruebas, builds, E2E PostgreSQL aisladas y smoke Chrome. Que exista el workflow no demuestra que la ejecución remota actual esté verde.
- Configuración/CMS C1–C3, H5/fechas, WhatsApp C1–C3, Notificaciones C1–C3 y Medios/Promociones C1–C2 tienen las aprobaciones registradas en [PROJECT_MASTER](../../PROJECT_MASTER.md). **Medios/Promociones C3 permanece documentado y en revisión**; no hay activación productiva.
- El backend A0.6-A de reclamación B2C existe en [`POST /auth/clerk/customer/claims`](../../apps/api/src/auth/clerk-customer-claims.controller.ts); la web aún no lo consume. La autenticación JWT/password legacy sigue disponible en API para rollback, no en la sesión web vigente.
- La reserva pública consume `Organization.businessHours` si tiene la forma legacy admitida; cuando falta o es inválido, [`resolveBusinessHours`](../../apps/api/src/public-booking/availability.util.ts) usa la ventana 09:00–19:00. No hay editor/endpoint aprobado para horario global o zona del negocio.

### Validaciones ejecutadas en esta auditoría

| Verificación | Resultado observado |
| --- | --- |
| `pnpm --filter api type-check`, `lint`, `build` | Exit `0` cada una |
| `pnpm --filter api test -- --runInBand` | Exit `0`; 682 pruebas aprobadas, 11 omitidas, 55 suites aprobadas y 2 omitidas |
| `pnpm --filter api exec prisma validate` | Exit `0`; schema válido. No valida el estado de la base actual |
| `pnpm --filter web type-check:clean`, `lint`, `build` | Exit `0` cada una |
| `pnpm --filter web test` | Exit `0`; lógica aprobada y 48 pruebas de componentes aprobadas en 9 archivos |
| `pnpm audit --prod` | Exit `0`; «No known vulnerabilities found» en la consulta autorizada del 2026-09-24 |
| `pnpm --filter web test:browser` | **Exit `1`**; 18 aprobadas, 1 omitida y 3 fallidas de 22 escenarios Chrome |
| Git inicial y final | `ai/antigravity-qa`, HEAD = `origin/ai/antigravity-qa` en la base indicada, sin cambios de código durante el diagnóstico |

### Diagnóstico de los tres fallos Chrome

1. El recorrido completo WhatsApp falló en desktop y 375 px al exigir consola vacía: el fixture de [`whatsapp-c2.spec.ts`](../../apps/web/e2e/whatsapp-c2.spec.ts) aborta la petición nueva `/public/qa-whatsapp-a/media`, que produce `net::ERR_FAILED`. El flujo de reserva, el enlace y sus aserciones anteriores pasaron. Corregir el fixture para responder a medios y conservar una prueba separada de indisponibilidad real; no ignorar todos los errores de consola.
2. El test de navegación móvil de [`public-landing.spec.ts`](../../apps/web/e2e/public-landing.spec.ts) recibió `hidden` al comprobar el contenedor animado `#landing-mobile-menu`, después de que botón expandido y enlace «Iniciar sesión» pasaran sus aserciones. Una comprobación directa adicional en Chrome a 375 px, tras abrir por teclado y esperar 700 ms, midió menú de 375 × 213 px y enlace de 343 × 20 px; `elementFromPoint` alcanzó ese enlace. Esto apunta a una aserción inestable o dependiente de la transición bajo carga paralela; no acredita por sí solo un defecto visual ni sustituye repetir el smoke completo.

## 3. Hallazgos nuevos o precisados por esta auditoría

| ID | Hallazgo y evidencia | Impacto / siguiente verificación |
| --- | --- | --- |
| H1 | El smoke versionado hoy termina en exit `1`, aunque tipos, lint, unitarias y builds pasan. | Gate de checkpoint no satisfecho. Corregir fixtures/aserción y repetir los 22 escenarios en desktop/375 px. |
| H2 | [`apps/api/.env.example`](../../apps/api/.env.example) y la [evidencia histórica de estabilización](ESTABILIZACION_2026_09.md) remiten a `ops/provision-database-roles.sql` y `ops/verify-runtime-role.sql`; `git ls-files ops` no devuelve archivos y esas rutas no existen en el checkout. | La provisión mínima documentada no se reproduce desde el repositorio. Recuperar o reconstruir scripts revisados y probarlos en PostgreSQL aislado antes de usarlos. No se considera endurecimiento resuelto. |
| H3 | Al iniciar la auditoría, fuentes llamadas vigentes aún decían «sin CI», «21/24 migraciones», Notificaciones C1 en revisión, y Medios/Resend no implementados. | Riesgo de planificar desde un estado falso. Se reconcilian los resúmenes actuales; las entradas antiguas permanecen fechadas como historia. |
| H4 | [`PublicBookingService`](../../apps/api/src/public-booking/public-booking.service.ts) registra `error.stack` completo al fallar la creación secundaria de cuenta. La prueba emitió un stack técnico; no se comprobó PII en ese caso. | Riesgo potencial de datos internos o PII en logs futuros. Auditar y sustituir por código/clase segura en un correctivo de privacidad autorizado. |

Persisten riesgos ya identificados en [PROJECT_MASTER §7](../../PROJECT_MASTER.md): `barberflow` conserva atributos globales elevados, grants runtime/ACL predeterminadas amplias, límites locales al proceso, MFA y planes productivos sin gate completado, JWT/password legacy y ausencia de configuración de horarios/zonas. Medios agotó la cuota de moderación en QA según [C3](../features/MEDIOS_PROMOCIONES_C3_ACTIVACION.md); no se midió un nuevo saldo. Correo pasó QA real de cinco plantillas, pero el canal sigue pausado y sin producción según [Notificaciones C3](../features/NOTIFICACIONES_C3_ACTIVACION.md).

## 4. Roadmap recomendado

`R/C` indica **riesgo / complejidad**: B bajo, M medio, A alto, MA muy alto. El orden prioriza integridad de reservas, seguridad y reproducibilidad antes de ampliar compromisos comerciales. La fila **0 es el gate pendiente de Medios C3**; las filas **1–14 son los 14 candidatos**. Los C0 pueden prepararse en paralelo; cada implementación exige autorización y gates propios.

| Orden | Candidato y alcance | R/C | Dependencias y criterio de avance |
| --- | --- | --- | --- |
| **0 (gate)** | **Cerrar Medios C3:** revisión y aprobación expresa del documento vigente; confirmar cuota y controles antes de otra carga o activación. | M/B | Decisión del propietario. [C3 sigue en revisión](../features/MEDIOS_PROMOCIONES_C3_ACTIVACION.md). |
| **1** | **Recuperar el gate Chrome:** responder `/media` en el fixture, estabilizar la prueba del menú y repetir el smoke completo sin ocultar errores reales. | M/B | Inmediato, antes de un nuevo checkpoint candidato. H1. |
| **2** | **Reproducibilidad y verdad documental:** restaurar/versionar provisión y verificación de roles; reconciliar fuentes vigentes y arranque local. | A/M | Inmediato; precede a preparar otro entorno y a confiar en los C0 siguientes. H2–H3. |
| **3** | **Base previa a producción:** administrador bootstrap aislado, grants mínimos, límites distribuidos, MFA/planes aptos, CORS/secretos, observabilidad mínima, respaldo/restore, cutover Supabase y rollback ensayado. | A/A | Depende de 2; gate antes del primer tenant externo. Incluir H4 y controles operativos de workers. |
| **4** | **Horario y zona del negocio:** definir semana/cierres/zona, compatibilidad legacy, reservas futuras y disponibilidad individual; backend aprobado, después editor y QA. | A/A | Diseño paralelo a 3; cerrar antes de ofrecer reserva pública a negocios con horarios distintos. No usar PATCH libre del JSON actual. |
| **5** | **Operación de Medios:** presupuesto global de moderación, respuesta a cuota agotada, alertas de purga, retiro y recuperación. | A/M | Depende de 0 y controles pertinentes de 3; comprobar nuevo ciclo antes de cargas reales. |
| **6** | **Activación operativa de correo:** worker/webhook, pausa, alertas, fallos, retención y dominio verificado. | A/M | Depende de 3. C3 probó entregas temporales; producción requiere gate propio. |
| **7** | **Continuidad B2C A0.6-B/C/D:** entrada Clerk después de reservar, reclamación entendible, historial/autoservicio y privacidad por tenant. | A/A | Reutilizar A0.6-A aprobado; definir UX/permisos. Coordinar con 4 para agenda fiable. |
| **8** | **Retiro legacy A0.7:** inventario de consumidores/datos, ventana de rollback y eliminación controlada de JWT/password y alta pública legacy. | A/A | Después de 7 y de evidencia de que ningún flujo depende de legacy; nunca enlazar por correo. |
| **9** | **Analytics como módulo:** tareas y métricas reales para OWNER/ADMIN; consumir el endpoint existente o contratar solo lo faltante. | M/M | Después de estabilizar operación; mantener ingreso por `Payment.paidAt`. |
| **10** | **Cierre del Resumen:** agregación, estados, permisos y QA transversal de módulos aprobados. | M/M | Después de 9 y de los módulos que deba resumir. |
| **11** | **Pagos, transferencia y comprobantes:** C0 financiero de estados, custodia privada, verificación, expiración, propina, conciliación y compatibilidad con Invoice–Payment. | MA/MA | C0 puede adelantarse; implementación tras 3–4 y contrato financiero aprobado. Comprobante pendiente no equivale a `Payment`. |
| **12** | **WhatsApp operativo y plantillas editables:** acción manual del personal y gobierno de textos, separada del enlace público aprobado. | M/M | Permisos y eventos reales definidos; puede seguir a 6. Abrir `wa.me` no acredita envío. |
| **13** | **Promociones ejecutables:** descuentos, elegibilidad, cupos, concurrencia y precio prometido. | A/A | Después del contrato financiero de 11; promociones editoriales actuales no cambian cobros. |
| **14** | **Organizaciones adicionales y ampliaciones CMS:** alta atómica, límites, roles, slug/alias y publicación, según demanda comprobada. | A/A | Después de 3 y 8; Membership múltiple no es hoy un flujo de alta de otro negocio. |

Secuencia sugerida: resolver **0–2** primero; diseñar **3–4** como base para un piloto externo; preparar **5–6** según el canal activado; completar **7–10**; abordar **11–14** mediante C0 separados. Este orden es una recomendación, no autorización de ejecución.

## 5. Gates para continuar

Cada capacidad funcional requiere brief de producto/UX, contrato y seguridad, backend validado, **aprobación explícita de backend**, frontend, QA real, checkpoint y auditoría/aprobación del propietario según [DELIVERY_GATES.md](DELIVERY_GATES.md). Para el primer correctivo, la salida observable es smoke Chrome completo con exit `0` y sin ocultar errores. Para la provisión de roles, scripts versionados, prueba desde cero con rol no privilegiado, grants cotejados y rollback reproducible. Para horarios, cubrir tenant, permisos, reservas futuras, concurrencia, zona del negocio y móvil.

Esta entrega es exclusivamente documental. No modifica endpoints, DTOs, Prisma, dependencias, datos, proveedores ni la decisión pendiente de Medios C3.
