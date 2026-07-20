import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard) // 🛡️ Controlador protegido
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  create(
    @GetUser('organizationId') organizationId: string,
    @Body() createServiceDto: CreateServiceDto,
  ) {
    return this.servicesService.create(organizationId, createServiceDto);
  }

  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.servicesService.findAll(organizationId);
  }
}
