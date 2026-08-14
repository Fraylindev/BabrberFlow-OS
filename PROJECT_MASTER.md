# PROJECT_MASTER.md — Verdad vigente de Kortek Booking

Actualizado: 2026-08-13. Este documento describe el producto y el estado actual. El historial completo anterior a G0 se preserva en [`docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md`](docs/history/PROJECT_MASTER_LEGACY_2026-08-13.md).

## 1. Visión

Kortek Booking es un SaaS multi-tenant para operar barberías y salones: organización, equipo, profesionales, servicios, clientes, reservas y facturación. Se construye como producto comercial real, con seguridad backend, datos legítimos, UX responsive y entregas auditables por módulo.

Kortek Studio es la empresa; Kortek Booking es este producto.

## 2. Fuentes de verdad

1. El código real demuestra qué está implementado.
2. Este documento define estado, decisiones activas, riesgos y próximo paso.
3. [`BACKEND_CHANGES.md`](BACKEND_CHANGES.md) documenta contratos y sus cambios.
4. [`CHANGELOG.md`](CHANGELOG.md) conserva el historial cronológico.
5. [`docs/history/`](docs/history/) conserva snapshots; no define comportamiento vigente.

Gobierno y estándares:

- [`docs/README.md`](docs/README.md)
- [`AGENTS.md`](AGENTS.md)
- [`docs/product/PRD.md`](docs/product/PRD.md)
- [`docs/product/APP_FLOWS.md`](docs/product/APP_FLOWS.md)
- [`docs/product/PRODUCT_STANDARD.md`](docs/product/PRODUCT_STANDARD.md)
- [`docs/product/FRONTEND_STANDARD.md`](docs/product/FRONTEND_STANDARD.md)
- [`docs/product/UI_PATTERNS.md`](docs/product/UI_PATTERNS.md)
- [`docs/architecture/TRD.md`](docs/architecture/TRD.md)
- [`docs/architecture/DATA_MODEL.md`](docs/architecture/DATA_MODEL.md)
- [`docs/quality/SECURITY_STANDARD.md`](docs/quality/SECURITY_STANDARD.md)
- [`docs/quality/DELIVERY_GATES.md`](docs/quality/DELIVERY_GATES.md)
- [`docs/quality/DEFINITION_OF_DONE.md`](docs/quality/DEFINITION_OF_DONE.md)

## 3. Arquitectura vigente

### Monorepo

- pnpm + Turborepo.
- `apps/api`: NestJS, Prisma y PostgreSQL.
- `apps/web`: Next.js App Router, React, TypeScript, Tailwind y React Query.
- Cliente HTTP web central: `apps/web/lib/api.ts`.

### Identidad y tenants

- `Organization` es el tenant.
- `User` es identidad global.
- `Membership` relaciona User × Organization × Role.
- Roles internos: `OWNER`, `ADMIN`, `RECEPTIONIST`, `BARBER`.
- `CUSTOMER` pertenece al flujo B2C y no accede al dashboard interno.
- JWT + Passport + bcryptjs; el login recibe email y contraseña, no `organizationId`.

### Seguridad

- Todo dato de negocio debe aislarse por `organizationId` en la consulta autoritativa.
- Guards y roles backend son el límite real; la UI solo representa permisos.
- Recurso ajeno e inexistente comparten respuesta cuando revelar existencia sería un riesgo.
- AuditLog es fail-open en los flujos donde ya se adoptó y no debe guardar PII.
- La estrategia de autenticación vigente es propia; [`ADR-001`](docs/decisions/ADR-001-authentication-strategy.md) registra un riesgo crítico confirmado y propone Security A0 sin modificar todavía el sistema.

### Frontend

- Dashboard con tema claro basado en `--dash-*`.
- React Query gestiona datos remotos y sus query keys deben aislar tenant/rol/usuario cuando cambie el alcance.
- Las pantallas deben cubrir loading, empty, error, pending y success, además de responsive y accesibilidad básica.
- Una build limpia no aprueba una interfaz: se exige QA real en navegador.

## 4. Estado de módulos

| Orden | Módulo | Estado vigente | Checkpoint / nota |
| --- | --- | --- | --- |
| 1 | Reservas | **CERRADO / APROBADO** | Funcional aprobado `9a30f2abb37857dbbbf15e34df1cbaec576121b6`; A0 transversal aprobado `8964c981223ba3f4a1e780103cbc0d20e4c602eb` |
| 2 | Clientes | **CERRADO / APROBADO** | Backend `18a3605329ad0ce708a44ac8fcd5db1dd1665732`; módulo cerrado `c0764e9a98e3876339152763bf9b0fc98fe43aae` |
| 3 | Profesionales A1 Backend | **CERRADO / APROBADO** | `60919ee94eb27f628906c9b86ce7a43b2fa09237` |
| 3 | Profesionales Frontend general | **IMPLEMENTADO / EN REVISIÓN** | CRUD, permisos, responsive y búsqueda; todavía no aprobado |
| 3 | Profesionales A2 Backend | **CERRADO / APROBADO** | Disponibilidad individual `ad633e9864e6e20869d0db248861f01b935d5a6f` |
| 3 | Profesionales A2 Frontend | **IMPLEMENTADO / EN REVISIÓN** | Candidato `75b35f7f6fdd69a18e3fcede8fcaf4f39e57f06b` |
| 3 | Módulo Profesionales | **NO CERRADO / NO APROBADO** | Pendiente de auditoría y aprobación frontend |
| 4 | Servicios | **NO INICIADO en el ciclo modular vigente** | No autorizado mientras Profesionales siga abierto |
| 5–8 | Facturación, Equipo, Configuración, Analytics | **PENDIENTES** | Seguir orden modular y auditoría previa |
| 9 | Resumen / Dashboard | **CONGELADO** | Se revisa al final como agregador |

