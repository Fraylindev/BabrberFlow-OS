# WhatsApp manual — C3: activación y cierre

Fecha de registro: 2026-09-14. Estado: **CERRADO / APROBADO** por decisión explícita del propietario («Apruebo WhatsApp C3») el 2026-09-14. Verificación física de ambos destinos satisfactoria según confirmación manual del propietario. Documento de cierre y checkpoint aprobados sobre el árbol local con base c7d43ad03a65a900a930a1a0d69dd258b8516a1e. Sin despliegue productivo.

## Autorización y alcance

El propietario aprobó [C2](WHATSAPP_C2_FRONTEND.md) sobre el árbol local con base `c7d43ad03a65a900a930a1a0d69dd258b8516a1e` y autorizó C3: activación y este documento, exigiendo apertura real de WhatsApp con el mensaje esperado para los dos negocios de QA. C2 queda **CERRADO / APROBADO**. El SHA es la base del árbol aprobado, no un commit que contenga los cambios locales C0–C2.

[C1](WHATSAPP_C1_CONTRATO.md) y D1–D6 siguen vigentes: visitante → negocio, teléfono publicado internacional explícito, dominio fijo, mensaje genérico y acción manual después del registro de la reserva. Abrir WhatsApp no confirma Booking, no envía el mensaje ni acredita entrega. No se autorizan producción, otro módulo, nuevos contratos, proveedores, plantillas ni cambios de CMS/H5.

## Activación local

El código aprobado conecta `PublicMiniSite` con `SuccessView`, pasando `data.organization.phone` del slug actual después del éxito. [whatsapp-link.ts](../../apps/web/lib/whatsapp-link.ts) valida y compone el enlace; SuccessView lo presenta como enlace nativo. No existe un interruptor WhatsApp adicional en este recorrido ni se necesita proveedor, migración o nueva variable para habilitarlo. C3 conserva esa conexión sin modificar runtime.

La suite [whatsapp-c2.spec.ts](../../apps/web/e2e/whatsapp-c2.spec.ts) usa los casos `qa-whatsapp-a` (Estudio QA Norte) y `qa-whatsapp-b` (Estudio QA Sur), con API y destino externo interceptados. Sus números de ejemplo permanecen intactos. C3 completa la comprobación del destino externo con los dos números reales aportados por el propietario, asociados en el mismo orden. No se crearon organizaciones ni se modificaron snapshots o teléfonos publicados en la base.

| Caso C2 | Fixture histórico | Destino real C3 aportado por el propietario |
| --- | --- | --- |
| `qa-whatsapp-a` — Estudio QA Norte | `+18095551234` | Número 1, prefijo +1, terminado en `0386` |
| `qa-whatsapp-b` — Estudio QA Sur | `+34912345678` | Número 2, prefijo +1, terminado en `9955` |

Los teléfonos completos y los enlaces exactos permanecen en la conversación; se usan terminaciones en documentación versionable. El propietario confirmó explícitamente +1 para ambos. El helper productivo generó los enlaces con las entradas completas: aserciones de dominio `https://wa.me`, destinatario exacto, texto completo, único parámetro `text` y ausencia de fragmento terminaron con exit `0` en Node. No se infirió el país ni se cambió la validación.

## Verificación manual en teléfono real

Fuente: confirmación explícita del propietario en esta conversación, registrada el 2026-09-14. No es observación directa del agente ni una captura automatizada. El propietario informó: «WhatsApp abrió con el destinatario y mensaje correctos para Norte y Sur», desde un **iPhone 11**, y explicó que, al tener WhatsApp instalado, los enlaces abrieron directamente la aplicación; los resultados fueron satisfactorios.

El operador abrió los enlaces reales entregados en la conversación. Esta comprobación no usó el interceptor de Playwright ni una página sustituta del destino. El destino observado fue la aplicación WhatsApp instalada, no una página web de simulación. No se atribuye un navegador, versión de iOS/WhatsApp ni hora exacta que el operador no haya informado.

