import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { isForeignKeyConstraintError } from '../common/prisma-error.util';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

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

  // 🔒 findFirst con organizationId en el mismo where — si el servicio
  // existe pero es de otra organización, se comporta igual que si no
  // existiera (404), nunca revela que el id pertenece a otra barbería.
  private async findOwnedByOrgOrThrow(id: string, organizationId: string) {
    const service = await this.prisma.db.service.findFirst({
      where: { id, organizationId },
    });

    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    return service;
  }

  async update(
    id: string,
    organizationId: string,
    updateServiceDto: UpdateServiceDto,
  ) {
    await this.findOwnedByOrgOrThrow(id, organizationId);

    return await this.prisma.db.service.update({
      where: { id },
      data: updateServiceDto,
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOwnedByOrgOrThrow(id, organizationId);

    try {
      return await this.prisma.db.service.delete({ where: { id } });
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
