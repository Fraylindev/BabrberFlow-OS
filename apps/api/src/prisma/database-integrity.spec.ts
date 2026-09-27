import {
  inspectDatabaseIntegrity,
  REQUIRED_CONSTRAINTS,
  REQUIRED_INDEXES,
} from './database-integrity';

const fixture = () => ({
  constraints: REQUIRED_CONSTRAINTS.map(([tableName, name, definition]) => ({
    tableName,
    name,
    definition: String(definition),
    validated: true,
  })),
  indexes: REQUIRED_INDEXES.map(([name, definition]) => ({
    name,
    definition: String(definition),
    valid: true,
    ready: true,
  })),
});

describe('supplemental PostgreSQL integrity', () => {
  it('accepts the exact PG18 restored conjunction and still rejects a weakened operator', () => {
    const { constraints, indexes } = fixture();
    const checks = constraints.filter((c) =>
      [
        'ProfessionalWeeklySchedule_minutes_check',
        'BusinessScheduleWindow_minutes_check',
      ].includes(c.name),
    );
    for (const check of checks)
      check.definition =
        'CHECK ((("startMinute" >= 0) AND ("startMinute" <= 1439) AND (("endMinute" >= 1) AND ("endMinute" <= 1440)) AND ("startMinute" < "endMinute")))';
    expect(inspectDatabaseIntegrity(constraints, indexes)).toEqual([]);
    checks[1].definition = checks[1].definition.replace(' AND ', ' OR ');
    expect(inspectDatabaseIntegrity(constraints, indexes)).toEqual([
      'changed constraint: BusinessScheduleWindow_minutes_check',
    ]);
  });
  it('accepts the exact published definitions', () => {
    const { constraints, indexes } = fixture();
    expect(inspectDatabaseIntegrity(constraints, indexes)).toEqual([]);
  });

  it('detects the two financial checks missing after schema-only synchronization', () => {
    const { constraints, indexes } = fixture();
    expect(
      inspectDatabaseIntegrity(
        constraints.filter(
          (c) =>
            ![
              'Invoice_amount_positive_check',
              'Invoice_currency_dop_check',
            ].includes(c.name),
        ),
        indexes,
      ),
    ).toEqual([
      'missing constraint: Invoice_amount_positive_check',
      'missing constraint: Invoice_currency_dop_check',
    ]);
  });

  it('rejects a renamed-table substitute or weakened check', () => {
    const { constraints, indexes } = fixture();
    constraints[0].tableName = 'Invoice';
    constraints[2].definition = 'CHECK ((amount >= (0)::numeric))';
    expect(inspectDatabaseIntegrity(constraints, indexes)).toEqual([
      'missing constraint: AuditLog_pre_tenant_security_event_check',
      'changed constraint: Invoice_amount_positive_check',
    ]);
  });

  it('rejects a constraint installed NOT VALID', () => {
    const { constraints, indexes } = fixture();
    constraints[2].validated = false;
    expect(inspectDatabaseIntegrity(constraints, indexes)).toContain(
      'unvalidated constraint: Invoice_amount_positive_check',
    );
  });

  it('rejects removal of tenant scoping or a change in FK deletion rules', () => {
    const { constraints, indexes } = fixture();
    constraints[11].definition = constraints[11].definition.replace(
      'DELETE RESTRICT',
      'DELETE CASCADE',
    );
    constraints[12].definition = constraints[12].definition.replace(
      ', "organizationId"',
      '',
    );
    expect(inspectDatabaseIntegrity(constraints, indexes)).toEqual([
      'changed constraint: Invoice_bookingId_organizationId_fkey',
      'changed constraint: Payment_invoiceId_organizationId_fkey',
    ]);
  });

  it('rejects a partial invitation index without its predicate', () => {
    const { constraints, indexes } = fixture();
    indexes[0].definition = indexes[0].definition.split(' WHERE ')[0];
    expect(inspectDatabaseIntegrity(constraints, indexes)).toEqual([
      'changed index: TeamInvitation_one_open_per_org_email_key',
    ]);
  });

  it('rejects missing, invalid or not-ready indexes', () => {
    const { constraints, indexes } = fixture();
    indexes[1].valid = false;
    indexes[2].ready = false;
    indexes.pop();
    expect(inspectDatabaseIntegrity(constraints, indexes)).toEqual([
      'unusable index: Invoice_bookingId_organizationId_key',
      'unusable index: Payment_invoiceId_key',
      'missing index: Payment_org_paidAt_id_idx',
    ]);
  });
});
