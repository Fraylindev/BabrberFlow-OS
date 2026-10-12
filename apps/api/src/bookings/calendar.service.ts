import { createHash, createHmac } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  HttpException,
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
import { ProfessionalAvailabilityService } from '../professionals/professional-availability.service';
import { candidatesForPolicy } from '../business-schedule/business-schedule.policy';
import {
  addDaysToIsoDate,
  getZonedDateParts,
  zonedLocalDateTimeToUtc,
  isValidTimeZone,
} from '../professionals/professional-availability.util';
import {
  lockEmailBooking,
  recordBookingEmailChange,
} from '../notifications/notification-producer';
import { lockProfessionalForBookingIntegrity } from '../common/professional-booking-lock';
import { isBookingScheduleConflictError } from '../common/prisma-error.util';
import {
  CalendarQueryDto,
  CalendarRescheduleDto,
  RescheduleDaysQueryDto,
} from './dto/calendar.dto';

const unavailable = () => new NotFoundException('Reserva no disponible.');
const stale = () =>
  new ConflictException(
    'La reserva cambió mientras la editabas. Revisa sus datos antes de continuar.',
  );
export const calendarSelect = {
  id: true,
  startTime: true,
  endTime: true,
  status: true,
  updatedAt: true,
  client: { select: { name: true } },
  professional: { select: { id: true, name: true } },
  service: { select: { id: true, name: true } },
} satisfies Prisma.BookingSelect;
const internalSelect = {
  ...calendarSelect,
  organizationId: true,
  clientId: true,
  professionalId: true,
  serviceId: true,
  client: { select: { name: true, customerBookingRevision: true } },
} satisfies Prisma.BookingSelect;
type Row = Prisma.BookingGetPayload<{ select: typeof internalSelect }>;
export function calendarRevision(row: Row): string {
  return (
    'm3.' +
    createHash('sha256')
      .update(
        JSON.stringify([
          row.organizationId,
          row.id,
          row.clientId,
          row.professionalId,
          row.serviceId,
          row.startTime.toISOString(),
          row.endTime.toISOString(),
          row.status,
          row.updatedAt.toISOString(),
          row.client.customerBookingRevision.toString(),
        ]),
      )
      .digest('hex')
  );
}
function project(row: Row) {
  return {
    id: row.id,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    updatedAt: row.updatedAt,
    revision: calendarRevision(row),
    client: { name: row.client.name },
    professional: row.professional,
    service: row.service,
  };
}
export function calendarDates(
  from: string,
  to: string,
  max: number,
  inclusive = false,
) {
  if (
    !addDaysToIsoDate(from, 0) ||
    !addDaysToIsoDate(to, 0) ||
    from > to ||
    (!inclusive && from === to)
  )
    throw new BadRequestException('Revisa el rango de fechas.');
  const dates: string[] = [];
  let date: string | null = from;
  while (date && (inclusive ? date <= to : date < to) && dates.length <= max) {
    dates.push(date);
    date = addDaysToIsoDate(date, 1);
  }
  if (!dates.length || dates.length > max || !addDaysToIsoDate(to, 1))
    throw new BadRequestException('Revisa el rango de fechas.');
  return dates;
}
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: ProfessionalAvailabilityService,
  ) {}
  private async read<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    options: {
      isolationLevel: typeof Prisma.TransactionIsolationLevel.RepeatableRead;
      timeout?: number;
    },
  ): Promise<T> {
    try {
      return await this.prisma.db.$transaction(work, options);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // Only known type names; custom names, messages and stacks may contain PII.
      const knownNames = [
        'Error',
        'TypeError',
        'RangeError',
        'SyntaxError',
        'ReferenceError',
        'PrismaClientKnownRequestError',
        'PrismaClientUnknownRequestError',
        'PrismaClientInitializationError',
        'PrismaClientValidationError',
        'PrismaClientRustPanicError',
      ];
      const errorName =
        error instanceof Error
          ? knownNames.includes(error.name)
            ? error.name
            : 'Error'
          : 'NonError';
      this.logger.warn(`Calendar read failed: ${errorName}`);
      throw new ServiceUnavailableException(
        'No pudimos cargar la agenda o los horarios. Inténtalo de nuevo.',
      );
    }
  }
  private async scope(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    selected?: string,
  ) {
    if (user.role === UserRole.BARBER) {
      const own = await tx.professional.findFirst({
        where: { organizationId: user.organizationId, userId: user.id },
        select: { id: true },
      });
      if (selected && selected !== own?.id) throw unavailable();
      return own?.id ?? null;
    }
    if (
      selected &&
      !(await tx.professional.findFirst({
        where: { id: selected, organizationId: user.organizationId },
        select: { id: true },
      }))
    )
      throw unavailable();
    return selected;
  }
  private async row(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    id: string,
  ) {
    const professionalId = await this.scope(tx, user);
    if (professionalId === null) throw unavailable();
    const row = await tx.booking.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        ...(professionalId ? { professionalId } : {}),
      },
      select: internalSelect,
    });
    if (!row) throw unavailable();
    return row;
  }
  private async zone(tx: Prisma.TransactionClient, organizationId: string) {
    const org = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { timeZone: true },
    });
    if (!org) throw unavailable();
    if (!isValidTimeZone(org.timeZone))
      throw new ServiceUnavailableException('No pudimos cargar la agenda.');
    return org.timeZone;
  }
  async detail(user: RequestUser, id: string) {
    return this.read(async (tx) => project(await this.row(tx, user, id)), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  }
  private sign(value: string) {
    const secret =
      process.env.RATE_LIMIT_SECRET ?? process.env.JWT_SECRET ?? '';
    if (secret.length < 32)
      throw new ServiceUnavailableException(
        'Servicio temporalmente no disponible.',
      );
    return createHmac('sha256', secret).update(value).digest('hex');
  }
  async calendar(user: RequestUser, query: CalendarQueryDto) {
    const dates = calendarDates(query.from, query.to, 7);
    const limit = query.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200)
      throw new BadRequestException('Revisa el límite.');
    return this.read(
      async (tx) => {
        const timeZone = await this.zone(tx, user.organizationId);
        const rangeStart = this.availability.getUtcRangeForLocalDate(
          query.from,
          timeZone,
        ).start;
        // An exclusive civil boundary can be a skipped date. Use the last real day's end.
        let rangeEnd = rangeStart;
        for (const date of [...dates].reverse()) {
          try {
            rangeEnd = this.availability.getUtcRangeForLocalDate(
              date,
              timeZone,
            ).end;
            break;
          } catch (error) {
            if (!(error instanceof BadRequestException)) throw error;
          }
        }
        const professionalId = await this.scope(tx, user, query.professionalId);
        const where: Prisma.BookingWhereInput = {
          organizationId: user.organizationId,
          startTime: { lt: rangeEnd },
          endTime: { gt: rangeStart },
          ...(query.status ? { status: query.status } : {}),
          ...(professionalId ? { professionalId } : {}),
        };
        const result = {
          timeZone,
          from: query.from,
          to: query.to,
          rangeStart,
          rangeEnd,
          generatedAt: new Date(),
          items: [] as ReturnType<typeof project>[],
          nextCursor: null as string | null,
        };
        if (professionalId === null) return result;
        // Bounded temporal snapshot fingerprint in the DB; concurrent changes demand a complete restart.
        const [snapshot] = await tx.$queryRaw<{ digest: string }[]>(Prisma.sql`
        SELECT encode(sha256(convert_to(COALESCE(string_agg(jsonb_build_array(b."id",b."startTime",b."endTime",b."status",b."updatedAt",c."customerBookingRevision",c."name",p."name",s."name")::text,',' ORDER BY b."startTime",b."id"),''),'UTF8')),'hex') AS digest
        FROM "Booking" b JOIN "Client" c ON c."id"=b."clientId" AND c."organizationId"=b."organizationId"
        JOIN "Professional" p ON p."id"=b."professionalId" AND p."organizationId"=b."organizationId"
        JOIN "Service" s ON s."id"=b."serviceId" AND s."organizationId"=b."organizationId"
        WHERE b."organizationId"=${user.organizationId} AND b."startTime"<${rangeEnd} AND b."endTime">${rangeStart}
        ${query.status ? Prisma.sql`AND b."status"=${query.status}::"BookingStatus"` : Prisma.empty}
        ${professionalId ? Prisma.sql`AND b."professionalId"=${professionalId}` : Prisma.empty}
      `);
        const binding = this.sign(
          JSON.stringify([
            user.organizationId,
            user.id,
            user.role,
            professionalId,
            timeZone,
            query.from,
            query.to,
            query.status ?? null,
            limit,
          ]),
        );
        let last: { start: string; id: string } | undefined;
        if (query.cursor) {
          try {
            const cursor = JSON.parse(
              Buffer.from(query.cursor, 'base64url').toString(),
            ) as {
              binding: string;
              digest: string;
              start: string;
              id: string;
              mac: string;
            };
            const payload = JSON.stringify([
              cursor.binding,
              cursor.digest,
              cursor.start,
              cursor.id,
            ]);
            if (
              cursor.binding !== binding ||
              cursor.mac !== this.sign(payload) ||
              !Number.isFinite(new Date(cursor.start).getTime()) ||
              typeof cursor.id !== 'string'
            )
              throw new Error();
            if (cursor.digest !== snapshot.digest) throw stale();
            last = cursor;
          } catch (e) {
            if (e instanceof ConflictException) throw e;
            throw new BadRequestException('Cursor no válido.');
          }
        }
        const rows = await tx.booking.findMany({
          where: {
            ...where,
            ...(last
              ? {
                  OR: [
                    { startTime: { gt: new Date(last.start) } },
                    { startTime: new Date(last.start), id: { gt: last.id } },
                  ],
                }
              : {}),
          },
          select: internalSelect,
          orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
          take: limit + 1,
        });
        result.items = rows.slice(0, limit).map(project);
        if (rows.length > limit) {
          const end = rows[limit - 1],
            start = end.startTime.toISOString(),
            id = end.id,
            digest = snapshot.digest;
          result.nextCursor = Buffer.from(
            JSON.stringify({
              binding,
              digest,
              start,
              id,
              mac: this.sign(JSON.stringify([binding, digest, start, id])),
            }),
          ).toString('base64url');
        }
        return result;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  private eligible(row: Row) {
    if (
      ![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(
        row.status as 'PENDING' | 'CONFIRMED',
      )
    )
      throw new ConflictException('Esta reserva no admite cambios de fecha.');
  }
  private async slots(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    row: Row,
    date: string,
    now: Date,
  ) {
    this.eligible(row);
    const timeZone = await this.zone(tx, user.organizationId);
    const range = this.availability.getUtcRangeForLocalDate(date, timeZone);
    const professional = await tx.professional.findFirst({
      where: {
        id: row.professionalId,
        organizationId: user.organizationId,
        status: ProfessionalStatus.ACTIVE,
      },
      select: { id: true },
    });
    const service = await tx.service.findFirst({
      where: {
        id: row.serviceId,
        organizationId: user.organizationId,
        isActive: true,
      },
      select: { duration: true },
    });
    if (!professional || !service)
      throw new ConflictException('Los datos de la reserva cambiaron.');
    if (!Number.isSafeInteger(service.duration) || service.duration <= 0)
      throw new ServiceUnavailableException('No pudimos cargar los horarios.');
    const context = await this.availability.getPublicContext(
      user.organizationId,
      [row.professionalId],
      range.start,
      range.end,
      tx,
    );
    if (context.policy.state !== 'CONFIRMED' || !context.policy.zoneConfirmed)
      throw new ConflictException(
        'El negocio debe confirmar su horario antes de ofrecer nuevas horas.',
      );
    const occupied = await tx.booking.findMany({
      where: {
        organizationId: user.organizationId,
        professionalId: row.professionalId,
        id: { not: row.id },
        status: { not: BookingStatus.CANCELLED },
        startTime: { lt: range.end },
        endTime: { gt: range.start },
      },
      select: { startTime: true, endTime: true },
    });
    const current = getZonedDateParts(row.startTime, timeZone);
    const times = new Set(
      candidatesForPolicy(
        context.policy,
        date,
        getZonedDateParts(range.start, timeZone).dayOfWeek,
        service.duration,
      ),
    );
    const candidates = new Set<number>();
    for (const time of times) {
      const instant = zonedLocalDateTimeToUtc(date, time, timeZone);
      if (instant) candidates.add(instant.getTime());
    }
    const contextual = zonedLocalDateTimeToUtc(
      date,
      String(current.hour).padStart(2, '0') +
        ':' +
        String(current.minute).padStart(2, '0'),
      timeZone,
    );
    if (contextual)
      candidates.add(
        contextual.getTime() +
          row.startTime.getUTCSeconds() * 1000 +
          row.startTime.getUTCMilliseconds(),
      );
    // Preserve the exact persisted instant as well as its local clock on another day.
    if (current.date === date) candidates.add(row.startTime.getTime());
    const slots: { startTime: string; endTime: string }[] = [];
    for (const instant of [...candidates].sort((a, b) => a - b)) {
      const start = new Date(instant);
      if (start <= now) continue;
      const end = new Date(start.getTime() + service.duration * 60000);
      if (
        !occupied.some((b) => start < b.endTime && end > b.startTime) &&
        this.availability.isAvailableInContext(
          context,
          row.professionalId,
          start,
          end,
        )
      )
        slots.push({
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        });
    }
    return {
      bookingId: row.id,
      updatedAt: row.updatedAt,
      revision: calendarRevision(row),
      timeZone,
      date,
      slots,
    };
  }
  async availabilityForDate(user: RequestUser, id: string, date: string) {
    if (!addDaysToIsoDate(date, 0))
      throw new BadRequestException('Revisa la fecha.');
    return this.read(
      async (tx) =>
        this.slots(tx, user, await this.row(tx, user, id), date, new Date()),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async availabilityDays(
    user: RequestUser,
    id: string,
    query: RescheduleDaysQueryDto,
  ) {
    const dates = calendarDates(query.from, query.to, 31, true);
    return this.read(
      async (tx) => {
        const row = await this.row(tx, user, id),
          now = new Date(),
          timeZone = await this.zone(tx, user.organizationId);
        if (query.from < getZonedDateParts(now, timeZone).date)
          throw new BadRequestException(
            'Elige fechas desde hoy en el negocio.',
          );
        const availableDates: string[] = [];
        for (const date of dates)
          if ((await this.slots(tx, user, row, date, now)).slots.length)
            availableDates.push(date);
        return {
          bookingId: id,
          updatedAt: row.updatedAt,
          revision: calendarRevision(row),
          timeZone,
          from: query.from,
          to: query.to,
          availableDates,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 15000,
      },
    );
  }
  async reschedule(user: RequestUser, id: string, dto: CalendarRescheduleDto) {
    try {
      return await this.prisma.db.$transaction(async (tx) => {
        // Uniform 404 before locking; lock helper follows Organization -> Client -> Booking.
        await this.row(tx, user, id);
        try {
          await lockEmailBooking(tx, user.organizationId, id);
        } catch (e) {
          if (e instanceof NotFoundException) throw unavailable();
          throw e;
        }
        const before = await this.row(tx, user, id);
        if (
          dto.expectedUpdatedAt !== before.updatedAt.toISOString() ||
          dto.expectedRevision !== calendarRevision(before)
        )
          throw stale();
        this.eligible(before);
        const professional = await lockProfessionalForBookingIntegrity(
          tx,
          before.professionalId,
          user.organizationId,
        );
        if (professional?.status !== ProfessionalStatus.ACTIVE)
          throw new ConflictException('Los datos de la reserva cambiaron.');
        const start = new Date(dto.startTime);
        if (
          !/(?:Z|[+-]\d{2}:\d{2})$/.test(dto.startTime) ||
          !Number.isFinite(start.getTime()) ||
          start.getTime() === before.startTime.getTime()
        )
          throw new BadRequestException('Elige una nueva fecha y hora válida.');
        const zone = await this.zone(tx, user.organizationId),
          date = getZonedDateParts(start, zone).date;
        const candidate = (
          await this.slots(tx, user, before, date, new Date())
        ).slots.find((s) => s.startTime === start.toISOString());
        if (!candidate)
          throw new ConflictException(
            'Ese horario no está disponible. Elige otro.',
          );
        const updated = await tx.booking.update({
          where: { id, organizationId: user.organizationId },
          data: { startTime: start, endTime: new Date(candidate.endTime) },
          select: internalSelect,
        });
        await recordBookingEmailChange(
          tx,
          user.organizationId,
          { ...before },
          updated,
        );
        // Reload after AFTER trigger; relation select from UPDATE may precede trigger counter.
        const after = await this.row(tx, user, id);
        return {
          id: after.id,
          professionalId: after.professionalId,
          serviceId: after.serviceId,
          startTime: after.startTime,
          endTime: after.endTime,
          status: after.status,
          updatedAt: after.updatedAt,
          revision: calendarRevision(after),
        };
      });
    } catch (e) {
      if (isBookingScheduleConflictError(e))
        throw new ConflictException(
          'Ese horario no está disponible. Elige otro.',
        );
      throw e;
    }
  }
}
