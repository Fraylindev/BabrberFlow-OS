# Reserva de invitado — C0/C1, retiro funcional B2C

## Validación PostgreSQL posterior — 2026-10-07

[Informe de cierre técnico C1](RESERVA_INVITADO_C1_CIERRE_TECNICO.md): PostgreSQL 18.1 desechable, 28 migraciones intactas y gate runtime aprobados; **37/37 integraciones + 2/2 HTTP claim, 0 omitidas, exit 0**. Se corrigió una expectativa H5 obsoleta según F0-D/2A aprobado, conservando su fallo inicial. C0 aprobado; C1 validado localmente, candidato a cierre técnico/en revisión, **sin aprobación de cierre ni commit**; C2/C3 pendientes y detenidos. Sin commit/push/despliegue ni QA; Clerk, datos reales y P4b intactos. Los resultados inferiores conservan sus checkpoints fechados y no implican una repetición nueva.

Fecha: 2026-10-07. Base: `c4625ef23a3766c5be5172dde0aea4b1cb57d7ac`, rama `ai/antigravity-qa`, árbol inicial limpio. **C0 APROBADO. C1 IMPLEMENTADO Y VALIDADO PARCIALMENTE EN LOCAL, EN REVISIÓN. C2 PENDIENTE. C3 PENDIENTE.** No hay aprobación del backend inferida.

## Corrección de consistencia posterior — 2026-10-07

[Informe corregido, clasificación y 37 omitidas](RESERVA_INVITADO_CONSISTENCIA_C0_C1.md). Autorización posterior permite el correctivo de pruebas/helpers: dos positivos de claim retirados, helpers históricos segregados .txt, rate-limit espera 404. 308 pruebas web, tipos/lint/build y 22 HTTP API aprobados; 37 integraciones PostgreSQL aprobadas en el ensayo posterior superior. C2 sigue bloqueando integración; UI productiva intacta. Patch/validacion.json inferiores conservan el checkpoint previo y no constituyen el diff actualizado ni aprobación C1 completa.

## C0 — decisión y alcance autorizado

El propietario retira la cuenta del cliente final del producto y del MVP. La reserva de invitado es oficial: servicio → profesional → fecha/hora → nombre/teléfono/correo opcional → revisión → reserva `PENDING`. `Client` es ficha operativa tenant-scoped; no es identidad autenticada. Cambios/cancelaciones se solicitan al negocio; no hay portal, historial público ni enlaces privados nuevos.

Solo se ejecutan C0 documental y C1 backend/seguridad. C2 frontend exige primero entregar diff y pruebas backend, más aprobación expresa según gates. C3 QA no iniciado. Sin commit, push, despliegue, cambios QA, Clerk, datos reales o producción. P4b y su auditoría quedan excluidos.

Se preservan Client, User, Membership, reservas, facturas, pagos, datos, schema, tablas/columnas, migraciones históricas, índices/triggers, grants y estructuras/scripts de compatibilidad. No se retira la autenticación interna legacy completa ni se cambian MFA, TTL, secretos, configuración, Clerk o autenticación de los roles internos. Solo se rechaza CUSTOMER legacy, conservando acceso de una identidad que tenga una Membership interna válida.

El siguiente bloque del roadmap es calendario operativo día/semana y C0 financiero de pago presencial/transferencia con comprobante privado para invitados; Analytics y cierre del Resumen después. La carga de evidencia no implica Payment. Definir autorización de carga y recuperación sin cuenta dentro del futuro C0 financiero: un ID de reserva no concede acceso. Esta entrega no implementa ni autoriza esos módulos.

## C1 — contrato y privacidad

`POST /public/:slug/bookings` conserva servicio, profesional, startTime autoritativo, clientName/clientPhone, clientEmail opcional y emailNotifications opcional. Se eliminan createAccount/password del DTO y la creación secundaria. Whitelist/forbidNonWhitelisted rechaza esos campos con 400 antes de cualquier transacción, incluso createAccount:false. No se deduce identidad de teléfono/email.

Tenant derivado del slug elegible y publicado, revalidación bajo lock, transacción Client/Booking, reactivación de contacto, conflictos de horario, D11 neutro, AuditLog sin PII y PENDING permanecen. No se transforma una ficha operativa en identidad ni se enlaza por contacto. No se modifica correo/consentimiento ni se promete entrega.

### Consumo de campos de salida y retirada

Búsqueda previa global: `rg -n 'accountCreated|accountCreationError' apps .github`. Consumidor tipado vigente: `apps/web/lib/api.ts`, PublicBookingResult, usado por el POST público y éxito/calendario. Fixtures: tests públicos, notificaciones, WhatsApp y scripts f0a/f0e. No se encontró una lectura funcional de ambos campos en componentes productivos; hay dependencia de forma/tipo y expectativas de tests. La evidencia es del repositorio, no un inventario de consumidores externos.

