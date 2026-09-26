import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Get as HttpGet,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { type RequestUser } from '../auth/types/authenticated-request';
import {
  NotificationQueryDto,
  UpdateEmailPreferenceDto,
} from './email-preference.dto';
import { NotificationsService } from './notifications.service';
import { NotificationsErrorInterceptor } from './notifications-error.interceptor';

@Controller('notifications')
@UseInterceptors(NotificationsErrorInterceptor)
@UseGuards(B2bAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  history(@GetUser() user: RequestUser, @Query() query: NotificationQueryDto) {
    return this.service.history(user.organizationId, query, true);
  }

  @Post(':id/retry')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  retry(
    @GetUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    if (
      body !== undefined &&
      (body === null ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).length)
    ) {
      throw new BadRequestException('Revisa los datos de la solicitud');
    }
    return this.service.retry(user.organizationId, id, user.id);
  }
}

@Controller('bookings/:id')
@UseInterceptors(NotificationsErrorInterceptor)
@UseGuards(B2bAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST)
export class BookingNotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @HttpGet('notifications')
  @Header('Cache-Control', 'no-store')
  history(
    @GetUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.service.history(
      user.organizationId,
      query,
      user.role !== UserRole.RECEPTIONIST,
      id,
    );
  }

  @Get('email-preference')
  @Header('Cache-Control', 'no-store')
  preference(
    @GetUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.preference(user.organizationId, id);
  }

  @Patch('email-preference')
  @Header('Cache-Control', 'no-store')
  update(
    @GetUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEmailPreferenceDto,
  ) {
    return this.service.updatePreference(user.organizationId, id, user.id, dto);
  }
}
