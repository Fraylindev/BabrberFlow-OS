DECISIONES DEL PROPIETARIO - 29 de septiembre de 2026
Vinculantes para todo trabajo posterior, junto con los contratos C0-C3 ya aprobados. Si hay discrepancia con las auditorías del 29-sep, prevalece este documento.

PRODUCTO Y ALCANCE
1. Hitos. Piloto 1 = estabilidad, reserva pública rediseñada, cuenta de cliente, calendario operativo, tipo de pago sin comprobante, fotos contextuales, horarios y navegación simplificada. MVP = Piloto 1 + transferencia con comprobante y revisión. El editor visual avanzado, el mapa con pin y la vista mensual completa quedan después del MVP.
2. Cuenta de cliente. La opción "Crear cuenta para reservar más rápido" no se oculta. La cuenta de cliente es requisito de Piloto 1: crear cuenta, iniciar y cerrar sesión, Mis reservas, reservar otra vez, perfil; cancelar y reprogramar por etapas.
3. Rol BARBER. En toda la interfaz se muestra como "Profesional". El valor interno BARBER, la API, la base de datos y los permisos no cambian por esta decisión.
4. Módulos. Se reubica antes de retirar. Medios y Promociones no se retiran por completo hasta que exista el editor de página pública; mientras tanto se simplifican, y las fotos de Profesional y Servicio pasan a subirse dentro de cada formulario. Horarios de atención y cierres pasan a un módulo propio; Configuración se retira solo cuando ese módulo y la publicación de la página tengan destino. La zona horaria se sugiere al crear el negocio y el propietario la confirma. Notificaciones: avisos dentro de cada reserva; la vista global se conserva como pantalla de excepciones de administración, fuera del menú principal.
5. Fechas y horas. Un solo formato, legible y en la zona horaria del negocio (ejemplo: "Hoy, 11:00 p. m.").

RESERVA Y SELECTOR
6. Selector de fecha y hora. Calendario para el día; la hora en un control compacto dentro o junto al calendario. Nunca una cuadrícula de horas que ocupe gran parte de la pantalla. La hora solo ofrece disponibilidad real, no un campo libre. El mismo patrón se usa en la reserva pública y al reagendar en el panel.
7. Pantalla de confirmación pública. Rediseño completo (no solo el texto), con fecha natural, próximos pasos y estado honesto: la reserva creada es PENDING y no se presenta como confirmada.

PAGOS
8. Tipo de pago. Cada negocio nombra sus métodos de pago sobre códigos controlados (efectivo, transferencia, etc.). El cliente elige uno al reservar.
9. Comprobante de transferencia. Entra en el MVP, no en Piloto 1. Se carga dentro del flujo de reserva y se guarda en almacenamiento privado de Supabase (bucket privado, acceso solo mediante el API con enlaces firmados de corta duración; nunca Cloudinary), con aislamiento por negocio. Visibilidad: los roles del negocio con acceso a todas las reservas ven todos los comprobantes del negocio (el C0 confirma la lista exacta de roles); Profesional ve solo los de sus propias reservas. Cada acceso queda registrado.
10. WhatsApp. No se usa para entregar comprobantes ni se expone el teléfono privado del profesional. Solo cabe un aviso opcional al negocio con texto genérico.
11. Completar, facturar, cobrar. Una reserva puede marcarse Completada antes de su hora de fin, respetando los estados y permisos vigentes. Puede facturarse una vez completada, sin esperar la hora de fin. El cobro real se registra después de facturar y de recibir el dinero, también sin esperar la hora de fin. Esto modifica el contrato cerrado de Facturación-A: se resuelve en el C0 de Pagos y no se implementa antes.
12. Propina y monto recibido. Cualquier rol factura dentro de su alcance (Profesional solo lo propio). El monto recibido se registra; la propina se calcula y se muestra antes de confirmar (servicio, propina, editar, confirmar); nunca se descuenta sin confirmación.

PROCESO
13. Las opciones recomendadas por Codex en los C0 de la auditoría técnica del 29-sep se adoptan como decisión del propietario, salvo lo dicho arriba. Cada C0 nuevo las marca FIJADA y solo abre las restantes.
14. Producción permanece cerrada e intacta. Todo se prueba en QA con negocios sintéticos.
15. Un gate abierto a la vez: C0; C1 backend con aprobación; C2 frontend con aprobación; C3 QA real y aprobación final.
ACTUALIZACION 2026-09-30. El propietario aprobó explícitamente implementar de inmediato, como correctivo F0-C, la parte de la decisión 11 que permite facturar y cobrar una reserva Completada sin esperar la hora de fin (ADR-002 y FACTURACION_A_CONTRATO_TECNICO actualizados). El resto de la decisión 11 y las decisiones 8, 9, 10 y 12 siguen pendientes del C0 de Pagos.

## ENMIENDAS DEL 1 DE OCTUBRE DE 2026

16. Lista de servicios en la reserva pública: filas compactas con miniatura redondeada de 64 a 80 px a la izquierda y, a la derecha, nombre, duración y precio. Sin tarjeta grande de imagen. Sin foto: misma fila, alternativa limpia.
17. Enmienda a la decisión 6: el día se elige en una semana de siete días con mes desplegable (días sin disponibilidad deshabilitados). Las horas se muestran como botones visibles; con más de doce horarios aparecen filtros Todos, Mañana, Tarde y Noche, omitiendo las franjas vacías. Se mantiene: solo horas disponibles, sin campo libre, sin cuadrícula que ocupe la pantalla.
18. Teléfono: grupo unificado (selector de país con bandera, búsqueda y prefijo, más número con máscara), sin texto de ayuda largo.
19. Enmienda a la decisión 7: la pantalla de éxito elimina las cajas grises, el bloque "¿Qué sigue?", las advertencias sobre lo que el sistema no hace y el disclaimer largo. Se mantiene visible, de forma discreta, el estado "Pendiente de confirmación".
20. WhatsApp: no se implementa un enlace al profesional (decisión 10). El WhatsApp público del negocio ya existente se conserva sin cambios.
21. Honeypot de servidor: mini-gate de backend posterior. Filtro de correos desechables: descartado por ahora.

