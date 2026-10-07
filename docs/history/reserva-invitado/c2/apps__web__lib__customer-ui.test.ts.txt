import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customerReturn, customerRoutes, validBookingId } from './customer-routes.ts';
import { commandCanRetry, CUSTOMER_OPERATION_TTL, customerError, profileErrors, customerStatus } from './customer-ui.ts';
import { ApiError } from './api.ts';
test('retorno cliente rechaza dominios, escapes, query, fragmentos y panel', () => {
  const routes = customerRoutes('norte');
  for (const unsafe of ['//evil.invalid', 'https://evil.invalid', '/dashboard', '/norte/mis-reservas?email=private', '/norte/mis-reservas#x', '/%6eorte/mis-reservas', '/sur/mis-reservas', '/norte/../dashboard', '/norte\\mis-reservas']) assert.equal(customerReturn('norte', unsafe), routes.bookings);
  assert.equal(customerReturn('norte', routes.profile), routes.profile);
  assert.equal(customerReturn('norte', routes.root), routes.root);
  assert.equal(validBookingId('9f04dbaf-9a97-427a-a5bb-d9481296acba'), true);
  assert.equal(validBookingId('arbitrary'), false);
});
test('TTL 24 h es límite estricto: nunca reenvía resultado incierto vencido', () => {
  const command = { key: 'opaque', body: {}, createdAt: 100 };
  assert.equal(commandCanRetry(command, 100 + CUSTOMER_OPERATION_TTL - 1), true);
  assert.equal(commandCanRetry(command, 100 + CUSTOMER_OPERATION_TTL), false);
});
test('perfil valida contacto propio; errores de proveedor/tenant no exponen causas técnicas', () => {
  assert.deepEqual(profileErrors(' Cliente ', ''), {});
  assert.ok(profileErrors(' ', '+123').name);
  assert.ok(profileErrors('Cliente', '+123').phone);
  for (const status of [400, 401, 403, 404, 409, 429, 503]) assert.doesNotMatch(customerError(new ApiError(status, 'Prisma private constraint foreign email@test.invalid')), /Prisma|private|constraint|foreign|@/);
  assert.equal(customerError(new ApiError(404, 'ajena')), customerError(new ApiError(404, 'inexistente')));
  assert.equal(customerStatus.PENDING, 'Pendiente de confirmación');
  assert.doesNotMatch(customerError(new ApiError(400, 'invalid selection'), 'booking'), /comprobar|mismo envío/);
});
