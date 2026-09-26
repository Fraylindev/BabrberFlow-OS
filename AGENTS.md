# AGENTS.md — Gobierno de Kortek Booking

Estas reglas son obligatorias en todo el repositorio. Las instrucciones más cercanas al archivo trabajado añaden reglas específicas:

- Frontend: [`apps/web/AGENTS.md`](apps/web/AGENTS.md)
- Backend: [`apps/api/AGENTS.md`](apps/api/AGENTS.md)

[`docs/README.md`](docs/README.md) es la entrada universal al sistema documental. Usar [`$kortek-delivery`](.agents/skills/kortek-delivery/SKILL.md) en cualquier entrega; para frontend usar además [`$kortek-product-ui`](.agents/skills/kortek-product-ui/SKILL.md).

## 1. Fuentes de verdad

Antes de proponer o modificar:

1. leer [`docs/README.md`](docs/README.md) y [`PROJECT_MASTER.md`](PROJECT_MASTER.md);
2. inspeccionar el código real;
3. leer los documentos especializados aplicables;
4. revisar [`CHANGELOG.md`](CHANGELOG.md) y [`BACKEND_CHANGES.md`](BACKEND_CHANGES.md) cuando aporten contexto.

El código prueba qué existe. `PROJECT_MASTER.md` define el estado y las decisiones vigentes. Los historiales explican cómo se llegó allí, pero no revocan una regla vigente.

No inventar endpoints, campos, permisos, datos, métricas, estados ni integraciones. Si código y documentación difieren, identificar la contradicción antes de avanzar y corregirla dentro del alcance autorizado.

## 2. Flujo obligatorio de entrega

Toda capacidad de producto sigue este orden:

1. **Definición de producto y UX:** usuario, problema, resultado, roles, privacidad, lenguaje, estados y criterios de aceptación.
2. **Contrato, arquitectura y seguridad:** datos, permisos, multi-tenancy, integraciones, errores y riesgos.
3. **Backend:** implementación, pruebas y contrato documentado.
4. **Aprobación explícita del backend.**
5. **Frontend:** consumo del contrato aprobado, sin mocks ni endpoints inventados.
6. **QA funcional y visual real.**
7. **Auditoría y aprobación explícita del propietario.**

No iniciar una etapa posterior por inferencia. Un commit o push significa solamente “implementado / en revisión”.

Aplicar los gates de [`docs/quality/DELIVERY_GATES.md`](docs/quality/DELIVERY_GATES.md). Las skills conducen el proceso; las reglas autoritativas permanecen en Markdown neutral.

## 3. Seguridad e integridad

- Kortek Booking es multi-tenant. Todo dato de negocio debe quedar aislado por `organizationId` obtenido del contexto autenticado.
- Un recurso ajeno debe comportarse como inexistente cuando corresponda; no exponer su existencia.
- La autorización real vive en backend. Ocultar botones nunca sustituye Guards, roles ni consultas tenant-scoped.
- `User` es identidad global; `Membership` relaciona usuario, organización y rol.
- No hardcodear ni versionar secretos, tokens, contraseñas o archivos `.env`.
- No registrar PII, notas privadas ni secretos en AuditLog o logs técnicos.
- No degradar validaciones, tipos o transacciones para hacer pasar una entrega.
- No usar datos ficticios que aparenten capacidades o métricas reales.
- Aplicar [`docs/quality/SECURITY_STANDARD.md`](docs/quality/SECURITY_STANDARD.md) cuando el alcance toque autenticación, roles, sesiones, endpoints públicos o PII.

Correctivo de perfil propio y aislamiento de Profesionales: **IMPLEMENTADO / EN REVISIÓN**, con publicación autorizada por el propietario el 2026-08-30. BARBER conserva la edición pública propia A1 (`name`, `bio`, `avatar`, `specialty`, `experienceYears`) y puede editar su `phone` privado en `PATCH /professionals/me`. Tenant e identidad proceden exclusivamente del contexto autenticado; estado, publicación, vínculo, IDs y rol no son editables por esta ruta. Se normalizan espacios, los opcionales admiten `null` y el nombre no admite vacío ni `null`. El teléfono propio no amplía directorios, perfiles ajenos ni rutas públicas. “Gestionar mi perfil” reúne edición y disponibilidad; la UI desmonta su estado al cambiar usuario, organización o rol e ignora efectos tardíos mediante una instancia única por visita, también en A → B → A y al salir de la pantalla. El menú común dice “Facturación”, sin cambiar el alcance propio BARBER dentro de la pantalla. La publicación comprende este correctivo y el botón del propietario “Usar otra cuenta” en onboarding, auditado sin ampliar autenticación ni contratos. No cierra Profesionales ni Facturación-B y no autoriza otro módulo.

