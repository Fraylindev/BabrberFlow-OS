import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';

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
}
