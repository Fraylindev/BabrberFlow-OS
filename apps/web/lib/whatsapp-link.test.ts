import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingWhatsAppLink, WHATSAPP_MESSAGE } from "./whatsapp-link.ts";

// Every row of C1 §4 is executed, including each member of grouped rows.
const accepted = [
  ["+1234567", "1234567"],
  ["+123456789012345", "123456789012345"],
  [" +1 (809) 555-1234 ", "18095551234"],
  ["+34.912.345.678", "34912345678"],
] as const;

for (const [input, digits] of accepted) {
  test(`C1 §4 accepts ${JSON.stringify(input)}`, () => {
    const link = bookingWhatsAppLink(input);
    assert.equal(link, `https://wa.me/${digits}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`);
    const url = new URL(link!);
    assert.equal(url.origin, "https://wa.me");
    assert.equal(url.hash, "");
    assert.deepEqual([...url.searchParams], [["text", WHATSAPP_MESSAGE]]);
  });
}

const rejected = [
  null, undefined, "", "   ",
  "8095551234", "18095551234", "0018095551234",
  "+01234567", "+123456", "+1234567890123456",
  "++18095551234", "1809+5551234", "+18095551234 ext 2", "+18095551234x2",
  "tel:+18095551234", "https://wa.me/18095551234",
  "+18095551234?text=hola", "+18095551234&text=hola", "+18095551234#fragment",
  "+18095551234\r", "+18095551234\n", "+18095551234\r\n",
  "+1809\t5551234", "+1809\u00a05551234", "+1809\u200b5551234",
  "+١٨٠٩٥٥٥١٢٣٤", "+１８０９５５５１２３４",
];

for (const input of rejected) {
  test(`C1 §4 rejects ${JSON.stringify(input)}`, () => {
    assert.equal(bookingWhatsAppLink(input), null);
  });
}

test("D4 is the exact generic message, without interpolation", () => {
  assert.equal(WHATSAPP_MESSAGE,
    "Hola. Acabo de registrar una reserva en su página y quisiera consultar con ustedes.");
});
