# AGENTS.md — Frontend

Aplica a todo `apps/web/**` y complementa el [`AGENTS.md`](../../AGENTS.md) raíz.

## Antes del código

1. Usar [`$kortek-delivery`](../../.agents/skills/kortek-delivery/SKILL.md) y obligatoriamente [`$kortek-product-ui`](../../.agents/skills/kortek-product-ui/SKILL.md).
2. Comprobar [`DELIVERY_GATES.md`](../../docs/quality/DELIVERY_GATES.md) y definir usuario, objetivo, roles, privacidad, lenguaje, estados, responsive y criterios de aceptación.
3. Leer [`PRODUCT_STANDARD.md`](../../docs/product/PRODUCT_STANDARD.md), [`FRONTEND_STANDARD.md`](../../docs/product/FRONTEND_STANDARD.md) y [`UI_PATTERNS.md`](../../docs/product/UI_PATTERNS.md).
4. Auditar componentes, hooks, query keys y contratos existentes antes de crear otros.
5. Detenerse si el backend aprobado no expone lo necesario; no usar mocks permanentes ni inventar endpoints.

## Implementación

- Next.js App Router, React y TypeScript estricto.
- Usar React Query para estado remoto siguiendo los patrones existentes.
- Centralizar HTTP en `apps/web/lib/api.ts`; no crear clientes paralelos sin justificación.
- Aislar caché por tenant, rol, usuario y recurso cuando los datos o permisos difieran.
- La UI refleja permisos, pero nunca sustituye autorización backend.
- Minimizar PII por rol y evitar propagar datos privados a componentes que no los necesitan.
- Reutilizar design system y variables `--dash-*`; no introducir dependencias UI por comodidad.
- Implementar loading, empty, empty filtrado, error, success y estados disabled/pending aplicables.
- Traducir errores esperados a acciones o mensajes comprensibles. No mostrar jerga del API.
- Mostrar horarios con lenguaje natural del negocio; IANA, UTC, offsets y conversiones permanecen internos.
- Mantener responsive desde móvil pequeño hasta desktop; evitar tablas rotas y overflow horizontal.
- Asegurar labels, foco, teclado, contraste, semántica y anuncios de error/estado.

## Validación

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web lint
pnpm --filter web build
```

Después, hacer QA real en navegador según [`DEFINITION_OF_DONE.md`](../../docs/quality/DEFINITION_OF_DONE.md): desktop y móvil, roles, estados, errores backend, consola, navegación, accesibilidad básica y evidencia. Una build limpia no aprueba la interfaz.
