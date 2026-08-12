import { ForbiddenException } from '@nestjs/common';
import { BookingStatus, UserRole } from '@prisma/client';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/authenticated-request';

const USER: RequestUser = {
  id: '00000000-0000-4000-8000-000000000001',
  organizationId: '00000000-0000-4000-8000-000000000002',
  email: 'barber@example.com',
  name: 'Barber',
  role: UserRole.BARBER,
};
const DTO = {
  clientId: '00000000-0000-4000-8000-000000000003',
  professionalId: '00000000-0000-4000-8000-000000000004',
  serviceId: '00000000-0000-4000-8000-000000000005',
  startTime: '2099-01-01T10:00:00.000Z',
};

function createController() {
  const bookings = {
    create: jest.fn(),
    findAll: jest.fn(),
    reschedule: jest.fn(),
    updateStatus: jest.fn(),
  };
  const professionals = { findByUserId: jest.fn() };
  return {
    bookings,
    professionals,
    controller: new BookingsController(
      bookings as unknown as BookingsService,
      professionals as unknown as ProfessionalsService,
    ),
  };
}

describe('BookingsController - BARBER authorization', () => {
  it('allows a BARBER to create only for their own active professional', async () => {
    const { controller, bookings, professionals } = createController();
    professionals.findByUserId.mockResolvedValue({
      id: DTO.professionalId,
      isActive: true,
    });
    bookings.create.mockResolvedValue({ id: 'booking-id' });

    await controller.create(USER, DTO);

    expect(professionals.findByUserId).toHaveBeenCalledWith(
      USER.id,
      USER.organizationId,
    );
    expect(bookings.create).toHaveBeenCalledWith(USER.organizationId, DTO);
  });

  it.each([
    {
      professional: { id: 'other-professional', isActive: true },
      scenario: 'another professional',
    },
    {
      professional: { id: DTO.professionalId, isActive: false },
      scenario: 'an inactive profile',
    },
    { professional: null, scenario: 'an unlinked account' },
  ])('rejects creation for $scenario', async ({ professional }) => {
    const { controller, bookings, professionals } = createController();
    professionals.findByUserId.mockResolvedValue(professional);

    await expect(controller.create(USER, DTO)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(bookings.create).not.toHaveBeenCalled();
  });

  it('scopes BARBER status changes to their own professional', async () => {
    const { controller, bookings, professionals } = createController();
    professionals.findByUserId.mockResolvedValue({
      id: DTO.professionalId,
      isActive: false,
    });
    bookings.updateStatus.mockResolvedValue({ id: 'booking-id' });
    const update = { status: BookingStatus.CONFIRMED };

    await controller.updateStatus('booking-id', USER, update);

    expect(bookings.updateStatus).toHaveBeenCalledWith(
      'booking-id',
      USER.organizationId,
      update,
      DTO.professionalId,
    );
  });

  it('does not allow BARBER to reschedule bookings', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      BookingsController.prototype,
      'reschedule',
    ) as TypedPropertyDescriptor<(...args: unknown[]) => unknown>;
    if (!descriptor.value) throw new Error('Missing reschedule method');
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
  });
});
