import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BusinessScheduleState, Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { lockOrganizationSchedule } from '../common/organization-schedule-lock';
import { professionalRuleEffect } from './business-schedule.impact';
import {
  addDaysToIsoDate,
  isValidIsoDate,
  isValidTimeZone,
  localWindowToUtc,
  minuteToHHmm,
  parseHHmm,
  type AvailabilityWindow,
} from '../professionals/professional-availability.util';
import {
  BUSINESS_REGIONS,
  businessPolicySelect,
  insideBusinessPolicy,
  policyFromOrganization,
  type BusinessPolicy,
} from './business-schedule.policy';
import {
  ConfirmBusinessZoneDto,
  CreateBusinessClosureDto,
  ReplaceBusinessWeekDto,
  ScheduleClosuresQueryDto,
  SchedulePageDto,
  ScheduleRevisionDto,
} from './business-schedule.dto';

const STAFF = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.RECEPTIONIST,
  UserRole.BARBER,
];
const MANAGERS: UserRole[] = [UserRole.OWNER, UserRole.ADMIN];
type Tx = Prisma.TransactionClient;
type Actor = { organizationId: string; userId: string };
export function normalizeBusinessWeek(
  dto: ReplaceBusinessWeekDto,
): AvailabilityWindow[] {
  if (
    dto.week.length !== 7 ||
    new Set(dto.week.map((d) => d.dayOfWeek)).size !== 7 ||
    dto.week.some(
      (d) =>
        !Number.isInteger(d.dayOfWeek) ||
        d.dayOfWeek < 0 ||
        d.dayOfWeek > 6 ||
        d.windows.length > 5,
    )
  )
    throw new BadRequestException('Indica los siete días del horario.');
  const result: AvailabilityWindow[] = [];
  for (const day of [...dto.week].sort((a, b) => a.dayOfWeek - b.dayOfWeek)) {
    const windows = day.windows
      .map((w) => ({
        dayOfWeek: day.dayOfWeek,
        startMinute: parseHHmm(w.startTime),
        endMinute: parseHHmm(w.endTime),
      }))
      .sort((a, b) => a.startMinute - b.startMinute);
    let previous: AvailabilityWindow | undefined;
    for (const w of windows) {
      if (
        !Number.isInteger(w.startMinute) ||
        !Number.isInteger(w.endMinute) ||
        w.startMinute < 0 ||
        w.endMinute > 1440 ||
        w.startMinute >= w.endMinute
      )
        throw new BadRequestException('Revisa las horas de cada franja.');
      if (previous && previous.endMinute > w.startMinute)
        throw new BadRequestException(
          'Las franjas de un día no pueden solaparse.',
        );
      if (previous && previous.endMinute === w.startMinute)
        previous.endMinute = w.endMinute;
      else {
        previous = { ...w };
        result.push(previous);
      }
    }
  }
  return result;
}
function projectWeek(windows: AvailabilityWindow[]) {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    windows: windows
      .filter((w) => w.dayOfWeek === dayOfWeek)
      .map((w) => ({
        startTime: minuteToHHmm(w.startMinute),
        endTime: minuteToHHmm(w.endMinute),
      })),
  }));
}

