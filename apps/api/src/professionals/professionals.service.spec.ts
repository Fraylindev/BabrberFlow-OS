import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  Prisma,
  ProfessionalStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ProfessionalsService } from './professionals.service';

const ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
const ACTOR_ID = '00000000-0000-4000-8000-000000000002';
const PROFESSIONAL_ID = '00000000-0000-4000-8000-000000000003';
const BARBER_ID = '00000000-0000-4000-8000-000000000004';
const CREATED_AT = new Date('2026-08-12T00:00:00.000Z');

const MANAGEMENT_RECORD = {
  id: PROFESSIONAL_ID,
  name: 'Ana',
  bio: 'Especialista',
  phone: '+18095550101',
  avatar: 'https://example.com/ana.jpg',
  specialty: 'Fade',
  experienceYears: 5,
  status: ProfessionalStatus.ACTIVE,
  isPublic: true,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  user: null,
};

function createDependencies() {
  const db = {
    $queryRaw: jest.fn().mockResolvedValue([
      {
        id: PROFESSIONAL_ID,
        status: ProfessionalStatus.ACTIVE,
        isPublic: true,
      },
    ]),
    professional: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    booking: { count: jest.fn() },
    membership: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  db.$transaction.mockImplementation(
    (callback: (transaction: typeof db) => Promise<unknown>) => callback(db),
  );
  const prisma = {
    db,
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new ProfessionalsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );
  return { prisma, audit, service };
}

describe('ProfessionalsService', () => {
  let dependencies: ReturnType<typeof createDependencies>;

  beforeEach(() => {
    dependencies = createDependencies();
    dependencies.prisma.db.professional.findFirst.mockResolvedValue(
      MANAGEMENT_RECORD,
    );
    dependencies.prisma.db.professional.findUnique.mockResolvedValue(
      MANAGEMENT_RECORD,
    );
    dependencies.prisma.db.professional.update.mockResolvedValue(
      MANAGEMENT_RECORD,
    );
    dependencies.prisma.db.booking.count.mockResolvedValue(0);
  });

  it('creates an INACTIVE and private professional with normalized fields', async () => {
    dependencies.prisma.db.professional.create.mockResolvedValue({
      ...MANAGEMENT_RECORD,
      name: 'Ana Pérez',
      bio: null,
      phone: '+1 809 555 0101',
      status: ProfessionalStatus.INACTIVE,
      isPublic: false,
    });

    const result = await dependencies.service.create(
      ORGANIZATION_ID,
      ACTOR_ID,
      {
        name: '  Ana Pérez  ',
        bio: '   ',
        phone: '  +1 809 555 0101  ',
      },
    );

    const createMock = dependencies.prisma.db.professional.create as jest.Mock<
      unknown,
      [
        {
          data: {
            organizationId: string;
            name: string;
            bio: string | null;
            phone: string | null;
          };
        },
      ]
    >;
    const createArgs = createMock.mock.calls[0][0];
    expect(createArgs.data.organizationId).toBe(ORGANIZATION_ID);
    expect(createArgs.data.name).toBe('Ana Pérez');
    expect(createArgs.data.bio).toBeNull();
    expect(createArgs.data.phone).toBe('+1 809 555 0101');
    expect(result).not.toHaveProperty('organizationId');
    expect(result).not.toHaveProperty('userId');
    expect(dependencies.audit.log).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      userId: ACTOR_ID,
      action: 'CREATE',
      entity: 'Professional',
      entityId: PROFESSIONAL_ID,
    });
  });

  it('lists with tenant, search, state, stable order and pagination', async () => {
    dependencies.prisma.db.professional.count.mockResolvedValue(21);
    dependencies.prisma.db.professional.findMany.mockResolvedValue([
      MANAGEMENT_RECORD,
    ]);

    const result = await dependencies.service.findAll(
      ORGANIZATION_ID,
      {
        search: ' Ana ',
        status: ProfessionalStatus.ACTIVE,
        page: '2',
        limit: '20',
      },
      true,
    );

    const findManyMock = dependencies.prisma.db.professional
      .findMany as jest.Mock<
      unknown,
      [
        {
          where: { organizationId: string; status: ProfessionalStatus };
          orderBy: { name?: string; id?: string }[];
          skip: number;
          take: number;
        },
      ]
    >;
    const listArgs = findManyMock.mock.calls[0][0];
    expect(listArgs.where.organizationId).toBe(ORGANIZATION_ID);
    expect(listArgs.where.status).toBe(ProfessionalStatus.ACTIVE);
    expect(listArgs.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
    expect(listArgs.skip).toBe(20);
    expect(listArgs.take).toBe(20);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 21,
      totalPages: 2,
    });
  });

  it('excludes archived professionals by default and limits directory PII', async () => {
    dependencies.prisma.db.professional.count.mockResolvedValue(1);
    dependencies.prisma.db.professional.findMany.mockResolvedValue([
      {
        id: PROFESSIONAL_ID,
        name: 'Ana',
        avatar: null,
        specialty: 'Fade',
        status: ProfessionalStatus.ACTIVE,
      },
    ]);

    const result = await dependencies.service.findAll(
      ORGANIZATION_ID,
      {},
      false,
    );

    expect(dependencies.prisma.db.professional.count).toHaveBeenCalledWith({
      where: {
        organizationId: ORGANIZATION_ID,
        status: { not: ProfessionalStatus.ARCHIVED },
      },
    });
    expect(result.data[0]).not.toHaveProperty('phone');
    expect(result.data[0]).not.toHaveProperty('bio');
    expect(result.data[0]).not.toHaveProperty('linkedUser');
  });

  it('never exposes archived professionals to BARBER/RECEPTIONIST directory', async () => {
    const result = await dependencies.service.findAll(
      ORGANIZATION_ID,
      { status: ProfessionalStatus.ARCHIVED },
      false,
    );

    expect(result).toEqual({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    expect(dependencies.prisma.db.professional.count).not.toHaveBeenCalled();
    expect(dependencies.prisma.db.professional.findMany).not.toHaveBeenCalled();
  });

  it('returns the same 404 for absent or foreign-tenant detail', async () => {
    dependencies.prisma.db.professional.findFirst.mockResolvedValue(null);

    await expect(
      dependencies.service.findOne(PROFESSIONAL_ID, ORGANIZATION_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(dependencies.prisma.db.professional.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PROFESSIONAL_ID, organizationId: ORGANIZATION_ID },
      }),
    );
  });

  it('hides archived links from BARBER operational agenda/client resolution', async () => {
    dependencies.prisma.db.professional.findFirst.mockResolvedValue(null);

    await expect(
      dependencies.service.findByUserId(BARBER_ID, ORGANIZATION_ID),
    ).resolves.toBeNull();
    expect(dependencies.prisma.db.professional.findFirst).toHaveBeenCalledWith({
      where: {
        userId: BARBER_ID,
        organizationId: ORGANIZATION_ID,
        status: { not: ProfessionalStatus.ARCHIVED },
      },
      select: { id: true, status: true },
    });
  });

  it('rejects an empty management PATCH', async () => {
    await expect(
      dependencies.service.update(
        PROFESSIONAL_ID,
        ORGANIZATION_ID,
        ACTOR_ID,
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dependencies.prisma.db.professional.update).not.toHaveBeenCalled();
  });

  it('updates with organizationId in the authoritative mutation and audits no PII', async () => {
    await dependencies.service.update(
      PROFESSIONAL_ID,
      ORGANIZATION_ID,
      ACTOR_ID,
      { name: '  Nuevo nombre  ' },
    );

    expect(dependencies.prisma.db.professional.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PROFESSIONAL_ID, organizationId: ORGANIZATION_ID },
        data: { name: 'Nuevo nombre' },
      }),
    );
    expect(dependencies.audit.log).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      userId: ACTOR_ID,
      action: 'UPDATE',
      entity: 'Professional',
      entityId: PROFESSIONAL_ID,
    });
  });

  it('updates own public profile and private phone with authoritative tenant/identity and no PII audit', async () => {
    const ownRecord = {
      id: PROFESSIONAL_ID,
      name: 'Ana',
      bio: 'Bio',
      phone: '+18095550101',
      avatar: null,
      specialty: 'Fade',
      experienceYears: 5,
      status: ProfessionalStatus.ACTIVE,
      isPublic: true,
    };
    dependencies.prisma.db.professional.findFirst.mockResolvedValue({
      id: PROFESSIONAL_ID,
    });
    dependencies.prisma.db.professional.update.mockResolvedValue(ownRecord);

    const result = await dependencies.service.updateMe(
      BARBER_ID,
      ORGANIZATION_ID,
      {
        name: '  Ana  ',
        bio: '  Bio  ',
        phone: '  +18095550101  ',
        avatar: null,
        specialty: '  Fade  ',
        experienceYears: 5,
      },
    );

    expect(dependencies.prisma.db.professional.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_userId: {
            organizationId: ORGANIZATION_ID,
            userId: BARBER_ID,
          },
        },
        data: {
          name: 'Ana',
          bio: 'Bio',
          phone: '+18095550101',
          avatar: null,
          specialty: 'Fade',
          experienceYears: 5,
        },
      }),
    );
    expect(result.phone).toBe('+18095550101');
    expect(result).not.toHaveProperty('linkedUser');
    expect(dependencies.audit.log).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      userId: BARBER_ID,
      action: 'UPDATE',
      entity: 'Professional',
      entityId: PROFESSIONAL_ID,
    });
  });

  it('rejects an empty own PATCH before accessing persistence', async () => {
    await expect(
      dependencies.service.updateMe(BARBER_ID, ORGANIZATION_ID, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dependencies.prisma.db.professional.update).not.toHaveBeenCalled();
  });

  it('blocks archive while future PENDING or CONFIRMED bookings exist', async () => {
    dependencies.prisma.db.booking.count.mockResolvedValue(1);

    await expect(
      dependencies.service.archive(PROFESSIONAL_ID, ORGANIZATION_ID, ACTOR_ID),
    ).rejects.toBeInstanceOf(ConflictException);
    const bookingCountMock = dependencies.prisma.db.booking.count as jest.Mock<
      unknown,
      [
        {
          where: {
            organizationId: string;
            professionalId: string;
            startTime: { gt: Date };
            status: { in: BookingStatus[] };
          };
        },
      ]
    >;
    const bookingCountArgs = bookingCountMock.mock.calls[0][0];
    expect(bookingCountArgs.where.organizationId).toBe(ORGANIZATION_ID);
    expect(bookingCountArgs.where.professionalId).toBe(PROFESSIONAL_ID);
    expect(bookingCountArgs.where.startTime.gt).toBeInstanceOf(Date);
    expect(bookingCountArgs.where.status.in).toEqual([
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
    ]);
    expect(dependencies.prisma.db.professional.update).not.toHaveBeenCalled();
  });

  it('archives without hard-delete and restores to INACTIVE', async () => {
    dependencies.prisma.db.professional.update
      .mockResolvedValueOnce({
        ...MANAGEMENT_RECORD,
        status: ProfessionalStatus.ARCHIVED,
      })
      .mockResolvedValueOnce({
        ...MANAGEMENT_RECORD,
        status: ProfessionalStatus.INACTIVE,
      });

    await dependencies.service.archive(
      PROFESSIONAL_ID,
      ORGANIZATION_ID,
      ACTOR_ID,
    );
    dependencies.prisma.db.professional.findFirst.mockResolvedValue({
      ...MANAGEMENT_RECORD,
      status: ProfessionalStatus.ARCHIVED,
    });
    await dependencies.service.restore(
      PROFESSIONAL_ID,
      ORGANIZATION_ID,
      ACTOR_ID,
    );

    expect(dependencies.prisma.db.professional.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: PROFESSIONAL_ID, organizationId: ORGANIZATION_ID },
        data: { status: ProfessionalStatus.ARCHIVED },
      }),
    );
    expect(dependencies.prisma.db.professional.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: PROFESSIONAL_ID, organizationId: ORGANIZATION_ID },
        data: { status: ProfessionalStatus.INACTIVE },
      }),
    );
    expect(dependencies.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ARCHIVE' }),
    );
    expect(dependencies.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESTORE' }),
    );
  });

  it('changes ACTIVE/INACTIVE state and public visibility independently', async () => {
    dependencies.prisma.db.professional.update
      .mockResolvedValueOnce({
        ...MANAGEMENT_RECORD,
        status: ProfessionalStatus.INACTIVE,
      })
      .mockResolvedValueOnce({ ...MANAGEMENT_RECORD, isPublic: false });

    await dependencies.service.updateStatus(
      PROFESSIONAL_ID,
      ORGANIZATION_ID,
      ACTOR_ID,
      ProfessionalStatus.INACTIVE,
    );
    await dependencies.service.updateVisibility(
      PROFESSIONAL_ID,
      ORGANIZATION_ID,
      ACTOR_ID,
      false,
    );

    expect(dependencies.prisma.db.professional.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: PROFESSIONAL_ID, organizationId: ORGANIZATION_ID },
        data: { status: ProfessionalStatus.INACTIVE },
      }),
    );
    expect(dependencies.prisma.db.professional.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: PROFESSIONAL_ID, organizationId: ORGANIZATION_ID },
        data: { isPublic: false },
      }),
    );
    expect(dependencies.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'STATUS_CHANGE' }),
    );
  });

  it('does not allow direct state changes while archived', async () => {
    dependencies.prisma.db.professional.findFirst.mockResolvedValue({
      ...MANAGEMENT_RECORD,
      status: ProfessionalStatus.ARCHIVED,
    });

    await expect(
      dependencies.service.updateStatus(
        PROFESSIONAL_ID,
        ORGANIZATION_ID,
        ACTOR_ID,
        ProfessionalStatus.ACTIVE,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dependencies.prisma.db.professional.update).not.toHaveBeenCalled();
  });

  it('links only a BARBER Membership from the same organization', async () => {
    dependencies.prisma.db.membership.findFirst.mockResolvedValue({
      id: 'membership-id',
    });
    dependencies.prisma.db.professional.findFirst
      .mockResolvedValueOnce(MANAGEMENT_RECORD)
      .mockResolvedValueOnce(null);
    dependencies.prisma.db.professional.update.mockResolvedValue({
      ...MANAGEMENT_RECORD,
      user: {
        id: BARBER_ID,
        name: 'Ana',
        email: 'ana@example.com',
      },
    });

    await dependencies.service.linkUser(
      PROFESSIONAL_ID,
      ORGANIZATION_ID,
      ACTOR_ID,
      ` ${BARBER_ID} `,
    );

    expect(dependencies.prisma.db.membership.findFirst).toHaveBeenCalledWith({
      where: {
        userId: BARBER_ID,
        organizationId: ORGANIZATION_ID,
        role: UserRole.BARBER,
      },
      select: { id: true },
    });
    expect(dependencies.prisma.db.professional.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PROFESSIONAL_ID, organizationId: ORGANIZATION_ID },
        data: { userId: BARBER_ID },
      }),
    );
    expect(dependencies.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LINK' }),
    );
  });

  it('rejects linking a non-BARBER or foreign membership', async () => {
    dependencies.prisma.db.membership.findFirst.mockResolvedValue(null);

    await expect(
      dependencies.service.linkUser(
        PROFESSIONAL_ID,
        ORGANIZATION_ID,
        ACTOR_ID,
        BARBER_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dependencies.prisma.db.professional.update).not.toHaveBeenCalled();
  });

  it('unlinks the account with tenant scope and audit trail', async () => {
    dependencies.prisma.db.professional.findFirst.mockResolvedValue({
      ...MANAGEMENT_RECORD,
      user: {
        id: BARBER_ID,
        name: 'Ana',
        email: 'ana@example.com',
      },
    });
    dependencies.prisma.db.professional.update.mockResolvedValue(
      MANAGEMENT_RECORD,
    );

    await dependencies.service.unlinkUser(
      PROFESSIONAL_ID,
      ORGANIZATION_ID,
      ACTOR_ID,
    );

    expect(dependencies.prisma.db.professional.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PROFESSIONAL_ID, organizationId: ORGANIZATION_ID },
        data: { userId: null },
      }),
    );
    expect(dependencies.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UNLINK' }),
    );
  });

  it('rejects an account already linked in the same organization', async () => {
    dependencies.prisma.db.membership.findFirst.mockResolvedValue({
      id: 'membership-id',
    });
    dependencies.prisma.db.professional.findFirst
      .mockResolvedValueOnce(MANAGEMENT_RECORD)
      .mockResolvedValueOnce({ id: 'other-professional' });

    await expect(
      dependencies.service.linkUser(
        PROFESSIONAL_ID,
        ORGANIZATION_ID,
        ACTOR_ID,
        BARBER_ID,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('translates concurrent link unique errors to conflict', async () => {
    dependencies.prisma.db.membership.findFirst.mockResolvedValue({
      id: 'membership-id',
    });
    dependencies.prisma.db.professional.findFirst
      .mockResolvedValueOnce(MANAGEMENT_RECORD)
      .mockResolvedValueOnce(null);
    dependencies.prisma.db.professional.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.16.3',
        meta: { target: ['organizationId', 'userId'] },
      }),
    );

    await expect(
      dependencies.service.linkUser(
        PROFESSIONAL_ID,
        ORGANIZATION_ID,
        ACTOR_ID,
        BARBER_ID,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('translates a lost tenant-scoped update to the same 404', async () => {
    dependencies.prisma.db.professional.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '6.16.3',
      }),
    );

    await expect(
      dependencies.service.update(PROFESSIONAL_ID, ORGANIZATION_ID, ACTOR_ID, {
        specialty: 'Color',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
