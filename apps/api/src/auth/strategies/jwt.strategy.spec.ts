import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy — retiro CUSTOMER, compatibilidad interna', () => {
  const findUnique = jest.fn();
  let strategy: JwtStrategy;
  const payload = {
    sub: 'actor',
    organizationId: 'tenant',
    email: 'ignored@example.test',
    role: 'OWNER',
  };
  beforeEach(() => {
    findUnique.mockReset();
    strategy = new JwtStrategy({
      db: { membership: { findUnique } },
    } as unknown as PrismaService);
  });

  it.each([
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.BARBER,
  ])('preserva %s y revalida rol/tenant desde Membership', async (role) => {
    findUnique.mockResolvedValue({
      organizationId: 'tenant',
      role,
      user: { id: 'actor', name: 'Interno', email: 'internal@example.test' },
    });
    await expect(strategy.validate(payload)).resolves.toEqual({
      id: 'actor',
      name: 'Interno',
      email: 'internal@example.test',
      organizationId: 'tenant',
      role,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        userId_organizationId: { userId: 'actor', organizationId: 'tenant' },
      },
      include: { user: true },
    });
  });

  it.each([null, { role: UserRole.CUSTOMER }])(
    'rechaza membresía inexistente o CUSTOMER aunque el payload diga OWNER',
    async (membership) => {
      findUnique.mockResolvedValue(membership);
      await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );
});
