import { Controller, Post, Patch, Body, UseGuards } from '@nestjs/common';
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

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Solo OWNER/ADMIN pueden invitar nuevos miembros a SU organización,
  // con un rol distinto a OWNER (ver InviteUserDto).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('invite')
  invite(
    @GetUser('organizationId') organizationId: string,
    @Body() inviteUserDto: InviteUserDto,
  ) {
    return this.authService.inviteUser(organizationId, inviteUserDto);
  }

  // Cualquier usuario autenticado, de cualquier rol, cambia su propia
  // contraseña — sin restricción de RolesGuard a propósito.
  @UseGuards(JwtAuthGuard)
  @Patch('update-password')
  updatePassword(
    @GetUser('id') userId: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.authService.updatePassword(userId, updatePasswordDto);
  }
}
