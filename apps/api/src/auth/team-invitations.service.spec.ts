import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TeamInvitationStatus, UserRole } from '@prisma/client';
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
    expiresAt: new Date('2026-09-20T12:00:00.000Z'),
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
  const verifier = {
    getClient: () => ({
      invitations: {
        createInvitation,
        revokeInvitation: jest.fn(),
        getInvitationList: jest.fn(),
      },
      users: { getUser: jest.fn() },
    }),
  } as unknown as ClerkSessionVerifierService;
  const service = new TeamInvitationsService(prisma, audit, verifier);

  beforeEach(() => {
    jest.clearAllMocks();
    teamInvitation.updateMany.mockResolvedValue({ count: 1 });
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
      }),
    );
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
        status: { in: [TeamInvitationStatus.CREATING] },
      },
      data: { status: TeamInvitationStatus.FAILED },
    });
    expect(teamInvitation.update).not.toHaveBeenCalled();
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
});
