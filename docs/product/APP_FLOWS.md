# Flujos de aplicación — Kortek Booking

Este mapa describe los recorridos ejecutados por el código vigente. Los contratos detallados viven en [`BACKEND_CHANGES.md`](../../BACKEND_CHANGES.md) y el estado de cada módulo en [`PROJECT_MASTER.md`](../../PROJECT_MASTER.md).

## 1. Identidad y acceso interno

1. login, registro, recuperación y logout de la web usan Clerk;
2. la web obtiene un token corto de la sesión en memoria y consulta `GET /auth/clerk/bootstrap`;
3. NestJS resuelve `User.clerkUserId`, Memberships B2B y organizaciones mínimas;
4. la organización activa solo puede elegirse entre esas Memberships;
5. cada ruta B2B vuelve a verificar sesión/JWT legacy, Membership y rol local;
6. al cambiar usuario, organización o rol, la web elimina la caché de negocio y las vistas sensibles usan una clave de alcance propia.

La web no persiste `bf_token`, `bf_session` ni `kb_session`. Los endpoints JWT/password backend continúan únicamente como rollback hasta A0.7.

## 2. Onboarding de la primera organización

1. Clerk autentica y verifica la identidad;
2. `POST /auth/clerk/onboarding` recibe solo los datos de la nueva organización;
3. NestJS crea atómicamente User local, Organization, Membership OWNER y AuditLog;
4. la repetición de la misma identidad es idempotente.

El navegador no aporta `organizationId`, rol, correo ni identificador Clerk como autoridad. `POST /organizations` y `GET /organizations/by-slug/:slug` están retirados: no existe todavía un contrato para crear organizaciones adicionales desde el panel.

## 3. Invitaciones de Equipo

1. OWNER/ADMIN crean una invitación local tenant-scoped;
2. NestJS coordina la invitación externa Clerk sin mantener una transacción PostgreSQL abierta;
3. la persona acepta con una sesión Clerk y correo principal verificado;
4. una transacción `SERIALIZABLE` crea Membership y, para BARBER cuando corresponde, Professional;
5. nunca se enlaza un User por coincidencia de correo.

## 4. Operación interna

1. `B2bAuthGuard` resuelve el contexto local y `RolesGuard` aplica permisos;
2. las consultas finales incluyen `organizationId` y ownership cuando aplica;
3. el frontend muestra solo acciones autorizadas sin sustituir el control backend;
4. errores esperados se traducen a lenguaje de tarea y permiten recuperación.

Los contratos concretos de Reservas, Clientes, Profesionales y Facturación se leen en sus entradas vigentes; este mapa no concede permisos nuevos.

## 5. Reserva pública y continuidad B2C

1. `/public/:slug/booking-data` entrega catálogo y profesionales públicos mínimos;
2. disponibilidad usa servicios/profesionales activos, horario efectivo y protección concurrente;
3. la persona reserva como invitada con datos mínimos;
4. Client y Booking se crean o reactivan atómicamente;
5. la opción legacy de cuenta con contraseña permanece temporalmente en el contrato público como rollback;
6. A0.6-A permite reclamar después una reserva con sesión Clerk mediante un vínculo `Client.userId`, sin Membership CUSTOMER.

A0.6-B/C/D todavía no implementan un recorrido Clerk público posterior a reserva ni autoservicio de cliente.

## 6. Facturación interna

1. una Booking solo se completa después de `endTime` según el reloj del servidor;
2. una Invoice interna toma el snapshot de `Service.price` y queda única por Booking;
3. un Payment completo único registra método, `paidAt` y actor;
4. listados y acciones se aíslan por tenant y, para BARBER, por Professional vinculado;
5. Analytics atribuye ingresos por `Payment.paidAt`.

No es facturación fiscal y no incluye anulaciones, reembolsos, pagos parciales o comisiones.

## 7. Flujo de entrega

Cada capacidad pasa por definición de producto/UX, arquitectura/seguridad, backend, aprobación, frontend, QA, checkpoint y auditoría. Consultar [`DELIVERY_GATES.md`](../quality/DELIVERY_GATES.md). Una etapa incompleta no autoriza la siguiente.
