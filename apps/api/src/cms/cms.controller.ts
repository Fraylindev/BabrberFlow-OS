import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CmsService } from './cms.service';
import { CmsMutationDto, SaveCmsDraftDto } from './cms.dto';

@Controller('organizations/mine/cms')
@UseGuards(ThrottlerGuard, B2bAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  read(
    @GetUser('organizationId') tenant: string,
    @GetUser('id') actor: string,
  ) {
    return this.cms.read(tenant, actor);
  }

  @Get('preview')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  preview(
    @GetUser('organizationId') tenant: string,
    @GetUser('id') actor: string,
  ) {
    return this.cms.read(tenant, actor, true);
  }

  @Patch('draft')
  @Header('Cache-Control', 'private, no-store')
  save(
    @GetUser('organizationId') tenant: string,
    @GetUser('id') actor: string,
    @Body() dto: SaveCmsDraftDto,
  ) {
    return this.cms.mutate(tenant, actor, 'SAVE_DRAFT', dto);
  }

  @Post('publish')
  @HttpCode(200)
  @Roles(UserRole.OWNER)
  @Header('Cache-Control', 'private, no-store')
  publish(
    @GetUser('organizationId') tenant: string,
    @GetUser('id') actor: string,
    @Body() dto: CmsMutationDto,
  ) {
    return this.cms.mutate(tenant, actor, 'PUBLISH', dto);
  }

  @Post('unpublish')
  @HttpCode(200)
  @Roles(UserRole.OWNER)
  @Header('Cache-Control', 'private, no-store')
  unpublish(
    @GetUser('organizationId') tenant: string,
    @GetUser('id') actor: string,
    @Body() dto: CmsMutationDto,
  ) {
    return this.cms.mutate(tenant, actor, 'UNPUBLISH', dto);
  }
}
