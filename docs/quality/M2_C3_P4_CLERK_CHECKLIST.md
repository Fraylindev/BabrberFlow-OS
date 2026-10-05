# M2 C3 P4 — Checklist de Clerk Development

Fecha: **2026-10-04, America/Santo_Domingo**. Estado: **PREPARACIÓN DOCUMENTAL ENTREGADA / CONFIGURACIÓN Y PRUEBAS REALES PENDIENTES**.

Base local: `230bd7b3753df815effd8593623d68b3114daebe`, rama `ai/antigravity-qa`. Git inicial: árbol e índice limpios; rama **ahead 19** respecto de la referencia local `origin/ai/antigravity-qa`. No se consultó el SHA remoto.

Esta tarea permite leer el repositorio y metadatos públicos, escribir este documento y hacer **un commit local exclusivamente de esta ruta, SIN PUSH**. Codex no configura Clerk, Vercel, QA, variables ni flags; no inicia P5 ni publica/prueba la web. Producción permanece cerrada e intacta respecto de esta ejecución, sin consultas productivas. Las acciones futuras descritas abajo son un plan para el propietario, no acciones realizadas ni permisos implícitos.

## 1. Resultado y fuentes de verdad

**No se puede confirmar todavía que web QA, API QA y las pruebas locales reales pertenezcan a la misma instancia Development.** El repositorio registra claves test e igualdad histórica entre web QA y la clave local, pero no conserva los tres Frontend API efectivos. El ensayo C2 utilizó identidad Clerk controlada; no demuestra alineación ni entrega de correo. El GET público actual de web QA devuelve **302 al SSO de Vercel** sin metadatos Clerk extraíbles. Se conserva esa protección y no se inicia sesión para resolverlo en P4.

La ruta **web LOCAL → API QA es técnicamente posible con `next dev`, pero no está habilitada por el wrapper QA versionado**: exige exclusivamente el origen de web QA tanto en CORS como en las partes autorizadas de Clerk. No basta con configurar Clerk ni con apuntar `NEXT_PUBLIC_API_URL` al API. Se recomienda primero una prueba integral con proveedor real y API/base desechables; luego, si el propietario lo autoriza, web local contra QA con una apertura temporal de origen exacto y fixtures dedicados. La publicación de la rama queda al final.

Fuentes locales inspeccionadas:

- [Entrada documental](../README.md), [estado maestro](../../PROJECT_MASTER.md), [gates](DELIVERY_GATES.md), [seguridad](SECURITY_STANDARD.md) y [terminación](DEFINITION_OF_DONE.md).
- [C0, D1-A fijada](M2_CUENTA_CLIENTE_C0.md), [backend C1 y D4](M2_C1_CIERRE.md), [contrato y enmienda D4](../features/M2_CUENTA_CLIENTE_C1_CONTRATO.md), [C2 y aprobación local posterior](M2_C2_CIERRE.md), [flujos](../product/APP_FLOWS.md), [CHANGELOG](../../CHANGELOG.md) y [BACKEND_CHANGES](../../BACKEND_CHANGES.md).
- [Preflight C3](M2_C3_PREFLIGHT.md), especialmente **§25 P3 cumplido** y **§26 prevención CRLF**: documentan API QA release `bc1d559e42928ca0deb60319b33cf98b3cd69291`, migración 28 y gate runtime real de 37 tablas. Esto es evidencia previa del repositorio, no revalidación operativa de P4. Las cabeceras antiguas del maestro/preflight que todavía hablan de P2/P3 pendientes no revocan esos registros posteriores. Escrituras autenticadas con triggers sobre QA real siguen pendientes de P5.
- [Staging y cuatro identidades internas](STAGING_QA_2026-09-28.md), [CustomerAuth](../../apps/web/components/customer/CustomerAuth.tsx), [CustomerProvider](../../apps/web/components/customer/CustomerProvider.tsx), [CustomerClaim](../../apps/web/components/customer/CustomerClaim.tsx), [configuración Clerk API](../../apps/api/src/auth/clerk/clerk-auth.config.ts), [verificador de sesión](../../apps/api/src/auth/clerk/clerk-session-verifier.service.ts), [claim backend](../../apps/api/src/auth/clerk-customer-claims.service.ts), [CORS API](../../apps/api/src/main.ts), [wrapper QA](../../ops/oci-api/api-staging-run.sh), [gate web](../../apps/web/lib/web-deployment-config.ts), [Next config](../../apps/web/next.config.ts), [proxy Clerk](../../apps/web/proxy.ts) y [script dev](../../apps/web/package.json).

Se aplican las skills [kortek-delivery](../../.agents/skills/kortek-delivery/SKILL.md) y [kortek-product-ui](../../.agents/skills/kortek-product-ui/SKILL.md) para el plan de verificación frontend. La autorización literal de **solo este documento** prevalece sobre la actualización general de otros controles: no se modifican maestro, historiales ni preflight.

## 2. Alineación de instancias sin secretos

### 2.1 Matriz de evidencia y comprobaciones pendientes

