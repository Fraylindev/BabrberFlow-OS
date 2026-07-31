import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { isForeignKeyConstraintError } from '../common/prisma-error.util';
import { findOwnedByOrgOrThrow } from '../common/find-owned-or-throw.util';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(organizationId: string, createServiceDto: CreateServiceDto) {
    return await this.prisma.db.service.create({
      data: {
        ...createServiceDto,
        organizationId, // 🔒 Inyectado directamente del JWT
      },
    });
  }

  async findAll(organizationId: string) {
    return await this.prisma.db.service.findMany({
      where: { organizationId }, // 🔒 Filtro estricto
    });
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    updateServiceDto: UpdateServiceDto,
  ) {
    await findOwnedByOrgOrThrow(
      this.prisma.db.service,
      id,
      organizationId,
      'Servicio no encontrado',
    );

    const updated = await this.prisma.db.service.update({
      where: { id },
      data: updateServiceDto,
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'UPDATE',
      entity: 'Service',
      entityId: id,
    });

    return updated;
  }

  async remove(id: string, organizationId: string, userId: string) {
    await findOwnedByOrgOrThrow(
      this.prisma.db.service,
      id,
      organizationId,
      'Servicio no encontrado',
    );

    try {
      const removed = await this.prisma.db.service.delete({ where: { id } });

      await this.audit.log({
        organizationId,
        userId,
        action: 'DELETE',
        entity: 'Service',
        entityId: id,
      });

      return removed;
    } catch (err) {
      if (isForeignKeyConstraintError(err)) {
        // Restrict a propósito: un servicio con reservas asociadas no se
        // borra en cascada — mismo principio que Professional/Booking/Invoice.
        throw new ConflictException(
          'No se puede eliminar: este servicio tiene reservas asociadas. Desactívalo en vez de borrarlo si ya no lo ofreces.',
        );
      }
      throw err;
    }
  }
}
