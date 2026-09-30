import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from './api.ts';
import { bookingStatusError } from './booking-status-error.ts';
import { invoiceErrorMessage } from './invoice-ui.ts';
import { mediaError } from './media-ui.ts';
import { notificationError } from './notification-ui.ts';
import { serviceErrorMessage } from './service-ui.ts';
import { teamErrorMessage } from './team-ui.ts';
import { scheduleError } from './business-schedule.ts';

const id = '12345678-1234-4234-8234-123456789abc';
test('una transición rechazada de Pendiente a Completada pide confirmar primero', () => {
  const error = new ApiError(400, 'Transición de estado no permitida para BARBER', null, id);
  assert.match(bookingStatusError(error, 'PENDING', 'COMPLETED'), /Primero confirma la reserva/);
  assert.doesNotMatch(bookingStatusError(error, 'PENDING', 'COMPLETED'), /BARBER|horario/);
});
test('distingue conflictos reales, recurso inexistente, permiso, sesión y fallo desconocido', () => {
  assert.match(bookingStatusError(new ApiError(409, 'El profesional ya tiene una cita reservada en este horario')), /ya tiene una cita/);
  assert.match(bookingStatusError(new ApiError(409, 'El profesional no está disponible en ese horario')), /no está disponible/);
  assert.match(bookingStatusError(new ApiError(409, 'No se puede reactivar una reserva futura de un profesional inactivo o archivado')), /inactivo o archivado/);
  assert.match(bookingStatusError(new ApiError(401, 'raw')), /iniciar sesión/);
  assert.match(bookingStatusError(new ApiError(403, 'raw')), /No tienes permiso/);
  assert.match(bookingStatusError(new ApiError(404, 'raw')), /ya no está disponible/);
  assert.doesNotMatch(bookingStatusError(new ApiError(500, 'Prisma constraint')), /Prisma|constraint|horario/);
});
test('no fabrica códigos; descarta cabeceras arbitrarias y conserva UUID completo sin logs', () => {
  for (const candidate of [null, '', 'detalle privado', '123', id + '\n']) {
    const error = new ApiError(401, 'raw', null, candidate);
    assert.equal(error.requestId, null);
    assert.doesNotMatch(bookingStatusError(error), /Código de soporte:/);
  }
  assert.equal(new ApiError(400, 'Revisa el campo', null, id).withRequestCode('Revisa el campo.'), 'Revisa el campo.');
  assert.equal(new ApiError(401, 'raw', null, id).withRequestCode('Inicia sesión.'), `Inicia sesión.\nCódigo de soporte: ${id}`);
});
test('los formateadores de guardado conservan sus mensajes y decoran el código recibido', () => {
  const error = new ApiError(503, 'detalle técnico', null, id);
  for (const message of [invoiceErrorMessage(error, 'issue'), mediaError(error, 'save'), notificationError(error, 'preference'), serviceErrorMessage(error, 'update'), teamErrorMessage(error, 'role'), scheduleError(error)]) {
    assert.match(message, new RegExp(`Código de soporte: ${id}$`));
    assert.doesNotMatch(message, /detalle técnico/);
  }
});

test('oculta códigos en reglas claras y los conserva en fallos sin causa traducida', () => {
  for (const status of [400, 403, 409, 413, 422, 429]) {
    assert.doesNotMatch(new ApiError(status, 'regla clara', null, id).withRequestCode('Revisa los datos.'), /Código de soporte/);
  }
  assert.doesNotMatch(bookingStatusError(new ApiError(400, 'Transición administrativa de estado no permitida', null, id)), /Código de soporte/);
  assert.doesNotMatch(bookingStatusError(new ApiError(409, 'El profesional ya tiene una cita reservada en este horario', null, id)), /Código de soporte/);
  assert.match(bookingStatusError(new ApiError(400, 'rechazo desconocido', null, id)), /Código de soporte/);
  assert.doesNotMatch(invoiceErrorMessage(new ApiError(400, 'Revisa los datos de facturación', null, id), 'issue'), /Código de soporte/);
  assert.doesNotMatch(teamErrorMessage(new ApiError(400, 'Revisa los datos de la invitación', null, id), 'invite'), /Código de soporte/);
  const unclear = new ApiError(400, 'No pudimos completar la solicitud. Vuelve a intentarlo.', null, id);
  assert.match(invoiceErrorMessage(unclear, 'issue'), /Código de soporte/);
  assert.match(teamErrorMessage(unclear, 'invite'), /Código de soporte/);
  assert.doesNotMatch(serviceErrorMessage(new ApiError(400, 'validación', null, id), 'update'), /Código de soporte/);
});
