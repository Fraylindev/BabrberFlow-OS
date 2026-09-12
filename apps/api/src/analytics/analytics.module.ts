import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { DashboardSummaryService } from './dashboard-summary.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, DashboardSummaryService],
})
export class AnalyticsModule {}
