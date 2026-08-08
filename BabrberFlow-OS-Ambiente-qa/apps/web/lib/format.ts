/** Formato de moneda consistente en todo el panel (RD$, locale es-DO). */
export function formatMoney(value: string | number) {
  return `RD$${Number(value).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
}
