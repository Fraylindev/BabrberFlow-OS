import { Module } from '@nestjs/common';
import { MediaCloudinary } from './media-cloudinary';
import { MediaAssetsService } from './media-assets.service';
import { MediaController } from './media.controller';
import { MediaGalleryController } from './media-gallery.controller';
import { MediaGalleryService } from './media-gallery.service';
import { MediaPromotionsController } from './media-promotions.controller';
import { MediaPromotionsService } from './media-promotions.service';
import { MediaPublicController } from './media-public.controller';
import { MediaPublicService } from './media-public.service';
import { MediaPurgeWorker } from './media-purge.worker';

@Module({
  controllers: [
    MediaGalleryController,
    MediaPromotionsController,
    MediaController,
    MediaPublicController,
  ],
  providers: [
    MediaCloudinary,
    MediaAssetsService,
    MediaGalleryService,
    MediaPromotionsService,
    MediaPublicService,
    MediaPurgeWorker,
  ],
})
export class MediaModule {}
