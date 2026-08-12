import { BadRequestException, ConflictException } from '@nestjs/common';
import { BookingStatus, ProfessionalStatus } from '@prisma/client';
import { PublicBookingService } from './public-booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { AuditService } from '../audit/audit.service';

const ORGANIZATION = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'demo',
  name: 'Demo',
  phone: null,
  isActive: true,
  businessHours: null,
};
const CLIENT_ID = '00000000-0000-4000-8000-000000000002';
const BOOKING = {
  id: '00000000-0000-4000-8000-000000000003',
  organizationId: ORGANIZATION.id,
  clientId: CLIENT_ID,
  serviceId: '00000000-0000-4000-8000-000000000004',
  professionalId: '00000000-0000-4000-8000-000000000005',
  startTime: new Date('2099-01-01T10:00:00.000Z'),
  endTime: new Date('2099-01-01T10:30:00.000Z'),
  status: BookingStatus.PENDING,
  notes: null,
  createdAt: new Date('2026-08-11T10:00:00.000Z'),
  updatedAt: new Date('2026-08-11T10:00:00.000Z'),
};
const DTO = {
  serviceId: BOOKING.serviceId,
  professionalId: BOOKING.professionalId,
  startTime: BOOKING.startTime.toISOString(),
  clientName: '  Ana Pérez  ',
  clientPhone: ' +1 (809) 555-1234 ',
  clientEmail: ' ANA@EXAMPLE.COM ',
};