## 4. Alcance y cambios

- Trabajar únicamente en el módulo y etapa autorizados.
- No hacer refactors oportunistas ni modificar dependencias, Prisma o contratos fuera de alcance.
- Preservar cambios ajenos y detenerse si el árbol contiene trabajo no relacionado que no pueda aislarse.
- Usar `pnpm`; no ejecutar instalaciones si no cambian dependencias.
- Mantener sincronizados código, contratos, estado y documentación.

## 5. Calidad y validación

Los gates están en [`docs/quality/DELIVERY_GATES.md`](docs/quality/DELIVERY_GATES.md) y la terminación completa en [`docs/quality/DEFINITION_OF_DONE.md`](docs/quality/DEFINITION_OF_DONE.md).

Reglas mínimas:

- Un comando solo cuenta si termina con exit code `0`.
- TypeScript, lint, pruebas y build no sustituyen QA funcional.
- **Una compilación limpia no aprueba una interfaz.** La UI requiere navegador, responsive, permisos, estados, consola y evidencia real.
- Los errores esperados del API deben convertirse en lenguaje útil para el usuario. No mostrar nombres de constraints, códigos Prisma, stack traces ni jerga técnica.
- No declarar aprobado o cerrado sin aprobación explícita del propietario.

## 6. Git y checkpoints

La rama autorizada es `ai/antigravity-qa`.

Antes de modificar:

```bash
git branch --show-current
git status
```

Detenerse si la rama no coincide o existen cambios ajenos no aislables.

Antes de publicar:

```bash
git status
git diff --check
git diff --stat
git diff
```

- Hacer staging por rutas explícitas; no usar `git add .` ni `git add -A` a ciegas.
- Revisar `git diff --cached --check`, `--stat` y el diff staged completo.
- Publicar solo un alcance coherente, validado, con QA aplicable y documentación vigente.
- Push únicamente a `origin/ai/antigravity-qa`.
- Prohibidos merge/push a `main`, force-push, reescritura de historial y descarte de trabajo ajeno sin autorización.
- Verificar SHA local = SHA remoto y reportar el estado final.

## 7. Protocolo de relevo y pausa

Si falta tiempo, contexto, acceso o validación para terminar con seguridad:

1. detenerse en un punto estable; no dejar una migración, contrato o flujo parcialmente aplicado;
2. registrar qué se completó y qué quedó pendiente;
3. indicar intención y criterio de la solución;
4. listar archivos/áreas afectados y estado exacto de Git;
5. registrar comandos ejecutados y resultados reales;
6. explicar el siguiente paso preciso y cómo validarlo;
7. sincronizar los documentos de control dentro del alcance;
8. si se publica, marcar inequívocamente el checkpoint como **PAUSADO / INCOMPLETO**, nunca como candidato final ni aprobado.

## 8. Mapa documental

- Entrada universal: [`docs/README.md`](docs/README.md)
- Estado y decisiones vigentes: [`PROJECT_MASTER.md`](PROJECT_MASTER.md)
- Producto vigente: [`docs/product/PRD.md`](docs/product/PRD.md) y [`docs/product/APP_FLOWS.md`](docs/product/APP_FLOWS.md)
- Arquitectura y modelo: [`docs/architecture/TRD.md`](docs/architecture/TRD.md) y [`docs/architecture/DATA_MODEL.md`](docs/architecture/DATA_MODEL.md)
- Estándar de producto: [`docs/product/PRODUCT_STANDARD.md`](docs/product/PRODUCT_STANDARD.md)
- Estándar frontend: [`docs/product/FRONTEND_STANDARD.md`](docs/product/FRONTEND_STANDARD.md)
- Patrones UI: [`docs/product/UI_PATTERNS.md`](docs/product/UI_PATTERNS.md)
- Definition of Done: [`docs/quality/DEFINITION_OF_DONE.md`](docs/quality/DEFINITION_OF_DONE.md)
- Gates y seguridad: [`docs/quality/DELIVERY_GATES.md`](docs/quality/DELIVERY_GATES.md) y [`docs/quality/SECURITY_STANDARD.md`](docs/quality/SECURITY_STANDARD.md)
- Contratos backend: [`BACKEND_CHANGES.md`](BACKEND_CHANGES.md)
- Historial cronológico: [`CHANGELOG.md`](CHANGELOG.md)
- Snapshots históricos: [`docs/history/`](docs/history/)
