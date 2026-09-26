import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { B2B_ROLES } from '../auth/roles.constants';
import type { RequestUser } from '../auth/types/authenticated-request';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { RecordInvoicePaymentDto } from './dto/record-invoice-payment.dto';
import { InvoicesService } from './invoices.service';

@UseGuards(B2bAuthGuard, RolesGuard)
@Roles(...B2B_ROLES)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async findAll(
    @GetUser() user: RequestUser,
    @Query() query: QueryInvoicesDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.invoicesService.findAll(user, query);
    response.setHeader('X-Total-Count', result.pagination.total);
    response.setHeader('X-Page', result.pagination.page);
    response.setHeader('X-Limit', result.pagination.limit);
    response.setHeader('X-Total-Pages', result.pagination.totalPages);
    return result.data;
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: RequestUser,
  ) {
    return this.invoicesService.findOne(id, user);
  }

  @Post()
  async create(
    @GetUser() user: RequestUser,
    @Body() dto: CreateInvoiceDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.invoicesService.create(user, dto);
    response.status(result.isNew ? 201 : 200);
    return result.invoice;
  }

  @Post(':id/payments')
  async recordPayment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: RequestUser,
    @Body() dto: RecordInvoicePaymentDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.invoicesService.recordPayment(id, user, dto);
    response.status(result.isNew ? 201 : 200);
    return result.invoice;
  }
}
