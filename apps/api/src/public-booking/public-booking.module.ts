import { Module } from '@nestjs/common';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';
import { BookingsModule } from '../bookings/bookings.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [BookingsModule, AuditModule],
  controllers: [PublicBookingController],
  providers: [PublicBookingService],
})
export class PublicBookingModule {}
