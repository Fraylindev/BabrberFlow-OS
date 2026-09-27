import { PrismaClient } from '@prisma/client';
import {
  inspectBusinessScheduleIntegrity,
  ScheduleTriggerMetadata,
  ScheduleFunctionMetadata,
} from './business-schedule-integrity';
import {
  ConstraintMetadata,
  IndexMetadata,
  inspectDatabaseIntegrity,
} from './database-integrity';

// No business rows are selected and no repair is performed by this command.
// Run alongside migrate status/diff, not as a replacement for either command.
async function main() {
  const db = new PrismaClient();
  try {
    const failures = await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '10s'`;
        const constraints = await tx.$queryRaw<ConstraintMetadata[]>`
        SELECT r.relname AS "tableName", c.conname AS name,
               pg_get_constraintdef(c.oid) AS definition, c.convalidated AS validated
        FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid
        WHERE c.connamespace = 'public'::regnamespace
      `;
        const indexes = await tx.$queryRaw<IndexMetadata[]>`
        SELECT c.relname AS name, pg_get_indexdef(c.oid) AS definition,
               i.indisvalid AS valid, i.indisready AS ready
        FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
        WHERE c.relnamespace = 'public'::regnamespace
      `;
        const triggers = await tx.$queryRaw<ScheduleTriggerMetadata[]>`
          SELECT tgname AS name, pg_get_triggerdef(oid) AS definition, tgenabled::text AS enabled
          FROM pg_trigger WHERE tgname IN ('BusinessSchedule_complete_week','BusinessScheduleDay_complete_week','BusinessScheduleWindow_limit')
        `;
        const functions = await tx.$queryRaw<ScheduleFunctionMetadata[]>`
          SELECT prosrc AS source, prosecdef AS "securityDefiner" FROM pg_proc
          WHERE pronamespace='public'::regnamespace AND proname='validate_business_schedule' AND pronargs=0
        `;
        return [
          ...inspectDatabaseIntegrity(constraints, indexes),
          ...inspectBusinessScheduleIntegrity(triggers, functions),
        ];
      },
      { timeout: 15000 },
    );
    if (failures.length) {
      failures.forEach((failure) => console.error(failure));
      process.exitCode = 1;
    } else {
      console.log('Supplemental PostgreSQL constraints and indexes: OK');
    }
  } catch {
    // Driver errors can contain connection details; never print them here.
    console.error(
      'Integrity verification unavailable; check connection and permissions.',
    );
    process.exitCode = 2;
  } finally {
    await db.$disconnect();
  }
}

void main();
