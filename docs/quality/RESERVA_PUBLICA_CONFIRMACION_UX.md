# Reserva pública — confirmación y pie de página

Fecha: 2026-10-03. Estado: **IMPLEMENTADO / AUTORIZADO PARA WEB QA / EN REVISIÓN; VALIDACIÓN VISUAL DEL PROPIETARIO PENDIENTE**.

## Brief de producto

- **Usuario:** cliente que acaba de registrar una reserva pública y visitantes del mini-sitio.
- **Resultado:** entender dónde queda el negocio, encontrar calendario/contacto/mapa rápidamente y reconocer el negocio al pie de las pantallas públicas.
- **Alcance:** presentación de éxito de /{slug}/reservar, contenido del pie en el flujo público y mini-sitio /{slug}. Reutiliza únicamente dirección, enlace de Maps, teléfono publicado y slug recibidos por el flujo existente.
- **No alcance:** producción, API, contrato, estado de reserva, autorización, datos o creación de cuenta. El propietario autorizó commit, push y despliegue únicamente web QA para revisar en teléfono.
- **Privacidad y roles:** superficie pública; no agrega datos del cliente ni información privada.
- **Estados:** mantiene PENDING/consulta de estado y avisos de cuenta existentes. Ubicación y acciones correspondientes solo aparecen cuando sus datos públicos están disponibles.
- **Criterios observables:** ubicación aparece después del servicio/profesional y antes de acciones; calendario/contacto/mapa siguen usando sus acciones existentes; recordatorio sin caja y con jerarquía tipográfica clara; pies centrados muestran «slug · Reservas gestionadas con Kortek.».

## Implementación

- SuccessView presenta la ubicación en una tarjeta compacta después del resumen, agrupa WhatsApp y Maps debajo del calendario y deja la recomendación de conservar la confirmación sin borde/caja.
- PublicBookingFooter comparte la firma visual y el texto entre el mini-sitio y todas las pantallas del flujo de reserva.
- Sin cambios de backend, contrato, persistencia, permisos, datos ni dependencias.

## Validación y límites

- pnpm --filter web exec tsc --noEmit: exit 0; pnpm --filter web lint: exit 0.
- pnpm --filter web build con configuración estándar/Turbopack: falla al resolver el módulo interno @vercel/turbopack-next/internal/font/google/font de next/font/google. Build alternativo pnpm --filter web build -- --webpack, con DEPLOY_ENV=staging, NEXT_PUBLIC_API_URL=https://api.staging.booking.kortek.cloud y WEB_PUBLIC_ORIGIN=https://qa.booking.kortek.cloud inyectados solo al proceso: exit 0; compiló, validó TypeScript y generó las rutas. No se modificaron variables o archivos de entorno.
- QA retomada el 2026-10-03: localhost:3000 y localhost:3001 aceptan conexiones. GET `http://localhost:3000/public/qa-horario-norte/booking-data` devuelve 404 y `/qa-horario-norte/reservar` no llega a éxito. Ese slug local no está publicado en el entorno local; el 404 neutro también corresponde a reserva pública cerrada. No inspeccioné ni cambié flags. La evidencia vigente previa del API QA sobre los slugs sintéticos publicados `m1-c3-norte` registra catálogo/días `200/200` (véanse [F0-E](CORRECTIVO_F0E.md) y [C3 QA](RESERVA_PUBLICA_M1_C3_CIERRE.md)); este ajuste no cambia ni despliega el API. La red de esta sesión impide reconsultar el host QA desde PowerShell.
- No se envió una reserva ni se cambiaron flags/datos. Los fixtures QA documentados son persistentes y no se limpian tras pruebas. El propietario realizará la validación visual real desde el teléfono una vez listo el deployment; éxito, orden de acciones, responsivo y pie siguen pendientes de esa revisión.
- No constituye aprobación del propietario ni cierre de QA funcional/visual.
