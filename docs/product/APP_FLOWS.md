# Flujos de aplicación — Kortek Booking

Este mapa describe los recorridos ejecutados por el código vigente. Los contratos detallados viven en [`BACKEND_CHANGES.md`](../../BACKEND_CHANGES.md) y el estado de cada módulo en [`PROJECT_MASTER.md`](../../PROJECT_MASTER.md).

## 1. Identidad y acceso interno

1. login, registro, verificación, recuperación, contraseña, logout y sesión de la web usan Clerk;
2. login entra directamente a un destino interno de `/dashboard`; registro entra a `/dashboard/setup`;
3. la web obtiene un token corto de la sesión en memoria y consulta `GET /auth/clerk/bootstrap`;
4. NestJS resuelve `User.clerkUserId`, Memberships B2B y organizaciones mínimas;
5. `ONBOARDING_REQUIRED` solo monta el alta de negocio, `NO_ACCESS` solo muestra recuperación de acceso y `READY` habilita el panel del tenant;
6. la organización activa solo puede elegirse entre esas Memberships;
7. cada ruta B2B vuelve a verificar sesión/JWT legacy, Membership y rol local;
8. al cambiar usuario, organización o rol, la web elimina la caché de negocio y las vistas sensibles usan una clave de alcance propia.

La web no persiste `bf_token`, `bf_session` ni `kb_session`. Los endpoints JWT/password backend continúan únicamente como rollback hasta A0.7.

## 2. Onboarding de la primera organización

1. Clerk autentica y verifica la identidad;
2. `/dashboard/setup` muestra un panel restringido, sin navegación ni datos de negocio;
3. `POST /auth/clerk/onboarding` recibe solo los datos de la nueva organización;
4. NestJS crea atómicamente User local, Organization, Membership OWNER y AuditLog;
5. la repetición de la misma identidad es idempotente y el bootstrap actualizado habilita el panel.

El navegador no aporta `organizationId`, rol, correo ni identificador Clerk como autoridad. `POST /organizations` y `GET /organizations/by-slug/:slug` están retirados: no existe todavía un contrato para crear organizaciones adicionales desde el panel.

## 3. Invitaciones de Equipo

1. OWNER/ADMIN crean una invitación local tenant-scoped;
2. NestJS coordina la invitación externa Clerk sin mantener una transacción PostgreSQL abierta;
3. la persona acepta con una sesión Clerk y correo principal verificado;
4. una transacción `SERIALIZABLE` crea Membership y, para BARBER cuando corresponde, Professional;
5. nunca se enlaza un User por coincidencia de correo.

Si el enlace se abre con otra sesión activa, la web exige cerrar esa cuenta y conserva el enlace para continuar con el correo invitado. Un fallo terminal no se reintenta sobre el mismo enlace; la persona debe abrir la invitación más reciente. Los fallos transitorios sí ejecutan una nueva solicitud explícita.

## 4. Operación interna

1. `B2bAuthGuard` resuelve el contexto local y `RolesGuard` aplica permisos;
2. las consultas finales incluyen `organizationId` y ownership cuando aplica;
3. el frontend muestra solo acciones autorizadas sin sustituir el control backend;
4. errores esperados se traducen a lenguaje de tarea y permiten recuperación.

El Resumen obtiene agenda/carga paginadas desde `GET /analytics/summary` y métricas desde `GET /analytics/dashboard` como dependencias independientes. El servidor fija el día en `Organization.timeZone`; BARBER recibe solo su agenda vinculada. Cambiar usuario, tenant o rol desmonta el estado anterior y aborta/ignora respuestas tardías.

Los contratos concretos de Reservas, Clientes, Profesionales y Facturación se leen en sus entradas vigentes; este mapa no concede permisos nuevos.

## 5. Reserva pública y continuidad B2C

1. `/{slug}` presenta solo la revisión CMS publicada: nombre, descripción, teléfono y ubicación opcionales; consume por separado la proyección pública de medios aprobada cuando está disponible;
2. `/public/:slug/booking-data` entrega esa proyección, catálogo, profesionales públicos mínimos y la fecha mínima calculada en la zona del negocio, sin UUID de Organization ni la zona;
3. la página revalida publicación al recuperar foco y antes de abrir el asistente; inexistente, inactivo, borrado o retirado recibe una presentación neutra;
4. disponibilidad exige una fecha calendario ISO real, usa servicios/profesionales activos, horario efectivo y protección concurrente, y entrega por slot el instante UTC autoritativo además de la hora local visible;
5. el navegador reenvía ese instante sin reinterpretarlo según su zona y la persona reserva como invitada con datos mínimos;
6. Client y Booking se crean o reactivan atómicamente; retirar bloquea altas nuevas y conserva reservas existentes;
7. la opción legacy de cuenta con contraseña permanece temporalmente en el contrato público como rollback;
8. A0.6-A permite reclamar después una reserva con sesión Clerk mediante un vínculo `Client.userId`, sin Membership CUSTOMER.