G0 es un checkpoint exclusivamente documental de gobierno. No cambia el estado funcional ni aprueba Frontend A2.

Estado de G0: **IMPLEMENTADO / EN REVISIÓN**. G0.1 corrige y completa sus fuentes como checkpoint documental candidato; ninguno de los dos es aprobación funcional de un módulo.

## 5. Decisiones activas de dominio

### Reservas y facturación

- Booking y Payment/Invoice son conceptos separados.
- Completar una reserva no significa cobrarla.
- Reservas no crea ni gestiona pagos.
- No se eliminan físicamente reservas; se usa ciclo de estados.
- La base PostgreSQL impide solapamientos operativos concurrentes para un mismo profesional y excluye `CANCELLED`.

### Profesionales y servicios

- Professional usa `ACTIVE`, `INACTIVE`, `ARCHIVED`; archivar no es hard-delete.
- Operaciones que ocupan agenda y archivo comparten un bloqueo PostgreSQL tenant-scoped.
- Cualquier profesional activo puede realizar cualquier servicio activo de su organización en esta fase.
- `ProfessionalService` no bloquea reservas; queda reservado para capacidades futuras.
- No implementar imágenes/Cloudinary ni páginas individuales sin autorización.

### Disponibilidad individual

- `Organization.timeZone` es la zona IANA autoritativa; el valor inicial actual es `America/Santo_Domingo`.
- Disponibilidad efectiva = horario global ∩ horario individual − bloqueos activos − reservas operativas.
- Cero turnos individuales significa heredar el horario global.
- Bloqueos usan timestamps con `Z` u offset explícito, estado `ACTIVE/CANCELLED` y nota interna.
- Cambios que afectarían reservas futuras abiertas devuelven `409`.
- La disponibilidad pública nunca expone notas o motivos internos.
- IANA, UTC, offsets y conversiones son detalles internos. La UI debe presentar fechas y horas naturales en el contexto del negocio.

### Autenticación

- La implementación actual usa JWT propio de un día en `localStorage` y revalida Membership en cada request.
- `POST /organizations` es público; `GET /organizations/by-slug/:slug` expone el ID; `/auth/register` acepta `organizationId` y crea Membership OWNER.
- Esa composición permite escalamiento de privilegios sobre un tenant existente y es un riesgo crítico abierto.
- Recuperación, verificación de correo, MFA, refresh rotativo y revocación general de sesiones no existen; los límites actuales son locales al proceso, no distribuidos.
- La recomendación vigente es endurecer autenticación propia en Security A0 antes de evaluar una migración de proveedor. No hay cambio de autenticación autorizado durante G0.1.

### Clientes y privacidad

- Clientes inactivos se excluyen por defecto; reservas internas no pueden usarlos.
- Una reserva pública válida puede reactivar al cliente dentro de la misma transacción.
- No existe todavía vínculo `Client ↔ User CUSTOMER`; sigue pendiente para historial/autoservicio B2C.
- Respuestas públicas y proyecciones BARBER minimizan PII y nunca exponen notas internas.

## 6. Proceso vigente

El orden obligatorio es:

```text
Producto y UX → contrato/arquitectura → Backend → aprobación Backend
→ Frontend → QA funcional/visual → auditoría → aprobación explícita
```

Cada módulo comienza con auditoría. No avanzar por el mero hecho de que exista un push. Los checkpoints remotos son evidencia revisable, no aprobación.

## 7. Riesgos y límites conocidos

- **Autenticación / OWNER:** el onboarding público acepta un tenant elegido por el cliente y puede conceder OWNER sobre una Organization existente. Ver [`ADR-001`](docs/decisions/ADR-001-authentication-strategy.md). Requiere Security A0 tras auditoría de G0.1.
- JWT en `localStorage`, falta de recuperación/verificación/MFA/revocación general y rate limiting no distribuido amplían el riesgo de cuenta y sesión.
- Frontend general y A2 de Profesionales siguen pendientes de aprobación; el módulo no puede cerrar todavía.
- `Organization.timeZone` existe en persistencia/contratos de disponibilidad, pero todavía no hay UI/endpoint autorizado de configuración general.
- El vínculo B2C `Client ↔ User CUSTOMER` no está implementado.
- Servicios, imágenes y Cloudinary requieren auditoría y decisiones propias; no adelantar.
- Configuración productiva de CORS, URLs y secretos depende del entorno y debe validarse antes de despliegue.
- El historial contiene decisiones revocadas válidas en su fecha; nunca debe usarse como estado actual sin contrastar este documento y el código.

## 8. Próximo paso autorizado

1. Auditar el checkpoint documental G0.1; G0 continúa **EN REVISIÓN**.
2. Después de aprobación explícita de G0.1, la siguiente etapa propuesta es **Security A0**, siguiendo el ADR y sus gates.
3. Mantener Frontend A2 de Profesionales en revisión, sin corregirlo ni cerrarlo dentro de G0.1.
4. No iniciar Servicios ni cambios funcionales durante este checkpoint.

## 9. Política de lenguaje y evidencia

- La UI habla de tareas y consecuencias, no de Prisma, SQL, constraints o códigos internos.
- La UI nunca muestra identificadores IANA, UTC, offsets o detalles de conversión; usa fechas, horas y explicaciones naturales.
- Los errores esperados del API se traducen a mensajes útiles y seguros.
- Toda afirmación de QA indica entorno, rol, acción y resultado real.
- TypeScript, lint, tests y build son necesarios cuando aplican, pero no sustituyen revisión funcional/visual.
