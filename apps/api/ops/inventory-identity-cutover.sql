-- Read-only aggregate inventory for identity cutover.
BEGIN READ ONLY;
SELECT count(*) AS users_total,
       count(*) FILTER (WHERE "clerkUserId" IS NOT NULL) AS users_linked_clerk,
       count(*) FILTER (WHERE password IS NOT NULL) AS users_legacy_password
FROM public."User";

SELECT m.role,
       count(*) AS memberships_total,
       count(*) FILTER (WHERE u."clerkUserId" IS NOT NULL) AS linked_clerk,
       count(*) FILTER (WHERE u.password IS NOT NULL) AS legacy_password
FROM public."Membership" m
JOIN public."User" u ON u.id = m."userId"
GROUP BY m.role ORDER BY m.role;

SELECT status, count(*) AS invitations_total,
       count(*) FILTER (WHERE "clerkInvitationId" IS NOT NULL) AS provider_linked,
       count(*) FILTER (WHERE "expiresAt" > now()) AS not_expired
FROM public."TeamInvitation"
GROUP BY status ORDER BY status;
COMMIT;
