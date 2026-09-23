# Configuración/CMS — C0: auditoría y brief de producto

Nota posterior: el propietario fijó D1–D6 y autorizó C1 completo, con parada antes de C2/C3. El [contrato C1](CONFIGURACION_CMS_C1_CONTRATO.md) contiene las decisiones vigentes y su evidencia; las etiquetas de propuesta/no autorización del cuerpo siguiente describen el checkpoint C0 histórico.

Nota posterior 2026-09-14 — H8: la [auditoría comparativa posterior a CMS](ROADMAP_POST_CMS_AUDITORIA.md) reconcilia la documentación de WhatsApp: existe apertura pública legacy hacia el negocio; la capacidad operativa con plantillas editables sigue siendo futura. El API entrega `whatsappBaseUrl` y la web conserva base fija sin consumirlo. Se mantiene el hallazgo histórico de §9 y la divergencia técnica pendiente de alcance; no se inició el C0 de WhatsApp ni se modificó código.

Fecha: 2026-09-12. Estado: **C0 COMPLETADO / EN REVISIÓN DEL PROPIETARIO**. C1, C2 y C3 no están iniciados ni aprobados.

## 1. Identificación, alcance y método

- Capacidad: identidad pública del negocio y preparación de su mini-sitio.
- Etapa autorizada en esta sesión: únicamente auditoría y brief C0 del [plan](CONFIGURACION_CMS_PLAN.md).
- Base inspeccionada: `22a27c499c58fe7405f1a8da304c11c8b08d0190`, rama `ai/antigravity-qa`; árbol inicialmente limpio y sincronizado con su tracking remoto.
- Propietario de las decisiones y del paso a C1: propietario de Kortek Booking.
- Entregable: documento hermano siguiendo [FEATURE_BRIEF_TEMPLATE.md](FEATURE_BRIEF_TEMPLATE.md). Se elige este archivo para conservar la secuencia C0–C3 del plan y distinguir evidencia, recomendaciones y decisiones pendientes. Las recomendaciones de acotar o ajustar fases no modifican el plan por sí mismas.
- Método: lectura estática de schema, migraciones, controladores, servicios, DTOs, consumidores web y pruebas existentes. No se consultó la base de datos ni se ejecutaron aplicaciones, pruebas funcionales, builds o migraciones. No se conoce la cantidad ni el contenido de Organizations reales; ningún default se presenta como horario confirmado de un negocio.

Las rutas de API que siguen son **existentes**, salvo que se indique expresamente propuesta. Los estados editoriales, límites y permisos futuros son **propuestas para aprobación**, no enums, columnas ni contratos ya implementados. C0 no define nuevas URLs de endpoints.

## 2. Inventario real: persistencia y fuentes

La fuente ejecutable es [schema.prisma](../../apps/api/prisma/schema.prisma), modelo `Organization`:

| Campo escalar | Tipo y restricciones actuales | Uso constatado |
| --- | --- | --- |
| `id` | String, UUID generado, PK | Tenant, relaciones y contexto autenticado; también se devuelve públicamente en booking-data |
| `name` | String obligatorio | Alta, bootstrap, panel y nombre público; no existe nombre editorial separado |
| `slug` | String obligatorio, único global | Alta, resolución pública, enlaces del panel y reclamación B2C |
| `email` | String obligatorio, único global | Correo de organización en el alta; distinto de User.email; lectura interna amplia |
| `phone` | String nullable | Contacto público actual y generación de enlace WhatsApp en web; no es Professional.phone |
| `address` | String nullable | Persistido y visible mediante findMine; no usado por la página pública |
| `googleMapsUrl` | String nullable | Igual: sin editor ni consumidor público actual |
| `aboutUs` | String nullable | Igual: no se representa en `/[slug]` |
| `heroImageUrl` | String nullable | Legacy de medios, sin contrato de edición/publicación |
| `socialLinks` | Json nullable | Sin esquema de claves/URLs validado para CMS |
| `businessHours` | Json nullable | Consumido por disponibilidad; solo reconoce una franja `{ open, close }` |
| `timeZone` | String, default `America/Santo_Domingo` | Autoridad de disponibilidad, rangos de Facturación y Analytics |
| `isActive` | Boolean, default true | El resolver público rechaza organizaciones inactivas |
| `createdAt` | DateTime, default now | Metadato interno |
| `updatedAt` | DateTime, actualización automática | Metadato; no existe control editorial de versión |
| `deletedAt` | DateTime nullable | Campo legacy; el resolver público no lo filtra |

Relaciones existentes de Organization: `memberships`, `professionals`, `clients`, `services`, `galleryImages`, `bookings`, `payments`, `invoices`, `professionalWeeklySchedules`, `professionalAvailabilityBlocks`, `teamInvitations`. No forman parte de un contenido CMS y `findMine` no las incluye por defecto. User sigue siendo global; Membership liga identidad, organización y rol.

Persistencia relacionada:

- [initial_schema](../../apps/api/prisma/migrations/20260719162646_initial_schema/migration.sql): índices únicos de slug/email.
- [microsite_and_indexes](../../apps/api/prisma/migrations/20260723212248_microsite_and_indexes/migration.sql): añade dirección, mapa, descripción, hero, redes, horario JSON y GalleryImage. GalleryImage contiene `id`, `organizationId`, `url`, `caption`, `order`, `createdAt`, con FK cascade; no aporta ownership de proveedor, validación de archivo, publicación ni texto alternativo contractual.
- [disponibilidad A2](../../apps/api/prisma/migrations/20260813193000_professional_individual_availability_a2/migration.sql): zona de Organization y disponibilidad individual. `ProfessionalWeeklySchedule` usa día y minutos de inicio/fin; `ProfessionalAvailabilityBlock` usa instantes, estado y nota interna. No son un calendario editorial del negocio.
- No hay estado borrador/publicado, instantáneas editoriales, alias/historial de slug, versión de publicación ni correo público separado en Organization. `isActive`, `deletedAt` y `updatedAt` no sustituyen esos conceptos.

## 3. Inventario real: API, consumidores y regresiones

### 3.1 Organización y autenticación

