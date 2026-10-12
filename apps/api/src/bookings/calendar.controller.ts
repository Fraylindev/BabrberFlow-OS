import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { B2B_ROLES } from '../auth/roles.constants';
import type { RequestUser } from '../auth/types/authenticated-request';
import { CalendarBudgetGuard, CALENDAR_BUDGET } from './calendar-budget.guard';
import { CalendarService } from './calendar.service';
import {
  CalendarQueryDto,
  CalendarRescheduleDto,
  RescheduleAvailabilityQueryDto,
  RescheduleDaysQueryDto,
} from './dto/calendar.dto';
const operators = [UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST];
@UseGuards(B2bAuthGuard, RolesGuard, CalendarBudgetGuard)
@Roles(...B2B_ROLES)
@Controller('bookings')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}
  @Get('calendar')
  @Header('Cache-Control', 'no-store')
  list(@GetUser() user: RequestUser, @Query() query: CalendarQueryDto) {
    return this.calendar.calendar(user, query);
  }
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  detail(
    @GetUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.calendar.detail(user, id);
  }
  @Get(':id/reschedule-availability-days')
  @Roles(...operators)
  @SetMetadata(CALENDAR_BUDGET, 'availability')
  @Header('Cache-Control', 'no-store')
  days(
    @GetUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: RescheduleDaysQueryDto,
  ) {
    return this.calendar.availabilityDays(user, id, query);
  }
  @Get(':id/reschedule-availability')
  @Roles(...operators)
  @SetMetadata(CALENDAR_BUDGET, 'availability')
  @Header('Cache-Control', 'no-store')
  slots(
    @GetUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: RescheduleAvailabilityQueryDto,
  ) {
    return this.calendar.availabilityForDate(user, id, query.date);
  }
  @Patch(':id/reschedule')
  @Roles(...operators)
  @SetMetadata(CALENDAR_BUDGET, 'write')
  @Header('Cache-Control', 'no-store')
  reschedule(
    @GetUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CalendarRescheduleDto,
  ) {
    return this.calendar.reschedule(user, id, dto);
  }
}
