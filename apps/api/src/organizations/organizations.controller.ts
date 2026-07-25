import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { B2B_ROLES } from '../auth/roles.constants';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...B2B_ROLES)
  @Get('mine')
  findMine(@GetUser('organizationId') organizationId: string) {
    return this.organizationsService.findMine(organizationId);
  }
}
