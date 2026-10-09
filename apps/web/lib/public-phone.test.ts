import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changePhoneNumber, EMPTY_PHONE, PHONE_COUNTRIES, phoneDisplay, phonePrefixError, phoneValue, formatPublicPhone } from './public-phone.ts';

test('RD: máscara de diez dígitos y prefijo único al pegar formato local/completo', () => {
  for (const input of ['8095550100', '809-555-0100', '+1 (809) 555-0100', '0018095550100', '18095550100']) {
    const draft = changePhoneNumber(EMPTY_PHONE, input);
    assert.equal(phoneDisplay(draft), '809-555-0100');
    assert.equal(phoneValue(draft), '+18095550100');
    assert.equal(draft.country, 'do');
  }
  assert.equal(phoneValue(EMPTY_PHONE), '');
});
test('países que comparten +1 conservan elección y los demás conservan su longitud', () => {
  assert.equal(PHONE_COUNTRIES.length, 27);
  const canada = changePhoneNumber({ country: 'ca', dial: '1', national: '' }, '+1 416 555 0100');
  assert.equal(canada.country, 'ca');
  const spain = changePhoneNumber(EMPTY_PHONE, '0034 912 345 678');
  assert.deepEqual(spain, { country: 'es', dial: '34', national: '912345678' });
  assert.equal(phoneValue(spain), '+34912345678');
  assert.equal(phoneDisplay(spain), '912-345-678');
  assert.equal(formatPublicPhone('+18097297589'), '+1 809-729-7589');
  assert.equal(formatPublicPhone('+34912345678'), '+34 912-345-678');
});
test('otro prefijo conserva números desconocidos completos y admite prefijo manual', () => {
  const unknown = changePhoneNumber(EMPTY_PHONE, '+81 90 1234 5678');
  assert.equal(unknown.country, 'other');
  assert.equal(phoneValue(unknown), '+819012345678');
  assert.equal(phonePrefixError(unknown), undefined);
  const manual = { ...unknown, dial: '81' };
  assert.equal(phoneValue(manual), '+819012345678');
  assert.equal(phoneDisplay(manual), '90-1234-5678');
  assert.equal(phoneDisplay(unknown), '+81 90-1234-5678');
  assert.equal(formatPublicPhone('+819012345678'), '+81 90-1234-5678');
  assert.equal(phoneValue({ ...unknown, dial: '8' }), '+819012345678');
  assert.ok(phonePrefixError({ ...unknown, dial: '44' }));
  assert.equal(phoneValue(changePhoneNumber({ country: 'other', dial: '81', national: '' }, '+819012345678')), '+819012345678');
  assert.ok(phonePrefixError({ country: 'other', dial: 'abc', national: '1234567' }));
});
test('entrada inválida y números largos no se limpian ni truncan silenciosamente', () => {
  assert.match(phoneValue(changePhoneNumber(EMPTY_PHONE, '809abc0100')), /abc/);
  const long = changePhoneNumber(EMPTY_PHONE, '12345678901234567890');
  assert.equal(long.national.length, 20);
});
