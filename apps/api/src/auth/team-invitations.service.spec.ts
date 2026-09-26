import {
  BadRequestException,
  ConflictException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClerkAPIResponseError } from '@clerk/backend/errors';
import { Prisma, TeamInvitationStatus, UserRole } from '@prisma/client';
import { CLERK_VERIFICATION_TIMEOUT_MS } from './clerk/clerk-deadline';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkSessionVerifierService } from './clerk/clerk-session-verifier.service';
import { TeamInvitationsService } from './team-invitations.service';

const organizationId = '9ad7c5df-6701-48e5-bb75-bcf06fb2bd1c';
const actorUserId = 'b248c5b1-047d-4734-a41e-85e8de81342d';
const invitationId = 'ca0986f6-7578-4473-93c5-d2122cfe3a59';

function invitation(status: TeamInvitationStatus) {
  const now = new Date('2026-08-21T12:00:00.000Z');
  return {
    id: invitationId,
    organizationId,
    email: 'barber@example.test',
    role: UserRole.BARBER,
    createPublicProfile: true,
    status,
    clerkInvitationId:
      status === TeamInvitationStatus.CREATING ? null : 'inv_test',
    invitedByUserId: actorUserId,
    acceptedByUserId: null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe('TeamInvitationsService', () => {
  const tx = {
    teamInvitation: { create: jest.fn() },
  };
  const teamInvitation = {
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const transaction = jest.fn();
  const prisma = {
    db: {
      $transaction: transaction,
      teamInvitation,
    },
  } as unknown as PrismaService;
  const log = jest.fn();
  const logTransactional = jest.fn();
  const audit = {
    log,
    logTransactional,
  } as unknown as AuditService;
  const createInvitation = jest.fn();
  const revokeInvitation = jest.fn();
  const getInvitationList = jest.fn();
  const verifier = {
    getClient: () => ({
      invitations: {
        createInvitation,
        revokeInvitation,
        getInvitationList,
      },
      users: { getUser: jest.fn() },
    }),
  } as unknown as ClerkSessionVerifierService;
  const loadInvitationRedirectUrl = () =>
    'http://localhost:3001/accept-invitation';
  const service = new TeamInvitationsService(
    prisma,
    audit,
    verifier,
    loadInvitationRedirectUrl,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    teamInvitation.updateMany.mockResolvedValue({ count: 1 });
    teamInvitation.findFirst.mockResolvedValue(null);
    revokeInvitation.mockResolvedValue({ id: 'inv_test', status: 'revoked' });
    transaction.mockImplementation((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
  });

  it('termina la transacción local antes de llamar a Clerk', async () => {
    let transactionOpen = false;
    tx.teamInvitation.create.mockResolvedValue(
      invitation(TeamInvitationStatus.CREATING),
    );
    transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => {
        transactionOpen = true;
        const result = await callback(tx);
        transactionOpen = false;
        return result;
      },
    );
    createInvitation.mockImplementation(() => {
      expect(transactionOpen).toBe(false);
      return Promise.resolve({ id: 'inv_test' });
    });
    teamInvitation.update.mockResolvedValue(
      invitation(TeamInvitationStatus.PENDING),
    );

    await service.create(organizationId, actorUserId, {
      email: ' Barber@Example.Test ',
      role: UserRole.BARBER,
      createPublicProfile: true,
      expiresInDays: 30,
    });

    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: 'barber@example.test',
        ignoreExisting: true,
        notify: true,
        redirectUrl:
          'http://localhost:3001/accept-invitation?invitation=ca0986f6-7578-4473-93c5-d2122cfe3a59',
      }),
    );
    const clerkCalls = createInvitation.mock.calls as unknown as Array<
      [Record<string, unknown>]
    >;
    const [clerkPayload] = clerkCalls[0];
    expect(clerkPayload).not.toHaveProperty('publicMetadata');
    expect(logTransactional).toHaveBeenCalledTimes(1);
    const [auditEntry, auditTransaction] = logTransactional.mock
      .calls[0] as unknown as [Record<string, unknown>, typeof tx];
    expect(auditEntry).not.toHaveProperty('email');
    expect(auditTransaction).toBe(tx);
  });

  it('deja estado FAILED y no simula éxito cuando Clerk falla', async () => {
    tx.teamInvitation.create.mockResolvedValue(
      invitation(TeamInvitationStatus.CREATING),
    );
    transaction.mockImplementation((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    createInvitation.mockRejectedValue(new Error('external'));

    await expect(
      service.create(organizationId, actorUserId, {
        email: 'barber@example.test',
        role: UserRole.BARBER,
        expiresInDays: 30,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(teamInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: invitationId,
        organizationId,
        status: TeamInvitationStatus.CREATING,
        AND: { clerkInvitationId: null },
        updatedAt: invitation(TeamInvitationStatus.CREATING).updatedAt,
      },
      data: {
        status: TeamInvitationStatus.FAILED,
        updatedAt: expect.any(Date) as unknown,
      },
    });
    expect(teamInvitation.update).not.toHaveBeenCalled();
  });

  it('reutiliza una invitación abierta equivalente sin duplicar PostgreSQL, Clerk o auditoría', async () => {
    const pending = invitation(TeamInvitationStatus.PENDING);
    teamInvitation.findFirst.mockResolvedValue(pending);

    await expect(
      service.create(organizationId, actorUserId, {
        email: ' BARBER@EXAMPLE.TEST ',
        role: UserRole.BARBER,
        createPublicProfile: true,
        expiresInDays: 30,
      }),
    ).resolves.toEqual(expect.objectContaining({ id: invitationId }));

    expect(transaction).not.toHaveBeenCalled();
    expect(createInvitation).not.toHaveBeenCalled();
    expect(logTransactional).not.toHaveBeenCalled();
  });

  it('rechaza perfil profesional para roles que no son BARBER antes de escribir', async () => {
    await expect(
      service.create(organizationId, actorUserId, {
        email: 'admin@example.test',
        role: UserRole.ADMIN,
        createPublicProfile: true,
        expiresInDays: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it('expone un límite externo de Clerk como 429 seguro con Retry-After', async () => {
    tx.teamInvitation.create.mockResolvedValue(
      invitation(TeamInvitationStatus.CREATING),
    );
    transaction.mockImplementation((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    createInvitation.mockRejectedValue(
      new ClerkAPIResponseError('rate limited', {
        status: 429,
        retryAfter: 4,
        data: [{ code: 'rate_limit', message: 'rate limited' }],
      }),
    );

    const failure = service.create(organizationId, actorUserId, {
      email: 'barber@example.test',
      role: UserRole.BARBER,
      expiresInDays: 30,
    });
    await expect(failure).rejects.toBeInstanceOf(HttpException);
    await expect(failure).rejects.toMatchObject({
      status: 429,
      response: {
        statusCode: 429,
        retryAfterSeconds: 4,
      },
    });
  });

  it('permite reenviar cuando Clerk ya marcó la invitación externa como terminal', async () => {
    teamInvitation.findFirst.mockResolvedValue(
      invitation(TeamInvitationStatus.PENDING),
    );
    teamInvitation.update.mockResolvedValue(
      invitation(TeamInvitationStatus.PENDING),
    );
    revokeInvitation.mockRejectedValue(
      new ClerkAPIResponseError('already accepted', {
        status: 422,
        data: [
          { code: 'invitation_already_accepted', message: 'already accepted' },
        ],
      }),
    );
    createInvitation.mockResolvedValue({ id: 'inv_replacement' });

    await expect(
      service.resend(organizationId, actorUserId, invitationId),
    ).resolves.toEqual(
      expect.objectContaining({ status: TeamInvitationStatus.PENDING }),
    );
    expect(createInvitation).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith({
      organizationId,
      userId: actorUserId,
      action: 'RESEND',
      entity: 'TeamInvitation',
      entityId: invitationId,
    });
  });

  it('acota la creación y compensa una respuesta externa tardía sin publicar el enlace', async () => {
    jest.useFakeTimers();
    try {
      const creating = invitation(TeamInvitationStatus.CREATING);
      tx.teamInvitation.create.mockResolvedValue(creating);
      let release!: (value: { id: string }) => void;
      createInvitation.mockReturnValue(
        new Promise((resolve) => {
          release = resolve;
        }),
      );
      const result = service.create(organizationId, actorUserId, {
        email: creating.email,
        role: UserRole.BARBER,
        expiresInDays: 30,
      });
      const rejected = expect(result).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      await jest.advanceTimersByTimeAsync(CLERK_VERIFICATION_TIMEOUT_MS);
      await rejected;
      expect(teamInvitation.update).not.toHaveBeenCalled();
      release({ id: 'inv_late_only' });
      await jest.advanceTimersByTimeAsync(0);
      expect(revokeInvitation).toHaveBeenCalledWith('inv_late_only');
      expect(teamInvitation.update).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('no sobreescribe una generación nueva cuando el reenvío pierde su reserva', async () => {
    const original = invitation(TeamInvitationStatus.PENDING);
    teamInvitation.findFirst.mockResolvedValue(original);
    createInvitation.mockResolvedValue({ id: 'inv_losing_generation' });
    teamInvitation.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );
    await expect(
      service.resend(organizationId, actorUserId, invitationId),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(teamInvitation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: invitationId,
          organizationId,
          status: TeamInvitationStatus.RESENDING,
          AND: { clerkInvitationId: original.clerkInvitationId },
          updatedAt: expect.any(Date) as unknown,
        },
      }),
    );
    expect(revokeInvitation).toHaveBeenLastCalledWith('inv_losing_generation');
    expect(teamInvitation.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          id: invitationId,
          organizationId,
          status: TeamInvitationStatus.RESENDING,
          AND: { clerkInvitationId: original.clerkInvitationId },
          updatedAt: expect.any(Date) as unknown,
        },
      }),
    );
    expect(log).not.toHaveBeenCalled();
  });

  it('rechaza una revocación tardía si la generación reservada ya cambió', async () => {
    teamInvitation.findFirst.mockResolvedValue(
      invitation(TeamInvitationStatus.PENDING),
    );
    teamInvitation.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );
    await expect(
      service.revoke(organizationId, actorUserId, invitationId),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(teamInvitation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: invitationId,
          organizationId,
          status: TeamInvitationStatus.REVOKING,
          AND: { clerkInvitationId: 'inv_test' },
          updatedAt: expect.any(Date) as unknown,
        },
      }),
    );
    expect(log).not.toHaveBeenCalled();
  });

  it('completa de forma idempotente la revocación externa ya terminal', async () => {
    teamInvitation.findFirst.mockResolvedValue(
      invitation(TeamInvitationStatus.PENDING),
    );
    teamInvitation.update.mockResolvedValue(
      invitation(TeamInvitationStatus.REVOKED),
    );
    revokeInvitation.mockRejectedValue(
      new ClerkAPIResponseError('already revoked', {
        status: 422,
        data: [
          { code: 'invitation_already_revoked', message: 'already revoked' },
        ],
      }),
    );
    await expect(
      service.revoke(organizationId, actorUserId, invitationId),
    ).resolves.toMatchObject({ status: TeamInvitationStatus.REVOKED });
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('deja FAILED ante revocación incierta y no anuncia que sigue pendiente', async () => {
    teamInvitation.findFirst.mockResolvedValue(
      invitation(TeamInvitationStatus.PENDING),
    );
    revokeInvitation.mockRejectedValue(new Error('network unavailable'));
    await expect(
      service.revoke(organizationId, actorUserId, invitationId),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(teamInvitation.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          status: TeamInvitationStatus.REVOKING,
        }) as unknown,
        data: expect.objectContaining({
          status: TeamInvitationStatus.FAILED,
        }) as unknown,
      }),
    );
    expect(teamInvitation.update).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