| Consumidor | Evidencia disponible en P4 | Qué falta para confirmar |
| --- | --- | --- |
| Web QA `https://qa.booking.kortek.cloud` | Staging del 2026-09-28 registra `pk_test_` e igualdad SHA-256 con la clave pública local de entonces. GET público actual: 302 a SSO Vercel; no se obtuvo la clave ni el Frontend API del artefacto servido. | Propietario, desde navegador con acceso SSO existente, identifica deployment/SHA y extrae **solo publishable key o su host** del script Clerk/HTML de ese artefacto. No confundir variable Preview actual con valor incorporado al build. |
| API QA `https://api.staging.booking.kortek.cloud` | Wrapper exige `CLERK_PUBLISHABLE_KEY` test. `issuerFromPublishableKey()` deriva el issuer y el verificador compara `claims.iss`; además valida sesión activa, firma y partes autorizadas. | Metadatos de la **publishable key efectiva del proceso activo**, aportados por el operador autorizado. No hay endpoint público versionado que la publique; un 401 sin sesión no identifica el issuer. No leer el archivo runtime-env ni usar un dump de entorno/inspect. |
| Pruebas locales C2 | El [cierre C2](M2_C2_CIERRE.md) describe SDK/verificador controlados y falta de configuración real del proveedor en ese ensayo. Hay hosts `synthetic.clerk.accounts.dev`, `isolated.clerk.accounts.dev` y `example.clerk.accounts.dev` en drills/tests versionados. | No existe una instancia real demostrada por esos valores. Para la siguiente prueba, el propietario identifica explícitamente la publishable key Development del proceso local, sin abrir dotenv ni transmitir claves privadas. |
| Panel Development elegido | El repositorio describe cuatro usuarios internos sintéticos en Development. No se accedió al panel privado ni se conoce aquí su ID/Frontend API actual. | Propietario confirma aplicación, **Development**, ID de instancia y Frontend API en Domains/API Keys, y pertenencia de las cuatro cuentas internas a esa misma instancia. |

**Conclusión verificable hoy:** coincidencia histórica web/local test; pertenencia conjunta actual **PENDIENTE**, sin prueba de mezcla confirmada. No clasificar como alineada por prefijo, dominio QA, nombres de aplicación o éxito de un ensayo controlado.

### 2.2 Procedimiento de comparación

