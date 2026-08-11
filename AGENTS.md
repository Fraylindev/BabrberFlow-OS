# AGENTS.md — Kortek Booking

> Instrucciones obligatorias para cualquier agente de IA o desarrollador asistido por IA que trabaje en este repositorio.

## 1. Rol esperado

Actúas como **Senior Full-Stack + Product Engineer** sobre **Kortek Booking**, un SaaS multi-tenant comercial para barberías y salones.

No estás construyendo una demo, un prototipo desechable ni una interfaz ficticia. Todo cambio debe priorizar:

- arquitectura limpia;
- seguridad;
- multi-tenancy;
- mantenibilidad;
- escalabilidad;
- UX real;
- coherencia de producto;
- compatibilidad entre backend y frontend;
- documentación sincronizada.

Stack principal:

- Monorepo: **pnpm + Turborepo**
- Backend: **NestJS + Prisma + PostgreSQL**
- Frontend: **Next.js + React + TypeScript + Tailwind**
- Auth: **JWT propio + Passport**
- Estado servidor frontend: **React Query**
- Cliente HTTP frontend: **`apps/web/lib/api.ts`**

---

# 2. Fuentes de verdad y orden de autoridad

Antes de proponer o modificar código, inspecciona:

1. **Código real del repositorio**
2. `PROJECT_MASTER.md`
3. `BACKEND_CHANGES.md`
4. `CHANGELOG.md`

El código real determina qué existe hoy.

La documentación determina:
- decisiones vigentes;
- contratos aprobados;
- restricciones de alcance;
- historial;
- decisiones de producto.

## Regla crítica

**Nunca asumas que algo existe solo porque aparece en una idea, roadmap, documento histórico o conversación anterior. Verifica primero el código real.**

Si existe contradicción entre código y documentación:

1. no inventes una reconciliación;
2. identifica la inconsistencia;
3. reporta cuál fuente está desactualizada;
4. corrige la documentación dentro de la misma entrega si el cambio forma parte del alcance.

No dejes documentación contradictoria después de una entrega.

---

# 3. Prohibición de inventar

No inventes:

- endpoints;
- DTOs;
- modelos;
- campos;
- relaciones;
- estados;
- permisos;
- reglas de negocio;
- respuestas API;
- métricas;
- datos;
- ratings;
- actividad;
- comportamiento de backend;
- integraciones;
- dependencias.

Si algo no existe o no está claro:

- inspecciona primero;
- si sigue sin estar definido, indícalo explícitamente;
- no simules una solución permanente.

No uses mocks para fingir que una capacidad de producción existe.

---

# 4. Metodología obligatoria por módulos

El proyecto se desarrolla **módulo por módulo**.

Orden vigente:

1. Reservas
2. Clientes
3. Profesionales
4. Servicios
5. Facturación
6. Equipo
7. Configuración / negocio
8. Analytics
9. Resumen

## Flujo obligatorio por módulo

### A. Auditoría / diagnóstico

Antes de programar:

- inspecciona backend;
- inspecciona frontend;
- inspecciona schema Prisma;
- inspecciona DTOs;
- inspecciona contratos existentes;
- inspecciona permisos;
- identifica dependencias;
- identifica deuda o bloqueos.

No empieces directamente a implementar.

### B. Entrega A — Backend

Primero se implementa y valida backend.

Debe quedar:

- contrato claro;
- multi-tenancy correcto;
- autorización backend;
- DTOs validados;
- reglas de negocio;
- tests;
- documentación actualizada.

**No se inicia frontend hasta aprobación explícita de la Entrega A.**

### C. Entrega B — Frontend

Solo después de backend aprobado.

Frontend debe:

- consumir contratos reales;
- no inventar campos ni endpoints;
- respetar roles;
- manejar loading / empty / error / success;
- ser responsive;
- mostrar errores reales del backend;
- no reemplazar autorización del servidor.

### D. QA manual y aprobación

Una entrega frontend **no queda cerrada solo porque compile**.

Debe existir QA funcional real en navegador cuando aplique.

Solo después de aprobación explícita se pasa al siguiente módulo.

---

# 5. Estado actual del proyecto

## Reservas

- Entrega A Backend: implementada y ajustada.
- Entrega B Frontend: implementada.
- UX de fecha/hora y responsive móvil: en proceso de cierre.
- QA manual: **pendiente de aprobación final**.
- Reservas **NO debe considerarse oficialmente cerrada todavía** hasta completar QA y recibir aprobación explícita.

## Clientes

**No autorizado todavía.**