| Superficie | Código concreto | Comportamiento y consumidor |
| --- | --- | --- |
| `GET /organizations/mine` | [controller](../../apps/api/src/organizations/organizations.controller.ts), [findMine](../../apps/api/src/organizations/organizations.service.ts) | B2bAuthGuard + RolesGuard, cuatro roles B2B. Consulta por ID autenticado sin `select`; entrega todos los escalares de Organization, sin relaciones. [queries/invoices.ts](../../apps/web/lib/queries/invoices.ts) solo necesita `timeZone` |
| `GET /auth/clerk/me` | [clerk-me.controller.ts](../../apps/api/src/auth/clerk-me.controller.ts) | ClerkAuthGuard + cuatro roles B2B; reutiliza findMine, por tanto tiene la misma exposición amplia |
| `GET /auth/clerk/bootstrap` | [clerk-bootstrap.service.ts](../../apps/api/src/auth/clerk-bootstrap.service.ts) | Proyección de Organization `{ id, name, slug }` por Membership B2B. [auth-context.tsx](../../apps/web/lib/auth-context.tsx) obtiene aquí el negocio activo; no debe depender de datos editoriales privados |
| Alta Clerk | [DTO](../../apps/api/src/auth/dto/clerk-onboarding.dto.ts), [service](../../apps/api/src/auth/clerk-onboarding.service.ts), [setup](../../apps/web/app/dashboard/setup/page.tsx), [normalización web](../../apps/web/lib/organization-onboarding.ts) | `POST /auth/clerk/onboarding`: crea name/slug/email, User y Membership OWNER con auditoría transaccional; no admite edición CMS |
| Alta legacy | [register.dto.ts](../../apps/api/src/auth/dto/register.dto.ts), [auth.service.ts](../../apps/api/src/auth/auth.service.ts) | `/auth/register` permanece como rollback; agregado atómico, no editor de Organization |
| Slug | [organization-slug.ts](../../apps/api/src/auth/organization-slug.ts), [claims B2C](../../apps/api/src/auth/clerk-customer-claims.service.ts) | Normalización trim/minúsculas, 3–50 caracteres, letras/números y guiones intermedios. No hay lista de palabras reservadas en el normalizador. Claims usa slug + bookingId como localizadores |
| Equipo | [organizations.controller.ts](../../apps/api/src/organizations/organizations.controller.ts) y [service](../../apps/api/src/organizations/organizations.service.ts) | `mine/members`, `mine/team-members` y mutaciones de acceso son OWNER/ADMIN; pertenecen a Equipo/Profesionales, no a CMS |

No existe PATCH/PUT general de perfil, horario o zona de Organization. `POST /organizations` y `GET /organizations/by-slug/:slug` están retirados; las [E2E de Organization](../../apps/api/test/organizations.e2e-spec.ts) prueban esas rutas retiradas, no la ausencia de UUID en todos los endpoints públicos.

Los [guards B2B](../../apps/api/src/auth/guards/b2b-auth.guard.ts) y [Clerk](../../apps/api/src/auth/guards/clerk-auth.guard.ts) revalidan Membership/rol; sus consultas no convierten `Organization.isActive/deletedAt` en una política general de suspensión. El [ValidationPipe](../../apps/api/src/common/validation.config.ts) es el límite global para campos extra. [AuditService](../../apps/api/src/audit/audit.service.ts) ofrece `log` fail-open y `logTransactional` fail-closed: C1 debe escoger el patrón, no deducirlo de la existencia de ambos.

### 3.2 Horario y zona: operación existente

- [availability.util.ts](../../apps/api/src/public-booking/availability.util.ts), `resolveBusinessHours`: reconoce `{ open: "HH:mm", close: "HH:mm" }`, con inicio anterior a fin. Devuelve 09:00–19:00 ante null, forma incorrecta o franja inválida. La misma franja rige todos los días; genera candidatos cada 30 minutos que permitan terminar el servicio dentro del cierre. No representa cerrado por día, festivos, descansos globales, varias franjas diarias ni horario nocturno que cruce medianoche.
- [public-booking.service.ts](../../apps/api/src/public-booking/public-booking.service.ts), `getAvailability`: lee realmente `organization.businessHours` y `organization.timeZone` para generar y convertir candidatos.
- [professional-availability.service.ts](../../apps/api/src/professionals/professional-availability.service.ts), `loadContext`, `assertAvailableForBooking`, `buildResponse`: aplica horario global ∩ turnos individuales − bloqueos activos; ausencia de turnos hereda horario global. Las reservas operativas restan disponibilidad. La respuesta administrativa/propia incluye zona para cálculo interno, turnos y notas privadas; la consulta pública de bloqueos no selecciona notas.
- [bookings.service.ts](../../apps/api/src/bookings/bookings.service.ts): creación, reprogramación y recuperación futura validan disponibilidad en transacción. La coordinación existente usa bloqueo de Professional tenant-scoped, compartido con archivo/disponibilidad individual. Editar un horario global para todos los profesionales requeriría coordinar todas esas operaciones; la garantía actual no demuestra un editor global seguro.
- [invoices.service.ts](../../apps/api/src/invoices/invoices.service.ts), [analytics.service.ts](../../apps/api/src/analytics/analytics.service.ts) y [dashboard-summary.service.ts](../../apps/api/src/analytics/dashboard-summary.service.ts) calculan rangos/día según zona del negocio. Cambiarla alteraría filtros y agregaciones aunque no cambiasen timestamps persistidos.

### 3.3 Ruta pública y exposición actual

El [controller público](../../apps/api/src/public-booking/public-booking.controller.ts) resuelve tenant mediante slug, sin sesión B2B, con ThrottlerGuard. Expone:

| Ruta existente | Respuesta / regla relevante |
| --- | --- |
| `GET /public/:slug/booking-data` | Organization `{ id, name, slug, phone }`; servicios activos `{ id, name, description, duration, price }`; profesionales `ACTIVE + isPublic` `{ id, name, bio, avatar }`; además `whatsappBaseUrl`. Caché de servidor 15 s por URL |
| `GET /public/:slug/availability` | `{ date, serviceId, slots: [{ time, professionalId }] }`. Sin caché de servidor; límite 30/min/IP. Sin notas/motivos de bloqueo |
| `POST /public/:slug/bookings` | [respuesta mínima](../../apps/api/src/public-booking/dto/public-booking-response.dto.ts): booking con id, serviceId, professionalId, startTime, endTime, status; accountCreated/accountCreationError. Límite 5/min/IP. Client/Booking transaccionales; cuenta CUSTOMER legacy secundaria |

