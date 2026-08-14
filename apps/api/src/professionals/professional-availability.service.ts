import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AvailabilityBlockStatus, BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { lockProfessionalForBookingIntegrity } from '../common/professional-booking-lock';
import { resolveBusinessHours } from '../public-booking/availability.util';
import {
  AvailabilityBlockResponseDto,
  CreateAvailabilityBlockDto,
  ProfessionalAvailabilityResponseDto,
  QueryProfessionalAvailabilityDto,
  ReplaceWeeklyScheduleDto,
  UpdateAvailabilityBlockDto,
  WeeklyShiftResponseDto,
} from './dto/professional-availability.dto';
import {
  AvailabilityWindow,
  addDaysToIsoDate,
  isIntervalInsideWindows,
  isValidTimeZone,
  minuteToHHmm,
  parseHHmm,
  zonedLocalDateTimeToUtc,
} from './professional-availability.util';

const FUTURE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];
const DEFAULT_BLOCK_QUERY_DAYS = 90;
const MAX_BLOCK_QUERY_DAYS = 366;
const AVAILABILITY_CONFLICT_MESSAGE =
  'El profesional no está disponible en ese horario';

interface AvailabilityContext {
  timeZone: string;
  globalOpenMinute: number;
  globalCloseMinute: number;
  schedules: Map<string, AvailabilityWindow[]>;
  blocks: Map<string, Array<{ startTime: Date; endTime: Date }>>;
}

