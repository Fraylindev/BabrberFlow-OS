import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { isUniqueConstraintError } from '../common/prisma-error.util';

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
}
