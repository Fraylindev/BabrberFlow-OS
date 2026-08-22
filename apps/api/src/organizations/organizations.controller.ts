import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { B2B_ROLES } from '../auth/roles.constants';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @UseGuards(B2bAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post()
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  // Público: usado por el frontend para resolver el slug de la barbería
  // (ej. "elite-barber-shop") al organizationId que piden login/register.
  @Get('by-slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.organizationsService.findBySlug(slug);
  }

  // 🛡️ Ruta protegida, aislada (multi-tenant) y exclusiva de personal B2B
  @UseGuards(B2bAuthGuard, RolesGuard)
  @Roles(...B2B_ROLES)
  @Get('mine')
  findMine(@GetUser('organizationId') organizationId: string) {
    return this.organizationsService.findMine(organizationId);
  }

  // Restringido a OWNER/ADMIN (más estricto que B2B_ROLES) — ver quién
  // integra el equipo, con nombre y correo de cada persona, es
  // información de gestión de staff, igual que /auth/invite (que ya
  // tiene la misma restricción). Si se necesita que RECEPTIONIST/BARBER
  // también lo vean, es cambiar un decorador, no un rediseño.
  @UseGuards(B2bAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('mine/members')
  findMembers(@GetUser('organizationId') organizationId: string) {
    return this.organizationsService.findMembers(organizationId);
  }
}
