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
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
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
