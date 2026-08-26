import type { Response } from 'express';
import { PaymentMethod, UserRole } from '@prisma/client';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/authenticated-request';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

const USER: RequestUser = {
  id: '00000000-0000-4000-8000-000000000001',
  organizationId: '00000000-0000-4000-8000-000000000002',
  email: 'barber@example.test',
  name: 'Barber',
  role: UserRole.BARBER,
};

function createController() {
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    recordPayment: jest.fn(),
  };
  return {
    service,
    controller: new InvoicesController(service as unknown as InvoicesService),
  };
}

function responseMock() {
  const setHeader = jest.fn();
  const status = jest.fn();
  const response = { setHeader, status } as unknown as Response;
  status.mockReturnValue(response);
  return { response, setHeader, status };
}

describe('InvoicesController', () => {
  it('permite todos los roles B2B, incluido BARBER', () => {
    expect(Reflect.getMetadata(ROLES_KEY, InvoicesController)).toEqual([
      UserRole.OWNER,
      UserRole.ADMIN,
      UserRole.BARBER,
      UserRole.RECEPTIONIST,
    ]);
  });

  it('pasa el RequestUser completo y expone headers de paginación', async () => {
    const { controller, service } = createController();
    const { response, setHeader } = responseMock();
    service.findAll.mockResolvedValue({
      data: [{ id: 'invoice-id' }],
      pagination: { page: 2, limit: 10, total: 21, totalPages: 3 },
    });

    await expect(
      controller.findAll(USER, { page: '2', limit: '10' }, response),
    ).resolves.toEqual([{ id: 'invoice-id' }]);
    expect(service.findAll).toHaveBeenCalledWith(USER, {
      page: '2',
      limit: '10',
    });
    expect(setHeader).toHaveBeenCalledWith('X-Total-Count', 21);
    expect(setHeader).toHaveBeenCalledWith('X-Page', 2);
    expect(setHeader).toHaveBeenCalledWith('X-Limit', 10);
    expect(setHeader).toHaveBeenCalledWith('X-Total-Pages', 3);
  });

  it.each([
    { operation: 'create', isNew: true, expectedStatus: 201 },
    { operation: 'create', isNew: false, expectedStatus: 200 },
    { operation: 'recordPayment', isNew: true, expectedStatus: 201 },
    { operation: 'recordPayment', isNew: false, expectedStatus: 200 },
  ] as const)(
    'devuelve $expectedStatus para $operation isNew=$isNew',
    async ({ operation, isNew, expectedStatus }) => {
      const { controller, service } = createController();
      const { response, status } = responseMock();
      service[operation].mockResolvedValue({
        isNew,
        invoice: { id: 'invoice-id' },
      });

      const result =
        operation === 'create'
          ? await controller.create(USER, { bookingId: 'booking-id' }, response)
          : await controller.recordPayment(
              'invoice-id',
              USER,
              { method: PaymentMethod.CASH },
              response,
            );

      expect(result).toEqual({ id: 'invoice-id' });
      expect(status).toHaveBeenCalledWith(expectedStatus);
    },
  );
});
