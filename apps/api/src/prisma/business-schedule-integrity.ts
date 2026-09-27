export const REQUIRED_SCHEDULE_TRIGGERS = [
  [
    'BusinessSchedule_complete_week',
    'CREATE CONSTRAINT TRIGGER "BusinessSchedule_complete_week" AFTER INSERT OR UPDATE ON public."BusinessSchedule" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_business_schedule()',
  ],
  [
    'BusinessScheduleDay_complete_week',
    'CREATE CONSTRAINT TRIGGER "BusinessScheduleDay_complete_week" AFTER INSERT OR DELETE OR UPDATE ON public."BusinessScheduleDay" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_business_schedule()',
  ],
  [
    'BusinessScheduleWindow_limit',
    'CREATE CONSTRAINT TRIGGER "BusinessScheduleWindow_limit" AFTER INSERT OR DELETE OR UPDATE ON public."BusinessScheduleWindow" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_business_schedule()',
  ],
] as const;

export const REQUIRED_SCHEDULE_FUNCTION_SOURCE = `
DECLARE tenant TEXT; BEGIN
  tenant := COALESCE(NEW."organizationId", OLD."organizationId");
  IF EXISTS (SELECT 1 FROM "BusinessScheduleWindow" WHERE "organizationId"=tenant GROUP BY "dayOfWeek" HAVING count(*)>5) THEN
    RAISE EXCEPTION 'Too many business windows' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM "BusinessSchedule" WHERE "organizationId"=tenant AND "state"='CONFIRMED')
    AND (SELECT count(*) FROM "BusinessScheduleDay" WHERE "organizationId"=tenant)<>7 THEN
    RAISE EXCEPTION 'Incomplete confirmed business week' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END `;

export type ScheduleTriggerMetadata = {
  name: string;
  definition: string;
  enabled: string;
};
export type ScheduleFunctionMetadata = {
  source: string;
  securityDefiner: boolean;
};
export function inspectBusinessScheduleIntegrity(
  triggers: ScheduleTriggerMetadata[],
  functions: ScheduleFunctionMetadata[],
): string[] {
  const failures: string[] = [];
  for (const [name, definition] of REQUIRED_SCHEDULE_TRIGGERS) {
    const actual = triggers.find((t) => t.name === name);
    if (!actual || actual.definition !== definition || actual.enabled !== 'O')
      failures.push(`missing, changed or disabled trigger: ${name}`);
  }
  const normalize = (source: string) => source.replace(/\r\n/g, '\n').trim();
  if (
    functions.length !== 1 ||
    functions[0].securityDefiner ||
    normalize(functions[0].source) !==
      normalize(REQUIRED_SCHEDULE_FUNCTION_SOURCE)
  )
    failures.push('missing or changed function: validate_business_schedule');
  return failures;
}
