import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AuthModule } from './auth/auth.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { ServicesModule } from './services/services.module'; // <-- Importado
import { ClientsModule } from './clients/clients.module'; // <-- Importado
import { BookingsModule } from './bookings/bookings.module';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    OrganizationsModule,
    AuthModule,
    ProfessionalsModule,
    ServicesModule, // <-- Registrado
    ClientsModule, // <-- Registrado
    BookingsModule, // <-- Registrado
    InvoicesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
