import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    const price = this.normalizeDopPrice(createServiceDto.price);
    return await this.prisma.db.service.create({
      data: {
        ...createServiceDto,
        price,
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

    const data =
      updateServiceDto.price === undefined
        ? updateServiceDto
        : {
            ...updateServiceDto,
            price: this.normalizeDopPrice(updateServiceDto.price),
          };
    const updated = await this.prisma.db.service.update({
      where: { id },
      data,
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

  private normalizeDopPrice(value: number): Prisma.Decimal {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(
        'El precio debe ser mayor que cero y usar como máximo dos decimales',
      );
    }
    const price = new Prisma.Decimal(value.toString());
    const integerDigits = price
      .trunc()
      .abs()
      .toFixed(0)
      .replace(/^0+/, '').length;
    if (price.lte(0) || price.decimalPlaces() > 2 || integerDigits > 63) {
      throw new BadRequestException(
        'El precio debe ser mayor que cero y usar como máximo dos decimales',
      );
    }
    return price;
  }
}
