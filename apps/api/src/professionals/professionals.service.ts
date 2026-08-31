import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  Prisma,
  ProfessionalStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  isRecordNotFoundError,
  isUniqueConstraintError,
} from '../common/prisma-error.util';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpdateOwnProfessionalDto } from './dto/update-own-professional.dto';
import type { OperableProfessionalStatus } from './dto/update-professional-status.dto';
import { QueryProfessionalsDto } from './dto/query-professionals.dto';
import {
  ProfessionalDirectoryResponseDto,
  ProfessionalListResult,
  ProfessionalManagementResponseDto,
  ProfessionalOwnProfileResponseDto,
  professionalDirectorySelect,
  professionalManagementSelect,
  professionalOwnProfileSelect,
  toProfessionalDirectory,
  toProfessionalManagement,
  toProfessionalOwnProfile,
} from './dto/professional-response.dto';
import {
  PROFESSIONAL_DEFAULT_PAGE_SIZE,
  PROFESSIONAL_MAX_PAGE_SIZE,
} from './professionals.constants';
import { lockProfessionalForBookingIntegrity } from '../common/professional-booking-lock';

type ProfessionalListResponse =
  ProfessionalDirectoryResponseDto | ProfessionalManagementResponseDto;

@Injectable()
export class ProfessionalsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateProfessionalDto,
  ): Promise<ProfessionalManagementResponseDto> {
    const created = await this.prisma.db.professional.create({
      data: { ...this.normalizeCreate(dto), organizationId },
      select: professionalManagementSelect,
    });

    await this.auditAction(organizationId, userId, 'CREATE', created.id);
    return toProfessionalManagement(created);
  }

  async findAll(
    organizationId: string,
    query: QueryProfessionalsDto,
    managementView: boolean,
  ): Promise<ProfessionalListResult<ProfessionalListResponse>> {
    const page = Number(query.page ?? 1);
    const limit = Math.min(
      Number(query.limit ?? PROFESSIONAL_DEFAULT_PAGE_SIZE),
      PROFESSIONAL_MAX_PAGE_SIZE,
    );
    if (!managementView && query.status === ProfessionalStatus.ARCHIVED) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }
    const search = query.search?.trim();
    const where: Prisma.ProfessionalWhereInput = {
      organizationId,
      ...(query.status
        ? { status: query.status }
        : { status: { not: ProfessionalStatus.ARCHIVED } }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { specialty: { contains: search, mode: 'insensitive' } },
              ...(managementView
                ? [{ phone: { contains: search } } as const]
                : []),
            ],
          }
        : {}),
    };
    const commonArgs = {
      where,
      orderBy: [
        { name: 'asc' },
        { id: 'asc' },
      ] as Prisma.ProfessionalOrderByWithRelationInput[],
      skip: (page - 1) * limit,
      take: limit,
    };
    const total = await this.prisma.db.professional.count({ where });
    const data = managementView
      ? (
          await this.prisma.db.professional.findMany({
            ...commonArgs,
            select: professionalManagementSelect,
          })
        ).map(toProfessionalManagement)
      : (
          await this.prisma.db.professional.findMany({
            ...commonArgs,
            select: professionalDirectorySelect,
          })
        ).map(toProfessionalDirectory);

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
  ): Promise<ProfessionalManagementResponseDto> {
    const professional = await this.prisma.db.professional.findFirst({
      where: { id, organizationId },
      select: professionalManagementSelect,
    });
    if (!professional) throw new NotFoundException('Profesional no encontrado');
    return toProfessionalManagement(professional);
  }

  async findMe(
    userId: string,
    organizationId: string,
  ): Promise<ProfessionalOwnProfileResponseDto> {
    const professional = await this.prisma.db.professional.findFirst({
      where: { userId, organizationId },
      select: professionalOwnProfileSelect,
    });
    if (!professional) {
      throw new NotFoundException(
        'No tienes un perfil profesional vinculado en esta organización',
      );
    }
    return toProfessionalOwnProfile(professional);
  }

  async findByUserId(userId: string, organizationId: string) {
    const professional = await this.prisma.db.professional.findFirst({
      where: {
        userId,
        organizationId,
        status: { not: ProfessionalStatus.ARCHIVED },
      },
      select: { id: true, status: true },
    });
    return professional
      ? {
          ...professional,
          isActive: professional.status === ProfessionalStatus.ACTIVE,
        }
      : null;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateProfessionalDto,
  ): Promise<ProfessionalManagementResponseDto> {
    this.assertNonEmptyPatch(dto);
    await this.findOwnedOrThrow(id, organizationId);
    return this.updateManagementProfile(
      id,
      organizationId,
      userId,
      this.normalizeUpdate(dto),
    );
  }

  async updateMe(
    userId: string,
    organizationId: string,
    dto: UpdateOwnProfessionalDto,
  ): Promise<ProfessionalOwnProfileResponseDto> {
    this.assertNonEmptyPatch(dto);
    const current = await this.prisma.db.professional.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (!current) {
      throw new NotFoundException(
        'No tienes un perfil profesional vinculado en esta organización',
      );
    }

    try {
      const updated = await this.prisma.db.professional.update({
        where: { organizationId_userId: { organizationId, userId } },
        data: this.normalizeUpdate(dto),
        select: professionalOwnProfileSelect,
      });
      await this.auditAction(organizationId, userId, 'UPDATE', current.id);
      return toProfessionalOwnProfile(updated);
    } catch (error) {
      this.rethrowNotFound(error);
    }
  }

  async updateStatus(
    id: string,
    organizationId: string,
    userId: string,
    status: OperableProfessionalStatus,
  ): Promise<ProfessionalManagementResponseDto> {
    const current = await this.findOwnedOrThrow(id, organizationId);
    if (current.status === ProfessionalStatus.ARCHIVED) {
      throw new BadRequestException(
        'Restaura el profesional antes de cambiar su estado',
      );
    }
    if (current.status === status) return toProfessionalManagement(current);
    return this.setStatus(id, organizationId, userId, status, 'STATUS_CHANGE');
  }

  async updateVisibility(
    id: string,
    organizationId: string,
    userId: string,
    isPublic: boolean,
  ): Promise<ProfessionalManagementResponseDto> {
    const current = await this.findOwnedOrThrow(id, organizationId);
    if (current.isPublic === isPublic) return toProfessionalManagement(current);

    try {
      const updated = await this.prisma.db.professional.update({
        where: { id, organizationId },
        data: { isPublic },
        select: professionalManagementSelect,
      });
      await this.auditAction(organizationId, userId, 'UPDATE', id);
      return toProfessionalManagement(updated);
    } catch (error) {
      this.rethrowNotFound(error);
    }
  }

  async archive(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<ProfessionalManagementResponseDto> {
    const result = await this.prisma.db.$transaction(async (transaction) => {
      const locked = await lockProfessionalForBookingIntegrity(
        transaction,
        id,
        organizationId,
      );
      if (!locked) throw new NotFoundException('Profesional no encontrado');

      const current = await transaction.professional.findUnique({
        where: { id, organizationId },
        select: professionalManagementSelect,
      });
      if (!current) throw new NotFoundException('Profesional no encontrado');
      if (current.status === ProfessionalStatus.ARCHIVED) {
        return { professional: current, archived: false };
      }

      const futureBookings = await transaction.booking.count({
        where: {
          organizationId,
          professionalId: id,
          startTime: { gt: new Date() },
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        },
      });
      if (futureBookings > 0) {
        throw new ConflictException(
          'No se puede archivar: el profesional tiene reservas futuras pendientes o confirmadas',
        );
      }

      const professional = await transaction.professional.update({
        where: { id, organizationId },
        data: { status: ProfessionalStatus.ARCHIVED },
        select: professionalManagementSelect,
      });
      return { professional, archived: true };
    });

    if (result.archived) {
      await this.auditAction(organizationId, userId, 'ARCHIVE', id);
    }
    return toProfessionalManagement(result.professional);
  }

  async restore(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<ProfessionalManagementResponseDto> {
    const current = await this.findOwnedOrThrow(id, organizationId);
    if (current.status !== ProfessionalStatus.ARCHIVED) {
      throw new BadRequestException('El profesional no está archivado');
    }
    return this.setStatus(
      id,
      organizationId,
      userId,
      ProfessionalStatus.INACTIVE,
      'RESTORE',
    );
  }

  async linkUser(
    id: string,
    organizationId: string,
    actorUserId: string,
    targetUserId: string,
  ): Promise<ProfessionalManagementResponseDto> {
    const normalizedTargetUserId = targetUserId.trim();
    const current = await this.findOwnedOrThrow(id, organizationId);
    if (current.user?.id === normalizedTargetUserId) {
      return toProfessionalManagement(current);
    }
    if (current.user) {
      throw new ConflictException(
        'Desvincula la cuenta actual antes de asignar otra',
      );
    }

    const membership = await this.prisma.db.membership.findFirst({
      where: {
        userId: normalizedTargetUserId,
        organizationId,
        role: UserRole.BARBER,
      },
      select: { id: true },
    });
    if (!membership) {
      throw new BadRequestException(
        'La cuenta debe tener una Membership BARBER en esta organización',
      );
    }

    const alreadyLinked = await this.prisma.db.professional.findFirst({
      where: {
        organizationId,
        userId: normalizedTargetUserId,
        id: { not: id },
      },
      select: { id: true },
    });
    if (alreadyLinked) {
      throw new ConflictException(
        'La cuenta BARBER ya está vinculada a otro profesional de esta organización',
      );
    }

    try {
      const updated = await this.prisma.db.professional.update({
        where: { id, organizationId },
        data: { userId: normalizedTargetUserId },
        select: professionalManagementSelect,
      });
      await this.auditAction(organizationId, actorUserId, 'LINK', id);
      return toProfessionalManagement(updated);
    } catch (error) {
      if (isUniqueConstraintError(error, 'userId')) {
        throw new ConflictException(
          'La cuenta BARBER ya est\u00e1 vinculada a otro profesional de esta organizaci\u00f3n',
        );
      }
      this.rethrowNotFound(error);
    }
  }

  async unlinkUser(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<ProfessionalManagementResponseDto> {
    const current = await this.findOwnedOrThrow(id, organizationId);
    if (!current.user) return toProfessionalManagement(current);

    try {
      const updated = await this.prisma.db.professional.update({
        where: { id, organizationId },
        data: { userId: null },
        select: professionalManagementSelect,
      });
      await this.auditAction(organizationId, userId, 'UNLINK', id);
      return toProfessionalManagement(updated);
    } catch (error) {
      this.rethrowNotFound(error);
    }
  }

  private async updateManagementProfile(
    id: string,
    organizationId: string,
    userId: string,
    data: Prisma.ProfessionalUpdateInput,
  ): Promise<ProfessionalManagementResponseDto> {
    try {
      const updated = await this.prisma.db.professional.update({
        where: { id, organizationId },
        data,
        select: professionalManagementSelect,
      });
      await this.auditAction(organizationId, userId, 'UPDATE', id);
      return toProfessionalManagement(updated);
    } catch (error) {
      this.rethrowNotFound(error);
    }
  }

  private async setStatus(
    id: string,
    organizationId: string,
    userId: string,
    status: ProfessionalStatus,
    action: 'STATUS_CHANGE' | 'ARCHIVE' | 'RESTORE',
  ): Promise<ProfessionalManagementResponseDto> {
    try {
      const updated = await this.prisma.db.professional.update({
        where: { id, organizationId },
        data: { status },
        select: professionalManagementSelect,
      });
      await this.auditAction(organizationId, userId, action, id);
      return toProfessionalManagement(updated);
    } catch (error) {
      this.rethrowNotFound(error);
    }
  }

  private async findOwnedOrThrow(id: string, organizationId: string) {
    const professional = await this.prisma.db.professional.findFirst({
      where: { id, organizationId },
      select: professionalManagementSelect,
    });
    if (!professional) throw new NotFoundException('Profesional no encontrado');
    return professional;
  }

  private normalizeCreate(dto: CreateProfessionalDto) {
    return {
      name: this.normalizeName(dto.name),
      bio: this.normalizeOptionalText(dto.bio),
      phone: this.normalizeOptionalText(dto.phone),
      avatar: this.normalizeOptionalText(dto.avatar),
      specialty: this.normalizeOptionalText(dto.specialty),
      experienceYears: dto.experienceYears ?? null,
    };
  }

  private normalizeUpdate(
    dto: UpdateProfessionalDto | UpdateOwnProfessionalDto,
  ): Prisma.ProfessionalUpdateInput {
    return {
      ...(dto.name !== undefined ? { name: this.normalizeName(dto.name) } : {}),
      ...(dto.bio !== undefined
        ? { bio: this.normalizeOptionalText(dto.bio) }
        : {}),
      ...(dto.phone !== undefined
        ? { phone: this.normalizeOptionalText(dto.phone) }
        : {}),
      ...(dto.avatar !== undefined
        ? { avatar: this.normalizeOptionalText(dto.avatar) }
        : {}),
      ...(dto.specialty !== undefined
        ? { specialty: this.normalizeOptionalText(dto.specialty) }
        : {}),
      ...(dto.experienceYears !== undefined
        ? { experienceYears: dto.experienceYears }
        : {}),
    };
  }

  private normalizeName(value: string): string {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException('name no puede estar vacío');
    return normalized;
  }

  private normalizeOptionalText(
    value: string | null | undefined,
  ): string | null {
    if (value == null) return null;
    return value.trim() || null;
  }

  private assertNonEmptyPatch(dto: object): void {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Debe enviar al menos un campo para actualizar',
      );
    }
  }

  private rethrowNotFound(error: unknown): never {
    if (isRecordNotFoundError(error)) {
      throw new NotFoundException('Profesional no encontrado');
    }
    throw error;
  }

  private async auditAction(
    organizationId: string,
    userId: string,
    action:
      | 'CREATE'
      | 'UPDATE'
      | 'STATUS_CHANGE'
      | 'ARCHIVE'
      | 'RESTORE'
      | 'LINK'
      | 'UNLINK',
    entityId: string,
  ) {
    await this.audit.log({
      organizationId,
      userId,
      action,
      entity: 'Professional',
      entityId,
    });
  }
}
