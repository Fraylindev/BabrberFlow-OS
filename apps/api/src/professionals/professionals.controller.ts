import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard) // 🛡️ Protegemos TODO el controlador a la vez
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  // Solo OWNER/ADMIN pueden dar de alta profesionales (gestión de staff)
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  create(
    @GetUser('organizationId') organizationId: string,
    @Body() createProfessionalDto: CreateProfessionalDto,
  ) {
    return this.professionalsService.create(
      organizationId,
      createProfessionalDto,
    );
  }

  // Cualquier rol autenticado de la organización puede ver el listado
  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.professionalsService.findAll(organizationId);
  }
}