El resolver rechaza inexistente o `isActive=false`; no exige publicación editorial y no consulta `deletedAt` como condición. El UUID de Organization se expone pese a no usarse en el flujo web inspeccionado. Los identificadores de servicio/profesional/booking sí son localizadores del contrato de reserva y no se pueden eliminar por una regla general sin diseñar su reemplazo.

La página [app/[slug]/page.tsx](../../apps/web/app/%5Bslug%5D/page.tsx) es un asistente de reserva, no un mini-sitio: servicio → profesional/cualquiera → fecha/hora → contacto → cuenta opcional → confirmar. No hay galería, ubicación, descripción del negocio, promociones, publicación ni método de pago. `BookingHeader` muestra Organization.name; `SuccessView` recibe name/phone. [StepRouter](../../apps/web/app/%5Bslug%5D/_components/StepRouter.tsx) conserva los pasos actuales.

Los [hooks públicos](../../apps/web/lib/queries/public-booking.ts) aíslan claves por slug; booking-data tiene `staleTime` 60 s y disponibilidad 15 s. El [cliente HTTP](../../apps/web/lib/api.ts) omite auth en `/public/` y tipa Organization pública con UUID; un tipo reducido no elimina campos recibidos en Network. [ServicesService](../../apps/api/src/services/services.service.ts) vacía la caché al mutar catálogo; el servicio Professional inspeccionado no incorpora esa invalidación. C1/C3 necesitan una política explícita para contenido, estado y revocación de publicación.

Consumidores adicionales del nombre/slug: [Topbar](../../apps/web/components/dashboard/Topbar.tsx), [Sidebar](../../apps/web/components/dashboard/Sidebar.tsx), [Resumen](../../apps/web/app/dashboard/page.tsx) y [Equipo](../../apps/web/app/dashboard/team/page.tsx). Construyen identidad visual o enlace `/${organization.slug}`. [nav-items.ts](../../apps/web/components/dashboard/nav-items.ts) no contiene una entrada de Configuración. Reutilización futura: cliente HTTP, React Query, patrones de aislamiento de Profesionales/Equipo, Field, Button, Card y confirmaciones existentes; no crear estos elementos en C0.

### 3.4 Reconciliación obligatoria con BARBER

[UpdateOwnProfessionalDto](../../apps/api/src/professionals/dto/update-own-professional.dto.ts), [proyecciones](../../apps/api/src/professionals/dto/professional-response.dto.ts) y [updateMe](../../apps/api/src/professionals/professionals.service.ts) confirman `PATCH /professionals/me`: `name`, `bio`, `avatar`, `specialty`, `experienceYears` públicos de A1, más `phone` privado propio. La mutación final usa la pareja tenant/usuario autenticada; rechaza PATCH vacío, normaliza espacios y preserva nombre no vacío/no null y opcionales nullable. No acepta estado, publicación, vínculo, IDs, tenant o rol.

El CMS describe a **Organization**; no edita Professional ni User. Organization.phone, ya enviado al público, jamás se obtiene de Professional.phone ni del teléfono de una identidad. Las fotos de profesionales siguen siendo el avatar A1 existente, sin subida. Las descripciones del negocio no reemplazan bio, especialidad o experiencia individual. La visibilidad individual `isPublic` continúa bajo su contrato; publicar el negocio nunca activa ni publica perfiles. El editor del negocio no impone borrador/aprobación a las ediciones propias A1 que hoy se aplican directamente.

La proyección pública actual solo consume name/bio/avatar del Professional elegible; specialty/experienceYears siguen siendo campos públicos A1 de perfil pero no se envían en booking-data. Exponerlos en el mini-sitio requeriría autorización contractual, no se presupone.

## 4. Matrices de campos, visibilidad y roles

### 4.1 Lectura real hoy

`L` = lectura mediante endpoint B2B, no permiso de edición. Ninguno de los cuatro roles tiene una ruta general de edición CMS. El alcance amplio constatado no equivale a aprobación de privacidad.

| Campo Organization | Visibilidad actual | OWNER | ADMIN | BARBER | RECEPTIONIST |
| --- | --- | --- | --- | --- | --- |
| `id` | Interno y público en booking-data | L | L | L | L |
| `name` | Interno + público | L | L | L | L |
| `slug` | Interno + público/localizador | L | L | L | L |
| `email` | Interno, no público | L | L | L | L |
| `phone` | Interno + público | L | L | L | L |
| `address` | Interno | L | L | L | L |
| `googleMapsUrl` | Interno | L | L | L | L |
| `aboutUs` | Interno | L | L | L | L |
| `heroImageUrl` | Interno | L | L | L | L |
| `socialLinks` | Interno | L | L | L | L |
| `businessHours` | Interno; efecto público vía slots | L | L | L | L |
| `timeZone` | Interno; cálculo público, no campo de booking-data | L | L | L | L |
| `isActive` | Interno; condiciona acceso público | L | L | L | L |
| `createdAt` | Interno | L | L | L | L |
| `updatedAt` | Interno | L | L | L | L |
| `deletedAt` | Interno | L | L | L | L |

Professional.phone: OWNER/ADMIN lo reciben en gestión; BARBER solo en su perfil propio; RECEPTIONIST no lo recibe en directorio. Ninguna respuesta pública inspeccionada lo selecciona. Esto no otorga acceso al teléfono ajeno a BARBER.

### 4.2 Propuesta para C1–C3, pendiente de decisión D1–D3

`E` = editar borrador y leer/vista previa; `L` = lectura mínima; `—` = sin acceso CMS. OWNER publicaría/despublicaría; ADMIN prepararía borrador y preview. La alternativa de publicación por ADMIN requiere decisión del propietario. Todos pueden visitar contenido ya público como cualquier visitante, sin acceso a borradores.

