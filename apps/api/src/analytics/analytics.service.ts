import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  addDaysToIsoDate,
  getZonedDateParts,
  isValidTimeZone,
  utcRangeForLocalDate,
} from '../professionals/professional-availability.util';

// Ventana fija de 30 días para "profesional del mes" — no se expone como
// parámetro configurable todavía porque nadie lo pidió (YAGNI). Si se
// necesita un rango elegible más adelante, es un cambio de una línea aquí.
const TOP_PROFESSIONAL_WINDOW_DAYS = 30;
const DASHBOARD_READ_MAX_WAIT_MS = 2_000;
const DASHBOARD_READ_TIMEOUT_MS = 8_000;

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const now = new Date();
    return this.prisma.db.$transaction(
      (transaction) =>
        this.getDashboardInTransaction(transaction, organizationId, now),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        maxWait: DASHBOARD_READ_MAX_WAIT_MS,
        timeout: DASHBOARD_READ_TIMEOUT_MS,
      },
    );
  }

  private async getDashboardInTransaction(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    now: Date,
  ) {
    const organization = await transaction.organization.findUnique({
      where: { id: organizationId },
      select: { timeZone: true },
    });
    if (!organization)
      throw new NotFoundException('Organización no encontrada');
    const {
      startOfToday,
      startOfYesterday,
      startOf7DaysAgo,
      startOfTomorrow,
      startOfWindow,
    } = this.getDateBoundaries(now, organization.timeZone);

    const [
      revenueToday,
      revenueYesterday,
      revenueLast7Days,
      bookingsToday,
      bookingsPending,
      bookingsCancelledToday,
      topProfessionalGroup,
    ] = await Promise.all([
      this.sumPaidInvoices(
        transaction,
        organizationId,
        startOfToday,
        startOfTomorrow,
      ),
      this.sumPaidInvoices(
        transaction,
        organizationId,
        startOfYesterday,
        startOfToday,
      ),
      this.sumPaidInvoices(
        transaction,
        organizationId,
        startOf7DaysAgo,
        startOfTomorrow,
      ),
      transaction.booking.count({
        where: {
          organizationId,
          startTime: { gte: startOfToday, lt: startOfTomorrow },
        },
      }),
      transaction.booking.count({
        where: { organizationId, status: BookingStatus.PENDING },
      }),
      transaction.booking.count({
        where: {
          organizationId,
          status: BookingStatus.CANCELLED,
          updatedAt: { gte: startOfToday, lt: startOfTomorrow },
        },
      }),
      transaction.booking.groupBy({
        by: ['professionalId'],
        where: {
          organizationId,
          status: BookingStatus.COMPLETED,
          startTime: { gte: startOfWindow, lt: startOfTomorrow },
        },
        _count: { _all: true },
        orderBy: { _count: { professionalId: 'desc' } },
        take: 1,
      }),
    ]);

    let topProfessional: {
      id: string;
      name: string;
      completedBookings: number;
    } | null = null;

    if (topProfessionalGroup.length > 0) {
      const top = topProfessionalGroup[0];
      const professional = await transaction.professional.findFirst({
        where: { id: top.professionalId, organizationId },
        select: { id: true, name: true },
      });
      if (professional) {
        topProfessional = {
          id: professional.id,
          name: professional.name,
          completedBookings: top._count._all,
        };
      }
    }

    return {
      generatedAt: now.toISOString(),
      revenue: {
        today: revenueToday,
        yesterday: revenueYesterday,
        last7Days: revenueLast7Days,
      },
      bookings: {
        today: bookingsToday,
        pending: bookingsPending,
        cancelled: bookingsCancelledToday,
      },
      topProfessional,
    };
  }

  private async sumPaidInvoices(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const result = await transaction.invoice.aggregate({
      where: {
        organizationId,
        payment: {
          is: {
            organizationId,
            paidAt: { gte: from, lt: to },
          },
        },
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  private getDateBoundaries(now: Date, timeZone: string) {
    if (!isValidTimeZone(timeZone)) {
      throw new InternalServerErrorException(
        'No fue posible calcular las métricas del negocio',
      );
    }
    const today = getZonedDateParts(now, timeZone).date;
    const atStart = (date: string | null) =>
      date ? utcRangeForLocalDate(date, timeZone)?.start : null;
    const startOfToday = atStart(today);
    const startOfYesterday = atStart(addDaysToIsoDate(today, -1));
    const startOf7DaysAgo = atStart(addDaysToIsoDate(today, -6));
    const startOfTomorrow = utcRangeForLocalDate(today, timeZone)?.end;
    const startOfWindow = atStart(
      addDaysToIsoDate(today, 1 - TOP_PROFESSIONAL_WINDOW_DAYS),
    );
    if (
      !startOfToday ||
      !startOfYesterday ||
      !startOf7DaysAgo ||
      !startOfTomorrow ||
      !startOfWindow
    ) {
      throw new InternalServerErrorException(
        'No fue posible calcular las métricas del negocio',
      );
    }
    return {
      startOfToday,
      startOfYesterday,
      startOf7DaysAgo,
      startOfTomorrow,
      startOfWindow,
    };
  }
}
