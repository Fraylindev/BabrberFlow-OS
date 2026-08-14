# ADR-001 — Estrategia de autenticación

- Estado: **PROPUESTO / pendiente de auditoría G0.1**
- Fecha: 2026-08-13
- Alcance: diagnóstico y recomendación; no modifica autenticación.

## Contexto confirmado

El código vigente implementa identidad global (`User`), pertenencia/rol por tenant (`Membership`) y JWT propio:

- [`OrganizationsController`](../../apps/api/src/organizations/organizations.controller.ts) expone `POST /organizations` sin guard.
- `GET /organizations/by-slug/:slug` es público y [`OrganizationsService`](../../apps/api/src/organizations/organizations.service.ts) devuelve `{ id, name, slug }`.
- [`RegisterDto`](../../apps/api/src/auth/dto/register.dto.ts) acepta `organizationId` suministrado por el cliente.
- [`AuthService.register()`](../../apps/api/src/auth/auth.service.ts) usa ese ID para crear atómicamente User y Membership con rol `OWNER`.
- [`auth-context.tsx`](../../apps/web/lib/auth-context.tsx) compone esas rutas y guarda JWT/sesión en `localStorage`.

Un actor puede resolver o conocer un ID de Organization y solicitar `/auth/register` con ese valor para obtener OWNER. La atomicidad evita una Membership parcial, pero no autoriza legítimamente la concesión. Es un riesgo crítico de escalamiento de privilegios y toma de tenant.

## Controles actuales y límites

- bcryptjs y contraseña mínima vigente.
- JWT firmado con expiración de un día.
- `JwtStrategy` revalida Membership en cada request: borrar Membership o cambiar rol surte efecto inmediato.
- Login/register tienen límites por IP mediante Nest Throttler.
- Login y cambio de contraseña tienen contador por cuenta.

Los límites usan memoria del proceso; no coordinan réplicas y se pierden al reiniciar. No hay recuperación de contraseña, verificación de correo, MFA, refresh token rotativo, registro de sesiones ni revocación general de un token robado mientras la Membership siga vigente. Logout solo elimina almacenamiento local.

## Opciones

| Opción | Ventajas | Costes y riesgos | Ajuste actual |
| --- | --- | --- | --- |
| Autenticación propia endurecida | Conserva User/Membership, contratos Nest y control tenant; permite corregir primero el escalamiento confirmado | Kortek mantiene recuperación, verificación, MFA, sesiones, revocación y defensa contra abuso | Mejor opción inmediata para Security A0 por menor cambio simultáneo |
| Clerk | Capacidades administradas de sesión, verificación, recuperación y MFA; buen soporte B2B | Migración de identidades/sesiones, dependencia de proveedor y reconciliación entre Organizations de Clerk y Organization/Membership del dominio | Evaluar después de cerrar el riesgo crítico y definir migración |
| Supabase Auth | Identidad administrada y cercanía al ecosistema PostgreSQL; recuperación/verificación disponibles | Integración con Nest/JWT actual, mapeo de identidad y posible duplicación conceptual con autorización de dominio; RLS no sustituye Guards existentes | No recomendado como cambio inmediato |

## Recomendación

Mantener y endurecer la autenticación propia durante **Security A0**. No migrar proveedor a la vez que se corrige la concesión OWNER: mezclar ambos cambios aumenta superficie, rollback y riesgo de bloqueo de usuarios.

Después de Security A0, abrir un ADR de implementación con métricas operativas y requisitos de recuperación/MFA. Si el producto prioriza delegar esas capacidades, Clerk es el candidato administrado preferente para evaluación; Supabase Auth no ofrece una ventaja suficiente sobre el modelo Nest + Membership actual para justificar la migración inmediata.

Esta recomendación no autoriza implementación ni descarta una migración futura.

## Security A0 propuesto

1. **Onboarding autoritativo:** sustituir la composición pública por un comando transaccional que cree Organization, User y primera Membership OWNER sin aceptar un tenant preexistente elegido por el cliente.
2. **Registro:** impedir que `/auth/register` conceda OWNER a un `organizationId` arbitrario; definir compatibilidad y retiro seguro del contrato actual.
3. **Slug público:** eliminar el ID interno de la proyección pública cuando el consumidor no lo necesite; resolver el tenant por slug dentro del backend.
4. **Verificación:** verificar posesión del email antes de habilitar privilegios sensibles o completar onboarding.
5. **Recuperación:** tokens de un solo uso, hash persistido, expiración corta, invalidación al uso y respuesta anti-enumeración.
6. **Sesiones:** access token corto y sesión/refresh rotativo revocable; mover credenciales persistentes fuera de `localStorage` hacia cookie `HttpOnly`, `Secure` y `SameSite` con protección CSRF acorde.
7. **Revocación:** cerrar sesiones por usuario/tenant/familia, invalidar ante cambio de contraseña y conservar revalidación de Membership.
8. **MFA:** diseño y primera capacidad para OWNER/ADMIN, con recuperación segura y auditoría; alcance exacto requiere decisión de producto.
9. **Abuso distribuido:** rate limiting y contadores compartidos entre réplicas para login, onboarding, registro, recuperación y verificación.
10. **Auditoría y pruebas:** no guardar secretos/PII; cubrir escalamiento OWNER, enumeración, tenant, replay, revocación, límites distribuidos y concurrencia.

## Gates de Security A0

- Threat model y contratos aprobados antes de código.
- Estrategia de migración/rollback que no bloquee cuentas existentes.
- Backend e integración real aprobados antes de cambios frontend.
- QA con onboarding, login, logout, revocación, recuperación y roles.
- Revisión independiente antes de considerarlo cerrado.

Aplican [`SECURITY_STANDARD.md`](../quality/SECURITY_STANDARD.md) y [`DELIVERY_GATES.md`](../quality/DELIVERY_GATES.md).

## Fuera de alcance de G0.1

- Cambiar endpoints, DTOs, Prisma, dependencias, almacenamiento JWT o proveedor.
- Implementar Security A0.
- Corregir Frontend A2, cerrar Profesionales o iniciar Servicios.
