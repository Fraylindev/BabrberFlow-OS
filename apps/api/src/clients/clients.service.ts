import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import {
  BarberClientResponseDto,
  ClientListResult,
  ClientResponseDto,
  barberClientResponseSelect,
  clientResponseSelect,
  toBarberClientResponse,
  toClientResponse,
} from './dto/client-response.dto';
import {
  CLIENT_DEFAULT_PAGE_SIZE,
  CLIENT_MAX_PAGE_SIZE,
} from './clients.constants';
import {
  normalizeClientEmail,
  normalizeClientName,
  normalizeClientNotes,
  normalizeClientPhone,
} from './client-normalization.util';
import {
  isRecordNotFoundError,
  isUniqueConstraintError,
} from '../common/prisma-error.util';

type ClientListResponse = ClientResponseDto | BarberClientResponseDto;

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateClientDto,
  ): Promise<ClientResponseDto> {
    const data = this.normalizeCreate(dto);
    await this.assertNoDuplicate(organizationId, data.email, data.phone);

    try {
      const created = await this.prisma.db.client.create({
        data: { ...data, organizationId },
        select: clientResponseSelect,
      });

      await this.audit.log({
        organizationId,
        userId,
        action: 'CREATE',
        entity: 'Client',
        entityId: created.id,
      });

      return toClientResponse(created);
    } catch (error) {
      this.translateDuplicateError(error);
      throw error;
    }
  }

  async findAll(
    organizationId: string,
    query: QueryClientsDto,
    professionalId?: string,
  ): Promise<ClientListResult<ClientListResponse>> {
    const page = Number(query.page ?? 1);
    const limit = Math.min(
      Number(query.limit ?? CLIENT_DEFAULT_PAGE_SIZE),
      CLIENT_MAX_PAGE_SIZE,
    );
    const search = query.search?.trim();

    const where: Prisma.ClientWhereInput = {
      organizationId,
      isActive: query.isActive ? query.isActive === 'true' : true,
      ...(professionalId
        ? { bookings: { some: { organizationId, professionalId } } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const total = await this.prisma.db.client.count({ where });
    const commonArgs = {
      where,
      orderBy: [
        { name: 'asc' },
        { id: 'asc' },
      ] as Prisma.ClientOrderByWithRelationInput[],
      skip: (page - 1) * limit,
      take: limit,
    };

    const data = professionalId
      ? (
          await this.prisma.db.client.findMany({
            ...commonArgs,
            select: barberClientResponseSelect,
          })
        ).map(toBarberClientResponse)
      : (
          await this.prisma.db.client.findMany({
            ...commonArgs,
            select: clientResponseSelect,
          })
        ).map(toClientResponse);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    id: string,
    organizationId: string,
    professionalId?: string,
  ): Promise<ClientListResponse> {
    const where: Prisma.ClientWhereInput = {
      id,
      organizationId,
      ...(professionalId
        ? { bookings: { some: { organizationId, professionalId } } }
        : {}),
    };

    if (professionalId) {
      const client = await this.prisma.db.client.findFirst({
        where,
        select: barberClientResponseSelect,
      });
      if (!client) throw new NotFoundException('Cliente no encontrado');
      return toBarberClientResponse(client);
    }

    const client = await this.prisma.db.client.findFirst({
      where,
      select: clientResponseSelect,
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return toClientResponse(client);
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Debe enviar al menos un campo para actualizar',
      );
    }

    await this.findOwnedOrThrow(id, organizationId);
    const data = this.normalizeUpdate(dto);
    if (data.email !== undefined || data.phone !== undefined) {
      await this.assertNoDuplicate(organizationId, data.email, data.phone, id);
    }

    try {
      const updated = await this.prisma.db.client.update({
        where: { id, organizationId },
        data,
        select: clientResponseSelect,
      });

      await this.audit.log({
        organizationId,
        userId,
        action: 'UPDATE',
        entity: 'Client',
        entityId: id,
      });

      return toClientResponse(updated);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new NotFoundException('Cliente no encontrado');
      }
      this.translateDuplicateError(error);
      throw error;
    }
  }

  async archive(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<ClientResponseDto> {
    const current = await this.findOwnedOrThrow(id, organizationId);
    if (!current.isActive) return toClientResponse(current);

    return this.setActiveState(id, organizationId, userId, false, 'ARCHIVE');
  }

  async restore(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<ClientResponseDto> {
    const current = await this.findOwnedOrThrow(id, organizationId);
    if (current.isActive) return toClientResponse(current);

    return this.setActiveState(id, organizationId, userId, true, 'RESTORE');
  }

  private async setActiveState(
    id: string,
    organizationId: string,
    userId: string,
    isActive: boolean,
    action: 'ARCHIVE' | 'RESTORE',
  ): Promise<ClientResponseDto> {
    try {
      const updated = await this.prisma.db.client.update({
        where: { id, organizationId },
        data: { isActive },
        select: clientResponseSelect,
      });

      await this.audit.log({
        organizationId,
        userId,
        action,
        entity: 'Client',
        entityId: id,
      });

      return toClientResponse(updated);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new NotFoundException('Cliente no encontrado');
      }
      throw error;
    }
  }

  private async findOwnedOrThrow(id: string, organizationId: string) {
    const client = await this.prisma.db.client.findFirst({
      where: { id, organizationId },
      select: clientResponseSelect,
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  private async assertNoDuplicate(
    organizationId: string,
    email: string | null | undefined,
    phone: string | null | undefined,
    excludeId?: string,
  ) {
    const identifiers: Prisma.ClientWhereInput[] = [];
    if (email)
      identifiers.push({ email: { equals: email, mode: 'insensitive' } });
    if (phone) identifiers.push({ phone });
    if (identifiers.length === 0) return;

    const duplicate = await this.prisma.db.client.findFirst({
      where: {
        organizationId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: identifiers,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException(
        'Ya existe un cliente con ese correo o teléfono en esta organización.',
      );
    }
  }

  private normalizeCreate(dto: CreateClientDto) {
    return {
      name: normalizeClientName(dto.name),
      email: normalizeClientEmail(dto.email),
      phone: normalizeClientPhone(dto.phone),
      notes: normalizeClientNotes(dto.notes),
    };
  }

  private normalizeUpdate(dto: UpdateClientDto) {
    return {
      ...(dto.name !== undefined
        ? { name: normalizeClientName(dto.name) }
        : {}),
      ...(dto.email !== undefined
        ? { email: normalizeClientEmail(dto.email) }
        : {}),
      ...(dto.phone !== undefined
        ? { phone: normalizeClientPhone(dto.phone) }
        : {}),
      ...(dto.notes !== undefined
        ? { notes: normalizeClientNotes(dto.notes) }
        : {}),
    };
  }

  private translateDuplicateError(error: unknown): void {
    if (isUniqueConstraintError(error, 'email')) {
      throw new ConflictException(
        'Ya existe un cliente con ese correo en esta organización.',
      );
    }
  }
}
