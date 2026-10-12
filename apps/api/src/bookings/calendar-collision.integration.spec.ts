import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
const run =
  process.env.RUN_POSTGRES_INTEGRATION === '1' ? describe : describe.skip;
run('M3 timestamp collision / existing persisted revision', () => {
  const db = new PrismaClient();
  afterAll(async () => {
    await db.$disconnect();
  });
  it('consecutive Prisma writes may share updatedAt; trigger revision advances even across ABA', async () => {
    const org = await db.organization.create({
      data: {
        name: 'Synthetic M3',
        slug: randomUUID(),
        email: randomUUID() + '@example.invalid',
      },
    });
    const client = await db.client.create({
      data: { organizationId: org.id, name: 'Synthetic' },
    });
    const professional = await db.professional.create({
      data: { organizationId: org.id, name: 'Synthetic' },
    });
    const service = await db.service.create({
      data: {
        organizationId: org.id,
        name: 'Synthetic',
        duration: 30,
        price: 1,
      },
    });
    const booking = await db.booking.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        professionalId: professional.id,
        serviceId: service.id,
        startTime: new Date('2099-01-01T13:00:00Z'),
        endTime: new Date('2099-01-01T13:30:00Z'),
      },
    });
    const before = await db.client.findUniqueOrThrow({
      where: { id: client.id },
    });
    const writes = await db.$transaction([
      db.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED' },
      }),
      db.booking.update({
        where: { id: booking.id },
        data: { status: 'PENDING' },
      }),
    ]);
    const after = await db.client.findUniqueOrThrow({
      where: { id: client.id },
    });
    console.log(
      JSON.stringify({
        first: writes[0].updatedAt.toISOString(),
        second: writes[1].updatedAt.toISOString(),
        collision:
          writes[0].updatedAt.getTime() === writes[1].updatedAt.getTime(),
        before: before.customerBookingRevision.toString(),
        after: after.customerBookingRevision.toString(),
      }),
    );
    expect(writes[0].updatedAt).toEqual(writes[1].updatedAt);
    expect(after.customerBookingRevision).toBe(
      before.customerBookingRevision + 2n,
    );
    expect(writes[1].status).toBe(booking.status);
  });
});
