# Definition of Done — Kortek Booking

Una entrega está lista para checkpoint candidato solo si cumple las secciones aplicables.

## 1. Producto y UX

- Usuario, problema, resultado y no-alcance definidos.
- Roles, privacidad y lenguaje aprobados o inequívocos.
- Estados loading/empty/error/success y responsive definidos.
- Criterios de aceptación observables documentados.

## 2. Contrato y arquitectura

- Código y contratos existentes auditados.
- Multi-tenancy, autorización, PII y errores definidos.
- Integraciones, transacciones, concurrencia y compatibilidad evaluadas.
- No hay endpoints, campos ni datos inventados.

## 3. Backend, cuando aplique

- DTOs, proyecciones, roles y consultas tenant-scoped correctos.
- Reglas de negocio y errores HTTP cubiertos.
- AuditLog sin PII y garantías de atomicidad/concurrencia aplicables.
- Tests de comportamiento, permisos, tenant, privacidad y conflictos.

```bash
pnpm --filter api exec tsc --noEmit
pnpm --filter api lint
pnpm --filter api test
```

Prisma/migraciones/integración PostgreSQL se validan cuando el alcance las toca.

## 4. Frontend, cuando aplique

- Usa contrato aprobado, cliente HTTP y componentes existentes.
- Caché aislada por tenant/rol/usuario cuando corresponde.
- Estados completos, errores útiles y privacidad por rol.
- Responsive y accesibilidad básica implementados.

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web lint
pnpm --filter web build
```

**Estos comandos no aprueban la interfaz.**

## 5. QA real

- Flujo principal, edición y errores verificados con datos reales/controlados.
- Permisos y mínima exposición comprobados por rol.
- Desktop y móvil pequeño sin overflow ni acciones inaccesibles.
- Loading, empty, filtrado, error, pending y success comprobados cuando aplican.
- Consola sin errores ni advertencias relevantes.
- Foco, teclado, labels y navegación básica revisados.
- Evidencia registrada con entorno, rol, acciones y resultado; no solo “se ve bien”.

Si falta QA aplicable, la entrega no se publica como candidato final.

## 6. Documentación y Git

- `PROJECT_MASTER.md` refleja el estado vigente.
- `CHANGELOG.md` registra el cambio real.
- `BACKEND_CHANGES.md` se actualiza solo si cambia o aclara contrato.
- No quedan contradicciones vigentes ni archivos ajenos.
- `git diff --check`, diff completo y staged revisados.
- Staging por rutas explícitas, commit descriptivo y push solo a `origin/ai/antigravity-qa`.
- SHA local/remoto coinciden y estado final reportado.

El push significa **implementado / en revisión**, nunca aprobación.

## 7. Pausa segura

Si no se puede completar:

- detenerse antes de dejar una invariante rota o una entrega a medias;
- dejar estado, intención, archivos, validaciones y pendientes exactos;
- indicar el próximo comando/archivo/criterio para continuar;
- sincronizar controles;
- publicar únicamente si el propietario lo autorizó y marcar el checkpoint **PAUSADO / INCOMPLETO**.
