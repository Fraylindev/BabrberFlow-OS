import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, PaymentMethod, Prisma, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { RequestUser } from '../auth/types/authenticated-request';
import {
  isSerializationFailureError,
  isUniqueConstraintError,
} from '../common/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import {
  InvoiceListResult,
  InvoiceResponseDto,
  InvoiceResponseRecord,
  invoiceResponseSelect,
  toInvoiceResponse,
} from './dto/invoice-response.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { RecordInvoicePaymentDto } from './dto/record-invoice-payment.dto';

interface LockedBookingForInvoice {
  id: string;
  status: BookingStatus;
  endTime: Date;
  servicePrice: string;
}

interface LockedInvoiceForPayment {
  id: string;
  endTime: Date;
  paymentId: string | null;
  paymentMethod: PaymentMethod | null;
}

interface InvoiceMutationResult {
  isNew: boolean;
  invoice: InvoiceResponseDto;
}

@Injectable()
export class InvoicesService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;
  private static readonly MAX_SERIALIZATION_ATTEMPTS = 3;
  private static readonly NOT_FOUND_MESSAGE = 'Factura no encontrada';

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    user: RequestUser,
    query: QueryInvoicesDto,
  ): Promise<InvoiceListResult> {
    const page = Number(query.page ?? 1);
    const limit = Math.min(
      Number(query.limit ?? InvoicesService.DEFAULT_PAGE_SIZE),
      InvoicesService.MAX_PAGE_SIZE,
    );
    const where = this.authorizedWhere(user, {
      ...(query.state === 'ISSUED' ? { payment: { is: null } } : {}),
      ...(query.state === 'PAID' ? { payment: { isNot: null } } : {}),
    });

    const [total, records] = await Promise.all([
      this.prisma.db.invoice.count({ where }),
      this.prisma.db.invoice.findMany({
        where,
        select: invoiceResponseSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: records.map(toInvoiceResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: RequestUser): Promise<InvoiceResponseDto> {
    const record = await this.prisma.db.invoice.findFirst({
      where: this.authorizedWhere(user, { id }),
      select: invoiceResponseSelect,
    });
    if (!record) throw new NotFoundException(InvoicesService.NOT_FOUND_MESSAGE);
    return toInvoiceResponse(record);
  }

  async create(
    user: RequestUser,
    dto: CreateInvoiceDto,
  ): Promise<InvoiceMutationResult> {
    try {
      return await this.runSerializable((tx) =>
        this.createInTransaction(tx, user, dto.bookingId),
      );
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        const existing = await this.findRecordByBooking(dto.bookingId, user);
        if (existing) {
          return { isNew: false, invoice: toInvoiceResponse(existing) };
        }
        throw new ConflictException('No fue posible emitir la factura');
      }
      throw error;
    }
  }

  async recordPayment(
    invoiceId: string,
    user: RequestUser,
    dto: RecordInvoicePaymentDto,
  ): Promise<InvoiceMutationResult> {
    try {
      return await this.runSerializable((tx) =>
        this.recordPaymentInTransaction(tx, invoiceId, user, dto.method),
      );
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        const existing = await this.findRecord(invoiceId, user);
        if (!existing) {
          throw new NotFoundException(InvoicesService.NOT_FOUND_MESSAGE);
        }
        if (existing.payment?.method !== dto.method) {
          throw new ConflictException(
            'La factura ya tiene un cobro registrado con otro método',
          );
        }
        return { isNew: false, invoice: toInvoiceResponse(existing) };
      }
      throw error;
    }
  }

  private async createInTransaction(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    bookingId: string,
  ): Promise<InvoiceMutationResult> {
    const ownership =
      user.role === UserRole.BARBER
        ? Prisma.sql`AND p."userId" = ${user.id}`
        : Prisma.empty;
    const rows = await tx.$queryRaw<LockedBookingForInvoice[]>(Prisma.sql`
      SELECT
        b."id",
        b."status",
        b."endTime",
        s."price"::text AS "servicePrice"
      FROM "Booking" b
      INNER JOIN "Service" s
        ON s."id" = b."serviceId"
       AND s."organizationId" = b."organizationId"
      INNER JOIN "Professional" p
        ON p."id" = b."professionalId"
       AND p."organizationId" = b."organizationId"
      WHERE b."id" = ${bookingId}
        AND b."organizationId" = ${user.organizationId}
        ${ownership}
      FOR UPDATE OF b, s
    `);
    const booking = rows[0];
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new ConflictException(
        'Solo se puede emitir una factura para una reserva completada',
      );
    }
    this.assertServiceEnded(booking.endTime);

    const existing = await tx.invoice.findFirst({
      where: this.authorizedWhere(user, { bookingId }),
      select: invoiceResponseSelect,
    });
    if (existing) {
      return { isNew: false, invoice: toInvoiceResponse(existing) };
    }

    const amount = this.toValidSnapshot(booking.servicePrice);
    const created = await tx.invoice.create({
      data: {
        organizationId: user.organizationId,
        bookingId,
        amount,
        currency: 'DOP',
      },
      select: invoiceResponseSelect,
    });
    await this.audit.logTransactional(
      {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'ISSUE_INVOICE',
        entity: 'Invoice',
        entityId: created.id,
      },
      tx,
    );

    return { isNew: true, invoice: toInvoiceResponse(created) };
  }

  private async recordPaymentInTransaction(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    user: RequestUser,
    method: PaymentMethod,
  ): Promise<InvoiceMutationResult> {
    const ownership =
      user.role === UserRole.BARBER
        ? Prisma.sql`AND p."userId" = ${user.id}`
        : Prisma.empty;
    const rows = await tx.$queryRaw<LockedInvoiceForPayment[]>(Prisma.sql`
      SELECT
        i."id",
        b."endTime",
        pay."id" AS "paymentId",
        pay."method" AS "paymentMethod"
      FROM "Invoice" i
      INNER JOIN "Booking" b
        ON b."id" = i."bookingId"
       AND b."organizationId" = i."organizationId"
      INNER JOIN "Professional" p
        ON p."id" = b."professionalId"
       AND p."organizationId" = b."organizationId"
      LEFT JOIN "Payment" pay
        ON pay."invoiceId" = i."id"
       AND pay."organizationId" = i."organizationId"
      WHERE i."id" = ${invoiceId}
        AND i."organizationId" = ${user.organizationId}
        ${ownership}
      FOR UPDATE OF i
    `);
    const locked = rows[0];
    if (!locked) {
      throw new NotFoundException(InvoicesService.NOT_FOUND_MESSAGE);
    }
    this.assertServiceEnded(locked.endTime);

    if (locked.paymentId) {
      if (locked.paymentMethod !== method) {
        throw new ConflictException(
          'La factura ya tiene un cobro registrado con otro método',
        );
      }
      const existing = await this.findRecordInTransaction(tx, invoiceId, user);
      return { isNew: false, invoice: toInvoiceResponse(existing) };
    }

    const payment = await tx.payment.create({
      data: {
        organizationId: user.organizationId,
        invoiceId,
        method,
        paidAt: new Date(),
        recordedByUserId: user.id,
      },
      select: { id: true },
    });
    await this.audit.logTransactional(
      {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'RECORD_INVOICE_PAYMENT',
        entity: 'Payment',
        entityId: payment.id,
      },
      tx,
    );

    const created = await this.findRecordInTransaction(tx, invoiceId, user);
    return { isNew: true, invoice: toInvoiceResponse(created) };
  }

  private authorizedWhere(
    user: RequestUser,
    extra: Prisma.InvoiceWhereInput = {},
  ): Prisma.InvoiceWhereInput {
    return {
      ...extra,
      organizationId: user.organizationId,
      booking: {
        organizationId: user.organizationId,
        ...(user.role === UserRole.BARBER
          ? {
              professional: {
                organizationId: user.organizationId,
                userId: user.id,
              },
            }
          : {}),
      },
    };
  }

  private async findRecord(
    id: string,
    user: RequestUser,
  ): Promise<InvoiceResponseRecord | null> {
    return this.prisma.db.invoice.findFirst({
      where: this.authorizedWhere(user, { id }),
      select: invoiceResponseSelect,
    });
  }

  private async findRecordByBooking(
    bookingId: string,
    user: RequestUser,
  ): Promise<InvoiceResponseRecord | null> {
    return this.prisma.db.invoice.findFirst({
      where: this.authorizedWhere(user, { bookingId }),
      select: invoiceResponseSelect,
    });
  }

  private async findRecordInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    user: RequestUser,
  ): Promise<InvoiceResponseRecord> {
    const record = await tx.invoice.findFirst({
      where: this.authorizedWhere(user, { id }),
      select: invoiceResponseSelect,
    });
    if (!record) throw new NotFoundException(InvoicesService.NOT_FOUND_MESSAGE);
    return record;
  }

  private toValidSnapshot(value: string): Prisma.Decimal {
    const amount = new Prisma.Decimal(value);
    const [integer, fraction = ''] = amount.toFixed().split('.');
    const integerDigits = integer.replace('-', '').replace(/^0+/, '').length;
    const significantFractionDigits = fraction.replace(/0+$/, '').length;
    if (amount.lte(0) || integerDigits > 63 || significantFractionDigits > 2) {
      throw new ConflictException(
        'El precio del servicio no permite emitir una factura válida',
      );
    }
    return amount;
  }

  private assertServiceEnded(endTime: Date): void {
    if (endTime.getTime() > Date.now()) {
      throw new ConflictException(
        'No se puede operar la facturación antes de que termine el servicio',
      );
    }
  }

  private async runSerializable<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (
      let attempt = 1;
      attempt <= InvoicesService.MAX_SERIALIZATION_ATTEMPTS;
      attempt++
    ) {
      try {
        return await this.prisma.db.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error: unknown) {
        if (
          isSerializationFailureError(error) &&
          attempt < InvoicesService.MAX_SERIALIZATION_ATTEMPTS
        ) {
          continue;
        }
        if (isSerializationFailureError(error)) {
          throw new ConflictException(
            'La operación financiera no pudo completarse de forma segura',
          );
        }
        throw error;
      }
    }
    throw new ConflictException(
      'La operación financiera no pudo completarse de forma segura',
    );
  }
}
