import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceSort } from './dto/query-services.dto';
import { serviceResponseSelect } from './dto/service-response.dto';
import { ServicesService } from './services.service';

const ORGANIZATION_ID = 'organization-id';
const OTHER_ORGANIZATION_ID = 'other-organization-id';
const USER_ID = 'user-id';
const SERVICE_ID = 'service-id';

const ACTIVE_SERVICE = {
  id: SERVICE_ID,
  name: 'Corte QA',
  description: 'Descripción',
  duration: 30,
  price: new Prisma.Decimal('125.50'),
  isActive: true,
};

function createHarness() {
  const db = {
    service: {
      create: jest.fn().mockResolvedValue(ACTIVE_SERVICE),
      findFirst: jest.fn().mockResolvedValue(ACTIVE_SERVICE),
      update: jest.fn().mockResolvedValue(ACTIVE_SERVICE),
      findMany: jest.fn().mockResolvedValue([ACTIVE_SERVICE]),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const cache = { clear: jest.fn().mockResolvedValue(undefined) };
  const service = new ServicesService(
    { db } as unknown as PrismaService,
    audit as unknown as AuditService,
    cache as never,
  );
  return { service, db, audit, cache };
}

describe('ServicesService', () => {
  it('normaliza, proyecta y audita la creación', async () => {
    const { service, db, audit, cache } = createHarness();

    const result = await service.create(ORGANIZATION_ID, USER_ID, {
      name: '  Corte QA  ',
      description: '  Descripción  ',
      duration: 30,
      price: 125.5,
    });

    type CreateArgs = {
      data: { name: string; description: string; price: Prisma.Decimal };
      select: unknown;
    };
    const createCalls = db.service.create.mock.calls as unknown as Array<
      [CreateArgs]
    >;
    const createArgs = createCalls[0]?.[0];
    expect(createArgs.data).toEqual(
      expect.objectContaining({
        name: 'Corte QA',
        description: 'Descripción',
        organizationId: ORGANIZATION_ID,
      }),
    );
    expect(createArgs.data.price).toBeInstanceOf(Prisma.Decimal);
    expect(createArgs.data.price.toFixed(2)).toBe('125.50');
    expect(createArgs.select).toEqual(serviceResponseSelect);
    expect(result).toEqual({
      id: SERVICE_ID,
      name: 'Corte QA',
      description: 'Descripción',
      duration: 30,
      price: '125.50',
      isActive: true,
    });
    expect(audit.log).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      action: 'CREATE',
      entity: 'Service',
      entityId: SERVICE_ID,
    });
    expect(cache.clear).toHaveBeenCalledTimes(1);
  });

  it.each([0, -1, 125.555, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza crear con precio inválido %s',
    async (price) => {
      const { service, db, audit } = createHarness();
      await expect(
        service.create(ORGANIZATION_ID, USER_ID, {
          name: 'Corte QA',
          duration: 30,
          price,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.service.create).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    },
  );

  it.each([
    [{}, { organizationId: ORGANIZATION_ID }],
    [
      { isActive: 'true' as const },
      { organizationId: ORGANIZATION_ID, isActive: true },
    ],
    [
      { isActive: ' false ' as 'false' },
      { organizationId: ORGANIZATION_ID, isActive: false },
    ],
  ])(
    'lista por tenant con filtro opcional y orden estable',
    async (query, where) => {
      const { service, db } = createHarness();

      await service.findAll(ORGANIZATION_ID, query);

      expect(db.service.findMany).toHaveBeenCalledWith({
        where,
        select: serviceResponseSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });
    },
  );

  it.each([
    [ServiceSort.CREATED_DESC, [{ createdAt: 'desc' }, { id: 'asc' }]],
    [ServiceSort.CREATED_ASC, [{ createdAt: 'asc' }, { id: 'asc' }]],
    [ServiceSort.PRICE_ASC, [{ price: 'asc' }, { name: 'asc' }, { id: 'asc' }]],
    [
      ServiceSort.PRICE_DESC,
      [{ price: 'desc' }, { name: 'asc' }, { id: 'asc' }],
    ],
    [ServiceSort.NAME_ASC, [{ name: 'asc' }, { id: 'asc' }]],
  ] as const)(
    'aplica el orden estable %s en PostgreSQL',
    async (sort, orderBy) => {
      const { service, db } = createHarness();

      await service.findAll(ORGANIZATION_ID, { sort });

      expect(db.service.findMany).toHaveBeenCalledWith({
        where: { organizationId: ORGANIZATION_ID },
        select: serviceResponseSelect,
        orderBy,
      });
    },
  );

  it.each([
    [ServiceSort.BOOKINGS_DESC, ['high', 'tie-a', 'low']],
    [ServiceSort.BOOKINGS_ASC, ['low', 'high', 'tie-a']],
  ] as const)(
    'ordena por reservas no canceladas con desempate estable: %s',
    async (sort, expectedIds) => {
      const { service, db } = createHarness();
      db.service.findMany.mockResolvedValueOnce([
        { ...ACTIVE_SERVICE, id: 'low', name: 'C', _count: { bookings: 0 } },
        { ...ACTIVE_SERVICE, id: 'tie-a', name: 'B', _count: { bookings: 2 } },
        { ...ACTIVE_SERVICE, id: 'high', name: 'A', _count: { bookings: 2 } },
      ]);

      const result = await service.findAll(ORGANIZATION_ID, { sort });

      expect(result.map((item) => item.id)).toEqual(expectedIds);
      expect(result.every((item) => !('_count' in item))).toBe(true);
      expect(db.service.findMany).toHaveBeenCalledWith({
        where: { organizationId: ORGANIZATION_ID },
        select: {
          ...serviceResponseSelect,
          _count: {
            select: {
              bookings: { where: { status: { not: 'CANCELLED' } } },
            },
          },
        },
      });
    },
  );

  it('obtiene un servicio mediante una consulta tenant-scoped', async () => {
    const { service, db } = createHarness();

    await expect(service.findOne(SERVICE_ID, ORGANIZATION_ID)).resolves.toEqual(
      expect.objectContaining({ id: SERVICE_ID, price: '125.50' }),
    );
    expect(db.service.findFirst).toHaveBeenCalledWith({
      where: { id: SERVICE_ID, organizationId: ORGANIZATION_ID },
      select: serviceResponseSelect,
    });
  });

  it('oculta con 404 un servicio ausente o de otro tenant', async () => {
    const { service, db } = createHarness();
    db.service.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.findOne(SERVICE_ID, OTHER_ORGANIZATION_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([0, 125.555])(
    'rechaza editar con precio inválido %s sin escribir ni auditar',
    async (price) => {
      const { service, db, audit } = createHarness();
      await expect(
        service.update(SERVICE_ID, ORGANIZATION_ID, USER_ID, { price }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.service.update).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    },
  );

  it('rechaza una edición vacía', async () => {
    const { service, db, audit } = createHarness();

    await expect(
      service.update(SERVICE_ID, ORGANIZATION_ID, USER_ID, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.service.findFirst).not.toHaveBeenCalled();
    expect(db.service.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('normaliza y audita una edición tenant-scoped', async () => {
    const { service, db, audit, cache } = createHarness();

    await service.update(SERVICE_ID, ORGANIZATION_ID, USER_ID, {
      name: '  Corte actualizado  ',
      description: '  Nueva descripción  ',
      price: 99.9,
    });

    type UpdateArgs = {
      where: unknown;
      data: { name: string; description: string; price: Prisma.Decimal };
      select: unknown;
    };
    const updateCalls = db.service.update.mock.calls as unknown as Array<
      [UpdateArgs]
    >;
    const updateArgs = updateCalls[0]?.[0];
    expect(updateArgs.where).toEqual({
      id: SERVICE_ID,
      organizationId: ORGANIZATION_ID,
    });
    expect(updateArgs.data.name).toBe('Corte actualizado');
    expect(updateArgs.data.description).toBe('Nueva descripción');
    expect(updateArgs.data.price.toFixed(2)).toBe('99.90');
    expect(updateArgs.select).toEqual(serviceResponseSelect);
    expect(audit.log).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      action: 'UPDATE',
      entity: 'Service',
      entityId: SERVICE_ID,
    });
    expect(cache.clear).toHaveBeenCalledTimes(1);
  });

  it('desactiva sin borrar y audita solo el cambio real', async () => {
    const { service, db, audit, cache } = createHarness();
    db.service.update.mockResolvedValueOnce({
      ...ACTIVE_SERVICE,
      isActive: false,
    });

    await expect(
      service.deactivate(SERVICE_ID, ORGANIZATION_ID, USER_ID),
    ).resolves.toEqual(expect.objectContaining({ isActive: false }));
    expect(db.service.update).toHaveBeenCalledWith({
      where: { id: SERVICE_ID, organizationId: ORGANIZATION_ID },
      data: { isActive: false },
      select: serviceResponseSelect,
    });
    expect(audit.log).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      action: 'DEACTIVATE',
      entity: 'Service',
      entityId: SERVICE_ID,
    });
    expect(cache.clear).toHaveBeenCalledTimes(1);
  });

  it('hace la desactivación idempotente sin auditoría duplicada', async () => {
    const { service, db, audit, cache } = createHarness();
    db.service.findFirst.mockResolvedValueOnce({
      ...ACTIVE_SERVICE,
      isActive: false,
    });

    await service.deactivate(SERVICE_ID, ORGANIZATION_ID, USER_ID);

    expect(db.service.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
    expect(cache.clear).not.toHaveBeenCalled();
  });

  it('reactiva mediante una transición explícita y auditada', async () => {
    const { service, db, audit, cache } = createHarness();
    db.service.findFirst.mockResolvedValueOnce({
      ...ACTIVE_SERVICE,
      isActive: false,
    });

    await service.reactivate(SERVICE_ID, ORGANIZATION_ID, USER_ID);

    expect(db.service.update).toHaveBeenCalledWith({
      where: { id: SERVICE_ID, organizationId: ORGANIZATION_ID },
      data: { isActive: true },
      select: serviceResponseSelect,
    });
    expect(audit.log).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      action: 'REACTIVATE',
      entity: 'Service',
      entityId: SERVICE_ID,
    });
    expect(cache.clear).toHaveBeenCalledTimes(1);
  });
});
