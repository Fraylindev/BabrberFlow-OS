import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ProfessionalsModule, AuditModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
