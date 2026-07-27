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
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { B2B_ROLES } from '../auth/roles.constants';

// Todo este controlador es de uso interno (B2B) — un CUSTOMER nunca
// debe poder listar ni gestionar profesionales.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...B2B_ROLES)
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  // Solo OWNER/ADMIN pueden dar de alta profesionales (gestión de staff)
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

  // Cualquier rol B2B autenticado de la organización puede ver el listado
  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.professionalsService.findAll(organizationId);
  }

  // Solo OWNER/ADMIN editan profesionales
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @GetUser('organizationId') organizationId: string,
    @Body() updateProfessionalDto: UpdateProfessionalDto,
  ) {
    return this.professionalsService.update(
      id,
      organizationId,
      updateProfessionalDto,
    );
  }

  // Solo OWNER/ADMIN eliminan profesionales
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @GetUser('organizationId') organizationId: string,
  ) {
    return this.professionalsService.remove(id, organizationId);
  }
}
