import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
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
import {
  PromotionDraftDto,
  PromotionMutationDto,
  UpdatePromotionDraftDto,
} from './media.dto';
import { MediaPromotionsService } from './media-promotions.service';

@Controller('media/promotions')
@UseGuards(B2bAuthGuard, RolesGuard, ThrottlerGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class MediaPromotionsController {
  constructor(private readonly promotions: MediaPromotionsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(@GetUser() actor: RequestUser) {
    return this.promotions.list(actor);
  }

  @Post()
  @Header('Cache-Control', 'private, no-store')
  create(@GetUser() actor: RequestUser, @Body() dto: PromotionDraftDto) {
    return this.promotions.create(actor, dto);
  }

  @Patch(':id')
  @Header('Cache-Control', 'private, no-store')
  save(
    @GetUser() actor: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePromotionDraftDto,
  ) {
    return this.promotions.saveDraft(actor, id, dto);
  }

  @Post(':id/publish')
  @Roles(UserRole.OWNER)
  @Header('Cache-Control', 'private, no-store')
  publish(
    @GetUser() actor: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: PromotionMutationDto,
  ) {
    return this.promotions.publish(actor, id, dto);
  }

  @Post(':id/retire')
  @Roles(UserRole.OWNER)
  @Header('Cache-Control', 'private, no-store')
  retire(
    @GetUser() actor: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: PromotionMutationDto,
  ) {
    return this.promotions.retire(actor, id, dto);
  }
}
