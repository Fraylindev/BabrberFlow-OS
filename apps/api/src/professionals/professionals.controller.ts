import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard) // 🛡️ Protegemos TODO el controlador a la vez
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

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

  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.professionalsService.findAll(organizationId);
  }
}
