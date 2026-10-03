# Reserva pública M1 — C3 activación y QA real

## Cierre documental final — 2026-10-03

**M1 (Reserva pública): CERRADO / APROBADO EXPLÍCITAMENTE POR EL PROPIETARIO.** Su autorización escrita en esta tarea incluye la revisión física en **iPhone/Safari** y permite commit/push exclusivamente a `origin/ai/antigravity-qa`. La aprobación procede del propietario, no de las pruebas técnicas de esta ejecución. Este cierre posterior prevalece sobre los estados históricos inferiores, que se preservan íntegros. No se abre otro gate.

**Base y alcance:** HEAD inicial `ddcb7aba8ab324ac3e3c03a288ac34508bc6e998`, rama `ai/antigravity-qa`. Ya existían cambios en cinco documentos y un JSON sin seguimiento; se preservan y quedan fuera de este commit mediante staging exclusivo de las adiciones de esta tarea. Sin código nuevo, cambios de contrato, despliegues, flags, variables ni acceso a bases de datos reales. Producción permanece cerrada.

**Respaldo de Cutover QA:** antes de cualquier borrado se identificó la ruta exacta `C:\Users\Fraylin\Desktop\Kortek-Booking\.tmp\m1-c3\qa-before.dump.gpg`, según el destino único documentado en §3 y [backup-verificado.json](evidence/m1-c3/backup-verificado.json); no corresponde a otro respaldo. El archivo y su checksum `qa-before.dump.gpg.sha256` ya estaban ausentes en la primera comprobación. No fue necesario borrar y no se eliminó ningún otro archivo. Se repite la comprobación final de ausencia en [cierre-documental-20261003.json](evidence/m1-c3/cierre-documental-20261003.json), sin imprimir contenido ni claves. El registro de eliminación anterior es preexistente; esta ejecución verifica ausencia, no repite el hash ni acredita por observación propia el borrado anterior.

**Deuda técnica — Puerta de producción (Paso 8):** «Por atender» y «Todas» filtran y ordenan en el cliente sobre `GET /bookings` sin paginación ni tope. Con volumen real habrá que paginar o filtrar en el servidor. El código lo acredita en [booking-list.ts](../../apps/web/lib/booking-list.ts), la [pantalla de Reservas](../../apps/web/app/dashboard/bookings/page.tsx), la [consulta web](../../apps/web/lib/queries/bookings.ts) y `BookingsService.findAll` en [bookings.service.ts](../../apps/api/src/bookings/bookings.service.ts), que no define `take`/`skip`. Queda registrada para atender y validar en Paso 8; no se corrige ahora ni se amplía la autorización.

**Validación de web:** `pnpm --filter web type-check`, `pnpm --filter web lint` y `pnpm --filter web test` terminaron con exit `0`; **290 pruebas pasan** (158 unitarias y 132 de componentes en 21 archivos). Los intentos iniciales terminaron con exit `1` por acceso bloqueado a la configuración local de pnpm; las ejecuciones autorizadas con ese acceso son las que acreditan los resultados. No se instalaron dependencias.

**Límites de esta entrega:** comandos web, exit codes y comprobaciones documentales en [la evidencia del cierre](evidence/m1-c3/cierre-documental-20261003.json). No se repiten QA física, navegador, API/DB, restore, rollback ni comprobaciones operativas de producción. No se recibió modelo de iPhone, versión de iOS ni resultados por caso; se registra la aprobación física global aportada por el propietario sin inventarlos. Los límites históricos de las ejecuciones anteriores siguen documentados como tales.

## Antecedente de aprobación y limpieza — 2026-10-03

**Antecedente de aprobación y limpieza — 2026-10-03:** el [registro anterior](evidence/m1-c3/aprobacion-cierre-20261003.json) consigna la aprobación M1 y del [ajuste UX de confirmación](RESERVA_PUBLICA_CONFIRMACION_UX.md), la verificación del SHA-256 `21c7341b396773468f112733043ed5f2b8f5d844233969cb77d886af8f557e41`, la eliminación de `.tmp/m1-c3/qa-before.dump.gpg` y `.tmp/m1-c3/qa-before.dump.gpg.sha256` y la comprobación de su ausencia, sin restaurar ni alterar una base. Es el antecedente preexistente al cierre de la cabecera: aquella ejecución solo observó ausencia posterior. La revisión documental separada solicitada por el propietario conserva ambos registros; no repite el hash, borrado, restore o QA ni otorga una nueva aprobación. Las coberturas no verificadas conservan sus límites históricos.

