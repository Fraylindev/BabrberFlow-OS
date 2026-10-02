# Reserva pública M1 — correctivo de UX para QA

Fecha: 2026-10-02, America/Santo_Domingo. **PUBLICADO Y DESPLEGADO SOLO WEB QA / EN REVISIÓN. M1 NO CERRADO; QA FÍSICA PENDIENTE.**

El propietario solicitó corregir la revisión visual de [UX ligera](RESERVA_PUBLICA_M1_UX_LIGERA.md), ejecutar tipos/lint/tests/build y navegador en 320/375/390 px y escritorio, hacer commit/push en `ai/antigravity-qa` y desplegar únicamente web QA. Esa autorización comprende esta entrega; no requiere otra autorización de publicación. Base limpia `dcbb72e6f41676e85235c29149eb3f55de363352`.

## Brief y límites

Visitante público, invitado o cliente, que quiere elegir servicio/profesional/fecha/hora, introducir sus datos y revisar una reserva pendiente. Resultado: presentación legible, alineación consistente y navegación semanal con gesto sin perder la elección. Roles internos, contrato C1 aprobado, disponibilidad autoritativa, consentimiento y cuenta de prueba conservan su alcance. No cambia API, Prisma, dependencias, autenticación, permisos, flags, variables, proveedores, producción ni `main`.

Se reutilizan AvailabilityPicker, React Query y sus claves por slug/visita/recurso, BookingPhoto, `formatServiceDuration`, helpers de teléfono y PasswordField. El acento expuesto por el sistema actual es la variable de marca existente; el contrato no ofrece un color configurable por negocio y no se inventa ese campo.

Privacidad y seguridad: precarga exclusivamente fechas disponibles públicas y mantiene el aislamiento por visita; al desmontar, las consultas no conservan caché mediante `gcTime: 0`. No añade almacenamiento ni logs de contacto/contraseña. Cambia únicamente la presentación de contraseña y teléfono; el valor internacional enviado y las validaciones autoritativas permanecen iguales. POST se revalida, doble envío y resultado incierto conservan sus protecciones. Loading, vacío, error/reintento, 404, 409 y espera 429 se mantienen.

## Implementación y criterios observables

