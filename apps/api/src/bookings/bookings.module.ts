import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { ProfessionalsModule } from '../professionals/professionals.module';

@Module({
  imports: [ProfessionalsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService], // Reutilizado por PublicBookingModule — evita duplicar la lógica de conflictos de horario
})
export class BookingsModule {}
