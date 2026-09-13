import assert from 'node:assert/strict';
import test from 'node:test';
import { cmsForm, cmsHours, cmsInput, isCmsMapsUrl, validateCmsForm } from './cms-ui.ts';

test('CMS normaliza opcionales sin copiar propiedades ajenas', () => {
  const form = cmsForm({
    publicName: 'Nombre',
    description: null,
    phone: null,
    address: null,
    googleMapsUrl: null,
  });
  assert.deepEqual(
    cmsInput({ ...form, publicName: ' Nombre ', description: '  ', phone: '+1 (809) 555-0100' }),
    {
      publicName: 'Nombre',
      description: null,
      phone: '+18095550100',
      address: null,
      googleMapsUrl: null,
    },
  );
  assert.ok(
    validateCmsForm({
      ...form,
      publicName: ' ',
      description: '<script>alert(1)</script>',
      phone: '809-call-me',
    }).publicName,
  );
  assert.ok(validateCmsForm({ ...form, description: '<b>texto</b>' }).description);
  assert.ok(validateCmsForm({ ...form, address: 'a'.repeat(301) }).address);
});

test('CMS no crea enlaces activos con URL ajena o maliciosa', () => {
  for (const url of [
    'https://google.com/maps',
    'https://maps.google.com/',
    'https://maps.app.goo.gl/AbC_123',
  ])
    assert.equal(isCmsMapsUrl(url), true);
  for (const url of [
    'javascript:alert(1)',
    'https://google.com.evil.test/maps',
    'https://google.com/search',
    'https://user:pass@google.com/maps',
    'https://maps.app.goo.gl/a/b',
    'https://google.com:444/maps',
  ])
    assert.equal(isCmsMapsUrl(url), false);
});

test('horario de lectura no inventa fallback ni muestra detalles de zona', () => {
  assert.match(cmsHours(null), /No hay un horario global confirmado/);
  assert.match(cmsHours({ open: '25:00', close: '19:00' }), /No hay/);
  assert.match(cmsHours({ open: '19:00', close: '09:00' }), /No hay/);
  assert.equal(
    cmsHours({ open: '09:00', close: '19:00' }),
    'De 9:00 a. m. a 7:00 p. m., hora del negocio.',
  );
});
