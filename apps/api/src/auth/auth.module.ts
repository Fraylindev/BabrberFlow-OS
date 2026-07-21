import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

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
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
