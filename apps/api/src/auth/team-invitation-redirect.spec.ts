import {
  buildTeamInvitationRedirectUrl,
  TEAM_INVITATION_QUERY_PARAM,
} from './team-invitation-redirect';

describe('buildTeamInvitationRedirectUrl', () => {
  it('adds only the server-known local invitation UUID to the configured URL', () => {
    const result = new URL(
      buildTeamInvitationRedirectUrl(
        'http://localhost:3001/accept-invitation',
        'ca0986f6-7578-4473-93c5-d2122cfe3a59',
      ),
    );

    expect(result.origin).toBe('http://localhost:3001');
    expect(result.pathname).toBe('/accept-invitation');
    expect([...result.searchParams.keys()]).toEqual([
      TEAM_INVITATION_QUERY_PARAM,
    ]);
    expect(result.searchParams.get(TEAM_INVITATION_QUERY_PARAM)).toBe(
      'ca0986f6-7578-4473-93c5-d2122cfe3a59',
    );
    expect(result.hash).toBe('');
  });
});
