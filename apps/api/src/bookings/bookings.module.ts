import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarBudgetGuard } from './calendar-budget.guard';
import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { ProfessionalsModule } from '../professionals/professionals.module';

@Module({
  imports: [ProfessionalsModule],
  controllers: [CalendarController, BookingsController],
  providers: [BookingsService, CalendarService, CalendarBudgetGuard],
  exports: [BookingsService], // Reutilizado por PublicBookingModule — evita duplicar la lógica de conflictos de horario
})
export class BookingsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((_request: Request, response: Response, next: NextFunction) => {
        response.setHeader('Cache-Control', 'no-store');
        next();
      })
      .forRoutes(
        { path: 'bookings/calendar', method: RequestMethod.GET },
        { path: 'bookings/:id', method: RequestMethod.GET },
        {
          path: 'bookings/:id/reschedule-availability-days',
          method: RequestMethod.GET,
        },
        {
          path: 'bookings/:id/reschedule-availability',
          method: RequestMethod.GET,
        },
        { path: 'bookings/:id/reschedule', method: RequestMethod.PATCH },
      );
  }
}