| Dato / fuente | Visibilidad propuesta | OWNER | ADMIN | BARBER | RECEPTIONIST |
| --- | --- | --- | --- | --- | --- |
| Nombre público, inicialmente sugerido desde `name` | Solo versión publicada al visitante | E | E | — | — |
| Descripción, inicialmente desde `aboutUs` | Pública tras publicar; opcional | E | E | — | — |
| Contacto del negocio, inicialmente desde `phone` | Público tras revisión explícita; opcional | E | E | — | — |
| Dirección, inicialmente desde `address` | Pública tras publicar; opcional | E | E | — | — |
| Mapa, inicialmente desde `googleMapsUrl` | Enlace público validado tras publicar; opcional | E | E | — | — |
| `slug` vigente | Público, inmutable en estas fases | L | L | L actual | L actual |
| Nombre operativo `Organization.name` | Contexto interno actual; separado del borrador | L | L | L actual | L actual |
| `businessHours` efectivo | Lectura operativa; mostrar al público solo si se verifica como horario real | L | L | Sin nuevo acceso CMS | Sin nuevo acceso CMS |
| `timeZone` | Metadato técnico interno; texto humano “Hora del negocio” | L | L | Lectura operativa vigente | Lectura operativa vigente |
| `email` de Organization | Privado; no usar como correo público | Sin editor en C1–C3 | Sin editor en C1–C3 | Proponer retirarlo de respuesta general | Proponer retirarlo de respuesta general |
| `heroImageUrl`, `socialLinks`, galería | Excluidos de publicación CMS inicial | — | — | — | — |
| `id`, timestamps, `isActive`, `deletedAt` | Metadatos/controles internos, no editables desde CMS | — | — | — | — |
| Estado editorial y versión de borrador | Conceptos internos propuestos, no campos actuales | L | L | — | — |
| Publicar/despublicar | Acción editorial; sin cambiar estado operativo | Sí propuesto | No propuesto | No | No |

La minimización de `/organizations/mine` y `/auth/clerk/me` debe incluir una allowlist contractual campo por campo antes de C1. Debe preservar `timeZone` para Facturación y `{ id, name, slug }` en el bootstrap; no retirar datos necesarios por aplicar la regla de “sin UUID” a respuestas autenticadas. La lectura administrativa de email/metadatos no se amplía por esta matriz: queda para necesidad y aprobación explícitas.

## 5. Brief de producto y UX propuesto

Usuario principal: OWNER y gestión delegada ADMIN. Problema: hay columnas preparadas y una reserva pública funcional, pero no existe un editor con permisos mínimos ni separación entre guardar información y hacerla pública. Resultado: preparar identidad pública verificable, revisarla y publicarla deliberadamente sin alterar agenda, identidad o pagos.

### 5.1 Flujo editorial

1. Abrir Configuración del negocio en el tenant autenticado. Cargar contenido y versión autoritativos; distinguir “Sin publicar”, “Publicado” y “Cambios sin publicar” como estados de UX propuestos, sin afirmar enums existentes.
2. Editar datos de la tabla anterior. “Guardar borrador” no cambia el contenido visible al público ni Organization operativa. Name/phone legacy solo son sugerencias iniciales; nunca copiar correo privado, redes, hero o campos desconocidos a una respuesta pública.
3. “Vista previa” muestra la versión guardada exacta y su revisión, con rótulo “Vista previa — no visible para tus clientes”. Acceso autenticado OWNER/ADMIN tenant-scoped, sin enlace compartible ni token público en esta fase; respuesta privada `no-store`, sin indexación ni caché pública. No crea reservas, no abre WhatsApp ni dispara integraciones. El catálogo, si se muestra, sigue sus proyecciones vigentes y se identifica como información operativa que puede cambiar.
4. OWNER revisa el contenido público y confirma “Publicar cambios”. El servidor valida versión, actor y tenant de nuevo y cambia atómicamente la versión pública. Un borrador guardado posteriormente no modifica esa versión. Publicar repetidamente la misma revisión es idempotente.
5. Ante edición concurrente, no sobrescribir silenciosamente: “Hay cambios más recientes. Recarga y revisa antes de guardar”. Conservar temporalmente el texto local solo en el mismo contexto para comparación; no mezclarlo con otro usuario/tenant/rol.
6. “Retirar página pública” requiere confirmación de consecuencia. Propuesta: bloquear contenido CMS y nuevas reservas públicas de ese negocio, conservando operación interna y reservas existentes. Exige que todas las rutas públicas implicadas validen el mismo estado; esconder solo la página no basta. Esta consecuencia es decisión D3, no comportamiento implementado.

Un negocio inactivo no debe poder publicar ni admitir nuevas reservas públicas; contenido no publicado, tenant inexistente e inactivo reciben presentación pública neutra. `deletedAt` necesita política explícita. No convertir despublicación en desactivación de Organization ni borrar datos. No revertir a contenido legacy después de retirar una publicación.

### 5.2 Contenido y validación propuesta

| Entrada | Regla candidata para aprobar en C1 |
| --- | --- |
| Nombre público | Trim, 2–100 caracteres, no vacío/null; coherente con límite de alta, sin modificar Organization.name al guardar borrador |
| Descripción | Texto plano, trim, máximo 2000; null o blanco elimina el opcional; sin HTML/Markdown ejecutable |
| Teléfono público del negocio | Opcional, normalización canónica con 7–15 dígitos y `+` inicial cuando corresponda; revisión explícita de que es un contacto destinado al público. No copiar validación ni valor del teléfono privado Professional |
| Dirección | Texto plano opcional, trim, máximo 300; no geocodificación ni coordenadas nuevas |
| Mapa | URL HTTPS opcional, máximo 2048, host Google Maps permitido definido en C1; sin credenciales embebidas, javascript/data URLs, iframe, fetch servidor ni expansión de enlaces acortados |
| Slug | Solo lectura; preservar normalizador vigente y unicidad. Cambio/alias fuera de fases iniciales |
| Horario y zona | Solo lectura derivada de operación. No pedir JSON, IANA, UTC u offsets al usuario. El fallback técnico no se anuncia como horario confirmado |

