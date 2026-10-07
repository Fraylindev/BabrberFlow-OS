# Flujos de aplicación — Kortek Booking

C2 posterior, 2026-10-07: web local exclusivamente de invitado, portal B2C retirado y respuesta pública sólo `{booking}`; campos de cuenta eliminados coordinadamente de API/web. Validado localmente/en revisión; C3 no ejecutado. [Contrato, evidencia y límites](../features/RESERVA_INVITADO_C2_LOCAL.md). Los checkpoints anteriores se conservan como historia.

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

1. OWNER/ADMIN crean una invitación local tenant-scoped; F0-D/1A autoriza siete días por defecto, conservando entrada explícita 1–30, y siete días nuevos desde cada reenvío. Backend 1A aprobado expresamente por el propietario, implementación local; crear equivalente no cambia el plazo existente;
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

## 5. Reserva pública de invitado — decisión 2026-10-07

Flujo oficial: mini-sitio → reservar → servicio → profesional → fecha/hora → nombre/teléfono/correo opcional → revisión → resultado PENDING. No se crea ni autentica cuenta. Client conserva contacto y vínculo con reservas del negocio. Cambios/cancelaciones se solicitan al negocio con sus contactos existentes. Correo/opt-in es independiente de identidad y no acredita entrega; WhatsApp es manual. Sin enlaces privados nuevos ni consulta pública de historial.

C0/C1 retira backend B2C; C2 no iniciado deja todavía componentes y rutas web del alcance anterior. No desplegar esta combinación como candidato final. [Contrato y límites](../features/RESERVA_INVITADO_C0_C1.md).

**Antecedentes M1/M2:** el recorrido numerado y párrafos siguientes conservan contexto previo; las menciones de crear cuenta, claims y autoservicio quedan revocadas por esta decisión.

1. `/{slug}` presenta solo la revisión CMS publicada: nombre, descripción, teléfono y ubicación opcionales; consume por separado la proyección pública de medios aprobada cuando está disponible;
2. `/public/:slug/booking-data` entrega esa proyección, catálogo, profesionales públicos mínimos y la fecha mínima calculada en la zona del negocio, sin UUID de Organization. F0-D/2A añade `timeZone` técnico en la raíz: backend aprobado e integrado en web localmente/en revisión; confirmación/éxito presentan el instante autoritativo con Hoy/Ayer/Mañana y año según ese negocio, sin mostrar el identificador de zona;
3. M1 C2 aprobado por el propietario: el enlace «Reservar cita» abre `/{slug}/reservar`, también con acceso directo y regreso al mini-sitio. La nueva visita relee el catálogo/publicación; foco y revisión/POST revalidan selección. Inexistente, inactivo, borrado o retirado recibe una presentación neutra;
4. cinco pasos: servicio, profesional, fecha/hora, datos y revisión. «Cualquiera disponible» muestra el candidato del slot antes del POST; uno solo queda seleccionado explícitamente. Calendario D6-B consume `availability-days` en rangos inclusivos ≤31, conserva los días sin disponibilidad deshabilitados y ofrece únicamente slots diarios en un select compacto. Fecha mínima, horario efectivo, protección concurrente e instante UTC proceden del API;
5. el navegador reenvía ese instante sin reinterpretarlo según su zona y la persona reserva como invitada con datos mínimos;
6. Client y Booking se crean o reactivan atómicamente; retirar bloquea altas nuevas y conserva reservas existentes;
7. M2 C2 etapa 1 local, implementado/en revisión: la intención de crear cuenta permanece secundaria y desmarcada dentro de Datos. Correo sigue opcional para invitado; al optar se requiere para la continuidad posterior. El POST invitado omite `password` y `createAccount`. La cuenta se crea después con Clerk y código por correo; los indicadores legacy de D8 no determinan el estado de cuenta. D11 vuelve a Datos sin borrar el borrador ni revelar existencia de contactos;
8. A0.6-A permite reclamar después una reserva con sesión Clerk mediante un vínculo `Client.userId`, sin Membership CUSTOMER.

M2 [C2 etapa 1](../quality/M2_C2_CIERRE.md) integra localmente el contrato C1 aprobado: entradas secundarias de cuenta, alta con nombre/código por correo, entrada/recuperación, salida confirmada, claim explícito desde el éxito, Próximas/Historial por negocio con cursor, detalle, perfil propio y nueva reserva con catálogo/horario vigente. El claim solo anuncia visibilidad después de una lectura autorizada. Nombre/teléfono son del contacto en ese negocio; correo es de solo lectura. Un rol interno sin vínculo no concede acceso. La pérdida de permiso o cambio de identidad/negocio/rol vacía la visita y descarta respuestas tardías. POST/PATCH inciertos conservan en memoria el mismo comando y UUID hasta 24 h; no se reenvían automáticamente ni se genera otra clave para comprobar el mismo envío. Cancelación/reprogramación y política pertenecen a etapa 2. C2 no está aprobado ni publicado; Clerk/correo reales y QA física quedan para C3.

Autorización posterior M1 C2: frontend cerrado/aprobado expresamente por el propietario, con aclaración «No hay condiciones, sigue adelante». Commit/push autorizados solo a `origin/ai/antigravity-qa`, sin despliegue. C3/QA física mantienen autorización independiente.

