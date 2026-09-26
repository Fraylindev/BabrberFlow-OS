import { Module } from '@nestjs/common';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';
import { BookingsModule } from '../bookings/bookings.module';
import { AuditModule } from '../audit/audit.module';
import { ProfessionalsModule } from '../professionals/professionals.module';

@Module({
  imports: [BookingsModule, AuditModule, ProfessionalsModule],
  controllers: [PublicBookingController],
  providers: [PublicBookingService],
})
export class PublicBookingModule {}
