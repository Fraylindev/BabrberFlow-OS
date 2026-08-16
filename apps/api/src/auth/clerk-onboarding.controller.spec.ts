import { HttpStatus, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { ClerkOnboardingController } from './clerk-onboarding.controller';
import { ClerkOnboardingService } from './clerk-onboarding.service';
import { ClerkOnboardingDto } from './dto/clerk-onboarding.dto';
import type { ClerkOnboardingRequest } from './guards/clerk-onboarding.guard';

describe('ClerkOnboardingController', () => {
  let controller: ClerkOnboardingController;
  let serviceMock: {
    onboardOwner: jest.Mock;
  };
  let statusMock: jest.Mock;

  const dto: ClerkOnboardingDto = {
    organizationName: 'Barbería Capital',
    organizationSlug: 'barberia-capital',
    organizationEmail: 'contacto@barberiacapital.com',
  };

  beforeEach(() => {
    serviceMock = {
      onboardOwner: jest.fn(),
    };
    statusMock = jest.fn();

    controller = new ClerkOnboardingController(
      serviceMock as unknown as ClerkOnboardingService,
    );
  });

  function createMockResponse(): Response {
    const res = {
      status: statusMock,
    };
    statusMock.mockReturnValue(res);
    return res as unknown as Response;
  }

  it('retorna 201 Created cuando es un onboarding nuevo', async () => {
    const req: ClerkOnboardingRequest = {
      clerkSession: {
        clerkUserId: 'user_clerk_123',
        sessionId: 'sess_123',
      },
    } as ClerkOnboardingRequest;

    const res = createMockResponse();

    serviceMock.onboardOwner.mockResolvedValue({
      isNew: true,
      user: {
        id: 'user_1',
        name: 'Pedro Pérez',
        email: 'pedro@example.com',
        clerkUserId: 'user_clerk_123',
        lastOrganizationId: 'org_1',
      },
      organization: {
        id: 'org_1',
        name: dto.organizationName,
        slug: dto.organizationSlug,
        email: dto.organizationEmail,
      },
      role: 'OWNER',
    });

    const result = await controller.onboard(req, dto, res);

    expect(serviceMock.onboardOwner).toHaveBeenCalledWith(
      'user_clerk_123',
      dto,
    );
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.CREATED);
    expect(result).toEqual({
      user: {
        id: 'user_1',
        name: 'Pedro Pérez',
        email: 'pedro@example.com',
        clerkUserId: 'user_clerk_123',
        lastOrganizationId: 'org_1',
      },
      organization: {
        id: 'org_1',
        name: dto.organizationName,
        slug: dto.organizationSlug,
        email: dto.organizationEmail,
      },
      role: 'OWNER',
    });
  });

  it('retorna 200 OK cuando es un onboarding idempotente ya existente', async () => {
    const req: ClerkOnboardingRequest = {
      clerkSession: {
        clerkUserId: 'user_clerk_123',
        sessionId: 'sess_123',
      },
    } as ClerkOnboardingRequest;

    const res = createMockResponse();

    serviceMock.onboardOwner.mockResolvedValue({
      isNew: false,
      user: {
        id: 'user_1',
        name: 'Pedro Pérez',
        email: 'pedro@example.com',
        clerkUserId: 'user_clerk_123',
        lastOrganizationId: 'org_1',
      },
      organization: {
        id: 'org_1',
        name: dto.organizationName,
        slug: dto.organizationSlug,
        email: dto.organizationEmail,
      },
      role: 'OWNER',
    });

    const result = await controller.onboard(req, dto, res);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.OK);
    expect(result.user.id).toBe('user_1');
  });

  it('lanza UnauthorizedException si falta clerkSession en el request', async () => {
    const req: ClerkOnboardingRequest = {} as ClerkOnboardingRequest;
    const res = createMockResponse();

    await expect(controller.onboard(req, dto, res)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(serviceMock.onboardOwner).not.toHaveBeenCalled();
  });
});
