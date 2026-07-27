import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { PublicBookingService } from './public-booking.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';

// Sin JwtAuthGuard a propósito — esta es la puerta de entrada para
// clientes anónimos. El aislamiento por organización se resuelve
// SIEMPRE a partir del :slug de la URL, nunca de datos del body.
// ThrottlerGuard aplicado solo aquí (no global) — el registro de
// ThrottlerModule sí es global ahora (ver app.module.ts), pero activar
// el guard sigue siendo decisión de cada controlador.
@UseGuards(ThrottlerGuard)
@Controller('public/:slug')
export class PublicBookingController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  // Cacheado 15s — es la única lectura pública de alto tráfico repetido
  // (cualquier visitante de la página de reservas la llama) y de baja
  // frecuencia de cambio real (servicios/profesionales no cambian minuto
  // a minuto). CacheInterceptor usa la URL completa como key por
  // defecto, y el :slug ya forma parte de la URL — cada organización
  // cachea por separado, sin riesgo de mezclar datos entre tenants.
  // Nunca aplicado a POST /bookings (una mutación jamás se cachea).
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(15000)
  @Get('booking-data')
  getBookingData(@Param('slug') slug: string) {
    return this.publicBookingService.getBookingData(slug);
  }

  // 5 solicitudes/minuto por IP — override explícito, más estricto que
  // el límite global genérico (100/min, ver app.module.ts). Suficiente
  // para uso legítimo, insuficiente para llenar la agenda de spam.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('bookings')
  createBooking(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicBookingDto,
  ) {
    return this.publicBookingService.createBooking(slug, dto);
  }
}
