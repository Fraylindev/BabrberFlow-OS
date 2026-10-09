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
import { CmsModule } from './cms/cms.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MediaModule } from './media/media.module';
import { PostgresThrottlerStorage } from './security/postgres-throttler.storage';
import { PrismaService } from './prisma/prisma.service';
import { BusinessScheduleModule } from './business-schedule/business-schedule.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Caché de lectura en memoria; el presupuesto de seguridad usa PostgreSQL.
    // Registrado global
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
    // (auth, reserva pública, CMS y medios), así no
    // se cambia el comportamiento de ninguna ruta que no lo pidió.
    ThrottlerModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
        storage: new PostgresThrottlerStorage(
          prisma,
          process.env.RATE_LIMIT_SECRET ?? process.env.JWT_SECRET ?? '',
        ),
        errorMessage:
          'Demasiados intentos. Espera un momento y vuelve a probar.',
      }),
    }),
    PrismaModule,
    OrganizationsModule,
    BusinessScheduleModule,
    AuthModule,
    ProfessionalsModule,
    ServicesModule, // <-- Registrado
    ClientsModule, // <-- Registrado
    BookingsModule, // <-- Registrado
    InvoicesModule,
    PublicBookingModule,
    AnalyticsModule,
    CmsModule,
    NotificationsModule,
    MediaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
