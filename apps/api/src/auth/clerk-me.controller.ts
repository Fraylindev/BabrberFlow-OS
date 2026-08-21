import { Controller, Get, UseGuards } from '@nestjs/common';
import { OrganizationsService } from '../organizations/organizations.service';
import { GetUser } from './decorators/get-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { B2B_ROLES } from './roles.constants';

@Controller('auth/clerk')
export class ClerkMeController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles(...B2B_ROLES)
  @Get('me')
  findMine(@GetUser('organizationId') organizationId: string) {
    return this.organizationsService.findMine(organizationId);
  }
}