**Contradicciones temporales conservadas — consolidación posterior del 2026-10-03:** las referencias siguientes a «M1 no aprobado», QA física pendiente y cifrado/checksum retenidos describen la ejecución original del 2026-10-01 y su actualización de publicación. El cierre aprobado de la cabecera y el antecedente anterior resuelven esos estados, sin reescribir el historial. El registro de eliminación con hash previo y el de ausencia posterior corresponden a ejecuciones distintas; no se contradicen como evidencia de una misma operación. El despliegue web posterior consta en [UX ligera](RESERVA_PUBLICA_M1_UX_LIGERA.md); no se reconsulta aquí.

Los casos de §6 sin evidencia específica, los cinco grants faltantes del backup rutinario, la imagen anterior del worker QA, los riesgos aceptados de C1 y el rollback de imagen/restore real no ensayados conservan sus límites históricos. La aprobación física global no aporta resultados por caso, modelo de iPhone o versión de iOS. La revisión actual no repite hash, borrado, restore o QA, ni acredita operación vigente de producción. [Alcance local de esta consolidación](../../PROJECT_MASTER.md): sin push ni despliegue, fuera del commit C2; no otorga nueva aprobación.

Actualización posterior de publicación: el propietario autorizó incorporar este informe/evidencia C3 y controles en el segundo commit de la UX ligera, sin desplegar nuevamente el API. Las referencias a «sin commit/push» y SHA `791569b` inferiores registran la ejecución C3 original. La web QA se actualizará bajo autorización propia; [resultado y hashes de publicación](RESERVA_PUBLICA_M1_UX_LIGERA.md). C3/M1 continúan sin cierre; respaldo cifrado retenido y producción intacta.

Fecha: 2026-10-01, República Dominicana. **ACTIVADO EN QA / EN REVISIÓN. C3 y M1 no están aprobados ni cerrados.** API y web QA usan el SHA aprobado `791569b110f9fd59cb10e6d248546bdae3996e14`; los controles de la sección 5 pasan y se realizó un recorrido con API/base reales. Producción y main permanecen iguales en la comparación. La guía iPhone está lista; QA física, casos indicados como pendientes y aprobación del propietario siguen abiertos. Sin commit ni push.

## 1. Autorización, base y alcance

El propietario autorizó C3 solo en Cutover QA (`prirlabbnlcuvnzuaczp`, `qa.booking.kortek.cloud`), con C1 `d9b508f` y C2 `791569b` aprobados, API primero y web después, y negocios sintéticos. Posteriormente autorizó expresamente exportar las 36 tablas `public` con `kortek_migrator` solo lectura y TLS verificado, cifrar localmente con la clave existente, restaurar sin red en tmpfs, cotejar conteos/huellas y eliminar el plano/contenedor. **La copia cifrada se conserva exclusivamente en este equipo hasta la aprobación expresa de M1; entonces se eliminará y se reportará.** También eligió la opción A: reutilización válida 201/PENDING; D11 para teléfono y correo de clientes distintos.

Base al comenzar y HEAD final: `791569b110f9fd59cb10e6d248546bdae3996e14`, rama `ai/antigravity-qa`; árbol inicial limpio, remoto igual. Los cambios documentales de la ejecución previa de esta misma tarea se preservaron. No se modificó código, contrato, Prisma, dependencia, rol, grant, flag ni proveedor. Las únicas claves operativas cambiadas son `KORTEK_API_IMAGE` y `APP_RELEASE` del API QA; se reinició solo ese API.

Fuentes completas: [decisiones del propietario](DECISIONES_PROPIETARIO_2026_09_29.md), [C0](RESERVA_PUBLICA_M1_C0.md), [C1](RESERVA_PUBLICA_M1_C1_CIERRE.md), [C2](RESERVA_PUBLICA_M1_C2_CIERRE.md), [gates](DELIVERY_GATES.md), README, PROJECT_MASTER, instrucciones de área, estándares, contratos y código. Skills aplicadas: `goal`, `kortek-delivery`, `kortek-product-ui`, `supabase` y `computer-use`. Un solo gate de producto permanece abierto: C3.

