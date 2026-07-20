import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, createClientDto: CreateClientDto) {
    return await this.prisma.db.client.create({
      data: {
        ...createClientDto,
        organizationId,
      },
    });
  }

  async findAll(organizationId: string) {
    return await this.prisma.db.client.findMany({
      where: { organizationId },
    });
  }
}
