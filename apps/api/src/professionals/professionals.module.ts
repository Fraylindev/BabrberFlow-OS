import { Module } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsController } from './professionals.controller';

@Module({
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService],
  exports: [ProfessionalsService], // Usado por BookingsModule/ClientsModule para resolver "mi propia agenda/clientes" de un BARBER
})
export class ProfessionalsModule {}
