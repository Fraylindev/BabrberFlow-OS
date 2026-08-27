import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookingStatus, PaymentMethod, Prisma, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { RequestUser } from '../auth/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import type { InvoiceResponseRecord } from './dto/invoice-response.dto';
import { InvoicesService } from './invoices.service';

const USER: RequestUser = {
  id: '00000000-0000-4000-8000-000000000001',
  organizationId: '00000000-0000-4000-8000-000000000002',
  email: 'barber@example.test',
  name: 'Barber',
  role: UserRole.BARBER,
};
const FINISHED_END_TIME = new Date('2000-01-01T10:30:00.000Z');
const FUTURE_END_TIME = new Date('2099-01-01T10:30:00.000Z');

function invoiceRecord(
  payment: InvoiceResponseRecord['payment'] = null,
): InvoiceResponseRecord {
  return {
    id: 'invoice-id',
    amount: new Prisma.Decimal('125.50'),
    currency: 'DOP',
    createdAt: new Date('2026-08-25T12:00:00.000Z'),
    booking: {
      id: 'booking-id',
      startTime: new Date('2026-08-25T10:00:00.000Z'),
      client: { name: 'Cliente QA' },
      service: { name: 'Corte QA' },
      professional: { name: 'Profesional QA' },
    },
    payment,
  };
}

