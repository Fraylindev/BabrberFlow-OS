import { ProfessionalStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TeamService } from './team.service';

const ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
const ACTOR_ID = '00000000-0000-4000-8000-000000000002';
const EXISTING_USER = {
  id: '00000000-0000-4000-8000-000000000003',
  name: 'Ana',
  email: 'ana@example.com',
  password: 'hash',
  lastOrganizationId: null,
  createdAt: new Date('2026-08-12T00:00:00.000Z'),
  updatedAt: new Date('2026-08-12T00:00:00.000Z'),
};

function createDependencies() {
  const db = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn().mockResolvedValue(EXISTING_USER),
    },
    membership: { create: jest.fn().mockResolvedValue({ id: 'member-id' }) },
    professional: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  db.$transaction.mockImplementation(
    (callback: (transaction: typeof db) => Promise<unknown>) => callback(db),
  );
  const prisma = {
    db,
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  return {
    prisma,
    audit,
    service: new TeamService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    ),
  };
}

describe('TeamService - optional public professional creation', () => {
  it('creates an ACTIVE published profile only for an invited BARBER', async () => {
    const { prisma, audit, service } = createDependencies();
    prisma.db.user.findUnique.mockResolvedValue(EXISTING_USER);
    prisma.db.professional.create.mockResolvedValue({
      id: 'professional-id',
    });

    const result = await service.inviteUser(ORGANIZATION_ID, ACTOR_ID, {
      name: '  Ana Pública  ',
      email: EXISTING_USER.email,
      password: 'Password123!',
      role: UserRole.BARBER,
      createPublicProfile: true,
    });

    expect(prisma.db.professional.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORGANIZATION_ID,
        name: 'Ana Pública',
        userId: EXISTING_USER.id,
        status: ProfessionalStatus.ACTIVE,
        isPublic: true,
      },
      select: { id: true },
    });
    expect(result.professionalCreated).toBe(true);
    expect(audit.log).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      userId: ACTOR_ID,
      action: 'CREATE',
      entity: 'Professional',
      entityId: 'professional-id',
    });
  });

  it.each([UserRole.ADMIN, UserRole.RECEPTIONIST])(
    'ignores createPublicProfile for %s',
    async (role) => {
      const { prisma, service } = createDependencies();
      prisma.db.user.findUnique.mockResolvedValue(EXISTING_USER);

      const result = await service.inviteUser(ORGANIZATION_ID, ACTOR_ID, {
        name: 'Ana',
        email: EXISTING_USER.email,
        password: 'Password123!',
        role,
        createPublicProfile: true,
      });

      expect(prisma.db.professional.create).not.toHaveBeenCalled();
      expect(result.professionalCreated).toBe(false);
    },
  );

  it('keeps Membership and automatic Professional in one transaction for existing User', async () => {
    const { prisma, audit, service } = createDependencies();
    prisma.db.user.findUnique.mockResolvedValue(EXISTING_USER);
    prisma.db.professional.create.mockRejectedValue(
      new Error('unexpected profile failure'),
    );

    await expect(
      service.inviteUser(ORGANIZATION_ID, ACTOR_ID, {
        name: 'Ana',
        email: EXISTING_USER.email,
        password: 'Password123!',
        role: UserRole.BARBER,
        createPublicProfile: true,
      }),
    ).rejects.toThrow('unexpected profile failure');

    expect(prisma.db.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.db.membership.create).toHaveBeenCalled();
    expect(prisma.db.professional.create).toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});
