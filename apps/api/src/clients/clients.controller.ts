import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { B2B_ROLES } from '../auth/roles.constants';
import type { RequestUser } from '../auth/types/authenticated-request';

// Uso interno (B2B) — la cartera de clientes es información sensible del
// negocio. Un CUSTOMER jamás debe poder listar clientes de otros.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...B2B_ROLES)
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  // Registrar clientes es tarea de recepción/administración
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @Post()
  create(
    @GetUser('organizationId') organizationId: string,
    @Body() createClientDto: CreateClientDto,
  ) {
    return this.clientsService.create(organizationId, createClientDto);
  }

  // Un BARBER ve únicamente los clientes con los que tiene al menos una
  // cita — "mis clientes", no toda la cartera de la barbería.
  @Get()
  async findAll(@GetUser() user: RequestUser) {
    if (user.role === UserRole.BARBER) {
      const professional = await this.professionalsService.findByUserId(
        user.id,
      );
      if (!professional) return [];
      return this.clientsService.findAll(user.organizationId, professional.id);
    }
    return this.clientsService.findAll(user.organizationId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @GetUser('organizationId') organizationId: string,
    @GetUser('id') userId: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.update(
      id,
      organizationId,
      userId,
      updateClientDto,
    );
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @GetUser('organizationId') organizationId: string,
    @GetUser('id') userId: string,
  ) {
    return this.clientsService.remove(id, organizationId, userId);
  }
}
