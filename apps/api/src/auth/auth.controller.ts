import { Controller, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Límite por IP: 10/min. No hay contraseña que adivinar aquí (es
  // creación de cuenta), así que no lleva la capa de bloqueo por cuenta
  // de AuthService — solo protege contra spam/flooding de registros.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Límite estricto contra fuerza bruta: 5 intentos/minuto por IP — más
  // apretado que el límite global genérico (100/min, ver app.module.ts).
  // Se complementa con el bloqueo por cuenta en AuthService.login()
  // (ver attempt-limiter.ts) — dos capas independientes, cada una cubre
  // lo que la otra no: esta detiene un atacante desde una sola IP: la
  // otra detiene un ataque distribuido contra una cuenta específica.
  // Nunca se cachea (CacheInterceptor no está aplicado aquí) y nunca se
  // debe aplicar, porque cachear una respuesta de login sería servirle
  // a alguien la sesión de otro.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Solo OWNER/ADMIN pueden invitar nuevos miembros a SU organización,
  // con un rol distinto a OWNER (ver InviteUserDto). Límite por IP más
  // holgado (20/min) — ya requiere estar autenticado como OWNER/ADMIN,
  // el riesgo de fuerza bruta es mucho menor que en login.
  @UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('invite')
  invite(
    @GetUser('organizationId') organizationId: string,
    @Body() inviteUserDto: InviteUserDto,
  ) {
    return this.authService.inviteUser(organizationId, inviteUserDto);
  }

  // Cualquier usuario autenticado, de cualquier rol, cambia su propia
  // contraseña — sin restricción de RolesGuard a propósito. Límite por
  // IP (10/min) + bloqueo por cuenta en AuthService.updatePassword()
  // (protege contra fuerza bruta de la contraseña actual con un token
  // robado).
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Patch('update-password')
  updatePassword(
    @GetUser('id') userId: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.authService.updatePassword(userId, updatePasswordDto);
  }
}