No exigir descripción, mapa o teléfono para publicar: nombre válido y aceptación explícita del contenido bastan como propuesta. No inventar dirección, horarios, fotos, testimonios ni métricas ante campos vacíos. Sin servicios o profesionales elegibles, mostrar información publicada y un estado honesto de reserva no disponible, sin fabricar catálogo.

Estados: carga estable; vacío inicial con “Prepara la información pública de tu negocio”; error con reintento explícito; guardado/publicación pending que impide doble envío; éxito solo tras respuesta autoritativa; validación junto al campo; conflicto con recarga; sesión revocada o cambio de rol desmonta editor y preview. Un error de red no se traduce a “negocio inexistente”. Timeout de mutación exige comprobar estado antes de repetir, usando idempotencia aprobada.

Móvil a 375 px: una columna, campos y acciones completos, preview accesible sin overflow. Desktop: formulario y preview con jerarquía consistente. Reutilizar `--dash-*`. Labels visibles, foco estable, teclado, retorno de foco al cerrar confirmación, errores asociados y anuncios de estado; no depender del color. Los medios quedan fuera, por lo que no se simulan controles de subida ni alt text inexistente. Cambio usuario/tenant/rol, salida de pantalla y ciclo A → B → A invalidan la instancia por visita, borradores locales, preview y efectos tardíos.

## 6. No-alcance por fase y propuestas de ajuste

| Fase del plan | Resultado cuando se autorice | Exclusiones y motivo |
| --- | --- | --- |
| C0, esta entrega | Auditoría y brief revisables | Todo código, schema, migración, endpoint, UI, medio, pago o integración |
| C1, pendiente | Contrato y backend de contenido/publicación según decisiones aprobadas | Sin frontend ni rediseño de reserva; sin editar horario global, zona, slug, correo de alta o estado operativo por su impacto transversal; sin Professional/User/Equipo |
| C2, pendiente y tras aprobación backend | Editor/preview privado sobre C1 aprobado | Sin activar por conveniencia el mini-sitio C3; sin mocks ni nuevas rutas contractuales; sin cambiar dashboard congelado |
| C3, pendiente | Consumo de versión pública y activación controlada de política editorial | Sin pago, onboarding B2C nuevo, retiro de cuenta legacy, ampliación de perfiles ni estados de Booking; correcciones de reserva detectadas requieren alcance explícito |
| Posteriores separadas | Medios, redes/branding avanzado, promociones, banca/métodos, notificaciones, Pagos | Cada capacidad necesita brief, seguridad, contrato, QA y aprobación propios |

**Ajustes recomendados, no aplicados al plan:** limitar C1–C3 a perfil editorial y lectura de operación; resolver suficiencia del modelo/migración durante contrato, antes de implementar C1; acordar una activación que permita validar C2 sin publicar C3 prematuramente. Si el propietario exige editar horario o zona en C1, se necesita revisar el alcance y las garantías de Reservas/A2 antes de autorizarlo, no añadir un PATCH de JSON genérico.

Para la fase futura de medios, C0 identifica los gates: ownership por tenant y autorización de uso, proveedor pendiente, límites de cantidad/tamaño/formato pendientes, verificación del contenido real y rechazo de ejecutables, eliminación de metadatos, texto alternativo obligatorio para imágenes informativas, retención/borrado, moderación y recuperación. No se genera ni descarga material.

Para banca, hacen falta decisión sobre quién puede leer/editar, enmascarado, cifrado y gestión de claves, proyección en el paso de pago, acceso temporal a comprobantes, retención y AuditLog sin números ni cuerpos. Ningún modelo legacy concede esos permisos. Para notificaciones, definir eventos reales, consentimiento, remitente, destinatarios, reintentos y estados; Booking actual solo tiene PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW. No existe “En proceso”. Resend y ampliación de `wa.me` permanecen excluidos.

## 7. Modelo breve de amenazas

| Amenaza | Evidencia/superficie | Mitigación exigible y prueba futura |
| --- | --- | --- |
| IDOR horizontal / tenant falsificado | IDs, slug, body, selector de contexto | Contexto autenticado para CMS; Membership revalidada y consulta final tenant-scoped. Probar A intenta leer/editar/preview/publicar B y no revela existencia |
| Escalamiento de rol / revocación concurrente | ADMIN/BARBER/RECEPTIONIST y sesión anterior | Guards y revalidación autoritativa al mutar; probar pérdida de rol entre lectura y publicación y durante concurrencia |
| PII en público o roles operativos | findMine amplio, correo, teléfono Professional, futuros borradores | Allowlists separadas interna/editorial/pública; pruebas de claves exactas, cuerpos, caché, logs y respuestas de error. No reutilizar objeto Prisma completo |
| Slug hijacking / rutas reservadas | Slug único sin política de alias ni palabras reservadas | Mantener slug inmutable; diseñar reserva global/alias sin reutilización por otro tenant antes de habilitar cambios. Probar colisiones concurrentes y nombres como dashboard/login/register según rutas reales |
| Filtración de borrador / preview | JSON legacy y caches | Snapshot publicado separado; preview autenticado no-store; no tokens en URL; pruebas anónimas y de caché cruzada |
| Contenido malicioso / enlaces | Descripción, mapa, avatar legacy | Texto plano escapado, URL/host validado, no fetch/embed servidor; protocolos y payloads maliciosos rechazados; medios fuera |
| Pérdida de actualización / publicación parcial | Dos editores o doble clic | Versión esperada y transacción; repetición idempotente de misma operación, conflicto para revisión obsoleta; auditoría mínima sin contenido |
| Contenido revocado aún accesible | Caché API 15 s, cliente 60 s | Política de invalidación/estado autoritativo para todas las lecturas y POST público. Revocación no puede depender solo de TTL ni permitir volver al fallback legacy |
| Cambio de agenda involuntario | businessHours/timeZone consumidos por Reservas/A2/finanzas | Fuera de edición inicial; si se autoriza, coordinar bloqueo y detectar reservas futuras afectadas, sin cancelar/mover automáticamente |
| Fuga de contexto en UI | Respuesta tardía A → B → A | Scope usuario/tenant/rol + instancia por visita, desmontaje y descarte de efectos; no guardar contenido privado en localStorage |
| Abuso público / dependencia externa | Endpoints anónimos y límites locales | Conservar controles actuales, definir presupuesto específico CMS y límites distribuidos antes de producción horizontal; ningún envío externo en preview |

