import {
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BookingStatus,
  Prisma,
  ProfessionalStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../auth/types/authenticated-request';
import {
  getZonedDateParts,
  isValidTimeZone,
  utcRangeForLocalDate,
} from '../professionals/professional-availability.util';
import { SummaryQueryDto } from './dto/summary-query.dto';

const PAGE_SIZE = 20;
const pageInfo = (page: number, total: number) => ({
  page,
  limit: PAGE_SIZE,
  total,
  totalPages: Math.ceil(total / PAGE_SIZE),
});

@Injectable()
export class DashboardSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: RequestUser, query: SummaryQueryDto) {
    try {
      return await this.prisma.db.$transaction(
        (tx) => this.read(tx, user, query, new Date()),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          maxWait: 2_000,
          timeout: 8_000,
        },
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'No pudimos cargar la agenda del día. Vuelve a intentarlo.',
      );
    }
  }

  private async read(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    query: SummaryQueryDto,
    now: Date,
  ) {
    const organizationId = user.organizationId;
    const organization = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { timeZone: true },
    });
    if (!organization)
      throw new NotFoundException('Organización no encontrada');
    const { timeZone } = organization;
    if (!isValidTimeZone(timeZone)) {
      throw new ServiceUnavailableException(
        'No fue posible calcular el día del negocio.',
      );
    }
    const today = getZonedDateParts(now, timeZone).date;
    const range = utcRangeForLocalDate(today, timeZone);
    const from = range?.start;
    const to = range?.end;
    if (!from || !to) {
      throw new ServiceUnavailableException(
        'No fue posible calcular el día del negocio.',
      );
    }

    const barber = user.role === UserRole.BARBER;
    const ownProfessional = barber
      ? await tx.professional.findFirst({
          where: { organizationId, userId: user.id },
          select: { id: true },
        })
      : null;
    const baseWhere: Prisma.BookingWhereInput = {
      organizationId,
      // A missing link must never turn into an unrestricted query.
      ...(barber
        ? {
            professionalId: { in: ownProfessional ? [ownProfessional.id] : [] },
          }
        : {}),
    };
    const todayWhere: Prisma.BookingWhereInput = {
      ...baseWhere,
      startTime: { gte: from, lt: to },
    };
    const [items, total, completed, nextBooking] = await Promise.all([
      tx.booking.findMany({
        where: todayWhere,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          client: { select: { name: true } },
          service: { select: { name: true } },
          professional: { select: { name: true } },
        },
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
        skip: (query.agendaPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      tx.booking.count({ where: todayWhere }),
      tx.booking.count({
        where: { ...todayWhere, status: BookingStatus.COMPLETED },
      }),
      tx.booking.findFirst({
        where: { ...todayWhere, startTime: { gte: now, lt: to } },
        select: { id: true },
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
      }),
    ]);
    const workload = barber
      ? null
      : await this.readWorkload(
          tx,
          organizationId,
          from,
          to,
          query.workloadPage,
        );
    const anyBooking = barber
      ? null
      : await tx.booking.findFirst({
          where: baseWhere,
          select: { id: true },
        });
    const anyProfessional = barber
      ? null
      : await tx.professional.findFirst({
          where: {
            organizationId,
            status: { not: ProfessionalStatus.ARCHIVED },
          },
          select: { id: true },
        });
    return {
      generatedAt: now.toISOString(),
      timeZone,
      agenda: {
        items,
        ...pageInfo(query.agendaPage, total),
        completed,
        nextBookingId: nextBooking?.id ?? null,
      },
      workload,
      isBrandNew: !barber && !anyBooking && !anyProfessional,
    };
  }

  private async readWorkload(
    tx: Prisma.TransactionClient,
    organizationId: string,
    from: Date,
    to: Date,
    page: number,
  ) {
    const where = { organizationId, status: ProfessionalStatus.ACTIVE };
    const bookingsWhere = { organizationId, startTime: { gte: from, lt: to } };
    const [professionals, total, idleCount] = await Promise.all([
      tx.professional.findMany({
        where,
        select: {
          id: true,
          name: true,
          _count: { select: { bookings: { where: bookingsWhere } } },
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      tx.professional.count({ where }),
      tx.professional.count({
        where: { ...where, bookings: { none: bookingsWhere } },
      }),
    ]);
    return {
      items: professionals.map(({ id, name, _count }) => ({
        id,
        name,
        count: _count.bookings,
      })),
      ...pageInfo(page, total),
      idleCount,
    };
  }
}
