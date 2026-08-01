import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { isUniqueConstraintError } from '../common/prisma-error.util';

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
            professional: true,
          },
        },
      },
    });

    return memberships.map((m) => ({
      membershipId: m.id,
      role: m.role,
      memberSince: m.createdAt,
      user: m.user,
    }));
  }
}
