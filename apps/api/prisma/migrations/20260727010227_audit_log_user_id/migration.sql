-- AlterTable: AuditLog — quién hizo la acción (sin FK a propósito, ver
-- comentario en schema.prisma: el log de auditoría no debe depender del
-- ciclo de vida de User).
ALTER TABLE "AuditLog" ADD COLUMN "userId" TEXT;