@Injectable()
export class BusinessScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  regions() {
    return BUSINESS_REGIONS.filter((r) => isValidTimeZone(r.timeZone)).map(
      (r) => ({ id: r.id, label: r.label }),
    );
  }
  private async authorize(tx: Tx, actor: Actor, allowed: UserRole[]) {
    const membership = await tx.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: actor.userId,
          organizationId: actor.organizationId,
        },
      },
      select: { role: true },
    });
    if (!membership || !allowed.includes(membership.role))
      throw new ForbiddenException('No tienes permiso para esta acción.');
    return membership.role;
  }
  private async current(tx: Tx, actor: Actor) {
    const org = await tx.organization.findUnique({
      where: { id: actor.organizationId },
      select: businessPolicySelect,
    });
    if (!org) throw new NotFoundException('Información no disponible.');
    return { org, policy: policyFromOrganization(org) };
  }
  private async transaction<T>(
    work: (tx: Tx) => Promise<T>,
    read = false,
  ): Promise<T> {
    try {
      return await this.prisma.db.$transaction(work, {
        isolationLevel: read
          ? Prisma.TransactionIsolationLevel.RepeatableRead
          : Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 10000,
        timeout: 60000,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'No fue posible evaluar el horario. Intenta de nuevo.',
      );
    }
  }
  async read(organizationId: string, userId: string) {
    const actor = { organizationId, userId };
    return this.transaction(async (tx) => {
      const role = await this.authorize(tx, actor, STAFF);
      const { org, policy } = await this.current(tx, actor);
      const region = BUSINESS_REGIONS.find(
        (r) => r.timeZone === policy.timeZone,
      );
      const base = {
        revision: policy.revision,
        state: policy.state,
        zoneConfirmed: policy.zoneConfirmed,
        timeZone: policy.timeZone,
        region: region ? { id: region.id, label: region.label } : null,
        week: projectWeek(policy.windows),
        activeClosureCount: policy.closures.length,
      };
      if (!MANAGERS.includes(role)) return base;
      const dependencies = await this.dependencies(tx, organizationId);
      const raw = org.businessHours;
      const ignoredLegacyKeys =
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? Object.keys(raw).filter((k) => k !== 'open' && k !== 'close')
          : [];
      return {
        ...base,
        management: {
          legacyCategory: org.businessSchedule?.legacyCategory ?? null,
          ignoredLegacyKeys,
          proposedLegacyWeek:
            policy.state === BusinessScheduleState.LEGACY_UNCONFIRMED
              ? projectWeek(policy.windows)
              : null,
          zoneChangeAllowed: Object.values(dependencies).every((n) => n === 0),
          dependencies,
        },
      };
    }, true);
  }
  async closures(
    organizationId: string,
    userId: string,
    query: ScheduleClosuresQueryDto,
  ) {
    return this.transaction(async (tx) => {
      const role = await this.authorize(tx, { organizationId, userId }, STAFF);
      const manages = MANAGERS.includes(role);
      if (query.includeCancelled === 'true' && !manages)
        throw new ForbiddenException('No tienes permiso para esta acción.');
      const where = {
        organizationId,
        ...(query.includeCancelled === 'true'
          ? {}
          : { status: 'ACTIVE' as const }),
      };
      const total = await tx.businessClosure.count({ where });
      const rows = await tx.businessClosure.findMany({
        where,
        orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
        skip: query.offset,
        take: query.limit,
        select: {
          id: true,
          startDate: true,
          endDate: true,
          startMinute: true,
          endMinute: true,
          status: true,
          reason: manages,
          cancelledAt: true,
        },
      });
      return {
        total,
        offset: query.offset,
        limit: query.limit,
        items: rows.map((c) => ({
          id: c.id,
          startDate: c.startDate.toISOString().slice(0, 10),
          endDate: c.endDate.toISOString().slice(0, 10),
          startTime: minuteToHHmm(c.startMinute),
          endTime: minuteToHHmm(c.endMinute),
          status: c.status,
          ...(manages ? { reason: c.reason, cancelledAt: c.cancelledAt } : {}),
        })),
      };
    }, true);
  }
  private checkRevision(policy: BusinessPolicy, dto: ScheduleRevisionDto) {
    if (policy.revision !== dto.expectedRevision)
      throw new ConflictException({
        code: 'SCHEDULE_REVISION_CONFLICT',
        message:
          'El horario cambió mientras lo editabas. Actualiza para continuar.',
      });
  }
  private normalizeClosure(dto: CreateBusinessClosureDto, timeZone: string) {
    const startMinute = parseHHmm(dto.startTime),
      endMinute = parseHHmm(dto.endTime);
    if (
      !isValidIsoDate(dto.startDate) ||
      !isValidIsoDate(dto.endDate) ||
      dto.endDate < dto.startDate ||
      !Number.isInteger(startMinute) ||
      !Number.isInteger(endMinute) ||
      startMinute < 0 ||
      endMinute > 1440 ||
      startMinute >= endMinute ||
      (dto.startDate !== dto.endDate &&
        (startMinute !== 0 || endMinute !== 1440)) ||
      !addDaysToIsoDate(dto.endDate, 1)
    )
      throw new BadRequestException(
        'Indica fechas y horas válidas para el cierre.',
      );
    if (startMinute !== 0 || endMinute !== 1440) {
      if (!localWindowToUtc(dto.startDate, startMinute, endMinute, timeZone))
        throw new BadRequestException(
          'Esa hora no existe o se repite. Elige otra franja.',
        );
    }
    return {
      id: randomUUID(),
      startDate: dto.startDate,
      endDate: dto.endDate,
      startMinute,
      endMinute,
    };
  }
  private async dependencies(tx: Tx, organizationId: string) {
    const [bookings, blocks, closures, promotions, emailIntents] =
      await Promise.all([
        tx.booking.count({ where: { organizationId } }),
        tx.professionalAvailabilityBlock.count({ where: { organizationId } }),
        tx.businessClosure.count({ where: { organizationId } }),
        tx.mediaPromotion.count({
          where: {
            organizationId,
            OR: [
              { publishedRevision: { not: null } },
              { startsAtUtc: { not: null } },
              { endsAtUtc: { not: null } },
            ],
          },
        }),
        tx.emailOutbox.count({ where: { organizationId } }),
      ]);
    return { bookings, blocks, closures, promotions, emailIntents };
  }
  private async impact(
    tx: Tx,
    organizationId: string,
    before: BusinessPolicy,
    after: BusinessPolicy,
    now: Date,
    page: SchedulePageDto,
  ) {
    const [bookings, schedules, blocks, professionals] = await Promise.all([
      tx.booking.findMany({
        where: {
          organizationId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          endTime: { gt: now },
        },
        select: {
          id: true,
          professionalId: true,
          startTime: true,
          endTime: true,
        },
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
      }),
      tx.professionalWeeklySchedule.findMany({
        where: { organizationId },
        select: {
          professionalId: true,
          dayOfWeek: true,
          startMinute: true,
          endMinute: true,
        },
      }),
      tx.professionalAvailabilityBlock.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { professionalId: true, startTime: true, endTime: true },
      }),
      tx.professional.findMany({
        where: { organizationId },
        select: { id: true },
        orderBy: { id: 'asc' },
      }),
    ]);
    const byProfessional = new Map<string, AvailabilityWindow[]>();
    for (const s of schedules) {
      const values = byProfessional.get(s.professionalId) ?? [];
      values.push(s);
      byProfessional.set(s.professionalId, values);
    }
    const conflicts = bookings.filter(
      (b) =>
        !insideBusinessPolicy(
          after,
          b.startTime,
          b.endTime,
          byProfessional.get(b.professionalId) ?? [],
        ) ||
        blocks.some(
          (block) =>
            block.professionalId === b.professionalId &&
            b.startTime < block.endTime &&
            b.endTime > block.startTime,
        ),
    );
    const effects = professionals
      .map((p) => {
        const effect = professionalRuleEffect(
          before,
          after,
          byProfessional.get(p.id) ?? [],
        );
        return { professionalId: p.id, ...effect };
      })
      .filter((p) => p.gainedMinutes || p.lostMinutes);
    return {
      evaluatedAt: now.toISOString(),
      revision: before.revision,
      protectedBookingCount: bookings.length,
      conflictCount: conflicts.length,
      conflicts: {
        total: conflicts.length,
        offset: page.offset,
        limit: page.limit,
        items: conflicts.slice(page.offset, page.offset + page.limit),
      },
      professionalEffects: {
        basis:
          effects[0]?.basis ??
          (before.closures.length === after.closures.length
            ? 'RECURRING_WEEK'
            : 'DATED_RULE_MINUTES'),
        total: effects.length,
        offset: page.offset,
        limit: page.limit,
        items: effects.slice(page.offset, page.offset + page.limit),
      },
    };
  }
  async previewWeek(
    organizationId: string,
    userId: string,
    dto: ReplaceBusinessWeekDto,
    page: SchedulePageDto,
  ) {
    const windows = normalizeBusinessWeek(dto);
    return this.transaction(async (tx) => {
      await this.authorize(tx, { organizationId, userId }, MANAGERS);
      const { policy } = await this.current(tx, { organizationId, userId });
      this.checkRevision(policy, dto);
      return this.impact(
        tx,
        organizationId,
        policy,
        { ...policy, windows },
        new Date(),
        page,
      );
    }, true);
  }
  async previewClosure(
    organizationId: string,
    userId: string,
    dto: CreateBusinessClosureDto,
    page: SchedulePageDto,
  ) {
    return this.transaction(async (tx) => {
      await this.authorize(tx, { organizationId, userId }, MANAGERS);
      const { policy } = await this.current(tx, { organizationId, userId });
      this.checkRevision(policy, dto);
      const closure = this.normalizeClosure(dto, policy.timeZone);
      return {
        ...(await this.impact(
          tx,
          organizationId,
          policy,
          { ...policy, closures: [...policy.closures, closure] },
          new Date(),
          page,
        )),
        closure: { ...closure, id: undefined },
      };
    }, true);
  }
  private async saveRevision(tx: Tx, actor: Actor, operation: string) {
    const saved = await tx.businessSchedule.update({
      where: { organizationId: actor.organizationId },
      data: { revision: { increment: 1 } },
    });
    const { policy } = await this.current(tx, actor);
    await tx.businessScheduleRevision.create({
      data: {
        organizationId: actor.organizationId,
        revision: saved.revision,
        actorUserId: actor.userId,
        operation,
        snapshot: {
          state: policy.state,
          zoneConfirmed: policy.zoneConfirmed,
          timeZone: policy.timeZone,
          week: projectWeek(policy.windows),
          activeClosureIds: policy.closures.map((c) => c.id),
        },
      },
    });
    return {
      revision: saved.revision,
      state: policy.state,
      zoneConfirmed: policy.zoneConfirmed,
    };
  }
  private async mutate<T extends ScheduleRevisionDto>(
    organizationId: string,
    userId: string,
    dto: T,
    operation: string,
    allowed: UserRole[],
    work: (tx: Tx, policy: BusinessPolicy, now: Date) => Promise<void>,
  ) {
    const actor = { organizationId, userId };
    const result = await this.transaction(async (tx) => {
      await lockOrganizationSchedule(tx, organizationId);
      await this.authorize(tx, actor, allowed);
      const { policy } = await this.current(tx, actor);
      this.checkRevision(policy, dto);
      await tx.businessSchedule.upsert({
        where: { organizationId },
        create: { organizationId },
        update: {},
      });
      await work(tx, policy, new Date());
      return this.saveRevision(tx, actor, operation);
    });
    try {
      await this.audit.log({
        organizationId,
        userId,
        action: operation,
        entity: 'BusinessSchedule',
        entityId: `${organizationId}:${result.revision}`,
      });
    } catch {
      /* AuditLog fail-open; durable revision is already committed. */
    }
    return result;
  }
  async replaceWeek(
    organizationId: string,
    userId: string,
    dto: ReplaceBusinessWeekDto,
  ) {
    const windows = normalizeBusinessWeek(dto);
    return this.mutate(
      organizationId,
      userId,
      dto,
      'BUSINESS_WEEK_REPLACE',
      MANAGERS,
      async (tx, policy, now) => {
        if (!policy.zoneConfirmed)
          throw new ConflictException(
            'El propietario debe confirmar primero la región del negocio.',
          );
        const impact = await this.impact(
          tx,
          organizationId,
          policy,
          { ...policy, state: BusinessScheduleState.CONFIRMED, windows },
          now,
          new SchedulePageDto(),
        );
        if (impact.conflictCount)
          throw new ConflictException({
            code: 'SCHEDULE_BOOKING_CONFLICT',
            message:
              'Este cambio afectaría citas que ya tienes. Revísalas antes de guardar.',
            conflictCount: impact.conflictCount,
          });
        await tx.businessScheduleWindow.deleteMany({
          where: { organizationId },
        });
        await tx.businessScheduleDay.deleteMany({ where: { organizationId } });
        await tx.businessScheduleDay.createMany({
          data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
            organizationId,
            dayOfWeek,
          })),
        });
        if (windows.length)
          await tx.businessScheduleWindow.createMany({
            data: windows.map((w) => ({ organizationId, ...w })),
          });
        await tx.businessSchedule.update({
          where: { organizationId },
          data: {
            state: BusinessScheduleState.CONFIRMED,
            legacyPublicAllowed: false,
          },
        });
      },
    );
  }
  async createClosure(
    organizationId: string,
    userId: string,
    dto: CreateBusinessClosureDto,
  ) {
    let closureId: string | undefined;
    const result = await this.mutate(
      organizationId,
      userId,
      dto,
      'BUSINESS_CLOSURE_CREATE',
      MANAGERS,
      async (tx, policy, now) => {
        if (policy.state !== BusinessScheduleState.CONFIRMED)
          throw new ConflictException(
            'Confirma el horario antes de agregar cierres.',
          );
        const closure = this.normalizeClosure(dto, policy.timeZone);
        const impact = await this.impact(
          tx,
          organizationId,
          policy,
          { ...policy, closures: [...policy.closures, closure] },
          now,
          new SchedulePageDto(),
        );
        if (impact.conflictCount)
          throw new ConflictException({
            code: 'SCHEDULE_BOOKING_CONFLICT',
            message:
              'Este cierre afectaría citas que ya tienes. Revísalas antes de guardar.',
            conflictCount: impact.conflictCount,
          });
        const saved = await tx.businessClosure.create({
          data: {
            ...closure,
            organizationId,
            startDate: new Date(`${closure.startDate}T00:00:00.000Z`),
            endDate: new Date(`${closure.endDate}T00:00:00.000Z`),
            reason: dto.reason?.trim() || null,
          },
        });
        closureId = saved.id;
      },
    );
    return { ...result, closureId };
  }
  async cancelClosure(
    organizationId: string,
    userId: string,
    id: string,
    dto: ScheduleRevisionDto,
  ) {
    return this.mutate(
      organizationId,
      userId,
      dto,
      'BUSINESS_CLOSURE_CANCEL',
      MANAGERS,
      async (tx) => {
        const row = await tx.businessClosure.findFirst({
          where: { id, organizationId },
          select: { status: true },
        });
        if (!row) throw new NotFoundException('Cierre no encontrado.');
        if (row.status === 'CANCELLED')
          throw new ConflictException(
            'Este cierre ya se canceló. Actualiza para continuar.',
          );
        await tx.businessClosure.update({
          where: { id, organizationId },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
      },
    );
  }
  async confirmZone(
    organizationId: string,
    userId: string,
    dto: ConfirmBusinessZoneDto,
  ) {
    const region = BUSINESS_REGIONS.find((r) => r.id === dto.regionId);
    if (!region || !isValidTimeZone(region.timeZone))
      throw new BadRequestException('Elige una región disponible.');
    return this.mutate(
      organizationId,
      userId,
      dto,
      'BUSINESS_ZONE_CONFIRM',
      [UserRole.OWNER],
      async (tx, policy) => {
        if (region.timeZone !== policy.timeZone) {
          const dependencies = await this.dependencies(tx, organizationId);
          if (Object.values(dependencies).some((n) => n > 0))
            throw new ConflictException({
              code: 'SCHEDULE_ZONE_FROZEN',
              message:
                'Este negocio ya tiene actividad vinculada a su región. El cambio requiere una revisión separada.',
            });
          await tx.organization.update({
            where: { id: organizationId },
            data: { timeZone: region.timeZone },
          });
        }
        await tx.businessSchedule.update({
          where: { organizationId },
          data: { zoneConfirmed: true },
        });
      },
    );
  }
}
