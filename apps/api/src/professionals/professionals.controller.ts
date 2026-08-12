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
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpdateOwnProfessionalDto } from './dto/update-own-professional.dto';
import { QueryProfessionalsDto } from './dto/query-professionals.dto';
import { UpdateProfessionalStatusDto } from './dto/update-professional-status.dto';
import { UpdateProfessionalVisibilityDto } from './dto/update-professional-visibility.dto';
import { LinkProfessionalUserDto } from './dto/link-professional-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { B2B_ROLES } from '../auth/roles.constants';
import type { RequestUser } from '../auth/types/authenticated-request';

const PROFESSIONAL_MANAGEMENT_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
];

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...B2B_ROLES)
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Roles(...PROFESSIONAL_MANAGEMENT_ROLES)
  @Post()
  create(@GetUser() user: RequestUser, @Body() dto: CreateProfessionalDto) {
    return this.professionalsService.create(user.organizationId, user.id, dto);
  }

  @Get()
  async findAll(
    @GetUser() user: RequestUser,
    @Query() query: QueryProfessionalsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const managementView = PROFESSIONAL_MANAGEMENT_ROLES.includes(user.role);
    const result = await this.professionalsService.findAll(
      user.organizationId,
      query,
      managementView,
    );
    response.setHeader('X-Total-Count', result.pagination.total);
    response.setHeader('X-Page', result.pagination.page);
    response.setHeader('X-Limit', result.pagination.limit);
    response.setHeader('X-Total-Pages', result.pagination.totalPages);
    return result.data;
  }

  @Roles(UserRole.BARBER)
  @Get('me')
  findMe(@GetUser() user: RequestUser) {
    return this.professionalsService.findMe(user.id, user.organizationId);
  }

  @Roles(UserRole.BARBER)
  @Patch('me')
  updateMe(
    @GetUser() user: RequestUser,
    @Body() dto: UpdateOwnProfessionalDto,
  ) {
    return this.professionalsService.updateMe(
      user.id,
      user.organizationId,
      dto,
    );
  }

  @Roles(...PROFESSIONAL_MANAGEMENT_ROLES)
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser('organizationId') organizationId: string,
  ) {
    return this.professionalsService.findOne(id, organizationId);
  }

  @Roles(...PROFESSIONAL_MANAGEMENT_ROLES)
  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: RequestUser,
    @Body() dto: UpdateProfessionalStatusDto,
  ) {
    return this.professionalsService.updateStatus(
      id,
      user.organizationId,
      user.id,
      dto.status,
    );
  }

  @Roles(...PROFESSIONAL_MANAGEMENT_ROLES)
  @Patch(':id/visibility')
  updateVisibility(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: RequestUser,
    @Body() dto: UpdateProfessionalVisibilityDto,
  ) {
    return this.professionalsService.updateVisibility(
      id,
      user.organizationId,
      user.id,
      dto.isPublic,
    );
  }

  @Roles(...PROFESSIONAL_MANAGEMENT_ROLES)
  @Patch(':id/link')
  linkUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: RequestUser,
    @Body() dto: LinkProfessionalUserDto,
  ) {
    return this.professionalsService.linkUser(
      id,
      user.organizationId,
      user.id,
      dto.userId,
    );
  }

  @Roles(...PROFESSIONAL_MANAGEMENT_ROLES)
  @Delete(':id/link')
  unlinkUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: RequestUser,
  ) {
    return this.professionalsService.unlinkUser(
      id,
      user.organizationId,
      user.id,
    );
  }

  @Roles(...PROFESSIONAL_MANAGEMENT_ROLES)
  @Patch(':id/restore')
  restore(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: RequestUser,
  ) {
    return this.professionalsService.restore(id, user.organizationId, user.id);
  }

  @Roles(...PROFESSIONAL_MANAGEMENT_ROLES)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: RequestUser,
    @Body() dto: UpdateProfessionalDto,
  ) {
    return this.professionalsService.update(
      id,
      user.organizationId,
      user.id,
      dto,
    );
  }

  @Roles(...PROFESSIONAL_MANAGEMENT_ROLES)
  @Delete(':id')
  archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: RequestUser,
  ) {
    return this.professionalsService.archive(id, user.organizationId, user.id);
  }
}
