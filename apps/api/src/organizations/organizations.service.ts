import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(createOrganizationDto: CreateOrganizationDto) {
    return await this.prisma.db.organization.create({
      data: createOrganizationDto,
    });
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
}