| Solicitud | Resultado y evidencia |
| --- | --- |
| Contorno fantasma | Se conserva `tabIndex=-1` y foco al entrar en cada paso/resultado; solo headings no interactivos carecen de outline. Controles mantienen foco visible. Medición en navegador. |
| Fotos ausentes/rotas | Iniciales de nombre y paleta estable de cinco colores, texto blanco y el mismo tamaño de foto/avatar. Error de imagen y estabilidad probados. |
| Filtros y español | Activo sólido con texto blanco, check y `aria-pressed`; inactivo con contorno. Contraste de blanco/acento oscuro ≥ AA. Meses/días en minúscula, sin `capitalize`. |
| Carrusel semanal | Scroll/pan nativo con ajuste por semanas, arrastre con ratón y rueda/trackpad. Paneles vecinos no interactivos, clic suprimido tras desplazamiento. Flechas/teclado conservados. Semana previa recortada al mínimo y extremo máximo representable C1 `9999-12-30`. Sin bibliotecas nuevas. |
| Precarga y elección | Consultas adyacentes en las claves existentes, sin reintento automático; fechas precargadas siguen visibles durante revalidación. Cambio semanal conserva fecha/hora y muestra el día elegido junto a Hora incluso fuera del rango explorado. Revalidación final permanece autoritativa. |
| Movimiento | El scroll vertical táctil sigue permitido (`pan-x pan-y`); rueda sobre el carrusel avanza/retrocede una semana por gesto. Movimiento reducido elimina animación de éxito/ojo y cambia semana sin scroll programático animado. |
| Duración/precio/teléfono | Un solo `formatServiceDuration`: min antes de 60, horas y resto después. Monto DOP existente con espacio, sin etiqueta de catálogo y alineado a la derecha; también en éxito. Helper de teléfono agrupa números sin alterar dígitos; prefijos fuera del selector usan solo presentación de los [planes ITU](https://www.itu.int/oth/T0202.aspx?lang=en&parent=T0202). No cambia el selector de 27 países ni aceptación de contactos. |
| Revisión/éxito | Una columna, título/Editar en una línea y datos alineados debajo; miniatura/avatar e iniciales. Fecha/hora con acento y jerarquía. Marca animada discreta, pendiente visible y cierre honesto aprobado. Éxito no muestra contacto del visitante. |
| Contraseña | Ojo de 44 px dentro del campo compartido, operable por teclado, etiqueta y `aria-pressed`, anuncio visible/oculta. El mínimo se muestra una vez: ayuda neutral o error asociado. Valor conservado al mostrar/ocultar; eliminado al desmarcar cuenta. |

Si el contenedor dispone de menos de 320 px, los siete días se distribuyen en dos filas dentro del mismo panel semanal para conservar objetivos táctiles; con mayor espacio muestran una fila. Abrir/cerrar el mes conserva la selección como antes.

## Validación

Tipos, lint, tests web completos y build de producción terminan con exit `0`. **158 unitarias + 123 de componentes = 281**. Seis regresiones nuevas cubren precarga/selección entre semanas, ajuste/clic accidental, extremo final, fallback roto/estable, contraseña accesible/mínimo único y revisión. Regresiones existentes cubren zona/medianoche, D11, 404/409/429, timeout incierto, doble POST, consentimiento y A → B → A. Los intentos iniciales fallidos se corrigieron y no cuentan como gate aprobado.

Comandos: `pnpm --filter web exec tsc --noEmit`, `pnpm --filter web lint`, `pnpm --filter web test`, `node .tmp/m1-ux/runtime.cjs build-web` (ejecuta `pnpm --filter web build`). El harness de build lee configuración local sin imprimir secretos; no accede a DB. Fallo inicial de acceso sandbox precedió a la ejecución autorizada correcta.

QA real: web compilada loopback `3012`, API C1 previamente compilada `3043`, PostgreSQL desechable existente `m1_ux_test` en `55463`. Sin modificar código backend ni bases operativas. Datos exclusivamente sintéticos, sin correo ni mensajes externos; una reserva invitada local `PENDING` para comprobar éxito. Consola: cero errores de aplicación, solo aviso esperado Clerk Development.

[Responsive](evidence/m1-polish/responsive.json): 28 mediciones de servicios, profesionales, fecha/hora, mes, contacto/contraseña, revisión y éxito en anchos CSS reales 320/375/390/1280. El zoom previo del navegador de 90 % se conserva; viewport compensado y cada `innerWidth` comprobado. Sin overflow de página; input de 16 px y ojo de 44 px. Arrastre adelante, rueda horizontal atrás y rueda vertical adelante conservan el día 3/hora 18:00 sin seleccionar otro día y actualizan el título/rango. No se observa espera en el cambio ya precargado.

Capturas sintéticas: [servicios](evidence/m1-polish/servicios-375.png), [profesionales](evidence/m1-polish/profesionales-375.png), [horas](evidence/m1-polish/fecha-hora-375.png), [mes](evidence/m1-polish/mes-375.png), [contraseña vacía](evidence/m1-polish/contacto-password-375.png), [revisión](evidence/m1-polish/revision-375.png), [éxito](evidence/m1-polish/exito-375.png). El contenido de revisión corresponde a un contacto sintético local; nunca se publican credenciales ni contactos reales.

La captura de horas usa el viewport nativo. Las capturas de página completa pueden recomponer el ancho al exportarse en este navegador; la prueba de anchos/overflow es el DOM medido en `responsive.json`, no las dimensiones del PNG. [Recorrido funcional](evidence/m1-polish/functional.json) incluye prefijo Otro +81 agrupado en revisión y selección preservada por teclado.

## Publicación y cierre

Código publicado en `843996e374876c6869cbc398b3e3d6cbe43cc488`, push solo a `origin/ai/antigravity-qa` con SHA local/remoto iguales. [Web QA READY](https://qa.booking.kortek.cloud/m1-c3-norte/reservar): `dpl_A3RMoL5uUGTJnDGFWFhvdVoD8U4d`, Preview generado por la integración Git y asociado exclusivamente al alias QA el 2026-10-02 05:20 UTC. [Registro de despliegue](evidence/m1-polish/web-deployment.json). El commit documental posterior registra el resultado sin cambiar el árbol web desplegado; su SHA se informa en la entrega y Git. Se conservó la rama autorizada y staging por rutas explícitas; revisión de diff/staged/check completos antes de publicar.

Línea base operativa tomada con solo lectura: `main`/web producción `fe4b117b2ad152c74b7939d1adf358fd1fe1b5d6`, web productiva `dpl_2KmQn7pSAaHc4EbuAu37WrnVuYvm`; web QA anterior `9d2eb47e32f01a504b33174a8aa735ca55c87604`. API QA existente: GET catálogo y rango de siete días `200`; no se envió POST ni se conectó a DB QA operativa. El respaldo cifrado C3 permanece ignorado y retenido.

[Auditoría operativa](evidence/m1-polish/operational-audit.json): main, producción web, configuración/variables/SSO Vercel, contenedores con imágenes/PID/env hash y archivos protegidos exactamente iguales. La comparación estricta inicial terminó con exit `1` por un único campo: `ExecMainExitTimestamp` del backup diario. Se investigó por lectura del timer: programado 05:17 UTC, disparado 05:18:43 y terminado 05:18:52 con `Result=success`, sin acción del agente. Todos los demás campos de ese servicio y las unidades de aplicación permanecen iguales. La auditoría posterior de esta diferencia específica termina con exit `0`; no se omite ni se cuenta la comparación inicial como aprobada. Servidores web/API locales y PostgreSQL desechable detenidos; fixture conservada.

[Navegador desplegado](evidence/m1-polish/deployed-qa.json): recorrido de servicio/profesional/fecha/hora/contacto hasta revisión en el negocio sintético C3 existente, sin registrar reserva ni crear cuenta. Fallbacks CN/SN/AN/BN, duración 4 h, monto RD$ 500, teléfono agrupado y headings sin outline; flecha a otra semana conserva fecha/hora. Ojo operado con Enter, 44 × 44 px y anuncio de estado, sin introducir contraseña. Cuatro anchos CSS exactos 320/375/390/1280 en pestaña nueva al 100 %, sin overflow; cero errores de aplicación y aviso esperado Clerk Development. [Captura de revisión QA](evidence/m1-polish/qa-revision-375.png). Chrome estaba bloqueado por una UI de extensión; la verificación se completó en IAB sin cambiar protecciones. El éxito PENDING se verificó solo en la fixture local aislada indicada arriba.

Pendiente en teléfono físico: Safari/iPhone y Chrome/Android, gesto táctil horizontal frente a scroll vertical, tap frente a swipe, teclado/barras/safe areas, selector y prefijo Otro, zoom 200 %, ajuste por semanas y reducir movimiento del dispositivo, descarga/importación real `.ics`. La emulación/arrastre de escritorio no acredita esas pruebas. Quedan la auditoría independiente y aprobación final del propietario para cerrar M1; esta publicación solo queda **EN REVISIÓN**.