Usuario: visitante de un negocio sintético que reserva desde el teléfono. Resultado: selección real, alta PENDING, errores útiles y contacto privado; backend conserva permisos y tenant. Identidad, cuenta, pagos y demás módulos mantienen C0–C2. No se abre producción.

## 2. Inspección de evidencia C2 antes de desplegar

Se inspeccionaron los **bytes del commit**, obtenidos con `git show 791569b:<ruta>`, y se verificó igualdad con los archivos locales. Los cuatro JSON se recorrieron recursivamente y leyeron completos; las siete imágenes se abrieron y revisaron completas. Se buscaron JWT, tokens, claves de proveedor, cookies, Authorization/Bearer, contraseñas, secretos en URLs, IDs de sesión Clerk, correos y datos personales. No se imprimió ningún valor sensible. Los nombres/dirección visibles son los fixtures sintéticos documentados de C2; no aparecen contactos del visitante ni contraseñas.

| Archivo bajo `docs/quality/evidence/m1-c2/` | Resultado | Inspección |
| --- | --- | --- |
| accesibilidad.json | Limpio | Campos, valores y mediciones |
| errores.json | Limpio | Resultados y consola vacía |
| recorrido.json | Limpio | Resultados, anchos y tamaños de fuente |
| roles.json | Limpio | Roles, slugs sintéticos y resultados; sin sesiones |
| calendario-1280.png | Limpio | Imagen completa y estructura PNG |
| calendario-320.png | Limpio | Imagen completa y estructura PNG |
| calendario-375.png | Limpio | Imagen completa y estructura PNG |
| calendario-390.png | Limpio | Imagen completa y estructura PNG |
| exito-norte.png | Limpio | Resultado sintético, sin contacto del visitante |
| exito-sur.png | Limpio | Resultado sintético, sin contacto del visitante |
| zoom-200.png | Limpio | Imagen completa y estructura PNG |

Los PNG solo contienen chunks `IHDR`, `IDAT` e `IEND`; no hay chunks textuales/EXIF. [Registro por archivo y SHA-256](evidence/m1-c3/inspeccion-previa.json). El resultado limita su alcance a estos once archivos en ese commit; no constituye una auditoría de todo el historial. No se encontró material que exigiera retirar esa evidencia o rotar credenciales.

## 3. Respaldo verificado y activación

**Sin migración M1:** `git diff d9b508f^..HEAD --name-only -- apps/api/prisma` sin rutas; Cutover QA mantiene 36 tablas públicas y 27 migraciones terminadas antes/después. `SecurityRateBucket`, su secreto suficiente y permisos runtime SELECT/INSERT/UPDATE/DELETE ya existían; no se crearon almacén, variable ni dependencia para el limitador.

La autorización posterior resolvió el rechazo inicial de revisión automática a la transferencia/restore. Se exportó `public` mediante `pg_dump -Fc`, snapshot consistente y transacción READ ONLY; TLS `verify-full` con la CA existente. La copia se cifró AES256/GPG sin mostrar la clave. Destino único: `.tmp/m1-c3/qa-before.dump.gpg`, ignorado por Git. **No se subió ni copió el respaldo a OCI, Vercel, Supabase ni otra ubicación.** Solo se transfirió a OCI el contexto de código Git y su helper de build.

Restore PostgreSQL 17 local desde el cifrado por pipe, red `none`, `/var/lib/postgresql/data` en tmpfs, `--no-owner --no-privileges`, sin roles/grants reales como destino. Docker inicialmente estaba apagado; se inició el motor existente. El primer restore encontró la dependencia `btree_gist`, que el dump de `public` no incluye: se preparó únicamente esa extensión en el contenedor desechable, fuera de `public`. No se cambió QA. La comparación se corrigió a orden binario `COLLATE "C"` para no depender de la collation de cada servidor; el cotejo posterior usa una nueva transacción fuente READ ONLY y es idéntico en las 36 tablas.

[Respaldo verificado](evidence/m1-c3/backup-verificado.json), finalizado **18:59:00** hora local: 36/36 conteos y huellas iguales, incluida `_prisma_migrations` y sus 27 migraciones. Cifrado de 37.253 bytes, SHA-256 `21c7341b396773468f112733043ed5f2b8f5d844233969cb77d886af8f557e41`. El dump plano y todos los contenedores `m1-c3-restore-*` se eliminaron; [verificación final](evidence/m1-c3/verificacion-final.json) confirma ausencia y checksum conservado. Se mantiene solo el respaldo cifrado y su checksum local hasta la aprobación M1; la eliminación futura es un paso pendiente, no ejecutado.

