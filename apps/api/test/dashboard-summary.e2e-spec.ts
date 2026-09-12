import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  addDaysToIsoDate,
  getZonedDateParts,
  zonedLocalDateTimeToUtc,
} from '../src/professionals/professional-availability.util';
import { createE2eApp, requestApp } from './create-e2e-app';

interface Summary {
  timeZone: string;
  agenda: {
    items: Array<{
      id: string;
      startTime: string;
      client: { name: string };
      service: { name: string };
      professional: { name: string };
    }>;
    total: number;
    totalPages: number;
  };
  workload: {
    items: Array<{ id: string; name: string; count: number }>;
    total: number;
    idleCount: number;
  } | null;
  isBrandNew: boolean;
}

describe('Resumen acotado (PostgreSQL aislado)', () => {
  let app: INestApplication;
  const tokens = new Map<string, string>();
  let from: Date;
  beforeAll(async () => {
    app = await createE2eApp();
    const db = app.get(PrismaService).db;
    const jwt = app.get(JwtService);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timeZone = 'America/Santo_Domingo';
    const today = getZonedDateParts(new Date(), timeZone).date;
    from = zonedLocalDateTimeToUtc(today, '00:00', timeZone)!;
    const tomorrow = zonedLocalDateTimeToUtc(
      addDaysToIsoDate(today, 1),
      '00:00',
      timeZone,
    )!;
    for (const tenant of ['A', 'B']) {
      const organization = await db.organization.create({
        data: {
          name: `Summary ${tenant}`,
          slug: `summary-${tenant}-${suffix}`,
          email: `summary-${tenant}-${suffix}@example.test`,
          timeZone,
        },
      });
      let barberId = '';
      for (const [label, role] of [
        ['owner', UserRole.OWNER],
        ['admin', UserRole.ADMIN],
        ['reception', UserRole.RECEPTIONIST],
        ['barber', UserRole.BARBER],
        ['unlinked', UserRole.BARBER],
        ['customer', UserRole.CUSTOMER],
      ] as const) {
        const user = await db.user.create({
          data: {
            name: label,
            email: `${label}-${tenant}-${suffix}@example.test`,
          },
        });
        await db.membership.create({
          data: { userId: user.id, organizationId: organization.id, role },
        });
        tokens.set(
          `${tenant}-${label}`,
          await jwt.signAsync({
            sub: user.id,
            organizationId: organization.id,
          }),
        );
        if (label === 'barber') barberId = user.id;
      }
      const service = await db.service.create({
        data: {
          organizationId: organization.id,
          name: `Service ${tenant}`,
          duration: 10,
          price: 100,
        },
      });
      const client = await db.client.create({
        data: {
          organizationId: organization.id,
          name: `Client ${tenant}`,
          email: `client-${tenant}-${suffix}@example.test`,
          phone: '5550000',
        },
      });
      const professionals: Array<{ id: string }> = [];
      for (let i = 0; i < 25; i++) {
        professionals.push(
          await db.professional.create({
            data: {
              organizationId: organization.id,
              name: `${tenant} ${String(i).padStart(2, '0')}`,
              status: 'ACTIVE',
              phone: '5550001',
              ...(i === 0 ? { userId: barberId } : {}),
            },
          }),
        );
      }
      await db.professional.create({
        data: {
          organizationId: organization.id,
          name: 'Inactive',
          status: 'INACTIVE',
        },
      });
      const starts = [
        new Date(from.getTime() - 60000),
        ...Array.from(
          { length: 25 },
          (_, i) => new Date(from.getTime() + i * 15 * 60000),
        ),
        tomorrow,
      ];
      for (const [i, startTime] of starts.entries()) {
        await db.booking.create({
          data: {
            organizationId: organization.id,
            clientId: client.id,
            serviceId: service.id,
            professionalId: professionals[i === 1 ? 0 : 1].id,
            startTime,
            endTime: new Date(startTime.getTime() + 60000),
            status: 'CANCELLED',
          },
        });
      }
    }
  });
  afterAll(async () => {
    await app?.close();
  });
  async function read(actor: string, query = ''): Promise<Summary> {
    const result = await requestApp(app)
      .get(`/analytics/summary${query}`)
      .set('Authorization', `Bearer ${tokens.get(actor)}`)
      .expect(200);
    return result.body as Summary;
  }

  it.each(['owner', 'admin', 'reception'])(
    'paginates %s with complete counts and only business today',
    async (role) => {
      const first = await read(`A-${role}`);
      const second = await read(`A-${role}`, '?agendaPage=2&workloadPage=2');
      expect(first.agenda.total).toBe(25);
      expect(first.agenda.items).toHaveLength(20);
      expect(second.agenda.items).toHaveLength(5);
      expect(
        new Set(
          [...first.agenda.items, ...second.agenda.items].map(
            (item) => item.id,
          ),
        ).size,
      ).toBe(25);
      expect(first.agenda.items[0].startTime).toBe(from.toISOString());
      expect(first.workload).toMatchObject({ total: 25, idleCount: 23 });
      expect(first.workload?.items).toHaveLength(20);
      expect(second.workload?.items).toHaveLength(5);
    },
  );

  it('minimizes all projections and excludes another tenant', async () => {
    const a = await read('A-owner');
    const b = await read('B-owner');
    expect(Object.keys(a.agenda.items[0]).sort()).toEqual(
      [
        'id',
        'startTime',
        'endTime',
        'status',
        'client',
        'service',
        'professional',
      ].sort(),
    );
    for (const item of a.agenda.items) {
      expect(item.client).toEqual({ name: 'Client A' });
      expect(item.service).toEqual({ name: 'Service A' });
      expect(Object.keys(item.professional)).toEqual(['name']);
      expect(b.agenda.items.map((row) => row.id)).not.toContain(item.id);
    }
    expect(Object.keys(a.workload!.items[0]).sort()).toEqual([
      'count',
      'id',
      'name',
    ]);
  });

  it('BARBER sees only own work and unlinked BARBER receives no global data', async () => {
    const own = await read('A-barber');
    expect(own.agenda.total).toBe(1);
    expect(own.workload).toBeNull();
    expect(own).not.toHaveProperty('revenue');
    const unlinked = await read('A-unlinked');
    expect(unlinked.agenda.total).toBe(0);
    expect(unlinked.workload).toBeNull();
    expect(unlinked.isBrandNew).toBe(false);
    await requestApp(app)
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${tokens.get('A-barber')}`)
      .expect(403);
  });

  it('rejects missing auth, CUSTOMER, invalid pages and injected tenant/timezone before data reads', async () => {
    await requestApp(app).get('/analytics/summary').expect(401);
    await requestApp(app)
      .get('/analytics/summary')
      .set('Authorization', `Bearer ${tokens.get('A-customer')}`)
      .expect(403);
    for (const query of [
      'agendaPage=0',
      'agendaPage=1.5',
      'workloadPage=1000001',
      'workloadPage=no',
      'organizationId=other',
      'timeZone=UTC',
    ]) {
      await requestApp(app)
        .get(`/analytics/summary?${query}`)
        .set('Authorization', `Bearer ${tokens.get('A-owner')}`)
        .expect(400);
    }
    expect((await read('A-owner', '?agendaPage=3')).agenda.items).toEqual([]);
  });
});
