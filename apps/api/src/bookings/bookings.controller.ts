import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
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
  // Un BARBER ve únicamente su propia agenda (resuelta vía su vínculo
  // Professional.userId). El resto de los roles B2B ve la agenda completa
  // de la organización, como siempre. from/to/status son opcionales — sin
  // ellos, mismo comportamiento de siempre (todo el historial).
  @Get()
  async findAll(
    @GetUser() user: RequestUser,
    @Query() query: QueryBookingsDto,
  ) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (user.role === UserRole.BARBER) {
      const professional = await this.professionalsService.findByUserId(
        user.id,
      );
      if (!professional) return [];
      return this.bookingsService.findAll(
        user.organizationId,
        professional.id,
        from,
        to,
        query.status,
      );
    }
    return this.bookingsService.findAll(
      user.organizationId,
      undefined,
      from,
      to,
      query.status,
    );
  }

  // Reprogramar: cambia fecha/hora y, opcionalmente, profesional/servicio
  // de una cita existente. Separado de :id/status a propósito — son dos
  // operaciones de negocio distintas (mover una cita vs. cambiar su
  // estado), cada una con su propia validación.
  @Patch(':id')
  reschedule(
    @Param('id') id: string,
    @GetUser('organizationId') organizationId: string,
    @Body() rescheduleBookingDto: RescheduleBookingDto,
  ) {
    return this.bookingsService.reschedule(
      id,
      organizationId,
      rescheduleBookingDto,
    );
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