El rol existente `kortek_backup` carece de SELECT en cinco tablas de horario (`BusinessClosure`, `BusinessSchedule`, `BusinessScheduleDay`, `BusinessScheduleRevision`, `BusinessScheduleWindow`). Se conserva ese riesgo del backup rutinario. El respaldo puntual autorizado sí cubre las 36 mediante el migrador sin superusuario; no se corrigieron grants.

Contexto mínimo generado con `git archive` desde el SHA aprobado, sin `.env`, credenciales, datos o `.tmp`. SHA-256 del contexto: `9b5fa172c1df3145682d808b25b9a2ec97a1c177e9d1f792f8cb40832077b070`. Build rootless con manifiestos/lockfile existentes: Prisma generate y Nest build exit 0; drill aislado de arranque pasa los **23 casos negativos**. Imagen nueva:

```text
701329f1cfe7b45f5b6d0cfe62daeae0edf6e1c00518158cb8555a815c224031
```

[Activación API](evidence/m1-c3/activacion-api.json): API QA activo, release/imagen correctos, configuración restante y secretos iguales. Worker QA conserva contenedor, PID, imagen y entorno, sin reinicio. Imagen anterior verificada y retenida para rollback:

```text
7eafd5c9232ac9f8bfb2f6d1ab5eb4fa7ca37cc369bf92751616c90e29c76fa1
```

El helper conserva el entorno QA previo protegido y revierte automáticamente ese entorno/reinicia solo API QA si fallan salud o comprobaciones. No hubo fallo de deploy ni rollback ejecutado. No se restauró el respaldo sobre una base real.

Después de activar API, se verificó y reasoció explícitamente `qa.booking.kortek.cloud` al Preview READY ya existente del mismo SHA, `dpl_ErRZTRYFZHeocGCrfBMvXDM3jMY9`. [Registro web](evidence/m1-c3/web-qa.json). Ese build ya lo había generado la integración Git antes de esta tarea; no se afirma un build nuevo ni se modifica SSO, variables, producción o integración.

## 4. Producción antes/después

[Snapshots y once comparaciones](evidence/m1-c3/produccion-comparacion.json), antes **18:54:45** y después **19:11:23**, hora local. Se conserva anidada la inspección previa de solo lectura. Ninguna fila de negocio productiva se leyó; los entornos/variables solo se comparan mediante hashes, sin publicar valores.

| Control | Antes/después | Resultado |
| --- | --- | --- |
| API producción | Release `b5615869dcbec4bd174608f2373e73ff618fae26`; imagen `8caacd8548a61d94807c0b865229a731df594f63f609ca9ab57df99283dceca2`; mismo contenedor y PID 151158 | Igual |
| Worker producción | Misma imagen, contenedor, PID 6654 y hash de entorno | Igual |
| Servicios productivos | API systemd 151141, Caddy 172458, worker 6618; activos | Igual |
| Archivos y configuración protegida | Mismos hashes de env productivo, wrappers, unidades y Caddy | Igual |
| Flags productivos | Reserva pública cerrada; correo desactivado | Igual |
| Web producción | `dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm`, READY, main SHA `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6` | Igual |
| Configuración/variables Vercel producción | Mismos hashes de configuración seleccionada y metadata de las cinco variables | Igual |
| Git main y rama QA remotos | Main SHA anterior; QA SHA `791569b110f9fd59cb10e6d248546bdae3996e14` | Igual |
| Worker QA | PID 576002, imagen anterior, mismo entorno/unidad | Igual |
| API QA | Imagen anterior/PID 575943 → imagen M1/PID 673309; systemd 673295 | Cambio autorizado |
| Configuración API QA | Solo imagen y release; public abierto, correo existente y demás configuración conservados | Pasa |

## 5. Controles posteriores y QA real

[Registro HTTP](evidence/m1-c3/controles-http.json): **27 comprobaciones pasan**, con API desplegada y Cutover QA reales. Dos tenants nuevos dedicados `m1-c3-norte`/`m1-c3-sur`, exclusivamente sintéticos; los existentes no se alteraron. Fixtures creadas en una transacción DML; un intento inicial falló por encoding del cliente Windows y se revirtió antes de corregir UTF-8. Sin DDL, grants, cambio de rol, flags, fotos/proveedor, cuenta nueva ni correo opt-in.

