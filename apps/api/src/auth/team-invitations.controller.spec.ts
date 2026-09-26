import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TeamInvitationsController } from './team-invitations.controller';

describe('TeamInvitationsController throttling', () => {
  it.each([
    ['create', 10],
    ['resend', 5],
    ['revoke', 10],
  ] as const)('applies a specific one-minute limit to %s', (method, limit) => {
    const handler = Reflect.get(
      TeamInvitationsController.prototype,
      method,
    ) as object;

    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(limit);
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(60000);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(
      ThrottlerGuard,
    );
  });
});
