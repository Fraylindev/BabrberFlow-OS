import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { isForeignKeyConstraintError } from '../common/prisma-error.util';
import { findOwnedByOrgOrThrow } from '../common/find-owned-or-throw.util';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProfessionalsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(
    organizationId: string,
    createProfessionalDto: CreateProfessionalDto,
  ) {
    return await this.prisma.db.professional.create({
      data: {
        ...createProfessionalDto,
        organizationId, // 🔒 Inyectado de forma segura desde el JWT
      },
    });
  }

  async findAll(organizationId: string) {
    return await this.prisma.db.professional.findMany({
      where: { organizationId }, // 🔒 Filtro estricto multi-tenant
    });
  }

  // Resuelve qué Professional corresponde a un User dado (vínculo opcional
  // 1:1, ver schema.prisma). Usado para que un BARBER solo vea su propia
  // agenda/clientes, nunca los de sus compañeros.
  async findByUserId(userId: string) {
    return await this.prisma.db.professional.findUnique({
      where: { userId },
    });
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    updateProfessionalDto: UpdateProfessionalDto,
  ) {
    await findOwnedByOrgOrThrow(
      this.prisma.db.professional,
      id,
      organizationId,
      'Profesional no encontrado',
    );

    const updated = await this.prisma.db.professional.update({
      where: { id },
      data: updateProfessionalDto,
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'UPDATE',
      entity: 'Professional',
      entityId: id,
    });

    return updated;
  }

  async remove(id: string, organizationId: string, userId: string) {
    await findOwnedByOrgOrThrow(
      this.prisma.db.professional,
      id,
      organizationId,
      'Profesional no encontrado',
    );

    try {
      const removed = await this.prisma.db.professional.delete({
        where: { id },
      });

      await this.audit.log({
        organizationId,
        userId,
        action: 'DELETE',
        entity: 'Professional',
        entityId: id,
      });

      return removed;
    } catch (err) {
      if (isForeignKeyConstraintError(err)) {
        // Restrict a propósito (ver schema.prisma): un profesional con
        // reservas o servicios asignados no se borra en cascada — es
        // exactamente el mismo principio ya aplicado a Booking/Invoice.
        throw new ConflictException(
          'No se puede eliminar: este profesional tiene reservas o servicios asociados. Desactívalo en vez de borrarlo si ya no trabaja aquí.',
        );
      }
      throw err;
    }
  }
}
