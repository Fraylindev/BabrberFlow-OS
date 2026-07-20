import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(
    @GetUser('organizationId') organizationId: string,
    @Body() createClientDto: CreateClientDto,
  ) {
    return this.clientsService.create(organizationId, createClientDto);
  }

  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.clientsService.findAll(organizationId);
  }
}
