import { ApiError, type BookingStatus } from './api.ts';
export const CUSTOMER_OPERATION_TTL = 24 * 60 * 60 * 1000;
export const CUSTOMER_UNAVAILABLE = 'Esta reserva no está disponible para tu cuenta.';
export const CUSTOMER_ASSISTANCE = 'Si necesitas recuperar una reserva, contacta al negocio para que revise tu caso. No podemos recuperarla automáticamente por correo o teléfono.';
export const customerStatus: Record<BookingStatus, string> = { PENDING: 'Pendiente de confirmación', CONFIRMED: 'Confirmada', COMPLETED: 'Completada', CANCELLED: 'Cancelada', NO_SHOW: 'No asistió' };
export function customerError(error: unknown, operation: 'read' | 'claim' | 'profile' | 'booking' = 'read') {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'Inicia sesión de nuevo para ver tus reservas.';
    if (error.status === 404) return CUSTOMER_UNAVAILABLE;
    if (error.status === 429) return 'Has realizado varios intentos. Espera un momento antes de volver a probar.';
    if (operation === 'claim' && [400, 409, 422].includes(error.status)) return 'No pudimos añadir esta reserva a tu cuenta. Revisa que usas la cuenta con la que quieres vincularla o contacta al negocio.';
    if (operation === 'booking' && error.status === 409) return 'No pudimos registrar otra reserva con esta selección. Revisa Mis reservas antes de elegir otro horario.';
    if (operation === 'booking' && [400, 422].includes(error.status)) return 'No pudimos registrar esta reserva. Revisa las opciones y vuelve a probar.';
  }
  return operation === 'profile' ? 'No pudimos guardar tus datos. Revísalos e inténtalo de nuevo.' : operation === 'claim' ? 'No pudimos añadir la reserva a Mis reservas. La reserva sigue registrada.' : operation === 'booking' ? 'No pudimos comprobar si la reserva se registró. Reintenta este mismo envío para comprobarlo o revisa Mis reservas.' : 'No pudimos mostrar tus reservas. Inténtalo de nuevo.';
}
export function profileErrors(name: string, phone: string) {
  const errors: Partial<Record<'name' | 'phone', string>> = {};
  if (!name.trim() || name.trim().length > 120) errors.name = 'Escribe un nombre de hasta 120 caracteres.';
  if (phone.trim() && (!/^\+?[\d\s().-]+$/.test(phone.trim()) || phone.length > 30 || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)) errors.phone = 'Revisa el teléfono y su prefijo: debe tener entre 7 y 15 dígitos.';
  return errors;
}
export interface CustomerCommand<T> { key: string; body: T; createdAt: number }
export function commandCanRetry(command: CustomerCommand<unknown>, now = Date.now()) { return now < command.createdAt + CUSTOMER_OPERATION_TTL; }
export function uncertainCustomerWrite(error: unknown) { return !(error instanceof ApiError) || error.status >= 500; }