La publishable key contiene el Frontend API codificado; `pk_test_` indica Development y `pk_live_` Production. Véase [How Clerk works](https://clerk.com/docs/guides/how-clerk-works/overview). En un JWT de sesión, `iss` identifica ese Frontend API y `azp` el origen del cliente: [Session tokens](https://clerk.com/docs/guides/sessions/session-tokens).

El propietario puede usar esta función en una consola local con **solo una publishable key pública**; no usa paquetes, dotenv, red ni claves secretas. Es una receta, no fue ejecutada sobre claves reales en P4:

```javascript
function metadatosPublicosClerk(publishableKey) {
  const tipo = publishableKey.startsWith('pk_test_') ? 'Development'
    : publishableKey.startsWith('pk_live_') ? 'Production' : null;
  if (!tipo) throw new Error('Introduce exclusivamente una publishable key.');
  const base64 = publishableKey.slice(8).replace(/-/g, '+').replace(/_/g, '/');
  const valor = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  if (!valor.endsWith('$')) throw new Error('Formato público inválido.');
  const host = valor.slice(0, -1);
  const url = new URL(`https://${host}`);
  if (!host || url.hostname !== host || url.port || url.username || url.password)
    throw new Error('Frontend API inválido.');
  return { tipo, frontendApi: url.origin, issuerEsperado: url.origin };
}
```

1. Registrar por consumidor: origen, deployment/release o proceso, fecha, tipo y Frontend API resultantes. Preferir esos metadatos a copiar la clave completa. El API puede obtenerlos con un helper acotado **solo a `process.env.CLERK_PUBLISHABLE_KEY` dentro de su proceso/contenedor**, bajo autorización aparte de lectura operativa. No cargar archivos de credenciales ni imprimir otras variables; no ejecutar ese helper ahora.
2. Comparar exactamente `FrontendAPI_webQA = FrontendAPI_APIQA = FrontendAPI_localReal = FrontendAPI_panelDevelopment`, con tipo Development en todos. Dos claves test distintas pueden pertenecer a dos instancias distintas.
3. Propietario confirma en el panel que el host corresponde al ID Development anotado; las cuatro cuentas B2B sintéticas continúan allí. Basta confirmar exclusión de Production desde Development y los prefijos; no se necesita abrir ni copiar claves productivas.
4. En P5 autorizado, el propietario o un helper revisado obtiene **solo `iss` y `azp` de su sesión sintética en memoria**, sin imprimir/exportar el JWT, cookies, códigos, `sub` ni `sid`. No usar decodificadores web externos, HAR completo ni capturas de Authorization. Comparar issuer con la matriz; comprobar `azp` contra el origen de prueba aprobado. Decodificar claims no prueba firma: el API real debe aceptar la sesión mediante el verificador existente.
5. Si falta un dato, marcar PENDIENTE. Si aparece `pk_live_`, otro issuer o un origen no aprobado, detener antes de alta/claim. La corrección de claves/variables exige otra autorización y, para valores públicos web, un artefacto nuevo; no se corrige en P4.

Esta comparación prueba la identidad pública esperada de la instancia, **no el emparejamiento de claves privadas de servidor**. Este último se comprueba por funcionamiento autorizado del SDK/API, sin revelar el secreto. No crear `CLERK_ISSUER`: ese nombre no forma parte del contrato real, que deriva issuer de la publishable key.

### 2.3 Riesgo B2B/B2C

Compartir **Development** con las cuentas internas sintéticas es compatible con el diseño global User/Membership/Client, pero comparte también preferencias de autenticación, restricciones, cuotas y sesiones. No equivale a una instancia exclusivamente B2C. Mezclar B2C con la instancia interna **Production** expone identidades reales y está prohibido.

No importar, borrar, renombrar, fusionar o enlazar Users por correo. Un cliente B2C no obtiene Membership ni permisos del panel por registrarse; un rol B2B tampoco concede historial de clientes sin `Client.userId` propio habilitado. Una aplicación/instancia Development adicional para B2C es una alternativa de arquitectura, no un ajuste de panel suficiente: requiere claves propias, revisión del verificador de un único issuer, consumidores/middleware y compatibilidad. Queda fuera de esta preparación.

## 3. Ajustes requeridos y reversión por el propietario

### 3.1 Contrato C2 frente a configuración histórica

`CustomerAuth` recoge nombre obligatorio, trim, 1–120 caracteres y correo; envía `signUp.create({firstName,emailAddress})`, prepara/verifica `email_code`, sin password. Entrada y Recuperar acceso comparten `signIn.create({identifier})`, búsqueda de `email_code` en `supportedFirstFactors` y verificación. Solo activa sesión con `status === 'complete'` y `createdSessionId`. No implementa apellido, username, teléfono de autenticación, segundo factor, aceptación legal ni resolución de tareas adicionales. Mantiene espera local de reenvío **60 s** y nodo `clerk-captcha`.

El [flujo OTP Legacy oficial](https://clerk.com/docs/guides/development/custom-flows/authentication/legacy/email-sms-otp) corresponde al import `/legacy` usado por C2; no se propone actualizar SDK. Los [requisitos faltantes de SignUp](https://clerk.com/docs/nextjs/reference/objects/sign-up) explican por qué un campo obligatorio adicional impide completar el flujo.

Staging registra cuatro identidades internas Development con correo verificado, **sin contraseña** (`password_enabled=false`), cuatro User y cinco Membership: OWNER en Norte/Sur, ADMIN/BARBER/RECEPTIONIST en Norte. Fueron creadas con correos reservados de Clerk; **no son el buzón B2C y no acreditan correo entregado**. No se vuelven a crear ni se usan para alta/claim de clientes. El repositorio no demuestra los toggles actuales de nombre, contraseña, enumeración, captcha, lockout o access mode: todos requieren captura del propietario.

### 3.2 Registro previo común

Antes de guardar cualquier ajuste, el propietario crea un registro privado con fecha/hora RD, aplicación, ID Development, host público, página del panel y valor previo por toggle/lista. Guarda capturas **recortadas** del selector Development y de las opciones, con nombres `P4-01-instancia-antes`, `P4-02-email-antes`, etc.; oculta claves secretas, códigos, sesiones, URLs con tickets y direcciones/PII. No revela campos secretos en API Keys. Captura el estado posterior con el mismo encuadre y anota cada Save.

Las ubicaciones siguientes siguen la documentación oficial consultada el 2026-10-04; el panel privado no fue inspeccionado. Si una etiqueta cambió, localizar la sección por su función y documentar el nombre real. Si no se identifica de forma inequívoca, parar antes de guardar. La reversión siempre ocurre en **la misma instancia Development**, restaura valores/listas fotografiados y se comprueba con B2B. Restablecer opciones no borra identidades, reservas, claims ni sesiones creadas después.

### 3.3 Matriz de ajustes

| Ajuste | Valor requerido por C2 y contraste | Dónde lo revisa/ejecuta el propietario | Captura previa y cómo revertir |
| --- | --- | --- | --- |
| Correo como identificador de alta/entrada | Email habilitado para sign-up y sign-in, requerido al alta y verificado. Mantener los identificadores/métodos B2B existentes; C2 selecciona correo sin necesitar deshabilitar los demás. Estado actual no confirmado. | **User & authentication → Email**: revisar Sign-up with email, Sign-in with email, requisito y verificación al alta. [Opciones oficiales](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options). | `P4-02-email-antes`: todos los toggles y métodos de verificación. Reponer cada valor anterior y guardar; verificar entrada interna antes de reintentar M2. |
| Código por correo | Alta: verificación mediante **Email verification code**. Entrada: `email_code` disponible. Recuperación B2C usa ese mismo factor. No sustituirlo por enlace, SMS o password. Habilitar código no obliga a retirar enlaces que use B2B. | **User & authentication → Email**, opciones de verificación y de sign-in. [OTP Legacy](https://clerk.com/docs/guides/development/custom-flows/authentication/legacy/email-sms-otp). | `P4-03-code-antes`: estrategias habilitadas. Restaurar el conjunto anterior exacto; no cambiar plantillas/remitentes como parte de este ajuste. |
| Nombre obligatorio, sin apellido obligatorio | Recibir y persistir **firstName**. El nombre ya es obligatorio en UI C2 y en el perfil autoritativo utilizado por claim. Requerir firstName en Clerk si el panel permite hacerlo **sin exigir lastName**; lastName no requerido para este alta. No asumir controles separados que no se han visto. | **User & authentication → User model**, opción First and last name / campos de nombre. [Modelo de usuario](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options#user-model). Si Require acopla nombre y apellido, detener: no marcar ambos required ni simular apellido; resolver la decisión descrita abajo. | `P4-04-nombre-antes`: Enabled/Required de cada campo, o control conjunto real. Restaurar exactamente ambos estados; no editar nombres de las cuatro identidades internas. |
| Alta sin contraseña obligatoria | Debe completar con nombre y correo, sin password. Preferir conservar métodos internos y retirar solo la obligación de password si la opción existe. Si el panel solo permite una política global incompatible con B2B, detener antes de Save. | **User & authentication → Password**, Enabled/Required si se muestran. [Opciones](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options#password). No actuar sobre passwords individuales ni auth legacy. | `P4-05-password-antes`: habilitación/requisito/reglas. Reponer valores fotografiados; comprobar entrada, recuperación y continuidad de invitación/onboarding internos con autorización propia. |
| Recuperación de acceso B2C | Entrada por código para una identidad existente; no reset de contraseña, alta automática ni sustitución de email. La UI Recuperar acceso no llama a un método de forgot-password. Estado proveedor pendiente. | Mismos ajustes **Email / Email verification code**. Mantener aparte las políticas existentes de recuperación B2B; no hay toggle nuevo de recuperación exigido por C2. | La captura `P4-03` sirve de previo. Restaurar estrategias anteriores; no modificar Password reset ni recuperar una cuenta interna para esta prueba. |
| Enumeración | **Strict user enumeration protection**, requerida por D1-A. Bulk no satisface el ocultamiento de existencia. Debe funcionar en alta, entrada y recuperación custom Legacy; mensajes neutros en UI no prueban neutralidad del HTTP del proveedor. | **Protect → Rules → User enumeration protection → Manage → Strict → Save**. [Protección oficial](https://clerk.com/docs/guides/secure/user-enumeration-protection). Revisar también estrategia preferida y efectos en B2B antes de guardar. | `P4-06-enumeracion-antes`: modo previo y estrategia preferida. Reponer ambos si hubo cambio; parar pruebas B2C y registrar que el requisito estricto queda incumplido hasta resolverlo. |
| Anti-bot | **Bot sign-up protection Enabled**; mantener Smart si hay selector, no cambiar a Invisible ni activar un bypass. C2 tiene el contenedor captcha, pero el challenge real sigue pendiente. | **Protect → Rules → Bot sign-up protection → Enable/Manage → Enable → Save**. [Bot protection](https://clerk.com/docs/guides/secure/bot-protection). No activar Native API para evadir CAPTCHA. | `P4-07-bot-antes`: estado/tipo si existe. Restaurar lo fotografiado solo como rollback de incidente; no ensayar M2 con protección desactivada para declararlo válido. |
| Abuso, intentos y cuota | Conservar límites del proveedor. Lockout habilitado con umbral/duración finitos aprobados; si ya existe una política interna, conservar sus valores y revisar compatibilidad. Propuesta solo si falta política: **10 intentos / 1 hora**, decisión del propietario, sin prometer que sea el estado de esta instancia. | **Protect → Rules → Lockout policy → Enable/Manage**, Maximum attempt limit y Lockout duration. [Lockout](https://clerk.com/docs/guides/secure/user-lockout). Cuota/límites gestionados por proveedor; no ampliar plan ni desbloquear usuarios para pasar pruebas. | `P4-08-lockout-antes`: Enabled, máximo y duración. Restaurar esos valores. Un usuario ya bloqueado puede requerir esperar el plazo o autorización separada del propietario para Unlock; cambiar la política no demuestra desbloqueo. |
| Requisitos de alta y restricciones | El buzón dedicado debe poder darse de alta sin invitación/ticket ni requisitos que C2 no recoge. Conservar restricciones compatibles; no abrir Development a todos sin decisión. Si hay Invite-only/Waitlist o bloqueo del buzón, detener y decidir el cambio mínimo. | **User & authentication → Access mode** y sus Allowlist; revisar Blocklist/restricciones de correo. [Restricting access](https://clerk.com/docs/guides/secure/restricting-access). Para alta directa, evaluar **Open con Allowlist** de direcciones exactas de prueba y preservación de reglas internas; no habilitar todo un dominio por comodidad. | `P4-09-acceso-antes`: modo y listas completas en custodia privada. Restaurar modo y lista exacta; no retirar direcciones existentes ni borrar usuarios. La evidencia compartida enmascara correos. |
| MFA, tareas de sesión y métodos internos | El cliente de prueba no debe tener factores/tareas obligatorios sin soporte C2. **Mantener** política B2B/MFA/SSO existente; no rebajar seguridad interna ni REQUIRE_INTERNAL_MFA. Si la exigencia global impide C2, hay un bloqueo de compatibilidad. | **User & authentication → Multi-factor** y ajustes de sesiones/tareas existentes, solo inventario y captura. No marcar/desmarcar Require multi-factor authentication por este checklist. [MFA y tareas](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options#multi-factor-authentication). | `P4-10-interno-antes`: políticas/estrategias/tareas. Sin cambio previsto, sin reversión necesaria. Una propuesta de cambio necesita alcance propio y rollback revisado. |

**Decisión de nombre:** habilitar un campo para recibir firstName no prueba que Clerk lo exija globalmente. Si el panel solo ofrece «Require first and last name», el requisito de nombre de **C2** sigue implementado en su formulario y comprobado por backend antes de claim, pero no puede afirmarse requisito independiente firstName a nivel proveedor. El propietario debe aceptar expresamente esa garantía de C2 o pedir una solución adicional bajo otra tarea. No presentar el panel como configurado ni exigir apellido que el consumidor no envía.

**Decisión de enumeración:** la documentación describe diferencias entre Strict y Bulk y variantes sign-in-or-up de componentes preconstruidos. C2 no usa `<SignIn />` ni `signUpIfMissing`. No habilitar alta automática ni cambiar el flujo para una dirección desconocida por inferencia. Verificar Strict con el SDK Legacy instalado; si requiere otra estrategia preferida o rompe acceso B2B, parar y revisar el consumidor/configuración antes de publicar. No desactivar Password globalmente solo para satisfacer una recomendación de un componente distinto.

### 3.4 Invariantes B2B que se deben preservar

- Las cuatro identidades, sus correos, verificación, nombres, sesiones, `clerkUserId`, User y cinco Membership actuales. No usarlas como clientes ni fixtures de claim; no otorgarles Membership nuevas por esta preparación.
- Factor de código por correo que permite entrar a identidades históricamente sin password; estrategias adicionales, password/SSO, MFA y reglas de recuperación/invitación/onboarding internas según inventario real.
- URLs de login/register/invitación, redirects, `CLERK_INVITATION_REDIRECT_URL`, Authorized parties, JWT templates/audiencias, duración/sincronización de sesiones, dominios, webhooks y métodos de enlace. No tocar flags, remitentes, SMTP, planes, tokens de prueba ni claves.
- El rollback no implica borrar cuentas recién creadas ni revocar sesiones de otros usuarios. Alta de prueba, revocación deliberada y limpieza tienen permisos propios.

## 4. Verificación posterior de Codex, con configuración conservada

**No se ejecuta ahora.** Tras la configuración manual y confirmación del propietario, Codex revisará evidencia y probará únicamente el alcance autorizado de P5/web. «Sin cambiar nada» significa aquí mantener configuración, proveedores, flags y producción durante la verificación. Alta, envío de OTP, sesión, sign-out, reserva y claim sí producen efectos: requieren permiso explícito previo para identidades/fixture de prueba. Si el siguiente permiso es exclusivamente de lectura, Codex solo revisará resultados aportados por el propietario y no iniciará esos flujos.

| Prueba prevista | Evidencia mínima y criterio | Efecto/permiso necesario |
| --- | --- | --- |
| Identidad/orígenes | Matriz de cuatro Frontend API iguales, Development, issuer/azp correctos y sesión aceptada por verificador real; no SDK controlado. | Lectura acotada de metadatos y sesión de prueba autorizada. |
| Alta `/<slug>/cuenta/crear` | Nombre vacío rechazado; nombre válido persistido; correo primario verificado; `complete` sin requisitos extra. Cuenta B2C sin Membership, sin User enlazado por coincidencia de correo. | Alta real de **identidad dedicada**, no cuenta B2B. |
| Correo realmente recibido | Propietario confirma recepción en su buzón dedicado, incluyendo spam, hora/envío/recepción y etiqueta Development; código recibido válido en ese intento. Registro enmascarado de resultado y latencia, sin código/cuerpo privado. | Envío real aprobado. Propietario introduce OTP, sin dictarlo ni copiarlo a logs/chat. El éxito del SDK o webhook no prueba entrega. |
| Entrada y recuperación | Tras salida, `/<slug>/cuenta/entrar` y `/<slug>/cuenta/recuperar` aceptan códigos reales y regresan solo a rutas admitidas del mismo negocio. | Nuevos envíos/sesiones autorizados para el buzón. Recuperar no cambia password. |
| Claim explícito | Reserva invitada propia + correo igual al primario verificado + consentimiento. `POST /auth/clerk/customer/claims` envía `{bookingId,organizationSlug}`; 201 nuevo/200 repetición conforme contrato; luego GET del detalle propio válido. No anunciar visibilidad solo por `{claimed:true}`. | Escritura P5 en fixture propio. C2 debe conservar referencia en la misma visita; recargar/cerrar puede perderla. |
| Mis reservas y privacidad | `GET /customer/businesses`, lista Próximas/Historial y detalle propios; PENDING honesto, paginación, `private,no-store`, sin PII de otros. Identidad sin vínculo no recibe historial; ajeno/inexistente/bloqueado devuelve 404 neutro. | Lecturas del fixture y, para negativos entre tenants/usuarios, segunda identidad/fixture autorizados. |
| Camino con triggers/recibos | Bajo P5, nueva reserva autenticada y PATCH perfil propios; una sola operación y recibo con replay de misma clave/comando; revisión de reservas y aislamiento permanecen correctos. No enviar otra clave ante resultado incierto. | Mutaciones específicas y fixture aprobados; cubre pendiente de P3. No desbloquear Client manualmente para forzar éxito. |
| Salida | Sign-out confirma salida real; información/caché desaparecen y Volver no recupera datos; token anterior rechazado por sesión revocada si se autoriza el caso. | Cerrar **solo sesión de prueba**. Revocación adicional desde panel requiere autorización del propietario. |
| Errores y protección | Código inválido/expirado/reutilizado, reenvío, cuenta existente/desconocida, captcha y 429/lockout: mensajes útiles sin revelar existencia ni datos técnicos; HTTP proveedor también neutro. Comparar solo direcciones controladas por el propietario. | Casos acotados, presupuesto de envíos/intentos aprobado; no ráfagas, fuerza bruta ni cuentas ajenas. Challenge no presentado se registra «no ejercido», no aprobado. |
| Regresión B2B | Propietario verifica por separado login/salida y lectura del panel con OWNER/ADMIN/RECEPTIONIST/BARBER existentes; OWNER conserva Norte/Sur, otros solo su alcance. Recuperación/invitación nueva, si necesarias, se autorizan aparte. | Sesiones internas solo para regresión B2B, nunca para identidades B2C o claim. No recrear invitaciones por este checklist. |
| QA de interfaz | Navegador real, 320/375/390/1280, teclado, estados, consola, reflujo; luego iPhone/Safari, Android, VoiceOver/TalkBack y zoom real bajo autorización web. | Prueba local no acredita dispositivo físico ni Preview desplegado. Aviso Development se distingue de errores de aplicación. |

El [proveedor limita Development](https://clerk.com/docs/guides/development/testing/test-emails-and-phones) a **100 correos/mes calendario** cuando los entrega Clerk, con excepciones documentadas; al agotarse se rechazan OTP. Las direcciones con patrón reservado de prueba no envían el OTP real. Para B2C usar el buzón dedicado o alias reales acordados, **sin `.invalid`, sin `+clerk_test`, sin cuentas B2B y sin código fijo**. [Development](https://clerk.com/docs/guides/development/managing-environments) tiene tope de **100 usuarios** y diferencias de sesión respecto de Production; no migrar usuarios ni convertir el entorno por ese límite.

Antes de probar, el propietario confirma cuota disponible y fija presupuesto de envíos, alias/control de recepción y máximo de intentos fallidos menor al lockout vigente. Si se desconoce la cuota, no prometer capacidad ni agotar el proveedor para medirla. Propuesta: prueba principal con un buzón y hasta **10 envíos**, negativos por separado si quedan disponibles; ese presupuesto no asegura cuota restante. La UI espera 60 s; la [guía del proveedor](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options#email) describe reenvío preconstruido a 30 s y código válido 10 min: no atribuir ese cooldown a C2 ni inferir que protege llamadas directas. Registrar límites reales encontrados, sin cambiarlos.

## 5. Ruta más segura para P5 y la prueba web

### 5.1 Opciones y requisitos

| Opción | Qué permite y qué requiere | Riesgos/límites y autorización |
| --- | --- | --- |
| **A. Web local + API/base desechables + Clerk Development real** | Probar primero C2 completo con proveedor/códigos reales, mismo issuer elegido, API C1 y migración/grants 28 con runtime restringido en desechable. Solo datos propios nuevos, sin restore QA para este flujo mínimo. Web por `http://localhost:3001`; API por otro puerto libre. CORS/azp exactos en el **proceso desechable**, SDK y proxy Clerk reales. | Menor impacto en QA; consume cuota y crea identidades/sesiones Development. Exige autorización del ensayo y del acceso privado de servidor gestionado por el propietario, sin exponerlo. No demuestra escritura ni runtime de QA real. No repetir el arnés C2 con Clerk controlado como si fuera prueba del proveedor. |
| **B. Web local → API QA** | Mantener web sin push y comprobar backend QA real, triggers/claims/recibos. `pnpm --filter web dev` usa Next en `http://localhost:3001`; futuro proceso local con `DEPLOY_ENV=development`, `NEXT_PUBLIC_API_URL=https://api.staging.booking.kortek.cloud` y publishable key Development alineada. Credencial de servidor, si necesaria, la proporciona el propietario por mecanismo privado aprobado, no la recibe/imprime Codex. | Hoy bloqueada por wrapper/orígenes. Requiere permiso separado para cambio temporal QA, ventana/reinicio si corresponde, rollback y fixtures/escrituras P5. `next dev` permite este escenario; **build/start con DEPLOY_ENV=development exige API local**, por lo que no se promete equivalente de release local contra QA sin otro diseño. |
| **C. Web QA publicada → API QA** | Tras pasar P5 y revisión local, autorización P6 para push QA y despliegue Vercel; build con staging/orígenes QA y claves públicas ya comprobadas; verificar SHA y alias, SSO conservado y QA real. | El push incluye commits locales pendientes y dispara web; auditar todo el rango a publicar, no solo este checklist. No hacer push de prueba ni cambiar alias/variables para saltar gates. El hostname aleatorio Preview puede tener azp diferente: usar alias QA admitido, no wildcard. Fallo requiere volver al artefacto anterior mediante autorización de rollback. |

