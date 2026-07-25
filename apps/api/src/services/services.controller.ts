import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { B2B_ROLES } from '../auth/roles.constants';

// Uso interno (B2B) — el catálogo administrativo de servicios no es el
// mismo endpoint que consume la reserva pública (esa usa /public/:slug/booking-data).
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...B2B_ROLES)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Solo OWNER/ADMIN administran el catálogo de servicios y sus precios
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  create(
    @GetUser('organizationId') organizationId: string,
    @Body() createServiceDto: CreateServiceDto,
  ) {
    return this.servicesService.create(organizationId, createServiceDto);
  }

  // Cualquier rol B2B autenticado puede consultar el catálogo
  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.servicesService.findAll(organizationId);
  }
}