function createDependencies() {
  const transaction = {
    client: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: { create: jest.fn() },
    membership: { create: jest.fn() },
  };
  const prisma = {
    db: {
      organization: { findUnique: jest.fn().mockResolvedValue(ORGANIZATION) },
      service: { findMany: jest.fn(), findFirst: jest.fn() },
      professional: { findMany: jest.fn(), findFirst: jest.fn() },
      user: { findFirst: jest.fn() },
      $transaction: jest.fn(
        async (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    },
  };
  const bookings = {
    create: jest.fn().mockResolvedValue(BOOKING),
    findActiveBookingsInRange: jest.fn(),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  return { transaction, prisma, bookings, audit };
}

describe('PublicBookingService - secure public creation', () => {
  let dependencies: ReturnType<typeof createDependencies>;
  let service: PublicBookingService;

  beforeEach(() => {
    dependencies = createDependencies();
    service = new PublicBookingService(
      dependencies.prisma as unknown as PrismaService,
      dependencies.bookings as unknown as BookingsService,
      dependencies.audit as unknown as AuditService,
    );
  });

  it('creates normalized Client and Booking in one transaction', async () => {
    dependencies.transaction.client.findFirst.mockResolvedValue(null);
    dependencies.transaction.client.create.mockResolvedValue({ id: CLIENT_ID });

    const result = await service.createBooking('demo', DTO);

    expect(dependencies.prisma.db.$transaction).toHaveBeenCalledTimes(1);
    expect(dependencies.transaction.client.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORGANIZATION.id,
        name: 'Ana Pérez',
        phone: '+18095551234',
        email: 'ana@example.com',
      },
      select: { id: true },
    });
    expect(dependencies.bookings.create).toHaveBeenCalledWith(
      ORGANIZATION.id,
      expect.objectContaining({ clientId: CLIENT_ID }),
      dependencies.transaction,
      true,
    );
    expect(dependencies.audit.log).toHaveBeenCalledWith({
      organizationId: ORGANIZATION.id,
      userId: null,
      action: 'CREATE',
      entity: 'Client',
      entityId: CLIENT_ID,
    });
    expect(result).not.toHaveProperty('client');
    expect(result.booking).not.toHaveProperty('clientId');
    expect(result.booking).not.toHaveProperty('organizationId');
    expect(result.booking).not.toHaveProperty('createdAt');
    expect(result.booking).toEqual({
      id: BOOKING.id,
      serviceId: BOOKING.serviceId,
      professionalId: BOOKING.professionalId,
      startTime: BOOKING.startTime,
      endTime: BOOKING.endTime,
      status: BOOKING.status,
    });
  });

  it('reactivates an inactive returning client inside the transaction', async () => {
    dependencies.transaction.client.findFirst
      .mockResolvedValueOnce({ id: CLIENT_ID, isActive: false })
      .mockResolvedValueOnce({ id: CLIENT_ID, isActive: false });
    dependencies.transaction.client.update.mockResolvedValue({ id: CLIENT_ID });

    await service.createBooking('demo', DTO);

    expect(dependencies.transaction.client.update).toHaveBeenCalledWith({
      where: { id: CLIENT_ID, organizationId: ORGANIZATION.id },
      data: { isActive: true },
      select: { id: true },
    });
    expect(dependencies.bookings.create).toHaveBeenCalledWith(
      ORGANIZATION.id,
      expect.objectContaining({ clientId: CLIENT_ID }),
      dependencies.transaction,
      true,
    );
    expect(dependencies.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESTORE', entityId: CLIENT_ID }),
    );
  });

  it('reuses an active client without returning or auditing PII', async () => {
    dependencies.transaction.client.findFirst
      .mockResolvedValueOnce({ id: CLIENT_ID, isActive: true })
      .mockResolvedValueOnce(null);

    const result = await service.createBooking('demo', DTO);

    expect(dependencies.transaction.client.create).not.toHaveBeenCalled();
    expect(dependencies.transaction.client.update).not.toHaveBeenCalled();
    expect(dependencies.audit.log).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('ana@example.com');
    expect(JSON.stringify(result)).not.toContain('+18095551234');
  });

  it('rejects ambiguous phone/email matches without creating a booking', async () => {
    dependencies.transaction.client.findFirst
      .mockResolvedValueOnce({ id: 'phone-client', isActive: true })
      .mockResolvedValueOnce({ id: 'email-client', isActive: true });

    await expect(service.createBooking('demo', DTO)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(dependencies.bookings.create).not.toHaveBeenCalled();
  });

  it('propagates booking failure from the transaction and returns no result', async () => {
    dependencies.transaction.client.findFirst.mockResolvedValue(null);
    dependencies.transaction.client.create.mockResolvedValue({ id: CLIENT_ID });
    dependencies.bookings.create.mockRejectedValue(
      new ConflictException('Horario ocupado'),
    );

    await expect(service.createBooking('demo', DTO)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(dependencies.prisma.db.$transaction).toHaveBeenCalledTimes(1);
    expect(dependencies.audit.log).not.toHaveBeenCalled();
  });

  it('keeps booking success when secondary CUSTOMER account creation fails', async () => {
    dependencies.transaction.client.findFirst.mockResolvedValue(null);
    dependencies.transaction.client.create.mockResolvedValue({ id: CLIENT_ID });
    dependencies.prisma.db.user.findFirst.mockRejectedValue(
      new Error('database unavailable'),
    );

    const result = await service.createBooking('demo', {
      ...DTO,
      createAccount: true,
      password: 'ValidPassword123!',
    });

    expect(result.booking.id).toBe(BOOKING.id);
    expect(result.accountCreated).toBe(false);
    expect(result.accountCreationError).toBe('ACCOUNT_CREATION_FAILED');
  });
});

describe('PublicBookingService - active public catalog', () => {
  it('lists only active services from the resolved organization', async () => {
    const dependencies = createDependencies();
    const service = new PublicBookingService(
      dependencies.prisma as unknown as PrismaService,
      dependencies.bookings as unknown as BookingsService,
      dependencies.audit as unknown as AuditService,
    );
    dependencies.prisma.db.service.findMany.mockResolvedValue([]);
    dependencies.prisma.db.professional.findMany.mockResolvedValue([]);

    await service.getBookingData(ORGANIZATION.slug);

    expect(dependencies.prisma.db.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: ORGANIZATION.id, isActive: true },
      }),
    );
  });

  it('lists only ACTIVE and published professionals', async () => {
    const dependencies = createDependencies();
    const service = new PublicBookingService(
      dependencies.prisma as unknown as PrismaService,
      dependencies.bookings as unknown as BookingsService,
      dependencies.audit as unknown as AuditService,
    );
    dependencies.prisma.db.service.findMany.mockResolvedValue([]);
    dependencies.prisma.db.professional.findMany.mockResolvedValue([]);

    await service.getBookingData(ORGANIZATION.slug);

    expect(dependencies.prisma.db.professional.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: ORGANIZATION.id,
          status: ProfessionalStatus.ACTIVE,
          isPublic: true,
        },
      }),
    );
  });

  it('rejects availability for an inactive service', async () => {
    const dependencies = createDependencies();
    const service = new PublicBookingService(
      dependencies.prisma as unknown as PrismaService,
      dependencies.bookings as unknown as BookingsService,
      dependencies.audit as unknown as AuditService,
    );
    dependencies.prisma.db.service.findFirst.mockResolvedValue(null);

    await expect(
      service.getAvailability(ORGANIZATION.slug, {
        date: '2099-01-01',
        serviceId: BOOKING.serviceId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dependencies.prisma.db.service.findFirst).toHaveBeenCalledWith({
      where: {
        id: BOOKING.serviceId,
        organizationId: ORGANIZATION.id,
        isActive: true,
      },
      select: { duration: true },
    });
  });
});
