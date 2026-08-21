-- Los eventos de seguridad que ocurren antes de crear un tenant no tienen
-- un organizationId autoritativo. Permitir NULL evita atribuirlos a una
-- organización falsa; los eventos de negocio existentes siguen enviando su
-- organizationId real.
ALTER TABLE "AuditLog"
ALTER COLUMN "organizationId" DROP NOT NULL;

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_pre_tenant_security_event_check"
CHECK (
  "organizationId" IS NOT NULL
  OR (
    "action" = 'CLERK_ONBOARDING_EMAIL_CONFLICT'
    AND "entity" = 'SecurityEvent'
    AND "userId" IS NULL
    AND "entityId" IS NULL
  )
);