No iniciar auditoría ni implementación de Clientes hasta que Reservas sea aprobada oficialmente.

## Resumen / Dashboard

Está **congelado** como módulo funcional agregador.

No agregar:

- KPIs;
- gráficos;
- métricas;
- widgets;
- nuevas agregaciones;
- datos parciales;
- mocks.

Resumen se revisará al final, cuando los módulos que lo alimentan estén completos.

---

# 6. Arquitectura y reglas técnicas inamovibles

## Multi-tenancy

Kortek Booking es multi-tenant.

`Organization` representa cada tenant.

Regla obligatoria:

**Todo dato de negocio debe estar aislado por `organizationId`.**

Todo query que opere sobre datos de una organización debe filtrar por el tenant correspondiente.

Nunca:

- busques por `id` y luego verifiques el tenant aparte si puede hacerse en el mismo `where`;
- confíes en un `organizationId` enviado libremente por frontend cuando debe venir del token/contexto;
- expongas existencia de registros pertenecientes a otra organización.

Para recursos ajenos a otro tenant, usar el mismo comportamiento que para recurso inexistente cuando corresponda.

---

# 7. Identidad y autenticación

Arquitectura vigente:

- `User` = identidad global;
- `Membership` = relación User × Organization × Role;
- un usuario puede pertenecer a varias organizaciones.

No asumir que `User` tiene directamente:

- `organizationId`;
- `role`.

El login vigente no recibe `organizationId` en el body.

Autenticación:

- JWT;
- Passport;
- bcryptjs.

No implementar Supabase Auth.

No implementar Refresh Tokens sin autorización explícita.

---

# 8. Roles y permisos

Roles principales:

- `OWNER`
- `ADMIN`
- `RECEPTIONIST`
- `BARBER`
- `CUSTOMER`

Roles internos B2B:

- `OWNER`
- `ADMIN`
- `RECEPTIONIST`
- `BARBER`

`CUSTOMER` pertenece al flujo B2C y **nunca debe acceder al dashboard interno**.

## Regla de seguridad

La UI puede ocultar acciones según rol.

Pero:

**la seguridad real siempre debe vivir en backend.**

Nunca reemplaces `RolesGuard` / `@Roles()` con lógica frontend.

---

# 9. Reglas actuales del dominio Reservas

Estas reglas son vigentes:

- Reserva y Pago/Factura son conceptos separados.
- Completar una reserva no significa que fue cobrada.
- Reservas no debe manejar `Payment`.
- El dinero cobrado pertenece a Facturación.
- Propinas no son ingreso del servicio.
- No se eliminan físicamente reservas en esta etapa.
- El ciclo de vida se maneja mediante estados.
- Estados soportados actualmente incluyen:
  - `PENDING`
  - `CONFIRMED`
  - `CANCELLED`
  - `COMPLETED`
  - `NO_SHOW` si está soportado por el código actual.

## ProfessionalService

Regla vigente:

**Cualquier profesional activo de una organización puede realizar cualquier servicio activo de esa misma organización en esta fase.**

`ProfessionalService`:

- no bloquea reservas actualmente;
- puede conservarse para capacidades futuras;
- puede servir más adelante para:
  - precio específico;
  - comisión específica;
  - restricciones opcionales.

No reintroducir validaciones bloqueadoras basadas en `ProfessionalService` sin decisión explícita de producto.

---

# 10. Reglas de Facturación

Facturación debe mantenerse separada de Reservas.

Debe contemplar en su módulo correspondiente:

- pagos completos;
- pagos parciales;
- deuda;
- propinas;
- transferencias;
- comprobantes;
- validación de pagos.

No adelantar estas capacidades dentro de Reservas.

No implementar `Payment` fuera del módulo autorizado.

---

# 11. Servicios e imágenes

`Service` pertenece a `Organization`.

No pertenece al profesional que lo creó.

La futura gestión de imagen de servicios debe permitir:

- archivo desde PC;
- galería del móvil;
- cámara del móvil cuando el navegador lo permita;
- preview;
- reemplazar;
- eliminar;
- loading;
- error;
- success.

No guardar imágenes en Base64 dentro de PostgreSQL como solución de producción.

Cloudinary fue considerado previamente como opción probable, pero:

**no implementar almacenamiento de imágenes ni Cloudinary sin autorización explícita y revisión del estado real del backend.**

---

# 12. Frontend y UX/UI

El dashboard debe mantener:

- fondo claro;
- diseño moderno;
- limpio;
- profesional;
- responsive;
- variables `--dash-*`.

No crear modales oscuros dentro del dashboard.

No construir CRUDs genéricos, planos o visualmente desconectados.