| Control obligatorio | Resultado real |
| --- | --- |
| Pública, privada, preflight | 200, 401 sin sesión y OPTIONS 204 |
| Cabeceras/CORS | RequestId UUID en todas las peticiones registradas, expuesto; origen QA exacto y credenciales admitidos; origen ajeno sin ACAO; no-store en rutas de reserva |
| availability-days | Rango inclusivo de 31 admitido; fechas únicas, ordenadas y dentro del rango; 32 rechazado 400; cierre sin día/huecos; concordancia con disponibilidad diaria |
| Tenant | Servicio de Norte solicitado a Sur rechazado 400 |
| Limitador compartido de rango | 30 peticiones admitidas por handler/IP, alternando ambos slugs; número 31 devuelve 429, Retry-After 60. Sin spoofing IP ni limpieza de buckets. Recuperación posterior 200 verificada |
| Limitador POST | Cuatro intentos de contacto + DTO inválido: quinto 400; sexto 429; sin crear altas para agotar la cuota |
| D11, opción A | Teléfono A/correo B: 400 exacto neutro; mismo cuerpo ante teléfono inválido; conteos sin cambio tras colisión |
| Alta válida/reutilización | Una alta 201/PENDING, luego mismo contacto válido en otro hueco 201/PENDING; exactamente dos reservas, un cliente nuevo |
| Correo y migraciones | Cero consentimientos y cero intentos de dispatch en fixtures; 27 migraciones conservadas |

Cuerpo D11 confirmado, sin causa ni datos privados:

```json
{"statusCode":400,"error":"Bad Request","message":"No pudimos registrar la reserva con esos datos. Revísalos o contacta al negocio."}
```

[QA de navegador](evidence/m1-c3/navegador-qa.json), Codex In-app Browser/CUA contra web/API reales: enlace directo, regreso y entrada desde mini-sitio; servicio sin foto; cualquiera disponible con Alex Norte explícito en revisión/éxito; calendario con cierre deshabilitado y select compacto real; correo mal escrito junto al campo en Tus datos; D11 vuelve allí y conserva campos; aviso de cuenta visible; una única alta invitada adicional con éxito pendiente, fecha natural y próximos pasos; recarga pierde detalle y vuelve a Servicio sin reenviar POST; Sur selecciona automáticamente Alex Sur y lo muestra. La verificación final de base confirma **tres reservas sintéticas PENDING** (dos HTTP y una UI), 36 tablas/27 migraciones y cero dispatch/opt-in. No se eliminaron datos operativos después del ensayo.

Consola: cero errores, una advertencia conocida de Clerk development para QA; no se publican logs crudos. Fuentes de los tres inputs de contacto: 16 px. Evidencia sin campos privados: [calendario QA](evidence/m1-c3/calendario-qa.jpg) y [éxito QA](evidence/m1-c3/exito-qa.jpg). Capturas abiertas completas, solo negocios/profesionales sintéticos.

**Límites de QA:** el control pidió viewport 375, pero este navegador devolvió `innerWidth=416`, `clientWidth=400`, `scrollWidth=400`; no se declara validación exacta de 375 ni emulación de Safari. Se restableció el override. No se verificaron en esta ejecución Safari/iPhone, giro/teclado/pinch zoom, importación .ics, asset publicado elegible, roles autenticados desplegados, contraseña 7/8, lectores ni mensaje UI de 429/abuso. El 429 HTTP sí pasó. C2 conserva su evidencia local anterior; no se atribuye a C3. La guía siguiente cubre esos casos con estados pendientes explícitos.

## 6. Guía de QA manual para iPhone — API y web QA activadas

**Registrar los resultados del iPhone por separado; el navegador de escritorio no los acredita.** Abrir Safari con el acceso Vercel habitual en `https://qa.booking.kortek.cloud`; nunca usar el dominio productivo. Registrar modelo de iPhone, versión iOS y hora local. Usar exclusivamente datos/contactos/contraseñas sintéticos; no reutilizar credenciales personales y no fotografiar datos de formulario, passwords, sesiones o comprobantes.

Negocios dedicados creados en Cutover QA: **Norte**, dos profesionales públicos; **Sur**, un profesional público. Ambos tienen Corte (30 minutos), Servicio extenso (240 minutos), horario 09:00–12:00 en America/Santo_Domingo y cierre completo el **4 de octubre de 2026**. El servicio extenso no cabe en ese horario. Los tres registros PENDING del ensayo están solo en Norte. No alterar los negocios anteriores del propietario.