## 8. Compatibilidad, persistencia y rollback propuestos

El modelo actual **no basta para borrador y versión pública independientes**. Un `isPublic` aislado tampoco preservaría la versión publicada mientras se edita. Recomendación: agregado editorial separado y tenant-scoped con borrador, versión, instantánea publicada y referencia/estado de publicación; los nombres de tablas/campos se definirán en C1. No guardar banca, medios o datos privados en un JSON público genérico. No usar `updatedAt` de Organization como única versión editorial compartida con toda operación.

Secuencia candidata, que exige decisión D2/D3/D5 antes de ejecutarse:

1. Inventariar datos reales en entorno autorizado: clasificar nulos, formatos de horario, contenido legacy, slugs que colisionen con rutas reservadas, organizaciones inactivas y deletedAt. Sin asumir que hoy está vacío. Reportar conteos sin PII y preservar valores; C0 no hizo este acceso.
2. Diseñar migración aditiva, restricciones tenant/revisión, backfill reproducible, ensayo sobre PostgreSQL aislado, respaldo/restauración y rollback. Mantener las 20 migraciones existentes y sus invariantes; no usar db push ni sobrescribir contenido inválido por un default.
3. Separar lectura general mínima de editor y preview **antes de almacenar borradores accesibles por findMine**. Preservar consumidores de Facturación, bootstrap, login/onboarding legacy y Equipo. C1 debe documentar proyección exacta y compatibilidad de ambas rutas mine.
4. Hasta la activación C3 expresamente autorizada, preservar el flujo público legacy existente y mantener contenido editorial nuevo fuera de él. No publicar automáticamente columnas antes internas. Para tenants existentes, recomendar conservar solo su proyección pública histórica name/phone como versión inicial de compatibilidad al activar, con política aprobada; address/aboutUs/mapa requieren revisión. Un valor de teléfono ya público no demuestra consentimiento nuevo para usos adicionales.
5. En la activación, perfil público y encabezado/contacto de reserva deben usar la misma versión publicada; el slug y Organization.name operativo permanecen estables. El catálogo y disponibilidad siguen vivos bajo sus contratos, fuera del snapshot editorial. La eliminación de Organization.id en booking-data y sus tipos debe ser un cambio coordinado y aprobado; conservar localizadores necesarios de reserva hasta contrato alternativo.
6. Nuevos tenants tras activación: propuesta de contenido sin publicar hasta acción OWNER; onboarding existente no cambia por C0. Decidir cómo bloquear reserva pública antes de primera publicación y cómo conservar accesos de tenants anteriores. Ninguna activación masiva se infiere de una migración.
7. Publicación/despublicación debe invalidar caché y comprobar estado sin servir contenido retirado. Diseñar la respuesta ante fallo de invalidación, varias réplicas y clientes ya abiertos; no afirmar que el cache.clear local actual resuelve todo. En UI abierta, volver a consultar al recuperar foco o iniciar reserva según contrato.
8. Rollback sin pérdida: conservar agregado nuevo, revisiones y datos legacy; revertir lectores/escritores solo con política que mantenga las despublicaciones. Si volver al lector legacy reexpone contenido retirado, mantener la superficie pública cerrada hasta recuperación. No borrar tablas ni restaurar una copia antigua sobre datos nuevos por conveniencia.

Recomendación para C1: versionado optimista en toda edición, publicación atómica de revisión concreta, idempotencia tenant/actor/operación y auditoría transaccional de publicar/despublicar sin valores. Política de fallo de auditoría para guardar borrador pendiente de D5. No hay endpoints, claves de idempotencia ni revisiones editoriales implementados en C0.

Si posteriormente se aprueba horario semanal global, necesita modelo explícito por día/turnos y una migración compatible del único intervalo legacy. Los datos inválidos requieren revisión, no backfill silencioso. Deben probarse carreras con alta/reprogramación/reactivación de Booking, cambios A2 y altas de profesionales; no basta bloquear las filas que una consulta inicial encontró. Zona y rangos financieros requieren aceptación aparte. El horario publicado debe derivarse de esa autoridad operativa, nunca de un texto libre contradictorio.

## 9. Discrepancias encontradas

