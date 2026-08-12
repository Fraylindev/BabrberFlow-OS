import { UserRole } from '@prisma/client';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../prisma/prisma.service';

const ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
const USER_ID = '00000000-0000-4000-8000-000000000002';

function createDependencies() {
  const prisma = {
    db: {
      membership: { findMany: jest.fn() },
      professional: { findMany: jest.fn() },
    },
  };
  return {
    prisma,
    service: new OrganizationsService(prisma as unknown as PrismaService),
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
        isActive: true,
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
        isActive: true,
      },
    });
    expect(result[0].user.professional).toEqual({
      id: 'professional-id',
      name: 'Public name',
      bio: 'Bio',
      avatar: 'https://example.com/avatar.jpg',
      specialty: 'Fades',
      experienceYears: 4,
      isActive: true,
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
