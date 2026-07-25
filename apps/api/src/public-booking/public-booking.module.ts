import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [
    BookingsModule,
    // Limitador SOLO para este módulo — deliberadamente no registrado
    // como guard global, para no arriesgar tocar el tráfico autenticado
    // del personal. 5 solicitudes/minuto por IP.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 5 }]),
  ],
  controllers: [PublicBookingController],
  providers: [PublicBookingService],
})
export class PublicBookingModule {}