## ENMIENDAS DEL 2 DE OCTUBRE DE 2026

22. Reservas: «Por atender» muestra pendientes y confirmadas; «Todas» y los demás estados se alcanzan con el filtro; el rango de fechas no se aplica por defecto.
23. D1-A y D2-A aprobadas como dirección; se implementan en un C1 de backend propio, antes de la Puerta de producción.
24. WhatsApp para clientes separado (E-A) aprobado como dirección; reemplazará las decisiones 10 y 20 solo para ese campo, en un módulo propio después de cerrar M1; hasta entonces se conserva el WhatsApp genérico del negocio.

25. Corrección posterior del propietario: «Por atender» incluye también las completadas con emisión de factura pendiente. «Todas» muestra primero las que necesitan esa atención y después las restantes; cada grupo va de la fecha de cita más reciente a la más antigua. Las fechas siguen sin rango por defecto. Modifica la decisión 22.
26. Desktop recupera acciones visibles adicionales según estado y permisos; móvil conserva una acción principal y menú. La pantalla final refuerza «Listo», WhatsApp y «Cómo llegar»; las fotos de selección, revisión y éxito usan cuadrados redondeados. El ajuste de encuadre de imágenes queda para después.
27. El contacto junto a «Reservar cita» en el mini-sitio abre WhatsApp al teléfono publicado del negocio con mensaje genérico previo a reservar. No expone números privados ni datos del visitante. El mensaje posterior a registrar la reserva se conserva. Se autoriza commit/push en `ai/antigravity-qa` y despliegue solo web QA de este correctivo; producción y módulos D/E permanecen fuera de alcance.

## ENMIENDAS DEL 3 DE OCTUBRE DE 2026

28. **M2 Cuenta de cliente: C0 APROBADO EXPLÍCITAMENTE POR EL PROPIETARIO.** El propietario adopta D1–D8, todas en A, del [C0 de M2](M2_CUENTA_CLIENTE_C0.md#15-aprobación-del-propietario-y-publicación-documental-2026-10-03). Las decisiones 2 y 13 permanecen FIJADAS; las siguientes ya no son opciones abiertas:

| Decisión de M2 | Estado y alcance fijado |
| --- | --- |
| D1-A | **FIJADA.** Código por correo con Clerk; nombre y correo verificado, protección estricta de enumeración y compatibilidad con B2B por verificar sin cambiar su autenticación por inferencia. |
| D2-A | **FIJADA.** Pantalla por negocio; selector solo de negocios con Client vinculado explícitamente. Sin búsqueda de identidad/reservas por correo ni Membership como sustituto. |
| D3-A | **FIJADA.** Referencia en memoria durante la visita y recuperación asistida por el negocio si se pierde. Sin recuperación automática por contacto, nuevo recibo ni TTL impuesto al claim aprobado. |
| D4-A | **FIJADA.** Bloquear casos ambiguos y revisarlos antes de exponer historial; sin backfill, fusión automática o identidad inferida de deduplicación. |
| D5-A | **FIJADA.** Cancelación/reprogramación de etapa 2 desactivadas inicialmente; al habilitar, 24 h de antelación por defecto para cada acción, ajustable entre 1 y 168 h enteras. Configuración en Horarios → Política de reservas, separada de turnos/cierres. |
| D6-A | **FIJADA.** Solo OWNER edita política; política vigente al ejecutar, revisión y advertencia de impacto sobre reservas existentes. |
| D7-A | **FIJADA.** Nombre y teléfono del Client propio editables por negocio; correo de contacto de solo lectura. Sin propagación automática entre negocios o unión de identidades por email. |
| D8-A | **FIJADA.** Corregir la enumeración legacy residual mediante la enmienda expresa y limitada 29, manteniendo reserva primaria y autenticación legacy. |

29. **Enmienda expresa y limitada D8 de M2.** Se adopta el correctivo de la señal de existencia de identidad que devuelve la creación secundaria de cuenta legacy mediante `accountCreationError` en `POST /public/:slug/bookings`; neutralizarla solo en el copy no basta. Se preservan Client/Booking atómicos, creación PENDING, cuenta secundaria fail-open, reserva persistida ante fallo de cuenta, rechazo de colisiones y error neutro D11. No se inventa éxito de reserva, no se enlaza User por correo y no se modifican el contrato de claim A0.6-A, Memberships, roles, JWT/password ni otras rutas de autenticación. El retiro legacy continúa fuera de alcance. La aprobación fija esta dirección y permite definir su contrato de correctivo en C1, pero **no autoriza implementarlo en esta tarea documental**.

La autorización del 2026-10-03 comprende registrar la aprobación y hacer commit/push del alcance documental propio de M2 solo a `origin/ai/antigravity-qa`, sin despliegue. Los seis archivos pendientes de M1 se comparan con `760131a`, se preservan y no se tocan antes de la respuesta del propietario. La aprobación C0 no abre C1/C2/C3: M2 necesita backend C1 autorizado, validado y aprobado expresamente antes de frontend. Producción permanece cerrada; no se cambian flags, variables, dependencias o bases reales.
