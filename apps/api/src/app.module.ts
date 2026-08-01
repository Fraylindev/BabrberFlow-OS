import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AuthModule } from './auth/auth.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { ServicesModule } from './services/services.module'; // <-- Importado
import { ClientsModule } from './clients/clients.module'; // <-- Importado
import { BookingsModule } from './bookings/bookings.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PublicBookingModule } from './public-booking/public-booking.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Caché en memoria (sin Redis — no forma parte del stack todavía,
    // mismo criterio ya aplicado al rate limiting). Registrado global
    // para que cualquier módulo pueda inyectar CACHE_MANAGER o usar
    // CacheInterceptor, pero NO se aplica por defecto a ningún endpoint
    // — cada uno lo adopta explícitamente donde tiene sentido (ver
    // PublicBookingController, único lugar donde se usa por ahora).
    CacheModule.register({
      isGlobal: true,
      ttl: 30000, // 30s — balance entre frescura y reducir carga de DB
    }),
    // Registro GLOBAL real (antes solo existía dentro de PublicBookingModule,
    // duplicando configuración si otro módulo lo necesitaba). Límite base
    // generoso — el guard mismo sigue sin aplicarse a ningún endpoint por
    // defecto: cada controlador lo activa explícitamente con @UseGuards
    // (login y la reserva pública, ver sus respectivos archivos), así no
    // se cambia el comportamiento de ninguna ruta que no lo pidió.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    PrismaModule,
    OrganizationsModule,
    AuthModule,
    ProfessionalsModule,
    ServicesModule, // <-- Registrado
    ClientsModule, // <-- Registrado
    BookingsModule, // <-- Registrado
    InvoicesModule,
    PublicBookingModule,
    AnalyticsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
