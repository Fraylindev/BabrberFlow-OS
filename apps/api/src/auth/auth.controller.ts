import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { InviteUserDto } from './dto/invite-user.dto';
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
}
