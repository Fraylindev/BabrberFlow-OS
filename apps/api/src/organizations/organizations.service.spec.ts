import { ProfessionalStatus, UserRole } from '@prisma/client';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
const USER_ID = '00000000-0000-4000-8000-000000000002';

function createDependencies() {
  const db = {
    membership: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    professional: { findMany: jest.fn(), findFirst: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([{ id: ORGANIZATION_ID }]),
    $transaction: jest.fn(),
  };
  db.$transaction.mockImplementation(
    (
      operation:
        | Array<Promise<unknown>>
        | ((transaction: typeof db) => Promise<unknown>),
    ) => (Array.isArray(operation) ? Promise.all(operation) : operation(db)),
  );
  const prisma = { db };
  const audit = { logTransactional: jest.fn().mockResolvedValue(undefined) };
  return {
    prisma,
    audit,
    service: new OrganizationsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    ),
  };
}

describe('OrganizationsService - member tenant isolation', () => {
  it('loads professional profiles only through the requested organization', async () => {
    const { prisma, service } = createDependencies();
    prisma.db.membership.findMany.mockResolvedValue([
      {
        id: 'membership-id',
        role: UserRole.BARBER,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        user: { id: USER_ID, name: 'Barber', email: 'barber@example.com' },
      },
    ]);
    prisma.db.professional.findMany.mockResolvedValue([
      {
        id: 'professional-id',
        userId: USER_ID,
        organizationId: ORGANIZATION_ID,
        name: 'Public name',
        bio: 'Bio',
        avatar: 'https://example.com/avatar.jpg',
        specialty: 'Fades',
        experienceYears: 4,
        status: ProfessionalStatus.ACTIVE,
        isPublic: true,
        phone: '+18095550101',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await service.findMembers(ORGANIZATION_ID);

    expect(prisma.db.professional.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORGANIZATION_ID, userId: { in: [USER_ID] } },
      select: {
        id: true,
        userId: true,
        name: true,
        bio: true,
        avatar: true,
        specialty: true,
        experienceYears: true,
        status: true,
        isPublic: true,
      },
    });
    expect(result[0].user.professional).toEqual({
      id: 'professional-id',
      name: 'Public name',
      bio: 'Bio',
      avatar: 'https://example.com/avatar.jpg',
      specialty: 'Fades',
      experienceYears: 4,
      status: ProfessionalStatus.ACTIVE,
      isActive: true,
      isPublic: true,
    });
    expect(result[0].user.professional).not.toHaveProperty('organizationId');
    expect(result[0].user.professional).not.toHaveProperty('userId');
    expect(result[0].user.professional).not.toHaveProperty('phone');
    expect(result[0].user.professional).not.toHaveProperty('createdAt');
    expect(result[0].user.professional).not.toHaveProperty('updatedAt');
  });

  it('does not query professionals when the organization has no members', async () => {
    const { prisma, service } = createDependencies();
    prisma.db.membership.findMany.mockResolvedValue([]);

    await expect(service.findMembers(ORGANIZATION_ID)).resolves.toEqual([]);
    expect(prisma.db.professional.findMany).not.toHaveBeenCalled();
  });
});

describe('OrganizationsService - Team directory and management', () => {
  const OWNER_ID = '00000000-0000-4000-8000-000000000010';
  const MEMBER_ID = '00000000-0000-4000-8000-000000000011';
  const MEMBER_USER_ID = '00000000-0000-4000-8000-000000000012';
  const member = {
    id: MEMBER_ID,
    userId: MEMBER_USER_ID,
    role: UserRole.BARBER,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    user: { name: 'Ana Barber', email: 'ana@example.com' },
  };

  it('paginates a minimal tenant-scoped directory without internal IDs or private fields', async () => {
    const { prisma, service } = createDependencies();
    prisma.db.membership.findMany.mockResolvedValue([member]);
    prisma.db.membership.count.mockResolvedValue(2);
    prisma.db.professional.findMany.mockResolvedValue([
      {
        userId: MEMBER_USER_ID,
        name: 'Ana Pública',
        status: ProfessionalStatus.ACTIVE,
      },
    ]);

    const result = await service.findTeamMembers(ORGANIZATION_ID, {
      page: 2,
      limit: 1,
    });

    expect(prisma.db.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: ORGANIZATION_ID,
          role: {
            in: [
              UserRole.OWNER,
              UserRole.ADMIN,
              UserRole.BARBER,
              UserRole.RECEPTIONIST,
            ],
          },
        },
        skip: 1,
        take: 1,
      }),
    );
    expect(prisma.db.professional.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: ORGANIZATION_ID,
        userId: { in: [MEMBER_USER_ID] },
      },
      select: { userId: true, name: true, status: true },
    });
    expect(result).toEqual({
      items: [
        {
          name: 'Ana Barber',
          email: 'ana@example.com',
          role: UserRole.BARBER,
          accessStatus: 'ACTIVE',
          professional: {
            name: 'Ana Pública',
            status: ProfessionalStatus.ACTIVE,
          },
        },
      ],
      page: 2,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /membershipId|organizationId|userId|clerkUserId|password|phone/i,
    );
  });

  it('changes a non-owner role atomically and audits without PII', async () => {
    const { prisma, audit, service } = createDependencies();
    prisma.db.membership.findUnique.mockResolvedValue({ role: UserRole.OWNER });
    prisma.db.membership.findFirst.mockResolvedValue(member);
    prisma.db.membership.update.mockResolvedValue({
      ...member,
      role: UserRole.ADMIN,
    });
    prisma.db.professional.findFirst.mockResolvedValue(null);

    await expect(
      service.updateTeamMemberRole(ORGANIZATION_ID, OWNER_ID, {
        email: '  ANA@EXAMPLE.COM ',
        role: UserRole.ADMIN,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        email: 'ana@example.com',
        role: UserRole.ADMIN,
      }),
    );

    expect(prisma.db.membership.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: ORGANIZATION_ID,
        role: {
          in: [
            UserRole.OWNER,
            UserRole.ADMIN,
            UserRole.BARBER,
            UserRole.RECEPTIONIST,
          ],
        },
        user: { email: 'ana@example.com' },
      },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    });
    expect(audit.logTransactional).toHaveBeenCalledWith(
      {
        organizationId: ORGANIZATION_ID,
        userId: OWNER_ID,
        action: 'UPDATE_ROLE',
        entity: 'Membership',
        entityId: MEMBER_ID,
      },
      prisma.db,
    );
    expect(JSON.stringify(audit.logTransactional.mock.calls)).not.toContain(
      'ana@example.com',
    );
  });

  it('keeps an identical role change idempotent and does not duplicate audit', async () => {
    const { prisma, audit, service } = createDependencies();
    prisma.db.membership.findUnique.mockResolvedValue({ role: UserRole.OWNER });
    prisma.db.membership.findFirst.mockResolvedValue(member);
    prisma.db.professional.findFirst.mockResolvedValue(null);

    await service.updateTeamMemberRole(ORGANIZATION_ID, OWNER_ID, {
      email: member.user.email,
      role: UserRole.BARBER,
    });

    expect(prisma.db.membership.update).not.toHaveBeenCalled();
    expect(audit.logTransactional).not.toHaveBeenCalled();
  });

  it('prevents ADMIN from changing an OWNER', async () => {
    const { prisma, service } = createDependencies();
    prisma.db.membership.findUnique.mockResolvedValue({ role: UserRole.ADMIN });
    prisma.db.membership.findFirst.mockResolvedValue({
      ...member,
      role: UserRole.OWNER,
    });

    await expect(
      service.updateTeamMemberRole(ORGANIZATION_ID, OWNER_ID, {
        email: member.user.email,
        role: UserRole.ADMIN,
      }),
    ).rejects.toThrow('No tienes permiso para modificar este acceso');
    expect(prisma.db.membership.update).not.toHaveBeenCalled();
  });

  it('prevents demoting or revoking the last OWNER', async () => {
    const { prisma, service } = createDependencies();
    prisma.db.membership.findUnique.mockResolvedValue({ role: UserRole.OWNER });
    prisma.db.membership.findFirst.mockResolvedValue({
      ...member,
      role: UserRole.OWNER,
    });
    prisma.db.membership.count.mockResolvedValue(1);

    await expect(
      service.updateTeamMemberRole(ORGANIZATION_ID, OWNER_ID, {
        email: member.user.email,
        role: UserRole.ADMIN,
      }),
    ).rejects.toThrow('al menos un OWNER');
    await expect(
      service.revokeTeamMemberAccess(ORGANIZATION_ID, OWNER_ID, {
        email: member.user.email,
      }),
    ).rejects.toThrow('al menos un OWNER');
    expect(prisma.db.membership.update).not.toHaveBeenCalled();
    expect(prisma.db.membership.delete).not.toHaveBeenCalled();
  });

  it('revokes access idempotently without mutating the Professional relation', async () => {
    const { prisma, audit, service } = createDependencies();
    prisma.db.membership.findUnique.mockResolvedValue({ role: UserRole.OWNER });
    prisma.db.membership.findFirst
      .mockResolvedValueOnce(member)
      .mockResolvedValueOnce(null);
    prisma.db.membership.delete.mockResolvedValue(member);

    await service.revokeTeamMemberAccess(ORGANIZATION_ID, OWNER_ID, {
      email: member.user.email,
    });
    await service.revokeTeamMemberAccess(ORGANIZATION_ID, OWNER_ID, {
      email: member.user.email,
    });

    expect(prisma.db.membership.delete).toHaveBeenCalledTimes(1);
    expect(audit.logTransactional).toHaveBeenCalledTimes(1);
    expect(prisma.db.professional.findMany).not.toHaveBeenCalled();
    expect(prisma.db.professional.findFirst).not.toHaveBeenCalled();
  });
});
