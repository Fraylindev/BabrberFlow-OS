import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { B2B_ROLES } from '../auth/roles.constants';
import { ListTeamMembersDto } from './dto/list-team-members.dto';
import { UpdateTeamMemberRoleDto } from './dto/update-team-member-role.dto';
import { RevokeTeamMemberAccessDto } from './dto/revoke-team-member-access.dto';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // 🛡️ Ruta protegida, aislada (multi-tenant) y exclusiva de personal B2B
  @UseGuards(B2bAuthGuard, RolesGuard)
  @Roles(...B2B_ROLES)
  @Get('mine')
  findMine(@GetUser('organizationId') organizationId: string) {
    return this.organizationsService.findMine(organizationId);
  }

  @UseGuards(B2bAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('mine/team-members')
  findTeamMembers(
    @GetUser('organizationId') organizationId: string,
    @Query() query: ListTeamMembersDto,
  ) {
    return this.organizationsService.findTeamMembers(organizationId, query);
  }

  @UseGuards(B2bAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch('mine/team-members/role')
  updateTeamMemberRole(
    @GetUser('organizationId') organizationId: string,
    @GetUser('id') actorUserId: string,
    @Body() dto: UpdateTeamMemberRoleDto,
  ) {
    return this.organizationsService.updateTeamMemberRole(
      organizationId,
      actorUserId,
      dto,
    );
  }

  @UseGuards(B2bAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('mine/team-members/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeTeamMemberAccess(
    @GetUser('organizationId') organizationId: string,
    @GetUser('id') actorUserId: string,
    @Body() dto: RevokeTeamMemberAccessDto,
  ): Promise<void> {
    await this.organizationsService.revokeTeamMemberAccess(
      organizationId,
      actorUserId,
      dto,
    );
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
