const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function customerRoutes(slug: string) {
  const root = `/${encodeURIComponent(slug)}`;
  return { root, create: `${root}/cuenta/crear`, login: `${root}/cuenta/entrar`, recover: `${root}/cuenta/recuperar`, bookings: `${root}/mis-reservas`, profile: `${root}/mi-perfil`, reserve: `${root}/reservar` };
}
export function customerReturn(slug: string, requested: string | null) {
  const routes = customerRoutes(slug);
  // Ningún origen, query, fragmento, escape o destino interno puede convertirse en retorno.
  if (requested === routes.root || requested === routes.bookings || requested === routes.profile || requested === routes.reserve) return requested;
  return routes.bookings;
}
export function validBookingId(value: string) { return UUID.test(value); }
