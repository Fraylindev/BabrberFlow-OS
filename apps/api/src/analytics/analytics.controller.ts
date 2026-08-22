import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

// Ingresos y métricas globales de la organización — mismo criterio que
// /invoices (§24.5/24.10 de MAESTRO.md): BARBER queda excluido, no ve
// ingresos globales del negocio, solo su propia agenda.
@UseGuards(B2bAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboard(@GetUser('organizationId') organizationId: string) {
    return this.analyticsService.getDashboard(organizationId);
  }
}