Toda pantalla debe contemplar:

- loading;
- empty;
- empty filtrado cuando aplique;
- error;
- success.

## Responsive

Debe funcionar desde móvil pequeño hasta desktop grande.

En móvil:

- evitar tablas rotas;
- evitar scroll horizontal cuando cards u otro patrón sean más claros;
- mantener acciones visibles y entendibles.

No ocultar funcionalidad necesaria solo para resolver responsive.

---

# 13. Frontend: reglas de implementación

- Next.js App Router.
- React + TypeScript estricto.
- React Query para datos remotos cuando el patrón existente lo utilice.
- `apps/web/lib/api.ts` es el punto central para el cliente HTTP.
- No crear clientes HTTP paralelos sin justificación.
- Usar el design system existente.
- En dashboard usar variantes compatibles con tema claro cuando corresponda.
- No introducir librerías UI nuevas sin necesidad real y autorización.
- No duplicar reglas de acciones entre tabla/cards/modales si pueden centralizarse.

---

# 14. Backend: reglas de implementación

- Un módulo NestJS por dominio cuando corresponda.
- DTOs con `class-validator`.
- `ValidationPipe` global vigente:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
- Autorización mediante Guards y decorators existentes.
- Prisma como capa de acceso a PostgreSQL.
- Mantener aislamiento multi-tenant en el mismo query siempre que sea posible.
- Traducir errores esperables de Prisma a respuestas HTTP claras cuando exista patrón establecido.
- No introducir hard-delete en datos operativos/financieros sin autorización.

---

# 15. Calidad de TypeScript

- TypeScript estricto.
- Evitar `as any`.
- No degradar tipos para hacer compilar.
- No silenciar ESLint sin justificar la causa.
- No usar casts para ocultar errores de contrato.
- Preferir tipos reales derivados de DTOs/interfaces existentes.

Si aparece un error de tipos:

**corrige la causa, no el síntoma.**

---

# 16. Tests

Preferir tests que validen comportamiento real de negocio.

Evitar mocks frágiles que solo demuestren que “se llamó una función”.

Los tests deben cubrir cuando aplique:

- multi-tenancy;
- autorización;
- conflictos;
- estados;
- validaciones;
- errores;
- contratos.

Si un test depende del cliente Prisma generado y el entorno no puede generarlo:

- reportar la limitación;
- no declarar falsamente que pasó;
- no usar stubs temporales como evidencia final de producción salvo que se indique explícitamente como diagnóstico.

---

# 17. Validaciones mínimas obligatorias

## Backend

Ejecutar:

```bash
pnpm --filter api exec tsc --noEmit
pnpm --filter api lint
pnpm --filter api test
```

Cuando aplique:

```bash
pnpm lint
pnpm build
```

## Frontend

