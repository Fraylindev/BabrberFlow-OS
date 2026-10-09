import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BusinessScheduleService } from './business-schedule.service';
import {
  ConfirmBusinessZoneDto,
  CreateBusinessClosureDto,
  ReplaceBusinessWeekDto,
  ScheduleClosuresQueryDto,
  SchedulePageDto,
  ScheduleRevisionDto,
} from './business-schedule.dto';

@Controller('organizations/mine/schedule')
@UseGuards(B2bAuthGuard, RolesGuard)
export class BusinessScheduleController {
  constructor(private readonly schedules: BusinessScheduleService) {}
  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.BARBER)
  read(@GetUser('organizationId') org: string, @GetUser('id') actor: string) {
    return this.schedules.read(org, actor);
  }
  @Get('regions')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.BARBER)
  regions() {
    return this.schedules.regions();
  }
  @Get('closures')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.BARBER)
  closures(
    @GetUser('organizationId') org: string,
    @GetUser('id') actor: string,
    @Query() query: ScheduleClosuresQueryDto,
  ) {
    return this.schedules.closures(org, actor, query);
  }
  @Post('week/impact')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  weekImpact(
    @GetUser('organizationId') org: string,
    @GetUser('id') actor: string,
    @Body() dto: ReplaceBusinessWeekDto,
    @Query() page: SchedulePageDto,
  ) {
    return this.schedules.previewWeek(org, actor, dto, page);
  }
  @Put('week')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  week(
    @GetUser('organizationId') org: string,
    @GetUser('id') actor: string,
    @Body() dto: ReplaceBusinessWeekDto,
  ) {
    return this.schedules.replaceWeek(org, actor, dto);
  }
  @Post('closures/impact')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  closureImpact(
    @GetUser('organizationId') org: string,
    @GetUser('id') actor: string,
    @Body() dto: CreateBusinessClosureDto,
    @Query() page: SchedulePageDto,
  ) {
    return this.schedules.previewClosure(org, actor, dto, page);
  }
  @Post('closures')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  closure(
    @GetUser('organizationId') org: string,
    @GetUser('id') actor: string,
    @Body() dto: CreateBusinessClosureDto,
  ) {
    return this.schedules.createClosure(org, actor, dto);
  }
  @Post('closures/:id/cancel')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  cancel(
    @GetUser('organizationId') org: string,
    @GetUser('id') actor: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleRevisionDto,
  ) {
    return this.schedules.cancelClosure(org, actor, id, dto);
  }
  @Post('zone')
  @Roles(UserRole.OWNER)
  zone(
    @GetUser('organizationId') org: string,
    @GetUser('id') actor: string,
    @Body() dto: ConfirmBusinessZoneDto,
  ) {
    return this.schedules.confirmZone(org, actor, dto);
  }
}
