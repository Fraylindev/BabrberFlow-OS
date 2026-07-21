import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // Registrar clientes es tarea de recepción/administración
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @Post()
  create(
    @GetUser('organizationId') organizationId: string,
    @Body() createClientDto: CreateClientDto,
  ) {
    return this.clientsService.create(organizationId, createClientDto);
  }

  // Cualquier rol autenticado puede consultar la cartera de clientes
  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.clientsService.findAll(organizationId);
  }
}
