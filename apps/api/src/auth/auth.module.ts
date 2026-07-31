import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { TeamService } from './team.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuditModule } from '../audit/audit.module';

if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET no está configurado. Define esta variable en tu archivo .env antes de iniciar la API (ver .env.example).',
  );
}

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' }, // El token expirará en 1 día
    }),
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TeamService, JwtStrategy],
})
export class AuthModule {}
