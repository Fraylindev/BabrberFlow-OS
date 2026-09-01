import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { B2B_ROLES } from '../auth/roles.constants';
import { QueryServicesDto } from './dto/query-services.dto';

// Uso interno (B2B) — el catálogo administrativo de servicios no es el
// mismo endpoint que consume la reserva pública (esa usa /public/:slug/booking-data).
@UseGuards(B2bAuthGuard, RolesGuard)
@Roles(...B2B_ROLES)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // Solo OWNER/ADMIN administran el catálogo de servicios y sus precios
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  create(
    @GetUser('organizationId') organizationId: string,
    @GetUser('id') userId: string,
    @Body() createServiceDto: CreateServiceDto,
  ) {
    return this.servicesService.create(
      organizationId,
      userId,
      createServiceDto,
    );
  }

  // Cualquier rol B2B autenticado puede consultar el catálogo
  @Get()
  findAll(
    @GetUser('organizationId') organizationId: string,
    @Query() query: QueryServicesDto,
  ) {
    return this.servicesService.findAll(organizationId, query);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser('organizationId') organizationId: string,
  ) {
    return this.servicesService.findOne(id, organizationId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id/reactivate')
  reactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser('organizationId') organizationId: string,
    @GetUser('id') userId: string,
  ) {
    return this.servicesService.reactivate(id, organizationId, userId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser('organizationId') organizationId: string,
    @GetUser('id') userId: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.update(
      id,
      organizationId,
      userId,
      updateServiceDto,
    );
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id')
  deactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser('organizationId') organizationId: string,
    @GetUser('id') userId: string,
  ) {
    return this.servicesService.deactivate(id, organizationId, userId);
  }
}
