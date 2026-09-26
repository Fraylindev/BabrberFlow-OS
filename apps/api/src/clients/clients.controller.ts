import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { ClientsService } from './clients.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { B2B_ROLES } from '../auth/roles.constants';
import type { RequestUser } from '../auth/types/authenticated-request';

const CLIENT_MANAGEMENT_ROLES = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.RECEPTIONIST,
];

@UseGuards(B2bAuthGuard, RolesGuard)
@Roles(...B2B_ROLES)
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  @Roles(...CLIENT_MANAGEMENT_ROLES)
  @Post()
  create(@GetUser() user: RequestUser, @Body() dto: CreateClientDto) {
    return this.clientsService.create(user.organizationId, user.id, dto);
  }

  @Get()
  async findAll(
    @GetUser() user: RequestUser,
    @Query() query: QueryClientsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const professionalId = await this.resolveProfessionalId(user);
    const result = await this.clientsService.findAll(
      user.organizationId,
      query,
      professionalId,
    );

    response.setHeader('X-Total-Count', result.pagination.total);
    response.setHeader('X-Page', result.pagination.page);
    response.setHeader('X-Limit', result.pagination.limit);
    response.setHeader('X-Total-Pages', result.pagination.totalPages);
    return result.data;
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: RequestUser,
  ) {
    const professionalId = await this.resolveProfessionalId(user);
    return this.clientsService.findOne(id, user.organizationId, professionalId);
  }

  @Roles(...CLIENT_MANAGEMENT_ROLES)
  @Patch(':id/restore')
  restore(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: RequestUser,
  ) {
    return this.clientsService.restore(id, user.organizationId, user.id);
  }

  @Roles(...CLIENT_MANAGEMENT_ROLES)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: RequestUser,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, user.organizationId, user.id, dto);
  }

  @Roles(...CLIENT_MANAGEMENT_ROLES)
  @Delete(':id')
  archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: RequestUser,
  ) {
    return this.clientsService.archive(id, user.organizationId, user.id);
  }

  private async resolveProfessionalId(
    user: RequestUser,
  ): Promise<string | undefined> {
    if (user.role !== UserRole.BARBER) return undefined;
    const professional = await this.professionalsService.findByUserId(
      user.id,
      user.organizationId,
    );
    return professional?.id ?? '__unlinked_barber__';
  }
}
