-- ============================================================
-- Identidad global: separa User (identidad) de Membership (rol
-- por organización). Migra los datos existentes ANTES de tocar
-- las columnas viejas — nada se pierde.
-- ============================================================

-- CreateTable: Membership
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'BARBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- Migra cada User existente a su Membership equivalente ANTES de borrar
-- organizationId/role de User. Uno a uno, porque hoy cada User ya
-- pertenece a una sola organización.
INSERT INTO "Membership" ("id", "userId", "organizationId", "role", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "organizationId", "role", "createdAt", "updatedAt"
FROM "User";

-- CreateIndex + AddForeignKey: Membership
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: User — agrega lastOrganizationId, lo puebla desde la
-- migración recién hecha (cada User tenía exactamente una organización).
ALTER TABLE "User" ADD COLUMN "lastOrganizationId" TEXT;
UPDATE "User" SET "lastOrganizationId" = "organizationId";

-- AlterTable: User — quita la FK y el índice compuesto viejos, quita
-- organizationId y role, deja email único GLOBAL.
ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";
DROP INDEX "User_organizationId_email_key";
ALTER TABLE "User" DROP COLUMN "organizationId";
ALTER TABLE "User" DROP COLUMN "role";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AlterTable: Client — único por organización (no global), permite
-- walk-ins sin correo (NULL no colisiona con NULL en Postgres).
CREATE UNIQUE INDEX "Client_organizationId_email_key" ON "Client"("organizationId", "email");