function createHarness() {
  const tx = {
    $queryRaw: jest.fn(),
    invoice: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    payment: { create: jest.fn() },
  };
  const db = {
    $transaction: jest
      .fn()
      .mockImplementation((operation: (client: typeof tx) => unknown) =>
        operation(tx),
      ),
    invoice: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const audit = { logTransactional: jest.fn().mockResolvedValue(undefined) };
  const service = new InvoicesService(
    { db } as unknown as PrismaService,
    audit as unknown as AuditService,
  );
  return { service, db, tx, audit };
}

describe('InvoicesService', () => {
  it('emite desde el precio server-side y audita en la misma transacción', async () => {
    const { service, tx, audit } = createHarness();
    tx.$queryRaw.mockResolvedValue([
      {
        id: 'booking-id',
        status: BookingStatus.COMPLETED,
        endTime: FINISHED_END_TIME,
        servicePrice: '125.500000000000000000000000000000',
      },
    ]);
    tx.invoice.findFirst.mockResolvedValue(null);
    tx.invoice.create.mockResolvedValue(invoiceRecord());

    await expect(
      service.create(USER, { bookingId: 'booking-id' }),
    ).resolves.toMatchObject({
      isNew: true,
      invoice: { id: 'invoice-id', amount: '125.50', state: 'ISSUED' },
    });
    expect(tx.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          organizationId: USER.organizationId,
          bookingId: 'booking-id',
          amount: new Prisma.Decimal('125.5'),
          currency: 'DOP',
        },
      }),
    );
    expect(audit.logTransactional).toHaveBeenCalledWith(
      {
        organizationId: USER.organizationId,
        userId: USER.id,
        action: 'ISSUE_INVOICE',
        entity: 'Invoice',
        entityId: 'invoice-id',
      },
      tx,
    );
  });

  it('rechaza reservas no completadas sin crear Invoice ni AuditLog', async () => {
    const { service, tx, audit } = createHarness();
    tx.$queryRaw.mockResolvedValue([
      {
        id: 'booking-id',
        status: BookingStatus.CONFIRMED,
        endTime: FINISHED_END_TIME,
        servicePrice: '125.50',
      },
    ]);

    await expect(
      service.create(USER, { bookingId: 'booking-id' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.invoice.create).not.toHaveBeenCalled();
    expect(audit.logTransactional).not.toHaveBeenCalled();
  });

  it('devuelve 404 neutro si la consulta tenant/ownership no encuentra Booking', async () => {
    const { service, tx } = createHarness();
    tx.$queryRaw.mockResolvedValue([]);

    await expect(
      service.create(USER, { bookingId: 'foreign-booking' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('repite la emisión como 200 lógico sin duplicar auditoría', async () => {
    const { service, tx, audit } = createHarness();
    tx.$queryRaw.mockResolvedValue([
      {
        id: 'booking-id',
        status: BookingStatus.COMPLETED,
        endTime: FINISHED_END_TIME,
        servicePrice: '125.50',
      },
    ]);
    tx.invoice.findFirst.mockResolvedValue(invoiceRecord());

    await expect(
      service.create(USER, { bookingId: 'booking-id' }),
    ).resolves.toMatchObject({ isNew: false });
    expect(tx.invoice.create).not.toHaveBeenCalled();
    expect(audit.logTransactional).not.toHaveBeenCalled();
  });

  it.each(['0', '-1', '12.345'])(
    'rechaza el precio inválido %s',
    async (servicePrice) => {
      const { service, tx } = createHarness();
      tx.$queryRaw.mockResolvedValue([
        {
          id: 'booking-id',
          status: BookingStatus.COMPLETED,
          endTime: FINISHED_END_TIME,
          servicePrice,
        },
      ]);
      tx.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.create(USER, { bookingId: 'booking-id' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.invoice.create).not.toHaveBeenCalled();
    },
  );

  it('rechaza emitir una Invoice para una Booking completada antes de endTime', async () => {
    const { service, tx, audit } = createHarness();
    tx.$queryRaw.mockResolvedValue([
      {
        id: 'booking-id',
        status: BookingStatus.COMPLETED,
        endTime: FUTURE_END_TIME,
        servicePrice: '125.50',
      },
    ]);

    await expect(
      service.create(USER, { bookingId: 'booking-id' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.invoice.create).not.toHaveBeenCalled();
    expect(audit.logTransactional).not.toHaveBeenCalled();
  });

  it('registra un único cobro con fecha y actor server-side', async () => {
    const { service, tx, audit } = createHarness();
    const paid = invoiceRecord({
      method: PaymentMethod.CARD,
      paidAt: new Date('2026-08-25T12:01:00.000Z'),
    });
    tx.$queryRaw.mockResolvedValue([
      {
        id: 'invoice-id',
        endTime: FINISHED_END_TIME,
        paymentId: null,
        paymentMethod: null,
      },
    ]);
    tx.payment.create.mockResolvedValue({ id: 'payment-id' });
    tx.invoice.findFirst.mockResolvedValue(paid);

    await expect(
      service.recordPayment('invoice-id', USER, {
        method: PaymentMethod.CARD,
      }),
    ).resolves.toMatchObject({
      isNew: true,
      invoice: { state: 'PAID', payment: { method: PaymentMethod.CARD } },
    });
    type PaymentCreateArgs = {
      data: {
        organizationId: string;
        invoiceId: string;
        method: PaymentMethod;
        paidAt: Date;
        recordedByUserId: string;
      };
      select: { id: boolean };
    };
    const paymentCalls = tx.payment.create.mock.calls as unknown as Array<
      [PaymentCreateArgs]
    >;
    const paymentCreate = paymentCalls[0]?.[0];
    if (!paymentCreate) throw new Error('Payment create was not called');
    expect(paymentCreate.data).toEqual({
      organizationId: USER.organizationId,
      invoiceId: 'invoice-id',
      method: PaymentMethod.CARD,
      paidAt: paymentCreate.data.paidAt,
      recordedByUserId: USER.id,
    });
    expect(paymentCreate.data.paidAt).toBeInstanceOf(Date);
    expect(paymentCreate.select).toEqual({ id: true });
    expect(audit.logTransactional).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RECORD_INVOICE_PAYMENT',
        entity: 'Payment',
        entityId: 'payment-id',
      }),
      tx,
    );
  });

  it('repite el mismo método sin cambiar Payment ni auditar', async () => {
    const { service, tx, audit } = createHarness();
    tx.$queryRaw.mockResolvedValue([
      {
        id: 'invoice-id',
        endTime: FINISHED_END_TIME,
        paymentId: 'payment-id',
        paymentMethod: PaymentMethod.CASH,
      },
    ]);
    tx.invoice.findFirst.mockResolvedValue(
      invoiceRecord({
        method: PaymentMethod.CASH,
        paidAt: new Date('2026-08-25T12:01:00.000Z'),
      }),
    );

    await expect(
      service.recordPayment('invoice-id', USER, {
        method: PaymentMethod.CASH,
      }),
    ).resolves.toMatchObject({ isNew: false });
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(audit.logTransactional).not.toHaveBeenCalled();
  });

  it('rechaza un método distinto sin mutar', async () => {
    const { service, tx } = createHarness();
    tx.$queryRaw.mockResolvedValue([
      {
        id: 'invoice-id',
        endTime: FINISHED_END_TIME,
        paymentId: 'payment-id',
        paymentMethod: PaymentMethod.CASH,
      },
    ]);

    await expect(
      service.recordPayment('invoice-id', USER, {
        method: PaymentMethod.TRANSFER,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('rechaza cobrar una Invoice histórica vinculada a una Booking futura', async () => {
    const { service, tx, audit } = createHarness();
    tx.$queryRaw.mockResolvedValue([
      {
        id: 'invoice-id',
        endTime: FUTURE_END_TIME,
        paymentId: null,
        paymentMethod: null,
      },
    ]);

    await expect(
      service.recordPayment('invoice-id', USER, {
        method: PaymentMethod.CASH,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(audit.logTransactional).not.toHaveBeenCalled();
  });

  it('aplica tenant y ownership antes de contar y paginar', async () => {
    const { service, db } = createHarness();
    db.invoice.count.mockResolvedValue(1);
    db.invoice.findMany.mockResolvedValue([invoiceRecord()]);

    await expect(
      service.findAll(USER, { page: '2', limit: '10', state: 'ISSUED' }),
    ).resolves.toMatchObject({
      pagination: { page: 2, limit: 10, total: 1, totalPages: 1 },
    });
    type InvoiceCountArgs = {
      where: Prisma.InvoiceWhereInput;
    };
    const countCalls = db.invoice.count.mock.calls as unknown as Array<
      [InvoiceCountArgs]
    >;
    const countCall = countCalls[0]?.[0];
    if (!countCall) throw new Error('Invoice count was not called');
    expect(countCall.where).toEqual({
      organizationId: USER.organizationId,
      payment: { is: null },
      booking: {
        organizationId: USER.organizationId,
        professional: {
          organizationId: USER.organizationId,
          userId: USER.id,
        },
      },
    });
    expect(db.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });

  it('propaga fallo de auditoría para permitir rollback transaccional', async () => {
    const { service, tx, audit } = createHarness();
    tx.$queryRaw.mockResolvedValue([
      {
        id: 'booking-id',
        status: BookingStatus.COMPLETED,
        endTime: FINISHED_END_TIME,
        servicePrice: '125.50',
      },
    ]);
    tx.invoice.findFirst.mockResolvedValue(null);
    tx.invoice.create.mockResolvedValue(invoiceRecord());
    audit.logTransactional.mockRejectedValue(new Error('forced audit failure'));

    await expect(
      service.create(USER, { bookingId: 'booking-id' }),
    ).rejects.toThrow('forced audit failure');
  });
});
