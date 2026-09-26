# Notificaciones — C3: activación y QA real

Actualizado: 2026-09-22. **C3 CERRADO / APROBADO por el propietario.** C2 aprobado explícitamente por el propietario sobre la base `c7d43ad03a65a900a930a1a0d69dd258b8516a1e`. C3 se ejecutó solo para activación temporal y QA real; no hubo despliegue productivo ni apertura de otro módulo. Las cinco plantillas fueron enviadas una sola vez por Resend, quedaron `DELIVERED` y fueron revisadas visualmente por el propietario. El canal permanece desactivado.

## Objetivo y evidencia requerida

- Una reserva creada → confirmada → reprogramada → completada mediante el API real, sin interceptar llamadas ni sustituir proveedor. Completar únicamente después del fin real del servicio, sin alterar el reloj ni forzar estados en SQL.
- Otra reserva cancelada para cubrir la quinta plantilla. Esperar despacho de cada evento antes de cambiar nuevamente la reserva para no volverlo obsoleto.
- Destinatario Gmail indicado expresamente por el propietario, conservado solo en configuración privada local. Remitente `Booking <no-reply@booking.kortek.cloud>` y Reply-To aportado, mapeado a `NOTIFICATIONS_EMAIL_REPLY_TO`.
- Resend real y webhook firmado: correlacionar Booking/evento/intención/proveedor/recibo durable y demostrar DELIVERED. ACCEPTED no demuestra entrega ni lectura.
- Confirmación visual del propietario para registro, confirmación, reprogramación, completado y cancelación.
- Al terminar, pausar canal, detener worker y restaurar el endpoint temporal a su URL original, conforme instrucción expresa del propietario. Retirada de claves/webhook por el propietario, sin copiarlos a documentación.

## Preparación comprobada

Rama `ai/antigravity-qa`; HEAD igual al SHA aprobado. El árbol previo contiene C1/C2 y WhatsApp sin commit; preservado, sin staging ni push. Base C2 y evidencia previa conservadas.

El propietario autorizó explícitamente crear `kortek_notifications_c3_test` en el contenedor existente `kortek-notifications-c1-test`, loopback `127.0.0.1:55439`. Se aplicaron las 24 migraciones existentes. Fixture C3: un tenant controlado, OWNER de Clerk Development preexistente, profesional, servicio de cinco minutos y cliente con el destinatario autorizado. Sin nuevas identidades Clerk. La cola comienza vacía y EMAIL pausado. No volver a ejecutar las suites que limpian tablas una vez iniciado el recorrido real.

Resend, consulta visual real: `booking.kortek.cloud` figura **Verified**. El webhook existente apuntaba a la raíz `https://better-games-leave.loca.lt`; tras autorización explícita se guardó `https://better-games-leave.loca.lt/notifications/resend/webhook`. Se conservan sus eventos configurados y secreto. El proveedor temporal observado es localtunnel, no ngrok; no se atribuye a ngrok evidencia inexistente.

API C2 identificada por launcher y detenida para liberar puerto 3000. API C3 ejecutándose en ese puerto con canal de despacho desactivado; webhook habilitado con secreto temporal. Web existente en 3001, build C2 aprobada. La sesión real OWNER muestra `Kortek Pruebas C3` y únicamente las dos reservas controladas del recorrido.

## Correctivo de activación

La configuración validaba From como dirección desnuda, pero el valor aportado incluye nombre visible. Además, el worker envolvía siempre From con el nombre de organización, lo que produciría ángulos anidados. Se acepta un remitente único con nombre visible y el worker conserva ese From explícito. Para dirección desnuda se mantiene el comportamiento anterior con nombre del negocio. Se rechazan controles, múltiples direcciones y formato inválido; el snapshot sellado sigue inmutable. Sin endpoints, DTOs, permisos, schema, plantillas ni dependencias nuevos.

Archivos: `resend.adapter.ts`, `resend.adapter.spec.ts`, `email-worker.ts` y `notifications-producer.e2e-spec.ts` dentro de `apps/api`.

