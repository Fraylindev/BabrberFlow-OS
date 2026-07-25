import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';

@Injectable()
export class ProfessionalsService {
  constructor(private prisma: PrismaService) {}

  async create(
    organizationId: string,
    createProfessionalDto: CreateProfessionalDto,
  ) {
    return await this.prisma.db.professional.create({
      data: {
        ...createProfessionalDto,
        organizationId, // 🔒 Inyectado de forma segura desde el JWT
      },
    });
  }

  async findAll(organizationId: string) {
    return await this.prisma.db.professional.findMany({
      where: { organizationId }, // 🔒 Filtro estricto multi-tenant
    });
  }

  // Resuelve qué Professional corresponde a un User dado (vínculo opcional
  // 1:1, ver schema.prisma). Usado para que un BARBER solo vea su propia
  // agenda/clientes, nunca los de sus compañeros.
  async findByUserId(userId: string) {
    return await this.prisma.db.professional.findUnique({
      where: { userId },
    });
  }
}
