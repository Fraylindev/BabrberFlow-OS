import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { B2B_ROLES } from '../auth/roles.constants';
import type { RequestUser } from '../auth/types/authenticated-request';
import { UserRole } from '@prisma/client';

// Uso interno (B2B) — la reserva de clientes externos pasa por el módulo
// público (/public/:slug/bookings), no por aquí. Un CUSTOMER autenticado
// no debe poder ver ni gestionar la agenda completa de la barbería.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...B2B_ROLES)
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  @Post()
  create(
    @GetUser('organizationId') organizationId: string,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(organizationId, createBookingDto);
  }

  // Un BARBER ve únicamente su propia agenda (resuelta vía su vínculo
  // Professional.userId). El resto de los roles B2B ve la agenda completa
  // de la organización, como siempre.
  @Get()
  async findAll(@GetUser() user: RequestUser) {
    if (user.role === UserRole.BARBER) {
      const professional = await this.professionalsService.findByUserId(
        user.id,
      );
      if (!professional) return [];
      return this.bookingsService.findAll(user.organizationId, professional.id);
    }
    return this.bookingsService.findAll(user.organizationId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @GetUser('organizationId') organizationId: string,
    @Body() updateBookingStatusDto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(
      id,
      organizationId,
      updateBookingStatusDto,
    );
  }
}
