import { ApiError, type BookingStatus } from './api.ts';

/** Solo mensajes de dominio inspeccionados; nunca cuerpo técnico arbitrario. */
export function bookingStatusError(error: unknown, current?: BookingStatus, target?: BookingStatus): string {
  let message = 'No pudimos cambiar el estado. Revisa la conexión y vuelve a intentarlo.';
  let unexpected: boolean | undefined;
  if (error instanceof ApiError) {
    if (error.status === 401) message = 'Tu sesión ya no está disponible. Vuelve a iniciar sesión.';
    else if (error.status === 403) message = 'No tienes permiso para cambiar el estado de esta reserva.';
    else if (error.status === 404) message = 'Esta reserva ya no está disponible. Actualiza la lista.';
    else if (error.status === 400) {
      unexpected = !/Transición .*estado no permitida/i.test(error.message);
      message = /Transición .*estado no permitida/i.test(error.message)
        ? current === 'PENDING' && target === 'COMPLETED'
          ? 'Primero confirma la reserva para poder completarla.'
          : 'Este cambio de estado no está permitido. Actualiza la reserva y revisa las acciones disponibles.'
        : 'No pudimos cambiar el estado. Revisa la reserva y la acción seleccionada.';
    } else if (error.status === 409) {
      const domainMessages = [
        'El profesional ya tiene una cita reservada en este horario',
        'El profesional no está disponible en ese horario',
        'No se puede reactivar una reserva futura de un profesional inactivo o archivado',
        'El horario del negocio necesita revisión.',
        'No fue posible interpretar la hora del negocio.',
      ];
      message = domainMessages.includes(error.message)
        ? `${error.message.replace(/\.$/, '')}. Actualiza la reserva antes de volver a intentarlo.`
        : 'No pudimos aplicar el cambio porque la reserva o su disponibilidad cambió. Actualiza la lista y revisa su estado.';
    } else if (error.status === 429) message = 'Espera un momento antes de volver a cambiar el estado.';
    return error.withRequestCode(message, unexpected);
  }
  return message;
}
