import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PROFESSIONAL_BUSINESS_TIME_COPY,
  isCurrentProfessionalsScope,
  professionalsScopeKey,
  professionalProfileInput,
} from './professional-ui.ts';

test('profile form sends only editable fields and normalizes optional values', () => {
  const draft = {
    name: '  Nombre profesional  ', specialty: '  Corte  ', bio: '  Biografía  ',
    avatar: '  https://example.com/avatar.jpg  ', phone: '  +18095550101  ', experienceYears: '5',
    organizationId: 'another-tenant', userId: 'another-user', status: 'ACTIVE', isPublic: true,
  };
  assert.deepEqual(professionalProfileInput(draft), {
    name: 'Nombre profesional', specialty: 'Corte', bio: 'Biografía',
    avatar: 'https://example.com/avatar.jpg', phone: '+18095550101', experienceYears: 5,
  });
  assert.deepEqual(professionalProfileInput({
    name: 'Nombre', specialty: ' ', bio: '', avatar: '', phone: ' ', experienceYears: '',
  }), {
    name: 'Nombre', specialty: null, bio: null, avatar: null, phone: null, experienceYears: null,
  });
  assert.equal(professionalProfileInput({ ...draft, experienceYears: '0' }).experienceYears, 0);
});

test('professionals scope changes with user, organization, or role', () => {
  const owner = { id: 'user-1', role: 'OWNER' as const };

  assert.equal(professionalsScopeKey(owner, 'organization-1'), 'user-1:organization-1:OWNER');
  assert.notEqual(
    professionalsScopeKey(owner, 'organization-1'),
    professionalsScopeKey(owner, 'organization-2'),
  );
  assert.notEqual(
    professionalsScopeKey(owner, 'organization-1'),
    professionalsScopeKey({ id: 'user-1', role: 'BARBER' }, 'organization-1'),
  );
  assert.notEqual(
    professionalsScopeKey(owner, 'organization-1'),
    professionalsScopeKey({ id: 'user-2', role: 'OWNER' }, 'organization-1'),
  );
  assert.equal(professionalsScopeKey(null, 'organization-1'), null);
  assert.equal(professionalsScopeKey(owner, null), null);
  const scope = { key: professionalsScopeKey(owner, 'organization-1') };
  assert.equal(isCurrentProfessionalsScope(scope, scope), true);
  assert.equal(isCurrentProfessionalsScope({ key: 'user-1:organization-2:BARBER' }, scope), false);
  assert.equal(isCurrentProfessionalsScope(null, scope), false);
});

test('returning A to B to A does not revive late mutation effects from the first A', () => {
  const firstA = { key: 'user-1:organization-1:OWNER' };
  const scopeB = { key: 'user-1:organization-2:BARBER' };
  const secondA = { key: firstA.key };
  assert.equal(isCurrentProfessionalsScope(scopeB, firstA), false);
  assert.equal(isCurrentProfessionalsScope(secondA, firstA), false);
  assert.equal(isCurrentProfessionalsScope(secondA, secondA), true);
  assert.equal(isCurrentProfessionalsScope(null, secondA), false);
});

test('availability copy does not expose technical time-zone identifiers', () => {
  const visibleCopy = Object.values(PROFESSIONAL_BUSINESS_TIME_COPY).join(' ');

  assert.doesNotMatch(
    visibleCopy,
    /America\/|Santo_Domingo|IANA|UTC|offset|backend|zona horaria|conversi[oó]n/i,
  );
});
