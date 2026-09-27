# Inventario y limpieza de Supabase productivo

**Estado: LIMPIEZA EJECUTADA Y VERIFICADA el 2026-09-27 06:26 UTC.** El
propietario confirmó directamente el borrado del alcance pre-corte después de
revisar el inventario, incluidos los casos ambiguos enumerados abajo.

## Corte y respaldo

Proyecto Supabase productivo `ilaoolpcrlmqkftirjog`; las consultas de inventario
se hicieron con `SELECT`. La relectura inmediatamente anterior al borrado informó
`2026-09-27 06:20:50.048 UTC`; la relectura posterior está registrada a las
`06:26:43.681 UTC`. El registro real más reciente informado por el propietario
coincide con la organización `Dental Ross` (`dental-ross`), creada a las
`2026-09-27 05:12:40.239 UTC`. El usuario, su membresía OWNER y el evento
`CREATE Organization` se crearon en los milisegundos siguientes. Esta hora es
el límite: se conservará todo lo creado a partir de ella, incluida `Dental
Ross`.

Antes del borrado se ejecutó `pg_dump` del esquema aplicativo completo `public`
(31 tablas) y se cifró en flujo con GPG AES256 en el objeto privado de OCI. El
restore drill se ejecutó después de generar la copia, en PostgreSQL aislado, y
verificó las 31 tablas, 30 filas de `_prisma_migrations` y 25 reservas; el SHA
del archivo y objeto remoto coincidió. Evidencia del 2026-09-27 06:19 UTC:

- Objeto: `daily/20260927T061943Z-4180b059-0b7c-4658-8c54-3d4c8bf0f846.dump.gpg`
- SHA-256: `0b01a09db5efb83edf5fe6480ba41ebae8bd5cdd15d5bb84586e5ccfb4d1348f`
- Tamaño: 44,798 bytes; resultado `BACKUP_OK`, `RESTORE_DRILL_OK`, 31 tablas / 30 migraciones / 25 reservas.

La copia cubre íntegramente el esquema aplicativo `public`, que contiene todas
las filas afectadas por esta limpieza; no incluye esquemas administrados de
Supabase ni roles globales del clúster.

## Organizaciones anteriores al corte — eliminadas

Las 14 organizaciones siguientes tienen `createdAt` anterior al límite. No
aparecen filas con `createdAt` o actualización verificable desde el límite en
sus tablas tenant-scoped. Los conteos son datos asociados por tabla, no sumas
de usuarios únicos entre organizaciones.

| Organización | Slug | ID | Creada UTC | Membresías | Datos de negocio relevantes |
| --- | --- | --- | --- | ---: | --- |
| Barbería Fraylin | `barberia-fraylin` | `5b88c02e-ae17-46fc-8bd4-d5c02af05aef` | 2026-07-20 23:47:01 | 2 | 1 cliente, 1 reserva pendiente, 2 servicios, 1 profesional |
| Fraylin Barber Shop | `fraylin-barber-shop` | `3e122ab1-8441-4655-9b15-95e4c756583e` | 2026-07-22 00:04:22 | 7 | 5 clientes, 17 reservas, 1 servicio, 3 profesionales, 1 factura |
| prueba 2 | `prueba-2` | `5731ac2e-f73c-44ed-9df3-c3f7929ff545` | 2026-07-23 22:42:34 | 0 | Sin membresías ni actividad operativa |
| prueba3 | `prueba3` | `9838ba86-f490-427d-b236-7ccd1f4c1abe` | 2026-07-23 22:48:20 | 1 | 1 cliente |
| Barbería Alpha | `alpha-001` | `a9c67eb9-311b-4426-9813-f31ab497b595` | 2026-07-25 00:57:32 | 1 | Sin reservas ni clientes |
| Prueba nueva | `prueba-nueva` | `97b4a798-8d7c-4e94-8b18-65278e8f264c` | 2026-07-25 21:13:45 | 1 | Sin actividad operativa |
| pruebanueva1 | `pruebanueva1` | `cef6604e-b9f1-401f-92fd-313910574de6` | 2026-07-25 21:18:56 | 1 | Sin actividad operativa |
| QA Clientes 1786495593 | `qa-clients-b-1786495593` | `8bf68b99-3e8d-41c4-8e31-b22ba90b5d8a` | 2026-08-12 00:46:33 | 2 | 26 clientes, 4 reservas, 1 servicio, 1 profesional |
| QA Profesionales B | `qa-professionals-20260812b` | `b0783bf1-3bba-4aab-bcae-3a2d7c422d7f` | 2026-08-13 02:21:10 | 5 | 23 profesionales, 1 bloque de disponibilidad |
| Fraylin 2 | `fraylin-2` | `4f5d69d8-3407-48b2-9471-c6655bec08c4` | 2026-08-25 02:41:59 | 1 | 2 invitaciones |
| Segundo Usuario | `segundo-usuario` | `9d2002ac-08c7-49f7-a641-23a75f32d0d4` | 2026-08-25 02:45:38 | 1 | 2 invitaciones |
| Prueba depende doble | `prueba-depende-doble` | `0986d827-352b-486f-a07f-dad08b6b1452` | 2026-08-25 03:02:27 | 2 | 1 cliente, 1 reserva completada, 1 servicio, 1 profesional, 3 invitaciones |
| QA C2 Norte | `c2-qa-norte-20260913` | `affc447e-f975-4e4b-b3e2-2118bbb52b8d` | 2026-09-13 04:07:20 | 4 | 2 clientes, 2 reservas, 2 profesionales, factura y pago de prueba, 12 operaciones CMS |
| QA C2 Sur | `c2-qa-sur-20260913` | `3a9b9e5e-c579-4f48-9cab-9fb70df366ee` | 2026-09-13 04:07:20 | 4 | 1 servicio, 1 profesional; sin CMS publicado |

