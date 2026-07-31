import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import {
  isUniqueConstraintError,
  isForeignKeyConstraintError,
} from '../common/prisma-error.util';
import { findOwnedByOrgOrThrow } from '../common/find-owned-or-throw.util';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(organizationId: string, createClientDto: CreateClientDto) {
    try {
      return await this.prisma.db.client.create({
        data: {
          ...createClientDto,
          organizationId,
        },
      });
    } catch (err) {
      if (isUniqueConstraintError(err, 'email')) {
        throw new ConflictException(
          'Ya existe un cliente con ese correo en esta organización.',
        );
      }
      throw err;
    }
  }

  // professionalId opcional: cuando se pasa, restringe el listado a
  // clientes que tienen al menos una cita con ese profesional — así es
  // como un BARBER ve "mis clientes" en vez de toda la cartera.
  async findAll(organizationId: string, professionalId?: string) {
    return await this.prisma.db.client.findMany({
      where: {
        organizationId,
        ...(professionalId ? { bookings: { some: { professionalId } } } : {}),
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    updateClientDto: UpdateClientDto,
  ) {
    await findOwnedByOrgOrThrow(
      this.prisma.db.client,
      id,
      organizationId,
      'Cliente no encontrado',
    );

    try {
      const updated = await this.prisma.db.client.update({
        where: { id },
        data: updateClientDto,
      });

      // Datos de contacto de una persona real (PII) — auditar quién los
      // editó importa tanto o más que en el resto de los catálogos.
      await this.audit.log({
        organizationId,
        userId,
        action: 'UPDATE',
        entity: 'Client',
        entityId: id,
      });

      return updated;
    } catch (err) {
      if (isUniqueConstraintError(err, 'email')) {
        throw new ConflictException(
          'Ya existe un cliente con ese correo en esta organización.',
        );
      }
      throw err;
    }
  }

  async remove(id: string, organizationId: string, userId: string) {
    await findOwnedByOrgOrThrow(
      this.prisma.db.client,
      id,
      organizationId,
      'Cliente no encontrado',
    );

    try {
      const removed = await this.prisma.db.client.delete({ where: { id } });

      await this.audit.log({
        organizationId,
        userId,
        action: 'DELETE',
        entity: 'Client',
        entityId: id,
      });

      return removed;
    } catch (err) {
      if (isForeignKeyConstraintError(err)) {
        // Restrict a propósito: un cliente con historial de reservas no
        // se borra en cascada — mismo principio que Professional/Service.
        throw new ConflictException(
          'No se puede eliminar: este cliente tiene reservas asociadas. Desactívalo en vez de borrarlo si ya no es un cliente activo.',
        );
      }
      throw err;
    }
  }
}
