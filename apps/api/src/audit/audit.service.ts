import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogEntry {
  organizationId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
}

/**
 * Registro de auditoría — solo eventos relevantes (edición, eliminación,
 * cambios administrativos), nunca lecturas. Aislamiento multi-tenant:
 * organizationId es obligatorio en cada entrada, nunca opcional.
 *
 * Principio de diseño clave: un fallo al escribir el log de auditoría
 * NUNCA debe tumbar la operación real que se estaba auditando (borrar
 * un profesional, invitar a alguien, etc.). Por eso el error se atrapa
 * aquí adentro y solo se registra con el Logger de Nest — el llamador
 * no necesita su propio try/catch.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(entry: AuditLogEntry, tx?: any): Promise<void> {
    try {
      const db = tx ?? this.prisma.db;
      await db.auditLog.create({
        data: {
          organizationId: entry.organizationId,
          userId: entry.userId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
        },
      });
    } catch (err) {
      this.logger.error(
        `No se pudo registrar auditoría: ${entry.action} ${entry.entity}${entry.entityId ? ` (${entry.entityId})` : ''}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
