import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  // 🛡️ Ruta protegida y aislada (Multi-tenant)
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@GetUser('organizationId') organizationId: string) {
    return this.organizationsService.findMine(organizationId);
  }
}
