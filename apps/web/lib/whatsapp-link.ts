export const WHATSAPP_MESSAGE =
  "Hola. Acabo de registrar una reserva en su página y quisiera consultar con ustedes.";

export const WHATSAPP_EXPLANATION =
  "Abrirás WhatsApp. Revisa y envía el mensaje allí; abrirlo no confirma tu reserva.";

/** C1: only the current business's published phone; never infer a country. */
export function bookingWhatsAppLink(phone: string | null | undefined): string | null {
  // Reject forbidden characters before normalization (including trailing CR/LF).
  if (!phone || /[^+0-9 ().-]/.test(phone)) return null;
  const normalized = phone.replace(/[ ().-]/g, "");
  if (!/^\+[1-9][0-9]{6,14}$/.test(normalized)) return null;
  return `https://wa.me/${normalized.slice(1)}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
}
