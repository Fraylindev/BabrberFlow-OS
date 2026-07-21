import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

// Facturación es información financiera sensible: se restringe a los
// roles que manejan caja/administración. BARBER queda fuera.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  create(
    @GetUser('organizationId') organizationId: string,
    @Body() createInvoiceDto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(organizationId, createInvoiceDto);
  }

  @Get()
  findAll(@GetUser('organizationId') organizationId: string) {
    return this.invoicesService.findAll(organizationId);
  }

  @Patch(':id/pay')
  markAsPaid(
    @Param('id') id: string,
    @GetUser('organizationId') organizationId: string,
  ) {
    return this.invoicesService.markAsPaid(id, organizationId);
  }
}
