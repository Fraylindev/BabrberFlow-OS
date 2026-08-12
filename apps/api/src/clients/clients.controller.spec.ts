import { ParseUUIDPipe } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/authenticated-request';

const USER: RequestUser = {
  id: '00000000-0000-4000-8000-000000000001',
  organizationId: '00000000-0000-4000-8000-000000000002',
  email: 'owner@example.com',
  name: 'Owner',
  role: UserRole.OWNER,
};

function createController() {
  const clients = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
  };
  const professionals = { findByUserId: jest.fn() };
  return {
    clients,
    professionals,
    controller: new ClientsController(
      clients as unknown as ClientsService,
      professionals as unknown as ProfessionalsService,
    ),
  };
}

describe('ClientsController', () => {
  it('allows only B2B roles at controller level', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      ClientsController,
    ) as UserRole[];
    expect(roles).toEqual([
      UserRole.OWNER,
      UserRole.ADMIN,
      UserRole.BARBER,
      UserRole.RECEPTIONIST,
    ]);
    expect(roles).not.toContain(UserRole.CUSTOMER);
  });

  it.each(['create', 'update', 'archive', 'restore'] as const)(
    'restricts %s to management roles',
    (method) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        ClientsController.prototype,
        method,
      ) as TypedPropertyDescriptor<(...args: unknown[]) => unknown>;
      if (!descriptor.value) throw new Error(`Missing method ${method}`);
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        descriptor.value,
      ) as UserRole[];
      expect(roles).toEqual([
        UserRole.OWNER,
        UserRole.ADMIN,
        UserRole.RECEPTIONIST,
      ]);
      expect(roles).not.toContain(UserRole.BARBER);
    },
  );

  it('passes actor and tenant to create', async () => {
    const { controller, clients } = createController();
    clients.create.mockResolvedValue({ id: 'client-id' });

    await controller.create(USER, { name: 'Ana' });

    expect(clients.create).toHaveBeenCalledWith(USER.organizationId, USER.id, {
      name: 'Ana',
    });
  });

  it('returns an array and writes pagination headers', async () => {
    const { controller, clients } = createController();
    clients.findAll.mockResolvedValue({
      data: [{ id: 'client-id' }],
      pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
    });
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;

    const result = await controller.findAll(USER, { page: '2' }, response);

    expect(result).toEqual([{ id: 'client-id' }]);
    expect(setHeader).toHaveBeenCalledWith('X-Total-Count', 21);
    expect(setHeader).toHaveBeenCalledWith('X-Page', 2);
    expect(setHeader).toHaveBeenCalledWith('X-Limit', 20);
    expect(setHeader).toHaveBeenCalledWith('X-Total-Pages', 2);
  });

  it('scopes BARBER list and detail to the professional in the same tenant', async () => {
    const { controller, clients, professionals } = createController();
    const barber = { ...USER, role: UserRole.BARBER };
    professionals.findByUserId.mockResolvedValue({ id: 'professional-id' });
    clients.findAll.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    clients.findOne.mockResolvedValue({ id: 'client-id' });
    const response = { setHeader: jest.fn() } as unknown as Response;

    await controller.findAll(barber, {}, response);
    await controller.findOne('client-id', barber);

    expect(professionals.findByUserId).toHaveBeenCalledWith(
      barber.id,
      barber.organizationId,
    );
    expect(clients.findAll).toHaveBeenCalledWith(
      barber.organizationId,
      {},
      'professional-id',
    );
    expect(clients.findOne).toHaveBeenCalledWith(
      'client-id',
      barber.organizationId,
      'professional-id',
    );
  });

  it('uses an unmatchable scope for a BARBER without Professional link', async () => {
    const { controller, clients, professionals } = createController();
    const barber = { ...USER, role: UserRole.BARBER };
    professionals.findByUserId.mockResolvedValue(null);
    clients.findAll.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    const response = { setHeader: jest.fn() } as unknown as Response;

    await controller.findAll(barber, {}, response);

    expect(clients.findAll).toHaveBeenCalledWith(
      barber.organizationId,
      {},
      '__unlinked_barber__',
    );
  });

  it('rejects non-UUID route IDs through the configured pipe behavior', async () => {
    const pipe = new ParseUUIDPipe();
    await expect(
      pipe.transform('not-a-uuid', { type: 'param' }),
    ).rejects.toThrow();
  });
});
