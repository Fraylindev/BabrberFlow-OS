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
}
