import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import {
  isUniqueConstraintError,
  isForeignKeyConstraintError,
} from '../common/prisma-error.util';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

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

  // 🔒 findFirst con organizationId en el mismo where — si el cliente
  // existe pero es de otra organización, se comporta igual que si no
  // existiera (404), nunca revela que el id pertenece a otra barbería.
  private async findOwnedByOrgOrThrow(id: string, organizationId: string) {
    const client = await this.prisma.db.client.findFirst({
      where: { id, organizationId },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return client;
  }

  async update(
    id: string,
    organizationId: string,
    updateClientDto: UpdateClientDto,
  ) {
    await this.findOwnedByOrgOrThrow(id, organizationId);

    try {
      return await this.prisma.db.client.update({
        where: { id },
        data: updateClientDto,
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

  async remove(id: string, organizationId: string) {
    await this.findOwnedByOrgOrThrow(id, organizationId);

    try {
      return await this.prisma.db.client.delete({ where: { id } });
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
