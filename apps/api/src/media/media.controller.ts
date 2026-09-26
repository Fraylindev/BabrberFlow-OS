import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { RequestUser } from '../auth/types/authenticated-request';
import { MediaAssetsService } from './media-assets.service';
import { MediaMutationDto, UpdateMediaDto, UploadMediaDto } from './media.dto';
import { MEDIA_MAX_BYTES } from './media-policy';

@Controller('media')
@UseGuards(ThrottlerGuard, B2bAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.BARBER)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class MediaController {
  constructor(private readonly assets: MediaAssetsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(@GetUser() actor: RequestUser) {
    return this.assets.list(actor);
  }

  @Post('uploads')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MEDIA_MAX_BYTES } }),
  )
  @Header('Cache-Control', 'private, no-store')
  upload(
    @GetUser() actor: RequestUser,
    @Body() dto: UploadMediaDto,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string },
  ) {
    return this.assets.upload(actor, dto, file);
  }

  @Patch(':id')
  @Header('Cache-Control', 'private, no-store')
  update(
    @GetUser() actor: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateMediaDto,
  ) {
    return this.assets.updateMetadata(actor, id, dto);
  }

  @Post(':id/publish')
  @Header('Cache-Control', 'private, no-store')
  publish(
    @GetUser() actor: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: MediaMutationDto,
  ) {
    return this.assets.publish(
      actor,
      id,
      dto.expectedRevision,
      dto.idempotencyKey,
    );
  }

  @Post(':id/retire')
  @Roles(UserRole.OWNER)
  @Header('Cache-Control', 'private, no-store')
  retire(
    @GetUser() actor: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: MediaMutationDto,
  ) {
    return this.assets.retire(
      actor,
      id,
      dto.expectedRevision,
      dto.idempotencyKey,
    );
  }

  @Post(':id/quarantine')
  @Roles(UserRole.OWNER)
  @Header('Cache-Control', 'private, no-store')
  quarantine(
    @GetUser() actor: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: MediaMutationDto,
  ) {
    return this.assets.retire(
      actor,
      id,
      dto.expectedRevision,
      dto.idempotencyKey,
      true,
    );
  }
}
