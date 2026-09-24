import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { RequestUser } from '../auth/types/authenticated-request';
import { GalleryOrderDto, GalleryOrderPublishDto } from './media.dto';
import { MediaGalleryService } from './media-gallery.service';

@Controller('media/gallery-order')
@UseGuards(B2bAuthGuard, RolesGuard, ThrottlerGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class MediaGalleryController {
  constructor(private readonly gallery: MediaGalleryService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  read(@GetUser() actor: RequestUser) {
    return this.gallery.read(actor);
  }

  @Patch()
  @Header('Cache-Control', 'private, no-store')
  save(@GetUser() actor: RequestUser, @Body() dto: GalleryOrderDto) {
    return this.gallery.saveDraft(actor, dto);
  }

  @Post('publish')
  @Roles(UserRole.OWNER)
  @Header('Cache-Control', 'private, no-store')
  publish(@GetUser() actor: RequestUser, @Body() dto: GalleryOrderPublishDto) {
    return this.gallery.publish(actor, dto);
  }
}
