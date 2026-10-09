import { ConflictException, NotFoundException } from '@nestjs/common';
import { BusinessScheduleState, type Prisma } from '@prisma/client';
import {
  resolveBusinessHours,
  generateCandidateSlots,
} from '../public-booking/availability.util';
import {
  getZonedDateParts,
  isIntervalInsideWindows,
  legacyIsIntervalInsideWindows,
  isValidTimeZone,
  localWindowToUtc,
  type AvailabilityWindow,
} from '../professionals/professional-availability.util';

export const BUSINESS_REGIONS = [
  {
    id: 'santo-domingo',
    label: 'Santo Domingo',
    timeZone: 'America/Santo_Domingo',
  },
  { id: 'new-york', label: 'Nueva York', timeZone: 'America/New_York' },
  { id: 'madrid', label: 'Madrid', timeZone: 'Europe/Madrid' },
  { id: 'sao-paulo', label: 'São Paulo', timeZone: 'America/Sao_Paulo' },
  { id: 'lord-howe', label: 'Isla Lord Howe', timeZone: 'Australia/Lord_Howe' },
  { id: 'samoa', label: 'Samoa', timeZone: 'Pacific/Apia' },
] as const;

export const businessPolicySelect = {
  timeZone: true,
  businessHours: true,
  businessSchedule: {
    include: {
      days: { include: { windows: true } },
      closures: {
        where: { status: 'ACTIVE' as const },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          startMinute: true,
          endMinute: true,
        },
      },
    },
  },
} satisfies Prisma.OrganizationSelect;

export type BusinessPolicyOrganization = Prisma.OrganizationGetPayload<{
  select: typeof businessPolicySelect;
}>;
export interface ClosureRule {
  id: string;
  startDate: string;
  endDate: string;
  startMinute: number;
  endMinute: number;
}
export interface BusinessPolicy {
  timeZone: string;
  revision: number;
  state: BusinessScheduleState;
  zoneConfirmed: boolean;
  windows: AvailabilityWindow[];
  closures: ClosureRule[];
  legacyPublicAllowed: boolean;
}
export function policyFromOrganization(
  org: BusinessPolicyOrganization,
): BusinessPolicy {
  if (!isValidTimeZone(org.timeZone))
    throw new ConflictException(
      'No fue posible interpretar la hora del negocio.',
    );
  const schedule = org.businessSchedule;
  const state = schedule?.state ?? BusinessScheduleState.UNCONFIRMED;
  let windows: AvailabilityWindow[] = [];
  if (state === BusinessScheduleState.LEGACY_UNCONFIRMED) {
    const legacy = resolveBusinessHours(org.businessHours);
    windows = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      startMinute: legacy.openMinutes,
      endMinute: legacy.closeMinutes,
    }));
  } else if (state === BusinessScheduleState.CONFIRMED) {
    if (
      !schedule?.zoneConfirmed ||
      schedule.days.length !== 7 ||
      new Set(schedule.days.map((d) => d.dayOfWeek)).size !== 7
    )
      throw new ConflictException('El horario del negocio necesita revisión.');
    for (const day of schedule.days) {
      if (day.dayOfWeek < 0 || day.dayOfWeek > 6 || day.windows.length > 5)
        throw new ConflictException(
          'El horario del negocio necesita revisión.',
        );
      const ordered = [...day.windows].sort(
        (a, b) => a.startMinute - b.startMinute,
      );
      for (let i = 0; i < ordered.length; i++) {
        const w = ordered[i];
        if (
          w.startMinute < 0 ||
          w.endMinute > 1440 ||
          w.startMinute >= w.endMinute ||
          (i > 0 && ordered[i - 1].endMinute >= w.startMinute)
        )
          throw new ConflictException(
            'El horario del negocio necesita revisión.',
          );
        windows.push({
          dayOfWeek: day.dayOfWeek,
          startMinute: w.startMinute,
          endMinute: w.endMinute,
        });
      }
    }
  }
  return {
    timeZone: org.timeZone,
    revision: schedule?.revision ?? 0,
    state,
    zoneConfirmed: schedule?.zoneConfirmed ?? false,
    legacyPublicAllowed: schedule?.legacyPublicAllowed ?? false,
    windows,
    closures: (schedule?.closures ?? []).map((c) => ({
      id: c.id,
      startDate: c.startDate.toISOString().slice(0, 10),
      endDate: c.endDate.toISOString().slice(0, 10),
      startMinute: c.startMinute,
      endMinute: c.endMinute,
    })),
  };
}
export async function loadBusinessPolicy(
  db: Prisma.TransactionClient,
  organizationId: string,
): Promise<BusinessPolicy> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: businessPolicySelect,
  });
  if (!org) throw new NotFoundException('Información no disponible.');
  return policyFromOrganization(org);
}
export function insideBusinessPolicy(
  policy: BusinessPolicy,
  start: Date,
  end: Date,
  individual: AvailabilityWindow[],
): boolean {
  const inside =
    policy.state === BusinessScheduleState.LEGACY_UNCONFIRMED
      ? legacyIsIntervalInsideWindows
      : isIntervalInsideWindows;
  if (
    !policy.windows.some(
      (w) =>
        getZonedDateParts(start, policy.timeZone).dayOfWeek === w.dayOfWeek &&
        inside(
          start,
          end,
          policy.timeZone,
          w.startMinute,
          w.endMinute,
          individual,
        ),
    )
  )
    return false;
  const date = getZonedDateParts(start, policy.timeZone).date;
  return !policy.closures.some((c) => {
    if (date < c.startDate || date > c.endDate) return false;
    if (c.startMinute === 0 && c.endMinute === 1440) return true;
    const range = localWindowToUtc(
      date,
      c.startMinute,
      c.endMinute,
      policy.timeZone,
    );
    return !range || (start < range.end && end > range.start);
  });
}
export function candidatesForPolicy(
  policy: BusinessPolicy,
  date: string,
  dayOfWeek: number,
  duration: number,
): string[] {
  return [
    ...new Set(
      policy.windows
        .filter((w) => w.dayOfWeek === dayOfWeek)
        .flatMap((w) =>
          generateCandidateSlots(
            { openMinutes: w.startMinute, closeMinutes: w.endMinute },
            duration,
          ),
        ),
    ),
  ].sort();
}
export function canReadPublicSchedule(policy: BusinessPolicy): boolean {
  return (
    policy.state === BusinessScheduleState.CONFIRMED ||
    (policy.state === BusinessScheduleState.LEGACY_UNCONFIRMED &&
      policy.legacyPublicAllowed)
  );
}