| ID | Contraste comprobado | Consecuencia / recomendación sin implementar |
| --- | --- | --- |
| H1 | Plan §§4/6 exige público sin UUID; booking-data devuelve `organization.id`. La retirada histórica de by-slug no elimina esta otra exposición | Bloqueante para proyección C1/C3: retirar el UUID de Organization coordinadamente; acordar excepción justificada o reemplazo de localizadores de reserva necesarios |
| H2 | Reglas backend exigen proyecciones explícitas; findMine devuelve todos los escalares a cuatro roles, también mediante clerk/me | Bloqueante antes de persistir CMS: separar lectura mínima de borrador. Tipos web estrechos no protegen Network |
| H3 | Comentario availability.util dice que nadie lee businessHours; ambos servicios de disponibilidad sí lo leen. La nota histórica de micrositio “ningún endpoint los expone” no describe findMine actual | Documentar el consumo real; corregir comentarios/contratos en alcance posterior autorizado, sin tocar código ahora |
| H4 | El plan habla de horarios; el modelo ejecutable es una única ventana diaria con fallback, no una semana comercial | C0 recomienda solo lectura inicial; editar días/turnos/cierres requiere cambio de modelo y alcance aprobado |
| H5 | La zona es autoritativa en servidor; page.tsx construye un Date desde fecha y hora concatenadas sin offset y aplica toISOString, usando zona del navegador; DateTimeStep calcula mínimo con fecha UTC | Riesgo de instante erróneo fuera de zona del negocio, deducido estáticamente, no reproducido en navegador en C0. Resolver alcance correctivo y contrato de instante antes de activar C3; no abrir edición de zona |
| H6 | No hay borrador/publicación/preview en schema ni rutas; `isActive` solo restringe resolver público y no equivale a estado editorial. `deletedAt` no lo restringe | Decidir política de publicación, retiro y negocio inactivo; no reutilizar flags legacy sin diseño |
| H7 | Slug admite palabras que coinciden con rutas estáticas (`dashboard`, `login`, `register`, etc.); unicidad no garantiza que `/${slug}` llegue a la página dinámica | Auditar colisiones reales antes de migración; no renombrar ni liberar slugs por inferencia. Reservas/alias y alta deben coordinarse en alcance propio |
| H8 | Visión trata `wa.me` como futuro; web pública ya construye `https://wa.me/` en shared.tsx y abre enlace tras confirmar. API devuelve whatsappBaseUrl pero tipo/helper no lo consume | Distinguir acción legacy de integración futura. No habilitar Resend/plantillas ni rediseñar WhatsApp desde CMS; preview sin efectos externos |
| H9 | AGENTS.md conserva correctivo propio BARBER IMPLEMENTADO / EN REVISIÓN; PROJECT_MASTER y entrada posterior del 2026-08-30 en historiales registran cierre/aprobación | Contradicción de etiqueta, no de campos/permisos. Preservar contrato A1 + phone privado y no atribuir nueva aprobación a C0. Reconciliación de AGENTS pendiente del propietario |
| H10 | El plan §2 sitúa evaluación de suficiencia del modelo/migración después de aprobación; los gates exigen resolver persistencia antes de implementar | Recomendar resolver diseño/migración en el contrato C1 antes de su implementación. No reordenar ni agrupar checkpoints unilateralmente |
| H11 | Estado anterior de PROJECT_MASTER decía “pendiente de plan” pese a existir el plan; también conserva riesgo “no existe pipeline CI/CD”, contrario a su introducción y TRD | Se registra C0 en controles sin cambiar aprobaciones. La frase de CI y otros estados históricos ajenos quedan señalados, sin refactor documental fuera del módulo |
| H12 | Caches públicas tienen ventanas distintas y Professional no invalida caché como Services | No prometer publicación/retiro inmediato apoyándose en TTL. C1/C3 deben especificar revocación y frescura; no modificar módulos existentes desde C0 |

## 10. Decisiones del propietario antes de iniciar C1

| ID | Decisión y recomendación | Alternativa e impacto |
| --- | --- | --- |
| D1 | OWNER/ADMIN editan y previsualizan; OWNER publica/retira | Permitir publicar a ADMIN cambia permisos y QA. BARBER/RECEPTIONIST sin nuevo editor, conservando operación vigente |
| D2 | Aprobar campos/límites §5 y nombre público separado del operativo; no publicar Organization.email | Usar name operativo para edición pública cambiaría bootstrap/panel y exigiría semántica explícita. Un correo público nuevo necesita campo/consentimiento/contrato propios |
| D3 | Aprobar ciclo editorial, snapshot inicial solo de contenido ya público, alta nueva sin publicar tras activación y retiro que impide nuevas reservas públicas | Retirar solo contenido manteniendo reserva requiere otro flujo claro. Decidir `deletedAt` e inactividad sin ampliar suspensión B2B por inferencia |
| D4 | Mantener slug, horario global y zona sin edición en C1–C3 | Si se requieren, aprobar primero alcance transversal, colisiones/alias y garantías de agenda/finanzas; no agruparlos como campos simples |
| D5 | Autorizar diseño aditivo separado, revisión/concurrencia/idempotencia, auditoría transaccional de publicación y estrategia de caché/rollback | Definir auditoría de borrador fail-open o fail-closed y política ante fallo de caché. Cambia persistencia y contrato, nunca decisión implícita del implementador |
| D6 | Acordar minimización H1/H2, localizadores necesarios y tratamiento de H5 antes de C3 | Corregir conversión de hora o sustituir IDs necesita alcance expreso. No prometer “sin UUID en todo Network” cuando el flujo de reserva vigente los requiere |

El propietario puede aprobar las recomendaciones por referencia a D1–D6 o sustituirlas por decisiones explícitas. Mientras cambien permisos, persistencia o flujo principal, C1 no está Ready. Políticas de medios/banca/notificaciones se resolverán en sus briefs posteriores, sin bloquear un C1 que las excluya formalmente.

## 11. Criterios observables de aceptación y QA futuro

Estos criterios **no se ejecutaron en C0**. C1 debe convertirlos en contrato y pruebas cuando se autorice; C2/C3 conservan su QA posterior.

