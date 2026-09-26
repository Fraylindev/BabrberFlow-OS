import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import {
  BookingNotificationsController,
  NotificationsController,
} from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailWebhookController } from './email-webhook.controller';

@Module({
  imports: [AuditModule],
  controllers: [
    NotificationsController,
    BookingNotificationsController,
    EmailWebhookController,
  ],
  providers: [NotificationsService],
})
export class NotificationsModule {}
