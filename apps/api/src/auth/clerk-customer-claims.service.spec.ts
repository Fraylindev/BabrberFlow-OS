import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkCustomerClaimsService } from './clerk-customer-claims.service';
import { ClerkOnboardingService } from './clerk-onboarding.service';

describe('ClerkCustomerClaimsService', () => {
  const booking = {
    id: '843b7699-f9e7-47ce-abfb-f08bdf2e7ea5',
    organizationId: 'c09aee14-cc14-42cc-97bc-c980b46d329a',
    clientId: '61179e28-d53c-466f-a880-d9a693933e93',
  };
  const client = {
    id: booking.clientId,
    organizationId: booking.organizationId,
    email: 'customer@example.test',
    userId: null as string | null,
  };
  const queryRaw = jest.fn();
  const findUser = jest.fn();
  const createUser = jest.fn();
  const updateClients = jest.fn();
  const tx = {
    $queryRaw: queryRaw,
    user: { findUnique: findUser, create: createUser },
    client: { updateMany: updateClients },
  };
  const transaction = jest.fn();
  const prisma = {
    db: { $transaction: transaction },
  } as unknown as PrismaService;
  const logTransactional = jest.fn();
  const audit = { logTransactional } as unknown as AuditService;
  const getVerifiedClerkProfile = jest.fn();
  const onboarding = {
    getVerifiedClerkProfile,
  } as unknown as ClerkOnboardingService;
  const service = new ClerkCustomerClaimsService(prisma, audit, onboarding);
  const dto = {
    bookingId: booking.id,
    organizationSlug: 'Tenant-One',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getVerifiedClerkProfile.mockResolvedValue({
      name: 'Customer QA',
      email: 'customer@example.test',
    });
    transaction.mockImplementation(
      (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
    queryRaw.mockResolvedValueOnce([booking]).mockResolvedValueOnce([client]);
    findUser.mockResolvedValue(null);
    createUser.mockResolvedValue({
      id: '0d2216b9-f649-4ad3-b661-87f29889eaff',
      email: 'customer@example.test',
    });
    updateClients.mockResolvedValue({ count: 1 });
    logTransactional.mockResolvedValue(undefined);
  });

  it('crea User sin Membership, enlaza Client y audita sin PII', async () => {
    await expect(service.claim('clerk_customer', dto)).resolves.toEqual({
      isNew: true,
    });

    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(createUser).toHaveBeenCalledWith({
      data: {
        name: 'Customer QA',
        email: 'customer@example.test',
        password: null,
        clerkUserId: 'clerk_customer',
      },
      select: { id: true, email: true },
    });
    expect(tx).not.toHaveProperty('membership');
    expect(logTransactional).toHaveBeenCalledWith(
      {
        organizationId: booking.organizationId,
        userId: '0d2216b9-f649-4ad3-b661-87f29889eaff',
        action: 'LINK',
        entity: 'Client',
        entityId: client.id,
      },
      tx,
    );
    expect(JSON.stringify(logTransactional.mock.calls)).not.toContain(
      'customer@example.test',
    );
  });

  it('es idempotente para el mismo Clerk y no vuelve a escribir', async () => {
    queryRaw.mockReset();
    queryRaw
      .mockResolvedValueOnce([booking])
      .mockResolvedValueOnce([{ ...client, userId: 'local-user' }]);
    findUser.mockResolvedValueOnce({ clerkUserId: 'clerk_customer' });

    await expect(service.claim('clerk_customer', dto)).resolves.toEqual({
      isNew: false,
    });
    expect(createUser).not.toHaveBeenCalled();
    expect(updateClients).not.toHaveBeenCalled();
    expect(logTransactional).not.toHaveBeenCalled();
  });

  it('rechaza colisión de correo local sin crear, enlazar ni auditar', async () => {
    findUser
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'legacy-user', clerkUserId: null });

    await expect(service.claim('clerk_customer', dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(createUser).not.toHaveBeenCalled();
    expect(updateClients).not.toHaveBeenCalled();
    expect(logTransactional).not.toHaveBeenCalled();
  });

  it('oculta reservas de otro tenant con el mismo 404', async () => {
    queryRaw.mockReset();
    queryRaw.mockResolvedValueOnce([]);

    await expect(service.claim('clerk_customer', dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findUser).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });
});
