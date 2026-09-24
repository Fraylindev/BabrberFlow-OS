import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { MediaPublicService } from './media-public.service';

@Controller('public/:slug/media')
@UseGuards(ThrottlerGuard)
export class MediaPublicController {
  constructor(private readonly media: MediaPublicService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Header('Cache-Control', 'no-store')
  projection(@Param('slug') slug: string) {
    return this.media.projection(slug);
  }

  @Get(':token')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Header('Cache-Control', 'private, no-store')
  async image(
    @Param('slug') slug: string,
    @Param('token') token: string,
    @Res() response: Response,
  ) {
    response.setHeader('Cache-Control', 'private, no-store');
    const bytes = await this.media.image(slug, token);
    response.setHeader('Content-Type', 'image/webp');
    response.setHeader('Content-Length', bytes.length);
    response.send(bytes);
  }
}
