import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from './api.ts';
import { mediaError, validateMediaFile } from './media-ui.ts';

test('la cuota o error de moderación se explica y no promete publicación', () => {
  const message = mediaError(new ApiError(503, 'Error interno'), 'upload');
  assert.match(message, /revisión automática/);
  assert.match(message, /cuota/);
  assert.match(message, /no se publicó/);
  assert.doesNotMatch(message, /Error interno/);
});

test('el archivo inválido se detiene antes de solicitar moderación', () => {
  assert.match(validateMediaFile(null) ?? '', /Selecciona/);
  assert.match(validateMediaFile(new File(['x'], 'foto.svg', { type: 'image/svg+xml' })) ?? '', /JPEG/);
  assert.match(validateMediaFile(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'foto.png', { type: 'image/png' })) ?? '', /5 MiB/);
});
