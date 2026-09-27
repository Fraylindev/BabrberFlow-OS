import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BusinessScheduleController } from './business-schedule.controller';
import { BusinessScheduleService } from './business-schedule.service';
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [BusinessScheduleController],
  providers: [BusinessScheduleService],
})
export class BusinessScheduleModule {}