## Validaciones

| Comando / observación | Resultado |
| --- | --- |
| `pnpm --filter api exec jest src/notifications/resend.adapter.spec.ts --runInBand` | Exit 0, 35 pruebas |
| `pnpm --filter api exec jest --runInBand` | Exit 0, 649 aprobadas, 11 omitidas preexistentes |
| `pnpm --filter api exec jest --config ./test/jest-e2e.json notifications-producer.e2e-spec.ts --runInBand` con conexión C3 | Exit 0, 26 pruebas PostgreSQL; incluye From explícito y compatibilidad sin nombre |
| `pnpm --filter api build` | Exit 0 |
| `pnpm --filter api exec tsc --noEmit` y `pnpm --filter api lint` después del correctivo worker | Ambos exit 0 |
| POST vacío sin firma al webhook local | HTTP 401, rechazo esperado |
| POST vacío sin firma a `https://5hc2rb9j-3000.use2.devtunnels.ms//notifications/resend/webhook` | HTTP 401; el Dev Tunnel vigente alcanza Nest y el endpoint rechaza la ausencia de firma como corresponde |

Las pruebas automatizadas usan proveedor controlado y **no acreditan envío real**. Intentos iniciales de pnpm fallaron por acceso a su configuración local; ejecuciones posteriores listadas terminaron correctamente. El primer arranque C3 no pudo escuchar por puerto ocupado; se identificó y sustituyó únicamente la API C2, luego se comprobó el endpoint local.

## Estado del recorrido

El recorrido real usa el tenant sintético `Kortek Pruebas C3`, una única destinataria autorizada y dos reservas separadas. No se interceptó Resend ni se sustituyó el proveedor. La reserva principal conserva la secuencia `CREATED → CONFIRMED → RESCHEDULED` y permanece `CONFIRMED` hasta ejecutar su transición final. La reserva secundaria permanece `PENDING` hasta la cancelación separada.

| Reserva | Evento | Outbox | Intentos | Evidencia del proveedor |
| --- | --- | --- | ---: | --- |
| Principal | `CREATED` | `DELIVERED` | 1 | `email.sent` y `email.delivered` persistidos |
| Principal | `CONFIRMED` | `DELIVERED` | 1 | `email.sent` y `email.delivered` persistidos |
| Principal | `RESCHEDULED` | `DELIVERED` | 1 | `email.sent` y `email.delivered` persistidos |
| Principal | `COMPLETED` | `DELIVERED` | 1 | `email.sent` y `email.delivered` persistidos |
| Secundaria | `CANCELLED` | `DELIVERED` | 1 | `email.sent` y `email.delivered` persistidos |

Cada evento entregado tiene `providerId`, `firstDispatchedAt`, `closedAt` y recibos firmados durables en la base C3. No se documentan destinataria, secretos, payloads ni identificadores externos completos. El canal EMAIL vuelve a `paused=true` después de cada ciclo unitario del worker.

Resend recibió los eventos desde `https://5hc2rb9j-3000.use2.devtunnels.ms/notifications/resend/webhook`; después del recorrido, el webhook temporal fue eliminado desde el panel de Resend, que confirma **No webhooks yet**. El proceso C2 que ocupaba `3000` fue identificado por su cadena de procesos y detenido; al finalizar también quedaron detenidas la API y la web locales. La sesión OWNER se validó visualmente contra `Kortek Pruebas C3`, donde aparecen únicamente las dos reservas esperadas.

El propietario confirmó expresamente las acciones en el momento requerido. La UI real dejó la reserva principal `COMPLETED` y la secundaria `CANCELLED`. Se ejecutó un ciclo unitario del worker para cada evento; ambos recibieron un `providerId` real y quedaron `ACCEPTED`, con EMAIL nuevamente pausado. La intención `CREATED` antigua de la reserva secundaria expiró sin envío (`FAILED/EXPIRED`) antes de despachar la cancelación, por lo que no se produjo un sexto correo.