Por compatibilidad durante C1 sin C2, PublicBookingResponseDto conserva **deprecated** `accountCreated:false` y `accountCreationError:null`, tipados como constantes, sin intento de creación ni lógica asociada. No reflejan el estado de identidades históricas.

Plan de retirada: en C2 retirar tipos/fixtures y cualquier dependencia web comprobada; repetir búsqueda global, verificar consumidores externos antes de publicar un contrato reducido y eliminar ambos campos en un checkpoint backend coordinado autorizado. No mantener compatibilidad indefinida ni eliminarlos anticipadamente en C1 mientras web sigue tipada con ellos.

### Rutas retiradas (404 con y sin bearer)

| Método | Ruta |
| --- | --- |
| GET | `/customer/businesses` |
| GET | `/customer/:slug/bookings` |
| POST | `/customer/:slug/bookings` |
| GET | `/customer/:slug/bookings/:id` |
| GET | `/customer/:slug/profile` |
| PATCH | `/customer/:slug/profile` |
| POST | `/auth/clerk/customer/claims` |

### Rutas conservadas

- Pública: GET `/public/:slug/booking-data`, `/availability`, `/availability-days` y POST `/public/:slug/bookings`.
- Internas: auth/clerk/me, onboarding, bootstrap, equipo/invitaciones, register/login/invite/update-password legacy; dominios de Clientes, Reservas, Profesionales, Servicios, Facturación, Analytics, CMS, Notificaciones, Medios y Horarios.
- Login legacy mantiene el camino interno existente; el fallback excluye CUSTOMER. Si el tenant preferido histórico es CUSTOMER pero hay Membership interna válida, se usa esa interna mediante el mecanismo de preferencia existente. Sin Membership interna no se emite JWT CUSTOMER.
- JwtStrategy y la rama JWT de B2bAuthGuard rechazan Membership CUSTOMER actual aunque el payload afirme otro rol. Se conservan guards compartidos y su revalidación autoritativa. La delegación a Clerk no cambia; las rutas internas Clerk mantienen sus RolesGuard.

### Exclusividad demostrada y límites

Antes de editar se buscaron importaciones y usos en `apps/api/src` y `apps/api/test`:

- CustomerModule solo se registraba en AppModule. Su controller/session guard/budget guard/service/DTO/crypto no tenían consumidores internos fuera del módulo y tests propios; retirados.
- ClerkCustomerClaimsController/Service solo se registraban en AuthModule, con DTO/tests exclusivos; retirados.
- Las dos suites e2e de cuentas/claims exigían comportamiento que dejó de existir; retiradas y sustituidas por cobertura HTTP de inexistencia en AppModule real, rechazo DTO y reserva de invitado. Los ensayos de schema/migración/grants/rollback quedan intactos.
- **ClerkOnboardingGuard no es exclusivo:** también sirve onboarding, bootstrap y aceptación de invitaciones. Se conserva sin cambios, igual que ClerkAuthGuard, verificadores, proveedores y configuración Clerk.
- BookingsService, ClientsModule, AuditService, PrismaService, limitadores compartidos y bcryptjs tienen consumidores internos: se conservan. Se retira solo el import bcryptjs de PublicBookingService, no la dependencia instalada. Sin cambios de manifiestos/lockfile.
- Ningún archivo web se modifica en C1. La UI B2C sigue presente localmente y puede solicitar rutas retiradas; no desplegar este checkpoint como producto final antes de C2/C3.

## Migraciones y estado operativo

**Cero migraciones propuestas o ejecutadas.** Schema, ledger completo (incluida migración 28), rollback SQL y ops permanecen intactos. CustomerOperation y customer* quedan inactivos desde el runtime B2C retirado; los triggers conservados pueden seguir actualizando revisiones por compatibilidad al escribir Booking. No se desactiva ni altera esa garantía histórica.

No se consulta ni modifica ninguna base habitual/QA/productiva ni proveedor. Docker daemon no disponible (`docker version --format '{{.Server.Version}}'`, exit 1); no se arranca. No se ejecuta integración PostgreSQL ni migrate deploy. El ledger aplicable deberá revisarse antes de una futura publicación; no asumir que QA tiene migración 28 ni aplicarla/eliminarla por inferencia.

Retirar el historial público corta la vía de exposición D4; no demuestra que Client históricos estén libres de mezcla. Esa integridad y la paginación de GET /bookings conservan revisión independiente antes de producción.

## Pruebas C1 y evidencia

