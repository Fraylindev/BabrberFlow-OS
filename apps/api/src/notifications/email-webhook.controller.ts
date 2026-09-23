import {
  Controller,
  HttpCode,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseInterceptors,
  type RawBodyRequest,
} from '@nestjs/common';
import { type Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { EmailWorker } from './email-worker';
import {
  emailChannelConfig,
  ResendAdapter,
  verifyEmailWebhook,
} from './resend.adapter';
import { NotificationsErrorInterceptor } from './notifications-error.interceptor';

@Controller('notifications/resend')
@UseInterceptors(NotificationsErrorInterceptor)
export class EmailWebhookController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('webhook')
  @HttpCode(204)
  async receive(@Req() request: RawBodyRequest<Request>) {
    const config = emailChannelConfig(process.env);
    if (!config.webhookSecret)
      throw new ServiceUnavailableException('Canal no disponible');
    const event =
      request.rawBody &&
      verifyEmailWebhook(
        request.rawBody,
        request.headers,
        config.webhookSecret,
      );
    if (!event) throw new UnauthorizedException('Notificación no válida');
    try {
      const handled = await new EmailWorker(
        this.prisma.db,
        config,
        new ResendAdapter(config),
      ).receiveWebhook(event);
      if (!handled) throw new ServiceUnavailableException('Inténtalo de nuevo');
    } catch {
      throw new ServiceUnavailableException('Inténtalo de nuevo');
    }
  }
}
