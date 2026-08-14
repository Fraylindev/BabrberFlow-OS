# Flujos de aplicación — Kortek Booking

Este mapa describe fronteras reales del producto. Los detalles ejecutables pertenecen al código y los contratos vigentes a [`BACKEND_CHANGES.md`](../../BACKEND_CHANGES.md).

## 1. Fundación pública de organización — riesgo vigente

Flujo actual confirmado:

1. la web crea una Organization mediante `POST /organizations` sin autenticación;
2. recibe su `id` y llama `POST /auth/register` con ese `organizationId`;
3. backend crea User y Membership `OWNER` en una transacción;
4. la web inicia sesión y guarda el JWT en `localStorage`.

Además, `GET /organizations/by-slug/:slug` resuelve públicamente el ID interno. La composición permite solicitar rol OWNER sobre un `organizationId` suministrado por el cliente. Es un riesgo abierto documentado en [`ADR-001`](../decisions/ADR-001-authentication-strategy.md); G0.1 no lo corrige.

## 2. Inicio y cierre de sesión

1. login recibe email y contraseña;
2. backend resuelve la Membership activa, emite JWT con tenant/rol y devuelve organización mínima;
3. web guarda sesión/JWT en `localStorage` y adjunta Bearer token;
4. cada request autenticado revalida que la Membership siga existiendo;
5. logout local elimina el token del navegador.

No existen todavía recuperación de cuenta, verificación de correo, MFA, refresh token rotativo ni revocación general de sesiones. El límite por IP y el bloqueo por cuenta usan almacenamiento local al proceso.

## 3. Reserva pública

1. el slug identifica el negocio sin exponer notas o datos internos;
2. catálogo y disponibilidad usan servicios/profesionales activos y disponibilidad efectiva;
3. la persona selecciona servicio, horario y aporta los datos mínimos requeridos;
4. Client y Booking se crean o reactivan atómicamente;
5. la respuesta pública es una proyección mínima sin PII interna.

La interfaz presenta horas del negocio de forma natural. La zona y conversión técnica se resuelven internamente y nunca se muestran como identificadores IANA, UTC u offsets.

## 4. Operación interna

1. el JWT determina User, Membership, rol y organización activa;
2. Guards y consultas tenant-scoped limitan cada operación;
3. el frontend muestra solo acciones autorizadas, sin sustituir la protección backend;
4. React Query debe separar caché cuando tenant, usuario o rol cambien el alcance;
5. errores esperados se convierten en mensajes útiles sin detalles internos.

Los contratos y matrices concretas se auditan por módulo; este mapa no concede permisos nuevos.

## 5. Flujo de entrega

Cada capacidad pasa por definición de producto/UX, arquitectura/seguridad, backend, aprobación, frontend, QA, checkpoint y auditoría. Consultar [`DELIVERY_GATES.md`](../quality/DELIVERY_GATES.md). Una etapa incompleta usa el protocolo de relevo y no autoriza la siguiente.
