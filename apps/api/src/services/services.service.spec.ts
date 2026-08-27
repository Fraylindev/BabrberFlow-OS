import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ServicesService } from './services.service';

const ORGANIZATION_ID = 'organization-id';
const USER_ID = 'user-id';
const SERVICE_ID = 'service-id';

function createHarness() {
  const db = {
    service: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue({ id: SERVICE_ID }),
      update: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new ServicesService(
    { db } as unknown as PrismaService,
    audit as unknown as AuditService,
  );
  return { service, db, audit };
}

describe('ServicesService monetary invariants', () => {
  it('normaliza un precio válido a Decimal antes de persistir', async () => {
    const { service, db } = createHarness();
    db.service.create.mockResolvedValue({ id: SERVICE_ID });

    await service.create(ORGANIZATION_ID, {
      name: 'Corte QA',
      duration: 30,
      price: 125.5,
    });

    type CreateArgs = { data: { price: Prisma.Decimal } };
    const createCalls = db.service.create.mock.calls as unknown as Array<
      [CreateArgs]
    >;
    const args = createCalls[0]?.[0];
    expect(args?.data.price).toBeInstanceOf(Prisma.Decimal);
    expect(args?.data.price.toFixed(2)).toBe('125.50');
  });

  it.each([0, -1, 125.555, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza crear con precio inválido %s',
    async (price) => {
      const { service, db } = createHarness();
      await expect(
        service.create(ORGANIZATION_ID, {
          name: 'Corte QA',
          duration: 30,
          price,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.service.create).not.toHaveBeenCalled();
    },
  );

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

  it('persiste una edición válida como Decimal y conserva AuditLog', async () => {
    const { service, db, audit } = createHarness();
    db.service.update.mockResolvedValue({ id: SERVICE_ID });

    await service.update(SERVICE_ID, ORGANIZATION_ID, USER_ID, {
      price: 99.9,
    });

    type UpdateArgs = { data: { price: Prisma.Decimal } };
    const updateCalls = db.service.update.mock.calls as unknown as Array<
      [UpdateArgs]
    >;
    const args = updateCalls[0]?.[0];
    expect(args?.data.price.toFixed(2)).toBe('99.90');
    expect(audit.log).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      action: 'UPDATE',
      entity: 'Service',
      entityId: SERVICE_ID,
    });
  });
});
