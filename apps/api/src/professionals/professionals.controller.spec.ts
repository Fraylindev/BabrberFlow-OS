import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/authenticated-request';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalAvailabilityService } from './professional-availability.service';

const USER: RequestUser = {
  id: '00000000-0000-4000-8000-000000000001',
  organizationId: '00000000-0000-4000-8000-000000000002',
  email: 'owner@example.com',
  name: 'Owner',
  role: UserRole.OWNER,
};

function createController() {
  const professionals = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findMe: jest.fn(),
    update: jest.fn(),
    updateMe: jest.fn(),
    updateStatus: jest.fn(),
    updateVisibility: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
    linkUser: jest.fn(),
    unlinkUser: jest.fn(),
  };
  const availability = {
    getForProfessional: jest.fn(),
    getForOwnProfile: jest.fn(),
    replaceWeeklySchedule: jest.fn(),
    replaceOwnWeeklySchedule: jest.fn(),
    createBlock: jest.fn(),
    createOwnBlock: jest.fn(),
    updateBlock: jest.fn(),
    updateOwnBlock: jest.fn(),
  };
  return {
    professionals,
    availability,
    controller: new ProfessionalsController(
      professionals as unknown as ProfessionalsService,
      availability as unknown as ProfessionalAvailabilityService,
    ),
  };
}

function rolesFor(method: keyof ProfessionalsController): UserRole[] {
  const descriptor = Object.getOwnPropertyDescriptor(
    ProfessionalsController.prototype,
    method,
  );
  if (typeof descriptor?.value !== 'function')
    throw new Error(`Missing controller method ${method}`);
  return Reflect.getMetadata(
    ROLES_KEY,
    descriptor.value as object,
  ) as UserRole[];
}

describe('ProfessionalsController', () => {
  it('limits management endpoints to OWNER and ADMIN', () => {
    for (const method of [
      'create',
      'findOne',
      'update',
      'updateStatus',
      'updateVisibility',
      'archive',
      'restore',
      'linkUser',
      'unlinkUser',
      'getAvailability',
      'replaceWeeklySchedule',
      'createAvailabilityBlock',
      'updateAvailabilityBlock',
    ] as const) {
      expect(rolesFor(method)).toEqual([UserRole.OWNER, UserRole.ADMIN]);
    }
  });

  it('limits own profile endpoints to BARBER', () => {
    expect(rolesFor('findMe')).toEqual([UserRole.BARBER]);
    expect(rolesFor('updateMe')).toEqual([UserRole.BARBER]);
    expect(rolesFor('getMyAvailability')).toEqual([UserRole.BARBER]);
    expect(rolesFor('replaceMyWeeklySchedule')).toEqual([UserRole.BARBER]);
    expect(rolesFor('createMyAvailabilityBlock')).toEqual([UserRole.BARBER]);
    expect(rolesFor('updateMyAvailabilityBlock')).toEqual([UserRole.BARBER]);
  });

  it('returns management list for OWNER and writes real pagination headers', async () => {
    const { controller, professionals } = createController();
    professionals.findAll.mockResolvedValue({
      data: [{ id: 'professional-id' }],
      pagination: { page: 2, limit: 20, total: 25, totalPages: 2 },
    });
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;

    const result = await controller.findAll(
      USER,
      { page: '2', limit: '20' },
      response,
    );

    expect(professionals.findAll).toHaveBeenCalledWith(
      USER.organizationId,
      { page: '2', limit: '20' },
      true,
    );
    expect(setHeader).toHaveBeenCalledWith('X-Total-Count', 25);
    expect(setHeader).toHaveBeenCalledWith('X-Page', 2);
    expect(setHeader).toHaveBeenCalledWith('X-Limit', 20);
    expect(setHeader).toHaveBeenCalledWith('X-Total-Pages', 2);
    expect(result).toEqual([{ id: 'professional-id' }]);
  });

  it('returns directory projection for BARBER and RECEPTIONIST roles', async () => {
    for (const role of [UserRole.BARBER, UserRole.RECEPTIONIST]) {
      const { controller, professionals } = createController();
      professionals.findAll.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
      const response = { setHeader: jest.fn() } as unknown as Response;

      await controller.findAll({ ...USER, role }, {}, response);

      expect(professionals.findAll).toHaveBeenCalledWith(
        USER.organizationId,
        {},
        false,
      );
    }
  });

  it('routes BARBER self-edit by token identity, not body identity', async () => {
    const { controller, professionals } = createController();
    const barber = { ...USER, role: UserRole.BARBER };

    await controller.updateMe(barber, { name: 'Public name' });

    expect(professionals.updateMe).toHaveBeenCalledWith(
      barber.id,
      barber.organizationId,
      { name: 'Public name' },
    );
  });

  it('passes tenant and actor context to archive and link operations', async () => {
    const { controller, professionals } = createController();
    const professionalId = '00000000-0000-4000-8000-000000000003';
    const barberId = '00000000-0000-4000-8000-000000000004';

    await controller.archive(professionalId, USER);
    await controller.linkUser(professionalId, USER, { userId: barberId });

    expect(professionals.archive).toHaveBeenCalledWith(
      professionalId,
      USER.organizationId,
      USER.id,
    );
    expect(professionals.linkUser).toHaveBeenCalledWith(
      professionalId,
      USER.organizationId,
      USER.id,
      barberId,
    );
  });

  it('routes management availability with tenant and actor from the token', async () => {
    const { controller, availability } = createController();
    const professionalId = '00000000-0000-4000-8000-000000000003';
    const blockId = '00000000-0000-4000-8000-000000000004';
    const block = {
      startTime: '2099-01-05T14:00:00.000Z',
      endTime: '2099-01-05T15:00:00.000Z',
    };

    await controller.createAvailabilityBlock(professionalId, USER, block);
    await controller.updateAvailabilityBlock(professionalId, blockId, USER, {
      note: 'Interna',
    });

    expect(availability.createBlock).toHaveBeenCalledWith(
      professionalId,
      USER.organizationId,
      USER.id,
      block,
    );
    expect(availability.updateBlock).toHaveBeenCalledWith(
      professionalId,
      blockId,
      USER.organizationId,
      USER.id,
      { note: 'Interna' },
    );
  });

  it('routes BARBER availability only through its token identity', async () => {
    const { controller, availability } = createController();
    const barber = { ...USER, role: UserRole.BARBER };

    await controller.replaceMyWeeklySchedule(barber, {
      shifts: [{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }],
    });

    expect(availability.replaceOwnWeeklySchedule).toHaveBeenCalledWith(
      barber.id,
      barber.organizationId,
      {
        shifts: [{ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' }],
      },
    );
  });
});