Resend mostró inicialmente los cuatro webhooks nuevos (`email.sent` y `email.delivered` para cada mensaje) en estado `Attempting`; no había solicitudes correlativas en Nest. Se normalizó la URL autorizada de doble a una sola barra en el mismo host y ruta. El propietario autorizó hacer público el puerto y confirmó que ya lo había cambiado. Los reintentos automáticos alcanzaron Nest con firma válida: `COMPLETED` y `CANCELLED` pasaron a `DELIVERED` y cada uno conserva sus dos recibos durables. El POST vacío sin firma continúa devolviendo 401, por lo que la apertura del túnel no elimina la autenticación del webhook.

## Continuación y configuración privada

`.tmp/notifications-c3/.env` (ignorado por Git) contiene conexión, fixture, destinatario y credenciales temporales. Nunca imprimirlo ni versionarlo. `setup.cjs` ya ejecutado; no repetir. `api.cjs` inicia API C3 con despacho apagado. `worker-once.cjs` se usa solo para un evento vigente por vez y pausa EMAIL en `finally`. C2 conserva `.tmp/notifications-c2/api.cjs` para restaurar la API anterior al terminar.

El propietario confirmó las cinco plantillas —registro, confirmación, reprogramación, completado y cancelación— y aprobó C3. El entorno temporal quedó cerrado: EMAIL pausado, API/web detenidas y webhook eliminado. No se activó producción ni se conservaron secretos en Git.

## Historial de recuperación del túnel

El propietario aportó `https://wise-bags-sniff.loca.lt` y un secreto nuevo, guardado únicamente en el archivo privado ignorado. Se recargó la API C3 con esa configuración. La primera prueba externa devolvió 408 mientras la API local respondía 401. El proceso localtunnel observado usaba `--port 3000` sin host local explícito; después terminó (identidad/proceso revalidados antes de actuar). Se inició el paquete ya instalado con `--port 3000 --local-host 127.0.0.1 --subdomain wise-bags-sniff`, obteniendo exactamente la URL aportada. El POST externo vacío ahora llega al webhook y devuelve HTTP 401 esperado, sin simular firma ni entregar eventos.

Resend mostró inicialmente un webhook apuntando a la raíz de ese túnel. La revisión automática rechazó guardar la ruta completa hasta recibir autorización explícita; el propietario la concedió. Después localtunnel cambió nuevamente y el propietario autorizó `https://odd-owl-77.loca.lt/notifications/resend/webhook`, con el que se recibieron los eventos `CREATED`, `CONFIRMED` y `RESCHEDULED`.

Se preparó horario 00:00–23:59 solo en el tenant sintético C3, antes de crear reservas, para permitir QA nocturno. No se alteró reloj ni código de disponibilidad. Las dos reservas controladas se crearon por la UI real. La principal avanzó hasta reprogramada, despachando y recibiendo cada evento antes de la transición siguiente; la secundaria se conserva pendiente para la cancelación separada.

Herramientas locales de continuación: `worker-once.cjs` ejecuta un único ciclo del worker real con Resend real, verifica tenant/destinatario y vuelve a pausar EMAIL en `finally`. `status.cjs` lee reservas, outbox, recibos y pausa, sin contenido ni destinatario. La lectura vigente acredita tres intenciones `DELIVERED`, seis recibos `email.sent`/`email.delivered`, una intención antigua `CREATED` pendiente en la reserva secundaria y `paused=true`. Esa intención antigua debe quedar obsoleta por la cancelación y no debe despacharse. No volver a ejecutar pruebas que limpian tablas ni `setup.cjs` después de crear reservas.

El 2026-09-22 el propietario sustituyó el túnel por Dev Tunnels y confirmó la URL completa vigente. Resend la muestra habilitada y el POST de conectividad devuelve 401 esperado. Los secretos nuevos permanecen exclusivamente en configuración privada local.