A0.6-B/C/D todavía no implementan un recorrido Clerk público posterior a reserva ni autoservicio de cliente.

WhatsApp público [C2](../features/WHATSAPP_C2_FRONTEND.md), aprobado por el propietario sobre [C1 aprobado](../features/WHATSAPP_C1_CONTRATO.md), con prueba física satisfactoria confirmada por el propietario en [activación C3](../features/WHATSAPP_C3_ACTIVACION.md), cerrado/aprobado explícitamente por el propietario: tras crear la reserva se muestra «Tu reserva quedó registrada». Solo si el teléfono publicado del slug actual tiene `+` explícito y cumple la validación estricta se presenta una explicación previa y un único enlace «Abrir WhatsApp» en pestaña nueva. PublicMiniSite ya no abre automáticamente; renderiza el mismo SuccessView, con dominio y mensaje genérico fijos, sin datos de la reserva en el texto. Teléfono inelegible omite enlace y auxiliar. El clic no repite el POST, confirma Booking ni acredita envío/entrega. El API conserva `whatsappBaseUrl` legacy sin que la acción lo consuma. Bloqueo del navegador conserva el resultado y la opción de reintentar el enlace; no se promete detectar ni sortear ese bloqueo. CMS/H5 mantienen sus contratos y estado.

Medios/Promociones [C1–C3](../features/MEDIOS_PROMOCIONES_C3_ACTIVACION.md) están cerrados/aprobados: el editor privado gestiona imágenes, galería/portada y promociones editoriales; el mini-sitio recibe solo proyección publicada y localizadores propios. C3 no activa producción. Notificaciones [C1–C3](../features/NOTIFICACIONES_C3_ACTIVACION.md) están cerradas/aprobadas para cinco eventos de correo con opt-in, historial y reintento; el canal permanece pausado y sin operación productiva.

## 6. Facturación interna

1. OWNER, ADMIN, RECEPTIONIST y BARBER completan una Booking CONFIRMED sin esperar a `endTime`; esta transición no depende de la hora de la cita ni de la duración del servicio;
2. una Invoice interna toma el snapshot de `Service.price` y queda única por Booking;
3. un Payment completo único registra método, `paidAt` y actor;
4. listados y acciones se aíslan por tenant y, para BARBER, por Professional vinculado;
5. Analytics atribuye ingresos por `Payment.paidAt`.

No es facturación fiscal y no incluye anulaciones, reembolsos, pagos parciales o comisiones.

## 7. Visión futura: ampliaciones del mini-sitio y elección de pago

La base C3 de mini-sitio, CTA y reserva descrita en la sección 5 está cerrada/aprobada. Medios editoriales y correo transaccional alcanzaron después las aprobaciones indicadas arriba. Las ampliaciones siguientes son una dirección de producto **no implementada** y no sustituyen los flujos ni contratos vigentes:

1. ampliar Configuración/CMS con horarios editables y branding adicional; cualquier descuento ejecutable exige contrato financiero separado de las promociones editoriales actuales;
2. extender el recorrido actual después de los datos mínimos con una elección de pago en local o transferencia;
3. pago en local crea la reserva sin cobro confirmado;
4. transferencia muestra cuentas habilitadas del tenant y admite un comprobante pendiente de verificación, sin crear automáticamente un `Payment`.

La relación entre reserva, retención de horario, comprobante, verificación, pago anticipado, Invoice y propina necesita un contrato futuro. El Payment completo único vigente no se usa como estado pendiente. El correo automático con Resend ya existe en el alcance aprobado y pausado de Notificaciones; la acción operativa manual `wa.me` editable por el personal sigue siendo futura y distinta de la acción pública de §5. Cualquier mensaje debe representar el estado real de Booking. Ver la [visión histórica](../features/CONFIGURACION_CMS_PAGOS_VISION.md) y el [roadmap actualizado](../quality/AUDITORIA_INTEGRAL_2026_09_24.md).

## 8. Flujo de entrega

Cada capacidad pasa por definición de producto/UX, arquitectura/seguridad, backend, aprobación, frontend, QA, checkpoint y auditoría. Consultar [`DELIVERY_GATES.md`](../quality/DELIVERY_GATES.md). Una etapa incompleta no autoriza la siguiente.
