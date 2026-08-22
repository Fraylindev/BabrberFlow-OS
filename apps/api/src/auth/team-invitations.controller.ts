import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  Body,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { GetUser } from './decorators/get-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { CreateTeamInvitationDto } from './dto/create-team-invitation.dto';
import { ListTeamInvitationsDto } from './dto/list-team-invitations.dto';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import {
  ClerkOnboardingGuard,
  type ClerkOnboardingRequest,
} from './guards/clerk-onboarding.guard';
import { RolesGuard } from './guards/roles.guard';
import { TeamInvitationsService } from './team-invitations.service';

@Controller('auth/clerk/invitations')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
export class TeamInvitationsController {
  constructor(private readonly invitations: TeamInvitationsService) {}

  @Post()
  create(
    @GetUser('organizationId') organizationId: string,
    @GetUser('id') actorUserId: string,
    @Body() dto: CreateTeamInvitationDto,
  ) {
    return this.invitations.create(organizationId, actorUserId, dto);
  }

  @Get()
  list(
    @GetUser('organizationId') organizationId: string,
    @Query() query: ListTeamInvitationsDto,
  ) {
    return this.invitations.list(organizationId, query);
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  resend(
    @GetUser('organizationId') organizationId: string,
    @GetUser('id') actorUserId: string,
    @Param('id', new ParseUUIDPipe()) invitationId: string,
  ) {
    return this.invitations.resend(organizationId, actorUserId, invitationId);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  revoke(
    @GetUser('organizationId') organizationId: string,
    @GetUser('id') actorUserId: string,
    @Param('id', new ParseUUIDPipe()) invitationId: string,
  ) {
    return this.invitations.revoke(organizationId, actorUserId, invitationId);
  }
}

@Controller('auth/clerk/invitations')
export class TeamInvitationAcceptanceController {
  constructor(private readonly invitations: TeamInvitationsService) {}

  @UseGuards(ClerkOnboardingGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':id/accept')
  async accept(
    @Req() request: ClerkOnboardingRequest,
    @Param('id', new ParseUUIDPipe()) invitationId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const clerkUserId = request.clerkSession?.clerkUserId;
    if (!clerkUserId) {
      throw new UnauthorizedException('Sesión no válida');
    }

    const result = await this.invitations.accept(invitationId, clerkUserId);
    response.status(result.isNew ? HttpStatus.CREATED : HttpStatus.OK);

    return {
      organizationId: result.organizationId,
      role: result.role,
      professionalCreated: result.professionalCreated,
    };
  }
}