Ejecutar:

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web lint
pnpm --filter web build
```

## Regla

Un comando con Exit distinto de `0` **NO cuenta como validación exitosa**.

Si el fallo es ambiental:

- reportarlo;
- explicar la causa;
- corregir el entorno si es razonable;
- volver a ejecutar.

No declarar “código limpio” como sustituto de un comando requerido que falló.

---

# 18. QA manual

Cuando la entrega involucre frontend o flujo funcional:

compilar no es suficiente.

Debe probarse en navegador cuando aplique:

- desktop;
- tablet;
- móvil;
- estados de datos;
- acciones;
- permisos;
- formularios;
- errores backend;
- consola;
- responsive;
- overflow;
- navegación;
- accesibilidad básica.

No declarar módulo cerrado sin QA real cuando el módulo requiere interacción de usuario.

---

# 19. Documentación obligatoria

Toda entrega funcional debe mantener sincronizados:

- `PROJECT_MASTER.md`
- `CHANGELOG.md`
- `BACKEND_CHANGES.md` cuando exista impacto o corrección de contratos/backend

## PROJECT_MASTER.md

Debe reflejar:

- estado real;
- decisiones vigentes;
- módulos cerrados;
- módulos pendientes;
- riesgos;
- limitaciones;
- QA pendiente.

## CHANGELOG.md

Debe registrar cambios realmente implementados.

## BACKEND_CHANGES.md

Debe reflejar contratos vigentes.

Puede conservar historial, pero:

**nunca debe dejar una regla histórica presentada como comportamiento actual si fue revocada posteriormente.**

Si una regla cambió:

- documentar que existió;
- documentar cuándo fue revocada;
- dejar inequívoca la regla vigente.

No avanzar código si los documentos quedan desfasados.

---

# 20. Uso de pnpm

Este proyecto usa pnpm.

Preferir:

```bash
pnpm exec ...
pnpm --filter ...
pnpm <script>
```

Evitar `npx`.

No ejecutar `pnpm install` innecesariamente durante correcciones que no cambian dependencias.

Si ejecutas instalación:

- verificar `package.json`;
- verificar `apps/*/package.json`;
- verificar `pnpm-lock.yaml`;
- confirmar que no hubo cambios accidentales.

No modificar dependencias fuera de alcance.

---

# 21. Manejo de dependencias

Antes de agregar una dependencia:

1. comprobar que el problema no esté resuelto con utilidades existentes;
2. justificar por qué la dependencia es necesaria;
3. evaluar impacto en bundle / backend / mantenimiento;
4. obtener autorización si amplía arquitectura o alcance.

No instalar paquetes “por comodidad”.

No modificar `package.json` o lockfile sin necesidad real.

---

# 22. Archivos fuera de alcance

No tocar archivos ajenos al módulo actual salvo que exista una dependencia técnica directa y justificada.

Antes de entregar:

- revisar `git diff`;
- identificar todos los archivos tocados;
- explicar cualquier archivo fuera del alcance principal.

No hacer refactors oportunistas mientras se corrige otra cosa.

---

# 23. Sitio público `/[slug]`

La visión futura es convertir `/[slug]` en un mini-sitio comercial por barbería.

Puede incluir en fases futuras:

- hero;
- galería;
- catálogo;
- profesionales;
- promociones;
- horarios;
- información;
- pagos;
- integraciones.

Pero:

**visión futura no significa funcionalidad implementada.**

No construir estas capacidades hasta llegar al módulo/fase correspondiente.

---

# 24. Datos y métricas

No inventar:

- ingresos;
- ratings;
- reviews;
- actividad;
- estadísticas;
- tendencias;
- ocupación;
- conversiones;
- clientes;
- citas;
- métricas.

La UI solo puede mostrar datos que el backend entregue o que puedan derivarse legítimamente de datos reales disponibles.

No usar placeholders que aparenten datos reales de negocio.

---

# 25. Seguridad

Nunca:

- hardcodear secretos;
- hardcodear credenciales;
- exponer passwords;
- confiar en autorización frontend;
- omitir `organizationId`;
- relajar guards para “hacer funcionar” una vista;
- devolver datos de otra organización;
- deshabilitar validaciones globales.

Si una instrucción puede comprometer seguridad o integridad de datos:

**detente y repórtalo antes de implementarla.**

---

# 26. Cómo actuar ante un bloqueo

Si frontend necesita un endpoint o dato que backend no expone:

**detente.**

Reporta:

1. qué necesita el frontend;
2. qué existe realmente;
3. qué falta en backend;
4. qué contrato propondrías;
5. por qué es necesario.

No simules el backend con mocks permanentes.

No agregues datos ficticios para “terminar” la pantalla.

---

# 27. Cómo revisar trabajo de otros agentes

Nunca aprobar una entrega solo por el reporte del agente.

Verificar:

- alcance;
- archivos tocados;
- endpoints reales;
- reglas de negocio;
- multi-tenancy;
- permisos;
- TypeScript;
- tests;
- lint;
- build;
- documentación;
- QA manual;
- consola;
- responsive.

Si un agente dice “entrega cerrada”, eso **no significa que esté aprobada**.

La aprobación final del módulo depende del propietario del proyecto.

---

# 28. Formato esperado al proponer cambios

Antes de implementar una entrega significativa, presentar:

1. diagnóstico;
2. problema real;
3. propuesta;
4. archivos a tocar;
5. impacto backend/frontend;
6. riesgos;
7. plan de validación.

Después de implementar, reportar:

1. resumen de cambios;
2. archivos modificados;
3. decisiones técnicas;
4. contratos afectados;
5. tests;
6. comandos ejecutados;
7. resultados reales;
8. limitaciones;
9. documentación actualizada;
10. QA pendiente.

No usar frases como “100% terminado” si aún falta QA manual o aprobación.

---

# 29. Convención de idioma

- Código: nombres en inglés.
- DTOs / interfaces / funciones / variables: inglés.
- Documentación técnica del proyecto: español.
- Reportes al propietario del proyecto: español.
- Mensajes de UI: según el idioma definido por el producto.

---

# 30. Principio rector

Antes de escribir código:

**inspecciona.**

Antes de asumir:

**verifica.**

Antes de ampliar alcance:

**detente.**

Antes de declarar terminado:

**valida.**

Kortek Booking se construye como producto comercial real, no como demo.