| Caso | Observación exigida | Etapa |
| --- | --- | --- |
| Roles | Los cuatro roles intentan lectura/edición/preview/publicación; solo acciones aprobadas en D1 prosperan. Revocar Membership o bajar rol impide la siguiente acción | C1 API/E2E |
| Dos tenants | Actor A no obtiene ni modifica borrador, snapshot ni estado de B mediante body, selector o localizadores; rechazo sin confirmar existencia | C1 E2E PostgreSQL aislado |
| Campos y privacidad | Comparar claves exactas de proyecciones; ausencia de correo privado, Professional.phone, notas, IDs innecesarios, relaciones y metadatos en público; ningún borrador en mine de roles operativos | C1 y C3 |
| Validación | Trim, límites, null opcional, nombre obligatorio, PATCH vacío y campos extra; texto malicioso se rechaza/escapa, URLs inválidas no generan llamadas externas | C1 unitarias/E2E |
| Guardar frente a publicar | Guardar B mientras A está publicado conserva A en toda lectura anónima; preview autenticado refleja B y versión concreta; publicar B produce un cambio completo | C1 E2E; C2/C3 navegador |
| Concurrencia/idempotencia | Dos editores desde revisión N: una escritura válida y conflicto controlado, nunca pérdida silenciosa. Repetir la misma publicación no duplica eventos ni crea estados parciales | C1 PostgreSQL real aislado |
| Fallo de auditoría/cache | Forzar fallo según D5; rollback o respuesta recuperable coherente con lo persistido. Retiro no vuelve a servir legacy ni permite POST público por bypass | C1 y C3 |
| Retiro/inactividad | Probar inexistente, inactivo, deletedAt y sin publicar; contenido y rutas de reserva obedecen D3 incluso con caché caliente y cliente abierto | C1 y C3 |
| Compatibilidad | Bootstrap mantiene contexto mínimo; Facturación conserva timeZone; altas existentes y claims B2C siguen resolviendo; by-slug y POST organizations retirados siguen retirados | C1 regresión |
| Profesional propio | BARBER edita A1 y teléfono privado solo en su tenant; colega intacto; sin cambio de estado/isPublic/User. Publicar CMS no cambia perfiles ni expone teléfono privado | Regresión C1/C3 |
| Horario | Null/JSON inválido conserva semántica legacy de disponibilidad, pero no se presenta como horario confirmado. Horario válido filtra slots; guardar/publicar CMS no cambia turnos, zona, Booking ni rangos financieros | C1 regresión |
| Zona navegador | Navegador en zona distinta elige una hora del negocio y confirma exactamente el instante esperado; probar límites de día y cambio estacional si aplica | C3, previa resolución explícita H5 |
| Migración | Desde base nueva y copia controlada con datos legacy, backfill no publica columnas privadas ni pierde registros; rollback mantiene retiradas y comprobación de constraints | C1, si autorizado |
| UI y contexto | OWNER → ADMIN → BARBER/RECEPTIONIST, dos tenants y A → B → A con formulario/preview abierto y respuestas tardías: desmontaje inmediato, sin datos, toasts ni mutaciones del contexto anterior | C2 navegador y regresión |
| Estados/UX | Loading, vacío, error/reintento, pending, éxito, conflicto, sesión vencida; no falsos “no existe” ante 503. Sin servicios/profesionales, información honesta sin reserva simulada | C2/C3 |
| Accesibilidad | Desktop y 375 px sin overflow; teclado, foco/retorno, labels, anuncios, contraste y acciones alcanzables; console/Network sin PII extra ni contenido de otro tenant | C2/C3 QA real |

Base de pruebas leída para reutilización: [availability.util.spec.ts](../../apps/api/src/public-booking/availability.util.spec.ts), [public-booking.service.spec.ts](../../apps/api/src/public-booking/public-booking.service.spec.ts), [organizations.service.spec.ts](../../apps/api/src/organizations/organizations.service.spec.ts), [organizations.e2e-spec.ts](../../apps/api/test/organizations.e2e-spec.ts) y [professionals.e2e-spec.ts](../../apps/api/test/professionals.e2e-spec.ts). Son pruebas existentes inspeccionadas, no evidencia de ejecución en esta sesión ni cobertura CMS actual.

Validaciones al autorizar backend: comandos pnpm de TypeScript, lint, pruebas/build API; E2E sobre PostgreSQL temporal separado; Prisma validate/generate y diff/migraciones solo si aplica el diseño aprobado. En C2/C3: gates web y QA funcional/visual real con entorno, rol, acción y resultado. No usar la base habitual para fixtures destructivos ni atribuir a un build aprobación de UI.

## 12. Fuentes leídas, validación documental y cierre

Gobierno y documentación leídos: [AGENTS raíz](../../AGENTS.md), [API](../../apps/api/AGENTS.md), [web](../../apps/web/AGENTS.md), [entrada documental](../README.md), [PROJECT_MASTER](../../PROJECT_MASTER.md), [plan](CONFIGURACION_CMS_PLAN.md), [plantilla](FEATURE_BRIEF_TEMPLATE.md), [gates](../quality/DELIVERY_GATES.md), [DoD](../quality/DEFINITION_OF_DONE.md), [seguridad](../quality/SECURITY_STANDARD.md), [modelo](../architecture/DATA_MODEL.md), [TRD](../architecture/TRD.md), [PRD](../product/PRD.md), [flujos](../product/APP_FLOWS.md), [producto](../product/PRODUCT_STANDARD.md), [frontend](../product/FRONTEND_STANDARD.md), [patrones](../product/UI_PATTERNS.md), [visión futura](CONFIGURACION_CMS_PAGOS_VISION.md), [CHANGELOG](../../CHANGELOG.md) y [BACKEND_CHANGES](../../BACKEND_CHANGES.md) en entradas de Organization, horario, ruta pública y correctivo BARBER. Se siguieron [kortek-delivery](../../.agents/skills/kortek-delivery/SKILL.md) y [kortek-product-ui](../../.agents/skills/kortek-product-ui/SKILL.md) para el brief. El inventario §§2–3 y las pruebas §11 enlazan el código inspeccionado.

Cambios de esta entrega: este brief, nota/enlace de C0 en el plan, índice docs/README, estado C0 en PROJECT_MASTER e historial CHANGELOG. BACKEND_CHANGES se lee pero no se modifica: no se cambia contrato. Las discrepancias quedan explícitas en §9; no se corrigen por asunción ni se considera aprobado lo propuesto.

Validación aplicable: enlaces locales y destinos semánticos del alcance, estructura y consistencia de estados, cotejo de matrices contra controladores/proyecciones, diff completo y `git diff --check`; sin builds por ser entrega documental. La evidencia Git de publicación se reporta en el chat con SHA local/remoto y estado final. Los intentos iniciales de búsqueda con rg fallaron por el ejecutable Windows; se continuó con Select-String. Dos rutas de DTO/proyección supuestas no existían; se localizaron y leyeron sus nombres reales indicados arriba. Esos intentos no cuentan como validaciones satisfactorias.

Evidencia documental C0: comprobador PowerShell con regex de enlaces Markdown, decodificación de rutas y `Test-Path -LiteralPath` verificó 149 enlaces locales en los cinco archivos del alcance, sin destinos inexistentes, exit `0`. `git diff --check` terminó con exit `0`; la revisión manual cotejó destinos y afirmaciones con código y mantuvo las contradicciones preexistentes identificadas en §9. No se cuenta esta revisión como QA funcional de API o navegador.

Gate §7 del plan: inventario §§2–3; matriz §4; flujo/preview §5; no-alcance §6; amenazas §7; compatibilidad §8; discrepancias §9; decisiones §10; QA observable §11. C0 queda completo como auditoría/brief para revisión, no como aprobación del módulo ni ejecución de C1.

**C0 completado. Pendiente aprobación del propietario para iniciar C1.**
