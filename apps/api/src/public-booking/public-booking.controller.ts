import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PublicBookingService } from './public-booking.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';

// Sin JwtAuthGuard a propósito — esta es la puerta de entrada para
// clientes anónimos. El aislamiento por organización se resuelve
// SIEMPRE a partir del :slug de la URL, nunca de datos del body.
// ThrottlerGuard aplicado solo aquí (no global) — ver public-booking.module.ts.
@UseGuards(ThrottlerGuard)
@Controller('public/:slug')
export class PublicBookingController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  @Get('booking-data')
  getBookingData(@Param('slug') slug: string) {
    return this.publicBookingService.getBookingData(slug);
  }

  // Límite: 5 solicitudes/minuto por IP (configurado en el módulo).
  // Suficiente para uso legítimo, insuficiente para llenar la agenda de spam.
  @Post('bookings')
  createBooking(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicBookingDto,
  ) {
    return this.publicBookingService.createBooking(slug, dto);
  }
}