El éxito M1 usa el resultado real `PENDING`, fotos publicadas elegibles o respaldo, fecha natural común y próximos pasos sin prometer confirmación/correo/pago. Vive en memoria; exportación local opcional `TENTATIVE` con instantes autoritativos, sin datos de contacto ni IDs operativos. Timeout/5xx tras POST informa incertidumbre y permite regresar, sin reenvío automático; 409 pide nueva hora y 429 respeta el plazo. No hay pago ni instrumentación del embudo. [Evidencia y límites de C2](../quality/RESERVA_PUBLICA_M1_C2_CIERRE.md); C2 aprobado expresamente, sin autorizar C3/QA física, que requieren desplegar primero el API QA.

WhatsApp público [C2](../features/WHATSAPP_C2_FRONTEND.md), aprobado por el propietario sobre [C1 aprobado](../features/WHATSAPP_C1_CONTRATO.md), con prueba física satisfactoria confirmada por el propietario en [activación C3](../features/WHATSAPP_C3_ACTIVACION.md), cerrado/aprobado explícitamente por el propietario: tras crear la reserva se muestra «Tu reserva quedó registrada». Solo si el teléfono publicado del slug actual tiene `+` explícito y cumple la validación estricta se presenta una explicación previa y un único enlace «Abrir WhatsApp» en pestaña nueva. M1 C2 conserva el helper y SuccessView en la ruta de reserva; no abre automáticamente, mantiene dominio/mensaje genéricos fijos y excluye datos de la reserva del texto. Teléfono inelegible omite enlace y auxiliar. El clic no repite el POST, confirma Booking ni acredita envío/entrega. El API conserva `whatsappBaseUrl` legacy sin que la acción lo consuma. Bloqueo del navegador conserva el resultado y la opción de reintentar el enlace; no se promete detectar ni sortear ese bloqueo. CMS/H5 mantienen sus contratos y estado.

Medios/Promociones [C1–C3](../features/MEDIOS_PROMOCIONES_C3_ACTIVACION.md) están cerrados/aprobados: el editor privado gestiona imágenes, galería/portada y promociones editoriales; el mini-sitio recibe solo proyección publicada y localizadores propios. C3 no activa producción. Notificaciones [C1–C3](../features/NOTIFICACIONES_C3_ACTIVACION.md) están cerradas/aprobadas para cinco eventos de correo con opt-in, historial y reintento; el canal permanece pausado y sin operación productiva.

## 6. Facturación interna

1. OWNER, ADMIN, RECEPTIONIST y BARBER completan una Booking CONFIRMED sin esperar a `endTime`; esta transición no depende de la hora de la cita ni de la duración del servicio;
2. una Invoice interna toma el snapshot de `Service.price` y queda única por Booking; F0-C aprobado para publicación QA elimina la espera hasta el fin programado, conservando COMPLETED;
3. un Payment completo único registra método, `paidAt` y actor; F0-C permite cobrar también antes del horario, con fecha real del servidor;
4. listados y acciones se aíslan por tenant y, para BARBER, por Professional vinculado;
5. Analytics atribuye ingresos por `Payment.paidAt`.

No es facturación fiscal y no incluye anulaciones, reembolsos, pagos parciales o comisiones.

[F0-C](../quality/CORRECTIVO_F0C.md) tiene backend aprobado y autorización expresa de commit/push y despliegue QA. La operación anticipada del personal no añade un flujo público de pagos al reservar ni un estado pendiente de verificación.

## 7. Visión futura: ampliaciones del mini-sitio y elección de pago

La base C3 de mini-sitio, CTA y reserva descrita en la sección 5 está cerrada/aprobada. Medios editoriales y correo transaccional alcanzaron después las aprobaciones indicadas arriba. Las ampliaciones siguientes son una dirección de producto **no implementada** y no sustituyen los flujos ni contratos vigentes:

1. ampliar Configuración/CMS con horarios editables y branding adicional; cualquier descuento ejecutable exige contrato financiero separado de las promociones editoriales actuales;
2. extender el recorrido actual después de los datos mínimos con una elección de pago en local o transferencia;
3. pago en local crea la reserva sin cobro confirmado;
4. transferencia muestra cuentas habilitadas del tenant y admite un comprobante pendiente de verificación, sin crear automáticamente un `Payment`.

La relación entre reserva, retención de horario, comprobante, verificación, pago anticipado, Invoice y propina necesita un contrato futuro. El Payment completo único vigente no se usa como estado pendiente. El correo automático con Resend ya existe en el alcance aprobado y pausado de Notificaciones; la acción operativa manual `wa.me` editable por el personal sigue siendo futura y distinta de la acción pública de §5. Cualquier mensaje debe representar el estado real de Booking. Ver la [visión histórica](../features/CONFIGURACION_CMS_PAGOS_VISION.md) y el [roadmap actualizado](../quality/AUDITORIA_INTEGRAL_2026_09_24.md).

## 8. Flujo de entrega

Cada capacidad pasa por definición de producto/UX, arquitectura/seguridad, backend, aprobación, frontend, QA, checkpoint y auditoría. Consultar [`DELIVERY_GATES.md`](../quality/DELIVERY_GATES.md). Una etapa incompleta no autoriza la siguiente.

## Enmienda 2026-10-07

El recorrido M2 anterior queda como antecedente revocado: reserva solo de invitado, sin cuenta ni contraseña. M2 C3/P4/P5 cancelados. [Enmienda vinculante](../quality/DECISIONES_PROPIETARIO_2026_09_29.md); autenticación interna intacta.