- [Mini-sitio Norte](https://qa.booking.kortek.cloud/m1-c3-norte) y [reserva directa Norte](https://qa.booking.kortek.cloud/m1-c3-norte/reservar).
- [Mini-sitio Sur](https://qa.booking.kortek.cloud/m1-c3-sur) y [reserva directa Sur](https://qa.booking.kortek.cloud/m1-c3-sur/reservar).

Para D11 en Norte, combinar el teléfono sintético A `+1 809 555 0101` con el correo sintético B `contacto-2-m1-c3-norte@example.invalid`. Para reutilización válida, el contacto sintético A es ese mismo teléfono con `contacto-1-m1-c3-norte@example.invalid`; usar otro hueco libre. Estos valores son fixtures, no contactos personales. No usar un slot ya ocupado por el ensayo. Mantener avisos por correo y cuenta desmarcados para el alta invitada; no enviar WhatsApp.

Los fixtures C3 **no tienen imágenes publicadas**: el caso con foto queda pendiente de un asset ya elegible en un negocio sintético autorizado; no se crearon registros ficticios de Medios ni se llamó a un proveedor para aparentar cobertura. El caso sin foto sí puede ejecutarse ahora. La opción de cuenta se puede marcar para probar el bloqueo de siete y el avance de ocho caracteres, pero desmarcar antes de registrar la reserva si no se pretende probar su resultado secundario. No reutilizar una contraseña personal.

En cada fila registrar Pendiente / Pasa / Falla / No aplicable. Una foto ausente no equivale a fallo de la reserva. Si falta un fixture o API M1, registrar el impedimento y no sustituirlo por datos reales.

| Caso | Qué hacer | Qué debe ocurrir |
| --- | --- | --- |
| Entrada desde mini-sitio | Abrir `https://qa.booking.kortek.cloud/m1-c3-norte`, tocar Reservar cita | Entra a `/{slug}/reservar` del mismo negocio, con cinco pasos y regreso visible |
| Enlace directo y regreso | Abrir directamente `/{slug}/reservar`; volver a la página del negocio y entrar otra vez | Carga normal; vuelve al mismo mini-sitio; la visita nueva no recupera datos privados anteriores |
| Servicio con/sin foto  | Elegir uno con foto publicada y otro sin foto | Imagen elegible o respaldo limpio; nombre, duración y precio reales; se puede continuar en ambos |
| Profesional específico | Elegir nombre concreto y después hora | Ese nombre permanece en selección, revisión y éxito; no lo cambia silenciosamente |
| Profesional único | Abrir el negocio con uno solo | Queda seleccionado y visible; no exige clic vacío de elección |
| Cualquiera disponible | Elegir esa opción y un horario | Muestra «Te atenderá…» con un profesional concreto antes de registrar; revisar y éxito coinciden |
| Día sin disponibilidad | Tocar un día gris; después uno habilitado | El gris no se selecciona ni permite avanzar; el habilitado carga solo sus horas disponibles |
| Control de hora | Abrir Hora y elegir una opción | Control compacto con horas reales, sin entrada libre, sin cuadrícula grande y sin hora elegida a escondidas |
| Cambio de mes/selección | Cambiar mes, servicio/profesional y fecha | Carga estados claros; limpia hora anterior cuando corresponde; no mezcla disponibilidad previa |
| Vertical y horizontal | Girar con calendario y con teclado abierto; recorrer la pantalla | Sin recortes/scroll horizontal; hora y acciones accesibles; teclado no tapa campo/foco/continuar |
| Correo mal escrito | Escribir un correo incompleto; salir del campo o tocar Revisar reserva | Error junto al correo en Tus datos; no llega a revisión ni espera al envío final; conserva los otros campos |
| Teléfono inválido | Escribir pocos dígitos o letras y tratar de avanzar | Error junto al teléfono, foco útil y datos conservados |
| Teléfono internacional | Introducir un teléfono internacional sintético admitido, con prefijo y separadores | Acepta 7–15 dígitos normalizados, sin inferir país ni truncar a longitud local |
| Contraseña de 7/8 | Marcar cuenta, aportar correo sintético y probar 7 caracteres; después 8 | Siete bloquea con error en Datos; ocho permite revisión si los demás datos son válidos; no documentar la contraseña |
| Advertencia de cuenta | Leer antes de marcar y luego desmarcar | «Esta opción está en pruebas…» advierte que aún no hay Mis reservas ni reserva rápida; desmarcar elimina la contraseña |
| Zoom al tocar campos | Tocar nombre, teléfono, correo y contraseña | Safari no aumenta automáticamente el zoom al enfocar; teclado/caret funcionan |
| Zoom manual | Ampliar y reducir con dos dedos, también con teclado abierto | Pinch zoom funciona; contenido/acciones siguen accesibles; no hay bloqueo del zoom |
| D11 real — opción A autorizada | Con datos sintéticos preparados, combinar el teléfono del contacto A y correo del B; registrar una vez | Mensaje «No pudimos registrar la reserva con esos datos. Revísalos o contacta al negocio.»; vuelve a Tus datos, conserva lo escrito y no revela existencia/causa; no deja nueva reserva |
| Reutilización válida — C1 | Usar de nuevo los contactos del mismo cliente sintético y otro hueco libre | Alta permitida PENDING; no considerar fallo que un contacto existente válido se reutilice |
| Éxito invitado | Completar una sola reserva válida sin cuenta ni avisos | «Tu reserva quedó registrada», «Pendiente de confirmación», fecha natural, profesional y próximos pasos; no dice confirmada, pagada ni correo entregado |
| Recarga del éxito | Después de leer el resultado, recargar | Pierde el detalle de esa visita, tal como advierte; no crea otra reserva ni expone recibo por URL |
| Calendario opcional | Antes de recargar, tocar Agregar al calendario; revisar/importar si se desea | Archivo .ics de cita pendiente, hora correcta y título pendiente; no cambia Booking ni se actualiza automáticamente |
| Abuso del calendario | Cambiar repetidamente meses/días, sin herramientas para falsificar IP | Al alcanzar el límite real: mensaje claro y espera; pantalla/datos conservados; no consultas en bucle. La caché puede evitar requests: pocos toques sin 429 no acreditan fallo |
| Botón de reservar repetido  | En revisión, tocar rápido varias veces una vez listo para una única alta | Botón protegido durante envío y una sola reserva; si se alcanza 429 mediante intentos autorizados, muestra espera sin borrar datos ni romper pantalla; no crear muchas citas solo para agotar cuota |
| Error de red/resultado incierto | Si ocurre durante el ensayo, registrar el momento; no repetir a ciegas | Mensaje de recuperación o incertidumbre honesto; no afirma éxito/fracaso sin prueba ni reenvía POST automáticamente |

El ensayo HTTP técnico del rate limit ya pasó por separado y sin limpiar buckets; los toques manuales son QA de interfaz, no prueba suficiente de contador compartido. Los tenants nuevos no tienen membresías asignadas: no se crearon identidades ni permisos para esta prueba pública. Las altas y la ausencia de alta parcial se verificaron aquí con lectura SQL acotada. El contraste en agenda autenticada queda pendiente de un vínculo autorizado; Profesional solo su agenda. No añadir endpoints ni ampliar permisos para verificarlo.

Para **cada falla**, anotar pantalla/paso, hora local, orientación, acción justo anterior, resultado observado, resultado esperado y «Código de soporte» **solo si aparece**. No inventarlo. Omitir nombre, contacto, contraseña y contenido privado; si se aporta captura, limpiar datos primero. Si hay timeout al registrar, contactar al negocio sintético y comprobar su agenda antes de intentar otra alta. No enviar mensajes externos como parte de este informe.

## 7. Comandos, resultados y evidencia

| Comando/control | Resultado |
| --- | --- |
| Git rama/HEAD/status inicial y `ls-remote` antes/después | Exit 0; rama/HEAD/remotos exactos; árbol inicial limpio |
| Auditoría `git show 791569b:<ruta>`, JSON recursivos, PNG completos | Exit 0; once archivos C2 limpios, sin metadata sensible |
| `git diff d9b508f^..HEAD --name-only -- apps/api/prisma` | Exit 0, sin rutas |
| Probes READ ONLY y preflight SSH rootless | Exit 0; 36 tablas/27 migraciones, limitador existente e imagen anterior disponible |
| Intento de backup en ejecución anterior | Rechazado antes de ejecutarse; resuelto por autorización explícita posterior, no contado como éxito |
| `backup-qa.py` autorizado | Exportó/cifró y eliminó plano; exit 1 al encontrar Docker apagado. Copia conservada |
| `restore-qa.py` | Intentos estructurales/collation iniciales exit 1, cada contenedor eliminado. Intento corregido exit 0: 36/36, migraciones y limpieza |
| `git archive`, transferencia de código, `build-api.py` | Exit 0; contexto SHA registrado, Prisma generate/Nest build y 23 drills negativos pasan |
| `deploy-api.py` solo API QA | Exit 0; once checks true; imagen previa retenida, worker/prod iguales |
| `fixture-qa.py` | Encoding inicial exit 1 y rollback; UTF-8 corregido exit 0; dos tenants sintéticos dedicados |
| `controls-http.py` | Exit 0; 27 checks true, D11/201/429 reales, dos altas sintéticas |
| `web-qa.py` | Exit 0; Preview existente exacto reasociado al alias QA después de API; producción igual |
| CUA navegador | Recorrido descrito verificado mediante AX/DOM/capturas, una alta adicional. `getScreenshot` no disponible; API documentada `tab.screenshot` funciona. Búsqueda inicial por label en mayúsculas sin coincidencia; se reobservó y usaron campos AX |
| `verify-final.py` | Exit 0; tres PENDING, cero dispatch/opt-in; rango recupera 200; cifrado intacto, plano/contenedores ausentes |
| SSH/Vercel final y comparación | Exit 0; once comparaciones true, SHA main/QA iguales |

Helpers locales ignorados en `.tmp/m1-c3/`; evidencia versionable solo con metadata, hashes, resultados agregados y capturas limpias. La credencial migradora y la clave de cifrado nunca se imprimieron. La renovación OAuth de la sesión Vercel de la fase anterior conservó permisos/protecciones; no generó tokens persistentes nuevos por esta activación.

No se repitieron tipos/lint/unitarios de C1/C2 porque no hubo cambios de código; la imagen del commit aprobado sí compiló y se verificó en runtime. Los fallos iniciales se registran con su exit real y no sustituyen las ejecuciones corregidas exitosas. [Validación documental final](evidence/m1-c3/validacion-entrega.json): JSON parseable, enlaces locales, diff completo, índice vacío, scan de sensibles/capturas y `git diff --check`.

## 8. Riesgos, Git y siguiente paso

C3/M1 **EN REVISIÓN**, sin aprobación global. Pendientes: QA iPhone de §6, casos de navegador no cubiertos, auditoría/aprobación expresa del propietario. El caso con foto requiere un asset ya publicado/elegible en un negocio sintético; no se amplía proveedor para resolverlo. Backups rutinarios QA aún tienen cinco grants de lectura faltantes; este respaldo puntual está verificado y no modifica ese problema. Worker QA mantiene la imagen anterior; no fue parte del deploy. C1 conserva riesgos aceptados de identidad secundaria legacy, spam distribuido y ausencia de recibo/idempotencia. Sin ensayar rollback de imagen sobre QA ni restore sobre una base real.

El respaldo previo **no debe restaurarse sobre QA por inferencia**: incluye el estado anterior a fixtures/altas/counters del ensayo. Para revertir solo código, se conserva la imagen y entorno QA previos; restaurar datos reales requiere decisión específica y plan para conservar escrituras posteriores.

Git: rama `ai/antigravity-qa`, HEAD/local/remoto QA `791569b110f9fd59cb10e6d248546bdae3996e14`, main remoto intacto. Índice vacío. Solo modificaciones de documentación/evidencia de esta tarea:

```text
 M CHANGELOG.md
 M PROJECT_MASTER.md
 M docs/README.md
?? docs/quality/RESERVA_PUBLICA_M1_C3_CIERRE.md
?? docs/quality/evidence/m1-c3/
```

Sin staging, commit ni push. El API QA queda activo con M1 y la web Preview del mismo SHA asociada; producción permanece cerrada. La copia cifrada local queda retenida. Siguiente paso: propietario ejecuta/consigna la guía iPhone y revisa los pendientes; corregir solo fallas dentro del gate autorizado. Tras aprobación explícita de M1, eliminar `.tmp/m1-c3/qa-before.dump.gpg` y su checksum local, verificar ausencia y registrar el resultado. No se adelanta esa eliminación ni una publicación Git. Esta entrega documenta activación y controles ejecutados; no se presenta como M1 aprobado ni cerrado.
