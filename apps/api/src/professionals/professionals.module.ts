import { Module } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsController } from './professionals.controller';
import { AuditModule } from '../audit/audit.module';
import { ProfessionalAvailabilityService } from './professional-availability.service';

@Module({
  imports: [AuditModule],
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService, ProfessionalAvailabilityService],
  exports: [ProfessionalsService, ProfessionalAvailabilityService], // Usado por BookingsModule/ClientsModule para resolver agenda, clientes y disponibilidad.
})
export class ProfessionalsModule {}
