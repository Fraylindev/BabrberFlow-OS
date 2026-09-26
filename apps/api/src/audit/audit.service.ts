import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface TenantAuditLogEntry {
  organizationId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
}

interface PreTenantEmailConflictEntry {
  organizationId: null;
  userId: null;
  action: 'CLERK_ONBOARDING_EMAIL_CONFLICT';
  entity: 'SecurityEvent';
  entityId?: never;
}

export type AuditLogEntry = TenantAuditLogEntry | PreTenantEmailConflictEntry;

/**
 * Registro de auditoría — solo eventos relevantes (edición, eliminación,
 * cambios administrativos), nunca lecturas. Los eventos de negocio usan
 * siempre el organizationId autoritativo. NULL queda reservado para eventos
 * de seguridad pre-tenant, donde todavía no existe una Organization real.
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

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.db.auditLog.create({
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

  /**
   * Registra auditoría de manera atómica, dentro de una transacción en curso.
   * Si falla, lanzará error y provocará el rollback de toda la transacción principal.
   * Utilizar esto de forma exclusiva cuando la auditoría es condición sine qua non del éxito (ej. onboarding atómico).
   */
  async logTransactional(
    entry: AuditLogEntry,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
      },
    });
  }
}
