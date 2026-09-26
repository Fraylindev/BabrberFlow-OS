import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ThrottlerGuard } from '@nestjs/throttler';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrganizationsController } from './organizations.controller';

describe('OrganizationsController team throttling', () => {
  it.each([
    ['updateTeamMemberRole', 10],
    ['revokeTeamMemberAccess', 10],
  ] as const)('applies a specific one-minute limit to %s', (method, limit) => {
    const handler = Reflect.get(
      OrganizationsController.prototype,
      method,
    ) as object;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];

    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(limit);
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(60000);
    expect(guards).toEqual(
      expect.arrayContaining([B2bAuthGuard, RolesGuard, ThrottlerGuard]),
    );
  });
});