Además, cada organización anterior tiene una fila `CmsPage` sin marcas de
tiempo. Trece tienen CMS publicado en la lectura actual. Las doce operaciones
`CmsOperation` de QA C2 Norte y dos `BookingEmailPreference` tienen fecha nula o
no cuentan con fecha de creación; su relación con tenants/reservas previos está
confirmada, pero no se inventa una marca temporal para ellas.

## Hallazgos presentados antes de la confirmación

El inventario identificó registros que no podían clasificarse como prueba solo
por el nombre. Se presentaron antes de ejecutar y quedaron incluidos en la
confirmación explícita del propietario:

- **Fraylin Barber Shop** tiene 17 reservas (8 completadas, 5 canceladas,
  3 `NO_SHOW`, 1 pendiente), cinco clientes y una factura por DOP 500 asociada
  a una reserva con estado `COMPLETED`; no hay `Payment` asociado. Su
  propietario de aplicación usa un correo Gmail y el tenant no lleva marca QA;
  el propietario confirmó incluirlo en el borrado.
- **Barbería Fraylin** tiene una reserva `PENDING`, un cliente y un profesional;
  el tenant tampoco lleva marca QA; quedó incluido en el borrado confirmado.
- **Prueba depende doble** fue creado por el usuario de prueba `QA Invitee`,
  pero después se aceptó una invitación para una cuenta Gmail de otra persona;
  hay una reserva completada, un profesional y un cliente. Ambas identidades y
  actividad quedaron incluidas en el alcance que confirmó el propietario.
- **Fraylin 2** tiene un OWNER Clerk-linked con correo personal y dos
  invitaciones. **Segundo Usuario** también tiene OWNER Clerk-linked con correo
  personal y dos invitaciones. Aunque los nombres/tenants parecen de prueba,
  ambas identidades quedaron incluidas en el alcance que confirmó el propietario.
- **Barbería Alpha** tiene una cuenta OWNER y CMS publicado, sin reservas ni
  clientes. No había evidencia suficiente para clasificarla solo por el nombre;
  quedó incluida en el alcance confirmado por fecha.
- **QA C2 Norte** tiene marcadores QA (`.example.test`, `+clerk_test`), pero
  registra factura y pago `CASH` por DOP 500. Se clasifica como fixture por sus
  marcadores, no como cobro real; quedó incluida en el alcance confirmado.

`QA Clientes`, `QA Profesionales B`, `QA C2 Norte` y `QA C2 Sur` tienen señales
directas de fixture (`QA` en organización/cuentas, `.example.test` o
`+clerk_test`). Los tenants con “Prueba” en el nombre también parecen pruebas,
pero la presencia de cuentas personales no se usa por sí sola para probarlo.

## Conteo antes y después de la limpieza

Antes de limpiar había 15 Organizations, 28 Users y 33 Memberships. De ellos,
14 Organizations, 27 Users y 32 Memberships eran pre-corte; todos los usuarios
anteriores tenían membresía solo en organizaciones anteriores. `Dental Ross`
era la única organización creada desde el corte y tenía un usuario, una
membresía OWNER, una auditoría y un CMS privado sin snapshot publicado.
La lectura previa de las 06:20:50 UTC confirmó 14 Organizations, 27 Users y 32
Memberships pre-corte; ninguna Organization, User o Membership anterior había
sido actualizada desde el corte. La transacción exigió esos conteos, bloqueó las
tablas afectadas y abortaba ante cualquier cambio. La relectura posterior de las
06:26:11 UTC confirmó una sola Organization, User y Membership, los tres
correspondientes a `Dental Ross`.

Filas tenant-scoped pre-corte observadas: 25 Booking, 36 Client, 32
Professional, 7 Service, 2 Invoice, 1 Payment, 7 TeamInvitation, 3
BookingEmailEvent, 3 EmailOutbox, 2 BookingEmailPreference, 1
ProfessionalAvailabilityBlock, 1 ProfessionalWeeklySchedule, 14 CmsPage, 12
CmsOperation y 136 AuditLog con organización anterior. Suman 355 filas entre
14 organizaciones, 27 usuarios y sus dependencias, antes de considerar los 7
`CLERK_ONBOARDING_EMAIL_CONFLICT` globales pre-corte que no contienen IDs ni
PII.

La transacción eliminó exactamente 355 filas en una operación atómica usando
el rol de mantenimiento `kortek_migrator`: las 14 Organizations, 27 Users,
32 Memberships y sus 282 filas dependientes enumeradas arriba. Verificación
posterior: cero Organizations/Users/Memberships anteriores al corte; cero
reservas, clientes, profesionales, servicios, pagos, facturas, invitaciones,
outbox, eventos/preferencias de correo, operaciones CMS, dependencias de medios
o notificaciones remanentes. `Dental Ross` conserva su Organization, User,
Membership OWNER, una fila CmsPage y una AuditLog; sigue sin servicios o
profesionales activos públicos.

Se conservaron los siete eventos globales `CLERK_ONBOARDING_EMAIL_CONFLICT`
(AuditLog con `organizationId`, `userId` y `entityId` nulos), las 30
migraciones, el único `EmailChannelControl` y los 19 `SecurityRateBucket`.
Los identificadores externos de Clerk no son filas de Supabase y no se
eliminaron. La transacción comprobó dentro del mismo bloque los conteos previos,
el límite de `Dental Ross`, los registros de seguridad y migraciones, el total
de 355 filas borradas y las condiciones de preservación antes del commit.
