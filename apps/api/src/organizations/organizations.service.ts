import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { isUniqueConstraintError } from '../common/prisma-error.util';
import { ProfessionalStatus } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(createOrganizationDto: CreateOrganizationDto) {
    try {
      return await this.prisma.db.organization.create({
        data: createOrganizationDto,
      });
    } catch (err) {
      if (isUniqueConstraintError(err, 'slug')) {
        throw new ConflictException(
          'Ese enlace (slug) ya está en uso por otra barbería. Elige otro.',
        );
      }
      if (isUniqueConstraintError(err, 'email')) {
        throw new ConflictException(
          'Ya existe una organización registrada con ese correo.',
        );
      }
      throw err;
    }
  }

  // 🔒 Multi-tenancy: Buscar únicamente la organización asociada al token
  async findMine(organizationId: string) {
    return await this.prisma.db.organization.findUnique({
      where: { id: organizationId },
    });
  }

  // Público: resuelve el slug legible (ej. "elite-barber-shop") al id
  // interno que necesitan /auth/login y /auth/register. Solo expone lo
  // mínimo necesario para ese propósito, nunca datos sensibles.
  async findBySlug(slug: string) {
    const organization = await this.prisma.db.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true },
    });

    if (!organization) {
      throw new NotFoundException('No existe una organización con ese slug');
    }

    return organization;
  }

  // 🔒 Lista el equipo consultando Membership (no User directamente —
  // desde la identidad global, User ya no tiene organizationId propio).
  // select explícito en `user`, nunca spread: así password queda
  // excluido por construcción, no por un omit que alguien podría olvidar
  // mantener si el modelo User gana campos sensibles en el futuro.
  async findMembers(organizationId: string) {
    const memberships = await this.prisma.db.membership.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const userIds = memberships.map((membership) => membership.user.id);
    const professionals =
      userIds.length === 0
        ? []
        : await this.prisma.db.professional.findMany({
            where: { organizationId, userId: { in: userIds } },
            select: {
              id: true,
              userId: true,
              name: true,
              bio: true,
              avatar: true,
              specialty: true,
              experienceYears: true,
              status: true,
              isPublic: true,
            },
          });
    const professionalByUserId = new Map(
      professionals.flatMap((professional) =>
        professional.userId ? [[professional.userId, professional]] : [],
      ),
    );

    return memberships.map((membership) => {
      const professional = professionalByUserId.get(membership.user.id);
      return {
        membershipId: membership.id,
        role: membership.role,
        memberSince: membership.createdAt,
        user: {
          ...membership.user,
          professional: professional
            ? {
                id: professional.id,
                name: professional.name,
                bio: professional.bio,
                avatar: professional.avatar,
                specialty: professional.specialty,
                experienceYears: professional.experienceYears,
                status: professional.status,
                isActive: professional.status === ProfessionalStatus.ACTIVE,
                isPublic: professional.isPublic,
              }
            : null,
        },
      };
    });
  }
}
