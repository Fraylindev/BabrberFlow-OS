# AGENTS.md — Backend

Aplica a todo `apps/api/**` y complementa el [`AGENTS.md`](../../AGENTS.md) raíz.

## Antes del código

1. Confirmar la definición de producto y UX que origina el contrato.
2. Auditar schema Prisma, migraciones, DTOs, controladores, servicios, roles, multi-tenancy, AuditLog, integraciones y pruebas.
3. Definir contrato, errores, transacciones, privacidad, compatibilidad y criterios de aceptación antes de implementar.
4. No iniciar frontend; el backend requiere validación y aprobación explícita primero.

## Implementación

- NestJS por dominio, DTOs con `class-validator` y TypeScript estricto.
- Conservar `ValidationPipe` global con whitelist y rechazo de campos no permitidos.
- Obtener `organizationId` del token/contexto y aplicarlo en la consulta autoritativa.
- Usar Guards y `@Roles()`; no confiar en datos o permisos enviados por frontend.
- Usar proyecciones explícitas de respuesta; no devolver objetos Prisma con campos internos por comodidad.
- Traducir errores de dominio/Prisma a HTTP estable y documentado, sin filtrar detalles internos.
- Diseñar transacciones y garantías PostgreSQL para invariantes concurrentes; una consulta previa aislada no garantiza atomicidad.
- Mantener AuditLog fail-open cuando ese sea el patrón, sin PII ni valores privados.
- No hard-delete datos operativos o financieros sin decisión explícita.
- Si cambia el contrato, actualizar [`BACKEND_CHANGES.md`](../../BACKEND_CHANGES.md) y consumidores autorizados.

## Pruebas y validación

Cubrir comportamiento, no solo llamadas: tenant, IDOR, roles, estados, duplicados, errores, privacidad, atomicidad y concurrencia cuando aplique.

```bash
pnpm --filter api exec tsc --noEmit
pnpm --filter api lint
pnpm --filter api test
```

Ejecutar validaciones Prisma, migraciones o integración PostgreSQL cuando el alcance las requiera. Un fallo ambiental debe reportarse y repetirse tras corregir el entorno; nunca contarlo como éxito.
