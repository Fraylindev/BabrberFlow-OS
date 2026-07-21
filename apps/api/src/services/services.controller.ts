import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard) // 🛡️ Controlador protegido
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Solo OWNER/ADMIN administran el catálogo de servicios y sus precios
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  create(
    @GetUser('organizationId') organizationId: string,
    @Body() createServiceDto: CreateServiceDto,
  ) {
    return this.servicesService.create(organizationId, createServiceDto);
  }

  // Cualquier rol autenticado puede consultar el catálogo
  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.servicesService.findAll(organizationId);
  }
}