@Injectable()
export class ProfessionalAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getForProfessional(
    professionalId: string,
    organizationId: string,
    query: QueryProfessionalAvailabilityDto,
  ): Promise<ProfessionalAvailabilityResponseDto> {
    await this.assertProfessionalExists(professionalId, organizationId);
    return this.buildResponse(professionalId, organizationId, query);
  }

  async getForOwnProfile(
    userId: string,
    organizationId: string,
    query: QueryProfessionalAvailabilityDto,
  ): Promise<ProfessionalAvailabilityResponseDto> {
    const professionalId = await this.resolveOwnProfessionalId(
      userId,
      organizationId,
    );
    return this.buildResponse(professionalId, organizationId, query);
  }

  async replaceWeeklySchedule(
    professionalId: string,
    organizationId: string,
    actorUserId: string,
    dto: ReplaceWeeklyScheduleDto,
  ): Promise<ProfessionalAvailabilityResponseDto> {
    const shifts = this.normalizeAndValidateShifts(dto);
    await this.prisma.db.$transaction(async (transaction) => {
      await this.lockOwnedProfessionalOrThrow(
        transaction,
        professionalId,
        organizationId,
      );
      await this.assertFutureBookingsRemainAvailable(
        transaction,
        professionalId,
        organizationId,
        shifts,
      );
      await transaction.professionalWeeklySchedule.deleteMany({
        where: { professionalId, organizationId },
      });
      if (shifts.length > 0) {
        await transaction.professionalWeeklySchedule.createMany({
          data: shifts.map((shift) => ({
            organizationId,
            professionalId,
            ...shift,
          })),
        });
      }
    });

    await this.auditAvailability(
      organizationId,
      actorUserId,
      'WEEKLY_UPDATE',
      professionalId,
    );
    return this.buildResponse(professionalId, organizationId, {});
  }

  async replaceOwnWeeklySchedule(
    userId: string,
    organizationId: string,
    dto: ReplaceWeeklyScheduleDto,
  ): Promise<ProfessionalAvailabilityResponseDto> {
    const professionalId = await this.resolveOwnProfessionalId(
      userId,
      organizationId,
    );
    return this.replaceWeeklySchedule(
      professionalId,
      organizationId,
      userId,
      dto,
    );
  }

  async createBlock(
    professionalId: string,
    organizationId: string,
    actorUserId: string,
    dto: CreateAvailabilityBlockDto,
  ): Promise<AvailabilityBlockResponseDto> {
    const range = this.normalizeBlockRange(dto.startTime, dto.endTime);
    this.assertFutureBlockEnd(range.endTime);
    const note = this.normalizeNote(dto.note);
    const block = await this.prisma.db.$transaction(async (transaction) => {
      await this.lockOwnedProfessionalOrThrow(
        transaction,
        professionalId,
        organizationId,
      );
      await this.assertBlockDoesNotAffectFutureBookings(
        transaction,
        professionalId,
        organizationId,
        range.startTime,
        range.endTime,
      );
      return transaction.professionalAvailabilityBlock.create({
        data: {
          organizationId,
          professionalId,
          ...range,
          note,
        },
        select: this.blockSelect,
      });
    });

    await this.auditAvailability(
      organizationId,
      actorUserId,
      'BLOCK_CREATE',
      block.id,
    );
    return block;
  }

  async createOwnBlock(
    userId: string,
    organizationId: string,
    dto: CreateAvailabilityBlockDto,
  ): Promise<AvailabilityBlockResponseDto> {
    const professionalId = await this.resolveOwnProfessionalId(
      userId,
      organizationId,
    );
    return this.createBlock(professionalId, organizationId, userId, dto);
  }

  async updateBlock(
    professionalId: string,
    blockId: string,
    organizationId: string,
    actorUserId: string,
    dto: UpdateAvailabilityBlockDto,
  ): Promise<AvailabilityBlockResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Debe enviar al menos un campo para actualizar el bloqueo',
      );
    }

    const updated = await this.prisma.db.$transaction(async (transaction) => {
      await this.lockOwnedProfessionalOrThrow(
        transaction,
        professionalId,
        organizationId,
      );
      const current = await transaction.professionalAvailabilityBlock.findFirst(
        {
          where: { id: blockId, professionalId, organizationId },
          select: this.blockSelect,
        },
      );
      if (!current) {
        throw new NotFoundException('Bloqueo de disponibilidad no encontrado');
      }

      const range = this.normalizeBlockRange(
        dto.startTime ?? current.startTime.toISOString(),
        dto.endTime ?? current.endTime.toISOString(),
      );
      const status = dto.status ?? current.status;
      if (status === AvailabilityBlockStatus.ACTIVE) {
        this.assertFutureBlockEnd(range.endTime);
        await this.assertBlockDoesNotAffectFutureBookings(
          transaction,
          professionalId,
          organizationId,
          range.startTime,
          range.endTime,
        );
      }

      return transaction.professionalAvailabilityBlock.update({
        where: { id: blockId, organizationId, professionalId },
        data: {
          ...range,
          status,
          ...(dto.note !== undefined
            ? { note: this.normalizeNote(dto.note) }
            : {}),
        },
        select: this.blockSelect,
      });
    });

    await this.auditAvailability(
      organizationId,
      actorUserId,
      'BLOCK_UPDATE',
      updated.id,
    );
    return updated;
  }

  async updateOwnBlock(
    userId: string,
    blockId: string,
    organizationId: string,
    dto: UpdateAvailabilityBlockDto,
  ): Promise<AvailabilityBlockResponseDto> {
    const professionalId = await this.resolveOwnProfessionalId(
      userId,
      organizationId,
    );
    return this.updateBlock(
      professionalId,
      blockId,
      organizationId,
      userId,
      dto,
    );
  }

  /**
   * The caller must already hold the shared Professional FOR UPDATE lock.
   * This keeps the availability read and the Booking write in the same
   * serialized transaction as archive and availability mutations.
   */
  async assertAvailableForBooking(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    professionalId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<void> {
    const context = await this.loadContext(
      transaction,
      organizationId,
      [professionalId],
      startTime,
      endTime,
    );
    if (
      !this.isAvailableInContext(context, professionalId, startTime, endTime)
    ) {
      throw new ConflictException(AVAILABILITY_CONFLICT_MESSAGE);
    }
  }

  async getPublicContext(
    organizationId: string,
    professionalIds: string[],
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<AvailabilityContext> {
    return this.loadContext(
      this.prisma.db,
      organizationId,
      professionalIds,
      rangeStart,
      rangeEnd,
    );
  }

  isAvailableInContext(
    context: AvailabilityContext,
    professionalId: string,
    startTime: Date,
    endTime: Date,
  ): boolean {
    if (
      !isIntervalInsideWindows(
        startTime,
        endTime,
        context.timeZone,
        context.globalOpenMinute,
        context.globalCloseMinute,
        context.schedules.get(professionalId) ?? [],
      )
    ) {
      return false;
    }
    return !(context.blocks.get(professionalId) ?? []).some(
      (block) => startTime < block.endTime && endTime > block.startTime,
    );
  }

  getUtcRangeForLocalDate(
    date: string,
    timeZone: string,
  ): { start: Date; end: Date } {
    const start = zonedLocalDateTimeToUtc(date, '00:00', timeZone);
    const end = zonedLocalDateTimeToUtc(
      addDaysToIsoDate(date, 1),
      '00:00',
      timeZone,
    );
    if (!start || !end) throw new BadRequestException('Fecha inválida');
    return { start, end };
  }

  private readonly blockSelect = {
    id: true,
    startTime: true,
    endTime: true,
    status: true,
    note: true,
  } satisfies Prisma.ProfessionalAvailabilityBlockSelect;

  private async buildResponse(
    professionalId: string,
    organizationId: string,
    query: QueryProfessionalAvailabilityDto,
  ): Promise<ProfessionalAvailabilityResponseDto> {
    const { from, to } = this.resolveBlockQueryRange(query);
    const [organization, schedule, blocks] = await Promise.all([
      this.prisma.db.organization.findUnique({
        where: { id: organizationId },
        select: { timeZone: true },
      }),
      this.prisma.db.professionalWeeklySchedule.findMany({
        where: { professionalId, organizationId },
        orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
        select: {
          id: true,
          dayOfWeek: true,
          startMinute: true,
          endMinute: true,
        },
      }),
      this.prisma.db.professionalAvailabilityBlock.findMany({
        where: {
          professionalId,
          organizationId,
          startTime: { lt: to },
          endTime: { gt: from },
          ...(query.status ? { status: query.status } : {}),
        },
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
        select: this.blockSelect,
      }),
    ]);
    if (!organization)
      throw new NotFoundException('Organización no encontrada');

    return {
      professionalId,
      timeZone: organization.timeZone,
      inheritsOrganizationHours: schedule.length === 0,
      weeklySchedule: schedule.map((item): WeeklyShiftResponseDto => ({
        id: item.id,
        dayOfWeek: item.dayOfWeek,
        startTime: minuteToHHmm(item.startMinute),
        endTime: minuteToHHmm(item.endMinute),
      })),
      blocks,
    };
  }

  private async loadContext(
    db: Prisma.TransactionClient,
    organizationId: string,
    professionalIds: string[],
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<AvailabilityContext> {
    const [organization, schedules, blocks] = await Promise.all([
      db.organization.findUnique({
        where: { id: organizationId },
        select: { timeZone: true, businessHours: true },
      }),
      db.professionalWeeklySchedule.findMany({
        where: { organizationId, professionalId: { in: professionalIds } },
        select: {
          professionalId: true,
          dayOfWeek: true,
          startMinute: true,
          endMinute: true,
        },
      }),
      db.professionalAvailabilityBlock.findMany({
        where: {
          organizationId,
          professionalId: { in: professionalIds },
          status: AvailabilityBlockStatus.ACTIVE,
          startTime: { lt: rangeEnd },
          endTime: { gt: rangeStart },
        },
        select: { professionalId: true, startTime: true, endTime: true },
      }),
    ]);
    if (!organization)
      throw new NotFoundException('Organización no encontrada');
    if (!isValidTimeZone(organization.timeZone)) {
      throw new ConflictException(
        'La zona horaria de la organización no es válida',
      );
    }
    const globalHours = resolveBusinessHours(organization.businessHours);
    const scheduleMap = new Map<string, AvailabilityWindow[]>();
    for (const schedule of schedules) {
      const values = scheduleMap.get(schedule.professionalId) ?? [];
      values.push(schedule);
      scheduleMap.set(schedule.professionalId, values);
    }
    const blockMap = new Map<
      string,
      Array<{ startTime: Date; endTime: Date }>
    >();
    for (const block of blocks) {
      const values = blockMap.get(block.professionalId) ?? [];
      values.push(block);
      blockMap.set(block.professionalId, values);
    }
    return {
      timeZone: organization.timeZone,
      globalOpenMinute: globalHours.openMinutes,
      globalCloseMinute: globalHours.closeMinutes,
      schedules: scheduleMap,
      blocks: blockMap,
    };
  }

  private normalizeAndValidateShifts(
    dto: ReplaceWeeklyScheduleDto,
  ): AvailabilityWindow[] {
    const shifts = dto.shifts
      .map((shift) => ({
        dayOfWeek: shift.dayOfWeek,
        startMinute: parseHHmm(shift.startTime),
        endMinute: parseHHmm(shift.endTime),
      }))
      .sort(
        (left, right) =>
          left.dayOfWeek - right.dayOfWeek ||
          left.startMinute - right.startMinute,
      );
    for (let index = 0; index < shifts.length; index += 1) {
      const current = shifts[index];
      if (current.startMinute >= current.endMinute) {
        throw new BadRequestException(
          'Cada turno debe terminar después de su hora de inicio',
        );
      }
      const previous = shifts[index - 1];
      if (
        previous &&
        previous.dayOfWeek === current.dayOfWeek &&
        previous.endMinute > current.startMinute
      ) {
        throw new BadRequestException(
          'Los turnos semanales de un mismo día no pueden solaparse',
        );
      }
    }
    return shifts;
  }

  private normalizeBlockRange(startValue: string, endValue: string) {
    const startTime = new Date(startValue);
    const endTime = new Date(endValue);
    if (
      Number.isNaN(startTime.getTime()) ||
      Number.isNaN(endTime.getTime()) ||
      endTime <= startTime
    ) {
      throw new BadRequestException(
        'El bloqueo debe tener un rango de tiempo válido',
      );
    }
    return { startTime, endTime };
  }

  private assertFutureBlockEnd(endTime: Date): void {
    if (endTime <= new Date()) {
      throw new BadRequestException(
        'El bloqueo activo debe finalizar en una fecha futura',
      );
    }
  }

  private normalizeNote(value: string | null | undefined): string | null {
    if (value == null) return null;
    return value.trim() || null;
  }

  private resolveBlockQueryRange(query: QueryProfessionalAvailabilityDto) {
    const from = query.from ? new Date(query.from) : new Date();
    const to = query.to
      ? new Date(query.to)
      : new Date(from.getTime() + DEFAULT_BLOCK_QUERY_DAYS * 86400000);
    if (to <= from) {
      throw new BadRequestException('to debe ser posterior a from');
    }
    if (to.getTime() - from.getTime() > MAX_BLOCK_QUERY_DAYS * 86400000) {
      throw new BadRequestException(
        `El rango máximo de bloqueos es ${MAX_BLOCK_QUERY_DAYS} días`,
      );
    }
    return { from, to };
  }

  private async assertFutureBookingsRemainAvailable(
    transaction: Prisma.TransactionClient,
    professionalId: string,
    organizationId: string,
    proposedSchedule: AvailabilityWindow[],
  ): Promise<void> {
    const bookings = await transaction.booking.findMany({
      where: {
        professionalId,
        organizationId,
        startTime: { gt: new Date() },
        status: { in: FUTURE_BOOKING_STATUSES },
      },
      select: { startTime: true, endTime: true },
    });
    if (bookings.length === 0) return;
    const rangeStart = bookings.reduce(
      (minimum, booking) =>
        booking.startTime < minimum ? booking.startTime : minimum,
      bookings[0].startTime,
    );
    const rangeEnd = bookings.reduce(
      (maximum, booking) =>
        booking.endTime > maximum ? booking.endTime : maximum,
      bookings[0].endTime,
    );
    const context = await this.loadContext(
      transaction,
      organizationId,
      [professionalId],
      rangeStart,
      rangeEnd,
    );
    context.schedules.set(professionalId, proposedSchedule);
    if (
      bookings.some(
        (booking) =>
          !this.isAvailableInContext(
            context,
            professionalId,
            booking.startTime,
            booking.endTime,
          ),
      )
    ) {
      throw new ConflictException(
        'El nuevo horario afecta reservas futuras pendientes o confirmadas',
      );
    }
  }

  private async assertBlockDoesNotAffectFutureBookings(
    transaction: Prisma.TransactionClient,
    professionalId: string,
    organizationId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<void> {
    const booking = await transaction.booking.findFirst({
      where: {
        professionalId,
        organizationId,
        status: { in: FUTURE_BOOKING_STATUSES },
        startTime: { gt: new Date(), lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });
    if (booking) {
      throw new ConflictException(
        'El bloqueo afecta una reserva futura pendiente o confirmada',
      );
    }
  }

  private async assertProfessionalExists(
    professionalId: string,
    organizationId: string,
  ): Promise<void> {
    const professional = await this.prisma.db.professional.findFirst({
      where: { id: professionalId, organizationId },
      select: { id: true },
    });
    if (!professional) throw new NotFoundException('Profesional no encontrado');
  }

  private async resolveOwnProfessionalId(
    userId: string,
    organizationId: string,
  ): Promise<string> {
    const professional = await this.prisma.db.professional.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (!professional) {
      throw new NotFoundException(
        'No tienes un perfil profesional vinculado en esta organización',
      );
    }
    return professional.id;
  }

  private async lockOwnedProfessionalOrThrow(
    transaction: Prisma.TransactionClient,
    professionalId: string,
    organizationId: string,
  ): Promise<void> {
    const professional = await lockProfessionalForBookingIntegrity(
      transaction,
      professionalId,
      organizationId,
    );
    if (!professional) throw new NotFoundException('Profesional no encontrado');
  }

  private async auditAvailability(
    organizationId: string,
    userId: string,
    action: 'WEEKLY_UPDATE' | 'BLOCK_CREATE' | 'BLOCK_UPDATE',
    entityId: string,
  ): Promise<void> {
    await this.audit.log({
      organizationId,
      userId,
      action,
      entity: 'ProfessionalAvailability',
      entityId,
    });
  }
}
