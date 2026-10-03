import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Headers,
  Injectable,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ClerkOnboardingGuard,
  type ClerkOnboardingRequest,
} from '../auth/guards/clerk-onboarding.guard';
import { CustomerBudgetGuard } from './customer-budget.guard';
import { CustomerService } from './customer.service';
import {
  CustomerCreateDto,
  CustomerListDto,
  CustomerProfileDto,
} from './customer.dto';

@Injectable()
export class CustomerSessionGuard implements CanActivate {
  constructor(private readonly session: ClerkOnboardingGuard) {}
  canActivate(context: ExecutionContext) {
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('Cache-Control', 'private, no-store');
    return this.session.canActivate(context);
  }
}

@Controller('customer')
@UseGuards(CustomerSessionGuard, CustomerBudgetGuard)
export class CustomerController {
  constructor(private readonly customer: CustomerService) {}

  @Get('businesses')
  businesses(@Req() req: ClerkOnboardingRequest) {
    return this.customer.businesses(req.clerkSession!.clerkUserId);
  }

  @Get(':slug/bookings')
  list(
    @Req() req: ClerkOnboardingRequest,
    @Param('slug') slug: string,
    @Query() dto: CustomerListDto,
  ) {
    return this.customer.list(req.clerkSession!.clerkUserId, slug, dto);
  }

  @Get(':slug/bookings/:id')
  detail(
    @Req() req: ClerkOnboardingRequest,
    @Param('slug') slug: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.customer.detail(req.clerkSession!.clerkUserId, slug, id);
  }

  @Get(':slug/profile')
  profile(@Req() req: ClerkOnboardingRequest, @Param('slug') slug: string) {
    return this.customer.profile(req.clerkSession!.clerkUserId, slug);
  }

  @Patch(':slug/profile')
  updateProfile(
    @Req() req: ClerkOnboardingRequest,
    @Param('slug') slug: string,
    @Body() dto: CustomerProfileDto,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    return this.customer.updateProfile(
      req.clerkSession!.clerkUserId,
      slug,
      dto,
      key,
    );
  }

  @Post(':slug/bookings')
  async create(
    @Req() req: ClerkOnboardingRequest,
    @Param('slug') slug: string,
    @Body() dto: CustomerCreateDto,
    @Headers('idempotency-key') key: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.customer.create(
      req.clerkSession!.clerkUserId,
      slug,
      dto,
      key,
    );
    response.status(result.isNew ? 201 : 200);
    return { booking: result.booking };
  }
}
