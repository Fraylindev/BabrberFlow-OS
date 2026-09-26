import { HttpStatus, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { ClerkCustomerClaimsController } from './clerk-customer-claims.controller';
import { ClerkCustomerClaimsService } from './clerk-customer-claims.service';
import type { ClerkOnboardingRequest } from './guards/clerk-onboarding.guard';

describe('ClerkCustomerClaimsController', () => {
  const claim = jest.fn();
  const controller = new ClerkCustomerClaimsController({
    claim,
  } as unknown as ClerkCustomerClaimsService);
  const dto = {
    bookingId: '843b7699-f9e7-47ce-abfb-f08bdf2e7ea5',
    organizationSlug: 'tenant-one',
  };

  beforeEach(() => jest.clearAllMocks());

  it.each([
    [true, HttpStatus.CREATED],
    [false, HttpStatus.OK],
  ])('devuelve el estado idempotente esperado', async (isNew, status) => {
    claim.mockResolvedValue({ isNew });
    const setStatus = jest.fn();
    const response = { status: setStatus } as unknown as Response;
    const request = {
      clerkSession: { clerkUserId: 'user_clerk_customer', sessionId: 'sess' },
    } as ClerkOnboardingRequest;

    await expect(controller.claim(request, dto, response)).resolves.toEqual({
      claimed: true,
    });
    expect(setStatus).toHaveBeenCalledWith(status);
    expect(claim).toHaveBeenCalledWith('user_clerk_customer', dto);
  });

  it('rechaza si el guard no dejó una identidad verificada', async () => {
    await expect(
      controller.claim({} as ClerkOnboardingRequest, dto, {
        status: jest.fn(),
      } as unknown as Response),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(claim).not.toHaveBeenCalled();
  });
});
