import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Prisma } from '@prisma/client';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { isRecordNotFoundError } from '../common/prisma-error.util';
import { AuditService } from '../audit/audit.service';
import { QueryServicesDto } from './dto/query-services.dto';
import {
  ServiceResponseDto,
  serviceResponseSelect,
  toServiceResponse,
} from './dto/service-response.dto';

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    createServiceDto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    const price = this.normalizeDopPrice(createServiceDto.price);
    const created = await this.prisma.db.service.create({
      data: {
        ...this.normalizeCreate(createServiceDto),
        price,
        organizationId,
      },
      select: serviceResponseSelect,
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'CREATE',
      entity: 'Service',
      entityId: created.id,
    });
    await this.cache.clear();

    return toServiceResponse(created);
  }

  async findAll(
    organizationId: string,
    query: QueryServicesDto,
  ): Promise<ServiceResponseDto[]> {
    const isActive = query.isActive?.trim();
    const services = await this.prisma.db.service.findMany({
      where: {
        organizationId,
        ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      },
      select: serviceResponseSelect,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return services.map(toServiceResponse);
  }

  async findOne(
    id: string,
    organizationId: string,
  ): Promise<ServiceResponseDto> {
    return toServiceResponse(await this.findOwnedOrThrow(id, organizationId));
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    updateServiceDto: UpdateServiceDto,
  ) {
    if (Object.keys(updateServiceDto).length === 0) {
      throw new BadRequestException(
        'Debe enviar al menos un campo para actualizar',
      );
    }

    await this.findOwnedOrThrow(id, organizationId);

    const normalized = this.normalizeUpdate(updateServiceDto);
    const data =
      updateServiceDto.price === undefined
        ? normalized
        : {
            ...normalized,
            price: this.normalizeDopPrice(updateServiceDto.price),
          };
    try {
      const updated = await this.prisma.db.service.update({
        where: { id, organizationId },
        data,
        select: serviceResponseSelect,
      });

      await this.audit.log({
        organizationId,
        userId,
        action: 'UPDATE',
        entity: 'Service',
        entityId: id,
      });
      await this.cache.clear();

      return toServiceResponse(updated);
    } catch (error) {
      this.rethrowNotFound(error);
      throw error;
    }
  }

  async deactivate(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<ServiceResponseDto> {
    return this.setActiveState(id, organizationId, userId, false, 'DEACTIVATE');
  }

  async reactivate(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<ServiceResponseDto> {
    return this.setActiveState(id, organizationId, userId, true, 'REACTIVATE');
  }

  private async setActiveState(
    id: string,
    organizationId: string,
    userId: string,
    isActive: boolean,
    action: 'DEACTIVATE' | 'REACTIVATE',
  ): Promise<ServiceResponseDto> {
    const current = await this.findOwnedOrThrow(id, organizationId);
    if (current.isActive === isActive) return toServiceResponse(current);

    try {
      const updated = await this.prisma.db.service.update({
        where: { id, organizationId },
        data: { isActive },
        select: serviceResponseSelect,
      });

      await this.audit.log({
        organizationId,
        userId,
        action,
        entity: 'Service',
        entityId: id,
      });
      await this.cache.clear();

      return toServiceResponse(updated);
    } catch (error) {
      this.rethrowNotFound(error);
      throw error;
    }
  }

  private async findOwnedOrThrow(id: string, organizationId: string) {
    const service = await this.prisma.db.service.findFirst({
      where: { id, organizationId },
      select: serviceResponseSelect,
    });
    if (!service) throw new NotFoundException('Servicio no encontrado');
    return service;
  }

  private normalizeCreate(dto: CreateServiceDto) {
    return {
      name: dto.name.trim(),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() }
        : {}),
      duration: dto.duration,
    };
  }

  private normalizeUpdate(dto: UpdateServiceDto) {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() }
        : {}),
      ...(dto.duration !== undefined ? { duration: dto.duration } : {}),
    };
  }

  private rethrowNotFound(error: unknown): void {
    if (isRecordNotFoundError(error)) {
      throw new NotFoundException('Servicio no encontrado');
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