**Orden recomendado:** completar matriz/decisiones → propietario configura Development con capturas → autorizar A → presentar evidencia real sin publicación → decidir si autoriza B y fixture P5 → verificar QA real → retirar apertura temporal y revalidar → revisión/permiso P6 → C y QA física. Ninguno de esos permisos se concede por aprobar este plan. Si no se autoriza tocar orígenes QA, A sigue disponible bajo su propio permiso; B permanece bloqueada. Publicar C directamente permite probar desde el origen ya autorizado, pero expone la rama antes de validar C2 y no cumple el objetivo de probarlo primero localmente.

### 5.2 Por qué B necesita tres comprobaciones distintas

1. **CORS de Nest:** [main.ts](../../apps/api/src/main.ts) admite una lista desde `CORS_ALLOWED_ORIGINS`. El fallback localhost solo aplica si falta la variable; no se activa en QA configurado. Para B se necesitaría conservar `https://qa.booking.kortek.cloud` y añadir temporalmente **solo `http://localhost:3001`**, con puerto fijo. No `*`, `null`, IP de LAN ni todos los puertos.
2. **Origen del token:** `CLERK_AUTHORIZED_PARTIES` debe admitir ese mismo localhost además del alias QA. [authenticateRequest](https://clerk.com/docs/reference/backend/authenticate-request) verifica partes autorizadas; CORS abierto no autoriza un JWT cuyo azp no corresponde. La [configuración API](../../apps/api/src/auth/clerk/clerk-auth.config.ts) acepta listas de orígenes exactos, pero el [wrapper QA](../../ops/oci-api/api-staging-run.sh) exige igualdad exclusiva con QA en ambas variables. Cambiar solo variables fallaría el arranque: se necesita una tarea autorizada que revise wrapper/artefacto/configuración, respalde el estado previo y pruebe su rollback. No modificarla aquí ni sustituir guards, issuer, aud o cabeceras.
3. **Clerk Development en navegador:** su diseño admite desarrollo en localhost ([entornos](https://clerk.com/docs/guides/development/managing-environments)); aun así comprobar el host/puerto elegido, redirects y políticas existentes de esta instancia. El panel **Domains/URLs existentes**, si expone Development origin, permite registrar su estado previo; no cambiarlo por inferencia. La propiedad [allowedOrigins](https://clerk.com/docs/reference/backend/types/backend-instance) documenta casos de extensiones/Electron/Capacitor: no demuestra que web Next ordinaria necesite una nueva lista de panel. Si hay rechazo de origen, registrar el error sanitizado y pedir decisión mínima al propietario. No activar Native API, crear proxy que falsee Origin ni eliminar CSP para evadirlo.

Para la apertura temporal: inventariar valores públicos previos y wrapper de la imagen activa, conservar QA, probar positivos del localhost elegido y negativos de origen ajeno, fijar vencimiento y responsable. Al terminar, restaurar **ambas listas y wrapper/artefacto previos** de forma coordinada y comprobar que QA sigue funcionando y localhost vuelve a rechazarse. La autorización debe especificar el reinicio necesario y no comprender worker, Caddy ni servicios productivos. Un teléfono físico no accede al localhost del PC: probar en LAN/túnel requeriría otro origen/azp, autorización y revisión; la opción B descrita no lo incluye.

### 5.3 Datos mínimos para QA y procedimiento propuesto

No utilizar ni vaciar `qa-horario-norte`, `qa-horario-sur`, `m1-c3-norte`, `m1-c3-sur` ni sus Clients/Bookings para improvisar P5. Sus datos contienen trabajo previo y D4 no garantiza ausencia de mezcla dentro de una ficha. **Preferencia: negocio/fixture nuevo dedicado M2 en Cutover QA**, con nombre visible inequívoco de prueba, slug propuesto `m2-c3-p5-dedicado` (comprobar disponibilidad, sin sobreescribir si existe), contacto exclusivamente controlado y sin identidad B2B nueva.

| Dato | Necesidad y límite |
| --- | --- |
| Organización sintética dedicada | Activa, horario/zona definidos, publicación QA y catálogo elegible para reserva pública. La creación/publicación requiere autorización; no «reactivar» otro negocio ni abrir producción. La administración puede asignarse a una identidad OWNER sintética existente mediante procedimiento aprobado; una Membership adicional también es una escritura separada, no permiso implícito. |
| Servicio y profesional sintéticos | Un servicio activo con duración/precio de ensayo claramente identificados; un profesional ACTIVE/publicable y disponibilidad real dentro del horario dedicado. Usar contrato existente, sin inventar endpoints o ProfessionalService. No vincular el buzón cliente a un profesional/User interno. |
| Contacto cliente | Nombre sintético explícito, correo del buzón/alias real que controla el propietario, teléfono exclusivamente de prueba/controlado que cumpla normalización y no colisione. No usar números ajenos ni `.invalid`; no publicar esos datos personales en evidencia. |
| Reserva invitada | Crear una única reserva futura mediante flujo público aprobado, con el correo exacto que se verificará en Clerk y teléfono exclusivo. Mantener PENDING; opt-in de notificaciones **desmarcado**, sin pago/factura. El correo Clerk de OTP es independiente de Resend/worker QA. |
| Identidad B2C | Nueva en Development por C2 con correo real/nombre, sin Membership ni alta de negocio; User local se crea si corresponde por claim explícito, nunca por unión de correo. |
| Casos negativos adicionales | Segunda identidad controlada y, si la matriz lo exige, segundo tenant M2 dedicado y Client/Booking propios separados. Autorizar solo esos casos, cantidades y valores; no exponer filas anteriores para demostrar aislamiento. |
| Replay/edición/alta autenticada | Reservar otro slot y valores de perfil sintéticos para P5; mismos comandos/UUID en reintento. Conservar manifiesto de recursos creados y resultados inciertos, sin hard-delete financiero u operativo. |

Procedimiento futuro más seguro:

1. **Lectura QA separada:** revalidar release/schema 28/runtime y disponibilidad de slug/recursos, inventario agregado y canales activos. El estado previo P3 no sustituye esa comprobación. Registrar destino Cutover QA y snapshot/rollback vigente sin abrir backups ni secretos en P4.
2. **Autorización de fixture:** propietario aprueba negocio nuevo o subfixture inequívocamente aislado, relación administrativa si hace falta, publicación solo QA, contactos controlados, cantidades y retención. Preparar manifiesto previo y procedimiento transaccional por contratos existentes; si hace falta seeding administrativo, revisarlo antes en desechable y autorizarlo por separado. No mutar globalmente flags ni desactivar worker.
3. **Autorización de identidades/envíos:** propietario designa buzón y alias reales que recibe, presupuesto OTP y quién introduce códigos. No reutilizar cuatro identidades B2B, importar usuarios ni crear test users por Backend API que eludan el alta real C2.
4. **Autorización P5:** crear reserva invitada, alta/entrada real, consentimiento y claim dentro de la misma visita; comprobar lectura autorizada antes de éxito. En Client nuevo el default bloqueado permanece hasta que el claim legítimo lo habilite según enmienda D4. No usar SQL para poner `customerAccessBlocked=false`; si aparece ambigüedad, conservar bloqueo y detener ese caso.
5. Ensayar rutas propias/ajenas, nueva reserva y perfil/recibos con triggers sobre QA real dentro del fixture. Verificar preferencia/outbox de ese conjunto sin envío Resend inducido. Ante resultado incierto, releer antes de repetir; no limpiar evidencias de una mutación posiblemente confirmada.
6. **Retiro independiente:** restaurar configuración temporal de orígenes si se autorizó, detener solo procesos locales propios y conservar manifiesto de fixtures. Borrar/revocar identidades, reservas o negocio requiere otra decisión explícita y revisión de dependencias; preferir retener fixture identificado/inactivo conforme contrato aprobado. No resetear QA ni usar la inversa de migración 28. Las capturas/configuración previa del propietario permanecen en custodia privada.

D4 y la paginación pendiente del panel continúan bloqueando Paso 8/producción; este fixture no resuelve históricos ni amplía la etapa 1 a cancelación/reprogramación.

## 6. Decisiones del propietario y pasos de panel en orden

### 6.1 Decisiones antes de guardar

- Confirmar aplicación/instancia Development compartida con los internos sintéticos y los cuatro Frontend API. Si se necesita otra instancia, abrir decisión/arquitectura aparte; no crearla como parte de este checklist.
- Designar buzón dedicado real, alias para negativos bajo su control, recepción y presupuesto de OTP/cuota. El cliente nunca usa una cuenta B2B.
- Aprobar compatibilidad global: firstName sin apellido obligatorio; alta sin password obligatorio; Strict; bot protection; lockout y restricciones. Resolver los controles acoplados de nombre/password, MFA global o acceso por invitación **antes de guardar**. Si no hay combinación compatible, detener la configuración y mantener C2 local.
- Elegir A primero y decidir posteriormente B o C. B requiere autorización de cambio temporal de orígenes/wrapper y retorno exacto; C requiere publicación P6. Aprobar este documento no concede esas acciones.
- Aprobar por separado lectura QA, fixture y posible Membership administrativa, alta de identidad/envíos, mutaciones P5, regresión B2B y limpieza/revocación. Definir responsable de rollback, plazo y custodia de capturas.

### 6.2 Secuencia exacta para el propietario

**Estos pasos son para una ejecución manual futura expresamente decidida por el propietario. Codex no los ejecutó.**

1. Entrar en su **Clerk Dashboard**, seleccionar la aplicación prevista y **Development**; verificar el indicador de entorno. Capturar selector/ID. No entrar en Production ni copiar configuración desde ella.
2. En **API Keys**, identificar exclusivamente Publishable key test sin revelar Secret key. En **Domains**, anotar Frontend API. Completar la matriz §2 con web/API/local; si no coincide o falta evidencia, detener antes de cambiar opciones.
3. Inventariar las cuatro cuentas internas existentes y sus métodos/políticas en custodia privada, sin alterar sus datos ni obtener códigos. Capturar **User & authentication** (Email/User model/Password/Multi-factor), **Access mode/Allowlist/Blocklist**, **Protect → Rules** y opciones de sesión/URLs que pudieran afectarles. Anotar valores; no cambiar nada aún.
4. Resolver las decisiones §6.1, confirmar reversión §3 y cuota para el buzón. Si access mode o restricciones bloquean alta, decidir primero la mínima excepción compatible. En **Access mode**, aplicar y guardar **solo** la combinación aprobada, conservando restricciones/listas internas; capturar después.
5. Abrir **User & authentication → Email**. Habilitar, solo si falta, alta/entrada por correo, correo requerido/verificado y **Email verification code** para los usos de C2; preservar métodos internos. Guardar y capturar después.
6. En **User model**, habilitar recepción de **firstName** y requisito independiente si existe y fue aprobado; no exigir lastName. Si el control exige ambos, detener y resolver la decisión de nombre de §3.3. Guardar únicamente la opción compatible y capturar después.
7. En **Password**, permitir completar esta alta sin password bajo la decisión aprobada y conservando acceso interno. No resetear/eliminar passwords de usuarios. Si no hay ajuste compatible, detener; no desactivar globalmente por ensayo. Guardar y capturar solo si se acordó un cambio.
8. En **Protect → Rules → User enumeration protection → Manage**, seleccionar **Strict**, guardar y capturar. Revisar impacto sobre estrategia preferida/B2B; no cambiarla ni activar sign-in-or-up sin decisión propia.
9. En **Protect → Rules → Bot sign-up protection**, si aparece Disabled, **Enable → Enable → Save**; si Enabled, conservar. Smart si hay control heredado y se acordó su actualización. Capturar; no habilitar Native API ni bypass de test.
10. En **Protect → Rules → Lockout policy**, registrar umbral/duración. Conservar política interna compatible; si falta, configurar **solo los valores aprobados** y guardar/capturar. No cambiar cuota/plan ni desbloquear cuentas.
11. Mantener MFA, sesiones/tareas, SSO, dominios/redirects, webhooks, plantillas y test mode existentes. Cerrar API Keys sin revelar secretos. Revisar capturas finales contra previas y entregar **metadatos públicos + valores de opciones + decisiones**, con correos enmascarados. No enviar OTP, JWT, cookies, claves privadas ni dump de configuración.
12. Autorizar por separado y realizar/registrar la regresión B2B; si falla, detener M2 y restaurar **en orden inverso únicamente los ajustes guardados**, usando las capturas previas de la misma Development. Confirmar que los cuatro accesos siguen operables; no borrar trabajo.
13. Si el inventario/alineación/configuración quedan compatibles, decidir una autorización explícita de **ensayo A** y después **P5/B** con fixture/orígenes si se eligen. La rama permanece sin push. Publicación web **P6** solo después de evidencia real revisada y permiso expreso.

## 7. Evidencia de P4 y checkpoint local

Lecturas realizadas: Git, Markdown/código/JSON versionados pertinentes y documentación pública oficial citada. Se buscó únicamente metadata pública de Clerk en archivos versionados; no se abrieron `.env`, runtime-env, archivos de credenciales, tokens, contraseñas, backups ni dumps. No se accedió al panel privado Clerk/Vercel, API QA autenticado, DB QA, SSH ni servicios productivos.

La consulta web pública inicial mediante herramienta de navegación no obtuvo contenido; el intento PowerShell sin escalación falló con `HttpRequestException` y otro con `InvalidOperationException`. El reintento HTTP sin cookies ni seguimiento de redirects terminó con exit 0 y **HTTP 302 a SSO Vercel**, sin publishable key extraíble. No se guardaron HTML, cookies o URLs de autorización en archivos/evidencia. HTTP 302 no acredita build ni avería de Clerk y tampoco determina instancia.

`rg.exe` no pudo ejecutarse en Windows; búsqueda acotada sustituida por `git ls-files`/`Select-String`, sin instalación. No se ejecutaron tests/builds: el gate aplicable es documental. Validación: **28 destinos locales únicos existentes**, cobertura de los cinco contenidos, semántica de estados/fuentes y sin patrones de secretos detectados; `git diff --check`, revisión completa, staging explícito, `git diff --cached --check`, stat y diff completo antes del commit.

El primer `git add -- docs/quality/M2_C3_P4_CLERK_CHECKLIST.md` terminó **exit 1**, `index.lock: Permission denied` bajo el sandbox. El reintento de esa única ruta con permiso de escritura Git revisado terminó **exit 0**, dentro del commit local ya autorizado; sin eliminar locks ni cambiar otras rutas. Git avisó de conversión futura LF → CRLF para este Markdown conforme a su configuración vigente; no se alteraron atributos ni SQL. No fue rechazo de aprobación automática ni una operación contra QA.

Comandos de Git para este único checkpoint (el SHA resultante se entrega en el relevo, para evitar una autorreferencia dentro del commit):

```powershell
git status
git diff --check
git diff --stat
git add -- docs/quality/M2_C3_P4_CLERK_CHECKLIST.md
git diff --cached --check
git diff --cached --stat
git diff --cached -- docs/quality/M2_C3_P4_CLERK_CHECKLIST.md
git commit -m "docs(m2): preparar checklist P4 de Clerk Development"
git rev-parse HEAD
git show --stat --oneline HEAD
git status
```

Solo la ruta de este documento forma parte del commit. **SIN PUSH, SIN P5, SIN PUBLICACIÓN/PRUEBA WEB.** Configuración real, alineación completa, correo/códigos, compatibilidad B2B y QA de cierre permanecen pendientes; no se declara C3 aprobado. Siguiente paso preciso: propietario completa matriz §2 y decisiones §6.1; después ejecuta únicamente los ajustes manuales compatibles que decida, con capturas y reversión, y otorga el permiso separado de prueba que corresponda.
