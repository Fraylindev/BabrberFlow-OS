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
    phone: '+18095550101',
    customerAccessBlocked: true,
    customerHistoryAmbiguous: false,
  };
  const queryRaw = jest.fn();
  const findUser = jest.fn();
  const createUser = jest.fn();
  const updateClients = jest.fn();
  const findClient = jest.fn();
  const tx = {
    $queryRaw: queryRaw,
    user: { findUnique: findUser, create: createUser },
    client: { updateMany: updateClients, findFirst: findClient },
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
    queryRaw.mockReset();
    getVerifiedClerkProfile.mockResolvedValue({
      name: 'Customer QA',
      email: 'customer@example.test',
    });
    transaction.mockImplementation(
      (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
    queryRaw.mockResolvedValueOnce([booking]).mockResolvedValueOnce([client]);
    queryRaw.mockResolvedValue([booking]);
    findUser.mockResolvedValue(null);
    createUser.mockResolvedValue({
      id: '0d2216b9-f649-4ad3-b661-87f29889eaff',
      email: 'customer@example.test',
    });
    updateClients.mockResolvedValue({ count: 1 });
    findClient.mockResolvedValue(null);
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
      .mockResolvedValueOnce([
        { ...client, userId: 'local-user', customerAccessBlocked: false },
      ])
      .mockResolvedValueOnce([booking]);
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

  it('habilita después del enlace aunque la fila original estuviera habilitada', async () => {
    queryRaw.mockReset();
    queryRaw
      .mockResolvedValueOnce([booking])
      .mockResolvedValueOnce([{ ...client, customerAccessBlocked: false }])
      .mockResolvedValueOnce([booking]);
    await service.claim('clerk_customer', dto);
    expect(updateClients).toHaveBeenLastCalledWith({
      where: {
        id: client.id,
        organizationId: client.organizationId,
        userId: '0d2216b9-f649-4ad3-b661-87f29889eaff',
      },
      data: { customerAccessBlocked: false },
    });
  });

  it('conserva la cuarentena con señal de teléfono compartido sin inferir identidad', async () => {
    findClient.mockResolvedValue({ id: 'otra-ficha' });
    await expect(service.claim('clerk_customer', dto)).resolves.toEqual({
      isNew: true,
    });
    expect(updateClients).toHaveBeenLastCalledWith({
      where: {
        id: client.id,
        organizationId: client.organizationId,
        userId: '0d2216b9-f649-4ad3-b661-87f29889eaff',
      },
      data: { customerAccessBlocked: true, customerHistoryAmbiguous: true },
    });
  });

  it('un replay no libera la cuarentena persistente', async () => {
    queryRaw.mockReset();
    queryRaw
      .mockResolvedValueOnce([booking])
      .mockResolvedValueOnce([
        { ...client, userId: 'local-user', customerHistoryAmbiguous: true },
      ])
      .mockResolvedValueOnce([booking]);
    findUser.mockResolvedValueOnce({
      clerkUserId: 'clerk_customer',
      email: client.email,
    });
    await expect(service.claim('clerk_customer', dto)).resolves.toEqual({
      isNew: false,
    });
    expect(updateClients).toHaveBeenLastCalledWith({
      where: {
        id: client.id,
        organizationId: client.organizationId,
        userId: 'local-user',
      },
      data: { customerAccessBlocked: true, customerHistoryAmbiguous: true },
    });
  });

  it('rehabilita un vínculo revocado solo con el correo primario verificado coherente', async () => {
    queryRaw.mockReset();
    queryRaw
      .mockResolvedValueOnce([booking])
      .mockResolvedValueOnce([{ ...client, userId: 'local-user' }])
      .mockResolvedValueOnce([booking]);
    findUser.mockResolvedValueOnce({
      clerkUserId: 'clerk_customer',
      email: client.email,
    });
    await expect(service.claim('clerk_customer', dto)).resolves.toEqual({
      isNew: false,
    });
    expect(updateClients).toHaveBeenLastCalledWith({
      where: {
        id: client.id,
        organizationId: client.organizationId,
        userId: 'local-user',
      },
      data: { customerAccessBlocked: false },
    });
  });

  it('correo cambiado no libera un vínculo revocado', async () => {
    queryRaw.mockReset();
    queryRaw
      .mockResolvedValueOnce([booking])
      .mockResolvedValueOnce([{ ...client, userId: 'local-user' }])
      .mockResolvedValueOnce([booking]);
    findUser.mockResolvedValueOnce({
      clerkUserId: 'clerk_customer',
      email: 'other@example.test',
    });
    await expect(service.claim('clerk_customer', dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(updateClients).not.toHaveBeenCalled();
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