Mensaje esperado, idéntico en ambos casos:

> Hola. Acabo de registrar una reserva en su página y quisiera consultar con ustedes.

| Evidencia | Norte · 0386 | Sur · 9955 |
| --- | --- | --- |
| Operador y dispositivo | Propietario, iPhone 11 físico | Propietario, iPhone 11 físico |
| Acción | Apertura manual del enlace real entregado | Apertura manual del enlace real entregado |
| Destino observado | Aplicación WhatsApp instalada | Aplicación WhatsApp instalada |
| Destinatario | Correcto, confirmado por el propietario | Correcto, confirmado por el propietario |
| Mensaje esperado | Correcto, confirmado por el propietario | Correcto, confirmado por el propietario |
| Resultado | Satisfactorio | Satisfactorio |

La evidencia física cubre apertura, destinatario y mensaje de los dos destinos C3. No se presenta como una repetición del recorrido completo de reserva desde el iPhone ni como verificación de Nest/PostgreSQL, publicación CMS, envío o entrega. El protocolo inicial incluía una repetición integral; no fue ejecutada en el teléfono y no se le atribuyen resultados. El recorrido de reserva, aislamiento entre slugs y ausencia de una nueva reserva por clic conservan la evidencia aprobada C2. La prueba física solicitada complementa esa evidencia; no la sustituye.

## Evidencia conservada y auditoría de cierre

C2 aprobado conserva 106 pruebas de lógica, 30 de componente, 16 escenarios Chrome y tipos/lint/build con exit `0`, junto con accesibilidad, privacidad, popup bloqueado y 375 px. Sus fixtures e interceptores están declarados en su informe. C3 no reejecuta ni amplía esas pruebas: la entrega es documental más composición de los enlaces reales y confirmación manual del propietario.

| Requisito C3 | Evidencia / estado |
| --- | --- |
| Registrar aprobación C2 sobre la base indicada | Aprobación del propietario y documentos sincronizados |
| Activación del enlace manual aprobado | Conexión local PublicMiniSite → SuccessView → helper, sin interruptor adicional |
| Dos negocios C2 | Correspondencia Norte/Sur documentada con los dos números reales aportados |
| Teléfono real y destino no interceptado | Confirmación manual del propietario, iPhone 11 y aplicación instalada, ambos satisfactorios |
| Destinatario y mensaje esperado | Confirmación explícita para ambos enlaces; composición comprobada con el helper productivo |
| Documento de cierre | Este informe, aprobado por el propietario |
| Sin producción ni otro módulo | Sin despliegue, cambios de runtime o base de datos en C3 |
| Aprobación final del checkpoint | Aprobación explícita posterior: «Apruebo WhatsApp C3», 2026-09-14 |

Validación documental previa: 139 enlaces locales resueltos en siete documentos; sin marcadores de conflicto; `git diff --check` y staging vacío con exit `0`. Validación final de esta actualización: 141 enlaces locales resueltos en los siete documentos, sin marcadores de conflicto; documento C3 sin espacios finales ni teléfonos reales completos; diff de controles revisado, git diff --check y staging vacío con exit 0. No se requieren builds nuevos para esta actualización documental.

## Git, límites y cierre

Rama: `ai/antigravity-qa`. HEAD: `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`. Se preserva el trabajo local previo C0–C2: documentación, tres archivos frontend modificados, helper, pruebas API/web y evidencia C2. C3 actualiza este documento, PROJECT_MASTER, índice, C2, PRD, APP_FLOWS y CHANGELOG. Sin staging, commit, push ni despliegue; no existe un SHA nuevo publicado que reconciliar.

WhatsApp manual C1–C3 queda **CERRADO / APROBADO** dentro de D1–D6. La aprobación final explícita de C3 se registra separadamente de la confirmación previa de QA. No hay otra entrega autorizada; producción, ampliaciones y otros módulos requieren autorización propia. Cualquier rollback conserva apertura manual y privacidad; no restaura el mensaje con datos de reserva ni la apertura automática.
