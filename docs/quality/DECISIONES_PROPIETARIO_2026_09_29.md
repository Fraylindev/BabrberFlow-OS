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
