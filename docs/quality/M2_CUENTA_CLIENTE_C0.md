## ENMIENDA / CANCELACIÓN — 2026-10-07

La cuenta de cliente/portal B2C dejó de ser requisito del MVP y del Piloto 1. El alcance M2 de cuenta de cliente queda retirado; C3 y sus pasos P4/P5 están CANCELADOS. Este C0 se conserva como historia y no autoriza su implementación o activación.

Prevalece la [ENMIENDA 2026-10-07 del propietario](DECISIONES_PROPIETARIO_2026_09_29.md#enmienda-2026-10-07). Se conserva la autenticación interna Clerk/legacy y los roles OWNER, ADMIN, RECEPTIONIST y BARBER. Producción permanece cerrada; sin push, proveedores ni bases reales. Solo se abre el gate local de diagnóstico/corrección de suites de reserva invitada.

El texto inferior se conserva íntegro como registro histórico y no revoca esta enmienda.

# M2 Cuenta de cliente: volver a tus reservas

**Estado vigente al 2026-10-03: C0 APROBADO EXPLÍCITAMENTE POR EL PROPIETARIO. D1–D8 FIJADAS, todas en A.** La [aprobación posterior de §15](#15-aprobación-del-propietario-y-publicación-documental-2026-10-03) prevalece sobre los estados de revisión y decisiones pendientes de las secciones 1–14, conservadas como historial de la entrega original. La aprobación del diseño no acredita implementación, pruebas nuevas ni autoriza C1/C2/C3 o despliegue.

Registro histórico de la entrega original:

Fecha: 2026-10-03, República Dominicana. **C0 DOCUMENTAL ENTREGADO / EN REVISIÓN DEL PROPIETARIO.** Este documento define acceso con Clerk, reservas propias por negocio, perfil y repetición de citas. Separa una primera etapa de consulta de una segunda con cancelación y reprogramación. No implementa ni aprueba contratos, no abre C1/C2/C3 y no acredita QA de M2.

## 1. Autorización, base y fuentes

El único gate abierto para esta entrega es **M2 C0**. La tarea autoriza definición documental de producto, UX y contrato propuesto, siguiendo [DELIVERY_GATES](DELIVERY_GATES.md). Las decisiones pendientes impiden comenzar implementación. Producción permanece cerrada; no se consultaron ni modificaron bases reales o desechables, proveedores, flags o variables de entorno.

Base exacta: `760131a39e11e73b5b86ec570bd381c2d1c4f11e`, rama `ai/antigravity-qa`. Al comenzar, `git status --short` mostró:

```text
 M CHANGELOG.md
 M PROJECT_MASTER.md
 M docs/README.md
 M docs/quality/RESERVA_PUBLICA_CONFIRMACION_UX.md
 M docs/quality/RESERVA_PUBLICA_M1_C3_CIERRE.md
?? docs/quality/evidence/m1-c3/aprobacion-cierre-20261003.json
```

Esas seis rutas contienen trabajo ajeno y se preservan. Solo se añade este archivo. El estado de M2, las decisiones y el siguiente paso quedan aquí para evitar intervenir los controles ajenos. No se hizo staging, commit, push, fetch ni despliegue; no se verificó el SHA remoto.

| Fuente leída | Qué gobierna |
| --- | --- |
| [Entrada documental](../README.md), [PROJECT_MASTER](../../PROJECT_MASTER.md), [AGENTS](../../AGENTS.md) | Estado vigente, aislamiento del trabajo y secuencia de entrega |
| [Decisiones del propietario](DECISIONES_PROPIETARIO_2026_09_29.md), incluidas sus enmiendas | Prevalecen sobre auditorías; cuenta requerida para Piloto 1, recomendaciones adoptadas y producción cerrada |
| [Auditoría técnica](AUDITORIA_HALLAZGOS_ROADMAP_MVP_2026_09_29.md), H20/H22 y §5 C0-A | Clerk, vínculo explícito, autoservicio por etapas y recuperación segura de visita |
| [Auditoría de diseño, UX y marketing](AUDITORIA_DISENO_UX_MARKETING_2026_09_29.md), §§2–3 y 7 | Microcopy de partida, continuidad de cuenta y QA físico |
| [ADR-001](../decisions/ADR-001-authentication-strategy.md), [BACKEND_CHANGES](../../BACKEND_CHANGES.md), entrada A0.6-A del 2026-08-22 | Identidad global Clerk, autorización local, claim aprobado y convivencia legacy |
| [M1 C0](RESERVA_PUBLICA_M1_C0.md), [C1](RESERVA_PUBLICA_M1_C1_CIERRE.md), [C2](RESERVA_PUBLICA_M1_C2_CIERRE.md), [C3](RESERVA_PUBLICA_M1_C3_CIERRE.md), [confirmación aprobada](RESERVA_PUBLICA_CONFIRMACION_UX.md) | Reserva invitada, PENDING, catálogo/horarios reales, colisión neutra D11 y presentación vigente |
| [Horario y zona C1](../features/HORARIO_ZONA_C1_CONTRATO.md), [Notificaciones C1](../features/NOTIFICACIONES_C1_CONTRATO.md), [WhatsApp C1](../features/WHATSAPP_C1_CONTRATO.md), [Medios C1](../features/MEDIOS_PROMOCIONES_C1_CONTRATO.md) | Tiempo autoritativo, eventos con opt-in, contacto publicado y fotos elegibles; no se amplían estos contratos |
| [PRD](../product/PRD.md), [flujos](../product/APP_FLOWS.md), [producto](../product/PRODUCT_STANDARD.md), [frontend](../product/FRONTEND_STANDARD.md), [patrones](../product/UI_PATTERNS.md) | Roles, datos mínimos, estados y experiencia coherente |
| [TRD](../architecture/TRD.md), [modelo](../architecture/DATA_MODEL.md), [seguridad](SECURITY_STANDARD.md), [terminación](DEFINITION_OF_DONE.md), [CHANGELOG](../../CHANGELOG.md) | Arquitectura, privacidad, transacciones y diferencia entre prueba y aprobación |

**Informe de testing original no disponible:** la auditoría técnica cita `reporte_de_testing_y_hallazgos_t_cnicos_cto.md`. No aparece entre los archivos versionados, en la raíz ni en la búsqueda específica de `docs`; no hay un adjunto accesible en esta conversación. Se usan H20/H22 y el resumen de la auditoría como evidencia secundaria, sin afirmar lectura del informe original ni reproducción de sus observaciones. No se recorren respaldos ni directorios protegidos para buscarlo.

Se aplican `kortek-delivery`, `kortek-product-ui` y las ocho skills solicitadas. Su aportación se limita al documento: copy centrado en tareas, reserva como conversión primaria, cuenta opcional visible, accesibilidad, móvil físico y feedback sin esperar animaciones. Se conserva el sistema visual del producto. Las guías de [interfaz web](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) y [redacción](https://raw.githubusercontent.com/vercel-labs/writing-guidelines/main/command.md) se consultaron el 2026-10-03; las reglas locales y el español prevalecen sobre convenciones editoriales de Vercel.

## 2. Decisiones FIJADAS y fronteras contractuales

Estas decisiones no forman parte de D1…D8 y no se someten de nuevo a elección:

| Decisión vinculante | Estado y aplicación en M2 |
| --- | --- |
| Propietario **2**, cuenta de cliente | **FIJADA.** La opción «Crear cuenta para reservar más rápido» permanece visible. Piloto 1 requiere alta, entrada/salida, Mis reservas, repetir y perfil; cancelar/reprogramar se entregan por etapas. Cuenta requerida como capacidad del producto no significa cuenta obligatoria para reservar. |
| Propietario **13**, recomendaciones C0 técnicas | **FIJADA.** Se adoptan C0-A D1-A: Clerk con claim A0.6-A y convivencia gradual legacy; D2-A: solo Client vinculado explícitamente por tenant; D3-A: ver/repetir primero y acciones según política después; D4-A: recuperación segura de sesión y borrador temporal sin PII persistida. No se reabre password local como alternativa de M2. |
| ADR-001 y A0.6-A | **FIJADA.** User global, Client por negocio, `clerkUserId` como identidad y `Client.userId` como vínculo explícito. No se crea Membership CUSTOMER, no se enlazan Users por correo y no se usa Clerk Organizations para permisos. |
| M1 y enmiendas 17/19/26 | **FIJADA.** La reserva nace PENDING. Se conserva la confirmación vigente, con «Listo» y «Pendiente de confirmación»; no se recuperan bloques explicativos retirados. Para nuevas fechas: semana de siete días, mes desplegable y horas visibles del API; filtros de franjas cuando hay más de doce horarios, sin franjas vacías. |
| Decisiones 5/14/15 | **FIJADA.** Hora del negocio, producción cerrada y una etapa abierta a la vez. No se declara un gate aprobado por entregar este C0. |
| Contratos de módulos cerrados | **FIJADA.** M2 no cambia Facturación, pagos, comprobantes, preferencias de correo, fotos ni contacto WhatsApp. BARBER se muestra como «Profesional» y conserva su alcance propio. |

### 2.1 Discrepancias identificadas y puntos detenidos

El documento no resuelve por inferencia diferencias con contratos aprobados:

| Punto | Evidencia y tratamiento |
| --- | --- |
| Enumeración legacy | El [servicio público](../../apps/api/src/public-booking/public-booking.service.ts), `tryCreateCustomerAccount`, puede devolver `accountCreationError=EMAIL_ALREADY_EXISTS`. D11 aprobado neutraliza colisiones de contacto, pero conserva el alta secundaria legacy y su riesgo residual. Cambiar el texto web no protege el HTTP. **Se detiene cualquier propuesta de cambiar esta respuesta aprobada dentro de M2 sin enmienda expresa.** D8 ofrece opciones. No se promete protección integral de enumeración de toda la plataforma mientras siga esta vía. |
| Claim «recién creada» frente a claim vigente | A0.6-A acepta bookingId y slug, sesión Clerk y correo principal verificado; no tiene expiración ni recibo de posesión de la visita. M2 propone reclamar la reserva recién creada en esa visita, pero **no interpreta esa UX como un TTL de seguridad existente**. D3 define recuperación sin alterar el endpoint aprobado. Exigir expiración al claim existente requeriría enmienda separada; aquí se detiene ese cambio. |
| Historial y deduplicación operativa | La creación pública reutiliza Client por teléfono/correo dentro del negocio; eso no vincula User. Un claim aprobado vincula el Client, no una única Booking. La lectura propuesta comprende sus reservas, no todas las que coincidan con un correo. No se presenta como prueba individual de cada reserva antigua. Si el negocio mezcló personas en un Client, bloquear la exposición de ese caso y reconciliar con evidencia; no fusionar ni separar registros automáticamente. D4 define el tratamiento. |
| Mapas históricos desactualizados | TRD conserva «rate limiting local» y DATA_MODEL conserva espera hasta `endTime`. [AppModule](../../apps/api/src/app.module.ts) usa contador PostgreSQL; F0-C y el flujo vigente eliminaron la espera financiera. Se usa código/estado vigente, sin reescribir esos documentos ajenos ni reabrir pagos. |

No se detectó conflicto en la elección Clerk, vínculo por negocio o entrega por etapas. Los puntos detenidos anteriores tienen alternativas documentadas y no impiden redactar el resto del C0.

## 3. Usuario, problema y resultado esperado

La persona que reserva necesita volver a una cita, reconocer su estado y repetirla desde un teléfono. Hoy la web permite una cuenta legacy secundaria, pero no proporciona la continuidad B2C de Clerk. Una identidad creada tampoco concede automáticamente acceso a reservas anteriores.

El resultado esperado es entrar a **Mis reservas** del negocio correcto y ver exclusivamente reservas del Client enlazado a esa identidad. La persona entiende la diferencia entre reserva registrada y confirmada, puede salir y recuperar acceso, revisar su perfil y comenzar otra cita con datos vigentes. Un fallo de cuenta o claim conserva la reserva ya creada.

| Etapa | Incluye | Criterio de salida |
| --- | --- | --- |
| 1: ver y repetir | Crear cuenta, iniciar/cerrar sesión, recuperar acceso, reclamar tras reservar, perfil, negocios vinculados, Próximas/Historial, detalle y Reservar otra vez | Recorrido completo probado en dos negocios sintéticos y móvil físico; sin botones de cancelar/reprogramar ni promesas de esas acciones |
| 2: cancelar y reprogramar | Política por negocio, acciones sobre reservas propias elegibles, límites temporales, concurrencia y avisos existentes | Contrato/backend/UX/QA y aprobación propios después de cerrar la etapa 1; este C0 solo define su propuesta |

**Fuera de alcance:** implementación de ambas etapas; retiro legacy A0.7, importación de contraseñas, unión automática de identidades, acceso al dashboard por ser cliente, agenda global de clientes, catálogo de pagos, comprobantes, devoluciones, nuevas notificaciones o activación de proveedores, editor público, cambio de horarios, dependencias o despliegues. Las migraciones de identidad ambiguas requieren resolución expresa, no una coincidencia de correo.

## 4. Código existente y brechas

La inspección distingue contratos ejecutables de propuestas nuevas:

| Área | Evidencia actual | Qué falta para M2 |
| --- | --- | --- |
| Identidad y sesión | [Verificador Clerk](../../apps/api/src/auth/clerk/clerk-session-verifier.service.ts), [guard de identidad](../../apps/api/src/auth/guards/clerk-onboarding.guard.ts): sesión verificada y estado remoto activo. [Bootstrap](../../apps/api/src/auth/clerk-bootstrap.service.ts) sirve B2B. | Contexto B2C que no exija Membership ni redirija al alta de negocio |
| Claim aprobado | [Controller](../../apps/api/src/auth/clerk-customer-claims.controller.ts), [DTO](../../apps/api/src/auth/dto/clerk-customer-claim.dto.ts), [servicio](../../apps/api/src/auth/clerk-customer-claims.service.ts): transacción SERIALIZABLE, locks Organization → Client → Booking, idempotencia y auditado sin PII | Recorrido público de entrada, verificación, claim explícito y fallo recuperable |
| Modelo | [Prisma](../../apps/api/prisma/schema.prisma): User.clerkUserId único, Client.userId nullable y único por negocio; Booking tenant-scoped | Proyecciones/guard de lectura B2C y recibos idempotentes para altas autenticadas; política en etapa 2 |
| Alta invitada | [DTO público](../../apps/api/src/public-booking/dto/create-public-booking.dto.ts) y servicio: Client/Booking atómicos; cuenta legacy secundaria después del commit | En M2, reservar sin enviar password ni `createAccount=true` al endpoint legacy; Clerk y claim se ejecutan después, como operaciones separadas |
| Reserva interna | [Controller de Bookings](../../apps/api/src/bookings/bookings.controller.ts) exige roles B2B; BARBER limitado a lo propio | Endpoints B2C propios. No basta llamar GET/PATCH /bookings desde una sesión cliente |
| Rutas web | [Proxy](../../apps/web/proxy.ts), [destinos de autenticación](../../apps/web/lib/auth-routes.ts) y [pantalla pública](../../apps/web/components/public/PublicBookingScreen.tsx): entrada Clerk orientada a dashboard; opción pública todavía legacy | Destinos de cliente separados, retorno permitido al negocio, contexto/caché de cliente y limpieza de visita |
| Reutilización | [Patrones UI](../product/UI_PATTERNS.md), `api.ts`, controles de reserva pública, formateador del negocio y medios públicos | Reutilizar presentación y consultas aprobadas; la lógica de autorización B2C necesita C1 |

Las pruebas de claim inspeccionadas cubren creación sin Membership, idempotencia, colisión legacy y tenant ajeno. BACKEND_CHANGES acredita su cierre histórico sobre `cbd7b8762b24ddc6802051e98ebb128d53f5f99e`; **no se volvieron a ejecutar ni prueban M2**. El perfil Clerk necesita nombre o username además del correo principal verificado; el futuro alta debe recoger el nombre requerido antes del claim.

## 5. Roles, permisos y privacidad

La identidad Clerk y el vínculo local autorizan al cliente. No se usa una Membership CUSTOMER legacy como sustituto del vínculo aprobado:

| Actor | Permisos en M2 | Límites |
| --- | --- | --- |
| Visitante | Ver mini-sitio publicado, reservar invitado, elegir cuenta visible y abrir entrada/recuperación | Sin lectura privada por bookingId, correo o teléfono |
| Identidad Clerk sin Client vinculado | Gestionar su identidad en Clerk, reclamar explícitamente con A0.6-A y ver estado vacío de negocios | Sin reservas ni onboarding de negocio automático; no se crea User local solo por consultar |
| Cliente Clerk vinculado | Leer Client propio mínimo y sus Bookings dentro del negocio autorizado; editar datos de contacto permitidos; repetir. Etapa 2: cancelar/reprogramar si elegible | Sin notas, agenda ajena, facturación interna, directorios privados ni comprobantes |
| CUSTOMER legacy sin enlace Clerk | Conserva autenticación legacy vigente para rollback | No accede a M2 con JWT legacy; no se enlaza por correo ni por Membership |
| OWNER | Permisos B2B vigentes; propuesta de configurar política en etapa 2 | No reclama ni suplanta clientes, no cambia un vínculo desde la pantalla de política |
| ADMIN / RECEPTIONIST | Operación B2B vigente; propuesta de consultar política | No se les concede edición de política por inferencia |
| BARBER («Profesional») | Permisos internos propios vigentes; consulta propuesta de política del negocio | Sin agenda ajena ni edición de política. Como cliente necesita su propio vínculo B2C |

Una misma persona puede ser personal y cliente: cada superficie verifica su contexto. Ser OWNER de Norte no autoriza leer reservas del cliente en Sur. El selector de negocio B2C muestra exclusivamente vínculos del User; el slug recibido es un selector no confiable, validado contra esos vínculos. Cada consulta final incluye `organizationId` resuelto por servidor y `Client.userId` del User obtenido por `clerkUserId`.

La respuesta privada excluye `Client.notes`, correo/teléfono de profesionales, otros clientes, Membership, IDs de User/Client/Organization, identificadores externos, borradores CMS, Invoice/Payment y contenido de comprobantes. Solo el perfil propio recibe los datos de contacto necesarios. Las fichas de reserva contienen servicio/profesional mínimos; nunca se serializa el objeto Prisma completo. Las imágenes de recursos retirados no se rescatan de URLs privadas o legacy.

Se propone `Cache-Control: private, no-store` en todas las respuestas B2C, sin caché CDN, persistencia de React Query o service worker. La clave de memoria incluye identidad, negocio y superficie; cambio de usuario/negocio, logout o pérdida de permiso desmonta y limpia datos, aborta solicitudes e ignora respuestas tardías mediante instancia única por visita, incluido A → B → A. Atrás del navegador tras logout no debe mostrar contenido privado.

Los borradores se conservan solo en memoria durante la visita y se descartan al salir/cambiar identidad o negocio. El retorno de Clerk puede conservar una referencia técnica de ruta permitida, nunca datos de contacto, credenciales o reserva en query. Logs, auditoría y evidencia registran actor/tenant/entidad y resultado mínimos, sin PII, passwords, sesiones ni cuerpos sensibles. Las futuras claves de idempotencia son opacas, no se derivan de PII ni se publican sus valores.

Crear cuenta y aceptar avisos por correo son elecciones independientes, desmarcadas por defecto. M2 conserva aviso/versionado y opt-in de Notificaciones, no lo activa ni lo convierte en marketing. La información de privacidad del negocio solo se enlaza si existe y está aprobada; no se inventa un campo `privacyUrl`. Retención, eliminación de cuenta y derechos sobre datos requieren procedimiento vigente y responsable definido antes de producción; no se borran reservas/finanzas al cerrar sesión o eliminar una identidad en Clerk.

## 6. Recorridos y comportamiento observable

### 6.1 Entrada pública, cuenta y recuperación

El mini-sitio conserva **Reservar cita** como acción principal. **Crear cuenta** e **Iniciar sesión** permanecen visibles como entradas secundarias; con sesión aparece **Mis reservas** y **Mi perfil**, dentro del contexto del negocio. No se usa el registro B2B con destino `/dashboard/setup`.

Se proponen rutas web, todavía inexistentes: `/{slug}/cuenta/crear`, `/{slug}/cuenta/entrar`, `/{slug}/cuenta/recuperar`, `/{slug}/mis-reservas`, `/{slug}/mis-reservas/:bookingId` y `/{slug}/mi-perfil`. El controlador de retorno solo acepta rutas relativas permitidas de cliente; rechaza orígenes externos, rutas protocol-relative y destinos de administración. Autenticarse no equivale a vincularse con el negocio.

Clerk recoge nombre y correo principal verificado. D1 propone el método de entrada sin modificar configuración ahora. Recuperar acceso verifica posesión mediante Clerk y ofrece reintento útil; no busca Users locales ni confirma existencia de una cuenta antes de verificación. Si el correo ya no está disponible, se ofrece asistencia sin prometer recuperación automática, cambio de email o unión legacy.

Logout invoca `signOut` y limpia estado local. No se anuncia «sesión cerrada» mientras la revocación no se confirme; si falla, se ocultan datos privados y se ofrece reintentar. Al volver desde otra app, revalidar sesión y vínculo antes de pintar datos. Se puede refrescar una lectura tras recuperar sesión; una mutación incierta nunca se reenvía automáticamente.

### 6.2 Reservar y reclamar después del éxito

El alta de Booking es primaria y Clerk es secundario:

1. En Datos se mantiene «Crear cuenta para reservar más rápido» como elección de intención. Si la persona opta, se solicita correo válido y se explica que la cuenta se crea después de reservar; no se pide contraseña para enviarla a Nest.
2. El POST público vigente registra como invitado, con `createAccount` omitido o `false`, sin password y con opt-in independiente. Esta propuesta de consumidor de M2 no elimina campos ni rutas legacy aprobadas.
3. Solo una respuesta de éxito permite mostrar la reserva registrada y PENDING. Se conserva el resultado de M1 y se añade una acción secundaria de cuenta; no se rediseña otra vez la confirmación.
4. La persona crea cuenta o entra con Clerk. Cuenta creada/sesión válida y reserva vinculada son resultados diferentes. El retorno conserva el contexto en memoria cuando el flujo lo permita.
5. Se presenta «Añadir esta reserva a Mis reservas» y se pide confirmación explícita del vínculo por negocio. Se llama al claim aprobado con el bookingId recibido y el slug de esa visita, sin identidad/tenant/rol aportados como autoridad.
6. Tras `claimed:true`, releer la reserva desde el API B2C; mostrar el resultado solo si la consulta autoritativa corresponde al mismo contexto. Repetir el claim de la misma identidad conserva su idempotencia.

**Fallo después de reservar:** fallo de Clerk, nombre incompleto, correo sin verificar, correo distinto, colisión legacy, claim o conectividad no elimina ni cancela Booking. El éxito de reserva permanece; se explica que la cuenta o el vínculo no se completó. Reintentar identidad/claim no repite el POST Booking. Una cuenta Clerk creada pero aún sin claim entra a una pantalla sin reservas vinculadas, no a un falso historial.

Si se reservó sin correo, no se puede usar A0.6-A directamente: el Client necesita correo coincidente verificado. No se asigna el email de la nueva cuenta al Client por conjetura. Si un Client reutilizado tiene otro correo, el claim también falla; la reserva permanece y se deriva a verificación asistida, sin revelar el correo guardado. D3 cubre perder la visita o su referencia; no existe hoy recuperación pública de bookingId por contacto.

Timeout/5xx del POST original implica resultado incierto, no «reserva creada». Se conserva el patrón M1: no reenviar automáticamente ni deducir existencia de una reserva desde un fallo. El mecanismo de idempotencia propuesto para altas B2C autenticadas no se atribuye al POST invitado existente.

### 6.3 Mis reservas: Próximas e Historial

La primera pantalla muestra el nombre del negocio y dos pestañas. Un selector opcional enumera solo negocios ya vinculados, sin resumen global ni búsqueda de reservas por email. Entrar desde un negocio sin vínculo muestra un estado neutro de falta de acceso; no confirma si allí existen reservas de esa identidad.

**Próximas:** Bookings PENDING o CONFIRMED con `endTime > now` del servidor, incluidas las que están en curso. Orden ascendente por `startTime`, desempate por id. **Historial:** todos los demás casos, incluidos CANCELLED, COMPLETED y NO_SHOW aunque su fecha sea futura, y PENDING/CONFIRMED cuyo fin ya pasó; orden descendente por `startTime`, desempate por id. Pasar al Historial no cambia status: una pendiente vencida sigue «Pendiente de confirmación» hasta una transición real. Las pestañas forman una partición sin duplicados para el instante de lectura.

La ficha muestra fecha/hora del negocio, servicio, profesional y estado con texto. No presenta el precio de catálogo actual como importe histórico sellado: Booking no tiene snapshot de tarifa. Se proponen páginas de 20 elementos, máximo 50, cursor opaco y botón «Ver más»; nunca descargar toda la historia ni deducir un total de un array parcial. Enlaces a detalle vuelven a autorizar ownership en backend.

Un negocio retirado del mini-sitio puede conservar lectura privada de reservas ya vinculadas mientras la organización siga operativamente activa. Repetir requiere catálogo publicado. Una organización inactiva o borrada niega acceso con respuesta neutra; la cuenta y otros vínculos siguen disponibles. Archivar Client no borra el historial vinculado, pero bloquea altas autenticadas y acciones hasta revisión del negocio; no se reactiva desde M2 por inferencia.

### 6.4 Perfil y Reservar otra vez

**Mi perfil** distingue identidad global gestionada por Clerk de **Datos para este negocio**. D7 propone editar nombre y teléfono del Client propio; email de contacto se muestra de solo lectura y la verificación de email pertenece a Clerk. Cambiar el email en Clerk no modifica Client, User.email ni el opt-in automáticamente, no revoca un vínculo existente ni habilita vínculos nuevos. El claim actual puede rechazar un nuevo enlace si User.email quedó distinto del principal verificado; se explica con error neutro y revisión asistida. No se promete sincronización ya implementada.

**Reservar otra vez** abre una nueva reserva: consulta catálogo/publicación/horarios actuales y propone el servicio/profesional previo solo si siguen siendo elegibles. No copia fecha, estado, precio, pago, notas, comprobantes ni consentimiento. Si el recurso se retiró, conserva el historial y solicita una nueva selección; si la página ya no acepta reservas, muestra la explicación y el contacto público disponible.

El perfil propio sugiere datos de contacto en memoria. «Editar mis datos» abre la edición del perfil de ese negocio y requiere guardarla antes de registrar la cita autenticada; el POST no recibe un Client alternativo ni contacto libre. Editar el perfil es una acción separada, no una consecuencia silenciosa de repetir. El precio nuevo es el catálogo actual. La persona revisa y registra una nueva Booking PENDING; no se reactiva la anterior ni se garantiza el mismo profesional/horario.

## 7. Etapa 2: política, ventana y configuración propuesta

La política de cliente se configura en **Horarios → Política de reservas**, bloque separado de turnos/cierres. No cambia BusinessSchedule ni su revisión. OWNER edita; los demás roles internos consultan según D6. Hasta aprobar e implementar etapa 2, las acciones no existen y no se muestran como controles deshabilitados permanentes.

Propuesta conservadora para decidir en D5: habilitación independiente de cancelar/reprogramar, desactivada inicialmente; **24 horas de antelación mínima para cada acción** al habilitarlas. OWNER elige de 1 a 168 horas enteras. Esta es una propuesta nueva, no una decisión FIJADA ni una política ya configurada. Mostrar el plazo efectivo en lenguaje natural antes de confirmar; no inventar términos legales, penalizaciones ni reembolsos.

Reglas propuestas de backend:

- Solo PENDING/CONFIRMED futuras, propias, Client activo y negocio activo. No restaurar CANCELLED ni actuar sobre COMPLETED/NO_SHOW; no tocar una Booking con Invoice o Payment, incluso ante un estado inconsistente.
- Elegibilidad temporal: `now < startTime` y `now <= startTime - minimumNoticeHours`. El servidor toma un único instante después de obtener locks. En el límite exacto se permite; un instante posterior se rechaza. La zona del teléfono no interviene.
- Cancelación cambia a CANCELLED sin eliminar datos ni crear reembolso. Confirmación explícita: «Cancelar reserva» / «Conservar reserva». No reactivar desde la cuenta.
- Reprogramación conserva servicio y profesional en esta etapa; cambia exclusivamente a un slot disponible. Comprueba ventana del horario original y que el nuevo horario también permita la antelación mínima. No permite cambios a una hora inmediata para eludir la política.
- Usar el selector M1 vigente y disponibilidad del API; comparar fecha actual y nueva. Validar nuevamente dentro de la transacción, excluyendo solo esa reserva de su propio conflicto y preservando las exclusiones aprobadas.
- Mantener el status original al reprogramar; no asumir reconfirmación. Si el negocio quiere convertir CONFIRMED a PENDING, se requiere nueva decisión de estados y avisos.
- Aplicar la política vigente al ejecutar; las ediciones se auditan y muestran su efecto sobre reservas existentes. Propuesta: revisión optimista y rechazo de comandos basados en Booking/política desactualizadas, antes de mutar.
- Reutilizar los eventos CANCELLED/RESCHEDULED y opt-in aprobados, con la intención de correo en la misma transacción; no inventar un sexto evento ni activar envíos. El mensaje de éxito confirma la mutación, nunca entrega de correo.

La confirmación no es autoridad. Si el negocio cambia política/estado/horario mientras el cliente decide, el API rechaza sin escrituras parciales y devuelve la condición efectiva tras una nueva lectura autorizada. Cancelar y reprogramar concurrentemente solo producen un resultado consistente; no se liberan huecos ni crean eventos duplicados ante un perdedor.

## 8. Copy en español y estados

El punto de partida es §3 de la auditoría de diseño. Se adapta a los destinos propuestos y las enmiendas posteriores, con trato de tú y lenguaje de República Dominicana. «Confirmada» corresponde exclusivamente a CONFIRMED. Las siguientes frases se muestran solo después de implementar la capacidad que describen:

| Superficie / estado | Texto propuesto | Acción y condición |
| --- | --- | --- |
| Página pública, sin sesión | «Crear cuenta» · «Iniciar sesión» | Entradas visibles, secundarias a «Reservar cita» |
| Intención de cuenta | «Crear cuenta para reservar más rápido» · «Crearás tu cuenta después de registrar la reserva.» | Opción visible; sin password hacia el API público |
| Alta | «Crea una cuenta para volver a tus reservas» | «Crear cuenta» / «Iniciar sesión» / regreso al negocio |
| Verificación | «Revisa tu correo para continuar.» | Reenvío con espera del proveedor; no afirmar entrega |
| Recuperación | «Recuperar acceso» · «Revisa tu correo para continuar. También puedes volver a Iniciar sesión.» | Respuesta neutra antes de verificar posesión |
| Sesión vencida | «Inicia sesión de nuevo para ver tus reservas.» | «Iniciar sesión»; conservar solo borrador autorizado de la visita |
| Carga de reservas | «Cargando tus reservas…» | Estructura estable, sin una lista vacía prematura |
| Próximas vacío | «No tienes próximas reservas vinculadas a tu cuenta en este negocio.» | «Reservar cita» solo si acepta reservas |
| Historial vacío | «Todavía no hay reservas en tu historial de este negocio.» | «Ver próximas reservas» |
| Cuenta sin vínculos | «Aún no has añadido reservas a tu cuenta.» | Volver al negocio; claim solo si existe el resultado de la visita |
| Falta de acceso/recurso | «Esta reserva no está disponible para tu cuenta.» | «Volver a Mis reservas»; misma frase para inexistente y ajena |
| Error de lectura | «No pudimos mostrar tus reservas. Inténtalo de nuevo.» | «Reintentar», sin borrar filtros ni mostrar datos de otro contexto |
| Éxito público vigente | «Listo» · «Pendiente de confirmación» | Conservar resumen y acciones M1, añadir entrada de cuenta secundaria |
| Claim explícito | «Añadir esta reserva a Mis reservas» · «Vincularás tu cuenta con tus reservas en este negocio.» | «Añadir reserva» / «Ahora no» |
| Cuenta fallida tras éxito | «Tu reserva quedó registrada, pero no pudimos crear la cuenta. Puedes intentarlo desde Crear cuenta.» | Reintentar alta; no registrar otra reserva |
| Cuenta creada, claim fallido | «Tu cuenta está lista. No pudimos añadir la reserva a Mis reservas. La reserva sigue registrada.» | Reintentar vínculo si conserva referencia; asistencia si falta |
| Claim incompatible | «No pudimos añadir esta reserva a tu cuenta. Revisa que usas la cuenta con la que quieres vincularla o contacta al negocio.» | No revelar cuenta legacy, Client.email ni titular alternativo |
| Claim exitoso | «La reserva ya aparece en Mis reservas.» | Mostrar solo tras lectura autorizada; no anunciar antes |
| Perfil cargando/guardando | «Cargando tu perfil…» / «Guardando tus datos…» | Bloquear solo envío duplicado, mantener campos |
| Perfil error/éxito | «No pudimos guardar tus datos. Revísalos e inténtalo de nuevo.» / «Tus datos se guardaron para este negocio.» | Error persistente y lectura actualizada |
| Repetición | «Reservar otra vez» · «Elige un nuevo horario. Revisa el precio y los datos antes de reservar.» | Nueva reserva, selección editable |
| Servicio/profesional retirado | «Esta opción ya no está disponible. Elige otra para continuar.» | Abrir selección vigente; no perder historial |
| Cuenta limitada por etapa 1 | «Para cambiar o cancelar esta reserva, contacta al negocio.» | Solo ofrecer el canal público real; no teléfono privado |
| Límite de intentos | «Has realizado varios intentos. Espera un momento antes de volver a probar.» | Respetar Retry-After; no reiniciar automáticamente |
| Salida | «Cerrar sesión» / «No pudimos cerrar la sesión. Inténtalo de nuevo.» | Datos privados ocultos durante fallo; éxito solo tras signOut |
| Política etapa 2 | «Puedes cancelar o cambiar la fecha hasta {fecha y hora límite}, hora del negocio.» | Valor calculado en servidor, no plazo supuesto |
| Fuera de ventana | «El plazo para hacer este cambio terminó. Contacta al negocio.» | Sin mutación; canal público elegible |
| Cancelación éxito | «Tu reserva se canceló.» | Tras respuesta/lectura real; conservarla en Historial |
| Reprogramación | «Cambiar fecha y hora» · «Actual: {fecha}» · «Nueva: {fecha}» · «Guardar nueva fecha» | Mantener estado de reserva por separado |
| Reprogramación conflicto/éxito | «Ese horario ya no está disponible. Elige otro.» / «La fecha de tu reserva se actualizó.» | Mantener selección recuperable / releer estado real |

Fechas naturales del negocio, año cuando importa para decidir y horas con «a. m.»/«p. m.»; no mostrar ISO, IANA, UTC u offsets. Status CANCELLED/COMPLETED/NO_SHOW se presenta como «Cancelada»/«Completada»/«No asistió». El cliente no puede cambiar estos estados desde etapa 1.

Los errores de campo se asocian a su label y persisten hasta corregirlos. Tras un envío inválido, enfocar un resumen con enlaces a los campos, manteniendo errores junto a cada campo; sin resumen, enfocar el primer campo inválido. No mover foco en cada blur. Errores de autenticación, conflicto, offline y proveedor indisponible tienen salidas diferentes, sin mostrar Prisma, SQL o mensajes crudos de Clerk. Los anuncios no urgentes usan estado accesible; los errores que requieren acción se anuncian sin repetición excesiva. Un toast es complemento, nunca el único soporte del fallo o éxito.

Alternativas de beneficio, sin cambiar las decisiones fijadas: «Vuelve a tus reservas cuando lo necesites» enfatiza seguimiento; «Tu próxima cita, desde Mis reservas» enfatiza repetición. Se recomienda «Crea una cuenta para volver a tus reservas» en el alta por describir una tarea comprobable. No se publican tasas de conversión, ahorro de tiempo o testimonios inexistentes ni se instrumenta un embudo en este C0.

### 8.1 Móvil, accesibilidad y movimiento

Reutilizar identidad negro/blanco/rojo, tipografía y componentes existentes. En móvil, fichas apiladas, pestañas rotuladas y acciones completas sin scroll horizontal; en escritorio, lista legible con el mismo alcance. Reservar sigue siendo la acción principal pública; cuenta no obliga a recorrer un formulario previo a elegir hora.

Objetivos propuestos de aceptación: campos de al menos 16 CSS px; targets de 44 × 44 CSS px con separación suficiente; labels visibles, teclado email/tel, autofill y pegado permitidos. Mantener zoom voluntario al 200 %, safe areas, controles visibles con teclado y barras del navegador, foco visible y retorno de foco tras diálogo. Contraste medido: 4,5:1 texto normal y 3:1 texto grande/controles relevantes, sin depender solo del color.

No se anima la aparición de cada reserva ni se retrasa navegación/teclado. Feedback de toque breve y movimientos ocasionales de opacidad/transformación, con tokens existentes y respeto a movimiento reducido. No hace falta otra librería. Revisar viewport dinámico para superficies de cuenta, hover solo donde el dispositivo lo admite y mensajes largos que envuelven línea. Esto define pruebas futuras; no acredita que el código actual o un teléfono ya cumplan estos objetivos.

## 9. Contrato propuesto para C1, no implementado

Todos los endpoints nuevos de esta sección son **PROPUESTOS / NO APROBADOS / NO EXISTENTES**. Los existentes se etiquetan expresamente. No se añaden ahora DTOs, Guards, modelos, migraciones ni dependencias.

### 9.1 Autoridad, datos y compatibilidad

El guard B2C reutiliza la verificación de sesión Clerk, resuelve User solo por `clerkUserId` y obtiene Client del vínculo dentro del negocio. Un slug por sí mismo no autoriza. No utiliza `B2bAuthGuard` ni exige `x-organization-id` para clientes; el contexto autenticado B2C autoritativo se construye de sesión + vínculo comprobado, antes de consultar Bookings. Rechaza parámetros de User/Client/Organization/rol como autoridad, aunque coincidan con un dato real.

A0.6-A existente permanece exactamente: `POST /auth/clerk/customer/claims`, body `{bookingId: UUID, organizationSlug: string}`; slug 3–50 caracteres alfanuméricos con guiones intermedios; correo principal verificado y nombre del proveedor. `201` primer enlace, `200` repetición por la misma identidad, `{claimed:true}`; `404` reserva/slug ausente o ajeno, `409` colisión genérica. El correo prueba la reclamación del Client señalado, nunca resuelve un User legacy. Sin Membership CUSTOMER, sin cambios de contrato ni TTL atribuido.

Lecturas M2 usan UUID de Booking solo en contexto autorizado; no hay buscador público por email/teléfono. Que un cliente conozca un bookingId no le da acceso. Una identidad sin User local puede obtener lista vacía de vínculos con sesión válida, sin provisioning privilegiado ni 404 que revele cuentas legacy.

### 9.2 Endpoints y DTOs de etapa 1

| Endpoint | Entrada propuesta | Respuesta mínima y autorización |
| --- | --- | --- |
| **Existente** `POST /public/:slug/bookings` | DTO aprobado de M1. Consumidor M2 omite password y creación legacy; contacto/opt-in conservan validaciones | Respuesta vigente `{booking,accountCreated,accountCreationError}`; no usar esos indicadores legacy como éxito de Clerk ni claim |
| **Existente** `POST /auth/clerk/customer/claims` | DTO A0.6-A descrito arriba | Contrato aprobado intacto |
| **Nuevo** `GET /customer/businesses` | Sin body; sesión Clerk | `{businesses:[{slug,name,canBook}]}` solo de Clients vinculados del User y organizaciones activas; sin UUID tenant ni PII. `[]` si no tiene enlaces |
| **Nuevo** `GET /customer/:slug/bookings` | `view=upcoming\|history`, `limit` 1–50, default 20, `cursor` opcional opaco y acotado | `{business:{slug,name,timeZone},items:CustomerBookingSummary[],nextCursor:string\|null,asOf:string}`. Cursor ligado a identidad/negocio/vista/orden; no acepta clientId ni scope alternativo |
| **Nuevo** `GET /customer/:slug/bookings/:id` | UUID; sin body | `CustomerBookingDetail`; consulta final tenant + Client.userId + Booking.clientId. `404` idéntico para ajeno/inexistente/sin vínculo |
| **Nuevo** `GET /customer/:slug/profile` | Sin body | `{name,phone:string\|null,email:string\|null,canEditContact:boolean}` exclusivamente Client propio; correo de contacto no equivale a identidad Clerk |
| **Nuevo** `PATCH /customer/:slug/profile` | `{name?:string,phone?:string\|null}`; al menos un campo; nombre 1–120 sin vacío/null; teléfono entrada ≤30 y normalización vigente | Misma proyección de perfil, no notas/email/userId/isActive. Conflicto de contacto neutro. Actor y tenant derivados; D7 pendiente |
| **Nuevo** `POST /customer/:slug/bookings` | `{serviceId:UUID,professionalId:UUID,startTime:string,emailNotifications?:entrada aprobada}` e `Idempotency-Key` opaca | Client del vínculo, contacto del perfil, recursos actuales públicos del mismo tenant; nueva Booking PENDING. `{booking:CustomerBookingDetail}`. `201` alta y `200` repetición exacta por mismo contexto |

`CustomerBookingSummary` propuesto: `{id,startTime,endTime,status,service:{id,name},professional:{id,name},canBookAgain}`. `CustomerBookingDetail` añade `{business:{slug,name,timeZone,phone:publicado|null,address:publicada|null,googleMapsUrl:publicada|null},actions}`. `timeZone` es dato técnico para presentar horas, nunca texto de UI. Etapa 1 `actions` solo contiene `canBookAgain`; no se publican acciones futuras como capacidades reales. Los campos públicos opcionales salen del snapshot publicado; la identidad operativa mínima del negocio permite reconocer reservas si retiró su página. No revelar contacto/dirección privados al retirarse.

El listado entrega contexto mínimo de negocio/zona aun cuando booking-data público ya no esté publicado. `asOf` es el instante fijado por servidor para esa lectura; las páginas de una misma vista conservan ese instante en el cursor y una actualización comienza una lectura nueva. Refrescar tras recuperar foco o una mutación y no mezclar páginas de contextos distintos. C1 debe probar paginación ante cambios concurrentes de estado/fecha y cerrar el cursor sin aceptar un instante elegido por el navegador.

Los DTOs validan whitelist y rechazan campos extra. Para altas, `startTime` es instante ISO con zona inequívoca obtenido del slot API; `endTime/status/clientId` los decide el servidor. Se conserva la regla actual de servicios/profesionales activos y públicos, disponibilidad global/individual, retiro y exclusión concurrente, sin inventar nuevas relaciones ProfessionalService obligatorias.

Perfil: recortar/normalizar nombre/teléfono según constantes existentes; sin control automático de Client.email ni emailRevision. Nombre vacío/null y teléfono inválido devuelven `400` útil. Client archivado devuelve `canEditContact:false` y rechaza la mutación sin revelar información adicional. El cambio se limita al Client de ese negocio, no a User ni a otros Clients; auditoría sin los valores.

### 9.3 Endpoints de etapa 2

| Endpoint nuevo propuesto | DTO y salida | Permisos/invariantes |
| --- | --- | --- |
| `GET /customer/:slug/booking-policy` | Política efectiva y revisión, sin motivos internos | Cliente vinculado; no inferir acceso desde respuesta pública |
| `POST /customer/:slug/bookings/:id/cancel` | `{expectedBookingUpdatedAt:string,expectedPolicyRevision:int}` + clave idempotente; devuelve detalle y política efectiva | Ownership, PENDING/CONFIRMED, ventana y locks de §7 |
| `POST /customer/:slug/bookings/:id/reschedule` | Lo anterior + `{startTime:string}`; devuelve detalle | Conserva servicio/profesional/status; slot actual y exclusión de sí mismo comprobados en transacción |
| `GET /customer-booking-policy` | Contexto B2B aprobado, sin body; devuelve política y revisión | OWNER/ADMIN/RECEPTIONIST/BARBER del tenant; no CUSTOMER |
| `PATCH /customer-booking-policy` | `{expectedRevision:int,allowCancellation:boolean,allowReschedule:boolean,cancellationNoticeHours:int,rescheduleNoticeHours:int}` | OWNER propuesto; rango 1–168, actualización optimista/auditable, sin editar horarios ni vínculo |

Etapa 2 añade a detalle `actions:{canBookAgain,canCancel,canReschedule,cancelDeadline:null|string,rescheduleDeadline:null|string,unavailableReason:null|código seguro,policyRevision}`. Un motivo seguro es «acción desactivada», «plazo terminado» o «estado no admite cambio», sin afirmar cobro/Invoice ni filtrar internos. Backend vuelve a validar siempre. `expectedBookingUpdatedAt` usa el valor exacto recibido, no el reloj del dispositivo; C1 debe probar que toda escritura actual actualiza esa versión y añadir una revisión propia si no basta.

### 9.4 Errores, límites y operaciones

Respuestas propuestas M2: `400` entrada inválida con errores de campo seguros; `401` sesión inválida; `403` para actor autenticado sin permiso sobre política B2B; `404` privado neutro; `409` cambio concurrente/slot ocupado/plazo o política incompatible, solo después de probar ownership; `429` espera con Retry-After; `503` identidad o servicio indisponible. No retornar constraints, causas de colisión legacy, PII ni códigos crudos de proveedor. C1 cerrará códigos de dominio estables y su mapping al copy; A0.6-A conserva sus errores aprobados.

Límites propuestos para decidir/medir en C1: lecturas B2C 60/min por identidad+negocio con techo IP; perfil 10/min; alta/cancelación/reprogramación 5/min por identidad+negocio; claim mantiene 10/min aprobado. Son presupuestos iniciales, no medidas de capacidad ni nuevos valores activos. Usar contador PostgreSQL compartido, claves derivadas sin IP/email crudos almacenados, ventanas/limpieza acotadas y prueba con dos procesos. Limitar también reenvíos/verificaciones del proveedor; los límites IP no impiden por sí solos abuso distribuido.

Altas y mutaciones autenticadas necesitan recibo idempotente ligado a actor, tenant, operación y recurso: mismo comando repite resultado sin crear Booking/evento, clave reutilizada con otro comando responde conflicto neutro. Recuperar un recibo exige sesión y ownership actuales; revocar acceso invalida su lectura. Propuesta de retención 24 horas, anunciada al cliente técnico; tras expiración no reenviar una mutación incierta sin comprobar el recurso. No se aplica retroactivamente al alta invitada ni al claim aprobado.

La transacción toma locks en el orden aprobado Organization → Client → Booking y recursos de agenda cuando corresponda. Relee vínculo, estado, política, versión, disponibilidad y publicación dentro del límite transaccional. La escritura, recibo y evento de Notificaciones se confirman juntos. Reintentos acotados solo para serialización reconocida; no se considera cualquier error SQL reintentable. Una caída de Clerk niega la acción privada y deja intacta la reserva.

### 9.5 Modelo de datos propuesto

La etapa 1 reutiliza User, Client y Booking. No crea otro sistema de identidad o tabla de permisos por email:

| Modelo | Actual / propuesta para C1 |
| --- | --- |
| User | Actual: id global, clerkUserId único nullable, email único, password nullable. Se conserva; ninguna importación/backfill/fusión automática |
| Client | Actual: organizationId, userId nullable, contacto, notes, isActive; unicidad `(organizationId,userId)` y `(id,organizationId)`. Se conserva A0.6-A; notes no salen en B2C |
| Booking | Actual: tenant/client/service/professional, instantes, status, updatedAt. Sin snapshot de tarifa ni nuevo status. C1 evalúa índice `(organizationId,clientId,startTime,id)` para consultas paginadas con EXPLAIN en desechable |
| CustomerOperation | **Nueva propuesta etapa 1:** tenant, actor local, operación, clave opaca derivada, referencia de Booking nullable, resumen no reversible del comando, createdAt/expiresAt. Unicidad tenant+actor+operación+clave; FK compuesta de Booking cuando exista. Sin body/PII en claro ni snapshot de perfil; repetición relee proyección autorizada |
| CustomerBookingPolicy | **Nueva propuesta etapa 2:** organizationId único/FK, allowCancellation=false, allowReschedule=false, cancellationNoticeHours=24, rescheduleNoticeHours=24, revision, updatedAt. CHECK 1–168; no filas activadas ni backfill de permisos |

Los defaults de modelos nuevos son recomendaciones pendientes, no campos actuales de Prisma. Claves foráneas/índices, alcance de los recibos y auditoría transaccional se deben probar antes de aprobar C1. Si la retención de un recibo elimina prueba de idempotencia, eso no elimina Booking. No almacenar contraseñas Clerk, códigos de verificación o credenciales del proveedor en PostgreSQL de Kortek.

## 10. Amenazas, abuso y controles exigidos

El modelo de amenaza cubre visitante abusivo, cliente autenticado que manipula IDs/slug, sesión robada, respuesta tardía y carreras con personal del negocio. Los controles siguientes son requisitos futuros; no resultados de seguridad probados en M2:

| Amenaza | Control propuesto y evidencia de aceptación |
| --- | --- |
| Enumerar cuentas por alta/entrada/recuperación | Respuestas neutras antes de posesión en Clerk y API; comparar HTTP, cuerpo, flujo y tiempos bajo correo existente/inexistente. D8 conserva el bloqueo de la vía legacy; esconder mensajes no basta |
| Robar historial por correo o teléfono | Resolver User por sub verificado y Client por vínculo explícito; no búsquedas de identidad por contacto. Claim conserva verificación primaria y rechazo de User legacy. Probar correo igual en dos identidades/negocios y teléfono compartido |
| IDOR y fuga entre tenants | Consulta final Booking+organizationId+Client.userId; cursors/recibos ligados al contexto. Ajeno/inexistente mismo 404 y proyección; sin lista de tenants del usuario consultado por otro actor |
| Cliente obtiene OWNER o agenda interna | Ninguna Membership nueva por claim/consulta; B2C separado del bootstrap/onboarding B2B. Probar JWT CUSTOMER y sesión cliente contra todos los endpoints B2B pertinentes |
| Secuestro por sesión expirada/revocada | Verificador Clerk actual, sesión remota activa, revalidación por petición; fail-closed en 503. Probar logout, revocación, issuer/origen/audiencia ajenos y pérdida de vínculo |
| CSRF/redirección/XSS | Método de sesión del SDK aprobado, orígenes y retorno allowlist; validar Origin/CSRF cuando transporte sea cookie. No aceptar tokens de URL ni HTML de perfil; CSP actual sin relajación |
| Replay y doble reserva/mutación | Idempotencia duradera para endpoints nuevos, locks/exclusiones y versiones; pruebas concurrentes desde dos procesos con resultado único y sin eventos duplicados |
| Spam, fuerza bruta y coste de proveedor | Límites compartidos, presupuestos por actor/IP/negocio, espera/reenvíos acotados y alertas sin PII; no añadir filtro de correos desechables, descartado por enmienda 21 |
| Permisos/caché obsoletos | Scope usuario+negocio+superficie, no-store, cancelación/instancia de visita; probar A → B → A, cambio de rol/identidad, atrás tras logout y respuestas demoradas |
| Perfil modifica contacto de otra persona | Resolver Client propio; reject IDs/email/notes/isActive; colisiones neutras, sin propagación a otros tenants. Prueba de request forjado y actualización paralela |
| Cancelación/reprogramación elude política | Releer política/estado/vínculo/versión bajo lock y reloj servidor; comprobar original y nuevo horario. Probar límite exacto, desactivación simultánea y personal operando en paralelo |
| Fuga en logs/errores/capturas | Selecciones explícitas, copy seguro, auditoría solo IDs mínimos, sanitizar evidencia antes de guardar; revisar respuesta, consola y trazas sin registrar bodies o credenciales |
| Client histórico mezclado | No convertir deduplicación en identidad. D4 bloquea casos ambiguos y requiere verificación asistida, sin exponer otras reservas como ayuda a reclamar |

Según la [documentación oficial de Clerk sobre enumeración](https://clerk.com/docs/guides/secure/user-enumeration-protection), la protección estricta oculta existencia hasta verificar identidad; el modo bulk mantiene señales de existencia. Por eso se propone estricta para el recorrido B2C. No se comprobó ni cambió la configuración de la instancia. Los manifiestos declaran `@clerk/nextjs ^7.8.0`, `@clerk/backend ^3.16.5` y `@clerk/localizations ^4.15.5`; no son prueba de configuración ni de compatibilidad en runtime. C1/C2 deben demostrar el método de D1 con las versiones efectivamente resueltas, sin actualizar paquetes por inferencia.

## 11. Migración, convivencia y rollback

No se ejecuta migración en C0. C1 debe ensayar la secuencia exclusivamente en PostgreSQL desechable/aislado y con dos tenants sintéticos; proveedor de identidad de desarrollo y buzones de prueba autorizados, sin contactos reales:

1. Registrar baseline de schema, constraints, permisos y pruebas A0.6-A/M1 en la base desechable. Preparar cuentas Clerk vinculadas, sin vínculo, legacy en colisión y dos negocios; ninguna copia de datos reales.
2. Migración aditiva de CustomerOperation e índice justificado; probar desde cero y sobre fixtures representativos. CustomerBookingPolicy pertenece al backend de etapa 2, no se activa en etapa 1.
3. Mantener User.password, JWT/rutas legacy y Memberships existentes. No rellenar Client.userId por email, no importar hashes ni convertir CUSTOMER legacy en acceso M2. A0.6-A conserva errores/idempotencia y constraints.
4. Publicar/activar solo tras aprobaciones de sus gates, con autorización futura separada. Este plan no autoriza publicación QA ni creación de flags. Actualizar BACKEND_CHANGES y controles solo en la entrega C1 autorizada, sin pisar este trabajo ajeno.
5. Cuando una identidad legacy colisiona, conservar ambas sin nuevo vínculo local; una eventual migración exige prueba explícita de las dos identidades, revisión y contrato auditado. No recomendar «usa otro correo» como forma de resolver una colisión ni prometer que la recuperación Clerk la une.

Rollback propuesto: volver a la versión web/API anterior autorizada, mantener tablas/índices aditivos mientras haya escrituras posteriores y conservar User/Client/Booking, vínculo explícito y recibos. No eliminar cuentas Clerk ni desvincular clientes en bloque. No restaurar un dump antiguo sobre una base con nuevas reservas; ensayar reversión de código con datos nuevos intactos. Migración inversa destructiva, cambio de flags o restore requieren otra autorización y reconciliación exacta.

El cliente vuelve a ver la experiencia anterior y sus límites, sin prometer Mis reservas si se retiró su backend. Las cuentas Clerk creadas siguen siendo identidades válidas; las reservas siguen en el negocio. Verificar compatibilidad del API anterior con el schema aditivo, idempotencia de reintentos y que el rollback no envía correos duplicados. Un vínculo aprobado previo se preserva para recuperar M2 después.

## 12. Criterios de aceptación y plan de QA futuro

Estos criterios son observables y pendientes de ejecución; no se rellenan como «Pasa» por inspeccionar código o entregar el C0:

| ID | Acción y resultado exigido | Etapa / evidencia |
| --- | --- | --- |
| AC01 | Desde mini-sitio ver Crear cuenta/Iniciar sesión y reservar sin cuenta; cada entrada conserva negocio y vuelve a un destino de cliente, sin crear Organization/Membership | 1; navegador + conteos en desechable |
| AC02 | Alta Clerk con nombre/correo verificado, entrada, recuperación y salida completadas; existente/inexistente no distingue cuenta antes de verificar | 1; proveedor de desarrollo, HTTP/copy seguros; bloqueo D8 separado |
| AC03 | Reservar invitado, fallar alta Clerk y claim en casos separados: exactamente una Booking PENDING permanece, aviso correcto y cero POST Booking en reintento de cuenta | 1; UI/red + conteos, no simular persistencia con mock |
| AC04 | Claim explícito nuevo y repetido: 201/200 y mismo Client.userId, sin Membership CUSTOMER; identidad distinta/legacy/otro tenant no gana vínculo ni recibe PII | 1; HTTP/PostgreSQL y regresiones A0.6-A |
| AC05 | Entrar como cliente A en Norte: solo Client vinculado y sus Bookings; manipular id/slug/cursor no lee cliente B ni Sur; ambos recursos ajenos/ausentes tienen 404 indistinguible | 1; dos tenants, respuesta completa y consulta autoritativa |
| AC06 | Próximas/Historial cumplen partición, orden, paginación y límites; reserva en curso, pendiente pasada, completada/cancelada futura y NO_SHOW quedan en pestaña correcta sin cambiar status | 1; reloj controlado y datos reales sintéticos |
| AC07 | Perfil propio guarda nombre/teléfono solo del tenant; rechaza email/IDs/notas/rol/estado; email Clerk cambiado no une cuentas ni modifica Client/avisos | 1; HTTP/DB/copy de conflicto |
| AC08 | Reservar otra vez relee catálogo/slot/precio y crea una nueva PENDING; servicio/profesional retirado pide seleccionar, no cambia la reserva original | 1; UI y alta autenticada real |
| AC09 | Dos altas autenticadas con la misma clave producen una reserva y un evento; distinta entrada con igual clave falla sin escritura; timeout se recupera sin duplicar | 1; concurrencia HTTP con dos procesos |
| AC10 | Usuario/negocio A → B → A, cambio de identidad, revocación, retorno desde otra app y atrás tras logout no muestran datos previos; lecturas tardías se descartan | 1; navegador, latencia y sesión real controlada |
| AC11 | Visita sin correo o con referencia perdida conserva la reserva y explica límites; no busca historial por correo/teléfono ni manda datos a un contacto sin prueba | 1; recorrido y request negatives |
| AC12 | Negocio retirado conserva lectura privada autorizada y niega repetir; organización inactiva niega acceso neutro; Client archivado conserva lectura y niega mutaciones propuestas | 1; fixtures y controles backend |
| AC13 | OWNER configura política; ADMIN/RECEPTIONIST/BARBER y CUSTOMER no la editan ni acceden a otro tenant. Cambio concurrente de revisión no sobrescribe política | 2; matriz HTTP y PostgreSQL |
| AC14 | Cancelar/reprogramar en límite exacto pasa; un instante después falla; estado/Invoice/Client/negocio no elegible niega sin eventos; reloj del teléfono no cambia resultado | 2; tiempo controlado y casos límite |
| AC15 | Reprogramar a slot ocupado o demasiado cercano falla y conserva cita original; cancelar/reprogramar/personal en carrera dejan un único resultado válido, avisos sin duplicar | 2; transacciones/exclusión real |
| AC16 | Cancelar/reprogramar muestran política efectiva, comparación y éxito real; consentimiento y canal pausado mantienen contrato de Notificaciones | 2; UI y outbox sintético sin despachos reales |
| AC17 | Vacío/carga/error/éxito/pending/offline/429/503 funcionan con foco, teclado, mensajes persistentes, consola sin errores relevantes y sin PII/credenciales | Ambas; navegador + evidencia sanitizada |
| AC18 | Teléfono físico permite alta/verificación/regreso desde correo, reservar/claim, consultar y repetir con teclado/barra visible, giro, zoom 200 %, lector y movimiento reducido | 1; iPhone/Safari y Android/Chrome reales; repetir acciones de etapa 2 cuando corresponda |
| AC19 | Migración aditiva/rollback de código en desechable conservan links/reservas nuevas y contratos legacy; no se pierde ni duplica operación | C1 de cada etapa; schema/diff/conteos y HTTP |

### 12.1 Matriz, preparación y ejecución

Preparar **Norte M2** y **Sur M2**, negocios nuevos sintéticos en una base exclusiva, sin reutilizar reservas QA del propietario. Cada uno con horarios confirmados, servicios/profesionales públicos y clientes separados; al menos un cliente vinculado a ambos negocios mediante dos claims explícitos y otro vinculado solo a Norte. Los slugs y usuarios se generan para el ensayo, no representan datos existentes. Para verificar Clerk usar direcciones de prueba controladas sin versionarlas, no dominios ficticios incapaces de recibir el código.

La matriz incluye visitante; Clerk sin User; cliente A/B; CUSTOMER legacy sin vínculo; OWNER, ADMIN, RECEPTIONIST y BARBER de ambos negocios; empleado que también es cliente y sesión revocada. Probar ataques de ID/tenant/rol y respuesta de API además de botones. Crear contacto ambiguo, Client sin correo/archivado, correo Clerk cambiado, colisión User legacy, recursos retirados, todos los statuses, lista multipágina y vencimiento de recibos.

C1: tipos/lint/pruebas/build API, Prisma validate/generate, migraciones desde cero/upgrade, constraints/índices y HTTP PostgreSQL real, todos exit `0`. Las pruebas de agenda, claim, políticas, sesión y eventos existentes siguen siendo regresiones obligatorias. C2: tipos/lint/build web y pruebas de comportamiento aplicables; integración con C1 aprobado, sin mocks que aparenten capacidad real.

C3 físico: Safari en iPhone real, incluido tamaño pequeño disponible, y Chrome en Android físico; registrar modelo/versiones al ejecutar, sin inventarlos. En escritorio Chrome/Edge y Firefox para teclado; viewports 320/375/390 y 1280+, sin confundir emulación con hardware. Probar regreso desde otra app, suspensión/bloqueo, código de correo, red lenta/offline, teclado abierto y barras expandidas/reducidas. Medir targets, overflow, contraste y tamaño real de campos; VoiceOver/TalkBack, foco y zoom 200 %. La aprobación física previa de M1 no aprueba el nuevo recorrido de M2.

Cada evidencia registra fecha, entorno aislado, SHA, etapa, caso AC, rol/alias sintético, tenant sintético, dispositivo/navegador, pasos, resultado Pasa/Falla/Pendiente, status HTTP y request id seguro. Capturas y cuerpos se revisan antes de guardar; nunca secretos, sesiones, contactos personales, contraseñas, códigos o contenido de comprobantes. Si falta dispositivo/proveedor/fixture, marcar Pendiente con impedimento; no sustituirlo por una build limpia.

## 13. Decisiones abiertas D1…D8

Solo se abren detalles no fijados. Las recomendaciones son propuestas documentales; el propietario debe seleccionarlas antes de su implementación. Ninguna alternativa reabre Clerk, unión por correo, visibilidad de cuenta o entrega por etapas:

| ID / decisión nueva | Opción A: ventajas y costes | Opción B: ventajas y costes | Recomendación y etapa |
| --- | --- | --- | --- |
| **D1 Método Clerk de entrada/recuperación B2C** | Código por correo, con nombre y verificación: sin contraseña nueva ni SMS; permite regreso desde correo. Depende de entrega y espera del proveedor | Email/password gestionados por Clerk y recuperación: familiar y sin código en cada entrada; añade contraseña, reglas y reset. No es extender auth legacy | **A**, con protección estricta de enumeración y prueba de SDK/configuración; no modificar preferencias globales que afecten B2B sin revisar esa compatibilidad. Etapa 1 |
| **D2 Navegación entre negocios vinculados** | Pantalla por negocio con selector solo de vínculos explícitos: contexto y política claros, consultas acotadas; requiere cambiar negocio | Vista agregada multinegocio, siempre por vínculos: facilita encontrar citas; más contexto, cache y reglas temporales mezcladas | **A** para ambas etapas; ninguna lista descubre reservas por correo ni Membership |
| **D3 Recuperar claim fuera de la visita** | Referencia en memoria y claim aprobado; si se pierde, verificación asistida por el negocio: conserva contrato/PII mínima; menos autoservicio y no garantiza recuperación al recargar | Recibo de posesión de un solo uso, con expiración y recuperación por canal verificado: mejor continuidad; nuevo contrato/persistencia/abuso y auditoría. No vuelve expirable A0.6-A por sí solo | **A** en etapa 1, con límite explícito y sin afirmar recuperación automática. B puede tener C0/C1 adicional; exigir TTL al endpoint existente queda detenido hasta enmienda |
| **D4 Historial de Clients antiguos/ambiguos** | Solo Clients ya vinculados o claim explícito aprobado, sin backfill ni exposición de casos mezclados; revisar casos ambiguos antes de habilitarlos: usa base aprobada, protege registros; resolución asistida y no garantiza historial completo | Añadir grants por Booking tras prueba individual: reduce exposición de registros mezclados; nuevo modelo/contrato y migración de vínculos ya aceptados, más trabajo para el cliente | **A**, bloquear casos ambiguos, no inferir identidad de deduplicación. C1 debe definir cómo registrar esa restricción/revisión si el inventario sintético demuestra el caso; no afirmar prueba de titularidad individual del histórico |
| **D5 Ventana/configuración de acciones de etapa 2** | Mínimo 24 h por defecto al habilitar, OWNER ajusta 1–168 h por acción y habilitación independiente desactivada inicialmente: margen conservador, política visible; limita cambios cercanos | Mínimo 12 h por defecto y mismo rango: más flexibilidad del cliente; mayor riesgo de huecos sin cubrir | **A**, comparación exacta de §7. OWNER confirma antes de etapa 2; no se presenta 24 h como decisión FIJADA |
| **D6 Quién edita política y cuándo afecta** | Solo OWNER; política vigente se aplica a reservas existentes al ejecutar, con versión/advertencia: control acotado, sin snapshot adicional; cambio puede reducir ventana de citas previas | OWNER/ADMIN; snapshot de política al reservar y regla explícita para reservas antiguas: estabilidad para cliente; amplía permisos y necesita persistencia/migración propia | **A** para etapa 2; advertir impacto antes de guardar y revalidar sin sobrescribir versiones |
| **D7 Alcance de perfil editable** | Identidad global en Clerk y nombre/teléfono del Client por negocio; email de contacto de solo lectura: evita propagación/cambio de avisos; requiere explicar separación y asistencia para email | Sin edición de Client, solo perfil Clerk: menos mutaciones; no corrige contactos operativos del negocio y puede dejar expectativa incumplida | **A**, con nombre/teléfono normalizados y error neutro; no sincronizar email ni enlazar cuentas por coincidencia. Etapa 1 |
| **D8 Enmienda para enumeración legacy residual** | Autorizar expresamente un correctivo contractual que neutralice alta secundaria legacy en HTTP manteniendo autenticación y reserva fail-open: corrige la vía sin retirar legacy; requiere contrato, regresiones y aprobación separados | Mantener exactamente M1/A0.6-A y aislar el consumidor M2 de createAccount/password: conserva contratos; **la vía HTTP legacy sigue enumerable**, no satisface protección integral | **A** antes de considerar protegida la plataforma o abrirla. Mientras no se autorice, ese cambio queda detenido, producción cerrada y riesgo explícito; B describe convivencia transitoria, no seguridad aprobada |

La documentación actual de Clerk advierte restricciones al combinar protección estricta, entrada unificada y password como primer factor. Es una condición a verificar para D1, no autorización para cambiar el método del personal ni actualizar dependencias. Si el SDK instalado exige un paquete nuevo, justificarlo y esperar aprobación; ninguna instalación forma parte de C0.

## 14. Evidencia documental, límites y Git final

La entrega audita estado, contratos y código; produce definición de las dos etapas, copy, permisos, amenazas, propuestas de datos/endpoints, rollback y matriz de aceptación. FIJADA 2 y 13 se trazan a las recomendaciones adoptadas; D1…D8 solo contienen detalles no resueltos. Las tensiones legacy se registran con opciones y sin cambiar sus contratos.

Validación documental ejecutada: revisión del documento completo y de sus destinos; **43 enlaces locales comprobados, cero ausentes**, decisiones D1…D8 y aceptación AC01…AC19, revisión de referencias contra código/contratos y búsqueda de patrones sensibles sin valores detectados. `git diff --check` terminó con exit `0`; la revisión adicional del archivo sin rastrear comprobó espacios finales y salto final con exit `0`. La comparación completa `git diff --no-index` contra NUL mostró exclusivamente el documento añadido; su exit nativo `1` significa diferencias, no se cuenta como un test aprobado. Las seis rutas iniciales conservan exactamente sus SHA-256 y el índice continúa vacío.

La búsqueda local de `ui-ux-pro-max` para «error summary validation» encontró tres resultados pertinentes de formularios/accesibilidad y terminó con exit `0` usando Python incluido en Codex; fundamenta el foco del resumen y los errores asociados. El comando `python` inicial no estaba en PATH y no se instaló nada. `rg` tampoco pudo iniciarse en este Windows; se usaron PowerShell y el inventario Git. La búsqueda recursiva amplia encontró directorios temporales protegidos y se sustituyó por búsquedas específicas; no se considera evidencia de que el informe original se haya leído.

**No verificado en C0:** informe de testing original ausente; runtime/SDK/configuración y método efectivo de Clerk; correo/verificación/recuperación real; endpoints M2 inexistentes; migraciones, concurrencia, idempotencia, política, protección completa de enumeración, historial de tenants reales, navegador y hardware móvil. El alcance solo documental no autoriza ejecutar esos cambios ni tocar bases/proveedores. No se ejecutan builds/tests como sustituto de QA; las evidencias históricas de M1/A0.6-A conservan únicamente su cobertura original.

Estado final comprobado contra Git: HEAD conserva `760131a39e11e73b5b86ec570bd381c2d1c4f11e`; índice vacío y trabajo ajeno intacto. `git status --short`:

```text
 M CHANGELOG.md
 M PROJECT_MASTER.md
 M docs/README.md
 M docs/quality/RESERVA_PUBLICA_CONFIRMACION_UX.md
 M docs/quality/RESERVA_PUBLICA_M1_C3_CIERRE.md
?? docs/quality/M2_CUENTA_CLIENTE_C0.md
?? docs/quality/evidence/m1-c3/aprobacion-cierre-20261003.json
```

**Siguiente paso: M2 necesita C1 (backend); no puede pasar directo a C2.** A0.6-A cubre el vínculo, pero no lectura B2C, perfil por negocio, alta autenticada idempotente ni política/autoservicio. El propietario debe revisar C0, decidir D1…D8 según etapa y resolver la enmienda D8 antes de modificar ese contrato. Después puede autorizar exclusivamente C1 de etapa 1, con backend validado y aprobación expresa previa a C2. Etapa 2 requiere autorización/backend/aprobación propios tras cerrar la primera. Este documento no declara C0 aprobado ni concede ninguna de esas autorizaciones.

## 15. Aprobación del propietario y publicación documental: 2026-10-03

El propietario aprobó por escrito el C0 de M2 y adoptó las recomendaciones de D1–D8, todas A. **C0 APROBADO / decisiones FIJADAS.** Esta sección registra la decisión posterior sin modificar el historial de las secciones 1–14. La [enmienda vinculante 28 y el alcance limitado de 29](DECISIONES_PROPIETARIO_2026_09_29.md#enmiendas-del-3-de-octubre-de-2026) sincronizan el registro neutral de decisiones.

| Decisión | Estado vigente y selección del propietario |
| --- | --- |
| D1-A | **FIJADA.** Código por correo con Clerk; nombre y correo verificado, protección estricta de enumeración y compatibilidad por verificar sin cambiar por inferencia la autenticación B2B. |
| D2-A | **FIJADA.** Pantalla por negocio, con selector exclusivamente de vínculos explícitos. Sin descubrimiento de reservas por correo o Membership. |
| D3-A | **FIJADA.** Referencia en memoria durante la visita y recuperación asistida por el negocio cuando se pierde. Sin recuperación automática por contacto, nuevo recibo ni TTL impuesto al claim A0.6-A. La asistencia no autoriza suplantación ni enlace por coincidencia de correo. |
| D4-A | **FIJADA.** Bloquear casos ambiguos antes de exponer historial; revisión asistida, sin backfill ni inferir identidad de deduplicación. El mecanismo autoritativo de bloqueo se deberá definir y probar en C1 autorizado. |
| D5-A | **FIJADA.** Etapa 2: 24 h de antelación por defecto al habilitar cada acción, ajustable entre 1 y 168 h enteras; cancelación y reprogramación desactivadas inicialmente. Configuración propuesta en Horarios → Política de reservas, separada del horario operativo. |
| D6-A | **FIJADA.** Solo OWNER edita política; política vigente al ejecutar, versión y advertencia de impacto sobre reservas existentes. No se amplía edición a ADMIN u otros roles. |
| D7-A | **FIJADA.** Nombre y teléfono del Client propio editables por negocio; correo de contacto de solo lectura. Sin propagación automática de datos o identidad entre negocios. |
| D8-A | **FIJADA.** Enmienda expresa y limitada para corregir la enumeración legacy residual de la creación secundaria de cuenta. Conserva reserva primaria y autenticación legacy; no autoriza retirar legacy ni ampliar permisos. |

Las decisiones 2 y 13 siguen FIJADAS. D1–D8 ya no están abiertas: la tabla de §13 conserva las alternativas examinadas antes de esta aprobación. Los DTOs, modelos y endpoints de §9 son el diseño aprobado de C0, **no backend implementado o aprobado**; C1 todavía requiere autorización de implementación, validación y aprobación expresa antes de C2. La segunda etapa conserva su autorización y aprobación propias.

### 15.1 D8: enmienda expresa y limitada del contrato legacy

La aprobación elimina el impedimento de decisión que registraban §§2.1 y 13 para definir el correctivo de enumeración. Su alcance se limita a neutralizar la señal de existencia de identidad que puede devolver `tryCreateCustomerAccount` mediante `accountCreationError` en `POST /public/:slug/bookings`, con respuesta segura y regresiones HTTP por definir en C1. No basta sustituir el mensaje visible mientras el API siga diferenciando la existencia de una cuenta.

Se conservan Client/Booking atómicos, creación PENDING, cuenta secundaria fail-open, reserva ya persistida ante fallo de cuenta, rechazo de colisiones de contacto y error neutro D11. No se inventa una reserva exitosa, no se une User por email y no se modifican el DTO/errores/idempotencia de A0.6-A, Memberships, roles, JWT/password ni otros contratos de autenticación. No se atribuye igualdad HTTP entre reserva creada y rechazada. Esta enmienda no autoriza implementar ahora el correctivo: la tarea actual es exclusivamente documental.

La enumeración residual sigue existiendo en el código hasta su implementación y validación futuras; no queda declarada corregida por aprobar D8. La verificación de Clerk, correo, sesiones, migraciones, concurrencia y móvil permanece pendiente con los límites de §14. Producción continúa cerrada e intacta.

### 15.2 Revisión de los seis archivos pendientes de M1

Base de esta revisión: `760131a39e11e73b5b86ec570bd381c2d1c4f11e`, rama `ai/antigravity-qa`, índice inicialmente vacío. Comparación de los cinco archivos rastreados mediante `git diff 760131a --` por rutas explícitas. El JSON no existe en ese commit; se compara como archivo nuevo contra NUL con `git diff --no-index`, sin añadirlo al índice. La evidencia versionada `cierre-documental-20261003.json` y el cierre ya publicado permiten distinguir aprobación repetida de evidencia de una ejecución anterior.

| Archivo pendiente | Aporte frente al commit base, duplicación y coherencia | Propuesta pendiente de respuesta del propietario |
| --- | --- | --- |
| `CHANGELOG.md` | Seis líneas de aprobación M1/UX y borrado previo del respaldo. Repite la aprobación de M1 ya versionada; añade la aprobación específica del ajuste y el antecedente del borrado. No contradice el cierre. | Conservar los aportes y consolidar la aprobación duplicada en una revisión documental de M1. |
| `PROJECT_MASTER.md` | Sustituye el ajuste UX en revisión por aprobado, incorpora la limpieza y repite la aprobación M1. El cierre M1 ya consta en la cabecera versionada; la aprobación específica de UX aporta información. No contradice el cierre. | Conservar el estado aprobado de UX y evitar otro resumen de cierre M1. |
| `docs/README.md` | Actualiza la aprobación UX y un párrafo C3 que aún decía «sin cierre». Repite el cierre vigente de la cabecera, pero corrige una descripción que podía confundirse con estado actual; añade el borrado previo. | Conservar la actualización y distinguir descripción histórica de estado vigente. |
| `docs/quality/RESERVA_PUBLICA_CONFIRMACION_UX.md` | Marca aprobado el ajuste y reemplaza pendientes por la aprobación, conservando límites de evidencia. Aporta la aprobación específica de esa UX, no detallada en el cierre general; repite solo la aprobación global M1. | Conservar aprobación de UX y límites, sin convertirlos en QA nueva. |
| `docs/quality/RESERVA_PUBLICA_M1_C3_CIERRE.md` | Añade el antecedente del hash/borrado y su evidencia; aclara ejecución original, aprobación y límites. Repite cierre M1 ya en la cabecera. La verificación previa del hash y la comprobación posterior de ausencia son ejecuciones distintas, no contradictorias. | Conservar evidencia del antecedente y contexto histórico, evitando reiterar el cierre como nueva aprobación. |
| `docs/quality/evidence/m1-c3/aprobacion-cierre-20261003.json` | Archivo nuevo de aprobación y limpieza anterior; consigna hash antes del borrado. La evidencia versionada solo comprobó ausencia posterior y no observó ese borrado. Hay solapamiento de aprobación, pero el antecedente de limpieza es adicional. | Conservarlo como evidencia de la ejecución anterior, sin afirmar que se volvió a verificar el hash o el borrado en esta tarea. |

No se revisaron respaldo, claves, proveedores, API o bases reales para revalidar esas afirmaciones operativas; se comparó documentación. No se detectó contradicción con el cierre M1 versionado. La coincidencia de afirmaciones no convierte el JSON previo en una nueva prueba ejecutada ahora.

El propietario solicitó esperar su respuesta antes de tocar esos seis archivos. Después de recibir la comparación, respondió el 2026-10-03: «Conservar y consolidar en una revisión separada». Esa respuesta autoriza la consolidación documental separada de M1; el commit de M2 se limita al C0 y sus enmiendas y conserva los seis archivos intactos durante su preparación/publicación. No se añaden entradas de M2 a CHANGELOG o PROJECT_MASTER dentro de este checkpoint: ambos forman parte del bloque de M1. El estado y la autorización vigentes de M2 quedan en este C0 y en el documento neutral de decisiones.

### 15.3 Autorización Git, validación y siguiente paso vigente

El propietario autorizó **commit y push exclusivamente documental a `origin/ai/antigravity-qa`**, sin despliegue. El alcance aislado de M2 comprende este archivo y `DECISIONES_PROPIETARIO_2026_09_29.md`. No incluye los seis archivos de la revisión separada de M1, código, dependencias, flags, variables, datos ni implementación D8. El resultado de publicación, SHA local/remoto y `git status` se reportan después del commit; no se inventa el hash del propio documento. La consolidación de M1 se mantiene local y fuera de esta publicación.

Antes de publicar se revisan el diff completo, enlaces locales y anchors de aprobación, estructura D1–D8 FIJADA, numeración de enmiendas, ausencia de valores sensibles, `git diff --check`, selección de rutas y diff staged completo. Las seis rutas pendientes se comparan por SHA-256 con su estado inicial para comprobar que se preservaron. No se repiten pruebas/builds funcionales por ser una aprobación documental, ni se declara nuevo QA de M1/M2.

**Siguiente paso vigente: C0 de M2 aprobado; M2 necesita C1 backend y no pasa directo a C2.** D1–D8 ya están resueltas y la enmienda limitada D8 está registrada. La implementación de etapa 1 y del correctivo necesita autorización específica de C1; esta orden solo autoriza documentación y publicación Git. Ningún gate de implementación ni despliegue queda abierto por inferencia. La respuesta del propietario permite conservar y consolidar los seis archivos de M1 en una revisión separada; no forman parte del checkpoint publicado de M2.