Harness reproducible: `apps/api/test/guest-retirement-run.cjs`; invoca herramientas ya instaladas mediante pnpm, bloquea lecturas/probes de dotenv con el preload existente y usa valores sintéticos, DATABASE_URL local puerto 1 y persistencia/proveedor controlados. El harness no crea conexiones DB ni sesiones Clerk. HTTP usa la aplicación Nest AppModule real y ValidationPipe real; ThrottlerGuard y BookingsService usan dobles, por lo que no acredita limitador ni persistencia/concurrencia reales.

Resultados reales (comandos ejecutados desde raíz, sin instalar dependencias):

| Comando | Resultado |
| --- | --- |
| `pnpm --filter api exec node test/guest-retirement-run.cjs tsc --noEmit` | exit 0 |
| `pnpm --filter api exec node test/guest-retirement-run.cjs eslint "{src,apps,libs,test}/**/*.ts"` | exit 0 |
| `pnpm --filter api exec node test/guest-retirement-run.cjs jest --runInBand` | exit 0; 61 suites aprobadas, 3 omitidas; 830 pruebas aprobadas, 37 omitidas |
| `pnpm --filter api exec node test/guest-retirement-run.cjs build build` | exit 0 |
| `git diff --check` | exit 0; avisos CRLF de Git no son fallos |

Incidencias conservadas: primer intento focalizado 72 aprobadas/2 fallidas, exit 1, por fixture HTTP de negocio sin zona/horario elegible; se corrigió el fixture y la suite completa posterior pasó. Intentos pnpm dentro del sandbox fallaron con unable to open database file; pnpm 11.18.0 se verificó fuera del sandbox con exit 0 y las validaciones usaron ese acceso aprobado al caché. Una invocación node -e sin listado de pruebas no se cuenta como validación. Primer harness Windows falló por escape de NODE_OPTIONS; corregido a barras normales y repetido. Los 37 tests omitidos son las suites preexistentes omitidas; no se añadieron skips para hacer pasar el retiro.

En las suites e2e PostgreSQL de Facturación, Servicios y Resumen se ajustan únicamente cuatro expectativas JWT CUSTOMER de 403 a 401, porque se rechaza la autenticación antes de RolesGuard; los rechazos Clerk permanecen 403. Se añadieron cuatro casos HTTP locales de AppModule para esos endpoints, aprobados. Esas tres suites PostgreSQL no se ejecutaron.

No se ejecutó e2e PostgreSQL: Docker no disponible y ausencia de psql/pg_ctl en PATH. No se relajaron assertions ni gates para simular evidencia de persistencia real. No se ejecutaron navegador, QA funcional/visual C3, Clerk/correo real ni pruebas físicas.

Criterios: siete métodos/rutas retirados 404; campos de cuenta 400 antes de escribir; invitado sin correo con/sin bearer crea PENDING y solo contacto/reserva; JWT CUSTOMER revocado por Membership actual; cuatro roles internos preservados; identidad mixta conserva rol interno; contrato deprecated constante; regresiones pertinentes sin fallos. C2/C3 y QA visual/física/proveedor quedan fuera.

## Riesgos y rollback

- Frontend anterior solicita APIs ya retiradas: checkpoint local intermedio, no candidato integrado/publicable.
- Clientes viejos que envíen createAccount/password reciben 400; API reducida exige C2 y revisión de consumidores antes de activar.
- No eliminar identidades históricas ni inferir que un User sin Membership es exclusivamente cliente. No se modifica el proveedor Clerk; retirar una cuenta externamente sería una operación distinta.
- Las estructuras B2C conservadas generan deuda de persistencia, documentada para una entrega de inventario/migración compensatoria independiente; no se limpia por inferencia.
- Rollback de este trabajo local: restaurar **solo** los archivos de C0/C1 contra el HEAD base desde un diff/snapshot revisado, preservando trabajo ajeno. No se ha realizado esa restauración. No hay rollback DB, migración ni proveedor porque no se tocaron.
- Reponer código anterior reabre APIs y alta CUSTOMER; cualquier rollback desplegado posterior exige autorización expresa y comunica esa consecuencia. No revertir historia ni hacer force-push.

## Entrega antes de commit

Inventario exacto y evidencia estructurada: [validacion.json](../quality/evidence/reserva-invitado-c1/validacion.json). Diff completo de código y documentación, incluidos archivos nuevos, sin incluir el propio paquete de evidencia: [c0-c1.patch](../quality/evidence/reserva-invitado-c1/c0-c1.patch). Staging/commit/publicación no autorizados. Evidencia final debe incluir comandos/exit codes, rutas arriba, migraciones evitadas, riesgos y rollback, con C1 **EN REVISIÓN** y C2/C3 sin ejecutar.
