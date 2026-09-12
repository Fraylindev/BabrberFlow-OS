// Supplemental checks for guarantees that Prisma schema diff cannot represent.
// Definitions come from the published migrations, verified against PostgreSQL.
export const REQUIRED_CONSTRAINTS = [
  [
    'AuditLog',
    'AuditLog_pre_tenant_security_event_check',
    `CHECK ((("organizationId" IS NOT NULL) OR ((action = 'CLERK_ONBOARDING_EMAIL_CONFLICT'::text) AND (entity = 'SecurityEvent'::text) AND ("userId" IS NULL) AND ("entityId" IS NULL))))`,
  ],
  [
    'Booking',
    'Booking_professional_schedule_excl',
    `EXCLUDE USING gist ("professionalId" WITH =, tsrange("startTime", "endTime", '[)'::text) WITH &&) WHERE ((status <> 'CANCELLED'::"BookingStatus"))`,
  ],
  [
    'Invoice',
    'Invoice_amount_positive_check',
    'CHECK ((amount > (0)::numeric))',
  ],
  ['Invoice', 'Invoice_currency_dop_check', `CHECK ((currency = 'DOP'::text))`],
  ['Service', 'Service_price_dop_check', 'CHECK ((price > (0)::numeric))'],
  [
    'ProfessionalAvailabilityBlock',
    'ProfessionalAvailabilityBlock_range_check',
    'CHECK (("startTime" < "endTime"))',
  ],
  [
    'ProfessionalWeeklySchedule',
    'ProfessionalWeeklySchedule_day_check',
    'CHECK ((("dayOfWeek" >= 0) AND ("dayOfWeek" <= 6)))',
  ],
  [
    'ProfessionalWeeklySchedule',
    'ProfessionalWeeklySchedule_minutes_check',
    'CHECK (((("startMinute" >= 0) AND ("startMinute" <= 1439)) AND (("endMinute" >= 1) AND ("endMinute" <= 1440)) AND ("startMinute" < "endMinute")))',
  ],
  [
    'ProfessionalWeeklySchedule',
    'ProfessionalWeeklySchedule_no_overlap',
    `EXCLUDE USING gist ("organizationId" WITH =, "professionalId" WITH =, "dayOfWeek" WITH =, int4range("startMinute", "endMinute", '[)'::text) WITH &&)`,
  ],
  [
    'TeamInvitation',
    'TeamInvitation_public_profile_check',
    `CHECK (((NOT "createPublicProfile") OR (role = 'BARBER'::"UserRole")))`,
  ],
  [
    'TeamInvitation',
    'TeamInvitation_role_check',
    `CHECK ((role = ANY (ARRAY['ADMIN'::"UserRole", 'BARBER'::"UserRole", 'RECEPTIONIST'::"UserRole"])))`,
  ],
  [
    'Invoice',
    'Invoice_bookingId_organizationId_fkey',
    'FOREIGN KEY ("bookingId", "organizationId") REFERENCES "Booking"(id, "organizationId") ON UPDATE CASCADE ON DELETE RESTRICT',
  ],
  [
    'Payment',
    'Payment_invoiceId_organizationId_fkey',
    'FOREIGN KEY ("invoiceId", "organizationId") REFERENCES "Invoice"(id, "organizationId") ON UPDATE CASCADE ON DELETE RESTRICT',
  ],
  [
    'ProfessionalWeeklySchedule',
    'ProfessionalWeeklySchedule_professionalId_fkey',
    'FOREIGN KEY ("professionalId", "organizationId") REFERENCES "Professional"(id, "organizationId") ON UPDATE CASCADE ON DELETE CASCADE',
  ],
  [
    'ProfessionalAvailabilityBlock',
    'ProfessionalAvailabilityBlock_professionalId_fkey',
    'FOREIGN KEY ("professionalId", "organizationId") REFERENCES "Professional"(id, "organizationId") ON UPDATE CASCADE ON DELETE CASCADE',
  ],
] as const;

export const REQUIRED_INDEXES = [
  [
    'TeamInvitation_one_open_per_org_email_key',
    `CREATE UNIQUE INDEX "TeamInvitation_one_open_per_org_email_key" ON public."TeamInvitation" USING btree ("organizationId", email) WHERE (status = ANY (ARRAY['CREATING'::"TeamInvitationStatus", 'PENDING'::"TeamInvitationStatus", 'RESENDING'::"TeamInvitationStatus", 'REVOKING'::"TeamInvitationStatus"]))`,
  ],
  [
    'Invoice_bookingId_organizationId_key',
    'CREATE UNIQUE INDEX "Invoice_bookingId_organizationId_key" ON public."Invoice" USING btree ("bookingId", "organizationId")',
  ],
  [
    'Payment_invoiceId_key',
    'CREATE UNIQUE INDEX "Payment_invoiceId_key" ON public."Payment" USING btree ("invoiceId")',
  ],
  [
    'Invoice_org_createdAt_id_idx',
    'CREATE INDEX "Invoice_org_createdAt_id_idx" ON public."Invoice" USING btree ("organizationId", "createdAt", id)',
  ],
  [
    'Payment_org_paidAt_id_idx',
    'CREATE INDEX "Payment_org_paidAt_id_idx" ON public."Payment" USING btree ("organizationId", "paidAt", id)',
  ],
] as const;

export type ConstraintMetadata = {
  tableName: string;
  name: string;
  definition: string;
  validated: boolean;
};

export type IndexMetadata = {
  name: string;
  definition: string;
  valid: boolean;
  ready: boolean;
};

export function inspectDatabaseIntegrity(
  constraints: ConstraintMetadata[],
  indexes: IndexMetadata[],
): string[] {
  const failures: string[] = [];
  for (const [tableName, name, definition] of REQUIRED_CONSTRAINTS) {
    const actual = constraints.find(
      (c) => c.tableName === tableName && c.name === name,
    );
    if (!actual) failures.push(`missing constraint: ${name}`);
    else {
      if (!actual.validated) failures.push(`unvalidated constraint: ${name}`);
      // Deliberately fail closed on a different expression, even if its name matches.
      if (actual.definition !== definition)
        failures.push(`changed constraint: ${name}`);
    }
  }
  for (const [name, definition] of REQUIRED_INDEXES) {
    const actual = indexes.find((i) => i.name === name);
    if (!actual) failures.push(`missing index: ${name}`);
    else {
      if (!actual.valid || !actual.ready)
        failures.push(`unusable index: ${name}`);
      if (actual.definition !== definition)
        failures.push(`changed index: ${name}`);
    }
  }
  return failures;
}
