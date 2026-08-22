import { UserRole } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { ClerkBootstrapService } from './clerk-bootstrap.service';

describe('ClerkBootstrapService', () => {
  const findUnique = jest.fn();
  const service = new ClerkBootstrapService({
    db: { user: { findUnique } },
  } as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('indica onboarding sin buscar por correo cuando el sub no está enlazado', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.resolve('user_clerk_new')).resolves.toEqual({
      state: 'ONBOARDING_REQUIRED',
      user: null,
      preferredOrganizationId: null,
      memberships: [],
    });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clerkUserId: 'user_clerk_new' } }),
    );
  });

  it('devuelve NO_ACCESS para un User enlazado sin Membership B2B', async () => {
    findUnique.mockResolvedValue({
      id: 'local-user',
      name: 'Sin acceso',
      lastOrganizationId: null,
      memberships: [],
    });

    await expect(service.resolve('user_clerk_linked')).resolves.toEqual({
      state: 'NO_ACCESS',
      user: { id: 'local-user', name: 'Sin acceso' },
      preferredOrganizationId: null,
      memberships: [],
    });
  });

  it('proyecta solo contexto B2B y prioriza lastOrganizationId válido', async () => {
    findUnique.mockResolvedValue({
      id: 'local-user',
      name: 'Operador',
      lastOrganizationId: 'org-two',
      memberships: [
        {
          role: UserRole.BARBER,
          organization: { id: 'org-one', name: 'Uno', slug: 'uno' },
        },
        {
          role: UserRole.ADMIN,
          organization: { id: 'org-two', name: 'Dos', slug: 'dos' },
        },
      ],
    });

    await expect(service.resolve('user_clerk_ready')).resolves.toEqual({
      state: 'READY',
      user: { id: 'local-user', name: 'Operador' },
      preferredOrganizationId: 'org-two',
      memberships: [
        {
          role: UserRole.ADMIN,
          organization: { id: 'org-two', name: 'Dos', slug: 'dos' },
        },
        {
          role: UserRole.BARBER,
          organization: { id: 'org-one', name: 'Uno', slug: 'uno' },
        },
      ],
    });
  });

  it('no presenta una preferencia que ya no pertenece al usuario', async () => {
    findUnique.mockResolvedValue({
      id: 'local-user',
      name: 'Operador',
      lastOrganizationId: 'foreign-org',
      memberships: [
        {
          role: UserRole.OWNER,
          organization: { id: 'own-org', name: 'Propia', slug: 'propia' },
        },
      ],
    });

    const result = await service.resolve('user_clerk_ready');
    expect(result.preferredOrganizationId).toBeNull();
  });
});
