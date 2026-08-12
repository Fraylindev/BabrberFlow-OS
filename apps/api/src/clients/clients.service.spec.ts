import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClientsService } from './clients.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  barberClientResponseSelect,
  clientResponseSelect,
} from './dto/client-response.dto';

const ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
const USER_ID = '00000000-0000-4000-8000-000000000002';
const CLIENT_ID = '00000000-0000-4000-8000-000000000003';
const NOW = new Date('2026-08-11T12:00:00.000Z');

const CLIENT = {
  id: CLIENT_ID,
  name: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '+18095551234',
  notes: 'Prefiere mensajes',
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

function createDependencies() {
  const prisma = {
    db: {
      client: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn<Promise<unknown[]>, [unknown]>(),
        findFirst: jest.fn<Promise<unknown>, [unknown]>(),
        update: jest.fn(),
      },
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  return { prisma, audit };
}

describe('ClientsService', () => {
  let dependencies: ReturnType<typeof createDependencies>;
  let service: ClientsService;

  beforeEach(() => {
    dependencies = createDependencies();
    service = new ClientsService(
      dependencies.prisma as unknown as PrismaService,
      dependencies.audit as unknown as AuditService,
    );
  });

  it('normalizes create input and audits without PII', async () => {
    dependencies.prisma.db.client.findFirst.mockResolvedValue(null);
    dependencies.prisma.db.client.create.mockResolvedValue(CLIENT);

    await service.create(ORGANIZATION_ID, USER_ID, {
      name: '  Ana Pérez  ',
      email: ' ANA@EXAMPLE.COM ',
      phone: ' +1 (809) 555-1234 ',
      notes: '  Prefiere mensajes  ',
    });

    expect(dependencies.prisma.db.client.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORGANIZATION_ID,
        name: 'Ana Pérez',
        email: 'ana@example.com',
        phone: '+18095551234',
        notes: 'Prefiere mensajes',
      },
      select: clientResponseSelect,
    });
    expect(dependencies.audit.log).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      action: 'CREATE',
      entity: 'Client',
      entityId: CLIENT_ID,
    });
  });

  it('rejects normalized duplicate email or phone', async () => {
    dependencies.prisma.db.client.findFirst.mockResolvedValue({
      id: CLIENT_ID,
    });

    await expect(
      service.create(ORGANIZATION_ID, USER_ID, {
        name: 'Otra persona',
        email: ' ANA@EXAMPLE.COM ',
        phone: '(809) 555-1234',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(dependencies.prisma.db.client.create).not.toHaveBeenCalled();
  });

  it('translates Prisma P2002 into conflict', async () => {
    dependencies.prisma.db.client.findFirst.mockResolvedValue(null);
    dependencies.prisma.db.client.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['organizationId', 'email'] },
      }),
    );

    await expect(
      service.create(ORGANIZATION_ID, USER_ID, {
        name: 'Ana',
        email: 'ana@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists active clients by default with stable pagination and search', async () => {
    dependencies.prisma.db.client.count.mockResolvedValue(21);
    dependencies.prisma.db.client.findMany.mockResolvedValue([CLIENT]);

    const result = await service.findAll(ORGANIZATION_ID, {
      search: ' ANA ',
      page: '2',
    });

    expect(result.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 21,
      totalPages: 2,
    });
    const listArgs = dependencies.prisma.db.client.findMany.mock
      .calls[0][0] as {
      where: { organizationId: string; isActive: boolean; OR: unknown[] };
      orderBy: { name?: string; id?: string }[];
      skip: number;
      take: number;
    };
    expect(listArgs.where.organizationId).toBe(ORGANIZATION_ID);
    expect(listArgs.where.isActive).toBe(true);
    expect(listArgs.where.OR).toHaveLength(3);
    expect(listArgs.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
    expect(listArgs.skip).toBe(20);
    expect(listArgs.take).toBe(20);
  });

  it('caps page size at 100 and supports inactive filter', async () => {
    dependencies.prisma.db.client.count.mockResolvedValue(0);
    dependencies.prisma.db.client.findMany.mockResolvedValue([]);

    const result = await service.findAll(ORGANIZATION_ID, {
      isActive: 'false',
      limit: '500',
    });

    expect(result.pagination.limit).toBe(100);
    const listArgs = dependencies.prisma.db.client.findMany.mock
      .calls[0][0] as {
      where: { isActive: boolean };
      take: number;
    };
    expect(listArgs.where.isActive).toBe(false);
    expect(listArgs.take).toBe(100);
  });

  it('limits BARBER to linked bookings and excludes notes from projection', async () => {
    dependencies.prisma.db.client.count.mockResolvedValue(1);
    dependencies.prisma.db.client.findMany.mockResolvedValue([
      {
        id: CLIENT.id,
        name: CLIENT.name,
        email: CLIENT.email,
        phone: CLIENT.phone,
        isActive: true,
      },
    ]);

    const result = await service.findAll(
      ORGANIZATION_ID,
      {},
      '00000000-0000-4000-8000-000000000004',
    );

    expect(result.data[0]).not.toHaveProperty('notes');
    const barberArgs = dependencies.prisma.db.client.findMany.mock
      .calls[0][0] as {
      where: {
        bookings: {
          some: { organizationId: string; professionalId: string };
        };
      };
      select: Record<string, boolean>;
    };
    expect(barberArgs.where.bookings.some).toEqual({
      organizationId: ORGANIZATION_ID,
      professionalId: '00000000-0000-4000-8000-000000000004',
    });
    expect(barberArgs.select).toEqual(barberClientResponseSelect);
    expect(barberArgs.select).not.toHaveProperty('notes');
  });

  it('uses tenant and agenda in BARBER detail and returns 404 when absent', async () => {
    dependencies.prisma.db.client.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne(CLIENT_ID, ORGANIZATION_ID, 'professional-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    const detailArgs = dependencies.prisma.db.client.findFirst.mock
      .calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(detailArgs.where).toEqual({
      id: CLIENT_ID,
      organizationId: ORGANIZATION_ID,
      bookings: {
        some: {
          organizationId: ORGANIZATION_ID,
          professionalId: 'professional-id',
        },
      },
    });
  });

  it('rejects an empty PATCH', async () => {
    await expect(
      service.update(CLIENT_ID, ORGANIZATION_ID, USER_ID, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dependencies.prisma.db.client.update).not.toHaveBeenCalled();
  });

  it('updates with tenant in the authoritative mutation and audits', async () => {
    dependencies.prisma.db.client.findFirst
      .mockResolvedValueOnce(CLIENT)
      .mockResolvedValueOnce(null);
    dependencies.prisma.db.client.update.mockResolvedValue({
      ...CLIENT,
      email: 'new@example.com',
      notes: null,
    });

    await service.update(CLIENT_ID, ORGANIZATION_ID, USER_ID, {
      email: ' NEW@EXAMPLE.COM ',
      notes: '   ',
    });

    expect(dependencies.prisma.db.client.update).toHaveBeenCalledWith({
      where: { id: CLIENT_ID, organizationId: ORGANIZATION_ID },
      data: { email: 'new@example.com', notes: null },
      select: clientResponseSelect,
    });
    expect(dependencies.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', entityId: CLIENT_ID }),
    );
  });

  it('archives and restores without hard-delete', async () => {
    dependencies.prisma.db.client.findFirst.mockResolvedValueOnce(CLIENT);
    dependencies.prisma.db.client.update.mockResolvedValueOnce({
      ...CLIENT,
      isActive: false,
    });

    await service.archive(CLIENT_ID, ORGANIZATION_ID, USER_ID);

    dependencies.prisma.db.client.findFirst.mockResolvedValueOnce({
      ...CLIENT,
      isActive: false,
    });
    dependencies.prisma.db.client.update.mockResolvedValueOnce(CLIENT);
    await service.restore(CLIENT_ID, ORGANIZATION_ID, USER_ID);

    expect(dependencies.prisma.db.client.update).toHaveBeenNthCalledWith(1, {
      where: { id: CLIENT_ID, organizationId: ORGANIZATION_ID },
      data: { isActive: false },
      select: clientResponseSelect,
    });
    expect(dependencies.prisma.db.client.update).toHaveBeenNthCalledWith(2, {
      where: { id: CLIENT_ID, organizationId: ORGANIZATION_ID },
      data: { isActive: true },
      select: clientResponseSelect,
    });
    expect(dependencies.audit.log).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ action: 'ARCHIVE' }),
    );
    expect(dependencies.audit.log).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: 'RESTORE' }),
    );
  });

  it('maps a concurrent P2025 update to the same 404', async () => {
    dependencies.prisma.db.client.findFirst.mockResolvedValue(CLIENT);
    dependencies.prisma.db.client.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('missing', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.archive(CLIENT_ID, ORGANIZATION_ID, USER_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
